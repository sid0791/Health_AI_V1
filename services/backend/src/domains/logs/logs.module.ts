import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Entities
import { LogEntry } from './entities/log-entry.entity';

// Services
import { LogsService } from './services/logs.service';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([LogEntry]),

    // Schedule module for automated cleanup and batch processing
    ScheduleModule.forRoot(),

    // Config module for configuration management
    ConfigModule,
  ],

  providers: [LogsService],

  exports: [
    // Export LogsService for use in other modules
    LogsService,
    // Export TypeORM repository for LogEntry
    TypeOrmModule,
  ],
})
export class LogsModule {}
