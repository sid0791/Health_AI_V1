import { Injectable, Logger } from '@nestjs/common';
import { RecipeFilterOptions } from '../repositories/recipe.repository';
import { DietType } from '../entities/recipe.entity';

export interface PersonalizationOptions {
  userId?: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  healthConditions?: string[];
  preferredCuisines?: string[];
  excludedIngredients?: string[];
  maxCalories?: number;
  maxPrepTime?: number;
  intolerances?: string[];
  religionBasedRestrictions?: string[];
}

export interface HealthConditionMapping {
  diabetes: boolean;
  hypertension: boolean;
  pcos: boolean;
  fattyLiver: boolean;
  sleepConcerns: boolean;
  libidoConcerns: boolean;
  hairLoss: boolean;
  dandruff: boolean;
  drySkin: boolean;
  depression: boolean;
}

@Injectable()
export class PersonalizationRulesService {
  private readonly logger = new Logger(PersonalizationRulesService.name);

  // Diet type mappings
  private readonly dietTypeMap: Record<string, DietType> = {
    vegetarian: DietType.VEGETARIAN,
    vegan: DietType.VEGAN,
    'non-vegetarian': DietType.NON_VEGETARIAN,
    'non_vegetarian': DietType.NON_VEGETARIAN,
    jain: DietType.JAIN,
    halal: DietType.HALAL,
    keto: DietType.KETO,
    paleo: DietType.PALEO,
  };

  // Health condition to recipe property mapping
  private readonly healthConditionMap: Record<string, keyof HealthConditionMapping> = {
    diabetes: 'diabetes',
    'type-2-diabetes': 'diabetes',
    't2dm': 'diabetes',
    hypertension: 'hypertension',
    'high-blood-pressure': 'hypertension',
    'blood-pressure': 'hypertension',
    pcos: 'pcos',
    'polycystic-ovary-syndrome': 'pcos',
    'fatty-liver': 'fattyLiver',
    'non-alcoholic-fatty-liver': 'fattyLiver',
    nafld: 'fattyLiver',
    sleep: 'sleepConcerns',
    'sleep-disorders': 'sleepConcerns',
    insomnia: 'sleepConcerns',
    libido: 'libidoConcerns',
    'sexual-health': 'libidoConcerns',
    'hair-loss': 'hairLoss',
    baldness: 'hairLoss',
    'grey-hair': 'hairLoss',
    dandruff: 'dandruff',
    'itchy-scalp': 'dandruff',
    'dry-skin': 'drySkin',
    'skin-health': 'drySkin',
    depression: 'depression',
    anxiety: 'depression',
    mood: 'depression',
  };

