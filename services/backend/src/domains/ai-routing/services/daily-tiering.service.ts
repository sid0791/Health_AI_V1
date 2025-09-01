import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Daily AI Usage Tiering Service
 * Implements cost control through daily limits with automatic reset
 */

export interface UserTier {
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  dailyLimits: {
    level1Requests: number; // High-cost AI requests
    level2Requests: number; // Standard AI requests
    totalTokens: number;
  };
  costLimits: {
    dailyMaxCost: number; // USD
    monthlyMaxCost: number; // USD
  };
  features: string[];
}

export interface DailyUsage {
  userId: string;
  date: string; // YYYY-MM-DD
  tier: string;
  usage: {
    level1Requests: number;
    level2Requests: number;
    totalTokens: number;
    totalCost: number;
  };
  limits: {
    level1Requests: number;
    level2Requests: number;
    totalTokens: number;
    dailyMaxCost: number;
  };
  resetTime: Date;
  isBlocked: boolean;
  blockReason?: string;
}

@Injectable()
export class DailyTieringService {
  private readonly logger = new Logger(DailyTieringService.name);

  private readonly tierConfigs: Record<string, UserTier> = {
    free: {
      tier: 'free',
      dailyLimits: {
        level1Requests: 5,
        level2Requests: 50,
        totalTokens: 10000,
      },
      costLimits: {
        dailyMaxCost: 1.0,
        monthlyMaxCost: 10.0,
      },
      features: ['basic_chat', 'meal_planning'],
    },
    basic: {
      tier: 'basic',
      dailyLimits: {
        level1Requests: 20,
        level2Requests: 200,
        totalTokens: 50000,
      },
      costLimits: {
        dailyMaxCost: 5.0,
        monthlyMaxCost: 50.0,
      },
      features: ['basic_chat', 'meal_planning', 'health_reports', 'fitness_planning'],
    },
    premium: {
      tier: 'premium',
      dailyLimits: {
        level1Requests: 100,
        level2Requests: 1000,
        totalTokens: 200000,
      },
      costLimits: {
        dailyMaxCost: 20.0,
        monthlyMaxCost: 200.0,
      },
      features: ['all_features', 'priority_support', 'advanced_analytics'],
    },
    enterprise: {
      tier: 'enterprise',
      dailyLimits: {
        level1Requests: 1000,
        level2Requests: 10000,
        totalTokens: 1000000,
      },
      costLimits: {
        dailyMaxCost: 100.0,
        monthlyMaxCost: 1000.0,
      },
      features: ['all_features', 'custom_integration', 'dedicated_support'],
    },
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private moduleRef: ModuleRef,
  ) {}

  /**
   * Check if user can make an AI request
   */
  async canMakeRequest(
    userId: string,
    requestLevel: 'level1' | 'level2',
    estimatedTokens: number,
    estimatedCost: number,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    remainingRequests?: number;
    remainingTokens?: number;
    resetTime?: Date;
  }> {
    const userTier = await this.getUserTier();
    const dailyUsage = await this.getDailyUsage(userId);

    // Check request limits
    const currentRequests =
      requestLevel === 'level1' ? dailyUsage.usage.level1Requests : dailyUsage.usage.level2Requests;

    const requestLimit =
      requestLevel === 'level1'
        ? dailyUsage.limits.level1Requests
        : dailyUsage.limits.level2Requests;

    if (currentRequests >= requestLimit) {
      return {
        allowed: false,
        reason: `Daily ${requestLevel} request limit exceeded (${requestLimit})`,
        remainingRequests: 0,
        resetTime: dailyUsage.resetTime,
      };
    }

    // Check token limits
    if (dailyUsage.usage.totalTokens + estimatedTokens > dailyUsage.limits.totalTokens) {
      return {
        allowed: false,
        reason: `Daily token limit would be exceeded`,
        remainingTokens: dailyUsage.limits.totalTokens - dailyUsage.usage.totalTokens,
        resetTime: dailyUsage.resetTime,
      };
    }

    // Check cost limits
    if (dailyUsage.usage.totalCost + estimatedCost > dailyUsage.limits.dailyMaxCost) {
      return {
        allowed: false,
        reason: `Daily cost limit would be exceeded`,
        resetTime: dailyUsage.resetTime,
      };
    }

    return {
      allowed: true,
      remainingRequests: requestLimit - currentRequests - 1,
      remainingTokens:
        dailyUsage.limits.totalTokens - dailyUsage.usage.totalTokens - estimatedTokens,
    };
  }

  /**
   * Record AI request usage
   */
  async recordUsage(
    userId: string,
    requestLevel: 'level1' | 'level2',
    tokensUsed: number,
    actualCost: number,
  ): Promise<void> {
    const dailyUsage = await this.getDailyUsage(userId);

    // Update usage counters
    if (requestLevel === 'level1') {
      dailyUsage.usage.level1Requests += 1;
    } else {
      dailyUsage.usage.level2Requests += 1;
    }

    dailyUsage.usage.totalTokens += tokensUsed;
    dailyUsage.usage.totalCost += actualCost;

    // Check if user should be blocked
    if (
      dailyUsage.usage.level1Requests >= dailyUsage.limits.level1Requests &&
      dailyUsage.usage.level2Requests >= dailyUsage.limits.level2Requests
    ) {
      dailyUsage.isBlocked = true;
      dailyUsage.blockReason = 'Daily request limits exceeded';
    } else if (dailyUsage.usage.totalCost >= dailyUsage.limits.dailyMaxCost) {
      dailyUsage.isBlocked = true;
      dailyUsage.blockReason = 'Daily cost limit exceeded';
    }

    // Cache updated usage
    const cacheKey = `daily_usage:${userId}:${dailyUsage.date}`;
    await this.cacheManager.set(cacheKey, dailyUsage, 86400); // 24 hours TTL

    this.logger.log(
      `Recorded usage for user ${userId}: ${requestLevel}, ${tokensUsed} tokens, $${actualCost}`,
    );
  }

