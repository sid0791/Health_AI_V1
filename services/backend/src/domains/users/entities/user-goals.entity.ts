import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum GoalType {
  WEIGHT_LOSS = 'weight_loss',
  WEIGHT_GAIN = 'weight_gain',
  WEIGHT_MAINTENANCE = 'weight_maintenance',
  MUSCLE_GAIN = 'muscle_gain',
  FAT_LOSS = 'fat_loss',
  ATHLETIC_PERFORMANCE = 'athletic_performance',
  GENERAL_HEALTH = 'general_health',
  DISEASE_MANAGEMENT = 'disease_management',
  PREGNANCY_NUTRITION = 'pregnancy_nutrition',
  CHILD_NUTRITION = 'child_nutrition',
}

export enum GoalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum GoalStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum IntensityLevel {
  SLOW = 'slow', // 0.25-0.5 kg/week
  MODERATE = 'moderate', // 0.5-0.75 kg/week
  AGGRESSIVE = 'aggressive', // 0.75-1 kg/week
}

@Entity('user_goals')
export class UserGoals {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Primary Goal
  @Column({
    type: 'enum',
    enum: GoalType,
    name: 'primary_goal',
  })
  primaryGoal: GoalType;

  @Column({
    type: 'enum',
    enum: GoalPriority,
    name: 'goal_priority',
    default: GoalPriority.MEDIUM,
  })
  goalPriority: GoalPriority;

  @Column({
    type: 'enum',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  // Weight Goals
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'target_weight',
    nullable: true,
  })
  targetWeight?: number; // in kg

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'starting_weight',
    nullable: true,
  })
  startingWeight?: number; // in kg

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    name: 'weekly_weight_change_target',
    nullable: true,
  })
  weeklyWeightChangeTarget?: number; // in kg/week

  @Column({
    type: 'enum',
    enum: IntensityLevel,
    default: IntensityLevel.MODERATE,
  })
  intensity: IntensityLevel;

  // Body Composition Goals
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'target_body_fat_percentage',
    nullable: true,
  })
  targetBodyFatPercentage?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'target_muscle_mass',
    nullable: true,
  })
  targetMuscleMass?: number; // in kg

  // Timeline
  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate?: Date;

  @Column({ name: 'estimated_completion_date', type: 'date', nullable: true })
  estimatedCompletionDate?: Date;

  // Daily Targets
  @Column({ name: 'daily_calorie_target', type: 'int', nullable: true })
  dailyCalorieTarget?: number;

  @Column({ name: 'daily_protein_target', type: 'int', nullable: true })
  dailyProteinTarget?: number; // in grams

  @Column({ name: 'daily_carb_target', type: 'int', nullable: true })
  dailyCarbTarget?: number; // in grams

  @Column({ name: 'daily_fat_target', type: 'int', nullable: true })
  dailyFatTarget?: number; // in grams

  @Column({ name: 'daily_fiber_target', type: 'int', nullable: true })
  dailyFiberTarget?: number; // in grams

  @Column({ name: 'daily_water_target', type: 'int', nullable: true })
  dailyWaterTarget?: number; // in ml

  // Activity Goals
  @Column({ name: 'weekly_exercise_target', type: 'int', nullable: true })
  weeklyExerciseTarget?: number; // in minutes

  @Column({ name: 'daily_steps_target', type: 'int', nullable: true })
  dailyStepsTarget?: number;

  @Column({ name: 'weekly_strength_sessions', type: 'int', nullable: true })
  weeklyStrengthSessions?: number;

  @Column({ name: 'weekly_cardio_sessions', type: 'int', nullable: true })
  weeklyCardioSessions?: number;

  // Health-specific Goals
  @Column({ name: 'target_blood_sugar_range_min', type: 'int', nullable: true })
  targetBloodSugarRangeMin?: number; // mg/dL

  @Column({ name: 'target_blood_sugar_range_max', type: 'int', nullable: true })
  targetBloodSugarRangeMax?: number; // mg/dL

  @Column({ name: 'target_blood_pressure_systolic', type: 'int', nullable: true })
  targetBloodPressureSystolic?: number; // mmHg

  @Column({ name: 'target_blood_pressure_diastolic', type: 'int', nullable: true })
  targetBloodPressureDiastolic?: number; // mmHg

  // Progress Tracking
  @Column({ name: 'check_in_frequency', type: 'int', default: 7 })
  checkInFrequency: number; // in days

  @Column({ name: 'last_check_in', type: 'timestamp', nullable: true })
  lastCheckIn?: Date;

  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  // Motivation and Preferences
  @Column({ type: 'text', nullable: true })
  motivation?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'reminder_enabled', default: true })
  reminderEnabled: boolean;

  @Column({ name: 'reminder_time', type: 'time', nullable: true })
  reminderTime?: string; // HH:MM format

  // Data classification
  @Column({ name: 'health_classification', default: 'HEALTH' })
  healthClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.goals)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isActive(): boolean {
    return this.status === GoalStatus.ACTIVE;
  }

  isCompleted(): boolean {
    return this.status === GoalStatus.COMPLETED || this.completionPercentage >= 100;
  }

  getDaysToTarget(): number | null {
    if (!this.targetDate) return null;
    const today = new Date();
    const target = new Date(this.targetDate);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceStart(): number {
    const today = new Date();
    const start = new Date(this.startDate);
    const diffTime = today.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  updateProgress(currentWeight?: number): void {
    if (!this.targetWeight || !this.startingWeight || !currentWeight) return;

    const totalWeightChange = Math.abs(this.targetWeight - this.startingWeight);
    const currentWeightChange = Math.abs(currentWeight - this.startingWeight);

    this.completionPercentage = Math.min((currentWeightChange / totalWeightChange) * 100, 100);

    if (this.completionPercentage >= 100) {
      this.status = GoalStatus.COMPLETED;
      this.completedAt = new Date();
    }
  }

  complete(): void {
    this.status = GoalStatus.COMPLETED;
    this.completedAt = new Date();
    this.completionPercentage = 100;
  }

  pause(): void {
    this.status = GoalStatus.PAUSED;
  }

  resume(): void {
    this.status = GoalStatus.ACTIVE;
  }

  cancel(): void {
    this.status = GoalStatus.CANCELLED;
  }
}
