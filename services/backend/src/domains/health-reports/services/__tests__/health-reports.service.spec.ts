import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { HealthReportsService, ProcessHealthReportOptions } from '../health-reports.service';
import { OCRService } from '../ocr.service';
import { EntityExtractionService } from '../entity-extraction.service';
import { HealthInterpretationService } from '../health-interpretation.service';
import { HealthReport, HealthReportType, ProcessingStatus } from '../../entities/health-report.entity';
import { StructuredEntity } from '../../entities/structured-entity.entity';
import { ObjectStorageService } from '../../../../common/storage/object-storage.service';
import { FieldEncryptionService } from '../../../../common/encryption/field-encryption.service';
import { AIRoutingService } from '../../../ai-routing/services/ai-routing.service';

describe('HealthReportsService - Phase 11 Integration', () => {
  let service: HealthReportsService;
  let healthReportRepository: Repository<HealthReport>;
  let structuredEntityRepository: Repository<StructuredEntity>;
  let ocrService: OCRService;
  let entityExtractionService: EntityExtractionService;
  let healthInterpretationService: HealthInterpretationService;
  let objectStorageService: ObjectStorageService;
  let fieldEncryptionService: FieldEncryptionService;

  // Mock data
  const mockHealthReport = {
    id: 'test-report-id',
    userId: 'test-user-id',
    reportType: HealthReportType.BLOOD_TEST,
    reportTitle: 'Complete Blood Panel',
    testDate: new Date('2024-08-30'),
    processingStatus: ProcessingStatus.UPLOADED,
    originalFilename: 'blood_test.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    storagePath: 'users/test-user/reports/test.pdf',
    storageBucket: 'health-reports',
    fileHash: 'abc123',
    encrypted: true,
    metadata: {},
    tags: [],
    markAsProcessing: jest.fn(),
    markAsProcessed: jest.fn(),
    markAsFailed: jest.fn(),
    markForReview: jest.fn(),
    isProcessed: jest.fn().mockReturnValue(true),
    isProcessing: jest.fn().mockReturnValue(false),
    hasFailed: jest.fn().mockReturnValue(false),
    needsReview: jest.fn().mockReturnValue(false),
  };

  const mockFileBuffer = Buffer.from('mock pdf content');

  const mockOCRResult = {
    extractedText: 'Test OCR extracted text with biomarkers',
    confidence: 0.95,
    provider: 'google_document_ai',
    processingTimeMs: 1500,
    tableData: [],
    sections: [],
    metadata: {
      documentType: 'medical_report',
      pageCount: 1,
      language: 'en',
      quality: 'high' as const,
      textDensity: 85.5,
    },
  };

  const mockExtractionResult = {
    entities: [
      {
        entityName: 'Total Cholesterol',
        entityType: 'biomarker' as any,
        value: 195,
        unit: 'mg/dL',
        dataType: 'numeric' as any,
        confidence: 0.96,
        originalText: 'Total Cholesterol: 195 mg/dL',
        category: 'Lipid Profile',
      },
    ],
    processingTimeMs: 2000,
    confidence: 0.93,
    extractionMethod: 'ai_enhanced_ner',
    unrecognizedText: [],
  };

  const mockInterpretation = {
    overallAssessment: {
      status: 'good' as const,
      riskLevel: 'low' as const,
      score: 85,
      keyFindings: ['Normal cholesterol levels'],
      majorConcerns: [],
    },
    categoryAssessments: [],
    anomalies: [],
    trends: [],
    recommendations: [],
    redFlags: [],
    plainLanguageSummary: 'Your test results look good overall.',
    technicalSummary: 'All biomarkers within normal ranges.',
    confidence: 0.92,
    interpretationDate: new Date(),
    processingTimeMs: 3000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthReportsService,
        {
          provide: getRepositoryToken(HealthReport),
          useValue: {
            create: jest.fn().mockReturnValue(mockHealthReport),
            save: jest.fn().mockResolvedValue(mockHealthReport),
            find: jest.fn().mockResolvedValue([mockHealthReport]),
            findOne: jest.fn().mockResolvedValue(mockHealthReport),
          },
        },
        {
          provide: getRepositoryToken(StructuredEntity),
          useValue: {
            create: jest.fn().mockReturnValue({
              setValue: jest.fn(),
              updateCriticality: jest.fn(),
              getValue: jest.fn().mockReturnValue(195),
            }),
            save: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config = {
                HEALTH_REPORTS_BUCKET: 'health-reports',
                DEFAULT_REGION: 'us-east-1',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: OCRService,
          useValue: {
            processDocument: jest.fn().mockResolvedValue(mockOCRResult),
          },
        },
        {
          provide: EntityExtractionService,
          useValue: {
            extractEntities: jest.fn().mockResolvedValue(mockExtractionResult),
          },
        },
        {
          provide: HealthInterpretationService,
          useValue: {
            interpretHealthReport: jest.fn().mockResolvedValue(mockInterpretation),
          },
        },
        {
          provide: ObjectStorageService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({
              key: 'users/test-user/reports/test.pdf',
              url: 'https://storage.example.com/test.pdf',
              size: 1024,
            }),
            downloadFile: jest.fn().mockResolvedValue(mockFileBuffer),
          },
        },
        {
          provide: FieldEncryptionService,
          useValue: {
            encrypt: jest.fn().mockReturnValue({
              value: 'encrypted_text',
              metadata: { encrypted: true },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HealthReportsService>(HealthReportsService);
    healthReportRepository = module.get<Repository<HealthReport>>(getRepositoryToken(HealthReport));
    structuredEntityRepository = module.get<Repository<StructuredEntity>>(getRepositoryToken(StructuredEntity));
    ocrService = module.get<OCRService>(OCRService);
    entityExtractionService = module.get<EntityExtractionService>(EntityExtractionService);
    healthInterpretationService = module.get<HealthInterpretationService>(HealthInterpretationService);
    objectStorageService = module.get<ObjectStorageService>(ObjectStorageService);
    fieldEncryptionService = module.get<FieldEncryptionService>(FieldEncryptionService);
  });

  describe('processHealthReport - Complete Phase 11 Pipeline', () => {
    it('should process health report through complete OCR → NER → Interpretation pipeline', async () => {
      // Arrange
      const options: ProcessHealthReportOptions = {
        userId: 'test-user-id',
        file: {
          buffer: mockFileBuffer,
          originalName: 'blood_test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
        reportMetadata: {
          reportType: HealthReportType.BLOOD_TEST,
          reportTitle: 'Complete Blood Panel',
          testDate: new Date('2024-08-30'),
          labName: 'Advanced Diagnostics Lab',
        },
        userProfile: {
          age: 35,
          gender: 'male',
          region: 'us-east-1',
        },
      };

      // Act
      const result = await service.processHealthReport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.healthReport).toBeDefined();
      expect(result.ocrResult).toBeDefined();
      expect(result.extractionResult).toBeDefined();
      expect(result.interpretation).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle OCR processing failures gracefully', async () => {
      // Arrange
      (ocrService.processDocument as jest.Mock).mockRejectedValue(new Error('OCR failed'));
      
      const options: ProcessHealthReportOptions = {
        userId: 'test-user-id',
        file: {
          buffer: mockFileBuffer,
          originalName: 'corrupted.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
        reportMetadata: {
          reportType: HealthReportType.BLOOD_TEST,
          reportTitle: 'Corrupted Report',
          testDate: new Date('2024-08-30'),
        },
      };

      // Act
      const result = await service.processHealthReport(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('OCR failed');
      expect(mockHealthReport.markAsFailed).toHaveBeenCalledWith('OCR failed');
    });

    it('should use Level 1 AI routing for health-critical processing', async () => {
      // Arrange
      const options: ProcessHealthReportOptions = {
        userId: 'test-user-id',
        file: {
          buffer: mockFileBuffer,
          originalName: 'health_report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
        reportMetadata: {
          reportType: HealthReportType.BLOOD_TEST,
          reportTitle: 'Health Report',
          testDate: new Date('2024-08-30'),
        },
      };

      // Act
      const result = await service.processHealthReport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(entityExtractionService.extractEntities).toHaveBeenCalled();
      expect(healthInterpretationService.interpretHealthReport).toHaveBeenCalled();
    });

    it('should encrypt sensitive health data', async () => {
      // Arrange
      const options: ProcessHealthReportOptions = {
        userId: 'test-user-id',
        file: {
          buffer: mockFileBuffer,
          originalName: 'sensitive_report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
        reportMetadata: {
          reportType: HealthReportType.BLOOD_TEST,
          reportTitle: 'Sensitive Health Data',
          testDate: new Date('2024-08-30'),
        },
      };

      // Act
      const result = await service.processHealthReport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(objectStorageService.uploadFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        expect.objectContaining({
          encryption: true,
          category: 'health-reports',
        }),
      );
      expect(fieldEncryptionService.encrypt).toHaveBeenCalledWith(mockOCRResult.extractedText);
    });
  });

  describe('findByUserId', () => {
    it('should retrieve health reports for a user', async () => {
      // Act
      const reports = await service.findByUserId('test-user-id');

      // Assert
      expect(reports).toHaveLength(1);
      expect(reports[0]).toEqual(mockHealthReport);
    });
  });

  describe('getInterpretation', () => {
    it('should retrieve interpretation for a health report', async () => {
      // Arrange
      const reportWithInterpretation = {
        ...mockHealthReport,
        metadata: { interpretation: mockInterpretation },
      };
      (healthReportRepository.findOne as jest.Mock).mockResolvedValue(reportWithInterpretation);

      // Act
      const interpretation = await service.getInterpretation('test-report-id');

      // Assert
      expect(interpretation).toEqual(mockInterpretation);
    });
  });
});