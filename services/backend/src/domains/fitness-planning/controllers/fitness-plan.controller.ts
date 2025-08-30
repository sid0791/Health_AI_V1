import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import '../../../types/express'; // Import type declarations
import { FitnessPlanService } from '../services/fitness-plan.service';
import { SafetyValidationService } from '../services/safety-validation.service';
import { 
  CreateFitnessPlanDto, 
  UpdateFitnessPlanDto, 
  FitnessPlanFilterDto,
  GenerateFitnessPlanDto,
  FitnessPlanResponseDto,
  FitnessPlanStatsDto,
  WorkoutProgressDto,
  PlanProgressSummaryDto
} from '../dto/fitness-plan.dto';
import { FitnessPlan } from '../entities/fitness-plan.entity';
import { FitnessPlanWeek } from '../entities/fitness-plan-week.entity';

@Controller('fitness-plans')
export class FitnessPlanController {
  constructor(
    private readonly fitnessPlanService: FitnessPlanService,
    private readonly safetyValidationService: SafetyValidationService,
  ) {}

  /**
   * Create a new fitness plan manually
   * POST /fitness-plans
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFitnessPlan(
    @Body(ValidationPipe) createDto: CreateFitnessPlanDto,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id || 'test-user';
    return await this.fitnessPlanService.createFitnessPlan(userId, createDto);
  }

  /**
   * Generate an AI-powered fitness plan
   * POST /fitness-plans/generate
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateFitnessPlan(
    @Body(ValidationPipe) generateDto: GenerateFitnessPlanDto,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id || 'test-user';
    return await this.fitnessPlanService.generateFitnessPlan(userId, generateDto);
  }

  /**
   * Get user's fitness plans with filtering
   * GET /fitness-plans
   */
  @Get()
  async getUserFitnessPlans(
    @Query(ValidationPipe) filterDto: FitnessPlanFilterDto,
    @Req() req: Request
  ): Promise<{
    plans: FitnessPlan[];
    total: number;
    page: number;
    limit: number;
  }> {
    const userId = req.user?.id || 'test-user';
    return await this.fitnessPlanService.getUserFitnessPlans(userId, filterDto);
  }

