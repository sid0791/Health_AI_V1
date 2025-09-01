import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AIMealGenerationService } from '../services/ai-meal-generation.service';
import { MealPlanService } from '../services/meal-plan.service';
import {
  GeneratePersonalizedMealPlanDto,
  GenerateInnovativeRecipeDto,
  GenerateShoppingListDto,
} from '../dto/ai-meal-generation.dto';

@ApiTags('AI Meal Planning')
@Controller('meal-planning/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIMealPlanningController {
  private readonly logger = new Logger(AIMealPlanningController.name);

  constructor(
    private readonly aiMealGenerationService: AIMealGenerationService,
    private readonly mealPlanService: MealPlanService,
  ) {}

  @Post('generate-meal-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI-powered personalized meal plan',
    description: `
    Generates a comprehensive 7-day meal plan using AI with celebrity-style recipes.
    
    Features:
    - Personalized based on user profile, health conditions, and preferences
    - **Phase 11 Integration**: Uses health report interpretations for medical-grade personalization
    - Celebrity chef-inspired healthy recipes with innovative twists
    - Accurate nutrition calculations using Phase 3 engines
    - GI/GL awareness for blood sugar management (diabetes-friendly)
    - Budget optimization and ingredient availability
    - Shopping list generation with substitutions
    - Cultural appropriateness for Indian cuisine preferences
    
    **Health-Aware Planning**:
    - Automatically considers biomarker data from health reports
    - Adjusts for diabetes, cholesterol, liver function, kidney health
    - Addresses vitamin deficiencies (D, B12, Iron, Folate)
    - Provides thyroid-supportive and heart-healthy options
    - Includes red flag warnings from health interpretations
    
    The system uses Level 2 AI routing for cost optimization while maintaining
    accuracy within 5% of top providers.
    `,
  })
  @ApiBody({ type: GeneratePersonalizedMealPlanDto })
  @ApiResponse({
    status: 200,
    description: 'Meal plan generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            mealPlan: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'AI Personalized Weight Loss Plan' },
                description: { type: 'string' },
                totalDays: { type: 'number', example: 7 },
                dailyMeals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      day: { type: 'number' },
                      meals: { type: 'array' },
                      dailyNutritionSummary: { type: 'object' },
                      estimatedCost: { type: 'number' },
                      prepTimeTotal: { type: 'number' },
                    },
                  },
                },
              },
            },
            shoppingList: {
              type: 'object',
              properties: {
                categorizedIngredients: { type: 'object' },
                totalEstimatedCost: { type: 'number' },
                budgetCompliance: { type: 'boolean' },
              },
            },
            nutritionalAnalysis: {
              type: 'object',
              properties: {
                weeklyAverages: { type: 'object' },
                goalCompliance: { type: 'object' },
                healthInsights: { type: 'array', items: { type: 'string' } },
                warnings: { type: 'array', items: { type: 'string' } },
              },
            },
            aiGenerationMetadata: {
              type: 'object',
              properties: {
                modelUsed: { type: 'string' },
                decisionId: { type: 'string' },
                generationTime: { type: 'number' },
                cost: { type: 'number' },
                confidenceScore: { type: 'number' },
              },
            },
          },
        },
        message: { type: 'string', example: 'Meal plan generated successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Invalid user profile data' },
        details: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'AI generation failed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'AI meal plan generation failed' },
        fallbackSuggestion: { type: 'string' },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async generatePersonalizedMealPlan(
    @Request() req: any,
    @Body() generateDto: GeneratePersonalizedMealPlanDto,
  ) {
    this.logger.debug(`Generating AI meal plan for user: ${req.user.id}`);

    try {
      // Validate macro targets sum to 100%
      const macroSum =
        generateDto.planPreferences.macroTargets.proteinPercent +
        generateDto.planPreferences.macroTargets.carbPercent +
        generateDto.planPreferences.macroTargets.fatPercent;

      if (Math.abs(macroSum - 100) > 1) {
        throw new BadRequestException('Macro targets must sum to 100% (± 1% tolerance)');
      }

      // Validate budget range
      if (generateDto.userProfile.budgetRange.min > generateDto.userProfile.budgetRange.max) {
        throw new BadRequestException('Minimum budget cannot be greater than maximum budget');
      }

      // Build the request for the AI service
      const mealPlanRequest = {
        userId: req.user.id,
        userProfile: {
          ...generateDto.userProfile,
          healthConditions: generateDto.userProfile.healthConditions || [],
          allergies: generateDto.userProfile.allergies || [],
          preferredIngredients: generateDto.userProfile.preferredIngredients || [],
          avoidedIngredients: generateDto.userProfile.avoidedIngredients || [],
        },
        planPreferences: {
          ...generateDto.planPreferences,
          includeCheatMeals: generateDto.planPreferences.includeCheatMeals || false,
          weekendTreats: generateDto.planPreferences.weekendTreats || false,
        },
        contextData: {
          currentSeason: generateDto.contextData?.currentSeason || 'summer',
          location: generateDto.contextData?.location || 'Mumbai',
          availableIngredients: generateDto.contextData?.availableIngredients,
          previousPlans: generateDto.contextData?.previousPlans,
          userFeedback: generateDto.contextData?.userFeedback,
        },
      };

      // Generate the meal plan using AI
      const result =
        await this.aiMealGenerationService.generatePersonalizedMealPlan(mealPlanRequest);

      // Log successful generation
      this.logger.log(
        `AI meal plan generated successfully for user ${req.user.id} ` +
          `using model ${result.aiGenerationMetadata.modelUsed} ` +
          `in ${result.aiGenerationMetadata.generationTime}ms`,
      );

      return {
        success: true,
        data: result,
        message: 'Personalized meal plan generated successfully',
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: req.user.id,
          planDuration: generateDto.planPreferences.duration,
          totalCost: result.shoppingList.totalEstimatedCost,
          budgetCompliant: result.shoppingList.budgetCompliance,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate meal plan for user ${req.user.id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Provide fallback suggestion for AI failures
      throw new InternalServerErrorException({
        success: false,
        error: 'AI meal plan generation failed',
        fallbackSuggestion: 'Try using our template-based meal plans while we resolve this issue',
        supportContact: 'Please contact support if this issue persists',
      });
    }
  }

  @Post('generate-recipe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate celebrity-style innovative recipe',
    description: `
    Creates an innovative, celebrity chef-inspired healthy recipe with accurate nutrition.
    
    Features:
    - AI-generated healthy twists on popular dishes
    - Precise ingredient measurements and nutrition calculations
    - GI/GL calculations for blood sugar management
    - Cost estimation in INR
    - Cooking transformations applied
    - Substitution suggestions for dietary restrictions
    - Celebrity chef techniques and presentation tips
    `,
  })
  @ApiBody({ type: GenerateInnovativeRecipeDto })
  @ApiResponse({
    status: 200,
    description: 'Recipe generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Protein-Rich Quinoa Biryani' },
            description: { type: 'string' },
            cookingMethod: { type: 'string' },
            ingredients: { type: 'array' },
            instructions: { type: 'array' },
            nutritionPer100g: { type: 'object' },
            portionNutrition: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        aiMetadata: {
          type: 'object',
          properties: {
            modelUsed: { type: 'string' },
            generationTime: { type: 'number' },
            confidenceScore: { type: 'number' },
          },
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async generateInnovativeRecipe(
    @Request() req: any,
    @Body() recipeDto: GenerateInnovativeRecipeDto,
  ) {
    this.logger.debug(`Generating innovative recipe: ${recipeDto.baseRecipeName}`);

    try {
      const startTime = Date.now();

      const recipe = await this.aiMealGenerationService.generateInnovativeRecipe(
        recipeDto.baseRecipeName,
        recipeDto.dietaryConstraints,
        recipeDto.nutritionTargets,
        recipeDto.userPreferences,
      );

      const generationTime = Date.now() - startTime;

      this.logger.log(`Innovative recipe generated: ${recipe.name} in ${generationTime}ms`);

      return {
        success: true,
        data: recipe,
        aiMetadata: {
          generationTime,
          requestedBy: req.user.id,
          baseRecipe: recipeDto.baseRecipeName,
        },
        message: 'Innovative recipe generated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate recipe ${recipeDto.baseRecipeName}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        success: false,
        error: 'Recipe generation failed',
        suggestion: 'Try with a simpler base recipe or fewer constraints',
      });
    }
  }

  @Post('save-generated-plan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save AI-generated meal plan to user account',
    description: "Saves a generated meal plan to the user's meal plan collection",
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        generatedPlanData: { type: 'object' },
        planName: { type: 'string', example: 'My AI Generated Plan' },
        activate: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Meal plan saved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
  })
  async saveGeneratedPlan(
    @Request() req: any,
    @Body() body: { generatedPlanData: any; planName: string; activate?: boolean },
  ) {
    this.logger.debug(`Saving generated meal plan for user: ${req.user.id}`);

    try {
      // Convert generated plan data to meal plan entity format
      const mealPlanData = this.convertGeneratedPlanToEntity(
        body.generatedPlanData,
        body.planName,
        body.activate || false,
      );

      // Save the meal plan
      const savedPlan = await this.mealPlanService.create(mealPlanData, req.user.id);

      this.logger.log(`Meal plan saved with ID: ${savedPlan.id}`);

      return {
        success: true,
        data: {
          id: savedPlan.id,
          name: savedPlan.name,
          status: savedPlan.status,
          isActive: savedPlan.isActive,
          startDate: savedPlan.startDate,
          endDate: savedPlan.endDate,
        },
        message: 'Meal plan saved successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to save meal plan for user ${req.user.id}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException({
        success: false,
        error: 'Failed to save meal plan',
      });
    }
  }

  @Post('shopping-list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate optimized shopping list',
    description: 'Creates an optimized shopping list with cost analysis and substitutions',
  })
  @ApiBody({ type: GenerateShoppingListDto })
  @ApiResponse({
    status: 200,
    description: 'Shopping list generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async generateShoppingList(@Request() req: any, @Body() shoppingDto: GenerateShoppingListDto) {
    this.logger.debug(`Generating shopping list for user: ${req.user.id}`);

    try {
      // Generate comprehensive shopping list using AI meal generation service
      const shoppingList = await this.aiMealGenerationService.generateShoppingList(
        req.user.id,
        shoppingDto,
      );

      return {
        success: true,
        data: shoppingList,
        message: 'Shopping list generated successfully',
        metadata: {
          generatedAt: new Date().toISOString(),
          userId: req.user.id,
          totalItems: shoppingList.totalItems,
          estimatedCost: shoppingList.totalEstimatedCost,
          budgetCompliant: shoppingList.budgetCompliance,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate shopping list: ${error.message}`, error.stack);

      throw new InternalServerErrorException({
        success: false,
        error: 'Shopping list generation failed',
        fallbackSuggestion: 'Try generating from a saved meal plan or contact support',
      });
    }
  }

  // Helper methods

  private convertGeneratedPlanToEntity(
    generatedPlan: any,
    planName: string,
    activate: boolean,
  ): any {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + generatedPlan.mealPlan.totalDays);

    return {
      name: planName,
      description: generatedPlan.mealPlan.description,
      planType: generatedPlan.planPreferences?.planType || 'custom',
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      durationDays: generatedPlan.mealPlan.totalDays,
      isActive: activate,
      targetCaloriesPerDay: generatedPlan.nutritionalAnalysis.weeklyAverages.calories,
      targetProteinGrams: generatedPlan.nutritionalAnalysis.weeklyAverages.protein,
      targetCarbGrams: generatedPlan.nutritionalAnalysis.weeklyAverages.carbs,
      targetFatGrams: generatedPlan.nutritionalAnalysis.weeklyAverages.fat,
      targetFiberGrams: generatedPlan.nutritionalAnalysis.weeklyAverages.fiber || 25,
      estimatedWeeklyCost: generatedPlan.shoppingList.totalEstimatedCost,
      generationMethod: 'ai_generated',
      aiModelVersion: generatedPlan.aiGenerationMetadata.modelUsed,
      tags: ['ai-generated', 'personalized'],
      metadata: {
        aiGenerationMetadata: generatedPlan.aiGenerationMetadata,
        originalRequest: generatedPlan.originalRequest,
      },
    };
  }
}
