import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { FitnessPlanWorkout } from './fitness-plan-workout.entity';

export enum ExerciseType {
  COMPOUND = 'compound',
  ISOLATION = 'isolation',
  CARDIO = 'cardio',
  PLYOMETRIC = 'plyometric',
  ISOMETRIC = 'isometric',
  FLEXIBILITY = 'flexibility',
  BALANCE = 'balance',
  COORDINATION = 'coordination',
}

export enum ExerciseStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  MODIFIED = 'modified',
}

@Entity('fitness_plan_exercises')
@Index(['workoutId'])
@Index(['exerciseName'])
@Index(['exerciseType'])
@Index(['status'])
@Index(['sortOrder'])
export class FitnessPlanExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workout_id' })
  workoutId: string;

  @Column({ name: 'exercise_name', length: 255 })
  exerciseName: string;

  @Column({ name: 'exercise_description', type: 'text', nullable: true })
  exerciseDescription?: string;

  @Column({
    type: 'enum',
    enum: ExerciseType,
    name: 'exercise_type',
  })
  exerciseType: ExerciseType;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: ExerciseStatus,
    default: ExerciseStatus.PLANNED,
  })
  status: ExerciseStatus;

  // Sets, reps, and load
  @Column({ name: 'target_sets', type: 'integer' })
  targetSets: number;

  @Column({ name: 'completed_sets', type: 'integer', default: 0 })
  completedSets: number;

  @Column({ name: 'target_reps_per_set', type: 'integer', nullable: true })
  targetRepsPerSet?: number;

  @Column({ name: 'target_reps_range_min', type: 'integer', nullable: true })
  targetRepsRangeMin?: number;

  @Column({ name: 'target_reps_range_max', type: 'integer', nullable: true })
  targetRepsRangeMax?: number;

  @Column({ name: 'actual_reps_completed', type: 'json', nullable: true })
  actualRepsCompleted?: number[]; // Array of reps per set

  // Weight and resistance
  @Column({ name: 'target_weight_kg', type: 'decimal', precision: 8, scale: 2, nullable: true })
  targetWeightKg?: number;

  @Column({ name: 'actual_weights_kg', type: 'json', nullable: true })
  actualWeightsKg?: number[]; // Array of weights per set

  @Column({ name: 'resistance_band_level', nullable: true })
  resistanceBandLevel?: string;

  @Column({
    name: 'bodyweight_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bodyweightPercentage?: number;

  // Timing and rest
  @Column({ name: 'target_duration_seconds', type: 'integer', nullable: true })
  targetDurationSeconds?: number; // For time-based exercises

  @Column({ name: 'actual_duration_seconds', type: 'integer', nullable: true })
  actualDurationSeconds?: number;

  @Column({ name: 'rest_time_seconds', type: 'integer', default: 60 })
  restTimeSeconds: number;

  @Column({ name: 'tempo', nullable: true })
  tempo?: string; // e.g., "3-1-2-1" (eccentric-pause-concentric-pause)

  // Distance and cardio metrics
  @Column({
    name: 'target_distance_meters',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  targetDistanceMeters?: number;

  @Column({
    name: 'actual_distance_meters',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualDistanceMeters?: number;

  @Column({ name: 'target_pace_per_km', type: 'time', nullable: true })
  targetPacePerKm?: string;

  @Column({ name: 'actual_pace_per_km', type: 'time', nullable: true })
  actualPacePerKm?: string;

  // Intensity and effort
  @Column({ name: 'target_intensity_level', type: 'integer', default: 5 })
  targetIntensityLevel: number; // 1-10 scale

  @Column({ name: 'actual_intensity_level', type: 'integer', nullable: true })
  actualIntensityLevel?: number;

  @Column({ name: 'target_rpe', type: 'integer', nullable: true })
  targetRPE?: number; // Rate of Perceived Exertion (1-10)

  @Column({ name: 'actual_rpe', type: 'integer', nullable: true })
  actualRPE?: number;

  // Equipment and setup
  @Column({ name: 'required_equipment', type: 'json', nullable: true })
  requiredEquipment?: string[];

  @Column({ name: 'equipment_weight_kg', type: 'decimal', precision: 8, scale: 2, nullable: true })
  equipmentWeightKg?: number;

  @Column({ name: 'setup_instructions', type: 'text', nullable: true })
  setupInstructions?: string;

  // Muscle groups and movement
  @Column({ name: 'primary_muscles', type: 'json', nullable: true })
  primaryMuscles?: string[];

  @Column({ name: 'secondary_muscles', type: 'json', nullable: true })
  secondaryMuscles?: string[];

  @Column({ name: 'movement_pattern', nullable: true })
  movementPattern?: string; // 'push', 'pull', 'squat', 'hinge', 'lunge', 'carry'

  // Safety and form
  @Column({ name: 'form_cues', type: 'json', nullable: true })
  formCues?: string[];

  @Column({ name: 'safety_notes', type: 'text', nullable: true })
  safetyNotes?: string;

  @Column({ name: 'common_mistakes', type: 'json', nullable: true })
  commonMistakes?: string[];

  @Column({ name: 'injury_risk_level', type: 'integer', default: 2 })
  injuryRiskLevel: number; // 1-5 scale

  // Progression and alternatives
  @Column({ name: 'progression_exercise', nullable: true })
  progressionExercise?: string;

  @Column({ name: 'regression_exercise', nullable: true })
  regressionExercise?: string;

  @Column({ name: 'alternative_exercises', type: 'json', nullable: true })
  alternativeExercises?: string[];

  @Column({ name: 'modification_options', type: 'json', nullable: true })
  modificationOptions?: string[];

  // Media and references
  @Column({ name: 'demonstration_video_url', nullable: true })
  demonstrationVideoUrl?: string;

  @Column({ name: 'instruction_images', type: 'json', nullable: true })
  instructionImages?: string[];

  @Column({ name: 'external_reference_url', nullable: true })
  externalReferenceUrl?: string;

  // Tracking and feedback
  @Column({ name: 'difficulty_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  difficultyRating?: number; // 1-5 scale from user

  @Column({ name: 'form_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  formRating?: number; // 1-5 scale from user

  @Column({ name: 'enjoyment_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  enjoymentRating?: number; // 1-5 scale from user

  @Column({ name: 'user_notes', type: 'text', nullable: true })
  userNotes?: string;

  @Column({ name: 'form_check_passed', nullable: true })
  formCheckPassed?: boolean;

  // Timing and execution
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'skipped_reason', nullable: true })
  skippedReason?: string;

  // Adaptations
  @Column({ name: 'was_modified', default: false })
  wasModified: boolean;

  @Column({ name: 'modification_reason', nullable: true })
  modificationReason?: string;

  @Column({ name: 'original_parameters', type: 'json', nullable: true })
  originalParameters?: any;

  // Relationships
  @ManyToOne(() => FitnessPlanWorkout, (workout) => workout.exercises, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_id' })
  workout: FitnessPlanWorkout;

  // Helper methods
  isCompleted(): boolean {
    return this.status === ExerciseStatus.COMPLETED;
  }

  isSkipped(): boolean {
    return this.status === ExerciseStatus.SKIPPED;
  }

  getCompletionPercentage(): number {
    return this.targetSets > 0 ? (this.completedSets / this.targetSets) * 100 : 0;
  }

  getTotalRepsCompleted(): number {
    return this.actualRepsCompleted
      ? this.actualRepsCompleted.reduce((sum, reps) => sum + reps, 0)
      : 0;
  }

  getTotalWeightLifted(): number {
    if (!this.actualWeightsKg || !this.actualRepsCompleted) return 0;

    let totalWeight = 0;
    for (
      let i = 0;
      i < Math.min(this.actualWeightsKg.length, this.actualRepsCompleted.length);
      i++
    ) {
      totalWeight += this.actualWeightsKg[i] * this.actualRepsCompleted[i];
    }
    return totalWeight;
  }

  getAverageWeight(): number {
    if (!this.actualWeightsKg || this.actualWeightsKg.length === 0) return 0;
    const sum = this.actualWeightsKg.reduce((sum, weight) => sum + weight, 0);
    return sum / this.actualWeightsKg.length;
  }

  getAverageReps(): number {
    if (!this.actualRepsCompleted || this.actualRepsCompleted.length === 0) return 0;
    const sum = this.actualRepsCompleted.reduce((sum, reps) => sum + reps, 0);
    return sum / this.actualRepsCompleted.length;
  }

  start(): void {
    this.status = ExerciseStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  complete(
    repsPerSet: number[],
    weightsPerSet?: number[],
    actualDuration?: number,
    actualIntensity?: number,
    actualRPE?: number,
  ): void {
    this.status = ExerciseStatus.COMPLETED;
    this.completedAt = new Date();
    this.completedSets = repsPerSet.length;
    this.actualRepsCompleted = repsPerSet;

    if (weightsPerSet) this.actualWeightsKg = weightsPerSet;
    if (actualDuration) this.actualDurationSeconds = actualDuration;
    if (actualIntensity) this.actualIntensityLevel = actualIntensity;
    if (actualRPE) this.actualRPE = actualRPE;
  }

  skip(reason?: string): void {
    this.status = ExerciseStatus.SKIPPED;
    this.completedAt = new Date();
    if (reason) this.skippedReason = reason;
  }

  modify(reason: string, originalParams?: any): void {
    this.wasModified = true;
    this.modificationReason = reason;
    this.status = ExerciseStatus.MODIFIED;
    if (originalParams) this.originalParameters = originalParams;
  }

  addSet(reps: number, weight?: number): void {
    if (!this.actualRepsCompleted) this.actualRepsCompleted = [];
    if (!this.actualWeightsKg) this.actualWeightsKg = [];

    this.actualRepsCompleted.push(reps);
    if (weight) this.actualWeightsKg.push(weight);
    this.completedSets = this.actualRepsCompleted.length;
  }

  isWithinTargetReps(reps: number): boolean {
    if (this.targetRepsPerSet) {
      return Math.abs(reps - this.targetRepsPerSet) <= 2;
    }

    if (this.targetRepsRangeMin && this.targetRepsRangeMax) {
      return reps >= this.targetRepsRangeMin && reps <= this.targetRepsRangeMax;
    }

    return true;
  }

  isWithinTargetWeight(weight: number): boolean {
    if (!this.targetWeightKg) return true;
    const tolerance = this.targetWeightKg * 0.1; // 10% tolerance
    return Math.abs(weight - this.targetWeightKg) <= tolerance;
  }

  needsEquipment(): boolean {
    return this.requiredEquipment && this.requiredEquipment.length > 0;
  }

  isBodyweightExercise(): boolean {
    return !this.needsEquipment() && !this.targetWeightKg;
  }

  isTimeBasedExercise(): boolean {
    return this.targetDurationSeconds !== null && this.targetDurationSeconds !== undefined;
  }

  isDistanceBasedExercise(): boolean {
    return this.targetDistanceMeters !== null && this.targetDistanceMeters !== undefined;
  }

  getExerciseVolume(): number {
    // Volume = sets × reps × weight
    const totalReps = this.getTotalRepsCompleted();
    const avgWeight = this.getAverageWeight() || this.bodyweightPercentage || 1;
    return this.completedSets * totalReps * avgWeight;
  }

  getIntensityLoad(): number {
    // Intensity Load = Volume × RPE
    const volume = this.getExerciseVolume();
    const rpe = this.actualRPE || this.targetRPE || 5;
    return volume * rpe;
  }

  shouldProgressWeight(): boolean {
    // Suggest weight progression if user completed all target reps easily
    if (!this.actualRepsCompleted || !this.targetRepsPerSet) return false;

    const allSetsCompletedTarget = this.actualRepsCompleted.every(
      (reps) => reps >= this.targetRepsPerSet,
    );

    const lowRPE = this.actualRPE && this.actualRPE <= 6;
    const lowDifficulty = this.difficultyRating && this.difficultyRating <= 2;

    return allSetsCompletedTarget && (lowRPE || lowDifficulty);
  }

  shouldReduceWeight(): boolean {
    // Suggest weight reduction if user struggled with form or couldn't complete sets
    const poorForm = this.formRating && this.formRating <= 2;
    const highRPE = this.actualRPE && this.actualRPE >= 9;
    const failedSets = this.completedSets < this.targetSets;

    return poorForm || highRPE || failedSets;
  }

  getProgressionSuggestion(): {
    action: 'increase' | 'decrease' | 'maintain';
    parameter: 'weight' | 'reps' | 'sets';
    amount: number;
  } | null {
    if (this.shouldProgressWeight()) {
      return {
        action: 'increase',
        parameter: 'weight',
        amount: this.targetWeightKg ? this.targetWeightKg * 0.05 : 2.5, // 5% or 2.5kg
      };
    }

    if (this.shouldReduceWeight()) {
      return {
        action: 'decrease',
        parameter: 'weight',
        amount: this.targetWeightKg ? this.targetWeightKg * 0.1 : 2.5, // 10% or 2.5kg
      };
    }

    return null;
  }
}
