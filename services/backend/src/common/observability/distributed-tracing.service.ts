import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  tags: Record<string, any>;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
}

export interface ServiceMap {
  serviceName: string;
  dependencies: Array<{
    service: string;
    operation: string;
    callCount: number;
    avgDuration: number;
    errorRate: number;
  }>;
}

@Injectable()
export class DistributedTracingService {
  private readonly logger = new Logger(DistributedTracingService.name);
  private readonly traces = new Map<string, TraceContext[]>();
  private readonly activeSpans = new Map<string, TraceContext>();
  private readonly serviceDependencies = new Map<string, Map<string, {
    callCount: number;
    totalDuration: number;
    errorCount: number;
  }>>();

  private readonly serviceName: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get('SERVICE_NAME', 'health-ai-backend');
    this.logger.log('Distributed tracing service initialized');
  }

  /**
   * Start a new trace span
   */
  startSpan(
    operation: string,
    parentContext?: { traceId: string; spanId: string },
    tags: Record<string, any> = {}
  ): TraceContext {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = parentContext?.spanId;

    const span: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      operation,
      tags: {
        service: this.serviceName,
        ...tags,
      },
      startTime: Date.now(),
      status: 'success',
    };

    // Store active span
    this.activeSpans.set(spanId, span);

    // Initialize trace if it doesn't exist
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }

    // Add span to trace
    this.traces.get(traceId)!.push(span);

    this.logger.debug(`Started span: ${operation} (trace: ${traceId}, span: ${spanId})`);
    return span;
  }

  /**
   * Finish a trace span
   */
  finishSpan(
    spanId: string,
    status: 'success' | 'error' | 'timeout' = 'success',
    error?: string,
    additionalTags?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      this.logger.warn(`Span ${spanId} not found`);
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    span.error = error;

    if (additionalTags) {
      span.tags = { ...span.tags, ...additionalTags };
    }

    // Remove from active spans
    this.activeSpans.delete(spanId);

    // Track service dependencies
    this.trackServiceDependency(span);

    this.logger.debug(
      `Finished span: ${span.operation} (${span.duration}ms, status: ${status})`
    );

    // Clean up old traces
    this.cleanupOldTraces();
  }

  /**
   * Add tag to active span
   */
  addTag(spanId: string, key: string, value: any): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add error to active span
   */
  addError(spanId: string, error: Error | string): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.status = 'error';
      span.error = typeof error === 'string' ? error : error.message;
      span.tags.error = true;
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): TraceContext[] | null {
    return this.traces.get(traceId) || null;
  }

  /**
   * Get all active spans
   */
  getActiveSpans(): TraceContext[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Get trace statistics
   */
  getTraceStats(): {
    totalTraces: number;
    activeSpans: number;
    avgTraceDuration: number;
    errorRate: number;
    operationStats: Record<string, {
      count: number;
      avgDuration: number;
      errorRate: number;
    }>;
  } {
    const allSpans = Array.from(this.traces.values()).flat();
    const completedSpans = allSpans.filter(span => span.endTime);

    const totalTraces = this.traces.size;
    const activeSpans = this.activeSpans.size;
    const avgTraceDuration = completedSpans.length > 0 
      ? completedSpans.reduce((sum, span) => sum + (span.duration || 0), 0) / completedSpans.length
      : 0;
    const errorRate = completedSpans.length > 0
      ? (completedSpans.filter(span => span.status === 'error').length / completedSpans.length) * 100
      : 0;

    // Operation statistics
    const operationStats: Record<string, {
      count: number;
      avgDuration: number;
      errorRate: number;
    }> = {};

    for (const span of completedSpans) {
      if (!operationStats[span.operation]) {
        operationStats[span.operation] = {
          count: 0,
          avgDuration: 0,
          errorRate: 0,
        };
      }

      const stats = operationStats[span.operation];
      stats.count++;
      stats.avgDuration = ((stats.avgDuration * (stats.count - 1)) + (span.duration || 0)) / stats.count;
    }

    // Calculate error rates for operations
    for (const operation of Object.keys(operationStats)) {
      const operationSpans = completedSpans.filter(span => span.operation === operation);
      const errorCount = operationSpans.filter(span => span.status === 'error').length;
      operationStats[operation].errorRate = (errorCount / operationSpans.length) * 100;
    }

    return {
      totalTraces,
      activeSpans,
      avgTraceDuration: Math.round(avgTraceDuration * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      operationStats,
    };
  }

  /**
   * Get service dependency map
   */
  getServiceMap(): ServiceMap {
    const dependencies: Array<{
      service: string;
      operation: string;
      callCount: number;
      avgDuration: number;
      errorRate: number;
    }> = [];

    for (const [serviceName, operations] of this.serviceDependencies.entries()) {
      for (const [operation, stats] of operations.entries()) {
        dependencies.push({
          service: serviceName,
          operation,
          callCount: stats.callCount,
          avgDuration: stats.totalDuration / stats.callCount,
          errorRate: (stats.errorCount / stats.callCount) * 100,
        });
      }
    }

    return {
      serviceName: this.serviceName,
      dependencies: dependencies.sort((a, b) => b.callCount - a.callCount),
    };
  }

  /**
   * Search traces by criteria
   */
  searchTraces(criteria: {
    operation?: string;
    service?: string;
    minDuration?: number;
    maxDuration?: number;
    status?: string;
    tag?: { key: string; value: any };
    timeRange?: { start: number; end: number };
  }): TraceContext[] {
    const allSpans = Array.from(this.traces.values()).flat();
    
    return allSpans.filter(span => {
      // Operation filter
      if (criteria.operation && span.operation !== criteria.operation) {
        return false;
      }

      // Service filter
      if (criteria.service && span.tags.service !== criteria.service) {
        return false;
      }

      // Duration filters
      if (criteria.minDuration && (span.duration || 0) < criteria.minDuration) {
        return false;
      }
      if (criteria.maxDuration && (span.duration || 0) > criteria.maxDuration) {
        return false;
      }

      // Status filter
      if (criteria.status && span.status !== criteria.status) {
        return false;
      }

      // Tag filter
      if (criteria.tag && span.tags[criteria.tag.key] !== criteria.tag.value) {
        return false;
      }

      // Time range filter
      if (criteria.timeRange) {
        if (span.startTime < criteria.timeRange.start || span.startTime > criteria.timeRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track service dependency
   */
  private trackServiceDependency(span: TraceContext): void {
    const service = span.tags.targetService || 'internal';
    const operation = span.operation;

    if (!this.serviceDependencies.has(service)) {
      this.serviceDependencies.set(service, new Map());
    }

    const serviceOperations = this.serviceDependencies.get(service)!;
    
    if (!serviceOperations.has(operation)) {
      serviceOperations.set(operation, {
        callCount: 0,
        totalDuration: 0,
        errorCount: 0,
      });
    }

    const stats = serviceOperations.get(operation)!;
    stats.callCount++;
    stats.totalDuration += span.duration || 0;
    
    if (span.status === 'error') {
      stats.errorCount++;
    }
  }

  /**
   * Clean up old traces (keep only last 1000 traces)
   */
  private cleanupOldTraces(): void {
    if (this.traces.size > 1000) {
      const traceIds = Array.from(this.traces.keys());
      const oldestTraces = traceIds.slice(0, this.traces.size - 1000);
      
      for (const traceId of oldestTraces) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * Export traces for external systems (Jaeger, Zipkin, etc.)
   */
  exportTraces(format: 'jaeger' | 'zipkin' | 'opentelemetry' = 'opentelemetry'): any[] {
    const allSpans = Array.from(this.traces.values()).flat();
    
    switch (format) {
      case 'opentelemetry':
        return this.exportOpenTelemetry(allSpans);
      case 'jaeger':
        return this.exportJaeger(allSpans);
      case 'zipkin':
        return this.exportZipkin(allSpans);
      default:
        return allSpans;
    }
  }

  /**
   * Export in OpenTelemetry format
   */
  private exportOpenTelemetry(spans: TraceContext[]): any[] {
    return spans.map(span => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      operationName: span.operation,
      startTime: span.startTime * 1000, // Convert to microseconds
      finishTime: span.endTime ? span.endTime * 1000 : undefined,
      duration: span.duration ? span.duration * 1000 : undefined,
      tags: span.tags,
      logs: span.error ? [{ timestamp: span.endTime, fields: { error: span.error } }] : [],
      status: {
        code: span.status === 'success' ? 0 : 1,
        message: span.error || '',
      },
    }));
  }

  /**
   * Export in Jaeger format
   */
  private exportJaeger(spans: TraceContext[]): any[] {
    return spans.map(span => ({
      traceID: span.traceId,
      spanID: span.spanId,
      parentSpanID: span.parentSpanId,
      operationName: span.operation,
      startTime: span.startTime * 1000,
      duration: span.duration ? span.duration * 1000 : 0,
      tags: Object.entries(span.tags).map(([key, value]) => ({
        key,
        type: typeof value === 'string' ? 'string' : 'number',
        value: String(value),
      })),
      process: {
        serviceName: this.serviceName,
        tags: [],
      },
    }));
  }

  /**
   * Export in Zipkin format
   */
  private exportZipkin(spans: TraceContext[]): any[] {
    return spans.map(span => ({
      traceId: span.traceId,
      id: span.spanId,
      parentId: span.parentSpanId,
      name: span.operation,
      timestamp: span.startTime * 1000,
      duration: span.duration ? span.duration * 1000 : undefined,
      kind: 'SERVER',
      localEndpoint: {
        serviceName: this.serviceName,
      },
      tags: span.tags,
      annotations: span.error ? [{
        timestamp: span.endTime! * 1000,
        value: 'error',
      }] : [],
    }));
  }

  /**
   * Clear all traces and reset
   */
  reset(): void {
    this.traces.clear();
    this.activeSpans.clear();
    this.serviceDependencies.clear();
    this.logger.log('Distributed tracing data reset');
  }
}