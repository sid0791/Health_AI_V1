import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_sessions')
@Index(['userId', 'deviceId'])
@Index(['refreshToken'], { unique: true })
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'refresh_token', length: 500 })
  refreshToken: string;

  @Column({ name: 'device_id', length: 255, nullable: true })
  deviceId?: string;

  @Column({ name: 'device_name', length: 255, nullable: true })
  deviceName?: string;

  @Column({ name: 'device_platform', length: 50, nullable: true })
  devicePlatform?: string; // ios, android, web

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  // Security metadata
  @Column({ name: 'login_method', length: 50 })
  loginMethod: string; // phone_otp, oauth_google, oauth_apple, oauth_facebook

  @Column({ name: 'mfa_verified', default: false })
  mfaVerified: boolean;

  // Data classification for audit trails
  @Column({ name: 'audit_classification', default: 'AUTH_SESSION' })
  auditClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }

  markAsUsed(): void {
    this.lastUsedAt = new Date();
  }

  revoke(): void {
    this.isActive = false;
  }
}