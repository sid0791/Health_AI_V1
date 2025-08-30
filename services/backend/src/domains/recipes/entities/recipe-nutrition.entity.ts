import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Recipe } from './recipe.entity';

export enum NutrientType {
  MACRO = 'macro',
  VITAMIN = 'vitamin',
  MINERAL = 'mineral',
  OTHER = 'other',
}

@Entity('recipe_nutrition')
@Index(['recipeId'])
@Index(['nutrientName'])
@Index(['nutrientType'])
export class RecipeNutrition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @Column({ name: 'nutrient_name', length: 100 })
  nutrientName: string;

  @Column({ name: 'nutrient_name_hindi', length: 100, nullable: true })
  nutrientNameHindi?: string;

  @Column({
    type: 'enum',
    enum: NutrientType,
    default: NutrientType.OTHER,
  })
  nutrientType: NutrientType;

  @Column({ name: 'amount_per_serving', type: 'decimal', precision: 12, scale: 4 })
  amountPerServing: number;

  @Column({ name: 'unit', length: 20 })
  unit: string;

  @Column({
    name: 'daily_value_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  dailyValuePercentage?: number;

  @Column({ name: 'is_essential', default: false })
  isEssential: boolean;

  @Column({ name: 'bioavailability_factor', type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  bioavailabilityFactor: number;

  // Data source and reliability
  @Column({ name: 'data_source', default: 'calculated' })
  dataSource: string;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2, default: 0.8 })
  confidenceScore: number;

  @ManyToOne(() => Recipe, (recipe) => recipe.nutrition, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Helper methods
  getEffectiveAmount(): number {
    return this.amountPerServing * this.bioavailabilityFactor;
  }

  getDisplayName(): string {
    return this.nutrientNameHindi || this.nutrientName;
  }

  isSignificantAmount(): boolean {
    // Consider amounts > 5% DV as significant
    return this.dailyValuePercentage ? this.dailyValuePercentage > 5 : false;
  }

  isMacronutrient(): boolean {
    const macros = ['protein', 'carbohydrate', 'fat', 'fiber', 'sugar'];
    return macros.some((macro) => this.nutrientName.toLowerCase().includes(macro));
  }

  isVitamin(): boolean {
    return (
      this.nutrientType === NutrientType.VITAMIN ||
      this.nutrientName.toLowerCase().includes('vitamin')
    );
  }

  isMineral(): boolean {
    return (
      this.nutrientType === NutrientType.MINERAL ||
      ['iron', 'calcium', 'zinc', 'magnesium', 'potassium', 'sodium'].some((mineral) =>
        this.nutrientName.toLowerCase().includes(mineral),
      )
    );
  }
}
