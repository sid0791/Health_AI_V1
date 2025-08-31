import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  NotificationPayload,
  UserNotificationPreferences,
  NotificationDeliveryStatus,
} from './types';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification queued successfully' })
  async sendNotification(@Body() payload: NotificationPayload): Promise<{ id: string }> {
    if (!payload.userId || !payload.title || !payload.body) {
      throw new BadRequestException('Missing required notification fields');
    }

    const id = await this.notificationsService.sendNotification(payload);
    return { id };
  }

  @Post('send-template')
  @ApiOperation({ summary: 'Send notification from template' })
  @ApiResponse({ status: 201, description: 'Notification sent from template' })
  async sendFromTemplate(
    @Body() body: {
      templateId: string;
      userId: string;
      data?: Record<string, any>;
      locale?: string;
      scheduledAt?: string;
    },
  ): Promise<{ id: string }> {
    const { templateId, userId, data = {}, locale = 'en', scheduledAt } = body;
    
    if (!templateId || !userId) {
      throw new BadRequestException('Template ID and User ID are required');
    }

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;
    const id = await this.notificationsService.sendFromTemplate(
      templateId,
      userId,
      data,
      locale,
      scheduledDate,
    );
    
    return { id };
  }

  @Post('schedule-recurring')
  @ApiOperation({ summary: 'Schedule recurring notification' })
  @ApiResponse({ status: 201, description: 'Recurring notification scheduled' })
  async scheduleRecurring(
    @Body() body: {
      templateId: string;
      userId: string;
      pattern: 'daily' | 'weekly' | 'monthly';
      daysOfWeek?: number[];
      dayOfMonth?: number;
      endDate?: string;
      data?: Record<string, any>;
      locale?: string;
    },
  ): Promise<{ id: string }> {
    const {
      templateId,
      userId,
      pattern,
      daysOfWeek,
      dayOfMonth,
      endDate,
      data = {},
      locale = 'en',
    } = body;

    if (!templateId || !userId || !pattern) {
      throw new BadRequestException('Template ID, User ID, and pattern are required');
    }

    const schedule = {
      pattern,
      daysOfWeek,
      dayOfMonth,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const id = await this.notificationsService.scheduleRecurringNotification(
      templateId,
      userId,
      schedule,
      data,
      locale,
    );

    return { id };
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved' })
  async getUserPreferences(
    @Param('userId') userId: string,
  ): Promise<UserNotificationPreferences> {
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put('preferences/:userId')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() preferences: Partial<UserNotificationPreferences>,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.updateUserPreferences(userId, preferences);
    return { success: true };
  }

  @Get('status/:notificationId')
  @ApiOperation({ summary: 'Get notification delivery status' })
  @ApiResponse({ status: 200, description: 'Notification status retrieved' })
  async getNotificationStatus(
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationDeliveryStatus> {
    const status = await this.notificationsService.getNotificationStatus(notificationId);
    if (!status) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    return status;
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'Get notification history for user' })
  @ApiResponse({ status: 200, description: 'Notification history retrieved' })
  async getNotificationHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationDeliveryStatus[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.notificationsService.getNotificationHistory(userId, limitNum);
  }

  @Post('test/:userId')
  @ApiOperation({ summary: 'Send test notification to user' })
  @ApiResponse({ status: 201, description: 'Test notification sent' })
  async sendTestNotification(
    @Param('userId') userId: string,
    @Body() body: { type?: string; locale?: string },
  ): Promise<{ id: string }> {
    const { type = 'meal_reminder_breakfast', locale = 'en' } = body;
    
    const id = await this.notificationsService.sendFromTemplate(
      type,
      userId,
      { userName: 'Test User' },
      locale,
    );
    
    return { id };
  }
}