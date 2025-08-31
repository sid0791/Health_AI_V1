import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AIPromptTemplate } from './ai-prompt-template.entity';

export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
  TIMEOUT = 'timeout',
}

@Entity('ai_prompt_executions')
@Index(['userId', 'createdAt'])
@Index(['templateId', 'status'])
@Index(['createdAt'])
export class AIPromptExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  templateId: string;

  @ManyToOne(() => AIPromptTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: AIPromptTemplate;

  @Column('text')
  processedPrompt: string;

  @Column('jsonb')
  variableValues: Record<string, any>;

  @Column('jsonb', { nullable: true })
  aiResponse?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
  })
  status: ExecutionStatus;

  @Column('integer')
  inputTokens: number;

  @Column('integer')
  outputTokens: number;

  @Column('integer')
  totalTokens: number;

  @Column('decimal', { precision: 15, scale: 8 })
  cost: number;

  @Column('integer')
  responseTimeMs: number;

  @Column('varchar', { length: 100 })
  aiProvider: string;

  @Column('varchar', { length: 100 })
  aiModel: string;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}