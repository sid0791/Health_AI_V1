import { Injectable, Logger } from '@nestjs/common';
import { Recipe } from '../entities/recipe.entity';
import { RecipeNutrition, NutrientType } from '../entities/recipe-nutrition.entity';
import { EnhancedNutritionService, EnhancedRecipe, EnhancedIngredient } from '../../nutrition/services/enhanced-nutrition.service';
import { DataSource } from 'typeorm';

export interface RecipeNutritionSummary {
  caloriesPerServing: number;
  macronutrients: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  micronutrients: RecipeNutrition[];
  glycemicInfo: {
    giValue: number;
    glValue: number;
    carbsPerServing: number;
  };
  healthMetrics: {
    isHighProtein: boolean;
    isLowCalorie: boolean;
    isDiabeticFriendly: boolean;
    isHeartHealthy: boolean;
  };
  warnings: string[];
}

@Injectable()
export class RecipeNutritionService {
  private readonly logger = new Logger(RecipeNutritionService.name);

  constructor(
    private readonly enhancedNutritionService: EnhancedNutritionService,
    private readonly dataSource: DataSource,
  ) {}

  async calculateAndStoreNutrition(recipe: Recipe): Promise<RecipeNutritionSummary> {
    this.logger.debug(`Calculating nutrition for recipe: ${recipe.id}`);

    try {
      // Convert Recipe entity to EnhancedRecipe format
      const enhancedRecipe = this.convertToEnhancedRecipe(recipe);

      // Calculate comprehensive nutrition using Phase 3 engines
      const nutritionAnalysis = await this.enhancedNutritionService.analyzeRecipe(enhancedRecipe);

      // Extract key metrics
      const summary = this.extractNutritionSummary(nutritionAnalysis, recipe.servingsCount);

      // Store nutrition data in database
      await this.storeNutritionData(recipe.id, nutritionAnalysis, summary);

      // Update recipe with calculated values
      await this.updateRecipeNutritionFields(recipe.id, summary);

      this.logger.debug(`Nutrition calculation completed for recipe: ${recipe.id}`);
      return summary;

    } catch (error) {
      this.logger.error(`Failed to calculate nutrition for recipe ${recipe.id}: ${error.message}`);
      throw new Error(`Nutrition calculation failed: ${error.message}`);
    }
  }

