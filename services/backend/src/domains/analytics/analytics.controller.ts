import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsEvent,
  EventType,
  UserBehaviorMetrics,
  HealthMetrics,
  PerformanceMetrics,
  BusinessMetrics,
  Cohort,
} from './types';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track an analytics event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  async trackEvent(
    @Body() body: Omit<AnalyticsEvent, 'id' | 'timestamp'>,
  ): Promise<{ eventId: string }> {
    if (!body.eventType) {
      throw new BadRequestException('Event type is required');
    }

    const eventId = await this.analyticsService.trackEvent(body);
    return { eventId };
  }

  @Post('track-health')
  @ApiOperation({ summary: 'Track a health metric' })
  @ApiResponse({ status: 201, description: 'Health metric tracked successfully' })
  async trackHealthMetric(
    @Body() body: {
      userId: string;
      metricType: string;
      value: any;
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: boolean }> {
    const { userId, metricType, value, metadata = {} } = body;
    
    if (!userId || !metricType || value === undefined) {
      throw new BadRequestException('User ID, metric type, and value are required');
    }

    await this.analyticsService.trackHealthMetric(userId, metricType, value, metadata);
    return { success: true };
  }

  @Post('performance')
  @ApiOperation({ summary: 'Record performance metric' })
  @ApiResponse({ status: 201, description: 'Performance metric recorded' })
  async recordPerformanceMetric(
    @Body() body: Omit<PerformanceMetrics, 'timestamp'>,
  ): Promise<{ success: boolean }> {
    if (!body.service || !body.endpoint) {
      throw new BadRequestException('Service and endpoint are required');
    }

    await this.analyticsService.recordPerformanceMetric(body);
    return { success: true };
  }

  @Get('user/:userId/behavior')
  @ApiOperation({ summary: 'Get user behavior metrics' })
  @ApiResponse({ status: 200, description: 'User behavior metrics retrieved' })
  async getUserBehaviorMetrics(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ): Promise<UserBehaviorMetrics[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getUserBehaviorMetrics(userId, daysNum);
  }

  @Get('user/:userId/health')
  @ApiOperation({ summary: 'Get user health metrics' })
  @ApiResponse({ status: 200, description: 'User health metrics retrieved' })
  async getUserHealthMetrics(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ): Promise<HealthMetrics[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getHealthMetrics(userId, daysNum);
  }

  @Get('business')
  @ApiOperation({ summary: 'Get business metrics' })
  @ApiResponse({ status: 200, description: 'Business metrics retrieved' })
  async getBusinessMetrics(
    @Query('days') days?: string,
  ): Promise<BusinessMetrics[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getBusinessMetrics(daysNum);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(
    @Query('hours') hours?: string,
  ): Promise<PerformanceMetrics[]> {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.analyticsService.getPerformanceMetrics(hoursNum);
  }

  @Post('cohort')
  @ApiOperation({ summary: 'Create a user cohort' })
  @ApiResponse({ status: 201, description: 'Cohort created successfully' })
  async createCohort(
    @Body() body: Omit<Cohort, 'id' | 'size' | 'createdAt'>,
  ): Promise<Cohort> {
    if (!body.name || !body.definition) {
      throw new BadRequestException('Cohort name and definition are required');
    }

    return this.analyticsService.createCohort(body);
  }

  @Post('query')
  @ApiOperation({ summary: 'Run analytics query' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  async runQuery(
    @Body() body: {
      query: string;
      params?: Record<string, any>;
    },
  ): Promise<{ results: any[]; executionTime: number }> {
    const { query, params = {} } = body;
    
    if (!query) {
      throw new BadRequestException('Query is required');
    }

    const startTime = Date.now();
    const results = await this.analyticsService.runQuery(query, params);
    const executionTime = Date.now() - startTime;

    return { results, executionTime };
  }

  @Get('health')
  @ApiOperation({ summary: 'Analytics service health check' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    eventsCount: number;
    environment: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      eventsCount: 0, // Would get from actual storage
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get overview dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getOverviewDashboard(): Promise<{
    activeUsers: number;
    totalUsers: number;
    avgSessionDuration: number;
    topFeatures: Array<{ name: string; usage: number }>;
    healthTrends: Array<{ date: string; avgWeightLoss: number; adherence: number }>;
    aiUsage: { totalInteractions: number; avgCost: number; topModels: Array<{ model: string; usage: number }> };
  }> {
    // Mock dashboard data
    return {
      activeUsers: 8500,
      totalUsers: 15000,
      avgSessionDuration: 420,
      topFeatures: [
        { name: 'Health Tracking', usage: 0.89 },
        { name: 'Meal Planning', usage: 0.78 },
        { name: 'AI Chat', usage: 0.65 },
        { name: 'Fitness Planning', usage: 0.56 },
      ],
      healthTrends: [
        { date: '2024-01-01', avgWeightLoss: 2.1, adherence: 0.74 },
        { date: '2024-01-02', avgWeightLoss: 2.3, adherence: 0.76 },
        { date: '2024-01-03', avgWeightLoss: 2.0, adherence: 0.72 },
      ],
      aiUsage: {
        totalInteractions: 12500,
        avgCost: 0.007,
        topModels: [
          { model: 'gpt-3.5-turbo', usage: 8500 },
          { model: 'gpt-4', usage: 3200 },
          { model: 'claude-3-haiku', usage: 1800 },
        ],
      },
    };
  }

  @Get('insights/user-engagement')
  @ApiOperation({ summary: 'Get user engagement insights' })
  @ApiResponse({ status: 200, description: 'User engagement insights' })
  async getUserEngagementInsights(): Promise<{
    retention: { day1: number; day7: number; day30: number };
    churnRisk: { high: number; medium: number; low: number };
    segmentation: Array<{ segment: string; users: number; engagement: number }>;
    trends: Array<{ date: string; newUsers: number; activeUsers: number; churnedUsers: number }>;
  }> {
    // Mock engagement insights
    return {
      retention: { day1: 0.85, day7: 0.72, day30: 0.58 },
      churnRisk: { high: 150, medium: 420, low: 1230 },
      segmentation: [
        { segment: 'Highly Engaged', users: 3200, engagement: 0.92 },
        { segment: 'Moderately Engaged', users: 5800, engagement: 0.68 },
        { segment: 'Low Engagement', users: 4100, engagement: 0.34 },
        { segment: 'At Risk', users: 1900, engagement: 0.12 },
      ],
      trends: [
        { date: '2024-01-01', newUsers: 150, activeUsers: 8200, churnedUsers: 45 },
        { date: '2024-01-02', newUsers: 180, activeUsers: 8350, churnedUsers: 38 },
        { date: '2024-01-03', newUsers: 165, activeUsers: 8500, churnedUsers: 42 },
      ],
    };
  }

  @Get('insights/health-outcomes')
  @ApiOperation({ summary: 'Get health outcomes insights' })
  @ApiResponse({ status: 200, description: 'Health outcomes insights' })
  async getHealthOutcomesInsights(): Promise<{
    weightLoss: { avgLoss: number; successful: number; total: number };
    adherence: { meal: number; workout: number; medication: number };
    riskReduction: Array<{ risk: string; before: number; after: number; improvement: number }>;
    goalAchievement: { weight: number; fitness: number; nutrition: number; overall: number };
  }> {
    // Mock health outcomes
    return {
      weightLoss: { avgLoss: 2.3, successful: 1890, total: 2450 },
      adherence: { meal: 0.74, workout: 0.68, medication: 0.82 },
      riskReduction: [
        { risk: 'Diabetes', before: 0.45, after: 0.32, improvement: 0.13 },
        { risk: 'Hypertension', before: 0.38, after: 0.28, improvement: 0.10 },
        { risk: 'Cardiovascular', before: 0.29, after: 0.21, improvement: 0.08 },
      ],
      goalAchievement: { weight: 0.68, fitness: 0.54, nutrition: 0.72, overall: 0.65 },
    };
  }
}