import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  UserTier,
  AIModel,
  UserQuota,
  AIUsageMetrics,
  PolicyRule,
  PolicyCondition,
  PolicyAction,
  AIRequest,
  ModelCostConfig,
  CostOptimizationRule,
  TierConfiguration,
  PolicyDecision,
} from './types';

@Injectable()
export class AIPolicyService {
  private readonly logger = new Logger(AIPolicyService.name);
  
  // In-memory stores for demo - replace with actual database
  private userQuotas = new Map<string, UserQuota>();
  private usageMetrics = new Map<string, AIUsageMetrics[]>();
  private policyRules = new Map<string, PolicyRule>();
  private costOptimizationRules = new Map<string, CostOptimizationRule>();
  private tierConfigurations = new Map<UserTier, TierConfiguration>();
  private modelCosts = new Map<AIModel, ModelCostConfig>();

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultConfigurations();
  }

  private initializeDefaultConfigurations(): void {
    // Initialize tier configurations
    this.initializeTierConfigurations();
    
    // Initialize model cost configurations
    this.initializeModelCosts();
    
    // Initialize policy rules
    this.initializePolicyRules();
    
    // Initialize cost optimization rules
    this.initializeCostOptimizationRules();
    
    this.logger.log('AI Policy service initialized with default configurations');
  }

  private initializeTierConfigurations(): void {
    const tiers: TierConfiguration[] = [
      {
        tier: UserTier.FREE,
        displayName: 'Free',
        description: 'Basic AI features with limited usage',
        limits: {
          dailyRequests: 20,
          monthlyRequests: 500,
          maxTokensPerRequest: 1000,
          maxTokensPerDay: 10000,
          maxTokensPerMonth: 200000,
          rateLimitPerMinute: 5,
        },
        features: {
          priorityQueue: false,
          advancedModels: false,
          customPersonalization: false,
          exportData: false,
          apiAccess: false,
        },
        allowedModels: [AIModel.GPT_3_5_TURBO, AIModel.GEMINI_PRO],
        costLimits: {
          dailyCostUSD: 1.0,
          monthlyCostUSD: 20.0,
        },
        supportLevel: 'community',
      },
      {
        tier: UserTier.BASIC,
        displayName: 'Basic',
        description: 'Enhanced AI features with moderate usage limits',
        limits: {
          dailyRequests: 100,
          monthlyRequests: 2500,
          maxTokensPerRequest: 2500,
          maxTokensPerDay: 50000,
          maxTokensPerMonth: 1000000,
          rateLimitPerMinute: 15,
        },
        features: {
          priorityQueue: false,
          advancedModels: true,
          customPersonalization: true,
          exportData: true,
          apiAccess: false,
        },
        allowedModels: [AIModel.GPT_3_5_TURBO, AIModel.GPT_4, AIModel.CLAUDE_3_HAIKU, AIModel.GEMINI_PRO],
        costLimits: {
          dailyCostUSD: 5.0,
          monthlyCostUSD: 100.0,
        },
        supportLevel: 'email',
      },
      {
        tier: UserTier.PREMIUM,
        displayName: 'Premium',
        description: 'Full AI features with high usage limits',
        limits: {
          dailyRequests: 500,
          monthlyRequests: 10000,
          maxTokensPerRequest: 8000,
          maxTokensPerDay: 200000,
          maxTokensPerMonth: 5000000,
          rateLimitPerMinute: 50,
        },
        features: {
          priorityQueue: true,
          advancedModels: true,
          customPersonalization: true,
          exportData: true,
          apiAccess: true,
        },
        allowedModels: [
          AIModel.GPT_3_5_TURBO,
          AIModel.GPT_4,
          AIModel.GPT_4_TURBO,
          AIModel.CLAUDE_3_HAIKU,
          AIModel.CLAUDE_3_SONNET,
          AIModel.GEMINI_PRO,
        ],
        costLimits: {
          dailyCostUSD: 25.0,
          monthlyCostUSD: 500.0,
        },
        supportLevel: 'priority',
      },
      {
        tier: UserTier.ENTERPRISE,
        displayName: 'Enterprise',
        description: 'Unlimited AI features with enterprise support',
        limits: {
          dailyRequests: 2000,
          monthlyRequests: 50000,
          maxTokensPerRequest: 16000,
          maxTokensPerDay: 1000000,
          maxTokensPerMonth: 25000000,
          rateLimitPerMinute: 200,
        },
        features: {
          priorityQueue: true,
          advancedModels: true,
          customPersonalization: true,
          exportData: true,
          apiAccess: true,
        },
        allowedModels: Object.values(AIModel),
        costLimits: {
          dailyCostUSD: 100.0,
          monthlyCostUSD: 2000.0,
        },
        supportLevel: 'dedicated',
      },
    ];

    tiers.forEach(tier => {
      this.tierConfigurations.set(tier.tier, tier);
    });
  }

  private initializeModelCosts(): void {
    const modelCosts: ModelCostConfig[] = [
      {
        model: AIModel.GPT_3_5_TURBO,
        inputCostPer1000Tokens: 0.0015,
        outputCostPer1000Tokens: 0.002,
        provider: 'OpenAI',
        maxTokens: 4096,
        tier: 'economy',
      },
      {
        model: AIModel.GPT_4,
        inputCostPer1000Tokens: 0.03,
        outputCostPer1000Tokens: 0.06,
        provider: 'OpenAI',
        maxTokens: 8192,
        tier: 'premium',
      },
      {
        model: AIModel.GPT_4_TURBO,
        inputCostPer1000Tokens: 0.01,
        outputCostPer1000Tokens: 0.03,
        provider: 'OpenAI',
        maxTokens: 128000,
        tier: 'premium',
      },
      {
        model: AIModel.CLAUDE_3_HAIKU,
        inputCostPer1000Tokens: 0.00025,
        outputCostPer1000Tokens: 0.00125,
        provider: 'Anthropic',
        maxTokens: 200000,
        tier: 'economy',
      },
      {
        model: AIModel.CLAUDE_3_SONNET,
        inputCostPer1000Tokens: 0.003,
        outputCostPer1000Tokens: 0.015,
        provider: 'Anthropic',
        maxTokens: 200000,
        tier: 'standard',
      },
      {
        model: AIModel.CLAUDE_3_OPUS,
        inputCostPer1000Tokens: 0.015,
        outputCostPer1000Tokens: 0.075,
        provider: 'Anthropic',
        maxTokens: 200000,
        tier: 'premium',
      },
      {
        model: AIModel.GEMINI_PRO,
        inputCostPer1000Tokens: 0.000125,
        outputCostPer1000Tokens: 0.000375,
        provider: 'Google',
        maxTokens: 30720,
        tier: 'economy',
      },
    ];

    modelCosts.forEach(config => {
      this.modelCosts.set(config.model, config);
    });
  }

  private initializePolicyRules(): void {
    const rules: PolicyRule[] = [
      {
        id: 'free_tier_daily_limit',
        name: 'Free Tier Daily Request Limit',
        description: 'Deny requests for free tier users who exceed daily limit',
        priority: 100,
        conditions: [
          { field: 'userTier', operator: 'equals', value: UserTier.FREE },
          { field: 'requestsToday', operator: 'greater_than', value: 20 },
        ],
        action: PolicyAction.DENY,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'premium_model_restriction',
        name: 'Premium Model Access Control',
        description: 'Downgrade to GPT-3.5 for users without premium access',
        priority: 90,
        conditions: [
          { field: 'userTier', operator: 'in', value: [UserTier.FREE] },
          { field: 'modelType', operator: 'in', value: [AIModel.GPT_4, AIModel.CLAUDE_3_OPUS] },
        ],
        action: PolicyAction.DOWNGRADE,
        actionParams: { alternativeModel: AIModel.GPT_3_5_TURBO },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rate_limit_protection',
        name: 'Rate Limit Protection',
        description: 'Throttle requests that exceed rate limits',
        priority: 95,
        conditions: [
          { field: 'requestsToday', operator: 'greater_than', value: 0, threshold: 1 }, // Per minute
        ],
        action: PolicyAction.THROTTLE,
        actionParams: { delaySeconds: 60 },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cost_control',
        name: 'Daily Cost Control',
        description: 'Switch to cheaper model when approaching daily cost limit',
        priority: 80,
        conditions: [
          { field: 'tokensToday', operator: 'greater_than', value: 0.8 }, // 80% of daily token limit
        ],
        action: PolicyAction.DOWNGRADE,
        actionParams: { alternativeModel: AIModel.GPT_3_5_TURBO },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    rules.forEach(rule => {
      this.policyRules.set(rule.id, rule);
    });
  }

  private initializeCostOptimizationRules(): void {
    const rules: CostOptimizationRule[] = [
      {
        id: 'emergency_cost_control',
        name: 'Emergency Cost Control',
        description: 'Switch all users to cheapest models when daily cost exceeds threshold',
        triggers: {
          dailyCostThreshold: 500, // $500 per day
        },
        actions: {
          switchToModel: AIModel.CLAUDE_3_HAIKU,
          enableCaching: true,
          reduceMaxTokens: 2000,
        },
        enabled: true,
      },
      {
        id: 'performance_optimization',
        name: 'Performance-Based Optimization',
        description: 'Optimize model selection based on response time and error rates',
        triggers: {
          responseTimeThreshold: 5000, // 5 seconds
          errorRateThreshold: 0.1, // 10%
        },
        actions: {
          switchToModel: AIModel.GPT_3_5_TURBO,
          throttleRequests: true,
        },
        enabled: true,
      },
    ];

    rules.forEach(rule => {
      this.costOptimizationRules.set(rule.id, rule);
    });
  }

  async evaluateRequest(
    userId: string,
    requestedModel: AIModel,
    estimatedTokens: number,
    contentType: string,
  ): Promise<PolicyDecision> {
    try {
      const userQuota = await this.getUserQuota(userId);
      const todayUsage = await this.getTodayUsage(userId);
      
      // Check each policy rule in priority order
      const sortedRules = Array.from(this.policyRules.values())
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        const ruleContext = {
          userTier: userQuota.tier,
          requestsToday: todayUsage.requestCount,
          requestsThisMonth: await this.getMonthlyRequestCount(userId),
          tokensToday: todayUsage.tokensUsed,
          tokensThisMonth: await this.getMonthlyTokenCount(userId),
          errorRate: todayUsage.errorRate,
          timeOfDay: new Date().getHours(),
          modelType: requestedModel,
          contentType,
        };

        if (this.evaluateRuleConditions(rule.conditions, ruleContext)) {
          return this.executeRuleAction(rule, requestedModel, estimatedTokens);
        }
      }

      // If no rules triggered, check basic tier limits
      const tierConfig = this.tierConfigurations.get(userQuota.tier);
      if (!tierConfig) {
        return {
          action: PolicyAction.DENY,
          reason: 'Invalid user tier',
        };
      }

      // Check if model is allowed for this tier
      if (!tierConfig.allowedModels.includes(requestedModel)) {
        const alternativeModel = this.findBestAlternativeModel(requestedModel, tierConfig.allowedModels);
        return {
          action: PolicyAction.DOWNGRADE,
          reason: 'Model not available for user tier',
          alternativeModel,
        };
      }

      // Check rate limits
      if (todayUsage.requestCount >= tierConfig.limits.dailyRequests) {
        return {
          action: PolicyAction.DENY,
          reason: 'Daily request limit exceeded',
        };
      }

      // Check token limits
      if (todayUsage.tokensUsed + estimatedTokens > tierConfig.limits.maxTokensPerDay) {
        return {
          action: PolicyAction.DENY,
          reason: 'Daily token limit would be exceeded',
        };
      }

      // Request approved
      return {
        action: PolicyAction.ALLOW,
        reason: 'Request approved',
      };

    } catch (error) {
      this.logger.error('Error evaluating AI policy request:', error);
      return {
        action: PolicyAction.DENY,
        reason: 'Policy evaluation error',
      };
    }
  }

  async recordUsage(aiRequest: AIRequest): Promise<void> {
    try {
      // Update user quota usage
      await this.updateUserQuotaUsage(aiRequest.userId, aiRequest);
      
      // Record usage metrics
      await this.recordUsageMetrics(aiRequest);
      
      // Emit usage event for analytics
      this.eventEmitter.emit('ai.usage.recorded', aiRequest);
      
      // Check if cost optimization rules should be triggered
      await this.checkCostOptimizationTriggers();
      
    } catch (error) {
      this.logger.error('Error recording AI usage:', error);
    }
  }

  async getUserQuota(userId: string): Promise<UserQuota> {
    let quota = this.userQuotas.get(userId);
    
    if (!quota) {
      // Create default quota for new user (assume free tier)
      const tierConfig = this.tierConfigurations.get(UserTier.FREE);
      quota = {
        userId,
        tier: UserTier.FREE,
        dailyRequests: 0,
        monthlyRequests: 0,
        maxTokensPerRequest: tierConfig.limits.maxTokensPerRequest,
        maxTokensPerDay: tierConfig.limits.maxTokensPerDay,
        maxTokensPerMonth: tierConfig.limits.maxTokensPerMonth,
        priorityQueueAccess: tierConfig.features.priorityQueue,
        allowedModels: tierConfig.allowedModels,
        rateLimitPerMinute: tierConfig.limits.rateLimitPerMinute,
        resetDaily: this.getNextDayReset(),
        resetMonthly: this.getNextMonthReset(),
      };
      
      this.userQuotas.set(userId, quota);
    }
    
    // Check if quotas need to be reset
    if (new Date() >= quota.resetDaily) {
      quota.dailyRequests = 0;
      quota.resetDaily = this.getNextDayReset();
    }
    
    if (new Date() >= quota.resetMonthly) {
      quota.monthlyRequests = 0;
      quota.resetMonthly = this.getNextMonthReset();
    }
    
    return quota;
  }

  async updateUserTier(userId: string, newTier: UserTier): Promise<void> {
    const quota = await this.getUserQuota(userId);
    const tierConfig = this.tierConfigurations.get(newTier);
    
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${newTier}`);
    }
    
    quota.tier = newTier;
    quota.maxTokensPerRequest = tierConfig.limits.maxTokensPerRequest;
    quota.maxTokensPerDay = tierConfig.limits.maxTokensPerDay;
    quota.maxTokensPerMonth = tierConfig.limits.maxTokensPerMonth;
    quota.priorityQueueAccess = tierConfig.features.priorityQueue;
    quota.allowedModels = tierConfig.allowedModels;
    quota.rateLimitPerMinute = tierConfig.limits.rateLimitPerMinute;
    
    this.userQuotas.set(userId, quota);
    this.eventEmitter.emit('user.tier.updated', { userId, oldTier: quota.tier, newTier });
    
    this.logger.log(`Updated user ${userId} tier to ${newTier}`);
  }

  async getTodayUsage(userId: string): Promise<AIUsageMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const userMetrics = this.usageMetrics.get(userId) || [];
    
    return userMetrics.find(m => m.date === today) || {
      userId,
      date: today,
      requestCount: 0,
      tokensUsed: 0,
      costUSD: 0,
      modelUsage: {},
      avgResponseTime: 0,
      errorRate: 0,
    };
  }

  async getUsageHistory(userId: string, days: number = 30): Promise<AIUsageMetrics[]> {
    const userMetrics = this.usageMetrics.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return userMetrics.filter(m => new Date(m.date) >= cutoffDate);
  }

  async getCostEstimate(model: AIModel, inputTokens: number, outputTokens: number): Promise<number> {
    const modelCost = this.modelCosts.get(model);
    if (!modelCost) {
      return 0;
    }
    
    const inputCost = (inputTokens / 1000) * modelCost.inputCostPer1000Tokens;
    const outputCost = (outputTokens / 1000) * modelCost.outputCostPer1000Tokens;
    
    return inputCost + outputCost;
  }

  private evaluateRuleConditions(conditions: PolicyCondition[], context: any): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];
      return this.evaluateCondition(condition, contextValue);
    });
  }

  private evaluateCondition(condition: PolicyCondition, contextValue: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'greater_than':
        return Number(contextValue) > Number(condition.value);
      case 'less_than':
        return Number(contextValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      case 'between':
        return Array.isArray(condition.value) && 
               Number(contextValue) >= Number(condition.value[0]) && 
               Number(contextValue) <= Number(condition.value[1]);
      default:
        return false;
    }
  }

  private executeRuleAction(rule: PolicyRule, requestedModel: AIModel, estimatedTokens: number): PolicyDecision {
    switch (rule.action) {
      case PolicyAction.DENY:
        return {
          action: PolicyAction.DENY,
          reason: rule.description,
          ruleId: rule.id,
        };
      
      case PolicyAction.THROTTLE:
        return {
          action: PolicyAction.THROTTLE,
          reason: rule.description,
          ruleId: rule.id,
          delay: rule.actionParams?.delaySeconds || 60,
        };
      
      case PolicyAction.DOWNGRADE:
        return {
          action: PolicyAction.DOWNGRADE,
          reason: rule.description,
          ruleId: rule.id,
          alternativeModel: rule.actionParams?.alternativeModel || AIModel.GPT_3_5_TURBO,
        };
      
      default:
        return {
          action: PolicyAction.ALLOW,
          reason: 'Default allow',
        };
    }
  }

  private findBestAlternativeModel(requestedModel: AIModel, allowedModels: AIModel[]): AIModel {
    // Model preference order for alternatives
    const modelTiers = {
      [AIModel.GPT_4_TURBO]: [AIModel.GPT_4, AIModel.GPT_3_5_TURBO],
      [AIModel.GPT_4]: [AIModel.GPT_3_5_TURBO],
      [AIModel.CLAUDE_3_OPUS]: [AIModel.CLAUDE_3_SONNET, AIModel.CLAUDE_3_HAIKU],
      [AIModel.CLAUDE_3_SONNET]: [AIModel.CLAUDE_3_HAIKU],
    };

    const alternatives = modelTiers[requestedModel] || [AIModel.GPT_3_5_TURBO];
    
    for (const alternative of alternatives) {
      if (allowedModels.includes(alternative)) {
        return alternative;
      }
    }
    
    // Return the first allowed model as fallback
    return allowedModels[0] || AIModel.GPT_3_5_TURBO;
  }

  private async updateUserQuotaUsage(userId: string, aiRequest: AIRequest): Promise<void> {
    const quota = await this.getUserQuota(userId);
    quota.dailyRequests += 1;
    quota.monthlyRequests += 1;
    this.userQuotas.set(userId, quota);
  }

  private async recordUsageMetrics(aiRequest: AIRequest): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const userMetrics = this.usageMetrics.get(aiRequest.userId) || [];
    
    let todayMetrics = userMetrics.find(m => m.date === today);
    if (!todayMetrics) {
      todayMetrics = {
        userId: aiRequest.userId,
        date: today,
        requestCount: 0,
        tokensUsed: 0,
        costUSD: 0,
        modelUsage: {},
        avgResponseTime: 0,
        errorRate: 0,
      };
      userMetrics.push(todayMetrics);
    }
    
    // Update metrics
    todayMetrics.requestCount += 1;
    todayMetrics.tokensUsed += aiRequest.totalTokens;
    todayMetrics.costUSD += aiRequest.costUSD;
    
    // Update model-specific usage
    if (!todayMetrics.modelUsage[aiRequest.model]) {
      todayMetrics.modelUsage[aiRequest.model] = { requests: 0, tokens: 0, cost: 0 };
    }
    todayMetrics.modelUsage[aiRequest.model].requests += 1;
    todayMetrics.modelUsage[aiRequest.model].tokens += aiRequest.totalTokens;
    todayMetrics.modelUsage[aiRequest.model].cost += aiRequest.costUSD;
    
    // Update averages
    todayMetrics.avgResponseTime = (todayMetrics.avgResponseTime * (todayMetrics.requestCount - 1) + aiRequest.responseTime) / todayMetrics.requestCount;
    
    // Update error rate
    const errorRequests = userMetrics.reduce((sum, m) => sum + (m.errorRate * m.requestCount), 0);
    const totalRequests = userMetrics.reduce((sum, m) => sum + m.requestCount, 0);
    todayMetrics.errorRate = aiRequest.status === 'error' ? (errorRequests + 1) / totalRequests : errorRequests / totalRequests;
    
    this.usageMetrics.set(aiRequest.userId, userMetrics);
  }

  private async checkCostOptimizationTriggers(): Promise<void> {
    // This would check global cost metrics and trigger optimization rules
    // For demo purposes, we'll just log that we're checking
    this.logger.debug('Checking cost optimization triggers');
  }

  private async getMonthlyRequestCount(userId: string): Promise<number> {
    const quota = await this.getUserQuota(userId);
    return quota.monthlyRequests;
  }

  private async getMonthlyTokenCount(userId: string): Promise<number> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const userMetrics = this.usageMetrics.get(userId) || [];
    
    return userMetrics
      .filter(m => m.date.startsWith(currentMonth))
      .reduce((sum, m) => sum + m.tokensUsed, 0);
  }

  private getNextDayReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private getNextMonthReset(): Date {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }
}