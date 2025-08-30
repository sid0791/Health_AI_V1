import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RecipeService, PersonalizedRecipeOptions } from '../services/recipe.service';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { RecipeFilterDto } from '../dto/recipe-filter.dto';
import { Recipe, DietType } from '../entities/recipe.entity';
import { PersonalizationRulesService } from '../services/personalization-rules.service';
import { RecipeNutritionService } from '../services/recipe-nutrition.service';
import { RecipeSeedingService } from '../services/recipe-seeding.service';

@ApiTags('recipes')
@Controller('recipes')
export class RecipeController {
  private readonly logger = new Logger(RecipeController.name);

  constructor(
    private readonly recipeService: RecipeService,
    private readonly personalizationService: PersonalizationRulesService,
    private readonly nutritionService: RecipeNutritionService,
    private readonly seedingService: RecipeSeedingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new recipe' })
  @ApiResponse({ status: 201, description: 'Recipe created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid recipe data' })
  async createRecipe(@Body(ValidationPipe) createRecipeDto: CreateRecipeDto) {
    this.logger.debug(`Creating recipe: ${createRecipeDto.name}`);
    
    const result = await this.recipeService.createRecipe(createRecipeDto);
    
    return {
      message: 'Recipe created successfully',
      recipe: result.recipe,
      nutritionCalculated: result.nutritionCalculated,
      warnings: result.warnings,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get recipes with filters' })
  @ApiResponse({ status: 200, description: 'Recipes retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recipes to return (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of recipes to skip (default: 0)' })
  async getRecipes(@Query(ValidationPipe) filterDto: RecipeFilterDto) {
    this.logger.debug(`Getting recipes with filters:`, filterDto);
    
    const filters = filterDto.toRepositoryFilter();
    const { recipes, total } = await this.recipeService.findWithFilters(
      filters,
      filterDto.limit,
      filterDto.offset,
    );

    return {
      recipes,
      total,
      limit: filterDto.limit,
      offset: filterDto.offset,
      hasMore: filterDto.offset + filterDto.limit < total,
    };
  }

  @Get('personalized')
  @ApiOperation({ summary: 'Get personalized recipe recommendations' })
  @ApiResponse({ status: 200, description: 'Personalized recipes retrieved successfully' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'dietaryRestrictions', required: false, isArray: true })
  @ApiQuery({ name: 'allergies', required: false, isArray: true })
  @ApiQuery({ name: 'healthConditions', required: false, isArray: true })
  @ApiQuery({ name: 'maxCalories', required: false })
  @ApiQuery({ name: 'maxPrepTime', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getPersonalizedRecipes(
    @Query('userId') userId?: string,
    @Query('dietaryRestrictions') dietaryRestrictions?: string[],
    @Query('allergies') allergies?: string[],
    @Query('healthConditions') healthConditions?: string[],
    @Query('preferredCuisines') preferredCuisines?: string[],
    @Query('excludedIngredients') excludedIngredients?: string[],
    @Query('maxCalories') maxCalories?: number,
    @Query('maxPrepTime') maxPrepTime?: number,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const options: PersonalizedRecipeOptions = {
      userId,
      dietaryRestrictions: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : dietaryRestrictions ? [dietaryRestrictions] : undefined,
      allergies: Array.isArray(allergies) ? allergies : allergies ? [allergies] : undefined,
      healthConditions: Array.isArray(healthConditions) ? healthConditions : healthConditions ? [healthConditions] : undefined,
      preferredCuisines: Array.isArray(preferredCuisines) ? preferredCuisines : preferredCuisines ? [preferredCuisines] : undefined,
      excludedIngredients: Array.isArray(excludedIngredients) ? excludedIngredients : excludedIngredients ? [excludedIngredients] : undefined,
      maxCalories: maxCalories ? Number(maxCalories) : undefined,
      maxPrepTime: maxPrepTime ? Number(maxPrepTime) : undefined,
    };

    this.logger.debug(`Getting personalized recipes for user: ${userId || 'anonymous'}`);
    
    const { recipes, total } = await this.recipeService.findPersonalizedRecipes(options, limit, offset);

    return {
      recipes,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      personalizationApplied: true,
    };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular recipes' })
  @ApiResponse({ status: 200, description: 'Popular recipes retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recipes to return (default: 10)' })
  async getPopularRecipes(@Query('limit') limit: number = 10) {
    const recipes = await this.recipeService.findPopular(Number(limit));
    return { recipes };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently added recipes' })
  @ApiResponse({ status: 200, description: 'Recent recipes retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recipes to return (default: 10)' })
  async getRecentRecipes(@Query('limit') limit: number = 10) {
    const recipes = await this.recipeService.findRecentlyAdded(Number(limit));
    return { recipes };
  }

  @Get('cuisine/:cuisine')
  @ApiOperation({ summary: 'Get recipes by cuisine' })
  @ApiResponse({ status: 200, description: 'Cuisine recipes retrieved successfully' })
  @ApiParam({ name: 'cuisine', description: 'Cuisine name' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recipes to return (default: 10)' })
  async getRecipesByCuisine(
    @Param('cuisine') cuisine: string,
    @Query('limit') limit: number = 10,
  ) {
    const recipes = await this.recipeService.findByCuisine(cuisine, Number(limit));
    return { recipes, cuisine };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search recipes by query' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recipes to return (default: 20)' })
  async searchRecipes(
    @Query('q') query: string,
    @Query('limit') limit: number = 20,
  ) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters long');
    }

    const recipes = await this.recipeService.searchRecipes(query.trim(), Number(limit));
    return { recipes, query, total: recipes.length };
  }

  @Get('craving-killers/:craving')
  @ApiOperation({ summary: 'Get craving-killer recipe recommendations' })
  @ApiResponse({ status: 200, description: 'Craving-killer recipes retrieved successfully' })
  @ApiParam({ name: 'craving', description: 'Type of craving (sweet, salty, fried, etc.)' })
  async getCravingKillerRecipes(@Param('craving') craving: string) {
    const filters = await this.personalizationService.getCravingKillerRecommendations(craving);
    const { recipes } = await this.recipeService.findWithFilters(filters, 15, 0);
    
    return {
      recipes,
      craving,
      recommendationType: 'craving-killer',
    };
  }

  @Get('guilty-pleasures/:pleasure')
  @ApiOperation({ summary: 'Get healthy alternatives to guilty pleasures' })
  @ApiResponse({ status: 200, description: 'Healthy alternatives retrieved successfully' })
  @ApiParam({ name: 'pleasure', description: 'Type of guilty pleasure (pizza, burger, pasta, etc.)' })
  async getGuiltyPleasureAlternatives(@Param('pleasure') pleasure: string) {
    const filters = await this.personalizationService.getGuiltyPleasureAlternatives(pleasure);
    const { recipes } = await this.recipeService.findWithFilters(filters, 15, 0);
    
    return {
      recipes,
      originalPleasure: pleasure,
      recommendationType: 'healthy-alternative',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recipe by ID' })
  @ApiResponse({ status: 200, description: 'Recipe retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  async getRecipeById(@Param('id', ParseUUIDPipe) id: string) {
    const recipe = await this.recipeService.findById(id);
    
    // Increment popularity when recipe is viewed
    await this.recipeService.incrementPopularity(id);
    
    return { recipe };
  }

  @Get(':id/nutrition')
  @ApiOperation({ summary: 'Get detailed nutrition information for a recipe' })
  @ApiResponse({ status: 200, description: 'Nutrition information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Recipe or nutrition data not found' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  async getRecipeNutrition(@Param('id', ParseUUIDPipe) id: string) {
    const nutrition = await this.nutritionService.getNutritionSummary(id);
    
    if (!nutrition) {
      throw new BadRequestException('Nutrition data not available for this recipe');
    }
    
    return { nutrition };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a recipe' })
  @ApiResponse({ status: 200, description: 'Recipe updated successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  async updateRecipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateRecipeDto: UpdateRecipeDto,
  ) {
    this.logger.debug(`Updating recipe: ${id}`);
    
    const recipe = await this.recipeService.updateRecipe(id, updateRecipeDto);
    
    return {
      message: 'Recipe updated successfully',
      recipe,
    };
  }

  @Post(':id/recalculate-nutrition')
  @ApiOperation({ summary: 'Recalculate nutrition for a recipe' })
  @ApiResponse({ status: 200, description: 'Nutrition recalculated successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @HttpCode(HttpStatus.OK)
  async recalculateNutrition(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.debug(`Recalculating nutrition for recipe: ${id}`);
    
    const nutrition = await this.nutritionService.recalculateNutrition(id);
    
    return {
      message: 'Nutrition recalculated successfully',
      nutrition,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recipe' })
  @ApiResponse({ status: 204, description: 'Recipe deleted successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRecipe(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.debug(`Deleting recipe: ${id}`);
    
    await this.recipeService.deleteRecipe(id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create recipes' })
  @ApiResponse({ status: 201, description: 'Recipes created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid recipe data' })
  async bulkCreateRecipes(@Body(ValidationPipe) recipes: CreateRecipeDto[]) {
    this.logger.debug(`Bulk creating ${recipes.length} recipes`);
    
    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new BadRequestException('Must provide an array of recipes');
    }

    if (recipes.length > 100) {
      throw new BadRequestException('Cannot create more than 100 recipes at once');
    }

    const createdRecipes = await this.recipeService.bulkCreateRecipes(recipes);
    
    return {
      message: `Successfully created ${createdRecipes.length} recipes`,
      recipes: createdRecipes,
      total: createdRecipes.length,
    };
  }

  @Post('batch-nutrition-calculation')
  @ApiOperation({ summary: 'Batch calculate nutrition for multiple recipes' })
  @ApiResponse({ status: 200, description: 'Batch nutrition calculation completed' })
  @HttpCode(HttpStatus.OK)
  async batchCalculateNutrition(@Body() body: { recipeIds: string[] }) {
    const { recipeIds } = body;
    
    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      throw new BadRequestException('Must provide an array of recipe IDs');
    }

    if (recipeIds.length > 50) {
      throw new BadRequestException('Cannot process more than 50 recipes at once');
    }

    this.logger.debug(`Batch calculating nutrition for ${recipeIds.length} recipes`);
    
    const result = await this.nutritionService.batchCalculateNutrition(recipeIds);
    
    return {
      message: 'Batch nutrition calculation completed',
      successful: result.successful,
      failed: result.failed,
      totalProcessed: recipeIds.length,
      successCount: result.successful.length,
      failureCount: result.failed.length,
    };
  }

  // ==================== DATA SEEDING ENDPOINTS ====================

  @Post('seed')
  @ApiOperation({ summary: 'Seed database with curated healthy recipes' })
  @ApiResponse({ status: 201, description: 'Recipes seeded successfully' })
  @HttpCode(HttpStatus.CREATED)
  async seedRecipes() {
    this.logger.debug('Seeding curated recipe database');
    
    const result = await this.seedingService.seedRecipes();
    
    return {
      message: 'Recipe seeding completed',
      ...result,
    };
  }

  @Post('seed/category/:category')
  @ApiOperation({ summary: 'Seed recipes by specific category' })
  @ApiResponse({ status: 201, description: 'Category recipes seeded successfully' })
  @ApiParam({ name: 'category', description: 'Recipe category to seed' })
  @HttpCode(HttpStatus.CREATED)
  async seedRecipesByCategory(@Param('category') category: string) {
    const recipes = await this.seedingService.seedRecipesByCategory(category);
    
    return {
      message: `Successfully seeded ${recipes.length} recipes for category: ${category}`,
      recipes,
      count: recipes.length,
    };
  }

  @Get('seed/stats')
  @ApiOperation({ summary: 'Get recipe seeding statistics' })
  @ApiResponse({ status: 200, description: 'Seeding statistics retrieved successfully' })
  async getSeedingStats() {
    const stats = await this.seedingService.getSeedingStats();
    
    return {
      message: 'Recipe seeding statistics',
      ...stats,
    };
  }

  @Get('seed/validate')
  @ApiOperation({ summary: 'Validate seed data integrity' })
  @ApiResponse({ status: 200, description: 'Seed data validation completed' })
  async validateSeedData() {
    const validation = await this.seedingService.validateSeedData();
    
    return {
      message: 'Seed data validation completed',
      ...validation,
    };
  }

  @Get('recommendations/sample')
  @ApiOperation({ summary: 'Get sample personalized recommendations' })
  @ApiResponse({ status: 200, description: 'Sample recommendations retrieved successfully' })
  async getSampleRecommendations() {
    const recommendations = await this.seedingService.generateSampleRecommendations();
    
    return {
      message: 'Sample personalized recommendations',
      recommendations,
    };
  }
}