import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FitnessPlan } from './fitness-plan.entity';
import { FitnessPlanWorkout } from './fitness-plan-workout.entity';

export enum WeekType {
  NORMAL = 'normal',
  DELOAD = 'deload',
  PEAK = 'peak',
  RECOVERY = 'recovery',
  ASSESSMENT = 'assessment',
}

@Entity('fitness_plan_weeks')
@Index(['fitnessPlanId'])
@Index(['weekNumber'])
@Index(['weekType'])
export class FitnessPlanWeek {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fitness_plan_id' })
  fitnessPlanId: string;

  @Column({ name: 'week_number', type: 'integer' })
  weekNumber: number;

  @Column({ name: 'week_name', length: 255 })
  weekName: string;

  @Column({ name: 'week_description', type: 'text', nullable: true })
  weekDescription?: string;

  @Column({
    type: 'enum',
    enum: WeekType,
    default: WeekType.NORMAL,
  })
  weekType: WeekType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  // Week-specific targets and modifications
  @Column({ name: 'intensity_modifier', type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  intensityModifier: number; // 0.8 for deload, 1.2 for peak

  @Column({ name: 'volume_modifier', type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  volumeModifier: number;

  @Column({ name: 'target_workouts', type: 'integer' })
  targetWorkouts: number;

  @Column({ name: 'target_calories_burn', type: 'integer', nullable: true })
  targetCaloriesBurn?: number;

  @Column({ name: 'target_workout_time_minutes', type: 'integer', nullable: true })
  targetWorkoutTimeMinutes?: number;

  // Focus and goals for the week
  @Column({ name: 'primary_focus', type: 'json', nullable: true })
  primaryFocus?: string[]; // ['strength', 'endurance', 'mobility']

  @Column({ name: 'secondary_focus', type: 'json', nullable: true })
  secondaryFocus?: string[];

  @Column({ name: 'week_goals', type: 'text', nullable: true })
  weekGoals?: string;

  @Column({ name: 'coaching_notes', type: 'text', nullable: true })
  coachingNotes?: string;

  // Progress tracking
  @Column({ name: 'workouts_completed', type: 'integer', default: 0 })
  workoutsCompleted: number;

  @Column({ name: 'calories_burned', type: 'integer', default: 0 })
  caloriesBurned: number;

  @Column({ name: 'total_workout_time_minutes', type: 'integer', default: 0 })
  totalWorkoutTimeMinutes: number;

  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({ name: 'adherence_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  adherenceScore: number;

  // Week status and feedback
  @Column({ name: 'is_current', default: false })
  isCurrent: boolean;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'user_feedback', type: 'text', nullable: true })
  userFeedback?: string;

  @Column({ name: 'difficulty_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  difficultyRating?: number; // 1-5 scale

  @Column({ name: 'enjoyment_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  enjoymentRating?: number; // 1-5 scale

  // Adaptations and modifications
  @Column({ name: 'adaptations_made', type: 'json', nullable: true })
  adaptationsMade?: string[];

  @Column({ name: 'modification_reasons', type: 'json', nullable: true })
  modificationReasons?: string[];

  @Column({ name: 'auto_adapted', default: false })
  autoAdapted: boolean;

  // Recovery and wellness
  @Column({ name: 'recovery_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  recoveryScore?: number; // 1-5 scale

  @Column({ name: 'stress_level', type: 'decimal', precision: 3, scale: 2, nullable: true })
  stressLevel?: number; // 1-5 scale

  @Column({ name: 'sleep_quality', type: 'decimal', precision: 3, scale: 2, nullable: true })
  sleepQuality?: number; // 1-5 scale

  @Column({ name: 'energy_level', type: 'decimal', precision: 3, scale: 2, nullable: true })
  energyLevel?: number; // 1-5 scale

  // Assessment and measurements
  @Column({ name: 'body_weight_start_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bodyWeightStartKg?: number;

  @Column({ name: 'body_weight_end_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bodyWeightEndKg?: number;

  @Column({ name: 'body_measurements', type: 'json', nullable: true })
  bodyMeasurements?: any; // chest, waist, arms, etc.

  @Column({ name: 'performance_metrics', type: 'json', nullable: true })
  performanceMetrics?: any; // PRs, endurance improvements, etc.

  @Column({ name: 'progress_photos_urls', type: 'json', nullable: true })
  progressPhotosUrls?: string[];

  // Relationships
  @ManyToOne(() => FitnessPlan, (plan) => plan.weeks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fitness_plan_id' })
  fitnessPlan: FitnessPlan;

  @OneToMany(() => FitnessPlanWorkout, (workout) => workout.week, { cascade: true })
  workouts: FitnessPlanWorkout[];

  // Helper methods
  isActive(): boolean {
    const now = new Date();
    return this.startDate <= now && this.endDate >= now && !this.isCompleted;
  }

  getDaysInWeek(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  getCompletionRate(): number {
    return this.targetWorkouts > 0 ? (this.workoutsCompleted / this.targetWorkouts) * 100 : 0;
  }

  getAverageWorkoutDuration(): number {
    return this.workoutsCompleted > 0 ? this.totalWorkoutTimeMinutes / this.workoutsCompleted : 0;
  }

  getCaloriesBurnPerWorkout(): number {
    return this.workoutsCompleted > 0 ? this.caloriesBurned / this.workoutsCompleted : 0;
  }

  isDeloadWeek(): boolean {
    return this.weekType === WeekType.DELOAD;
  }

  isPeakWeek(): boolean {
    return this.weekType === WeekType.PEAK;
  }

  isRecoveryWeek(): boolean {
    return this.weekType === WeekType.RECOVERY;
  }

  markAsCompleted(): void {
    this.isCompleted = true;
    this.completionPercentage = 100;
    this.isCurrent = false;
  }

  markAsCurrent(): void {
    this.isCurrent = true;
  }

  updateProgress(workoutsCompleted: number, caloriesBurned: number, timeMinutes: number): void {
    this.workoutsCompleted = workoutsCompleted;
    this.caloriesBurned = caloriesBurned;
    this.totalWorkoutTimeMinutes = timeMinutes;
    this.completionPercentage = this.getCompletionRate();
    this.adherenceScore = this.calculateAdherenceScore();
  }

  addWorkoutProgress(caloriesBurned: number, durationMinutes: number): void {
    this.workoutsCompleted++;
    this.caloriesBurned += caloriesBurned;
    this.totalWorkoutTimeMinutes += durationMinutes;
    this.completionPercentage = this.getCompletionRate();
    this.adherenceScore = this.calculateAdherenceScore();
  }

  private calculateAdherenceScore(): number {
    const completionRate = this.getCompletionRate();

    // Factor in user feedback and ratings
    let adherenceModifier = 1.0;

    if (this.difficultyRating && this.difficultyRating > 4) {
      adherenceModifier *= 0.95; // Slight penalty for extremely difficult weeks
    }

    if (this.enjoymentRating && this.enjoymentRating < 2) {
      adherenceModifier *= 0.9; // Penalty for low enjoyment
    }

    if (this.recoveryScore && this.recoveryScore < 2) {
      adherenceModifier *= 0.9; // Penalty for poor recovery
    }

    return Math.min(completionRate * adherenceModifier, 100);
  }

  updateWellnessMetrics(
    recoveryScore?: number,
    stressLevel?: number,
    sleepQuality?: number,
    energyLevel?: number,
  ): void {
    if (recoveryScore) this.recoveryScore = recoveryScore;
    if (stressLevel) this.stressLevel = stressLevel;
    if (sleepQuality) this.sleepQuality = sleepQuality;
    if (energyLevel) this.energyLevel = energyLevel;
  }

  updateBodyWeight(startWeight?: number, endWeight?: number): void {
    if (startWeight) this.bodyWeightStartKg = startWeight;
    if (endWeight) this.bodyWeightEndKg = endWeight;
  }

  getWeightChange(): number | null {
    if (this.bodyWeightStartKg && this.bodyWeightEndKg) {
      return this.bodyWeightEndKg - this.bodyWeightStartKg;
    }
    return null;
  }

  addAdaptation(adaptation: string, reason: string): void {
    if (!this.adaptationsMade) this.adaptationsMade = [];
    if (!this.modificationReasons) this.modificationReasons = [];

    this.adaptationsMade.push(adaptation);
    this.modificationReasons.push(reason);
  }

  provideFeedback(difficulty: number, enjoyment: number, feedback: string): void {
    this.difficultyRating = Math.max(1, Math.min(5, difficulty));
    this.enjoymentRating = Math.max(1, Math.min(5, enjoyment));
    this.userFeedback = feedback;
  }

  shouldRecommendDeload(): boolean {
    // Recommend deload if multiple negative indicators
    const negativeIndicators = [
      this.difficultyRating && this.difficultyRating > 4,
      this.enjoymentRating && this.enjoymentRating < 2,
      this.recoveryScore && this.recoveryScore < 2,
      this.stressLevel && this.stressLevel > 4,
      this.sleepQuality && this.sleepQuality < 2,
      this.energyLevel && this.energyLevel < 2,
      this.adherenceScore < 70,
    ].filter(Boolean).length;

    return negativeIndicators >= 3;
  }

  getIntensityAdjustment(): number {
    // Suggest intensity adjustments based on week performance and metrics
    if (this.shouldRecommendDeload()) {
      return 0.8; // Reduce intensity by 20%
    }

    if (
      this.adherenceScore > 90 &&
      this.difficultyRating &&
      this.difficultyRating < 3 &&
      this.recoveryScore &&
      this.recoveryScore > 3
    ) {
      return 1.1; // Increase intensity by 10%
    }

    return 1.0; // Maintain current intensity
  }
}
