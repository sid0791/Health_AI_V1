import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { User } from '../entities/user.entity';
import { 
  UserTokenUsage, 
  TokenUsageType, 
  TokenProvider 
} from '../entities/user-token-usage.entity';

export interface TokenConsumptionRequest {
  userId: string;
  usageType: TokenUsageType;
  provider: TokenProvider;
  inputTokens: number;
  outputTokens: number;
  modelName: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface TokenUsageStats {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  isAtLimit: boolean;
  shouldFallbackToFree: boolean;
  userTier: string;
}

@Injectable()
export class TokenManagementService {
  private readonly logger = new Logger(TokenManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTokenUsage)
    private readonly tokenUsageRepository: Repository<UserTokenUsage>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if user can consume the specified number of tokens
   */
  async canConsumeTokens(userId: string, tokenCount: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Update counters if needed
    await this.updateUserTokenCounters(user);

    return user.canConsumeTokens(tokenCount);
  }

  /**
   * Record token consumption and update user counters
   */
  async consumeTokens(request: TokenConsumptionRequest): Promise<{
    success: boolean;
    usedFreeTier: boolean;
    remainingTokens: { daily: number; monthly: number };
  }> {
    const user = await this.userRepository.findOne({ where: { id: request.userId } });
    if (!user) {
      throw new Error(`User not found: ${request.userId}`);
    }

    const totalTokens = request.inputTokens + request.outputTokens;
    
    // Update counters if needed
    await this.updateUserTokenCounters(user);

    // Check if we should use free tier
    const shouldUseFree = user.shouldFallbackToFreeTier();
    const isFreeTier = this.isFreeTierProvider(request.provider) || shouldUseFree;

    // If not free tier, check if user can consume tokens
    if (!isFreeTier && !user.canConsumeTokens(totalTokens)) {
      // If fallback is enabled, use free tier
      if (user.fallbackToFreeTier) {
        return this.consumeTokens({
          ...request,
          provider: this.getFallbackProvider(request.provider),
        });
      } else {
        return {
          success: false,
          usedFreeTier: false,
          remainingTokens: {
            daily: user.getRemainingDailyTokens(),
            monthly: user.getRemainingMonthlyTokens(),
          },
        };
      }
    }

    // Record the token usage
    const tokenUsage = UserTokenUsage.create({
      userId: request.userId,
      usageType: request.usageType,
      provider: request.provider,
      inputTokens: request.inputTokens,
      outputTokens: request.outputTokens,
      costUsd: this.calculateCost(request.provider, request.inputTokens, request.outputTokens),
      sessionId: request.sessionId,
      requestId: request.requestId,
      modelName: request.modelName,
      isFreeTier,
      metadata: request.metadata,
    });

    await this.tokenUsageRepository.save(tokenUsage);

    // Update user token counters only for paid tier usage
    if (!isFreeTier) {
      user.consumeTokens(totalTokens);
      await this.userRepository.save(user);
    }

    this.logger.log(`Token consumption recorded: ${totalTokens} tokens for user ${request.userId} (free tier: ${isFreeTier})`);

    return {
      success: true,
      usedFreeTier: isFreeTier,
      remainingTokens: {
        daily: user.getRemainingDailyTokens(),
        monthly: user.getRemainingMonthlyTokens(),
      },
    };
  }

  /**
   * Get user token usage statistics
   */
  async getUserTokenStats(userId: string): Promise<TokenUsageStats> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    await this.updateUserTokenCounters(user);

    return {
      dailyUsed: user.dailyTokensUsed,
      dailyLimit: user.dailyTokenLimit,
      dailyRemaining: user.getRemainingDailyTokens(),
      monthlyUsed: user.monthlyTokensUsed,
      monthlyLimit: user.monthlyTokenLimit,
      monthlyRemaining: user.getRemainingMonthlyTokens(),
      isAtLimit: !user.canConsumeTokens(1),
      shouldFallbackToFree: user.shouldFallbackToFreeTier(),
      userTier: user.userTier,
    };
  }

