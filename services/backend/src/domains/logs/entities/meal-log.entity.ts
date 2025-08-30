import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

export enum LoggingMethod {
  MANUAL = 'manual',
  PHOTO = 'photo',
  VOICE = 'voice',
  BARCODE = 'barcode',
}

export enum SatisfactionLevel {
  VERY_UNSATISFIED = 1,
  UNSATISFIED = 2,
  NEUTRAL = 3,
  SATISFIED = 4,
  VERY_SATISFIED = 5,
}

@Entity('meal_logs')
@Index(['userId', 'loggedAt'])
@Index(['mealType', 'loggedAt'])
export class MealLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'recipe_id', nullable: true })
  recipeId?: string;

  @ManyToOne(() => Recipe, { nullable: true })
  @JoinColumn({ name: 'recipe_id' })
  recipe?: Recipe;

  @Column({
    type: 'enum',
    enum: MealType,
    name: 'meal_type',
  })
  mealType: MealType;

  @Column({ name: 'food_name' })
  foodName: string;

  @Column({ name: 'food_description', type: 'text', nullable: true })
  foodDescription?: string;

  @Column({ name: 'hinglish_description', type: 'text', nullable: true })
  hinglishDescription?: string;

  @Column({ name: 'portion_size', type: 'decimal', precision: 8, scale: 2 })
  portionSize: number;

  @Column({ name: 'portion_unit', length: 50 })
  portionUnit: string;

  @Column({ name: 'calories_consumed', type: 'decimal', precision: 8, scale: 2, nullable: true })
  caloriesConsumed?: number;

  @Column({ name: 'protein_grams', type: 'decimal', precision: 6, scale: 2, nullable: true })
  proteinGrams?: number;

  @Column({ name: 'carbs_grams', type: 'decimal', precision: 6, scale: 2, nullable: true })
  carbsGrams?: number;

  @Column({ name: 'fat_grams', type: 'decimal', precision: 6, scale: 2, nullable: true })
  fatGrams?: number;

  @Column({ name: 'fiber_grams', type: 'decimal', precision: 6, scale: 2, nullable: true })
  fiberGrams?: number;

  @Column({ name: 'sugar_grams', type: 'decimal', precision: 6, scale: 2, nullable: true })
  sugarGrams?: number;

  @Column({ name: 'sodium_mg', type: 'decimal', precision: 8, scale: 2, nullable: true })
  sodiumMg?: number;

  @Column({
    type: 'enum',
    enum: LoggingMethod,
    name: 'logging_method',
    default: LoggingMethod.MANUAL,
  })
  loggingMethod: LoggingMethod;

  @Column({
    type: 'enum',
    enum: SatisfactionLevel,
    name: 'satisfaction_level',
    nullable: true,
  })
  satisfactionLevel?: SatisfactionLevel;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string;

  @Column({ name: 'voice_recording_url', type: 'text', nullable: true })
  voiceRecordingUrl?: string;

  @Column({ name: 'logged_at', type: 'timestamptz' })
  loggedAt: Date;

  @Column({ name: 'location', type: 'text', nullable: true })
  location?: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'mood_before_meal', length: 100, nullable: true })
  moodBeforeMeal?: string;

  @Column({ name: 'mood_after_meal', length: 100, nullable: true })
  moodAfterMeal?: string;

  @Column({ name: 'eating_duration_minutes', type: 'integer', nullable: true })
  eatingDurationMinutes?: number;

  @Column({ name: 'eating_speed', length: 50, nullable: true })
  eatingSpeed?: string; // slow, normal, fast

  @Column({ name: 'social_context', length: 100, nullable: true })
  socialContext?: string; // alone, family, friends, work

  @Column({ name: 'hunger_level_before', type: 'integer', nullable: true })
  hungerLevelBefore?: number; // 1-10 scale

  @Column({ name: 'fullness_level_after', type: 'integer', nullable: true })
  fullnessLevelAfter?: number; // 1-10 scale

  @Column({ name: 'ai_confidence_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  aiConfidenceScore?: number;

  @Column({ name: 'verified_by_user', type: 'boolean', default: false })
  verifiedByUser: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
