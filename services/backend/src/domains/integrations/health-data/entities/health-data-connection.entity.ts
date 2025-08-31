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
import { HealthDataProvider } from './health-data-entry.entity';

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  ERROR = 'error',
}

@Entity('health_data_connections')
@Index(['userId', 'provider'])
@Index(['status'])
export class HealthDataConnection {
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
    enum: ConnectionStatus,
    default: ConnectionStatus.DISCONNECTED,
  })
  status: ConnectionStatus;

  @Column('text', { nullable: true })
  accessToken?: string;

  @Column('text', { nullable: true })
  refreshToken?: string;

  @Column('timestamp', { nullable: true })
  tokenExpiresAt?: Date;

  @Column('jsonb', { nullable: true })
  scopes?: string[];

  @Column('jsonb', { nullable: true })
  providerConfig?: Record<string, any>;

  @Column('timestamp', { nullable: true })
  lastSyncAt?: Date;

  @Column('timestamp', { nullable: true })
  nextSyncAt?: Date;

  @Column('varchar', { length: 500, nullable: true })
  lastError?: string;

  @Column('integer', { default: 0 })
  errorCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}