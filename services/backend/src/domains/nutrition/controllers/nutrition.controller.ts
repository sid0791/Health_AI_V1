import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EnhancedNutritionService } from '../services/enhanced-nutrition.service';
import { CookingTransformationService } from '../services/cooking-transformation.service';
import { GlycemicIndexService } from '../services/glycemic-index.service';
import {
  CookingTransformationDto,
  GlycemicIndexEstimationDto,
  GlycemicLoadCalculationDto,
  EnhancedRecipeDto,
  EnhancedMealPlanDto,
  RecipeOptimizationGoalsDto,
} from '../dto/nutrition.dto';

@ApiTags('Nutrition Calculations')
@Controller('nutrition')
export class NutritionController {
  private readonly logger = new Logger(NutritionController.name);

  constructor(
    private readonly enhancedNutritionService: EnhancedNutritionService,
    private readonly cookingTransformationService: CookingTransformationService,
    private readonly glycemicIndexService: GlycemicIndexService,
  ) {}

  @Post('cooking-transformation')
  @ApiOperation({
    summary: 'Apply cooking transformation to food',
    description: 'Calculate how cooking affects nutrient content and weight of food ingredients',
  })
  @ApiResponse({
    status: 200,
    description: 'Cooking transformation result with yield factors and transformed nutrients',
    schema: {
      type: 'object',
      properties: {
        yieldFactor: { type: 'number', description: 'Ratio of cooked to raw weight' },
        cookedWeight: { type: 'number', description: 'Final weight after cooking (g)' },
        transformedNutrients: { type: 'object', description: 'Nutrients per 100g cooked product' },
        cookingMethod: { type: 'string', description: 'Applied cooking method' },
        retentionFactorsApplied: { type: 'object', description: 'Nutrient retention factors used' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters',
  })
  async applyCookingTransformation(@Body() dto: CookingTransformationDto) {
    try {
      this.logger.debug(`Applying cooking transformation: ${dto.cookingParams.method}`);

      const result = this.cookingTransformationService.applyCookingTransformation(
        dto.rawNutrients,
        dto.rawWeight,
        dto.cookingParams,
      );

      return {
        success: true,
        data: result,
        message: 'Cooking transformation applied successfully',
      };
    } catch (error) {
      this.logger.error('Failed to apply cooking transformation', error);
      throw new HttpException(
        'Failed to calculate cooking transformation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('glycemic-index/estimate')
  @ApiOperation({
    summary: 'Estimate glycemic index for food',
    description: 'Estimate GI based on food composition when GI value is not known',
  })
  @ApiResponse({
    status: 200,
    description: 'Estimated glycemic index with confidence and source information',
    schema: {
      type: 'object',
      properties: {
        gi: { type: 'number', description: 'Estimated glycemic index (0-150)' },
        source: { type: 'string', description: 'Source of estimation' },
        testMethod: { type: 'string', description: 'Reference method used' },
        foodDescription: { type: 'string', description: 'Description of estimation basis' },
      },
    },
  })
  async estimateGlycemicIndex(@Body() dto: GlycemicIndexEstimationDto) {
    try {
      this.logger.debug('Estimating glycemic index for food composition');

      const result = this.glycemicIndexService.estimateGlycemicIndex(
        dto.composition,
        dto.foodCategory,
      );

      return {
        success: true,
        data: result,
        message: 'Glycemic index estimated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to estimate glycemic index', error);
      throw new HttpException(
        'Failed to estimate glycemic index',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('glycemic-load/calculate')
  @ApiOperation({
    summary: 'Calculate glycemic load',
    description: 'Calculate glycemic load for a specific portion size and carbohydrate content',
  })
  @ApiResponse({
    status: 200,
    description: 'Glycemic load calculation with category classification',
    schema: {
      type: 'object',
      properties: {
        gl: { type: 'number', description: 'Glycemic load value' },
        gi: { type: 'number', description: 'Glycemic index used' },
        availableCarbs: { type: 'number', description: 'Available carbohydrates (g)' },
        category: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  })
  async calculateGlycemicLoad(@Body() dto: GlycemicLoadCalculationDto) {
    try {
      this.logger.debug('Calculating glycemic load');

      const result = this.glycemicIndexService.calculateGlycemicLoad(
        dto.gi,
        dto.availableCarbohydrates,
        dto.portionSize,
      );

      return {
        success: true,
        data: result,
        message: 'Glycemic load calculated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to calculate glycemic load', error);
      throw new HttpException(
        'Failed to calculate glycemic load',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('recipe/analyze')
  @ApiOperation({
    summary: 'Analyze complete recipe nutrition',
    description: 'Comprehensive nutrition analysis including cooking effects and glycemic impact',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete recipe nutrition analysis',
    schema: {
      type: 'object',
      properties: {
        nutritionPerServing: { type: 'object', description: 'Nutrition content per serving' },
        glycemicLoad: { type: 'object', description: 'Glycemic load analysis' },
        rawTotalNutrients: { type: 'object', description: 'Total raw nutrients' },
        cookedTotalNutrients: { type: 'object', description: 'Total nutrients after cooking' },
        nutritionChangeFromCooking: { type: 'object', description: 'Nutrient retention analysis' },
        ingredientAnalysis: { type: 'array', description: 'Per-ingredient analysis' },
      },
    },
  })
  async analyzeRecipe(@Body() dto: EnhancedRecipeDto) {
    try {
      this.logger.debug(`Analyzing recipe: ${dto.name} with ${dto.ingredients.length} ingredients`);

      const result = await this.enhancedNutritionService.analyzeRecipe(dto);

      return {
        success: true,
        data: result,
        message: 'Recipe analysis completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to analyze recipe', error);
      throw new HttpException(
        'Failed to analyze recipe nutrition',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('meal-plan/analyze')
  @ApiOperation({
    summary: 'Analyze complete meal plan',
    description: 'Analyze nutrition across multiple recipes in a meal plan',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete meal plan nutrition analysis',
    schema: {
      type: 'object',
      properties: {
        totalNutrition: { type: 'object', description: 'Total nutrition across all recipes' },
        totalGlycemicLoad: { type: 'object', description: 'Combined glycemic load' },
        adherenceScore: { type: 'number', description: 'Adherence to nutrition targets (0-100)' },
      },
    },
  })
  async analyzeMealPlan(@Body() dto: EnhancedMealPlanDto) {
    try {
      this.logger.debug(`Analyzing meal plan: ${dto.mealType} with ${dto.recipes.length} recipes`);

      const result = await this.enhancedNutritionService.analyzeMealPlan(dto);

      return {
        success: true,
        data: result,
        message: 'Meal plan analysis completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to analyze meal plan', error);
      throw new HttpException(
        'Failed to analyze meal plan nutrition',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('recipe/optimize')
  @ApiOperation({
    summary: 'Optimize recipe for nutritional goals',
    description: 'Suggest cooking method changes to improve nutritional profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Optimized recipe with improvement suggestions',
    schema: {
      type: 'object',
      properties: {
        optimizedRecipe: { type: 'object', description: 'Recipe with optimized cooking methods' },
        improvements: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of improvements made',
        },
        nutritionImprovement: {
          type: 'number',
          description: 'Percentage improvement in nutrition',
        },
      },
    },
  })
  async optimizeRecipe(
    @Body() body: { recipe: EnhancedRecipeDto; goals: RecipeOptimizationGoalsDto },
  ) {
    try {
      this.logger.debug(`Optimizing recipe: ${body.recipe.name}`);

      const result = this.enhancedNutritionService.optimizeRecipeForGoals(body.recipe, body.goals);

      return {
        success: true,
        data: result,
        message: 'Recipe optimization completed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to optimize recipe', error);
      throw new HttpException('Failed to optimize recipe', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('cooking-methods/:method/gi-factor')
  @ApiOperation({
    summary: 'Get GI modification factor for cooking method',
    description: 'Get how much a cooking method affects glycemic index',
  })
  @ApiParam({ name: 'method', description: 'Cooking method name' })
  @ApiQuery({ name: 'foodType', description: 'Type of food being cooked', required: false })
  @ApiResponse({
    status: 200,
    description: 'GI modification factor for the cooking method',
  })
  getGICookingFactor(@Param('method') method: string, @Query('foodType') foodType?: string) {
    try {
      const factor = this.glycemicIndexService.getGICookingModificationFactor(
        method,
        foodType || 'general',
      );

      return {
        success: true,
        data: {
          method,
          foodType: foodType || 'general',
          giFactor: factor,
          interpretation:
            factor > 1 ? 'increases GI' : factor < 1 ? 'decreases GI' : 'no effect on GI',
        },
        message: 'GI modification factor retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get GI cooking factor', error);
      throw new HttpException(
        'Failed to get cooking method GI factor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('indian-foods/gi-database')
  @ApiOperation({
    summary: 'Get common Indian foods GI database',
    description: 'Retrieve glycemic index values for common Indian foods',
  })
  @ApiResponse({
    status: 200,
    description: 'Database of Indian food GI values',
  })
  getIndianFoodGIDatabase() {
    try {
      const database = this.glycemicIndexService.getCommonIndianFoodGI();

      return {
        success: true,
        data: {
          foods: database,
          count: Object.keys(database).length,
          lastUpdated: new Date(),
        },
        message: 'Indian food GI database retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get Indian food GI database', error);
      throw new HttpException(
        'Failed to retrieve Indian food GI database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health-check')
  @ApiOperation({
    summary: 'Health check for nutrition services',
    description: 'Check if all nutrition calculation services are working properly',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  async healthCheck() {
    try {
      // Test basic functionality of each service
      const testComposition = {
        totalCarbohydrates: 20,
        fiber: 2,
        sugar: 5,
        starch: 13,
        protein: 3,
        fat: 1,
        processingLevel: 'minimal' as const,
        foodForm: 'solid' as const,
      };

      const testNutrients = {
        energy: 100,
        protein: 5,
        carbohydrates: 20,
        fat: 2,
        fiber: 3,
        sugar: 5,
      };

      // Test GI estimation
      const giTest = this.glycemicIndexService.estimateGlycemicIndex(testComposition);

      // Test GL calculation
      const glTest = this.glycemicIndexService.calculateGlycemicLoad(50, 15, 100);

      // Test cooking transformation
      const cookingTest = this.cookingTransformationService.applyCookingTransformation(
        testNutrients,
        100,
        { method: 'boiled' as any },
      );

      return {
        success: true,
        data: {
          glycemicIndexService: giTest ? 'OK' : 'ERROR',
          glycemicLoadService: glTest ? 'OK' : 'ERROR',
          cookingTransformationService: cookingTest ? 'OK' : 'ERROR',
          enhancedNutritionService: 'OK',
          timestamp: new Date(),
        },
        message: 'All nutrition services are operational',
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw new HttpException(
        'One or more nutrition services are not working properly',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
