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
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['phoneNumber'], { unique: true, where: 'phone_number IS NOT NULL' })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255, nullable: true })
  email?: string;

  @Column({ name: 'phone_number', nullable: true, length: 20 })
  phoneNumber?: string;

  // New phone field for consistency with auth system
  @Column({ nullable: true, length: 20 })
  phone?: string;

  // Name field for OAuth users
  @Column({ nullable: true, length: 255 })
  name?: string;

  @Column({ name: 'password_hash', nullable: true, length: 255 })
  passwordHash?: string;

  // Profile completion status
  @Column({ name: 'profile_completed', default: false })
  profileCompleted: boolean;

  // Profile picture URL from OAuth or uploaded
  @Column({ name: 'profile_picture_url', nullable: true, length: 500 })
  profilePictureUrl?: string;

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

  // OAuth verification status
  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'login_count', default: 0 })
  loginCount: number;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  // Token usage tracking for AI chat features
  @Column({ name: 'daily_token_limit', default: 10000 })
  dailyTokenLimit: number;

  @Column({ name: 'monthly_token_limit', default: 250000 })
  monthlyTokenLimit: number;

  @Column({ name: 'daily_tokens_used', default: 0 })
  dailyTokensUsed: number;

  @Column({ name: 'monthly_tokens_used', default: 0 })
  monthlyTokensUsed: number;

  @Column({ name: 'last_token_reset_date', type: 'date', nullable: true })
  lastTokenResetDate?: Date;

  @Column({ name: 'user_tier', default: 'free' })
  userTier: string; // 'free', 'premium', 'enterprise'

  @Column({ name: 'fallback_to_free_tier', default: true })
  fallbackToFreeTier: boolean;

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

  // OAuth accounts relationship - using lazy loading to avoid circular dependencies
  @OneToMany('UserOAuthAccount', (oauthAccount: any) => oauthAccount.user, { cascade: true })
  oauthAccounts: any[];

  // Soft delete method
  softDelete(): void {
    this.status = UserStatus.DELETED;
    this.deletedAt = new Date();
    if (this.email) this.email = `deleted_${this.id}@deleted.local`;
    this.phoneNumber = null;
    this.phone = null;
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

  // Token management methods
  canConsumeTokens(tokenCount: number): boolean {
    const today = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    
    // Reset daily counter if it's a new day
    if (!this.lastTokenResetDate || this.lastTokenResetDate.toDateString() !== today) {
      this.resetDailyTokens();
    }

    // Reset monthly counter if it's a new month
    if (!this.lastTokenResetDate || this.lastTokenResetDate.getMonth() !== currentMonth) {
      this.resetMonthlyTokens();
    }

    return (this.dailyTokensUsed + tokenCount <= this.dailyTokenLimit) &&
           (this.monthlyTokensUsed + tokenCount <= this.monthlyTokenLimit);
  }

  consumeTokens(tokenCount: number): boolean {
    if (this.canConsumeTokens(tokenCount)) {
      this.dailyTokensUsed += tokenCount;
      this.monthlyTokensUsed += tokenCount;
      this.lastTokenResetDate = new Date();
      return true;
    }
    return false;
  }

  resetDailyTokens(): void {
    this.dailyTokensUsed = 0;
    this.lastTokenResetDate = new Date();
  }

  resetMonthlyTokens(): void {
    this.monthlyTokensUsed = 0;
    this.lastTokenResetDate = new Date();
  }

  getRemainingDailyTokens(): number {
    return Math.max(0, this.dailyTokenLimit - this.dailyTokensUsed);
  }

  getRemainingMonthlyTokens(): number {
    return Math.max(0, this.monthlyTokenLimit - this.monthlyTokensUsed);
  }

  shouldFallbackToFreeTier(): boolean {
    return this.fallbackToFreeTier && !this.canConsumeTokens(1);
  }

  upgradeTier(tier: 'premium' | 'enterprise'): void {
    this.userTier = tier;
    if (tier === 'premium') {
      this.dailyTokenLimit = 50000;
      this.monthlyTokenLimit = 1000000;
    } else if (tier === 'enterprise') {
      this.dailyTokenLimit = 200000;
      this.monthlyTokenLimit = 5000000;
    }
  }
}