  // Common allergens and intolerances
  private readonly allergenMap: Record<string, string[]> = {
    gluten: ['wheat', 'barley', 'rye', 'oats'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
    nuts: ['almond', 'walnut', 'cashew', 'pistachio', 'hazelnut'],
    'tree-nuts': ['almond', 'walnut', 'cashew', 'pistachio', 'hazelnut'],
    peanuts: ['peanut', 'groundnut'],
    shellfish: ['shrimp', 'crab', 'lobster', 'clam', 'oyster'],
    fish: ['salmon', 'tuna', 'cod', 'mackerel'],
    eggs: ['egg', 'mayonnaise'],
    soy: ['soy', 'tofu', 'soy sauce', 'miso'],
    sesame: ['sesame', 'tahini'],
  };

  // Religion-based dietary restrictions
  private readonly religionRestrictions: Record<string, string[]> = {
    hindu: ['beef', 'cow'],
    islam: ['pork', 'alcohol', 'wine', 'beer'],
    muslim: ['pork', 'alcohol', 'wine', 'beer'],
    jewish: ['pork', 'shellfish', 'mixing dairy and meat'],
    jain: ['onion', 'garlic', 'potato', 'root vegetables'],
    buddhist: ['beef', 'pork', 'alcohol'],
  };

  async buildPersonalizedFilter(options: PersonalizationOptions): Promise<RecipeFilterOptions> {
    this.logger.debug(`Building personalized filter for user: ${options.userId || 'anonymous'}`);

    const filter: RecipeFilterOptions = {
      isActive: true,
    };

    // Apply diet type filters
    if (options.dietaryRestrictions?.length > 0) {
      filter.dietType = this.mapDietaryRestrictions(options.dietaryRestrictions);
    }

    // Apply health condition filters
    if (options.healthConditions?.length > 0) {
      filter.isHealthConditionFriendly = this.mapHealthConditions(options.healthConditions);
    }

    // Apply allergen exclusions
    const excludedIngredients = new Set<string>();
    
    // Add user-specified ingredient exclusions
    if (options.excludedIngredients?.length > 0) {
      options.excludedIngredients.forEach(ingredient => excludedIngredients.add(ingredient.toLowerCase()));
    }

    // Add allergen-based exclusions
    if (options.allergies?.length > 0) {
      options.allergies.forEach(allergen => {
        const ingredients = this.allergenMap[allergen.toLowerCase()];
        if (ingredients) {
          ingredients.forEach(ingredient => excludedIngredients.add(ingredient));
        }
      });
    }

    // Add intolerance-based exclusions
    if (options.intolerances?.length > 0) {
      options.intolerances.forEach(intolerance => {
        const ingredients = this.allergenMap[intolerance.toLowerCase()];
        if (ingredients) {
          ingredients.forEach(ingredient => excludedIngredients.add(ingredient));
        }
      });
    }

    // Add religion-based restrictions
    if (options.religionBasedRestrictions?.length > 0) {
      options.religionBasedRestrictions.forEach(religion => {
        const restrictions = this.religionRestrictions[religion.toLowerCase()];
        if (restrictions) {
          restrictions.forEach(ingredient => excludedIngredients.add(ingredient));
        }
      });
    }

    if (excludedIngredients.size > 0) {
      filter.excludeIngredients = Array.from(excludedIngredients);
    }

    // Apply cuisine preferences
    if (options.preferredCuisines?.length > 0) {
      filter.cuisine = options.preferredCuisines;
    }

    // Apply nutritional constraints
    if (options.maxCalories) {
      filter.maxCalories = options.maxCalories;
    }

    if (options.maxPrepTime) {
      filter.maxPrepTime = options.maxPrepTime;
    }

    this.logger.debug(`Built personalized filter:`, filter);
    return filter;
  }

  private mapDietaryRestrictions(restrictions: string[]): DietType[] {
    const dietTypes: DietType[] = [];
    
    restrictions.forEach(restriction => {
      const dietType = this.dietTypeMap[restriction.toLowerCase()];
      if (dietType && !dietTypes.includes(dietType)) {
        dietTypes.push(dietType);
      }
    });

    // If no specific diet types found, default to vegetarian for safety
    if (dietTypes.length === 0) {
      dietTypes.push(DietType.VEGETARIAN);
    }

    return dietTypes;
  }

  private mapHealthConditions(conditions: string[]): RecipeFilterOptions['isHealthConditionFriendly'] {
    const healthFilter: any = {};

    conditions.forEach(condition => {
      const mappedCondition = this.healthConditionMap[condition.toLowerCase()];
      if (mappedCondition) {
        switch (mappedCondition) {
          case 'diabetes':
            healthFilter.diabetes = true;
            break;
          case 'hypertension':
            healthFilter.hypertension = true;
            break;
          case 'pcos':
            healthFilter.pcos = true;
            break;
          case 'fattyLiver':
            healthFilter.fattyLiver = true;
            break;
        }
      }
    });

    return Object.keys(healthFilter).length > 0 ? healthFilter : undefined;
  }

  /**
   * Get craving-killer recipes for specific cravings
   */
  async getCravingKillerRecommendations(craving: string): Promise<RecipeFilterOptions> {
    const cravingMap: Record<string, Partial<RecipeFilterOptions>> = {
      sweet: {
        tags: ['healthy-dessert', 'natural-sweetener', 'fruit-based'],
        isLowCalorie: true,
      },
      salty: {
        tags: ['savory', 'herb-seasoned', 'spice-rich'],
        maxCalories: 300,
      },
      fried: {
        tags: ['air-fried', 'baked-alternative', 'crispy'],
        cookingMethod: ['air_fry', 'bake'],
      },
      chocolate: {
        tags: ['dark-chocolate', 'cacao', 'healthy-chocolate'],
        isLowCalorie: true,
      },
      spicy: {
        tags: ['spicy', 'chili', 'hot'],
        cuisine: ['Indian', 'Mexican', 'Thai'],
      },
    };

    return {
      ...cravingMap[craving.toLowerCase()],
      isActive: true,
    };
  }

  /**
   * Get "guilty pleasure" recipes that are healthier alternatives
   */
  async getGuiltyPleasureAlternatives(pleasure: string): Promise<RecipeFilterOptions> {
    const alternativeMap: Record<string, Partial<RecipeFilterOptions>> = {
      pizza: {
        tags: ['cauliflower-crust', 'whole-grain', 'veggie-loaded'],
        maxCalories: 400,
      },
      burger: {
        tags: ['veggie-burger', 'turkey-burger', 'portobello'],
        isHighProtein: true,
      },
      pasta: {
        tags: ['zucchini-noodles', 'whole-grain', 'veggie-pasta'],
        maxCalories: 350,
      },
      ice_cream: {
        tags: ['nice-cream', 'frozen-fruit', 'healthy-dessert'],
        isLowCalorie: true,
      },
      fries: {
        tags: ['sweet-potato-fries', 'baked-fries', 'veggie-fries'],
        cookingMethod: ['bake', 'air_fry'],
      },
    };

    return {
      ...alternativeMap[pleasure.toLowerCase()],
      isActive: true,
    };
  }

  /**
   * Check if a recipe is suitable for specific dietary requirements
   */
  isRecipeSuitable(recipe: any, options: PersonalizationOptions): boolean {
    // Check diet type compatibility
    if (options.dietaryRestrictions?.length > 0) {
      const requiredDietTypes = this.mapDietaryRestrictions(options.dietaryRestrictions);
      const hasCompatibleDiet = requiredDietTypes.some(dietType => recipe.dietType?.includes(dietType));
      if (!hasCompatibleDiet) return false;
    }

    // Check allergen exclusions
    if (options.allergies?.length > 0) {
      const hasAllergen = options.allergies.some(allergen => recipe.hasAllergen(allergen));
      if (hasAllergen) return false;
    }

    // Check excluded ingredients
    if (options.excludedIngredients?.length > 0) {
      const hasExcludedIngredient = recipe.ingredients?.some((ingredient: any) =>
        options.excludedIngredients.some(excluded =>
          ingredient.ingredientName.toLowerCase().includes(excluded.toLowerCase())
        )
      );
      if (hasExcludedIngredient) return false;
    }

    // Check nutritional constraints
    if (options.maxCalories && recipe.caloriesPerServing > options.maxCalories) {
      return false;
    }

    if (options.maxPrepTime && recipe.prepTimeMinutes > options.maxPrepTime) {
      return false;
    }

    return true;
  }

  /**
   * Score a recipe based on user preferences (0-100)
   */
  scoreRecipeForUser(recipe: any, options: PersonalizationOptions): number {
    let score = 50; // Base score

    // Preferred cuisine bonus
    if (options.preferredCuisines?.includes(recipe.cuisine)) {
      score += 20;
    }

    // Health condition alignment bonus
    if (options.healthConditions?.length > 0) {
      options.healthConditions.forEach(condition => {
        if (recipe.isHealthConditionFriendly(condition)) {
          score += 15;
        }
      });
    }

    // Quality and popularity factors
    if (recipe.qualityScore) {
      score += recipe.qualityScore * 2; // Quality score is 0-10, so this adds 0-20
    }

    if (recipe.popularityScore > 10) {
      score += 10;
    }

    // Time preference alignment
    if (options.maxPrepTime) {
      const timeRatio = recipe.prepTimeMinutes / options.maxPrepTime;
      if (timeRatio <= 0.5) {
        score += 10; // Quick recipes bonus
      } else if (timeRatio > 1) {
        score -= 15; // Penalty for exceeding time preference
      }
    }

    return Math.min(100, Math.max(0, score));
  }
}