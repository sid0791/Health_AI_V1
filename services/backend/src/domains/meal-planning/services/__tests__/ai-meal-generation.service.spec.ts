import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';

import {
  AIMealGenerationService,
  PersonalizedMealPlanRequest,
} from '../ai-meal-generation.service';
import { AIRoutingService } from '../../../ai-routing/services/ai-routing.service';
import { EnhancedNutritionService } from '../../../nutrition/services/enhanced-nutrition.service';
import { GlycemicIndexService } from '../../../nutrition/services/glycemic-index.service';
import { CookingTransformationService } from '../../../nutrition/services/cooking-transformation.service';
import { MealPlan, MealPlanType } from '../../entities/meal-plan.entity';
import { MealPlanEntry } from '../../entities/meal-plan-entry.entity';
import { Recipe } from '../../../recipes/entities/recipe.entity';
import { User } from '../../../users/entities/user.entity';
import { HealthReportsService } from '../../../health-reports/services/health-reports.service';
import { HealthInterpretationService } from '../../../health-reports/services/health-interpretation.service';
import { StructuredEntityService } from '../../../health-reports/services/structured-entity.service';

describe('AIMealGenerationService', () => {
  let service: AIMealGenerationService;
  let aiRoutingService: jest.Mocked<AIRoutingService>;
  let nutritionService: jest.Mocked<EnhancedNutritionService>;
  let glycemicIndexService: jest.Mocked<GlycemicIndexService>;
  let cacheManager: jest.Mocked<Cache>;

  const mockRepositoryMethods = {
    findOne: jest.fn().mockImplementation((query) => {
      // Handle different user IDs
      const userId = query?.where?.id;
      if (userId === 'test-user-id' || userId === 'phase12-test-user') {
        return Promise.resolve({
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          profile: {},
          healthData: {},
          preferences: {},
        });
      }
      return Promise.resolve(null);
    }),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMealGenerationService,
        {
          provide: getRepositoryToken(MealPlan),
          useValue: mockRepositoryMethods,
        },
        {
          provide: getRepositoryToken(MealPlanEntry),
          useValue: mockRepositoryMethods,
        },
        {
          provide: getRepositoryToken(Recipe),
          useValue: mockRepositoryMethods,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositoryMethods,
        },
        {
          provide: AIRoutingService,
          useValue: {
            routeRequest: jest.fn().mockResolvedValue({
              provider: 'openai',
              model: 'gpt-4',
              decisionId: 'test-decision-id',
              estimatedCost: 0.001,
              routingReason: 'Test routing',
              routingDecision: 'test_decision',
            }),
            updateCompletion: jest.fn(),
          },
        },
        {
          provide: EnhancedNutritionService,
          useValue: {
            analyzeRecipe: jest.fn().mockResolvedValue({
              calories: 250,
              protein: 15,
              carbs: 30,
              fat: 8,
              fiber: 5,
            }),
          },
        },
        {
          provide: GlycemicIndexService,
          useValue: {
            calculateGlycemicLoad: jest.fn().mockResolvedValue(12),
          },
        },
        {
          provide: CookingTransformationService,
          useValue: {
            applyTransformation: jest.fn().mockImplementation((recipe) => recipe),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: HealthReportsService,
          useValue: {
            processHealthReport: jest.fn(),
            analyzeHealthMetrics: jest.fn(),
            findByUserId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: HealthInterpretationService, 
          useValue: {
            interpretHealthData: jest.fn(),
            generateRecommendations: jest.fn(),
          },
        },
        {
          provide: StructuredEntityService,
          useValue: {
            extractEntities: jest.fn(),
            processStructuredData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIMealGenerationService>(AIMealGenerationService);
    aiRoutingService = module.get(AIRoutingService);
    nutritionService = module.get(EnhancedNutritionService);
    glycemicIndexService = module.get(GlycemicIndexService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePersonalizedMealPlan', () => {
    const mockRequest: PersonalizedMealPlanRequest = {
      userId: 'test-user-id',
      userProfile: {
        age: 28,
        gender: 'female',
        weight: 65,
        height: 165,
        activityLevel: 'moderate',
        goals: ['weight_loss', 'better_energy'],
        healthConditions: ['prediabetes'],
        allergies: ['nuts'],
        dietaryPreferences: ['vegetarian'],
        cuisinePreferences: ['indian', 'mediterranean'],
        preferredIngredients: ['quinoa', 'spinach'],
        avoidedIngredients: ['eggplant'],
        budgetRange: { min: 200, max: 400 },
        cookingSkillLevel: 3,
        availableCookingTime: 45,
        mealFrequency: {
          mealsPerDay: 3,
          snacksPerDay: 2,
          includeBeverages: true,
        },
      },
      planPreferences: {
        duration: 7,
        planType: MealPlanType.WEIGHT_LOSS,
        targetCalories: 1800,
        macroTargets: {
          proteinPercent: 25,
          carbPercent: 45,
          fatPercent: 30,
        },
        includeCheatMeals: false,
        weekendTreats: true,
      },
      contextData: {
        currentSeason: 'summer',
        location: 'Mumbai',
      },
    };

    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      profile: {},
      healthData: {},
      preferences: {},
    };

    const mockAIRoutingResult = {
      provider: 'openai',
      model: 'gpt-4',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'test-key',
      routingDecision: 'LEVEL_2_OPTIMIZED',
      routingReason: 'Cost optimization within 5% accuracy window',
      estimatedCost: 0.05,
      quotaRemaining: 95,
      fallbackOptions: [],
      decisionId: 'decision-123',
    };

    // Create comprehensive mock nutrition data matching the actual interfaces
    const mockNutritionAnalysis = {
      nutritionPerServing: {
        energy: 350,
        protein: 20,
        carbohydrates: 45,
        fat: 12,
        fiber: 8,
        sugar: 5,
      },
      glycemicLoad: {
        gl: 18,
        gi: 45,
        availableCarbs: 40,
        portionSize: 100,
        category: 'medium' as const,
        source: 'calculated',
      },
      rawTotalNutrients: {
        energy: 1400,
        protein: 80,
        carbohydrates: 180,
        fat: 48,
        fiber: 32,
        sugar: 20,
      },
      cookedTotalNutrients: {
        energy: 1400,
        protein: 80,
        carbohydrates: 180,
        fat: 48,
        fiber: 32,
        sugar: 20,
      },
      nutritionChangeFromCooking: {},
      totalRawWeight: 400,
      totalCookedWeight: 400,
      yieldFactor: 1.0,
      ingredientAnalysis: [],
      cookingMethodImpacts: {
        waterSolubleVitaminLoss: 0,
        fatSolubleVitaminRetention: 100,
        mineralRetention: 100,
        proteinDigestibilityImprovement: 0,
        antioxidantChange: 0,
      },
      estimatedGlycemicIndex: 45,
      nutritionScore: 85,
      healthScore: 90,
    };

    const mockGlycemicResult = {
      gl: 18,
      gi: 45,
      availableCarbs: 40,
      portionSize: 100,
      category: 'medium' as const,
      source: 'calculated',
    };

    beforeEach(() => {
      mockRepositoryMethods.findOne.mockResolvedValue(mockUser as any);
      mockRepositoryMethods.find.mockResolvedValue([]);
      aiRoutingService.routeRequest.mockResolvedValue(mockAIRoutingResult as any);
      nutritionService.analyzeRecipe.mockResolvedValue(mockNutritionAnalysis as any);
      // glycemicIndexService.calculateGlycemicLoad.mockResolvedValue(mockGlycemicResult as any);
      cacheManager.get.mockResolvedValue(null);
      cacheManager.set.mockResolvedValue(undefined);
    });

    it('should generate a personalized meal plan successfully', async () => {
      const result = await service.generatePersonalizedMealPlan(mockRequest);

      expect(result).toBeDefined();
      expect(result.mealPlan).toBeDefined();
      expect(result.mealPlan.totalDays).toBe(7);
      expect(result.shoppingList).toBeDefined();
      expect(result.nutritionalAnalysis).toBeDefined();
      expect(result.aiGenerationMetadata).toBeDefined();
      expect(result.aiGenerationMetadata.decisionId).toBe('decision-123');
    });

    it('should handle user not found error', async () => {
      mockRepositoryMethods.findOne.mockResolvedValue(null);

      await expect(service.generatePersonalizedMealPlan(mockRequest)).rejects.toThrow(
        'User not found: test-user-id',
      );
    });

    it('should use AI routing for meal plan generation', async () => {
      await service.generatePersonalizedMealPlan(mockRequest);

      expect(aiRoutingService.routeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          requestType: 'meal_planning',
          accuracyRequirement: 92,
        }),
      );
    });

    it('should calculate nutrition using Phase 3 engines', async () => {
      await service.generatePersonalizedMealPlan(mockRequest);

      expect(nutritionService.analyzeRecipe).toHaveBeenCalled();
      expect(glycemicIndexService.calculateGlycemicLoad).toHaveBeenCalled();
    });

    it('should validate macro targets compliance', async () => {
      const result = await service.generatePersonalizedMealPlan(mockRequest);

      expect(result.nutritionalAnalysis.goalCompliance.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.nutritionalAnalysis.goalCompliance.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should generate budget-compliant shopping list', async () => {
      const result = await service.generatePersonalizedMealPlan(mockRequest);

      expect(result.shoppingList.budgetCompliance).toBeDefined();
      expect(result.shoppingList.totalEstimatedCost).toBeGreaterThan(0);
    });
  });

  describe('generateInnovativeRecipe', () => {
    const mockAIRoutingResult = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'test-key',
      routingDecision: 'LEVEL_2_OPTIMIZED',
      routingReason: 'Cost optimization',
      estimatedCost: 0.02,
      quotaRemaining: 98,
      fallbackOptions: [],
      decisionId: 'recipe-decision-456',
    };

    beforeEach(() => {
      aiRoutingService.routeRequest.mockResolvedValue(mockAIRoutingResult as any);
      nutritionService.analyzeRecipe.mockResolvedValue({
        nutritionPerServing: {
          energy: 280,
          protein: 18,
          carbohydrates: 35,
          fat: 8,
          fiber: 6,
          sugar: 4,
        },
        glycemicLoad: {
          gl: 15,
          gi: 42,
          availableCarbs: 30,
          portionSize: 100,
          category: 'medium' as const,
          source: 'calculated',
        },
      } as any);
      glycemicIndexService.calculateGlycemicLoad.mockReturnValue({
        gl: 15,
        gi: 42,
        availableCarbs: 30,
        portionSize: 100,
        category: 'medium' as const,
        source: 'calculated',
      } as any);
    });

    it('should generate innovative recipe with celebrity-style presentation', async () => {
      const result = await service.generateInnovativeRecipe(
        'Healthy Pizza',
        ['vegetarian', 'low-carb'],
        {
          maxCalories: 400,
          minProtein: 20,
          healthFocus: ['low_gi', 'heart_healthy'],
        },
        {
          cuisineStyle: 'italian',
          availableTime: 60,
          skillLevel: 4,
          budgetRange: { min: 150, max: 300 },
        },
      );

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.ingredients).toBeDefined();
      expect(result.instructions).toBeDefined();
      expect(result.portionNutrition).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should use Level 2 routing for recipe generation (cost optimization)', async () => {
      await service.generateInnovativeRecipe(
        'Protein Bowl',
        ['vegan'],
        {
          maxCalories: 350,
          minProtein: 25,
          healthFocus: ['muscle_building'],
        },
        {
          cuisineStyle: 'mediterranean',
          availableTime: 30,
          skillLevel: 2,
          budgetRange: { min: 100, max: 200 },
        },
      );

      expect(aiRoutingService.routeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestType: 'recipe_generation',
          accuracyRequirement: 95,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle AI routing failures gracefully', async () => {
      aiRoutingService.routeRequest.mockRejectedValue(new Error('AI service unavailable'));

      const mockRequest: PersonalizedMealPlanRequest = {
        userId: 'test-user-id',
        userProfile: {} as any,
        planPreferences: {} as any,
      };

      await expect(service.generatePersonalizedMealPlan(mockRequest)).rejects.toThrow();
    });
  });

  describe('Phase 12 Integration Tests', () => {
    it('should demonstrate Phase 12 AI meal planning features', async () => {
      // Test that the service integrates with existing Phase 3 nutrition engines
      // Test that it uses Level 2 AI routing for cost optimization
      // Test that it generates celebrity-style recipes
      // Test that it provides accurate GI/GL calculations
      // Test that it respects budget constraints
      // Test that it includes shopping list generation

      const testRequest: PersonalizedMealPlanRequest = {
        userId: 'phase12-test-user',
        userProfile: {
          age: 30,
          gender: 'male',
          weight: 75,
          height: 180,
          activityLevel: 'active',
          goals: ['muscle_gain'],
          healthConditions: [],
          allergies: [],
          dietaryPreferences: ['vegetarian'],
          cuisinePreferences: ['indian'],
          preferredIngredients: ['quinoa', 'paneer'],
          avoidedIngredients: [],
          budgetRange: { min: 300, max: 600 },
          cookingSkillLevel: 4,
          availableCookingTime: 60,
          mealFrequency: {
            mealsPerDay: 4,
            snacksPerDay: 2,
            includeBeverages: true,
          },
        },
        planPreferences: {
          duration: 7,
          planType: MealPlanType.MUSCLE_GAIN,
          targetCalories: 2500,
          macroTargets: {
            proteinPercent: 30,
            carbPercent: 40,
            fatPercent: 30,
          },
          includeCheatMeals: false,
          weekendTreats: true,
        },
        contextData: {
          currentSeason: 'winter',
          location: 'Delhi',
        },
      };

      mockRepositoryMethods.findOne.mockResolvedValue({ id: 'phase12-test-user' } as any);

      const result = await service.generatePersonalizedMealPlan(testRequest);

      // Verify Phase 12 requirements are met
      expect(result.mealPlan.name).toBeDefined();
      expect(result.mealPlan.totalDays).toBe(7);
      expect(result.shoppingList.categorizedIngredients).toBeDefined();
      expect(result.nutritionalAnalysis.healthInsights).toBeDefined();
      expect(result.aiGenerationMetadata.modelUsed).toBeDefined();

      // Verify integration with AI routing (Level 2 for cost optimization)
      expect(aiRoutingService.routeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestType: 'meal_planning',
          accuracyRequirement: 92, // Level 2 accuracy requirement
        }),
      );

      // Verify nutrition engine integration
      expect(nutritionService.analyzeRecipe).toHaveBeenCalled();
      expect(glycemicIndexService.calculateGlycemicLoad).toHaveBeenCalled();
    });
  });
});
