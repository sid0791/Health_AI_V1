import { Injectable, Logger } from '@nestjs/common';

/**
 * Glycemic Index value with metadata
 */
export interface GlycemicIndexData {
  gi: number; // 0-100+ scale
  source: string; // 'sydney_university' | 'ifct' | 'estimated'
  testMethod: 'glucose' | 'white_bread'; // Reference food used
  foodDescription: string;
  portionSize?: number; // grams tested
  lastUpdated: Date;
}

/**
 * Glycemic Load calculation result
 */
export interface GlycemicLoadResult {
  gl: number; // Glycemic load value
  gi: number; // Glycemic index used
  availableCarbs: number; // Available carbohydrates (g)
  portionSize: number; // Portion size (g)
  category: 'low' | 'medium' | 'high'; // GL category
  source: string; // Source of GI data
}

/**
 * Food composition data for GI/GL estimation
 */
export interface FoodComposition {
  totalCarbohydrates: number; // g per 100g
  fiber: number; // g per 100g
  sugar: number; // g per 100g
  starch: number; // g per 100g
  protein: number; // g per 100g
  fat: number; // g per 100g
  processingLevel: 'minimal' | 'processed' | 'highly_processed';
  foodForm: 'liquid' | 'solid' | 'gel';
  preparationMethod?: string;
}

/**
 * Meal composition for mixed food GI/GL calculation
 */
export interface MealComposition {
  foods: Array<{
    foodId: string;
    weight: number; // grams
    composition: FoodComposition;
    gi?: number; // Known GI if available
  }>;
  totalWeight: number; // grams
  totalCarbohydrates: number; // grams
}

/**
 * Service for calculating Glycemic Index and Glycemic Load
 * Includes estimation models for unmapped foods
 */
@Injectable()
export class GlycemicIndexService {
  private readonly logger = new Logger(GlycemicIndexService.name);

  // Common GI values for reference foods (glucose = 100)
  private readonly referenceGI = {
    glucose: 100,
    whiteBread: 75,
    whiteRice: 73,
    potato: 78,
  };

  /**
   * Calculate Glycemic Load for a food item
   */
  calculateGlycemicLoad(
    gi: number,
    availableCarbohydrates: number, // grams of available carbs in portion
    portionSize: number, // grams
    source: string = 'calculated',
  ): GlycemicLoadResult {
    // GL = (GI × Available Carbs) / 100
    const gl = (gi * availableCarbohydrates) / 100;

    const category = this.categorizeGlycemicLoad(gl);

    return {
      gl: Math.round(gl * 10) / 10, // Round to 1 decimal
      gi,
      availableCarbs: availableCarbohydrates,
      portionSize,
      category,
      source,
    };
  }

