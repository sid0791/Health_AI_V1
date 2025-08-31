import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AnalyticsEvent,
  EventType,
  UserBehaviorMetrics,
  HealthMetrics,
  PerformanceMetrics,
  BusinessMetrics,
  AlertRule,
  Dashboard,
  Cohort,
} from './types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  
  // In-memory stores for demo - replace with actual database/time-series DB
  private events = new Map<string, AnalyticsEvent[]>();
  private userMetrics = new Map<string, UserBehaviorMetrics[]>();
  private healthMetrics = new Map<string, HealthMetrics[]>();
  private performanceMetrics: PerformanceMetrics[] = [];
  private businessMetrics: BusinessMetrics[] = [];
  private alertRules = new Map<string, AlertRule>();
  private dashboards = new Map<string, Dashboard>();
  private cohorts = new Map<string, Cohort>();
  
  private activeSessions = new Map<string, { userId: string; startTime: Date; lastActivity: Date }>();

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultAlerts();
    this.initializeDefaultDashboards();
  }

  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<string> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analyticsEvent: AnalyticsEvent = {
      id: eventId,
      timestamp: new Date(),
      ...event,
    };

    // Store event
    const userEvents = this.events.get(event.userId || 'anonymous') || [];
    userEvents.push(analyticsEvent);
    this.events.set(event.userId || 'anonymous', userEvents);

    // Update user behavior metrics
    if (event.userId) {
      await this.updateUserBehaviorMetrics(event.userId, analyticsEvent);
    }

    // Emit event for real-time processing
    this.eventEmitter.emit('analytics.event', analyticsEvent);

    this.logger.debug(`Tracked event: ${event.eventType} for user ${event.userId}`);
    return eventId;
  }

  async trackHealthMetric(
    userId: string,
    metricType: string,
    value: any,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const userHealthMetrics = this.healthMetrics.get(userId) || [];
    
    let todayMetrics = userHealthMetrics.find(m => m.date === today);
    if (!todayMetrics) {
      todayMetrics = {
        userId,
        date: today,
        biomarkers: {},
        adherence: { mealPlan: 0, workoutPlan: 0, medicationReminders: 0 },
        goals: {},
        risks: {
          bloodPressureRisk: 'low',
          diabetesRisk: 'low',
          cardiovascularRisk: 'low',
        },
      };
      userHealthMetrics.push(todayMetrics);
    }

    // Update specific biomarker
    switch (metricType) {
      case 'weight':
        todayMetrics.biomarkers.weight = {
          value: value.weight,
          unit: value.unit || 'kg',
          trend: this.calculateTrend(userId, 'weight', value.weight),
        };
        break;
      case 'blood_pressure':
        todayMetrics.biomarkers.bloodPressure = {
          systolic: value.systolic,
          diastolic: value.diastolic,
          trend: this.calculateTrend(userId, 'blood_pressure', value.systolic),
        };
        break;
      case 'blood_sugar':
        todayMetrics.biomarkers.bloodSugar = {
          value: value.value,
          unit: value.unit || 'mg/dL',
          type: value.type || 'random',
          trend: this.calculateTrend(userId, 'blood_sugar', value.value),
        };
        break;
    }

    // Update risk assessments
    this.updateRiskAssessments(todayMetrics);
    
    this.healthMetrics.set(userId, userHealthMetrics);
    
    // Track as analytics event
    await this.trackEvent({
      userId,
      eventType: EventType.BIOMARKER_LOGGED,
      properties: { metricType, value, ...metadata },
      metadata: {
        platform: 'web',
        appVersion: '1.0.0',
      },
      context: { screen: 'health_tracking' },
    });
  }

  async recordPerformanceMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    const performanceMetric: PerformanceMetrics = {
      timestamp: new Date(),
      ...metric,
    };

    this.performanceMetrics.push(performanceMetric);
    
    // Keep only last 1000 entries for demo
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Check alert rules
    await this.checkAlertRules('performance', performanceMetric);
  }

  async getUserBehaviorMetrics(userId: string, days: number = 30): Promise<UserBehaviorMetrics[]> {
    const userMetrics = this.userMetrics.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return userMetrics.filter(m => new Date(m.date) >= cutoffDate);
  }

  async getHealthMetrics(userId: string, days: number = 30): Promise<HealthMetrics[]> {
    const userHealthMetrics = this.healthMetrics.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return userHealthMetrics.filter(m => new Date(m.date) >= cutoffDate);
  }

  async getBusinessMetrics(days: number = 30): Promise<BusinessMetrics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.businessMetrics.filter(m => new Date(m.date) >= cutoffDate);
  }

  async getPerformanceMetrics(hours: number = 24): Promise<PerformanceMetrics[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.performanceMetrics.filter(m => m.timestamp >= cutoffTime);
  }

  async createCohort(cohort: Omit<Cohort, 'id' | 'size' | 'createdAt'>): Promise<Cohort> {
    const cohortId = `cohort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate cohort size based on definition
    const size = await this.calculateCohortSize(cohort.definition);
    
    const newCohort: Cohort = {
      id: cohortId,
      size,
      createdAt: new Date(),
      ...cohort,
    };
    
    this.cohorts.set(cohortId, newCohort);
    this.logger.log(`Created cohort: ${cohort.name} with ${size} users`);
    
    return newCohort;
  }

  async runQuery(query: string, params: Record<string, any> = {}): Promise<any[]> {
    // This is a simplified query engine for demo purposes
    // In production, this would integrate with a real analytics database
    
    this.logger.debug(`Running analytics query: ${query}`, params);
    
    // Mock query results based on query type
    if (query.includes('user_events')) {
      return this.queryUserEvents(params);
    } else if (query.includes('health_trends')) {
      return this.queryHealthTrends(params);
    } else if (query.includes('performance')) {
      return this.queryPerformanceData(params);
    }
    
    return [];
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateHourlyMetrics(): Promise<void> {
    this.logger.debug('Generating hourly analytics metrics');
    
    // Calculate business metrics
    await this.calculateBusinessMetrics();
    
    // Check alert rules
    await this.checkAllAlertRules();
    
    // Clean up old data
    await this.cleanupOldData();
  }

  @OnEvent('user.signup')
  async handleUserSignup(payload: { userId: string; metadata: any }): Promise<void> {
    await this.trackEvent({
      userId: payload.userId,
      eventType: EventType.USER_SIGNUP,
      properties: payload.metadata,
      metadata: {
        platform: 'web',
        appVersion: '1.0.0',
      },
      context: { screen: 'signup' },
    });
  }

  @OnEvent('ai.usage.recorded')
  async handleAIUsage(payload: any): Promise<void> {
    await this.trackEvent({
      userId: payload.userId,
      eventType: EventType.AI_CHAT_MESSAGE,
      properties: {
        model: payload.model,
        tokens: payload.totalTokens,
        cost: payload.costUSD,
        responseTime: payload.responseTime,
      },
      metadata: {
        platform: 'web',
        appVersion: '1.0.0',
      },
      context: { screen: 'ai_chat' },
    });
  }

  @OnEvent('feature-flag.evaluated')
  async handleFeatureFlagEvaluation(payload: any): Promise<void> {
    await this.trackEvent({
      userId: payload.userId,
      eventType: EventType.FEATURE_USED,
      properties: {
        flagId: payload.flagId,
        value: payload.value,
        reason: payload.reason,
      },
      metadata: {
        platform: 'web',
        appVersion: '1.0.0',
      },
      context: {},
    });
  }

  private async updateUserBehaviorMetrics(userId: string, event: AnalyticsEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const userMetrics = this.userMetrics.get(userId) || [];
    
    let todayMetrics = userMetrics.find(m => m.date === today);
    if (!todayMetrics) {
      todayMetrics = {
        userId,
        date: today,
        sessionCount: 0,
        totalSessionDuration: 0,
        screenViews: {},
        featuresUsed: [],
        eventsCount: {},
        conversionFunnels: {},
      };
      userMetrics.push(todayMetrics);
    }

    // Update event count
    todayMetrics.eventsCount[event.eventType] = (todayMetrics.eventsCount[event.eventType] || 0) + 1;
    
    // Update screen views
    if (event.context.screen) {
      todayMetrics.screenViews[event.context.screen] = (todayMetrics.screenViews[event.context.screen] || 0) + 1;
    }
    
    // Track features used
    if (event.eventType === EventType.FEATURE_USED && event.properties.feature) {
      if (!todayMetrics.featuresUsed.includes(event.properties.feature)) {
        todayMetrics.featuresUsed.push(event.properties.feature);
      }
    }
    
    this.userMetrics.set(userId, userMetrics);
  }

  private calculateTrend(userId: string, metricType: string, currentValue: number): 'up' | 'down' | 'stable' {
    // Simplified trend calculation - would use more sophisticated analysis in production
    const userHealthMetrics = this.healthMetrics.get(userId) || [];
    const recentMetrics = userHealthMetrics.slice(-7); // Last 7 days
    
    if (recentMetrics.length < 2) return 'stable';
    
    // Get previous value for comparison
    let previousValue = 0;
    for (let i = recentMetrics.length - 1; i >= 0; i--) {
      const metric = recentMetrics[i];
      const value = this.extractMetricValue(metric, metricType);
      if (value !== null && value !== undefined) {
        if (i === recentMetrics.length - 1) continue; // Skip current day
        previousValue = value;
        break;
      }
    }
    
    const change = ((currentValue - previousValue) / previousValue) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private extractMetricValue(healthMetric: HealthMetrics, metricType: string): number | null {
    switch (metricType) {
      case 'weight':
        return healthMetric.biomarkers.weight?.value || null;
      case 'blood_pressure':
        return healthMetric.biomarkers.bloodPressure?.systolic || null;
      case 'blood_sugar':
        return healthMetric.biomarkers.bloodSugar?.value || null;
      default:
        return null;
    }
  }

  private updateRiskAssessments(metrics: HealthMetrics): void {
    // Simplified risk assessment logic
    if (metrics.biomarkers.bloodPressure) {
      const { systolic, diastolic } = metrics.biomarkers.bloodPressure;
      if (systolic >= 180 || diastolic >= 120) {
        metrics.risks.bloodPressureRisk = 'critical';
      } else if (systolic >= 140 || diastolic >= 90) {
        metrics.risks.bloodPressureRisk = 'high';
      } else if (systolic >= 130 || diastolic >= 80) {
        metrics.risks.bloodPressureRisk = 'moderate';
      } else {
        metrics.risks.bloodPressureRisk = 'low';
      }
    }
    
    if (metrics.biomarkers.bloodSugar) {
      const { value, type } = metrics.biomarkers.bloodSugar;
      if (type === 'fasting' && value >= 126) {
        metrics.risks.diabetesRisk = 'high';
      } else if (type === 'fasting' && value >= 100) {
        metrics.risks.diabetesRisk = 'moderate';
      } else {
        metrics.risks.diabetesRisk = 'low';
      }
    }
  }

  private async calculateCohortSize(definition: any): Promise<number> {
    // Mock cohort size calculation
    return Math.floor(Math.random() * 1000) + 100;
  }

  private queryUserEvents(params: Record<string, any>): any[] {
    // Mock user events query
    return [
      { event_type: 'user_signup', count: 150, date: '2024-01-01' },
      { event_type: 'meal_logged', count: 2400, date: '2024-01-01' },
      { event_type: 'workout_completed', count: 890, date: '2024-01-01' },
    ];
  }

  private queryHealthTrends(params: Record<string, any>): any[] {
    // Mock health trends query
    return [
      { metric: 'avg_weight_loss', value: 2.3, unit: 'kg', period: 'month' },
      { metric: 'avg_adherence', value: 0.78, unit: 'percentage', period: 'week' },
      { metric: 'risk_improvement', value: 0.15, unit: 'percentage', period: 'month' },
    ];
  }

  private queryPerformanceData(params: Record<string, any>): any[] {
    // Mock performance query
    return [
      { endpoint: '/api/ai/chat', avg_response_time: 1200, error_rate: 0.02 },
      { endpoint: '/api/meal-plan', avg_response_time: 800, error_rate: 0.01 },
      { endpoint: '/api/health-report', avg_response_time: 2100, error_rate: 0.03 },
    ];
  }

  private async calculateBusinessMetrics(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Mock business metrics calculation
    const businessMetric: BusinessMetrics = {
      date: today,
      metrics: {
        totalUsers: 15000,
        activeUsers: 8500,
        newSignups: 150,
        churned: 45,
        retention: { day1: 0.85, day7: 0.72, day30: 0.58 },
        avgSessionDuration: 420, // seconds
        avgSessionsPerUser: 3.2,
        featuresAdoption: {
          meal_planning: 0.78,
          ai_chat: 0.65,
          health_tracking: 0.89,
          fitness_planning: 0.56,
        },
        avgWeightLoss: 2.1,
        avgAdherence: 0.74,
        healthGoalsAchieved: 0.43,
        aiInteractions: 12500,
        aiCosts: 89.50,
        modelUsage: {
          'gpt-3.5-turbo': 8500,
          'gpt-4': 3200,
          'claude-3-haiku': 1800,
        },
      },
    };
    
    this.businessMetrics.push(businessMetric);
    
    // Keep only last 90 days
    if (this.businessMetrics.length > 90) {
      this.businessMetrics = this.businessMetrics.slice(-90);
    }
  }

  private async checkAlertRules(category: string, data: any): Promise<void> {
    // Check relevant alert rules based on category
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (rule.enabled && this.shouldTriggerAlert(rule, data)) {
        await this.triggerAlert(rule, data);
      }
    }
  }

  private async checkAllAlertRules(): Promise<void> {
    // Check all alert rules with current system state
    this.logger.debug('Checking all alert rules');
  }

  private shouldTriggerAlert(rule: AlertRule, data: any): boolean {
    // Simplified alert rule evaluation
    const value = data[rule.condition.metric];
    if (value === undefined) return false;
    
    switch (rule.condition.operator) {
      case 'greater_than':
        return value > rule.condition.threshold;
      case 'less_than':
        return value < rule.condition.threshold;
      case 'equals':
        return value === rule.condition.threshold;
      case 'not_equals':
        return value !== rule.condition.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(rule: AlertRule, data: any): Promise<void> {
    this.logger.warn(`Alert triggered: ${rule.name}`, { rule: rule.id, data });
    
    // Update last triggered time
    rule.lastTriggered = new Date();
    this.alertRules.set(rule.id, rule);
    
    // Emit alert event
    this.eventEmitter.emit('analytics.alert', { rule, data });
  }

  private async cleanupOldData(): Promise<void> {
    // Clean up data older than retention period
    const retentionDays = this.configService.get('ANALYTICS_RETENTION_DAYS', 90);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    this.logger.debug(`Cleaning up analytics data older than ${retentionDays} days`);
    
    // Clean performance metrics
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoffDate);
  }

  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5% threshold',
        condition: {
          metric: 'errorRate',
          operator: 'greater_than',
          threshold: 0.05,
          timeWindow: 5,
        },
        channels: ['email'],
        enabled: true,
        severity: 'high',
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Average response time exceeds 2 seconds',
        condition: {
          metric: 'responseTime',
          operator: 'greater_than',
          threshold: 2000,
          timeWindow: 10,
        },
        channels: ['email'],
        enabled: true,
        severity: 'medium',
      },
      {
        id: 'low_daily_active_users',
        name: 'Low Daily Active Users',
        description: 'Daily active users below threshold',
        condition: {
          metric: 'activeUsers',
          operator: 'less_than',
          threshold: 5000,
          timeWindow: 60,
        },
        channels: ['email'],
        enabled: true,
        severity: 'medium',
      },
    ];

    defaultAlerts.forEach(alert => {
      this.alertRules.set(alert.id, alert);
    });
  }

  private initializeDefaultDashboards(): void {
    const defaultDashboard: Dashboard = {
      id: 'health_overview',
      name: 'Health Overview Dashboard',
      description: 'Key health and engagement metrics',
      widgets: [
        {
          id: 'active_users',
          type: 'metric',
          title: 'Daily Active Users',
          query: 'SELECT COUNT(DISTINCT user_id) FROM user_events WHERE date = CURRENT_DATE',
          visualization: {},
          position: { x: 0, y: 0, width: 3, height: 2 },
        },
        {
          id: 'health_metrics',
          type: 'chart',
          title: 'Health Metrics Trends',
          query: 'SELECT date, AVG(weight_loss) FROM health_metrics GROUP BY date ORDER BY date',
          visualization: {
            chartType: 'line',
            timeRange: '30d',
            groupBy: ['date'],
            aggregation: 'avg',
          },
          position: { x: 3, y: 0, width: 9, height: 4 },
        },
      ],
      filters: {},
      refreshInterval: 300,
      isPublic: false,
      createdBy: 'system',
      createdAt: new Date(),
    };

    this.dashboards.set(defaultDashboard.id, defaultDashboard);
  }
}