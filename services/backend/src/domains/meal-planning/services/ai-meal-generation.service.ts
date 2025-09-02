import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { AIRoutingService, AIRoutingRequest } from '../../ai-routing/services/ai-routing.service';
import { EnhancedAIProviderService } from '../../ai-routing/services/enhanced-ai-provider.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';
import { EnhancedNutritionService } from '../../nutrition/services/enhanced-nutrition.service';
import { GlycemicIndexService } from '../../nutrition/services/glycemic-index.service';
import { CookingTransformationService } from '../../nutrition/services/cooking-transformation.service';
import { User } from '../../users/entities/user.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { MealPlan, MealPlanType } from '../entities/meal-plan.entity';
import { MealPlanEntry, MealType } from '../entities/meal-plan-entry.entity';

// Phase 11 Integration: Health Reports
import { HealthReportsService } from '../../health-reports/services/health-reports.service';
import {
  HealthInterpretationService,
  HealthInterpretation,
} from '../../health-reports/services/health-interpretation.service';
import { StructuredEntityService } from '../../health-reports/services/structured-entity.service';
import { HealthReport } from '../../health-reports/entities/health-report.entity';

export interface PersonalizedMealPlanRequest {
  userId: string;
  userProfile: {
    age: number;
    gender: 'male' | 'female' | 'other';
    weight: number; // kg
    height: number; // cm
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    goals: string[];
    healthConditions: string[];
    allergies: string[];
    dietaryPreferences: string[];
    cuisinePreferences: string[];
    preferredIngredients: string[];
    avoidedIngredients: string[];
    budgetRange: { min: number; max: number }; // INR per day
    cookingSkillLevel: number; // 1-5
    availableCookingTime: number; // minutes per meal
    mealFrequency: {
      mealsPerDay: number;
      snacksPerDay: number;
      includeBeverages: boolean;
    };
  };
  planPreferences: {
    duration: number; // days (typically 7)
    planType: MealPlanType;
    targetCalories: number;
    macroTargets: {
      proteinPercent: number;
      carbPercent: number;
      fatPercent: number;
    };
    specialRequests?: string;
    includeCheatMeals: boolean;
    weekendTreats: boolean;
  };
  contextData?: {
    currentSeason: string;
    location: string;
    availableIngredients?: string[];
    previousPlans?: string[]; // IDs of previous plans for variety
    userFeedback?: {
      likedMeals: string[];
      dislikedMeals: string[];
      intolerances: string[];
    };
  };
  // Phase 11 Integration: Health data context
  healthContext?: UserHealthContext;
}

// Phase 11 Integration: Health Context Interface
export interface UserHealthContext {
  hasHealthReports: boolean;
  latestHealthReport?: HealthReport;
  healthInterpretation?: HealthInterpretation;
  biomarkers: {
    bloodSugar?: {
      value: number;
      status: 'normal' | 'elevated' | 'high' | 'very_high';
      hba1c?: number;
      isDiabetic: boolean;
    };
    cholesterol?: {
      total: number;
      ldl: number;
      hdl: number;
      triglycerides: number;
      status: 'optimal' | 'borderline' | 'high' | 'very_high';
    };
    liverFunction?: {
      alt: number;
      ast: number;
      status: 'normal' | 'elevated' | 'high';
    };
    kidneyFunction?: {
      creatinine: number;
      bun: number;
      status: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment';
    };
    thyroid?: {
      tsh: number;
      t3?: number;
      t4?: number;
      status: 'normal' | 'hypothyroid' | 'hyperthyroid';
    };
    vitamins?: {
      vitaminD?: { value: number; status: 'deficient' | 'insufficient' | 'sufficient' };
      vitaminB12?: { value: number; status: 'deficient' | 'low' | 'normal' };
      folate?: { value: number; status: 'deficient' | 'low' | 'normal' };
      iron?: { value: number; status: 'deficient' | 'low' | 'normal' | 'high' };
    };
  };
  healthConditions: {
    diabetes: boolean;
    prediabetes: boolean;
    highCholesterol: boolean;
    hypertension: boolean;
    fattyLiver: boolean;
    thyroidIssues: boolean;
    kidneyIssues: boolean;
    anemia: boolean;
  };
  dietaryRecommendations: {
    lowGlycemicIndex: boolean;
    lowSodium: boolean;
    lowSaturatedFat: boolean;
    highFiber: boolean;
    increaseIron: boolean;
    increaseB12: boolean;
    increaseVitaminD: boolean;
    limitProtein: boolean;
    heartHealthy: boolean;
    liverFriendly: boolean;
  };
  redFlags: Array<{
    severity: 'low' | 'medium' | 'high' | 'urgent';
    message: string;
    recommendation: string;
  }>;
}

export interface CelebrityStyleRecipe {
  name: string;
  description: string;
  cookingMethod: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    substitutes?: string[];
    cost?: number; // INR
  }>;
  instructions: string[];
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  portionNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    glycemicIndex: number;
    glycemicLoad: number;
  };
  metadata: {
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: number; // 1-5
    cuisine: string;
    course: string;
    tags: string[];
    healthyTwist: string;
    celebrityChefInspiration: string;
    costPerServing: number;
    seasonality: string[];
    equipmentNeeded: string[];
  };
}

export interface MealPlanGenerationResult {
  mealPlan: {
    name: string;
    description: string;
    totalDays: number;
    dailyMeals: Array<{
      day: number;
      meals: Array<{
        mealType: MealType;
        recipe: CelebrityStyleRecipe;
        portionSize: number;
        timing: string; // suggested time
        notes?: string;
      }>;
      dailyNutritionSummary: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        avgGlycemicIndex: number;
        avgGlycemicLoad: number;
      };
      estimatedCost: number;
      prepTimeTotal: number;
    }>;
  };
  shoppingList: {
    categorizedIngredients: Record<
      string,
      Array<{
        name: string;
        totalQuantity: number;
        unit: string;
        estimatedCost: number;
        substitutes: string[];
        availability: 'high' | 'medium' | 'low';
      }>
    >;
    totalEstimatedCost: number;
    budgetCompliance: boolean;
  };
  nutritionalAnalysis: {
    weeklyAverages: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      micronutrients: Record<string, number>;
    };
    goalCompliance: {
      calorieTarget: number;
      proteinTarget: number;
      carbTarget: number;
      fatTarget: number;
      complianceScore: number; // 0-100%
    };
    healthInsights: string[];
    warnings: string[];
  };
  aiGenerationMetadata: {
    modelUsed: string;
    decisionId: string;
    generationTime: number;
    cost: number;
    confidenceScore: number;
    fallbacksUsed: string[];
  };
}

@Injectable()
export class AIMealGenerationService {
  private readonly logger = new Logger(AIMealGenerationService.name);

  constructor(
    @InjectRepository(MealPlan)
    private readonly mealPlanRepository: Repository<MealPlan>,
    @InjectRepository(MealPlanEntry)
    private readonly mealPlanEntryRepository: Repository<MealPlanEntry>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly aiRoutingService: AIRoutingService,
    private readonly enhancedAIProviderService: EnhancedAIProviderService,
    private readonly nutritionService: EnhancedNutritionService,
    private readonly glycemicIndexService: GlycemicIndexService,
    private readonly cookingTransformationService: CookingTransformationService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // Phase 11 Integration: Health Reports Services
    private readonly healthReportsService: HealthReportsService,
    private readonly healthInterpretationService: HealthInterpretationService,
    private readonly structuredEntityService: StructuredEntityService,
  ) {}

