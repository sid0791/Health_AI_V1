import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface SLOConfig {
  name: string;
  description: string;
  target: number; // percentage (0-100)
  window: number; // time window in seconds
  indicator: 'availability' | 'latency' | 'error_rate' | 'throughput';
  threshold?: number; // for latency indicators
}

export interface SLOStatus {
  name: string;
  current: number;
  target: number;
  status: 'healthy' | 'warning' | 'critical';
  errorBudget: number;
  violations: number;
  lastViolation?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[];
  cooldown: number; // seconds
  lastTriggered?: Date;
}

@Injectable()
export class MetricsCollectionService {
  private readonly logger = new Logger(MetricsCollectionService.name);
  private readonly metrics = new Map<string, MetricData[]>();
  private readonly slos = new Map<string, SLOConfig>();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly alertHistory = new Map<string, Array<{ timestamp: Date; message: string; resolved?: Date }>>();

  // Health AI specific metrics
  private readonly healthMetrics = {
    // User metrics
    active_users: 0,
    new_registrations: 0,
    user_sessions: 0,
    
    // Health data metrics
    health_data_syncs: 0,
    health_reports_processed: 0,
    meal_plans_generated: 0,
    fitness_plans_created: 0,
    
    // AI metrics
    ai_prompts_executed: 0,
    ai_tokens_consumed: 0,
    ai_cost_total: 0,
    ai_response_quality: 0,
    
    // System metrics
    api_requests_total: 0,
    api_response_time: 0,
    error_rate: 0,
    cache_hit_rate: 0,
    database_connections: 0,
    background_jobs_processed: 0,
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultSLOs();
    this.initializeDefaultAlerts();
    this.startMetricsCollection();
  }

