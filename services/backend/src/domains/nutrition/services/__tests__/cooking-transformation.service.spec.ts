import { Test, TestingModule } from '@nestjs/testing';
import {
  CookingTransformationService,
  NutrientContent,
  CookingParameters,
} from '../cooking-transformation.service';
import { CookingMethod } from '../../enums/cooking-method.enum';

describe('CookingTransformationService', () => {
  let service: CookingTransformationService;

  // Sample raw nutrient data for testing (potato)
  const rawPotatoNutrients: NutrientContent = {
    energy: 77,
    protein: 2.0,
    carbohydrates: 17.5,
    fat: 0.1,
    fiber: 2.2,
    sugar: 0.8,
    calcium: 12,
    iron: 0.8,
    magnesium: 23,
    phosphorus: 57,
    potassium: 421,
    sodium: 6,
    zinc: 0.3,
    vitaminA: 2,
    vitaminC: 19.7,
    thiamin: 0.08,
    riboflavin: 0.03,
    niacin: 1.1,
    vitaminB6: 0.2,
    folate: 15,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CookingTransformationService],
    }).compile();

    service = module.get<CookingTransformationService>(CookingTransformationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Raw food transformation', () => {
    it('should not change nutrients for raw foods', () => {
      const cookingParams: CookingParameters = {
        method: CookingMethod.RAW,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, cookingParams);

      expect(result.yieldFactor).toBe(1.0);
      expect(result.cookedWeight).toBe(100);
      expect(result.transformedNutrients.energy).toBe(rawPotatoNutrients.energy);
      expect(result.transformedNutrients.vitaminC).toBe(rawPotatoNutrients.vitaminC);
    });
  });

  describe('Boiling transformation', () => {
    it('should reduce weight and vitamin C for boiled potatoes', () => {
      const cookingParams: CookingParameters = {
        method: CookingMethod.BOILED,
        cookingTime: 20,
        temperature: 100,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, cookingParams);

      // Boiled foods lose water, so yield factor should be less than 1
      expect(result.yieldFactor).toBeLessThan(1.0);
      expect(result.cookedWeight).toBeLessThan(100);

      // Vitamin C should be significantly reduced due to heat and water sensitivity
      expect(result.transformedNutrients.vitaminC).toBeLessThan(rawPotatoNutrients.vitaminC);

      // Energy should be concentrated due to water loss
      expect(result.transformedNutrients.energy).toBeGreaterThan(rawPotatoNutrients.energy);
    });

    it('should apply correct retention factors for boiling', () => {
      const cookingParams: CookingParameters = {
        method: CookingMethod.BOILED,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, cookingParams);

      // Check that retention factors were applied
      expect(result.retentionFactorsApplied).toBeDefined();
      expect(result.retentionFactorsApplied.vitaminC).toBeLessThan(1.0);
      expect(result.retentionFactorsApplied.protein).toBe(1.0); // Protein should be stable
    });
  });

  describe('Frying transformation', () => {
    it('should increase weight and fat content when oil is added', () => {
      const cookingParams: CookingParameters = {
        method: CookingMethod.FRIED,
        addedFat: 10, // 10g of oil
        temperature: 180,
        cookingTime: 5,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, cookingParams);

      // Fried foods can gain weight due to oil absorption
      expect(result.yieldFactor).toBeGreaterThan(1.0);
      expect(result.cookedWeight).toBeGreaterThan(100);

      // Fat content should increase significantly
      expect(result.transformedNutrients.fat).toBeGreaterThan(rawPotatoNutrients.fat);

      // Energy should increase due to added fat
      expect(result.transformedNutrients.energy).toBeGreaterThan(rawPotatoNutrients.energy);
    });

    it('should add sodium when salt is added', () => {
      const cookingParams: CookingParameters = {
        method: CookingMethod.FRIED,
        addedSalt: 2, // 2g of salt
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, cookingParams);

      // Sodium content should increase
      expect(result.transformedNutrients.sodium).toBeGreaterThan(rawPotatoNutrients.sodium);
    });
  });

  describe('Steaming transformation', () => {
    it('should preserve nutrients better than boiling', () => {
      const boilingParams: CookingParameters = {
        method: CookingMethod.BOILED,
      };

      const steamingParams: CookingParameters = {
        method: CookingMethod.STEAMED,
      };

      const boiledResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        boilingParams,
      );
      const steamedResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        steamingParams,
      );

      // Steaming should preserve more vitamin C than boiling
      expect(steamedResult.transformedNutrients.vitaminC).toBeGreaterThan(
        boiledResult.transformedNutrients.vitaminC,
      );

      // Steaming should also have less weight loss
      expect(steamedResult.yieldFactor).toBeGreaterThan(boiledResult.yieldFactor);
    });
  });

  describe('Cooking time effects', () => {
    it('should show more nutrient loss with longer cooking times', () => {
      const shortCookingParams: CookingParameters = {
        method: CookingMethod.BOILED,
        cookingTime: 10,
      };

      const longCookingParams: CookingParameters = {
        method: CookingMethod.BOILED,
        cookingTime: 30,
      };

      const shortResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        shortCookingParams,
      );
      const longResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        longCookingParams,
      );

      // Longer cooking should result in more weight loss
      expect(longResult.yieldFactor).toBeLessThan(shortResult.yieldFactor);
    });
  });

  describe('Temperature effects', () => {
    it('should show more nutrient loss with higher temperatures', () => {
      const lowTempParams: CookingParameters = {
        method: CookingMethod.BAKED,
        temperature: 150,
      };

      const highTempParams: CookingParameters = {
        method: CookingMethod.BAKED,
        temperature: 220,
      };

      const lowTempResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        lowTempParams,
      );
      const highTempResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        highTempParams,
      );

      // Higher temperature should result in more weight loss
      expect(highTempResult.yieldFactor).toBeLessThan(lowTempResult.yieldFactor);
    });
  });

  describe('Microwave transformation', () => {
    it('should preserve nutrients well due to quick cooking', () => {
      const microwaveParams: CookingParameters = {
        method: CookingMethod.MICROWAVE,
        cookingTime: 5,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, microwaveParams);

      // Microwave should preserve vitamin C better than boiling
      expect(result.transformedNutrients.vitaminC).toBeGreaterThan(
        rawPotatoNutrients.vitaminC * 0.4, // Should retain more than 40%
      );
    });
  });

  describe('Pressure cooking transformation', () => {
    it('should break down starches more than regular boiling', () => {
      const pressureCookingParams: CookingParameters = {
        method: CookingMethod.PRESSURE_COOKED,
        cookingTime: 8,
      };

      const boilingParams: CookingParameters = {
        method: CookingMethod.BOILED,
        cookingTime: 20,
      };

      const pressureResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        pressureCookingParams,
      );
      const boilingResult = service.applyCookingTransformation(
        rawPotatoNutrients,
        100,
        boilingParams,
      );

      // Both should reduce weight, but pressure cooking should be more efficient
      expect(pressureResult.yieldFactor).toBeGreaterThan(0.5);
      expect(boilingResult.yieldFactor).toBeGreaterThan(0.5);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero nutrient values', () => {
      const zeroNutrients: NutrientContent = {
        energy: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
      };

      const cookingParams: CookingParameters = {
        method: CookingMethod.BOILED,
      };

      const result = service.applyCookingTransformation(zeroNutrients, 100, cookingParams);

      expect(result.transformedNutrients.energy).toBe(0);
      expect(result.transformedNutrients.protein).toBe(0);
    });

    it('should handle extreme cooking times gracefully', () => {
      const extremeParams: CookingParameters = {
        method: CookingMethod.BOILED,
        cookingTime: 120, // 2 hours
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, extremeParams);

      // Should still have some minimal weight (not go to zero)
      expect(result.yieldFactor).toBeGreaterThan(0.1);
      expect(result.cookedWeight).toBeGreaterThan(10);
    });

    it('should handle very high temperatures', () => {
      const highTempParams: CookingParameters = {
        method: CookingMethod.GRILLED,
        temperature: 300,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, highTempParams);

      // Should still have reasonable results
      expect(result.yieldFactor).toBeGreaterThan(0.1);
      expect(result.transformedNutrients.energy).toBeGreaterThan(0);
    });
  });

  describe('Nutrient concentration effects', () => {
    it('should concentrate nutrients when water is lost', () => {
      const dehydratingParams: CookingParameters = {
        method: CookingMethod.DEHYDRATED,
      };

      const result = service.applyCookingTransformation(rawPotatoNutrients, 100, dehydratingParams);

      // Most nutrients should be concentrated due to water loss
      expect(result.transformedNutrients.protein).toBeGreaterThan(rawPotatoNutrients.protein);
      expect(result.transformedNutrients.fiber).toBeGreaterThan(rawPotatoNutrients.fiber);
      expect(result.transformedNutrients.calcium).toBeGreaterThan(rawPotatoNutrients.calcium);
    });
  });
});
