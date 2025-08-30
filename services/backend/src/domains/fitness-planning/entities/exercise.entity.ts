import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ExerciseCategory {
  RESISTANCE = 'resistance',
  CALISTHENICS = 'calisthenics',
  YOGA = 'yoga',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  BALANCE = 'balance',
  CORE = 'core',
  FUNCTIONAL = 'functional',
  REHABILITATION = 'rehabilitation',
  WARM_UP = 'warm_up',
  COOL_DOWN = 'cool_down',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum EquipmentType {
  NONE = 'none',
  BODYWEIGHT = 'bodyweight',
  DUMBBELLS = 'dumbbells',
  BARBELL = 'barbell',
  RESISTANCE_BANDS = 'resistance_bands',
  KETTLEBELL = 'kettlebell',
  PULL_UP_BAR = 'pull_up_bar',
  YOGA_MAT = 'yoga_mat',
  MEDICINE_BALL = 'medicine_ball',
  FOAM_ROLLER = 'foam_roller',
  STABILITY_BALL = 'stability_ball',
  SUSPENSION_TRAINER = 'suspension_trainer',
  CABLE_MACHINE = 'cable_machine',
  BENCH = 'bench',
  BOX = 'box',
  STEP = 'step',
}

export enum MuscleGroup {
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  FOREARMS = 'forearms',
  CORE = 'core',
  QUADRICEPS = 'quadriceps',
  HAMSTRINGS = 'hamstrings',
  GLUTES = 'glutes',
  CALVES = 'calves',
  FULL_BODY = 'full_body',
  CARDIO = 'cardio',
}

@Entity('exercises')
@Index(['name'])
@Index(['category'])
@Index(['difficultyLevel'])
@Index(['primaryMuscleGroup'])
@Index(['isActive'])
@Index(['equipment'])
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @Column({
    type: 'enum',
    enum: ExerciseCategory,
  })
  category: ExerciseCategory;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    name: 'difficulty_level',
  })
  difficultyLevel: DifficultyLevel;

  @Column({
    type: 'enum',
    enum: MuscleGroup,
    name: 'primary_muscle_group',
  })
  primaryMuscleGroup: MuscleGroup;

  @Column({
    type: 'simple-array',
    name: 'secondary_muscle_groups',
    nullable: true,
  })
  secondaryMuscleGroups?: MuscleGroup[];

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  equipment?: EquipmentType[];

  // Safety and health information
  @Column({ type: 'simple-array', nullable: true })
  contraindications?: string[];

  @Column({ type: 'simple-array', name: 'health_conditions_to_avoid', nullable: true })
  healthConditionsToAvoid?: string[];

  @Column({ type: 'simple-array', name: 'injury_warnings', nullable: true })
  injuryWarnings?: string[];

  @Column({ type: 'text', name: 'safety_notes', nullable: true })
  safetyNotes?: string;

  @Column({ type: 'simple-array', name: 'form_cues', nullable: true })
  formCues?: string[];

  // Media and references
  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'simple-array', name: 'image_urls', nullable: true })
  imageUrls?: string[];

  @Column({ name: 'demo_gif_url', nullable: true })
  demoGifUrl?: string;

  // Exercise specifications
  @Column({ name: 'default_sets', type: 'integer', nullable: true })
  defaultSets?: number;

  @Column({ name: 'default_reps_min', type: 'integer', nullable: true })
  defaultRepsMin?: number;

  @Column({ name: 'default_reps_max', type: 'integer', nullable: true })
  defaultRepsMax?: number;

  @Column({ name: 'default_duration_seconds', type: 'integer', nullable: true })
  defaultDurationSeconds?: number;

  @Column({ name: 'default_rest_seconds', type: 'integer', nullable: true })
  defaultRestSeconds?: number;

  // Progression and variations
  @Column({ type: 'simple-array', name: 'progression_exercises', nullable: true })
  progressionExercises?: string[]; // IDs of harder variations

  @Column({ type: 'simple-array', name: 'regression_exercises', nullable: true })
  regressionExercises?: string[]; // IDs of easier variations

  @Column({ type: 'simple-array', name: 'alternative_exercises', nullable: true })
  alternativeExercises?: string[]; // IDs of similar exercises

  @Column({ type: 'simple-array', name: 'substitute_exercises', nullable: true })
  substituteExercises?: string[]; // IDs of exercises that work same muscles

  // Metabolic information
  @Column({ name: 'calories_per_minute', type: 'decimal', precision: 5, scale: 2, nullable: true })
  caloriesPerMinute?: number;

  @Column({ name: 'met_value', type: 'decimal', precision: 4, scale: 2, nullable: true })
  metValue?: number; // Metabolic equivalent of task

  // Tags and categorization
  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'simple-array', name: 'workout_types', nullable: true })
  workoutTypes?: string[]; // 'strength', 'hiit', 'endurance', etc.

  @Column({ name: 'is_compound', default: false })
  isCompound: boolean;

  @Column({ name: 'is_unilateral', default: false })
  isUnilateral: boolean; // Single-sided exercise

  @Column({ name: 'is_bodyweight', default: false })
  isBodyweight: boolean;

  @Column({ name: 'is_cardio', default: false })
  isCardio: boolean;

  // Status and approval
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string; // User ID or 'system'

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string; // Admin/trainer user ID

  @Column({ name: 'approval_date', type: 'timestamp', nullable: true })
  approvalDate?: Date;

  // Analytics
  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  averageRating?: number;

  @Column({ name: 'total_ratings', type: 'integer', default: 0 })
  totalRatings: number;

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isAvailableForEquipment(availableEquipment: EquipmentType[]): boolean {
    if (!this.equipment || this.equipment.length === 0) {
      return true; // No equipment required
    }
    return this.equipment.every(eq => availableEquipment.includes(eq));
  }

  isSafeForConditions(healthConditions: string[]): boolean {
    if (!this.healthConditionsToAvoid || this.healthConditionsToAvoid.length === 0) {
      return true; // No specific conditions to avoid
    }
    return !this.healthConditionsToAvoid.some(condition =>
      healthConditions.some(userCondition =>
        userCondition.toLowerCase().includes(condition.toLowerCase())
      )
    );
  }

  isSuitableForLevel(userLevel: DifficultyLevel): boolean {
    const levelOrder = {
      [DifficultyLevel.BEGINNER]: 1,
      [DifficultyLevel.INTERMEDIATE]: 2,
      [DifficultyLevel.ADVANCED]: 3,
      [DifficultyLevel.EXPERT]: 4,
    };
    return levelOrder[this.difficultyLevel] <= levelOrder[userLevel];
  }

  incrementUsage(): void {
    this.usageCount++;
  }

  updateRating(rating: number): void {
    const newTotal = this.totalRatings + 1;
    const currentSum = this.averageRating ? this.averageRating * this.totalRatings : 0;
    this.averageRating = (currentSum + rating) / newTotal;
    this.totalRatings = newTotal;
  }

  approve(approvedBy: string): void {
    this.isApproved = true;
    this.approvedBy = approvedBy;
    this.approvalDate = new Date();
  }

  getEstimatedCaloriesBurn(durationMinutes: number, userWeightKg = 70): number {
    if (!this.metValue) return 0;
    // Formula: METs × weight (kg) × time (hours)
    return this.metValue * userWeightKg * (durationMinutes / 60);
  }

  getRecommendedSets(userLevel: DifficultyLevel): number {
    if (!this.defaultSets) return 3;
    
    const multiplier = {
      [DifficultyLevel.BEGINNER]: 0.7,
      [DifficultyLevel.INTERMEDIATE]: 1.0,
      [DifficultyLevel.ADVANCED]: 1.3,
      [DifficultyLevel.EXPERT]: 1.5,
    };
    
    return Math.round(this.defaultSets * multiplier[userLevel]);
  }

  getRecommendedReps(userLevel: DifficultyLevel): { min: number; max: number } {
    const baseMin = this.defaultRepsMin || 8;
    const baseMax = this.defaultRepsMax || 12;
    
    const adjustment = {
      [DifficultyLevel.BEGINNER]: { min: -2, max: -2 },
      [DifficultyLevel.INTERMEDIATE]: { min: 0, max: 0 },
      [DifficultyLevel.ADVANCED]: { min: 2, max: 3 },
      [DifficultyLevel.EXPERT]: { min: 3, max: 5 },
    };
    
    const adj = adjustment[userLevel];
    return {
      min: Math.max(1, baseMin + adj.min),
      max: Math.max(baseMin + adj.min + 1, baseMax + adj.max),
    };
  }
}