import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { TerminusModule } from '@nestjs/terminus';

// Performance Services
import { DatabaseHealthIndicator, QueryOptimizationService } from './database-optimization.service';
import { CacheOptimizationService } from './cache-optimization.service';
import {
  CircuitBreakerService,
  TimeoutService,
  GracefulDegradationService,
} from './resilience.service';
import { BackgroundJobService } from './background-jobs.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { PerformanceController } from './performance.controller';

@Global()
@Module({
  imports: [
    TerminusModule,
    CacheModule.register(), // Basic cache configuration
  ],
  providers: [
    // Database & Query Optimization
    DatabaseHealthIndicator,
    QueryOptimizationService,

    // Caching
    CacheOptimizationService,

    // Resilience & Reliability
    CircuitBreakerService,
    TimeoutService,
    GracefulDegradationService,

    // Background Processing
    BackgroundJobService,

    // Monitoring
    PerformanceMonitoringService,
  ],
  controllers: [PerformanceController],
  exports: [
    DatabaseHealthIndicator,
    QueryOptimizationService,
    CacheOptimizationService,
    CircuitBreakerService,
    TimeoutService,
    GracefulDegradationService,
    BackgroundJobService,
    PerformanceMonitoringService,
  ],
})
export class PerformanceModule {}
