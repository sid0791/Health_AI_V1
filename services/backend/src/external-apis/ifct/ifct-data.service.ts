import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Indian Food Composition Table (IFCT 2017) food data structure
 */
export interface IFCTFood {
  foodCode: string; // IFCT food code
  foodName: string;
  foodNameHindi?: string;
  foodNameLocal?: string;
  foodGroup: string;
  scientificName?: string;

  // Nutritional data per 100g edible portion
  energy: number; // kcal
  protein: number; // g
  fat: number; // g
  carbohydrate: number; // g
  fiber: number; // g
  ash: number; // g
  moisture: number; // g

  // Minerals (mg/100g unless specified)
  calcium: number;
  phosphorus: number;
  iron: number;
  magnesium?: number;
  zinc?: number;
  copper?: number;
  manganese?: number;
  sodium?: number;
  potassium?: number;

  // Vitamins
  vitaminA?: number; // μg
  betaCarotene?: number; // μg
  thiamin?: number; // mg
  riboflavin?: number; // mg
  niacin?: number; // mg
  vitaminB6?: number; // mg
  folate?: number; // μg
  vitaminB12?: number; // μg
  vitaminC?: number; // mg
  vitaminD?: number; // μg
  vitaminE?: number; // mg
  vitaminK?: number; // μg

  // Additional info
  region?: string; // Geographic region where food is common
  season?: string; // Seasonal availability
  preparationMethod?: string;
  ediblePortion?: number; // Percentage of food that is edible

  // Data quality indicators
  dataQuality: 'A' | 'B' | 'C' | 'D'; // IFCT quality rating
  lastUpdated: Date;
  source: 'IFCT_2017' | 'estimated' | 'calculated';
}

/**
 * Search parameters for IFCT database
 */
export interface IFCTSearchParams {
  query?: string;
  foodGroup?: string;
  region?: string;
  limit?: number;
  offset?: number;
}

/**
 * IFCT search result
 */
export interface IFCTSearchResult {
  foods: IFCTFood[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Service for accessing Indian Food Composition Table (IFCT 2017) data
 * Note: This implements a local database interface since IFCT data requires licensing
 */
@Injectable()
export class IFCTDataService {
  private readonly logger = new Logger(IFCTDataService.name);
  private ifctData: Map<string, IFCTFood> = new Map();
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeData();
  }

  /**
   * Search for Indian foods by name, food group, or region
   */
  async searchFoods(params: IFCTSearchParams): Promise<IFCTSearchResult> {
    await this.ensureInitialized();

    const { query, foodGroup, region, limit = 50, offset = 0 } = params;

    let results = Array.from(this.ifctData.values());

    // Apply filters
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(
        (food) =>
          food.foodName.toLowerCase().includes(queryLower) ||
          food.foodNameHindi?.toLowerCase().includes(queryLower) ||
          food.foodNameLocal?.toLowerCase().includes(queryLower) ||
          food.scientificName?.toLowerCase().includes(queryLower),
      );
    }

    if (foodGroup) {
      results = results.filter((food) => food.foodGroup.toLowerCase() === foodGroup.toLowerCase());
    }

    if (region) {
      results = results.filter((food) => food.region?.toLowerCase() === region.toLowerCase());
    }

    const total = results.length;
    const pagedResults = results.slice(offset, offset + limit);

    this.logger.debug(`IFCT search returned ${pagedResults.length} of ${total} foods`);

    return {
      foods: pagedResults,
      total,
      offset,
      limit,
    };
  }

  /**
   * Get food details by IFCT food code
   */
  async getFoodByCode(foodCode: string): Promise<IFCTFood | null> {
    await this.ensureInitialized();
    return this.ifctData.get(foodCode) || null;
  }

  /**
   * Get all available food groups in IFCT
   */
  async getFoodGroups(): Promise<string[]> {
    await this.ensureInitialized();
    const groups = new Set<string>();
    this.ifctData.forEach((food) => groups.add(food.foodGroup));
    return Array.from(groups).sort();
  }

