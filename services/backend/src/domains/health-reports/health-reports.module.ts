import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthReport } from './entities/health-report.entity';
import { StructuredEntity } from './entities/structured-entity.entity';
import { HealthReportsController } from './controllers/health-reports.controller';
import { HealthReportsService } from './services/health-reports.service';
import { StructuredEntityService } from './services/structured-entity.service';

@Module({
  imports: [TypeOrmModule.forFeature([HealthReport, StructuredEntity])],
  controllers: [HealthReportsController],
  providers: [HealthReportsService, StructuredEntityService],
  exports: [HealthReportsService, StructuredEntityService],
})
export class HealthReportsModule {}
