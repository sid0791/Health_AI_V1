import { apiRequest } from './api'

export interface CostOptimizationConfig {
  enableRouting: boolean
  maxCostPerRequest: number
  budgetLimit: number
  period: 'daily' | 'weekly' | 'monthly'
  enableFallback: boolean
  preferredModels: string[]
}

export interface CostMetrics {
  totalSpent: number
  requestCount: number
  averageCostPerRequest: number
  budgetUsed: number
  budgetRemaining: number
  period: string
  topExpensiveQueries: Array<{
    query: string
    cost: number
    model: string
    timestamp: string
  }>
}

export interface OptimizationSuggestion {
  type: 'model_switch' | 'query_optimization' | 'caching' | 'batch_processing'
  title: string
  description: string
  potentialSavings: number
  implementation: string
  priority: 'high' | 'medium' | 'low'
}

export interface ModelPerformance {
  modelName: string
  averageCost: number
  averageLatency: number
  successRate: number
  qualityScore: number
  recommendedFor: string[]
}

/**
 * Cost Optimization Service
 * Manages AI cost optimization, monitoring, and intelligent model routing
 */
export class CostOptimizationService {
  /**
   * Get current cost optimization configuration
   */
  static async getConfig(): Promise<CostOptimizationConfig> {
    return apiRequest<CostOptimizationConfig>('/cost-optimization/config')
  }

  /**
   * Update cost optimization configuration
   */
  static async updateConfig(config: Partial<CostOptimizationConfig>): Promise<CostOptimizationConfig> {
    return apiRequest<CostOptimizationConfig>('/cost-optimization/config', {
      method: 'PUT',
      body: config
    })
  }

  /**
   * Get real-time cost metrics and spending analytics
   */
  static async getCostMetrics(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<CostMetrics> {
    return apiRequest<CostMetrics>(`/cost-optimization/metrics?period=${period}`)
  }

  /**
   * Get optimization suggestions based on usage patterns
   */
  static async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    return apiRequest<OptimizationSuggestion[]>('/cost-optimization/suggestions')
  }

  /**
   * Get model performance comparison for cost-quality trade-offs
   */
  static async getModelPerformance(): Promise<ModelPerformance[]> {
    return apiRequest<ModelPerformance[]>('/cost-optimization/models/performance')
  }

  /**
   * Optimize a specific query for cost efficiency
   */
  static async optimizeQuery(query: string, context: any): Promise<{
    originalCost: number
    optimizedCost: number
    savings: number
    optimizedQuery: string
    recommendedModel: string
    reasoning: string
  }> {
    return apiRequest('/cost-optimization/optimize-query', {
      method: 'POST',
      body: { query, context }
    })
  }

  /**
   * Set up automated cost alerts
   */
  static async setCostAlert(threshold: number, alertType: 'email' | 'push' | 'both'): Promise<void> {
    return apiRequest('/cost-optimization/alerts', {
      method: 'POST',
      body: { threshold, alertType }
    })
  }

  /**
   * Get cost breakdown by feature/service
   */
  static async getCostBreakdown(timeframe: string = '7d'): Promise<{
    mealPlanning: number
    chatService: number
    healthReports: number
    fitnessPlanning: number
    analytics: number
    other: number
    total: number
  }> {
    return apiRequest(`/cost-optimization/breakdown?timeframe=${timeframe}`)
  }

  /**
   * Simulate cost impact of configuration changes
   */
  static async simulateCostImpact(config: Partial<CostOptimizationConfig>): Promise<{
    currentMonthlyEstimate: number
    newMonthlyEstimate: number
    estimatedSavings: number
    qualityImpact: 'positive' | 'neutral' | 'negative'
    impactDetails: string
  }> {
    return apiRequest('/cost-optimization/simulate', {
      method: 'POST',
      body: config
    })
  }

  /**
   * Get intelligent model routing recommendations
   */
  static async getModelRoutingRecommendations(): Promise<{
    currentRouting: Record<string, string>
    recommendations: Array<{
      queryType: string
      currentModel: string
      recommendedModel: string
      costSaving: number
      qualityChange: number
      reason: string
    }>
  }> {
    return apiRequest('/cost-optimization/routing/recommendations')
  }

  /**
   * Enable/disable automatic cost optimization features
   */
  static async toggleAutoOptimization(enabled: boolean): Promise<{
    enabled: boolean
    features: string[]
    estimatedSavings: number
  }> {
    return apiRequest('/cost-optimization/auto-optimize', {
      method: 'POST',
      body: { enabled }
    })
  }

  /**
   * Get cost efficiency score and trends
   */
  static async getEfficiencyScore(): Promise<{
    score: number // 0-100
    trend: 'improving' | 'stable' | 'declining'
    factors: Array<{
      name: string
      impact: number
      suggestion: string
    }>
    benchmarkComparison: {
      yourScore: number
      industryAverage: number
      topPerformers: number
    }
  }> {
    return apiRequest('/cost-optimization/efficiency-score')
  }

  /**
   * Export cost optimization report
   */
  static async exportCostReport(format: 'pdf' | 'csv' | 'json' = 'pdf'): Promise<Blob> {
    const response = await fetch(`/api/cost-optimization/export?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to export cost report')
    }
    
    return response.blob()
  }

  /**
   * Get real-time cost monitoring dashboard data
   */
  static async getDashboardData(): Promise<{
    todaySpent: number
    weeklyBudget: number
    budgetUsed: number
    activeOptimizations: number
    recentSavings: number
    criticalAlerts: number
    topModels: Array<{
      name: string
      usage: number
      cost: number
    }>
    hourlyCosts: Array<{
      hour: string
      cost: number
      requests: number
    }>
  }> {
    return apiRequest('/cost-optimization/dashboard')
  }
}

export default CostOptimizationService