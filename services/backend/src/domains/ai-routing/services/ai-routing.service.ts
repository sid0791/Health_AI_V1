import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  AIRoutingDecision,
  AIServiceLevel,
  AIProvider,
  AIModel,
  RequestType,
  RoutingDecision,
} from '../entities/ai-routing-decision.entity';

export interface AIRoutingRequest {
  userId?: string;
  sessionId?: string;
  requestType: RequestType;
  contextTokens?: number;
  maxResponseTokens?: number;
  emergencyRequest?: boolean;
  userTier?: string;
  userRegion?: string;
  accuracyRequirement?: number;
  payload?: Record<string, any>;
  // Privacy and security requirements (August 2025)
  privacyLevel?: 'standard' | 'high' | 'maximum'; // Privacy requirement level
  containsPHI?: boolean; // Contains Protected Health Information
  requiresEncryption?: boolean; // Force encryption of sensitive data
  onPremiseOnly?: boolean; // Restrict to on-premise/local models only
  complianceRequired?: string[]; // Required compliance flags (HIPAA, GDPR, etc.)
}

export interface AIRoutingResult {
  provider: AIProvider;
  model: AIModel;
  endpoint: string;
  apiKey: string;
  routingDecision: RoutingDecision;
  routingReason: string;
  estimatedCost: number;
  quotaRemaining: number;
  fallbackOptions: Array<{
    provider: AIProvider;
    model: AIModel;
    endpoint: string;
  }>;
  decisionId: string;
  success?: boolean;
  data?: any;
  error?: string;
}

export interface ProviderConfig {
  provider: AIProvider;
  models: Array<{
    model: AIModel;
    endpoint: string;
    apiKeyConfig: string;
    costPerToken: number;
    accuracyScore: number;
    maxTokens: number;
    availability: number; // 0-100%
    region?: string;
    // Privacy and security configurations
    dataRetention: 'zero' | 'short' | 'standard' | 'extended'; // Data retention policy
    privacyCompliant: boolean; // Doesn't use data for training
    encryptionRequired: boolean; // Requires data encryption
    onPremise?: boolean; // Can run on-premise
    phiCompliant?: boolean; // PHI/Health data compliant
    zeroTrustVerified?: boolean; // Zero-trust architecture verified
  }>;
  dailyQuota: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  // Provider-level privacy configuration
  privacyScore: number; // 0-100, higher is more private
  complianceFlags: string[]; // HIPAA, GDPR, SOC2, etc.
}

