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

export enum NutrientType {
  // Macronutrients
  CALORIES = 'calories',
  PROTEIN = 'protein',
  CARBOHYDRATES = 'carbohydrates',
  TOTAL_FAT = 'total_fat',
  SATURATED_FAT = 'saturated_fat',
  MONOUNSATURATED_FAT = 'monounsaturated_fat',
  POLYUNSATURATED_FAT = 'polyunsaturated_fat',
  TRANS_FAT = 'trans_fat',
  FIBER = 'fiber',
  SUGAR = 'sugar',
  ADDED_SUGAR = 'added_sugar',

  // Minerals
  SODIUM = 'sodium',
  POTASSIUM = 'potassium',
  CALCIUM = 'calcium',
  IRON = 'iron',
  MAGNESIUM = 'magnesium',
  PHOSPHORUS = 'phosphorus',
  ZINC = 'zinc',
  COPPER = 'copper',
  MANGANESE = 'manganese',
  SELENIUM = 'selenium',
  IODINE = 'iodine',

  // Vitamins
  VITAMIN_A = 'vitamin_a',
  VITAMIN_C = 'vitamin_c',
  VITAMIN_D = 'vitamin_d',
  VITAMIN_E = 'vitamin_e',
  VITAMIN_K = 'vitamin_k',
  THIAMIN = 'thiamin', // B1
  RIBOFLAVIN = 'riboflavin', // B2
  NIACIN = 'niacin', // B3
  PANTOTHENIC_ACID = 'pantothenic_acid', // B5
  VITAMIN_B6 = 'vitamin_b6',
  BIOTIN = 'biotin', // B7
  FOLATE = 'folate', // B9
  VITAMIN_B12 = 'vitamin_b12',
  CHOLINE = 'choline',

  // Other nutrients
  CHOLESTEROL = 'cholesterol',
  WATER = 'water',
  CAFFEINE = 'caffeine',
  ALCOHOL = 'alcohol',

  // Phytonutrients and antioxidants
  LYCOPENE = 'lycopene',
  BETA_CAROTENE = 'beta_carotene',
  LUTEIN = 'lutein',
  ANTHOCYANINS = 'anthocyanins',
  RESVERATROL = 'resveratrol',
  CURCUMIN = 'curcumin',

  // Amino acids (essential)
  HISTIDINE = 'histidine',
  ISOLEUCINE = 'isoleucine',
  LEUCINE = 'leucine',
  LYSINE = 'lysine',
  METHIONINE = 'methionine',
  PHENYLALANINE = 'phenylalanine',
  THREONINE = 'threonine',
  TRYPTOPHAN = 'tryptophan',
  VALINE = 'valine',

  // Fatty acids
  OMEGA_3 = 'omega_3',
  OMEGA_6 = 'omega_6',
  DHA = 'dha',
  EPA = 'epa',
  ALA = 'ala',
}

export enum MeasurementUnit {
  // Energy
  CALORIES = 'kcal',
  KILOJOULES = 'kj',

  // Weight
  GRAMS = 'g',
  MILLIGRAMS = 'mg',
  MICROGRAMS = 'mcg',

  // International Units
  INTERNATIONAL_UNITS = 'iu',

  // Percentage
  PERCENT_DV = 'percent_dv', // Percent Daily Value

  // Volume (for liquids)
  MILLILITERS = 'ml',
}

