export enum UserTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum AIModel {
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo-preview',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  GEMINI_PRO = 'gemini-pro',
}

export enum PolicyAction {
  ALLOW = 'allow',
  DENY = 'deny',
  THROTTLE = 'throttle',
  DOWNGRADE = 'downgrade',
  QUEUE = 'queue',
}

export interface UserQuota {
  userId: string;
  tier: UserTier;
  dailyRequests: number;
  monthlyRequests: number;
  maxTokensPerRequest: number;
  maxTokensPerDay: number;
  maxTokensPerMonth: number;
  priorityQueueAccess: boolean;
  allowedModels: AIModel[];
  rateLimitPerMinute: number;
  resetDaily: Date;
  resetMonthly: Date;
}

export interface AIUsageMetrics {
  userId: string;
  date: string;
  requestCount: number;
  tokensUsed: number;
  costUSD: number;
  modelUsage: Record<AIModel, { requests: number; tokens: number; cost: number }>;
  avgResponseTime: number;
  errorRate: number;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: PolicyCondition[];
  action: PolicyAction;
  actionParams?: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCondition {
  field: 'userTier' | 'requestsToday' | 'requestsThisMonth' | 'tokensToday' | 'tokensThisMonth' | 'errorRate' | 'timeOfDay' | 'modelType' | 'contentType';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: any;
  threshold?: number;
}

export interface AIRequest {
  id: string;
  userId: string;
  userTier: UserTier;
  model: AIModel;
  contentType: 'meal_planning' | 'health_analysis' | 'fitness_planning' | 'chat' | 'educational';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  responseTime: number;
  status: 'success' | 'error' | 'throttled' | 'denied';
  timestamp: Date;
  errorMessage?: string;
}

export interface ModelCostConfig {
  model: AIModel;
  inputCostPer1000Tokens: number;
  outputCostPer1000Tokens: number;
  provider: string;
  maxTokens: number;
  tier: 'economy' | 'standard' | 'premium';
}

export interface CostOptimizationRule {
  id: string;
  name: string;
  description: string;
  triggers: {
    dailyCostThreshold?: number;
    monthlyCostThreshold?: number;
    errorRateThreshold?: number;
    responseTimeThreshold?: number;
  };
  actions: {
    switchToModel?: AIModel;
    enableCaching?: boolean;
    reduceMaxTokens?: number;
    throttleRequests?: boolean;
  };
  enabled: boolean;
}

export interface TierConfiguration {
  tier: UserTier;
  displayName: string;
  description: string;
  limits: {
    dailyRequests: number;
    monthlyRequests: number;
    maxTokensPerRequest: number;
    maxTokensPerDay: number;
    maxTokensPerMonth: number;
    rateLimitPerMinute: number;
  };
  features: {
    priorityQueue: boolean;
    advancedModels: boolean;
    customPersonalization: boolean;
    exportData: boolean;
    apiAccess: boolean;
  };
  allowedModels: AIModel[];
  costLimits: {
    dailyCostUSD: number;
    monthlyCostUSD: number;
  };
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface PolicyDecision {
  action: PolicyAction;
  reason: string;
  ruleId?: string;
  alternativeModel?: AIModel;
  delay?: number;
  retryAfter?: Date;
  costImpact?: number;
}