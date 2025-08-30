import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDate,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FitnessPlanType,
  FitnessPlanStatus,
  ExperienceLevel,
} from '../entities/fitness-plan.entity';
import { EquipmentType } from '../entities/exercise.entity';

export class CreateFitnessPlanDto {
  @IsString()
  planName: string;

  @IsOptional()
  @IsString()
  planDescription?: string;

  @IsEnum(FitnessPlanType)
  planType: FitnessPlanType;

  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsNumber()
  @Min(1)
  @Max(104) // Max 2 years
  durationWeeks: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  workoutsPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  restDaysPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  targetWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  targetBodyFatPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  targetMuscleGainKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  targetStrengthIncreasePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(10000)
  weeklyCalorieBurnTarget?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  availableEquipment?: EquipmentType[];

  @IsOptional()
  @IsString()
  workoutLocation?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(180)
  maxWorkoutDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredWorkoutTimes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  physicalLimitations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injuryHistory?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exerciseRestrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredExerciseTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dislikedExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @IsOptional()
  @IsString()
  workoutIntensityPreference?: string;

  @IsOptional()
  @IsBoolean()
  progressiveOverloadEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1.01)
  @Max(1.2)
  autoProgressionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(12)
  deloadWeekFrequency?: number;

  @IsOptional()
  @IsBoolean()
  formCheckReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  warmUpRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  coolDownRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  restPeriodEnforcement?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateFitnessPlanDto {
  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsString()
  planDescription?: string;

  @IsOptional()
  @IsEnum(FitnessPlanType)
  planType?: FitnessPlanType;

  @IsOptional()
  @IsEnum(FitnessPlanStatus)
  status?: FitnessPlanStatus;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(104)
  durationWeeks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  workoutsPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  restDaysPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(500)
  targetWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  targetBodyFatPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  targetMuscleGainKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  targetStrengthIncreasePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(10000)
  weeklyCalorieBurnTarget?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  availableEquipment?: EquipmentType[];

  @IsOptional()
  @IsString()
  workoutLocation?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(180)
  maxWorkoutDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredWorkoutTimes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  physicalLimitations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injuryHistory?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exerciseRestrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredExerciseTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dislikedExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @IsOptional()
  @IsString()
  workoutIntensityPreference?: string;

  @IsOptional()
  @IsBoolean()
  progressiveOverloadEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1.01)
  @Max(1.2)
  autoProgressionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(12)
  deloadWeekFrequency?: number;

  @IsOptional()
  @IsBoolean()
  formCheckReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  warmUpRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  coolDownRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  restPeriodEnforcement?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  satisfactionRating?: number;
}

export class FitnessPlanFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FitnessPlanType)
  planType?: FitnessPlanType;

  @IsOptional()
  @IsEnum(FitnessPlanStatus)
  status?: FitnessPlanStatus;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  availableEquipment?: EquipmentType[];

  @IsOptional()
  @IsString()
  workoutLocation?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  maxWorkoutsPerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(180)
  maxWorkoutDuration?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDateTo?: Date;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsBoolean()
  trainerApproved?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class GenerateFitnessPlanDto {
  @IsEnum(FitnessPlanType)
  planType: FitnessPlanType;

  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @IsNumber()
  @Min(1)
  @Max(52)
  durationWeeks: number;

  @IsNumber()
  @Min(1)
  @Max(7)
  workoutsPerWeek: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(180)
  maxWorkoutDurationMinutes?: number;

  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  availableEquipment: EquipmentType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  physicalLimitations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredExerciseTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dislikedExercises?: string[];

  @IsOptional()
  @IsString()
  workoutIntensityPreference?: string;

  @IsOptional()
  @IsBoolean()
  progressiveOverloadEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(12)
  deloadWeekFrequency?: number;
}

