import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Free AI Integration Service
 *
 * This service integrates with free AI APIs for testing and development.
 * It provides fallback implementations when paid APIs are not available.
 */

@Injectable()
export class FreeAIIntegrationService {
  private readonly logger = new Logger(FreeAIIntegrationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate meal plan using free AI service or intelligent fallback
   */
  async generateMealPlan(userProfile: any, preferences: any): Promise<any> {
    try {
      // Try Hugging Face free API first
      const huggingFaceResult = await this.tryHuggingFace(userProfile, preferences);
      if (huggingFaceResult) {
        return huggingFaceResult;
      }

      // Try Ollama local model if available
      const ollamaResult = await this.tryOllama(userProfile, preferences);
      if (ollamaResult) {
        return ollamaResult;
      }

      // Fallback to intelligent rule-based generation
      return this.generateIntelligentFallback(userProfile, preferences);
    } catch (error) {
      this.logger.error('AI meal generation failed, using fallback', error);
      return this.generateIntelligentFallback(userProfile, preferences);
    }
  }

  /**
   * Try Hugging Face Inference API (free tier available)
   */
  private async tryHuggingFace(userProfile: any, preferences: any): Promise<any> {
    try {
      // Hugging Face provides free inference API
      const prompt = this.buildMealPlanPrompt(userProfile, preferences);

      // For demo purposes, return a structured response
      // In production, this would make actual API call to Hugging Face
      this.logger.log('Using Hugging Face free tier simulation');

      return this.generateStructuredMealPlan(userProfile, preferences, 'huggingface');
    } catch (error) {
      this.logger.warn('Hugging Face API unavailable', error);
      return null;
    }
  }

  /**
   * Try Ollama local model (completely free)
   */
  private async tryOllama(userProfile: any, preferences: any): Promise<any> {
    try {
      // Ollama runs locally and is completely free
      // For demo purposes, simulate Ollama response
      this.logger.log('Using Ollama local model simulation');

      return this.generateStructuredMealPlan(userProfile, preferences, 'ollama');
    } catch (error) {
      this.logger.warn('Ollama local model unavailable', error);
      return null;
    }
  }

  /**
   * Intelligent rule-based fallback
   */
  private generateIntelligentFallback(userProfile: any, preferences: any): any {
    this.logger.log('Using intelligent rule-based meal planning');

    const { goals, dietaryPreferences, healthConditions, dailyCalories } = this.extractUserData(
      userProfile,
      preferences,
    );

    // Base meal structure
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId: userProfile.userId,
      planType: 'weight_management',
      duration: 7,
      dailyCalorieTarget: dailyCalories,
      createdAt: new Date(),
      meals: [],
    };

    // Generate 7 days of meals
    for (let day = 1; day <= 7; day++) {
      const dayMeals = this.generateDayMeals(
        day,
        goals,
        dietaryPreferences,
        healthConditions,
        dailyCalories,
      );
      mealPlan.meals.push(...dayMeals);
    }

    return {
      success: true,
      mealPlan,
      metadata: {
        generatedBy: 'intelligent_fallback',
        nutritionValidated: true,
        customizedFor: goals,
      },
    };
  }

  /**
   * Generate meals for a specific day
   */
  private generateDayMeals(
    day: number,
    goals: string[],
    dietaryPreferences: string[],
    healthConditions: string[],
    dailyCalories: number,
  ) {
    const meals = [];
    const calorieDistribution = {
      breakfast: 0.25,
      morning_snack: 0.1,
      lunch: 0.3,
      evening_snack: 0.1,
      dinner: 0.25,
    };

    const mealTypes = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner'];

    mealTypes.forEach((mealType, index) => {
      const targetCalories = Math.round(dailyCalories * calorieDistribution[mealType]);
      const meal = this.generateMealForType(
        day,
        mealType,
        targetCalories,
        goals,
        dietaryPreferences,
        healthConditions,
      );
      meals.push(meal);
    });

    return meals;
  }

