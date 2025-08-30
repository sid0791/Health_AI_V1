import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ConsentType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  DATA_PROCESSING = 'data_processing',
  MARKETING_COMMUNICATIONS = 'marketing_communications',
  ANALYTICS_TRACKING = 'analytics_tracking',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  AI_PROCESSING = 'ai_processing',
  HEALTH_DATA_PROCESSING = 'health_data_processing',
  LOCATION_TRACKING = 'location_tracking',
  PUSH_NOTIFICATIONS = 'push_notifications',
}

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
}

@Entity('user_consents')
@Index(['userId', 'consentType', 'status'])
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ConsentType,
    name: 'consent_type',
  })
  consentType: ConsentType;

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    default: ConsentStatus.DENIED,
  })
  status: ConsentStatus;

  @Column({ name: 'consent_version', length: 50 })
  consentVersion: string; // Version of the consent document

  @Column({ name: 'granted_at', type: 'timestamp', nullable: true })
  grantedAt?: Date;

  @Column({ name: 'withdrawn_at', type: 'timestamp', nullable: true })
  withdrawnAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  // Consent metadata (encrypted in production)
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'consent_method', length: 50, default: 'web_form' })
  consentMethod: string; // web_form, api, mobile_app, etc.

  // Legal basis for processing under GDPR/similar regulations
  @Column({ name: 'legal_basis', length: 100, nullable: true })
  legalBasis?: string;

  // Additional consent details
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Data classification for audit trails
  @Column({ name: 'audit_classification', default: 'CONSENT' })
  auditClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.consents)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isActive(): boolean {
    return this.status === ConsentStatus.GRANTED && !this.isExpired();
  }

  isExpired(): boolean {
    return this.expiresAt && this.expiresAt < new Date();
  }

  grant(ipAddress?: string, userAgent?: string): void {
    this.status = ConsentStatus.GRANTED;
    this.grantedAt = new Date();
    this.withdrawnAt = null;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
  }

  withdraw(): void {
    this.status = ConsentStatus.WITHDRAWN;
    this.withdrawnAt = new Date();
  }

  renew(newVersion: string, expiresAt?: Date): void {
    this.consentVersion = newVersion;
    this.expiresAt = expiresAt;
    this.status = ConsentStatus.GRANTED;
    this.grantedAt = new Date();
    this.withdrawnAt = null;
  }
}
