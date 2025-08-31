import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HealthReport, HealthReportType, ProcessingStatus } from '../entities/health-report.entity';
import { StructuredEntity } from '../entities/structured-entity.entity';
import { OCRService, OCRResult } from './ocr.service';
import { EntityExtractionService, ExtractionResult } from './entity-extraction.service';
import { HealthInterpretationService, HealthInterpretation } from './health-interpretation.service';
import { ObjectStorageService } from '../../../common/storage/object-storage.service';
import { FieldEncryptionService } from '../../../common/encryption/field-encryption.service';
import * as crypto from 'crypto';

export interface ProcessHealthReportOptions {
  userId: string;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
  reportMetadata: {
    reportType: HealthReportType;
    reportTitle: string;
    testDate: Date;
    labName?: string;
    doctorName?: string;
    referenceNumber?: string;
  };
  userProfile?: {
    age?: number;
    gender?: 'male' | 'female';
    region?: string;
  };
  uploadMetadata?: {
    ip?: string;
    userAgent?: string;
  };
  processingOptions?: {
    skipOCR?: boolean;
    skipInterpretation?: boolean;
    enableManualReview?: boolean;
    qualityThreshold?: number;
  };
}

export interface HealthReportProcessingResult {
  healthReport: HealthReport;
  ocrResult?: OCRResult;
  extractionResult?: ExtractionResult;
  interpretation?: HealthInterpretation;
  processingTimeMs: number;
  success: boolean;
  warnings: string[];
  errors: string[];
}

@Injectable()
export class HealthReportsService {
  private readonly logger = new Logger(HealthReportsService.name);

  constructor(
    @InjectRepository(HealthReport)
    private readonly healthReportsRepository: Repository<HealthReport>,
    @InjectRepository(StructuredEntity)
    private readonly structuredEntityRepository: Repository<StructuredEntity>,
    private readonly configService: ConfigService,
    private readonly ocrService: OCRService,
    private readonly entityExtractionService: EntityExtractionService,
    private readonly healthInterpretationService: HealthInterpretationService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly fieldEncryptionService: FieldEncryptionService,
  ) {}

  /**
   * Process health report through complete OCR → NER → Interpretation pipeline
   */
  async processHealthReport(
    options: ProcessHealthReportOptions,
  ): Promise<HealthReportProcessingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    this.logger.log(`Starting health report processing for user: ${options.userId}`);

