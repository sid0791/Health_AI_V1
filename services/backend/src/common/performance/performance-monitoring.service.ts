import { Injectable, Logger } from '@nestjs/common';
import { PerformanceObserver, performance } from 'perf_hooks';

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errors: {
    count: number;
    rate: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  requestCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorCount: number;
  errorRate: number;
  responseTimes: number[];
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private readonly requestMetrics = new Map<string, {
    responseTimes: number[];
    errorCount: number;
    requestCount: number;
    lastHourRequests: Array<{ timestamp: number; responseTime: number; error: boolean }>;
  }>();

  private readonly globalMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    responseTimes: [] as number[],
    startTime: Date.now(),
  };

  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.initializeMonitoring();
    this.startMemoryMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    // Monitor HTTP requests
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      for (const entry of entries) {
        if (entry.entryType === 'measure' && entry.name.startsWith('http-')) {
          this.recordHttpMetric(entry.name, entry.duration);
        }
      }
    });

    this.performanceObserver.observe({ entryTypes: ['measure'] });
    this.logger.log('Performance monitoring initialized');
  }

  /**
   * Start performance measurement for a request
   */
  startMeasurement(identifier: string): void {
    performance.mark(`${identifier}-start`);
  }

  /**
   * End performance measurement for a request
   */
  endMeasurement(
    identifier: string,
    endpoint: string,
    method: string,
    statusCode: number
  ): number {
    const endMark = `${identifier}-end`;
    const measureName = `http-${method}-${endpoint}`;
    
    performance.mark(endMark);
    performance.measure(measureName, `${identifier}-start`, endMark);
    
    const measure = performance.getEntriesByName(measureName).pop();
    const duration = measure?.duration || 0;

    // Record metrics
    this.recordRequest(endpoint, method, duration, statusCode >= 400);

    // Clean up marks
    performance.clearMarks(`${identifier}-start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return duration;
  }

  /**
   * Record HTTP request metrics
   */
  private recordHttpMetric(name: string, duration: number): void {
    this.logger.debug(`HTTP metric: ${name} - ${duration.toFixed(2)}ms`);
  }

  /**
   * Record request metrics
   */
  recordRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    isError: boolean
  ): void {
    const key = `${method}:${endpoint}`;
    
    if (!this.requestMetrics.has(key)) {
      this.requestMetrics.set(key, {
        responseTimes: [],
        errorCount: 0,
        requestCount: 0,
        lastHourRequests: [],
      });
    }

    const metrics = this.requestMetrics.get(key)!;
    const now = Date.now();

    // Update endpoint metrics
    metrics.requestCount++;
    metrics.responseTimes.push(responseTime);
    metrics.lastHourRequests.push({
      timestamp: now,
      responseTime,
      error: isError,
    });

    if (isError) {
      metrics.errorCount++;
    }

    // Clean old data (keep only last hour)
    metrics.lastHourRequests = metrics.lastHourRequests.filter(
      req => now - req.timestamp < 3600000 // 1 hour
    );

    // Limit response times array size
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes = metrics.responseTimes.slice(-1000);
    }

    // Update global metrics
    this.globalMetrics.totalRequests++;
    this.globalMetrics.responseTimes.push(responseTime);
    
    if (isError) {
      this.globalMetrics.totalErrors++;
    }

    // Limit global response times array
    if (this.globalMetrics.responseTimes.length > 10000) {
      this.globalMetrics.responseTimes = this.globalMetrics.responseTimes.slice(-10000);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const responseTimes = this.globalMetrics.responseTimes;
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    
    const p50 = this.getPercentile(sortedTimes, 0.5);
    const p95 = this.getPercentile(sortedTimes, 0.95);
    const p99 = this.getPercentile(sortedTimes, 0.99);
    const avg = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    const min = sortedTimes[0] || 0;
    const max = sortedTimes[sortedTimes.length - 1] || 0;

    // Calculate throughput (requests in last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.countRecentRequests(oneMinuteAgo);
    const requestsPerSecond = recentRequests / 60;
    const requestsPerMinute = recentRequests;

    // Calculate error rate
    const errorRate = this.globalMetrics.totalRequests > 0 
      ? (this.globalMetrics.totalErrors / this.globalMetrics.totalRequests) * 100 
      : 0;

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;

    return {
      responseTime: {
        p50: Math.round(p50 * 100) / 100,
        p95: Math.round(p95 * 100) / 100,
        p99: Math.round(p99 * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
      },
      throughput: {
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        requestsPerMinute: Math.round(requestsPerMinute),
      },
      errors: {
        count: this.globalMetrics.totalErrors,
        rate: Math.round(errorRate * 100) / 100,
      },
      memory: {
        used: Math.round(usedMemory / 1024 / 1024 * 100) / 100, // MB
        free: Math.round(freeMemory / 1024 / 1024 * 100) / 100, // MB
        total: Math.round(totalMemory / 1024 / 1024 * 100) / 100, // MB
        usage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100, // %
      },
      cpu: {
        usage: this.getCPUUsage(),
        loadAverage: this.getLoadAverage(),
      },
    };
  }

  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics(): EndpointMetrics[] {
    const endpointMetrics: EndpointMetrics[] = [];

    for (const [key, metrics] of this.requestMetrics.entries()) {
      const [method, endpoint] = key.split(':');
      const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
      
      const avgResponseTime = metrics.responseTimes.length > 0
        ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
        : 0;
      
      const p95ResponseTime = this.getPercentile(sortedTimes, 0.95);
      const errorRate = metrics.requestCount > 0 
        ? (metrics.errorCount / metrics.requestCount) * 100 
        : 0;

      endpointMetrics.push({
        endpoint,
        method,
        requestCount: metrics.requestCount,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
        errorCount: metrics.errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        responseTimes: sortedTimes.slice(-100), // Last 100 response times
      });
    }

    return endpointMetrics.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Check if API meets performance targets
   */
  checkPerformanceTargets(): {
    p95Target: { met: boolean; current: number; target: number };
    errorRateTarget: { met: boolean; current: number; target: number };
    throughputTarget: { met: boolean; current: number; target: number };
    overall: boolean;
  } {
    const metrics = this.getMetrics();
    
    const p95Target = { met: metrics.responseTime.p95 < 2000, current: metrics.responseTime.p95, target: 2000 };
    const errorRateTarget = { met: metrics.errors.rate < 1, current: metrics.errors.rate, target: 1 };
    const throughputTarget = { met: metrics.throughput.requestsPerSecond > 10, current: metrics.throughput.requestsPerSecond, target: 10 };
    
    const overall = p95Target.met && errorRateTarget.met && throughputTarget.met;

    return {
      p95Target,
      errorRateTarget,
      throughputTarget,
      overall,
    };
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Count requests in time window
   */
  private countRecentRequests(since: number): number {
    let count = 0;
    
    for (const metrics of this.requestMetrics.values()) {
      count += metrics.lastHourRequests.filter(req => req.timestamp >= since).length;
    }
    
    return count;
  }

  /**
   * Get CPU usage (simplified)
   */
  private getCPUUsage(): number {
    // This is a simplified implementation
    // In production, you might use a more sophisticated CPU monitoring library
    const usage = process.cpuUsage();
    return Math.round((usage.user + usage.system) / 1000000 * 100) / 100;
  }

  /**
   * Get load average
   */
  private getLoadAverage(): number[] {
    try {
      const os = require('os');
      return os.loadavg();
    } catch {
      return [0, 0, 0];
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (heapUsagePercent > 90) {
        this.logger.warn(`High memory usage detected: ${heapUsagePercent.toFixed(2)}%`);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.requestMetrics.clear();
    this.globalMetrics.totalRequests = 0;
    this.globalMetrics.totalErrors = 0;
    this.globalMetrics.responseTimes = [];
    this.globalMetrics.startTime = Date.now();
    
    this.logger.log('Performance metrics reset');
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: PerformanceMetrics;
    endpoints: EndpointMetrics[];
    targets: any;
    uptime: number;
    recommendations: string[];
  } {
    const summary = this.getMetrics();
    const endpoints = this.getEndpointMetrics();
    const targets = this.checkPerformanceTargets();
    const uptime = Math.round((Date.now() - this.globalMetrics.startTime) / 1000);
    
    const recommendations = this.generateRecommendations(summary, endpoints, targets);

    return {
      summary,
      endpoints,
      targets,
      uptime,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    summary: PerformanceMetrics,
    endpoints: EndpointMetrics[],
    targets: any
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (!targets.p95Target.met) {
      recommendations.push('P95 response time exceeds 2s target. Consider optimizing slow endpoints or adding caching.');
    }

    // Error rate recommendations
    if (!targets.errorRateTarget.met) {
      recommendations.push('Error rate exceeds 1% target. Review error logs and improve error handling.');
    }

    // Memory recommendations
    if (summary.memory.usage > 80) {
      recommendations.push('High memory usage detected. Consider optimizing memory-intensive operations or increasing available memory.');
    }

    // Endpoint-specific recommendations
    const slowEndpoints = endpoints.filter(ep => ep.p95ResponseTime > 2000);
    if (slowEndpoints.length > 0) {
      recommendations.push(`Slow endpoints detected: ${slowEndpoints.map(ep => `${ep.method} ${ep.endpoint}`).join(', ')}`);
    }

    const errorProneEndpoints = endpoints.filter(ep => ep.errorRate > 5);
    if (errorProneEndpoints.length > 0) {
      recommendations.push(`High error rate endpoints: ${errorProneEndpoints.map(ep => `${ep.method} ${ep.endpoint}`).join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance targets are being met. Continue monitoring for optimal performance.');
    }

    return recommendations;
  }

  /**
   * Cleanup for graceful shutdown
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.logger.log('Performance monitoring service cleaned up');
  }
}