import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  blocked: boolean;
}

@Injectable()
export class Level1RateLimitService {
  private readonly logger = new Logger(Level1RateLimitService.name);

  // Rate limiting configuration for Level 1 APIs (health-critical)
  private readonly RATE_LIMITS = {
    perMinute: 3, // 3 requests per minute
    perHour: 15, // 15 requests per hour
    perDay: 50, // 50 requests per day
    cooldownSeconds: 20, // 20 seconds cooldown between requests
  };

  private readonly CACHE_PREFIXES = {
    minute: 'level1_rate_min_',
    hour: 'level1_rate_hour_',
    day: 'level1_rate_day_',
    cooldown: 'level1_cooldown_',
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Check if user can make a Level 1 API request
   * Implements strict rate limiting for expensive health analysis calls
   */
  async checkRateLimit(userId: string): Promise<RateLimitInfo> {
    this.logger.debug(`Checking Level 1 rate limit for user: ${userId}`);

    // Check cooldown period (20 seconds between requests)
    const cooldownKey = `${this.CACHE_PREFIXES.cooldown}${userId}`;
    const cooldownRemaining = await this.cacheManager.get<number>(cooldownKey);

    if (cooldownRemaining) {
      const waitTime = Math.ceil(cooldownRemaining / 1000);
      this.logger.warn(`User ${userId} hit Level 1 cooldown, ${waitTime}s remaining`);

      return {
        remaining: 0,
        resetTime: Date.now() + cooldownRemaining,
        blocked: true,
      };
    }

    // Check per-minute limit (3 requests)
    const minuteLimit = await this.checkTimeBasedLimit(
      userId,
      'minute',
      this.RATE_LIMITS.perMinute,
      60,
    );
    if (minuteLimit.blocked) {
      return minuteLimit;
    }

    // Check per-hour limit (15 requests)
    const hourLimit = await this.checkTimeBasedLimit(
      userId,
      'hour',
      this.RATE_LIMITS.perHour,
      3600,
    );
    if (hourLimit.blocked) {
      return hourLimit;
    }

    // Check per-day limit (50 requests)
    const dayLimit = await this.checkTimeBasedLimit(userId, 'day', this.RATE_LIMITS.perDay, 86400);
    if (dayLimit.blocked) {
      return dayLimit;
    }

    // User is within all rate limits
    return {
      remaining: Math.min(minuteLimit.remaining, hourLimit.remaining, dayLimit.remaining),
      resetTime: Math.min(minuteLimit.resetTime, hourLimit.resetTime, dayLimit.resetTime),
      blocked: false,
    };
  }

  /**
   * Record a Level 1 API request and update rate limit counters
   */
  async recordRequest(userId: string): Promise<void> {
    this.logger.debug(`Recording Level 1 API request for user: ${userId}`);

    const now = Date.now();

    // Set cooldown period (20 seconds)
    const cooldownKey = `${this.CACHE_PREFIXES.cooldown}${userId}`;
    await this.cacheManager.set(
      cooldownKey,
      this.RATE_LIMITS.cooldownSeconds * 1000,
      this.RATE_LIMITS.cooldownSeconds,
    );

    // Increment counters for all time windows
    await this.incrementCounter(userId, 'minute', 60);
    await this.incrementCounter(userId, 'hour', 3600);
    await this.incrementCounter(userId, 'day', 86400);

    this.logger.debug(
      `Level 1 request recorded for user ${userId} with ${this.RATE_LIMITS.cooldownSeconds}s cooldown`,
    );
  }

  /**
   * Get rate limit status for user (for displaying in UI)
   */
  async getRateLimitStatus(userId: string): Promise<{
    perMinute: RateLimitInfo;
    perHour: RateLimitInfo;
    perDay: RateLimitInfo;
    cooldownRemaining: number;
    nextAllowedRequest: Date;
  }> {
    const cooldownKey = `${this.CACHE_PREFIXES.cooldown}${userId}`;
    const cooldownRemaining = (await this.cacheManager.get<number>(cooldownKey)) || 0;

    const perMinute = await this.checkTimeBasedLimit(
      userId,
      'minute',
      this.RATE_LIMITS.perMinute,
      60,
    );
    const perHour = await this.checkTimeBasedLimit(userId, 'hour', this.RATE_LIMITS.perHour, 3600);
    const perDay = await this.checkTimeBasedLimit(userId, 'day', this.RATE_LIMITS.perDay, 86400);

    const nextAllowedRequest = new Date(
      Date.now() +
        Math.max(
          cooldownRemaining,
          perMinute.blocked ? perMinute.resetTime - Date.now() : 0,
          perHour.blocked ? perHour.resetTime - Date.now() : 0,
          perDay.blocked ? perDay.resetTime - Date.now() : 0,
        ),
    );

    return {
      perMinute,
      perHour,
      perDay,
      cooldownRemaining,
      nextAllowedRequest,
    };
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  async resetRateLimits(userId: string): Promise<void> {
    this.logger.warn(`Resetting Level 1 rate limits for user: ${userId}`);

    const keys = [
      `${this.CACHE_PREFIXES.minute}${userId}`,
      `${this.CACHE_PREFIXES.hour}${userId}`,
      `${this.CACHE_PREFIXES.day}${userId}`,
      `${this.CACHE_PREFIXES.cooldown}${userId}`,
    ];

    for (const key of keys) {
      await this.cacheManager.del(key);
    }

    this.logger.warn(`Level 1 rate limits reset for user: ${userId}`);
  }

  /**
   * Throw rate limit exception with detailed message
   */
  throwRateLimitException(userId: string, rateLimitInfo: RateLimitInfo): never {
    const waitTimeSeconds = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000);
    const message = `Level 1 API rate limit exceeded. Please wait ${waitTimeSeconds} seconds before your next health analysis request. Level 1 APIs are rate-limited to ensure high-quality health analysis while managing costs.`;

    this.logger.warn(
      `Level 1 rate limit exceeded for user ${userId}: ${waitTimeSeconds}s wait required`,
    );

    throw new BadRequestException({
      message,
      rateLimitInfo,
      nextAllowedRequest: new Date(rateLimitInfo.resetTime).toISOString(),
      waitTimeSeconds,
      rateLimitType: 'level_1_health_analysis',
    });
  }

  // Private helper methods

  private async checkTimeBasedLimit(
    userId: string,
    timeWindow: 'minute' | 'hour' | 'day',
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitInfo> {
    const key = `${this.CACHE_PREFIXES[timeWindow]}${userId}`;
    const currentCount = (await this.cacheManager.get<number>(key)) || 0;

    const blocked = currentCount >= limit;
    const remaining = Math.max(0, limit - currentCount);

    // Calculate reset time based on window size
    const now = Date.now();
    const windowStart = this.getWindowStart(now, windowSeconds);
    const resetTime = windowStart + windowSeconds * 1000;

    return {
      remaining,
      resetTime,
      blocked,
    };
  }

  private async incrementCounter(
    userId: string,
    timeWindow: 'minute' | 'hour' | 'day',
    ttlSeconds: number,
  ): Promise<void> {
    const key = `${this.CACHE_PREFIXES[timeWindow]}${userId}`;
    const currentCount = (await this.cacheManager.get<number>(key)) || 0;

    await this.cacheManager.set(key, currentCount + 1, ttlSeconds);
  }

  private getWindowStart(timestamp: number, windowSeconds: number): number {
    if (windowSeconds === 60) {
      // minute window
      const date = new Date(timestamp);
      date.setSeconds(0, 0);
      return date.getTime();
    } else if (windowSeconds === 3600) {
      // hour window
      const date = new Date(timestamp);
      date.setMinutes(0, 0, 0);
      return date.getTime();
    } else if (windowSeconds === 86400) {
      // day window
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }

    // Default: round down to window boundary
    return Math.floor(timestamp / (windowSeconds * 1000)) * (windowSeconds * 1000);
  }
}
