import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { User as UserEntity } from '../../users/entities/user.entity';
import {
  HealthInsightsService,
  DietPlanCreationRequest,
} from '../services/health-insights.service';
import { DietPhase } from '../entities/diet-plan.entity';

// DTOs
export class CreateDietPlanDto {
  @IsArray()
  @IsString({ each: true })
  targetConditions: string[];

  @IsEnum(DietPhase)
  phase: DietPhase;

  @IsNumber()
  @Min(7)
  @Max(365)
  durationDays: number;

  @IsOptional()
  @IsBoolean()
  useHealthInsights?: boolean = true;

  @IsOptional()
  customPreferences?: {
    targetCalories?: number;
    dietaryRestrictions?: string[];
    cuisinePreferences?: string[];
  };
}

export class TransitionDietPlanDto {
  @IsEnum(['continue', 'maintain', 'balanced', 'recheck'])
  userChoice: 'continue' | 'maintain' | 'balanced' | 'recheck';
}

@ApiTags('Health Insights & Diet Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class HealthInsightsController {
  private readonly logger = new Logger(HealthInsightsController.name);

  constructor(private readonly healthInsightsService: HealthInsightsService) {}

  /**
   * GET /chat/health-insights - Retrieve cached health analysis insights
   */
  @Get('health-insights')
  @ApiOperation({
    summary: 'Get cached health analysis insights',
    description: 'Retrieve cached Level 1 AI health analysis responses for instant reuse (0 cost)',
  })
  @ApiResponse({
    status: 200,
    description: 'Health insights retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  category: { type: 'string' },
                  title: { type: 'string' },
                  insight: { type: 'string' },
                  recommendation: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                  metadata: { type: 'object' },
                  createdAt: { type: 'string' },
                },
              },
            },
            totalCount: { type: 'number' },
            cacheHit: { type: 'boolean' },
            lastUpdated: { type: 'string' },
            categories: { type: 'object' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHealthInsights(@User() user: UserEntity) {
    this.logger.debug(`Getting health insights for user: ${user.id}`);

    try {
      const insights = await this.healthInsightsService.getHealthInsights(user.id);

      return {
        success: true,
        data: insights,
        message: insights.cacheHit
          ? 'Health insights retrieved from cache - zero cost!'
          : 'Health insights retrieved from database',
      };
    } catch (error) {
      this.logger.error(`Error getting health insights: ${error.message}`);
      throw new BadRequestException(`Failed to retrieve health insights: ${error.message}`);
    }
  }

  /**
   * GET /chat/diet-plan - Get current timeline-based diet plan with progress
   */
  @Get('diet-plan')
  @ApiOperation({
    summary: 'Get current diet plan with timeline progress',
    description:
      'Retrieve active timeline-based diet plan with progress tracking and milestone updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Diet plan retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            dietPlan: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                phase: {
                  type: 'string',
                  enum: ['correction', 'maintenance', 'optimization', 'balanced'],
                },
                status: { type: 'string' },
                targetConditions: { type: 'object' },
                planDetails: { type: 'object' },
                timeline: { type: 'object' },
                progressTracking: { type: 'object' },
                nextTransitionCheck: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
            nextMilestone: { type: 'object' },
            readyForTransition: { type: 'boolean' },
            adherenceScore: { type: 'number' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No active diet plan found' })
  async getCurrentDietPlan(@User() user: UserEntity) {
    this.logger.debug(`Getting current diet plan for user: ${user.id}`);

    try {
      const dietPlan = await this.healthInsightsService.getCurrentDietPlan(user.id);

      if (!dietPlan) {
        return {
          success: true,
          data: null,
          message:
            'No active diet plan found. Consider creating one based on your health insights.',
        };
      }

      return {
        success: true,
        data: {
          dietPlan,
          nextMilestone: dietPlan.getNextMilestone(),
          readyForTransition: dietPlan.isReadyForTransition(),
          adherenceScore: dietPlan.calculateAdherenceScore(),
        },
        message: 'Current diet plan retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error getting diet plan: ${error.message}`);
      throw new BadRequestException(`Failed to retrieve diet plan: ${error.message}`);
    }
  }

  /**
   * POST /chat/diet-plan/generate - Generate personalized diet plan from cached health data
   */
  @Post('diet-plan/generate')
  @ApiOperation({
    summary: 'Generate personalized diet plan using cached health insights',
    description:
      'Create timeline-based diet plan using cached Level 1 health analysis (cost-optimized)',
  })
  @ApiBody({ type: CreateDietPlanDto })
  @ApiResponse({
    status: 201,
    description: 'Diet plan generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            dietPlan: { type: 'object' },
            timeline: { type: 'object' },
            healthInsightsUsed: { type: 'number' },
            costSavings: { type: 'object' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid diet plan parameters' })
  @HttpCode(HttpStatus.CREATED)
  async generateDietPlan(@User() user: UserEntity, @Body() createDietPlanDto: CreateDietPlanDto) {
    this.logger.debug(`Generating diet plan for user: ${user.id}`);

    try {
      const request: DietPlanCreationRequest = {
        userId: user.id,
        targetConditions: createDietPlanDto.targetConditions,
        phase: createDietPlanDto.phase,
        durationDays: createDietPlanDto.durationDays,
        useHealthInsights: createDietPlanDto.useHealthInsights ?? true,
        customPreferences: createDietPlanDto.customPreferences,
      };

      const dietPlan = await this.healthInsightsService.createTimelineDietPlan(request);

      // Calculate cost savings from using cached health insights
      const healthInsights = await this.healthInsightsService.getHealthInsights(user.id);
      const costSavings = {
        usesCachedInsights: request.useHealthInsights && healthInsights.cacheHit,
        estimatedSavings: healthInsights.cacheHit ? 0.02 : 0, // Typical Level 1 AI cost
        healthInsightsUsed: healthInsights.insights.length,
      };

      return {
        success: true,
        data: {
          dietPlan,
          timeline: dietPlan.timeline,
          healthInsightsUsed: healthInsights.insights.length,
          costSavings,
        },
        message:
          request.useHealthInsights && healthInsights.cacheHit
            ? 'Diet plan generated using cached health insights - significant cost savings achieved!'
            : 'Diet plan generated successfully',
      };
    } catch (error) {
      this.logger.error(`Error generating diet plan: ${error.message}`);
      throw new BadRequestException(`Failed to generate diet plan: ${error.message}`);
    }
  }

  /**
   * POST /chat/diet-plan/:planId/transition - Transition between diet plan phases
   */
  @Post('diet-plan/:planId/transition')
  @ApiOperation({
    summary: 'Transition diet plan phase with user choice',
    description:
      'Handle diet plan phase transitions (correction → maintenance → balanced) with user choice',
  })
  @ApiParam({
    name: 'planId',
    description: 'Diet plan ID',
    type: 'string',
  })
  @ApiBody({ type: TransitionDietPlanDto })
  @ApiResponse({
    status: 200,
    description: 'Diet plan transitioned successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            previousPlan: { type: 'object' },
            newPlan: { type: 'object' },
            transition: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                reason: { type: 'string' },
                userChoice: { type: 'string' },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Diet plan not found' })
  async transitionDietPlan(
    @User() user: UserEntity,
    @Param('planId') planId: string,
    @Body() transitionDto: TransitionDietPlanDto,
  ) {
    this.logger.debug(`Transitioning diet plan ${planId} for user: ${user.id}`);

    try {
      const currentPlan = await this.healthInsightsService.getCurrentDietPlan(user.id);
      if (!currentPlan || currentPlan.id !== planId) {
        throw new BadRequestException('Diet plan not found or not active');
      }

      const newPlan = await this.healthInsightsService.transitionDietPlan(
        user.id,
        planId,
        transitionDto.userChoice,
      );

      return {
        success: true,
        data: {
          previousPlan: currentPlan,
          newPlan,
          transition: {
            from: currentPlan.phase,
            to: newPlan.phase,
            reason: this.getTransitionReason(transitionDto.userChoice),
            userChoice: transitionDto.userChoice,
          },
        },
        message: `Successfully transitioned from ${currentPlan.phase} to ${newPlan.phase} phase`,
      };
    } catch (error) {
      this.logger.error(`Error transitioning diet plan: ${error.message}`);
      throw new BadRequestException(`Failed to transition diet plan: ${error.message}`);
    }
  }

  /**
   * GET /chat/health-cache/stats - View cache performance and cost savings metrics
   */
  @Get('health-cache/stats')
  @ApiOperation({
    summary: 'Get health insights cache performance statistics',
    description:
      'View cache hit rates, cost savings, and performance metrics for Level 1 AI responses',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            cacheHit: { type: 'boolean' },
            totalInsights: { type: 'number' },
            costSavings: { type: 'number' },
            cacheAge: { type: 'number' },
            expiresIn: { type: 'number' },
            performance: {
              type: 'object',
              properties: {
                averageResponseTime: { type: 'number' },
                cacheHitRate: { type: 'number' },
                totalQueriesAnswered: { type: 'number' },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async getCacheStats(@User() user: UserEntity) {
    this.logger.debug(`Getting cache stats for user: ${user.id}`);

    try {
      const stats = await this.healthInsightsService.getCacheStats(user.id);

      return {
        success: true,
        data: {
          ...stats,
          performance: {
            averageResponseTime: stats.cacheHit ? 50 : 2000, // ms
            cacheHitRate: stats.cacheHit ? 100 : 0, // %
            totalQueriesAnswered: stats.totalInsights,
          },
        },
        message: stats.cacheHit
          ? `Cache active with $${stats.costSavings?.toFixed(4)} in potential savings`
          : 'No cache data available - future Level 1 queries will build cache',
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${error.message}`);
      throw new BadRequestException(`Failed to retrieve cache stats: ${error.message}`);
    }
  }

  // Private helper methods

  private getTransitionReason(userChoice: string): string {
    const reasons = {
      continue: 'User chose to continue current phase for extended improvement',
      maintain: 'User chose to transition to maintenance phase to preserve gains',
      balanced: 'User chose to transition to balanced general diet',
      recheck: 'User chose to get health rechecked before next phase',
    };

    return reasons[userChoice] || 'Phase transition requested';
  }
}
