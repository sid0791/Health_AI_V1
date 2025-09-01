import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { HealthDataService } from '../../integrations/health-data/services/health-data.service';
import {
  HealthDataEntry,
  HealthDataProvider,
  HealthDataType,
} from '../../integrations/health-data/entities/health-data-entry.entity';
import {
  HealthDataConnection,
  ConnectionStatus,
} from '../../integrations/health-data/entities/health-data-connection.entity';
import { User } from '../../users/entities/user.entity';
import { AICacheService } from '../../ai-routing/services/ai-cache.service';

export interface HealthMetricsSummary {
  userId: string;
  date: Date;
  metrics: {
    steps: number;
    caloriesBurned: number;
    activeMinutes: number;
    heartRateAvg?: number;
    sleepHours?: number;
    distance?: number;
  };
  trends: {
    stepsVsGoal: 'above' | 'below' | 'on_track';
    caloriesVsGoal: 'above' | 'below' | 'on_track';
    weeklyTrend: 'improving' | 'declining' | 'stable';
  };
  achievements: string[];
  recommendations: string[];
}

export interface AutoFetchResult {
  provider: HealthDataProvider;
  success: boolean;
  dataPointsReceived: number;
  lastSyncTime: Date;
  error?: string;
}

/**
 * Enhanced Health Data Integration Service
 * Provides seamless auto-fetching of health data and pre-calculated responses
 * to reduce AI API calls for common health queries
 */
@Injectable()
export class EnhancedHealthIntegrationService {
  private readonly logger = new Logger(EnhancedHealthIntegrationService.name);

  // Cache for pre-calculated health summaries
  private healthSummaryCache = new Map<string, HealthMetricsSummary>();