  /**
   * Get current daily usage for user
   */
  async getDailyUsage(userId: string): Promise<DailyUsage> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cacheKey = `daily_usage:${userId}:${today}`;

    let dailyUsage = await this.cacheManager.get<DailyUsage>(cacheKey);

    if (!dailyUsage) {
      const userTier = await this.getUserTier();
      const tierConfig = this.tierConfigs[userTier];

      // Create new daily usage record
      dailyUsage = {
        userId,
        date: today,
        tier: userTier,
        usage: {
          level1Requests: 0,
          level2Requests: 0,
          totalTokens: 0,
          totalCost: 0,
        },
        limits: {
          level1Requests: tierConfig.dailyLimits.level1Requests,
          level2Requests: tierConfig.dailyLimits.level2Requests,
          totalTokens: tierConfig.dailyLimits.totalTokens,
          dailyMaxCost: tierConfig.costLimits.dailyMaxCost,
        },
        resetTime: this.getNextResetTime(),
        isBlocked: false,
      };

      await this.cacheManager.set(cacheKey, dailyUsage, 86400);
    }

    return dailyUsage;
  }

  /**
   * Get user tier with enhanced integration capabilities
   */
  private async getUserTier(userId?: string): Promise<string> {
    // Enhanced user service integration with fallback logic
    if (userId && this.configService.get('USER_SERVICE_ENABLED')) {
      try {
        // Integration point for user service
        const userService = this.moduleRef?.get('UsersService', { strict: false });
        if (userService && typeof userService.getUserTier === 'function') {
          const tier = await userService.getUserTier(userId);
          if (tier) return tier;
        }
      } catch (error) {
        this.logger.warn(`Failed to get user tier for ${userId}, using default: ${error.message}`);
      }
    }
    
    // Fallback to environment-based tier or default
    return this.configService.get('DEFAULT_USER_TIER', 'free');
  }

  /**
   * Get next reset time (midnight UTC)
   */
  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Daily reset job - runs at midnight UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyLimits(): Promise<void> {
    this.logger.log('Starting daily limits reset...');

    try {
      // Clear all cached daily usage records
      // In a real implementation, you'd want to be more selective
      // and possibly store historical data before clearing

      const cacheKeys = await this.getCacheKeysByPattern();
      for (const key of cacheKeys) {
        await this.cacheManager.del(key);
      }

      this.logger.log(`Reset ${cacheKeys.length} daily usage records`);
    } catch (error) {
      this.logger.error('Failed to reset daily limits', error);
    }
  }

  /**
   * Get usage statistics for admin dashboard
   */
  async getUsageStats(): Promise<{
    totalUsers: number;
    usersByTier: Record<string, number>;
    totalRequests: {
      level1: number;
      level2: number;
    };
    totalCost: number;
    blockedUsers: number;
  }> {
    // Enhanced admin statistics aggregation with caching
    try {
      const cacheKey = 'admin_usage_stats';
      const cached: any = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      // Aggregate statistics from cache and user service
      const allKeys = await this.cacheManager.store.keys('daily_usage:*');
      const usersByTier: Record<string, number> = { free: 0, premium: 0, pro: 0 };
      let totalRequests = { level1: 0, level2: 0 };
      let totalCost = 0;
      let blockedUsers = 0;

      for (const key of allKeys) {
        const usage: any = await this.cacheManager.get(key);
        if (usage) {
          const tier = await this.getUserTier(key.split(':')[1]);
          usersByTier[tier] = (usersByTier[tier] || 0) + 1;
          totalRequests.level1 += usage.level1 || 0;
          totalRequests.level2 += usage.level2 || 0;
          totalCost += usage.cost || 0;
          if (usage.blocked) blockedUsers++;
        }
      }

      const stats = {
        totalUsers: allKeys.length,
        usersByTier,
        totalRequests,
        totalCost,
        blockedUsers,
      };

      // Cache for 5 minutes
      await this.cacheManager.set(cacheKey, stats, 300);
      return stats;
    } catch (error) {
      this.logger.error('Failed to aggregate admin statistics', error);
      // Return fallback stats
      return {
        totalUsers: 0,
        usersByTier: { free: 0, premium: 0, pro: 0 },
        totalRequests: { level1: 0, level2: 0 },
        totalCost: 0,
        blockedUsers: 0,
      };
    }
  }

  /**
   * Helper to get cache keys by pattern (implementation depends on cache store)
   */
  private async getCacheKeysByPattern(): Promise<string[]> {
    // This is a simplified implementation
    // In production, you'd use Redis SCAN or similar
    return [];
  }
}