@Entity('recipe_nutrition')
@Index(['recipeId', 'nutrientType'])
@Index(['nutrientType', 'valuePerServing'])
export class RecipeNutrition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @Column({
    type: 'enum',
    enum: NutrientType,
    name: 'nutrient_type',
  })
  nutrientType: NutrientType;

  // Nutritional Values
  @Column({ name: 'value_per_100g', type: 'decimal', precision: 12, scale: 4 })
  valuePer100g: number; // Standardized per 100g

  @Column({ name: 'value_per_serving', type: 'decimal', precision: 12, scale: 4 })
  valuePerServing: number; // Per recipe serving

  @Column({ name: 'value_total_recipe', type: 'decimal', precision: 12, scale: 4 })
  valueTotalRecipe: number; // Total for entire recipe

  @Column({
    type: 'enum',
    enum: MeasurementUnit,
    default: MeasurementUnit.GRAMS,
  })
  unit: MeasurementUnit;

  // Daily Value Information (based on 2000 calorie diet)
  @Column({ name: 'daily_value_percent', type: 'decimal', precision: 6, scale: 2, nullable: true })
  dailyValuePercent?: number; // % of recommended daily value

  @Column({ name: 'rda_amount', type: 'decimal', precision: 12, scale: 4, nullable: true })
  rdaAmount?: number; // Recommended Daily Allowance

  // Quality and Source Information
  @Column({ name: 'bioavailability', type: 'decimal', precision: 5, scale: 2, default: 100 })
  bioavailability: number; // 0-100% how well the nutrient is absorbed

  @Column({ name: 'calculation_method', length: 100, default: 'sum_of_ingredients' })
  calculationMethod: string; // How this value was calculated

  @Column({ name: 'data_source', length: 100, nullable: true })
  dataSource?: string; // USDA, lab analysis, etc.

  @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2, default: 0.8 })
  confidenceScore: number; // 0-1 confidence in accuracy

  // Cooking Impact
  @Column({ name: 'raw_value', type: 'decimal', precision: 12, scale: 4, nullable: true })
  rawValue?: number; // Value before cooking

  @Column({ name: 'cooking_loss_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  cookingLossPercent: number; // % lost due to cooking

  @Column({ name: 'cooking_method_impact', length: 100, nullable: true })
  cookingMethodImpact?: string; // How cooking affects this nutrient

  // Health Impact
  @Column({ name: 'health_benefit_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  healthBenefitScore?: number; // 0-1 scale of health benefit

  @Column({ name: 'deficiency_risk_factor', type: 'decimal', precision: 3, scale: 2, default: 0 })
  deficiencyRiskFactor: number; // 0-1 how critical this nutrient is

  // Special Populations
  @Column({ name: 'pregnancy_multiplier', type: 'decimal', precision: 3, scale: 2, default: 1 })
  pregnancyMultiplier: number; // Adjustment for pregnant women

  @Column({ name: 'lactation_multiplier', type: 'decimal', precision: 3, scale: 2, default: 1 })
  lactationMultiplier: number; // Adjustment for breastfeeding

  @Column({ name: 'children_multiplier', type: 'decimal', precision: 3, scale: 2, default: 1 })
  childrenMultiplier: number; // Adjustment for children

  @Column({ name: 'elderly_multiplier', type: 'decimal', precision: 3, scale: 2, default: 1 })
  elderlyMultiplier: number; // Adjustment for elderly

  // Indian RDA Specific
  @Column({ name: 'icmr_rda', type: 'decimal', precision: 12, scale: 4, nullable: true })
  icmrRda?: number; // Indian Council of Medical Research RDA

  @Column({ name: 'fssai_requirement', type: 'decimal', precision: 12, scale: 4, nullable: true })
  fssaiRequirement?: number; // FSSAI nutritional requirement

  // Additional Context
  @Column({ name: 'nutrient_form', length: 100, nullable: true })
  nutrientForm?: string; // "beta-carotene", "retinol", etc.

  @Column({ name: 'absorption_enhancers', type: 'text', array: true, default: [] })
  absorptionEnhancers: string[]; // Foods/nutrients that enhance absorption

  @Column({ name: 'absorption_inhibitors', type: 'text', array: true, default: [] })
  absorptionInhibitors: string[]; // Foods/nutrients that inhibit absorption

  @Column({ name: 'synergistic_nutrients', type: 'text', array: true, default: [] })
  synergisticNutrients: string[]; // Nutrients that work together

  // Timing and Optimization
  @Column({ name: 'optimal_consumption_time', length: 100, nullable: true })
  optimalConsumptionTime?: string; // "with meals", "empty stomach", etc.

  @Column({ name: 'storage_stability', type: 'int', default: 7 })
  storageStability: number; // Days nutrient remains stable

  @Column({ name: 'heat_stability', type: 'decimal', precision: 3, scale: 2, default: 0.8 })
  heatStability: number; // 0-1 how well nutrient survives cooking

  // Quality Control
  @Column({ name: 'last_verified', type: 'timestamp', nullable: true })
  lastVerified?: Date;

  @Column({ name: 'verified_by', length: 100, nullable: true })
  verifiedBy?: string; // Nutritionist/system that verified

  @Column({ name: 'needs_update', default: false })
  needsUpdate: boolean;

  // Data classification
  @Column({ name: 'data_classification', default: 'NUTRITIONAL' })
  dataClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Recipe, (recipe) => recipe.nutrition, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Helper methods
  getDisplayValue(precision: number = 2): string {
    return `${this.valuePerServing.toFixed(precision)} ${this.unit}`;
  }

  getDailyValueText(): string {
    if (!this.dailyValuePercent) return '';
    return `${this.dailyValuePercent.toFixed(0)}% DV`;
  }

  isMacronutrient(): boolean {
    return [
      NutrientType.CALORIES,
      NutrientType.PROTEIN,
      NutrientType.CARBOHYDRATES,
      NutrientType.TOTAL_FAT,
      NutrientType.FIBER,
    ].includes(this.nutrientType);
  }

  isVitamin(): boolean {
    return (
      this.nutrientType.toString().includes('vitamin') ||
      [
        NutrientType.THIAMIN,
        NutrientType.RIBOFLAVIN,
        NutrientType.NIACIN,
        NutrientType.PANTOTHENIC_ACID,
        NutrientType.BIOTIN,
        NutrientType.FOLATE,
        NutrientType.CHOLINE,
      ].includes(this.nutrientType)
    );
  }

  isMineral(): boolean {
    return [
      NutrientType.SODIUM,
      NutrientType.POTASSIUM,
      NutrientType.CALCIUM,
      NutrientType.IRON,
      NutrientType.MAGNESIUM,
      NutrientType.PHOSPHORUS,
      NutrientType.ZINC,
      NutrientType.COPPER,
      NutrientType.MANGANESE,
      NutrientType.SELENIUM,
      NutrientType.IODINE,
    ].includes(this.nutrientType);
  }

  isEssentialAminoAcid(): boolean {
    return [
      NutrientType.HISTIDINE,
      NutrientType.ISOLEUCINE,
      NutrientType.LEUCINE,
      NutrientType.LYSINE,
      NutrientType.METHIONINE,
      NutrientType.PHENYLALANINE,
      NutrientType.THREONINE,
      NutrientType.TRYPTOPHAN,
      NutrientType.VALINE,
    ].includes(this.nutrientType);
  }

  getValueForPopulation(
    population: 'general' | 'pregnancy' | 'lactation' | 'children' | 'elderly' = 'general',
  ): number {
    let multiplier = 1;

    switch (population) {
      case 'pregnancy':
        multiplier = this.pregnancyMultiplier;
        break;
      case 'lactation':
        multiplier = this.lactationMultiplier;
        break;
      case 'children':
        multiplier = this.childrenMultiplier;
        break;
      case 'elderly':
        multiplier = this.elderlyMultiplier;
        break;
    }

    return this.valuePerServing * multiplier;
  }

  calculateBioavailableAmount(): number {
    return this.valuePerServing * (this.bioavailability / 100);
  }

  isDeficient(targetAmount: number): boolean {
    return this.valuePerServing < targetAmount;
  }

  isExcessive(maxAmount: number): boolean {
    return this.valuePerServing > maxAmount;
  }

  getHealthImpact(): {
    category: 'macronutrient' | 'vitamin' | 'mineral' | 'amino_acid' | 'other';
    importance: 'low' | 'medium' | 'high' | 'critical';
    dailyValueStatus: 'low' | 'adequate' | 'high' | 'excessive';
  } {
    let category: 'macronutrient' | 'vitamin' | 'mineral' | 'amino_acid' | 'other' = 'other';

    if (this.isMacronutrient()) category = 'macronutrient';
    else if (this.isVitamin()) category = 'vitamin';
    else if (this.isMineral()) category = 'mineral';
    else if (this.isEssentialAminoAcid()) category = 'amino_acid';

    let importance: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (this.deficiencyRiskFactor > 0.8) importance = 'critical';
    else if (this.deficiencyRiskFactor > 0.6) importance = 'high';
    else if (this.deficiencyRiskFactor < 0.3) importance = 'low';

    let dailyValueStatus: 'low' | 'adequate' | 'high' | 'excessive' = 'adequate';
    if (this.dailyValuePercent) {
      if (this.dailyValuePercent < 25) dailyValueStatus = 'low';
      else if (this.dailyValuePercent > 150) dailyValueStatus = 'excessive';
      else if (this.dailyValuePercent > 100) dailyValueStatus = 'high';
    }

    return { category, importance, dailyValueStatus };
  }

  markForUpdate(): void {
    this.needsUpdate = true;
  }

  verify(verifiedBy: string): void {
    this.lastVerified = new Date();
    this.verifiedBy = verifiedBy;
    this.needsUpdate = false;
  }

  updateCookingLoss(lossPercent: number): void {
    this.cookingLossPercent = Math.max(0, Math.min(100, lossPercent));
    this.valuePerServing = this.rawValue
      ? this.rawValue * (1 - this.cookingLossPercent / 100)
      : this.valuePerServing;
  }
}
