import { Injectable, Logger } from '@nestjs/common';
import {
  CookingMethod,
  CookingMethodCategory,
  getCookingMethodCategory,
} from '../enums/cooking-method.enum';

/**
 * Represents nutritional content with all essential nutrients
 */
export interface NutrientContent {
  // Macronutrients (per 100g)
  energy: number; // kcal
  protein: number; // g
  carbohydrates: number; // g
  fat: number; // g
  fiber: number; // g
  sugar: number; // g

  // Vitamins (per 100g)
  vitaminA?: number; // mcg RAE
  vitaminC?: number; // mg
  vitaminD?: number; // mcg
  vitaminE?: number; // mg
  vitaminK?: number; // mcg
  thiamin?: number; // mg (B1)
  riboflavin?: number; // mg (B2)
  niacin?: number; // mg (B3)
  vitaminB6?: number; // mg
  folate?: number; // mcg DFE
  vitaminB12?: number; // mcg

  // Minerals (per 100g)
  calcium?: number; // mg
  iron?: number; // mg
  magnesium?: number; // mg
  phosphorus?: number; // mg
  potassium?: number; // mg
  sodium?: number; // mg
  zinc?: number; // mg
  copper?: number; // mg
  manganese?: number; // mg
  selenium?: number; // mcg
  iodine?: number; // mcg
}

/**
 * Cooking transformation result including yield and transformed nutrients
 */
export interface CookingTransformationResult {
  // Weight changes
  yieldFactor: number; // Ratio of cooked weight to raw weight
  cookedWeight: number; // Final weight after cooking (g)

  // Transformed nutritional content (per 100g of cooked product)
  transformedNutrients: NutrientContent;

  // Metadata
  cookingMethod: CookingMethod;
  cookingTime?: number; // minutes
  temperature?: number; // celsius
  retentionFactorsApplied: { [nutrient: string]: number };
}

/**
 * Cooking parameters for transformation calculations
 */
export interface CookingParameters {
  method: CookingMethod;
  temperature?: number; // celsius
  cookingTime?: number; // minutes
  addedFat?: number; // grams of added oil/fat
  addedSalt?: number; // grams of added salt
  addedWater?: number; // grams of added water
}

/**
 * Service for applying cooking transformations to food nutrient data
 * Based on USDA nutrient retention factors and yield factors
 */
@Injectable()
export class CookingTransformationService {
  private readonly logger = new Logger(CookingTransformationService.name);

  /**
   * Apply cooking transformation to raw ingredient
   */
  applyCookingTransformation(
    rawNutrients: NutrientContent,
    rawWeight: number, // grams
    cookingParams: CookingParameters,
  ): CookingTransformationResult {
    this.logger.debug(
      `Applying ${cookingParams.method} transformation to ${rawWeight}g ingredient`,
    );

    // Calculate yield factor (weight change due to cooking)
    const yieldFactor = this.calculateYieldFactor(cookingParams);
    const cookedWeight = rawWeight * yieldFactor;

    // Get nutrient retention factors
    const retentionFactors = this.getNutrientRetentionFactors(cookingParams);

    // Apply transformations
    const transformedNutrients = this.applyNutrientTransformations(
      rawNutrients,
      retentionFactors,
      cookingParams,
      yieldFactor,
    );

    return {
      yieldFactor,
      cookedWeight,
      transformedNutrients,
      cookingMethod: cookingParams.method,
      cookingTime: cookingParams.cookingTime,
      temperature: cookingParams.temperature,
      retentionFactorsApplied: retentionFactors,
    };
  }

