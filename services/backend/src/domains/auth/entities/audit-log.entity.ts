import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  
  // OTP events
  OTP_GENERATED = 'otp_generated',
  OTP_VERIFIED = 'otp_verified',
  OTP_FAILED = 'otp_failed',
  
  // OAuth events
  OAUTH_CONNECTED = 'oauth_connected',
  OAUTH_DISCONNECTED = 'oauth_disconnected',
  
  // Consent events
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_WITHDRAWN = 'consent_withdrawn',
  
  // Data events
  DATA_EXPORT_REQUESTED = 'data_export_requested',
  DATA_DELETE_REQUESTED = 'data_delete_requested',
  DATA_ACCESS = 'data_access',
  
  // Privacy events
  DLP_TRIGGERED = 'dlp_triggered',
  PSEUDONYMIZATION_APPLIED = 'pseudonymization_applied',
  
  // Security events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
@Index(['userId', 'eventType'])
@Index(['eventType', 'severity'])
@Index(['createdAt'])
@Index(['ipAddress'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: AuditEventType,
    name: 'event_type',
  })
  eventType: AuditEventType;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.LOW,
  })
  severity: AuditSeverity;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Request context
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'request_id', length: 100, nullable: true })
  requestId?: string;

  @Column({ name: 'session_id', length: 100, nullable: true })
  sessionId?: string;

  // Resource information
  @Column({ name: 'resource_type', length: 100, nullable: true })
  resourceType?: string;

  @Column({ name: 'resource_id', length: 100, nullable: true })
  resourceId?: string;

  // Status and result
  @Column({ default: true })
  success: boolean;

  @Column({ name: 'error_code', length: 50, nullable: true })
  errorCode?: string;

  @Column({ name: 'error_message', length: 500, nullable: true })
  errorMessage?: string;

  // Data classification
  @Column({ name: 'data_classification', default: 'AUDIT' })
  dataClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Static factory methods
  static createAuthEvent(
    eventType: AuditEventType,
    userId: string,
    description: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Partial<AuditLog> {
    return {
      eventType,
      userId,
      description,
      metadata,
      ipAddress,
      userAgent,
      severity: AuditSeverity.MEDIUM,
      success: true,
    };
  }

  static createSecurityEvent(
    eventType: AuditEventType,
    description: string,
    severity: AuditSeverity = AuditSeverity.HIGH,
    metadata?: Record<string, any>,
    ipAddress?: string,
  ): Partial<AuditLog> {
    return {
      eventType,
      description,
      metadata,
      ipAddress,
      severity,
      success: false,
    };
  }

  static createDataEvent(
    eventType: AuditEventType,
    userId: string,
    resourceType: string,
    resourceId: string,
    description: string,
    metadata?: Record<string, any>,
  ): Partial<AuditLog> {
    return {
      eventType,
      userId,
      resourceType,
      resourceId,
      description,
      metadata,
      severity: AuditSeverity.MEDIUM,
      success: true,
    };
  }
}