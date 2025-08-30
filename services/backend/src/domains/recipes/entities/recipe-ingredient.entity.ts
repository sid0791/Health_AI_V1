import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity('recipe_ingredients')
@Index(['recipeId'])
@Index(['ingredientName'])
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @Column({ name: 'ingredient_name', length: 255 })
  ingredientName: string;

  @Column({ name: 'ingredient_name_hindi', length: 255, nullable: true })
  ingredientNameHindi?: string;

  @Column({ name: 'quantity', type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ name: 'unit', length: 50 })
  unit: string;

  @Column({ name: 'is_optional', default: false })
  isOptional: boolean;

  @Column({ name: 'preparation_note', nullable: true })
  preparationNote?: string;

  @Column({ name: 'substitutes', type: 'json', nullable: true })
  substitutes?: string[];

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  // Nutrition data per ingredient
  @Column({ name: 'calories_per_unit', type: 'decimal', precision: 8, scale: 2, nullable: true })
  caloriesPerUnit?: number;

  @Column({ name: 'protein_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  proteinGrams?: number;

  @Column({ name: 'carbs_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  carbsGrams?: number;

  @Column({ name: 'fat_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  fatGrams?: number;

  @Column({ name: 'fiber_grams', type: 'decimal', precision: 8, scale: 2, nullable: true })
  fiberGrams?: number;

  // External data references
  @Column({ name: 'usda_food_id', nullable: true })
  usdaFoodId?: string;

  @Column({ name: 'ifct_food_id', nullable: true })
  ifctFoodId?: string;

  @Column({ name: 'openfoodfacts_barcode', nullable: true })
  openFoodFactsBarcode?: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Helper methods
  getTotalCalories(): number {
    return this.caloriesPerUnit ? this.caloriesPerUnit * this.quantity : 0;
  }

  getDisplayName(): string {
    return this.ingredientNameHindi || this.ingredientName;
  }

  isVegetarian(): boolean {
    // Simple logic - can be enhanced with a comprehensive ingredient database
    const nonVegKeywords = ['chicken', 'fish', 'mutton', 'beef', 'pork', 'egg'];
    return !nonVegKeywords.some((keyword) => this.ingredientName.toLowerCase().includes(keyword));
  }
}
