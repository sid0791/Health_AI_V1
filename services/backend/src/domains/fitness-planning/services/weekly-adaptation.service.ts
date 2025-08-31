import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { FitnessPlan, FitnessPlanStatus } from '../entities/fitness-plan.entity';
import { FitnessPlanWeek } from '../entities/fitness-plan-week.entity';
import { FitnessPlanWorkout } from '../entities/fitness-plan-workout.entity';
import { FitnessPlanExercise } from '../entities/fitness-plan-exercise.entity';
import { User } from '../../users/entities/user.entity';
import { FitnessPlanGeneratorService } from './fitness-plan-generator.service';
import { SafetyValidationService } from './safety-validation.service';

// Integration with logs domain for adherence tracking
import { LogEntry } from '../../logs/entities/log-entry.entity';
import { LogType } from '../../logs/entities/log-entry.entity';

// Integration with AI routing for plan generation
import { AIRoutingService, AIRoutingRequest } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';

export interface WeeklyAdaptationRequest {
  userId: string;
  forceRun?: boolean;
  adaptationType?: 'automatic' | 'user_requested';
}

export interface WeeklyAdaptationResult {
  userId: string;
  weekNumber: number;
  adaptationsApplied: AdaptationChange[];
  adherenceScore: number;
  deficiencies: DeficiencyAnalysis;
  nextWeekPlan: WeeklyPlanSummary;
  recommendations: string[];
  measurementRequests: MeasurementRequest[];
}

export interface AdaptationChange {
  type: 'volume' | 'intensity' | 'exercise_swap' | 'rest_adjustment' | 'progression';
  description: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  safetyValidated: boolean;
}

export interface DeficiencyAnalysis {
  volumeDeficiency: number; // percentage below target
  intensityDeficiency: number;
  consistencyScore: number; // 0-100
  weakMuscleGroups: string[];
  missedWorkoutTypes: string[];
  recoveryIndicators: {
    overdueRestDays: number;
    potentialOvertraining: boolean;
    recommendedDeload: boolean;
  };
}

export interface WeeklyPlanSummary {
  weekNumber: number;
  totalWorkouts: number;
  estimatedDuration: number; // minutes
  primaryFocus: string[];
  newExercises: number;
  progressionChanges: number;
  difficultyAdjustment: 'easier' | 'same' | 'harder';
}

export interface MeasurementRequest {
  type: 'weight' | 'body_composition' | 'circumference' | 'fitness_test';
  description: string;
  priority: 'high' | 'medium' | 'low';
  instructions: string;
  dueDate: Date;
}

@Injectable()
export class WeeklyAdaptationService {
  private readonly logger = new Logger(WeeklyAdaptationService.name);

