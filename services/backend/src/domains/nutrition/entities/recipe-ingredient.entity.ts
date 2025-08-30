import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Recipe } from './recipe.entity';

export enum IngredientCategory {
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  GRAINS = 'grains',
  LEGUMES = 'legumes',
  DAIRY = 'dairy',
  MEAT = 'meat',
  SEAFOOD = 'seafood',
  POULTRY = 'poultry',
  EGGS = 'eggs',
  NUTS_SEEDS = 'nuts_seeds',
  OILS_FATS = 'oils_fats',
  SPICES_HERBS = 'spices_herbs',
  SWEETENERS = 'sweeteners',
  BEVERAGES = 'beverages',
  CONDIMENTS = 'condiments',
  PROCESSED = 'processed',
  OTHER = 'other',
}

export enum UnitOfMeasurement {
  // Weight
  GRAMS = 'g',
  KILOGRAMS = 'kg',
  OUNCES = 'oz',
  POUNDS = 'lb',
  // Volume
  MILLILITERS = 'ml',
  LITERS = 'l',
  CUPS = 'cup',
  TABLESPOONS = 'tbsp',
  TEASPOONS = 'tsp',
  FLUID_OUNCES = 'fl_oz',
  PINTS = 'pint',
  QUARTS = 'quart',
  GALLONS = 'gallon',
  // Count
  PIECES = 'pieces',
  ITEMS = 'items',
  // Indian measurements
  HANDFULS = 'handful',
  PINCHES = 'pinch',
  // Descriptive
  TO_TASTE = 'to_taste',
  AS_NEEDED = 'as_needed',
}