  /**
   * Record a metric data point
   */
  recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {},
    type: MetricData['type'] = 'gauge'
  ): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      type,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 1000 data points per metric
    if (metricHistory.length > 1000) {
      metricHistory.splice(0, metricHistory.length - 1000);
    }

    // Update health metrics if applicable
    if (this.healthMetrics.hasOwnProperty(name)) {
      this.healthMetrics[name] = value;
    }

    this.logger.debug(`Recorded metric: ${name} = ${value}`);
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, tags: Record<string, string> = {}, increment: number = 1): void {
    const currentValue = this.getCurrentMetricValue(name) || 0;
    this.recordMetric(name, currentValue + increment, tags, 'counter');
  }

  /**
   * Record a histogram value (for response times, etc.)
   */
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric(name, value, tags, 'histogram');
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric(name, value, tags, 'gauge');
  }

  /**
   * Get current metric value
   */
  getCurrentMetricValue(name: string): number | null {
    const metricHistory = this.metrics.get(name);
    if (!metricHistory || metricHistory.length === 0) {
      return null;
    }
    
    return metricHistory[metricHistory.length - 1].value;
  }

  /**
   * Get metric history
   */
  getMetricHistory(name: string, timeWindow?: number): MetricData[] {
    const metricHistory = this.metrics.get(name) || [];
    
    if (!timeWindow) {
      return metricHistory;
    }

    const cutoff = Date.now() - timeWindow * 1000;
    return metricHistory.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Get all current metrics
   */
  getAllCurrentMetrics(): Record<string, number> {
    const current: Record<string, number> = {};
    
    for (const [name, history] of this.metrics.entries()) {
      if (history.length > 0) {
        current[name] = history[history.length - 1].value;
      }
    }

    return current;
  }

  /**
   * Calculate metric aggregations
   */
  calculateAggregation(
    name: string,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99',
    timeWindow: number = 3600 // 1 hour
  ): number {
    const values = this.getMetricHistory(name, timeWindow).map(m => m.value);
    
    if (values.length === 0) {
      return 0;
    }

    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'p50':
        return this.calculatePercentile(values, 0.5);
      case 'p95':
        return this.calculatePercentile(values, 0.95);
      case 'p99':
        return this.calculatePercentile(values, 0.99);
      default:
        return 0;
    }
  }

  /**
   * Initialize default SLOs for health application
   */
  private initializeDefaultSLOs(): void {
    const defaultSLOs: SLOConfig[] = [
      {
        name: 'api_availability',
        description: 'API should be available 99.9% of the time',
        target: 99.9,
        window: 86400, // 24 hours
        indicator: 'availability',
      },
      {
        name: 'api_latency_p95',
        description: 'P95 API response time should be under 2 seconds',
        target: 95.0,
        window: 3600, // 1 hour
        indicator: 'latency',
        threshold: 2000, // 2 seconds
      },
      {
        name: 'error_rate',
        description: 'Error rate should be under 1%',
        target: 99.0,
        window: 3600, // 1 hour
        indicator: 'error_rate',
      },
      {
        name: 'ai_response_quality',
        description: 'AI response quality should be above 85%',
        target: 85.0,
        window: 7200, // 2 hours
        indicator: 'throughput',
      },
      {
        name: 'health_data_sync_success',
        description: 'Health data sync success rate should be above 95%',
        target: 95.0,
        window: 86400, // 24 hours
        indicator: 'availability',
      },
    ];

    for (const slo of defaultSLOs) {
      this.slos.set(slo.name, slo);
    }

    this.logger.log(`Initialized ${defaultSLOs.length} default SLOs`);
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5% for 5 minutes',
        condition: 'error_rate > 5',
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack'],
        cooldown: 300, // 5 minutes
      },
      {
        id: 'slow_api_responses',
        name: 'Slow API Responses',
        description: 'P95 response time exceeds 3 seconds',
        condition: 'api_response_time_p95 > 3000',
        severity: 'medium',
        enabled: true,
        channels: ['slack'],
        cooldown: 600, // 10 minutes
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 90%',
        condition: 'memory_usage > 90',
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack'],
        cooldown: 300, // 5 minutes
      },
      {
        id: 'ai_cost_spike',
        name: 'AI Cost Spike',
        description: 'AI costs spike above threshold',
        condition: 'ai_cost_hourly > 100',
        severity: 'medium',
        enabled: true,
        channels: ['email'],
        cooldown: 1800, // 30 minutes
      },
      {
        id: 'health_data_sync_failure',
        name: 'Health Data Sync Failures',
        description: 'Health data sync failure rate exceeds 10%',
        condition: 'health_sync_error_rate > 10',
        severity: 'medium',
        enabled: true,
        channels: ['slack'],
        cooldown: 900, // 15 minutes
      },
    ];

    for (const alert of defaultAlerts) {
      this.alertRules.set(alert.id, alert);
    }

    this.logger.log(`Initialized ${defaultAlerts.length} default alert rules`);
  }

  /**
   * Check SLO status
   */
  checkSLOStatus(sloName: string): SLOStatus | null {
    const slo = this.slos.get(sloName);
    if (!slo) {
      return null;
    }

    let current = 0;
    let violations = 0;

    switch (slo.indicator) {
      case 'availability':
        current = this.calculateAvailability(slo.window);
        break;
      case 'latency':
        current = this.calculateLatencyCompliance(slo.threshold!, slo.window);
        break;
      case 'error_rate':
        current = 100 - this.calculateAggregation('error_rate', 'avg', slo.window);
        break;
      case 'throughput':
        current = this.calculateAggregation(sloName, 'avg', slo.window);
        break;
    }

    const status = current >= slo.target ? 'healthy' : 
                  current >= slo.target * 0.9 ? 'warning' : 'critical';
    
    const errorBudget = Math.max(0, 100 - slo.target - (100 - current));

    return {
      name: sloName,
      current: Math.round(current * 100) / 100,
      target: slo.target,
      status,
      errorBudget: Math.round(errorBudget * 100) / 100,
      violations,
    };
  }

  /**
   * Get all SLO statuses
   */
  getAllSLOStatuses(): SLOStatus[] {
    const statuses: SLOStatus[] = [];
    
    for (const sloName of this.slos.keys()) {
      const status = this.checkSLOStatus(sloName);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Evaluate alert rules
   */
  evaluateAlerts(): Array<{ alert: AlertRule; triggered: boolean; message: string }> {
    const results: Array<{ alert: AlertRule; triggered: boolean; message: string }> = [];
    
    for (const alert of this.alertRules.values()) {
      if (!alert.enabled) {
        continue;
      }

      // Check cooldown
      if (alert.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - alert.lastTriggered.getTime();
        if (timeSinceLastTrigger < alert.cooldown * 1000) {
          continue;
        }
      }

      const triggered = this.evaluateCondition(alert.condition);
      const message = triggered 
        ? `Alert triggered: ${alert.name} - ${alert.description}`
        : `Alert resolved: ${alert.name}`;

      if (triggered) {
        alert.lastTriggered = new Date();
        this.recordAlertEvent(alert.id, message);
      }

      results.push({ alert, triggered, message });
    }

    return results;
  }

  /**
   * Get health AI specific dashboard data
   */
  getHealthAIDashboard(): {
    userMetrics: Record<string, number>;
    healthDataMetrics: Record<string, number>;
    aiMetrics: Record<string, number>;
    systemMetrics: Record<string, number>;
    sloStatus: SLOStatus[];
    alerts: Array<{ severity: string; message: string; timestamp: Date }>;
  } {
    const userMetrics = {
      active_users: this.getCurrentMetricValue('active_users') || 0,
      new_registrations: this.getCurrentMetricValue('new_registrations') || 0,
      user_sessions: this.getCurrentMetricValue('user_sessions') || 0,
      daily_active_users: this.calculateAggregation('active_users', 'max', 86400),
    };

    const healthDataMetrics = {
      health_data_syncs: this.getCurrentMetricValue('health_data_syncs') || 0,
      health_reports_processed: this.getCurrentMetricValue('health_reports_processed') || 0,
      meal_plans_generated: this.getCurrentMetricValue('meal_plans_generated') || 0,
      fitness_plans_created: this.getCurrentMetricValue('fitness_plans_created') || 0,
      sync_success_rate: this.calculateAggregation('health_sync_success_rate', 'avg', 3600),
    };

    const aiMetrics = {
      ai_prompts_executed: this.getCurrentMetricValue('ai_prompts_executed') || 0,
      ai_tokens_consumed: this.getCurrentMetricValue('ai_tokens_consumed') || 0,
      ai_cost_total: this.getCurrentMetricValue('ai_cost_total') || 0,
      ai_response_quality: this.getCurrentMetricValue('ai_response_quality') || 0,
      hourly_ai_cost: this.calculateAggregation('ai_cost_total', 'sum', 3600),
    };

    const systemMetrics = {
      api_requests_total: this.getCurrentMetricValue('api_requests_total') || 0,
      api_response_time_p95: this.calculateAggregation('api_response_time', 'p95', 3600),
      error_rate: this.getCurrentMetricValue('error_rate') || 0,
      cache_hit_rate: this.getCurrentMetricValue('cache_hit_rate') || 0,
      database_connections: this.getCurrentMetricValue('database_connections') || 0,
      background_jobs_processed: this.getCurrentMetricValue('background_jobs_processed') || 0,
    };

    const sloStatus = this.getAllSLOStatuses();
    
    const alerts = this.getRecentAlerts(24); // Last 24 hours

    return {
      userMetrics,
      healthDataMetrics,
      aiMetrics,
      systemMetrics,
      sloStatus,
      alerts,
    };
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate availability percentage
   */
  private calculateAvailability(timeWindow: number): number {
    const successfulRequests = this.calculateAggregation('api_requests_successful', 'sum', timeWindow);
    const totalRequests = this.calculateAggregation('api_requests_total', 'sum', timeWindow);
    
    if (totalRequests === 0) {
      return 100; // No requests means 100% availability
    }
    
    return (successfulRequests / totalRequests) * 100;
  }

  /**
   * Calculate latency compliance percentage
   */
  private calculateLatencyCompliance(threshold: number, timeWindow: number): number {
    const responseTime = this.calculateAggregation('api_response_time', 'p95', timeWindow);
    return responseTime <= threshold ? 100 : Math.max(0, 100 - ((responseTime - threshold) / threshold) * 100);
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(condition: string): boolean {
    // Simple condition evaluation - in production, use a proper expression evaluator
    try {
      const parts = condition.split(' ');
      if (parts.length !== 3) {
        return false;
      }

      const [metric, operator, threshold] = parts;
      const currentValue = this.getCurrentMetricValue(metric) || 0;
      const thresholdValue = parseFloat(threshold);

      switch (operator) {
        case '>':
          return currentValue > thresholdValue;
        case '<':
          return currentValue < thresholdValue;
        case '>=':
          return currentValue >= thresholdValue;
        case '<=':
          return currentValue <= thresholdValue;
        case '==':
          return currentValue === thresholdValue;
        case '!=':
          return currentValue !== thresholdValue;
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${condition} - ${error.message}`);
      return false;
    }
  }

  /**
   * Record alert event
   */
  private recordAlertEvent(alertId: string, message: string): void {
    if (!this.alertHistory.has(alertId)) {
      this.alertHistory.set(alertId, []);
    }

    const history = this.alertHistory.get(alertId)!;
    history.push({ timestamp: new Date(), message });

    // Keep only last 100 events per alert
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Get recent alerts
   */
  private getRecentAlerts(hours: number): Array<{ severity: string; message: string; timestamp: Date }> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentAlerts: Array<{ severity: string; message: string; timestamp: Date }> = [];

    for (const [alertId, history] of this.alertHistory.entries()) {
      const alert = this.alertRules.get(alertId);
      if (!alert) continue;

      const recentEvents = history.filter(event => event.timestamp >= cutoff);
      for (const event of recentEvents) {
        recentAlerts.push({
          severity: alert.severity,
          message: event.message,
          timestamp: event.timestamp,
        });
      }
    }

    return recentAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Start automatic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Evaluate alerts every minute
    setInterval(() => {
      this.evaluateAlerts();
    }, 60000);

    this.logger.log('Started automatic metrics collection');
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      this.setGauge('memory_usage', heapUsage);
      this.setGauge('memory_heap_used', memoryUsage.heapUsed / 1024 / 1024); // MB
      this.setGauge('memory_heap_total', memoryUsage.heapTotal / 1024 / 1024); // MB
      
      const cpuUsage = process.cpuUsage();
      this.setGauge('cpu_usage', (cpuUsage.user + cpuUsage.system) / 1000000); // Convert to seconds
      
      this.setGauge('uptime', process.uptime());
    } catch (error) {
      this.logger.error(`Error collecting system metrics: ${error.message}`);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.alertHistory.clear();
    
    // Reset health metrics
    for (const key of Object.keys(this.healthMetrics)) {
      this.healthMetrics[key] = 0;
    }
    
    this.logger.log('Metrics collection service reset');
  }
}