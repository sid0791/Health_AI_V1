import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../domains/auth/guards/jwt-auth.guard';
import { DistributedTracingService } from './distributed-tracing.service';
import { MetricsCollectionService } from './metrics-collection.service';
import { SecurityAnomalyDetectionService } from './security-anomaly-detection.service';
import { SyntheticTestingService } from './synthetic-testing.service';

@ApiTags('Observability & Monitoring')
@ApiBearerAuth()
@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly tracingService: DistributedTracingService,
    private readonly metricsService: MetricsCollectionService,
    private readonly securityService: SecurityAnomalyDetectionService,
    private readonly syntheticTestingService: SyntheticTestingService,
  ) {}

  // === DISTRIBUTED TRACING ENDPOINTS ===

  @Get('tracing/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get distributed tracing statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tracing statistics retrieved successfully',
  })
  async getTracingStats() {
    const stats = this.tracingService.getTraceStats();
    const serviceMap = this.tracingService.getServiceMap();

    return {
      success: true,
      stats,
      serviceMap,
      timestamp: new Date(),
    };
  }

  @Get('tracing/spans/active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active spans' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active spans retrieved successfully',
  })
  async getActiveSpans() {
    const activeSpans = this.tracingService.getActiveSpans();

    return {
      success: true,
      activeSpans,
      count: activeSpans.length,
      timestamp: new Date(),
    };
  }

  @Get('tracing/trace/:traceId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get trace by ID' })
  @ApiParam({ name: 'traceId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trace retrieved successfully',
  })
  async getTrace(@Param('traceId') traceId: string) {
    const trace = this.tracingService.getTrace(traceId);

    if (!trace) {
      return {
        success: false,
        error: 'Trace not found',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      trace,
      spanCount: trace.length,
      timestamp: new Date(),
    };
  }

  @Post('tracing/search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search traces by criteria' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Traces searched successfully',
  })
  async searchTraces(
    @Body()
    criteria: {
      operation?: string;
      service?: string;
      minDuration?: number;
      maxDuration?: number;
      status?: string;
      tag?: { key: string; value: any };
      timeRange?: { start: number; end: number };
    },
  ) {
    const traces = this.tracingService.searchTraces(criteria);

    return {
      success: true,
      traces,
      count: traces.length,
      criteria,
      timestamp: new Date(),
    };
  }

  @Get('tracing/export/:format')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Export traces in specific format' })
  @ApiParam({ name: 'format', enum: ['jaeger', 'zipkin', 'opentelemetry'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Traces exported successfully',
  })
  async exportTraces(@Param('format') format: 'jaeger' | 'zipkin' | 'opentelemetry') {
    const exportedTraces = this.tracingService.exportTraces(format);

    return {
      success: true,
      format,
      traces: exportedTraces,
      count: exportedTraces.length,
      timestamp: new Date(),
    };
  }

  // === METRICS COLLECTION ENDPOINTS ===

  @Get('metrics/current')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current metrics values' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current metrics retrieved successfully',
  })
  async getCurrentMetrics() {
    const metrics = this.metricsService.getAllCurrentMetrics();

    return {
      success: true,
      metrics,
      timestamp: new Date(),
    };
  }

  @Get('metrics/health-dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get health AI specific dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health dashboard data retrieved successfully',
  })
  async getHealthDashboard() {
    const dashboard = this.metricsService.getHealthAIDashboard();

    return {
      success: true,
      dashboard,
      timestamp: new Date(),
    };
  }

  @Get('metrics/slo-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get SLO status for all objectives' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SLO statuses retrieved successfully',
  })
  async getSLOStatus() {
    const sloStatuses = this.metricsService.getAllSLOStatuses();

    return {
      success: true,
      sloStatuses,
      timestamp: new Date(),
    };
  }

  @Post('metrics/record')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record custom metric' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metric recorded successfully',
  })
  async recordMetric(
    @Body()
    body: {
      name: string;
      value: number;
      tags?: Record<string, string>;
      type?: 'counter' | 'gauge' | 'histogram' | 'summary';
    },
  ) {
    this.metricsService.recordMetric(body.name, body.value, body.tags, body.type);

    return {
      success: true,
      message: 'Metric recorded',
      metric: body.name,
      timestamp: new Date(),
    };
  }

  @Get('metrics/alerts/evaluate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Evaluate alert rules and get triggered alerts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert evaluation completed',
  })
  async evaluateAlerts() {
    const results = this.metricsService.evaluateAlerts();

    return {
      success: true,
      alertResults: results,
      triggeredCount: results.filter((r) => r.triggered).length,
      timestamp: new Date(),
    };
  }

  // === SECURITY ANOMALY DETECTION ENDPOINTS ===

  @Get('security/metrics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get security metrics and statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security metrics retrieved successfully',
  })
  async getSecurityMetrics() {
    const metrics = this.securityService.getSecurityMetrics();

    return {
      success: true,
      metrics,
      timestamp: new Date(),
    };
  }

  @Get('security/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get security monitoring dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security dashboard retrieved successfully',
  })
  async getSecurityDashboard() {
    const dashboard = this.securityService.getSecurityDashboard();

    return {
      success: true,
      dashboard,
      timestamp: new Date(),
    };
  }

  @Post('security/events/search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search security events by criteria' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security events searched successfully',
  })
  async searchSecurityEvents(
    @Body()
    criteria: {
      type?: string;
      severity?: string;
      ipAddress?: string;
      userId?: string;
      status?: string;
      timeRange?: { start: Date; end: Date };
      limit?: number;
    },
  ) {
    const events = this.securityService.getEvents(criteria as any);

    return {
      success: true,
      events,
      count: events.length,
      criteria,
      timestamp: new Date(),
    };
  }

  @Put('security/events/:eventId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update security event status' })
  @ApiParam({ name: 'eventId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event status updated successfully',
  })
  async updateEventStatus(
    @Param('eventId') eventId: string,
    @Body() body: { status: 'open' | 'investigating' | 'resolved' | 'false_positive' },
  ) {
    const updated = this.securityService.updateEventStatus(eventId, body.status);

    if (!updated) {
      return {
        success: false,
        error: 'Event not found',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      eventId,
      newStatus: body.status,
      timestamp: new Date(),
    };
  }

  @Post('security/events/record')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a security event manually' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security event recorded successfully',
  })
  async recordSecurityEvent(
    @Body()
    body: {
      type:
        | 'auth_failure'
        | 'brute_force'
        | 'suspicious_ip'
        | 'data_access'
        | 'privilege_escalation'
        | 'unusual_activity';
      severity: 'low' | 'medium' | 'high' | 'critical';
      ipAddress: string;
      description: string;
      metadata?: Record<string, any>;
      userId?: string;
      userAgent?: string;
      endpoint?: string;
    },
  ) {
    const eventId = this.securityService.recordSecurityEvent(
      body.type,
      body.severity,
      body.ipAddress,
      body.description,
      body.metadata,
      body.userId,
      body.userAgent,
      body.endpoint,
    );

    return {
      success: true,
      eventId,
      message: 'Security event recorded',
      timestamp: new Date(),
    };
  }

  // === SYNTHETIC TESTING ENDPOINTS ===

  @Get('synthetic/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get synthetic testing dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Synthetic testing dashboard retrieved successfully',
  })
  async getSyntheticDashboard() {
    const dashboard = this.syntheticTestingService.getHealthDashboard();

    return {
      success: true,
      dashboard,
      timestamp: new Date(),
    };
  }

  @Get('synthetic/tests')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all synthetic test summaries' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test summaries retrieved successfully',
  })
  async getAllTestSummaries() {
    const summaries = this.syntheticTestingService.getAllTestSummaries();

    return {
      success: true,
      tests: summaries,
      count: summaries.length,
      timestamp: new Date(),
    };
  }

  @Post('synthetic/tests/:testId/run')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Run specific synthetic test' })
  @ApiParam({ name: 'testId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test executed successfully',
  })
  async runSyntheticTest(@Param('testId') testId: string) {
    try {
      const result = await this.syntheticTestingService.runTest(testId);

      return {
        success: true,
        testResult: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('synthetic/tests/:testId/results')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get test results for specific test' })
  @ApiParam({ name: 'testId', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test results retrieved successfully',
  })
  async getTestResults(@Param('testId') testId: string, @Query('limit') limit?: number) {
    const results = this.syntheticTestingService.getTestResults(testId, limit);
    const summary = this.syntheticTestingService.getTestSummary(testId);

    return {
      success: true,
      results,
      summary,
      count: results.length,
      timestamp: new Date(),
    };
  }

  @Put('synthetic/tests/:testId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enable/disable synthetic test' })
  @ApiParam({ name: 'testId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test status updated successfully',
  })
  async toggleSyntheticTest(@Param('testId') testId: string, @Body() body: { enabled: boolean }) {
    const updated = this.syntheticTestingService.toggleTest(testId, body.enabled);

    if (!updated) {
      return {
        success: false,
        error: 'Test not found',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      testId,
      enabled: body.enabled,
      timestamp: new Date(),
    };
  }

  // === COMPREHENSIVE MONITORING ENDPOINTS ===

  @Get('dashboard/overview')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get comprehensive monitoring overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monitoring overview retrieved successfully',
  })
  async getMonitoringOverview() {
    const tracingStats = this.tracingService.getTraceStats();
    const healthMetrics = this.metricsService.getHealthAIDashboard();
    const securityDashboard = this.securityService.getSecurityDashboard();
    const syntheticDashboard = this.syntheticTestingService.getHealthDashboard();

    return {
      success: true,
      overview: {
        tracing: {
          activeSpans: tracingStats.activeSpans,
          avgTraceDuration: tracingStats.avgTraceDuration,
          errorRate: tracingStats.errorRate,
        },
        metrics: {
          userMetrics: healthMetrics.userMetrics,
          systemMetrics: healthMetrics.systemMetrics,
          sloStatus: healthMetrics.sloStatus,
        },
        security: {
          summary: securityDashboard.summary,
          recentThreats: securityDashboard.recentThreats.slice(0, 5),
        },
        synthetic: {
          overview: syntheticDashboard.overview,
          recentFailures: syntheticDashboard.recentFailures.slice(0, 5),
        },
      },
      timestamp: new Date(),
    };
  }

  @Delete('reset-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset all observability data (for testing)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All observability data reset successfully',
  })
  async resetAllData() {
    this.tracingService.reset();
    this.metricsService.reset();
    this.securityService.reset();

    return {
      success: true,
      message: 'All observability data reset',
      timestamp: new Date(),
    };
  }
}
