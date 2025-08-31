export enum FeatureFlagType {
  BOOLEAN = 'boolean',
  STRING = 'string',
  NUMBER = 'number',
  JSON = 'json',
}

export enum FeatureFlagStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  defaultValue: any;
  status: FeatureFlagStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  environments: Record<string, EnvironmentConfig>;
}

export interface EnvironmentConfig {
  enabled: boolean;
  value: any;
  rolloutPercentage: number;
  userSegments?: string[];
  rules?: FeatureFlagRule[];
  lastUpdated: Date;
  updatedBy: string;
}

export interface FeatureFlagRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  value: any;
  enabled: boolean;
  priority: number; // Higher priority rules are evaluated first
}

export interface RuleCondition {
  attribute: string; // e.g., 'userId', 'userTier', 'country', 'version'
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
}

export interface UserContext {
  userId?: string;
  userTier?: string;
  country?: string;
  appVersion?: string;
  platform?: string;
  customAttributes?: Record<string, any>;
}

export interface FeatureFlagEvaluation {
  flagId: string;
  userId?: string;
  value: any;
  reason: string;
  ruleId?: string;
  timestamp: Date;
}

export interface A_B_Test {
  id: string;
  name: string;
  description: string;
  flagId: string;
  variants: A_B_Variant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  targetMetrics: string[];
  createdBy: string;
}

export interface A_B_Variant {
  id: string;
  name: string;
  value: any;
  trafficPercentage: number; // 0-100
  description: string;
}

export interface HotReloadConfig {
  refreshInterval: number; // milliseconds
  webhookUrl?: string;
  cacheTimeout: number; // seconds
  enableMetrics: boolean;
}