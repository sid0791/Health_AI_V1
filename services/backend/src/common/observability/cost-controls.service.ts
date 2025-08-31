import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'spike_detected' | 'quota_warning' | 'unusual_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

export interface CostBudget {
  name: string;
  period: 'daily' | 'weekly' | 'monthly';
  limit: number;
  spent: number;
  remaining: number;
  alertThreshold: number; // percentage
  enabled: boolean;
}

export interface ProviderCost {
  provider: string;
  model: string;
  requestCount: number;
  tokenCount: number;
  cost: number;
  avgCostPerRequest: number;
  usage: 'level1' | 'level2';
}

export interface CostDashboard {
  totalCost: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  budgetStatus: CostBudget[];
  providerBreakdown: ProviderCost[];
  costTrends: Array<{
    date: string;
    cost: number;
    requests: number;
    efficiency: number;
  }>;
  alerts: CostAlert[];
  recommendations: string[];
}

@Injectable()
export class CostControlsService {
  private readonly logger = new Logger(CostControlsService.name);
  private readonly costHistory = new Map<string, Array<{
    timestamp: Date;
    provider: string;
    model: string;
    cost: number;
    tokens: number;
    requests: number;
    userId?: string;
  }>>();
  
  private readonly budgets = new Map<string, CostBudget>();
  private readonly alerts = new Map<string, CostAlert>();
  private readonly providerPolicies = new Map<string, {
    level1Models: string[];
    level2Models: string[];
    costPerToken: Record<string, number>;
    dailyLimits: Record<string, number>;
  }>();

  // Cost tracking
  private dailyCost = 0;
  private weeklyCost = 0;
  private monthlyCost = 0;

  constructor(private readonly configService: ConfigService) {
    this.initializeProviderPolicies();
    this.initializeDefaultBudgets();
    this.startCostMonitoring();
  }

  /**
   * Record AI usage cost
   */
  recordAIUsage(
    provider: string,
    model: string,
    tokens: number,
    cost: number,
    requests: number = 1,
    userId?: string
  ): void {
    const usage = {
      timestamp: new Date(),
      provider,
      model,
      cost,
      tokens,
      requests,
      userId,
    };

    // Store in cost history
    const key = `${provider}:${model}`;
    if (!this.costHistory.has(key)) {
      this.costHistory.set(key, []);
    }
    
    const history = this.costHistory.get(key)!;
    history.push(usage);

    // Keep only last 10000 entries per provider/model
    if (history.length > 10000) {
      history.splice(0, history.length - 10000);
    }

    // Update cost totals
    this.updateCostTotals(cost);

    // Check for cost alerts
    this.checkCostAlerts(provider, model, cost, tokens);

    this.logger.log(`AI usage recorded: ${provider}/${model} - $${cost.toFixed(4)} (${tokens} tokens)`);
  }

  /**
   * Get optimal provider for request
   */
  getOptimalProvider(
    requestType: 'level1' | 'level2',
    estimatedTokens: number,
    userBudget?: number
  ): {
    provider: string;
    model: string;
    estimatedCost: number;
    reasoning: string;
  } {
    const providers = Array.from(this.providerPolicies.entries());
    const candidateModels: Array<{
      provider: string;
      model: string;
      cost: number;
      suitability: number;
    }> = [];

    for (const [provider, policy] of providers) {
      const models = requestType === 'level1' ? policy.level1Models : policy.level2Models;
      
      for (const model of models) {
        const costPerToken = policy.costPerToken[model] || 0.00002;
        const estimatedCost = estimatedTokens * costPerToken;
        
        // Calculate suitability score (lower cost = higher suitability)
        const suitability = this.calculateSuitabilityScore(provider, model, estimatedCost, userBudget);
        
        candidateModels.push({
          provider,
          model,
          cost: estimatedCost,
          suitability,
        });
      }
    }

    // Sort by suitability (higher is better)
    candidateModels.sort((a, b) => b.suitability - a.suitability);

    if (candidateModels.length === 0) {
      return {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        estimatedCost: estimatedTokens * 0.00002,
        reasoning: 'Default fallback - no configured providers',
      };
    }

    const optimal = candidateModels[0];
    const reasoning = this.generateOptimizationReasoning(optimal, candidateModels.slice(1, 3), requestType);

    return {
      provider: optimal.provider,
      model: optimal.model,
      estimatedCost: optimal.cost,
      reasoning,
    };
  }

