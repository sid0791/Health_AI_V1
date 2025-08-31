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
import { WeatherData, AQILevel } from './weather-data.entity';

export enum NudgeType {
  WORKOUT_INDOOR = 'workout_indoor',
  WORKOUT_OUTDOOR = 'workout_outdoor',
  HYDRATION = 'hydration',
  VITAMIN_D = 'vitamin_d',
  AIR_PURIFIER = 'air_purifier',
  MASK_REMINDER = 'mask_reminder',
  WINDOW_VENTILATION = 'window_ventilation',
  OUTDOOR_ACTIVITY = 'outdoor_activity',
  INDOOR_ACTIVITY = 'indoor_activity',
}

export enum NudgeStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DISMISSED = 'dismissed',
  ACTED_UPON = 'acted_upon',
}

@Entity('weather_nudges')
@Index(['userId', 'status'])
@Index(['nudgeType', 'createdAt'])
@Index(['triggered'])
export class WeatherNudge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  weatherDataId: string;

  @ManyToOne(() => WeatherData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'weatherDataId' })
  weatherData: WeatherData;

  @Column({
    type: 'enum',
    enum: NudgeType,
  })
  nudgeType: NudgeType;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column('varchar', { length: 50 })
  priority: string; // low, medium, high, urgent

  @Column({
    type: 'enum',
    enum: NudgeStatus,
    default: NudgeStatus.PENDING,
  })
  status: NudgeStatus;

  @Column('boolean', { default: false })
  triggered: boolean;

  @Column('timestamp', { nullable: true })
  triggeredAt?: Date;

  @Column('timestamp', { nullable: true })
  sentAt?: Date;

  @Column('timestamp', { nullable: true })
  dismissedAt?: Date;

  @Column('timestamp', { nullable: true })
  actedUponAt?: Date;

  @Column('jsonb', { nullable: true })
  triggerConditions?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
