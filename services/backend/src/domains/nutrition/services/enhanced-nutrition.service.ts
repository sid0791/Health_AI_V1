import { Injectable, Logger } from '@nestjs/common';
import { NutritionCalculationService, NutritionCalculationInput } from './nutrition-calculation.service';
import { CookingTransformationService, NutrientContent, CookingParameters } from './cooking-transformation.service';
import { GlycemicIndexService, GlycemicLoadResult, FoodComposition } from './glycemic-index.service';
import { CookingMethod } from '../enums/cooking-method.enum';

/**
 * Recipe ingredient with cooking transformations and GI/GL data
 */
export interface EnhancedIngredient {
  foodId: string;
  name: string;
  rawWeight: number; // grams
  rawNutrients: NutrientContent;
  cookingParams?: CookingParameters;
  foodComposition?: FoodComposition;
  knownGI?: number;
}

/**
 * Recipe with complete nutrition analysis including cooking transformations
 */
export interface EnhancedRecipe {
  recipeId: string;
  name: string;
  servings: number;
  ingredients: EnhancedIngredient[];
  instructions: string[];
  totalCookingTime?: number; // minutes
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Complete recipe nutrition analysis result
 */
export interface RecipeNutritionAnalysis {
  // Basic nutrition per serving
  nutritionPerServing: NutrientContent;
  
  // Glycemic data per serving
  glycemicLoad: GlycemicLoadResult;
  
  // Raw vs cooked comparison
  rawTotalNutrients: NutrientContent;
  cookedTotalNutrients: NutrientContent;
  nutritionChangeFromCooking: {
    [nutrient: string]: {
      raw: number;
      cooked: number;
      retentionPercentage: number;
    };
  };
  
  // Weight changes
  totalRawWeight: number;
  totalCookedWeight: number;
  yieldFactor: number;
  
  // Ingredient breakdown
  ingredientAnalysis: Array<{
    ingredient: EnhancedIngredient;
    rawNutrients: NutrientContent;
    cookedNutrients: NutrientContent;
    cookedWeight: number;
    nutritionContribution: number; // percentage of total
  }>;
  
  // Cooking method effects
  cookingMethodImpacts: {
    [method: string]: {
      nutrientLoss: { [nutrient: string]: number };
      weightChange: number;
    };
  };
}

/**
 * Meal plan input for analysis
 */
export interface EnhancedMealPlanInput {
  mealId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipes: EnhancedRecipe[];
  nutritionTargets?: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  };
}

/**
 * Meal plan with complete nutrition and glycemic analysis (result)
 */
export interface EnhancedMealPlan extends EnhancedMealPlanInput {
  totalNutrition: NutrientContent;
  totalGlycemicLoad: GlycemicLoadResult;
  adherenceScore?: number; // 0-100, how well it meets targets
}

/**
 * Enhanced nutrition calculation service that integrates cooking transformations,
 * GI/GL calculations, and comprehensive meal analysis
 */
@Injectable()
export class EnhancedNutritionService {
  private readonly logger = new Logger(EnhancedNutritionService.name);

  constructor(
    private readonly baseNutritionService: NutritionCalculationService,
    private readonly cookingService: CookingTransformationService,
    private readonly glycemicService: GlycemicIndexService,
  ) {}

