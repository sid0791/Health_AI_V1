import { Injectable, Logger } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { RECIPE_SEED_DATA, RECIPE_CATEGORIES, getRecipesByCategory } from '../data/recipe-seed-data';

@Injectable()
export class RecipeSeedingService {
  private readonly logger = new Logger(RecipeSeedingService.name);

  constructor(private readonly recipeService: RecipeService) {}

  /**
   * Seed the database with curated healthy recipes
   */
  async seedRecipes(): Promise<{ success: number; failed: number; warnings: string[] }> {
    this.logger.log('Starting recipe seeding process...');

    try {
      const result = await this.recipeService.bulkCreateRecipes(RECIPE_SEED_DATA);
      
      this.logger.log(`Successfully seeded ${result.length} recipes`);
      
      // Log seeding summary
      this.logSeedingSummary(result);

      return {
        success: result.length,
        failed: RECIPE_SEED_DATA.length - result.length,
        warnings: [],
      };

    } catch (error) {
      this.logger.error(`Recipe seeding failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Seed recipes by specific category
   */
  async seedRecipesByCategory(category: string): Promise<any[]> {
    this.logger.log(`Seeding recipes for category: ${category}`);
    
    const categoryRecipes = getRecipesByCategory(category);
    
    if (categoryRecipes.length === 0) {
      this.logger.warn(`No recipes found for category: ${category}`);
      return [];
    }

    const result = await this.recipeService.bulkCreateRecipes(categoryRecipes);
    this.logger.log(`Seeded ${result.length} recipes for category: ${category}`);
    
    return result;
  }

  /**
   * Get seeding statistics
   */
  async getSeedingStats(): Promise<{
    totalRecipes: number;
    categoryCounts: Record<string, number>;
    cuisineCounts: Record<string, number>;
    dietTypeCounts: Record<string, number>;
    healthFriendlyCounts: Record<string, number>;
  }> {
    const stats = {
      totalRecipes: RECIPE_SEED_DATA.length,
      categoryCounts: {} as Record<string, number>,
      cuisineCounts: {} as Record<string, number>,
      dietTypeCounts: {} as Record<string, number>,
      healthFriendlyCounts: {
        diabeticFriendly: 0,
        pcosFriendly: 0,
        highProtein: 0,
        lowCalorie: 0,
        glutenFree: 0,
      },
    };

    // Count by categories
    Object.values(RECIPE_CATEGORIES).forEach(category => {
      stats.categoryCounts[category] = getRecipesByCategory(category).length;
    });

    // Count by cuisine
    RECIPE_SEED_DATA.forEach(recipe => {
      stats.cuisineCounts[recipe.cuisine] = (stats.cuisineCounts[recipe.cuisine] || 0) + 1;
    });

    // Count by diet types
    RECIPE_SEED_DATA.forEach(recipe => {
      recipe.dietType.forEach(dietType => {
        stats.dietTypeCounts[dietType] = (stats.dietTypeCounts[dietType] || 0) + 1;
      });
    });

    // Count health-friendly recipes
    RECIPE_SEED_DATA.forEach(recipe => {
      if (recipe.isDiabeticFriendly) stats.healthFriendlyCounts.diabeticFriendly++;
      if (recipe.isPcosFriendly) stats.healthFriendlyCounts.pcosFriendly++;
      if (recipe.isHighProtein) stats.healthFriendlyCounts.highProtein++;
      if (recipe.isLowCalorie) stats.healthFriendlyCounts.lowCalorie++;
      if (recipe.isGlutenFree) stats.healthFriendlyCounts.glutenFree++;
    });

    return stats;
  }

  /**
   * Validate seeded data integrity
   */
  async validateSeedData(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for required fields
    RECIPE_SEED_DATA.forEach((recipe, index) => {
      if (!recipe.name) issues.push(`Recipe ${index}: Missing name`);
      if (!recipe.cuisine) issues.push(`Recipe ${index}: Missing cuisine`);
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        issues.push(`Recipe ${index} (${recipe.name}): No ingredients`);
      }
      if (!recipe.steps || recipe.steps.length === 0) {
        issues.push(`Recipe ${index} (${recipe.name}): No steps`);
      }
    });

    // Check for reasonable values
    RECIPE_SEED_DATA.forEach((recipe, index) => {
      if (recipe.prepTimeMinutes < 0 || recipe.prepTimeMinutes > 300) {
        issues.push(`Recipe ${index} (${recipe.name}): Unreasonable prep time`);
      }
      if (recipe.cookTimeMinutes < 0 || recipe.cookTimeMinutes > 480) {
        issues.push(`Recipe ${index} (${recipe.name}): Unreasonable cook time`);
      }
      if (recipe.servingsCount < 1 || recipe.servingsCount > 20) {
        issues.push(`Recipe ${index} (${recipe.name}): Unreasonable serving count`);
      }
    });

    // Check ingredient data
    RECIPE_SEED_DATA.forEach((recipe, index) => {
      recipe.ingredients.forEach((ingredient, ingIndex) => {
        if (ingredient.quantity <= 0) {
          issues.push(`Recipe ${index} (${recipe.name}), Ingredient ${ingIndex}: Invalid quantity`);
        }
        if (!ingredient.unit) {
          issues.push(`Recipe ${index} (${recipe.name}), Ingredient ${ingIndex}: Missing unit`);
        }
      });
    });

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Clear all seeded recipes (use with caution)
   */
  async clearSeedData(): Promise<void> {
    this.logger.warn('This functionality should be implemented with extreme caution');
    // Implementation would depend on having a way to identify seeded vs user-created recipes
    // Could use the dataSource field to identify internally seeded recipes
  }

  private logSeedingSummary(recipes: any[]): void {
    const summary = {
      total: recipes.length,
      byCuisine: {} as Record<string, number>,
      byDietType: {} as Record<string, number>,
      healthFriendly: {
        diabetic: 0,
        pcos: 0,
        highProtein: 0,
        lowCalorie: 0,
      },
    };

    recipes.forEach(recipe => {
      // Count by cuisine
      summary.byCuisine[recipe.cuisine] = (summary.byCuisine[recipe.cuisine] || 0) + 1;

      // Count health-friendly
      if (recipe.isDiabeticFriendly) summary.healthFriendly.diabetic++;
      if (recipe.isPcosFriendly) summary.healthFriendly.pcos++;
      if (recipe.isHighProtein) summary.healthFriendly.highProtein++;
      if (recipe.isLowCalorie) summary.healthFriendly.lowCalorie++;
    });

    this.logger.log('Seeding Summary:', JSON.stringify(summary, null, 2));
  }

  /**
   * Generate sample personalized recommendations
   */
  async generateSampleRecommendations(): Promise<{
    diabeticFriendly: any[];
    pcosFriendly: any[];
    weightLoss: any[];
    highProtein: any[];
  }> {
    // This would typically query the database, but for demo we'll use the seed data
    return {
      diabeticFriendly: RECIPE_SEED_DATA.filter(r => r.isDiabeticFriendly).slice(0, 3),
      pcosFriendly: RECIPE_SEED_DATA.filter(r => r.isPcosFriendly).slice(0, 3),
      weightLoss: RECIPE_SEED_DATA.filter(r => r.isLowCalorie).slice(0, 3),
      highProtein: RECIPE_SEED_DATA.filter(r => r.isHighProtein).slice(0, 3),
    };
  }
}