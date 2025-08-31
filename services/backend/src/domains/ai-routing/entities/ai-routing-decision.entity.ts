import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AIServiceLevel {
  LEVEL_1 = 'level_1', // Highest accuracy - health reports, critical decisions
  LEVEL_2 = 'level_2', // Cost-optimized - general chat, recipes, fitness
}

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE_OPENAI = 'azure_openai',
  OPENROUTER = 'openrouter',
  TOGETHER = 'together',
  HUGGINGFACE = 'huggingface',
  GROQ = 'groq',
  SELF_HOSTED = 'self_hosted',
}

export enum AIModel {
  // OpenAI Models
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o',
  GPT_4 = 'gpt-4',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',

  // Anthropic Models
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku',

  // Google Models
  GEMINI_PRO = 'gemini-pro',
  GEMINI_2_5_PRO = 'gemini-2.5-pro',

  // Open Source Models
  LLAMA_3_1_70B = 'llama-3.1-70b',
  LLAMA_3_1_8B = 'llama-3.1-8b',
  MIXTRAL_8X22B = 'mixtral-8x22b',
  MIXTRAL_8X7B = 'mixtral-8x7b',
  QWEN_2_72B = 'qwen-2-72b',
  MISTRAL_7B = 'mistral-7b',
}

export enum RequestType {
  HEALTH_REPORT_ANALYSIS = 'health_report_analysis',
  HEALTH_CONSULTATION = 'health_consultation',
  NUTRITION_ADVICE = 'nutrition_advice',
  RECIPE_GENERATION = 'recipe_generation',
  MEAL_PLANNING = 'meal_planning',
  FITNESS_PLANNING = 'fitness_planning',
  FITNESS_ADAPTATION = 'fitness_adaptation',
  GENERAL_CHAT = 'general_chat',
  SYMPTOM_ANALYSIS = 'symptom_analysis',
  MEDICATION_INTERACTION = 'medication_interaction',
  LIFESTYLE_RECOMMENDATION = 'lifestyle_recommendation',
  EMERGENCY_ASSESSMENT = 'emergency_assessment',
  PROGRESS_ANALYSIS = 'progress_analysis',
  GOAL_SETTING = 'goal_setting',
  HABIT_COACHING = 'habit_coaching',
  MOTIVATIONAL_SUPPORT = 'motivational_support',
}

export enum RoutingDecision {
  SELECTED_PRIMARY = 'selected_primary',
  FALLBACK_TO_SECONDARY = 'fallback_to_secondary',
  QUOTA_EXCEEDED_STEPDOWN = 'quota_exceeded_stepdown',
  COST_OPTIMIZATION = 'cost_optimization',
  MODEL_UNAVAILABLE = 'model_unavailable',
  ACCURACY_REQUIREMENT = 'accuracy_requirement',
  EMERGENCY_OVERRIDE = 'emergency_override',
  USER_PREFERENCE = 'user_preference',
  FREE_TIER_FALLBACK = 'free_tier_fallback',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

@Entity('ai_routing_decisions')
@Index(['userId', 'requestType', 'createdAt'])
@Index(['serviceLevel', 'provider', 'model'])
@Index(['routingDecision', 'processingStatus'])
@Index(['createdAt']) // For time-based analytics
export class AIRoutingDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string; // May be null for anonymous requests

  @Column({ name: 'session_id', length: 100, nullable: true })
  sessionId?: string;

  @Column({ name: 'request_id', length: 100 })
  requestId: string; // Unique identifier for this request

  // Request Details
  @Column({
    type: 'enum',
    enum: RequestType,
    name: 'request_type',
  })
  requestType: RequestType;

  @Column({
    type: 'enum',
    enum: AIServiceLevel,
    name: 'service_level',
  })
  serviceLevel: AIServiceLevel;

  @Column({ name: 'request_size_bytes', type: 'int', nullable: true })
  requestSizeBytes?: number;

  @Column({ name: 'context_tokens', type: 'int', nullable: true })
  contextTokens?: number;

  @Column({ name: 'max_response_tokens', type: 'int', nullable: true })
  maxResponseTokens?: number;

  // Routing Decision
  @Column({
    type: 'enum',
    enum: RoutingDecision,
    name: 'routing_decision',
  })
  routingDecision: RoutingDecision;

  @Column({ name: 'routing_reason', type: 'text', nullable: true })
  routingReason?: string;

  @Column({ name: 'quota_remaining', type: 'int', nullable: true })
  quotaRemaining?: number;

  @Column({ name: 'daily_quota_used', type: 'int', nullable: true })
  dailyQuotaUsed?: number;