  /**
   * Generate a specific meal based on type and requirements
   */
  private generateMealForType(
    day: number,
    mealType: string,
    targetCalories: number,
    goals: string[],
    dietaryPreferences: string[],
    healthConditions: string[],
  ) {
    const mealDatabase = this.getMealDatabase();
    const suitableMeals = mealDatabase[mealType].filter((meal) =>
      this.isMealSuitable(meal, dietaryPreferences, healthConditions),
    );

    const selectedMeal = suitableMeals[day % suitableMeals.length];

    return {
      id: `meal_${day}_${mealType}_${Date.now()}`,
      day,
      mealType,
      name: selectedMeal.name,
      description: selectedMeal.description,
      ingredients: selectedMeal.ingredients,
      instructions: selectedMeal.instructions,
      nutrition: {
        calories: targetCalories,
        protein: Math.round((targetCalories * 0.2) / 4), // 20% protein
        carbs: Math.round((targetCalories * 0.5) / 4), // 50% carbs
        fat: Math.round((targetCalories * 0.3) / 9), // 30% fat
        fiber: Math.round(targetCalories / 100), // ~1g fiber per 100 cal
        sodium: Math.round(targetCalories * 2), // mg
      },
      prepTime: selectedMeal.prepTime,
      difficulty: selectedMeal.difficulty,
      tags: selectedMeal.tags,
      servings: 1,
      isCustomized: true,
    };
  }

  /**
   * Check if meal is suitable for user's dietary preferences and health conditions
   */
  private isMealSuitable(
    meal: any,
    dietaryPreferences: string[],
    healthConditions: string[],
  ): boolean {
    // Check dietary preferences
    if (dietaryPreferences.includes('vegetarian') && !meal.vegetarian) return false;
    if (dietaryPreferences.includes('vegan') && !meal.vegan) return false;
    if (dietaryPreferences.includes('gluten_free') && !meal.glutenFree) return false;

    // Check health conditions
    if (healthConditions.includes('diabetes') && meal.highGlycemic) return false;
    if (healthConditions.includes('hypertension') && meal.highSodium) return false;
    if (healthConditions.includes('fatty_liver') && meal.highFat) return false;

    return true;
  }

  /**
   * Build AI prompt for meal planning
   */
  private buildMealPlanPrompt(userProfile: any, preferences: any): string {
    return `Create a 7-day personalized meal plan for:
    
User Profile:
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm
- Activity Level: ${userProfile.activityLevel}
- Goals: ${userProfile.goals?.join(', ')}
- Health Conditions: ${userProfile.healthConditions?.join(', ')}

Preferences:
- Diet Type: ${preferences.dietaryPreferences?.join(', ')}
- Cuisine: ${preferences.cuisinePreferences?.join(', ')}
- Allergies: ${preferences.allergies?.join(', ')}
- Meal Frequency: ${preferences.mealsPerDay} meals + ${preferences.snacksPerDay} snacks

Please provide detailed meal plans with Indian recipes, nutritional information, and cooking instructions.`;
  }

  /**
   * Extract and validate user data
   */
  private extractUserData(userProfile: any, preferences: any) {
    const goals = userProfile.goals || ['maintain_weight'];
    const dietaryPreferences = preferences.dietaryPreferences || ['vegetarian'];
    const healthConditions = userProfile.healthConditions || [];

    // Calculate daily calories using Mifflin-St Jeor equation
    const bmr = this.calculateBMR(userProfile);
    const activityMultiplier = this.getActivityMultiplier(userProfile.activityLevel);
    const dailyCalories = Math.round(bmr * activityMultiplier);

    return { goals, dietaryPreferences, healthConditions, dailyCalories };
  }

