import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FitnessPlan, FitnessPlanType, ExperienceLevel } from '../entities/fitness-plan.entity';
import { FitnessPlanWeek } from '../entities/fitness-plan-week.entity';
import { FitnessPlanWorkout } from '../entities/fitness-plan-workout.entity';
import { FitnessPlanExercise, ExerciseType } from '../entities/fitness-plan-exercise.entity';
import { Exercise, DifficultyLevel, MuscleGroup, EquipmentType, ExerciseCategory } from '../entities/exercise.entity';
import { ExerciseLibraryService } from './exercise-library.service';
import { GenerateFitnessPlanDto } from '../dto/fitness-plan.dto';

interface PlanGenerationParams {
  planType: FitnessPlanType;
  experienceLevel: ExperienceLevel;
  durationWeeks: number;
  workoutsPerWeek: number;
  maxWorkoutDurationMinutes: number;
  availableEquipment: EquipmentType[];
  focusAreas?: string[];
  healthConditions?: string[];
  physicalLimitations?: string[];
  preferredExerciseTypes?: string[];
  dislikedExercises?: string[];
  workoutIntensityPreference?: string;
  progressiveOverloadEnabled?: boolean;
  deloadWeekFrequency?: number;
}

interface WorkoutTemplate {
  name: string;
  description: string;
  duration: number;
  exercises: ExerciseTemplate[];
  restBetweenSets: number;
  restBetweenExercises: number;
}

interface ExerciseTemplate {
  exercise: Exercise;
  sets: number;
  repsMin?: number;
  repsMax?: number;
  durationSeconds?: number;
  restSeconds?: number;
  intensity: number; // 1-10 scale
  notes?: string;
}

interface MuscleGroupSchedule {
  [key: string]: MuscleGroup[];
}

@Injectable()
export class FitnessPlanGeneratorService {
  constructor(
    @InjectRepository(FitnessPlan)
    private readonly fitnessPlanRepository: Repository<FitnessPlan>,
    @InjectRepository(FitnessPlanWeek)
    private readonly weekRepository: Repository<FitnessPlanWeek>,
    @InjectRepository(FitnessPlanWorkout)
    private readonly workoutRepository: Repository<FitnessPlanWorkout>,
    @InjectRepository(FitnessPlanExercise)
    private readonly exerciseRepository: Repository<FitnessPlanExercise>,
    private readonly exerciseLibraryService: ExerciseLibraryService,
  ) {}

  /**
   * Generate a complete fitness plan based on user requirements
   */
  async generateFitnessPlan(
    userId: string,
    params: PlanGenerationParams
  ): Promise<FitnessPlan> {
    try {
      // Validate input parameters
      this.validatePlanParameters(params);

      // Get suitable exercises for the user
      const availableExercises = await this.exerciseLibraryService.getSuitableExercises({
        experienceLevel: this.mapExperienceToDifficulty(params.experienceLevel),
        availableEquipment: params.availableEquipment,
        healthConditions: params.healthConditions,
        physicalLimitations: params.physicalLimitations,
        preferredMuscleGroups: this.getFocusAreaMuscleGroups(params.focusAreas),
        dislikedExercises: params.dislikedExercises,
      });

      if (availableExercises.length < 10) {
        throw new BadRequestException('Not enough suitable exercises found for the given constraints');
      }

      // Create the main fitness plan
      const fitnessPlan = await this.createFitnessPlan(userId, params);

      // Generate weekly schedule
      const muscleGroupSchedule = this.generateMuscleGroupSchedule(
        params.planType,
        params.workoutsPerWeek
      );

      // Generate all weeks
      for (let weekNumber = 1; weekNumber <= params.durationWeeks; weekNumber++) {
        const isDeloadWeek = params.deloadWeekFrequency && 
          weekNumber % params.deloadWeekFrequency === 0;

        const week = await this.generateWeek(
          fitnessPlan,
          weekNumber,
          params,
          availableExercises,
          muscleGroupSchedule,
          isDeloadWeek
        );

        // Apply progressive overload (except for deload weeks)
        if (!isDeloadWeek && params.progressiveOverloadEnabled && weekNumber > 1) {
          await this.applyProgressiveOverload(week, weekNumber, params);
        }
      }

      return await this.fitnessPlanRepository.findOne({
        where: { id: fitnessPlan.id },
        relations: ['weeks', 'weeks.workouts', 'weeks.workouts.exercises']
      });

    } catch (error) {
      throw new BadRequestException(`Failed to generate fitness plan: ${error.message}`);
    }
  }

