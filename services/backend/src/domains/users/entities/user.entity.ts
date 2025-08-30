import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UserConsent } from './user-consent.entity';
import { UserPreferences } from './user-preferences.entity';
import { UserGoals } from './user-goals.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phoneNumber'], { unique: true, where: 'phone_number IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'phone_number', nullable: true, length: 20 })
  phoneNumber?: string;

  @Column({ name: 'password_hash', nullable: true, length: 255 })
  passwordHash?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'login_count', default: 0 })
  loginCount: number;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  // Data classification tags for compliance
  @Column({ name: 'data_residency_region', length: 10, default: 'IN' })
  dataResidencyRegion: string;

  @Column({ name: 'pii_classification', default: 'PERSONAL' })
  piiClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // Relationships
  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @OneToMany(() => UserConsent, (consent) => consent.user, { cascade: true })
  consents: UserConsent[];

  @OneToOne(() => UserPreferences, (preferences) => preferences.user, {
    cascade: true,
  })
  preferences: UserPreferences;

  @OneToOne(() => UserGoals, (goals) => goals.user, { cascade: true })
  goals: UserGoals;

  // Soft delete method
  softDelete(): void {
    this.status = UserStatus.DELETED;
    this.deletedAt = new Date();
    this.email = `deleted_${this.id}@deleted.local`;
    this.phoneNumber = null;
  }

  // Check if user is locked
  isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  // Lock user account
  lock(durationMinutes: number = 30): void {
    this.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  // Unlock user account
  unlock(): void {
    this.lockedUntil = null;
    this.failedLoginAttempts = 0;
  }
}