  /**
   * Analyze complete recipe with cooking transformations and GI/GL
   */
  async analyzeRecipe(recipe: EnhancedRecipe): Promise<RecipeNutritionAnalysis> {
    this.logger.debug(`Analyzing recipe: ${recipe.name} with ${recipe.ingredients.length} ingredients`);

    const ingredientAnalysis: RecipeNutritionAnalysis['ingredientAnalysis'] = [];
    let totalRawNutrients = this.createEmptyNutrientContent();
    let totalCookedNutrients = this.createEmptyNutrientContent();
    let totalRawWeight = 0;
    let totalCookedWeight = 0;
    const cookingMethodImpacts: { [method: string]: any } = {};

    // Analyze each ingredient
    for (const ingredient of recipe.ingredients) {
      const analysis = await this.analyzeIngredient(ingredient);
      ingredientAnalysis.push(analysis);

      // Accumulate totals
      this.addNutrients(totalRawNutrients, analysis.rawNutrients);
      this.addNutrients(totalCookedNutrients, analysis.cookedNutrients);
      totalRawWeight += ingredient.rawWeight;
      totalCookedWeight += analysis.cookedWeight;

      // Track cooking method impacts
      if (ingredient.cookingParams) {
        const method = ingredient.cookingParams.method;
        if (!cookingMethodImpacts[method]) {
          cookingMethodImpacts[method] = {
            nutrientLoss: {},
            weightChange: 0,
          };
        }
        cookingMethodImpacts[method].weightChange += 
          (analysis.cookedWeight - ingredient.rawWeight);
      }
    }

    // Calculate nutrition per serving
    const nutritionPerServing = this.divideNutrients(totalCookedNutrients, recipe.servings);

    // Calculate recipe-level glycemic load
    const glycemicLoad = await this.calculateRecipeGlycemicLoad(recipe, ingredientAnalysis);

    // Calculate nutrition changes from cooking
    const nutritionChangeFromCooking = this.calculateNutritionChanges(
      totalRawNutrients,
      totalCookedNutrients,
    );

    return {
      nutritionPerServing,
      glycemicLoad,
      rawTotalNutrients: totalRawNutrients,
      cookedTotalNutrients: totalCookedNutrients,
      nutritionChangeFromCooking,
      totalRawWeight,
      totalCookedWeight,
      yieldFactor: totalCookedWeight / totalRawWeight,
      ingredientAnalysis,
      cookingMethodImpacts,
    };
  }

  /**
   * Analyze a single ingredient with cooking transformations
   */
  private async analyzeIngredient(
    ingredient: EnhancedIngredient,
  ): Promise<RecipeNutritionAnalysis['ingredientAnalysis'][0]> {
    let cookedNutrients = { ...ingredient.rawNutrients };
    let cookedWeight = ingredient.rawWeight;

    // Apply cooking transformation if specified
    if (ingredient.cookingParams) {
      const transformation = this.cookingService.applyCookingTransformation(
        ingredient.rawNutrients,
        ingredient.rawWeight,
        ingredient.cookingParams,
      );
      cookedNutrients = transformation.transformedNutrients;
      cookedWeight = transformation.cookedWeight;
    }

    // Calculate nutrition contribution percentage
    const totalCalories = Object.values(ingredient.rawNutrients).reduce((sum, val) => sum + (val || 0), 0);
    const nutritionContribution = totalCalories > 0 ? (cookedNutrients.energy / totalCalories) * 100 : 0;

    return {
      ingredient,
      rawNutrients: ingredient.rawNutrients,
      cookedNutrients,
      cookedWeight,
      nutritionContribution,
    };
  }

  /**
   * Calculate glycemic load for entire recipe
   */
  private async calculateRecipeGlycemicLoad(
    recipe: EnhancedRecipe,
    ingredientAnalysis: RecipeNutritionAnalysis['ingredientAnalysis'],
  ): Promise<GlycemicLoadResult> {
    const mealComposition = {
      foods: ingredientAnalysis.map((analysis) => {
        const ingredient = analysis.ingredient;
        return {
          foodId: ingredient.foodId,
          weight: analysis.cookedWeight,
          composition: ingredient.foodComposition || this.createDefaultFoodComposition(analysis.cookedNutrients),
          gi: ingredient.knownGI,
        };
      }),
      totalWeight: ingredientAnalysis.reduce((sum, analysis) => sum + analysis.cookedWeight, 0),
      totalCarbohydrates: ingredientAnalysis.reduce(
        (sum, analysis) => sum + (analysis.cookedNutrients.carbohydrates || 0),
        0,
      ),
    };

    // Calculate per serving
    const servingGL = this.glycemicService.calculateMealGlycemicIndex(mealComposition);
    return {
      ...servingGL,
      gl: servingGL.gl / recipe.servings,
      availableCarbs: servingGL.availableCarbs / recipe.servings,
      portionSize: servingGL.portionSize / recipe.servings,
    };
  }