  /**
   * Get all available regions
   */
  async getRegions(): Promise<string[]> {
    await this.ensureInitialized();
    const regions = new Set<string>();
    this.ifctData.forEach((food) => {
      if (food.region) regions.add(food.region);
    });
    return Array.from(regions).sort();
  }

  /**
   * Get recommended Indian foods for specific nutritional needs
   */
  async getRecommendedFoods(
    nutrientType: 'protein' | 'iron' | 'calcium' | 'fiber' | 'vitaminC',
  ): Promise<IFCTFood[]> {
    await this.ensureInitialized();

    const foods = Array.from(this.ifctData.values());

    // Sort by specified nutrient content (descending)
    switch (nutrientType) {
      case 'protein':
        return foods.sort((a, b) => b.protein - a.protein).slice(0, 20);
      case 'iron':
        return foods.sort((a, b) => b.iron - a.iron).slice(0, 20);
      case 'calcium':
        return foods.sort((a, b) => b.calcium - a.calcium).slice(0, 20);
      case 'fiber':
        return foods.sort((a, b) => b.fiber - a.fiber).slice(0, 20);
      case 'vitaminC':
        return foods
          .filter((food) => food.vitaminC && food.vitaminC > 0)
          .sort((a, b) => (b.vitaminC || 0) - (a.vitaminC || 0))
          .slice(0, 20);
      default:
        return [];
    }
  }

  /**
   * Initialize IFCT data
   * In production, this would load from a licensed IFCT database
   */
  private async initializeData(): Promise<void> {
    if (this.initialized) return;

    try {
      // Sample IFCT data for common Indian foods
      // In production, this would be loaded from a licensed IFCT database
      const sampleData: IFCTFood[] = [
        {
          foodCode: 'A001',
          foodName: 'Rice, raw, milled',
          foodNameHindi: 'चावल',
          foodGroup: 'Cereals and Millets',
          energy: 345,
          protein: 6.8,
          fat: 0.5,
          carbohydrate: 78.2,
          fiber: 0.2,
          ash: 0.6,
          moisture: 13.7,
          calcium: 10,
          phosphorus: 160,
          iron: 0.7,
          magnesium: 23,
          zinc: 1.4,
          thiamin: 0.06,
          riboflavin: 0.06,
          niacin: 1.9,
          region: 'All India',
          dataQuality: 'A',
          lastUpdated: new Date('2017-01-01'),
          source: 'IFCT_2017',
        },
        {
          foodCode: 'A002',
          foodName: 'Wheat flour, whole',
          foodNameHindi: 'गेहूं का आटा',
          foodGroup: 'Cereals and Millets',
          energy: 341,
          protein: 12.1,
          fat: 1.7,
          carbohydrate: 69.4,
          fiber: 11.2,
          ash: 1.5,
          moisture: 4.1,
          calcium: 48,
          phosphorus: 355,
          iron: 4.9,
          magnesium: 110,
          zinc: 2.9,
          thiamin: 0.45,
          riboflavin: 0.17,
          niacin: 5.5,
          region: 'All India',
          dataQuality: 'A',
          lastUpdated: new Date('2017-01-01'),
          source: 'IFCT_2017',
        },
        {
          foodCode: 'B001',
          foodName: 'Bengal gram, dal',
          foodNameHindi: 'चना दाल',
          foodGroup: 'Legumes',
          energy: 372,
          protein: 22.5,
          fat: 1.9,
          carbohydrate: 61.5,
          fiber: 3.9,
          ash: 2.8,
          moisture: 9.3,
          calcium: 56,
          phosphorus: 312,
          iron: 2.9,
          magnesium: 140,
          zinc: 2.5,
          thiamin: 0.37,
          riboflavin: 0.15,
          niacin: 2.9,
          region: 'All India',
          dataQuality: 'A',
          lastUpdated: new Date('2017-01-01'),
          source: 'IFCT_2017',
        },
        {
          foodCode: 'C001',
          foodName: 'Spinach, leaves',
          foodNameHindi: 'पालक',
          foodGroup: 'Green Leafy Vegetables',
          energy: 26,
          protein: 2.0,
          fat: 0.7,
          carbohydrate: 2.9,
          fiber: 0.6,
          ash: 1.7,
          moisture: 92.1,
          calcium: 73,
          phosphorus: 21,
          iron: 1.14,
          magnesium: 34,
          zinc: 0.4,
          vitaminA: 469,
          betaCarotene: 5626,
          thiamin: 0.03,
          riboflavin: 0.04,
          niacin: 0.5,
          vitaminC: 28.1,
          region: 'All India',
          season: 'Winter',
          ediblePortion: 85,
          dataQuality: 'A',
          lastUpdated: new Date('2017-01-01'),
          source: 'IFCT_2017',
        },
        {
          foodCode: 'D001',
          foodName: 'Mango, ripe',
          foodNameHindi: 'आम',
          foodGroup: 'Fruits',
          energy: 74,
          protein: 0.6,
          fat: 0.4,
          carbohydrate: 18.0,
          fiber: 1.2,
          ash: 0.4,
          moisture: 79.4,
          calcium: 14,
          phosphorus: 16,
          iron: 0.16,
          magnesium: 15,
          zinc: 0.04,
          vitaminA: 54,
          betaCarotene: 640,
          thiamin: 0.04,
          riboflavin: 0.05,
          niacin: 0.6,
          vitaminC: 16.9,
          region: 'All India',
          season: 'Summer',
          ediblePortion: 75,
          dataQuality: 'A',
          lastUpdated: new Date('2017-01-01'),
          source: 'IFCT_2017',
        },
        {
          foodCode: 'E001',
          foodName: 'Milk, buffalo',
          foodNameHindi: 'भैंस का दूध',
          foodGroup: 'Milk and Milk Products',
          energy: 117,
          protein: 4.3,
          fat: 6.9,
          carbohydrate: 5.0,
          fiber: 0,
          ash: 0.8,
          moisture: 83.0,
          calcium: 210,
          phosphorus: 130,
          iron: 0.2,
          magnesium: 14,
          zinc: 0.5,
          vitaminA: 53,
          thiamin: 0.05,
          riboflavin: 0.135,
          niacin: 0.1,
          vitaminB12: 0.4,
          region: 'All India',
          dataQuality: 'A',
          lastUpdated: new Date('2017-01-01'),
          source: 'IFCT_2017',
        },
      ];

      // Load data into map
      sampleData.forEach((food) => {
        this.ifctData.set(food.foodCode, food);
      });

      this.logger.log(`Initialized IFCT database with ${this.ifctData.size} foods`);
      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize IFCT data', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeData();
    }
  }

