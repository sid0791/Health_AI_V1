import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  FeatureFlag,
  FeatureFlagType,
  FeatureFlagStatus,
  EnvironmentConfig,
  UserContext,
  FeatureFlagEvaluation,
  FeatureFlagRule,
  RuleCondition,
  A_B_Test,
  A_B_Variant,
  HotReloadConfig,
} from './types';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flags = new Map<string, FeatureFlag>();
  private evaluationCache = new Map<string, FeatureFlagEvaluation>();
  private abTests = new Map<string, A_B_Test>();
  private hotReloadConfig: HotReloadConfig;
  private refreshTimer?: NodeJS.Timeout;
  private currentEnvironment: string;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.currentEnvironment = this.configService.get('NODE_ENV', 'development');
    this.hotReloadConfig = {
      refreshInterval: this.configService.get('FEATURE_FLAGS_REFRESH_INTERVAL', 30000),
      cacheTimeout: this.configService.get('FEATURE_FLAGS_CACHE_TIMEOUT', 300),
      enableMetrics: this.configService.get('FEATURE_FLAGS_ENABLE_METRICS', true),
    };
  }

  async onModuleInit() {
    await this.initializeDefaultFlags();
    this.startHotReload();
    this.logger.log('Feature flags service initialized');
  }

  private async initializeDefaultFlags(): Promise<void> {
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'ai_coaching_v2',
        name: 'AI Coaching V2',
        description: 'Enable the new AI coaching engine with enhanced personalization',
        type: FeatureFlagType.BOOLEAN,
        defaultValue: false,
        status: FeatureFlagStatus.ACTIVE,
        tags: ['ai', 'coaching', 'v2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        environments: {
          development: {
            enabled: true,
            value: true,
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          staging: {
            enabled: true,
            value: true,
            rolloutPercentage: 50,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          production: {
            enabled: true,
            value: false,
            rolloutPercentage: 10,
            userSegments: ['premium'],
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
        },
      },
      {
        id: 'hinglish_support',
        name: 'Hinglish Language Support',
        description: 'Enable Hinglish (Hindi-English) language support in food logging',
        type: FeatureFlagType.BOOLEAN,
        defaultValue: true,
        status: FeatureFlagStatus.ACTIVE,
        tags: ['i18n', 'hinglish', 'food-logging'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        environments: {
          development: {
            enabled: true,
            value: true,
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          staging: {
            enabled: true,
            value: true,
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          production: {
            enabled: true,
            value: true,
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
        },
      },
      {
        id: 'physician_alerts_threshold',
        name: 'Physician Alert Threshold',
        description: 'Threshold values for triggering physician alerts',
        type: FeatureFlagType.JSON,
        defaultValue: {
          bloodPressure: { systolic: 140, diastolic: 90 },
          bloodSugar: { fasting: 126, postMeal: 200 },
          heartRate: { resting: { min: 50, max: 100 } },
        },
        status: FeatureFlagStatus.ACTIVE,
        tags: ['health', 'alerts', 'physician'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        environments: {
          development: {
            enabled: true,
            value: {
              bloodPressure: { systolic: 130, diastolic: 85 }, // Lower thresholds for testing
              bloodSugar: { fasting: 110, postMeal: 180 },
              heartRate: { resting: { min: 45, max: 105 } },
            },
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          staging: {
            enabled: true,
            value: {
              bloodPressure: { systolic: 140, diastolic: 90 },
              bloodSugar: { fasting: 126, postMeal: 200 },
              heartRate: { resting: { min: 50, max: 100 } },
            },
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          production: {
            enabled: true,
            value: {
              bloodPressure: { systolic: 140, diastolic: 90 },
              bloodSugar: { fasting: 126, postMeal: 200 },
              heartRate: { resting: { min: 50, max: 100 } },
            },
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
        },
      },
      {
        id: 'meal_plan_ai_model',
        name: 'Meal Plan AI Model',
        description: 'AI model to use for meal plan generation',
        type: FeatureFlagType.STRING,
        defaultValue: 'gpt-4',
        status: FeatureFlagStatus.ACTIVE,
        tags: ['ai', 'meal-planning', 'model'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        environments: {
          development: {
            enabled: true,
            value: 'gpt-3.5-turbo',
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          staging: {
            enabled: true,
            value: 'gpt-4',
            rolloutPercentage: 100,
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
          production: {
            enabled: true,
            value: 'gpt-4',
            rolloutPercentage: 80,
            rules: [
              {
                id: 'premium_users_gpt4',
                name: 'Premium Users get GPT-4',
                description: 'Premium tier users always get GPT-4',
                conditions: [
                  {
                    attribute: 'userTier',
                    operator: 'equals',
                    value: 'premium',
                  },
                ],
                value: 'gpt-4',
                enabled: true,
                priority: 1,
              },
              {
                id: 'cost_optimization',
                name: 'Cost Optimization for Free Users',
                description: 'Free users get GPT-3.5 during peak hours',
                conditions: [
                  {
                    attribute: 'userTier',
                    operator: 'equals',
                    value: 'free',
                  },
                ],
                value: 'gpt-3.5-turbo',
                enabled: true,
                priority: 2,
              },
            ],
            lastUpdated: new Date(),
            updatedBy: 'system',
          },
        },
      },
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });

    this.logger.log(`Initialized ${defaultFlags.length} default feature flags`);
  }

  async evaluateFlag(
    flagId: string,
    userContext: UserContext = {},
    defaultValue?: any,
  ): Promise<any> {
    const cacheKey = this.getCacheKey(flagId, userContext);
    
    // Check cache first
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.value;
    }

    const flag = this.flags.get(flagId);
    if (!flag) {
      this.logger.warn(`Feature flag not found: ${flagId}`);
      return defaultValue ?? false;
    }

    if (flag.status !== FeatureFlagStatus.ACTIVE) {
      return flag.defaultValue;
    }

    const envConfig = flag.environments[this.currentEnvironment];
    if (!envConfig || !envConfig.enabled) {
      return flag.defaultValue;
    }

    // Evaluate rules first (higher priority)
    if (envConfig.rules) {
      const ruleResult = this.evaluateRules(envConfig.rules, userContext);
      if (ruleResult) {
        const evaluation: FeatureFlagEvaluation = {
          flagId,
          userId: userContext.userId,
          value: ruleResult.value,
          reason: `Rule: ${ruleResult.rule.name}`,
          ruleId: ruleResult.rule.id,
          timestamp: new Date(),
        };
        
        this.cacheEvaluation(cacheKey, evaluation);
        this.emitEvaluationEvent(evaluation);
        return ruleResult.value;
      }
    }

    // Check rollout percentage
    const shouldRollout = this.shouldRolloutToUser(
      flagId,
      userContext.userId || 'anonymous',
      envConfig.rolloutPercentage,
    );

    if (!shouldRollout) {
      const evaluation: FeatureFlagEvaluation = {
        flagId,
        userId: userContext.userId,
        value: flag.defaultValue,
        reason: 'Not in rollout percentage',
        timestamp: new Date(),
      };
      
      this.cacheEvaluation(cacheKey, evaluation);
      this.emitEvaluationEvent(evaluation);
      return flag.defaultValue;
    }

    // Check user segments
    if (envConfig.userSegments && userContext.userTier) {
      if (!envConfig.userSegments.includes(userContext.userTier)) {
        const evaluation: FeatureFlagEvaluation = {
          flagId,
          userId: userContext.userId,
          value: flag.defaultValue,
          reason: 'User not in target segments',
          timestamp: new Date(),
        };
        
        this.cacheEvaluation(cacheKey, evaluation);
        this.emitEvaluationEvent(evaluation);
        return flag.defaultValue;
      }
    }

    const evaluation: FeatureFlagEvaluation = {
      flagId,
      userId: userContext.userId,
      value: envConfig.value,
      reason: 'Environment configuration',
      timestamp: new Date(),
    };
    
    this.cacheEvaluation(cacheKey, evaluation);
    this.emitEvaluationEvent(evaluation);
    return envConfig.value;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async getFlag(flagId: string): Promise<FeatureFlag | null> {
    return this.flags.get(flagId) || null;
  }

  async createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.flags.set(flag.id, newFlag);
    this.logger.log(`Created feature flag: ${flag.id}`);
    
    this.eventEmitter.emit('feature-flag.created', newFlag);
    return newFlag;
  }

  async updateFlag(flagId: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return null;
    }

    const updatedFlag: FeatureFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.flags.set(flagId, updatedFlag);
    this.clearFlagCache(flagId);
    this.logger.log(`Updated feature flag: ${flagId}`);
    
    this.eventEmitter.emit('feature-flag.updated', updatedFlag);
    return updatedFlag;
  }

  async deleteFlag(flagId: string): Promise<boolean> {
    const deleted = this.flags.delete(flagId);
    if (deleted) {
      this.clearFlagCache(flagId);
      this.logger.log(`Deleted feature flag: ${flagId}`);
      this.eventEmitter.emit('feature-flag.deleted', { flagId });
    }
    return deleted;
  }

  async refreshFlags(): Promise<void> {
    // In production, this would fetch from a remote source (database, config service, etc.)
    this.logger.debug('Refreshing feature flags from remote source');
    this.clearCache();
    this.eventEmitter.emit('feature-flags.refreshed');
  }

  private evaluateRules(
    rules: FeatureFlagRule[],
    userContext: UserContext,
  ): { value: any; rule: FeatureFlagRule } | null {
    const sortedRules = rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRuleConditions(rule.conditions, userContext)) {
        return { value: rule.value, rule };
      }
    }

    return null;
  }

  private evaluateRuleConditions(conditions: RuleCondition[], userContext: UserContext): boolean {
    return conditions.every(condition => {
      const contextValue = this.getContextValue(condition.attribute, userContext);
      return this.evaluateCondition(condition, contextValue);
    });
  }

  private getContextValue(attribute: string, userContext: UserContext): any {
    switch (attribute) {
      case 'userId':
        return userContext.userId;
      case 'userTier':
        return userContext.userTier;
      case 'country':
        return userContext.country;
      case 'appVersion':
        return userContext.appVersion;
      case 'platform':
        return userContext.platform;
      default:
        return userContext.customAttributes?.[attribute];
    }
  }

  private evaluateCondition(condition: RuleCondition, contextValue: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      case 'greater_than':
        return Number(contextValue) > Number(condition.value);
      case 'less_than':
        return Number(contextValue) < Number(condition.value);
      case 'contains':
        return String(contextValue).includes(String(condition.value));
      case 'regex':
        return new RegExp(condition.value).test(String(contextValue));
      default:
        return false;
    }
  }

  private shouldRolloutToUser(flagId: string, userId: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Consistent hash-based rollout
    const hash = this.hashString(`${flagId}:${userId}`);
    return (hash % 100) < percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getCacheKey(flagId: string, userContext: UserContext): string {
    const contextKey = [
      userContext.userId || 'anonymous',
      userContext.userTier || 'none',
      userContext.country || 'none',
      userContext.appVersion || 'none',
    ].join(':');
    return `${flagId}:${contextKey}`;
  }

  private isCacheValid(evaluation: FeatureFlagEvaluation): boolean {
    const ageInSeconds = (Date.now() - evaluation.timestamp.getTime()) / 1000;
    return ageInSeconds < this.hotReloadConfig.cacheTimeout;
  }

  private cacheEvaluation(cacheKey: string, evaluation: FeatureFlagEvaluation): void {
    this.evaluationCache.set(cacheKey, evaluation);
  }

  private clearCache(): void {
    this.evaluationCache.clear();
  }

  private clearFlagCache(flagId: string): void {
    for (const [key, evaluation] of this.evaluationCache.entries()) {
      if (evaluation.flagId === flagId) {
        this.evaluationCache.delete(key);
      }
    }
  }

  private emitEvaluationEvent(evaluation: FeatureFlagEvaluation): void {
    if (this.hotReloadConfig.enableMetrics) {
      this.eventEmitter.emit('feature-flag.evaluated', evaluation);
    }
  }

  private startHotReload(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshFlags();
      } catch (error) {
        this.logger.error('Failed to refresh feature flags:', error);
      }
    }, this.hotReloadConfig.refreshInterval);

    this.logger.log(`Hot reload enabled with ${this.hotReloadConfig.refreshInterval}ms interval`);
  }

  async onModuleDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}