  /**
   * Calculate comprehensive meal plan with multiple recipes
   */
  async analyzeMealPlan(mealPlan: EnhancedMealPlanInput): Promise<EnhancedMealPlan> {
    this.logger.debug(`Analyzing meal plan with ${mealPlan.recipes.length} recipes`);

    let totalNutrition = this.createEmptyNutrientContent();
    let totalAvailableCarbs = 0;
    let totalWeight = 0;
    let weightedGI = 0;

    // Analyze each recipe
    for (const recipe of mealPlan.recipes) {
      const recipeAnalysis = await this.analyzeRecipe(recipe);
      
      // Add to meal totals
      this.addNutrients(totalNutrition, recipeAnalysis.nutritionPerServing);
      totalAvailableCarbs += recipeAnalysis.glycemicLoad.availableCarbs;
      totalWeight += recipeAnalysis.glycemicLoad.portionSize;
      weightedGI += recipeAnalysis.glycemicLoad.gi * recipeAnalysis.glycemicLoad.availableCarbs;
    }

    // Calculate meal-level glycemic load
    const mealGI = totalAvailableCarbs > 0 ? weightedGI / totalAvailableCarbs : 0;
    const totalGlycemicLoad = this.glycemicService.calculateGlycemicLoad(
      mealGI,
      totalAvailableCarbs,
      totalWeight,
      'calculated_meal',
    );

    // Calculate adherence score if targets are provided
    let adherenceScore: number | undefined;
    if (mealPlan.nutritionTargets) {
      adherenceScore = this.calculateAdherenceScore(totalNutrition, mealPlan.nutritionTargets);
    }

    return {
      ...mealPlan,
      totalNutrition,
      totalGlycemicLoad,
      adherenceScore,
    };
  }

  /**
   * Get cooking recommendations to preserve nutrition
   */
  getCookingRecommendations(ingredients: EnhancedIngredient[]): {
    recommendations: string[];
    alternativeCookingMethods: { [ingredientId: string]: CookingMethod[] };
  } {
    const recommendations: string[] = [];
    const alternativeCookingMethods: { [ingredientId: string]: CookingMethod[] } = {};

    for (const ingredient of ingredients) {
      const alternatives: CookingMethod[] = [];

      // General recommendations
      if (ingredient.rawNutrients.vitaminC && ingredient.rawNutrients.vitaminC > 10) {
        recommendations.push(`${ingredient.name}: Steam or microwave to preserve vitamin C`);
        alternatives.push(CookingMethod.STEAMED, CookingMethod.MICROWAVE);
      }

      if (ingredient.rawNutrients.folate && ingredient.rawNutrients.folate > 20) {
        recommendations.push(`${ingredient.name}: Avoid prolonged boiling to preserve folate`);
        alternatives.push(CookingMethod.STEAMED, CookingMethod.SAUTEED);
      }

      // High-fiber foods
      if (ingredient.rawNutrients.fiber && ingredient.rawNutrients.fiber > 5) {
        recommendations.push(`${ingredient.name}: Light cooking preserves fiber structure`);
        alternatives.push(CookingMethod.STEAMED, CookingMethod.GRILLED);
      }

      alternativeCookingMethods[ingredient.foodId] = alternatives;
    }

    return { recommendations, alternativeCookingMethods };
  }

