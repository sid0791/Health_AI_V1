import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check database connection
      if (!this.dataSource.isInitialized) {
        throw new Error('Database not initialized');
      }

      // Test query execution time
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const queryTime = Date.now() - start;

      // Check connection pool status
      const poolStats = this.getConnectionPoolStats();

      // Health thresholds
      const maxQueryTime = 1000; // 1 second
      const maxPoolUsage = 0.8; // 80% of max connections

      const isHealthy = queryTime < maxQueryTime && poolStats.usageRatio < maxPoolUsage;

      const result = this.getStatus(key, isHealthy, {
        queryTime: `${queryTime}ms`,
        connectionPool: poolStats,
        database: this.dataSource.options.database,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Database health check failed', result);
      }

      return result;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      throw new HealthCheckError('Database health check failed', this.getStatus(key, false, {
        error: error.message,
      }));
    }
  }

  private getConnectionPoolStats() {
    const driver = this.dataSource.driver as any;
    const pool = driver.master || driver.pool;

    if (!pool) {
      return {
        totalConnections: 0,
        idleConnections: 0,
        activeConnections: 0,
        usageRatio: 0,
      };
    }

    const totalConnections = pool.options?.max || 20;
    const idleConnections = pool.idleCount || 0;
    const activeConnections = pool.totalCount || 0;
    const usageRatio = activeConnections / totalConnections;

    return {
      totalConnections,
      idleConnections,
      activeConnections,
      usageRatio: Math.round(usageRatio * 100) / 100,
    };
  }
}

@Injectable()
export class QueryOptimizationService {
  private readonly logger = new Logger(QueryOptimizationService.name);
  private readonly slowQueryThreshold = 1000; // 1 second
  private readonly queryMetrics = new Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    maxTime: number;
    slowQueries: number;
  }>();

  constructor(private readonly dataSource: DataSource) {
    this.initializeQueryLogging();
  }

  private initializeQueryLogging(): void {
    // Enable query logging for performance monitoring
    if (process.env.NODE_ENV === 'development') {
      this.dataSource.setOptions({
        ...this.dataSource.options,
        logging: ['query', 'error', 'warn', 'info', 'log'],
      });
    }
  }

  /**
   * Execute optimized query with performance tracking
   */
  async executeQuery<T>(
    query: string,
    parameters?: any[],
    queryName?: string
  ): Promise<T> {
    const start = Date.now();
    const name = queryName || this.generateQueryName(query);

    try {
      const result = await this.dataSource.query(query, parameters);
      const executionTime = Date.now() - start;

      this.trackQueryPerformance(name, executionTime);

      if (executionTime > this.slowQueryThreshold) {
        this.logger.warn(`Slow query detected: ${name} took ${executionTime}ms`);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - start;
      this.logger.error(`Query failed: ${name} after ${executionTime}ms - ${error.message}`);
      throw error;
    }
  }

  /**
   * Track query performance metrics
   */
  private trackQueryPerformance(queryName: string, executionTime: number): void {
    if (!this.queryMetrics.has(queryName)) {
      this.queryMetrics.set(queryName, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        slowQueries: 0,
      });
    }

    const metrics = this.queryMetrics.get(queryName)!;
    metrics.count++;
    metrics.totalTime += executionTime;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);

    if (executionTime > this.slowQueryThreshold) {
      metrics.slowQueries++;
    }
  }

  /**
   * Generate query name from SQL
   */
  private generateQueryName(query: string): string {
    const normalized = query.trim().toLowerCase();
    const operation = normalized.split(' ')[0];
    const table = this.extractTableName(normalized);
    return `${operation}_${table || 'unknown'}`;
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string | null {
    const selectMatch = query.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    const insertMatch = query.match(/insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    const updateMatch = query.match(/update\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    const deleteMatch = query.match(/delete\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);

    return selectMatch?.[1] || insertMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1] || null;
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(): Record<string, any> {
    const metrics = {};
    for (const [name, stats] of this.queryMetrics.entries()) {
      metrics[name] = {
        ...stats,
        avgTime: Math.round(stats.avgTime * 100) / 100,
      };
    }
    return metrics;
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(): Array<{
    name: string;
    avgTime: number;
    maxTime: number;
    slowQueryCount: number;
    totalExecutions: number;
  }> {
    return Array.from(this.queryMetrics.entries())
      .filter(([, stats]) => stats.slowQueries > 0)
      .map(([name, stats]) => ({
        name,
        avgTime: Math.round(stats.avgTime * 100) / 100,
        maxTime: stats.maxTime,
        slowQueryCount: stats.slowQueries,
        totalExecutions: stats.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime);
  }

  /**
   * Reset query metrics
   */
  resetMetrics(): void {
    this.queryMetrics.clear();
    this.logger.log('Query metrics reset');
  }

  /**
   * Optimize common query patterns
   */
  getOptimizedQuery(originalQuery: string): string {
    let optimized = originalQuery;

    // Add common optimizations
    optimized = this.addIndexHints(optimized);
    optimized = this.optimizeJoins(optimized);
    optimized = this.addLimitForLargeResults(optimized);

    return optimized;
  }

  private addIndexHints(query: string): string {
    // Add index hints for common patterns
    // This is a simplified example - real implementation would be more sophisticated
    return query;
  }

  private optimizeJoins(query: string): string {
    // Optimize JOIN operations
    // This is a simplified example - real implementation would analyze and optimize JOIN patterns
    return query;
  }

  private addLimitForLargeResults(query: string): string {
    // Add reasonable LIMIT to prevent large result sets
    if (query.toLowerCase().includes('select') && !query.toLowerCase().includes('limit')) {
      return `${query} LIMIT 1000`;
    }
    return query;
  }
}