  @Column({ name: 'accuracy_requirement', type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracyRequirement?: number; // 0-100% required accuracy

  // Selected Provider and Model
  @Column({
    type: 'enum',
    enum: AIProvider,
  })
  provider: AIProvider;

  @Column({
    type: 'enum',
    enum: AIModel,
  })
  model: AIModel;

  @Column({ name: 'model_version', length: 50, nullable: true })
  modelVersion?: string;

  @Column({ name: 'endpoint_url', length: 500, nullable: true })
  endpointUrl?: string;

  @Column({ name: 'deployment_id', length: 100, nullable: true })
  deploymentId?: string; // For Azure OpenAI

  // Alternative Options Considered
  @Column({
    type: 'jsonb',
    name: 'alternative_options',
    default: [],
  })
  alternativeOptions: Array<{
    provider: AIProvider;
    model: AIModel;
    score: number;
    reason: string;
  }>;

  @Column({ name: 'fallback_provider', type: 'enum', enum: AIProvider, nullable: true })
  fallbackProvider?: AIProvider;

  @Column({ name: 'fallback_model', type: 'enum', enum: AIModel, nullable: true })
  fallbackModel?: AIModel;

  // Processing Details
  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    name: 'processing_status',
    default: ProcessingStatus.PENDING,
  })
  processingStatus: ProcessingStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'processing_duration_ms', type: 'int', nullable: true })
  processingDurationMs?: number;

  @Column({ name: 'queue_time_ms', type: 'int', nullable: true })
  queueTimeMs?: number;

  // Response Details
  @Column({ name: 'response_tokens', type: 'int', nullable: true })
  responseTokens?: number;

  @Column({ name: 'total_tokens', type: 'int', nullable: true })
  totalTokens?: number;

  @Column({ name: 'response_size_bytes', type: 'int', nullable: true })
  responseSizeBytes?: number;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore?: number; // Model's confidence in response

  @Column({ name: 'safety_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  safetyScore?: number; // Safety/appropriateness score

  // Cost and Usage
  @Column({ name: 'estimated_cost_usd', type: 'decimal', precision: 10, scale: 6, nullable: true })
  estimatedCostUsd?: number;

  @Column({ name: 'actual_cost_usd', type: 'decimal', precision: 10, scale: 6, nullable: true })
  actualCostUsd?: number;

  @Column({
    name: 'cost_efficiency_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  costEfficiencyScore?: number; // Quality per dollar

  @Column({ name: 'rate_limit_hit', default: false })
  rateLimitHit: boolean;

  @Column({ name: 'rate_limit_reset_at', type: 'timestamp', nullable: true })
  rateLimitResetAt?: Date;

  // Quality Metrics
  @Column({ name: 'user_feedback_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  userFeedbackScore?: number; // 0-5 user rating

  @Column({ name: 'accuracy_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracyScore?: number; // Measured accuracy for this response

  @Column({ name: 'relevance_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  relevanceScore?: number; // How relevant the response was

  @Column({ name: 'helpfulness_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  helpfulnessScore?: number; // How helpful the response was

  // Error Handling
  @Column({ name: 'error_code', length: 50, nullable: true })
  errorCode?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'last_retry_at', type: 'timestamp', nullable: true })
  lastRetryAt?: Date;

  // Privacy and Security
  @Column({ name: 'pii_detected', default: false })
  piiDetected: boolean;

  @Column({ name: 'phi_detected', default: false })
  phiDetected: boolean;

  @Column({ name: 'data_anonymized', default: false })
  dataAnonymized: boolean;

  @Column({ name: 'retention_policy', length: 50, default: 'standard' })
  retentionPolicy: string;

  @Column({ name: 'zero_retention_mode', default: false })
  zeroRetentionMode: boolean; // Provider doesn't store data

  // Context and Environment
  @Column({ name: 'user_tier', length: 50, nullable: true })
  userTier?: string; // free, premium, enterprise

  @Column({ name: 'user_region', length: 10, nullable: true })
  userRegion?: string;

  @Column({ name: 'request_priority', type: 'int', default: 5 })
  requestPriority: number; // 1-10 scale

  @Column({ name: 'emergency_request', default: false })
  emergencyRequest: boolean;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'client_version', length: 50, nullable: true })
  clientVersion?: string;

  // Audit and Compliance
  @Column({ name: 'compliance_flags', type: 'text', array: true, default: [] })
  complianceFlags: string[]; // HIPAA, GDPR, etc.

  @Column({ name: 'audit_trail_id', length: 100, nullable: true })
  auditTrailId?: string;

  @Column({ name: 'regulatory_approval', default: false })
  regulatoryApproval: boolean;

  // Learning and Optimization
  @Column({
    name: 'model_performance_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  modelPerformanceScore?: number;

  @Column({
    name: 'routing_effectiveness',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  routingEffectiveness?: number; // How good was this routing decision

  @Column({ name: 'should_retrain', default: false })
  shouldRetrain: boolean;

  @Column({ name: 'feedback_incorporated', default: false })
  feedbackIncorporated: boolean;

  // Metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  tags: string[];

  // Data classification
  @Column({ name: 'data_classification', default: 'AI_ROUTING' })
  dataClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  getDuration(): number {
    if (!this.startedAt || !this.completedAt) return 0;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  getTotalLatency(): number {
    return (this.queueTimeMs || 0) + (this.processingDurationMs || 0);
  }

  isCompleted(): boolean {
    return this.processingStatus === ProcessingStatus.COMPLETED;
  }

  isFailed(): boolean {
    return [ProcessingStatus.FAILED, ProcessingStatus.TIMEOUT, ProcessingStatus.CANCELLED].includes(
      this.processingStatus,
    );
  }

  isLevel1Request(): boolean {
    return this.serviceLevel === AIServiceLevel.LEVEL_1;
  }

  isEmergencyRequest(): boolean {
    return this.emergencyRequest || this.requestPriority >= 9;
  }

  start(): void {
    this.processingStatus = ProcessingStatus.PROCESSING;
    this.startedAt = new Date();
  }

  complete(responseTokens?: number, confidence?: number, actualCost?: number): void {
    this.processingStatus = ProcessingStatus.COMPLETED;
    this.completedAt = new Date();

    if (this.startedAt) {
      this.processingDurationMs = this.completedAt.getTime() - this.startedAt.getTime();
    }

    if (responseTokens) this.responseTokens = responseTokens;
    if (confidence) this.confidenceScore = confidence;
    if (actualCost) this.actualCostUsd = actualCost;

    this.calculateTotalTokens();
  }

  fail(errorCode: string, errorMessage: string): void {
    this.processingStatus = ProcessingStatus.FAILED;
    this.completedAt = new Date();
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
  }

  cancel(): void {
    this.processingStatus = ProcessingStatus.CANCELLED;
    this.completedAt = new Date();
  }

  timeout(): void {
    this.processingStatus = ProcessingStatus.TIMEOUT;
    this.completedAt = new Date();
  }

  retry(): void {
    this.retryCount++;
    this.lastRetryAt = new Date();
    this.processingStatus = ProcessingStatus.PENDING;
    this.errorCode = null;
    this.errorMessage = null;
  }

  addUserFeedback(score: number): void {
    this.userFeedbackScore = Math.max(0, Math.min(5, score));
  }

  addAccuracyScore(score: number): void {
    this.accuracyScore = Math.max(0, Math.min(100, score));
  }

  addRelevanceScore(score: number): void {
    this.relevanceScore = Math.max(0, Math.min(100, score));
  }

  markAsEmergency(): void {
    this.emergencyRequest = true;
    this.requestPriority = 10;
  }

  addComplianceFlag(flag: string): void {
    if (!this.complianceFlags.includes(flag)) {
      this.complianceFlags.push(flag);
    }
  }

  enableZeroRetention(): void {
    this.zeroRetentionMode = true;
    this.retentionPolicy = 'zero_retention';
  }

  markPIIDetected(): void {
    this.piiDetected = true;
  }

  markPHIDetected(): void {
    this.phiDetected = true;
  }

  markDataAnonymized(): void {
    this.dataAnonymized = true;
  }

  calculateCostEfficiency(): void {
    if (this.actualCostUsd && this.confidenceScore) {
      this.costEfficiencyScore = this.confidenceScore / (this.actualCostUsd * 1000);
    }
  }

  calculateTotalTokens(): void {
    this.totalTokens = (this.contextTokens || 0) + (this.responseTokens || 0);
  }

  getQualityScore(): number {
    const scores = [
      this.confidenceScore,
      this.accuracyScore,
      this.relevanceScore,
      this.helpfulnessScore,
      this.userFeedbackScore ? this.userFeedbackScore * 20 : null, // Convert 0-5 to 0-100
    ].filter((score) => score !== null && score !== undefined);

    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  shouldOptimizeRouting(): boolean {
    return (
      this.costEfficiencyScore !== null &&
      this.costEfficiencyScore < 50 &&
      this.routingEffectiveness !== null &&
      this.routingEffectiveness < 80
    );
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }
}
