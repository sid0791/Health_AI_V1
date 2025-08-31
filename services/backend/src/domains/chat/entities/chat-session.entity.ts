import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ChatMessage } from './chat-message.entity';

export enum ChatSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ChatSessionType {
  GENERAL = 'general',
  HEALTH_FOCUSED = 'health_focused',
  NUTRITION_FOCUSED = 'nutrition_focused',
  FITNESS_FOCUSED = 'fitness_focused',
  MEAL_PLANNING = 'meal_planning',
  WORKOUT_PLANNING = 'workout_planning',
}

@Entity('chat_sessions')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: ChatSessionType,
    default: ChatSessionType.GENERAL,
  })
  type: ChatSessionType;

  @Column({
    type: 'enum',
    enum: ChatSessionStatus,
    default: ChatSessionStatus.ACTIVE,
  })
  status: ChatSessionStatus;

  @Column({ length: 255, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  userPreferences: {
    language?: 'en' | 'hi' | 'hinglish';
    responseStyle?: 'detailed' | 'concise' | 'friendly';
    domainFocus?: string[];
  };

  @Column({ type: 'integer', default: 0 })
  messageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @OneToMany(() => ChatMessage, (message) => message.session, {
    cascade: true,
  })
  messages: ChatMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  updateActivity(): void {
    this.lastActivityAt = new Date();
    this.updatedAt = new Date();
  }

  incrementMessageCount(): void {
    this.messageCount++;
    this.updateActivity();
  }

  isExpired(): boolean {
    return this.expiresAt && this.expiresAt < new Date();
  }

  isActive(): boolean {
    return this.status === ChatSessionStatus.ACTIVE && !this.isExpired();
  }
}
