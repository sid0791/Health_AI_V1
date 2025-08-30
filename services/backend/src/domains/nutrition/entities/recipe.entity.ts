import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeInstruction } from './recipe-instruction.entity';
import { RecipeNutrition } from './recipe-nutrition.entity';

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
}

export enum CuisineType {
  NORTH_INDIAN = 'north_indian',
  SOUTH_INDIAN = 'south_indian',
  GUJARATI = 'gujarati',
  PUNJABI = 'punjabi',
  BENGALI = 'bengali',
  MAHARASHTRIAN = 'maharashtrian',
  RAJASTHANI = 'rajasthani',
  KERALA = 'kerala',
  TAMIL = 'tamil',
  TELUGU = 'telugu',
  KANNADA = 'kannada',
  CONTINENTAL = 'continental',
  CHINESE = 'chinese',
  ITALIAN = 'italian',
  MEXICAN = 'mexican',
  THAI = 'thai',
  JAPANESE = 'japanese',
  MEDITERRANEAN = 'mediterranean',
}

export enum DietaryRestriction {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  NON_VEGETARIAN = 'non_vegetarian',
  EGGETARIAN = 'eggetarian',
  JAIN = 'jain',
  HALAL = 'halal',
  KOSHER = 'kosher',
  PESCATARIAN = 'pescatarian',
  GLUTEN_FREE = 'gluten_free',
  DAIRY_FREE = 'dairy_free',
  LOW_CARB = 'low_carb',
  KETO = 'keto',
  PALEO = 'paleo',
}

