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
  XAI = 'xai', // xAI (Grok models)
  DEEPSEEK = 'deepseek', // DeepSeek API
  MISTRAL = 'mistral', // Mistral AI
  COHERE = 'cohere', // Cohere API
  OPENROUTER = 'openrouter',
  TOGETHER = 'together',
  HUGGINGFACE = 'huggingface',
  GROQ = 'groq',
  OLLAMA = 'ollama', // Local models with full privacy
  SELF_HOSTED = 'self_hosted', // On-premise solutions
}

export enum AIModel {
  // OpenAI Models (August 2025 - Latest)
  GPT_5 = 'gpt-5', // Next-generation model with enhanced reasoning and multimodal capabilities
  GPT_5_TURBO = 'gpt-5-turbo', // High-performance variant of GPT-5
  O1 = 'o1', // Fully released reasoning model (successor to o1-preview)
  O1_PRO = 'o1-pro', // Enhanced reasoning model for complex tasks
  GPT_4O_ULTRA = 'gpt-4o-ultra', // Latest multimodal model with enhanced capabilities
  GPT_4O = 'gpt-4o', // Continued support for GPT-4o
  O1_PREVIEW = 'o1-preview', // Legacy reasoning model
  O1_MINI = 'o1-mini', // Faster reasoning model
  GPT_4_TURBO = 'gpt-4-turbo', // Previous generation but still strong
  GPT_4O_MINI = 'gpt-4o-mini', // Cost-effective alternative
  GPT_4 = 'gpt-4',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',

  // Anthropic Models (August 2025 - Latest)
  CLAUDE_4 = 'claude-4', // Next-generation Claude with enhanced capabilities
  CLAUDE_4_TURBO = 'claude-4-turbo', // High-performance Claude 4 variant
  CLAUDE_3_5_OPUS = 'claude-3.5-opus', // Enhanced Opus model
  CLAUDE_3_5_SONNET_V2 = 'claude-3.5-sonnet-v2', // Updated Sonnet with improved performance
  CLAUDE_3_5_SONNET = 'claude-3.5-sonnet', // Often outperforms GPT-4 in benchmarks
  CLAUDE_3_5_HAIKU_V2 = 'claude-3.5-haiku-v2', // Enhanced fast and cost-effective model
  CLAUDE_3_5_HAIKU = 'claude-3.5-haiku', // Fast and cost-effective
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku',

  // Google Models (August 2025 - Latest)
  GEMINI_3_0 = 'gemini-3.0', // Next-generation Gemini with advanced capabilities
  GEMINI_2_5_PRO = 'gemini-2.5-pro', // Enhanced Pro model with larger context
  GEMINI_2_0_FLASH_V2 = 'gemini-2.0-flash-v2', // Updated Flash model
  GEMINI_2_0_FLASH = 'gemini-2.0-flash', // Latest Google model (Dec 2024)
  GEMINI_1_5_PRO = 'gemini-1.5-pro', // Strong performance, large context
  GEMINI_PRO = 'gemini-pro',

  // xAI Models (Grok)
  GROK_2 = 'grok-2', // Latest Grok model with enhanced reasoning
  GROK_1_5 = 'grok-1.5', // Improved Grok model

  // Meta Llama 4 Series (August 2025)
  LLAMA_4_70B = 'llama-4-70b', // Next-generation Llama model
  LLAMA_4_8B = 'llama-4-8b', // Efficient Llama 4 variant
  LLAMA_3_2_90B = 'llama-3.2-90b', // Latest Llama 3 series
  LLAMA_3_1_70B = 'llama-3.1-70b',
  LLAMA_3_1_8B = 'llama-3.1-8b',
  LLAMA_3_1_70B_INSTRUCT = 'llama-3.1-70b-instruct',
  LLAMA_3_1_8B_INSTANT = 'llama-3.1-8b-instant',

  // DeepSeek Models (August 2025 - Latest)
  DEEPSEEK_V4 = 'deepseek-v4', // Latest DeepSeek model with enhanced capabilities
  DEEPSEEK_CODER_V4 = 'deepseek-coder-v4', // Latest coding-specialized model
  DEEPSEEK_MATH_V3 = 'deepseek-math-v3', // Mathematical reasoning specialist
  DEEPSEEK_V3 = 'deepseek-v3', // Previous generation
  DEEPSEEK_CODER_V3 = 'deepseek-coder-v3', // Previous coding model
  DEEPSEEK_CODER_V2 = 'deepseek-coder-v2', // Legacy coding model

  // Mistral AI Models (August 2025)
  MISTRAL_LARGE_V3 = 'mistral-large-v3', // Latest large Mistral model
  MISTRAL_MEDIUM_V2 = 'mistral-medium-v2', // Balanced performance model
  MIXTRAL_8X22B_V2 = 'mixtral-8x22b-v2', // Enhanced MoE model
  MIXTRAL_8X22B = 'mixtral-8x22b',
  MIXTRAL_8X7B = 'mixtral-8x7b',
  MISTRAL_7B_V3 = 'mistral-7b-v3', // Latest 7B model
  MISTRAL_7B = 'mistral-7b',

  // Cohere Models (August 2025)
  COMMAND_R_PLUS_V2 = 'command-r-plus-v2', // Enhanced Command model
  COMMAND_R_V2 = 'command-r-v2', // Updated Command model

  // Additional Open Source Models (August 2025)
  QWEN_2_5_72B = 'qwen-2.5-72b', // Latest Qwen model
  QWEN_2_72B = 'qwen-2-72b',
  YI_34B_V2 = 'yi-34b-v2', // Updated Yi model
  WIZARD_CODER_V2 = 'wizard-coder-v2', // Enhanced coding model
  STARCODER_V3 = 'starcoder-v3', // Latest coding model

  // Local/Ollama Models (August 2025)
  OLLAMA_LLAMA4_8B = 'llama4:8b', // Llama 4 on Ollama
  OLLAMA_LLAMA4_70B = 'llama4:70b', // Llama 4 large on Ollama
  OLLAMA_LLAMA3_2_90B = 'llama3.2:90b', // Llama 3.2 on Ollama
  OLLAMA_LLAMA3_8B = 'llama3.1:8b',
  OLLAMA_DEEPSEEK_V4 = 'deepseek-v4:latest', // DeepSeek V4 on Ollama
  OLLAMA_MISTRAL_V3 = 'mistral-v3:7b', // Mistral V3 on Ollama
  OLLAMA_CODELLAMA_13B = 'codellama:13b',
  OLLAMA_MISTRAL_7B = 'mistral:7b',
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
