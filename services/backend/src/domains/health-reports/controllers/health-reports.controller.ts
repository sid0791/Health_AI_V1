import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Param, 
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { HealthReportsService, ProcessHealthReportOptions } from '../services/health-reports.service';
import { HealthInterpretationService } from '../services/health-interpretation.service';
import { HealthReportType } from '../entities/health-report.entity';

@ApiTags('health-reports')
@Controller('health-reports')
export class HealthReportsController {
  constructor(
    private readonly healthReportsService: HealthReportsService,
    private readonly healthInterpretationService: HealthInterpretationService,
  ) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get health reports for a user' })
  @ApiResponse({ status: 200, description: 'Health reports retrieved successfully' })
  async findByUserId(@Param('userId') userId: string) {
    return this.healthReportsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get health report by ID' })
  @ApiResponse({ status: 200, description: 'Health report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Health report not found' })
  async findById(@Param('id') id: string) {
    const report = await this.healthReportsService.findById(id);
    if (!report) {
      throw new BadRequestException('Health report not found');
    }
    return report;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and process health report' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Health report file upload',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Health report file (PDF, JPG, PNG)',
        },
        userId: {
          type: 'string',
          description: 'User ID',
        },
        reportType: {
          type: 'string',
          enum: Object.values(HealthReportType),
          description: 'Type of health report',
        },
        reportTitle: {
          type: 'string',
          description: 'Title of the report',
        },
        testDate: {
          type: 'string',
          format: 'date',
          description: 'Date when tests were performed',
        },
        labName: {
          type: 'string',
          description: 'Laboratory name (optional)',
        },
        doctorName: {
          type: 'string',
          description: 'Doctor name (optional)',
        },
        referenceNumber: {
          type: 'string',
          description: 'Lab reference number (optional)',
        },
        userAge: {
          type: 'number',
          description: 'User age for age-specific reference ranges',
        },
        userGender: {
          type: 'string',
          enum: ['male', 'female'],
          description: 'User gender for gender-specific reference ranges',
        },
        region: {
          type: 'string',
          description: 'User region for data residency',
        },
        skipOCR: {
          type: 'boolean',
          description: 'Skip OCR processing (for testing)',
        },
        skipInterpretation: {
          type: 'boolean',
          description: 'Skip interpretation (for testing)',
        },
        enableManualReview: {
          type: 'boolean',
          description: 'Force manual review',
        },
        qualityThreshold: {
          type: 'number',
          description: 'OCR quality threshold (0-1)',
        },
      },
      required: ['file', 'userId', 'reportType', 'reportTitle', 'testDate'],
    },
  })
  @ApiResponse({ status: 201, description: 'Health report processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  async uploadHealthReport(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 10MB');
    }

    // Parse test date
    let testDate: Date;
    try {
      testDate = new Date(body.testDate);
      if (isNaN(testDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      throw new BadRequestException('Invalid test date format. Use YYYY-MM-DD');
    }

    // Build processing options
    const options: ProcessHealthReportOptions = {
      userId: body.userId,
      file: {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      reportMetadata: {
        reportType: body.reportType as HealthReportType,
        reportTitle: body.reportTitle,
        testDate,
        labName: body.labName,
        doctorName: body.doctorName,
        referenceNumber: body.referenceNumber,
      },
      userProfile: {
        age: body.userAge ? parseInt(body.userAge) : undefined,
        gender: body.userGender,
        region: body.region,
      },
      uploadMetadata: {
        ip: this.getClientIp(body),
        userAgent: body.userAgent,
      },
      processingOptions: {
        skipOCR: body.skipOCR === 'true',
        skipInterpretation: body.skipInterpretation === 'true',
        enableManualReview: body.enableManualReview === 'true',
        qualityThreshold: body.qualityThreshold ? parseFloat(body.qualityThreshold) : undefined,
      },
    };

    return this.healthReportsService.processHealthReport(options);
  }

  @Get(':id/interpretation')
  @ApiOperation({ summary: 'Get health report interpretation' })
  @ApiResponse({ status: 200, description: 'Interpretation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Interpretation not found' })
  async getInterpretation(@Param('id') id: string) {
    const interpretation = await this.healthReportsService.getInterpretation(id);
    if (!interpretation) {
      throw new BadRequestException('Interpretation not found or not yet generated');
    }
    return interpretation;
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocess health report' })
  @ApiResponse({ status: 200, description: 'Report reprocessed successfully' })
  @ApiResponse({ status: 404, description: 'Health report not found' })
  async reprocessReport(
    @Param('id') id: string,
    @Body() options: {
      skipOCR?: boolean;
      skipExtraction?: boolean;
      skipInterpretation?: boolean;
    } = {},
  ) {
    return this.healthReportsService.reprocessReport(id, options);
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Complete manual review of health report' })
  @ApiResponse({ status: 200, description: 'Review completed successfully' })
  @ApiResponse({ status: 404, description: 'Health report not found' })
  async completeReview(
    @Param('id') id: string,
    @Body() reviewData: {
      reviewerId: string;
      approved: boolean;
      notes?: string;
    },
  ) {
    const report = await this.healthReportsService.findById(id);
    if (!report) {
      throw new BadRequestException('Health report not found');
    }

    if (!report.needsReview()) {
      throw new BadRequestException('Report does not require review');
    }

    report.completeReview(reviewData.reviewerId, reviewData.approved, reviewData.notes);
    await this.healthReportsService.create(report);

    return { success: true, message: 'Review completed successfully' };
  }

  @Get(':id/entities')
  @ApiOperation({ summary: 'Get structured entities from health report' })
  @ApiResponse({ status: 200, description: 'Entities retrieved successfully' })
  async getEntities(
    @Param('id') id: string,
    @Query('category') category?: string,
    @Query('abnormalOnly') abnormalOnly?: string,
  ) {
    const report = await this.healthReportsService.findById(id);
    if (!report) {
      throw new BadRequestException('Health report not found');
    }

    let entities = report.structuredEntities || [];

    // Filter by category if specified
    if (category) {
      entities = entities.filter(entity => 
        entity.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter abnormal only if specified
    if (abnormalOnly === 'true') {
      entities = entities.filter(entity => entity.isAbnormal);
    }

    return entities;
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get processing status of health report' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getProcessingStatus(@Param('id') id: string) {
    const report = await this.healthReportsService.findById(id);
    if (!report) {
      throw new BadRequestException('Health report not found');
    }

    return {
      id: report.id,
      status: report.processingStatus,
      isProcessing: report.isProcessing(),
      isProcessed: report.isProcessed(),
      hasFailed: report.hasFailed(),
      needsReview: report.needsReview(),
      confidence: report.ocrConfidence,
      processingStarted: report.processingStartedAt,
      processingCompleted: report.processingCompletedAt,
      processingDuration: report.getProcessingDuration(),
      error: report.processingError,
      entitiesCount: report.structuredEntities?.length || 0,
      hasInterpretation: !!report.metadata?.interpretation,
    };
  }

  /**
   * Extract client IP from request (mock implementation)
   */
  private getClientIp(body: any): string {
    // In real implementation, this would extract from request headers
    return '127.0.0.1';
  }
}
