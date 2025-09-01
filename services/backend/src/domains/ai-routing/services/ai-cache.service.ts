import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

/**
 * AI Cache and Reuse Service
 * Implements intelligent caching for Level 1 AI tasks to reduce costs and improve response times
 */

export interface CacheEntry {
  id: string;
  requestHash: string;
  requestType: string;
  prompt: string;
  promptHash: string;
  response: any;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    cost: number;
    responseTime: number;
    accuracy?: number;
    userTier: string;
  };
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  ttl: number; // seconds
  tags: string[];
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalSavings: {
    tokens: number;
    cost: number;
    responseTime: number;
  };
  topCachedTypes: Array<{
    type: string;
    count: number;
    savings: number;
  }>;
}

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private readonly CACHE_PREFIX = 'ai_cache:';
  private readonly STATS_KEY = 'ai_cache_stats';

  // Cache configuration for different request types
  private readonly cacheConfigs = {
    meal_plan_generation: {
      ttl: 86400, // 24 hours
      tags: ['meal_planning', 'nutrition'],
      smartMatching: true,
      similarityThreshold: 0.85,
    },
    health_report_analysis: {
      ttl: 604800, // 7 days
      tags: ['health_reports', 'analysis'],
      smartMatching: true,
      similarityThreshold: 0.9,
    },
    fitness_plan_generation: {
      ttl: 86400, // 24 hours
      tags: ['fitness', 'planning'],
      smartMatching: true,
      similarityThreshold: 0.8,
    },
    chat_response: {
      ttl: 3600, // 1 hour
      tags: ['chat', 'conversation'],
      smartMatching: false, // Exact matching only for chat
      similarityThreshold: 1.0,
    },
    nutrition_analysis: {
      ttl: 172800, // 48 hours
      tags: ['nutrition', 'analysis'],
      smartMatching: true,
      similarityThreshold: 0.95,
    },
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Check if a cached response exists for the request
   */
  async getCachedResponse(
    requestType: string,
    prompt: string,
    context: Record<string, any> = {},
    userTier: string = 'free',
  ): Promise<{
    hit: boolean;
    response?: any;
    metadata?: any;
    savings?: {
      tokens: number;
      cost: number;
      responseTime: number;
    };
  }> {
    try {
      const cacheKey = this.generateCacheKey(requestType, prompt, context);
      const config = this.cacheConfigs[requestType];

      if (!config) {
        this.logger.debug(`No cache config for request type: ${requestType}`);
        return { hit: false };
      }

      // Try exact match first
      let cacheEntry = await this.cacheManager.get<CacheEntry>(cacheKey);

      // If no exact match and smart matching is enabled, try similarity search
      if (!cacheEntry && config.smartMatching && config.similarityThreshold < 1.0) {
        cacheEntry = await this.findSimilarCacheEntry(
          requestType,
          prompt,
          context,
          config.similarityThreshold,
        );
      }

      if (cacheEntry) {
        // Update access metadata
        cacheEntry.lastAccessed = new Date();
        cacheEntry.accessCount += 1;

        // Refresh cache with updated metadata
        await this.cacheManager.set(cacheKey, cacheEntry, cacheEntry.ttl);

        // Update cache statistics
        await this.updateCacheStats(cacheEntry, true);

        this.logger.debug(`Cache hit for ${requestType}: ${cacheEntry.id}`);

        return {
          hit: true,
          response: cacheEntry.response,
          metadata: cacheEntry.metadata,
          savings: {
            tokens: cacheEntry.metadata.tokensUsed,
            cost: cacheEntry.metadata.cost,
            responseTime: cacheEntry.metadata.responseTime,
          },
        };
      }

      this.logger.debug(`Cache miss for ${requestType}`);
      return { hit: false };
    } catch (error) {
      this.logger.error('Error checking cache', error);
      return { hit: false };
    }
  }

  /**
   * Store AI response in cache
   */
  async cacheResponse(
    requestType: string,
    prompt: string,
    context: Record<string, any>,
    response: any,
    metadata: {
      provider: string;
      model: string;
      tokensUsed: number;
      cost: number;
      responseTime: number;
      accuracy?: number;
      userTier: string;
    },
  ): Promise<void> {
    try {
      const config = this.cacheConfigs[requestType];
      if (!config) {
        this.logger.debug(`No cache config for request type: ${requestType}, skipping cache`);
        return;
      }

      const cacheKey = this.generateCacheKey(requestType, prompt, context);
      const promptHash = this.generatePromptHash(prompt, context);

      const cacheEntry: CacheEntry = {
        id: this.generateCacheId(),
        requestHash: cacheKey,
        requestType,
        prompt,
        promptHash,
        response,
        metadata,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        ttl: config.ttl,
        tags: config.tags,
      };

      await this.cacheManager.set(cacheKey, cacheEntry, config.ttl);

      // Update cache statistics
      await this.updateCacheStats(cacheEntry, false);

      this.logger.debug(`Cached response for ${requestType}: ${cacheEntry.id}`);
    } catch (error) {
      this.logger.error('Error caching response', error);
    }
  }

  /**
   * Find similar cache entries using semantic similarity
   */
  private async findSimilarCacheEntry(
    requestType: string,
    prompt: string,
    context: Record<string, any>,
    threshold: number,
  ): Promise<CacheEntry | null> {
    // This is a simplified implementation
    // In production, you'd use vector embeddings and similarity search

    try {
      const allKeys = await this.getCacheKeysByPattern();
      const promptWords = this.tokenizePrompt(prompt);

      for (const key of allKeys) {
        const entry = await this.cacheManager.get<CacheEntry>(key);
        if (!entry) continue;

        const cachedWords = this.tokenizePrompt(entry.prompt);
        const similarity = this.calculateTextSimilarity(promptWords, cachedWords);

        if (similarity >= threshold) {
          this.logger.debug(`Found similar cache entry with similarity ${similarity}: ${entry.id}`);
          return entry;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error finding similar cache entries', error);
      return null;
    }
  }

  /**
   * Calculate text similarity (simplified Jaccard similarity)
   */
  private calculateTextSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Tokenize prompt for similarity comparison
   */
  private tokenizePrompt(prompt: string): string[] {
    return prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2); // Filter out short words
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(
    requestType: string,
    prompt: string,
    context: Record<string, any>,
  ): string {
    // Create a deterministic hash of the request
    const contextStr = JSON.stringify(context, Object.keys(context).sort());
    const combined = `${requestType}:${prompt}:${contextStr}`;
    const hash = createHash('sha256').update(combined).digest('hex');
    return `${this.CACHE_PREFIX}${requestType}:${hash}`;
  }

  /**
   * Generate prompt hash for similarity matching
   */
  private generatePromptHash(prompt: string, context: Record<string, any>): string {
    const combined = `${prompt}:${JSON.stringify(context)}`;
    return createHash('md5').update(combined).digest('hex');
  }

  /**
   * Generate unique cache entry ID
   */
  private generateCacheId(): string {
    return `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update cache statistics
   */
  private async updateCacheStats(entry: CacheEntry, isHit: boolean): Promise<void> {
    try {
      let stats = await this.cacheManager.get<CacheStats>(this.STATS_KEY);

      if (!stats) {
        stats = {
          totalEntries: 0,
          hitRate: 0,
          totalSavings: { tokens: 0, cost: 0, responseTime: 0 },
          topCachedTypes: [],
        };
      }

      if (isHit) {
        // Update hit rate and savings
        stats.totalSavings.tokens += entry.metadata.tokensUsed;
        stats.totalSavings.cost += entry.metadata.cost;
        stats.totalSavings.responseTime += entry.metadata.responseTime;
      } else {
        // New cache entry
        stats.totalEntries += 1;
      }

      // Update top cached types
      const typeIndex = stats.topCachedTypes.findIndex((t) => t.type === entry.requestType);
      if (typeIndex >= 0) {
        stats.topCachedTypes[typeIndex].count += 1;
        if (isHit) {
          stats.topCachedTypes[typeIndex].savings += entry.metadata.cost;
        }
      } else {
        stats.topCachedTypes.push({
          type: entry.requestType,
          count: 1,
          savings: isHit ? entry.metadata.cost : 0,
        });
      }

      await this.cacheManager.set(this.STATS_KEY, stats, 86400); // 24 hours TTL
    } catch (error) {
      this.logger.error('Error updating cache stats', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const stats = await this.cacheManager.get<CacheStats>(this.STATS_KEY);
    return (
      stats || {
        totalEntries: 0,
        hitRate: 0,
        totalSavings: { tokens: 0, cost: 0, responseTime: 0 },
        topCachedTypes: [],
      }
    );
  }

  /**
   * Clear cache for specific request type or all
   */
  async clearCache(requestType?: string): Promise<number> {
    try {
      const keys = await this.getCacheKeysByPattern();

      for (const key of keys) {
        await this.cacheManager.del(key);
      }

      this.logger.log(
        `Cleared ${keys.length} cache entries${requestType ? ` for ${requestType}` : ''}`,
      );
      return keys.length;
    } catch (error) {
      this.logger.error('Error clearing cache', error);
      return 0;
    }
  }

  /**
   * Get cache keys by pattern (implementation depends on cache store)
   */
  private async getCacheKeysByPattern(): Promise<string[]> {
    // This is a simplified implementation
    // In production with Redis, you'd use SCAN command
    // For now, return empty array
    return [];
  }

  /**
   * Preload common cache entries
   */
  async preloadCommonEntries(): Promise<void> {
    this.logger.log('Starting cache preload for common entries...');

    // This would involve identifying frequently requested patterns
    // and pre-generating responses for them during low-traffic periods

    // In a real implementation, you'd generate these responses
    // and cache them for faster access

    this.logger.log('Cache preload completed');
  }
}