  /**
   * Generate a personalized 7-day meal plan with celebrity-style recipes
   */
  async generatePersonalizedMealPlan(
    request: PersonalizedMealPlanRequest,
  ): Promise<MealPlanGenerationResult> {
    this.logger.debug(`Generating meal plan for user: ${request.userId}`);

    const startTime = Date.now();

    try {
      // 1. Validate user input and get user context
      await this.buildUserContext(request);

      // Phase 11 Integration: Get health context from health reports
      const healthContext = await this.buildHealthContext(request.userId);
      request.healthContext = healthContext;

      // 2. Generate meal plan using AI (Level 2 routing for cost optimization)
      const aiPlanResult = await this.generateAIMealPlan(request);

      // 3. Generate celebrity-style recipes for each meal
      const enhancedRecipes = await this.generateCelebrityStyleRecipes(aiPlanResult.meals, request);

      // 4. Calculate accurate nutrition using Phase 3 engines
      const nutritionData = await this.calculateAccurateNutrition(enhancedRecipes);

      // 5. Generate shopping list with substitutions
      const shoppingList = await this.generateShoppingListFromRecipes(enhancedRecipes, request);

      // 6. Perform nutritional analysis and compliance checking
      const nutritionalAnalysis = await this.analyzeNutritionalCompliance(
        nutritionData,
        request.planPreferences,
      );

      // 7. Compile final result
      const result: MealPlanGenerationResult = {
        mealPlan: {
          name: aiPlanResult.planName,
          description: aiPlanResult.planDescription,
          totalDays: request.planPreferences.duration,
          dailyMeals: nutritionData.dailyMeals,
        },
        shoppingList,
        nutritionalAnalysis,
        aiGenerationMetadata: {
          modelUsed: aiPlanResult.modelUsed,
          decisionId: aiPlanResult.decisionId,
          generationTime: Date.now() - startTime,
          cost: aiPlanResult.cost,
          confidenceScore: aiPlanResult.confidence,
          fallbacksUsed: aiPlanResult.fallbacks || [],
        },
      };

      // 8. Cache result for future reference
      await this.cacheGenerationResult(request.userId, result);

      this.logger.debug(
        `Meal plan generation completed in ${result.aiGenerationMetadata.generationTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to generate meal plan: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create celebrity-style recipe with innovative healthy twists
   */
  async generateInnovativeRecipe(
    baseRecipeName: string,
    dietaryConstraints: string[],
    nutritionTargets: {
      maxCalories: number;
      minProtein: number;
      maxCarbs?: number;
      healthFocus: string[];
    },
    userPreferences: {
      cuisineStyle: string;
      availableTime: number;
      skillLevel: number;
      budgetRange: { min: number; max: number };
    },
  ): Promise<CelebrityStyleRecipe> {
    this.logger.debug(`Generating innovative recipe: ${baseRecipeName}`);

    // Build AI prompt for celebrity-style recipe creation
    const prompt = this.buildRecipeGenerationPrompt(
      baseRecipeName,
      dietaryConstraints,
      nutritionTargets,
      userPreferences,
    );

    // Route to AI with Level 2 service (cost-optimized)
    const aiRequest: AIRoutingRequest = {
      requestType: RequestType.RECIPE_GENERATION,
      contextTokens: this.estimateTokens(prompt),
      maxResponseTokens: 2000,
      accuracyRequirement: 95, // High accuracy for nutrition calculations
    };

    const routingResult = await this.aiRoutingService.routeRequest(aiRequest);

    // Call AI provider to generate recipe
    const aiRecipeResult = await this.callAIProvider(routingResult, prompt);

    // Parse and validate AI response
    const parsedRecipe = await this.parseAndValidateRecipe(aiRecipeResult.content);

    // Calculate accurate nutrition using Phase 3 engines
    const enhancedNutrition = await this.calculateRecipeNutrition(parsedRecipe);

    // Apply cooking transformations
    const finalRecipe = await this.applyCookingTransformations(parsedRecipe, enhancedNutrition);

    // Update AI routing with completion data
    await this.aiRoutingService.updateCompletion(routingResult.decisionId, {
      responseTokens: this.estimateTokens(aiRecipeResult.content),
      confidence: aiRecipeResult.confidence,
      actualCost: aiRecipeResult.cost,
    });

    return finalRecipe;
  }

  /**
   * Generate optimized shopping list with substitutions
   */
  async generateOptimizedShoppingList(
    recipes: CelebrityStyleRecipe[],
    budgetConstraints: { maxBudget: number; preferredStores?: string[] },
    userLocation: string,
  ): Promise<{
    categorizedItems: Record<string, any[]>;
    totalCost: number;
    substitutionSuggestions: Array<{
      original: string;
      substitute: string;
      costSaving: number;
      nutritionImpact: string;
    }>;
    availabilityWarnings: string[];
  }> {
    this.logger.debug('Generating optimized shopping list');

    // Aggregate all ingredients from recipes
    const aggregatedIngredients = this.aggregateIngredients(recipes);

    // Check ingredient availability and pricing
    const availabilityData = await this.checkIngredientAvailability(
      aggregatedIngredients,
      userLocation,
    );

    // Generate substitution suggestions for cost optimization
    const substitutions = await this.generateSubstitutions(availabilityData, budgetConstraints);

    // Categorize items by store section
    const categorizedItems = this.categorizeShoppingItems(availabilityData);

    // Calculate total cost and compliance
    const totalCost = this.calculateTotalCost(availabilityData);
    const availabilityWarnings = this.identifyAvailabilityIssues(availabilityData);

    return {
      categorizedItems,
      totalCost,
      substitutionSuggestions: substitutions,
      availabilityWarnings,
    };
  }

  // Private helper methods

  private async buildUserContext(request: PersonalizedMealPlanRequest): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: request.userId },
      relations: ['profile', 'healthData', 'preferences'],
    });

    if (!user) {
      throw new Error(`User not found: ${request.userId}`);
    }

    // Get user's previous meal plans for variety
    const previousPlans = await this.mealPlanRepository.find({
      where: { userId: request.userId },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['entries'],
    });

    return {
      user,
      previousPlans,
      seasonalContext: this.getSeasonalContext(),
      availableIngredients: await this.getLocalIngredientAvailability(
        request.contextData?.location,
      ),
    };
  }

  /**
   * Phase 11 Integration: Build health context from user's health reports
   */
  private async buildHealthContext(userId: string): Promise<UserHealthContext> {
    this.logger.debug(`Building health context for user: ${userId}`);

    try {
      // Get user's health reports
      const healthReports = await this.healthReportsService.findByUserId(userId);

      if (!healthReports || healthReports.length === 0) {
        this.logger.debug(`No health reports found for user: ${userId}`);
        return {
          hasHealthReports: false,
          biomarkers: {},
          healthConditions: {
            diabetes: false,
            prediabetes: false,
            highCholesterol: false,
            hypertension: false,
            fattyLiver: false,
            thyroidIssues: false,
            kidneyIssues: false,
            anemia: false,
          },
          dietaryRecommendations: {
            lowGlycemicIndex: false,
            lowSodium: false,
            lowSaturatedFat: false,
            highFiber: false,
            increaseIron: false,
            increaseB12: false,
            increaseVitaminD: false,
            limitProtein: false,
            heartHealthy: false,
            liverFriendly: false,
          },
          redFlags: [],
        };
      }

      // Get the latest processed health report
      const latestReport = healthReports
        .filter((report) => report.isProcessed())
        .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())[0];

      if (!latestReport) {
        this.logger.debug(`No processed health reports found for user: ${userId}`);
        return {
          hasHealthReports: true,
          biomarkers: {},
          healthConditions: {
            diabetes: false,
            prediabetes: false,
            highCholesterol: false,
            hypertension: false,
            fattyLiver: false,
            thyroidIssues: false,
            kidneyIssues: false,
            anemia: false,
          },
          dietaryRecommendations: {
            lowGlycemicIndex: false,
            lowSodium: false,
            lowSaturatedFat: false,
            highFiber: false,
            increaseIron: false,
            increaseB12: false,
            increaseVitaminD: false,
            limitProtein: false,
            heartHealthy: false,
            liverFriendly: false,
          },
          redFlags: [],
        };
      }

      // Get health interpretation
      const interpretation = await this.healthReportsService.getInterpretation(latestReport.id);

      // Get structured entities (biomarkers)
      const biomarkerData = await this.extractBiomarkerData(latestReport.id);

      // Build health context
      const healthContext: UserHealthContext = {
        hasHealthReports: true,
        latestHealthReport: latestReport,
        healthInterpretation: interpretation,
        biomarkers: biomarkerData,
        healthConditions: this.identifyHealthConditions(biomarkerData, interpretation),
        dietaryRecommendations: this.generateDietaryRecommendations(biomarkerData, interpretation),
        redFlags: this.transformRedFlags(interpretation?.redFlags || []),
      };

      this.logger.debug(`Health context built successfully for user: ${userId}`);
      return healthContext;
    } catch (error) {
      this.logger.error(`Failed to build health context for user ${userId}: ${error.message}`);
      // Return safe default context on error
      return {
        hasHealthReports: false,
        biomarkers: {},
        healthConditions: {
          diabetes: false,
          prediabetes: false,
          highCholesterol: false,
          hypertension: false,
          fattyLiver: false,
          thyroidIssues: false,
          kidneyIssues: false,
          anemia: false,
        },
        dietaryRecommendations: {
          lowGlycemicIndex: false,
          lowSodium: false,
          lowSaturatedFat: false,
          highFiber: false,
          increaseIron: false,
          increaseB12: false,
          increaseVitaminD: false,
          limitProtein: false,
          heartHealthy: false,
          liverFriendly: false,
        },
        redFlags: [],
      };
    }
  }

  /**
   * Extract biomarker data from structured entities
   */
  private async extractBiomarkerData(healthReportId: string): Promise<any> {
    const entities = await this.structuredEntityService.findByHealthReportId(healthReportId);

    const biomarkers: any = {};

    for (const entity of entities) {
      const entityName = entity.entityName.toLowerCase();
      const value = entity.valueNumeric;

      // Blood Sugar / Diabetes markers
      if (entityName.includes('glucose') || entityName.includes('sugar')) {
        if (!biomarkers.bloodSugar) biomarkers.bloodSugar = {};
        biomarkers.bloodSugar.value = value;
        biomarkers.bloodSugar.status = this.classifyBloodSugar(value);
      }

      if (entityName.includes('hba1c') || entityName.includes('hemoglobin a1c')) {
        if (!biomarkers.bloodSugar) biomarkers.bloodSugar = {};
        biomarkers.bloodSugar.hba1c = value;
        biomarkers.bloodSugar.isDiabetic = value >= 6.5;
      }

      // Cholesterol markers
      if (entityName.includes('cholesterol')) {
        if (!biomarkers.cholesterol) biomarkers.cholesterol = {};
        if (entityName.includes('total')) {
          biomarkers.cholesterol.total = value;
        } else if (entityName.includes('ldl')) {
          biomarkers.cholesterol.ldl = value;
        } else if (entityName.includes('hdl')) {
          biomarkers.cholesterol.hdl = value;
        }
      }

      if (entityName.includes('triglyceride')) {
        if (!biomarkers.cholesterol) biomarkers.cholesterol = {};
        biomarkers.cholesterol.triglycerides = value;
      }

      // Liver function
      if (entityName.includes('alt') || entityName.includes('alanine')) {
        if (!biomarkers.liverFunction) biomarkers.liverFunction = {};
        biomarkers.liverFunction.alt = value;
      }

      if (entityName.includes('ast') || entityName.includes('aspartate')) {
        if (!biomarkers.liverFunction) biomarkers.liverFunction = {};
        biomarkers.liverFunction.ast = value;
      }

      // Kidney function
      if (entityName.includes('creatinine')) {
        if (!biomarkers.kidneyFunction) biomarkers.kidneyFunction = {};
        biomarkers.kidneyFunction.creatinine = value;
      }

      if (entityName.includes('bun') || entityName.includes('urea')) {
        if (!biomarkers.kidneyFunction) biomarkers.kidneyFunction = {};
        biomarkers.kidneyFunction.bun = value;
      }

      // Thyroid
      if (entityName.includes('tsh')) {
        if (!biomarkers.thyroid) biomarkers.thyroid = {};
        biomarkers.thyroid.tsh = value;
      }

      if (entityName.includes('t3')) {
        if (!biomarkers.thyroid) biomarkers.thyroid = {};
        biomarkers.thyroid.t3 = value;
      }

      if (entityName.includes('t4')) {
        if (!biomarkers.thyroid) biomarkers.thyroid = {};
        biomarkers.thyroid.t4 = value;
      }

      // Vitamins
      if (entityName.includes('vitamin d') || entityName.includes('25-oh')) {
        if (!biomarkers.vitamins) biomarkers.vitamins = {};
        biomarkers.vitamins.vitaminD = {
          value,
          status: this.classifyVitaminD(value),
        };
      }

      if (entityName.includes('vitamin b12') || entityName.includes('b12')) {
        if (!biomarkers.vitamins) biomarkers.vitamins = {};
        biomarkers.vitamins.vitaminB12 = {
          value,
          status: this.classifyVitaminB12(value),
        };
      }

      if (entityName.includes('folate') || entityName.includes('folic acid')) {
        if (!biomarkers.vitamins) biomarkers.vitamins = {};
        biomarkers.vitamins.folate = {
          value,
          status: this.classifyFolate(value),
        };
      }

      if (entityName.includes('iron') || entityName.includes('ferritin')) {
        if (!biomarkers.vitamins) biomarkers.vitamins = {};
        biomarkers.vitamins.iron = {
          value,
          status: this.classifyIron(value),
        };
      }
    }

    // Add status classifications
    if (biomarkers.cholesterol) {
      biomarkers.cholesterol.status = this.classifyCholesterol(biomarkers.cholesterol);
    }

    if (biomarkers.liverFunction) {
      biomarkers.liverFunction.status = this.classifyLiverFunction(biomarkers.liverFunction);
    }

    if (biomarkers.kidneyFunction) {
      biomarkers.kidneyFunction.status = this.classifyKidneyFunction(biomarkers.kidneyFunction);
    }

    if (biomarkers.thyroid) {
      biomarkers.thyroid.status = this.classifyThyroid(biomarkers.thyroid);
    }

    return biomarkers;
  }

  /**
   * Identify health conditions based on biomarker data
   */
  private identifyHealthConditions(biomarkers: any, interpretation?: HealthInterpretation): any {
    return {
      diabetes: biomarkers.bloodSugar?.isDiabetic || biomarkers.bloodSugar?.hba1c >= 6.5 || false,
      prediabetes:
        (biomarkers.bloodSugar?.hba1c >= 5.7 && biomarkers.bloodSugar?.hba1c < 6.5) || false,
      highCholesterol:
        biomarkers.cholesterol?.status === 'high' ||
        biomarkers.cholesterol?.status === 'very_high' ||
        false,
      hypertension: this.detectHypertension(biomarkers, interpretation) || false,
      fattyLiver:
        biomarkers.liverFunction?.status === 'elevated' ||
        biomarkers.liverFunction?.status === 'high' ||
        false,
      thyroidIssues: biomarkers.thyroid?.status !== 'normal' || false,
      kidneyIssues: biomarkers.kidneyFunction?.status !== 'normal' || false,
      anemia: biomarkers.vitamins?.iron?.status === 'deficient' || false,
    };
  }

  /**
   * Generate dietary recommendations based on health data
   */
  private generateDietaryRecommendations(
    biomarkers: any,
    interpretation?: HealthInterpretation,
  ): any {
    return {
      lowGlycemicIndex:
        biomarkers.bloodSugar?.isDiabetic || biomarkers.bloodSugar?.status !== 'normal' || false,
      lowSodium: this.detectHypertension(biomarkers, interpretation) || false,
      lowSaturatedFat:
        biomarkers.cholesterol?.status === 'high' ||
        biomarkers.cholesterol?.status === 'very_high' ||
        false,
      highFiber:
        biomarkers.bloodSugar?.isDiabetic || biomarkers.cholesterol?.status === 'high' || false,
      increaseIron: biomarkers.vitamins?.iron?.status === 'deficient' || false,
      increaseB12:
        biomarkers.vitamins?.vitaminB12?.status === 'deficient' ||
        biomarkers.vitamins?.vitaminB12?.status === 'low' ||
        false,
      increaseVitaminD:
        biomarkers.vitamins?.vitaminD?.status === 'deficient' ||
        biomarkers.vitamins?.vitaminD?.status === 'insufficient' ||
        false,
      limitProtein:
        biomarkers.kidneyFunction?.status === 'moderate_impairment' ||
        biomarkers.kidneyFunction?.status === 'severe_impairment' ||
        false,
      heartHealthy:
        biomarkers.cholesterol?.status === 'high' ||
        biomarkers.cholesterol?.status === 'very_high' ||
        false,
      liverFriendly:
        biomarkers.liverFunction?.status === 'elevated' ||
        biomarkers.liverFunction?.status === 'high' ||
        false,
    };
  }

  // Helper classification methods
  private classifyBloodSugar(value: number): string {
    if (value < 100) return 'normal';
    if (value < 126) return 'elevated';
    if (value < 200) return 'high';
    return 'very_high';
  }

  private classifyVitaminD(value: number): string {
    if (value < 20) return 'deficient';
    if (value < 30) return 'insufficient';
    return 'sufficient';
  }

  private classifyVitaminB12(value: number): string {
    if (value < 200) return 'deficient';
    if (value < 300) return 'low';
    return 'normal';
  }

  private classifyFolate(value: number): string {
    if (value < 3) return 'deficient';
    if (value < 5) return 'low';
    return 'normal';
  }

  /**
   * Transform RedFlag array from HealthInterpretation to UserHealthContext format
   */
  private transformRedFlags(
    redFlags: Array<{
      severity: 'urgent' | 'high' | 'moderate';
      finding: string;
      clinicalReason: string;
      recommendedAction: string;
      timeframe: 'immediate' | 'within_24h' | 'within_week';
      specialistConsultation: string | null;
    }>,
  ): Array<{
    severity: 'low' | 'medium' | 'high' | 'urgent';
    message: string;
    recommendation: string;
  }> {
    return redFlags.map((flag) => ({
      severity:
        flag.severity === 'moderate'
          ? 'medium'
          : flag.severity === 'high'
            ? 'high'
            : flag.severity === 'urgent'
              ? 'urgent'
              : 'medium',
      message: `${flag.finding}: ${flag.clinicalReason}`,
      recommendation: `${flag.recommendedAction}${flag.specialistConsultation ? ` Consider consultation with ${flag.specialistConsultation}.` : ''}`,
    }));
  }

  /**
   * Detect hypertension from biomarkers and interpretation
   */
  private detectHypertension(biomarkers: any, interpretation?: HealthInterpretation): boolean {
    // Check blood pressure values if available
    if (biomarkers.bloodPressure) {
      const systolic = biomarkers.bloodPressure.systolic || 0;
      const diastolic = biomarkers.bloodPressure.diastolic || 0;
      return systolic >= 140 || diastolic >= 90;
    }

    // Check if interpretation mentions hypertension in findings
    if (interpretation?.overallAssessment?.keyFindings) {
      return interpretation.overallAssessment.keyFindings.some(
        (finding) =>
          finding.toLowerCase().includes('hypertension') ||
          finding.toLowerCase().includes('high blood pressure'),
      );
    }

    // Check if any recommendations mention blood pressure management
    if (interpretation?.recommendations) {
      return interpretation.recommendations.some(
        (rec) =>
          rec.recommendation.toLowerCase().includes('blood pressure') ||
          rec.recommendation.toLowerCase().includes('hypertension'),
      );
    }

    return false;
  }

  private classifyIron(value: number): string {
    if (value < 50) return 'deficient';
    if (value < 100) return 'low';
    if (value > 400) return 'high';
    return 'normal';
  }

  private classifyCholesterol(cholesterol: any): string {
    if (cholesterol.total > 240 || cholesterol.ldl > 160) return 'very_high';
    if (cholesterol.total > 200 || cholesterol.ldl > 130) return 'high';
    if (cholesterol.total > 180 || cholesterol.ldl > 100) return 'borderline';
    return 'optimal';
  }

  private classifyLiverFunction(liver: any): string {
    if (liver.alt > 60 || liver.ast > 60) return 'high';
    if (liver.alt > 40 || liver.ast > 40) return 'elevated';
    return 'normal';
  }

  private classifyKidneyFunction(kidney: any): string {
    if (kidney.creatinine > 2.0) return 'severe_impairment';
    if (kidney.creatinine > 1.5) return 'moderate_impairment';
    if (kidney.creatinine > 1.2) return 'mild_impairment';
    return 'normal';
  }

  private classifyThyroid(thyroid: any): string {
    if (thyroid.tsh > 4.5) return 'hypothyroid';
    if (thyroid.tsh < 0.5) return 'hyperthyroid';
    return 'normal';
  }

  private async generateAIMealPlan(request: PersonalizedMealPlanRequest): Promise<any> {
    // Build comprehensive prompt for meal plan generation
    const prompt = this.buildMealPlanPrompt(request);

    // Route to AI using Level 2 service for cost optimization
    const aiRequest: AIRoutingRequest = {
      userId: request.userId,
      requestType: RequestType.MEAL_PLANNING,
      contextTokens: this.estimateTokens(prompt),
      maxResponseTokens: 3000,
      accuracyRequirement: 92, // Good accuracy within 5% window for cost optimization
    };

    const routingResult = await this.aiRoutingService.routeRequest(aiRequest);

    // Call AI provider
    const aiResult = await this.callAIProvider(routingResult, prompt);

    // Parse AI response
    const planData = JSON.parse(aiResult.content);

    return {
      ...planData,
      modelUsed: `${routingResult.provider}/${routingResult.model}`,
      decisionId: routingResult.decisionId,
      cost: routingResult.estimatedCost,
      confidence: aiResult.confidence,
    };
  }

  private async generateCelebrityStyleRecipes(
    meals: any[],
    request: PersonalizedMealPlanRequest,
  ): Promise<CelebrityStyleRecipe[]> {
    const recipes: CelebrityStyleRecipe[] = [];

    for (const meal of meals) {
      const recipe = await this.generateInnovativeRecipe(
        meal.name,
        request.userProfile.dietaryPreferences,
        {
          maxCalories: meal.targetCalories,
          minProtein: meal.targetProtein,
          healthFocus: request.userProfile.healthConditions,
        },
        {
          cuisineStyle: request.userProfile.cuisinePreferences[0] || 'indian',
          availableTime: request.userProfile.availableCookingTime,
          skillLevel: request.userProfile.cookingSkillLevel,
          budgetRange: request.userProfile.budgetRange,
        },
      );

      // Add day tag to recipe metadata
      if (meal.day) {
        recipe.metadata.tags.push(`day-${meal.day}`);
      }

      recipes.push(recipe);
    }

    return recipes;
  }

  private async calculateAccurateNutrition(recipes: CelebrityStyleRecipe[]): Promise<any> {
    const dailyMeals = [];

    // Group recipes by day and calculate nutrition
    for (let day = 1; day <= 7; day++) {
      const dayRecipes = recipes.filter((r) => r.metadata.tags.includes(`day-${day}`));
      const dayNutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        avgGlycemicIndex: 0,
        avgGlycemicLoad: 0,
      };

      const meals = [];
      for (const recipe of dayRecipes) {
        // Calculate portion nutrition using Phase 3 engines
        const portionNutrition = await this.nutritionService.analyzeRecipe({
          recipeId: recipe.name,
          name: recipe.name,
          servings: recipe.metadata.servings,
          ingredients: recipe.ingredients.map((ing) => ({
            foodId: ing.name,
            name: ing.name,
            rawWeight: ing.quantity,
            rawNutrients: {
              energy: 100, // Mock values - would be from nutrition database
              protein: 5,
              carbohydrates: 20,
              fat: 3,
              fiber: 2,
              sugar: 1,
            },
          })),
          instructions: recipe.instructions,
        });

        // Calculate GI/GL using glycemic index service
        const glycemicData = await this.glycemicIndexService.calculateGlycemicLoad(
          50, // Mock GI
          20, // Available carbs
          100, // Portion size
          'calculated',
        );

        meals.push({
          mealType: this.determineMealType(recipe.metadata.course),
          recipe: {
            ...recipe,
            portionNutrition: {
              ...portionNutrition.nutritionPerServing,
              glycemicIndex: glycemicData.gl, // Use GL as GI for simplification
              glycemicLoad: glycemicData.gl,
            },
          },
          portionSize: 1.0,
          timing: this.suggestMealTiming(recipe.metadata.course),
        });

        // Accumulate daily nutrition - handle mock response format
        const nutrition = portionNutrition.nutritionPerServing || portionNutrition;
        dayNutrition.calories += (nutrition as any).energy || (nutrition as any).calories || 0;
        dayNutrition.protein += (nutrition as any).protein || 0;
        dayNutrition.carbs += (nutrition as any).carbohydrates || (nutrition as any).carbs || 0;
        dayNutrition.fat += (nutrition as any).fat || 0;
        dayNutrition.fiber += (nutrition as any).fiber || 0;
        dayNutrition.avgGlycemicIndex += (glycemicData as any) || 0;
        dayNutrition.avgGlycemicLoad += (glycemicData as any) || 0;
      }

      // Average the glycemic values
      if (dayRecipes.length > 0) {
        dayNutrition.avgGlycemicIndex /= dayRecipes.length;
        dayNutrition.avgGlycemicLoad /= dayRecipes.length;
      }

      dailyMeals.push({
        day,
        meals,
        dailyNutritionSummary: dayNutrition,
        estimatedCost: meals.reduce((sum, m) => sum + m.recipe.metadata.costPerServing, 0),
        prepTimeTotal: meals.reduce((sum, m) => sum + m.recipe.metadata.prepTime, 0),
      });
    }

    return { dailyMeals };
  }

  private async generateShoppingListFromRecipes(
    recipes: CelebrityStyleRecipe[],
    request: PersonalizedMealPlanRequest,
  ): Promise<any> {
    const aggregatedIngredients = this.aggregateIngredients(recipes);

    const categorizedIngredients = {
      vegetables: [],
      fruits: [],
      grains: [],
      proteins: [],
      dairy: [],
      spices: [],
      other: [],
    };

    let totalCost = 0;

    for (const ingredient of aggregatedIngredients) {
      const category = this.categorizeIngredient(ingredient.name);
      const item = {
        name: ingredient.name,
        totalQuantity: ingredient.quantity,
        unit: ingredient.unit,
        estimatedCost: ingredient.cost || 0,
        substitutes: ingredient.substitutes || [],
        availability: this.assessAvailability(ingredient.name),
      };

      categorizedIngredients[category].push(item);
      totalCost += item.estimatedCost;
    }

    const budgetCompliance = request.userProfile.budgetRange
      ? totalCost <= request.userProfile.budgetRange.max * request.planPreferences.duration
      : true;

    return {
      categorizedIngredients,
      totalEstimatedCost: totalCost,
      budgetCompliance,
    };
  }

  private async analyzeNutritionalCompliance(
    nutritionData: any,
    planPreferences: any,
  ): Promise<any> {
    const weeklyAverages = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      micronutrients: {},
    };

    // Calculate weekly averages
    for (const day of nutritionData.dailyMeals) {
      weeklyAverages.calories += day.dailyNutritionSummary.calories;
      weeklyAverages.protein += day.dailyNutritionSummary.protein;
      weeklyAverages.carbs += day.dailyNutritionSummary.carbs;
      weeklyAverages.fat += day.dailyNutritionSummary.fat;
      weeklyAverages.fiber += day.dailyNutritionSummary.fiber;
    }

    const numDays = nutritionData.dailyMeals.length;
    weeklyAverages.calories /= numDays;
    weeklyAverages.protein /= numDays;
    weeklyAverages.carbs /= numDays;
    weeklyAverages.fat /= numDays;
    weeklyAverages.fiber /= numDays;

    // Calculate goal compliance
    const goalCompliance = {
      calorieTarget: planPreferences.targetCalories,
      proteinTarget:
        (planPreferences.targetCalories * planPreferences.macroTargets.proteinPercent) / 100 / 4,
      carbTarget:
        (planPreferences.targetCalories * planPreferences.macroTargets.carbPercent) / 100 / 4,
      fatTarget:
        (planPreferences.targetCalories * planPreferences.macroTargets.fatPercent) / 100 / 9,
      complianceScore: 0, // Will be calculated below
    };

    // Calculate compliance score with proper targets
    goalCompliance.complianceScore = this.calculateComplianceScore(weeklyAverages, goalCompliance);

    const healthInsights = this.generateHealthInsights(weeklyAverages, goalCompliance);
    const warnings = this.generateNutritionalWarnings(weeklyAverages, goalCompliance);

    return {
      weeklyAverages,
      goalCompliance,
      healthInsights,
      warnings,
    };
  }

  // Additional helper methods for AI interaction, parsing, etc.
  private buildMealPlanPrompt(request: PersonalizedMealPlanRequest): string {
    // Build health context section
    let healthSection = '';
    if (request.healthContext?.hasHealthReports) {
      const healthContext = request.healthContext;

      healthSection = `
Health Context (Phase 11 Integration):
- Has Health Reports: ${healthContext.hasHealthReports}
- Latest Report Date: ${healthContext.latestHealthReport?.testDate || 'N/A'}`;

      // Add biomarker information
      if (healthContext.biomarkers.bloodSugar) {
        healthSection += `
- Blood Sugar: ${healthContext.biomarkers.bloodSugar.value || 'N/A'} mg/dL (${healthContext.biomarkers.bloodSugar.status})`;
        if (healthContext.biomarkers.bloodSugar.hba1c) {
          healthSection += `
- HbA1c: ${healthContext.biomarkers.bloodSugar.hba1c}% (Diabetic: ${healthContext.biomarkers.bloodSugar.isDiabetic})`;
        }
      }

      if (healthContext.biomarkers.cholesterol) {
        healthSection += `
- Cholesterol: Total ${healthContext.biomarkers.cholesterol.total || 'N/A'}, LDL ${healthContext.biomarkers.cholesterol.ldl || 'N/A'}, HDL ${healthContext.biomarkers.cholesterol.hdl || 'N/A'} (${healthContext.biomarkers.cholesterol.status})`;
      }

      if (healthContext.biomarkers.vitamins) {
        healthSection += `
- Vitamin D: ${healthContext.biomarkers.vitamins.vitaminD?.value || 'N/A'} ng/mL (${healthContext.biomarkers.vitamins.vitaminD?.status || 'N/A'})
- Vitamin B12: ${healthContext.biomarkers.vitamins.vitaminB12?.value || 'N/A'} pg/mL (${healthContext.biomarkers.vitamins.vitaminB12?.status || 'N/A'})
- Iron/Ferritin: ${healthContext.biomarkers.vitamins.iron?.value || 'N/A'} ng/mL (${healthContext.biomarkers.vitamins.iron?.status || 'N/A'})`;
      }

      // Add health conditions
      const conditions = Object.entries(healthContext.healthConditions)
        .filter(([, value]) => value)
        .map(([key]) => key);

      if (conditions.length > 0) {
        healthSection += `
- Identified Health Conditions: ${conditions.join(', ')}`;
      }

      // Add dietary recommendations
      const recommendations = Object.entries(healthContext.dietaryRecommendations)
        .filter(([, value]) => value)
        .map(([key]) => key);

      if (recommendations.length > 0) {
        healthSection += `
- Dietary Recommendations: ${recommendations.join(', ')}`;
      }

      // Add red flags if any
      if (healthContext.redFlags && healthContext.redFlags.length > 0) {
        const urgentFlags = healthContext.redFlags.filter(
          (flag) => flag.severity === 'urgent' || flag.severity === 'high',
        );
        if (urgentFlags.length > 0) {
          healthSection += `
- IMPORTANT HEALTH FLAGS: ${urgentFlags.map((flag) => flag.message).join('; ')}`;
        }
      }
    } else {
      healthSection = `
Health Context: No health reports available - use general healthy meal planning principles`;
    }

    return `Generate a personalized 7-day meal plan with the following requirements:

User Profile:
- Age: ${request.userProfile.age}, Gender: ${request.userProfile.gender}
- Weight: ${request.userProfile.weight}kg, Height: ${request.userProfile.height}cm
- Activity Level: ${request.userProfile.activityLevel}
- Health Conditions: ${request.userProfile.healthConditions.join(', ')}
- Dietary Preferences: ${request.userProfile.dietaryPreferences.join(', ')}
- Cuisine Preferences: ${request.userProfile.cuisinePreferences.join(', ')}
- Budget Range: ₹${request.userProfile.budgetRange.min}-${request.userProfile.budgetRange.max} per day
- Cooking Skill: ${request.userProfile.cookingSkillLevel}/5
- Available Cooking Time: ${request.userProfile.availableCookingTime} minutes per meal
${healthSection}

Plan Requirements:
- Type: ${request.planPreferences.planType}
- Duration: ${request.planPreferences.duration} days
- Target Calories: ${request.planPreferences.targetCalories} per day
- Macros: ${request.planPreferences.macroTargets.proteinPercent}% protein, ${request.planPreferences.macroTargets.carbPercent}% carbs, ${request.planPreferences.macroTargets.fatPercent}% fat
- Include weekend treats: ${request.planPreferences.weekendTreats}

CRITICAL HEALTH-AWARE INSTRUCTIONS:
${this.buildHealthAwareInstructions(request.healthContext)}

General Instructions:
1. Create innovative, celebrity chef-style recipes that are healthy twists on popular dishes
2. Ensure each recipe includes accurate ingredient quantities and nutrition
3. Consider seasonal availability and local Indian ingredients
4. Include GI/GL-friendly options for stable blood sugar
5. Provide creative substitutions for dietary restrictions
6. Include cost estimates in INR
7. Add prep and cooking instructions
8. Suggest meal timing and portion sizes

Return the meal plan as a structured JSON with detailed recipes for each day and meal.`;
  }

  /**
   * Build health-specific dietary instructions based on health context
   */
  private buildHealthAwareInstructions(healthContext?: UserHealthContext): string {
    if (!healthContext?.hasHealthReports) {
      return 'Follow general healthy meal planning principles with balanced nutrition.';
    }

    const instructions: string[] = [];

    // Diabetes/Blood sugar management
    if (healthContext.healthConditions.diabetes || healthContext.healthConditions.prediabetes) {
      instructions.push(
        'PRIORITIZE LOW GLYCEMIC INDEX foods (GI < 55) and manage glycemic load per meal',
      );
      instructions.push('Include high-fiber foods and complex carbohydrates');
      instructions.push('Avoid simple sugars and refined carbohydrates');
    }

    // Cholesterol management
    if (healthContext.healthConditions.highCholesterol) {
      instructions.push('FOCUS ON HEART-HEALTHY foods: omega-3 rich fish, nuts, olive oil');
      instructions.push('Limit saturated fats and avoid trans fats');
      instructions.push('Include soluble fiber foods like oats, beans, and fruits');
    }

    // Hypertension
    if (healthContext.healthConditions.hypertension) {
      instructions.push('REDUCE SODIUM content significantly - use herbs and spices for flavor');
      instructions.push('Include potassium-rich foods like bananas, spinach, and sweet potatoes');
    }

    // Liver health
    if (healthContext.healthConditions.fattyLiver) {
      instructions.push(
        'LIVER-FRIENDLY meals: avoid fried foods, limit fats, include antioxidant-rich foods',
      );
      instructions.push('Include turmeric, green tea, and leafy greens');
    }

    // Kidney health
    if (healthContext.healthConditions.kidneyIssues) {
      instructions.push(
        'KIDNEY-PROTECTIVE diet: moderate protein intake, limit phosphorus and potassium',
      );
      instructions.push('Avoid processed foods and excessive salt');
    }

    // Vitamin deficiencies
    if (healthContext.dietaryRecommendations.increaseVitaminD) {
      instructions.push('INCLUDE VITAMIN D RICH foods: fatty fish, fortified foods, mushrooms');
    }

    if (healthContext.dietaryRecommendations.increaseB12) {
      instructions.push('INCLUDE VITAMIN B12 SOURCES: fish, eggs, dairy, nutritional yeast');
    }

    if (healthContext.dietaryRecommendations.increaseIron) {
      instructions.push(
        'INCLUDE IRON-RICH foods: leafy greens, lentils, lean meats with vitamin C foods',
      );
    }

    // Thyroid
    if (healthContext.healthConditions.thyroidIssues) {
      instructions.push(
        'THYROID-SUPPORTIVE foods: iodine-rich foods, selenium sources, avoid excessive soy',
      );
    }

    // General recommendations
    if (healthContext.dietaryRecommendations.lowGlycemicIndex) {
      instructions.push(
        'EMPHASIZE low-GI alternatives: quinoa over white rice, sweet potato over regular potato',
      );
    }

    if (instructions.length === 0) {
      return 'Follow general healthy meal planning principles with balanced nutrition based on available health data.';
    }

    return instructions.join('\n');
  }

  private buildRecipeGenerationPrompt(
    baseRecipeName: string,
    dietaryConstraints: string[],
    nutritionTargets: any,
    userPreferences: any,
  ): string {
    return `Create an innovative, celebrity chef-style healthy recipe based on "${baseRecipeName}" with these requirements:

Dietary Constraints: ${dietaryConstraints.join(', ')}
Nutrition Targets: Max ${nutritionTargets.maxCalories} calories, Min ${nutritionTargets.minProtein}g protein
Health Focus: ${nutritionTargets.healthFocus.join(', ')}
Cuisine Style: ${userPreferences.cuisineStyle}
Available Time: ${userPreferences.availableTime} minutes
Skill Level: ${userPreferences.skillLevel}/5
Budget: ₹${userPreferences.budgetRange.min}-${userPreferences.budgetRange.max}

Requirements:
1. Create a healthy, innovative twist on the original recipe
2. Use easily available Indian ingredients where possible
3. Include precise measurements and nutritional information
4. Provide creative cooking techniques that enhance nutrition
5. Include substitution options for different dietary needs
6. Calculate cost per serving in INR
7. Ensure the recipe meets the nutritional targets
8. Include chef tips for best results

Return a detailed recipe with ingredients, instructions, nutrition facts, and metadata.`;
  }

  /**
   * Call AI Provider using Enhanced AI Provider Service with real API integration
   */
  private async callAIProvider(routingResult: any, prompt: string): Promise<any> {
    try {
      // Use the enhanced AI provider service for real API calls
      const result = await this.enhancedAIProviderService.callAIProvider(routingResult, prompt);
      
      // Log the successful routing decision
      this.logger.debug(
        `Successfully called ${routingResult.provider}/${routingResult.model} - Cost: $${result.cost?.toFixed(4) || routingResult.estimatedCost}`
      );
      
      // Update routing decision with completion data
      if (routingResult.decisionId) {
        await this.aiRoutingService.updateCompletion(routingResult.decisionId, {
          responseTokens: result.usage?.completion_tokens || this.estimateTokens(result.content),
          confidence: result.confidence,
          actualCost: result.cost || routingResult.estimatedCost,
          processingDuration: Date.now() - (routingResult.startTime || Date.now()),
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`AI Provider call failed: ${error.message}`);
      
      // Update routing decision with failure data
      if (routingResult.decisionId) {
        await this.aiRoutingService.updateFailure(
          routingResult.decisionId,
          'API_CALL_FAILED',
          error.message
        );
      }
      
      // Return fallback mock response to maintain system reliability
      this.logger.warn('Falling back to mock response due to AI provider failure');
      return this.getFallbackMockResponse(routingResult);
    }
  }
  
  /**
   * Fallback mock response when AI providers are unavailable
   */
  private getFallbackMockResponse(routingResult: any): any {
    return {
      content: JSON.stringify({
        planName: `AI Generated Healthy Plan (${routingResult.provider} fallback)`,
        planDescription: `A personalized meal plan with fallback response from ${routingResult.provider}`,
        meals: [
          {
            name: 'Quinoa Breakfast Bowl',
            targetCalories: 350,
            targetProtein: 15,
            day: 1,
            course: 'breakfast',
          },
          {
            name: 'Mediterranean Salad',
            targetCalories: 450,
            targetProtein: 20,
            day: 1,
            course: 'lunch',
          },
          {
            name: 'Grilled Chicken with Vegetables',
            targetCalories: 500,
            targetProtein: 35,
            day: 1,
            course: 'dinner',
          },
        ],
      }),
      confidence: 0.75, // Lower confidence for fallback
      cost: routingResult.estimatedCost,
      fallback: true,
    };
  }

  private estimateTokens(text: string): number {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  private determineMealType(course: string): MealType {
    const courseMap = {
      breakfast: MealType.BREAKFAST,
      lunch: MealType.LUNCH,
      dinner: MealType.DINNER,
      snack: MealType.SNACK,
    };
    return courseMap[course.toLowerCase()] || MealType.LUNCH;
  }

  private suggestMealTiming(course: string): string {
    const timingMap = {
      breakfast: '08:00',
      lunch: '13:00',
      dinner: '19:00',
      snack: '16:00',
    };
    return timingMap[course.toLowerCase()] || '12:00';
  }

  private aggregateIngredients(recipes: CelebrityStyleRecipe[]): any[] {
    const ingredientMap = new Map();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.quantity += ingredient.quantity;
        } else {
          // Ensure cost is always set to a reasonable value
          const costPerUnit = ingredient.cost || this.estimateIngredientCost(ingredient.name);
          ingredientMap.set(key, {
            ...ingredient,
            cost: costPerUnit,
          });
        }
      }
    }

    return Array.from(ingredientMap.values());
  }

  private categorizeIngredient(name: string): string {
    const categories = {
      vegetables: ['onion', 'tomato', 'potato', 'carrot', 'spinach', 'beans'],
      fruits: ['apple', 'banana', 'orange', 'mango', 'grapes'],
      grains: ['rice', 'wheat', 'quinoa', 'oats', 'barley'],
      proteins: ['chicken', 'fish', 'eggs', 'paneer', 'dal', 'lentils'],
      dairy: ['milk', 'yogurt', 'cheese', 'butter', 'cream'],
      spices: ['turmeric', 'cumin', 'coriander', 'garam masala', 'chili'],
    };

    for (const [category, items] of Object.entries(categories)) {
      if (items.some((item) => name.toLowerCase().includes(item))) {
        return category;
      }
    }

    return 'other';
  }

  private assessAvailability(ingredientName: string): 'high' | 'medium' | 'low' {
    // Simple availability assessment - would be enhanced with real data
    const commonIngredients = ['rice', 'dal', 'onion', 'tomato', 'potato', 'oil'];
    if (commonIngredients.some((item) => ingredientName.toLowerCase().includes(item))) {
      return 'high';
    }
    return 'medium';
  }

  private estimateIngredientCost(ingredientName: string): number {
    // Simple cost estimation based on ingredient type - would be enhanced with real pricing data
    const costMap = {
      // Vegetables (per 100g) - INR
      onion: 3,
      tomato: 4,
      potato: 2,
      carrot: 5,
      spinach: 6,
      beans: 8,
      // Grains (per 100g)
      rice: 4,
      wheat: 3,
      quinoa: 25,
      oats: 12,
      // Proteins (per 100g)
      chicken: 20,
      fish: 30,
      eggs: 6,
      paneer: 40,
      dal: 8,
      lentils: 10,
      // Dairy (per 100ml/100g)
      milk: 6,
      yogurt: 8,
      cheese: 50,
      butter: 60,
      // Spices (per 10g)
      turmeric: 5,
      cumin: 8,
      coriander: 6,
      'garam masala': 15,
      chili: 10,
    };

    const name = ingredientName.toLowerCase();

    // Find matching ingredient in cost map
    for (const [ingredient, cost] of Object.entries(costMap)) {
      if (name.includes(ingredient)) {
        return cost;
      }
    }

    // Default cost for unknown ingredients
    return 10;
  }

  private calculateComplianceScore(averages: any, targets: any): number {
    // Handle edge cases where targets might be 0 or undefined
    if (!targets.targetCalories || targets.targetCalories === 0) {
      return 0;
    }
    if (!targets.proteinTarget || targets.proteinTarget === 0) {
      return 0;
    }

    const calorieDiff =
      Math.abs(averages.calories - targets.targetCalories) / targets.targetCalories;
    const proteinDiff = Math.abs(averages.protein - targets.proteinTarget) / targets.proteinTarget;

    const avgDiff = (calorieDiff + proteinDiff) / 2;
    return Math.max(0, Math.min(100, (1 - avgDiff) * 100));
  }

  private generateHealthInsights(averages: any, compliance: any): string[] {
    const insights = [];

    if (compliance.complianceScore > 85) {
      insights.push('Excellent nutritional balance achieved');
    }

    if (averages.fiber > 25) {
      insights.push('Good fiber intake for digestive health');
    }

    if (averages.protein > compliance.proteinTarget) {
      insights.push('Protein targets exceeded - great for muscle maintenance');
    }

    return insights;
  }

  private generateNutritionalWarnings(averages: any, compliance: any): string[] {
    const warnings = [];

    if (averages.calories < compliance.calorieTarget * 0.8) {
      warnings.push('Calorie intake may be too low for your goals');
    }

    if (averages.protein < compliance.proteinTarget * 0.8) {
      warnings.push('Protein intake below recommended levels');
    }

    return warnings;
  }

  private async parseAndValidateRecipe(content: string): Promise<any> {
    // Parse AI response and validate recipe structure
    return JSON.parse(content);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async calculateRecipeNutrition(_recipe: any): Promise<any> {
    // Use nutrition service to calculate accurate nutrition
    return {};
  }

  private async applyCookingTransformations(
    recipe: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _nutrition: any,
  ): Promise<CelebrityStyleRecipe> {
    // Apply cooking transformations using the cooking transformation service
    // If recipe is incomplete, provide a default structure
    if (!recipe || !recipe.name) {
      return {
        name: 'Default Recipe',
        description: 'A delicious and healthy meal',
        cookingMethod: 'pan-fry',
        ingredients: [
          {
            name: 'rice',
            quantity: 100,
            unit: 'g',
            substitutes: ['quinoa'],
            cost: 4,
          },
          {
            name: 'dal',
            quantity: 50,
            unit: 'g',
            substitutes: ['lentils'],
            cost: 8,
          },
        ],
        instructions: ['Prepare ingredients', 'Cook according to recipe'],
        nutritionPer100g: {
          calories: 150,
          protein: 8,
          carbs: 25,
          fat: 2,
          fiber: 3,
          sugar: 1,
        },
        portionNutrition: {
          calories: 225,
          protein: 12,
          carbs: 38,
          fat: 3,
          fiber: 5,
          sugar: 2,
          glycemicIndex: 55,
          glycemicLoad: 15,
        },
        metadata: {
          servings: 1,
          prepTime: 20,
          cookTime: 15,
          difficulty: 2, // easy level
          course: 'main',
          cuisine: 'indian',
          tags: ['healthy', 'vegetarian'],
          costPerServing: 25,
          seasonality: ['all'],
          healthyTwist: 'Low oil cooking method',
          celebrityChefInspiration: 'Inspired by traditional home cooking',
          equipmentNeeded: ['pan', 'knife'],
        },
      };
    }

    return recipe;
  }

  private async cacheGenerationResult(
    userId: string,
    result: MealPlanGenerationResult,
  ): Promise<void> {
    const cacheKey = `meal_plan_${userId}_${Date.now()}`;
    await this.cacheManager.set(cacheKey, result, 86400); // Cache for 24 hours
  }

  private getSeasonalContext(): any {
    const now = new Date();
    const month = now.getMonth();

    const seasons = {
      winter: [11, 0, 1],
      spring: [2, 3, 4],
      summer: [5, 6, 7],
      monsoon: [8, 9, 10],
    };

    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(month)) {
        return { season, month: month + 1 };
      }
    }

    return { season: 'summer', month: month + 1 };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getLocalIngredientAvailability(_location?: string): Promise<string[]> {
    // Would fetch from a database of local ingredient availability
    return ['rice', 'dal', 'onion', 'tomato', 'potato', 'spinach'];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkIngredientAvailability(ingredients: any[], _location: string): Promise<any[]> {
    // Check ingredient availability and pricing for the location
    return ingredients.map((ingredient) => ({
      ...ingredient,
      availability: this.assessAvailability(ingredient.name),
      estimatedCost: ingredient.cost || Math.random() * 100 + 20, // Mock cost
    }));
  }

  private async generateSubstitutions(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _availabilityData: any[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _budgetConstraints: any,
  ): Promise<any[]> {
    // Generate substitution suggestions for cost optimization
    return [];
  }

  private categorizeShoppingItems(items: any[]): Record<string, any[]> {
    const categories = {
      vegetables: [],
      fruits: [],
      grains: [],
      proteins: [],
      dairy: [],
      spices: [],
      other: [],
    };

    for (const item of items) {
      const category = this.categorizeIngredient(item.name);
      categories[category].push(item);
    }

    return categories;
  }

  private calculateTotalCost(items: any[]): number {
    return items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  }

  private identifyAvailabilityIssues(items: any[]): string[] {
    return items
      .filter((item) => item.availability === 'low')
      .map((item) => `${item.name} may have limited availability`);
  }

  /**
   * Generate standalone shopping list for user
   */
  async generateShoppingList(userId: string, shoppingDto: any): Promise<any> {
    try {
      // Get user profile and preferences
      const userProfile = await this.getUserProfile(userId);

      // Create recipes from the shopping request
      const recipes = shoppingDto.recipes || [];
      const servings = shoppingDto.servings || 4;
      const days = shoppingDto.days || 7;

      // If no recipes provided, generate a basic shopping list
      if (recipes.length === 0) {
        return this.generateBasicShoppingList(userProfile, servings, days);
      }

      // Generate comprehensive shopping list from recipes
      const shoppingList = await this.generateShoppingListFromRecipes(recipes, {
        userId,
        userProfile,
        planPreferences: {
          duration: days,
          planType: 'WEIGHT_MANAGEMENT' as any, // Default plan type
          targetCalories: 2000, // Default calories
          macroTargets: {
            proteinPercent: 20,
            carbPercent: 50,
            fatPercent: 30,
          },
          includeCheatMeals: false,
          weekendTreats: false,
        },
        contextData: {
          location: shoppingDto.location || userProfile.location || 'Mumbai',
          currentSeason: this.getCurrentSeason(),
        },
      });

      return {
        ...shoppingList,
        totalItems: this.calculateTotalItems(shoppingList),
        generatedAt: new Date().toISOString(),
        userId,
      };
    } catch (error) {
      this.logger.error(`Error generating shopping list for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user profile with related data
   */
  private async getUserProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'preferences', 'goals'],
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      ...user.profile,
      healthConditions: user.profile?.healthConditions || [],
      allergies: user.preferences?.allergens || [],
      dietaryPreferences: user.preferences?.dietaryPreference
        ? [user.preferences.dietaryPreference]
        : [],
      cuisinePreferences: user.preferences?.favoriteCuisines || ['NORTH_INDIAN'],
      budgetRange: {
        min: user.preferences?.dailyFoodBudget ? user.preferences.dailyFoodBudget - 100 : 100,
        max: user.preferences?.dailyFoodBudget || 500,
      },
      location: user.profile?.city || 'Mumbai',
    };
  }

