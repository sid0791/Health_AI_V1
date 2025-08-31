import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PromptCategory {
  NUTRITION_ADVICE = 'nutrition_advice',
  MEAL_PLANNING = 'meal_planning',
  FITNESS_PLANNING = 'fitness_planning',
  HEALTH_CONSULTATION = 'health_consultation',
  RECIPE_GENERATION = 'recipe_generation',
  GENERAL_CHAT = 'general_chat',
  PROGRESS_ANALYSIS = 'progress_analysis',
  HABIT_COACHING = 'habit_coaching',
  MOTIVATIONAL_SUPPORT = 'motivational_support',
}

export enum PromptStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
  DEPRECATED = 'deprecated',
}

export enum VariableType {
  USER_PROFILE = 'user_profile',
  HEALTH_DATA = 'health_data',
  GOALS = 'goals',
  PREFERENCES = 'preferences',
  RECENT_LOGS = 'recent_logs',
  HEALTH_REPORTS = 'health_reports',
  CONTEXT = 'context',
  STATIC = 'static',
}

@Entity('ai_prompt_templates')
@Index(['category', 'status'])
@Index(['status', 'version'])
@Index(['createdAt'])
export class AIPromptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: PromptCategory,
  })
  category: PromptCategory;

  @Column('text')
  systemPrompt: string;

  @Column('text')
  userPromptTemplate: string;

  @Column('jsonb')
  variables: Array<{
    name: string;
    type: VariableType;
    description: string;
    required: boolean;
    fallback?: string;
    dataPath?: string; // Path to extract data from user object
  }>;

  @Column('jsonb', { nullable: true })
  constraints?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };

  @Column({
    type: 'enum',
    enum: PromptStatus,
    default: PromptStatus.ACTIVE,
  })
  status: PromptStatus;

  @Column('varchar', { length: 50 })
  version: string;

  @Column('integer', { default: 0 })
  usageCount: number;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  averageTokens: number;

  @Column('decimal', { precision: 15, scale: 8, default: 0 })
  totalCost: number;

  @Column('jsonb', { nullable: true })
  performanceMetrics?: {
    averageResponseTime: number;
    successRate: number;
    userSatisfactionScore?: number;
  };

  @Column('text', { nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}