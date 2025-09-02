import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { TokenManagementService } from '../../users/services/token-management.service';

export interface Level1RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  burstWindowMs: number;
  cooldownPeriodMs: number; // Required cooldown between Level 1 requests
}

export interface Level1RequestMetadata {
  timestamp: number;
  analysisType: string;
  tokensCost: number;
  processingTimeMs: number;
}

class Level1RateLimitException extends HttpException {
  constructor(message: string, retryAfter?: number) {
    super(
      {
        message,
        error: 'Level 1 AI Rate Limit Exceeded',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        retryAfter,
        rateLimitType: 'level1_ai_requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Injectable()
export class Level1AIRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(Level1AIRateLimitInterceptor.name);

  // Store Level 1 request data: userId -> { requests: Level1RequestMetadata[] }
  private readonly userLevel1Requests = new Map<
    string,
    {
      requests: Level1RequestMetadata[];
      lastRequestTime: number;
      consecutiveRequests: number;
      dailyTokensUsed: number;
      lastDailyReset: number;
    }
  >();

  private readonly defaultConfig: Level1RateLimitConfig = {
    requestsPerMinute: 3, // Very conservative for health-critical AI
    requestsPerHour: 15,
    requestsPerDay: 50,
    burstLimit: 2, // Max 2 consecutive Level 1 requests
    burstWindowMs: 30000, // 30 seconds between bursts
    cooldownPeriodMs: 20000, // 20 seconds minimum between Level 1 requests
  };

  constructor(
    private readonly tokenManagementService: TokenManagementService,
    private readonly reflector: Reflector,
  ) {
    // Cleanup expired data every 15 minutes
    setInterval(() => this.cleanup(), 15 * 60 * 1000);
    
    // Reset daily counters at midnight
    setInterval(() => this.resetDailyCounters(), 60 * 60 * 1000);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (!user?.id) {
      return next.handle();
    }

    // Check if this is a Level 1 AI request (health-critical)
    const isLevel1Request = this.isLevel1AIRequest(body, request.url);
    
    if (!isLevel1Request) {
      // Not a Level 1 request, proceed without additional rate limiting
      return next.handle();
    }

    const userId = user.id;
    const now = Date.now();

    this.logger.debug(`Level 1 AI request from user ${userId}`);

    // Get or create Level 1 request tracking for user
    let userTracking = this.userLevel1Requests.get(userId);
    if (!userTracking) {
      userTracking = {
        requests: [],
        lastRequestTime: 0,
        consecutiveRequests: 0,
        dailyTokensUsed: 0,
        lastDailyReset: now,
      };
      this.userLevel1Requests.set(userId, userTracking);
    }

    // Reset daily counters if needed
    if (this.shouldResetDaily(userTracking.lastDailyReset, now)) {
      userTracking.dailyTokensUsed = 0;
      userTracking.lastDailyReset = now;
    }

    // Get user token stats and tier-based limits
    const tokenStats = await this.tokenManagementService.getUserTokenStats(userId);
    const config = this.getTierBasedLevel1Config(tokenStats.userTier);

    // Check cooldown period between Level 1 requests
    const timeSinceLastRequest = now - userTracking.lastRequestTime;
    if (timeSinceLastRequest < config.cooldownPeriodMs) {
      const retryAfter = Math.ceil((config.cooldownPeriodMs - timeSinceLastRequest) / 1000);
      
      this.logger.warn(`Level 1 cooldown period not met for user ${userId}: ${retryAfter}s remaining`);
      
      throw new Level1RateLimitException(
        `Health analysis requests require a ${Math.ceil(config.cooldownPeriodMs / 1000)}-second cooldown period. Please wait ${retryAfter} seconds.`,
        retryAfter,
      );
    }

    // Check burst protection
    if (timeSinceLastRequest < config.burstWindowMs) {
      userTracking.consecutiveRequests++;
    } else {
      userTracking.consecutiveRequests = 1;
    }

    if (userTracking.consecutiveRequests > config.burstLimit) {
      const retryAfter = Math.ceil(config.burstWindowMs / 1000);
      
      this.logger.warn(`Level 1 burst limit exceeded for user ${userId}`);
      
      throw new Level1RateLimitException(
        `Too many consecutive health analysis requests. Please wait ${retryAfter} seconds for comprehensive AI processing.`,
        retryAfter,
      );
    }

    // Clean old requests and check rate limits
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    userTracking.requests = userTracking.requests.filter(req => req.timestamp > oneDayAgo);

    // Check daily limit
    const todaysRequests = userTracking.requests.filter(req => req.timestamp > oneDayAgo);
    if (todaysRequests.length >= config.requestsPerDay) {
      const oldestTodayRequest = todaysRequests[0];
      const retryAfter = Math.ceil((24 * 60 * 60 * 1000 - (now - oldestTodayRequest.timestamp)) / 1000);
      
      this.logger.warn(`Level 1 daily limit exceeded for user ${userId}`);
      
      throw new Level1RateLimitException(
        `Daily health analysis limit of ${config.requestsPerDay} reached. This protects AI resources for health-critical analysis. Try again in ${Math.ceil(retryAfter / 3600)} hours.`,
        retryAfter,
      );
    }

    // Check hourly limit
    const recentHourRequests = userTracking.requests.filter(req => req.timestamp > oneHourAgo);
    if (recentHourRequests.length >= config.requestsPerHour) {
      const oldestHourRequest = recentHourRequests[0];
      const retryAfter = Math.ceil((60 * 60 * 1000 - (now - oldestHourRequest.timestamp)) / 1000);
      
      this.logger.warn(`Level 1 hourly limit exceeded for user ${userId}`);
      
      throw new Level1RateLimitException(
        `Hourly health analysis limit of ${config.requestsPerHour} reached. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter,
      );
    }

    // Check per-minute limit
    const recentMinuteRequests = userTracking.requests.filter(req => req.timestamp > oneMinuteAgo);
    if (recentMinuteRequests.length >= config.requestsPerMinute) {
      const oldestMinuteRequest = recentMinuteRequests[0];
      const retryAfter = Math.ceil((60 * 1000 - (now - oldestMinuteRequest.timestamp)) / 1000);
      
      this.logger.warn(`Level 1 per-minute limit exceeded for user ${userId}`);
      
      throw new Level1RateLimitException(
        `Health analysis rate limit: ${config.requestsPerMinute} requests per minute. Please wait ${retryAfter} seconds.`,
        retryAfter,
      );
    }

    // Check if user has exceeded token budget for Level 1 requests
    const estimatedTokenCost = this.estimateLevel1TokenCost(body);
    const remainingDailyTokens = this.getDailyLevel1TokenLimit(tokenStats.userTier) - userTracking.dailyTokensUsed;
    
    if (estimatedTokenCost > remainingDailyTokens) {
      this.logger.warn(`Level 1 daily token budget exceeded for user ${userId}`);
      
      throw new Level1RateLimitException(
        `Daily token budget for health analysis exceeded. Estimated cost: ${estimatedTokenCost}, remaining: ${remainingDailyTokens}. Resets at midnight.`,
        24 * 60 * 60, // 24 hours
      );
    }

    // Record this Level 1 request
    const requestMetadata: Level1RequestMetadata = {
      timestamp: now,
      analysisType: this.extractAnalysisType(body),
      tokensCost: estimatedTokenCost,
      processingTimeMs: 0, // Will be updated after processing
    };

    userTracking.requests.push(requestMetadata);
    userTracking.lastRequestTime = now;
    userTracking.dailyTokensUsed += estimatedTokenCost;

    this.logger.log(
      `Level 1 AI request approved for user ${userId}: ${requestMetadata.analysisType} (estimated cost: ${estimatedTokenCost} tokens)`,
    );

    // Add request metadata to context for post-processing
    request.level1RequestMetadata = requestMetadata;

    return next.handle();
  }

  /**
   * Update request metadata after processing completion
   */
  updateRequestMetadata(userId: string, requestMetadata: Level1RequestMetadata, actualTokens: number, processingTime: number): void {
    const userTracking = this.userLevel1Requests.get(userId);
    if (userTracking) {
      // Find and update the request
      const requestIndex = userTracking.requests.findIndex(
        req => req.timestamp === requestMetadata.timestamp && req.analysisType === requestMetadata.analysisType
      );
      
      if (requestIndex !== -1) {
        userTracking.requests[requestIndex].tokensCost = actualTokens;
        userTracking.requests[requestIndex].processingTimeMs = processingTime;
        
        // Adjust daily token usage
        const tokenDifference = actualTokens - requestMetadata.tokensCost;
        userTracking.dailyTokensUsed += tokenDifference;
      }
    }
  }

  /**
   * Get Level 1 request statistics for user
   */
  getLevel1RequestStats(userId: string): {
    todayRequests: number;
    todayTokensUsed: number;
    averageProcessingTime: number;
    mostCommonAnalysisTypes: Array<{ type: string; count: number }>;
    remainingDailyRequests: number;
    remainingDailyTokens: number;
  } | null {
    const userTracking = this.userLevel1Requests.get(userId);
    if (!userTracking) {
      return null;
    }

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const todaysRequests = userTracking.requests.filter(req => req.timestamp > oneDayAgo);

    const analysisTypeCounts = new Map<string, number>();
    let totalProcessingTime = 0;

    todaysRequests.forEach(req => {
      const count = analysisTypeCounts.get(req.analysisType) || 0;
      analysisTypeCounts.set(req.analysisType, count + 1);
      totalProcessingTime += req.processingTimeMs;
    });

    const mostCommonAnalysisTypes = Array.from(analysisTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const config = this.defaultConfig; // Would get user-specific config in production
    
    return {
      todayRequests: todaysRequests.length,
      todayTokensUsed: userTracking.dailyTokensUsed,
      averageProcessingTime: todaysRequests.length > 0 ? totalProcessingTime / todaysRequests.length : 0,
      mostCommonAnalysisTypes,
      remainingDailyRequests: Math.max(0, config.requestsPerDay - todaysRequests.length),
      remainingDailyTokens: Math.max(0, this.getDailyLevel1TokenLimit('free') - userTracking.dailyTokensUsed),
    };
  }

  private isLevel1AIRequest(body: any, url: string): boolean {
    // Check for health-critical analysis patterns
    if (url.includes('/health-analysis') || url.includes('/report-analysis')) {
      return true;
    }

    // Check message content for health report keywords
    const healthCriticalKeywords = [
      'health report', 'blood test', 'lab results', 'biomarker',
      'deficiency', 'micronutrient', 'vitamin', 'mineral',
      'cholesterol', 'glucose', 'hba1c', 'thyroid',
      'liver function', 'kidney function', 'hormone',
      'what does my report say', 'analyze my results',
      'health summary', 'medical analysis'
    ];

    const message = (body?.message || '').toLowerCase();
    
    return healthCriticalKeywords.some(keyword => message.includes(keyword));
  }

  private getTierBasedLevel1Config(userTier: string): Level1RateLimitConfig {
    switch (userTier) {
      case 'premium':
        return {
          requestsPerMinute: 5,
          requestsPerHour: 25,
          requestsPerDay: 100,
          burstLimit: 3,
          burstWindowMs: 20000, // 20 seconds
          cooldownPeriodMs: 15000, // 15 seconds
        };
      case 'enterprise':
        return {
          requestsPerMinute: 8,
          requestsPerHour: 50,
          requestsPerDay: 200,
          burstLimit: 5,
          burstWindowMs: 15000, // 15 seconds
          cooldownPeriodMs: 10000, // 10 seconds
        };
      default: // free tier
        return this.defaultConfig;
    }
  }

  private getDailyLevel1TokenLimit(userTier: string): number {
    switch (userTier) {
      case 'premium':
        return 50000; // 50k tokens for Level 1 requests
      case 'enterprise':
        return 100000; // 100k tokens for Level 1 requests
      default:
        return 10000; // 10k tokens for free tier
    }
  }

  private estimateLevel1TokenCost(body: any): number {
    // Estimate token cost based on request complexity
    const baseTokens = 2000; // Base Level 1 analysis cost
    const message = body?.message || '';
    const messageTokens = Math.ceil(message.length / 4);
    
    // Health report analysis typically needs more tokens
    if (this.isHealthReportAnalysis(body)) {
      return baseTokens + messageTokens + 1000; // Additional tokens for report analysis
    }
    
    return baseTokens + messageTokens;
  }

  private isHealthReportAnalysis(body: any): boolean {
    const message = (body?.message || '').toLowerCase();
    return message.includes('report') || message.includes('analysis') || message.includes('summary');
  }

  private extractAnalysisType(body: any): string {
    const message = (body?.message || '').toLowerCase();
    
    if (message.includes('deficiency') || message.includes('vitamin') || message.includes('mineral')) {
      return 'nutrient_analysis';
    }
    if (message.includes('summary') || message.includes('overall')) {
      return 'health_summary';
    }
    if (message.includes('biomarker') || message.includes('blood') || message.includes('lab')) {
      return 'biomarker_analysis';
    }
    if (message.includes('risk') || message.includes('concern')) {
      return 'risk_assessment';
    }
    
    return 'general_health_analysis';
  }

  private shouldResetDaily(lastReset: number, now: number): boolean {
    const lastResetDate = new Date(lastReset);
    const nowDate = new Date(now);
    
    return lastResetDate.getDate() !== nowDate.getDate();
  }

  private cleanup(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [userId, userTracking] of this.userLevel1Requests.entries()) {
      // Remove requests older than 24 hours
      userTracking.requests = userTracking.requests.filter(req => req.timestamp > oneDayAgo);

      // Remove users with no recent Level 1 activity
      if (userTracking.requests.length === 0) {
        this.userLevel1Requests.delete(userId);
      }
    }

    this.logger.debug(`Level 1 rate limit cleanup completed. Active users: ${this.userLevel1Requests.size}`);
  }

  private resetDailyCounters(): void {
    const now = Date.now();
    
    for (const [userId, userTracking] of this.userLevel1Requests.entries()) {
      if (this.shouldResetDaily(userTracking.lastDailyReset, now)) {
        userTracking.dailyTokensUsed = 0;
        userTracking.lastDailyReset = now;
      }
    }

    this.logger.debug('Daily Level 1 token counters reset');
  }
}