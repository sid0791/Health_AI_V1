import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  LogEntry, 
  LogType, 
  LogSource, 
  LogCategory, 
  LogSeverity 
} from '../entities/log-entry.entity';

export interface CreateLogEntryDto {
  userId?: string;
  logType: LogType;
  source: LogSource;
  category: LogCategory;
  severity?: LogSeverity;
  message: string;
  data?: Record<string, any>;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  platform?: string;
  appVersion?: string;
  countryCode?: string;
  timezone?: string;
  resourceType?: string;
  resourceId?: string;
  durationMs?: number;
  memoryUsageMb?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface LogQueryOptions {
  userId?: string;
  logType?: LogType | LogType[];
  source?: LogSource | LogSource[];
  category?: LogCategory | LogCategory[];
  severity?: LogSeverity | LogSeverity[];
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'severity' | 'logType';
  orderDirection?: 'ASC' | 'DESC';
}

export interface LogStatistics {
  totalLogs: number;
  logsByType: Record<string, number>;
  logsByCategory: Record<string, number>;
  logsBySeverity: Record<string, number>;
  logsBySource: Record<string, number>;
  errorRate: number;
  avgDuration: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);
  private readonly isLoggingEnabled: boolean;
  private readonly batchSize: number;
  private readonly retentionDays: number;
  private readonly logQueue: CreateLogEntryDto[] = [];

  constructor(
    @InjectRepository(LogEntry)
    private readonly logEntryRepository: Repository<LogEntry>,
    private readonly configService: ConfigService,
  ) {
    this.isLoggingEnabled = this.configService.get('LOGS_ENABLED', 'true') === 'true';
    this.batchSize = parseInt(this.configService.get('LOGS_BATCH_SIZE', '100'));
    this.retentionDays = parseInt(this.configService.get('LOGS_RETENTION_DAYS', '90'));
    
    this.logger.log(`Logs service initialized - enabled: ${this.isLoggingEnabled}, retention: ${this.retentionDays} days`);
  }

  /**
   * Create a new log entry
   */
  async createLog(logData: CreateLogEntryDto): Promise<LogEntry | null> {
    if (!this.isLoggingEnabled) {
      return null;
    }

    try {
      const logEntry = this.logEntryRepository.create({
        ...logData,
        severity: logData.severity || LogSeverity.INFO,
        success: logData.success !== undefined ? logData.success : true,
        dataClassification: 'LOG',
        retentionDays: this.retentionDays,
      });

      const savedEntry = await this.logEntryRepository.save(logEntry);
      
      // Log to application logger for critical events
      if (logData.severity === LogSeverity.ERROR || logData.severity === LogSeverity.FATAL) {
        this.logger.error(`${logData.logType}: ${logData.message}`, {
          userId: logData.userId,
          data: logData.data,
          errorCode: logData.errorCode,
        });
      } else if (logData.severity === LogSeverity.WARN) {
        this.logger.warn(`${logData.logType}: ${logData.message}`, {
          userId: logData.userId,
          data: logData.data,
        });
      }

      return savedEntry;
    } catch (error) {
      this.logger.error('Failed to create log entry', error);
      // Don't throw - logging failures shouldn't break the application
      return null;
    }
  }

  /**
   * Create a log entry (compatibility method)
   */
  async createLogEntry(userId: string, logData: Partial<CreateLogEntryDto>): Promise<LogEntry | null> {
    return this.createLog({
      userId,
      logType: logData.logType || LogType.SYSTEM_MAINTENANCE,
      source: logData.source || LogSource.BACKEND_SYSTEM,
      category: logData.category || LogCategory.SYSTEM,
      message: logData.message || 'Log entry created',
      ...logData,
    });
  }

  /**
   * Create multiple log entries in batch
   */
  async createLogsBatch(logsData: CreateLogEntryDto[]): Promise<LogEntry[]> {
    if (!this.isLoggingEnabled || logsData.length === 0) {
      return [];
    }

    try {
      const logEntries = logsData.map(logData => 
        this.logEntryRepository.create({
          ...logData,
          severity: logData.severity || LogSeverity.INFO,
          success: logData.success !== undefined ? logData.success : true,
          dataClassification: 'LOG',
          retentionDays: this.retentionDays,
        })
      );

      return await this.logEntryRepository.save(logEntries);
    } catch (error) {
      this.logger.error('Failed to create log entries batch', error);
      return [];
    }
  }

  /**
   * Add log to queue for batch processing
   */
  queueLog(logData: CreateLogEntryDto): void {
    if (!this.isLoggingEnabled) {
      return;
    }

    this.logQueue.push(logData);

    // Process queue if it reaches batch size
    if (this.logQueue.length >= this.batchSize) {
      this.processBatchQueue();
    }
  }

