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

export interface ChatRateLimitConfig {
  messagesPerMinute: number;
  messagesPerHour: number;
  burstLimit: number; // Max consecutive messages
  burstWindowMs: number; // Time window for burst detection
}

class ChatRateLimitException extends HttpException {
  constructor(message: string, retryAfter?: number) {
    super(
      {
        message,
        error: 'Chat Rate Limit Exceeded',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Injectable()
export class ChatRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ChatRateLimitInterceptor.name);
  
  // Store user rate limit data: userId -> { timestamps: number[], burstCount: number, lastBurstReset: number }
  private readonly userLimits = new Map<string, {
    messageTimestamps: number[];
    burstCount: number;
    lastBurstReset: number;
  }>();

  private readonly defaultConfig: ChatRateLimitConfig = {
    messagesPerMinute: 10,
    messagesPerHour: 100,
    burstLimit: 3,
    burstWindowMs: 10000, // 10 seconds
  };

  constructor(
    private readonly tokenManagementService: TokenManagementService,
    private readonly reflector: Reflector,
  ) {
    // Cleanup expired data every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      // Allow request if no user (shouldn't happen with auth guard)
      return next.handle();
    }

    const userId = user.id;
    const now = Date.now();
    
    // Get or create rate limit data for user
    let userLimit = this.userLimits.get(userId);
    if (!userLimit) {
      userLimit = {
        messageTimestamps: [],
        burstCount: 0,
        lastBurstReset: now,
      };
      this.userLimits.set(userId, userLimit);
    }

    // Get user token stats to determine tier-based limits
    const tokenStats = await this.tokenManagementService.getUserTokenStats(userId);
    const config = this.getTierBasedConfig(tokenStats.userTier);

    // Check burst limit
    if (now - userLimit.lastBurstReset > config.burstWindowMs) {
      userLimit.burstCount = 0;
      userLimit.lastBurstReset = now;
    }

    if (userLimit.burstCount >= config.burstLimit) {
      const retryAfter = Math.ceil((config.burstWindowMs - (now - userLimit.lastBurstReset)) / 1000);
      this.logger.warn(`Burst limit exceeded for user ${userId}`);
      
      throw new ChatRateLimitException(
        `Too many messages in quick succession. Please wait ${retryAfter} seconds.`,
        retryAfter,
      );
    }

    // Clean old timestamps
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);
    
    userLimit.messageTimestamps = userLimit.messageTimestamps.filter(
      timestamp => timestamp > oneHourAgo
    );

    // Check hourly limit
    if (userLimit.messageTimestamps.length >= config.messagesPerHour) {
      const oldestTimestamp = userLimit.messageTimestamps[0];
      const retryAfter = Math.ceil((60 * 60 * 1000 - (now - oldestTimestamp)) / 1000);
      
      this.logger.warn(`Hourly limit exceeded for user ${userId}`);
      
      throw new ChatRateLimitException(
        `Hourly message limit of ${config.messagesPerHour} reached. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter,
      );
    }

    // Check per-minute limit
    const recentMessages = userLimit.messageTimestamps.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    if (recentMessages.length >= config.messagesPerMinute) {
      const oldestRecentTimestamp = recentMessages[0];
      const retryAfter = Math.ceil((60 * 1000 - (now - oldestRecentTimestamp)) / 1000);
      
      this.logger.warn(`Per-minute limit exceeded for user ${userId}`);
      
      throw new ChatRateLimitException(
        `Too many messages per minute. You can send ${config.messagesPerMinute} messages per minute. Please wait ${retryAfter} seconds.`,
        retryAfter,
      );
    }

    // If user is at token limit and using free tier, apply stricter limits
    if (tokenStats.shouldFallbackToFree) {
      const freeTierConfig = this.getFreeTierConfig();
      const freeRecentMessages = userLimit.messageTimestamps.filter(
        timestamp => timestamp > oneMinuteAgo
      );

      if (freeRecentMessages.length >= freeTierConfig.messagesPerMinute) {
        const retryAfter = Math.ceil((60 * 1000 - (now - freeRecentMessages[0])) / 1000);
        
        this.logger.warn(`Free tier limit exceeded for user ${userId}`);
        
        throw new ChatRateLimitException(
          `You've reached your token limit and are using free tier with reduced message limits (${freeTierConfig.messagesPerMinute}/min). Please wait ${retryAfter} seconds or upgrade your plan.`,
          retryAfter,
        );
      }
    }

    // Record this message
    userLimit.messageTimestamps.push(now);
    userLimit.burstCount++;

    return next.handle();
  }

  private getTierBasedConfig(userTier: string): ChatRateLimitConfig {
    switch (userTier) {
      case 'premium':
        return {
          messagesPerMinute: 20,
          messagesPerHour: 300,
          burstLimit: 5,
          burstWindowMs: 10000,
        };
      case 'enterprise':
        return {
          messagesPerMinute: 50,
          messagesPerHour: 1000,
          burstLimit: 10,
          burstWindowMs: 10000,
        };
      default: // free tier
        return this.defaultConfig;
    }
  }

  private getFreeTierConfig(): ChatRateLimitConfig {
    return {
      messagesPerMinute: 3,
      messagesPerHour: 30,
      burstLimit: 2,
      burstWindowMs: 15000, // 15 seconds
    };
  }

  private cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [userId, userLimit] of this.userLimits.entries()) {
      // Remove timestamps older than 1 hour
      userLimit.messageTimestamps = userLimit.messageTimestamps.filter(
        timestamp => timestamp > oneHourAgo
      );
      
      // Remove users with no recent activity
      if (userLimit.messageTimestamps.length === 0) {
        this.userLimits.delete(userId);
      }
    }
    
    this.logger.debug(`Cleaned up rate limit data. Active users: ${this.userLimits.size}`);
  }
}