  /**
   * Regenerate a specific week with adaptations
   */
  async regenerateWeek(
    planId: string,
    weekNumber: number,
    adaptations?: {
      increaseDifficulty?: boolean;
      decreaseDifficulty?: boolean;
      changeExercises?: string[];
      adjustVolume?: number; // percentage adjustment
    }
  ): Promise<FitnessPlanWeek> {
    const plan = await this.fitnessPlanRepository.findOne({
      where: { id: planId },
      relations: ['weeks', 'weeks.workouts', 'weeks.workouts.exercises']
    });

    if (!plan) {
      throw new NotFoundException(`Fitness plan with ID '${planId}' not found`);
    }

    const existingWeek = plan.weeks.find(w => w.weekNumber === weekNumber);
    if (!existingWeek) {
      throw new NotFoundException(`Week ${weekNumber} not found in plan`);
    }

    // Get updated exercise library
    const availableExercises = await this.exerciseLibraryService.getSuitableExercises({
      experienceLevel: this.mapExperienceToDifficulty(plan.experienceLevel),
      availableEquipment: plan.availableEquipment,
      healthConditions: plan.healthConditions,
      physicalLimitations: plan.physicalLimitations,
      preferredMuscleGroups: this.getFocusAreaMuscleGroups(plan.focusAreas),
      dislikedExercises: plan.dislikedExercises,
    });

    // Delete existing week data
    await this.workoutRepository.delete({ weekId: existingWeek.id });
    await this.weekRepository.delete({ id: existingWeek.id });

    // Regenerate with adaptations
    const params: PlanGenerationParams = {
      planType: plan.planType,
      experienceLevel: plan.experienceLevel,
      durationWeeks: plan.durationWeeks,
      workoutsPerWeek: plan.workoutsPerWeek,
      maxWorkoutDurationMinutes: plan.maxWorkoutDurationMinutes,
      availableEquipment: plan.availableEquipment,
      focusAreas: plan.focusAreas,
      healthConditions: plan.healthConditions,
      physicalLimitations: plan.physicalLimitations,
      preferredExerciseTypes: plan.preferredExerciseTypes,
      dislikedExercises: plan.dislikedExercises,
      workoutIntensityPreference: plan.workoutIntensityPreference,
      progressiveOverloadEnabled: plan.progressiveOverloadEnabled,
      deloadWeekFrequency: plan.deloadWeekFrequency,
    };

    const muscleGroupSchedule = this.generateMuscleGroupSchedule(
      plan.planType,
      plan.workoutsPerWeek
    );

    const isDeloadWeek = plan.deloadWeekFrequency && 
      weekNumber % plan.deloadWeekFrequency === 0;

    return await this.generateWeek(
      plan,
      weekNumber,
      params,
      availableExercises,
      muscleGroupSchedule,
      isDeloadWeek,
      adaptations
    );
  }

