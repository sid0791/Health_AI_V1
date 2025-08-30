import { Test, TestingModule } from '@nestjs/testing';
import { RecipeSeedingService } from '../recipe-seeding.service';
import { RecipeService } from '../recipe.service';
import { RECIPE_SEED_DATA } from '../../data/recipe-seed-data';

describe('RecipeSeedingService', () => {
  let service: RecipeSeedingService;
  let recipeService: jest.Mocked<RecipeService>;

  beforeEach(async () => {
    const mockRecipeService = {
      bulkCreateRecipes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeSeedingService,
        {
          provide: RecipeService,
          useValue: mockRecipeService,
        },
      ],
    }).compile();

    service = module.get<RecipeSeedingService>(RecipeSeedingService);
    recipeService = module.get(RecipeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSeedingStats', () => {
    it('should return correct seeding statistics', async () => {
      const stats = await service.getSeedingStats();

      expect(stats).toHaveProperty('totalRecipes');
      expect(stats).toHaveProperty('categoryCounts');
      expect(stats).toHaveProperty('cuisineCounts');
      expect(stats).toHaveProperty('healthFriendlyCounts');
      expect(stats.totalRecipes).toBe(RECIPE_SEED_DATA.length);
      expect(stats.totalRecipes).toBeGreaterThan(0);
    });

    it('should count cuisines correctly', async () => {
      const stats = await service.getSeedingStats();

      expect(stats.cuisineCounts).toHaveProperty('Indian');
      expect(stats.cuisineCounts).toHaveProperty('Mediterranean');
      expect(stats.cuisineCounts.Indian).toBeGreaterThan(0);
    });

    it('should count health-friendly recipes correctly', async () => {
      const stats = await service.getSeedingStats();

      expect(stats.healthFriendlyCounts).toHaveProperty('diabeticFriendly');
      expect(stats.healthFriendlyCounts).toHaveProperty('pcosFriendly');
      expect(stats.healthFriendlyCounts).toHaveProperty('highProtein');
      expect(stats.healthFriendlyCounts).toHaveProperty('lowCalorie');
    });
  });

  describe('validateSeedData', () => {
    it('should validate seed data without issues', async () => {
      const validation = await service.validateSeedData();

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('generateSampleRecommendations', () => {
    it('should generate sample recommendations for different health conditions', async () => {
      const recommendations = await service.generateSampleRecommendations();

      expect(recommendations).toHaveProperty('diabeticFriendly');
      expect(recommendations).toHaveProperty('pcosFriendly');
      expect(recommendations).toHaveProperty('weightLoss');
      expect(recommendations).toHaveProperty('highProtein');

      expect(Array.isArray(recommendations.diabeticFriendly)).toBe(true);
      expect(Array.isArray(recommendations.pcosFriendly)).toBe(true);
      expect(Array.isArray(recommendations.weightLoss)).toBe(true);
      expect(Array.isArray(recommendations.highProtein)).toBe(true);
    });

    it('should limit recommendations to 3 per category', async () => {
      const recommendations = await service.generateSampleRecommendations();

      expect(recommendations.diabeticFriendly.length).toBeLessThanOrEqual(3);
      expect(recommendations.pcosFriendly.length).toBeLessThanOrEqual(3);
      expect(recommendations.weightLoss.length).toBeLessThanOrEqual(3);
      expect(recommendations.highProtein.length).toBeLessThanOrEqual(3);
    });
  });

  describe('seedRecipes', () => {
    it('should call bulkCreateRecipes with seed data', async () => {
      const mockRecipes = RECIPE_SEED_DATA.slice(0, 2); // Mock successful creation
      recipeService.bulkCreateRecipes.mockResolvedValue(mockRecipes as any);

      const result = await service.seedRecipes();

      expect(recipeService.bulkCreateRecipes).toHaveBeenCalledWith(RECIPE_SEED_DATA);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(RECIPE_SEED_DATA.length - 2);
    });
  });
});
