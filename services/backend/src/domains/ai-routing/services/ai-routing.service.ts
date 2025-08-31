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
  }>;
  dailyQuota: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
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
   * Route AI request to optimal provider/model
   */
  async routeRequest(request: AIRoutingRequest): Promise<AIRoutingResult> {
    this.logger.debug(`Routing AI request: ${request.requestType}`);

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
    // Level 1 Providers (Highest Accuracy)
    this.providers.set(AIProvider.OPENAI, {
      provider: AIProvider.OPENAI,
      models: [
        {
          model: AIModel.GPT_4_TURBO,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKeyConfig: 'OPENAI_API_KEY',
          costPerToken: 0.00003, // $30 per 1M tokens
          accuracyScore: 95,
          maxTokens: 128000,
          availability: 99,
        },
        {
          model: AIModel.GPT_4O,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKeyConfig: 'OPENAI_API_KEY',
          costPerToken: 0.000015, // $15 per 1M tokens
          accuracyScore: 93,
          maxTokens: 128000,
          availability: 99,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 1000000),
      rateLimits: {
        requestsPerMinute: 3500,
        tokensPerMinute: 350000,
      },
    });

    this.providers.set(AIProvider.ANTHROPIC, {
      provider: AIProvider.ANTHROPIC,
      models: [
        {
          model: AIModel.CLAUDE_3_OPUS,
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKeyConfig: 'ANTHROPIC_API_KEY',
          costPerToken: 0.000075, // $75 per 1M tokens
          accuracyScore: 96,
          maxTokens: 200000,
          availability: 98,
        },
        {
          model: AIModel.CLAUDE_3_SONNET,
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKeyConfig: 'ANTHROPIC_API_KEY',
          costPerToken: 0.000015, // $15 per 1M tokens
          accuracyScore: 92,
          maxTokens: 200000,
          availability: 99,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL1_DAILY_QUOTA', 800000),
      rateLimits: {
        requestsPerMinute: 2000,
        tokensPerMinute: 200000,
      },
    });

    // Level 2 Providers (Cost-Optimized)
    this.providers.set(AIProvider.OPENROUTER, {
      provider: AIProvider.OPENROUTER,
      models: [
        {
          model: AIModel.LLAMA_3_1_70B,
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          apiKeyConfig: 'OPENROUTER_API_KEY',
          costPerToken: 0.000004, // $4 per 1M tokens
          accuracyScore: 85,
          maxTokens: 128000,
          availability: 95,
        },
        {
          model: AIModel.MIXTRAL_8X22B,
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          apiKeyConfig: 'OPENROUTER_API_KEY',
          costPerToken: 0.000006, // $6 per 1M tokens
          accuracyScore: 87,
          maxTokens: 65000,
          availability: 93,
        },
      ],
      dailyQuota: this.configService.get('AI_LEVEL2_DAILY_QUOTA', 5000000),
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 100000,
      },
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
    }>
  > {
    const availableModels = [];

    for (const [provider, config] of this.providers.entries()) {
      const quotaUsed = this.getDailyQuotaUsage(provider);
      const quotaRemaining = config.dailyQuota - quotaUsed;

      if (quotaRemaining <= 0) continue;

      for (const modelConfig of config.models) {
        const apiKey = this.configService.get(modelConfig.apiKeyConfig);
        if (!apiKey || apiKey === 'DEMO_KEY') continue;

        // Check if model meets service level requirements
        if (serviceLevel === AIServiceLevel.LEVEL_1 && modelConfig.accuracyScore < 90) {
          continue;
        }

        // Check regional availability
        if (request.userRegion && modelConfig.region && modelConfig.region !== request.userRegion) {
          continue;
        }

        availableModels.push({
          provider,
          model: modelConfig.model,
          endpoint: modelConfig.endpoint,
          apiKey,
          costPerToken: modelConfig.costPerToken,
          accuracyScore: modelConfig.accuracyScore,
          availability: modelConfig.availability,
          quotaRemaining,
        });
      }
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
        if (Math.abs(costDiff) > 0.000001) { // If cost difference is significant
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
   * Implement step-down quota ladder for Level 1 requests
   */
  private async selectModelWithQuotaStepDown(
    serviceLevel: AIServiceLevel,
    request: AIRoutingRequest,
  ): Promise<any> {
    if (serviceLevel === AIServiceLevel.LEVEL_1) {
      // Define step-down percentages: 100% -> 98% -> 97% -> 95% -> 90%
      const stepDownPercentages = [100, 98, 97, 95, 90];
      
      for (const percentage of stepDownPercentages) {
        const availableModels = await this.getAvailableModelsWithQuotaPercentage(
          serviceLevel,
          request,
          percentage,
        );
        
        if (availableModels.length > 0) {
          const selectedModel = await this.selectOptimalModel(availableModels, request, serviceLevel);
          
          if (percentage < 100) {
            selectedModel.routingReason += ` (quota level: ${percentage}%)`;
          }
          return selectedModel;
        }
      }
      
      // If no Level 1 models available, check if user consents to Level 2
      if (!request.emergencyRequest) {
        this.logger.warn('Level 1 quota exceeded, falling back to Level 2 without consent');
        throw new Error('Level 1 quota exceeded and no consent for Level 2 fallback');
      }
    }
    
    // Regular Level 2 processing with enhanced cost optimization
    const availableModels = await this.getAvailableModels(serviceLevel, request);
    if (availableModels.length === 0) {
      throw new Error('No available models for request');
    }
    
    return this.selectOptimalModelEnhanced(availableModels, request, serviceLevel);
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

      for (const modelConfig of config.models) {
        const apiKey = this.configService.get(modelConfig.apiKeyConfig);
        if (!apiKey || apiKey === 'DEMO_KEY') continue;

        // Check if model meets service level requirements
        if (serviceLevel === AIServiceLevel.LEVEL_1 && modelConfig.accuracyScore < 90) {
          continue;
        }

        // Check regional availability
        if (request.userRegion && modelConfig.region && modelConfig.region !== request.userRegion) {
          continue;
        }

        availableModels.push({
          provider,
          model: modelConfig.model,
          endpoint: modelConfig.endpoint,
          apiKey,
          costPerToken: modelConfig.costPerToken,
          accuracyScore: modelConfig.accuracyScore,
          availability: modelConfig.availability,
          quotaRemaining,
        });
      }
    }

    return availableModels;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIRoutingRequest): string {
    const keyData = {
      requestType: request.requestType,
      userTier: request.userTier,
      userRegion: request.userRegion,
      emergencyRequest: request.emergencyRequest,
      accuracyRequirement: request.accuracyRequirement,
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
   * Enhanced model selection with cost optimization for Level 2
   */
  private async selectOptimalModelEnhanced(
    availableModels: any[],
    request: AIRoutingRequest,
    serviceLevel: AIServiceLevel,
  ): Promise<any> {
    if (serviceLevel === AIServiceLevel.LEVEL_2) {
      // For Level 2: Sort by cost first, then accuracy
      availableModels.sort((a, b) => {
        const costDiff = a.costPerToken - b.costPerToken;
        if (Math.abs(costDiff) > 0.000001) { // If cost difference is significant
          return costDiff; // Lower cost first
        }
        return b.accuracyScore - a.accuracyScore; // Higher accuracy second
      });
      
      return this.buildModelResult(availableModels[0], availableModels, request, serviceLevel, 'Cost-optimized model selection');
    }
    
    // Fallback to original logic
    return this.selectOptimalModel(availableModels, request, serviceLevel);
  }

  /**
   * Build model result with retry configuration
   */
  private buildModelResult(selectedModel: any, availableModels: any[], request: AIRoutingRequest, serviceLevel: AIServiceLevel, reason?: string): any {
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
          this.retryConfiguration.baseDelay * Math.pow(this.retryConfiguration.backoffFactor, attempt - 1),
          this.retryConfiguration.maxDelay,
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
