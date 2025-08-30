import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { RecipeRepository, RecipeFilterOptions } from '../repositories/recipe.repository';
import { Recipe } from '../entities/recipe.entity';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { PersonalizationRulesService } from './personalization-rules.service';
import { ContentModerationService } from './content-moderation.service';
import { RecipeNutritionService } from './recipe-nutrition.service';

export interface RecipeCreationResult {
  recipe: Recipe;
  nutritionCalculated: boolean;
  warnings: string[];
}

export interface PersonalizedRecipeOptions {
  userId?: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  healthConditions?: string[];
  preferredCuisines?: string[];
  excludedIngredients?: string[];
  maxCalories?: number;
  maxPrepTime?: number;
}

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly personalizationService: PersonalizationRulesService,
    private readonly contentModerationService: ContentModerationService,
    private readonly recipeNutritionService: RecipeNutritionService,
  ) {}

  async createRecipe(createRecipeDto: CreateRecipeDto): Promise<RecipeCreationResult> {
    this.logger.debug(`Creating recipe: ${createRecipeDto.name}`);
    
    const warnings: string[] = [];

    // Validate and moderate content
    const moderationResult = await this.contentModerationService.validateRecipe(createRecipeDto);
    if (!moderationResult.isValid) {
      throw new BadRequestException(`Recipe validation failed: ${moderationResult.violations.join(', ')}`);
    }
    warnings.push(...moderationResult.warnings);

    // Calculate total time
    const totalTimeMinutes = createRecipeDto.getTotalTimeMinutes();

    // Create recipe with basic data
    const recipeData = {
      name: createRecipeDto.name,
      description: createRecipeDto.description,
      cuisine: createRecipeDto.cuisine,
      dietType: createRecipeDto.dietType,
      mealType: createRecipeDto.mealType,
      difficultyLevel: createRecipeDto.difficultyLevel,
      prepTimeMinutes: createRecipeDto.prepTimeMinutes,
      cookTimeMinutes: createRecipeDto.cookTimeMinutes,
      totalTimeMinutes,
      servingsCount: createRecipeDto.servingsCount,
      isDiabeticFriendly: createRecipeDto.isDiabeticFriendly || false,
      isHypertensionFriendly: createRecipeDto.isHypertensionFriendly || false,
      isPcosFriendly: createRecipeDto.isPcosFriendly || false,
      isFattyLiverFriendly: createRecipeDto.isFattyLiverFriendly || false,
      isHighProtein: createRecipeDto.isHighProtein || false,
      isLowCalorie: createRecipeDto.isLowCalorie || false,
      isGlutenFree: createRecipeDto.isGlutenFree || false,
      isDairyFree: createRecipeDto.isDairyFree || false,
      tags: createRecipeDto.tags,
      allergens: createRecipeDto.allergens,
      imageUrl: createRecipeDto.imageUrl,
      videoUrl: createRecipeDto.videoUrl,
      sourceUrl: createRecipeDto.sourceUrl,
      sourceAttribution: createRecipeDto.sourceAttribution,
      recipeYield: createRecipeDto.recipeYield,
      equipmentNeeded: createRecipeDto.equipmentNeeded,
      isActive: true,
      isVerified: false,
      popularityScore: 0,
      createdBy: createRecipeDto.createdBy,
      dataSource: createRecipeDto.dataSource || 'internal',
      externalId: createRecipeDto.externalId,
      // Relationships will be handled separately
      ingredients: [],
      steps: [],
      nutrition: [],
    };

    // Save recipe
    const recipe = await this.recipeRepository.create(recipeData);
    this.logger.debug(`Recipe created with ID: ${recipe.id}`);

    // Now handle ingredients and steps separately
    if (createRecipeDto.ingredients?.length > 0) {
      // Create ingredients with proper recipe relationship
      // This would typically be handled by the repository or a separate service
      // For now, we'll assume the repository handles cascading saves
    }

    if (createRecipeDto.steps?.length > 0) {
      // Create steps with proper recipe relationship
      // This would typically be handled by the repository or a separate service
    }

    // Calculate nutrition asynchronously
    let nutritionCalculated = false;
    try {
      await this.recipeNutritionService.calculateAndStoreNutrition(recipe);
      nutritionCalculated = true;
      this.logger.debug(`Nutrition calculated for recipe: ${recipe.id}`);
    } catch (error) {
      this.logger.warn(`Failed to calculate nutrition for recipe ${recipe.id}: ${error.message}`);
      warnings.push('Nutrition calculation failed - will be recalculated later');
    }

    return {
      recipe,
      nutritionCalculated,
      warnings,
    };
  }

  async findById(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }
    return recipe;
  }

  async findWithFilters(
    filters: RecipeFilterOptions,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ recipes: Recipe[]; total: number }> {
    return this.recipeRepository.findWithFilters(filters, limit, offset);
  }

  async findPersonalizedRecipes(
    options: PersonalizedRecipeOptions,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ recipes: Recipe[]; total: number }> {
    this.logger.debug(`Finding personalized recipes for user: ${options.userId || 'anonymous'}`);

    // Build filter options based on personalization
    const filters = await this.personalizationService.buildPersonalizedFilter(options);
    
    return this.findWithFilters(filters, limit, offset);
  }

  async findByCuisine(cuisine: string, limit: number = 10): Promise<Recipe[]> {
    return this.recipeRepository.findByCuisine(cuisine, limit);
  }

  async findPopular(limit: number = 10): Promise<Recipe[]> {
    return this.recipeRepository.findPopular(limit);
  }

  async findRecentlyAdded(limit: number = 10): Promise<Recipe[]> {
    return this.recipeRepository.findRecentlyAdded(limit);
  }

  async updateRecipe(id: string, updateRecipeDto: UpdateRecipeDto): Promise<Recipe> {
    this.logger.debug(`Updating recipe: ${id}`);

    const existingRecipe = await this.findById(id);
    
    // Validate updates if content is changing
    if (this.hasContentChanges(updateRecipeDto)) {
      const moderationResult = await this.contentModerationService.validateRecipeUpdate(
        existingRecipe,
        updateRecipeDto,
      );
      if (!moderationResult.isValid) {
        throw new BadRequestException(`Recipe update validation failed: ${moderationResult.violations.join(', ')}`);
      }
    }

    // Update total time if time components change
    if (updateRecipeDto.prepTimeMinutes !== undefined || updateRecipeDto.cookTimeMinutes !== undefined) {
      const prepTime = updateRecipeDto.prepTimeMinutes ?? existingRecipe.prepTimeMinutes;
      const cookTime = updateRecipeDto.cookTimeMinutes ?? existingRecipe.cookTimeMinutes;
      updateRecipeDto.totalTimeMinutes = prepTime + cookTime;
    }

    const updatedRecipe = await this.recipeRepository.update(id, updateRecipeDto as any);
    if (!updatedRecipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    // Recalculate nutrition if ingredients or other relevant data changed
    if (this.requiresNutritionRecalculation(updateRecipeDto)) {
      try {
        await this.recipeNutritionService.calculateAndStoreNutrition(updatedRecipe);
        this.logger.debug(`Nutrition recalculated for recipe: ${id}`);
      } catch (error) {
        this.logger.warn(`Failed to recalculate nutrition for recipe ${id}: ${error.message}`);
      }
    }

    return updatedRecipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    this.logger.debug(`Deleting recipe: ${id}`);
    
    const recipe = await this.findById(id);
    const deleted = await this.recipeRepository.delete(id);
    
    if (!deleted) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    this.logger.debug(`Recipe deleted: ${id}`);
  }

  async incrementPopularity(id: string): Promise<void> {
    await this.recipeRepository.incrementPopularityScore(id);
  }

  async bulkCreateRecipes(recipes: CreateRecipeDto[]): Promise<Recipe[]> {
    this.logger.debug(`Bulk creating ${recipes.length} recipes`);

    const validatedRecipes: any[] = [];
    const warnings: string[] = [];

    for (const recipeDto of recipes) {
      try {
        // Basic validation and moderation
        const moderationResult = await this.contentModerationService.validateRecipe(recipeDto);
        if (moderationResult.isValid) {
          const recipeData = {
            name: recipeDto.name,
            description: recipeDto.description,
            cuisine: recipeDto.cuisine,
            dietType: recipeDto.dietType,
            mealType: recipeDto.mealType,
            difficultyLevel: recipeDto.difficultyLevel,
            prepTimeMinutes: recipeDto.prepTimeMinutes,
            cookTimeMinutes: recipeDto.cookTimeMinutes,
            totalTimeMinutes: recipeDto.getTotalTimeMinutes(),
            servingsCount: recipeDto.servingsCount,
            isDiabeticFriendly: recipeDto.isDiabeticFriendly || false,
            isHypertensionFriendly: recipeDto.isHypertensionFriendly || false,
            isPcosFriendly: recipeDto.isPcosFriendly || false,
            isFattyLiverFriendly: recipeDto.isFattyLiverFriendly || false,
            isHighProtein: recipeDto.isHighProtein || false,
            isLowCalorie: recipeDto.isLowCalorie || false,
            isGlutenFree: recipeDto.isGlutenFree || false,
            isDairyFree: recipeDto.isDairyFree || false,
            tags: recipeDto.tags,
            allergens: recipeDto.allergens,
            imageUrl: recipeDto.imageUrl,
            videoUrl: recipeDto.videoUrl,
            sourceUrl: recipeDto.sourceUrl,
            sourceAttribution: recipeDto.sourceAttribution,
            recipeYield: recipeDto.recipeYield,
            equipmentNeeded: recipeDto.equipmentNeeded,
            isActive: true,
            isVerified: false,
            popularityScore: 0,
            createdBy: recipeDto.createdBy,
            dataSource: recipeDto.dataSource || 'bulk_import',
            externalId: recipeDto.externalId,
          };
          validatedRecipes.push(recipeData);
        } else {
          warnings.push(`Recipe "${recipeDto.name}" failed validation: ${moderationResult.violations.join(', ')}`);
        }
      } catch (error) {
        warnings.push(`Recipe "${recipeDto.name}" validation error: ${error.message}`);
      }
    }

    if (warnings.length > 0) {
      this.logger.warn(`Bulk import warnings: ${warnings.join('; ')}`);
    }

    const createdRecipes = await this.recipeRepository.bulkCreate(validatedRecipes);
    
    // Schedule nutrition calculation for bulk recipes
    this.scheduleNutritionCalculation(createdRecipes);

    return createdRecipes;
  }

  async searchRecipes(query: string, limit: number = 20): Promise<Recipe[]> {
    // This is a simplified search - in production, you'd want to use a proper search engine
    const filters: RecipeFilterOptions = {
      isActive: true,
    };

    const { recipes } = await this.recipeRepository.findWithFilters(filters, limit, 0);
    
    // Filter by name or description containing query
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(query.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(query.toLowerCase()) ||
      recipe.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  private hasContentChanges(updateDto: UpdateRecipeDto): boolean {
    return !!(
      updateDto.name ||
      updateDto.description ||
      updateDto.ingredients ||
      updateDto.steps ||
      updateDto.allergens ||
      updateDto.tags
    );
  }

  private requiresNutritionRecalculation(updateDto: UpdateRecipeDto): boolean {
    return !!(
      updateDto.ingredients ||
      updateDto.servingsCount ||
      updateDto.steps?.some(step => step.cookingMethod)
    );
  }

  private async scheduleNutritionCalculation(recipes: Recipe[]): Promise<void> {
    // In a production system, this would be queued for background processing
    for (const recipe of recipes) {
      try {
        await this.recipeNutritionService.calculateAndStoreNutrition(recipe);
      } catch (error) {
        this.logger.warn(`Failed to calculate nutrition for recipe ${recipe.id}: ${error.message}`);
      }
    }
  }
}