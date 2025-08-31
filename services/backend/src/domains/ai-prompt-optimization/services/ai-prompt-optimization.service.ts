import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  AIPromptTemplate,
  PromptCategory,
  VariableType,
  PromptStatus,
} from '../entities/ai-prompt-template.entity';
import { AIPromptExecution, ExecutionStatus } from '../entities/ai-prompt-execution.entity';
import { User } from '../../users/entities/user.entity';
import { AIRoutingService } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';

interface VariableResolver {
  [key: string]: (user: User, context?: any) => Promise<any> | any;
}

interface PromptExecutionResult {
  success: boolean;
  response?: any;
  error?: string;
  execution: AIPromptExecution;
}

@Injectable()
export class AIPromptOptimizationService {
  private readonly logger = new Logger(AIPromptOptimizationService.name);
  private readonly variableResolvers: VariableResolver;

  constructor(
    @InjectRepository(AIPromptTemplate)
    private readonly templateRepository: Repository<AIPromptTemplate>,
    @InjectRepository(AIPromptExecution)
    private readonly executionRepository: Repository<AIPromptExecution>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly aiRoutingService: AIRoutingService,
    private readonly configService: ConfigService,
  ) {
    this.initializeVariableResolvers();
  }

  /**
   * Execute an optimized prompt for a user
   */
  async executePrompt(
    userId: string,
    category: PromptCategory,
    context?: any,
    templateId?: string,
  ): Promise<PromptExecutionResult> {
    const startTime = Date.now();

    try {
      // Get user data
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile', 'preferences', 'goals'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get the optimal template
      const template = templateId
        ? await this.getTemplateById(templateId)
        : await this.getOptimalTemplate(category);

      if (!template) {
        throw new NotFoundException(`No active template found for category: ${category}`);
      }

      // Resolve variables and build prompt
      const variableValues = await this.resolveVariables(template, user, context);
      const processedPrompt = this.buildPrompt(template, variableValues);

      // Count tokens (approximate)
      const inputTokens = this.estimateTokens(processedPrompt);

      // Create execution record
      const execution = this.executionRepository.create({
        userId,
        templateId: template.id,
        processedPrompt,
        variableValues,
        status: ExecutionStatus.PARTIAL,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        cost: 0,
        responseTimeMs: 0,
        aiProvider: 'pending',
        aiModel: 'pending',
      });

      await this.executionRepository.save(execution);

      try {
        // Execute via AI Router
        const aiRequest = {
          requestType: this.mapCategoryToRequestType(category),
          userId,
          contextTokens: inputTokens,
          maxResponseTokens: template.constraints?.maxTokens || 1000,
          payload: {
            systemPrompt: template.systemPrompt,
            userPrompt: processedPrompt,
            temperature: template.constraints?.temperature || 0.7,
            ...template.constraints,
          },
        };

        const aiResponse = await this.aiRoutingService.routeRequest(aiRequest);
        const responseTime = Date.now() - startTime;
        const outputTokens = this.estimateTokens(JSON.stringify(aiResponse));

        // Update execution record
        execution.aiResponse = aiResponse;
        execution.status = ExecutionStatus.SUCCESS;
        execution.outputTokens = outputTokens;
        execution.totalTokens = inputTokens + outputTokens;
        execution.responseTimeMs = responseTime;
        execution.aiProvider = aiResponse.provider;
        execution.aiModel = aiResponse.model;
        execution.cost = aiResponse.estimatedCost || 0;

        await this.executionRepository.save(execution);

        // Update template metrics
        await this.updateTemplateMetrics(template, execution);

        this.logger.log(`Successfully executed prompt for user ${userId}, category ${category}`);

        return {
          success: true,
          response: aiResponse,
          execution,
        };
      } catch (aiError) {
        execution.status = ExecutionStatus.FAILED;
        execution.errorMessage = aiError.message;
        execution.responseTimeMs = Date.now() - startTime;
        await this.executionRepository.save(execution);

        return {
          success: false,
          error: aiError.message,
          execution,
        };
      }
    } catch (error) {
      this.logger.error(`Error executing prompt for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get optimized prompt template for a category
   */
  async getOptimalTemplate(category: PromptCategory): Promise<AIPromptTemplate | null> {
    return await this.templateRepository.findOne({
      where: {
        category,
        status: PromptStatus.ACTIVE,
      },
      order: {
        usageCount: 'DESC', // Prefer most used templates
        averageTokens: 'ASC', // Prefer lower token usage for cost optimization
      },
    });
  }

  /**
   * Create or update a prompt template
   */
  async createTemplate(templateData: Partial<AIPromptTemplate>): Promise<AIPromptTemplate> {
    const template = this.templateRepository.create(templateData);
    return await this.templateRepository.save(template);
  }

  /**
   * Get execution analytics for cost optimization
   */
  async getExecutionAnalytics(
    userId?: string,
    category?: PromptCategory,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const queryBuilder = this.executionRepository
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.template', 'template');

    if (userId) {
      queryBuilder.andWhere('execution.userId = :userId', { userId });
    }

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (startDate) {
      queryBuilder.andWhere('execution.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('execution.createdAt <= :endDate', { endDate });
    }

    const executions = await queryBuilder.getMany();

    // Calculate analytics
    const totalExecutions = executions.length;
    const totalCost = executions.reduce((sum, exec) => sum + exec.cost, 0);
    const totalTokens = executions.reduce((sum, exec) => sum + exec.totalTokens, 0);
    const averageResponseTime =
      executions.reduce((sum, exec) => sum + exec.responseTimeMs, 0) / totalExecutions;
    const successRate =
      executions.filter((exec) => exec.status === ExecutionStatus.SUCCESS).length / totalExecutions;

    const categoryBreakdown = executions.reduce(
      (acc, exec) => {
        const cat = exec.template.category;
        if (!acc[cat]) {
          acc[cat] = { count: 0, cost: 0, tokens: 0 };
        }
        acc[cat].count++;
        acc[cat].cost += exec.cost;
        acc[cat].tokens += exec.totalTokens;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      summary: {
        totalExecutions,
        totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
        totalTokens,
        averageResponseTime: Math.round(averageResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        averageCostPerExecution: Math.round((totalCost / totalExecutions) * 10000) / 10000,
        averageTokensPerExecution: Math.round(totalTokens / totalExecutions),
      },
      categoryBreakdown,
      recentExecutions: executions.slice(-10),
    };
  }

  private async resolveVariables(
    template: AIPromptTemplate,
    user: User,
    context?: any,
  ): Promise<Record<string, any>> {
    const resolvedValues: Record<string, any> = {};

    for (const variable of template.variables) {
      try {
        if (this.variableResolvers[variable.name]) {
          resolvedValues[variable.name] = await this.variableResolvers[variable.name](
            user,
            context,
          );
        } else if (variable.dataPath) {
          resolvedValues[variable.name] = this.extractDataPath(user, variable.dataPath);
        } else if (context && context[variable.name]) {
          resolvedValues[variable.name] = context[variable.name];
        } else if (variable.fallback) {
          resolvedValues[variable.name] = variable.fallback;
        } else if (variable.required) {
          this.logger.warn(`Required variable ${variable.name} not found for user ${user.id}`);
          resolvedValues[variable.name] = `[${variable.name} not available]`;
        }
      } catch (error) {
        this.logger.error(`Error resolving variable ${variable.name}:`, error);
        resolvedValues[variable.name] = variable.fallback || `[${variable.name} error]`;
      }
    }

    return resolvedValues;
  }

  private buildPrompt(template: AIPromptTemplate, variables: Record<string, any>): string {
    let prompt = template.userPromptTemplate;

    // Replace variables in the format {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      prompt = prompt.replace(placeholder, String(value || ''));
    }

    return prompt;
  }

  private async getTemplateById(templateId: string): Promise<AIPromptTemplate | null> {
    return await this.templateRepository.findOne({
      where: { id: templateId },
    });
  }

  private extractDataPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private mapCategoryToRequestType(category: PromptCategory): RequestType {
    const mapping: Record<PromptCategory, RequestType> = {
      [PromptCategory.NUTRITION_ADVICE]: RequestType.NUTRITION_ADVICE,
      [PromptCategory.MEAL_PLANNING]: RequestType.MEAL_PLANNING,
      [PromptCategory.FITNESS_PLANNING]: RequestType.FITNESS_PLANNING,
      [PromptCategory.HEALTH_CONSULTATION]: RequestType.HEALTH_CONSULTATION,
      [PromptCategory.RECIPE_GENERATION]: RequestType.RECIPE_GENERATION,
      [PromptCategory.GENERAL_CHAT]: RequestType.GENERAL_CHAT,
      [PromptCategory.PROGRESS_ANALYSIS]: RequestType.PROGRESS_ANALYSIS,
      [PromptCategory.HABIT_COACHING]: RequestType.HABIT_COACHING,
      [PromptCategory.MOTIVATIONAL_SUPPORT]: RequestType.MOTIVATIONAL_SUPPORT,
    };

    return mapping[category] || RequestType.GENERAL_CHAT;
  }

  private async updateTemplateMetrics(
    template: AIPromptTemplate,
    execution: AIPromptExecution,
  ): Promise<void> {
    template.usageCount++;

    // Update rolling average for tokens
    const newAverageTokens =
      (template.averageTokens * (template.usageCount - 1) + execution.totalTokens) /
      template.usageCount;
    template.averageTokens = Math.round(newAverageTokens * 100) / 100;

    // Update total cost
    template.totalCost += execution.cost;

    await this.templateRepository.save(template);
  }

  private initializeVariableResolvers(): void {
    (this as any).variableResolvers = {
      userName: (user: User) => user.profile?.firstName || user.email.split('@')[0],
      userAge: (user: User) => user.profile?.age || 'not specified',
      userWeight: (user: User) => user.profile?.weight || 'not specified',
      userHeight: (user: User) => user.profile?.height || 'not specified',
      userGoals: (user: User) =>
        Array.isArray(user.goals)
          ? user.goals.map((g) => g.primaryGoal).join(', ')
          : user.goals?.primaryGoal || 'general health',
      dietaryPreferences: (user: User) => user.preferences?.dietaryPreference || 'none specified',
      healthConditions: (user: User) => user.profile?.healthConditions || 'none reported',
      activityLevel: (user: User) => user.profile?.activityLevel || 'moderate',
      currentDate: () => new Date().toLocaleDateString(),
      currentTime: () => new Date().toLocaleTimeString(),
    };
  }
}
