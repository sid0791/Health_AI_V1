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
import { User } from '../../../users/entities/user.entity';

export enum HealthDataProvider {
  APPLE_HEALTHKIT = 'apple_healthkit',
  GOOGLE_FIT = 'google_fit',
  FITBIT = 'fitbit',
  SAMSUNG_HEALTH = 'samsung_health',
  GARMIN = 'garmin',
  MANUAL = 'manual',
}

export enum HealthDataType {
  STEPS = 'steps',
  HEART_RATE = 'heart_rate',
  CALORIES_BURNED = 'calories_burned',
  DISTANCE = 'distance',
  ACTIVE_MINUTES = 'active_minutes',
  SLEEP_DURATION = 'sleep_duration',
  SLEEP_QUALITY = 'sleep_quality',
  WEIGHT = 'weight',
  BODY_FAT = 'body_fat',
  BLOOD_PRESSURE = 'blood_pressure',
  BLOOD_GLUCOSE = 'blood_glucose',
  OXYGEN_SATURATION = 'oxygen_saturation',
  WORKOUT = 'workout',
  NUTRITION = 'nutrition',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

@Entity('health_data_entries')
@Index(['userId', 'provider', 'dataType'])
@Index(['userId', 'recordedAt'])
@Index(['provider', 'syncStatus'])
@Index(['dataType', 'recordedAt'])
export class HealthDataEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: HealthDataProvider,
  })
  provider: HealthDataProvider;

  @Column({
    type: 'enum',
    enum: HealthDataType,
  })
  dataType: HealthDataType;

  @Column('timestamp')
  recordedAt: Date;

  @Column('decimal', { precision: 15, scale: 6 })
  value: number;

  @Column('varchar', { length: 50 })
  unit: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('varchar', { length: 255, nullable: true })
  externalId?: string;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  syncStatus: SyncStatus;

  @Column('timestamp', { nullable: true })
  lastSyncedAt?: Date;

  @Column('varchar', { length: 500, nullable: true })
  syncError?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
