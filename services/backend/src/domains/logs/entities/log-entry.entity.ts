import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Forward declaration for CreateLogEntryDto to avoid circular dependency
interface CreateLogEntryDto {
  userId?: string;
  logType: LogType;
  source: LogSource;
  category: LogCategory;
  severity?: LogSeverity;
  message: string;
  data?: Record<string, any>;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  platform?: string;
  appVersion?: string;
  countryCode?: string;
  timezone?: string;
  resourceType?: string;
  resourceId?: string;
  durationMs?: number;
  memoryUsageMb?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export enum LogType {
  // Meal/Food logging
  MEAL_LOGGED = 'meal_logged',
  MEAL_UPDATED = 'meal_updated',
  MEAL_DELETED = 'meal_deleted',
  FOOD_SEARCH = 'food_search',
  CUSTOM_FOOD_ADDED = 'custom_food_added',

  // Weight and measurements
  WEIGHT_LOGGED = 'weight_logged',
  WEIGHT = 'weight', // Alias for compatibility
  MEASUREMENT_LOGGED = 'measurement_logged',
  BODY_COMPOSITION_LOGGED = 'body_composition_logged',

  // Fitness/Exercise logging
  WORKOUT_STARTED = 'workout_started',
  WORKOUT_COMPLETED = 'workout_completed',
  WORKOUT_SKIPPED = 'workout_skipped',
  EXERCISE_COMPLETED = 'exercise_completed',
  EXERCISE_SKIPPED = 'exercise_skipped',
  EXERCISE = 'exercise', // Alias for compatibility
  REST_DAY_LOGGED = 'rest_day_logged',

  // Health data logging
  HEALTH_METRIC_LOGGED = 'health_metric_logged',
  SYMPTOM_LOGGED = 'symptom_logged',
  MEDICATION_LOGGED = 'medication_logged',
  SLEEP_LOGGED = 'sleep_logged',
  SLEEP = 'sleep', // Alias for compatibility
  MOOD_LOGGED = 'mood_logged',

  // AI interactions
  AI_CHAT_MESSAGE = 'ai_chat_message',
  AI_RECOMMENDATION_VIEWED = 'ai_recommendation_viewed',
  AI_RECOMMENDATION_ACCEPTED = 'ai_recommendation_accepted',
  AI_RECOMMENDATION_REJECTED = 'ai_recommendation_rejected',

  // Plan interactions
  MEAL_PLAN_GENERATED = 'meal_plan_generated',
  MEAL_PLAN_MODIFIED = 'meal_plan_modified',
  FITNESS_PLAN_GENERATED = 'fitness_plan_generated',
  FITNESS_PLAN_MODIFIED = 'fitness_plan_modified',
  PLAN_ADHERENCE_CHECKED = 'plan_adherence_checked',

  // Integration events
  HEALTH_DATA_SYNCED = 'health_data_synced',
  WEARABLE_CONNECTED = 'wearable_connected',
  WEARABLE_DISCONNECTED = 'wearable_disconnected',

  // Analytics events
  GOAL_PROGRESS_CALCULATED = 'goal_progress_calculated',
  WEEKLY_SUMMARY_GENERATED = 'weekly_summary_generated',
  MONTHLY_REPORT_GENERATED = 'monthly_report_generated',

  // User behavior
  SCREEN_VIEWED = 'screen_viewed',
  FEATURE_USED = 'feature_used',
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_CLICKED = 'notification_clicked',

  // Error and system events
  ERROR_OCCURRED = 'error_occurred',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  DATA_BACKUP = 'data_backup',
  DATA_EXPORT = 'data_export',
}

export enum LogSource {
  // Client sources
  MOBILE_APP = 'mobile_app',
  WEB_APP = 'web_app',
  API_DIRECT = 'api_direct',

  // Integration sources
  HEALTH_KIT = 'health_kit',
  GOOGLE_FIT = 'google_fit',
  FITBIT = 'fitbit',
  APPLE_WATCH = 'apple_watch',
  GARMIN = 'garmin',
  APP_TRACKING = 'app_tracking', // For app-based tracking

  // AI/System sources
  AI_SYSTEM = 'ai_system',
  BACKEND_SYSTEM = 'backend_system',
  NOTIFICATION_SYSTEM = 'notification_system',
  ANALYTICS_SYSTEM = 'analytics_system',

  // External sources
  WEATHER_SERVICE = 'weather_service',
  AQI_SERVICE = 'aqi_service',
  NUTRITION_DB = 'nutrition_db',