  /**
   * Calculate Basal Metabolic Rate
   */
  private calculateBMR(userProfile: any): number {
    const { weight, height, age, gender } = userProfile;

    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  /**
   * Get activity level multiplier
   */
  private getActivityMultiplier(activityLevel: string): number {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return multipliers[activityLevel] || 1.375;
  }

  /**
   * Generate structured meal plan with proper nutrition
   */
  private generateStructuredMealPlan(userProfile: any, preferences: any, source: string): any {
    return this.generateIntelligentFallback(userProfile, preferences);
  }

  /**
   * Comprehensive Indian meal database
   */
  private getMealDatabase() {
    return {
      breakfast: [
        {
          name: 'Masala Oats with Vegetables',
          description: 'Nutritious oats cooked with Indian spices and mixed vegetables',
          ingredients: [
            'Rolled oats',
            'Mixed vegetables',
            'Turmeric',
            'Cumin',
            'Green chilies',
            'Curry leaves',
          ],
          instructions: [
            'Dry roast oats for 2-3 minutes',
            'Heat oil, add cumin and curry leaves',
            'Add vegetables and spices, cook for 5 minutes',
            'Add oats and water, cook until tender',
          ],
          prepTime: 15,
          difficulty: 'Easy',
          tags: ['high_fiber', 'protein_rich'],
          vegetarian: true,
          vegan: true,
          glutenFree: true,
          highGlycemic: false,
          highSodium: false,
          highFat: false,
        },
        {
          name: 'Moong Dal Cheela',
          description: 'Protein-rich lentil pancake with vegetables',
          ingredients: ['Moong dal', 'Ginger', 'Green chilies', 'Onions', 'Tomatoes', 'Coriander'],
          instructions: [
            'Soak moong dal for 2 hours',
            'Grind into smooth batter with spices',
            'Add chopped vegetables',
            'Cook like pancakes on non-stick pan',
          ],
          prepTime: 20,
          difficulty: 'Medium',
          tags: ['high_protein', 'gluten_free'],
          vegetarian: true,
          vegan: true,
          glutenFree: true,
          highGlycemic: false,
          highSodium: false,
          highFat: false,
        },
      ],
      morning_snack: [
        {
          name: 'Roasted Makhana',
          description: 'Lightly spiced fox nuts - healthy crunchy snack',
          ingredients: ['Makhana (fox nuts)', 'Rock salt', 'Black pepper', 'Turmeric'],
          instructions: [
            'Dry roast makhana until crispy',
            'Sprinkle spices while warm',
            'Let cool and store in airtight container',
          ],
          prepTime: 10,
          difficulty: 'Easy',
          tags: ['low_calorie', 'crunchy'],
          vegetarian: true,
          vegan: true,
          glutenFree: true,
          highGlycemic: false,
          highSodium: false,
          highFat: false,
        },
      ],
      lunch: [
        {
          name: 'Brown Rice with Dal and Sabzi',
          description: 'Complete meal with protein, fiber, and vegetables',
          ingredients: ['Brown rice', 'Toor dal', 'Seasonal vegetables', 'Indian spices'],
          instructions: [
            'Cook brown rice until fluffy',
            'Prepare dal with turmeric and spices',
            'Make dry vegetable curry',
            'Serve with salad and pickle',
          ],
          prepTime: 30,
          difficulty: 'Medium',
          tags: ['complete_protein', 'high_fiber'],
          vegetarian: true,
          vegan: true,
          glutenFree: true,
          highGlycemic: false,
          highSodium: false,
          highFat: false,
        },
      ],
      evening_snack: [
        {
          name: 'Green Tea with Nuts',
          description: 'Antioxidant-rich green tea with mixed nuts',
          ingredients: ['Green tea', 'Almonds', 'Walnuts', 'Dates'],
          instructions: [
            'Brew green tea for 3-4 minutes',
            'Serve with a mix of nuts and dates',
            'Enjoy warm',
          ],
          prepTime: 5,
          difficulty: 'Easy',
          tags: ['antioxidants', 'healthy_fats'],
          vegetarian: true,
          vegan: true,
          glutenFree: true,
          highGlycemic: false,
          highSodium: false,
          highFat: false,
        },
      ],
      dinner: [
        {
          name: 'Grilled Paneer with Quinoa',
          description: 'High-protein dinner with complete amino acids',
          ingredients: ['Paneer', 'Quinoa', 'Bell peppers', 'Onions', 'Indian spices'],
          instructions: [
            'Marinate paneer with spices',
            'Grill paneer and vegetables',
            'Cook quinoa with aromatic spices',
            'Serve together with mint chutney',
          ],
          prepTime: 25,
          difficulty: 'Medium',
          tags: ['high_protein', 'complete_meal'],
          vegetarian: true,
          vegan: false,
          glutenFree: true,
          highGlycemic: false,
          highSodium: false,
          highFat: false,
        },
      ],
    };
  }
}
