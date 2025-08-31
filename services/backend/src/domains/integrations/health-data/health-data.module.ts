import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HealthDataEntry } from './entities/health-data-entry.entity';
import { HealthDataConnection } from './entities/health-data-connection.entity';
import { HealthDataService } from './services/health-data.service';
import { HealthDataController } from './controllers/health-data.controller';
import { LogsModule } from '../../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthDataEntry, HealthDataConnection]),
    HttpModule,
    LogsModule,
  ],
  controllers: [HealthDataController],
  providers: [HealthDataService],
  exports: [HealthDataService, TypeOrmModule],
})
export class HealthDataModule {}
