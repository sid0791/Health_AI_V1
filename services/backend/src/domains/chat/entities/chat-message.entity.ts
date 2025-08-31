import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

export enum MessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  ERROR = 'error',
}

export enum MessageProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  OUT_OF_SCOPE = 'out_of_scope',
}

@Entity('chat_messages')
@Index(['sessionId', 'createdAt'])
@Index(['sessionId', 'type'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  @Index()
  sessionId: string;

  @ManyToOne(() => ChatSession, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  session: ChatSession;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  originalContent: string; // For Hinglish processing

  @Column({ type: 'text', nullable: true })
  processedContent: string; // After NLP processing

  @Column({
    type: 'enum',
    enum: MessageProcessingStatus,
    default: MessageProcessingStatus.PENDING,
  })
  processingStatus: MessageProcessingStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // AI routing information
    routingDecision?: {
      level: 'L1' | 'L2';
      provider: string;
      model: string;
      cost: number;
      quotaUsed: number;
    };

    // Language processing
    languageDetection?: {
      detected: 'en' | 'hi' | 'hinglish' | 'mixed';
      confidence: number;
      transliterations?: Record<string, string>;
    };

    // Domain classification
    domainClassification?: {
      domain: string;
      confidence: number;
      allowedDomains: string[];
      isInScope: boolean;
    };

    // RAG context
    ragContext?: {
      documentsRetrieved: number;
      sources: string[];
      relevanceScores: number[];
      contextWindow: number;
    };

    // User interaction
    userContext?: {
      intent: string;
      entities: Record<string, any>;
      followUpQuestions?: string[];
    };

    // Processing time and performance
    performance?: {
      processingTimeMs: number;
      tokenCount: number;
      retrievalTimeMs?: number;
      generationTimeMs?: number;
    };

    // Safety and compliance
    safety?: {
      contentFiltered: boolean;
      dlpApplied: boolean;
      redactedFields: string[];
      complianceChecks: string[];
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  ragSources: Array<{
    sourceId: string;
    sourceType: 'user_data' | 'health_report' | 'nutrition_db' | 'fitness_kb' | 'recipe';
    title: string;
    excerpt: string;
    relevanceScore: number;
    url?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  actionRequests: Array<{
    actionType: 'update_profile' | 'log_meal' | 'schedule_workout' | 'request_measurement';
    description: string;
    parameters: Record<string, any>;
    requiresConfirmation: boolean;
    status: 'pending' | 'confirmed' | 'rejected' | 'executed';
  }>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'integer', nullable: true })
  tokenCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  costUsd: number;

  @Column({ type: 'integer', nullable: true })
  processingTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  isUserMessage(): boolean {
    return this.type === MessageType.USER;
  }

  isAssistantMessage(): boolean {
    return this.type === MessageType.ASSISTANT;
  }

  hasError(): boolean {
    return this.processingStatus === MessageProcessingStatus.FAILED || !!this.errorMessage;
  }

  isOutOfScope(): boolean {
    return this.processingStatus === MessageProcessingStatus.OUT_OF_SCOPE;
  }

  hasActionRequests(): boolean {
    return this.actionRequests && this.actionRequests.length > 0;
  }

  getPendingActions(): any[] {
    return this.actionRequests?.filter((action) => action.status === 'pending') || [];
  }

  getRagCitations(): string[] {
    return (
      this.ragSources?.map(
        (source) =>
          `[${source.title}](${source.url || '#'}) (Relevance: ${(source.relevanceScore * 100).toFixed(1)}%)`,
      ) || []
    );
  }

  getDomainClassification(): string {
    return this.metadata?.domainClassification?.domain || 'general';
  }

  getLanguageDetection(): string {
    return this.metadata?.languageDetection?.detected || 'en';
  }

  getTotalProcessingTime(): number {
    return this.processingTimeMs || 0;
  }

  getCost(): number {
    return this.costUsd || 0;
  }
}
