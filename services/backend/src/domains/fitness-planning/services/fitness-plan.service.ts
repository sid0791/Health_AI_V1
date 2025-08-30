import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { FitnessPlan, FitnessPlanStatus } from '../entities/fitness-plan.entity';
import { FitnessPlanWeek } from '../entities/fitness-plan-week.entity';
import { FitnessPlanWorkout } from '../entities/fitness-plan-workout.entity';
import { FitnessPlanExercise } from '../entities/fitness-plan-exercise.entity';
import {
  CreateFitnessPlanDto,
  UpdateFitnessPlanDto,
  FitnessPlanFilterDto,
  GenerateFitnessPlanDto,
  FitnessPlanResponseDto,
  FitnessPlanStatsDto,
  WorkoutProgressDto,
  PlanProgressSummaryDto,
} from '../dto/fitness-plan.dto';
import { FitnessPlanGeneratorService } from './fitness-plan-generator.service';

@Injectable()
export class FitnessPlanService {
  constructor(
    @InjectRepository(FitnessPlan)
    private readonly fitnessPlanRepository: Repository<FitnessPlan>,
    @InjectRepository(FitnessPlanWeek)
    private readonly weekRepository: Repository<FitnessPlanWeek>,
    @InjectRepository(FitnessPlanWorkout)
    private readonly workoutRepository: Repository<FitnessPlanWorkout>,
    @InjectRepository(FitnessPlanExercise)
    private readonly exerciseRepository: Repository<FitnessPlanExercise>,
    private readonly planGeneratorService: FitnessPlanGeneratorService,
  ) {}

