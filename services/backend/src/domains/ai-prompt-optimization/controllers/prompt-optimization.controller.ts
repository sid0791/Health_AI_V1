import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PromptOptimizationService, PromptCategory } from '../services/prompt-optimization.service';

export class ExecutePromptDto {
  category: PromptCategory;
  userInput: Record<string, any>;
  template?: string;
  language?: 'en' | 'hi' | 'hinglish';
  model?: string;
  maxTokens?: number;
}

export class CreateTemplateDto {
  category: PromptCategory;
  name: string;
  description: string;
  template: string;
  language: 'en' | 'hi' | 'hinglish';
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    source?: 'user_profile' | 'health_data' | 'preferences' | 'input' | 'context';
    defaultValue?: any;
    description?: string;
  }>;
  metadata?: Record<string, any>;
}

@ApiTags('AI Prompt Optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-prompt-optimization')
export class PromptOptimizationController {
  constructor(private readonly promptOptimizationService: PromptOptimizationService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute optimized prompt with user context' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prompt executed successfully',
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        success: { type: 'boolean' },
        executionTime: { type: 'number' },
        metadata: { type: 'object' },
        tokensUsed: { type: 'number' },
        cost: { type: 'number' },
      },
    },
  })
  async executePrompt(
    @Request() req: any,
    @Body() executePromptDto: ExecutePromptDto,
  ) {
    const userId = req.user?.id;
    
    const result = await this.promptOptimizationService.executePrompt(
      userId,
      executePromptDto.category,
      executePromptDto.userInput,
      {
        template: executePromptDto.template,
        language: executePromptDto.language,
        model: executePromptDto.model,
        maxTokens: executePromptDto.maxTokens,
      }
    );

    return {
      ...result,
      timestamp: new Date(),
      userId,
    };
  }

  @Post('nutrition-advice')
  @ApiOperation({ summary: 'Get optimized nutrition advice' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nutrition advice prompt generated',
  })
  async getNutritionAdvice(
    @Request() req: any,
    @Body() body: { 
      query: string; 
      language?: 'en' | 'hi' | 'hinglish';
      additionalContext?: Record<string, any>;
    },
  ) {
    const userId = req.user?.id;
    
    const userInput = {
      user_query: body.query,
      ...body.additionalContext,
    };

    const result = await this.promptOptimizationService.executePrompt(
      userId,
      PromptCategory.NUTRITION_ADVICE,
      userInput,
      { language: body.language || 'en' }
    );

    return {
      prompt: result.prompt,
      success: result.success,
      category: PromptCategory.NUTRITION_ADVICE,
      language: body.language || 'en',
      costOptimized: result.metadata?.costOptimized || false,
      variablesResolved: result.metadata?.variablesResolved || 0,
      timestamp: new Date(),
    };
  }

  @Post('meal-planning')
  @ApiOperation({ summary: 'Get optimized meal planning prompt' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meal planning prompt generated',
  })
  async getMealPlanningPrompt(
    @Request() req: any,
    @Body() body: { 
      focus?: string;
      days?: number;
      mealTypes?: string[];
      additionalRequirements?: string;
      language?: 'en' | 'hi' | 'hinglish';
    },
  ) {
    const userId = req.user?.id;
    
    const userInput = {
      meal_focus: body.focus || 'balanced nutrition',
      days: body.days || 7,
      meal_types: body.mealTypes?.join(', ') || 'breakfast, lunch, dinner, snacks',
      additional_requirements: body.additionalRequirements || '',
    };

    const result = await this.promptOptimizationService.executePrompt(
      userId,
      PromptCategory.MEAL_PLANNING,
      userInput,
      { language: body.language || 'en' }
    );

    return {
      prompt: result.prompt,
      success: result.success,
      category: PromptCategory.MEAL_PLANNING,
      costOptimized: result.metadata?.costOptimized || false,
      timestamp: new Date(),
    };
  }

  @Post('fitness-guidance')
  @ApiOperation({ summary: 'Get optimized fitness guidance prompt' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fitness guidance prompt generated',
  })
  async getFitnessGuidance(
    @Request() req: any,
    @Body() body: { 
      query: string;
      fitnessLevel?: string;
      targetWeight?: number;
      workoutTime?: number;
      availableEquipment?: string;
      language?: 'en' | 'hi' | 'hinglish';
    },
  ) {
    const userId = req.user?.id;
    
    const userInput = {
      user_query: body.query,
      fitness_level: body.fitnessLevel || 'beginner',
      target_weight: body.targetWeight,
      workout_time: body.workoutTime || 30,
      available_equipment: body.availableEquipment || 'basic home equipment',
    };

    const result = await this.promptOptimizationService.executePrompt(
      userId,
      PromptCategory.FITNESS_GUIDANCE,
      userInput,
      { language: body.language || 'en' }
    );

    return {
      prompt: result.prompt,
      success: result.success,
      category: PromptCategory.FITNESS_GUIDANCE,
      timestamp: new Date(),
    };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available prompt templates' })
  @ApiQuery({ name: 'category', required: false, enum: PromptCategory })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  async getTemplates(
    @Query('category') category?: PromptCategory,
  ) {
    if (category) {
      const templates = this.promptOptimizationService.getTemplatesByCategory(category);
      return {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          language: t.language,
          costOptimized: t.costOptimized,
          variableCount: t.variables.length,
        })),
        category,
        total: templates.length,
        timestamp: new Date(),
      };
    }

    // Get all categories and their template counts
    const categoryCounts: Record<string, number> = {};
    const allCategories = Object.values(PromptCategory);
    
    allCategories.forEach(cat => {
      const templates = this.promptOptimizationService.getTemplatesByCategory(cat);
      categoryCounts[cat] = templates.length;
    });

    return {
      categories: categoryCounts,
      totalTemplates: Object.values(categoryCounts).reduce((sum, count) => sum + count, 0),
      availableCategories: allCategories,
      timestamp: new Date(),
    };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get specific template details' })
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template details retrieved successfully',
  })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = this.promptOptimizationService.getTemplate(templateId);
    
    if (!template) {
      return {
        found: false,
        message: `Template ${templateId} not found`,
        timestamp: new Date(),
      };
    }

    return {
      found: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        language: template.language,
        costOptimized: template.costOptimized,
        variables: template.variables.map(v => ({
          name: v.name,
          type: v.type,
          required: v.required,
          source: v.source,
          description: v.description,
          hasDefault: v.defaultValue !== undefined,
        })),
        templatePreview: template.template.substring(0, 500) + (template.template.length > 500 ? '...' : ''),
      },
      timestamp: new Date(),
    };
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create custom prompt template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  async createTemplate(
    @Request() req: any,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    // Generate unique ID for custom template
    const templateId = `custom_${createTemplateDto.category}_${Date.now()}`;
    
    const template = {
      id: templateId,
      category: createTemplateDto.category,
      name: createTemplateDto.name,
      description: createTemplateDto.description,
      template: createTemplateDto.template,
      language: createTemplateDto.language,
      costOptimized: true, // Mark custom templates as cost optimized
      variables: createTemplateDto.variables.map(v => ({
        name: v.name,
        type: v.type,
        required: v.required,
        source: v.source || 'input',
        defaultValue: v.defaultValue,
        description: v.description,
      })),
      metadata: {
        ...createTemplateDto.metadata,
        createdBy: req.user?.id,
        createdAt: new Date(),
        custom: true,
      },
    };

    this.promptOptimizationService.addTemplate(template);

    return {
      success: true,
      templateId,
      message: 'Custom template created successfully',
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        language: template.language,
      },
      timestamp: new Date(),
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available prompt categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    const categories = Object.values(PromptCategory).map(category => {
      const templates = this.promptOptimizationService.getTemplatesByCategory(category);
      
      return {
        category,
        name: this.getCategoryDisplayName(category),
        description: this.getCategoryDescription(category),
        templateCount: templates.length,
        languages: [...new Set(templates.map(t => t.language))],
        costOptimizedCount: templates.filter(t => t.costOptimized).length,
      };
    });

    return {
      categories,
      total: categories.length,
      timestamp: new Date(),
    };
  }

  @Post('test-variables')
  @ApiOperation({ summary: 'Test variable resolution for a template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Variable resolution test completed',
  })
  async testVariables(
    @Request() req: any,
    @Body() body: {
      templateId: string;
      testInput: Record<string, any>;
    },
  ) {
    const userId = req.user?.id;
    const template = this.promptOptimizationService.getTemplate(body.templateId);
    
    if (!template) {
      return {
        success: false,
        error: 'Template not found',
        timestamp: new Date(),
      };
    }

    // Execute with test input to see variable resolution
    const result = await this.promptOptimizationService.executePrompt(
      userId,
      template.category,
      body.testInput,
      { template: body.templateId }
    );

    return {
      success: result.success,
      templateId: body.templateId,
      resolvedVariables: result.metadata?.variablesResolved || 0,
      totalVariables: template.variables.length,
      prompt: result.prompt,
      executionTime: result.executionTime,
      testInput: body.testInput,
      timestamp: new Date(),
    };
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: PromptCategory): string {
    const displayNames: Record<PromptCategory, string> = {
      [PromptCategory.NUTRITION_ADVICE]: 'Nutrition Advice',
      [PromptCategory.MEAL_PLANNING]: 'Meal Planning',
      [PromptCategory.FITNESS_GUIDANCE]: 'Fitness Guidance',
      [PromptCategory.HEALTH_ANALYSIS]: 'Health Analysis',
      [PromptCategory.LIFESTYLE_TIPS]: 'Lifestyle Tips',
      [PromptCategory.SYMPTOM_CHECKER]: 'Symptom Checker',
      [PromptCategory.MEDICATION_INFO]: 'Medication Information',
      [PromptCategory.DIET_MODIFICATION]: 'Diet Modification',
      [PromptCategory.WEIGHT_MANAGEMENT]: 'Weight Management',
      [PromptCategory.GENERAL_CHAT]: 'General Chat',
    };

    return displayNames[category] || category;
  }

  /**
   * Get description for category
   */
  private getCategoryDescription(category: PromptCategory): string {
    const descriptions: Record<PromptCategory, string> = {
      [PromptCategory.NUTRITION_ADVICE]: 'Personalized nutrition recommendations and dietary guidance',
      [PromptCategory.MEAL_PLANNING]: 'Custom meal plans and recipe suggestions',
      [PromptCategory.FITNESS_GUIDANCE]: 'Exercise recommendations and workout planning',
      [PromptCategory.HEALTH_ANALYSIS]: 'Health data interpretation and insights',
      [PromptCategory.LIFESTYLE_TIPS]: 'Lifestyle modification suggestions',
      [PromptCategory.SYMPTOM_CHECKER]: 'Symptom assessment and preliminary guidance',
      [PromptCategory.MEDICATION_INFO]: 'Medication information and interactions',
      [PromptCategory.DIET_MODIFICATION]: 'Dietary adjustments for health conditions',
      [PromptCategory.WEIGHT_MANAGEMENT]: 'Weight loss and gain strategies',
      [PromptCategory.GENERAL_CHAT]: 'General health and wellness conversations',
    };

    return descriptions[category] || 'Health-related assistance';
  }

  // Enhanced Cost Optimization and Analytics Endpoints

  @Get('cost-metrics')
  @ApiOperation({ summary: 'Get user cost metrics and usage analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost metrics retrieved successfully',
  })
  async getCostMetrics(@Request() req: any) {
    const userId = req.user?.id;
    const metrics = await this.promptOptimizationService.getCostMetrics(userId);
    const quotaStatus = await this.promptOptimizationService.getQuotaStatus(userId);

    return {
      success: true,
      metrics,
      quota: quotaStatus,
      timestamp: new Date(),
    };
  }

  @Get('quota-status')
  @ApiOperation({ summary: 'Get user quota status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quota status retrieved successfully',
  })
  async getQuotaStatus(@Request() req: any) {
    const userId = req.user?.id;
    const quotaStatus = await this.promptOptimizationService.getQuotaStatus(userId);

    return {
      success: true,
      quota: quotaStatus,
      timestamp: new Date(),
    };
  }

  @Post('execute-optimized')
  @ApiOperation({ summary: 'Execute prompt with cost optimization (batching enabled)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimized prompt executed successfully',
  })
  async executeOptimizedPrompt(
    @Request() req: any,
    @Body() executePromptDto: ExecutePromptDto & { enableBatching?: boolean },
  ) {
    const userId = req.user?.id;

    const result = await this.promptOptimizationService.executePrompt(
      userId,
      executePromptDto.category,
      executePromptDto.userInput,
      {
        template: executePromptDto.template,
        language: executePromptDto.language,
        model: executePromptDto.model,
        maxTokens: executePromptDto.maxTokens,
        enableBatching: executePromptDto.enableBatching || true, // Enable by default
      }
    );

    return {
      success: result.success,
      prompt: result.prompt,
      metadata: result.metadata,
      error: result.error,
      timestamp: new Date(),
    };
  }

  @Get('template-statistics')
  @ApiOperation({ summary: 'Get template usage statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template statistics retrieved successfully',
  })
  async getTemplateStatistics() {
    const stats = this.promptOptimizationService.getTemplateStatistics();
    const usage = this.promptOptimizationService.getTemplateUsageAnalytics();

    return {
      success: true,
      statistics: stats,
      usage,
      timestamp: new Date(),
    };
  }

  @Post('reload-templates')
  @ApiOperation({ summary: 'Reload templates from JSON files' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates reloaded successfully',
  })
  async reloadTemplates() {
    try {
      await this.promptOptimizationService.reloadTemplates();
      const stats = this.promptOptimizationService.getTemplateStatistics();

      return {
        success: true,
        message: 'Templates reloaded successfully',
        statistics: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('test-template/:templateId')
  @ApiOperation({ summary: 'Test template with sample data' })
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template tested successfully',
  })
  async testTemplate(
    @Param('templateId') templateId: string,
    @Body() sampleData: Record<string, any>,
  ) {
    const result = await this.promptOptimizationService.testTemplate(templateId, sampleData);

    return {
      templateId,
      testResult: result,
      timestamp: new Date(),
    };
  }

  @Post('batch-execute')
  @ApiOperation({ summary: 'Execute multiple prompts in a cost-optimized batch' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch execution initiated',
  })
  async batchExecutePrompts(
    @Request() req: any,
    @Body() body: {
      requests: Array<{
        category: PromptCategory;
        userInput: Record<string, any>;
        priority?: 'high' | 'medium' | 'low';
        template?: string;
        language?: 'en' | 'hi' | 'hinglish';
      }>;
    },
  ) {
    const userId = req.user?.id;
    const results = [];

    for (const request of body.requests) {
      const result = await this.promptOptimizationService.executePrompt(
        userId,
        request.category,
        request.userInput,
        {
          template: request.template,
          language: request.language,
          enableBatching: true,
        }
      );

      results.push({
        category: request.category,
        success: result.success,
        batched: result.metadata?.batched || false,
        batchId: result.metadata?.batchId,
        error: result.error,
      });
    }

    return {
      success: true,
      batchSize: body.requests.length,
      results,
      message: 'Batch requests processed',
      timestamp: new Date(),
    };
  }
}
}