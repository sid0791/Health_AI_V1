import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

import { JwtAuthGuard } from '../../domains/auth/guards/jwt-auth.guard';
import { DatabaseHealthIndicator, QueryOptimizationService } from './database-optimization.service';
import { CacheOptimizationService } from './cache-optimization.service';
import { CircuitBreakerService, TimeoutService, GracefulDegradationService } from './resilience.service';
import { BackgroundJobService } from './background-jobs.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';

@ApiTags('Performance & Monitoring')
@ApiBearerAuth()
@Controller('performance')
export class PerformanceController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly memoryHealth: MemoryHealthIndicator,
    private readonly diskHealth: DiskHealthIndicator,
    private readonly queryOptimization: QueryOptimizationService,
    private readonly cacheOptimization: CacheOptimizationService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly timeoutService: TimeoutService,
    private readonly gracefulDegradation: GracefulDegradationService,
    private readonly backgroundJobs: BackgroundJobService,
    private readonly performanceMonitoring: PerformanceMonitoringService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get comprehensive health check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check completed',
  })
  @HealthCheck()
  async getHealthCheck() {
    return this.healthCheckService.check([
      () => this.databaseHealth.isHealthy('database'),
      () => this.memoryHealth.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memoryHealth.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.diskHealth.checkStorage('storage', { thresholdPercent: 0.8, path: '/' }),
    ]);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics() {
    const metrics = this.performanceMonitoring.getMetrics();
    const endpointMetrics = this.performanceMonitoring.getEndpointMetrics();
    const targets = this.performanceMonitoring.checkPerformanceTargets();

    return {
      success: true,
      metrics,
      endpointMetrics,
      targets,
      timestamp: new Date(),
    };
  }

  @Get('report')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get comprehensive performance report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance report generated successfully',
  })
  async getPerformanceReport() {
    const report = this.performanceMonitoring.getPerformanceReport();
    const cacheReport = this.cacheOptimization.getCacheReport();
    const queryMetrics = this.queryOptimization.getQueryMetrics();
    const circuitStats = this.circuitBreaker.getAllStats();
    const degradationStatus = this.gracefulDegradation.getDegradationStatus();
    const jobStats = await this.backgroundJobs.getQueueStats();

    return {
      success: true,
      performance: report,
      cache: cacheReport,
      database: {
        queryMetrics,
        slowQueries: this.queryOptimization.getSlowQueriesReport(),
      },
      resilience: {
        circuitBreakers: circuitStats,
        degradation: degradationStatus,
      },
      backgroundJobs: jobStats,
      timestamp: new Date(),
    };
  }

  @Get('cache/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache statistics retrieved successfully',
  })
  async getCacheStats() {
    const stats = this.cacheOptimization.getCacheStats();
    const report = this.cacheOptimization.getCacheReport();

    return {
      success: true,
      stats,
      report,
      timestamp: new Date(),
    };
  }

  @Post('cache/warmup')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Warm up cache with frequently accessed data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache warmup initiated successfully',
  })
  async warmUpCache() {
    await this.cacheOptimization.warmUpCache();

    return {
      success: true,
      message: 'Cache warmup completed',
      timestamp: new Date(),
    };
  }

  @Delete('cache/clear')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear cache and reset statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache cleared successfully',
  })
  async clearCache() {
    this.cacheOptimization.resetStats();

    return {
      success: true,
      message: 'Cache cleared and stats reset',
      timestamp: new Date(),
    };
  }

  @Get('circuit-breakers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get circuit breaker status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker statistics retrieved successfully',
  })
  async getCircuitBreakerStats() {
    const stats = this.circuitBreaker.getAllStats();

    return {
      success: true,
      circuitBreakers: stats,
      timestamp: new Date(),
    };
  }

  @Post('circuit-breakers/:name/reset')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset specific circuit breaker' })
  @ApiParam({ name: 'name', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker reset successfully',
  })
  async resetCircuitBreaker(@Param('name') name: string) {
    this.circuitBreaker.reset(name);

    return {
      success: true,
      message: `Circuit breaker ${name} reset`,
      timestamp: new Date(),
    };
  }

  @Get('degradation')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get graceful degradation status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Degradation status retrieved successfully',
  })
  async getDegradationStatus() {
    const status = this.gracefulDegradation.getDegradationStatus();

    return {
      success: true,
      degradation: status,
      timestamp: new Date(),
    };
  }

  @Post('degradation/reset')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset all service degradation levels' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Degradation levels reset successfully',
  })
  async resetDegradation() {
    this.gracefulDegradation.resetAll();

    return {
      success: true,
      message: 'All service degradation levels reset',
      timestamp: new Date(),
    };
  }

  @Get('jobs/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get background job statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job statistics retrieved successfully',
  })
  async getJobStats() {
    const stats = await this.backgroundJobs.getQueueStats();

    return {
      success: true,
      jobQueues: stats,
      timestamp: new Date(),
    };
  }

  @Post('jobs/schedule-health-jobs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Schedule health-related background jobs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health jobs scheduled successfully',
  })
  async scheduleHealthJobs() {
    await this.backgroundJobs.scheduleHealthJobs();

    return {
      success: true,
      message: 'Health-related jobs scheduled',
      timestamp: new Date(),
    };
  }

  @Post('jobs/add')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add background job to queue' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job added successfully',
  })
  async addJob(@Body() jobData: {
    type: string;
    payload: any;
    priority?: number;
    delay?: number;
    queueName?: string;
  }) {
    const jobId = await this.backgroundJobs.addJob({
      type: jobData.type,
      payload: jobData.payload,
      priority: jobData.priority,
      delay: jobData.delay,
    }, jobData.queueName);

    return {
      success: true,
      jobId,
      message: 'Job added to queue',
      timestamp: new Date(),
    };
  }

  @Get('database/query-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get database query performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Query metrics retrieved successfully',
  })
  async getQueryMetrics() {
    const metrics = this.queryOptimization.getQueryMetrics();
    const slowQueries = this.queryOptimization.getSlowQueriesReport();

    return {
      success: true,
      queryMetrics: metrics,
      slowQueries,
      timestamp: new Date(),
    };
  }

  @Delete('database/reset-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset database query metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Query metrics reset successfully',
  })
  async resetQueryMetrics() {
    this.queryOptimization.resetMetrics();

    return {
      success: true,
      message: 'Query metrics reset',
      timestamp: new Date(),
    };
  }

  @Delete('metrics/reset')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset all performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics reset successfully',
  })
  async resetMetrics() {
    this.performanceMonitoring.resetMetrics();
    this.cacheOptimization.resetStats();
    this.queryOptimization.resetMetrics();
    this.circuitBreaker.resetAll();
    this.gracefulDegradation.resetAll();

    return {
      success: true,
      message: 'All performance metrics reset',
      timestamp: new Date(),
    };
  }

  @Get('targets/check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if performance targets are being met' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance targets checked successfully',
  })
  async checkPerformanceTargets() {
    const targets = this.performanceMonitoring.checkPerformanceTargets();

    return {
      success: true,
      targets,
      overall: targets.overall,
      message: targets.overall 
        ? 'All performance targets are being met' 
        : 'Some performance targets are not being met',
      timestamp: new Date(),
    };
  }
}