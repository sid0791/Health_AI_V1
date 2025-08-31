import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthReport } from './entities/health-report.entity';
import { StructuredEntity } from './entities/structured-entity.entity';
import { HealthReportsController } from './controllers/health-reports.controller';
import { HealthReportsService } from './services/health-reports.service';
import { StructuredEntityService } from './services/structured-entity.service';
import { OCRService } from './services/ocr.service';
import { EntityExtractionService } from './services/entity-extraction.service';
import { HealthInterpretationService } from './services/health-interpretation.service';
import { AIRoutingModule } from '../ai-routing/ai-routing.module';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { FieldEncryptionService } from '../../common/encryption/field-encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthReport, StructuredEntity]),
    AIRoutingModule, // Import AI routing for Level 1 processing
  ],
  controllers: [HealthReportsController],
  providers: [
    HealthReportsService,
    StructuredEntityService,
    OCRService,
    EntityExtractionService,
    HealthInterpretationService,
    ObjectStorageService,
    FieldEncryptionService,
  ],
  exports: [
    HealthReportsService,
    StructuredEntityService,
    OCRService,
    EntityExtractionService,
    HealthInterpretationService,
  ],
})
export class HealthReportsModule {}
