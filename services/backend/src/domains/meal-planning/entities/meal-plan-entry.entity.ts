import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MealPlan } from './meal-plan.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
  PRE_WORKOUT = 'pre_workout',
  POST_WORKOUT = 'post_workout',
  BEVERAGE = 'beverage',
}

export enum MealEntryStatus {
  PLANNED = 'planned',
  PREPARED = 'prepared',
  CONSUMED = 'consumed',
  SKIPPED = 'skipped',
  SUBSTITUTED = 'substituted',
}

@Entity('meal_plan_entries')
@Index(['mealPlanId'])
@Index(['recipeId'])
@Index(['dayNumber'])
@Index(['mealType'])
@Index(['plannedTime'])
export class MealPlanEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'meal_plan_id' })
  mealPlanId: string;

  @Column({ name: 'recipe_id', nullable: true })
  recipeId?: string;

  @Column({ name: 'day_number', type: 'integer' })
  dayNumber: number; // 1-7 for weekly plans

  @Column({
    type: 'enum',
    enum: MealType,
    name: 'meal_type',
  })
  mealType: MealType;

  @Column({ name: 'meal_name', length: 255 })
  mealName: string;

  @Column({ name: 'meal_description', type: 'text', nullable: true })
  mealDescription?: string;

  @Column({ name: 'planned_time', type: 'time', nullable: true })
  plannedTime?: string;

  @Column({ name: 'portion_size', type: 'decimal', precision: 8, scale: 2, default: 1.0 })
  portionSize: number;

  @Column({ name: 'serving_size_grams', type: 'decimal', precision: 10, scale: 3, nullable: true })
  servingSizeGrams?: number;

  // Nutritional information
  @Column({ name: 'calories', type: 'decimal', precision: 8, scale: 2 })
  calories: number;

  @Column({ name: 'protein_grams', type: 'decimal', precision: 8, scale: 2 })
  proteinGrams: number;

  @Column({ name: 'carbs_grams', type: 'decimal', precision: 8, scale: 2 })
  carbsGrams: number;

  @Column({ name: 'fat_grams', type: 'decimal', precision: 8, scale: 2 })
  fatGrams: number;

  @Column({ name: 'fiber_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  fiberGrams?: number;

  @Column({ name: 'sugar_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  sugarGrams?: number;

  @Column({ name: 'sodium_mg', type: 'decimal', precision: 10, scale: 3, nullable: true })
  sodiumMg?: number;

  // Cost and preparation
  @Column({ name: 'estimated_cost_inr', type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedCostInr?: number;

  @Column({ name: 'prep_time_minutes', type: 'integer', nullable: true })
  prepTimeMinutes?: number;

  @Column({ name: 'cook_time_minutes', type: 'integer', nullable: true })
  cookTimeMinutes?: number;

  // Customization and substitution
  @Column({ name: 'is_customized', default: false })
  isCustomized: boolean;

  @Column({ name: 'customization_notes', type: 'text', nullable: true })
  customizationNotes?: string;

  @Column({ name: 'substitution_reason', nullable: true })
  substitutionReason?: string;

  @Column({ name: 'alternative_options', type: 'json', nullable: true })
  alternativeOptions?: string[];

  // Status and tracking
  @Column({
    type: 'enum',
    enum: MealEntryStatus,
    default: MealEntryStatus.PLANNED,
  })
  status: MealEntryStatus;

  @Column({ name: 'completion_timestamp', type: 'timestamp', nullable: true })
  completionTimestamp?: Date;

  @Column({ name: 'user_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  userRating?: number;

  @Column({ name: 'user_feedback', type: 'text', nullable: true })
  userFeedback?: string;

  // Shopping and grocery
  @Column({ name: 'ingredients_available', default: false })
  ingredientsAvailable: boolean;

  @Column({ name: 'added_to_shopping_list', default: false })
  addedToShoppingList: boolean;

  @Column({ name: 'grocery_items', type: 'json', nullable: true })
  groceryItems?: any[];

  // Adaptation and AI
  @Column({ name: 'generated_by_ai', default: true })
  generatedByAI: boolean;

  @Column({ name: 'adaptation_level', type: 'integer', default: 0 })
  adaptationLevel: number;

  @Column({ name: 'adaptation_reasons', type: 'json', nullable: true })
  adaptationReasons?: string[];

  // Sort order within the day
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => MealPlan, (mealPlan) => mealPlan.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meal_plan_id' })
  mealPlan: MealPlan;

  @ManyToOne(() => Recipe, { nullable: true })
  @JoinColumn({ name: 'recipe_id' })
  recipe?: Recipe;

  // Helper methods
  getTotalPrepTime(): number {
    return (this.prepTimeMinutes || 0) + (this.cookTimeMinutes || 0);
  }

  isCompleted(): boolean {
    return this.status === MealEntryStatus.CONSUMED;
  }

  isSkipped(): boolean {
    return this.status === MealEntryStatus.SKIPPED;
  }

  getCaloriesPerGram(): number {
    return this.servingSizeGrams ? this.calories / this.servingSizeGrams : 0;
  }

  getMacroDistribution(): { protein: number; carbs: number; fat: number } {
    const totalCalories = this.calories;
    if (totalCalories === 0) return { protein: 0, carbs: 0, fat: 0 };

    return {
      protein: (this.proteinGrams * 4) / totalCalories,
      carbs: (this.carbsGrams * 4) / totalCalories,
      fat: (this.fatGrams * 9) / totalCalories,
    };
  }

  markAsCompleted(rating?: number, feedback?: string): void {
    this.status = MealEntryStatus.CONSUMED;
    this.completionTimestamp = new Date();
    if (rating) this.userRating = rating;
    if (feedback) this.userFeedback = feedback;
  }

  markAsSkipped(reason?: string): void {
    this.status = MealEntryStatus.SKIPPED;
    this.completionTimestamp = new Date();
    if (reason) this.userFeedback = reason;
  }

  substitute(newRecipeId: string, reason?: string): void {
    this.recipeId = newRecipeId;
    this.status = MealEntryStatus.SUBSTITUTED;
    this.substitutionReason = reason;
    this.isCustomized = true;
  }

  updatePortionSize(newPortionSize: number): void {
    const multiplier = newPortionSize / this.portionSize;

    this.portionSize = newPortionSize;
    this.calories *= multiplier;
    this.proteinGrams *= multiplier;
    this.carbsGrams *= multiplier;
    this.fatGrams *= multiplier;

    if (this.fiberGrams) this.fiberGrams *= multiplier;
    if (this.sugarGrams) this.sugarGrams *= multiplier;
    if (this.sodiumMg) this.sodiumMg *= multiplier;
    if (this.estimatedCostInr) this.estimatedCostInr *= multiplier;
    if (this.servingSizeGrams) this.servingSizeGrams *= multiplier;

    this.isCustomized = true;
  }

  isMainMeal(): boolean {
    return [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].includes(this.mealType);
  }

  isSnack(): boolean {
    return this.mealType === MealType.SNACK;
  }

  isWorkoutRelated(): boolean {
    return [MealType.PRE_WORKOUT, MealType.POST_WORKOUT].includes(this.mealType);
  }

  getDayOfWeek(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[this.dayNumber - 1] || 'Unknown';
  }
}