  /**
   * Calculate yield factor based on cooking method
   * Based on USDA Table of Cooking Yields for Meat and Poultry and other USDA sources
   */
  private calculateYieldFactor(cookingParams: CookingParameters): number {
    const { method, cookingTime = 15, temperature = 100 } = cookingParams;
    const category = getCookingMethodCategory(method);

    let baseFactor: number;

    switch (category) {
      case CookingMethodCategory.RAW:
        return 1.0; // No change for raw foods

      case CookingMethodCategory.WET_HEAT:
        switch (method) {
          case CookingMethod.BOILED:
            baseFactor = 0.75; // 25% weight loss from water evaporation
            break;
          case CookingMethod.STEAMED:
            baseFactor = 0.85; // Less water loss than boiling
            break;
          case CookingMethod.PRESSURE_COOKED:
            baseFactor = 0.8; // Minimal water loss due to sealed environment
            break;
          case CookingMethod.BRAISED:
          case CookingMethod.STEWED:
            baseFactor = 0.7; // Higher water loss due to longer cooking
            break;
          default:
            baseFactor = 0.75;
        }
        break;

      case CookingMethodCategory.DRY_HEAT:
        switch (method) {
          case CookingMethod.BAKED:
          case CookingMethod.ROASTED:
            baseFactor = 0.7; // Significant moisture loss
            break;
          case CookingMethod.GRILLED:
          case CookingMethod.BROILED:
            baseFactor = 0.65; // High heat causes more moisture loss
            break;
          case CookingMethod.AIR_FRIED:
            baseFactor = 0.75; // Less moisture loss than traditional frying
            break;
          default:
            baseFactor = 0.7;
        }
        break;

      case CookingMethodCategory.FAT_BASED:
        switch (method) {
          case CookingMethod.FRIED:
          case CookingMethod.DEEP_FRIED:
            // Weight can increase due to oil absorption
            baseFactor = 1.1;
            break;
          case CookingMethod.SAUTEED:
          case CookingMethod.STIR_FRIED:
            baseFactor = 0.9; // Slight moisture loss, minimal oil absorption
            break;
          default:
            baseFactor = 0.95;
        }
        break;

      case CookingMethodCategory.SPECIAL:
        switch (method) {
          case CookingMethod.MICROWAVE:
            baseFactor = 0.85; // Moderate moisture loss
            break;
          case CookingMethod.FERMENTED:
            baseFactor = 0.95; // Minimal weight change
            break;
          case CookingMethod.DEHYDRATED:
            baseFactor = 0.2; // Significant moisture removal
            break;
          default:
            baseFactor = 0.85;
        }
        break;

      default:
        baseFactor = 1.0;
    }

    // Adjust for cooking time and temperature
    const timeAdjustment = this.getTimeAdjustment(cookingTime, method);
    const temperatureAdjustment = this.getTemperatureAdjustment(temperature, method);

    return Math.max(0.1, baseFactor * timeAdjustment * temperatureAdjustment);
  }

