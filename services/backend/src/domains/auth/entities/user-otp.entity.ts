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

export enum OTPType {
  PHONE_VERIFICATION = 'phone_verification',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_RECOVERY = 'account_recovery',
}

export enum OTPStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity('user_otps')
@Index(['userId', 'type', 'status'])
@Index(['phone', 'type', 'status'])
export class UserOTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ name: 'otp_code', length: 10 })
  otpCode: string;

  @Column({
    type: 'enum',
    enum: OTPType,
  })
  type: OTPType;

  @Column({
    type: 'enum',
    enum: OTPStatus,
    default: OTPStatus.PENDING,
  })
  status: OTPStatus;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'attempts', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', default: 3 })
  maxAttempts: number;

  // Security metadata
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  // Data classification for audit trails
  @Column({ name: 'audit_classification', default: 'AUTH_OTP' })
  auditClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Helper methods
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isValid(): boolean {
    return this.status === OTPStatus.PENDING && !this.isExpired() && this.attempts < this.maxAttempts;
  }

  canAttempt(): boolean {
    return this.attempts < this.maxAttempts && !this.isExpired();
  }

  verify(): boolean {
    if (!this.isValid()) {
      return false;
    }
    
    this.status = OTPStatus.VERIFIED;
    this.verifiedAt = new Date();
    return true;
  }

  incrementAttempt(): void {
    this.attempts++;
    if (this.attempts >= this.maxAttempts) {
      this.status = OTPStatus.FAILED;
    }
  }

  expire(): void {
    this.status = OTPStatus.EXPIRED;
  }
}