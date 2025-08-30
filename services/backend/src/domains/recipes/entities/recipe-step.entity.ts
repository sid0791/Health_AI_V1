import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Recipe } from './recipe.entity';

export enum CookingMethod {
  BOIL = 'boil',
  STEAM = 'steam',
  SAUTE = 'saute',
  FRY = 'fry',
  DEEP_FRY = 'deep_fry',
  BAKE = 'bake',
  ROAST = 'roast',
  GRILL = 'grill',
  PRESSURE_COOK = 'pressure_cook',
  AIR_FRY = 'air_fry',
  MICROWAVE = 'microwave',
  RAW = 'raw',
  BLANCH = 'blanch',
  MARINATE = 'marinate',
  MIX = 'mix',
  SIMMER = 'simmer',
  SLOW_COOK = 'slow_cook',
}

@Entity('recipe_steps')
@Index(['recipeId'])
@Index(['stepNumber'])
export class RecipeStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @Column({ name: 'step_number', type: 'integer' })
  stepNumber: number;

  @Column({ name: 'instruction', type: 'text' })
  instruction: string;

  @Column({ name: 'instruction_hindi', type: 'text', nullable: true })
  instructionHindi?: string;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes?: number;

  @Column({ name: 'temperature_celsius', type: 'integer', nullable: true })
  temperatureCelsius?: number;

  @Column({
    type: 'enum',
    enum: CookingMethod,
    nullable: true,
  })
  cookingMethod?: CookingMethod;

  @Column({ name: 'equipment_needed', type: 'json', nullable: true })
  equipmentNeeded?: string[];

  @Column({ name: 'ingredients_used', type: 'json', nullable: true })
  ingredientsUsed?: string[];

  @Column({ name: 'tips', type: 'text', nullable: true })
  tips?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @Column({ name: 'is_critical', default: false })
  isCritical: boolean;

  @Column({ name: 'safety_note', type: 'text', nullable: true })
  safetyNote?: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Helper methods
  getDisplayInstruction(): string {
    return this.instructionHindi || this.instruction;
  }

  hasSpecialEquipment(): boolean {
    return this.equipmentNeeded && this.equipmentNeeded.length > 0;
  }

  isTimeCritical(): boolean {
    return (
      this.isCritical ||
      this.cookingMethod === CookingMethod.FRY ||
      this.cookingMethod === CookingMethod.DEEP_FRY
    );
  }

  getEstimatedDuration(): number {
    if (this.durationMinutes) {
      return this.durationMinutes;
    }

    // Estimate based on cooking method
    switch (this.cookingMethod) {
      case CookingMethod.PRESSURE_COOK:
        return 15;
      case CookingMethod.BOIL:
        return 10;
      case CookingMethod.SAUTE:
        return 5;
      case CookingMethod.FRY:
        return 8;
      case CookingMethod.BAKE:
        return 25;
      case CookingMethod.ROAST:
        return 30;
      case CookingMethod.STEAM:
        return 12;
      default:
        return 5;
    }
  }
}