  /**
   * Estimate GI for foods without known GI values
   * Based on food composition and processing level
   */
  estimateGlycemicIndex(composition: FoodComposition, foodCategory?: string): GlycemicIndexData {
    this.logger.debug('Estimating GI for food based on composition');

    // Calculate available carbohydrates (total carbs - fiber)
    const availableCarbs = Math.max(0, composition.totalCarbohydrates - composition.fiber);

    if (availableCarbs < 0.5) {
      // Very low carb foods have minimal glycemic impact
      return {
        gi: 0,
        source: 'estimated',
        testMethod: 'glucose',
        foodDescription: 'Low carbohydrate food',
        lastUpdated: new Date(),
      };
    }

    let baseGI = 50; // Start with medium GI

    // Adjust based on fiber content
    const fiberRatio = composition.fiber / composition.totalCarbohydrates;
    baseGI -= fiberRatio * 30; // High fiber reduces GI

    // Adjust based on protein content
    const proteinRatio =
      composition.protein /
      (composition.totalCarbohydrates + composition.protein + composition.fat);
    baseGI -= proteinRatio * 20; // Protein reduces GI

    // Adjust based on fat content
    const fatRatio =
      composition.fat / (composition.totalCarbohydrates + composition.protein + composition.fat);
    baseGI -= fatRatio * 15; // Fat slightly reduces GI

    // Adjust based on sugar vs starch ratio
    const sugarRatio = composition.sugar / availableCarbs;
    if (sugarRatio > 0.5) {
      baseGI += 10; // High sugar content increases GI
    }

    // Adjust based on processing level
    switch (composition.processingLevel) {
      case 'minimal':
        baseGI -= 10; // Whole foods tend to have lower GI
        break;
      case 'processed':
        baseGI += 5; // Processed foods slightly higher
        break;
      case 'highly_processed':
        baseGI += 15; // Highly processed foods much higher
        break;
    }

    // Adjust based on food form
    switch (composition.foodForm) {
      case 'liquid':
        baseGI += 15; // Liquids are absorbed faster
        break;
      case 'gel':
        baseGI += 5; // Gels absorbed faster than solids
        break;
      case 'solid':
        // No adjustment for solid foods
        break;
    }

    // Category-specific adjustments
    if (foodCategory) {
      baseGI = this.applyCategorySpecificAdjustments(baseGI, foodCategory, composition);
    }

    // Ensure GI is within reasonable bounds
    const finalGI = Math.max(0, Math.min(150, Math.round(baseGI)));

    return {
      gi: finalGI,
      source: 'estimated',
      testMethod: 'glucose',
      foodDescription: `Estimated based on composition`,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate mixed meal GI based on individual food GIs and carb contributions
   */
  calculateMealGlycemicIndex(meal: MealComposition): GlycemicLoadResult {
    this.logger.debug('Calculating meal GI/GL for mixed foods');

    let totalGIWeighted = 0;
    let totalCarbs = 0;
    let totalGL = 0;

    for (const food of meal.foods) {
      const availableCarbs = Math.max(
        0,
        food.composition.totalCarbohydrates - food.composition.fiber,
      );
      const foodCarbs = (availableCarbs * food.weight) / 100; // Carbs in this portion

      let foodGI = food.gi;
      if (!foodGI) {
        // Estimate GI if not provided
        const estimatedGI = this.estimateGlycemicIndex(food.composition);
        foodGI = estimatedGI.gi;
      }

      // Weight GI by carbohydrate contribution
      totalGIWeighted += foodGI * foodCarbs;
      totalCarbs += foodCarbs;

      // Add to total GL
      totalGL += (foodGI * foodCarbs) / 100;
    }

    const mealGI = totalCarbs > 0 ? totalGIWeighted / totalCarbs : 0;

    return {
      gl: Math.round(totalGL * 10) / 10,
      gi: Math.round(mealGI),
      availableCarbs: totalCarbs,
      portionSize: meal.totalWeight,
      category: this.categorizeGlycemicLoad(totalGL),
      source: 'calculated_meal',
    };
  }

  /**
   * Get GI modification factors for cooking methods
   * Different cooking methods can significantly affect GI
   */
  getGICookingModificationFactor(cookingMethod: string, foodType: string): number {
    // Base cooking method effects on GI
    const cookingEffects = {
      raw: 1.0,
      boiled: 1.1, // Breaks down starches, increases GI
      steamed: 1.05, // Gentle cooking, minimal effect
      pressure_cooked: 1.15, // High pressure breaks down starches more
      baked: 1.0, // Depends on food type
      roasted: 0.95, // Browning can create resistant starches
      fried: 1.1, // High heat and oil can increase GI
      grilled: 0.95, // High heat but short time
      microwave: 1.05, // Similar to steaming
    };

    // Food-type specific adjustments
    const foodSpecificAdjustments = {
      potato: {
        boiled: 1.2, // Potatoes have dramatic GI changes when cooked
        baked: 1.1,
        fried: 1.3,
        roasted: 1.05,
      },
      rice: {
        boiled: 1.1,
        pressure_cooked: 1.2,
        fried: 1.15,
      },
      pasta: {
        boiled: 1.0, // Al dente pasta has lower GI
        overcooked: 1.3, // Overcooked pasta has much higher GI
      },
    };

    let baseFactor = cookingEffects[cookingMethod] || 1.0;

    // Apply food-specific adjustments
    if (foodSpecificAdjustments[foodType] && foodSpecificAdjustments[foodType][cookingMethod]) {
      baseFactor = foodSpecificAdjustments[foodType][cookingMethod];
    }

    return baseFactor;
  }

  /**
   * Categorize Glycemic Load value
   */
  private categorizeGlycemicLoad(gl: number): 'low' | 'medium' | 'high' {
    if (gl <= 10) {
      return 'low';
    } else if (gl <= 19) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Apply category-specific adjustments to estimated GI
   */
  private applyCategorySpecificAdjustments(
    baseGI: number,
    category: string,
    composition: FoodComposition,
  ): number {
    switch (category.toLowerCase()) {
      case 'grains':
      case 'cereals':
        // Whole grains vs refined grains
        if (composition.fiber > 3) {
          return baseGI - 15; // Whole grains
        } else {
          return baseGI + 10; // Refined grains
        }

      case 'fruits':
        // Fresh fruits generally have moderate GI due to fiber and water content
        return baseGI - 5;

      case 'vegetables':
        // Most vegetables have low GI due to high fiber and water
        return Math.min(baseGI, 30);

      case 'legumes':
        // Legumes generally have low GI due to high fiber and protein
        return Math.min(baseGI - 20, 35);

      case 'dairy':
        // Dairy products generally have low GI due to protein and fat
        return Math.min(baseGI - 15, 40);

      case 'tubers':
      case 'potatoes':
        // Root vegetables can have high GI
        return baseGI + 10;

      case 'beverages':
        // Liquid carbohydrates are absorbed quickly
        return baseGI + 20;

      case 'snacks':
      case 'confectionery':
        // Processed snacks often have high GI
        return baseGI + 15;

      default:
        return baseGI;
    }
  }

  /**
   * Get common GI values for major Indian foods
   * Based on IFCT and international databases
   */
  getCommonIndianFoodGI(): { [foodName: string]: GlycemicIndexData } {
    return {
      basmati_rice_cooked: {
        gi: 58,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Basmati rice, white, boiled',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      chapati_wheat: {
        gi: 62,
        source: 'ifct',
        testMethod: 'glucose',
        foodDescription: 'Chapati, wheat flour',
        portionSize: 50,
        lastUpdated: new Date('2023-01-01'),
      },
      parboiled_rice: {
        gi: 47,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Rice, parboiled, boiled',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      brown_rice: {
        gi: 50,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Rice, brown, steamed',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      bajra_pearl_millet: {
        gi: 55,
        source: 'estimated',
        testMethod: 'glucose',
        foodDescription: 'Pearl millet (bajra), cooked',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      jowar_sorghum: {
        gi: 62,
        source: 'estimated',
        testMethod: 'glucose',
        foodDescription: 'Sorghum (jowar), cooked',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      chickpeas_boiled: {
        gi: 28,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Chickpeas, boiled',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      lentils_red: {
        gi: 26,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Lentils, red, boiled',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      potato_boiled: {
        gi: 78,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Potato, boiled',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
      sweet_potato_boiled: {
        gi: 54,
        source: 'sydney_university',
        testMethod: 'glucose',
        foodDescription: 'Sweet potato, boiled',
        portionSize: 150,
        lastUpdated: new Date('2023-01-01'),
      },
    };
  }
}