  constructor(
    @InjectRepository(FitnessPlan)
    private readonly fitnessPlanRepository: Repository<FitnessPlan>,
    @InjectRepository(FitnessPlanWeek)
    private readonly weekRepository: Repository<FitnessPlanWeek>,
    @InjectRepository(FitnessPlanWorkout)
    private readonly workoutRepository: Repository<FitnessPlanWorkout>,
    @InjectRepository(FitnessPlanExercise)
    private readonly exerciseRepository: Repository<FitnessPlanExercise>,
    @InjectRepository(LogEntry)
    private readonly logRepository: Repository<LogEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly planGeneratorService: FitnessPlanGeneratorService,
    private readonly safetyValidationService: SafetyValidationService,
    private readonly aiRoutingService: AIRoutingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Scheduled weekly adaptation runner (called by n8n workflow)
   */
  @Cron('0 6 * * 1', { // Every Monday at 6 AM
    name: 'weekly-fitness-adaptation',
    timeZone: 'Asia/Kolkata',
  })
  async runScheduledWeeklyAdaptation(): Promise<void> {
    this.logger.log('Starting scheduled weekly fitness adaptation for all users');

    try {
      // Get all users with active fitness plans
      const activeUsers = await this.getActiveUsers();
      
      this.logger.log(`Found ${activeUsers.length} users with active fitness plans`);

      // Process adaptations in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(user => this.adaptUserFitnessPlan({
            userId: user.id,
            adaptationType: 'automatic'
          }))
        );

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.logger.log('Completed scheduled weekly fitness adaptation');
    } catch (error) {
      this.logger.error('Error in scheduled weekly adaptation:', error);
      throw error;
    }
  }

  /**
   * Adapt a specific user's fitness plan based on weekly feedback
   */
  async adaptUserFitnessPlan(request: WeeklyAdaptationRequest): Promise<WeeklyAdaptationResult> {
    const { userId, adaptationType = 'automatic' } = request;

    this.logger.log(`Starting weekly adaptation for user ${userId}`);

    // Get user and their current active plan
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const activePlan = await this.getCurrentActivePlan(userId);
    if (!activePlan) {
      this.logger.warn(`No active fitness plan found for user ${userId}`);
      return this.createEmptyAdaptationResult(userId);
    }

    // Analyze last week's adherence and performance
    const adherenceAnalysis = await this.analyzeWeeklyAdherence(userId, activePlan);
    
    // Compute deficiencies and needed adaptations
    const deficiencies = await this.computeDeficiencies(userId, activePlan, adherenceAnalysis);
    
    // Generate adaptations using AI if significant changes needed
    const adaptations = await this.generateAdaptations(userId, activePlan, deficiencies, adherenceAnalysis);
    
    // Apply safety validation to all adaptations
    const validatedAdaptations = await this.validateAdaptations(adaptations, user, activePlan);
    
    // Create next week's plan with adaptations
    const nextWeekPlan = await this.createAdaptedWeeklyPlan(
      activePlan,
      validatedAdaptations,
      deficiencies
    );
    
    // Generate measurement requests if needed
    const measurementRequests = this.generateMeasurementRequests(deficiencies, adherenceAnalysis);
    
    // Generate recommendations for the user
    const recommendations = await this.generateUserRecommendations(
      validatedAdaptations,
      deficiencies,
      adherenceAnalysis
    );

    const result: WeeklyAdaptationResult = {
      userId,
      weekNumber: activePlan.getCurrentWeek() + 1,
      adaptationsApplied: validatedAdaptations,
      adherenceScore: adherenceAnalysis.overallScore,
      deficiencies,
      nextWeekPlan,
      recommendations,
      measurementRequests,
    };

    // Log the adaptation for analytics
    await this.logAdaptation(result, adaptationType);

    this.logger.log(`Completed weekly adaptation for user ${userId} with ${validatedAdaptations.length} changes`);

    return result;
  }

  /**
   * Get all users with active fitness plans
   */
  private async getActiveUsers(): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.fitnessPlans', 'plan')
      .where('plan.status = :status', { status: FitnessPlanStatus.ACTIVE })
      .andWhere('plan.endDate > :now', { now: new Date() })
      .distinct(true)
      .getMany();
  }

  /**
   * Get current active fitness plan for user
   */
  private async getCurrentActivePlan(userId: string): Promise<FitnessPlan | null> {
    return await this.fitnessPlanRepository.findOne({
      where: {
        userId,
        status: FitnessPlanStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
      relations: ['weeks', 'weeks.workouts', 'weeks.workouts.exercises'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Analyze adherence for the past week
   */
  private async analyzeWeeklyAdherence(userId: string, plan: FitnessPlan): Promise<any> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get workout logs for the past week
    const workoutLogs = await this.logRepository.find({
      where: {
        userId,
        logType: LogType.EXERCISE,
        loggedAt: Between(oneWeekAgo, new Date()),
      },
      order: { loggedAt: 'DESC' },
    });

    // Get scheduled workouts for the past week
    const currentWeek = plan.weeks.find(w => w.weekNumber === plan.getCurrentWeek());
    const scheduledWorkouts = currentWeek?.workouts || [];

    // Calculate adherence metrics
    const completedWorkouts = workoutLogs.filter(log => log.data?.completed === true).length;
    const totalScheduledWorkouts = scheduledWorkouts.length;
    const adherencePercentage = totalScheduledWorkouts > 0 
      ? (completedWorkouts / totalScheduledWorkouts) * 100 
      : 0;

    // Analyze workout quality and intensity
    const avgIntensity = this.calculateAverageIntensity(workoutLogs);
    const avgDuration = this.calculateAverageDuration(workoutLogs);
    const consistencyScore = this.calculateConsistencyScore(workoutLogs);

    return {
      overallScore: adherencePercentage,
      completedWorkouts,
      totalScheduledWorkouts,
      avgIntensity,
      avgDuration,
      consistencyScore,
      workoutLogs,
      scheduledWorkouts,
    };
  }

  /**
   * Compute deficiencies based on adherence analysis
   */
  private async computeDeficiencies(
    userId: string,
    plan: FitnessPlan,
    adherenceAnalysis: any
  ): Promise<DeficiencyAnalysis> {
    // Volume deficiency based on missed workouts
    const volumeDeficiency = Math.max(0, 100 - adherenceAnalysis.overallScore);
    
    // Intensity deficiency based on reported effort vs planned
    const intensityDeficiency = this.calculateIntensityDeficiency(adherenceAnalysis);
    
    // Consistency score based on workout frequency patterns
    const consistencyScore = adherenceAnalysis.consistencyScore;
    
    // Analyze which muscle groups were under-trained
    const weakMuscleGroups = await this.identifyWeakMuscleGroups(userId, adherenceAnalysis);
    
    // Identify missed workout types
    const missedWorkoutTypes = this.identifyMissedWorkoutTypes(adherenceAnalysis);
    
    // Recovery analysis
    const recoveryIndicators = await this.analyzeRecoveryNeeds(userId, adherenceAnalysis);

    return {
      volumeDeficiency,
      intensityDeficiency,
      consistencyScore,
      weakMuscleGroups,
      missedWorkoutTypes,
      recoveryIndicators,
    };
  }

  /**
   * Generate adaptations using AI for complex scenarios
   */
  private async generateAdaptations(
    userId: string,
    plan: FitnessPlan,
    deficiencies: DeficiencyAnalysis,
    adherenceAnalysis: any
  ): Promise<AdaptationChange[]> {
    const adaptations: AdaptationChange[] = [];

    // Simple rule-based adaptations for common scenarios
    if (deficiencies.volumeDeficiency > 20) {
      adaptations.push({
        type: 'volume',
        description: 'Reduce workout volume by 15% to improve adherence',
        reason: `Volume deficiency: ${deficiencies.volumeDeficiency}%`,
        impact: 'medium',
        safetyValidated: false,
      });
    }

    if (deficiencies.consistencyScore < 60) {
      adaptations.push({
        type: 'rest_adjustment',
        description: 'Add more rest days between intense sessions',
        reason: 'Poor consistency indicates potential overtraining',
        impact: 'medium',
        safetyValidated: false,
      });
    }

    // Use AI for complex adaptations when deficiencies are significant
    if (deficiencies.volumeDeficiency > 30 || deficiencies.intensityDeficiency > 25) {
      const aiAdaptations = await this.generateAIAdaptations(userId, plan, deficiencies, adherenceAnalysis);
      adaptations.push(...aiAdaptations);
    }

    return adaptations;
  }

  /**
   * Generate AI-powered adaptations for complex scenarios
   */
  private async generateAIAdaptations(
    userId: string,
    plan: FitnessPlan,
    deficiencies: DeficiencyAnalysis,
    adherenceAnalysis: any
  ): Promise<AdaptationChange[]> {
    try {
      const aiRequest: AIRoutingRequest = {
        requestType: RequestType.FITNESS_ADAPTATION,
        userId,
        payload: {
          planSummary: {
            planType: plan.planType,
            currentWeek: plan.getCurrentWeek(),
            totalWeeks: plan.durationWeeks,
            workoutsPerWeek: plan.workoutsPerWeek,
          },
          deficiencies,
          adherenceAnalysis: {
            score: adherenceAnalysis.overallScore,
            consistency: adherenceAnalysis.consistencyScore,
            intensity: adherenceAnalysis.avgIntensity,
          },
          userPreferences: {
            maxWorkoutDuration: plan.maxWorkoutDurationMinutes,
            availableEquipment: plan.availableEquipment,
            physicalLimitations: plan.physicalLimitations,
          },
        },
      };

      const response = await this.aiRoutingService.routeRequest(aiRequest);
      
      if (response.success && response.data?.adaptations) {
        return response.data.adaptations.map((adaptation: any) => ({
          type: adaptation.type,
          description: adaptation.description,
          reason: adaptation.reason,
          impact: adaptation.impact || 'medium',
          safetyValidated: false,
        }));
      }

      this.logger.warn(`AI adaptation request failed for user ${userId}:`, response.error);
      return [];
    } catch (error) {
      this.logger.error(`Error generating AI adaptations for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Validate adaptations for safety
   */
  private async validateAdaptations(
    adaptations: AdaptationChange[],
    user: User,
    plan: FitnessPlan
  ): Promise<AdaptationChange[]> {
    const validatedAdaptations: AdaptationChange[] = [];

    for (const adaptation of adaptations) {
      try {
        const isValid = await this.safetyValidationService.validateAdaptation(
          adaptation,
          {
            experienceLevel: plan.experienceLevel,
            healthConditions: plan.physicalLimitations,
          },
        );

        if (isValid) {
          adaptation.safetyValidated = true;
          validatedAdaptations.push(adaptation);
        } else {
          this.logger.warn(`Adaptation rejected for safety: ${adaptation.description}`);
        }
      } catch (error) {
        this.logger.error(`Error validating adaptation:`, error);
      }
    }

    return validatedAdaptations;
  }

  /**
   * Create next week's plan with adaptations applied
   */
  private async createAdaptedWeeklyPlan(
    plan: FitnessPlan,
    adaptations: AdaptationChange[],
    deficiencies: DeficiencyAnalysis
  ): Promise<WeeklyPlanSummary> {
    const nextWeekNumber = plan.getCurrentWeek() + 1;
    
    // Apply adaptations to create modified plan parameters
    let adjustedParams = this.applyAdaptationsToParams(plan, adaptations);
    
    // Generate next week using adjusted parameters
    const nextWeek = await this.planGeneratorService.generateWeeklyPlan(
      plan.planType,
      plan.experienceLevel,
      nextWeekNumber,
      plan.workoutsPerWeek,
      [], // Available equipment - will be populated from user profile
      [], // Focus areas - will be populated from plan
      adaptations[0] || null,
    );

    // Update the plan's last updated time
    await this.fitnessPlanRepository.update(plan.id, {
      updatedAt: new Date(),
    });

    return {
      weekNumber: nextWeekNumber,
      totalWorkouts: nextWeek.workouts.length,
      estimatedDuration: nextWeek.workouts.reduce((sum, w) => sum + (w.estimatedDurationMinutes || 60), 0),
      primaryFocus: [], // Focus areas would be determined from workout analysis
      newExercises: this.countNewExercises(nextWeek, plan),
      progressionChanges: adaptations.filter(a => a.type === 'progression').length,
      difficultyAdjustment: this.determineDifficultyChange(adaptations),
    };
  }

  /**
   * Generate measurement requests based on deficiencies
   */
  private generateMeasurementRequests(
    deficiencies: DeficiencyAnalysis,
    adherenceAnalysis: any
  ): MeasurementRequest[] {
    const requests: MeasurementRequest[] = [];

    // Request weight update if significant volume changes
    if (deficiencies.volumeDeficiency > 25 || adherenceAnalysis.overallScore < 50) {
      requests.push({
        type: 'weight',
        description: 'Please update your current weight',
        priority: 'medium',
        instructions: 'Weigh yourself first thing in the morning, after using the bathroom',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      });
    }

    // Request fitness test if major program changes
    if (deficiencies.recoveryIndicators.recommendedDeload) {
      requests.push({
        type: 'fitness_test',
        description: 'Assess current fitness level',
        priority: 'high',
        instructions: 'Perform the baseline fitness test to recalibrate your program',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      });
    }

    return requests;
  }

  /**
   * Generate user-friendly recommendations
   */
  private async generateUserRecommendations(
    adaptations: AdaptationChange[],
    deficiencies: DeficiencyAnalysis,
    adherenceAnalysis: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (adherenceAnalysis.overallScore < 70) {
      recommendations.push(
        'Consider scheduling your workouts at consistent times to build a routine'
      );
    }

    if (deficiencies.volumeDeficiency > 20) {
      recommendations.push(
        'Your workout frequency has decreased. Try starting with shorter, more manageable sessions'
      );
    }

    if (deficiencies.recoveryIndicators.potentialOvertraining) {
      recommendations.push(
        'Your body may need more recovery time. Consider taking an extra rest day this week'
      );
    }

    if (deficiencies.weakMuscleGroups.length > 0) {
      recommendations.push(
        `Focus on strengthening: ${deficiencies.weakMuscleGroups.join(', ')}`
      );
    }

    return recommendations;
  }

  // Helper methods
  private calculateAverageIntensity(workoutLogs: LogEntry[]): number {
    const intensityLogs = workoutLogs.filter(log => log.data?.intensity);
    if (intensityLogs.length === 0) return 0;
    
    const totalIntensity = intensityLogs.reduce((sum, log) => sum + (log.data.intensity || 0), 0);
    return totalIntensity / intensityLogs.length;
  }

  private calculateAverageDuration(workoutLogs: LogEntry[]): number {
    const durationLogs = workoutLogs.filter(log => log.data?.duration);
    if (durationLogs.length === 0) return 0;
    
    const totalDuration = durationLogs.reduce((sum, log) => sum + (log.data.duration || 0), 0);
    return totalDuration / durationLogs.length;
  }

  private calculateConsistencyScore(workoutLogs: LogEntry[]): number {
    // Simple consistency score based on workout frequency patterns
    const daysWithWorkouts = new Set(
      workoutLogs.map(log => log.loggedAt.toDateString())
    ).size;
    
    return Math.min(100, (daysWithWorkouts / 7) * 100);
  }

  private calculateIntensityDeficiency(adherenceAnalysis: any): number {
    // Compare actual vs planned intensity (assuming planned intensity is stored)
    const targetIntensity = 7; // Default target RPE
    const actualIntensity = adherenceAnalysis.avgIntensity || 0;
    
    return Math.max(0, ((targetIntensity - actualIntensity) / targetIntensity) * 100);
  }

  private async identifyWeakMuscleGroups(userId: string, adherenceAnalysis: any): Promise<string[]> {
    // Analyze which muscle groups were under-trained based on missed workouts
    const missedWorkouts = adherenceAnalysis.scheduledWorkouts.filter((workout: any) => 
      !adherenceAnalysis.workoutLogs.some((log: any) => 
        log.data?.workoutId === workout.id && log.data?.completed
      )
    );

    const missedMuscleGroups = new Set<string>();
    missedWorkouts.forEach((workout: any) => {
      workout.exercises?.forEach((exercise: any) => {
        exercise.primaryMuscleGroups?.forEach((group: string) => 
          missedMuscleGroups.add(group)
        );
      });
    });

    return Array.from(missedMuscleGroups);
  }

  private identifyMissedWorkoutTypes(adherenceAnalysis: any): string[] {
    const missedTypes = new Set<string>();
    
    adherenceAnalysis.scheduledWorkouts.forEach((workout: any) => {
      const wasCompleted = adherenceAnalysis.workoutLogs.some((log: any) => 
        log.data?.workoutId === workout.id && log.data?.completed
      );
      
      if (!wasCompleted && workout.type) {
        missedTypes.add(workout.type);
      }
    });

    return Array.from(missedTypes);
  }

  private async analyzeRecoveryNeeds(userId: string, adherenceAnalysis: any): Promise<any> {
    // Simple recovery analysis based on workout patterns
    return {
      overdueRestDays: 0, // Could calculate based on consecutive workout days
      potentialOvertraining: adherenceAnalysis.avgIntensity > 8.5 && adherenceAnalysis.consistencyScore > 90,
      recommendedDeload: adherenceAnalysis.overallScore < 40,
    };
  }

  private applyAdaptationsToParams(plan: FitnessPlan, adaptations: AdaptationChange[]): any {
    let params = {
      workoutsPerWeek: plan.workoutsPerWeek,
      maxWorkoutDurationMinutes: plan.maxWorkoutDurationMinutes,
      // ... other parameters
    };

    adaptations.forEach(adaptation => {
      switch (adaptation.type) {
        case 'volume':
          if (adaptation.description.includes('Reduce')) {
            params.workoutsPerWeek = Math.max(2, Math.floor(params.workoutsPerWeek * 0.85));
          }
          break;
        case 'rest_adjustment':
          // Adjust rest periods or add rest days
          break;
        // Handle other adaptation types
      }
    });

    return params;
  }

  private countNewExercises(nextWeek: any, plan: FitnessPlan): number {
    // Count exercises not in previous weeks
    const existingExercises = new Set<string>();
    plan.weeks.forEach(week => {
      week.workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
          existingExercises.add(exercise.exerciseName);
        });
      });
    });

    let newCount = 0;
    nextWeek.workouts.forEach((workout: any) => {
      workout.exercises.forEach((exercise: any) => {
        if (!existingExercises.has(exercise.exerciseId)) {
          newCount++;
        }
      });
    });

    return newCount;
  }

  private determineDifficultyChange(adaptations: AdaptationChange[]): 'easier' | 'same' | 'harder' {
    const volumeReductions = adaptations.filter(a => 
      a.type === 'volume' && a.description.toLowerCase().includes('reduce')
    ).length;
    
    const progressions = adaptations.filter(a => a.type === 'progression').length;

    if (volumeReductions > progressions) return 'easier';
    if (progressions > volumeReductions) return 'harder';
    return 'same';
  }

  private createEmptyAdaptationResult(userId: string): WeeklyAdaptationResult {
    return {
      userId,
      weekNumber: 0,
      adaptationsApplied: [],
      adherenceScore: 0,
      deficiencies: {
        volumeDeficiency: 0,
        intensityDeficiency: 0,
        consistencyScore: 0,
        weakMuscleGroups: [],
        missedWorkoutTypes: [],
        recoveryIndicators: {
          overdueRestDays: 0,
          potentialOvertraining: false,
          recommendedDeload: false,
        },
      },
      nextWeekPlan: {
        weekNumber: 0,
        totalWorkouts: 0,
        estimatedDuration: 0,
        primaryFocus: [],
        newExercises: 0,
        progressionChanges: 0,
        difficultyAdjustment: 'same',
      },
      recommendations: ['No active fitness plan found. Create a new plan to get started.'],
      measurementRequests: [],
    };
  }

  private async logAdaptation(result: WeeklyAdaptationResult, adaptationType: string): Promise<void> {
    try {
      // Log to analytics for tracking and improvement
      this.logger.log(`Weekly adaptation completed for user ${result.userId}:`, {
        weekNumber: result.weekNumber,
        adherenceScore: result.adherenceScore,
        adaptationCount: result.adaptationsApplied.length,
        adaptationType,
      });
    } catch (error) {
      this.logger.error('Error logging adaptation:', error);
    }
  }
}