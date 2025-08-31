import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum TokenUsageType {
  CHAT_MESSAGE = 'chat_message',
  RAG_RETRIEVAL = 'rag_retrieval',
  WEEKLY_ADAPTATION = 'weekly_adaptation',
  MEAL_PLANNING = 'meal_planning',
  FITNESS_PLANNING = 'fitness_planning',
}

export enum TokenProvider {
  OPENAI_GPT4 = 'openai_gpt4',
  OPENAI_GPT35 = 'openai_gpt35',
  ANTHROPIC_CLAUDE = 'anthropic_claude',
  HUGGINGFACE_FREE = 'huggingface_free',
  OLLAMA_LOCAL = 'ollama_local',
  GROQ_FREE = 'groq_free',
}

@Entity('user_token_usage')
@Index(['userId', 'createdAt'])
@Index(['usageType', 'createdAt'])
@Index(['provider', 'createdAt'])
export class UserTokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TokenUsageType,
    name: 'usage_type',
  })
  usageType: TokenUsageType;

  @Column({
    type: 'enum',
    enum: TokenProvider,
    name: 'provider',
  })
  provider: TokenProvider;

  @Column({ name: 'input_tokens', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', default: 0 })
  outputTokens: number;

  @Column({ name: 'total_tokens', default: 0 })
  totalTokens: number;

  @Column('decimal', {
    name: 'cost_usd',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costUsd: number;

  @Column({ name: 'session_id', nullable: true })
  sessionId?: string;

  @Column({ name: 'request_id', nullable: true })
  requestId?: string;

  @Column({ name: 'model_name', length: 100 })
  modelName: string;

  @Column({ name: 'is_free_tier', default: false })
  isFreeTier: boolean;

  @Column('text', { name: 'metadata', nullable: true })
  metadata?: string; // JSON string for additional data

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  calculateTokens(): void {
    this.totalTokens = this.inputTokens + this.outputTokens;
  }

  setMetadata(data: Record<string, any>): void {
    this.metadata = JSON.stringify(data);
  }

  getMetadata(): Record<string, any> | null {
    try {
      return this.metadata ? JSON.parse(this.metadata) : null;
    } catch {
      return null;
    }
  }

  static create(params: {
    userId: string;
    usageType: TokenUsageType;
    provider: TokenProvider;
    inputTokens: number;
    outputTokens: number;
    costUsd?: number;
    sessionId?: string;
    requestId?: string;
    modelName: string;
    isFreeTier?: boolean;
    metadata?: Record<string, any>;
  }): UserTokenUsage {
    const usage = new UserTokenUsage();

    usage.userId = params.userId;
    usage.usageType = params.usageType;
    usage.provider = params.provider;
    usage.inputTokens = params.inputTokens;
    usage.outputTokens = params.outputTokens;
    usage.costUsd = params.costUsd || 0;
    usage.sessionId = params.sessionId;
    usage.requestId = params.requestId;
    usage.modelName = params.modelName;
    usage.isFreeTier = params.isFreeTier || false;

    if (params.metadata) {
      usage.setMetadata(params.metadata);
    }

    usage.calculateTokens();

    return usage;
  }
}