  /**
   * Get cost dashboard data
   */
  getCostDashboard(): CostDashboard {
    const totalCost = {
      daily: this.dailyCost,
      weekly: this.weeklyCost,
      monthly: this.monthlyCost,
    };

    const budgetStatus = Array.from(this.budgets.values()).map(budget => ({
      ...budget,
      spent: this.getCostForPeriod(budget.period),
      remaining: Math.max(0, budget.limit - this.getCostForPeriod(budget.period)),
    }));

    const providerBreakdown = this.getProviderBreakdown();
    const costTrends = this.getCostTrends();
    const alerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const recommendations = this.generateCostRecommendations();

    return {
      totalCost,
      budgetStatus,
      providerBreakdown,
      costTrends,
      alerts,
      recommendations,
    };
  }

  /**
   * Set budget for period
   */
  setBudget(
    name: string,
    period: 'daily' | 'weekly' | 'monthly',
    limit: number,
    alertThreshold: number = 80
  ): void {
    this.budgets.set(name, {
      name,
      period,
      limit,
      spent: 0,
      remaining: limit,
      alertThreshold,
      enabled: true,
    });

    this.logger.log(`Budget set: ${name} - $${limit} ${period} (alert at ${alertThreshold}%)`);
  }

  /**
   * Get cost efficiency metrics
   */
  getCostEfficiencyMetrics(): {
    tokenEfficiency: number; // cost per 1000 tokens
    requestEfficiency: number; // cost per request
    userCostAverage: number; // average cost per user
    providerEfficiency: Record<string, number>;
    optimizationOpportunities: Array<{
      description: string;
      potentialSavings: number;
      priority: 'low' | 'medium' | 'high';
    }>;
  } {
    const totalCost = this.monthlyCost;
    const totalTokens = this.getTotalTokensUsed();
    const totalRequests = this.getTotalRequestsCount();
    const activeUsers = this.getActiveUsersCount();

    const tokenEfficiency = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;
    const requestEfficiency = totalRequests > 0 ? totalCost / totalRequests : 0;
    const userCostAverage = activeUsers > 0 ? totalCost / activeUsers : 0;

    const providerEfficiency = this.calculateProviderEfficiency();
    const optimizationOpportunities = this.identifyOptimizationOpportunities();

    return {
      tokenEfficiency: Math.round(tokenEfficiency * 100000) / 100000,
      requestEfficiency: Math.round(requestEfficiency * 100) / 100,
      userCostAverage: Math.round(userCostAverage * 100) / 100,
      providerEfficiency,
      optimizationOpportunities,
    };
  }

  /**
   * Initialize provider policies
   */
  private initializeProviderPolicies(): void {
    // OpenAI configuration
    this.providerPolicies.set('openai', {
      level1Models: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
      level2Models: ['gpt-4', 'gpt-4-turbo-preview', 'gpt-4-32k'],
      costPerToken: {
        'gpt-3.5-turbo': 0.00002,
        'gpt-3.5-turbo-16k': 0.00003,
        'gpt-4': 0.00006,
        'gpt-4-turbo-preview': 0.00010,
        'gpt-4-32k': 0.00012,
      },
      dailyLimits: {
        'gpt-3.5-turbo': 1000000, // 1M tokens
        'gpt-4': 100000, // 100K tokens
      },
    });

    // Anthropic configuration
    this.providerPolicies.set('anthropic', {
      level1Models: ['claude-3-haiku'],
      level2Models: ['claude-3-sonnet', 'claude-3-opus'],
      costPerToken: {
        'claude-3-haiku': 0.000025,
        'claude-3-sonnet': 0.000030,
        'claude-3-opus': 0.000150,
      },
      dailyLimits: {
        'claude-3-haiku': 500000,
        'claude-3-sonnet': 200000,
      },
    });

    this.logger.log('Provider policies initialized');
  }

  /**
   * Initialize default budgets
   */
  private initializeDefaultBudgets(): void {
    this.setBudget('Daily AI Costs', 'daily', 50, 80);
    this.setBudget('Weekly AI Costs', 'weekly', 300, 85);
    this.setBudget('Monthly AI Costs', 'monthly', 1000, 90);
  }