    try {
      // Step 1: Validate and store file
      const fileHash = this.calculateFileHash(options.file.buffer);
      const storagePath = await this.storeFile(options.file, options.userId, fileHash);

      // Step 2: Create health report record
      const healthReport = await this.createHealthReport(options, storagePath, fileHash);

      let ocrResult: OCRResult | undefined;
      let extractionResult: ExtractionResult | undefined;
      let interpretation: HealthInterpretation | undefined;

      try {
        // Step 3: OCR Processing
        if (!options.processingOptions?.skipOCR) {
          healthReport.markAsProcessing();
          await this.healthReportsRepository.save(healthReport);

          ocrResult = await this.ocrService.processDocument(
            options.file.buffer,
            options.file.mimeType,
            {
              userId: options.userId,
              language: 'en',
              enableTableExtraction: true,
              enableSectionExtraction: true,
              qualityThreshold: options.processingOptions?.qualityThreshold || 0.7,
            },
          );

          // Store extracted text (encrypted)
          healthReport.extractedText = this.fieldEncryptionService.encrypt(
            ocrResult.extractedText,
          ).value;
          healthReport.ocrConfidence = ocrResult.confidence;
          healthReport.aiProcessingVersion = `ocr-${ocrResult.provider}-v1.0`;

          this.logger.debug(`OCR completed with confidence: ${ocrResult.confidence}`);
        }

        // Step 4: Entity Extraction
        if (ocrResult && ocrResult.extractedText) {
          extractionResult = await this.entityExtractionService.extractEntities(
            ocrResult.extractedText,
            {
              userId: options.userId,
              healthReportId: healthReport.id,
              userAge: options.userProfile?.age,
              userGender: options.userProfile?.gender,
              tableData: ocrResult.tableData,
              documentSections: ocrResult.sections,
            },
          );

          // Store structured entities
          await this.storeStructuredEntities(healthReport.id, extractionResult.entities);

          this.logger.debug(
            `Entity extraction completed: ${extractionResult.entities.length} entities found`,
          );
        }

        // Step 5: Health Interpretation
        if (
          !options.processingOptions?.skipInterpretation &&
          extractionResult &&
          extractionResult.entities.length > 0
        ) {
          interpretation = await this.healthInterpretationService.interpretHealthReport(
            healthReport.id,
            {
              userId: options.userId,
              userAge: options.userProfile?.age,
              userGender: options.userProfile?.gender,
            },
          );

          // Store interpretation in metadata
          healthReport.metadata = {
            ...healthReport.metadata,
            interpretation: interpretation,
          };

          this.logger.debug(
            `Health interpretation completed with confidence: ${interpretation.confidence}`,
          );
        }

        // Step 6: Determine if manual review is needed
        if (this.requiresManualReview(ocrResult, extractionResult, interpretation, options)) {
          healthReport.markForReview('Automatic review triggered based on quality thresholds');
          warnings.push('Report marked for manual review due to quality concerns');
        } else {
          healthReport.markAsProcessed(ocrResult?.confidence, `pipeline-v1.0`);
        }

        await this.healthReportsRepository.save(healthReport);

        const result: HealthReportProcessingResult = {
          healthReport,
          ocrResult,
          extractionResult,
          interpretation,
          processingTimeMs: Date.now() - startTime,
          success: true,
          warnings,
          errors,
        };

        this.logger.log(
          `Health report processing completed successfully in ${result.processingTimeMs}ms`,
        );
        return result;
      } catch (processingError) {
        this.logger.error(`Processing failed: ${processingError.message}`);

        healthReport.markAsFailed(processingError.message);
        await this.healthReportsRepository.save(healthReport);

        errors.push(processingError.message);

        return {
          healthReport,
          ocrResult,
          extractionResult,
          interpretation,
          processingTimeMs: Date.now() - startTime,
          success: false,
          warnings,
          errors,
        };
      }
    } catch (error) {
      this.logger.error(`Health report processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get health reports for a user with processing status
   */
  async findByUserId(userId: string): Promise<HealthReport[]> {
    return this.healthReportsRepository.find({
      where: { userId },
      relations: ['structuredEntities'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get health report by ID with all related data
   */
  async findById(id: string): Promise<HealthReport | null> {
    return this.healthReportsRepository.findOne({
      where: { id },
      relations: ['structuredEntities'],
    });
  }

  /**
   * Get health report interpretation
   */
  async getInterpretation(reportId: string): Promise<HealthInterpretation | null> {
    const report = await this.findById(reportId);
    if (!report || !report.metadata?.interpretation) {
      return null;
    }
    return report.metadata.interpretation;
  }

  /**
   * Reprocess health report (e.g., after manual review)
   */
  async reprocessReport(
    reportId: string,
    options: {
      skipOCR?: boolean;
      skipExtraction?: boolean;
      skipInterpretation?: boolean;
    } = {},
  ): Promise<HealthReportProcessingResult> {
    const healthReport = await this.findById(reportId);
    if (!healthReport) {
      throw new BadRequestException('Health report not found');
    }

    // Get original file from storage
    const fileBuffer = await this.objectStorageService.downloadFile(healthReport.storagePath);

    const reprocessOptions: ProcessHealthReportOptions = {
      userId: healthReport.userId,
      file: {
        buffer: fileBuffer,
        originalName: healthReport.originalFilename,
        mimeType: healthReport.mimeType,
        size: healthReport.fileSize,
      },
      reportMetadata: {
        reportType: healthReport.reportType,
        reportTitle: healthReport.reportTitle,
        testDate: healthReport.testDate,
        labName: healthReport.labName,
        doctorName: healthReport.doctorName,
        referenceNumber: healthReport.referenceNumber,
      },
      processingOptions: {
        skipOCR: options.skipOCR,
        skipInterpretation: options.skipInterpretation,
      },
    };

    // Clear existing structured entities if reprocessing extraction
    if (!options.skipExtraction) {
      await this.structuredEntityRepository.delete({ healthReportId: reportId });
    }

    return this.processHealthReport(reprocessOptions);
  }

  /**
   * Create basic health report record
   */
  async create(data: Partial<HealthReport>): Promise<HealthReport> {
    const report = this.healthReportsRepository.create(data);
    return this.healthReportsRepository.save(report);
  }

  /**
   * Calculate file hash for integrity checking
   */
  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Store file in object storage with encryption
   */
  private async storeFile(file: any, userId: string, fileHash: string): Promise<string> {
    const bucket = this.configService.get('HEALTH_REPORTS_BUCKET', 'health-reports');
    const timestamp = Date.now();
    const storagePath = `users/${userId}/reports/${timestamp}/${fileHash}`;

    const uploadResult = await this.objectStorageService.uploadFile(
      file.buffer,
      file.originalName,
      {
        contentType: file.mimeType,
        encryption: true,
        metadata: {
          userId,
          uploadDate: new Date().toISOString(),
        },
        category: 'health-reports',
        userId,
      },
    );

    return uploadResult.key; // Return the storage key/path
  }

  /**
   * Create health report record in database
   */
  private async createHealthReport(
    options: ProcessHealthReportOptions,
    storagePath: string,
    fileHash: string,
  ): Promise<HealthReport> {
    const region =
      options.userProfile?.region || this.configService.get('DEFAULT_REGION', 'us-east-1');

    const healthReport = this.healthReportsRepository.create({
      userId: options.userId,
      reportType: options.reportMetadata.reportType,
      reportTitle: options.reportMetadata.reportTitle,
      testDate: options.reportMetadata.testDate,
      labName: options.reportMetadata.labName,
      doctorName: options.reportMetadata.doctorName,
      referenceNumber: options.reportMetadata.referenceNumber,
      originalFilename: options.file.originalName,
      fileSize: options.file.size,
      mimeType: options.file.mimeType,
      storagePath,
      storageBucket: 'default', // Will be set by ObjectStorageService
      fileHash,
      encrypted: true,
      processingStatus: ProcessingStatus.UPLOADED,
      phiClassification: 'PHI',
      dataResidencyRegion: region,
      uploadedIp: options.uploadMetadata?.ip,
      uploadedUserAgent: options.uploadMetadata?.userAgent,
      metadata: {},
      tags: [],
    });

    return this.healthReportsRepository.save(healthReport);
  }

  /**
   * Store structured entities from extraction
   */
  private async storeStructuredEntities(
    healthReportId: string,
    entities: any[],
  ): Promise<StructuredEntity[]> {
    const structuredEntities = entities.map((entity) => {
      const structuredEntity = this.structuredEntityRepository.create({
        healthReportId,
        entityType: entity.entityType,
        entityName: entity.entityName,
        dataType: entity.dataType,
        category: entity.category,
        unit: entity.unit,
        confidenceScore: entity.confidence * 100, // Convert to percentage
        extractionMethod: 'ai_enhanced_ner',
        originalText: entity.originalText,
        sourceLocation: entity.sourceLocation,
        standardCode: entity.standardCode,
        codeSystem: entity.codeSystem,
        flags: entity.flags || [],
        metadata: {
          aiExtracted: true,
          extractionVersion: 'v1.0',
        },
      });

      // Set value based on data type
      structuredEntity.setValue(entity.value, entity.dataType);

      // Set reference range
      if (entity.referenceRange) {
        structuredEntity.referenceRangeMin = entity.referenceRange.min;
        structuredEntity.referenceRangeMax = entity.referenceRange.max;
        structuredEntity.referenceRangeText = entity.referenceRange.text;
      }

      // Update criticality based on values
      structuredEntity.updateCriticality();

      return structuredEntity;
    });

    return this.structuredEntityRepository.save(structuredEntities);
  }

  /**
   * Determine if manual review is required
   */
  private requiresManualReview(
    ocrResult?: OCRResult,
    extractionResult?: ExtractionResult,
    interpretation?: HealthInterpretation,
    options?: ProcessHealthReportOptions,
  ): boolean {
    // Force manual review if requested
    if (options?.processingOptions?.enableManualReview) {
      return true;
    }

    // Low OCR confidence
    if (ocrResult && ocrResult.confidence < 0.8) {
      return true;
    }

    // Low extraction confidence
    if (extractionResult && extractionResult.confidence < 0.75) {
      return true;
    }

    // Few entities extracted (possible OCR failure)
    if (extractionResult && extractionResult.entities.length < 3) {
      return true;
    }

    // Critical red flags in interpretation
    if (interpretation && interpretation.redFlags.some((flag) => flag.severity === 'urgent')) {
      return true;
    }

    // Low interpretation confidence
    if (interpretation && interpretation.confidence < 0.8) {
      return true;
    }

    return false;
  }
}