  /**
   * Generate basic shopping list when no recipes are provided
   */
  private generateBasicShoppingList(userProfile: any, servings: number, days: number): any {
    const basicIngredients = [
      // Vegetables
      { name: 'Onions', category: 'vegetables', quantity: 2, unit: 'kg', costPerUnit: 30 },
      { name: 'Tomatoes', category: 'vegetables', quantity: 1.5, unit: 'kg', costPerUnit: 40 },
      { name: 'Potatoes', category: 'vegetables', quantity: 2, unit: 'kg', costPerUnit: 25 },
      { name: 'Carrots', category: 'vegetables', quantity: 1, unit: 'kg', costPerUnit: 35 },

      // Grains & Pulses
      { name: 'Brown Rice', category: 'grains', quantity: 1, unit: 'kg', costPerUnit: 120 },
      { name: 'Whole Wheat', category: 'grains', quantity: 1, unit: 'kg', costPerUnit: 50 },
      { name: 'Lentils (Mixed)', category: 'proteins', quantity: 1, unit: 'kg', costPerUnit: 150 },

      // Proteins
      { name: 'Paneer', category: 'proteins', quantity: 500, unit: 'g', costPerUnit: 180 },
      { name: 'Greek Yogurt', category: 'dairy', quantity: 500, unit: 'g', costPerUnit: 150 },

      // Healthy Fats
      { name: 'Olive Oil', category: 'oils', quantity: 500, unit: 'ml', costPerUnit: 300 },
      { name: 'Almonds', category: 'nuts', quantity: 250, unit: 'g', costPerUnit: 250 },

      // Spices & Herbs
      { name: 'Turmeric', category: 'spices', quantity: 100, unit: 'g', costPerUnit: 50 },
      { name: 'Cumin', category: 'spices', quantity: 100, unit: 'g', costPerUnit: 80 },
    ];

    // Adjust quantities based on servings and days
    const adjustedIngredients = basicIngredients.map((item) => ({
      ...item,
      adjustedQuantity: item.quantity * (servings / 4) * (days / 7),
      totalCost: item.quantity * item.costPerUnit * (servings / 4) * (days / 7),
    }));

    // Group by category
    const categorizedItems = adjustedIngredients.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push({
        name: item.name,
        quantity: Math.round(item.adjustedQuantity * 100) / 100,
        unit: item.unit,
        cost: Math.round(item.totalCost),
      });
      return acc;
    }, {});

    const totalEstimatedCost = adjustedIngredients.reduce((sum, item) => sum + item.totalCost, 0);

    return {
      categorizedItems,
      totalEstimatedCost: Math.round(totalEstimatedCost),
      totalItems: adjustedIngredients.length,
      budgetCompliance: userProfile.budgetRange
        ? totalEstimatedCost <= userProfile.budgetRange.max
        : true,
      substitutionSuggestions: [
        { original: 'Paneer', alternative: 'Tofu', savingsPercent: 25 },
        { original: 'Olive Oil', alternative: 'Mustard Oil', savingsPercent: 40 },
      ],
      nutritionalHighlights: [
        'High in fiber from whole grains and vegetables',
        'Rich in plant-based proteins from lentils',
        'Contains healthy fats from nuts and oils',
      ],
    };
  }

  private calculateTotalItems(shoppingList: any): number {
    const categorizedIngredients = shoppingList.categorizedIngredients || {};
    const values = Object.values(categorizedIngredients) as any[];
    return values.reduce((total: number, items: any) => {
      return total + (Array.isArray(items) ? items.length : 0);
    }, 0);
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }
}
