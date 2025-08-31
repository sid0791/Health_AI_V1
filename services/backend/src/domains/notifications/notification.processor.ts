import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayload, NotificationType, NotificationPriority } from './types';

@Injectable()
@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send-notification')
  async handleNotification(job: Job<{ notificationId: string; payload: NotificationPayload }>) {
    const { notificationId, payload } = job.data;
    
    this.logger.log(`Processing notification ${notificationId} for user ${payload.userId}`);

    try {
      switch (payload.type) {
        case NotificationType.PUSH:
          await this.sendPushNotification(payload);
          break;
        case NotificationType.EMAIL:
          await this.sendEmailNotification(payload);
          break;
        case NotificationType.SMS:
          await this.sendSMSNotification(payload);
          break;
        case NotificationType.IN_APP:
          await this.sendInAppNotification(payload);
          break;
        default:
          throw new Error(`Unknown notification type: ${payload.type}`);
      }

      this.logger.log(`Notification ${notificationId} sent successfully`);
      
      // Update delivery status (in production, this would update the database)
      await this.updateDeliveryStatus(notificationId, 'sent');
      
    } catch (error) {
      this.logger.error(`Failed to send notification ${notificationId}:`, error);
      await this.updateDeliveryStatus(notificationId, 'failed', error.message);
      throw error;
    }
  }

  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    // In production, integrate with FCM for Android and APNs for iOS
    this.logger.log(`[MOCK] Sending push notification to ${payload.userId}: ${payload.title}`);
    
    const pushPayload = {
      to: payload.userId, // In reality, this would be the device token
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.imageUrl || '/icons/app-icon-192.png',
        badge: 1,
        sound: payload.priority === NotificationPriority.CRITICAL ? 'critical' : 'default',
        click_action: payload.deepLink,
      },
      data: {
        ...payload.data,
        deepLink: payload.deepLink,
        category: payload.category,
        priority: payload.priority,
        notificationId: payload.data?.notificationId,
      },
      android: {
        priority: payload.priority === NotificationPriority.CRITICAL ? 'high' : 'normal',
        notification: {
          channel_id: this.getChannelId(payload.category),
          color: '#14b8a6', // App primary color
          default_sound: true,
          default_vibrate_timings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: payload.priority === NotificationPriority.CRITICAL ? 'critical.aiff' : 'default',
            badge: 1,
            category: payload.category,
          },
        },
      },
    };

    // Mock delivery delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.debug(`Push notification payload:`, JSON.stringify(pushPayload, null, 2));
  }

  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    // In production, integrate with SendGrid, SES, or similar service
    this.logger.log(`[MOCK] Sending email to ${payload.userId}: ${payload.title}`);
    
    const emailPayload = {
      to: payload.userId, // In reality, this would be the user's email
      from: 'notifications@healthcoachai.com',
      subject: payload.title,
      html: this.generateEmailHTML(payload),
      text: payload.body,
      headers: {
        'X-Notification-ID': payload.data?.notificationId,
        'X-Category': payload.category,
        'X-Priority': payload.priority,
      },
    };

    // Mock delivery delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.logger.debug(`Email payload:`, JSON.stringify(emailPayload, null, 2));
  }

  private async sendSMSNotification(payload: NotificationPayload): Promise<void> {
    // In production, integrate with Twilio, AWS SNS, or similar service
    this.logger.log(`[MOCK] Sending SMS to ${payload.userId}: ${payload.title}`);
    
    const smsPayload = {
      to: payload.userId, // In reality, this would be the user's phone number
      body: `${payload.title}\n\n${payload.body}${payload.actionText ? `\n\n${payload.actionText}: ${payload.deepLink}` : ''}`,
      from: '+1234567890', // Your SMS sender number
    };

    // Mock delivery delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    this.logger.debug(`SMS payload:`, JSON.stringify(smsPayload, null, 2));
  }

  private async sendInAppNotification(payload: NotificationPayload): Promise<void> {
    // In production, this would store the notification in database for real-time display
    this.logger.log(`[MOCK] Storing in-app notification for ${payload.userId}: ${payload.title}`);
    
    const inAppPayload = {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
      actionText: payload.actionText,
      deepLink: payload.deepLink,
      category: payload.category,
      priority: payload.priority,
      createdAt: new Date().toISOString(),
      isRead: false,
      data: payload.data,
    };

    // Mock storage delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    this.logger.debug(`In-app notification:`, JSON.stringify(inAppPayload, null, 2));
  }

  private async updateDeliveryStatus(
    notificationId: string, 
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    // In production, this would update the database
    this.logger.debug(`Updating delivery status for ${notificationId}: ${status}${errorMessage ? ` - ${errorMessage}` : ''}`);
  }

  private getChannelId(category: string): string {
    const channelMap = {
      health_alert: 'health_alerts',
      meal_reminder: 'meal_reminders',
      workout_reminder: 'workout_reminders',
      report_ready: 'reports',
      goal_achievement: 'achievements',
      weekly_summary: 'summaries',
      educational: 'educational',
      system: 'system',
    };
    
    return channelMap[category] || 'general';
  }

  private generateEmailHTML(payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #14b8a6, #10b981); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0 0 20px 0; color: #1f2937; }
          .body { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 30px; }
          .action-button { display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
          .priority-critical { border-left: 4px solid #ef4444; }
          .priority-high { border-left: 4px solid #f59e0b; }
          .priority-normal { border-left: 4px solid #14b8a6; }
          .priority-low { border-left: 4px solid #6b7280; }
        </style>
      </head>
      <body>
        <div class="container priority-${payload.priority}">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">HealthCoachAI</h1>
          </div>
          <div class="content">
            <h2 class="title">${payload.title}</h2>
            <div class="body">${payload.body}</div>
            ${payload.actionText && payload.deepLink ? `
              <a href="${payload.deepLink}" class="action-button">${payload.actionText}</a>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from HealthCoachAI.</p>
            <p>To manage your notification preferences, <a href="/settings/notifications">click here</a>.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}