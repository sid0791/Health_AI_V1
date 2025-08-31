export enum EventType {
  // User actions
  USER_SIGNUP = 'user_signup',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PROFILE_UPDATED = 'profile_updated',
  
  // Health tracking
  HEALTH_REPORT_UPLOADED = 'health_report_uploaded',
  BIOMARKER_LOGGED = 'biomarker_logged',
  WEIGHT_LOGGED = 'weight_logged',
  BLOOD_PRESSURE_LOGGED = 'blood_pressure_logged',
  
  // Meal planning
  MEAL_PLAN_GENERATED = 'meal_plan_generated',
  MEAL_PLAN_VIEWED = 'meal_plan_viewed',
  MEAL_LOGGED = 'meal_logged',
  FOOD_SEARCHED = 'food_searched',
  RECIPE_VIEWED = 'recipe_viewed',
  
  // Fitness
  WORKOUT_PLAN_GENERATED = 'workout_plan_generated',
  WORKOUT_STARTED = 'workout_started',
  WORKOUT_COMPLETED = 'workout_completed',
  EXERCISE_LOGGED = 'exercise_logged',
  
  // AI interactions
  AI_CHAT_MESSAGE = 'ai_chat_message',
  AI_RECOMMENDATION_VIEWED = 'ai_recommendation_viewed',
  AI_SUGGESTION_ACCEPTED = 'ai_suggestion_accepted',
  AI_SUGGESTION_REJECTED = 'ai_suggestion_rejected',
  
  // Notifications
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_OPENED = 'notification_opened',
  NOTIFICATION_DISMISSED = 'notification_dismissed',
  
  // App usage
  APP_OPENED = 'app_opened',
  SCREEN_VIEWED = 'screen_viewed',
  FEATURE_USED = 'feature_used',
  ERROR_OCCURRED = 'error_occurred',
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: EventType;
  timestamp: Date;
  properties: Record<string, any>;
  metadata: {
    platform: 'web' | 'android' | 'ios';
    appVersion: string;
    userAgent?: string;
    ip?: string;
    country?: string;
    timezone?: string;
  };
  context: {
    screen?: string;
    previousScreen?: string;
    userTier?: string;
    experimentVariants?: Record<string, string>;
  };
}

export interface UserBehaviorMetrics {
  userId: string;
  date: string;
  sessionCount: number;
  totalSessionDuration: number; // seconds
  screenViews: Record<string, number>;
  featuresUsed: string[];
  eventsCount: Record<EventType, number>;
  conversionFunnels: Record<string, number>;
  retentionCohort?: string;
}

export interface HealthMetrics {
  userId: string;
  date: string;
  biomarkers: {
    weight?: { value: number; unit: string; trend: 'up' | 'down' | 'stable' };
    bloodPressure?: { systolic: number; diastolic: number; trend: 'up' | 'down' | 'stable' };
    bloodSugar?: { value: number; unit: string; type: 'fasting' | 'postMeal'; trend: 'up' | 'down' | 'stable' };
    heartRate?: { value: number; type: 'resting' | 'active'; trend: 'up' | 'down' | 'stable' };
  };
  adherence: {
    mealPlan: number; // 0-1
    workoutPlan: number; // 0-1
    medicationReminders: number; // 0-1
  };
  goals: {
    weightGoal?: { target: number; current: number; progress: number };
    fitnessGoal?: { target: string; progress: number };
    nutritionGoal?: { target: string; progress: number };
  };
  risks: {
    bloodPressureRisk: 'low' | 'moderate' | 'high' | 'critical';
    diabetesRisk: 'low' | 'moderate' | 'high';
    cardiovascularRisk: 'low' | 'moderate' | 'high';
  };
}

export interface PerformanceMetrics {
  timestamp: Date;
  service: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
  throughput: number; // requests per second
}

export interface BusinessMetrics {
  date: string;
  metrics: {
    // User metrics
    totalUsers: number;
    activeUsers: number;
    newSignups: number;
    churned: number;
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
    
    // Engagement metrics
    avgSessionDuration: number;
    avgSessionsPerUser: number;
    featuresAdoption: Record<string, number>;
    
    // Health outcomes
    avgWeightLoss: number;
    avgAdherence: number;
    healthGoalsAchieved: number;
    
    // AI usage
    aiInteractions: number;
    aiCosts: number;
    modelUsage: Record<string, number>;
    
    // Revenue metrics (if applicable)
    revenue?: number;
    avgRevenuePerUser?: number;
    conversionRate?: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    metric: string;
    operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
    threshold: number;
    timeWindow: number; // minutes
  };
  channels: ('email' | 'slack' | 'webhook')[];
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastTriggered?: Date;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  filters: Record<string, any>;
  refreshInterval: number; // seconds
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alert';
  title: string;
  query: string;
  visualization: {
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    timeRange?: string;
    groupBy?: string[];
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  position: { x: number; y: number; width: number; height: number };
}

export interface Cohort {
  id: string;
  name: string;
  definition: {
    createdAfter?: Date;
    createdBefore?: Date;
    userTier?: string[];
    country?: string[];
    platform?: string[];
    customFilter?: Record<string, any>;
  };
  size: number;
  createdAt: Date;
}