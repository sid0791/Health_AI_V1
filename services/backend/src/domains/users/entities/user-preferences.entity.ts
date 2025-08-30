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

export enum DietaryPreference {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  NON_VEGETARIAN = 'non_vegetarian',
  EGGETARIAN = 'eggetarian',
  JAIN = 'jain',
  HALAL = 'halal',
  KOSHER = 'kosher',
  PESCATARIAN = 'pescatarian',
}

export enum CuisinePreference {
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

export enum Allergen {
  GLUTEN = 'gluten',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  NUTS = 'nuts',
  PEANUTS = 'peanuts',
  TREE_NUTS = 'tree_nuts',
  SOY = 'soy',
  SHELLFISH = 'shellfish',
  FISH = 'fish',
  SESAME = 'sesame',
  MUSTARD = 'mustard',
  CELERY = 'celery',
  LUPIN = 'lupin',
  MOLLUSCS = 'molluscs',
  SULFITES = 'sulfites',
}

export enum SpiceLevel {
  NO_SPICE = 'no_spice',
  MILD = 'mild',
  MEDIUM = 'medium',
  HOT = 'hot',
  VERY_HOT = 'very_hot',
}

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Dietary Preferences
  @Column({
    type: 'enum',
    enum: DietaryPreference,
    name: 'dietary_preference',
    default: DietaryPreference.VEGETARIAN,
  })
  dietaryPreference: DietaryPreference;

  @Column({
    type: 'enum',
    enum: CuisinePreference,
    array: true,
    name: 'favorite_cuisines',
    default: [],
  })
  favoriteCuisines: CuisinePreference[];

  @Column({
    type: 'enum',
    enum: CuisinePreference,
    array: true,
    name: 'avoided_cuisines',
    default: [],
  })
  avoidedCuisines: CuisinePreference[];

  // Allergies and Intolerances
  @Column({
    type: 'enum',
    enum: Allergen,
    array: true,
    default: [],
  })
  allergens: Allergen[];

  @Column({
    type: 'text',
    array: true,
    name: 'custom_allergens',
    default: [],
  })
  customAllergens: string[]; // For allergens not in the enum

  // Food Preferences
  @Column({
    type: 'enum',
    enum: SpiceLevel,
    name: 'spice_tolerance',
    default: SpiceLevel.MEDIUM,
  })
  spiceTolerance: SpiceLevel;

  @Column({
    type: 'text',
    array: true,
    name: 'favorite_ingredients',
    default: [],
  })
  favoriteIngredients: string[];

  @Column({
    type: 'text',
    array: true,
    name: 'disliked_ingredients',
    default: [],
  })
  dislikedIngredients: string[];

  // Meal Preferences
  @Column({ name: 'meals_per_day', type: 'int', default: 3 })
  mealsPerDay: number;

  @Column({ name: 'snacks_per_day', type: 'int', default: 2 })
  snacksPerDay: number;

  @Column({ name: 'max_cooking_time', type: 'int', default: 30 })
  maxCookingTime: number; // in minutes

  @Column({ name: 'cooking_skill_level', type: 'int', default: 3 })
  cookingSkillLevel: number; // 1-5 scale

  // Budget Preferences
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'daily_food_budget',
    nullable: true,
  })
  dailyFoodBudget?: number; // in INR

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'max_meal_cost',
    nullable: true,
  })
  maxMealCost?: number; // in INR

  // Shopping Preferences
  @Column({
    type: 'text',
    array: true,
    name: 'preferred_stores',
    default: [],
  })
  preferredStores: string[];

  @Column({ name: 'bulk_cooking', default: false })
  bulkCooking: boolean;

  @Column({ name: 'meal_prep_days', type: 'int', default: 1 })
  mealPrepDays: number;

  // Notification Preferences
  @Column({ name: 'meal_reminders', default: true })
  mealReminders: boolean;

  @Column({ name: 'shopping_reminders', default: true })
  shoppingReminders: boolean;

  @Column({ name: 'recipe_suggestions', default: true })
  recipeSuggestions: boolean;

  @Column({ name: 'nutrition_insights', default: true })
  nutritionInsights: boolean;

  // App Preferences
  @Column({ name: 'units_metric', default: true })
  unitsMetric: boolean;

  @Column({ name: 'dark_mode', default: false })
  darkMode: boolean;

  @Column({ name: 'show_calories', default: true })
  showCalories: boolean;

  @Column({ name: 'show_macros', default: true })
  showMacros: boolean;

  @Column({ name: 'show_glycemic_index', default: false })
  showGlycemicIndex: boolean;

  // Data classification
  @Column({ name: 'behavioral_classification', default: 'BEHAVIORAL' })
  behavioralClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  hasAllergen(allergen: Allergen | string): boolean {
    return (
      this.allergens.includes(allergen as Allergen) ||
      this.customAllergens.includes(allergen as string)
    );
  }

  addAllergen(allergen: Allergen | string): void {
    if (Object.values(Allergen).includes(allergen as Allergen)) {
      if (!this.allergens.includes(allergen as Allergen)) {
        this.allergens.push(allergen as Allergen);
      }
    } else {
      if (!this.customAllergens.includes(allergen as string)) {
        this.customAllergens.push(allergen as string);
      }
    }
  }

  removeAllergen(allergen: Allergen | string): void {
    if (Object.values(Allergen).includes(allergen as Allergen)) {
      this.allergens = this.allergens.filter((a) => a !== allergen);
    } else {
      this.customAllergens = this.customAllergens.filter((a) => a !== allergen);
    }
  }

  isVegetarian(): boolean {
    return [
      DietaryPreference.VEGETARIAN,
      DietaryPreference.VEGAN,
      DietaryPreference.JAIN,
      DietaryPreference.EGGETARIAN,
    ].includes(this.dietaryPreference);
  }

  isVegan(): boolean {
    return this.dietaryPreference === DietaryPreference.VEGAN;
  }
}