  /**
   * Convert IFCT food to standardized nutrient content format
   */
  toNutrientContent(ifctFood: IFCTFood): any {
    return {
      energy: ifctFood.energy,
      protein: ifctFood.protein,
      carbohydrates: ifctFood.carbohydrate,
      fat: ifctFood.fat,
      fiber: ifctFood.fiber,
      sugar: 0, // IFCT doesn't typically separate sugar from carbs

      // Vitamins
      vitaminA: ifctFood.vitaminA,
      vitaminC: ifctFood.vitaminC,
      vitaminD: ifctFood.vitaminD,
      vitaminE: ifctFood.vitaminE,
      vitaminK: ifctFood.vitaminK,
      thiamin: ifctFood.thiamin,
      riboflavin: ifctFood.riboflavin,
      niacin: ifctFood.niacin,
      vitaminB6: ifctFood.vitaminB6,
      folate: ifctFood.folate,
      vitaminB12: ifctFood.vitaminB12,

      // Minerals
      calcium: ifctFood.calcium,
      iron: ifctFood.iron,
      magnesium: ifctFood.magnesium,
      phosphorus: ifctFood.phosphorus,
      potassium: ifctFood.potassium,
      sodium: ifctFood.sodium,
      zinc: ifctFood.zinc,
      copper: ifctFood.copper,
      manganese: ifctFood.manganese,
    };
  }
}