  /**
   * Calculate workout volume and intensity constraints
   */
  calculateWorkoutConstraints(
    experienceLevel: ExperienceLevel,
    planType: FitnessPlanType,
    workoutDuration: number
  ): {
    maxSetsPerWorkout: number;
    maxSetsPerMuscleGroup: number;
    targetIntensity: number;
    restBetweenSets: number;
    restBetweenExercises: number;
  } {
    const baseConstraints = {
      [ExperienceLevel.BEGINNER]: {
        maxSetsPerWorkout: 12,
        maxSetsPerMuscleGroup: 8,
        targetIntensity: 6,
        restBetweenSets: 90,
        restBetweenExercises: 120,
      },
      [ExperienceLevel.INTERMEDIATE]: {
        maxSetsPerWorkout: 18,
        maxSetsPerMuscleGroup: 12,
        targetIntensity: 7,
        restBetweenSets: 75,
        restBetweenExercises: 90,
      },
      [ExperienceLevel.ADVANCED]: {
        maxSetsPerWorkout: 24,
        maxSetsPerMuscleGroup: 16,
        targetIntensity: 8,
        restBetweenSets: 60,
        restBetweenExercises: 75,
      },
      [ExperienceLevel.EXPERT]: {
        maxSetsPerWorkout: 30,
        maxSetsPerMuscleGroup: 20,
        targetIntensity: 9,
        restBetweenSets: 45,
        restBetweenExercises: 60,
      },
    };

    const constraints = baseConstraints[experienceLevel];

    // Adjust based on plan type
    const typeMultipliers = {
      [FitnessPlanType.WEIGHT_LOSS]: { sets: 0.8, intensity: 0.9 },
      [FitnessPlanType.MUSCLE_GAIN]: { sets: 1.2, intensity: 1.1 },
      [FitnessPlanType.STRENGTH_BUILDING]: { sets: 1.0, intensity: 1.2 },
      [FitnessPlanType.ENDURANCE_TRAINING]: { sets: 1.1, intensity: 0.8 },
      [FitnessPlanType.GENERAL_FITNESS]: { sets: 1.0, intensity: 1.0 },
      [FitnessPlanType.REHABILITATION]: { sets: 0.6, intensity: 0.7 },
      [FitnessPlanType.SPORTS_SPECIFIC]: { sets: 1.1, intensity: 1.1 },
      [FitnessPlanType.FLEXIBILITY]: { sets: 0.7, intensity: 0.6 },
      [FitnessPlanType.WEIGHT_MAINTENANCE]: { sets: 0.9, intensity: 0.9 },
    };

    const multiplier = typeMultipliers[planType];

    return {
      maxSetsPerWorkout: Math.round(constraints.maxSetsPerWorkout * multiplier.sets),
      maxSetsPerMuscleGroup: Math.round(constraints.maxSetsPerMuscleGroup * multiplier.sets),
      targetIntensity: Math.min(10, Math.round(constraints.targetIntensity * multiplier.intensity)),
      restBetweenSets: constraints.restBetweenSets,
      restBetweenExercises: constraints.restBetweenExercises,
    };
  }

  // Private methods

  private validatePlanParameters(params: PlanGenerationParams): void {
    if (params.durationWeeks < 1 || params.durationWeeks > 52) {
      throw new BadRequestException('Duration must be between 1 and 52 weeks');
    }

    if (params.workoutsPerWeek < 1 || params.workoutsPerWeek > 7) {
      throw new BadRequestException('Workouts per week must be between 1 and 7');
    }

    if (params.maxWorkoutDurationMinutes < 15 || params.maxWorkoutDurationMinutes > 180) {
      throw new BadRequestException('Workout duration must be between 15 and 180 minutes');
    }

    if (!params.availableEquipment || params.availableEquipment.length === 0) {
      throw new BadRequestException('At least one equipment type must be specified');
    }
  }

