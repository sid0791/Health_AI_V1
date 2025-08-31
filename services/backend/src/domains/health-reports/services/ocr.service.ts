import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIRoutingService } from '../../ai-routing/services/ai-routing.service';

export interface OCRResult {
  extractedText: string;
  confidence: number;
  provider: string;
  processingTimeMs: number;
  tableData?: TableData[];
  sections?: DocumentSection[];
  metadata: OCRMetadata;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  confidence: number;
  location: BoundingBox;
}

export interface DocumentSection {
  title: string;
  content: string;
  confidence: number;
  location: BoundingBox;
  sectionType: 'header' | 'body' | 'footer' | 'table' | 'list';
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page?: number;
}

export interface OCRMetadata {
  documentType: string;
  pageCount: number;
  language: string;
  quality: 'high' | 'medium' | 'low';
  rotationAngle?: number;
  textDensity: number;
}

export enum OCRProvider {
  GOOGLE_DOCUMENT_AI = 'google_document_ai',
  AZURE_DOCUMENT_INTELLIGENCE = 'azure_document_intelligence',
  AWS_TEXTRACT = 'aws_textract',
  TESSERACT = 'tesseract',
}

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiRoutingService: AIRoutingService,
  ) {}

  /**
   * Process document using optimal OCR provider with fallback chain
   */
  async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    options: {
      userId?: string;
      sessionId?: string;
      language?: string;
      enableTableExtraction?: boolean;
      enableSectionExtraction?: boolean;
      qualityThreshold?: number;
    } = {},
  ): Promise<OCRResult> {
    const startTime = Date.now();
    this.logger.debug(`Starting OCR processing for document type: ${mimeType}`);

    // Validate file type
    this.validateFileType(mimeType);

    // Determine provider chain based on document type and requirements
    const providerChain = this.getProviderChain(mimeType, options);

    let lastError: Error;
    for (const provider of providerChain) {
      try {
        this.logger.debug(`Attempting OCR with provider: ${provider}`);

        const result = await this.processWithProvider(provider, fileBuffer, mimeType, options);

        // Validate result quality
        if (this.isResultAcceptable(result, options.qualityThreshold || 0.7)) {
          result.processingTimeMs = Date.now() - startTime;

          this.logger.log(
            `OCR completed successfully with ${provider} in ${result.processingTimeMs}ms`,
          );
          return result;
        } else {
          this.logger.warn(`OCR result from ${provider} below quality threshold`);
          throw new Error(`Quality threshold not met: ${result.confidence}`);
        }
      } catch (error) {
        lastError = error;
        this.logger.warn(`OCR failed with ${provider}: ${error.message}`);

        // Continue to next provider in fallback chain
        continue;
      }
    }

    throw new Error(`All OCR providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Process with specific OCR provider
   */
  private async processWithProvider(
    provider: OCRProvider,
    fileBuffer: Buffer,
    mimeType: string,
    options: any,
  ): Promise<OCRResult> {
    switch (provider) {
      case OCRProvider.GOOGLE_DOCUMENT_AI:
        return this.processWithGoogleDocumentAI(fileBuffer, mimeType, options);

      case OCRProvider.AZURE_DOCUMENT_INTELLIGENCE:
        return this.processWithAzureDocumentIntelligence(fileBuffer, mimeType, options);

      case OCRProvider.AWS_TEXTRACT:
        return this.processWithAWSTextract(fileBuffer, mimeType, options);

      case OCRProvider.TESSERACT:
        return this.processWithTesseract(fileBuffer, mimeType, options);

      default:
        throw new Error(`Unsupported OCR provider: ${provider}`);
    }
  }

  /**
   * Google Document AI processing (Primary - Highest Accuracy)
   */
  private async processWithGoogleDocumentAI(
    fileBuffer: Buffer,
    mimeType: string,
    options: any,
  ): Promise<OCRResult> {
    const apiKey = this.configService.get('GOOGLE_DOCUMENT_AI_KEY');
    const projectId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID');
    const processorId = this.configService.get('GOOGLE_DOCUMENT_AI_PROCESSOR_ID');

    if (!apiKey || apiKey === 'DEMO_KEY') {
      throw new Error('Google Document AI not configured');
    }

    // This would integrate with Google Document AI API
    // For now, implementing mock response structure
    const mockResult: OCRResult = {
      extractedText: this.generateMockHealthReportText(),
      confidence: 0.95,
      provider: OCRProvider.GOOGLE_DOCUMENT_AI,
      processingTimeMs: 0,
      tableData: this.generateMockTableData(),
      sections: this.generateMockSections(),
      metadata: {
        documentType: 'medical_report',
        pageCount: 1,
        language: options.language || 'en',
        quality: 'high',
        textDensity: 85.5,
      },
    };

    return mockResult;
  }

  /**
   * Azure Document Intelligence processing (Primary Alternative)
   */
  private async processWithAzureDocumentIntelligence(
    fileBuffer: Buffer,
    mimeType: string,
    options: any,
  ): Promise<OCRResult> {
    const apiKey = this.configService.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    const endpoint = this.configService.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');

    if (!apiKey || apiKey === 'DEMO_KEY') {
      throw new Error('Azure Document Intelligence not configured');
    }

    // Mock implementation - would call Azure Document Intelligence API
    const mockResult: OCRResult = {
      extractedText: this.generateMockHealthReportText(),
      confidence: 0.93,
      provider: OCRProvider.AZURE_DOCUMENT_INTELLIGENCE,
      processingTimeMs: 0,
      tableData: this.generateMockTableData(),
      sections: this.generateMockSections(),
      metadata: {
        documentType: 'medical_report',
        pageCount: 1,
        language: options.language || 'en',
        quality: 'high',
        textDensity: 82.3,
      },
    };

    return mockResult;
  }

  /**
   * AWS Textract processing (Secondary Fallback)
   */
  private async processWithAWSTextract(
    fileBuffer: Buffer,
    mimeType: string,
    options: any,
  ): Promise<OCRResult> {
    const accessKey = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

    if (!accessKey || accessKey === 'DEMO_KEY') {
      throw new Error('AWS Textract not configured');
    }

    // Mock implementation - would call AWS Textract API
    const mockResult: OCRResult = {
      extractedText: this.generateMockHealthReportText(),
      confidence: 0.88,
      provider: OCRProvider.AWS_TEXTRACT,
      processingTimeMs: 0,
      tableData: this.generateMockTableData(),
      sections: this.generateMockSections(),
      metadata: {
        documentType: 'medical_report',
        pageCount: 1,
        language: options.language || 'en',
        quality: 'medium',
        textDensity: 78.1,
      },
    };

    return mockResult;
  }

  /**
   * Tesseract processing (Open Source Fallback)
   */
  private async processWithTesseract(
    fileBuffer: Buffer,
    mimeType: string,
    options: any,
  ): Promise<OCRResult> {
    // Mock implementation - would use Tesseract.js or system Tesseract
    const mockResult: OCRResult = {
      extractedText: this.generateMockHealthReportText(),
      confidence: 0.75,
      provider: OCRProvider.TESSERACT,
      processingTimeMs: 0,
      tableData: this.generateMockTableData(),
      sections: this.generateMockSections(),
      metadata: {
        documentType: 'medical_report',
        pageCount: 1,
        language: options.language || 'en',
        quality: 'medium',
        textDensity: 70.2,
      },
    };

    return mockResult;
  }

  /**
   * Determine optimal provider chain based on requirements
   */
  private getProviderChain(mimeType: string, options: any): OCRProvider[] {
    // For health reports, prioritize accuracy over cost (use Level 1 equivalent logic)
    const highAccuracyChain = [
      OCRProvider.GOOGLE_DOCUMENT_AI,
      OCRProvider.AZURE_DOCUMENT_INTELLIGENCE,
      OCRProvider.AWS_TEXTRACT,
      OCRProvider.TESSERACT,
    ];

    // For non-critical documents, can start with cost-effective options
    const costEffectiveChain = [
      OCRProvider.TESSERACT,
      OCRProvider.AWS_TEXTRACT,
      OCRProvider.GOOGLE_DOCUMENT_AI,
    ];

    // Health reports always use high accuracy chain
    return highAccuracyChain;
  }

  /**
   * Validate file type is supported
   */
  private validateFileType(mimeType: string): void {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'image/webp',
    ];

    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Check if OCR result meets quality threshold
   */
  private isResultAcceptable(result: OCRResult, threshold: number): boolean {
    if (result.confidence < threshold) {
      return false;
    }

    // Additional quality checks
    if (result.extractedText.length < 10) {
      return false;
    }

    // Check for reasonable text density
    if (result.metadata.textDensity < 20) {
      return false;
    }

    return true;
  }

  /**
   * Generate mock health report text for testing
   */
  private generateMockHealthReportText(): string {
    return `
COMPREHENSIVE HEALTH PANEL REPORT

Patient: John Doe
Date: 2024-08-30
Lab: Advanced Diagnostics Lab

LIPID PROFILE:
Total Cholesterol: 195 mg/dL (Normal: <200 mg/dL)
LDL Cholesterol: 115 mg/dL (Normal: <100 mg/dL) - HIGH
HDL Cholesterol: 45 mg/dL (Normal: >40 mg/dL)
Triglycerides: 150 mg/dL (Normal: <150 mg/dL)

DIABETES PANEL:
Fasting Glucose: 102 mg/dL (Normal: 70-100 mg/dL) - HIGH
HbA1c: 5.8% (Normal: <5.7%) - BORDERLINE

COMPLETE BLOOD COUNT:
Hemoglobin: 14.2 g/dL (Normal: 13.5-17.5 g/dL)
Hematocrit: 42.1% (Normal: 41-53%)
White Blood Cells: 6,800 /μL (Normal: 4,500-11,000 /μL)
Platelets: 285,000 /μL (Normal: 150,000-450,000 /μL)

LIVER FUNCTION:
ALT: 28 U/L (Normal: 7-40 U/L)
AST: 24 U/L (Normal: 8-40 U/L)
Bilirubin Total: 0.8 mg/dL (Normal: 0.3-1.2 mg/dL)

KIDNEY FUNCTION:
Creatinine: 0.9 mg/dL (Normal: 0.7-1.3 mg/dL)
BUN: 18 mg/dL (Normal: 7-20 mg/dL)
eGFR: >90 mL/min/1.73m² (Normal: >90)

THYROID FUNCTION:
TSH: 2.1 mIU/L (Normal: 0.4-4.0 mIU/L)
Free T4: 1.2 ng/dL (Normal: 0.8-1.8 ng/dL)

VITAMIN LEVELS:
Vitamin D: 28 ng/mL (Normal: 30-100 ng/mL) - LOW
Vitamin B12: 450 pg/mL (Normal: 300-900 pg/mL)
Folate: 12 ng/mL (Normal: 3-20 ng/mL)
    `.trim();
  }

  /**
   * Generate mock table data for testing
   */
  private generateMockTableData(): TableData[] {
    return [
      {
        headers: ['Test Name', 'Result', 'Reference Range', 'Flag'],
        rows: [
          ['Total Cholesterol', '195 mg/dL', '<200 mg/dL', ''],
          ['LDL Cholesterol', '115 mg/dL', '<100 mg/dL', 'H'],
          ['HDL Cholesterol', '45 mg/dL', '>40 mg/dL', ''],
          ['Fasting Glucose', '102 mg/dL', '70-100 mg/dL', 'H'],
          ['HbA1c', '5.8%', '<5.7%', 'H'],
        ],
        confidence: 0.92,
        location: { x: 50, y: 200, width: 400, height: 150, page: 1 },
      },
    ];
  }

  /**
   * Generate mock document sections for testing
   */
  private generateMockSections(): DocumentSection[] {
    return [
      {
        title: 'Patient Information',
        content: 'Patient: John Doe\nDate: 2024-08-30\nLab: Advanced Diagnostics Lab',
        confidence: 0.98,
        location: { x: 50, y: 50, width: 400, height: 100, page: 1 },
        sectionType: 'header',
      },
      {
        title: 'Lipid Profile',
        content:
          'Total Cholesterol: 195 mg/dL\nLDL: 115 mg/dL\nHDL: 45 mg/dL\nTriglycerides: 150 mg/dL',
        confidence: 0.95,
        location: { x: 50, y: 200, width: 400, height: 120, page: 1 },
        sectionType: 'body',
      },
      {
        title: 'Diabetes Panel',
        content: 'Fasting Glucose: 102 mg/dL\nHbA1c: 5.8%',
        confidence: 0.94,
        location: { x: 50, y: 350, width: 400, height: 80, page: 1 },
        sectionType: 'body',
      },
    ];
  }
}