  /**
   * Create a new fitness plan manually
   */
  async createFitnessPlan(userId: string, createDto: CreateFitnessPlanDto): Promise<FitnessPlan> {
    // Validate date constraints
    const today = new Date();
    if (createDto.startDate < today) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    const endDate = new Date(createDto.startDate);
    endDate.setDate(endDate.getDate() + createDto.durationWeeks * 7);

    const plan = this.fitnessPlanRepository.create({
      ...createDto,
      userId,
      endDate,
      restDaysPerWeek: createDto.restDaysPerWeek ?? 7 - (createDto.workoutsPerWeek || 3),
      workoutLocation: createDto.workoutLocation || 'home',
      maxWorkoutDurationMinutes: createDto.maxWorkoutDurationMinutes || 60,
      workoutIntensityPreference: createDto.workoutIntensityPreference || 'moderate',
      progressiveOverloadEnabled: createDto.progressiveOverloadEnabled ?? true,
      autoProgressionRate: createDto.autoProgressionRate || 1.05,
      deloadWeekFrequency: createDto.deloadWeekFrequency || 4,
      formCheckReminders: createDto.formCheckReminders ?? true,
      warmUpRequired: createDto.warmUpRequired ?? true,
      coolDownRequired: createDto.coolDownRequired ?? true,
      restPeriodEnforcement: createDto.restPeriodEnforcement ?? true,
      generatedByAI: false,
    });

    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Generate an AI-powered fitness plan
   */
  async generateFitnessPlan(
    userId: string,
    generateDto: GenerateFitnessPlanDto,
  ): Promise<FitnessPlan> {
    const planParams = {
      planType: generateDto.planType,
      experienceLevel: generateDto.experienceLevel,
      durationWeeks: generateDto.durationWeeks,
      workoutsPerWeek: generateDto.workoutsPerWeek,
      maxWorkoutDurationMinutes: generateDto.maxWorkoutDurationMinutes || 60,
      availableEquipment: generateDto.availableEquipment,
      focusAreas: generateDto.focusAreas,
      healthConditions: generateDto.healthConditions,
      physicalLimitations: generateDto.physicalLimitations,
      preferredExerciseTypes: generateDto.preferredExerciseTypes,
      dislikedExercises: generateDto.dislikedExercises,
      workoutIntensityPreference: generateDto.workoutIntensityPreference || 'moderate',
      progressiveOverloadEnabled: generateDto.progressiveOverloadEnabled ?? true,
      deloadWeekFrequency: generateDto.deloadWeekFrequency || 4,
    };

    return await this.planGeneratorService.generateFitnessPlan(userId, planParams);
  }

  /**
   * Get fitness plan by ID with full details
   */
  async getFitnessPlanById(id: string, userId?: string): Promise<FitnessPlan> {
    const plan = await this.fitnessPlanRepository.findOne({
      where: { id },
      relations: ['weeks', 'weeks.workouts', 'weeks.workouts.exercises'],
    });

    if (!plan) {
      throw new NotFoundException(`Fitness plan with ID '${id}' not found`);
    }

    // Check ownership if userId provided
    if (userId && plan.userId !== userId) {
      throw new ForbiddenException('You do not have access to this fitness plan');
    }

    return plan;
  }

  /**
   * Get user's fitness plans with filtering
   */
  async getUserFitnessPlans(
    userId: string,
    filterDto: FitnessPlanFilterDto,
  ): Promise<{
    plans: FitnessPlan[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      search,
      planType,
      status,
      experienceLevel,
      availableEquipment,
      workoutLocation,
      maxWorkoutsPerWeek,
      maxWorkoutDuration,
      focusAreas,
      tags,
      startDateFrom,
      startDateTo,
      isTemplate,
      trainerApproved,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const queryBuilder = this.fitnessPlanRepository.createQueryBuilder('plan');

    // Base filter - user's plans or public templates
    if (isTemplate) {
      queryBuilder.where('plan.isTemplate = true AND plan.trainerApproved = true');
    } else {
      queryBuilder.where('plan.userId = :userId', { userId });
    }

    // Apply filters
    if (search) {
      queryBuilder.andWhere('(plan.planName ILIKE :search OR plan.planDescription ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (planType) {
      queryBuilder.andWhere('plan.planType = :planType', { planType });
    }

    if (status) {
      queryBuilder.andWhere('plan.status = :status', { status });
    }

    if (experienceLevel) {
      queryBuilder.andWhere('plan.experienceLevel = :experienceLevel', { experienceLevel });
    }

    if (workoutLocation) {
      queryBuilder.andWhere('plan.workoutLocation = :workoutLocation', { workoutLocation });
    }

    if (maxWorkoutsPerWeek) {
      queryBuilder.andWhere('plan.workoutsPerWeek <= :maxWorkoutsPerWeek', { maxWorkoutsPerWeek });
    }

    if (maxWorkoutDuration) {
      queryBuilder.andWhere('plan.maxWorkoutDurationMinutes <= :maxWorkoutDuration', {
        maxWorkoutDuration,
      });
    }

    if (availableEquipment && availableEquipment.length > 0) {
      queryBuilder.andWhere('plan.availableEquipment && :availableEquipment', {
        availableEquipment,
      });
    }

    if (focusAreas && focusAreas.length > 0) {
      queryBuilder.andWhere('plan.focusAreas && :focusAreas', { focusAreas });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('plan.tags && :tags', { tags });
    }

    if (startDateFrom && startDateTo) {
      queryBuilder.andWhere('plan.startDate BETWEEN :startDateFrom AND :startDateTo', {
        startDateFrom,
        startDateTo,
      });
    } else if (startDateFrom) {
      queryBuilder.andWhere('plan.startDate >= :startDateFrom', { startDateFrom });
    } else if (startDateTo) {
      queryBuilder.andWhere('plan.startDate <= :startDateTo', { startDateTo });
    }

    if (trainerApproved !== undefined) {
      queryBuilder.andWhere('plan.trainerApproved = :trainerApproved', { trainerApproved });
    }

    // Apply sorting
    const allowedSortFields = [
      'planName',
      'planType',
      'status',
      'experienceLevel',
      'startDate',
      'durationWeeks',
      'adherenceScore',
      'satisfactionRating',
      'createdAt',
      'updatedAt',
    ];

    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`plan.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('plan.createdAt', 'DESC');
    }

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const [plans, total] = await queryBuilder.getManyAndCount();

    return {
      plans,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  /**
   * Update a fitness plan
   */
  async updateFitnessPlan(
    id: string,
    updateDto: UpdateFitnessPlanDto,
    userId?: string,
  ): Promise<FitnessPlan> {
    const plan = await this.getFitnessPlanById(id, userId);

    // Prevent modification of active plans without proper controls
    if (plan.status === FitnessPlanStatus.ACTIVE && updateDto.status !== FitnessPlanStatus.PAUSED) {
      throw new BadRequestException('Cannot modify active plan. Pause the plan first.');
    }

    // Update end date if duration changes
    if (updateDto.durationWeeks && updateDto.durationWeeks !== plan.durationWeeks) {
      const newEndDate = new Date(plan.startDate);
      newEndDate.setDate(newEndDate.getDate() + updateDto.durationWeeks * 7);
      plan.endDate = newEndDate;
    }

    // Update rest days if workouts per week changes
    if (updateDto.workoutsPerWeek) {
      updateDto.restDaysPerWeek = 7 - updateDto.workoutsPerWeek;
    }

    Object.assign(plan, updateDto);
    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Delete a fitness plan
   */
  async deleteFitnessPlan(id: string, userId?: string): Promise<void> {
    const plan = await this.getFitnessPlanById(id, userId);

    if (plan.status === FitnessPlanStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active plan. Complete or cancel it first.');
    }

    await this.fitnessPlanRepository.remove(plan);
  }

  /**
   * Activate a fitness plan
   */
  async activateFitnessPlan(id: string, userId?: string): Promise<FitnessPlan> {
    const plan = await this.getFitnessPlanById(id, userId);

    if (plan.status === FitnessPlanStatus.ACTIVE) {
      throw new BadRequestException('Plan is already active');
    }

    // Deactivate any other active plans for this user
    await this.fitnessPlanRepository.update(
      { userId: plan.userId, status: FitnessPlanStatus.ACTIVE },
      { status: FitnessPlanStatus.PAUSED },
    );

    plan.activate();
    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Pause a fitness plan
   */
  async pauseFitnessPlan(id: string, userId?: string): Promise<FitnessPlan> {
    const plan = await this.getFitnessPlanById(id, userId);

    if (plan.status !== FitnessPlanStatus.ACTIVE) {
      throw new BadRequestException('Only active plans can be paused');
    }

    plan.pause();
    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Resume a paused fitness plan
   */
  async resumeFitnessPlan(id: string, userId?: string): Promise<FitnessPlan> {
    const plan = await this.getFitnessPlanById(id, userId);

    if (plan.status !== FitnessPlanStatus.PAUSED) {
      throw new BadRequestException('Only paused plans can be resumed');
    }

    // Deactivate any other active plans for this user
    await this.fitnessPlanRepository.update(
      { userId: plan.userId, status: FitnessPlanStatus.ACTIVE },
      { status: FitnessPlanStatus.PAUSED },
    );

    plan.resume();
    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Complete a fitness plan
   */
  async completeFitnessPlan(id: string, userId?: string): Promise<FitnessPlan> {
    const plan = await this.getFitnessPlanById(id, userId);

    if (plan.status === FitnessPlanStatus.COMPLETED) {
      throw new BadRequestException('Plan is already completed');
    }

    plan.complete();
    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Cancel a fitness plan
   */
  async cancelFitnessPlan(id: string, userId?: string): Promise<FitnessPlan> {
    const plan = await this.getFitnessPlanById(id, userId);

    if (
      plan.status === FitnessPlanStatus.COMPLETED ||
      plan.status === FitnessPlanStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled plan');
    }

    plan.cancel();
    return await this.fitnessPlanRepository.save(plan);
  }

  /**
   * Record workout progress
   */
  async recordWorkoutProgress(progressDto: WorkoutProgressDto, userId?: string): Promise<void> {
    const plan = await this.getFitnessPlanById(progressDto.planId, userId);

    if (plan.status !== FitnessPlanStatus.ACTIVE) {
      throw new BadRequestException('Can only record progress for active plans');
    }

    // Update plan progress
    plan.updateProgress(1, progressDto.caloriesBurned, progressDto.durationMinutes);

    // Update satisfaction rating if provided
    if (progressDto.satisfactionRating) {
      plan.updateSatisfactionRating(progressDto.satisfactionRating);
    }

    await this.fitnessPlanRepository.save(plan);

    // Update individual exercise progress if provided
    if (progressDto.exerciseProgress) {
      for (const exerciseProgress of progressDto.exerciseProgress) {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: exerciseProgress.exerciseId },
        });

        if (exercise) {
          exercise.completedSets = exerciseProgress.setsCompleted;
          exercise.actualRepsCompleted = exerciseProgress.repsCompleted;
          exercise.actualWeightsKg = exerciseProgress.weightsUsed;
          exercise.actualDurationSeconds = exerciseProgress.durationSeconds;
          exercise.actualRestSeconds = exerciseProgress.restSeconds;
          exercise.notes = exerciseProgress.notes;

          await this.exerciseRepository.save(exercise);
        }
      }
    }
  }

  /**
   * Get plan progress summary
   */
  async getPlanProgressSummary(planId: string, userId?: string): Promise<PlanProgressSummaryDto> {
    const plan = await this.getFitnessPlanById(planId, userId);

    const currentWeek = plan.getCurrentWeek();
    const nextWeek = currentWeek + 1;

    // Get strength progress (simplified - would need actual tracking)
    const strengthProgress = await this.getStrengthProgress(planId);

    // Get next week preview
    const nextWeekData = plan.weeks?.find((w) => w.weekNumber === nextWeek);
    const nextWeekPreview = {
      weekNumber: nextWeek,
      plannedWorkouts: nextWeekData?.plannedWorkouts || plan.workoutsPerWeek,
      estimatedCaloriesBurn: plan.getEstimatedCaloriesBurnPerWorkout() * plan.workoutsPerWeek,
      focusAreas: plan.focusAreas || [],
    };

    return {
      planId: plan.id,
      currentWeek,
      totalWeeks: plan.durationWeeks,
      completionPercentage: plan.completionPercentage,
      workoutsCompleted: plan.totalWorkoutsCompleted,
      totalPlannedWorkouts: plan.getTotalPlannedWorkouts(),
      adherenceScore: plan.adherenceScore,
      averageSatisfaction: plan.satisfactionRating,
      totalCaloriesBurned: plan.totalCaloriesBurned,
      totalWorkoutTime: plan.totalWorkoutTimeMinutes,
      strengthProgress,
      nextWeekPreview,
    };
  }

  /**
   * Adapt a plan week based on progress
   */
  async adaptPlanWeek(
    planId: string,
    weekNumber: number,
    adaptations: {
      increaseDifficulty?: boolean;
      decreaseDifficulty?: boolean;
      changeExercises?: string[];
      adjustVolume?: number;
    },
    userId?: string,
  ): Promise<FitnessPlanWeek> {
    const plan = await this.getFitnessPlanById(planId, userId);

    if (plan.status !== FitnessPlanStatus.ACTIVE && plan.status !== FitnessPlanStatus.DRAFT) {
      throw new BadRequestException('Can only adapt active or draft plans');
    }

    const adaptedWeek = await this.planGeneratorService.regenerateWeek(
      planId,
      weekNumber,
      adaptations,
    );

    // Mark plan as adapted
    plan.addAdaptation();
    await this.fitnessPlanRepository.save(plan);

    return adaptedWeek;
  }

  /**
   * Get fitness plan statistics for a user
   */
  async getUserFitnessStats(userId: string): Promise<FitnessPlanStatsDto> {
    const plans = await this.fitnessPlanRepository.find({
      where: { userId },
    });

    const stats: FitnessPlanStatsDto = {
      totalPlans: plans.length,
      activeNow: plans.filter((p) => p.isActive()).length,
      completed: plans.filter((p) => p.status === FitnessPlanStatus.COMPLETED).length,
      byType: {} as any,
      byStatus: {} as any,
      byExperienceLevel: {} as any,
      averageAdherence: 0,
      averageSatisfaction: 0,
      totalWorkoutsCompleted: 0,
      totalCaloriesBurned: 0,
      mostPopularPlanTypes: [],
      bestPerformingPlans: [],
    };

    // Calculate aggregated statistics
    const totalAdherence = plans.reduce((sum, plan) => sum + plan.adherenceScore, 0);
    const plansWithSatisfaction = plans.filter((p) => p.satisfactionRating);
    const totalSatisfaction = plansWithSatisfaction.reduce(
      (sum, plan) => sum + (plan.satisfactionRating || 0),
      0,
    );

    stats.averageAdherence = plans.length > 0 ? totalAdherence / plans.length : 0;
    stats.averageSatisfaction =
      plansWithSatisfaction.length > 0 ? totalSatisfaction / plansWithSatisfaction.length : 0;
    stats.totalWorkoutsCompleted = plans.reduce(
      (sum, plan) => sum + plan.totalWorkoutsCompleted,
      0,
    );
    stats.totalCaloriesBurned = plans.reduce((sum, plan) => sum + plan.totalCaloriesBurned, 0);

    // Get best performing plans (top 3 by adherence and satisfaction)
    stats.bestPerformingPlans = plans
      .filter((p) => p.adherenceScore > 0)
      .sort(
        (a, b) =>
          b.adherenceScore +
          (b.satisfactionRating || 0) -
          (a.adherenceScore + (a.satisfactionRating || 0)),
      )
      .slice(0, 3) as any;

    return stats;
  }

  /**
   * Clone a fitness plan (for templates or user copying)
   */
  async cloneFitnessPlan(
    planId: string,
    newPlanName: string,
    userId: string,
  ): Promise<FitnessPlan> {
    const originalPlan = await this.getFitnessPlanById(planId);

    // Create new plan based on original
    const clonedPlan = this.fitnessPlanRepository.create({
      ...originalPlan,
      id: undefined, // Let TypeORM generate new ID
      userId,
      planName: newPlanName,
      status: FitnessPlanStatus.DRAFT,
      startDate: new Date(),
      adherenceScore: 0,
      satisfactionRating: undefined,
      effectivenessScore: 0,
      completionPercentage: 0,
      totalWorkoutsCompleted: 0,
      totalCaloriesBurned: 0,
      totalWorkoutTimeMinutes: 0,
      adaptationCount: 0,
      lastAdaptedAt: undefined,
      activatedAt: undefined,
      completedAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });

    // Calculate new end date
    clonedPlan.endDate = new Date();
    clonedPlan.endDate.setDate(clonedPlan.startDate.getDate() + clonedPlan.durationWeeks * 7);

    return await this.fitnessPlanRepository.save(clonedPlan);
  }

  // Private helper methods

  private async getStrengthProgress(planId: string): Promise<any[]> {
    // This would typically track weight progression over time
    // For now, return empty array - would be implemented with exercise logging
    return [];
  }
}