  private async createFitnessPlan(
    userId: string,
    params: PlanGenerationParams
  ): Promise<FitnessPlan> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (params.durationWeeks * 7));

    const plan = this.fitnessPlanRepository.create({
      userId,
      planName: this.generatePlanName(params.planType, params.experienceLevel),
      planDescription: this.generatePlanDescription(params),
      planType: params.planType,
      experienceLevel: params.experienceLevel,
      startDate,
      endDate,
      durationWeeks: params.durationWeeks,
      workoutsPerWeek: params.workoutsPerWeek,
      restDaysPerWeek: 7 - params.workoutsPerWeek,
      availableEquipment: params.availableEquipment,
      maxWorkoutDurationMinutes: params.maxWorkoutDurationMinutes,
      healthConditions: params.healthConditions,
      physicalLimitations: params.physicalLimitations,
      preferredExerciseTypes: params.preferredExerciseTypes,
      dislikedExercises: params.dislikedExercises,
      focusAreas: params.focusAreas,
      workoutIntensityPreference: params.workoutIntensityPreference || 'moderate',
      progressiveOverloadEnabled: params.progressiveOverloadEnabled ?? true,
      deloadWeekFrequency: params.deloadWeekFrequency || 4,
      generatedByAI: true,
      aiModelVersion: '1.0.0',
    });

    return await this.fitnessPlanRepository.save(plan);
  }

  private async generateWeek(
    plan: FitnessPlan,
    weekNumber: number,
    params: PlanGenerationParams,
    availableExercises: Exercise[],
    muscleGroupSchedule: MuscleGroupSchedule,
    isDeloadWeek: boolean,
    adaptations?: any
  ): Promise<FitnessPlanWeek> {
    const week = this.weekRepository.create({
      fitnessPlanId: plan.id,
      weekNumber,
      isDeloadWeek,
      plannedWorkouts: params.workoutsPerWeek,
    });

    const savedWeek = await this.weekRepository.save(week);

    // Generate workouts for this week
    for (let workoutNumber = 1; workoutNumber <= params.workoutsPerWeek; workoutNumber++) {
      const targetMuscleGroups = this.getWorkoutMuscleGroups(
        muscleGroupSchedule,
        workoutNumber,
        params.workoutsPerWeek
      );

      await this.generateWorkout(
        savedWeek,
        workoutNumber,
        targetMuscleGroups,
        availableExercises,
        params,
        isDeloadWeek,
        adaptations
      );
    }

    return savedWeek;
  }

  private async generateWorkout(
    week: FitnessPlanWeek,
    workoutNumber: number,
    targetMuscleGroups: MuscleGroup[],
    availableExercises: Exercise[],
    params: PlanGenerationParams,
    isDeloadWeek: boolean,
    adaptations?: any
  ): Promise<FitnessPlanWorkout> {
    const constraints = this.calculateWorkoutConstraints(
      params.experienceLevel,
      params.planType,
      params.maxWorkoutDurationMinutes
    );

    const workout = this.workoutRepository.create({
      weekId: week.id,
      workoutNumber,
      workoutName: this.generateWorkoutName(targetMuscleGroups, workoutNumber),
      targetMuscleGroups,
      estimatedDurationMinutes: params.maxWorkoutDurationMinutes,
      restBetweenSets: constraints.restBetweenSets,
      restBetweenExercises: constraints.restBetweenExercises,
    });

    const savedWorkout = await this.workoutRepository.save(workout);

    // Select exercises for this workout
    const selectedExercises = this.selectExercisesForWorkout(
      availableExercises,
      targetMuscleGroups,
      constraints,
      params
    );

    // Create exercise entries
    let sortOrder = 1;
    for (const exerciseTemplate of selectedExercises) {
      await this.createWorkoutExercise(
        savedWorkout,
        exerciseTemplate,
        sortOrder++,
        isDeloadWeek
      );
    }

    return savedWorkout;
  }

  private async createWorkoutExercise(
    workout: FitnessPlanWorkout,
    template: ExerciseTemplate,
    sortOrder: number,
    isDeloadWeek: boolean
  ): Promise<FitnessPlanExercise> {
    const exercise = this.exerciseRepository.create({
      workoutId: workout.id,
      exerciseName: template.exercise.name,
      exerciseDescription: template.exercise.description,
      exerciseType: this.mapCategoryToType(template.exercise.category),
      sortOrder,
      targetSets: isDeloadWeek ? Math.max(1, template.sets - 1) : template.sets,
      targetRepsPerSet: template.repsMin && template.repsMax 
        ? Math.round((template.repsMin + template.repsMax) / 2)
        : undefined,
      targetRepsRangeMin: template.repsMin,
      targetRepsRangeMax: template.repsMax,
      targetDurationSeconds: template.durationSeconds,
      restBetweenSets: template.restSeconds,
      intensityLevel: isDeloadWeek ? template.intensity - 1 : template.intensity,
      safetyNotes: template.exercise.safetyNotes,
      formCues: template.exercise.formCues,
      videoUrl: template.exercise.videoUrl,
      exerciseInstructions: template.exercise.instructions,
    });

    // Record usage
    await this.exerciseLibraryService.recordExerciseUsage(template.exercise.id);

    return await this.exerciseRepository.save(exercise);
  }

  private selectExercisesForWorkout(
    availableExercises: Exercise[],
    targetMuscleGroups: MuscleGroup[],
    constraints: any,
    params: PlanGenerationParams
  ): ExerciseTemplate[] {
    const selected: ExerciseTemplate[] = [];
    const usedExercises = new Set<string>();
    let totalSets = 0;

    // Prioritize compound movements for strength and muscle building
    const shouldPrioritizeCompound = [
      FitnessPlanType.STRENGTH_BUILDING,
      FitnessPlanType.MUSCLE_GAIN
    ].includes(params.planType);

    for (const muscleGroup of targetMuscleGroups) {
      const setsForMuscleGroup = Math.min(
        constraints.maxSetsPerMuscleGroup,
        constraints.maxSetsPerWorkout - totalSets
      );

      if (setsForMuscleGroup <= 0) break;

      const muscleGroupExercises = availableExercises.filter(ex => 
        (ex.primaryMuscleGroup === muscleGroup || 
         ex.secondaryMuscleGroups?.includes(muscleGroup)) &&
        !usedExercises.has(ex.id)
      );

      if (shouldPrioritizeCompound) {
        muscleGroupExercises.sort((a, b) => {
          if (a.isCompound && !b.isCompound) return -1;
          if (!a.isCompound && b.isCompound) return 1;
          return (b.averageRating || 0) - (a.averageRating || 0);
        });
      } else {
        muscleGroupExercises.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      }

      // Select 1-2 exercises per muscle group
      const exercisesPerMuscleGroup = Math.min(2, muscleGroupExercises.length);
      const setsPerExercise = Math.floor(setsForMuscleGroup / exercisesPerMuscleGroup);

      for (let i = 0; i < exercisesPerMuscleGroup && totalSets < constraints.maxSetsPerWorkout; i++) {
        const exercise = muscleGroupExercises[i];
        if (!exercise) continue;

        const template = this.createExerciseTemplate(exercise, setsPerExercise, params);
        selected.push(template);
        usedExercises.add(exercise.id);
        totalSets += template.sets;
      }
    }

    return selected;
  }

  private createExerciseTemplate(
    exercise: Exercise,
    sets: number,
    params: PlanGenerationParams
  ): ExerciseTemplate {
    const reps = exercise.getRecommendedReps(
      this.mapExperienceToDifficulty(params.experienceLevel)
    );

    return {
      exercise,
      sets: Math.max(1, sets),
      repsMin: reps.min,
      repsMax: reps.max,
      durationSeconds: exercise.defaultDurationSeconds,
      restSeconds: exercise.defaultRestSeconds || 60,
      intensity: this.calculateExerciseIntensity(exercise, params),
      notes: exercise.safetyNotes,
    };
  }

  private calculateExerciseIntensity(
    exercise: Exercise,
    params: PlanGenerationParams
  ): number {
    let baseIntensity = 6; // Default moderate intensity

    // Adjust based on plan type
    const intensityAdjustments = {
      [FitnessPlanType.WEIGHT_LOSS]: -1,
      [FitnessPlanType.MUSCLE_GAIN]: +1,
      [FitnessPlanType.STRENGTH_BUILDING]: +2,
      [FitnessPlanType.ENDURANCE_TRAINING]: -1,
      [FitnessPlanType.REHABILITATION]: -3,
      [FitnessPlanType.GENERAL_FITNESS]: 0,
    };

    baseIntensity += intensityAdjustments[params.planType] || 0;

    // Adjust based on user preference
    const preferenceAdjustments = {
      'low': -2,
      'moderate': 0,
      'high': +2,
      'varied': 0,
    };

    baseIntensity += preferenceAdjustments[params.workoutIntensityPreference] || 0;

    // Adjust based on exercise difficulty
    const difficultyAdjustments = {
      [DifficultyLevel.BEGINNER]: -1,
      [DifficultyLevel.INTERMEDIATE]: 0,
      [DifficultyLevel.ADVANCED]: +1,
      [DifficultyLevel.EXPERT]: +2,
    };

    const exerciseDifficulty = this.mapExperienceToDifficulty(params.experienceLevel);
    baseIntensity += difficultyAdjustments[exerciseDifficulty] || 0;

    return Math.max(1, Math.min(10, baseIntensity));
  }

  private async applyProgressiveOverload(
    week: FitnessPlanWeek,
    weekNumber: number,
    params: PlanGenerationParams
  ): Promise<void> {
    const progressionRate = 1.05; // 5% increase per week
    const progressionFactor = Math.pow(progressionRate, weekNumber - 1);

    // This would typically adjust weights, reps, or sets based on the progression
    // For now, we'll implement a basic progression by increasing target reps
    const workouts = await this.workoutRepository.find({
      where: { weekId: week.id },
      relations: ['exercises']
    });

    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        if (exercise.targetRepsRangeMax) {
          exercise.targetRepsRangeMax = Math.min(
            exercise.targetRepsRangeMax + 1,
            exercise.targetRepsRangeMax * 1.2
          );
        }
        if (exercise.targetRepsPerSet) {
          exercise.targetRepsPerSet = Math.min(
            exercise.targetRepsPerSet + 1,
            exercise.targetRepsPerSet * 1.2
          );
        }
        await this.exerciseRepository.save(exercise);
      }
    }
  }

  private generateMuscleGroupSchedule(
    planType: FitnessPlanType,
    workoutsPerWeek: number
  ): MuscleGroupSchedule {
    const schedules: Record<number, MuscleGroupSchedule> = {
      3: {
        '1': [MuscleGroup.CHEST, MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
        '2': [MuscleGroup.BACK, MuscleGroup.BICEPS],
        '3': [MuscleGroup.QUADRICEPS, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.CALVES],
      },
      4: {
        '1': [MuscleGroup.CHEST, MuscleGroup.TRICEPS],
        '2': [MuscleGroup.BACK, MuscleGroup.BICEPS],
        '3': [MuscleGroup.SHOULDERS, MuscleGroup.CORE],
        '4': [MuscleGroup.QUADRICEPS, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
      },
      5: {
        '1': [MuscleGroup.CHEST],
        '2': [MuscleGroup.BACK],
        '3': [MuscleGroup.SHOULDERS],
        '4': [MuscleGroup.QUADRICEPS, MuscleGroup.GLUTES],
        '5': [MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES, MuscleGroup.CORE],
      },
    };

    return schedules[workoutsPerWeek] || schedules[3];
  }

  private getWorkoutMuscleGroups(
    schedule: MuscleGroupSchedule,
    workoutNumber: number,
    workoutsPerWeek: number
  ): MuscleGroup[] {
    return schedule[workoutNumber.toString()] || [MuscleGroup.FULL_BODY];
  }

  private generatePlanName(planType: FitnessPlanType, experienceLevel: ExperienceLevel): string {
    const typeNames = {
      [FitnessPlanType.WEIGHT_LOSS]: 'Weight Loss',
      [FitnessPlanType.MUSCLE_GAIN]: 'Muscle Building',
      [FitnessPlanType.STRENGTH_BUILDING]: 'Strength Training',
      [FitnessPlanType.ENDURANCE_TRAINING]: 'Endurance',
      [FitnessPlanType.GENERAL_FITNESS]: 'General Fitness',
      [FitnessPlanType.REHABILITATION]: 'Rehabilitation',
      [FitnessPlanType.SPORTS_SPECIFIC]: 'Sports Training',
      [FitnessPlanType.FLEXIBILITY]: 'Flexibility',
      [FitnessPlanType.WEIGHT_MAINTENANCE]: 'Maintenance',
    };

    const levelNames = {
      [ExperienceLevel.BEGINNER]: 'Beginner',
      [ExperienceLevel.INTERMEDIATE]: 'Intermediate',
      [ExperienceLevel.ADVANCED]: 'Advanced',
      [ExperienceLevel.EXPERT]: 'Expert',
    };

    return `${levelNames[experienceLevel]} ${typeNames[planType]} Plan`;
  }

  private generatePlanDescription(params: PlanGenerationParams): string {
    return `AI-generated ${params.durationWeeks}-week fitness plan with ${params.workoutsPerWeek} workouts per week. 
      Tailored for ${params.experienceLevel} level with focus on ${params.planType}. 
      Maximum workout duration: ${params.maxWorkoutDurationMinutes} minutes.`;
  }

  private generateWorkoutName(muscleGroups: MuscleGroup[], workoutNumber: number): string {
    if (muscleGroups.length === 1) {
      return `${this.capitalizeFirst(muscleGroups[0])} Workout`;
    } else if (muscleGroups.length <= 3) {
      return muscleGroups.map(mg => this.capitalizeFirst(mg)).join(' & ') + ' Workout';
    } else {
      return `Full Body Workout ${workoutNumber}`;
    }
  }

  private mapExperienceToDifficulty(experience: ExperienceLevel): DifficultyLevel {
    const mapping = {
      [ExperienceLevel.BEGINNER]: DifficultyLevel.BEGINNER,
      [ExperienceLevel.INTERMEDIATE]: DifficultyLevel.INTERMEDIATE,
      [ExperienceLevel.ADVANCED]: DifficultyLevel.ADVANCED,
      [ExperienceLevel.EXPERT]: DifficultyLevel.EXPERT,
    };
    return mapping[experience];
  }

  private mapCategoryToType(category: ExerciseCategory): ExerciseType {
    const mapping = {
      [ExerciseCategory.RESISTANCE]: ExerciseType.COMPOUND,
      [ExerciseCategory.CALISTHENICS]: ExerciseType.COMPOUND,
      [ExerciseCategory.YOGA]: ExerciseType.FLEXIBILITY,
      [ExerciseCategory.CARDIO]: ExerciseType.CARDIO,
      [ExerciseCategory.FLEXIBILITY]: ExerciseType.FLEXIBILITY,
      [ExerciseCategory.BALANCE]: ExerciseType.BALANCE,
      [ExerciseCategory.CORE]: ExerciseType.ISOMETRIC,
      [ExerciseCategory.FUNCTIONAL]: ExerciseType.COMPOUND,
      [ExerciseCategory.REHABILITATION]: ExerciseType.ISOLATION,
      [ExerciseCategory.WARM_UP]: ExerciseType.CARDIO,
      [ExerciseCategory.COOL_DOWN]: ExerciseType.FLEXIBILITY,
    };
    return mapping[category] || ExerciseType.COMPOUND;
  }

  private getFocusAreaMuscleGroups(focusAreas?: string[]): MuscleGroup[] {
    if (!focusAreas) return [];
    
    const mapping: Record<string, MuscleGroup> = {
      'chest': MuscleGroup.CHEST,
      'back': MuscleGroup.BACK,
      'shoulders': MuscleGroup.SHOULDERS,
      'arms': MuscleGroup.BICEPS,
      'biceps': MuscleGroup.BICEPS,
      'triceps': MuscleGroup.TRICEPS,
      'core': MuscleGroup.CORE,
      'abs': MuscleGroup.CORE,
      'legs': MuscleGroup.QUADRICEPS,
      'quadriceps': MuscleGroup.QUADRICEPS,
      'quads': MuscleGroup.QUADRICEPS,
      'hamstrings': MuscleGroup.HAMSTRINGS,
      'glutes': MuscleGroup.GLUTES,
      'calves': MuscleGroup.CALVES,
    };

    return focusAreas
      .map(area => mapping[area.toLowerCase()])
      .filter(Boolean);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}