export class FitnessPlanResponseDto {
  id: string;
  userId: string;
  planName: string;
  planDescription?: string;
  planType: FitnessPlanType;
  status: FitnessPlanStatus;
  experienceLevel: ExperienceLevel;
  startDate: Date;
  endDate: Date;
  durationWeeks: number;
  workoutsPerWeek: number;
  restDaysPerWeek: number;
  targetWeightKg?: number;
  targetBodyFatPercentage?: number;
  targetMuscleGainKg?: number;
  targetStrengthIncreasePercentage?: number;
  weeklyCalorieBurnTarget?: number;
  availableEquipment?: EquipmentType[];
  workoutLocation: string;
  maxWorkoutDurationMinutes: number;
  preferredWorkoutTimes?: string[];
  healthConditions?: string[];
  physicalLimitations?: string[];
  injuryHistory?: string[];
  exerciseRestrictions?: string[];
  preferredExerciseTypes?: string[];
  dislikedExercises?: string[];
  focusAreas?: string[];
  workoutIntensityPreference: string;
  generatedByAI: boolean;
  aiModelVersion?: string;
  adherenceScore: number;
  satisfactionRating?: number;
  effectivenessScore: number;
  completionPercentage: number;
  totalWorkoutsCompleted: number;
  totalCaloriesBurned: number;
  totalWorkoutTimeMinutes: number;
  progressiveOverloadEnabled: boolean;
  autoProgressionRate: number;
  deloadWeekFrequency: number;
  adaptationCount: number;
  lastAdaptedAt?: Date;
  formCheckReminders: boolean;
  warmUpRequired: boolean;
  coolDownRequired: boolean;
  restPeriodEnforcement: boolean;
  isTemplate: boolean;
  templateCategory?: string;
  createdByTrainer?: string;
  trainerApproved: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  completedAt?: Date;

  // Computed fields
  isActive: boolean;
  daysRemaining: number;
  weeksRemaining: number;
  currentWeek: number;
  totalPlannedWorkouts: number;
  workoutCompletionRate: number;
  averageWorkoutDuration: number;
  estimatedCaloriesBurnPerWorkout: number;
}

export class FitnessPlanStatsDto {
  totalPlans: number;
  activeNow: number;
  completed: number;
  byType: Record<FitnessPlanType, number>;
  byStatus: Record<FitnessPlanStatus, number>;
  byExperienceLevel: Record<ExperienceLevel, number>;
  averageAdherence: number;
  averageSatisfaction: number;
  totalWorkoutsCompleted: number;
  totalCaloriesBurned: number;
  mostPopularPlanTypes: Array<{ type: FitnessPlanType; count: number }>;
  bestPerformingPlans: FitnessPlanResponseDto[];
}

export class WorkoutProgressDto {
  @IsUUID()
  planId: string;

  @IsNumber()
  @Min(1)
  weekNumber: number;

  @IsNumber()
  @Min(1)
  workoutNumber: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  caloriesBurned: number;

  @IsNumber()
  @Min(1)
  @Max(600)
  durationMinutes: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  satisfactionRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  difficultyRating?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  exerciseProgress?: Array<{
    exerciseId: string;
    setsCompleted: number;
    repsCompleted?: number[];
    weightsUsed?: number[];
    durationSeconds?: number;
    restSeconds?: number;
    notes?: string;
  }>;
}

export class PlanProgressSummaryDto {
  planId: string;
  currentWeek: number;
  totalWeeks: number;
  completionPercentage: number;
  workoutsCompleted: number;
  totalPlannedWorkouts: number;
  adherenceScore: number;
  averageSatisfaction?: number;
  totalCaloriesBurned: number;
  totalWorkoutTime: number;
  strengthProgress: Array<{
    exercise: string;
    initialWeight: number;
    currentWeight: number;
    improvementPercentage: number;
  }>;
  bodyMetrics?: {
    initialWeight?: number;
    currentWeight?: number;
    weightChange?: number;
    bodyFatChange?: number;
  };
  nextWeekPreview: {
    weekNumber: number;
    plannedWorkouts: number;
    estimatedCaloriesBurn: number;
    focusAreas: string[];
  };
}