  /**
   * Get detailed token usage history for a user
   */
  async getUserTokenHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ): Promise<UserTokenUsage[]> {
    const query = this.tokenUsageRepository.createQueryBuilder('usage')
      .where('usage.userId = :userId', { userId })
      .orderBy('usage.createdAt', 'DESC')
      .limit(limit);

    if (startDate && endDate) {
      query.andWhere('usage.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Reset daily tokens for all users (called by scheduled job)
   */
  async resetDailyTokensForAllUsers(): Promise<void> {
    await this.userRepository.update(
      {},
      {
        dailyTokensUsed: 0,
        lastTokenResetDate: new Date(),
      },
    );
    this.logger.log('Daily tokens reset for all users');
  }

  /**
   * Reset monthly tokens for all users (called by scheduled job)
   */
  async resetMonthlyTokensForAllUsers(): Promise<void> {
    await this.userRepository.update(
      {},
      {
        monthlyTokensUsed: 0,
        lastTokenResetDate: new Date(),
      },
    );
    this.logger.log('Monthly tokens reset for all users');
  }

  /**
   * Update user token counters if needed (daily/monthly resets)
   */
  private async updateUserTokenCounters(user: User): Promise<void> {
    const today = new Date();
    const needsUpdate = !user.lastTokenResetDate || 
      user.lastTokenResetDate.toDateString() !== today.toDateString() ||
      user.lastTokenResetDate.getMonth() !== today.getMonth();

    if (needsUpdate) {
      const shouldResetDaily = !user.lastTokenResetDate || 
        user.lastTokenResetDate.toDateString() !== today.toDateString();
      
      const shouldResetMonthly = !user.lastTokenResetDate || 
        user.lastTokenResetDate.getMonth() !== today.getMonth();

      if (shouldResetDaily) {
        user.resetDailyTokens();
      }
      
      if (shouldResetMonthly) {
        user.resetMonthlyTokens();
      }

      await this.userRepository.save(user);
    }
  }

  /**
   * Check if provider is a free tier provider
   */
  private isFreeTierProvider(provider: TokenProvider): boolean {
    const freeTierProviders = [
      TokenProvider.HUGGINGFACE_FREE,
      TokenProvider.OLLAMA_LOCAL,
      TokenProvider.GROQ_FREE,
    ];
    return freeTierProviders.includes(provider);
  }

  /**
   * Get appropriate fallback provider for free tier
   */
  private getFallbackProvider(originalProvider: TokenProvider): TokenProvider {
    // Map paid providers to free alternatives
    const fallbackMap = {
      [TokenProvider.OPENAI_GPT4]: TokenProvider.GROQ_FREE,
      [TokenProvider.OPENAI_GPT35]: TokenProvider.GROQ_FREE,
      [TokenProvider.ANTHROPIC_CLAUDE]: TokenProvider.HUGGINGFACE_FREE,
    };

    return fallbackMap[originalProvider] || TokenProvider.GROQ_FREE;
  }

  /**
   * Calculate cost based on provider and token usage
   */
  private calculateCost(provider: TokenProvider, inputTokens: number, outputTokens: number): number {
    // Cost per 1000 tokens in USD
    const costMap = {
      [TokenProvider.OPENAI_GPT4]: { input: 0.03, output: 0.06 },
      [TokenProvider.OPENAI_GPT35]: { input: 0.0015, output: 0.002 },
      [TokenProvider.ANTHROPIC_CLAUDE]: { input: 0.008, output: 0.024 },
      [TokenProvider.HUGGINGFACE_FREE]: { input: 0, output: 0 },
      [TokenProvider.OLLAMA_LOCAL]: { input: 0, output: 0 },
      [TokenProvider.GROQ_FREE]: { input: 0, output: 0 },
    };

    const costs = costMap[provider] || { input: 0, output: 0 };
    
    return ((inputTokens * costs.input) + (outputTokens * costs.output)) / 1000;
  }
}