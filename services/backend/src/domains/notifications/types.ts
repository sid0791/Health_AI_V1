export enum NotificationType {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationCategory {
  HEALTH_ALERT = 'health_alert',
  MEAL_REMINDER = 'meal_reminder',
  WORKOUT_REMINDER = 'workout_reminder',
  REPORT_READY = 'report_ready',
  GOAL_ACHIEVEMENT = 'goal_achievement',
  WEEKLY_SUMMARY = 'weekly_summary',
  EDUCATIONAL = 'educational',
  SYSTEM = 'system',
}

export interface NotificationTemplate {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: Record<string, string>; // Localized titles
  body: Record<string, string>; // Localized body text
  actionText?: Record<string, string>; // Localized action button text
  deepLink?: string;
  imageUrl?: string;
  priority: NotificationPriority;
}

export interface NotificationPayload {
  userId: string;
  templateId: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionText?: string;
  deepLink?: string;
  imageUrl?: string;
  scheduledAt?: Date;
  expiresAt?: Date;
  locale?: string;
}

export interface NotificationDeliveryStatus {
  id: string;
  userId: string;
  type: NotificationType;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export interface UserNotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
  timezone: string;
  categories: Record<NotificationCategory, boolean>;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  templateId: string;
  payload: NotificationPayload;
  scheduledAt: Date;
  timezone: string;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[]; // 0-6, Sunday=0
    dayOfMonth?: number; // 1-31
    endDate?: Date;
  };
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}