  /**
   * Get nutrient retention factors for different cooking methods
   * Based on USDA Nutrient Retention Factors
   */
  private getNutrientRetentionFactors(cookingParams: CookingParameters): {
    [nutrient: string]: number;
  } {
    const method = cookingParams.method;
    const category = getCookingMethodCategory(method);

    // Default retention factors (most stable nutrients)
    const baseFactors = {
      energy: 1.0,
      protein: 1.0,
      carbohydrates: 1.0,
      fat: 1.0,
      fiber: 1.0,
      sugar: 1.0,
      calcium: 0.95,
      phosphorus: 0.95,
      magnesium: 0.9,
      iron: 0.9,
      zinc: 0.85,
      copper: 0.85,
      manganese: 0.9,
      selenium: 0.8,
      sodium: 1.0, // Usually added during cooking
      potassium: 0.8, // Water-soluble, affected by cooking water
      iodine: 0.7,
    };

    // Vitamin retention factors vary significantly by cooking method
    let vitaminFactors: { [key: string]: number };

    switch (category) {
      case CookingMethodCategory.RAW:
        vitaminFactors = {
          vitaminA: 1.0,
          vitaminC: 1.0,
          vitaminD: 1.0,
          vitaminE: 1.0,
          vitaminK: 1.0,
          thiamin: 1.0,
          riboflavin: 1.0,
          niacin: 1.0,
          vitaminB6: 1.0,
          folate: 1.0,
          vitaminB12: 1.0,
        };
        break;

      case CookingMethodCategory.WET_HEAT:
        // Base factors for wet heat cooking
        vitaminFactors = {
          vitaminA: 0.85, // Heat-sensitive
          vitaminC: 0.5, // Very heat and water-sensitive
          vitaminD: 0.95, // Stable
          vitaminE: 0.8, // Moderately heat-sensitive
          vitaminK: 0.85, // Moderately stable
          thiamin: 0.6, // Very heat-sensitive, water-soluble
          riboflavin: 0.75, // Water-soluble
          niacin: 0.85, // More stable
          vitaminB6: 0.7, // Heat-sensitive
          folate: 0.55, // Very heat and water-sensitive
          vitaminB12: 0.8, // Moderately stable
        };

        // Adjust for specific wet heat methods
        if (method === CookingMethod.STEAMED) {
          // Steaming preserves more nutrients than boiling
          vitaminFactors.vitaminC = 0.7; // Better than boiling
          vitaminFactors.thiamin = 0.75;
          vitaminFactors.folate = 0.7;
        } else if (method === CookingMethod.PRESSURE_COOKED) {
          // Pressure cooking is faster, preserves some nutrients better
          vitaminFactors.vitaminC = 0.6;
          vitaminFactors.thiamin = 0.7;
        }
        break;

      case CookingMethodCategory.DRY_HEAT:
        vitaminFactors = {
          vitaminA: 0.75, // Heat-sensitive
          vitaminC: 0.3, // Very heat-sensitive
          vitaminD: 0.9, // Relatively stable
          vitaminE: 0.7, // Heat-sensitive
          vitaminK: 0.8, // Moderately stable
          thiamin: 0.7, // Heat-sensitive
          riboflavin: 0.85, // More stable in dry heat
          niacin: 0.9, // Stable
          vitaminB6: 0.75, // Moderately heat-sensitive
          folate: 0.65, // Heat-sensitive
          vitaminB12: 0.85, // Relatively stable
        };
        break;

      case CookingMethodCategory.FAT_BASED:
        vitaminFactors = {
          vitaminA: 0.8, // Fat-soluble, some protection from fat
          vitaminC: 0.4, // Still heat-sensitive
          vitaminD: 0.95, // Fat-soluble, protected
          vitaminE: 0.75, // Fat-soluble
          vitaminK: 0.9, // Fat-soluble, protected
          thiamin: 0.75, // Better retention in fat
          riboflavin: 0.8, // Moderate retention
          niacin: 0.9, // Stable
          vitaminB6: 0.8, // Better retention
          folate: 0.7, // Better than water cooking
          vitaminB12: 0.85, // Stable
        };
        break;

      case CookingMethodCategory.SPECIAL:
        // Average values for special methods
        vitaminFactors = {
          vitaminA: 0.85,
          vitaminC: 0.6,
          vitaminD: 0.9,
          vitaminE: 0.8,
          vitaminK: 0.85,
          thiamin: 0.75,
          riboflavin: 0.8,
          niacin: 0.85,
          vitaminB6: 0.75,
          folate: 0.7,
          vitaminB12: 0.8,
        };
        break;

      default:
        vitaminFactors = {
          vitaminA: 0.8,
          vitaminC: 0.5,
          vitaminD: 0.9,
          vitaminE: 0.75,
          vitaminK: 0.8,
          thiamin: 0.7,
          riboflavin: 0.75,
          niacin: 0.85,
          vitaminB6: 0.7,
          folate: 0.6,
          vitaminB12: 0.8,
        };
    }

    return { ...baseFactors, ...vitaminFactors };
  }

