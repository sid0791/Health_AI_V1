import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User as CurrentUser } from '../../auth/decorators/user.decorator';
import { User } from '../../users/entities/user.entity';
import { AIPromptOptimizationService } from '../services/ai-prompt-optimization.service';
import { CostOptimizationService } from '../services/cost-optimization.service';
import { PromptCategory } from '../entities/ai-prompt-template.entity';

@Controller('ai-prompt-optimization')
@UseGuards(JwtAuthGuard)
export class AIPromptOptimizationController {
  constructor(
    private readonly promptOptimizationService: AIPromptOptimizationService,
    private readonly costOptimizationService: CostOptimizationService,
  ) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executePrompt(
    @CurrentUser() user: User,
    @Body() body: {
      category: PromptCategory;
      context?: any;
      templateId?: string;
    },
  ): Promise<any> {
    const result = await this.promptOptimizationService.executePrompt(
      user.id,
      body.category,
      body.context,
      body.templateId,
    );

    return {
      success: result.success,
      data: result.response,
      error: result.error,
      execution: {
        id: result.execution.id,
        inputTokens: result.execution.inputTokens,
        outputTokens: result.execution.outputTokens,
        totalTokens: result.execution.totalTokens,
        cost: result.execution.cost,
        responseTimeMs: result.execution.responseTimeMs,
        aiProvider: result.execution.aiProvider,
        aiModel: result.execution.aiModel,
      },
    };
  }

  @Get('analytics')
  async getAnalytics(
    @CurrentUser() user: User,
    @Query('category') category?: PromptCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeAllUsers') includeAllUsers?: string,
  ): Promise<any> {
    const userId = includeAllUsers === 'true' ? undefined : user.id;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return await this.promptOptimizationService.getExecutionAnalytics(
      userId,
      category,
      start,
      end,
    );
  }

  @Get('templates/:category')
  async getTemplate(
    @Param('category') category: PromptCategory,
  ): Promise<any> {
    const template = await this.promptOptimizationService.getOptimalTemplate(category);
    
    if (!template) {
      return { error: 'No template found for category' };
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
      usageCount: template.usageCount,
      averageTokens: template.averageTokens,
      totalCost: template.totalCost,
      variables: template.variables,
      constraints: template.constraints,
    };
  }

  @Post('optimize-nutrition-advice')
  @HttpCode(HttpStatus.OK)
  async optimizeNutritionAdvice(
    @CurrentUser() user: User,
    @Body() body: { query: string },
  ): Promise<any> {
    return await this.promptOptimizationService.executePrompt(
      user.id,
      PromptCategory.NUTRITION_ADVICE,
      { userQuery: body.query },
    );
  }

  @Post('optimize-meal-planning')
  @HttpCode(HttpStatus.OK)
  async optimizeMealPlanning(
    @CurrentUser() user: User,
    @Body() body: { 
      request: string;
      days?: number;
      mealTypes?: string[];
    },
  ): Promise<any> {
    return await this.promptOptimizationService.executePrompt(
      user.id,
      PromptCategory.MEAL_PLANNING,
      { 
        mealPlanRequest: body.request,
        days: body.days || 7,
        mealTypes: body.mealTypes || ['breakfast', 'lunch', 'dinner', 'snacks'],
      },
    );
  }

  @Post('optimize-fitness-planning')
  @HttpCode(HttpStatus.OK)
  async optimizeFitnessPlanning(
    @CurrentUser() user: User,
    @Body() body: { 
      request: string;
      availableTime?: string;
      equipment?: string[];
    },
  ): Promise<any> {
    return await this.promptOptimizationService.executePrompt(
      user.id,
      PromptCategory.FITNESS_PLANNING,
      { 
        fitnessRequest: body.request,
        availableTime: body.availableTime || '30-45 minutes',
        equipmentAccess: body.equipment?.join(', ') || 'bodyweight exercises',
      },
    );
  }

  @Post('general-health-chat')
  @HttpCode(HttpStatus.OK)
  async generalHealthChat(
    @CurrentUser() user: User,
    @Body() body: { question: string },
  ): Promise<any> {
    return await this.promptOptimizationService.executePrompt(
      user.id,
      PromptCategory.GENERAL_CHAT,
      { userQuestion: body.question },
    );
  }