  /**
   * Get fitness plan by ID
   * GET /fitness-plans/:id
   */
  @Get(':id')
  async getFitnessPlanById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.getFitnessPlanById(id, userId);
  }

  /**
   * Update a fitness plan
   * PUT /fitness-plans/:id
   */
  @Put(':id')
  async updateFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateFitnessPlanDto,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.updateFitnessPlan(id, updateDto, userId);
  }

  /**
   * Delete a fitness plan
   * DELETE /fitness-plans/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<void> {
    const userId = req.user?.id;
    await this.fitnessPlanService.deleteFitnessPlan(id, userId);
  }

  /**
   * Activate a fitness plan
   * POST /fitness-plans/:id/activate
   */
  @Post(':id/activate')
  async activateFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.activateFitnessPlan(id, userId);
  }

  /**
   * Pause a fitness plan
   * POST /fitness-plans/:id/pause
   */
  @Post(':id/pause')
  async pauseFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.pauseFitnessPlan(id, userId);
  }

  /**
   * Resume a paused fitness plan
   * POST /fitness-plans/:id/resume
   */
  @Post(':id/resume')
  async resumeFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.resumeFitnessPlan(id, userId);
  }

  /**
   * Complete a fitness plan
   * POST /fitness-plans/:id/complete
   */
  @Post(':id/complete')
  async completeFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.completeFitnessPlan(id, userId);
  }

  /**
   * Cancel a fitness plan
   * POST /fitness-plans/:id/cancel
   */
  @Post(':id/cancel')
  async cancelFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.cancelFitnessPlan(id, userId);
  }

  /**
   * Record workout progress
   * POST /fitness-plans/progress
   */
  @Post('progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordWorkoutProgress(
    @Body(ValidationPipe) progressDto: WorkoutProgressDto,
    @Req() req: Request
  ): Promise<void> {
    const userId = req.user?.id;
    await this.fitnessPlanService.recordWorkoutProgress(progressDto, userId);
  }

  /**
   * Get plan progress summary
   * GET /fitness-plans/:id/progress
   */
  @Get(':id/progress')
  async getPlanProgressSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request
  ): Promise<PlanProgressSummaryDto> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.getPlanProgressSummary(id, userId);
  }

  /**
   * Adapt a plan week based on progress
   * POST /fitness-plans/:id/weeks/:weekNumber/adapt
   */
  @Post(':id/weeks/:weekNumber/adapt')
  async adaptPlanWeek(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('weekNumber', ParseIntPipe) weekNumber: number,
    @Body() adaptations: {
      increaseDifficulty?: boolean;
      decreaseDifficulty?: boolean;
      changeExercises?: string[];
      adjustVolume?: number;
    },
    @Req() req: Request
  ): Promise<FitnessPlanWeek> {
    const userId = req.user?.id;
    return await this.fitnessPlanService.adaptPlanWeek(id, weekNumber, adaptations, userId);
  }

  /**
   * Get user's fitness statistics
   * GET /fitness-plans/stats/user
   */
  @Get('stats/user')
  async getUserFitnessStats(
    @Req() req: Request
  ): Promise<FitnessPlanStatsDto> {
    const userId = req.user?.id || 'test-user';
    return await this.fitnessPlanService.getUserFitnessStats(userId);
  }

  /**
   * Clone a fitness plan
   * POST /fitness-plans/:id/clone
   */
  @Post(':id/clone')
  async cloneFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cloneDto: { newPlanName: string },
    @Req() req: Request
  ): Promise<FitnessPlan> {
    const userId = req.user?.id || 'test-user';
    return await this.fitnessPlanService.cloneFitnessPlan(id, cloneDto.newPlanName, userId);
  }

  /**
   * Validate a fitness plan for safety
   * POST /fitness-plans/:id/validate
   */
  @Post(':id/validate')
  async validateFitnessPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userProfile: {
      experienceLevel: string;
      healthConditions?: string[];
      physicalLimitations?: string[];
      injuryHistory?: string[];
      age?: number;
      currentWeight?: number;
      fitnessGoals?: string[];
    },
    @Req() req: Request
  ): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
    recommendations: string[];
  }> {
    const userId = req.user?.id;
    const plan = await this.fitnessPlanService.getFitnessPlanById(id, userId);
    
    return this.safetyValidationService.validateFitnessPlan(plan, userProfile as any);
  }

  /**
   * Get progression recommendations
   * POST /fitness-plans/:id/progression-recommendations
   */
  @Post(':id/progression-recommendations')
  async getProgressionRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() feedbackDto: {
      adherenceScore: number;
      difficultyRating?: number;
      fatigueLevel?: number;
      enjoymentLevel?: number;
    },
    @Req() req: Request
  ): Promise<{
    shouldProgress: boolean;
    shouldDeload: boolean;
    recommendations: string[];
    adjustments: {
      volumeAdjustment: number;
      intensityAdjustment: number;
      frequencyAdjustment: number;
    };
  }> {
    const userId = req.user?.id;
    const plan = await this.fitnessPlanService.getFitnessPlanById(id, userId);
    
    return this.safetyValidationService.getProgressionRecommendations(
      plan,
      feedbackDto.adherenceScore,
      {
        difficultyRating: feedbackDto.difficultyRating,
        fatigueLevel: feedbackDto.fatigueLevel,
        enjoymentLevel: feedbackDto.enjoymentLevel,
      }
    );
  }

  /**
   * Validate exercise parameters
   * POST /fitness-plans/validate-exercise
   */
  @Post('validate-exercise')
  async validateExerciseParameters(
    @Body() validationDto: {
      exerciseName: string;
      sets: number;
      reps: number;
      weight?: number;
      userProfile?: {
        experienceLevel: string;
        currentWeight?: number;
      };
    }
  ): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
    recommendations: string[];
  }> {
    return this.safetyValidationService.validateExerciseParameters(
      validationDto.exerciseName,
      validationDto.sets,
      validationDto.reps,
      validationDto.weight,
      validationDto.userProfile as any
    );
  }

  /**
   * Get plan templates (approved public plans)
   * GET /fitness-plans/templates
   */
  @Get('templates/public')
  async getPlanTemplates(
    @Query(ValidationPipe) filterDto: FitnessPlanFilterDto
  ): Promise<{
    plans: FitnessPlan[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Set template filter
    const templateFilter = { ...filterDto, isTemplate: true, trainerApproved: true };
    return await this.fitnessPlanService.getUserFitnessPlans('public', templateFilter);
  }
}