@Entity('recipes')
@Index(['name', 'cuisine', 'mealType'])
@Index(['totalTimeMinutes', 'difficultyLevel'])
@Index(['isPublic', 'createdAt'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string; // User ID of recipe creator

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean; // Verified by nutritionist/admin

  // Recipe Classification
  @Column({
    type: 'enum',
    enum: MealType,
    name: 'meal_type',
  })
  mealType: MealType;

  @Column({
    type: 'enum',
    enum: CuisineType,
  })
  cuisine: CuisineType;

  @Column({
    type: 'enum',
    enum: DietaryRestriction,
    array: true,
    name: 'dietary_restrictions',
    default: [],
  })
  dietaryRestrictions: DietaryRestriction[];

  // Timing
  @Column({ name: 'prep_time_minutes', type: 'int' })
  prepTimeMinutes: number;

  @Column({ name: 'cook_time_minutes', type: 'int' })
  cookTimeMinutes: number;

  @Column({ name: 'total_time_minutes', type: 'int' })
  totalTimeMinutes: number;

  // Difficulty and Skill
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    name: 'difficulty_level',
    default: DifficultyLevel.INTERMEDIATE,
  })
  difficultyLevel: DifficultyLevel;

  @Column({ name: 'skill_level_required', type: 'int', default: 3 })
  skillLevelRequired: number; // 1-5 scale

  // Servings and Portions
  @Column({ type: 'int', default: 4 })
  servings: number;

  @Column({ name: 'serving_size_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  servingSizeGrams?: number;

  @Column({ name: 'portion_description', length: 100, nullable: true })
  portionDescription?: string; // "1 medium bowl", "2 pieces"

  // Cost and Budget
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'estimated_cost_inr',
    nullable: true,
  })
  estimatedCostInr?: number;

  @Column({ name: 'cost_per_serving_inr', type: 'decimal', precision: 8, scale: 2, nullable: true })
  costPerServingInr?: number;

  // Recipe Content
  @Column({ type: 'text', nullable: true })
  tips?: string;

  @Column({ type: 'text', nullable: true })
  variations?: string;

  @Column({ name: 'chef_notes', type: 'text', nullable: true })
  chefNotes?: string;

  // Media
  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: 'video_url', length: 500, nullable: true })
  videoUrl?: string;

  @Column({
    type: 'text',
    array: true,
    name: 'image_gallery',
    default: [],
  })
  imageGallery: string[];

  // Tags and Search
  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  tags: string[];

  @Column({
    type: 'text',
    array: true,
    name: 'search_keywords',
    default: [],
  })
  searchKeywords: string[];

  // Health and Nutrition Indicators
  @Column({ name: 'is_healthy', default: true })
  isHealthy: boolean;

  @Column({ name: 'glycemic_index', type: 'decimal', precision: 5, scale: 2, nullable: true })
  glycemicIndex?: number;

  @Column({ name: 'glycemic_load', type: 'decimal', precision: 5, scale: 2, nullable: true })
  glycemicLoad?: number;

  @Column({ name: 'inflammatory_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  inflammatoryScore?: number; // -10 to +10 scale

  // Allergen Information
  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  allergens: string[];

  @Column({ name: 'allergen_warnings', type: 'text', nullable: true })
  allergenWarnings?: string;

  // Recipe Performance Metrics
  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'made_count', type: 'int', default: 0 })
  madeCount: number; // How many times users made this recipe

  @Column({ name: 'rating_average', type: 'decimal', precision: 3, scale: 2, default: 0 })
  ratingAverage: number; // 0-5 scale

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  // Status and Availability
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_seasonal', default: false })
  isSeasonal: boolean;

  @Column({ name: 'season_months', type: 'int', array: true, default: [] })
  seasonMonths: number[]; // [1,2,3] for Jan, Feb, Mar

  // Data classification
  @Column({ name: 'content_classification', default: 'PUBLIC' })
  contentClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe, {
    cascade: true,
  })
  ingredients: RecipeIngredient[];

  @OneToMany(() => RecipeInstruction, (instruction) => instruction.recipe, {
    cascade: true,
  })
  instructions: RecipeInstruction[];

  @OneToMany(() => RecipeNutrition, (nutrition) => nutrition.recipe, {
    cascade: true,
  })
  nutrition: RecipeNutrition[];

  // Helper methods
  getTotalTime(): number {
    return this.prepTimeMinutes + this.cookTimeMinutes;
  }

  updateTotalTime(): void {
    this.totalTimeMinutes = this.getTotalTime();
  }

  isVegetarian(): boolean {
    return (
      this.dietaryRestrictions.includes(DietaryRestriction.VEGETARIAN) ||
      this.dietaryRestrictions.includes(DietaryRestriction.VEGAN) ||
      this.dietaryRestrictions.includes(DietaryRestriction.JAIN)
    );
  }

  isVegan(): boolean {
    return this.dietaryRestrictions.includes(DietaryRestriction.VEGAN);
  }

  hasAllergen(allergen: string): boolean {
    return this.allergens.includes(allergen.toLowerCase());
  }

  addAllergen(allergen: string): void {
    const normalized = allergen.toLowerCase();
    if (!this.allergens.includes(normalized)) {
      this.allergens.push(normalized);
    }
  }

  removeAllergen(allergen: string): void {
    this.allergens = this.allergens.filter((a) => a !== allergen.toLowerCase());
  }

  addRating(rating: number): void {
    const totalRating = this.ratingAverage * this.ratingCount + rating;
    this.ratingCount++;
    this.ratingAverage = totalRating / this.ratingCount;
  }

  incrementView(): void {
    this.viewCount++;
  }

  incrementLike(): void {
    this.likeCount++;
  }

  incrementMade(): void {
    this.madeCount++;
  }

  publish(): void {
    this.isPublic = true;
    this.publishedAt = new Date();
  }

  unpublish(): void {
    this.isPublic = false;
    this.publishedAt = null;
  }

  isInSeason(month?: number): boolean {
    if (!this.isSeasonal) return true;
    const currentMonth = month || new Date().getMonth() + 1;
    return this.seasonMonths.includes(currentMonth);
  }

  getCostPerServing(): number {
    return this.costPerServingInr || 0;
  }

  updateCostPerServing(): void {
    if (this.estimatedCostInr && this.servings > 0) {
      this.costPerServingInr = this.estimatedCostInr / this.servings;
    }
  }
}
