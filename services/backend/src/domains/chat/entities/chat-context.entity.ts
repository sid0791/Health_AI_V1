import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ContextType {
  USER_PROFILE = 'user_profile',
  HEALTH_REPORT = 'health_report',
  MEAL_PLAN = 'meal_plan',
  FITNESS_PLAN = 'fitness_plan',
  NUTRITION_LOG = 'nutrition_log',
  WORKOUT_LOG = 'workout_log',
  MEASUREMENT = 'measurement',
  RECIPE = 'recipe',
  KNOWLEDGE_BASE = 'knowledge_base',
}

@Entity('chat_context')
@Index(['userId', 'contextType'])
@Index(['userId', 'updatedAt'])
export class ChatContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ContextType,
  })
  contextType: ContextType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text' })
  content: string; // The actual content for RAG

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    sourceId?: string;
    sourceType?: string;
    createdDate?: Date;
    tags?: string[];
    relevanceScore?: number;
    embedding?: number[]; // Vector embedding for similarity search
    lastAccessed?: Date;
    accessCount?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  structure: {
    // For structured data like health reports
    biomarkers?: Record<string, any>;
    measurements?: Record<string, any>;
    recommendations?: string[];

    // For meal plans
    meals?: Array<{
      type: string;
      items: string[];
      nutrition: Record<string, number>;
    }>;

    // For fitness plans
    workouts?: Array<{
      type: string;
      exercises: string[];
      duration: number;
    }>;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  incrementAccess(): void {
    this.accessCount++;
    this.lastAccessedAt = new Date();
    this.metadata = {
      ...this.metadata,
      lastAccessed: new Date(),
      accessCount: this.accessCount,
    };
  }

  isExpired(): boolean {
    return this.expiresAt && this.expiresAt < new Date();
  }

  isValidForRAG(): boolean {
    return this.isActive && !this.isExpired() && this.content.length > 0;
  }

  getRelevanceScore(): number {
    return this.metadata?.relevanceScore || 0;
  }

  updateRelevanceScore(score: number): void {
    this.metadata = {
      ...this.metadata,
      relevanceScore: score,
    };
  }

  setEmbedding(embedding: number[]): void {
    this.metadata = {
      ...this.metadata,
      embedding,
    };
  }

  getEmbedding(): number[] {
    return this.metadata?.embedding || [];
  }

  hasEmbedding(): boolean {
    return this.metadata?.embedding && this.metadata.embedding.length > 0;
  }
}