  async recalculateNutrition(recipeId: string): Promise<RecipeNutritionSummary> {
    // Get fresh recipe data
    const recipeRepository = this.dataSource.getRepository(Recipe);
    const recipe = await recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['ingredients', 'steps'],
    });

    if (!recipe) {
      throw new Error(`Recipe with ID ${recipeId} not found`);
    }

    // Clear existing nutrition data
    await this.clearExistingNutritionData(recipeId);

    return this.calculateAndStoreNutrition(recipe);
  }

  async getNutritionSummary(recipeId: string): Promise<RecipeNutritionSummary | null> {
    const recipeRepository = this.dataSource.getRepository(Recipe);
    const recipe = await recipeRepository.findOne({
      where: { id: recipeId },
      relations: ['nutrition'],
    });

    if (!recipe || !recipe.nutrition?.length) {
      return null;
    }

    // Reconstruct summary from stored data
    return this.reconstructSummaryFromStored(recipe);
  }

  async batchCalculateNutrition(recipeIds: string[]): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const recipeId of recipeIds) {
      try {
        await this.recalculateNutrition(recipeId);
        successful.push(recipeId);
      } catch (error) {
        this.logger.warn(`Batch nutrition calculation failed for recipe ${recipeId}: ${error.message}`);
        failed.push(recipeId);
      }
    }

    this.logger.debug(`Batch nutrition calculation: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  private convertToEnhancedRecipe(recipe: Recipe): EnhancedRecipe {
    const enhancedIngredients: EnhancedIngredient[] = recipe.ingredients.map((ingredient, index) => ({
      foodId: ingredient.usdaFoodId || ingredient.ifctFoodId || `ingredient_${index}`,
      name: ingredient.ingredientName,
      rawWeight: ingredient.quantity * this.getGramConversionFactor(ingredient.unit),
      rawNutrients: {
        energy: ingredient.caloriesPerUnit || 0,
        protein: ingredient.proteinGrams || 0,
        carbohydrates: ingredient.carbsGrams || 0,
        fat: ingredient.fatGrams || 0,
        fiber: ingredient.fiberGrams || 0,
        sugar: 0, // Default value
        // Add default values for other nutrients
        calcium: 0,
        iron: 0,
        magnesium: 0,
        phosphorus: 0,
        potassium: 0,
        sodium: 0,
        zinc: 0,
        vitaminA: 0,
        vitaminC: 0,
        vitaminD: 0,
        vitaminE: 0,
        vitaminK: 0,
        thiamin: 0,
        riboflavin: 0,
        niacin: 0,
        vitaminB6: 0,
        folate: 0,
        vitaminB12: 0,
        copper: 0,
        manganese: 0,
        selenium: 0,
        iodine: 0,
      },
      cookingParams: this.getCookingParamsFromSteps(recipe.steps),
      foodComposition: {
        totalCarbohydrates: ingredient.carbsGrams || 0,
        fiber: ingredient.fiberGrams || 0,
        sugar: 0,
        starch: Math.max(0, (ingredient.carbsGrams || 0) - (ingredient.fiberGrams || 0)),
        protein: ingredient.proteinGrams || 0,
        fat: ingredient.fatGrams || 0,
        processingLevel: 'minimal',
        foodForm: 'solid',
      },
    }));

    return {
      recipeId: recipe.id,
      name: recipe.name,
      servings: recipe.servingsCount,
      ingredients: enhancedIngredients,
      instructions: recipe.steps?.map(step => step.instruction) || [],
      totalCookingTime: recipe.cookTimeMinutes,
      difficulty: recipe.difficultyLevel as 'easy' | 'medium' | 'hard',
    };
  }

  private getGramConversionFactor(unit: string): number {
    // Simple unit conversion to grams
    // In production, this should be a comprehensive unit conversion service
    const conversions: Record<string, number> = {
      'g': 1,
      'gram': 1,
      'grams': 1,
      'kg': 1000,
      'kilogram': 1000,
      'lb': 453.592,
      'pound': 453.592,
      'oz': 28.3495,
      'ounce': 28.3495,
      'ml': 1, // Approximate for water-like liquids
      'liter': 1000,
      'l': 1000,
      'cup': 240, // Approximate
      'tbsp': 15,
      'tablespoon': 15,
      'tsp': 5,
      'teaspoon': 5,
      'piece': 100, // Default estimate
      'pcs': 100,
      'small': 50,
      'medium': 100,
      'large': 150,
    };
    
    return conversions[unit.toLowerCase()] || 100; // Default to 100g if unknown
  }

  private getCookingParamsFromSteps(steps?: any[]): any {
    if (!steps || steps.length === 0) return undefined;

    // Extract cooking parameters from recipe steps
    const cookingStep = steps.find(step => step.cookingMethod);
    if (!cookingStep) return undefined;

    return {
      method: cookingStep.cookingMethod,
      temperature: cookingStep.temperatureCelsius,
      time: cookingStep.durationMinutes,
      addedFat: 0, // Could be extracted from ingredients
      addedSalt: 0, // Could be extracted from ingredients
    };
  }

  private extractNutritionSummary(
    nutritionAnalysis: any,
    servingsCount: number,
  ): RecipeNutritionSummary {
    const cooked = nutritionAnalysis.cookedTotalNutrients;
    const caloriesPerServing = (cooked.calories || 0) / servingsCount;

    const macronutrients = {
      protein: (cooked.protein || 0) / servingsCount,
      carbohydrates: (cooked.carbohydrates || 0) / servingsCount,
      fat: (cooked.fat || 0) / servingsCount,
      fiber: (cooked.fiber || 0) / servingsCount,
    };

    const glycemicInfo = {
      giValue: nutritionAnalysis.glycemicIndex || 0,
      glValue: nutritionAnalysis.glycemicLoad || 0,
      carbsPerServing: macronutrients.carbohydrates,
    };

    const healthMetrics = {
      isHighProtein: macronutrients.protein >= 20, // 20g+ protein per serving
      isLowCalorie: caloriesPerServing <= 300,
      isDiabeticFriendly: glycemicInfo.glValue <= 10,
      isHeartHealthy: this.calculateHeartHealthScore(macronutrients, cooked) >= 0.7,
    };

    const warnings: string[] = [];

    // Add warnings based on nutritional analysis
    if (caloriesPerServing > 800) {
      warnings.push('High calorie content');
    }
    if (glycemicInfo.glValue > 20) {
      warnings.push('High glycemic load - may affect blood sugar');
    }
    if ((cooked.sodium || 0) / servingsCount > 800) {
      warnings.push('High sodium content');
    }

    return {
      caloriesPerServing,
      macronutrients,
      micronutrients: [], // Will be populated from detailed analysis
      glycemicInfo,
      healthMetrics,
      warnings,
    };
  }

  private calculateHeartHealthScore(macronutrients: any, totalNutrients: any): number {
    let score = 0.5; // Base score

    // Positive factors
    if (macronutrients.fiber >= 5) score += 0.2; // High fiber
    if ((totalNutrients.saturatedFat || 0) / totalNutrients.fat < 0.3) score += 0.1; // Low saturated fat ratio
    if (totalNutrients.omega3 > 0) score += 0.1; // Contains omega-3

    // Negative factors
    if (totalNutrients.trans_fat > 0) score -= 0.3; // Trans fat present
    if (totalNutrients.sodium > 1000) score -= 0.1; // High sodium

    return Math.max(0, Math.min(1, score));
  }

  private async storeNutritionData(
    recipeId: string,
    nutritionAnalysis: any,
    summary: RecipeNutritionSummary,
  ): Promise<void> {
    const nutritionRepository = this.dataSource.getRepository(RecipeNutrition);

    const nutritionEntries: Partial<RecipeNutrition>[] = [];

    // Store macronutrients
    const macros = [
      { name: 'calories', amount: summary.caloriesPerServing, unit: 'kcal', type: NutrientType.MACRO },
      { name: 'protein', amount: summary.macronutrients.protein, unit: 'g', type: NutrientType.MACRO },
      { name: 'carbohydrates', amount: summary.macronutrients.carbohydrates, unit: 'g', type: NutrientType.MACRO },
      { name: 'fat', amount: summary.macronutrients.fat, unit: 'g', type: NutrientType.MACRO },
      { name: 'fiber', amount: summary.macronutrients.fiber, unit: 'g', type: NutrientType.MACRO },
    ];

    macros.forEach(macro => {
      nutritionEntries.push({
        recipeId,
        nutrientName: macro.name,
        nutrientType: macro.type,
        amountPerServing: macro.amount,
        unit: macro.unit,
        dataSource: 'calculated',
        confidenceScore: 0.9,
        isEssential: macro.name === 'protein' || macro.name === 'fiber',
      });
    });

    // Store micronutrients from detailed analysis
    const cookedNutrients = nutritionAnalysis.cookedTotalNutrients;
    const micronutrients = [
      { name: 'vitamin_c', type: NutrientType.VITAMIN, unit: 'mg' },
      { name: 'vitamin_d', type: NutrientType.VITAMIN, unit: 'ug' },
      { name: 'vitamin_b12', type: NutrientType.VITAMIN, unit: 'ug' },
      { name: 'folate', type: NutrientType.VITAMIN, unit: 'ug' },
      { name: 'iron', type: NutrientType.MINERAL, unit: 'mg' },
      { name: 'calcium', type: NutrientType.MINERAL, unit: 'mg' },
      { name: 'magnesium', type: NutrientType.MINERAL, unit: 'mg' },
      { name: 'potassium', type: NutrientType.MINERAL, unit: 'mg' },
      { name: 'sodium', type: NutrientType.MINERAL, unit: 'mg' },
      { name: 'zinc', type: NutrientType.MINERAL, unit: 'mg' },
    ];

    micronutrients.forEach(nutrient => {
      const amount = cookedNutrients[nutrient.name] || 0;
      if (amount > 0) {
        nutritionEntries.push({
          recipeId,
          nutrientName: nutrient.name,
          nutrientType: nutrient.type,
          amountPerServing: amount,
          unit: nutrient.unit,
          dataSource: 'calculated',
          confidenceScore: 0.8,
          isEssential: ['iron', 'calcium', 'vitamin_c', 'vitamin_d'].includes(nutrient.name),
        });
      }
    });

    // Bulk insert nutrition data
    if (nutritionEntries.length > 0) {
      await nutritionRepository.save(nutritionEntries);
    }
  }

  private async updateRecipeNutritionFields(
    recipeId: string,
    summary: RecipeNutritionSummary,
  ): Promise<void> {
    const recipeRepository = this.dataSource.getRepository(Recipe);
    
    await recipeRepository.update(recipeId, {
      caloriesPerServing: summary.caloriesPerServing,
      giValue: summary.glycemicInfo.giValue,
      glValue: summary.glycemicInfo.glValue,
      isHighProtein: summary.healthMetrics.isHighProtein,
      isLowCalorie: summary.healthMetrics.isLowCalorie,
      isDiabeticFriendly: summary.healthMetrics.isDiabeticFriendly,
    });
  }

  private async clearExistingNutritionData(recipeId: string): Promise<void> {
    const nutritionRepository = this.dataSource.getRepository(RecipeNutrition);
    await nutritionRepository.delete({ recipeId });
  }

  private reconstructSummaryFromStored(recipe: Recipe): RecipeNutritionSummary {
    const nutritionMap = new Map<string, RecipeNutrition>();
    recipe.nutrition.forEach(n => nutritionMap.set(n.nutrientName, n));

    const macronutrients = {
      protein: nutritionMap.get('protein')?.amountPerServing || 0,
      carbohydrates: nutritionMap.get('carbohydrates')?.amountPerServing || 0,
      fat: nutritionMap.get('fat')?.amountPerServing || 0,
      fiber: nutritionMap.get('fiber')?.amountPerServing || 0,
    };

    const micronutrients = recipe.nutrition.filter(n => 
      n.nutrientType === NutrientType.VITAMIN || n.nutrientType === NutrientType.MINERAL
    );

    return {
      caloriesPerServing: recipe.caloriesPerServing || 0,
      macronutrients,
      micronutrients,
      glycemicInfo: {
        giValue: recipe.giValue || 0,
        glValue: recipe.glValue || 0,
        carbsPerServing: macronutrients.carbohydrates,
      },
      healthMetrics: {
        isHighProtein: recipe.isHighProtein,
        isLowCalorie: recipe.isLowCalorie,
        isDiabeticFriendly: recipe.isDiabeticFriendly,
        isHeartHealthy: false, // Would need to recalculate
      },
      warnings: [],
    };
  }
}