  /**
   * Process queued logs in batch
   */
  private async processBatchQueue(): Promise<void> {
    if (this.logQueue.length === 0) {
      return;
    }

    const batchToProcess = this.logQueue.splice(0, this.batchSize);
    await this.createLogsBatch(batchToProcess);
  }

  /**
   * Query logs with filtering options
   */
  async queryLogs(options: LogQueryOptions = {}): Promise<{
    logs: LogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      userId,
      logType,
      source,
      category,
      severity,
      startDate,
      endDate,
      success,
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = options;

    const queryBuilder = this.logEntryRepository.createQueryBuilder('log');

    // Apply filters
    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (logType) {
      if (Array.isArray(logType)) {
        queryBuilder.andWhere('log.logType IN (:...logTypes)', { logTypes: logType });
      } else {
        queryBuilder.andWhere('log.logType = :logType', { logType });
      }
    }

    if (source) {
      if (Array.isArray(source)) {
        queryBuilder.andWhere('log.source IN (:...sources)', { sources: source });
      } else {
        queryBuilder.andWhere('log.source = :source', { source });
      }
    }

    if (category) {
      if (Array.isArray(category)) {
        queryBuilder.andWhere('log.category IN (:...categories)', { categories: category });
      } else {
        queryBuilder.andWhere('log.category = :category', { category });
      }
    }

    if (severity) {
      if (Array.isArray(severity)) {
        queryBuilder.andWhere('log.severity IN (:...severities)', { severities: severity });
      } else {
        queryBuilder.andWhere('log.severity = :severity', { severity });
      }
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
      }
    }

    if (success !== undefined) {
      queryBuilder.andWhere('log.success = :success', { success });
    }

    // Apply ordering and pagination
    queryBuilder
      .orderBy(`log.${orderBy}`, orderDirection)
      .limit(limit + 1) // Get one extra to check if there are more
      .offset(offset);

    const results = await queryBuilder.getMany();
    const hasMore = results.length > limit;
    const logs = hasMore ? results.slice(0, limit) : results;

    // Get total count for pagination
    const totalQuery = this.logEntryRepository.createQueryBuilder('log');
    
    // Apply same filters for count
    if (userId) totalQuery.andWhere('log.userId = :userId', { userId });
    if (logType) {
      if (Array.isArray(logType)) {
        totalQuery.andWhere('log.logType IN (:...logTypes)', { logTypes: logType });
      } else {
        totalQuery.andWhere('log.logType = :logType', { logType });
      }
    }
    if (source) {
      if (Array.isArray(source)) {
        totalQuery.andWhere('log.source IN (:...sources)', { sources: source });
      } else {
        totalQuery.andWhere('log.source = :source', { source });
      }
    }
    if (category) {
      if (Array.isArray(category)) {
        totalQuery.andWhere('log.category IN (:...categories)', { categories: category });
      } else {
        totalQuery.andWhere('log.category = :category', { category });
      }
    }
    if (severity) {
      if (Array.isArray(severity)) {
        totalQuery.andWhere('log.severity IN (:...severities)', { severities: severity });
      } else {
        totalQuery.andWhere('log.severity = :severity', { severity });
      }
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        totalQuery.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        totalQuery.andWhere('log.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        totalQuery.andWhere('log.createdAt <= :endDate', { endDate });
      }
    }
    if (success !== undefined) {
      totalQuery.andWhere('log.success = :success', { success });
    }

    const total = await totalQuery.getCount();

