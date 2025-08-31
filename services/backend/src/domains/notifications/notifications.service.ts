import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationPayload,
  NotificationTemplate,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  UserNotificationPreferences,
  ScheduledNotification,
  NotificationDeliveryStatus,
} from './types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  // In-memory stores for demo - replace with actual database
  private templates = new Map<string, NotificationTemplate>();
  private userPreferences = new Map<string, UserNotificationPreferences>();
  private scheduledNotifications = new Map<string, ScheduledNotification>();
  private deliveryStatuses = new Map<string, NotificationDeliveryStatus>();

  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'meal_reminder_breakfast',
        category: NotificationCategory.MEAL_REMINDER,
        type: NotificationType.PUSH,
        title: {
          en: 'Time for Breakfast! 🍳',
          hi: 'नाश्ते का समय! 🍳',
        },
        body: {
          en: 'Start your day with a healthy breakfast. Your meal plan is ready!',
          hi: 'अपने दिन की शुरुआत एक स्वस्थ नाश्ते के साथ करें। आपका भोजन योजना तैयार है!',
        },
        actionText: {
          en: 'View Meal Plan',
          hi: 'भोजन योजना देखें',
        },
        deepLink: '/meal-plan',
        priority: NotificationPriority.NORMAL,
      },
      {
        id: 'health_alert_bp_high',
        category: NotificationCategory.HEALTH_ALERT,
        type: NotificationType.PUSH,
        title: {
          en: '⚠️ High Blood Pressure Alert',
          hi: '⚠️ उच्च रक्तचाप चेतावनी',
        },
        body: {
          en: 'Your blood pressure reading is higher than normal. Please consult your physician.',
          hi: 'आपका रक्तचाप सामान्य से अधिक है। कृपया अपने चिकित्सक से सलाह लें।',
        },
        actionText: {
          en: 'Contact Physician',
          hi: 'चिकित्सक से संपर्क करें',
        },
        deepLink: '/health-alerts',
        priority: NotificationPriority.CRITICAL,
      },
      {
        id: 'workout_reminder',
        category: NotificationCategory.WORKOUT_REMINDER,
        type: NotificationType.PUSH,
        title: {
          en: 'Workout Time! 💪',
          hi: 'व्यायाम का समय! 💪',
        },
        body: {
          en: "Don't skip your workout today. Your fitness goals are waiting!",
          hi: 'आज अपना व्यायाम न छोड़ें। आपके फिटनेस लक्ष्य इंतजार कर रहे हैं!',
        },
        actionText: {
          en: 'Start Workout',
          hi: 'व्यायाम शुरू करें',
        },
        deepLink: '/fitness',
        priority: NotificationPriority.NORMAL,
      },
      {
        id: 'weekly_summary',
        category: NotificationCategory.WEEKLY_SUMMARY,
        type: NotificationType.EMAIL,
        title: {
          en: 'Your Weekly Health Summary 📊',
          hi: 'आपका साप्ताहिक स्वास्थ्य सारांश 📊',
        },
        body: {
          en: 'Check out your health progress this week and see personalized recommendations.',
          hi: 'इस सप्ताह अपनी स्वास्थ्य प्रगति देखें और व्यक्तिगत सिफारिशें प्राप्त करें।',
        },
        actionText: {
          en: 'View Summary',
          hi: 'सारांश देखें',
        },
        deepLink: '/analytics',
        priority: NotificationPriority.LOW,
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async sendNotification(payload: NotificationPayload): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check user preferences
    const preferences = await this.getUserPreferences(payload.userId);
    if (!this.shouldSendNotification(payload, preferences)) {
      this.logger.warn(`Notification blocked by user preferences: ${notificationId}`);
      return notificationId;
    }

    // Create delivery status record
    const deliveryStatus: NotificationDeliveryStatus = {
      id: notificationId,
      userId: payload.userId,
      type: payload.type,
      status: 'pending',
      retryCount: 0,
    };
    this.deliveryStatuses.set(notificationId, deliveryStatus);

    // Queue notification for delivery
    const jobOptions = {
      delay: payload.scheduledAt ? payload.scheduledAt.getTime() - Date.now() : 0,
      attempts: payload.priority === NotificationPriority.CRITICAL ? 5 : 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    await this.notificationsQueue.add('send-notification', {
      notificationId,
      payload,
    }, jobOptions);

    this.logger.log(`Notification queued: ${notificationId} for user ${payload.userId}`);
    return notificationId;
  }

  async sendFromTemplate(
    templateId: string,
    userId: string,
    data: Record<string, any> = {},
    locale: string = 'en',
    scheduledAt?: Date,
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const payload: NotificationPayload = {
      userId,
      templateId,
      type: template.type,
      priority: template.priority,
      category: template.category,
      title: this.interpolateString(template.title[locale] || template.title.en, data),
      body: this.interpolateString(template.body[locale] || template.body.en, data),
      actionText: template.actionText ? (template.actionText[locale] || template.actionText.en) : undefined,
      deepLink: template.deepLink,
      imageUrl: template.imageUrl,
      data,
      locale,
      scheduledAt,
    };

    return this.sendNotification(payload);
  }

  async scheduleRecurringNotification(
    templateId: string,
    userId: string,
    schedule: ScheduledNotification['recurring'],
    data: Record<string, any> = {},
    locale: string = 'en',
  ): Promise<string> {
    const scheduledId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const scheduledNotification: ScheduledNotification = {
      id: scheduledId,
      userId,
      templateId,
      payload: {
        userId,
        templateId,
        type: template.type,
        priority: template.priority,
        category: template.category,
        title: template.title[locale] || template.title.en,
        body: template.body[locale] || template.body.en,
        data,
        locale,
      },
      scheduledAt: new Date(),
      timezone: 'UTC', // Should be from user preferences
      recurring: schedule,
      status: 'active',
    };

    this.scheduledNotifications.set(scheduledId, scheduledNotification);
    this.logger.log(`Recurring notification scheduled: ${scheduledId}`);
    
    return scheduledId;
  }

  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    return this.userPreferences.get(userId) || {
      userId,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      timezone: 'UTC',
      categories: {
        [NotificationCategory.HEALTH_ALERT]: true,
        [NotificationCategory.MEAL_REMINDER]: true,
        [NotificationCategory.WORKOUT_REMINDER]: true,
        [NotificationCategory.REPORT_READY]: true,
        [NotificationCategory.GOAL_ACHIEVEMENT]: true,
        [NotificationCategory.WEEKLY_SUMMARY]: true,
        [NotificationCategory.EDUCATIONAL]: true,
        [NotificationCategory.SYSTEM]: true,
      },
    };
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserNotificationPreferences>,
  ): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...preferences, userId };
    this.userPreferences.set(userId, updated);
    this.logger.log(`Updated notification preferences for user ${userId}`);
  }

  async getNotificationStatus(notificationId: string): Promise<NotificationDeliveryStatus | null> {
    return this.deliveryStatuses.get(notificationId) || null;
  }

  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationDeliveryStatus[]> {
    return Array.from(this.deliveryStatuses.values())
      .filter(status => status.userId === userId)
      .sort((a, b) => (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0))
      .slice(0, limit);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    
    for (const [id, scheduled] of this.scheduledNotifications.entries()) {
      if (scheduled.status !== 'active') continue;
      
      if (this.shouldTriggerNotification(scheduled, now)) {
        await this.sendFromTemplate(
          scheduled.templateId,
          scheduled.userId,
          scheduled.payload.data,
          scheduled.payload.locale,
        );
        
        // Update next execution time for recurring notifications
        if (scheduled.recurring) {
          const nextExecution = this.getNextExecutionTime(scheduled, now);
          if (nextExecution) {
            scheduled.scheduledAt = nextExecution;
          } else {
            scheduled.status = 'completed';
          }
        } else {
          scheduled.status = 'completed';
        }
      }
    }
  }

  private shouldSendNotification(
    payload: NotificationPayload,
    preferences: UserNotificationPreferences,
  ): boolean {
    // Check if notification type is enabled
    switch (payload.type) {
      case NotificationType.PUSH:
        if (!preferences.pushEnabled) return false;
        break;
      case NotificationType.EMAIL:
        if (!preferences.emailEnabled) return false;
        break;
      case NotificationType.SMS:
        if (!preferences.smsEnabled) return false;
        break;
    }

    // Check if category is enabled
    if (!preferences.categories[payload.category]) return false;

    // Check quiet hours (skip for critical notifications)
    if (payload.priority !== NotificationPriority.CRITICAL) {
      if (this.isInQuietHours(preferences)) return false;
    }

    return true;
  }

  private isInQuietHours(preferences: UserNotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;
    
    // Simple quiet hours check - would need proper timezone handling in production
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
  }

  private interpolateString(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private shouldTriggerNotification(scheduled: ScheduledNotification, now: Date): boolean {
    if (!scheduled.recurring) {
      return now >= scheduled.scheduledAt;
    }

    // Check recurring pattern
    const { pattern, daysOfWeek, dayOfMonth } = scheduled.recurring;
    
    switch (pattern) {
      case 'daily':
        return true; // Daily notifications always trigger
      case 'weekly':
        return daysOfWeek?.includes(now.getDay()) || false;
      case 'monthly':
        return now.getDate() === dayOfMonth;
      default:
        return false;
    }
  }

  private getNextExecutionTime(scheduled: ScheduledNotification, current: Date): Date | null {
    if (!scheduled.recurring) return null;
    
    const next = new Date(current);
    const { pattern, endDate } = scheduled.recurring;
    
    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    
    if (endDate && next > endDate) return null;
    
    return next;
  }
}