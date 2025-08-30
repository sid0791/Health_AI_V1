import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { RecipeNutrition } from './recipe-nutrition.entity';

export enum DietType {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  NON_VEGETARIAN = 'non_vegetarian',
  JAIN = 'jain',
  HALAL = 'halal',
  KETO = 'keto',
  PALEO = 'paleo',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
  DESSERT = 'dessert',
}

@Entity('recipes')
@Index(['cuisine'])
@Index(['dietType'])
@Index(['mealType'])
@Index(['difficultyLevel'])
@Index(['prepTimeMinutes'])
@Index(['cookTimeMinutes'])
@Index(['isActive'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100 })
  cuisine: string;

  @Column({
    type: 'enum',
    enum: DietType,
    array: true,
    default: [DietType.VEGETARIAN],
  })
  dietType: DietType[];

  @Column({
    type: 'enum',
    enum: MealType,
    array: true,
  })
  mealType: MealType[];

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.EASY,
  })
  difficultyLevel: DifficultyLevel;

  @Column({ name: 'prep_time_minutes', type: 'integer' })
  prepTimeMinutes: number;

  @Column({ name: 'cook_time_minutes', type: 'integer' })
  cookTimeMinutes: number;

  @Column({ name: 'total_time_minutes', type: 'integer' })
  totalTimeMinutes: number;

  @Column({ name: 'servings_count', type: 'integer', default: 1 })
  servingsCount: number;

  @Column({ name: 'calories_per_serving', type: 'decimal', precision: 8, scale: 2, nullable: true })
  caloriesPerServing?: number;

  @Column({ name: 'gi_value', type: 'decimal', precision: 5, scale: 2, nullable: true })
  giValue?: number;

  @Column({ name: 'gl_value', type: 'decimal', precision: 5, scale: 2, nullable: true })
  glValue?: number;

  // Health and dietary flags
  @Column({ name: 'is_diabetic_friendly', default: false })
  isDiabeticFriendly: boolean;

  @Column({ name: 'is_hypertension_friendly', default: false })
  isHypertensionFriendly: boolean;

  @Column({ name: 'is_pcos_friendly', default: false })
  isPcosFriendly: boolean;

  @Column({ name: 'is_fatty_liver_friendly', default: false })
  isFattyLiverFriendly: boolean;

  @Column({ name: 'is_high_protein', default: false })
  isHighProtein: boolean;

  @Column({ name: 'is_low_calorie', default: false })
  isLowCalorie: boolean;

  @Column({ name: 'is_gluten_free', default: false })
  isGlutenFree: boolean;

  @Column({ name: 'is_dairy_free', default: false })
  isDairyFree: boolean;

  // Recipe metadata
  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  allergens?: string[];

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @Column({ name: 'source_url', nullable: true })
  sourceUrl?: string;

  @Column({ name: 'source_attribution', nullable: true })
  sourceAttribution?: string;

  @Column({ name: 'recipe_yield', nullable: true })
  recipeYield?: string;

  @Column({ name: 'equipment_needed', type: 'json', nullable: true })
  equipmentNeeded?: string[];

  // Content moderation and quality
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'quality_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  qualityScore?: number;

  @Column({ name: 'popularity_score', type: 'integer', default: 0 })
  popularityScore: number;

  // Data provenance
  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'data_source', default: 'internal' })
  dataSource: string;

  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe, {
    cascade: true,
  })
  ingredients: RecipeIngredient[];

  @OneToMany(() => RecipeStep, (step) => step.recipe, { cascade: true })
  steps: RecipeStep[];

  @OneToMany(() => RecipeNutrition, (nutrition) => nutrition.recipe, {
    cascade: true,
  })
  nutrition: RecipeNutrition[];

  // Methods
  getTotalTimeMinutes(): number {
    return this.prepTimeMinutes + this.cookTimeMinutes;
  }

  isHealthConditionFriendly(condition: string): boolean {
    switch (condition.toLowerCase()) {
      case 'diabetes':
        return this.isDiabeticFriendly;
      case 'hypertension':
        return this.isHypertensionFriendly;
      case 'pcos':
        return this.isPcosFriendly;
      case 'fatty_liver':
        return this.isFattyLiverFriendly;
      default:
        return false;
    }
  }

  isDietTypeCompatible(dietType: DietType): boolean {
    return this.dietType.includes(dietType);
  }

  hasAllergen(allergen: string): boolean {
    return this.allergens?.includes(allergen.toLowerCase()) || false;
  }
}