@Injectable()
export class AIRoutingService {
  private readonly logger = new Logger(AIRoutingService.name);
  private readonly providers: Map<AIProvider, ProviderConfig> = new Map();
  private readonly dailyQuotaUsage: Map<string, number> = new Map(); // date-provider -> usage
  private readonly retryConfiguration = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
  };

  constructor(
    @InjectRepository(AIRoutingDecision)
    private readonly routingRepository: Repository<AIRoutingDecision>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.initializeProviders();
  }

  /**
   * Route AI request to optimal provider/model with privacy-first approach
   */
  async routeRequest(request: AIRoutingRequest): Promise<AIRoutingResult> {
    this.logger.debug(
      `Routing AI request: ${request.requestType} (privacy: ${request.privacyLevel || 'standard'})`,
    );

    // Privacy-first routing for health data (August 2025 enhancement)
    if (request.containsPHI || request.privacyLevel === 'maximum' || request.onPremiseOnly) {
      this.logger.debug('Privacy-sensitive request detected, using privacy-compliant routing');
      return this.routeToPrivacyCompliantProviders(request);
    }

    // Auto-detect PHI for health-related requests
    const healthRelatedRequests = [
      RequestType.HEALTH_REPORT_ANALYSIS,
      RequestType.HEALTH_CONSULTATION,
      RequestType.SYMPTOM_ANALYSIS,
      RequestType.MEDICATION_INTERACTION,
      RequestType.EMERGENCY_ASSESSMENT,
    ];

    if (healthRelatedRequests.includes(request.requestType) && !request.privacyLevel) {
      this.logger.debug('Health-related request detected, applying high privacy level');
      request.privacyLevel = 'high';
      request.containsPHI = true;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cachedResult = await this.checkCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const requestId = this.generateRequestId();
    const serviceLevel = this.determineServiceLevel(request.requestType);

    // Create routing decision record
    const decision = this.routingRepository.create({
      userId: request.userId,
      sessionId: request.sessionId,
      requestId,
      requestType: request.requestType,
      serviceLevel,
      contextTokens: request.contextTokens,
      maxResponseTokens: request.maxResponseTokens,
      emergencyRequest: request.emergencyRequest || false,
      userTier: request.userTier,
      userRegion: request.userRegion,
      accuracyRequirement: request.accuracyRequirement,
    });

    try {
      // Use step-down logic for optimal selection
      const selectedModel = await this.selectModelWithQuotaStepDown(serviceLevel, request);

      // Update decision record
      decision.provider = selectedModel.provider;
      decision.model = selectedModel.model;
      decision.endpointUrl = selectedModel.endpoint;
      decision.routingDecision = selectedModel.routingDecision;
      decision.routingReason = selectedModel.routingReason;
      decision.estimatedCostUsd = selectedModel.estimatedCost;
      decision.quotaRemaining = selectedModel.quotaRemaining;
      decision.alternativeOptions = selectedModel.alternatives;
      decision.fallbackProvider = selectedModel.fallbackProvider;
      decision.fallbackModel = selectedModel.fallbackModel;

      await this.routingRepository.save(decision);

      // Build result
      const result: AIRoutingResult = {
        provider: selectedModel.provider,
        model: selectedModel.model,
        endpoint: selectedModel.endpoint,
        apiKey: selectedModel.apiKey,
        routingDecision: selectedModel.routingDecision,
        routingReason: selectedModel.routingReason,
        estimatedCost: selectedModel.estimatedCost,
        quotaRemaining: selectedModel.quotaRemaining,
        fallbackOptions: selectedModel.fallbackOptions,
        decisionId: decision.id,
      };

      // Cache the result
      await this.cacheResult(cacheKey, result);

      this.logger.debug(`Routed to ${selectedModel.provider}/${selectedModel.model}`);
      return result;
    } catch (error) {
      decision.fail('ROUTING_ERROR', error.message);
      await this.routingRepository.save(decision);
      throw error;
    }
  }

  /**
   * Update routing decision with completion data
   */
  async updateCompletion(
    decisionId: string,
    data: {
      responseTokens?: number;
      confidence?: number;
      actualCost?: number;
      processingDuration?: number;
      userFeedback?: number;
    },
  ): Promise<void> {
    const decision = await this.routingRepository.findOne({ where: { id: decisionId } });
    if (!decision) {
      this.logger.warn(`Decision not found: ${decisionId}`);
      return;
    }

    decision.complete(data.responseTokens, data.confidence, data.actualCost);

    if (data.processingDuration) {
      decision.processingDurationMs = data.processingDuration;
    }

    if (data.userFeedback) {
      decision.addUserFeedback(data.userFeedback);
    }

    decision.calculateCostEfficiency();
    await this.routingRepository.save(decision);

    // Update usage tracking
    this.updateQuotaUsage(decision.provider, decision.totalTokens || 0);
  }

  /**
   * Update routing decision with failure data
   */
  async updateFailure(decisionId: string, errorCode: string, errorMessage: string): Promise<void> {
    const decision = await this.routingRepository.findOne({ where: { id: decisionId } });
    if (!decision) {
      this.logger.warn(`Decision not found: ${decisionId}`);
      return;
    }

    decision.fail(errorCode, errorMessage);
    await this.routingRepository.save(decision);
  }

  /**
   * Get routing analytics
   */
  async getRoutingAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRequests: number;
    successRate: number;
    avgCost: number;
    avgLatency: number;
    providerDistribution: Record<string, number>;
    serviceLevel1Accuracy: number;
    serviceLevel2CostEfficiency: number;
    quotaUtilization: Record<string, number>;
  }> {
    const decisions = await this.routingRepository
      .createQueryBuilder('decision')
      .where('decision.createdAt >= :startDate', { startDate })
      .andWhere('decision.createdAt <= :endDate', { endDate })
      .getMany();

    const totalRequests = decisions.length;
    const successfulRequests = decisions.filter((d) => d.isCompleted()).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const completedDecisions = decisions.filter((d) => d.isCompleted());
    const avgCost =
      completedDecisions.length > 0
        ? completedDecisions.reduce((sum, d) => sum + (d.actualCostUsd || 0), 0) /
          completedDecisions.length
        : 0;

    const avgLatency =
      completedDecisions.length > 0
        ? completedDecisions.reduce((sum, d) => sum + d.getTotalLatency(), 0) /
          completedDecisions.length
        : 0;

    const providerDistribution: Record<string, number> = {};
    decisions.forEach((d) => {
      const provider = d.provider;
      providerDistribution[provider] = (providerDistribution[provider] || 0) + 1;
    });

    const level1Decisions = decisions.filter((d) => d.isLevel1Request() && d.isCompleted());
    const serviceLevel1Accuracy =
      level1Decisions.length > 0
        ? level1Decisions.reduce((sum, d) => sum + (d.accuracyScore || 0), 0) /
          level1Decisions.length
        : 0;

    const level2Decisions = decisions.filter((d) => !d.isLevel1Request() && d.isCompleted());
    const serviceLevel2CostEfficiency =
      level2Decisions.length > 0
        ? level2Decisions.reduce((sum, d) => sum + (d.costEfficiencyScore || 0), 0) /
          level2Decisions.length
        : 0;

    const quotaUtilization: Record<string, number> = {};
    this.providers.forEach((config, provider) => {
      const usage = this.getDailyQuotaUsage(provider);
      quotaUtilization[provider] = (usage / config.dailyQuota) * 100;
    });

    return {
      totalRequests,
      successRate,
      avgCost,
      avgLatency,
      providerDistribution,
      serviceLevel1Accuracy,
      serviceLevel2CostEfficiency,
      quotaUtilization,
    };
  }

  private initializeProviders(): void {
    // Level 1 Providers (Highest Accuracy) - Updated August 2025
    this.providers.set(AIProvider.OPENAI, {
      provider: AIProvider.OPENAI,
      models: [
        {
          model: AIModel.GPT_5,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKeyConfig: 'OPENAI_API_KEY',
          costPerToken: 0.00002, // $20 per 1M tokens (estimated)
          accuracyScore: 100, // New gold standard - best reasoning and multimodal capabilities
          maxTokens: 200000, // Enhanced context window
          availability: 99,
          dataRetention: 'short', // 30 days retention
          privacyCompliant: false, // May use data for improvements
          encryptionRequired: true, // Encrypt sensitive health data
          phiCompliant: false, // Not HIPAA compliant by default
        },
        {
          model: AIModel.O1,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKeyConfig: 'OPENAI_API_KEY',
          costPerToken: 0.000018, // $18 per 1M tokens
          accuracyScore: 99, // Excellent for complex health reasoning
          maxTokens: 128000,
          availability: 99,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.GPT_4O_ULTRA,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKeyConfig: 'OPENAI_API_KEY',
          costPerToken: 0.000016, // $16 per 1M tokens
          accuracyScore: 99, // Enhanced multimodal capabilities
          maxTokens: 150000,
          availability: 99,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.GPT_4O,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKeyConfig: 'OPENAI_API_KEY',
          costPerToken: 0.000015, // $15 per 1M tokens
          accuracyScore: 98, // Strong multimodal model
          maxTokens: 128000,
          availability: 99,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 1000000),
      rateLimits: {
        requestsPerMinute: 4000,
        tokensPerMinute: 400000,
      },
      privacyScore: 30, // Low due to data usage policies
      complianceFlags: ['SOC2'],
    });

    this.providers.set(AIProvider.ANTHROPIC, {
      provider: AIProvider.ANTHROPIC,
      models: [
        {
          model: AIModel.CLAUDE_4,
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKeyConfig: 'ANTHROPIC_API_KEY',
          costPerToken: 0.000018, // $18 per 1M tokens (estimated)
          accuracyScore: 100, // Co-gold standard with GPT-5
          maxTokens: 500000, // Large context window
          availability: 99,
          dataRetention: 'zero', // Anthropic doesn't train on conversations
          privacyCompliant: true, // Strong privacy commitment
          encryptionRequired: false, // Less needed due to privacy policy
          phiCompliant: true, // Better for health data
          zeroTrustVerified: true,
        },
        {
          model: AIModel.CLAUDE_3_5_OPUS,
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKeyConfig: 'ANTHROPIC_API_KEY',
          costPerToken: 0.000016, // $16 per 1M tokens
          accuracyScore: 99, // Enhanced Opus model
          maxTokens: 400000,
          availability: 98,
          dataRetention: 'zero',
          privacyCompliant: true,
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
        {
          model: AIModel.CLAUDE_3_5_SONNET_V2,
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKeyConfig: 'ANTHROPIC_API_KEY',
          costPerToken: 0.000015, // $15 per 1M tokens
          accuracyScore: 98, // Updated Sonnet with improved performance
          maxTokens: 300000,
          availability: 99,
          dataRetention: 'zero',
          privacyCompliant: true,
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
        {
          model: AIModel.CLAUDE_3_5_HAIKU_V2,
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKeyConfig: 'ANTHROPIC_API_KEY',
          costPerToken: 0.000008, // $8 per 1M tokens
          accuracyScore: 96, // Enhanced fast model
          maxTokens: 200000,
          availability: 99,
          dataRetention: 'zero',
          privacyCompliant: true,
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 800000),
      rateLimits: {
        requestsPerMinute: 2500,
        tokensPerMinute: 250000,
      },
      privacyScore: 95, // Excellent privacy due to zero-retention policy
      complianceFlags: ['SOC2', 'HIPAA_ELIGIBLE'],
    });

    // Google/Vertex AI Providers (August 2025)
    this.providers.set(AIProvider.GOOGLE, {
      provider: AIProvider.GOOGLE,
      models: [
        {
          model: AIModel.GEMINI_3_0,
          endpoint:
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0:generateContent',
          apiKeyConfig: 'GOOGLE_API_KEY',
          costPerToken: 0.000017, // $17 per 1M tokens
          accuracyScore: 99, // Next-generation Gemini
          maxTokens: 2000000, // Massive context window
          availability: 98,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.GEMINI_2_5_PRO,
          endpoint:
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
          apiKeyConfig: 'GOOGLE_API_KEY',
          costPerToken: 0.000014, // $14 per 1M tokens
          accuracyScore: 97, // Enhanced Pro model
          maxTokens: 2500000, // Very large context
          availability: 98,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.GEMINI_2_0_FLASH_V2,
          endpoint:
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-v2:generateContent',
          apiKeyConfig: 'GOOGLE_API_KEY',
          costPerToken: 0.000012, // $12 per 1M tokens
          accuracyScore: 96, // Updated Flash model
          maxTokens: 1500000,
          availability: 99,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 600000),
      rateLimits: {
        requestsPerMinute: 2000,
        tokensPerMinute: 200000,
      },
      privacyScore: 35, // Moderate privacy concerns
      complianceFlags: ['SOC2'],
    });

    // xAI Provider (Grok models)
    this.providers.set(AIProvider.XAI, {
      provider: AIProvider.XAI,
      models: [
        {
          model: AIModel.GROK_2,
          endpoint: 'https://api.x.ai/v1/chat/completions',
          apiKeyConfig: 'XAI_API_KEY',
          costPerToken: 0.000015, // $15 per 1M tokens (estimated)
          accuracyScore: 97, // Strong performance with real-time data
          maxTokens: 128000,
          availability: 95,
          dataRetention: 'short',
          privacyCompliant: false, // X/Twitter integration concerns
          encryptionRequired: true,
          phiCompliant: false,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 400000),
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 100000,
      },
      privacyScore: 25, // Low due to X platform integration
      complianceFlags: ['SOC2'],
    });

    // DeepSeek Provider (High privacy, competitive accuracy)
    this.providers.set(AIProvider.DEEPSEEK, {
      provider: AIProvider.DEEPSEEK,
      models: [
        {
          model: AIModel.DEEPSEEK_V4,
          endpoint: 'https://api.deepseek.com/v1/chat/completions',
          apiKeyConfig: 'DEEPSEEK_API_KEY',
          costPerToken: 0.000005, // $5 per 1M tokens - very cost effective
          accuracyScore: 96, // Excellent open-source performance
          maxTokens: 128000,
          availability: 97,
          dataRetention: 'zero', // DeepSeek doesn't store data
          privacyCompliant: true, // Strong privacy policy
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
        {
          model: AIModel.DEEPSEEK_CODER_V4,
          endpoint: 'https://api.deepseek.com/v1/chat/completions',
          apiKeyConfig: 'DEEPSEEK_API_KEY',
          costPerToken: 0.000004, // $4 per 1M tokens
          accuracyScore: 95, // Specialized for analysis tasks
          maxTokens: 128000,
          availability: 97,
          dataRetention: 'zero',
          privacyCompliant: true,
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 2000000),
      rateLimits: {
        requestsPerMinute: 2000,
        tokensPerMinute: 200000,
      },
      privacyScore: 90, // Excellent privacy
      complianceFlags: ['SOC2', 'GDPR', 'HIPAA_ELIGIBLE'],
    });

    // Mistral AI Provider
    this.providers.set(AIProvider.MISTRAL, {
      provider: AIProvider.MISTRAL,
      models: [
        {
          model: AIModel.MISTRAL_LARGE_V3,
          endpoint: 'https://api.mistral.ai/v1/chat/completions',
          apiKeyConfig: 'MISTRAL_API_KEY',
          costPerToken: 0.000012, // $12 per 1M tokens
          accuracyScore: 97, // Strong European model
          maxTokens: 128000,
          availability: 98,
          dataRetention: 'short',
          privacyCompliant: true, // GDPR compliant
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
        {
          model: AIModel.MIXTRAL_8X22B_V2,
          endpoint: 'https://api.mistral.ai/v1/chat/completions',
          apiKeyConfig: 'MISTRAL_API_KEY',
          costPerToken: 0.000008, // $8 per 1M tokens
          accuracyScore: 95, // Enhanced MoE model
          maxTokens: 65000,
          availability: 98,
          dataRetention: 'short',
          privacyCompliant: true,
          encryptionRequired: false,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 1200000),
      rateLimits: {
        requestsPerMinute: 1500,
        tokensPerMinute: 150000,
      },
      privacyScore: 85, // Good privacy with GDPR compliance
      complianceFlags: ['SOC2', 'GDPR', 'HIPAA_ELIGIBLE'],
    });

    // Level 2 Providers (Cost-Optimized with Privacy Options)
    this.providers.set(AIProvider.OPENROUTER, {
      provider: AIProvider.OPENROUTER,
      models: [
        {
          model: AIModel.LLAMA_4_70B,
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          apiKeyConfig: 'OPENROUTER_API_KEY',
          costPerToken: 0.000006, // $6 per 1M tokens
          accuracyScore: 90, // Next-gen open source
          maxTokens: 128000,
          availability: 95,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.LLAMA_3_2_90B,
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          apiKeyConfig: 'OPENROUTER_API_KEY',
          costPerToken: 0.000005, // $5 per 1M tokens
          accuracyScore: 88, // Latest Llama 3 series
          maxTokens: 128000,
          availability: 94,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL2_DAILY_QUOTA', 5000000),
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 100000,
      },
      privacyScore: 40,
      complianceFlags: ['SOC2'],
    });

    // Privacy-First Free Tier (HIPAA Eligible)
    this.providers.set(AIProvider.OLLAMA, {
      provider: AIProvider.OLLAMA,
      models: [
        {
          model: AIModel.OLLAMA_LLAMA4_70B,
          endpoint: 'http://localhost:11434/api/generate',
          apiKeyConfig: 'OLLAMA_LOCAL', // Local doesn't need API key
          costPerToken: 0.0, // Free - local processing
          accuracyScore: 95, // On-premise Llama 4 with full privacy
          maxTokens: 128000,
          availability: 99, // Local availability
          dataRetention: 'zero', // Never leaves premises
          privacyCompliant: true,
          encryptionRequired: false, // Local processing
          onPremise: true,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
        {
          model: AIModel.OLLAMA_DEEPSEEK_V4,
          endpoint: 'http://localhost:11434/api/generate',
          apiKeyConfig: 'OLLAMA_LOCAL',
          costPerToken: 0.0,
          accuracyScore: 95, // DeepSeek V4 locally
          maxTokens: 128000,
          availability: 99,
          dataRetention: 'zero',
          privacyCompliant: true,
          encryptionRequired: false,
          onPremise: true,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
        {
          model: AIModel.OLLAMA_LLAMA4_8B,
          endpoint: 'http://localhost:11434/api/generate',
          apiKeyConfig: 'OLLAMA_LOCAL',
          costPerToken: 0.0,
          accuracyScore: 90, // Efficient local model
          maxTokens: 128000,
          availability: 99,
          dataRetention: 'zero',
          privacyCompliant: true,
          encryptionRequired: false,
          onPremise: true,
          phiCompliant: true,
          zeroTrustVerified: true,
        },
      ],
      dailyQuota: this.configService.get('AI_FREE_DAILY_QUOTA', 50000000), // High quota for local
      rateLimits: {
        requestsPerMinute: 1000, // Local processing limits
        tokensPerMinute: 100000,
      },
      privacyScore: 100, // Perfect privacy - local processing
      complianceFlags: ['HIPAA', 'GDPR', 'SOC2', 'ZERO_TRUST'],
    });

    // Enhanced Hugging Face (Privacy-Conscious Open Source)
    this.providers.set(AIProvider.HUGGINGFACE, {
      provider: AIProvider.HUGGINGFACE,
      models: [
        {
          model: AIModel.LLAMA_4_8B,
          endpoint: 'https://api-inference.huggingface.co/models/meta-llama/Llama-4-8B-Instruct',
          apiKeyConfig: 'HUGGINGFACE_API_KEY',
          costPerToken: 0.0, // Free tier
          accuracyScore: 95, // Latest Llama 4 via HF
          maxTokens: 128000,
          availability: 94,
          dataRetention: 'short', // HF inference API
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.DEEPSEEK_V4,
          endpoint: 'https://api-inference.huggingface.co/models/deepseek-ai/deepseek-v4',
          apiKeyConfig: 'HUGGINGFACE_API_KEY',
          costPerToken: 0.0,
          accuracyScore: 95, // DeepSeek V4 via HF
          maxTokens: 128000,
          availability: 93,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
      ],
      dailyQuota: this.configService.get('AI_FREE_DAILY_QUOTA', 15000000),
      rateLimits: {
        requestsPerMinute: 300,
        tokensPerMinute: 75000,
      },
      privacyScore: 50, // Moderate - free tier limitations
      complianceFlags: ['GDPR'],
    });

    // Enhanced GROQ (Speed-optimized with privacy options)
    this.providers.set(AIProvider.GROQ, {
      provider: AIProvider.GROQ,
      models: [
        {
          model: AIModel.LLAMA_4_8B,
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          apiKeyConfig: 'GROQ_API_KEY',
          costPerToken: 0.000001, // $1 per 1M tokens - extremely fast and cost effective
          accuracyScore: 90, // Llama 4 with speed optimization
          maxTokens: 128000,
          availability: 97,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
        {
          model: AIModel.MIXTRAL_8X7B,
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          apiKeyConfig: 'GROQ_API_KEY',
          costPerToken: 0.0000005, // $0.5 per 1M tokens - best cost efficiency
          accuracyScore: 87, // Fast Mixtral variant
          maxTokens: 32000,
          availability: 98,
          dataRetention: 'short',
          privacyCompliant: false,
          encryptionRequired: true,
          phiCompliant: false,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL2_DAILY_QUOTA', 20000000),
      rateLimits: {
        requestsPerMinute: 3000, // High speed processing
        tokensPerMinute: 300000,
      },
      privacyScore: 45,
      complianceFlags: ['SOC2'],
    });
  }

  private determineServiceLevel(requestType: RequestType): AIServiceLevel {
    // Level 1 (Highest Accuracy) - Health-critical requests
    const level1Types = [
      RequestType.HEALTH_REPORT_ANALYSIS,
      RequestType.SYMPTOM_ANALYSIS,
      RequestType.MEDICATION_INTERACTION,
      RequestType.EMERGENCY_ASSESSMENT,
      RequestType.HEALTH_CONSULTATION,
    ];

    return level1Types.includes(requestType) ? AIServiceLevel.LEVEL_1 : AIServiceLevel.LEVEL_2;
  }

  private async getAvailableModels(
    serviceLevel: AIServiceLevel,
    request: AIRoutingRequest,
  ): Promise<
    Array<{
      provider: AIProvider;
      model: AIModel;
      endpoint: string;
      apiKey: string;
      costPerToken: number;
      accuracyScore: number;
      availability: number;
      quotaRemaining: number;
      privacyScore: number;
      encryptionRequired: boolean;
    }>
  > {
    const availableModels = [];

    for (const [provider, config] of this.providers.entries()) {
      const quotaUsed = this.getDailyQuotaUsage(provider);
      const quotaRemaining = config.dailyQuota - quotaUsed;

      if (quotaRemaining <= 0) continue;

      // Privacy-first filtering (August 2025 enhancement)
      if (request.onPremiseOnly) {
        // Only allow local/on-premise models for maximum privacy
        if (provider !== AIProvider.OLLAMA && provider !== AIProvider.SELF_HOSTED) {
          this.logger.debug(`Skipping ${provider} - on-premise only mode`);
          continue;
        }
      }

      // Privacy level filtering
      if (request.privacyLevel === 'maximum' && config.privacyScore < 80) {
        this.logger.debug(`Skipping ${provider} - privacy score too low (${config.privacyScore})`);
        continue;
      }

      if (request.privacyLevel === 'high' && config.privacyScore < 60) {
        this.logger.debug(
          `Skipping ${provider} - privacy score too low for high level (${config.privacyScore})`,
        );
        continue;
      }

      // PHI compliance check
      if (request.containsPHI) {
        const hasPhiCompliantModel = config.models.some((m) => m.phiCompliant);
        if (!hasPhiCompliantModel) {
          this.logger.debug(`Skipping ${provider} - no PHI compliant models`);
          continue;
        }
      }

      // Compliance requirements check
      if (request.complianceRequired?.length > 0) {
        const hasRequiredCompliance = request.complianceRequired.every((required) =>
          config.complianceFlags.includes(required),
        );
        if (!hasRequiredCompliance) {
          this.logger.debug(
            `Skipping ${provider} - missing required compliance: ${request.complianceRequired.join(', ')}`,
          );
          continue;
        }
      }

      for (const modelConfig of config.models) {
        const apiKey = this.configService.get(modelConfig.apiKeyConfig);
        if (!apiKey || apiKey === 'DEMO_KEY') continue;

        // Model-specific privacy checks
        if (request.containsPHI && !modelConfig.phiCompliant) {
          continue; // Skip non-PHI compliant models for health data
        }

        // Check if model meets service level requirements
        if (serviceLevel === AIServiceLevel.LEVEL_1 && modelConfig.accuracyScore < 95) {
          continue;
        }

        // Regional availability check
        if (request.userRegion && modelConfig.region && modelConfig.region !== request.userRegion) {
          continue;
        }

        // Determine if encryption is required based on privacy settings
        const needsEncryption =
          request.requiresEncryption ||
          request.containsPHI ||
          (request.privacyLevel === 'high' && !modelConfig.privacyCompliant) ||
          modelConfig.encryptionRequired;

        availableModels.push({
          provider,
          model: modelConfig.model,
          endpoint: modelConfig.endpoint,
          apiKey,
          costPerToken: modelConfig.costPerToken,
          accuracyScore: modelConfig.accuracyScore,
          availability: modelConfig.availability,
          quotaRemaining,
          privacyScore: config.privacyScore,
          encryptionRequired: needsEncryption,
        });
      }
    }

    // Sort by privacy score for privacy-sensitive requests
    if (request.privacyLevel === 'maximum' || request.containsPHI) {
      availableModels.sort((a, b) => {
        // Privacy-first sorting: privacy score, then accuracy, then cost
        if (a.privacyScore !== b.privacyScore) {
          return b.privacyScore - a.privacyScore; // Higher privacy first
        }
        if (a.accuracyScore !== b.accuracyScore) {
          return b.accuracyScore - a.accuracyScore; // Higher accuracy second
        }
        return a.costPerToken - b.costPerToken; // Lower cost third
      });
    }

    return availableModels;
  }

  private async selectOptimalModel(
    availableModels: any[],
    request: AIRoutingRequest,
    serviceLevel: AIServiceLevel,
  ): Promise<{
    provider: AIProvider;
    model: AIModel;
    endpoint: string;
    apiKey: string;
    routingDecision: RoutingDecision;
    routingReason: string;
    estimatedCost: number;
    quotaRemaining: number;
    alternatives: any[];
    fallbackOptions: any[];
    fallbackProvider?: AIProvider;
    fallbackModel?: AIModel;
  }> {
    // Sort models by score based on service level
    let sortedModels;

    if (serviceLevel === AIServiceLevel.LEVEL_1) {
      // Level 1: Prioritize accuracy, then cost (sort by accuracy desc, then cost asc)
      sortedModels = availableModels.sort((a, b) => {
        if (a.accuracyScore !== b.accuracyScore) {
          return b.accuracyScore - a.accuracyScore; // Higher accuracy first
        }
        return a.costPerToken - b.costPerToken; // Lower cost second
      });
    } else {
      // Level 2: Prioritize cost, then accuracy (sort by cost asc, then accuracy desc)
      sortedModels = availableModels.sort((a, b) => {
        const costDiff = a.costPerToken - b.costPerToken;
        if (Math.abs(costDiff) > 0.000001) {
          // If cost difference is significant
          return costDiff; // Lower cost first
        }
        return b.accuracyScore - a.accuracyScore; // Higher accuracy second
      });
    }

    const selectedModel = sortedModels[0];
    const alternatives = sortedModels.slice(1, 4).map((model, index) => ({
      provider: model.provider,
      model: model.model,
      score: 100 - (index + 1) * 10,
      reason: index === 0 ? 'Second choice' : `Alternative ${index + 1}`,
    }));

    // Estimate cost
    const estimatedTokens = (request.contextTokens || 1000) + (request.maxResponseTokens || 1000);
    const estimatedCost = estimatedTokens * selectedModel.costPerToken;

    // Determine routing decision
    let routingDecision: RoutingDecision;
    let routingReason: string;

    if (request.emergencyRequest) {
      routingDecision = RoutingDecision.EMERGENCY_OVERRIDE;
      routingReason = 'Emergency request routed to highest accuracy model';
    } else if (serviceLevel === AIServiceLevel.LEVEL_1) {
      routingDecision = RoutingDecision.ACCURACY_REQUIREMENT;
      routingReason = 'Level 1 request routed for highest accuracy';
    } else {
      routingDecision = RoutingDecision.COST_OPTIMIZATION;
      routingReason = 'Level 2 request routed for cost optimization';
    }

    return {
      provider: selectedModel.provider,
      model: selectedModel.model,
      endpoint: selectedModel.endpoint,
      apiKey: selectedModel.apiKey,
      routingDecision,
      routingReason,
      estimatedCost,
      quotaRemaining: selectedModel.quotaRemaining,
      alternatives,
      fallbackOptions: sortedModels.slice(1, 3).map((m) => ({
        provider: m.provider,
        model: m.model,
        endpoint: m.endpoint,
      })),
      fallbackProvider: sortedModels[1]?.provider,
      fallbackModel: sortedModels[1]?.model,
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDailyQuotaUsage(provider: AIProvider): number {
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}-${provider}`;
    return this.dailyQuotaUsage.get(key) || 0;
  }

  private updateQuotaUsage(provider: AIProvider, tokens: number): void {
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}-${provider}`;
    const current = this.dailyQuotaUsage.get(key) || 0;
    this.dailyQuotaUsage.set(key, current + tokens);
  }

  /**
   * Reset daily quotas (should be called daily via cron job)
   */
  resetDailyQuotas(): void {
    const today = new Date().toISOString().split('T')[0];

    // Remove all entries that are not from today
    for (const key of this.dailyQuotaUsage.keys()) {
      if (!key.startsWith(today)) {
        this.dailyQuotaUsage.delete(key);
      }
    }

    this.logger.log('Daily AI quotas reset');
  }

  /**
   * Implement enhanced step-down quota ladder for Level 1 requests
   * Uses aggressive step-down percentages with fallback to open source models
   */
  private async selectModelWithQuotaStepDown(
    serviceLevel: AIServiceLevel,
    request: AIRoutingRequest,
  ): Promise<any> {
    if (serviceLevel === AIServiceLevel.LEVEL_1) {
      // Enhanced step-down percentages for Level 1: 100% -> 95% -> 90% -> 85% -> 80%
      const stepDownPercentages = [100, 95, 90, 85, 80];

      for (const percentage of stepDownPercentages) {
        const availableModels = await this.getAvailableModelsWithQuotaPercentage(
          serviceLevel,
          request,
          percentage,
        );

        if (availableModels.length > 0) {
          const selectedModel = await this.selectOptimalModel(
            availableModels,
            request,
            serviceLevel,
          );

          if (percentage < 100) {
            selectedModel.routingReason = `Step-down quota selection (quota level: ${percentage}%)`;
            selectedModel.routingDecision = RoutingDecision.QUOTA_EXCEEDED_STEPDOWN;
          }
          return selectedModel;
        }
      }

      // If Level 1 exhausted, check if emergency - allow fallback to cost-optimized models
      if (request.emergencyRequest) {
        this.logger.warn('Emergency request: Level 1 quota exhausted, falling back to Level 2');
        const level2Models = await this.getAvailableModels(AIServiceLevel.LEVEL_2, request);
        if (level2Models.length > 0) {
          const selectedModel = await this.selectOptimalModel(
            level2Models,
            request,
            AIServiceLevel.LEVEL_2,
          );
          selectedModel.routingReason =
            'Emergency fallback to Level 2 due to Level 1 quota exhaustion';
          selectedModel.routingDecision = RoutingDecision.EMERGENCY_OVERRIDE;
          return selectedModel;
        }
      }

      throw new Error('Level 1 quota exceeded and no available fallback options');
    }

    // Enhanced Level 2 processing with smart cost optimization
    return this.selectOptimalModelEnhanced(serviceLevel, request);
  }

  /**
   * Get available models with quota percentage filtering
   */
  private async getAvailableModelsWithQuotaPercentage(
    serviceLevel: AIServiceLevel,
    request: AIRoutingRequest,
    quotaPercentage: number,
  ): Promise<any[]> {
    const availableModels = [];

    for (const [provider, config] of this.providers.entries()) {
      const quotaUsed = this.getDailyQuotaUsage(provider);
      const adjustedQuota = (config.dailyQuota * quotaPercentage) / 100;
      const quotaRemaining = adjustedQuota - quotaUsed;

      if (quotaRemaining <= 0) continue;

      // Privacy-first filtering (same as getAvailableModels)
      if (request.onPremiseOnly) {
        if (provider !== AIProvider.OLLAMA && provider !== AIProvider.SELF_HOSTED) {
          continue;
        }
      }

      if (request.privacyLevel === 'maximum' && config.privacyScore < 80) {
        continue;
      }

      if (request.privacyLevel === 'high' && config.privacyScore < 60) {
        continue;
      }

      if (request.containsPHI) {
        const hasPhiCompliantModel = config.models.some((m) => m.phiCompliant);
        if (!hasPhiCompliantModel) {
          continue;
        }
      }

      if (request.complianceRequired?.length > 0) {
        const hasRequiredCompliance = request.complianceRequired.every((required) =>
          config.complianceFlags.includes(required),
        );
        if (!hasRequiredCompliance) {
          continue;
        }
      }

      for (const modelConfig of config.models) {
        const apiKey = this.configService.get(modelConfig.apiKeyConfig);
        if (!apiKey || apiKey === 'DEMO_KEY') continue;

        if (request.containsPHI && !modelConfig.phiCompliant) {
          continue;
        }

        // Check if model meets service level requirements
        if (serviceLevel === AIServiceLevel.LEVEL_1 && modelConfig.accuracyScore < 95) {
          continue;
        }

        // Check regional availability
        if (request.userRegion && modelConfig.region && modelConfig.region !== request.userRegion) {
          continue;
        }

        const needsEncryption =
          request.requiresEncryption ||
          request.containsPHI ||
          (request.privacyLevel === 'high' && !modelConfig.privacyCompliant) ||
          modelConfig.encryptionRequired;

        availableModels.push({
          provider,
          model: modelConfig.model,
          endpoint: modelConfig.endpoint,
          apiKey,
          costPerToken: modelConfig.costPerToken,
          accuracyScore: modelConfig.accuracyScore,
          availability: modelConfig.availability,
          quotaRemaining,
          privacyScore: config.privacyScore,
          encryptionRequired: needsEncryption,
        });
      }
    }

    return availableModels;
  }

  /**
   * Generate cache key for request (includes privacy parameters)
   */
  private generateCacheKey(request: AIRoutingRequest): string {
    const keyData = {
      requestType: request.requestType,
      userTier: request.userTier,
      userRegion: request.userRegion,
      emergencyRequest: request.emergencyRequest,
      accuracyRequirement: request.accuracyRequirement,
      // Privacy parameters for cache differentiation
      privacyLevel: request.privacyLevel,
      containsPHI: request.containsPHI,
      onPremiseOnly: request.onPremiseOnly,
      complianceRequired: request.complianceRequired?.sort().join(','), // Sort for consistent cache key
    };
    return `ai_routing:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Check cache for routing result
   */
  private async checkCache(cacheKey: string): Promise<AIRoutingResult | null> {
    try {
      const cached = await this.cacheManager.get<AIRoutingResult>(cacheKey);
      return cached || null;
    } catch (error) {
      this.logger.warn('Cache check failed', error);
      return null;
    }
  }

  /**
   * Cache routing result
   */
  private async cacheResult(cacheKey: string, result: AIRoutingResult): Promise<void> {
    try {
      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, result, 300000);
    } catch (error) {
      this.logger.warn('Cache set failed', error);
    }
  }

  /**
   * Enhanced model selection with intelligent cost optimization and open source prioritization
   */
  private async selectOptimalModelEnhanced(
    serviceLevel: AIServiceLevel,
    request: AIRoutingRequest,
  ): Promise<any> {
    const availableModels = await this.getAvailableModels(serviceLevel, request);
    if (availableModels.length === 0) {
      throw new Error('No available models for request');
    }

    if (serviceLevel === AIServiceLevel.LEVEL_2) {
      // Enhanced Level 2 optimization: Implement proper 5% accuracy rule from PROMPT_README.md
      // Step 1: Find the maximum accuracy among all available models
      const maxAccuracy = Math.max(...availableModels.map((m) => m.accuracyScore));
      const accuracyThreshold = maxAccuracy - 5; // 5% rule from PROMPT_README.md

      // Step 2: Filter models that meet accuracy threshold (≥ Amax - 5%)
      const qualifiedModels = availableModels.filter((m) => m.accuracyScore >= accuracyThreshold);

      if (qualifiedModels.length === 0) {
        // Fallback to all models if none meet threshold
        this.logger.warn(
          `No models meet 5% accuracy threshold (${accuracyThreshold}%), using all models`,
        );
        qualifiedModels.push(...availableModels);
      }

      // Step 3: Among qualified models, prioritize free models first, then lowest cost
      qualifiedModels.sort((a, b) => {
        // First priority: Free models (cost = 0) - best for cost optimization
        if (a.costPerToken === 0 && b.costPerToken > 0) return -1;
        if (b.costPerToken === 0 && a.costPerToken > 0) return 1;

        // Second priority: Cost optimization (lowest cost first)
        const costDiff = a.costPerToken - b.costPerToken;
        if (Math.abs(costDiff) > 0.000001) {
          return costDiff; // Lower cost first
        }

        // Third priority: Higher accuracy (when cost is equal)
        return b.accuracyScore - a.accuracyScore;
      });

      const selectedModel = qualifiedModels[0];

      // Enhanced reasoning with 5% rule explanation
      let reason = '';
      if (selectedModel.costPerToken === 0) {
        reason = `Free model selected (accuracy: ${selectedModel.accuracyScore}%, within 5% of best: ${maxAccuracy}%) for maximum cost optimization`;
      } else {
        reason = `Cost-optimized model selected (accuracy: ${selectedModel.accuracyScore}%, cost: $${selectedModel.costPerToken.toFixed(6)}/token, within 5% of best accuracy: ${maxAccuracy}%)`;
      }

      return this.buildModelResult(selectedModel, qualifiedModels, request, serviceLevel, reason);
    }

    // Level 1: Accuracy-first selection
    return this.selectOptimalModel(availableModels, request, serviceLevel);
  }

  /**
   * Build model result with retry configuration
   */
  private buildModelResult(
    selectedModel: any,
    availableModels: any[],
    request: AIRoutingRequest,
    serviceLevel: AIServiceLevel,
    reason?: string,
  ): any {
    // Estimate cost
    const estimatedTokens = (request.contextTokens || 1000) + (request.maxResponseTokens || 1000);
    const estimatedCost = estimatedTokens * selectedModel.costPerToken;

    // Determine routing decision
    let routingDecision: RoutingDecision;
    let routingReason: string = reason || 'Optimal model selected';

    if (request.emergencyRequest) {
      routingDecision = RoutingDecision.EMERGENCY_OVERRIDE;
      routingReason = 'Emergency request routed to highest accuracy model';
    } else if (serviceLevel === AIServiceLevel.LEVEL_1) {
      routingDecision = RoutingDecision.ACCURACY_REQUIREMENT;
      routingReason = 'Level 1 request routed for highest accuracy';
    } else {
      routingDecision = RoutingDecision.COST_OPTIMIZATION;
      routingReason = reason || 'Level 2 request routed for cost optimization';
    }

    const alternatives = availableModels.slice(1, 4).map((model, index) => ({
      provider: model.provider,
      model: model.model,
      score: 100 - (index + 1) * 10,
      reason: index === 0 ? 'Second choice' : `Alternative ${index + 1}`,
    }));

    return {
      provider: selectedModel.provider,
      model: selectedModel.model,
      endpoint: selectedModel.endpoint,
      apiKey: selectedModel.apiKey,
      routingDecision,
      routingReason,
      estimatedCost,
      quotaRemaining: selectedModel.quotaRemaining,
      alternatives,
      fallbackOptions: availableModels.slice(1, 3).map((m) => ({
        provider: m.provider,
        model: m.model,
        endpoint: m.endpoint,
      })),
      fallbackProvider: availableModels[1]?.provider,
      fallbackModel: availableModels[1]?.model,
    };
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = this.retryConfiguration.maxRetries,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(`${context} attempt ${attempt}/${maxRetries} failed:`, error.message);

        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfiguration.baseDelay *
            Math.pow(this.retryConfiguration.backoffFactor, attempt - 1),
          this.retryConfiguration.maxDelay,
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Route request with user token awareness and automatic fallback to free tier
   */
  async routeRequestWithUserTokens(
    request: AIRoutingRequest & { forceFreeTier?: boolean },
  ): Promise<AIRoutingResult & { usedFreeTier: boolean; userTokensConsumed: number }> {
    this.logger.debug(`Routing AI request with user token awareness: ${request.requestType}`);

    // If user explicitly requests free tier or has no user context, use free providers
    if (request.forceFreeTier || !request.userId) {
      return this.routeToFreeTier(request);
    }

    // First, try normal routing
    try {
      const result = await this.routeRequest(request);

      // Check if this is already a free tier provider
      if (this.isFreeTierProvider(result.provider)) {
        return {
          ...result,
          usedFreeTier: true,
          userTokensConsumed: 0,
        };
      }

      // Return paid tier result with token consumption info
      const estimatedTokens = (request.contextTokens || 0) + (request.maxResponseTokens || 1000);

      return {
        ...result,
        usedFreeTier: false,
        userTokensConsumed: estimatedTokens,
      };
    } catch (error) {
      this.logger.warn(
        `Paid tier routing failed for user ${request.userId}, falling back to free tier:`,
        error.message,
      );

      // Fallback to free tier
      return this.routeToFreeTier(request);
    }
  }

  /**
   * Route specifically to free tier providers
   */
  private async routeToFreeTier(
    request: AIRoutingRequest,
  ): Promise<AIRoutingResult & { usedFreeTier: boolean; userTokensConsumed: number }> {
    this.logger.debug('Routing to free tier providers');

    const freeTierProviders = [AIProvider.HUGGINGFACE, AIProvider.GROQ];
    const availableModels = [];

    // Collect all free tier models
    for (const provider of freeTierProviders) {
      const config = this.providers.get(provider);
      if (!config) continue;

      const quotaUsed = this.getDailyQuotaUsage(provider);
      const quotaRemaining = config.dailyQuota - quotaUsed;

      if (quotaRemaining <= 0) continue;

      for (const modelConfig of config.models) {
        availableModels.push({
          provider,
          model: modelConfig.model,
          endpoint: modelConfig.endpoint,
          apiKey: this.configService.get(modelConfig.apiKeyConfig),
          costPerToken: 0, // Free tier
          accuracyScore: modelConfig.accuracyScore,
          maxTokens: modelConfig.maxTokens,
          availability: modelConfig.availability,
          quotaRemaining,
        });
      }
    }

    if (availableModels.length === 0) {
      throw new Error('No free tier providers available');
    }

    // Sort by accuracy and availability
    availableModels.sort((a, b) => {
      const scoreA = a.accuracyScore * (a.availability / 100);
      const scoreB = b.accuracyScore * (b.availability / 100);
      return scoreB - scoreA;
    });

    const selectedModel = availableModels[0];
    const requestId = this.generateRequestId();

    // Create routing decision record
    const decision = this.routingRepository.create({
      userId: request.userId,
      sessionId: request.sessionId,
      requestId,
      requestType: request.requestType,
      serviceLevel: AIServiceLevel.LEVEL_2, // Free tier uses Level 2
      contextTokens: request.contextTokens,
      maxResponseTokens: request.maxResponseTokens,
      emergencyRequest: request.emergencyRequest || false,
      userTier: 'free',
      userRegion: request.userRegion,
      accuracyRequirement: request.accuracyRequirement,
      provider: selectedModel.provider,
      model: selectedModel.model,
      endpointUrl: selectedModel.endpoint,
      routingDecision: RoutingDecision.FREE_TIER_FALLBACK,
      routingReason: 'Free tier fallback due to user token limits or explicit request',
      estimatedCostUsd: 0,
      quotaRemaining: selectedModel.quotaRemaining,
    });

    await this.routingRepository.save(decision);

    return {
      provider: selectedModel.provider,
      model: selectedModel.model,
      endpoint: selectedModel.endpoint,
      apiKey: selectedModel.apiKey,
      routingDecision: RoutingDecision.FREE_TIER_FALLBACK,
      routingReason: 'Free tier fallback due to user token limits or explicit request',
      estimatedCost: 0,
      quotaRemaining: selectedModel.quotaRemaining,
      fallbackOptions: availableModels.slice(1, 3).map((m) => ({
        provider: m.provider,
        model: m.model,
        endpoint: m.endpoint,
      })),
      decisionId: decision.id,
      usedFreeTier: true,
      userTokensConsumed: 0,
    };
  }

  /**
   * Check if provider is a free tier provider (with privacy consideration)
   */
  private isFreeTierProvider(provider: AIProvider): boolean {
    const freeTierProviders = [AIProvider.HUGGINGFACE, AIProvider.GROQ, AIProvider.OLLAMA];
    return freeTierProviders.includes(provider);
  }

  /**
   * Route specifically to privacy-compliant providers
   */
  private async routeToPrivacyCompliantProviders(
    request: AIRoutingRequest,
  ): Promise<AIRoutingResult> {
    this.logger.debug('Routing to privacy-compliant providers for health data');

    // Privacy-first provider priority: Ollama (local) > DeepSeek > Anthropic > Mistral
    const privacyProviders = [
      AIProvider.OLLAMA,
      AIProvider.DEEPSEEK,
      AIProvider.ANTHROPIC,
      AIProvider.MISTRAL,
    ];
    const availableModels = [];

    for (const provider of privacyProviders) {
      const config = this.providers.get(provider);
      if (!config) continue;

      // Skip if privacy score is too low
      if (config.privacyScore < 80) continue;

      const quotaUsed = this.getDailyQuotaUsage(provider);
      const quotaRemaining = config.dailyQuota - quotaUsed;

      if (quotaRemaining <= 0) continue;

      for (const modelConfig of config.models) {
        // Only include PHI-compliant models for health data
        if (request.containsPHI && !modelConfig.phiCompliant) continue;

        const apiKey = this.configService.get(modelConfig.apiKeyConfig);
        if (provider !== AIProvider.OLLAMA && (!apiKey || apiKey === 'DEMO_KEY')) continue;

        availableModels.push({
          provider,
          model: modelConfig.model,
          endpoint: modelConfig.endpoint,
          apiKey: apiKey || 'LOCAL',
          costPerToken: modelConfig.costPerToken,
          accuracyScore: modelConfig.accuracyScore,
          maxTokens: modelConfig.maxTokens,
          availability: modelConfig.availability,
          quotaRemaining,
          privacyScore: config.privacyScore,
          dataRetention: modelConfig.dataRetention,
          onPremise: modelConfig.onPremise || false,
        });
      }
    }

    if (availableModels.length === 0) {
      throw new Error('No privacy-compliant providers available for health data');
    }

    // Sort by privacy score, then accuracy, then cost
    availableModels.sort((a, b) => {
      if (a.privacyScore !== b.privacyScore) {
        return b.privacyScore - a.privacyScore; // Higher privacy first
      }
      if (a.accuracyScore !== b.accuracyScore) {
        return b.accuracyScore - a.accuracyScore; // Higher accuracy second
      }
      return a.costPerToken - b.costPerToken; // Lower cost third
    });

    const selectedModel = availableModels[0];
    const requestId = this.generateRequestId();

    // Create routing decision record
    const decision = this.routingRepository.create({
      userId: request.userId,
      sessionId: request.sessionId,
      requestId,
      requestType: request.requestType,
      serviceLevel: AIServiceLevel.LEVEL_1, // Privacy-compliant uses Level 1
      contextTokens: request.contextTokens,
      maxResponseTokens: request.maxResponseTokens,
      emergencyRequest: request.emergencyRequest || false,
      userTier: 'privacy_compliant',
      userRegion: request.userRegion,
      accuracyRequirement: request.accuracyRequirement,
      provider: selectedModel.provider,
      model: selectedModel.model,
      endpointUrl: selectedModel.endpoint,
      routingDecision: RoutingDecision.ACCURACY_REQUIREMENT,
      routingReason: `Privacy-compliant routing: ${selectedModel.provider} (privacy score: ${selectedModel.privacyScore}, ${selectedModel.dataRetention} retention, ${selectedModel.onPremise ? 'on-premise' : 'cloud'})`,
      estimatedCostUsd:
        selectedModel.costPerToken *
        ((request.contextTokens || 1000) + (request.maxResponseTokens || 1000)),
      quotaRemaining: selectedModel.quotaRemaining,
    });

    await this.routingRepository.save(decision);

    return {
      provider: selectedModel.provider,
      model: selectedModel.model,
      endpoint: selectedModel.endpoint,
      apiKey: selectedModel.apiKey,
      routingDecision: RoutingDecision.ACCURACY_REQUIREMENT,
      routingReason: decision.routingReason,
      estimatedCost: decision.estimatedCostUsd,
      quotaRemaining: selectedModel.quotaRemaining,
      fallbackOptions: availableModels.slice(1, 3).map((m) => ({
        provider: m.provider,
        model: m.model,
        endpoint: m.endpoint,
      })),
      decisionId: decision.id,
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
