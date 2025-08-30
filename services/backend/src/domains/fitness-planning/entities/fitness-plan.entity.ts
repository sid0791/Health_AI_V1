import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FitnessPlanWeek } from './fitness-plan-week.entity';

export enum FitnessPlanType {
  WEIGHT_LOSS = 'weight_loss',
  MUSCLE_GAIN = 'muscle_gain',
  STRENGTH_BUILDING = 'strength_building',
  ENDURANCE_TRAINING = 'endurance_training',
  GENERAL_FITNESS = 'general_fitness',
  REHABILITATION = 'rehabilitation',
  SPORTS_SPECIFIC = 'sports_specific',
  FLEXIBILITY = 'flexibility',
  WEIGHT_MAINTENANCE = 'weight_maintenance',
}

export enum FitnessPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('fitness_plans')
@Index(['userId'])
@Index(['planType'])
@Index(['status'])
@Index(['experienceLevel'])
@Index(['startDate'])
@Index(['endDate'])
export class FitnessPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'plan_name', length: 255 })
  planName: string;

  @Column({ name: 'plan_description', type: 'text', nullable: true })
  planDescription?: string;

  @Column({
    type: 'enum',
    enum: FitnessPlanType,
    name: 'plan_type',
  })
  planType: FitnessPlanType;

  @Column({
    type: 'enum',
    enum: FitnessPlanStatus,
    default: FitnessPlanStatus.DRAFT,
  })
  status: FitnessPlanStatus;

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    name: 'experience_level',
    default: ExperienceLevel.BEGINNER,
  })
  experienceLevel: ExperienceLevel;

  // Duration and scheduling
  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'duration_weeks', type: 'integer' })
  durationWeeks: number;

  @Column({ name: 'workouts_per_week', type: 'integer', default: 3 })
  workoutsPerWeek: number;

  @Column({ name: 'rest_days_per_week', type: 'integer', default: 1 })
  restDaysPerWeek: number;

  // Goals and targets
  @Column({ name: 'target_weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  targetWeightKg?: number;

  @Column({
    name: 'target_body_fat_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetBodyFatPercentage?: number;

  @Column({
    name: 'target_muscle_gain_kg',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetMuscleGainKg?: number;

  @Column({
    name: 'target_strength_increase_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetStrengthIncreasePercentage?: number;

  @Column({ name: 'weekly_calorie_burn_target', type: 'integer', nullable: true })
  weeklyCalorieBurnTarget?: number;

  // Equipment and constraints
  @Column({ name: 'available_equipment', type: 'json', nullable: true })
  availableEquipment?: string[];

  @Column({ name: 'workout_location', default: 'home' })
  workoutLocation: string; // 'home', 'gym', 'outdoor', 'mixed'

  @Column({ name: 'max_workout_duration_minutes', type: 'integer', default: 60 })
  maxWorkoutDurationMinutes: number;

  @Column({ name: 'preferred_workout_times', type: 'json', nullable: true })
  preferredWorkoutTimes?: string[];

  // Health and safety
  @Column({ name: 'health_conditions', type: 'json', nullable: true })
  healthConditions?: string[];

  @Column({ name: 'physical_limitations', type: 'json', nullable: true })
  physicalLimitations?: string[];

  @Column({ name: 'injury_history', type: 'json', nullable: true })
  injuryHistory?: string[];

  @Column({ name: 'exercise_restrictions', type: 'json', nullable: true })
  exerciseRestrictions?: string[];

  // Preferences
  @Column({ name: 'preferred_exercise_types', type: 'json', nullable: true })
  preferredExerciseTypes?: string[];

  @Column({ name: 'disliked_exercises', type: 'json', nullable: true })
  dislikedExercises?: string[];

  @Column({ name: 'focus_areas', type: 'json', nullable: true })
  focusAreas?: string[]; // ['chest', 'legs', 'core', etc.]

  @Column({ name: 'workout_intensity_preference', default: 'moderate' })
  workoutIntensityPreference: string; // 'low', 'moderate', 'high', 'varied'

  // AI generation metadata
  @Column({ name: 'generated_by_ai', default: true })
  generatedByAI: boolean;

  @Column({ name: 'ai_model_version', nullable: true })
  aiModelVersion?: string;

  @Column({ name: 'generation_parameters', type: 'json', nullable: true })
  generationParameters?: any;

  // Progress tracking
  @Column({ name: 'adherence_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  adherenceScore: number; // 0-100%

  @Column({ name: 'satisfaction_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  satisfactionRating?: number; // 1-5 scale

  @Column({ name: 'effectiveness_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  effectivenessScore: number; // 0-100%

  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({ name: 'total_workouts_completed', type: 'integer', default: 0 })
  totalWorkoutsCompleted: number;

  @Column({ name: 'total_calories_burned', type: 'integer', default: 0 })
  totalCaloriesBurned: number;

  @Column({ name: 'total_workout_time_minutes', type: 'integer', default: 0 })
  totalWorkoutTimeMinutes: number;

  // Adaptation and progression
  @Column({ name: 'progressive_overload_enabled', default: true })
  progressiveOverloadEnabled: boolean;

  @Column({ name: 'auto_progression_rate', type: 'decimal', precision: 3, scale: 2, default: 1.05 })
  autoProgressionRate: number; // 1.05 = 5% increase

  @Column({ name: 'deload_week_frequency', type: 'integer', default: 4 })
  deloadWeekFrequency: number; // Every N weeks

  @Column({ name: 'adaptation_count', type: 'integer', default: 0 })
  adaptationCount: number;

  @Column({ name: 'last_adapted_at', type: 'timestamp', nullable: true })
  lastAdaptedAt?: Date;

  // Safety and form
  @Column({ name: 'form_check_reminders', default: true })
  formCheckReminders: boolean;

  @Column({ name: 'warm_up_required', default: true })
  warmUpRequired: boolean;

  @Column({ name: 'cool_down_required', default: true })
  coolDownRequired: boolean;

  @Column({ name: 'rest_period_enforcement', default: true })
  restPeriodEnforcement: boolean;

  // Template and sharing
  @Column({ name: 'is_template', default: false })
  isTemplate: boolean;

  @Column({ name: 'template_category', nullable: true })
  templateCategory?: string;

  @Column({ name: 'created_by_trainer', nullable: true })
  createdByTrainer?: string;

  @Column({ name: 'trainer_approved', default: false })
  trainerApproved: boolean;

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => FitnessPlanWeek, (week) => week.fitnessPlan, { cascade: true })
  weeks: FitnessPlanWeek[];

  // Helper methods
  isActive(): boolean {
    const now = new Date();
    return this.status === FitnessPlanStatus.ACTIVE && this.startDate <= now && this.endDate >= now;
  }

  getDaysRemaining(): number {
    const now = new Date();
    if (now > this.endDate) return 0;
    const diffTime = this.endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getWeeksRemaining(): number {
    return Math.ceil(this.getDaysRemaining() / 7);
  }

  getCurrentWeek(): number {
    const now = new Date();
    const diffTime = now.getTime() - this.startDate.getTime();
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(Math.floor(daysDiff / 7) + 1, this.durationWeeks);
  }

  getTotalPlannedWorkouts(): number {
    return this.durationWeeks * this.workoutsPerWeek;
  }

  getWorkoutCompletionRate(): number {
    const totalPlanned = this.getTotalPlannedWorkouts();
    return totalPlanned > 0 ? (this.totalWorkoutsCompleted / totalPlanned) * 100 : 0;
  }

  isDeloadWeek(weekNumber: number): boolean {
    return weekNumber % this.deloadWeekFrequency === 0;
  }

  activate(): void {
    this.status = FitnessPlanStatus.ACTIVE;
    this.activatedAt = new Date();
  }

  pause(): void {
    this.status = FitnessPlanStatus.PAUSED;
  }

  resume(): void {
    this.status = FitnessPlanStatus.ACTIVE;
  }

  complete(): void {
    this.status = FitnessPlanStatus.COMPLETED;
    this.completedAt = new Date();
    this.completionPercentage = 100;
  }

  cancel(): void {
    this.status = FitnessPlanStatus.CANCELLED;
  }

  updateProgress(workoutsCompleted: number, caloriesBurned: number, timeMinutes: number): void {
    this.totalWorkoutsCompleted += workoutsCompleted;
    this.totalCaloriesBurned += caloriesBurned;
    this.totalWorkoutTimeMinutes += timeMinutes;
    this.completionPercentage = this.getWorkoutCompletionRate();
  }

  addAdaptation(): void {
    this.adaptationCount++;
    this.lastAdaptedAt = new Date();
  }

  updateSatisfactionRating(rating: number): void {
    this.satisfactionRating = Math.max(1, Math.min(5, rating));
  }

  hasHealthCondition(condition: string): boolean {
    return this.healthConditions?.includes(condition.toLowerCase()) || false;
  }

  hasPhysicalLimitation(limitation: string): boolean {
    return this.physicalLimitations?.includes(limitation.toLowerCase()) || false;
  }

  hasEquipment(equipment: string): boolean {
    return this.availableEquipment?.includes(equipment.toLowerCase()) || false;
  }

  getIntensityLevel(): number {
    switch (this.workoutIntensityPreference) {
      case 'low':
        return 1;
      case 'moderate':
        return 2;
      case 'high':
        return 3;
      case 'varied':
        return 2.5;
      default:
        return 2;
    }
  }

  getAverageWorkoutDuration(): number {
    return this.totalWorkoutsCompleted > 0
      ? this.totalWorkoutTimeMinutes / this.totalWorkoutsCompleted
      : 0;
  }

  getEstimatedCaloriesBurnPerWorkout(): number {
    return this.totalWorkoutsCompleted > 0
      ? this.totalCaloriesBurned / this.totalWorkoutsCompleted
      : 0;
  }
}
