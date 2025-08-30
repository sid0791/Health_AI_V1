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

export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
}

@Entity('user_oauth_accounts')
@Index(['userId', 'provider'])
@Index(['provider', 'providerId'], { unique: true })
export class UserOAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: OAuthProvider,
  })
  provider: OAuthProvider;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'provider_email', nullable: true })
  providerEmail?: string;

  @Column({ name: 'provider_name', nullable: true })
  providerName?: string;

  @Column({ name: 'access_token', length: 1000, nullable: true })
  accessToken?: string;

  @Column({ name: 'refresh_token', length: 1000, nullable: true })
  refreshToken?: string;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date;

  @Column({ name: 'scope', nullable: true })
  scope?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Metadata
  @Column({ name: 'profile_picture_url', nullable: true })
  profilePictureUrl?: string;

  @Column({ name: 'provider_raw_data', type: 'jsonb', nullable: true })
  providerRawData?: Record<string, any>;

  // Data classification for audit trails
  @Column({ name: 'audit_classification', default: 'AUTH_OAUTH' })
  auditClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isTokenExpired(): boolean {
    return this.tokenExpiresAt && this.tokenExpiresAt < new Date();
  }

  needsTokenRefresh(): boolean {
    // Refresh if token expires within 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.tokenExpiresAt && this.tokenExpiresAt < fiveMinutesFromNow;
  }

  updateTokens(accessToken: string, refreshToken?: string, expiresAt?: Date): void {
    this.accessToken = accessToken;
    if (refreshToken) this.refreshToken = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }

  revoke(): void {
    this.isActive = false;
    this.accessToken = null;
    this.refreshToken = null;
  }
}
