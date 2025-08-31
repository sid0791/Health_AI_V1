import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface CostMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  costByModel: Record<string, number>;
  tokensByModel: Record<string, number>;
  requestsByCategory: Record<string, number>;
  dailyCost: number;
  monthlyCost: number;
  projectedMonthlyCost: number;
}

export interface BatchOptimizationResult {
  batchId: string;
  requests: BatchedRequest[];
  totalTokensSaved: number;
  totalCostSaved: number;
  optimizationRatio: number;
  batchSize: number;
}

export interface BatchedRequest {
  userId: string;
  category: string;
  templateId: string;
  userQuery: string;
  variables: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export interface QuotaStatus {
  userId: string;
  dailyQuota: number;
  dailyUsed: number;
  monthlyQuota: number;
  monthlyUsed: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  resetTime: Date;
}

@Injectable()
export class CostOptimizationService {
  private readonly logger = new Logger(CostOptimizationService.name);
  private readonly batchQueue: Map<string, BatchedRequest[]> = new Map();
  private readonly userMetrics: Map<string, CostMetrics> = new Map();
  private readonly requestHistory: Map<string, any[]> = new Map();

  // Cost optimization settings
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds
  private readonly DAILY_QUOTA_DEFAULT = 100;
  private readonly MONTHLY_QUOTA_DEFAULT = 2000;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.initializeCostTracking();
  }

  /**
   * Initialize cost tracking and periodic batch processing
   */
  private initializeCostTracking(): void {
    // Process batches every 30 seconds
    setInterval(() => {
      this.processPendingBatches();
    }, this.BATCH_TIMEOUT);

    // Reset daily quotas at midnight
    this.scheduleDailyQuotaReset();
    
    this.logger.log('Cost optimization service initialized');
  }

