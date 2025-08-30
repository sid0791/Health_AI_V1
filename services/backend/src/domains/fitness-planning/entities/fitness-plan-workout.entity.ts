import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FitnessPlanWeek } from './fitness-plan-week.entity';
import { FitnessPlanExercise } from './fitness-plan-exercise.entity';

export enum WorkoutType {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  HIIT = 'hiit',
  YOGA = 'yoga',
  PILATES = 'pilates',
  FLEXIBILITY = 'flexibility',
  CALISTHENICS = 'calisthenics',
  CIRCUIT = 'circuit',
  SPORTS = 'sports',
  REHABILITATION = 'rehabilitation',
  WARM_UP = 'warm_up',
  COOL_DOWN = 'cool_down',
}

export enum WorkoutStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  MODIFIED = 'modified',
}

@Entity('fitness_plan_workouts')
@Index(['weekId'])
@Index(['dayOfWeek'])
@Index(['workoutType'])
@Index(['status'])
@Index(['scheduledDate'])
export class FitnessPlanWorkout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'week_id' })
  weekId: string;

  @Column({ name: 'workout_name', length: 255 })
  workoutName: string;

  @Column({ name: 'workout_description', type: 'text', nullable: true })
  workoutDescription?: string;

  @Column({
    type: 'enum',
    enum: WorkoutType,
    name: 'workout_type',
  })
  workoutType: WorkoutType;

  @Column({ name: 'day_of_week', type: 'integer' })
  dayOfWeek: number; // 1-7 (Monday-Sunday)

  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate?: Date;

  @Column({ name: 'scheduled_time', type: 'time', nullable: true })
  scheduledTime?: string;

  @Column({
    type: 'enum',
    enum: WorkoutStatus,
    default: WorkoutStatus.PLANNED,
  })
  status: WorkoutStatus;

  // Duration and timing
  @Column({ name: 'estimated_duration_minutes', type: 'integer' })
  estimatedDurationMinutes: number;

  @Column({ name: 'actual_duration_minutes', type: 'integer', nullable: true })
  actualDurationMinutes?: number;

  @Column({ name: 'warm_up_duration_minutes', type: 'integer', default: 5 })
  warmUpDurationMinutes: number;

  @Column({ name: 'cool_down_duration_minutes', type: 'integer', default: 5 })
  coolDownDurationMinutes: number;

  // Intensity and effort
  @Column({ name: 'target_intensity_level', type: 'integer', default: 5 })
  targetIntensityLevel: number; // 1-10 scale

  @Column({ name: 'actual_intensity_level', type: 'integer', nullable: true })
  actualIntensityLevel?: number;

  @Column({ name: 'target_calories_burn', type: 'integer', nullable: true })
  targetCaloriesBurn?: number;

  @Column({ name: 'actual_calories_burn', type: 'integer', nullable: true })
  actualCaloriesBurn?: number;

  // Equipment and location
  @Column({ name: 'required_equipment', type: 'json', nullable: true })
  requiredEquipment?: string[];

  @Column({ name: 'workout_location', default: 'home' })
  workoutLocation: string;

  @Column({ name: 'space_requirements', nullable: true })
  spaceRequirements?: string;

  // Focus and goals
  @Column({ name: 'primary_muscle_groups', type: 'json', nullable: true })
  primaryMuscleGroups?: string[];

  @Column({ name: 'secondary_muscle_groups', type: 'json', nullable: true })
  secondaryMuscleGroups?: string[];

  @Column({ name: 'workout_goals', type: 'json', nullable: true })
  workoutGoals?: string[];

  @Column({ name: 'exercise_count', type: 'integer', default: 0 })
  exerciseCount: number;

  // Progress and completion
  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({ name: 'exercises_completed', type: 'integer', default: 0 })
  exercisesCompleted: number;

  @Column({ name: 'sets_completed', type: 'integer', default: 0 })
  setsCompleted: number;

  @Column({ name: 'total_reps_completed', type: 'integer', default: 0 })
  totalRepsCompleted: number;

  @Column({ name: 'total_weight_lifted_kg', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWeightLiftedKg: number;

  // User feedback and ratings
  @Column({ name: 'difficulty_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  difficultyRating?: number; // 1-5 scale

  @Column({ name: 'enjoyment_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  enjoymentRating?: number; // 1-5 scale

  @Column({ name: 'energy_level_before', type: 'decimal', precision: 3, scale: 2, nullable: true })
  energyLevelBefore?: number; // 1-5 scale

  @Column({ name: 'energy_level_after', type: 'decimal', precision: 3, scale: 2, nullable: true })
  energyLevelAfter?: number; // 1-5 scale

  @Column({ name: 'user_notes', type: 'text', nullable: true })
  userNotes?: string;

  // Timing and scheduling
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'paused_duration_minutes', type: 'integer', default: 0 })
  pausedDurationMinutes: number;

  // Adaptations and modifications
  @Column({ name: 'was_modified', default: false })
  wasModified: boolean;

  @Column({ name: 'modification_reason', type: 'text', nullable: true })
  modificationReason?: string;

  @Column({ name: 'original_workout_data', type: 'json', nullable: true })
  originalWorkoutData?: any;

  // Safety and health
  @Column({ name: 'injury_risk_level', type: 'integer', default: 1 })
  injuryRiskLevel: number; // 1-5 scale

  @Column({ name: 'form_check_required', default: false })
  formCheckRequired: boolean;

  @Column({ name: 'supervision_recommended', default: false })
  supervisionRecommended: boolean;

  @Column({ name: 'safety_notes', type: 'text', nullable: true })
  safetyNotes?: string;

  // Metrics and performance
  @Column({ name: 'average_heart_rate', type: 'integer', nullable: true })
  averageHeartRate?: number;

  @Column({ name: 'max_heart_rate', type: 'integer', nullable: true })
  maxHeartRate?: number;

  @Column({ name: 'average_pace_per_km', type: 'time', nullable: true })
  averagePacePerKm?: string; // For cardio workouts

  @Column({ name: 'distance_covered_km', type: 'decimal', precision: 10, scale: 3, nullable: true })
  distanceCoveredKm?: number;

  // Recovery and rest
  @Column({ name: 'recommended_rest_before_hours', type: 'integer', default: 24 })
  recommendedRestBeforeHours: number;

  @Column({ name: 'recommended_rest_after_hours', type: 'integer', default: 24 })
  recommendedRestAfterHours: number;

  @Column({ name: 'recovery_difficulty', type: 'integer', default: 3 })
  recoveryDifficulty: number; // 1-5 scale

  // Relationships
  @ManyToOne(() => FitnessPlanWeek, (week) => week.workouts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'week_id' })
  week: FitnessPlanWeek;

  @OneToMany(() => FitnessPlanExercise, (exercise) => exercise.workout, { cascade: true })
  exercises: FitnessPlanExercise[];

  // Helper methods
  isScheduledForToday(): boolean {
    if (!this.scheduledDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(this.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    return today.getTime() === scheduled.getTime();
  }

  isOverdue(): boolean {
    if (!this.scheduledDate || this.status === WorkoutStatus.COMPLETED) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(this.scheduledDate);
    scheduled.setHours(0, 0, 0, 0);
    return today.getTime() > scheduled.getTime();
  }

  getTotalTimeWithRest(): number {
    return (
      this.estimatedDurationMinutes + this.warmUpDurationMinutes + this.coolDownDurationMinutes
    );
  }

  getEffectiveDuration(): number {
    return (
      (this.actualDurationMinutes || this.estimatedDurationMinutes) - this.pausedDurationMinutes
    );
  }

  getCompletionRate(): number {
    return this.exerciseCount > 0 ? (this.exercisesCompleted / this.exerciseCount) * 100 : 0;
  }

  getIntensityVariation(): number {
    if (!this.actualIntensityLevel) return 0;
    return this.actualIntensityLevel - this.targetIntensityLevel;
  }

  getCalorieBurnEfficiency(): number {
    if (!this.actualCaloriesBurn || !this.actualDurationMinutes) return 0;
    return this.actualCaloriesBurn / this.actualDurationMinutes;
  }

  start(): void {
    this.status = WorkoutStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  complete(
    actualDuration?: number,
    actualIntensity?: number,
    actualCalories?: number,
    difficultyRating?: number,
    enjoymentRating?: number,
    notes?: string,
  ): void {
    this.status = WorkoutStatus.COMPLETED;
    this.completedAt = new Date();
    this.completionPercentage = 100;

    if (actualDuration) this.actualDurationMinutes = actualDuration;
    if (actualIntensity) this.actualIntensityLevel = actualIntensity;
    if (actualCalories) this.actualCaloriesBurn = actualCalories;
    if (difficultyRating) this.difficultyRating = difficultyRating;
    if (enjoymentRating) this.enjoymentRating = enjoymentRating;
    if (notes) this.userNotes = notes;
  }

  skip(reason?: string): void {
    this.status = WorkoutStatus.SKIPPED;
    this.completedAt = new Date();
    if (reason) this.userNotes = reason;
  }

  modify(reason: string, originalData?: any): void {
    this.wasModified = true;
    this.modificationReason = reason;
    this.status = WorkoutStatus.MODIFIED;
    if (originalData) this.originalWorkoutData = originalData;
  }

  updateProgress(exercisesCompleted: number, setsCompleted: number, repsCompleted: number): void {
    this.exercisesCompleted = exercisesCompleted;
    this.setsCompleted = setsCompleted;
    this.totalRepsCompleted = repsCompleted;
    this.completionPercentage = this.getCompletionRate();
  }

  addWeightLifted(weight: number): void {
    this.totalWeightLiftedKg += weight;
  }

  updateHeartRateData(averageHR: number, maxHR: number): void {
    this.averageHeartRate = averageHR;
    this.maxHeartRate = maxHR;
  }

  updateCardioMetrics(distance: number, pace: string): void {
    this.distanceCoveredKm = distance;
    this.averagePacePerKm = pace;
  }

  addPausedTime(minutes: number): void {
    this.pausedDurationMinutes += minutes;
  }

  getDayName(): string {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[this.dayOfWeek - 1] || 'Unknown';
  }

  isRestDay(): boolean {
    return this.workoutType === WorkoutType.COOL_DOWN || this.exerciseCount === 0;
  }

  isHighIntensity(): boolean {
    const intensity = this.actualIntensityLevel || this.targetIntensityLevel;
    return intensity >= 7;
  }

  requiresEquipment(): boolean {
    return this.requiredEquipment && this.requiredEquipment.length > 0;
  }

  getVolumeScore(): number {
    // Simple volume calculation based on sets * reps
    return this.setsCompleted * this.totalRepsCompleted;
  }

  getIntensityScore(): number {
    const baseIntensity = this.actualIntensityLevel || this.targetIntensityLevel;
    const durationFactor = this.getEffectiveDuration() / 60; // Convert to hours
    return baseIntensity * durationFactor;
  }

  shouldRecommendRest(): boolean {
    // Recommend rest if workout was very difficult or energy dropped significantly
    const energyDrop =
      this.energyLevelBefore && this.energyLevelAfter
        ? this.energyLevelBefore - this.energyLevelAfter
        : 0;

    return (
      (this.difficultyRating && this.difficultyRating >= 4.5) ||
      energyDrop >= 2 ||
      (this.actualIntensityLevel && this.actualIntensityLevel >= 9)
    );
  }
}
