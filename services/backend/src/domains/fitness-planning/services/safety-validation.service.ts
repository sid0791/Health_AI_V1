import { Injectable, BadRequestException } from '@nestjs/common';
import { Exercise, DifficultyLevel, ExerciseCategory } from '../entities/exercise.entity';
import { FitnessPlan, ExperienceLevel, FitnessPlanType } from '../entities/fitness-plan.entity';
import { FitnessPlanWorkout } from '../entities/fitness-plan-workout.entity';
import { FitnessPlanExercise } from '../entities/fitness-plan-exercise.entity';

interface UserProfile {
  experienceLevel: ExperienceLevel;
  healthConditions?: string[];
  physicalLimitations?: string[];
  injuryHistory?: string[];
  age?: number;
  currentWeight?: number;
  fitnessGoals?: string[];
}

interface SafetyValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

interface WorkoutValidationResult {
  isValid: boolean;
  totalVolume: number;
  estimatedDuration: number;
  intensityScore: number;
  warnings: string[];
  errors: string[];
}

@Injectable()
export class SafetyValidationService {
  /**
   * Validate if an exercise is safe for a user
   */
  validateExerciseForUser(exercise: Exercise, userProfile: UserProfile): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: [],
    };

    // Check health condition contraindications
    if (exercise.healthConditionsToAvoid && userProfile.healthConditions) {
      const conflicts = exercise.healthConditionsToAvoid.filter((condition) =>
        userProfile.healthConditions.some(
          (userCondition) =>
            userCondition.toLowerCase().includes(condition.toLowerCase()) ||
            condition.toLowerCase().includes(userCondition.toLowerCase()),
        ),
      );

      if (conflicts.length > 0) {
        result.isValid = false;
        result.errors.push(
          `Exercise "${exercise.name}" is contraindicated for your health conditions: ${conflicts.join(', ')}`,
        );
      }
    }

    // Check physical limitations
    if (exercise.contraindications && userProfile.physicalLimitations) {
      const limitations = exercise.contraindications.filter((contraindication) =>
        userProfile.physicalLimitations.some(
          (limitation) =>
            limitation.toLowerCase().includes(contraindication.toLowerCase()) ||
            contraindication.toLowerCase().includes(limitation.toLowerCase()),
        ),
      );

      if (limitations.length > 0) {
        result.warnings.push(
          `Exercise "${exercise.name}" may be challenging due to: ${limitations.join(', ')}`,
        );
        result.recommendations.push(
          `Consider modifications or alternative exercises for this movement`,
        );
      }
    }

    // Check injury history warnings
    if (exercise.injuryWarnings && userProfile.injuryHistory) {
      const injuryRisks = exercise.injuryWarnings.filter((warning) =>
        userProfile.injuryHistory.some(
          (injury) =>
            warning.toLowerCase().includes(injury.toLowerCase()) ||
            injury.toLowerCase().includes(warning.toLowerCase()),
        ),
      );

      if (injuryRisks.length > 0) {
        result.warnings.push(
          `Exercise "${exercise.name}" may aggravate previous injuries: ${injuryRisks.join(', ')}`,
        );
        result.recommendations.push(
          `Start with lighter weights/intensity and focus on proper form`,
        );
      }
    }

    // Check experience level appropriateness
    if (!exercise.isSuitableForLevel(this.mapExperienceToDifficulty(userProfile.experienceLevel))) {
      if (this.mapExperienceToDifficulty(userProfile.experienceLevel) < exercise.difficultyLevel) {
        result.warnings.push(
          `Exercise "${exercise.name}" may be too advanced for your current experience level`,
        );
        result.recommendations.push(
          `Consider starting with regression exercises or getting proper instruction`,
        );
      }
    }

    // Age-specific considerations
    if (userProfile.age) {
      if (userProfile.age >= 65) {
        if (
          exercise.category === ExerciseCategory.CARDIO ||
          exercise.tags?.includes('high-impact')
        ) {
          result.warnings.push(
            `High-impact exercise "${exercise.name}" - ensure proper warm-up and consider impact modifications`,
          );
        }
      }

      if (userProfile.age < 18) {
        if (exercise.category === 'resistance' && exercise.tags?.includes('heavy-weight')) {
          result.warnings.push(
            `Heavy resistance exercise "${exercise.name}" - focus on form and gradual progression`,
          );
        }
      }
    }

    // Add general safety recommendations if warnings exist
    if (result.warnings.length > 0) {
      result.recommendations.push(
        'Consult with a fitness professional if unsure about exercise modifications',
        'Stop immediately if you experience pain, dizziness, or unusual discomfort',
      );
    }

    return result;
  }

  /**
   * Validate a complete workout for safety and effectiveness
   */
  validateWorkout(
    workout: FitnessPlanWorkout,
    exercises: FitnessPlanExercise[],
    userProfile: UserProfile,
  ): WorkoutValidationResult {
    const result: WorkoutValidationResult = {
      isValid: true,
      totalVolume: 0,
      estimatedDuration: 0,
      intensityScore: 0,
      warnings: [],
      errors: [],
    };

    // Calculate total volume (sets × reps approximation)
    let totalSets = 0;
    let totalReps = 0;
    let highIntensityExercises = 0;

    for (const exercise of exercises) {
      totalSets += exercise.targetSets;

      if (exercise.targetRepsPerSet) {
        totalReps += exercise.targetSets * exercise.targetRepsPerSet;
      } else if (exercise.targetRepsRangeMin && exercise.targetRepsRangeMax) {
        const avgReps = (exercise.targetRepsRangeMin + exercise.targetRepsRangeMax) / 2;
        totalReps += exercise.targetSets * avgReps;
      }

      if (exercise.intensityLevel && exercise.intensityLevel >= 8) {
        highIntensityExercises++;
      }
    }

    result.totalVolume = totalSets;
    result.intensityScore =
      exercises.reduce((sum, ex) => sum + (ex.intensityLevel || 5), 0) / exercises.length;

    // Estimate workout duration
    const exerciseTime = exercises.reduce((total, exercise) => {
      const setsTime =
        exercise.targetSets *
        (exercise.targetDurationSeconds || (exercise.targetRepsPerSet || 10) * 3); // 3 seconds per rep estimate
      const restTime = exercise.targetSets * (exercise.restBetweenSets || 60);
      return total + setsTime + restTime;
    }, 0);

    const betweenExerciseRest = (exercises.length - 1) * (workout.restBetweenExercises || 90);
    result.estimatedDuration = Math.round((exerciseTime + betweenExerciseRest) / 60); // Convert to minutes

    // Validate volume constraints based on experience level
    const volumeLimits = this.getVolumeLimits(userProfile.experienceLevel);

    if (totalSets > volumeLimits.maxSets) {
      result.errors.push(
        `Workout volume too high: ${totalSets} sets exceeds recommended maximum of ${volumeLimits.maxSets} for your experience level`,
      );
      result.isValid = false;
    } else if (totalSets > volumeLimits.warningThreshold) {
      result.warnings.push(
        `High workout volume: ${totalSets} sets is approaching your limit. Ensure adequate recovery`,
      );
    }

    // Validate intensity
    if (result.intensityScore > 9) {
      result.warnings.push(
        `Very high workout intensity (${result.intensityScore.toFixed(1)}/10). Consider reducing intensity or increasing rest periods`,
      );
    }

    if (highIntensityExercises > 3 && userProfile.experienceLevel === ExperienceLevel.BEGINNER) {
      result.warnings.push(
        `Too many high-intensity exercises for beginner level. Consider reducing intensity`,
      );
    }

    // Validate duration
    const durationLimits = this.getDurationLimits(userProfile.experienceLevel);

    if (result.estimatedDuration > durationLimits.max) {
      result.errors.push(
        `Workout too long: ${result.estimatedDuration} minutes exceeds recommended maximum of ${durationLimits.max} minutes`,
      );
      result.isValid = false;
    } else if (result.estimatedDuration > durationLimits.warning) {
      result.warnings.push(
        `Long workout: ${result.estimatedDuration} minutes. Ensure you have adequate time and energy`,
      );
    }

    if (result.estimatedDuration < durationLimits.min) {
      result.warnings.push(
        `Short workout: ${result.estimatedDuration} minutes may not provide adequate stimulus`,
      );
    }

    // Check for muscle group balance
    const muscleGroupBalance = this.checkMuscleGroupBalance(exercises);
    if (muscleGroupBalance.warnings.length > 0) {
      result.warnings.push(...muscleGroupBalance.warnings);
    }

    // Check exercise order
    const orderValidation = this.validateExerciseOrder(exercises);
    if (orderValidation.warnings.length > 0) {
      result.warnings.push(...orderValidation.warnings);
    }

    return result;
  }

  /**
   * Validate a fitness plan for safety and progression
   */
  validateFitnessPlan(plan: FitnessPlan, userProfile: UserProfile): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: [],
    };

    // Validate plan duration
    if (plan.durationWeeks > 52) {
      result.warnings.push('Plan duration exceeds 1 year. Consider breaking into shorter phases');
    }

    if (plan.durationWeeks < 4) {
      result.warnings.push('Plan duration is very short. May not allow adequate adaptation');
    }

    // Validate workout frequency
    const frequencyValidation = this.validateWorkoutFrequency(
      plan.workoutsPerWeek,
      plan.planType,
      userProfile.experienceLevel,
    );

    if (!frequencyValidation.isValid) {
      result.errors.push(...frequencyValidation.errors);
      result.isValid = false;
    }
    result.warnings.push(...frequencyValidation.warnings);

    // Validate progressive overload settings
    if (plan.progressiveOverloadEnabled) {
      if (plan.autoProgressionRate > 1.15) {
        result.warnings.push(
          `Progression rate of ${((plan.autoProgressionRate - 1) * 100).toFixed(1)}% per week may be too aggressive`,
        );
      }

      if (plan.deloadWeekFrequency < 3) {
        result.warnings.push('Deload weeks scheduled too frequently - may impede progress');
      } else if (plan.deloadWeekFrequency > 8) {
        result.warnings.push(
          'Deload weeks scheduled infrequently - may increase injury risk with fatigue accumulation',
        );
      }
    }

    // Validate goals alignment
    const goalsValidation = this.validateGoalsAlignment(plan, userProfile);
    result.warnings.push(...goalsValidation.warnings);
    result.recommendations.push(...goalsValidation.recommendations);

    // Age-specific plan recommendations
    if (userProfile.age) {
      if (userProfile.age >= 65) {
        result.recommendations.push(
          'Include balance and fall prevention exercises',
          'Prioritize functional movements and flexibility',
          'Allow extra recovery time between sessions',
        );
      }

      if (userProfile.age < 18) {
        result.recommendations.push(
          'Focus on movement quality over intensity',
          'Include diverse movement patterns for athletic development',
          'Avoid excessive specialization',
        );
      }
    }

    return result;
  }

  /**
   * Get safe progression recommendations
   */
  getProgressionRecommendations(
    currentPlan: FitnessPlan,
    adherenceScore: number,
    userFeedback?: {
      difficultyRating?: number; // 1-5 scale
      fatigueLevel?: number; // 1-5 scale
      enjoymentLevel?: number; // 1-5 scale
    },
  ): {
    shouldProgress: boolean;
    shouldDeload: boolean;
    recommendations: string[];
    adjustments: {
      volumeAdjustment: number; // Percentage change
      intensityAdjustment: number; // Percentage change
      frequencyAdjustment: number; // Workout per week change
    };
  } {
    const recommendations: string[] = [];
    let shouldProgress = false;
    let shouldDeload = false;

    const adjustments = {
      volumeAdjustment: 0,
      intensityAdjustment: 0,
      frequencyAdjustment: 0,
    };

    // Base progression logic on adherence
    if (adherenceScore >= 85) {
      if (!userFeedback || userFeedback.difficultyRating <= 3) {
        shouldProgress = true;
        adjustments.volumeAdjustment = 5;
        recommendations.push('Great adherence! Ready for progression');
      }
    } else if (adherenceScore < 60) {
      adjustments.volumeAdjustment = -10;
      recommendations.push('Consider reducing volume to improve consistency');
    }

    // Factor in user feedback
    if (userFeedback) {
      if (userFeedback.difficultyRating >= 4) {
        adjustments.intensityAdjustment = -5;
        recommendations.push('Reduce intensity based on difficulty feedback');
      }

      if (userFeedback.fatigueLevel >= 4) {
        shouldDeload = true;
        adjustments.volumeAdjustment = -15;
        recommendations.push('High fatigue detected - implement deload week');
      }

      if (userFeedback.enjoymentLevel <= 2) {
        recommendations.push('Consider exercise variety changes to improve engagement');
      }
    }

    // Weekly adaptation check
    const currentWeek = currentPlan.getCurrentWeek();
    if (currentWeek % currentPlan.deloadWeekFrequency === 0) {
      shouldDeload = true;
      recommendations.push('Scheduled deload week for recovery');
    }

    return {
      shouldProgress,
      shouldDeload,
      recommendations,
      adjustments,
    };
  }

  /**
   * Validate exercise form and safety parameters
   */
  validateExerciseParameters(
    exerciseName: string,
    sets: number,
    reps: number,
    weight?: number,
    userProfile?: UserProfile,
  ): SafetyValidationResult {
    const result: SafetyValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: [],
    };

    // Validate basic parameters
    if (sets < 1 || sets > 10) {
      result.errors.push(`Invalid number of sets: ${sets}. Must be between 1-10`);
      result.isValid = false;
    }

    if (reps < 1 || reps > 100) {
      result.errors.push(`Invalid number of reps: ${reps}. Must be between 1-100`);
      result.isValid = false;
    }

    // Rep range recommendations
    if (reps > 30) {
      result.warnings.push('Very high rep range - ensure this aligns with your goals');
    }

    if (reps < 3 && sets > 5) {
      result.warnings.push('Very low reps with high sets - appropriate for strength training only');
    }

    // Weight validation (if provided)
    if (weight !== undefined) {
      if (weight < 0) {
        result.errors.push('Weight cannot be negative');
        result.isValid = false;
      }

      if (userProfile?.currentWeight && weight > userProfile.currentWeight * 3) {
        result.warnings.push(
          'Exercise weight is very high relative to body weight - ensure proper form and spotting',
        );
      }
    }

    return result;
  }

  // Private helper methods

  private mapExperienceToDifficulty(experience: ExperienceLevel): DifficultyLevel {
    const mapping = {
      [ExperienceLevel.BEGINNER]: DifficultyLevel.BEGINNER,
      [ExperienceLevel.INTERMEDIATE]: DifficultyLevel.INTERMEDIATE,
      [ExperienceLevel.ADVANCED]: DifficultyLevel.ADVANCED,
      [ExperienceLevel.EXPERT]: DifficultyLevel.EXPERT,
    };
    return mapping[experience];
  }

  private getVolumeLimits(experienceLevel: ExperienceLevel) {
    const limits = {
      [ExperienceLevel.BEGINNER]: { maxSets: 12, warningThreshold: 10 },
      [ExperienceLevel.INTERMEDIATE]: { maxSets: 18, warningThreshold: 15 },
      [ExperienceLevel.ADVANCED]: { maxSets: 25, warningThreshold: 20 },
      [ExperienceLevel.EXPERT]: { maxSets: 30, warningThreshold: 25 },
    };
    return limits[experienceLevel];
  }

  private getDurationLimits(experienceLevel: ExperienceLevel) {
    const limits = {
      [ExperienceLevel.BEGINNER]: { min: 20, max: 60, warning: 50 },
      [ExperienceLevel.INTERMEDIATE]: { min: 30, max: 90, warning: 75 },
      [ExperienceLevel.ADVANCED]: { min: 40, max: 120, warning: 100 },
      [ExperienceLevel.EXPERT]: { min: 45, max: 150, warning: 120 },
    };
    return limits[experienceLevel];
  }

  private validateWorkoutFrequency(
    frequency: number,
    planType: FitnessPlanType,
    experienceLevel: ExperienceLevel,
  ): { isValid: boolean; warnings: string[]; errors: string[] } {
    const result = { isValid: true, warnings: [], errors: [] };

    // General frequency limits
    if (frequency > 7) {
      result.errors.push('Cannot workout more than 7 days per week');
      result.isValid = false;
    }

    if (frequency < 1) {
      result.errors.push('Must have at least 1 workout per week');
      result.isValid = false;
    }

    // Experience-based recommendations
    const maxFrequency = {
      [ExperienceLevel.BEGINNER]: 4,
      [ExperienceLevel.INTERMEDIATE]: 5,
      [ExperienceLevel.ADVANCED]: 6,
      [ExperienceLevel.EXPERT]: 7,
    };

    if (frequency > maxFrequency[experienceLevel]) {
      result.warnings.push(
        `${frequency} workouts/week may be too much for ${experienceLevel} level`,
      );
    }

    // Plan type specific recommendations
    const typeRecommendations = {
      [FitnessPlanType.STRENGTH_BUILDING]: { min: 3, max: 5 },
      [FitnessPlanType.MUSCLE_GAIN]: { min: 3, max: 6 },
      [FitnessPlanType.WEIGHT_LOSS]: { min: 4, max: 6 },
      [FitnessPlanType.ENDURANCE_TRAINING]: { min: 4, max: 7 },
      [FitnessPlanType.REHABILITATION]: { min: 2, max: 4 },
    };

    const recommendation = typeRecommendations[planType];
    if (recommendation) {
      if (frequency < recommendation.min) {
        result.warnings.push(
          `${frequency} workouts/week may be insufficient for ${planType} goals`,
        );
      }
      if (frequency > recommendation.max) {
        result.warnings.push(`${frequency} workouts/week may be excessive for ${planType} goals`);
      }
    }

    return result;
  }

  private checkMuscleGroupBalance(exercises: FitnessPlanExercise[]): { warnings: string[] } {
    const warnings: string[] = [];

    // Count exercises by movement pattern
    let pushingMovements = 0;
    let pullingMovements = 0;
    let squattingMovements = 0;
    let hingingMovements = 0;

    for (const exercise of exercises) {
      // This would ideally check the actual exercise data
      // For now, using exercise name patterns
      const name = exercise.exerciseName.toLowerCase();

      if (name.includes('press') || name.includes('push')) {
        pushingMovements++;
      }
      if (name.includes('pull') || name.includes('row') || name.includes('chin')) {
        pullingMovements++;
      }
      if (name.includes('squat') || name.includes('lunge')) {
        squattingMovements++;
      }
      if (name.includes('deadlift') || name.includes('hinge')) {
        hingingMovements++;
      }
    }

    // Check for imbalances
    if (pushingMovements > pullingMovements * 1.5) {
      warnings.push('More pushing than pulling exercises - may lead to muscle imbalances');
    }

    if (pullingMovements > pushingMovements * 1.5) {
      warnings.push(
        'More pulling than pushing exercises - consider adding horizontal/vertical pressing',
      );
    }

    return { warnings };
  }

  private validateExerciseOrder(exercises: FitnessPlanExercise[]): { warnings: string[] } {
    const warnings: string[] = [];

    // Check if compound movements come before isolation
    let foundIsolation = false;

    for (const exercise of exercises) {
      if (exercise.exerciseType === 'isolation') {
        foundIsolation = true;
      } else if (exercise.exerciseType === 'compound' && foundIsolation) {
        warnings.push('Consider placing compound exercises before isolation exercises');
        break;
      }
    }

    return { warnings };
  }

  private validateGoalsAlignment(
    plan: FitnessPlan,
    userProfile: UserProfile,
  ): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // This would check if the plan type aligns with user's stated goals
    // Implementation would depend on how user goals are structured

    if (plan.planType === FitnessPlanType.WEIGHT_LOSS && plan.workoutsPerWeek < 4) {
      warnings.push('Weight loss goals typically benefit from 4+ workouts per week');
    }

    if (plan.planType === FitnessPlanType.MUSCLE_GAIN && plan.workoutsPerWeek > 5) {
      warnings.push('Muscle gain may benefit from more rest days between sessions');
    }

    if (plan.planType === FitnessPlanType.STRENGTH_BUILDING && plan.durationWeeks < 8) {
      recommendations.push('Strength gains typically require 8+ week programs');
    }

    return { warnings, recommendations };
  }

  /**
   * Validate fitness adaptation for safety and reasonableness
   */
  async validateAdaptation(adaptation: any, userProfile: UserProfile): Promise<boolean> {
    // Basic validation for adaptation parameters
    if (!adaptation || typeof adaptation !== 'object') {
      return false;
    }

    // Check if adaptation contains required fields
    const requiredFields = ['type', 'adjustments'];
    for (const field of requiredFields) {
      if (!(field in adaptation)) {
        return false;
      }
    }

    // Validate adjustment ranges are reasonable
    if (adaptation.adjustments) {
      // Check if weight/intensity increases are safe (max 10% increase per week)
      if (adaptation.adjustments.intensityIncrease && adaptation.adjustments.intensityIncrease > 0.1) {
        return false;
      }

      // Check if volume increases are safe (max 15% increase per week)
      if (adaptation.adjustments.volumeIncrease && adaptation.adjustments.volumeIncrease > 0.15) {
        return false;
      }
    }

    // Additional safety checks based on user profile
    if (userProfile.experienceLevel === ExperienceLevel.BEGINNER) {
      // More conservative limits for beginners
      if (adaptation.adjustments?.intensityIncrease && adaptation.adjustments.intensityIncrease > 0.05) {
        return false;
      }
    }

    return true;
  }
}