  @Get('cost-optimization-report')
  async getCostOptimizationReport(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ): Promise<any> {
    const daysNum = days ? parseInt(days, 10) : 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const analytics = await this.promptOptimizationService.getExecutionAnalytics(
      user.id,
      undefined,
      startDate,
      endDate,
    );

    // Calculate optimization metrics
    const { summary, categoryBreakdown } = analytics;
    
    // Calculate potential savings
    const estimatedSavings = this.calculatePotentialSavings(categoryBreakdown);
    
    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: daysNum,
      },
      currentUsage: summary,
      categoryBreakdown,
      optimization: {
        estimatedSavings,
        recommendations: this.getOptimizationRecommendations(categoryBreakdown),
        efficiency: {
          tokensPerDollar: summary.totalTokens / (summary.totalCost || 0.01),
          averageResponseQuality: 'High', // Would be calculated from user feedback
          costEfficiencyScore: this.calculateCostEfficiencyScore(summary),
        },
      },
    };
  }

  private calculatePotentialSavings(categoryBreakdown: any): any {
    // Simulate potential savings through optimization
    let totalSavings = 0;
    const categoryOptimizations: any = {};

    for (const [category, data] of Object.entries(categoryBreakdown)) {
      const categoryData = data as any;
      // Estimate 15-25% savings through prompt optimization
      const estimatedSavings = categoryData.cost * 0.20;
      totalSavings += estimatedSavings;
      
      categoryOptimizations[category] = {
        currentCost: categoryData.cost,
        estimatedSavings,
        optimizedCost: categoryData.cost - estimatedSavings,
        savingsPercentage: 20,
      };
    }

    return {
      totalEstimatedSavings: Math.round(totalSavings * 10000) / 10000,
      monthlySavingsProjection: Math.round(totalSavings * 30 * 100) / 100,
      categoryOptimizations,
    };
  }

  private getOptimizationRecommendations(categoryBreakdown: any): string[] {
    const recommendations: string[] = [];

    for (const [category, data] of Object.entries(categoryBreakdown)) {
      const categoryData = data as any;
      if (categoryData.count > 10) {
        recommendations.push(
          `${category}: High usage detected (${categoryData.count} requests). Consider using more specific prompt templates to reduce token usage.`
        );
      }
    }

    recommendations.push(
      'Use prebuilt prompt templates to reduce variable resolution overhead',
      'Combine multiple related queries into single optimized requests',
      'Leverage user profile data to minimize context repetition',
      'Monitor token usage patterns to identify optimization opportunities'
    );

    return recommendations;
  }

  private calculateCostEfficiencyScore(summary: any): number {
    // Simple efficiency score based on cost per token and success rate
    const costPerToken = summary.totalCost / summary.totalTokens;
    const efficiencyBase = 1 / (costPerToken * 10000); // Normalize
    const successMultiplier = summary.successRate;
    
    return Math.min(100, Math.round(efficiencyBase * successMultiplier * 10));
  }

  @Get('enhanced-cost-optimization')
  async getEnhancedCostOptimization(
    @CurrentUser() user: User,
  ): Promise<any> {
    // Get enhanced optimization metrics targeting >80% savings
    const enhancedMetrics = this.costOptimizationService.getEnhancedOptimizationMetrics();
    const userMetrics = this.costOptimizationService.getCostMetrics(user.id);
    
    return {
      optimization: {
        current: `${enhancedMetrics.currentOptimizationRate}%`,
        target: `${enhancedMetrics.targetOptimizationRate}%`,
        status: enhancedMetrics.currentOptimizationRate >= 80 ? 'TARGET_ACHIEVED' : 'OPTIMIZING',
        improvement: enhancedMetrics.currentOptimizationRate - 60, // Improvement from baseline 60%
      },
      metrics: {
        cacheHitRate: `${enhancedMetrics.cacheHitRate}%`,
        deduplicationRate: `${enhancedMetrics.deduplicationRate}%`,
        batchingEfficiency: `${enhancedMetrics.batchingEfficiency}%`,
        totalCostSaved: `$${enhancedMetrics.totalCostSaved.toFixed(4)}`,
      },
      userStats: {
        totalRequests: userMetrics.totalRequests,
        totalCost: `$${userMetrics.totalCost.toFixed(4)}`,
        dailyCost: `$${userMetrics.dailyCost.toFixed(4)}`,
        monthlyCost: `$${userMetrics.monthlyCost.toFixed(4)}`,
        projectedMonthlyCost: `$${userMetrics.projectedMonthlyCost.toFixed(4)}`,
        averageCostPerRequest: `$${userMetrics.averageCostPerRequest.toFixed(6)}`,
      },
      strategies: {
        freeModelPrioritization: 'ENABLED - Free models prioritized when accuracy within 5%',
        intelligentCaching: 'ENABLED - 1 hour cache for similar requests',
        requestDeduplication: 'ENABLED - 80% similarity threshold',
        batchProcessing: 'ENHANCED - 15 request batches, 20s timeout',
        accuracyOptimization: 'ENABLED - 5% rule from PROMPT_README.md implemented',
      },
      recommendations: enhancedMetrics.recommendations,
      summary: {
        achievement: enhancedMetrics.currentOptimizationRate >= 80 ? 
          '🎉 Target achieved! Cost optimization >80% reached' : 
          `⚡ ${(80 - enhancedMetrics.currentOptimizationRate).toFixed(1)}% more optimization needed to reach 80% target`,
        nextSteps: enhancedMetrics.currentOptimizationRate >= 80 ? 
          ['Monitor and maintain current optimization level', 'Explore additional free model providers'] :
          enhancedMetrics.recommendations.slice(0, 3),
      }
    };
  }
}