@Entity('recipe_ingredients')
@Index(['recipeId', 'orderIndex'])
@Index(['ingredientName', 'category'])
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number; // Order of ingredient in the recipe

  // Ingredient Information
  @Column({ name: 'ingredient_name', length: 200 })
  ingredientName: string;

  @Column({ name: 'ingredient_name_hindi', length: 200, nullable: true })
  ingredientNameHindi?: string;

  @Column({ name: 'ingredient_name_local', length: 200, nullable: true })
  ingredientNameLocal?: string; // Regional language name

  @Column({
    type: 'enum',
    enum: IngredientCategory,
    default: IngredientCategory.OTHER,
  })
  category: IngredientCategory;

  // Quantity and Measurement
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: UnitOfMeasurement,
    default: UnitOfMeasurement.GRAMS,
  })
  unit: UnitOfMeasurement;

  @Column({ name: 'quantity_description', length: 100, nullable: true })
  quantityDescription?: string; // "1 medium onion", "2 cups chopped"

  @Column({ name: 'weight_grams', type: 'decimal', precision: 10, scale: 3, nullable: true })
  weightGrams?: number; // Standardized weight for nutrition calculations

  // Preparation Instructions
  @Column({ length: 200, nullable: true })
  preparation?: string; // "chopped", "diced", "minced", "grated"

  @Column({ name: 'preparation_hindi', length: 200, nullable: true })
  preparationHindi?: string;

  @Column({ name: 'cooking_method', length: 100, nullable: true })
  cookingMethod?: string; // "sautéed", "boiled", "raw"

  // Ingredient Properties
  @Column({ name: 'is_optional', default: false })
  isOptional: boolean;

  @Column({ name: 'is_garnish', default: false })
  isGarnish: boolean;

  @Column({ name: 'is_main_ingredient', default: false })
  isMainIngredient: boolean; // Primary ingredient vs supporting

  // Substitutions and Alternatives
  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  substitutes: string[]; // Alternative ingredients

  @Column({ name: 'substitute_ratio', type: 'decimal', precision: 5, scale: 2, default: 1 })
  substituteRatio: number; // Conversion ratio for substitutes

  // Cost and Availability
  @Column({ name: 'estimated_cost_inr', type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedCostInr?: number;

  @Column({ name: 'seasonal_availability', type: 'int', array: true, default: [] })
  seasonalAvailability: number[]; // Months when ingredient is in season

  @Column({ name: 'local_availability', default: true })
  localAvailability: boolean; // Available in Indian markets

  // Nutritional Information (per 100g)
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  calories?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  protein?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  carbohydrates?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  fat?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  fiber?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  sugar?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  sodium?: number;

  // Health and Dietary Information
  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  allergens: string[];

  @Column({ name: 'glycemic_index', type: 'decimal', precision: 5, scale: 2, nullable: true })
  glycemicIndex?: number;

  @Column({ name: 'inflammatory_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  inflammatoryScore?: number;

  // External Data Integration
  @Column({ name: 'usda_fdc_id', type: 'int', nullable: true })
  usdaFdcId?: number; // USDA FoodData Central ID

  @Column({ name: 'open_food_facts_id', length: 50, nullable: true })
  openFoodFactsId?: string;

  // Storage and Handling
  @Column({ name: 'storage_instructions', type: 'text', nullable: true })
  storageInstructions?: string;

  @Column({ name: 'shelf_life_days', type: 'int', nullable: true })
  shelfLifeDays?: number;

  // Shopping Information
  @Column({ name: 'brand_preference', length: 100, nullable: true })
  brandPreference?: string;

  @Column({ name: 'quality_indicators', type: 'text', nullable: true })
  qualityIndicators?: string; // How to select good quality ingredient

  // Data classification
  @Column({ name: 'content_classification', default: 'PUBLIC' })
  contentClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Helper methods
  getDisplayName(language: 'en' | 'hi' | 'local' = 'en'): string {
    switch (language) {
      case 'hi':
        return this.ingredientNameHindi || this.ingredientName;
      case 'local':
        return this.ingredientNameLocal || this.ingredientNameHindi || this.ingredientName;
      default:
        return this.ingredientName;
    }
  }

  getDisplayQuantity(): string {
    if (this.quantityDescription) {
      return this.quantityDescription;
    }
    return `${this.quantity} ${this.unit}`;
  }

  getFullDescription(language: 'en' | 'hi' | 'local' = 'en'): string {
    const name = this.getDisplayName(language);
    const quantity = this.getDisplayQuantity();
    const prep = this.preparation ? `, ${this.preparation}` : '';
    return `${quantity} ${name}${prep}`;
  }

  calculateNutritionForQuantity(): {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  } {
    const weight = this.weightGrams || 0;
    const factor = weight / 100; // Nutrition is per 100g

    return {
      calories: (this.calories || 0) * factor,
      protein: (this.protein || 0) * factor,
      carbohydrates: (this.carbohydrates || 0) * factor,
      fat: (this.fat || 0) * factor,
      fiber: (this.fiber || 0) * factor,
    };
  }

  isInSeason(month?: number): boolean {
    if (this.seasonalAvailability.length === 0) return true;
    const currentMonth = month || new Date().getMonth() + 1;
    return this.seasonalAvailability.includes(currentMonth);
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

  addSubstitute(substitute: string): void {
    if (!this.substitutes.includes(substitute)) {
      this.substitutes.push(substitute);
    }
  }

  removeSubstitute(substitute: string): void {
    this.substitutes = this.substitutes.filter((s) => s !== substitute);
  }

  convertToGrams(): number {
    // Basic conversion logic - would be expanded with proper conversion tables
    switch (this.unit) {
      case UnitOfMeasurement.KILOGRAMS:
        return this.quantity * 1000;
      case UnitOfMeasurement.GRAMS:
        return this.quantity;
      case UnitOfMeasurement.CUPS:
        // Approximate - varies by ingredient
        return this.quantity * 240;
      case UnitOfMeasurement.TABLESPOONS:
        return this.quantity * 15;
      case UnitOfMeasurement.TEASPOONS:
        return this.quantity * 5;
      case UnitOfMeasurement.MILLILITERS:
        // Approximate for liquid ingredients
        return this.quantity;
      case UnitOfMeasurement.LITERS:
        return this.quantity * 1000;
      default:
        return this.weightGrams || 0;
    }
  }
}