  /**
   * Apply nutrient transformations considering retention factors and cooking additions
   */
  private applyNutrientTransformations(
    rawNutrients: NutrientContent,
    retentionFactors: { [nutrient: string]: number },
    cookingParams: CookingParameters,
    yieldFactor: number,
  ): NutrientContent {
    const transformed = { ...rawNutrients };

    // Apply retention factors to each nutrient
    Object.keys(retentionFactors).forEach((nutrient) => {
      if (transformed[nutrient] !== undefined) {
        transformed[nutrient] = (transformed[nutrient] || 0) * retentionFactors[nutrient];
      }
    });

    // Adjust for weight changes (concentrating/diluting effect)
    // Most nutrients get concentrated as water is lost, diluted as water/fat is added
    const concentrationFactor = 1 / yieldFactor;

    Object.keys(transformed).forEach((nutrient) => {
      if (transformed[nutrient] !== undefined) {
        transformed[nutrient] = (transformed[nutrient] || 0) * concentrationFactor;
      }
    });

    // Handle cooking additions
    if (cookingParams.addedFat && cookingParams.addedFat > 0) {
      // Add calories and fat from cooking oil (assuming 884 kcal/100g for oil)
      // Convert to per 100g of cooked product
      const fatCaloriesPer100g = (cookingParams.addedFat * 884) / yieldFactor;
      const fatPer100g = (cookingParams.addedFat * 100) / yieldFactor;
      transformed.energy += fatCaloriesPer100g;
      transformed.fat += fatPer100g;
    }

    if (cookingParams.addedSalt && cookingParams.addedSalt > 0) {
      // Add sodium from salt (salt is ~40% sodium)
      // Convert grams of salt added to mg of sodium per 100g of cooked food
      const addedSodiumMg = (cookingParams.addedSalt * 0.4 * 1000) / yieldFactor; // mg per 100g cooked weight
      transformed.sodium = (transformed.sodium || 0) + addedSodiumMg;
    }

    return transformed;
  }

  /**
   * Get time adjustment factor for yield calculation
   */
  private getTimeAdjustment(cookingTime: number, method: CookingMethod): number {
    const category = getCookingMethodCategory(method);

    // Longer cooking generally means more moisture loss
    const baseTime = this.getBaseTimeForMethod(method);
    const ratio = cookingTime / baseTime;

    switch (category) {
      case CookingMethodCategory.WET_HEAT:
        // Linear relationship for wet heat methods
        return Math.max(0.5, 1.0 - (ratio - 1) * 0.1);
      case CookingMethodCategory.DRY_HEAT:
        // More dramatic effect for dry heat
        return Math.max(0.3, 1.0 - (ratio - 1) * 0.15);
      case CookingMethodCategory.FAT_BASED:
        // Less effect since fat protects from moisture loss
        return Math.max(0.7, 1.0 - (ratio - 1) * 0.05);
      default:
        return 1.0;
    }
  }

  /**
   * Get temperature adjustment factor for yield calculation
   */
  private getTemperatureAdjustment(temperature: number, method: CookingMethod): number {
    const baseTemp = this.getBaseTemperatureForMethod(method);
    const ratio = temperature / baseTemp;

    // Higher temperatures generally mean more moisture loss
    return Math.max(0.5, 1.0 - (ratio - 1) * 0.1);
  }

  /**
   * Get base cooking time for different methods (in minutes)
   */
  private getBaseTimeForMethod(method: CookingMethod): number {
    switch (method) {
      case CookingMethod.BOILED:
      case CookingMethod.STEAMED:
        return 15;
      case CookingMethod.PRESSURE_COOKED:
        return 10;
      case CookingMethod.BAKED:
      case CookingMethod.ROASTED:
        return 30;
      case CookingMethod.GRILLED:
      case CookingMethod.BROILED:
        return 10;
      case CookingMethod.FRIED:
      case CookingMethod.SAUTEED:
        return 5;
      case CookingMethod.STIR_FRIED:
        return 3;
      case CookingMethod.MICROWAVE:
        return 5;
      default:
        return 15;
    }
  }

  /**
   * Get base temperature for different methods (in celsius)
   */
  private getBaseTemperatureForMethod(method: CookingMethod): number {
    switch (method) {
      case CookingMethod.BOILED:
      case CookingMethod.STEAMED:
      case CookingMethod.PRESSURE_COOKED:
        return 100;
      case CookingMethod.BAKED:
      case CookingMethod.ROASTED:
        return 180;
      case CookingMethod.GRILLED:
      case CookingMethod.BROILED:
        return 220;
      case CookingMethod.FRIED:
      case CookingMethod.DEEP_FRIED:
        return 180;
      case CookingMethod.SAUTEED:
      case CookingMethod.STIR_FRIED:
        return 150;
      case CookingMethod.AIR_FRIED:
        return 200;
      default:
        return 150;
    }
  }
}