  /**
   * Optimize recipe for nutritional goals
   */
  optimizeRecipeForGoals(
    recipe: EnhancedRecipe,
    goals: {
      minimizeGI?: boolean;
      maximizeProtein?: boolean;
      minimizeSodium?: boolean;
      preserveVitamins?: boolean;
    },
  ): {
    optimizedRecipe: EnhancedRecipe;
    improvements: string[];
    nutritionImprovement: number; // percentage improvement
  } {
    const improvements: string[] = [];
    const optimizedRecipe = { ...recipe };
    
    // Optimize cooking methods for each ingredient
    optimizedRecipe.ingredients = recipe.ingredients.map(ingredient => {
      const optimized = { ...ingredient };
      
      if (goals.preserveVitamins && ingredient.cookingParams) {
        // Switch to gentler cooking methods
        if (ingredient.cookingParams.method === CookingMethod.BOILED) {
          optimized.cookingParams = {
            ...ingredient.cookingParams,
            method: CookingMethod.STEAMED,
          };
          improvements.push(`Changed ${ingredient.name} from boiling to steaming to preserve vitamins`);
        }
      }

      if (goals.minimizeSodium && ingredient.cookingParams?.addedSalt) {
        optimized.cookingParams = {
          ...ingredient.cookingParams,
          addedSalt: Math.max(0, (ingredient.cookingParams.addedSalt || 0) * 0.5),
        };
        improvements.push(`Reduced salt for ${ingredient.name} by 50%`);
      }

      return optimized;
    });

    // Calculate improvement percentage (simplified)
    const nutritionImprovement = improvements.length * 10; // 10% per improvement

    return {
      optimizedRecipe,
      improvements,
      nutritionImprovement: Math.min(nutritionImprovement, 100),
    };
  }

  // Helper methods

  private createEmptyNutrientContent(): NutrientContent {
    return {
      energy: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      calcium: 0,
      iron: 0,
      magnesium: 0,
      phosphorus: 0,
      potassium: 0,
      sodium: 0,
      zinc: 0,
      vitaminA: 0,
      vitaminC: 0,
      thiamin: 0,
      riboflavin: 0,
      niacin: 0,
      vitaminB6: 0,
      folate: 0,
    };
  }

  private addNutrients(target: NutrientContent, source: NutrientContent): void {
    Object.keys(source).forEach(key => {
      if (typeof source[key] === 'number') {
        target[key] = (target[key] || 0) + (source[key] || 0);
      }
    });
  }

  private divideNutrients(nutrients: NutrientContent, divisor: number): NutrientContent {
    const result = { ...nutrients };
    Object.keys(result).forEach(key => {
      if (typeof result[key] === 'number') {
        result[key] = (result[key] || 0) / divisor;
      }
    });
    return result;
  }

  private calculateNutritionChanges(raw: NutrientContent, cooked: NutrientContent) {
    const changes: { [nutrient: string]: any } = {};
    
    Object.keys(raw).forEach(nutrient => {
      if (typeof raw[nutrient] === 'number') {
        const rawValue = raw[nutrient] || 0;
        const cookedValue = cooked[nutrient] || 0;
        const retention = rawValue > 0 ? (cookedValue / rawValue) * 100 : 100;
        
        changes[nutrient] = {
          raw: rawValue,
          cooked: cookedValue,
          retentionPercentage: Math.round(retention * 10) / 10,
        };
      }
    });
    
    return changes;
  }

  private createDefaultFoodComposition(nutrients: NutrientContent): FoodComposition {
    return {
      totalCarbohydrates: nutrients.carbohydrates || 0,
      fiber: nutrients.fiber || 0,
      sugar: nutrients.sugar || 0,
      starch: Math.max(0, (nutrients.carbohydrates || 0) - (nutrients.fiber || 0) - (nutrients.sugar || 0)),
      protein: nutrients.protein || 0,
      fat: nutrients.fat || 0,
      processingLevel: 'minimal',
      foodForm: 'solid',
    };
  }

  private calculateAdherenceScore(
    actual: NutrientContent,
    targets: { calories: number; protein: number; carbohydrates: number; fat: number },
  ): number {
    const calorieScore = Math.max(0, 100 - Math.abs((actual.energy - targets.calories) / targets.calories) * 100);
    const proteinScore = Math.max(0, 100 - Math.abs((actual.protein - targets.protein) / targets.protein) * 100);
    const carbScore = Math.max(0, 100 - Math.abs((actual.carbohydrates - targets.carbohydrates) / targets.carbohydrates) * 100);
    const fatScore = Math.max(0, 100 - Math.abs((actual.fat - targets.fat) / targets.fat) * 100);

    return Math.round((calorieScore + proteinScore + carbScore + fatScore) / 4);
  }
}