  /**
   * Add request to batch for cost optimization
   */
  async addToBatch(request: BatchedRequest): Promise<string> {
    const batchKey = this.getBatchKey(request);
    
    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, []);
    }

    const batch = this.batchQueue.get(batchKey)!;
    batch.push(request);

    // If batch is full, process immediately
    if (batch.length >= this.BATCH_SIZE) {
      return this.processBatch(batchKey);
    }

    // Return batch ID for tracking
    return `${batchKey}-${Date.now()}`;
  }

  /**
   * Process a specific batch
   */
  private async processBatch(batchKey: string): Promise<string> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.length === 0) {
      return '';
    }

    try {
      // Combine similar requests for cost optimization
      const optimizedBatch = this.optimizeBatch(batch);
      
      // Create batch execution result
      const result: BatchOptimizationResult = {
        batchId: `batch-${Date.now()}`,
        requests: optimizedBatch,
        totalTokensSaved: this.calculateTokensSaved(batch, optimizedBatch),
        totalCostSaved: this.calculateCostSaved(batch, optimizedBatch),
        optimizationRatio: optimizedBatch.length / batch.length,
        batchSize: optimizedBatch.length
      };

      // Log optimization results
      this.logger.log(`Processed batch ${result.batchId}: ${result.batchSize} requests, saved ${result.totalTokensSaved} tokens, $${result.totalCostSaved.toFixed(4)}`);

      // Clear processed batch
      this.batchQueue.delete(batchKey);

      return result.batchId;
    } catch (error) {
      this.logger.error(`Failed to process batch ${batchKey}: ${error.message}`);
      return '';
    }
  }

  /**
   * Optimize batch by combining similar requests
   */
  private optimizeBatch(requests: BatchedRequest[]): BatchedRequest[] {
    // Group requests by template and similarity
    const groups = new Map<string, BatchedRequest[]>();
    
    for (const request of requests) {
      const groupKey = `${request.templateId}-${request.category}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)!.push(request);
    }

    // Optimize each group
    const optimized: BatchedRequest[] = [];
    
    for (const [groupKey, groupRequests] of groups) {
      if (groupRequests.length > 1) {
        // Combine similar requests into one optimized request
        const combined = this.combineRequests(groupRequests);
        optimized.push(combined);
      } else {
        optimized.push(groupRequests[0]);
      }
    }

    return optimized;
  }

  /**
   * Combine similar requests into one optimized request
   */
  private combineRequests(requests: BatchedRequest[]): BatchedRequest {
    // Take the first request as base and combine user queries
    const base = requests[0];
    const combinedQueries = requests.map(r => r.userQuery).join(' | ');
    
    return {
      ...base,
      userQuery: `Multiple user requests: ${combinedQueries}`,
      variables: {
        ...base.variables,
        batch_size: requests.length,
        combined_queries: combinedQueries
      }
    };
  }

  /**
   * Calculate tokens saved through optimization
   */
  private calculateTokensSaved(original: BatchedRequest[], optimized: BatchedRequest[]): number {
    // Estimate tokens saved by reducing request count
    const tokensSavedPerRequest = 50; // Estimated overhead per request
    return (original.length - optimized.length) * tokensSavedPerRequest;
  }

  /**
   * Calculate cost saved through optimization
   */
  private calculateCostSaved(original: BatchedRequest[], optimized: BatchedRequest[]): number {
    // Estimate cost saved based on token savings
    const tokensSaved = this.calculateTokensSaved(original, optimized);
    const costPerToken = 0.00002; // Approximate cost per token for GPT-3.5
    return tokensSaved * costPerToken;
  }

  /**
   * Get batch key for grouping similar requests
   */
  private getBatchKey(request: BatchedRequest): string {
    return `${request.category}-${request.priority}`;
  }

  /**
   * Process all pending batches
   */
  private async processPendingBatches(): Promise<void> {
    const batchKeys = Array.from(this.batchQueue.keys());
    
    for (const batchKey of batchKeys) {
      const batch = this.batchQueue.get(batchKey);
      if (batch && batch.length > 0) {
        // Process batch if it's been waiting for the timeout period
        const oldestRequest = batch[0];
        const waitTime = Date.now() - oldestRequest.timestamp.getTime();
        
        if (waitTime >= this.BATCH_TIMEOUT) {
          await this.processBatch(batchKey);
        }
      }
    }
  }

  /**
   * Check user quota status
   */
  async checkQuota(userId: string): Promise<QuotaStatus> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const dailyUsed = this.getDailyUsage(userId);
    const monthlyUsed = this.getMonthlyUsage(userId);
    
    const dailyQuota = this.DAILY_QUOTA_DEFAULT;
    const monthlyQuota = this.MONTHLY_QUOTA_DEFAULT;

    return {
      userId,
      dailyQuota,
      dailyUsed,
      monthlyQuota,
      monthlyUsed,
      isNearLimit: dailyUsed > dailyQuota * 0.8 || monthlyUsed > monthlyQuota * 0.8,
      isOverLimit: dailyUsed >= dailyQuota || monthlyUsed >= monthlyQuota,
      resetTime: this.getNextDailyReset()
    };
  }

  /**
   * Get user's daily usage
   */
  private getDailyUsage(userId: string): number {
    const history = this.requestHistory.get(userId) || [];
    const today = new Date().toDateString();
    return history.filter(r => new Date(r.timestamp).toDateString() === today).length;
  }

  /**
   * Get user's monthly usage
   */
  private getMonthlyUsage(userId: string): number {
    const history = this.requestHistory.get(userId) || [];
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    return history.filter(r => {
      const date = new Date(r.timestamp);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;
  }

  /**
   * Get next daily quota reset time
   */
  private getNextDailyReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Schedule daily quota reset
   */
  private scheduleDailyQuotaReset(): void {
    const msUntilMidnight = this.getNextDailyReset().getTime() - Date.now();
    
    setTimeout(() => {
      this.resetDailyQuotas();
      
      // Schedule next reset
      setInterval(() => {
        this.resetDailyQuotas();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);
  }

  /**
   * Reset all users' daily quotas
   */
  private resetDailyQuotas(): void {
    // Clear daily usage tracking
    for (const [userId, history] of this.requestHistory.entries()) {
      const filtered = history.filter(r => {
        const date = new Date(r.timestamp);
        return date.toDateString() !== new Date().toDateString();
      });
      this.requestHistory.set(userId, filtered);
    }
    
    this.logger.log('Daily quotas reset for all users');
  }

  /**
   * Track request usage for cost monitoring
   */
  trackRequest(userId: string, category: string, templateId: string, tokens: number, cost: number): void {
    if (!this.requestHistory.has(userId)) {
      this.requestHistory.set(userId, []);
    }

    const history = this.requestHistory.get(userId)!;
    history.push({
      timestamp: new Date(),
      category,
      templateId,
      tokens,
      cost
    });

    // Keep only last 1000 requests per user
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Get cost metrics for a user
   */
  getCostMetrics(userId: string): CostMetrics {
    const history = this.requestHistory.get(userId) || [];
    
    if (history.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageTokensPerRequest: 0,
        averageCostPerRequest: 0,
        costByModel: {},
        tokensByModel: {},
        requestsByCategory: {},
        dailyCost: 0,
        monthlyCost: 0,
        projectedMonthlyCost: 0
      };
    }

    const totalRequests = history.length;
    const totalTokens = history.reduce((sum, r) => sum + r.tokens, 0);
    const totalCost = history.reduce((sum, r) => sum + r.cost, 0);

    const today = new Date().toDateString();
    const dailyCost = history
      .filter(r => new Date(r.timestamp).toDateString() === today)
      .reduce((sum, r) => sum + r.cost, 0);

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyCost = history
      .filter(r => {
        const date = new Date(r.timestamp);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      })
      .reduce((sum, r) => sum + r.cost, 0);

    const requestsByCategory = history.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests,
      totalTokens,
      totalCost,
      averageTokensPerRequest: totalTokens / totalRequests,
      averageCostPerRequest: totalCost / totalRequests,
      costByModel: {}, // TODO: Implement model tracking
      tokensByModel: {}, // TODO: Implement model tracking
      requestsByCategory,
      dailyCost,
      monthlyCost,
      projectedMonthlyCost: dailyCost * 30 // Simple projection
    };
  }
}