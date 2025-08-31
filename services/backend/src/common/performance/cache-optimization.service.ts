import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string;
  tags?: string[];
  compress?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  operations: number;
  avgResponseTime: number;
}

@Injectable()
export class CacheOptimizationService {
  private readonly logger = new Logger(CacheOptimizationService.name);
  private readonly stats = {
    hits: 0,
    misses: 0,
    operations: 0,
    totalResponseTime: 0,
  };

  // Cache TTL configurations by data type
  private readonly cacheTTLs = {
    user_profile: 3600, // 1 hour
    health_data: 1800, // 30 minutes
    meal_plans: 7200, // 2 hours
    fitness_plans: 7200, // 2 hours
    nutrition_advice: 3600, // 1 hour
    api_responses: 300, // 5 minutes
    static_content: 86400, // 24 hours
    temporary: 60, // 1 minute
  };

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get cached data with performance tracking
   */
  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const start = Date.now();
    this.stats.operations++;

    try {
      const cachedValue = await this.cacheManager.get<T>(key);
      const responseTime = Date.now() - start;
      this.stats.totalResponseTime += responseTime;

      if (cachedValue !== undefined) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT for key: ${key} (${responseTime}ms)`);
        return cachedValue;
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache MISS for key: ${key} (${responseTime}ms)`);
        return defaultValue;
      }
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Set cached data with smart TTL
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const ttl = options?.ttl || this.getSmartTTL(key);
      
      // Compress large objects if enabled
      const finalValue = options?.compress ? this.compressValue(value) : value;
      
      await this.cacheManager.set(key, finalValue, ttl * 1000); // Convert to milliseconds
      
      this.logger.debug(`Cache SET for key: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Get or set cached data (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }

    // Generate new value
    const start = Date.now();
    const newValue = await factory();
    const generationTime = Date.now() - start;

    // Cache the new value
    await this.set(key, newValue, options);
    
    this.logger.debug(`Generated and cached key: ${key} (${generationTime}ms)`);
    return newValue;
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // This would require a Redis-specific implementation
      // For now, log the operation
      this.logger.debug(`Cache DEL by pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache DEL by pattern error: ${error.message}`);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(): Promise<void> {
    this.logger.log('Starting cache warm-up...');
    
    try {
      // Warm up common static data
      const warmUpTasks = [
        this.warmUpStaticContent(),
        this.warmUpUserProfiles(),
        this.warmUpCommonQueries(),
      ];

      await Promise.all(warmUpTasks);
      this.logger.log('Cache warm-up completed');
    } catch (error) {
      this.logger.error(`Cache warm-up failed: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const hitRate = this.stats.operations > 0 
      ? (this.stats.hits / this.stats.operations) * 100 
      : 0;
    
    const avgResponseTime = this.stats.operations > 0 
      ? this.stats.totalResponseTime / this.stats.operations 
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      operations: this.stats.operations,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.operations = 0;
    this.stats.totalResponseTime = 0;
    this.logger.log('Cache statistics reset');
  }

  /**
   * Generate cache key for user-specific data
   */
  generateUserKey(userId: string, dataType: string, identifier?: string): string {
    const parts = ['user', userId, dataType];
    if (identifier) {
      parts.push(identifier);
    }
    return parts.join(':');
  }

  /**
   * Generate cache key for global data
   */
  generateGlobalKey(dataType: string, identifier?: string): string {
    const parts = ['global', dataType];
    if (identifier) {
      parts.push(identifier);
    }
    return parts.join(':');
  }

  /**
   * Get smart TTL based on key pattern
   */
  private getSmartTTL(key: string): number {
    for (const [pattern, ttl] of Object.entries(this.cacheTTLs)) {
      if (key.includes(pattern)) {
        return ttl;
      }
    }
    
    return this.cacheTTLs.temporary; // Default TTL
  }

  /**
   * Compress large values (placeholder implementation)
   */
  private compressValue<T>(value: T): T {
    // In a real implementation, you would use compression libraries
    // like zlib for large objects
    return value;
  }

  /**
   * Warm up static content
   */
  private async warmUpStaticContent(): Promise<void> {
    // Cache static content like templates, configurations, etc.
    const staticKeys = [
      'app:config',
      'templates:nutrition',
      'templates:fitness',
      'common:food_database',
    ];

    for (const key of staticKeys) {
      await this.set(key, `warmed_up_${key}`, { ttl: this.cacheTTLs.static_content });
    }
  }

  /**
   * Warm up common user profiles
   */
  private async warmUpUserProfiles(): Promise<void> {
    // This would typically load frequently accessed user profiles
    this.logger.debug('Warming up user profiles...');
  }

  /**
   * Warm up common queries
   */
  private async warmUpCommonQueries(): Promise<void> {
    // This would typically cache results of frequently executed queries
    this.logger.debug('Warming up common queries...');
  }

  /**
   * Cache health data with appropriate TTL
   */
  async cacheHealthData(userId: string, dataType: string, data: any): Promise<void> {
    const key = this.generateUserKey(userId, 'health_data', dataType);
    await this.set(key, data, { ttl: this.cacheTTLs.health_data });
  }

  /**
   * Cache meal plan with extended TTL
   */
  async cacheMealPlan(userId: string, planId: string, plan: any): Promise<void> {
    const key = this.generateUserKey(userId, 'meal_plan', planId);
    await this.set(key, plan, { ttl: this.cacheTTLs.meal_plans });
  }

  /**
   * Cache API response
   */
  async cacheAPIResponse(endpoint: string, params: string, response: any): Promise<void> {
    const key = `api:${endpoint}:${this.hashParams(params)}`;
    await this.set(key, response, { ttl: this.cacheTTLs.api_responses });
  }

  /**
   * Hash parameters for consistent cache keys
   */
  private hashParams(params: string): string {
    // Simple hash implementation - in production use a proper hash function
    return Buffer.from(params).toString('base64').substring(0, 10);
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    // In a real implementation, this would delete all keys matching user:${userId}:*
    this.logger.debug(`Invalidating cache for user: ${userId}`);
  }

  /**
   * Get cache hit rate report
   */
  getCacheReport(): {
    stats: CacheStats;
    recommendations: string[];
    performance: string;
  } {
    const stats = this.getCacheStats();
    const recommendations: string[] = [];
    let performance = 'Good';

    if (stats.hitRate < 50) {
      recommendations.push('Cache hit rate is low. Consider increasing TTL for frequently accessed data.');
      performance = 'Needs Improvement';
    }

    if (stats.avgResponseTime > 10) {
      recommendations.push('Cache response time is high. Consider optimizing cache infrastructure.');
      performance = 'Needs Improvement';
    }

    if (stats.hitRate > 80) {
      recommendations.push('Excellent cache performance. Consider expanding caching to more data types.');
      performance = 'Excellent';
    }

    return {
      stats,
      recommendations,
      performance,
    };
  }
}