    return { logs, total, hasMore };
  }

  /**
   * Get log statistics
   */
  async getStatistics(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<LogStatistics> {
    const { userId, startDate, endDate } = options;

    const queryBuilder = this.logEntryRepository.createQueryBuilder('log');

    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
      }
    }

    const [
      totalLogs,
      logsByType,
      logsByCategory,
      logsBySeverity,
      logsBySource,
      errorLogs,
      avgDurationResult,
      dateRangeResult
    ] = await Promise.all([
      // Total logs count
      queryBuilder.getCount(),

      // Logs by type
      this.logEntryRepository
        .createQueryBuilder('log')
        .select('log.logType', 'type')
        .addSelect('COUNT(*)', 'count')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .groupBy('log.logType')
        .getRawMany(),

      // Logs by category
      this.logEntryRepository
        .createQueryBuilder('log')
        .select('log.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .groupBy('log.category')
        .getRawMany(),

      // Logs by severity
      this.logEntryRepository
        .createQueryBuilder('log')
        .select('log.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .groupBy('log.severity')
        .getRawMany(),

      // Logs by source
      this.logEntryRepository
        .createQueryBuilder('log')
        .select('log.source', 'source')
        .addSelect('COUNT(*)', 'count')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .groupBy('log.source')
        .getRawMany(),

      // Error logs count
      this.logEntryRepository
        .createQueryBuilder('log')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .andWhere('log.success = false')
        .getCount(),

      // Average duration
      this.logEntryRepository
        .createQueryBuilder('log')
        .select('AVG(log.durationMs)', 'avgDuration')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .andWhere('log.durationMs IS NOT NULL')
        .getRawOne(),

      // Date range
      this.logEntryRepository
        .createQueryBuilder('log')
        .select('MIN(log.createdAt)', 'start')
        .addSelect('MAX(log.createdAt)', 'end')
        .where(this.buildWhereClause({ userId, startDate, endDate }))
        .getRawOne(),
    ]);

    return {
      totalLogs,
      logsByType: this.arrayToRecord(logsByType, 'type'),
      logsByCategory: this.arrayToRecord(logsByCategory, 'category'),
      logsBySeverity: this.arrayToRecord(logsBySeverity, 'severity'),
      logsBySource: this.arrayToRecord(logsBySource, 'source'),
      errorRate: totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0,
      avgDuration: parseFloat(avgDurationResult?.avgDuration || '0'),
      dateRange: {
        start: dateRangeResult?.start || new Date(),
        end: dateRangeResult?.end || new Date(),
      },
    };
  }

  /**
   * Delete old logs based on retention policy
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const result = await this.logEntryRepository
        .createQueryBuilder()
        .delete()
        .where('created_at < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old log entries older than ${this.retentionDays} days`);
    } catch (error) {
      this.logger.error('Failed to cleanup old logs', error);
    }
  }

  /**
   * Process any remaining logs in queue (called on shutdown or periodically)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueuedLogs(): Promise<void> {
    if (this.logQueue.length > 0) {
      await this.processBatchQueue();
    }
  }

  /**
   * Health check for logging system
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to create a test log entry
      const testLog = await this.createLog({
        logType: LogType.SYSTEM_MAINTENANCE,
        source: LogSource.BACKEND_SYSTEM,
        category: LogCategory.SYSTEM,
        severity: LogSeverity.DEBUG,
        message: 'Logging system health check',
        data: { timestamp: new Date().toISOString() },
      });

      return testLog !== null;
    } catch (error) {
      this.logger.error('Logging system health check failed', error);
      return false;
    }
  }

  /**
   * Helper method to build where clause for statistics queries
   */
  private buildWhereClause(options: { userId?: string; startDate?: Date; endDate?: Date }): string {
    const conditions: string[] = [];

    if (options.userId) {
      conditions.push('log.userId = :userId');
    }

    if (options.startDate && options.endDate) {
      conditions.push('log.createdAt BETWEEN :startDate AND :endDate');
    } else if (options.startDate) {
      conditions.push('log.createdAt >= :startDate');
    } else if (options.endDate) {
      conditions.push('log.createdAt <= :endDate');
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  }

  /**
   * Helper method to convert array results to record
   */
  private arrayToRecord(results: any[], keyField: string): Record<string, number> {
    return results.reduce((acc, item) => {
      acc[item[keyField]] = parseInt(item.count);
      return acc;
    }, {});
  }

  /**
   * Convenience methods for common log types
   */

  async logMeal(userId: string, mealData: any, source: LogSource = LogSource.MOBILE_APP): Promise<LogEntry | null> {
    return this.createLog(LogEntry.createMealLog(userId, LogType.MEAL_LOGGED, 'Meal logged', mealData, source));
  }

  async logWorkout(userId: string, workoutData: any, source: LogSource = LogSource.MOBILE_APP): Promise<LogEntry | null> {
    return this.createLog(LogEntry.createWorkoutLog(userId, LogType.WORKOUT_COMPLETED, 'Workout completed', workoutData, source));
  }

  async logHealthMetric(userId: string, healthData: any, source: LogSource = LogSource.MOBILE_APP): Promise<LogEntry | null> {
    return this.createLog(LogEntry.createHealthLog(userId, LogType.HEALTH_METRIC_LOGGED, 'Health metric logged', healthData, source));
  }

  async logAIInteraction(userId: string, interactionData: any, source: LogSource = LogSource.AI_SYSTEM): Promise<LogEntry | null> {
    return this.createLog(LogEntry.createAIInteractionLog(userId, LogType.AI_CHAT_MESSAGE, 'AI interaction', interactionData, source));
  }

  async logError(error: Error, context?: any, userId?: string): Promise<LogEntry | null> {
    return this.createLog(LogEntry.createErrorLog(
      LogType.ERROR_OCCURRED,
      'Application error occurred',
      { error: error.message, stack: error.stack, context },
      'APP_ERROR',
      error.message,
      userId
    ));
  }
}