  constructor(
    private readonly healthDataService: HealthDataService,
    @InjectRepository(HealthDataEntry)
    private readonly healthDataRepository: Repository<HealthDataEntry>,
    @InjectRepository(HealthDataConnection)
    private readonly connectionRepository: Repository<HealthDataConnection>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly aiCacheService: AICacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Auto-fetch health data for all connected users
   * Runs every hour to keep data fresh
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoFetchHealthData(): Promise<void> {
    this.logger.log('Starting auto-fetch of health data for all users');

    try {
      // Get all active connections
      const activeConnections = await this.connectionRepository.find({
        where: { status: ConnectionStatus.CONNECTED },
        relations: ['user'],
      });

      this.logger.log(`Found ${activeConnections.length} active health data connections`);

      const results: AutoFetchResult[] = [];

      for (const connection of activeConnections) {
        try {
          const result = await this.fetchUserHealthData(connection);
          results.push(result);

          // Update user's health summary cache
          if (result.success) {
            await this.updateHealthSummaryCache(connection.userId);
          }
        } catch (error) {
          this.logger.error(`Failed to fetch data for user ${connection.userId}:`, error);
          results.push({
            provider: connection.provider,
            success: false,
            dataPointsReceived: 0,
            lastSyncTime: new Date(),
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      this.logger.log(`Auto-fetch completed: ${successCount}/${results.length} successful`);
    } catch (error) {
      this.logger.error('Error in auto-fetch health data job:', error);
    }
  }

  /**
   * Get comprehensive health metrics for a user without external API calls
   */
  async getUserHealthSummary(userId: string, date?: Date): Promise<HealthMetricsSummary> {
    const targetDate = date || new Date();
    const cacheKey = `${userId}_${targetDate.toDateString()}`;

    // Check cache first
    const cached = this.healthSummaryCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.date)) {
      return cached;
    }

    // Generate fresh summary
    const summary = await this.generateHealthSummary(userId, targetDate);
    this.healthSummaryCache.set(cacheKey, summary);

    return summary;
  }

  /**
   * Get instant responses to common health queries using cached data
   */
  async getInstantHealthResponse(userId: string, query: string): Promise<string | null> {
    const normalizedQuery = query.toLowerCase();
    const summary = await this.getUserHealthSummary(userId);

    // Handle specific queries with cached data
    if (normalizedQuery.includes('steps') || normalizedQuery.includes('walked')) {
      const steps = summary.metrics.steps;
      const goal = 10000; // Could be from user preferences
      const percentage = ((steps / goal) * 100).toFixed(0);

      return `You've taken ${steps} steps today (${percentage}% of your daily goal). ${this.getStepsMotivation(steps, goal)}`;
    }

    if (normalizedQuery.includes('calories') && normalizedQuery.includes('burned')) {
      const calories = summary.metrics.caloriesBurned;
      return `You've burned ${calories} calories today through your activities. ${this.getCaloriesMotivation(calories)}`;
    }

    if (normalizedQuery.includes('active') && normalizedQuery.includes('minutes')) {
      const minutes = summary.metrics.activeMinutes;
      return `You've been active for ${minutes} minutes today. ${this.getActivityMotivation(minutes)}`;
    }

    if (normalizedQuery.includes('sleep') || normalizedQuery.includes('slept')) {
      if (summary.metrics.sleepHours) {
        const hours = summary.metrics.sleepHours;
        return `You slept for ${hours} hours last night. ${this.getSleepFeedback(hours)}`;
      }
      return "I don't have recent sleep data. Make sure your health device is connected and tracking sleep.";
    }

    if (normalizedQuery.includes('heart rate')) {
      if (summary.metrics.heartRateAvg) {
        const hr = summary.metrics.heartRateAvg;
        return `Your average heart rate today is ${hr} bpm. ${this.getHeartRateFeedback(hr)}`;
      }
      return "I don't have recent heart rate data. Ensure your fitness tracker is properly worn and synced.";
    }

    if (normalizedQuery.includes('progress') || normalizedQuery.includes('trend')) {
      return this.generateProgressSummary(summary);
    }

    return null; // No cached response available
  }

  /**
   * Pre-generate common health insights to cache
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async preGenerateHealthInsights(): Promise<void> {
    this.logger.log('Pre-generating health insights for caching');

    try {
      const activeUsers = await this.userRepository.find({
        where: { status: 'active' as any },
        select: ['id'],
        take: 1000, // Process in batches
      });

      for (const user of activeUsers) {
        try {
          const insights = await this.generateHealthInsights(user.id);

          // Cache common question responses
          const commonQuestions = [
            'How many steps did I take today?',
            'How many calories did I burn today?',
            'What is my activity level today?',
            'How am I progressing towards my goals?',
            'What is my weekly trend?',
          ];

          for (const question of commonQuestions) {
            const response = await this.getInstantHealthResponse(user.id, question);
            if (response) {
              await this.aiCacheService.cacheResponse(
                'health_metrics',
                question,
                { userId: user.id },
                response,
                {
                  provider: 'local_cache',
                  model: 'health_data_cache',
                  tokensUsed: 0,
                  cost: 0,
                  responseTime: 50, // Fast cached response
                  userTier: 'free',
                },
              );
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to generate insights for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in pre-generate health insights job:', error);
    }
  }

  /**
   * Sync user data from specific provider with enhanced error handling
   */
  async syncUserData(userId: string, provider: HealthDataProvider): Promise<AutoFetchResult> {
    try {
      const connection = await this.connectionRepository.findOne({
        where: { userId, provider },
      });

      if (!connection || connection.status !== ConnectionStatus.CONNECTED) {
        throw new Error(`No active connection found for ${provider}`);
      }

      return await this.fetchUserHealthData(connection);
    } catch (error) {
      this.logger.error(`Sync failed for user ${userId} provider ${provider}:`, error);
      return {
        provider,
        success: false,
        dataPointsReceived: 0,
        lastSyncTime: new Date(),
        error: error.message,
      };
    }
  }

  // Private helper methods

  private async fetchUserHealthData(connection: HealthDataConnection): Promise<AutoFetchResult> {
    const now = new Date();
    const lastSync = connection.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago if never synced

    try {
      // Use the existing health data service to fetch data
      const syncResults = await this.healthDataService.syncHealthData(connection.userId, {
        provider: connection.provider,
        startDate: lastSync.toISOString(),
        endDate: now.toISOString(),
      });

      const totalDataPoints = syncResults.reduce((sum, result) => sum + result.recordsSuccess, 0);

      // Update connection
      connection.lastSyncAt = now;
      connection.nextSyncAt = new Date(now.getTime() + 60 * 60 * 1000); // Next sync in 1 hour
      connection.errorCount = 0;
      connection.lastError = null;
      await this.connectionRepository.save(connection);

      return {
        provider: connection.provider,
        success: true,
        dataPointsReceived: totalDataPoints,
        lastSyncTime: now,
      };
    } catch (error) {
      // Update connection with error
      connection.errorCount = (connection.errorCount || 0) + 1;
      connection.lastError = error.message;

      if (connection.errorCount >= 5) {
        connection.status = ConnectionStatus.ERROR;
      }

      await this.connectionRepository.save(connection);
      throw error;
    }
  }

  private async generateHealthSummary(userId: string, date: Date): Promise<HealthMetricsSummary> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Get today's health data
    const todayData = await this.healthDataRepository.find({
      where: {
        userId,
        recordedAt: Between(startOfDay, endOfDay),
      },
    });

    // Get week's data for trends
    const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekData = await this.healthDataRepository.find({
      where: {
        userId,
        recordedAt: Between(weekAgo, endOfDay),
      },
    });

    const metrics = this.calculateMetrics(todayData);
    const trends = this.calculateTrends(weekData, metrics);
    const achievements = this.calculateAchievements(metrics);
    const recommendations = this.generateRecommendations(metrics, trends);

    return {
      userId,
      date,
      metrics,
      trends,
      achievements,
      recommendations,
    };
  }

  private calculateMetrics(data: HealthDataEntry[]): HealthMetricsSummary['metrics'] {
    const metrics = {
      steps: 0,
      caloriesBurned: 0,
      activeMinutes: 0,
      heartRateAvg: undefined as number | undefined,
      sleepHours: undefined as number | undefined,
      distance: undefined as number | undefined,
    };

    const heartRates: number[] = [];

    for (const entry of data) {
      switch (entry.dataType) {
        case HealthDataType.STEPS:
          metrics.steps += entry.value;
          break;
        case HealthDataType.CALORIES_BURNED:
          metrics.caloriesBurned += entry.value;
          break;
        case HealthDataType.ACTIVE_MINUTES:
          metrics.activeMinutes += entry.value;
          break;
        case HealthDataType.HEART_RATE:
          heartRates.push(entry.value);
          break;
        case HealthDataType.SLEEP_DURATION:
          metrics.sleepHours = entry.value;
          break;
        case HealthDataType.DISTANCE:
          metrics.distance = (metrics.distance || 0) + entry.value;
          break;
      }
    }

    if (heartRates.length > 0) {
      metrics.heartRateAvg = Math.round(
        heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length,
      );
    }

    return metrics;
  }

  private calculateTrends(
    weekData: HealthDataEntry[],
    todayMetrics: any,
  ): HealthMetricsSummary['trends'] {
    // Simple trend calculation - in production would be more sophisticated
    const stepGoal = 10000;
    const calorieGoal = 2000;

    const stepsVsGoal =
      todayMetrics.steps >= stepGoal
        ? 'above'
        : todayMetrics.steps >= stepGoal * 0.8
          ? 'on_track'
          : 'below';

    const caloriesVsGoal =
      todayMetrics.caloriesBurned >= calorieGoal
        ? 'above'
        : todayMetrics.caloriesBurned >= calorieGoal * 0.8
          ? 'on_track'
          : 'below';

    // Calculate weekly trend (simplified)
    const recentDays = weekData.filter((d) => d.dataType === HealthDataType.STEPS);
    const weeklyTrend = recentDays.length >= 5 ? 'improving' : 'stable'; // Simplified logic

    return {
      stepsVsGoal: stepsVsGoal as any,
      caloriesVsGoal: caloriesVsGoal as any,
      weeklyTrend: weeklyTrend as any,
    };
  }

  private calculateAchievements(metrics: HealthMetricsSummary['metrics']): string[] {
    const achievements: string[] = [];

    if (metrics.steps >= 10000) {
      achievements.push('🎯 Reached your daily step goal!');
    }
    if (metrics.steps >= 15000) {
      achievements.push('⭐ Exceeded your step goal by 50%!');
    }
    if (metrics.activeMinutes >= 150) {
      achievements.push('💪 Met the weekly active minutes recommendation!');
    }
    if (metrics.sleepHours && metrics.sleepHours >= 7) {
      achievements.push('😴 Got adequate sleep last night!');
    }

    return achievements;
  }

  private generateRecommendations(
    metrics: HealthMetricsSummary['metrics'],
    trends: HealthMetricsSummary['trends'],
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.steps < 8000) {
      recommendations.push('Consider taking a 10-minute walk to boost your step count');
    }
    if (metrics.activeMinutes < 30) {
      recommendations.push('Try to get at least 30 minutes of activity today');
    }
    if (trends.weeklyTrend === 'declining') {
      recommendations.push('Your activity has decreased this week - try to be more active');
    }
    if (metrics.sleepHours && metrics.sleepHours < 7) {
      recommendations.push('Aim for 7-9 hours of sleep for optimal health');
    }

    return recommendations;
  }

  private async generateHealthInsights(userId: string): Promise<Record<string, string>> {
    const summary = await this.getUserHealthSummary(userId);

    return {
      dailySummary: this.generateDailySummary(summary),
      motivationalMessage: this.generateMotivationalMessage(summary),
      healthTip: this.generateHealthTip(summary),
    };
  }

  private generateDailySummary(summary: HealthMetricsSummary): string {
    const { metrics } = summary;
    return `Today you've taken ${metrics.steps} steps, burned ${metrics.caloriesBurned} calories, and been active for ${metrics.activeMinutes} minutes.`;
  }

  private generateMotivationalMessage(summary: HealthMetricsSummary): string {
    const { achievements } = summary;
    if (achievements.length > 0) {
      return `Great job! ${achievements[0]} Keep up the excellent work!`;
    }
    return 'Every step counts towards your health goals. Keep moving forward!';
  }

  private generateHealthTip(summary: HealthMetricsSummary): string {
    const { recommendations } = summary;
    if (recommendations.length > 0) {
      return recommendations[0];
    }
    return 'Stay hydrated and maintain a balanced diet for optimal health.';
  }

  private generateProgressSummary(summary: HealthMetricsSummary): string {
    const progress = [];

    if (summary.trends.stepsVsGoal === 'above') {
      progress.push('exceeding your step goals');
    } else if (summary.trends.stepsVsGoal === 'on_track') {
      progress.push('on track with your step goals');
    }

    if (summary.trends.weeklyTrend === 'improving') {
      progress.push('showing improvement this week');
    }

    if (progress.length > 0) {
      return `You're ${progress.join(' and ')}. ${summary.achievements.length > 0 ? summary.achievements[0] : ''}`;
    }

    return 'Keep working towards your health goals. Every small step makes a difference!';
  }

  private getStepsMotivation(steps: number, goal: number): string {
    const remaining = Math.max(0, goal - steps);
    if (remaining === 0) return "Fantastic! You've hit your goal!";
    if (remaining <= 2000) return `Just ${remaining} more steps to reach your goal!`;
    return `Keep moving! ${remaining} steps to go.`;
  }

  private getCaloriesMotivation(calories: number): string {
    if (calories >= 500) return 'Excellent calorie burn today!';
    if (calories >= 300) return 'Good job staying active!';
    return 'Every activity counts towards your health!';
  }

  private getActivityMotivation(minutes: number): string {
    if (minutes >= 60) return "Amazing! You've been very active today!";
    if (minutes >= 30) return 'Great job meeting the daily activity recommendation!';
    return 'Try to get a bit more activity in today!';
  }

  private getSleepFeedback(hours: number): string {
    if (hours >= 8) return 'Excellent sleep duration!';
    if (hours >= 7) return 'Good amount of sleep.';
    return 'Try to get a bit more sleep for optimal health.';
  }

  private getHeartRateFeedback(hr: number): string {
    if (hr >= 60 && hr <= 100) return 'Your heart rate is in the normal range.';
    if (hr < 60) return 'Your resting heart rate is quite low, which can indicate good fitness.';
    return 'Consider checking with a healthcare provider about your heart rate.';
  }

  private isCacheValid(cacheDate: Date): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - cacheDate.getTime();
    return cacheAge < 60 * 60 * 1000; // Cache valid for 1 hour
  }

  private async updateHealthSummaryCache(userId: string): Promise<void> {
    try {
      await this.getUserHealthSummary(userId); // This will update the cache
    } catch (error) {
      this.logger.warn(`Failed to update health summary cache for user ${userId}:`, error);
    }
  }
}
