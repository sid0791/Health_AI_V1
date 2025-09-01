import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HealthDataEntry } from './entities/health-data-entry.entity';
import { HealthDataConnection } from './entities/health-data-connection.entity';
import { HealthDataService } from './services/health-data.service';
import { EnhancedHealthIntegrationService } from './services/enhanced-health-integration.service';
import { HealthDataController } from './controllers/health-data.controller';
import { LogsModule } from '../../logs/logs.module';
import { UsersModule } from '../../users/users.module';
import { AIRoutingModule } from '../../ai-routing/ai-routing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthDataEntry, HealthDataConnection]),
    HttpModule,
    LogsModule,
    UsersModule,
    AIRoutingModule,
  ],
  controllers: [HealthDataController],
  providers: [HealthDataService, EnhancedHealthIntegrationService],
  exports: [HealthDataService, EnhancedHealthIntegrationService, TypeOrmModule],
})
export class HealthDataModule {}
