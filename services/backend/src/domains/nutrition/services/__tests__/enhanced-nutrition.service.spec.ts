import { Test, TestingModule } from '@nestjs/testing';
import {
  EnhancedNutritionService,
  EnhancedRecipe,
  EnhancedMealPlanInput,
} from '../enhanced-nutrition.service';
import { NutritionCalculationService } from '../nutrition-calculation.service';
import { CookingTransformationService } from '../cooking-transformation.service';
import { GlycemicIndexService } from '../glycemic-index.service';
import { CookingMethod } from '../../enums/cooking-method.enum';

describe('EnhancedNutritionService', () => {
  let service: EnhancedNutritionService;
  let mockNutritionService: jest.Mocked<NutritionCalculationService>;
  let mockCookingService: jest.Mocked<CookingTransformationService>;
  let mockGlycemicService: jest.Mocked<GlycemicIndexService>;

  const mockTomatoIngredient = {
    foodId: 'tomato_001',
    name: 'Fresh Tomato',
    rawWeight: 100,
    rawNutrients: {
      energy: 18,
      protein: 0.9,
      carbohydrates: 3.9,
      fat: 0.2,
      fiber: 1.2,
      sugar: 2.6,
      vitaminC: 14,
      potassium: 237,
      sodium: 5,
    },
    foodComposition: {
      totalCarbohydrates: 3.9,
      fiber: 1.2,
      sugar: 2.6,
      starch: 0.1,
      protein: 0.9,
      fat: 0.2,
      processingLevel: 'minimal' as const,
      foodForm: 'solid' as const,
    },
    knownGI: 10,
  };

  const mockRiceIngredient = {
    foodId: 'rice_001',
    name: 'Basmati Rice',
    rawWeight: 150,
    rawNutrients: {
      energy: 345,
      protein: 6.8,
      carbohydrates: 78.2,
      fat: 0.5,
      fiber: 0.2,
      sugar: 0.1,
      calcium: 10,
      iron: 0.7,
      sodium: 1,
    },
    cookingParams: {
      method: CookingMethod.BOILED,
      cookingTime: 18,
      temperature: 100,
    },
    foodComposition: {
      totalCarbohydrates: 78.2,
      fiber: 0.2,
      sugar: 0.1,
      starch: 77.9,
      protein: 6.8,
      fat: 0.5,
      processingLevel: 'minimal' as const,
      foodForm: 'solid' as const,
    },
    knownGI: 58,
  };

  const mockRecipe: EnhancedRecipe = {
    recipeId: 'recipe_001',
    name: 'Tomato Rice',
    servings: 2,
    ingredients: [mockTomatoIngredient, mockRiceIngredient],
    instructions: [
      'Wash and dice tomatoes',
      'Cook rice in boiling water',
      'Mix tomatoes with cooked rice',
    ],
    totalCookingTime: 25,
    difficulty: 'easy',
  };

  beforeEach(async () => {
    const mockCookingTransformationService = {
      applyCookingTransformation: jest.fn(),
    };

    const mockGlycemicIndexService = {
      calculateMealGlycemicIndex: jest.fn(),
      calculateGlycemicLoad: jest.fn(),
    };

    const mockNutritionCalculationService = {
      calculateCompleteNutritionPlan: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedNutritionService,
        {
          provide: NutritionCalculationService,
          useValue: mockNutritionCalculationService,
        },
        {
          provide: CookingTransformationService,
          useValue: mockCookingTransformationService,
        },
        {
          provide: GlycemicIndexService,
          useValue: mockGlycemicIndexService,
        },
      ],
    }).compile();

    service = module.get<EnhancedNutritionService>(EnhancedNutritionService);
    mockNutritionService = module.get(NutritionCalculationService);
    mockCookingService = module.get(CookingTransformationService);
    mockGlycemicService = module.get(GlycemicIndexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeRecipe', () => {
    it('should analyze a simple recipe with raw and cooked ingredients', async () => {
      // Mock cooking transformation for rice
      mockCookingService.applyCookingTransformation.mockReturnValue({
        yieldFactor: 2.5, // Rice expands when cooked
        cookedWeight: 375, // 150g raw -> 375g cooked
        transformedNutrients: {
          energy: 138, // Concentrated due to water absorption
          protein: 2.7,
          carbohydrates: 31.3,
          fat: 0.2,
          fiber: 0.08,
          sugar: 0.04,
          calcium: 4,
          iron: 0.28,
          sodium: 0.4,
        },
        cookingMethod: CookingMethod.BOILED,
        retentionFactorsApplied: {
          protein: 1.0,
          vitaminC: 0.5,
          thiamin: 0.6,
        },
      });

      // Mock meal GI calculation
      mockGlycemicService.calculateMealGlycemicIndex.mockReturnValue({
        gl: 8.5, // Medium GL for the meal
        gi: 45, // Weighted average of tomato (10) and rice (58)
        availableCarbs: 18.9,
        portionSize: 237.5, // Half of total weight per serving
        category: 'low',
        source: 'calculated_meal',
      });

      const result = await service.analyzeRecipe(mockRecipe);

      expect(result).toBeDefined();
      expect(result.nutritionPerServing).toBeDefined();
      expect(result.glycemicLoad).toBeDefined();
      expect(result.glycemicLoad.gl).toBe(4.25); // Half of 8.5 because 2 servings
      expect(result.ingredientAnalysis).toHaveLength(2);

      // Check that cooking transformation was applied to rice but not tomato
      expect(mockCookingService.applyCookingTransformation).toHaveBeenCalledTimes(1);
      expect(mockCookingService.applyCookingTransformation).toHaveBeenCalledWith(
        mockRiceIngredient.rawNutrients,
        mockRiceIngredient.rawWeight,
        mockRiceIngredient.cookingParams,
      );

      // Check that meal GI was calculated
      expect(mockGlycemicService.calculateMealGlycemicIndex).toHaveBeenCalledTimes(1);
    });

    it('should handle recipe with no cooking transformations', async () => {
      const rawRecipe: EnhancedRecipe = {
        recipeId: 'salad_001',
        name: 'Fresh Salad',
        servings: 1,
        ingredients: [mockTomatoIngredient], // No cooking params
        instructions: ['Dice tomatoes', 'Serve fresh'],
      };

      mockGlycemicService.calculateMealGlycemicIndex.mockReturnValue({
        gl: 1.0,
        gi: 10,
        availableCarbs: 2.7, // 3.9 - 1.2 fiber
        portionSize: 100,
        category: 'low',
        source: 'calculated_meal',
      });

      const result = await service.analyzeRecipe(rawRecipe);

      expect(result).toBeDefined();
      expect(result.yieldFactor).toBe(1); // No cooking, no weight change
      expect(mockCookingService.applyCookingTransformation).not.toHaveBeenCalled();
    });
  });

  describe('analyzeMealPlan', () => {
    it('should analyze a meal plan with multiple recipes', async () => {
      const mealPlan: EnhancedMealPlanInput = {
        mealId: 'lunch_001',
        mealType: 'lunch',
        recipes: [mockRecipe],
        nutritionTargets: {
          calories: 400,
          protein: 15,
          carbohydrates: 60,
          fat: 10,
        },
      };

      // Mock recipe analysis result
      mockCookingService.applyCookingTransformation.mockReturnValue({
        yieldFactor: 2.5,
        cookedWeight: 375,
        transformedNutrients: {
          energy: 138,
          protein: 2.7,
          carbohydrates: 31.3,
          fat: 0.2,
          fiber: 0.08,
          sugar: 0.04,
        },
        cookingMethod: CookingMethod.BOILED,
        retentionFactorsApplied: {},
      });

      mockGlycemicService.calculateMealGlycemicIndex.mockReturnValue({
        gl: 8.5,
        gi: 45,
        availableCarbs: 18.9,
        portionSize: 237.5,
        category: 'low',
        source: 'calculated_meal',
      });

      mockGlycemicService.calculateGlycemicLoad.mockReturnValue({
        gl: 8.5,
        gi: 45,
        availableCarbs: 18.9,
        portionSize: 237.5,
        category: 'low',
        source: 'calculated_meal',
      });

      const result = await service.analyzeMealPlan(mealPlan);

      expect(result).toBeDefined();
      expect(result.totalNutrition).toBeDefined();
      expect(result.totalGlycemicLoad).toBeDefined();
      expect(result.adherenceScore).toBeDefined();
      expect(result.adherenceScore).toBeGreaterThan(0);
      expect(result.adherenceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getCookingRecommendations', () => {
    it('should provide recommendations for vitamin C rich foods', () => {
      const ingredients = [
        {
          ...mockTomatoIngredient,
          rawNutrients: {
            ...mockTomatoIngredient.rawNutrients,
            vitaminC: 50, // High vitamin C content
          },
        },
      ];

      const result = service.getCookingRecommendations(ingredients);

      expect(
        result.recommendations.some((rec) =>
          rec.includes('Steam or microwave to preserve vitamin C'),
        ),
      ).toBe(true);
      expect(result.alternativeCookingMethods[mockTomatoIngredient.foodId]).toContain(
        CookingMethod.STEAMED,
      );
    });

    it('should provide recommendations for high-folate foods', () => {
      const ingredients = [
        {
          ...mockTomatoIngredient,
          rawNutrients: {
            ...mockTomatoIngredient.rawNutrients,
            folate: 50, // High folate content
          },
        },
      ];

      const result = service.getCookingRecommendations(ingredients);

      expect(
        result.recommendations.some((rec) =>
          rec.includes('Avoid prolonged boiling to preserve folate'),
        ),
      ).toBe(true);
      expect(result.alternativeCookingMethods[mockTomatoIngredient.foodId]).toContain(
        CookingMethod.STEAMED,
      );
    });

    it('should provide recommendations for high-fiber foods', () => {
      const ingredients = [
        {
          ...mockTomatoIngredient,
          rawNutrients: {
            ...mockTomatoIngredient.rawNutrients,
            fiber: 8, // High fiber content
          },
        },
      ];

      const result = service.getCookingRecommendations(ingredients);

      expect(
        result.recommendations.some((rec) =>
          rec.includes('Light cooking preserves fiber structure'),
        ),
      ).toBe(true);
    });
  });

  describe('optimizeRecipeForGoals', () => {
    it('should optimize recipe to preserve vitamins', () => {
      const recipeWithBoiling: EnhancedRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            ...mockTomatoIngredient,
            cookingParams: {
              method: CookingMethod.BOILED,
              cookingTime: 10,
            },
          },
        ],
      };

      const result = service.optimizeRecipeForGoals(recipeWithBoiling, {
        preserveVitamins: true,
      });

      expect(result.optimizedRecipe.ingredients[0].cookingParams?.method).toBe(
        CookingMethod.STEAMED,
      );
      expect(
        result.improvements.some((imp) =>
          imp.includes('Changed Fresh Tomato from boiling to steaming'),
        ),
      ).toBe(true);
      expect(result.nutritionImprovement).toBeGreaterThan(0);
    });

    it('should reduce sodium when minimizeSodium goal is set', () => {
      const recipeWithSalt: EnhancedRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            ...mockRiceIngredient,
            cookingParams: {
              ...mockRiceIngredient.cookingParams!,
              addedSalt: 4, // 4g of salt
            },
          },
        ],
      };

      const result = service.optimizeRecipeForGoals(recipeWithSalt, {
        minimizeSodium: true,
      });

      expect(result.optimizedRecipe.ingredients[0].cookingParams?.addedSalt).toBe(2); // Reduced by 50%
      expect(
        result.improvements.some((imp) => imp.includes('Reduced salt for Basmati Rice by 50%')),
      ).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty recipe', async () => {
      const emptyRecipe: EnhancedRecipe = {
        recipeId: 'empty_001',
        name: 'Empty Recipe',
        servings: 1,
        ingredients: [],
        instructions: [],
      };

      mockGlycemicService.calculateMealGlycemicIndex.mockReturnValue({
        gl: 0,
        gi: 0,
        availableCarbs: 0,
        portionSize: 0,
        category: 'low',
        source: 'calculated_meal',
      });

      const result = await service.analyzeRecipe(emptyRecipe);

      expect(result.ingredientAnalysis).toHaveLength(0);
      expect(result.totalRawWeight).toBe(0);
      expect(result.totalCookedWeight).toBe(0);
    });

    it('should handle recipe with zero servings gracefully', async () => {
      const recipeZeroServings: EnhancedRecipe = {
        ...mockRecipe,
        servings: 0, // Invalid but should be handled
      };

      // This should be handled gracefully or throw a meaningful error
      await expect(service.analyzeRecipe(recipeZeroServings)).rejects.toThrow();
    });
  });
});
