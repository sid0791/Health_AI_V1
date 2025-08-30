import { Test, TestingModule } from '@nestjs/testing';
import { GlycemicIndexService, FoodComposition, MealComposition } from '../glycemic-index.service';

describe('GlycemicIndexService', () => {
  let service: GlycemicIndexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlycemicIndexService],
    }).compile();

    service = module.get<GlycemicIndexService>(GlycemicIndexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateGlycemicLoad', () => {
    it('should calculate GL correctly for a food with known GI', () => {
      const result = service.calculateGlycemicLoad(50, 30, 150, 'known');

      expect(result.gl).toBe(15.0);
      expect(result.gi).toBe(50);
      expect(result.availableCarbs).toBe(30);
      expect(result.category).toBe('medium');
    });

    it('should categorize GL as low (<= 10)', () => {
      const result = service.calculateGlycemicLoad(30, 20, 100);

      expect(result.gl).toBe(6.0);
      expect(result.category).toBe('low');
    });

    it('should categorize GL as high (> 19)', () => {
      const result = service.calculateGlycemicLoad(80, 40, 200);

      expect(result.gl).toBe(32.0);
      expect(result.category).toBe('high');
    });

    it('should handle zero carbohydrates', () => {
      const result = service.calculateGlycemicLoad(50, 0, 100);

      expect(result.gl).toBe(0);
      expect(result.category).toBe('low');
    });
  });

  describe('estimateGlycemicIndex', () => {
    it('should return 0 for very low carb foods', () => {
      const composition: FoodComposition = {
        totalCarbohydrates: 0.3,
        fiber: 0.1,
        sugar: 0.2,
        starch: 0,
        protein: 20,
        fat: 5,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const result = service.estimateGlycemicIndex(composition);

      expect(result.gi).toBe(0);
      expect(result.source).toBe('estimated');
    });

    it('should estimate lower GI for high-fiber foods', () => {
      const lowFiberComposition: FoodComposition = {
        totalCarbohydrates: 50,
        fiber: 2,
        sugar: 5,
        starch: 43,
        protein: 10,
        fat: 2,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const highFiberComposition: FoodComposition = {
        totalCarbohydrates: 50,
        fiber: 15,
        sugar: 5,
        starch: 30,
        protein: 10,
        fat: 2,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const lowFiberResult = service.estimateGlycemicIndex(lowFiberComposition);
      const highFiberResult = service.estimateGlycemicIndex(highFiberComposition);

      expect(highFiberResult.gi).toBeLessThan(lowFiberResult.gi);
    });

    it('should estimate lower GI for high-protein foods', () => {
      const lowProteinComposition: FoodComposition = {
        totalCarbohydrates: 40,
        fiber: 3,
        sugar: 5,
        starch: 32,
        protein: 2,
        fat: 1,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const highProteinComposition: FoodComposition = {
        totalCarbohydrates: 40,
        fiber: 3,
        sugar: 5,
        starch: 32,
        protein: 20,
        fat: 1,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const lowProteinResult = service.estimateGlycemicIndex(lowProteinComposition);
      const highProteinResult = service.estimateGlycemicIndex(highProteinComposition);

      expect(highProteinResult.gi).toBeLessThan(lowProteinResult.gi);
    });

    it('should estimate higher GI for highly processed foods', () => {
      const minimalProcessingComposition: FoodComposition = {
        totalCarbohydrates: 40,
        fiber: 3,
        sugar: 5,
        starch: 32,
        protein: 5,
        fat: 2,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const highlyProcessedComposition: FoodComposition = {
        totalCarbohydrates: 40,
        fiber: 3,
        sugar: 5,
        starch: 32,
        protein: 5,
        fat: 2,
        processingLevel: 'highly_processed',
        foodForm: 'solid',
      };

      const minimalResult = service.estimateGlycemicIndex(minimalProcessingComposition);
      const processedResult = service.estimateGlycemicIndex(highlyProcessedComposition);

      expect(processedResult.gi).toBeGreaterThan(minimalResult.gi);
    });

    it('should estimate higher GI for liquid forms', () => {
      const solidComposition: FoodComposition = {
        totalCarbohydrates: 30,
        fiber: 2,
        sugar: 25,
        starch: 3,
        protein: 1,
        fat: 0.5,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const liquidComposition: FoodComposition = {
        totalCarbohydrates: 30,
        fiber: 2,
        sugar: 25,
        starch: 3,
        protein: 1,
        fat: 0.5,
        processingLevel: 'minimal',
        foodForm: 'liquid',
      };

      const solidResult = service.estimateGlycemicIndex(solidComposition);
      const liquidResult = service.estimateGlycemicIndex(liquidComposition);

      expect(liquidResult.gi).toBeGreaterThan(solidResult.gi);
    });

    it('should estimate higher GI for high-sugar foods', () => {
      const lowSugarComposition: FoodComposition = {
        totalCarbohydrates: 40,
        fiber: 3,
        sugar: 2,
        starch: 35,
        protein: 5,
        fat: 2,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const highSugarComposition: FoodComposition = {
        totalCarbohydrates: 40,
        fiber: 3,
        sugar: 25,
        starch: 12,
        protein: 5,
        fat: 2,
        processingLevel: 'minimal',
        foodForm: 'solid',
      };

      const lowSugarResult = service.estimateGlycemicIndex(lowSugarComposition);
      const highSugarResult = service.estimateGlycemicIndex(highSugarComposition);

      expect(highSugarResult.gi).toBeGreaterThan(lowSugarResult.gi);
    });
  });

  describe('calculateMealGlycemicIndex', () => {
    it('should calculate meal GI/GL for mixed foods', () => {
      const mealComposition: MealComposition = {
        foods: [
          {
            foodId: 'rice',
            weight: 100,
            composition: {
              totalCarbohydrates: 28,
              fiber: 0.4,
              sugar: 0.1,
              starch: 27.5,
              protein: 2.7,
              fat: 0.3,
              processingLevel: 'minimal',
              foodForm: 'solid',
            },
            gi: 73, // Known GI for rice
          },
          {
            foodId: 'dal',
            weight: 50,
            composition: {
              totalCarbohydrates: 30,
              fiber: 4,
              sugar: 2,
              starch: 24,
              protein: 11,
              fat: 1,
              processingLevel: 'minimal',
              foodForm: 'solid',
            },
            gi: 28, // Known GI for lentils
          },
        ],
        totalWeight: 150,
        totalCarbohydrates: 43,
      };

      const result = service.calculateMealGlycemicIndex(mealComposition);

      expect(result.gl).toBeGreaterThan(0);
      expect(result.gi).toBeGreaterThan(28); // Should be between lentil and rice GI
      expect(result.gi).toBeLessThan(73);
      expect(result.source).toBe('calculated_meal');
    });

    it('should handle foods without known GI by estimating', () => {
      const mealComposition: MealComposition = {
        foods: [
          {
            foodId: 'unknown_food',
            weight: 100,
            composition: {
              totalCarbohydrates: 20,
              fiber: 5,
              sugar: 3,
              starch: 12,
              protein: 8,
              fat: 2,
              processingLevel: 'minimal',
              foodForm: 'solid',
            },
            // No GI provided, should estimate
          },
        ],
        totalWeight: 100,
        totalCarbohydrates: 15, // Available carbs after fiber
      };

      const result = service.calculateMealGlycemicIndex(mealComposition);

      expect(result.gl).toBeGreaterThan(0);
      expect(result.gi).toBeGreaterThan(0);
      expect(result.gi).toBeLessThan(150);
    });

    it('should return 0 for meal with no carbohydrates', () => {
      const mealComposition: MealComposition = {
        foods: [
          {
            foodId: 'meat',
            weight: 100,
            composition: {
              totalCarbohydrates: 0,
              fiber: 0,
              sugar: 0,
              starch: 0,
              protein: 25,
              fat: 15,
              processingLevel: 'minimal',
              foodForm: 'solid',
            },
            gi: 0,
          },
        ],
        totalWeight: 100,
        totalCarbohydrates: 0,
      };

      const result = service.calculateMealGlycemicIndex(mealComposition);

      expect(result.gl).toBe(0);
      expect(result.gi).toBe(0);
      expect(result.category).toBe('low');
    });
  });

  describe('getGICookingModificationFactor', () => {
    it('should increase GI factor for boiled potatoes', () => {
      const factor = service.getGICookingModificationFactor('boiled', 'potato');

      expect(factor).toBeGreaterThan(1.0);
    });

    it('should significantly increase GI factor for fried potatoes', () => {
      const boiledFactor = service.getGICookingModificationFactor('boiled', 'potato');
      const friedFactor = service.getGICookingModificationFactor('fried', 'potato');

      expect(friedFactor).toBeGreaterThan(boiledFactor);
    });

    it('should handle unknown cooking methods gracefully', () => {
      const factor = service.getGICookingModificationFactor('unknown_method', 'rice');

      expect(factor).toBe(1.0); // Should default to no change
    });

    it('should handle unknown food types gracefully', () => {
      const factor = service.getGICookingModificationFactor('boiled', 'unknown_food');

      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThan(2);
    });
  });

  describe('getCommonIndianFoodGI', () => {
    it('should return GI data for common Indian foods', () => {
      const indianFoods = service.getCommonIndianFoodGI();

      expect(indianFoods).toBeDefined();
      expect(indianFoods['basmati_rice_cooked']).toBeDefined();
      expect(indianFoods['basmati_rice_cooked'].gi).toBeGreaterThan(0);
      expect(indianFoods['chapati_wheat']).toBeDefined();
      expect(indianFoods['chickpeas_boiled']).toBeDefined();

      // Legumes should have lower GI than rice
      expect(indianFoods['chickpeas_boiled'].gi).toBeLessThan(
        indianFoods['basmati_rice_cooked'].gi,
      );
    });

    it('should include proper metadata for Indian foods', () => {
      const indianFoods = service.getCommonIndianFoodGI();
      const rice = indianFoods['basmati_rice_cooked'];

      expect(rice.source).toBeDefined();
      expect(rice.testMethod).toBeDefined();
      expect(rice.foodDescription).toBeDefined();
      expect(rice.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle negative GI gracefully', () => {
      const result = service.calculateGlycemicLoad(-10, 20, 100);

      expect(result.gl).toBeLessThanOrEqual(0);
      expect(result.category).toBe('low');
    });

    it('should handle very high GI values', () => {
      const result = service.calculateGlycemicLoad(200, 50, 100);

      expect(result.gl).toBe(100);
      expect(result.category).toBe('high');
    });

    it('should handle zero portion size', () => {
      const result = service.calculateGlycemicLoad(50, 0, 0);

      expect(result.gl).toBe(0);
      expect(result.category).toBe('low');
    });

    it('should ensure estimated GI is within reasonable bounds', () => {
      const extremeComposition: FoodComposition = {
        totalCarbohydrates: 100,
        fiber: 0,
        sugar: 100,
        starch: 0,
        protein: 0,
        fat: 0,
        processingLevel: 'highly_processed',
        foodForm: 'liquid',
      };

      const result = service.estimateGlycemicIndex(extremeComposition);

      expect(result.gi).toBeGreaterThanOrEqual(0);
      expect(result.gi).toBeLessThanOrEqual(150);
    });
  });
});