  // Manual/Admin sources
  MANUAL_ENTRY = 'manual_entry',
  ADMIN_PANEL = 'admin_panel',
  SUPPORT_TEAM = 'support_team',
}

export enum LogCategory {
  NUTRITION = 'nutrition',
  FITNESS = 'fitness',
  HEALTH = 'health',
  AI_INTERACTION = 'ai_interaction',
  USER_BEHAVIOR = 'user_behavior',
  INTEGRATION = 'integration',
  SYSTEM = 'system',
  ANALYTICS = 'analytics',
}

export enum LogSeverity {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

@Entity('log_entries')
@Index(['userId', 'logType'])
@Index(['logType', 'category'])
@Index(['source', 'logType'])
@Index(['createdAt'])
@Index(['severity'])
export class LogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: LogType,
    name: 'log_type',
  })
  logType: LogType;

  @Column({
    type: 'enum',
    enum: LogSource,
    name: 'source',
  })
  source: LogSource;

  @Column({
    type: 'enum',
    enum: LogCategory,
    name: 'category',
  })
  category: LogCategory;

  @Column({
    type: 'enum',
    enum: LogSeverity,
    name: 'severity',
    default: LogSeverity.INFO,
  })
  severity: LogSeverity;

  @Column({ length: 1000 })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  // Compatibility alias for metadata
  get metadata(): Record<string, any> | undefined {
    return this.data;
  }

  // Context information
  @Column({ name: 'session_id', length: 100, nullable: true })
  sessionId?: string;

  @Column({ name: 'request_id', length: 100, nullable: true })
  requestId?: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string;

  // Device/platform information
  @Column({ name: 'device_type', length: 50, nullable: true })
  deviceType?: string;

  @Column({ name: 'platform', length: 50, nullable: true })
  platform?: string;

  @Column({ name: 'app_version', length: 20, nullable: true })
  appVersion?: string;

  // Location context (for privacy-conscious tracking)
  @Column({ name: 'country_code', length: 3, nullable: true })
  countryCode?: string;

  @Column({ name: 'timezone', length: 50, nullable: true })
  timezone?: string;

  // Resource references
  @Column({ name: 'resource_type', length: 100, nullable: true })
  resourceType?: string;

  @Column({ name: 'resource_id', length: 100, nullable: true })
  resourceId?: string;

  // Performance metrics
  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs?: number;

  @Column({ name: 'memory_usage_mb', type: 'decimal', precision: 10, scale: 2, nullable: true })
  memoryUsageMb?: number;

  // Data classification and retention
  @Column({ name: 'data_classification', default: 'LOG' })
  dataClassification: string;

  @Column({ name: 'retention_days', type: 'integer', default: 90 })
  retentionDays: number;

  // Success/error tracking
  @Column({ default: true })
  success: boolean;

  @Column({ name: 'error_code', length: 50, nullable: true })
  errorCode?: string;

  @Column({ name: 'error_message', length: 1000, nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Compatibility alias for loggedAt
  get loggedAt(): Date {
    return this.createdAt;
  }

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Static factory methods for common log types
  static createMealLog(
    userId: string,
    logType: LogType,
    message: string,
    mealData: Record<string, any>,
    source: LogSource = LogSource.MOBILE_APP,
  ): CreateLogEntryDto {
    return {
      userId,
      logType,
      source,
      category: LogCategory.NUTRITION,
      message,
      data: mealData,
      severity: LogSeverity.INFO,
      success: true,
    };
  }

  static createWorkoutLog(
    userId: string,
    logType: LogType,
    message: string,
    workoutData: Record<string, any>,
    source: LogSource = LogSource.MOBILE_APP,
  ): CreateLogEntryDto {
    return {
      userId,
      logType,
      source,
      category: LogCategory.FITNESS,
      message,
      data: workoutData,
      severity: LogSeverity.INFO,
      success: true,
    };
  }

  static createHealthLog(
    userId: string,
    logType: LogType,
    message: string,
    healthData: Record<string, any>,
    source: LogSource = LogSource.MOBILE_APP,
  ): CreateLogEntryDto {
    return {
      userId,
      logType,
      source,
      category: LogCategory.HEALTH,
      message,
      data: healthData,
      severity: LogSeverity.INFO,
      success: true,
    };
  }

  static createAIInteractionLog(
    userId: string,
    logType: LogType,
    message: string,
    interactionData: Record<string, any>,
    source: LogSource = LogSource.AI_SYSTEM,
  ): CreateLogEntryDto {
    return {
      userId,
      logType,
      source,
      category: LogCategory.AI_INTERACTION,
      message,
      data: interactionData,
      severity: LogSeverity.INFO,
      success: true,
    };
  }

  static createSystemLog(
    logType: LogType,
    message: string,
    systemData: Record<string, any> = {},
    severity: LogSeverity = LogSeverity.INFO,
    source: LogSource = LogSource.BACKEND_SYSTEM,
  ): CreateLogEntryDto {
    return {
      logType,
      source,
      category: LogCategory.SYSTEM,
      message,
      data: systemData,
      severity,
      success: true,
    };
  }

  static createErrorLog(
    logType: LogType,
    message: string,
    errorData: Record<string, any>,
    errorCode?: string,
    errorMessage?: string,
    userId?: string,
    source: LogSource = LogSource.BACKEND_SYSTEM,
  ): CreateLogEntryDto {
    return {
      userId,
      logType,
      source,
      category: LogCategory.SYSTEM,
      message,
      data: errorData,
      severity: LogSeverity.ERROR,
      success: false,
      errorCode,
      errorMessage,
    };
  }
}