  /**
   * Start cost monitoring
   */
  private startCostMonitoring(): void {
    // Reset daily costs at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.dailyCost = 0;
        this.logger.log('Daily costs reset');
      }
    }, 60000); // Check every minute

    // Check budgets every 15 minutes
    setInterval(() => {
      this.checkBudgetAlerts();
    }, 15 * 60 * 1000);

    this.logger.log('Cost monitoring started');
  }

  /**
   * Update cost totals
   */
  private updateCostTotals(cost: number): void {
    this.dailyCost += cost;
    this.weeklyCost += cost;
    this.monthlyCost += cost;

    // Reset weekly costs on Sunday
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 0) {
      this.weeklyCost = 0;
    }

    // Reset monthly costs on 1st day
    if (now.getDate() === 1 && now.getHours() === 0) {
      this.monthlyCost = 0;
    }
  }

  /**
   * Check for cost alerts
   */
  private checkCostAlerts(provider: string, model: string, cost: number, tokens: number): void {
    // Check for cost spikes
    const recentCosts = this.getRecentCosts(provider, model, 3600000); // Last hour
    const hourlyAvg = recentCosts.reduce((sum, c) => sum + c.cost, 0) / Math.max(1, recentCosts.length);
    
    if (cost > hourlyAvg * 3 && cost > 1) {
      this.createAlert('spike_detected', 'high', 
        `Cost spike detected for ${provider}/${model}: $${cost.toFixed(4)} (3x hourly average)`,
        hourlyAvg, cost);
    }

    // Check daily limits
    const policy = this.providerPolicies.get(provider);
    if (policy && policy.dailyLimits[model]) {
      const dailyTokens = this.getDailyTokenUsage(provider, model);
      const limit = policy.dailyLimits[model];
      
      if (dailyTokens > limit * 0.9) {
        this.createAlert('quota_warning', 'medium',
          `Approaching daily token limit for ${provider}/${model}: ${dailyTokens}/${limit}`,
          limit, dailyTokens);
      }
    }
  }

  /**
   * Check budget alerts
   */
  private checkBudgetAlerts(): void {
    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue;

      const spent = this.getCostForPeriod(budget.period);
      const percentage = (spent / budget.limit) * 100;

      if (percentage >= budget.alertThreshold && percentage < 100) {
        this.createAlert('budget_exceeded', 'medium',
          `${budget.name} budget ${percentage.toFixed(1)}% used: $${spent.toFixed(2)}/$${budget.limit}`,
          budget.limit, spent);
      } else if (percentage >= 100) {
        this.createAlert('budget_exceeded', 'high',
          `${budget.name} budget exceeded: $${spent.toFixed(2)}/$${budget.limit}`,
          budget.limit, spent);
      }
    }
  }

  /**
   * Create cost alert
   */
  private createAlert(
    type: CostAlert['type'],
    severity: CostAlert['severity'],
    message: string,
    threshold: number,
    currentValue: number
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.alerts.set(alertId, {
      id: alertId,
      type,
      severity,
      message,
      threshold,
      currentValue,
      timestamp: new Date(),
      resolved: false,
    });

    this.logger.warn(`Cost alert created: ${message}`);
  }

  /**
   * Helper methods for calculations
   */
  private getCostForPeriod(period: 'daily' | 'weekly' | 'monthly'): number {
    switch (period) {
      case 'daily': return this.dailyCost;
      case 'weekly': return this.weeklyCost;
      case 'monthly': return this.monthlyCost;
    }
  }

  private getProviderBreakdown(): ProviderCost[] {
    const breakdown: Record<string, ProviderCost> = {};

    for (const [key, history] of this.costHistory.entries()) {
      const [provider, model] = key.split(':');
      const recentHistory = history.filter(h => 
        h.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
      );

      if (recentHistory.length === 0) continue;

      const totalCost = recentHistory.reduce((sum, h) => sum + h.cost, 0);
      const totalTokens = recentHistory.reduce((sum, h) => sum + h.tokens, 0);
      const totalRequests = recentHistory.reduce((sum, h) => sum + h.requests, 0);

      breakdown[key] = {
        provider,
        model,
        requestCount: totalRequests,
        tokenCount: totalTokens,
        cost: totalCost,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        usage: this.getModelUsageLevel(provider, model),
      };
    }

    return Object.values(breakdown).sort((a, b) => b.cost - a.cost);
  }

  private getCostTrends(): Array<{ date: string; cost: number; requests: number; efficiency: number }> {
    // Simplified trends calculation - in production would use proper time series data
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        cost: Math.random() * 50, // Mock data
        requests: Math.floor(Math.random() * 1000),
        efficiency: Math.random() * 0.1,
      });
    }
    return trends;
  }

  private calculateSuitabilityScore(
    provider: string,
    model: string,
    estimatedCost: number,
    userBudget?: number
  ): number {
    let score = 100;

    // Cost factor (lower cost = higher score)
    score -= estimatedCost * 1000; // Adjust based on cost

    // Budget factor
    if (userBudget && estimatedCost > userBudget) {
      score -= 50; // Penalty for exceeding budget
    }

    // Provider reliability factor (could be based on historical data)
    if (provider === 'openai') score += 10;
    if (provider === 'anthropic') score += 5;

    return Math.max(0, score);
  }

  private generateOptimizationReasoning(
    optimal: any,
    alternatives: any[],
    requestType: string
  ): string {
    let reasoning = `Selected ${optimal.provider}/${optimal.model} for ${requestType} request. `;
    reasoning += `Estimated cost: $${optimal.cost.toFixed(4)}. `;
    
    if (alternatives.length > 0) {
      const savings = alternatives[0].cost - optimal.cost;
      if (savings > 0) {
        reasoning += `Saves $${savings.toFixed(4)} compared to ${alternatives[0].provider}/${alternatives[0].model}.`;
      }
    }

    return reasoning;
  }

  private generateCostRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze recent usage patterns
    const efficiency = this.getCostEfficiencyMetrics();
    
    if (efficiency.tokenEfficiency > 0.1) {
      recommendations.push('Consider switching to more cost-effective models for level 1 requests');
    }
    
    if (this.dailyCost > 30) {
      recommendations.push('Daily costs are high - review AI usage patterns and implement request batching');
    }
    
    if (efficiency.optimizationOpportunities.length > 0) {
      recommendations.push(...efficiency.optimizationOpportunities.slice(0, 3).map(op => op.description));
    }

    return recommendations;
  }

  // Additional helper methods...
  private getModelUsageLevel(provider: string, model: string): 'level1' | 'level2' {
    const policy = this.providerPolicies.get(provider);
    if (!policy) return 'level1';
    
    return policy.level1Models.includes(model) ? 'level1' : 'level2';
  }

  private getRecentCosts(provider: string, model: string, timeWindow: number) {
    const key = `${provider}:${model}`;
    const history = this.costHistory.get(key) || [];
    const cutoff = Date.now() - timeWindow;
    return history.filter(h => h.timestamp.getTime() > cutoff);
  }

  private getDailyTokenUsage(provider: string, model: string): number {
    const today = new Date().toDateString();
    const key = `${provider}:${model}`;
    const history = this.costHistory.get(key) || [];
    return history
      .filter(h => h.timestamp.toDateString() === today)
      .reduce((sum, h) => sum + h.tokens, 0);
  }

  private getTotalTokensUsed(): number {
    let total = 0;
    for (const history of this.costHistory.values()) {
      total += history.reduce((sum, h) => sum + h.tokens, 0);
    }
    return total;
  }

  private getTotalRequestsCount(): number {
    let total = 0;
    for (const history of this.costHistory.values()) {
      total += history.reduce((sum, h) => sum + h.requests, 0);
    }
    return total;
  }

  private getActiveUsersCount(): number {
    const uniqueUsers = new Set<string>();
    for (const history of this.costHistory.values()) {
      history.forEach(h => {
        if (h.userId) uniqueUsers.add(h.userId);
      });
    }
    return uniqueUsers.size;
  }

  private calculateProviderEfficiency(): Record<string, number> {
    const efficiency: Record<string, number> = {};
    for (const [provider] of this.providerPolicies.entries()) {
      // Calculate efficiency based on cost per token for this provider
      efficiency[provider] = Math.random() * 0.1; // Mock calculation
    }
    return efficiency;
  }

  private identifyOptimizationOpportunities(): Array<{
    description: string;
    potentialSavings: number;
    priority: 'low' | 'medium' | 'high';
  }> {
    return [
      {
        description: 'Switch 30% of level 2 requests to level 1 models where appropriate',
        potentialSavings: 150,
        priority: 'high',
      },
      {
        description: 'Implement better request batching to reduce API calls',
        potentialSavings: 75,
        priority: 'medium',
      },
      {
        description: 'Use cached responses for similar queries',
        potentialSavings: 50,
        priority: 'medium',
      },
    ];
  }
}