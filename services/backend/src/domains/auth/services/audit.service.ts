import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditEventType, AuditSeverity } from '../entities/audit-log.entity';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log authentication event
   */
  async logAuthEvent(
    eventType: AuditEventType,
    description: string,
    context: AuditContext,
    metadata?: Record<string, any>,
    success: boolean = true,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        eventType,
        description,
        metadata,
        success,
        severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
        ...context,
      });

      await this.auditLogRepository.save(auditLog);
      
      this.logger.log(`Auth event logged: ${eventType} - ${description}`, {
        userId: context.userId,
        success,
      });
    } catch (error) {
      this.logger.error('Failed to log auth event', error, {
        eventType,
        description,
        context,
      });
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    description: string,
    severity: AuditSeverity,
    context: AuditContext,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        eventType,
        description,
        metadata,
        severity,
        success: false,
        ...context,
      });

      await this.auditLogRepository.save(auditLog);
      
      this.logger.warn(`Security event logged: ${eventType} - ${description}`, {
        severity,
        context,
      });
    } catch (error) {
      this.logger.error('Failed to log security event', error, {
        eventType,
        description,
        context,
      });
    }
  }

  /**
   * Log data access event
   */
  async logDataEvent(
    eventType: AuditEventType,
    description: string,
    context: AuditContext,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        eventType,
        description,
        metadata,
        severity: AuditSeverity.MEDIUM,
        success: true,
        ...context,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error('Failed to log data event', error, {
        eventType,
        description,
        context,
      });
    }
  }

  /**
   * Log DLP event
   */
  async logDLPEvent(
    description: string,
    context: AuditContext,
    dlpResult: {
      redactedFields: string[];
      pseudonymizedFields: string[];
      riskScore: number;
    },
  ): Promise<void> {
    try {
      const metadata = {
        redactedFields: dlpResult.redactedFields,
        pseudonymizedFields: dlpResult.pseudonymizedFields,
        riskScore: dlpResult.riskScore,
      };

      const severity = dlpResult.riskScore > 50 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM;

      const auditLog = this.auditLogRepository.create({
        eventType: AuditEventType.DLP_TRIGGERED,
        description,
        metadata,
        severity,
        success: true,
        ...context,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error('Failed to log DLP event', error);
    }
  }

  /**
   * Get audit logs for user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(
    hours: number = 24,
    severity?: AuditSeverity,
  ): Promise<AuditLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.createdAt >= :since', { since })
      .andWhere('audit.success = false')
      .orderBy('audit.createdAt', 'DESC');

    if (severity) {
      queryBuilder.andWhere('audit.severity = :severity', { severity });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, any>> {
    const totalEvents = await this.auditLogRepository.count({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        } as any,
      },
    });

    const securityEvents = await this.auditLogRepository.count({
      where: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        } as any,
        success: false,
      },
    });

    const eventTypes = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('audit.eventType')
      .getRawMany();

    const severityDistribution = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('audit.severity')
      .getRawMany();

    return {
      totalEvents,
      securityEvents,
      eventTypes,
      severityDistribution,
      period: { startDate, endDate },
    };
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old audit logs older than ${daysToKeep} days`);
    
    return result.affected || 0;
  }
}