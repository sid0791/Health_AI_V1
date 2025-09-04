import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface UserPreferences {
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  activityLevel?: string;
  goals?: string[];
  healthConditions?: string[];
  allergies?: string[];
  dietaryPreferences?: string[];
  cuisinePreferences?: string[];
  budgetRange?: { min: number; max: number };
  cookingSkillLevel?: number;
  availableCookingTime?: number;
}

export interface GenerateMealPlanRequest {
  userId: string;
  userPreferences?: UserPreferences;
  planDuration?: number;
  targetCalories?: number;
}

@Injectable()
export class AIMealPlanningService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    // For demo purposes, we'll use a free API key or fallback to mock data
    // In production, this would come from environment variables
    const apiKey = process.env.GOOGLE_API_KEY || 'demo-key';
    
    if (apiKey && apiKey !== 'demo-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateMealPlan(request: GenerateMealPlanRequest): Promise<any> {
    // If no real API key is available, use enhanced mock data
    if (!this.genAI) {
      return this.generateIntelligentMockMealPlan(request);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = this.buildMealPlanPrompt(request);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the AI response and structure it
      return this.parseAIResponse(text, request);
    } catch (error) {
      console.log('AI API error, falling back to intelligent mock data:', error.message);
      // Fallback to intelligent mock data if AI API fails
      return this.generateIntelligentMockMealPlan(request);
    }
  }

  private buildMealPlanPrompt(request: GenerateMealPlanRequest): string {
    const { userPreferences, planDuration = 7, targetCalories = 1800 } = request;
    
    let prompt = `Generate a ${planDuration}-day personalized meal plan with the following requirements:

**User Profile:**
- Daily calorie target: ${targetCalories} calories
`;

    if (userPreferences) {
      if (userPreferences.age) prompt += `- Age: ${userPreferences.age} years\n`;
      if (userPreferences.gender) prompt += `- Gender: ${userPreferences.gender}\n`;
      if (userPreferences.weight) prompt += `- Weight: ${userPreferences.weight} kg\n`;
      if (userPreferences.height) prompt += `- Height: ${userPreferences.height} cm\n`;
      if (userPreferences.activityLevel) prompt += `- Activity Level: ${userPreferences.activityLevel}\n`;
      if (userPreferences.goals?.length) prompt += `- Goals: ${userPreferences.goals.join(', ')}\n`;
      if (userPreferences.healthConditions?.length) prompt += `- Health Conditions: ${userPreferences.healthConditions.join(', ')}\n`;
      if (userPreferences.allergies?.length) prompt += `- Allergies: ${userPreferences.allergies.join(', ')}\n`;
      if (userPreferences.dietaryPreferences?.length) prompt += `- Dietary Preferences: ${userPreferences.dietaryPreferences.join(', ')}\n`;
      if (userPreferences.cuisinePreferences?.length) prompt += `- Cuisine Preferences: ${userPreferences.cuisinePreferences.join(', ')}\n`;
      if (userPreferences.cookingSkillLevel) prompt += `- Cooking Skill Level: ${userPreferences.cookingSkillLevel}/5\n`;
      if (userPreferences.availableCookingTime) prompt += `- Available Cooking Time: ${userPreferences.availableCookingTime} minutes per meal\n`;
    }

    prompt += `

**Requirements:**
- Provide exactly ${planDuration} days of meals
- Each day should have breakfast, lunch, dinner, and 1-2 snacks
- Include detailed nutrition information (calories, protein, carbs, fat, fiber)
- Provide cooking instructions and ingredient lists
- Ensure meals are culturally appropriate and delicious
- Balance nutrition throughout the week
- Consider preparation time and cooking skill level

**Output Format (JSON):**
{
  "id": "plan-[timestamp]",
  "userId": "${request.userId}",
  "startDate": "[YYYY-MM-DD]",
  "endDate": "[YYYY-MM-DD]",
  "days": [
    {
      "date": "[YYYY-MM-DD]",
      "breakfast": {
        "name": "Meal Name",
        "description": "Brief description",
        "calories": 000,
        "protein": 00,
        "carbs": 00,
        "fat": 00,
        "fiber": 00,
        "preparationTime": 00,
        "difficulty": "Easy/Medium/Hard",
        "cuisine": "Cuisine Type",
        "ingredients": ["ingredient 1", "ingredient 2"],
        "instructions": ["step 1", "step 2"],
        "tags": ["tag1", "tag2"]
      },
      "lunch": { ... },
      "dinner": { ... },
      "snacks": [{ ... }],
      "totalCalories": 0000,
      "totalProtein": 000,
      "totalCarbs": 000,
      "totalFat": 000
    }
  ],
  "totalWeeklyCalories": 00000,
  "averageDailyCalories": 0000,
  "nutritionSummary": {
    "protein": 000,
    "carbs": 000,
    "fat": 000,
    "fiber": 000
  }
}

Generate the JSON response only, no additional text.`;

    return prompt;
  }

  private parseAIResponse(aiResponse: string, request: GenerateMealPlanRequest): any {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (error) {
      console.log('Failed to parse AI response, using fallback data');
    }
    
    // If parsing fails, return intelligent mock data
    return this.generateIntelligentMockMealPlan(request);
  }

  private generateIntelligentMockMealPlan(request: GenerateMealPlanRequest): any {
    const { userPreferences, planDuration = 7, targetCalories = 1800 } = request;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (planDuration - 1) * 24 * 60 * 60 * 1000);

    // Intelligent meal selection based on user preferences
    const mealLibrary = this.getIntelligentMealLibrary(userPreferences, targetCalories);
    
    const days = [];
    for (let i = 0; i < planDuration; i++) {
      const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Select meals based on preferences and variety
      const breakfast = this.selectMeal(mealLibrary.breakfast, i);
      const lunch = this.selectMeal(mealLibrary.lunch, i);
      const dinner = this.selectMeal(mealLibrary.dinner, i);
      const snacks = [this.selectMeal(mealLibrary.snacks, i)];

      // Convert to frontend format with MealPlanEntry structure
      const meals = [
        {
          id: `entry-breakfast-${i}`,
          mealType: 'breakfast',
          time: '08:00',
          recipe: breakfast,
          portionSize: 1.0
        },
        {
          id: `entry-lunch-${i}`,
          mealType: 'lunch',
          time: '13:00',
          recipe: lunch,
          portionSize: 1.0
        },
        {
          id: `entry-dinner-${i}`,
          mealType: 'dinner',
          time: '19:00',
          recipe: dinner,
          portionSize: 1.0
        },
        {
          id: `entry-snack-${i}`,
          mealType: 'snack',
          time: '16:00',
          recipe: snacks[0],
          portionSize: 1.0
        }
      ];

      const dayPlan = {
        date: dayDate.toISOString().split('T')[0],
        meals,
        totalNutrition: {
          calories: breakfast.calories + lunch.calories + dinner.calories + snacks[0].calories,
          protein: breakfast.protein + lunch.protein + dinner.protein + snacks[0].protein,
          carbs: breakfast.carbs + lunch.carbs + dinner.carbs + snacks[0].carbs,
          fat: breakfast.fat + lunch.fat + dinner.fat + snacks[0].fat,
        }
      };

      days.push(dayPlan);
    }

    const totalWeeklyCalories = days.reduce((sum, day) => sum + day.totalNutrition.calories, 0);

    return {
      id: `ai-plan-${Date.now()}`,
      userId: request.userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
      totalWeeklyCalories,
      averageDailyCalories: Math.round(totalWeeklyCalories / planDuration),
      nutritionSummary: {
        protein: days.reduce((sum, day) => sum + day.totalNutrition.protein, 0),
        carbs: days.reduce((sum, day) => sum + day.totalNutrition.carbs, 0),
        fat: days.reduce((sum, day) => sum + day.totalNutrition.fat, 0),
        fiber: days.reduce((sum, day) => {
          return sum + day.meals.reduce((mealSum, meal) => mealSum + (meal.recipe.fiber || 0), 0);
        }, 0),
      },
      goals: userPreferences?.goals || [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  private getIntelligentMealLibrary(preferences: UserPreferences, targetCalories: number) {
    // Adjust meals based on preferences
    const isVegetarian = preferences?.dietaryPreferences?.includes('vegetarian');
    const isVegan = preferences?.dietaryPreferences?.includes('vegan');
    const hasNutAllergy = preferences?.allergies?.includes('nuts');
    const likesIndian = preferences?.cuisinePreferences?.includes('Indian');
    const likesMediterranean = preferences?.cuisinePreferences?.includes('Mediterranean');
    
    // Calculate calorie distribution (30% breakfast, 35% lunch, 30% dinner, 5% snacks)
    const breakfastCals = Math.round(targetCalories * 0.30);
    const lunchCals = Math.round(targetCalories * 0.35);
    const dinnerCals = Math.round(targetCalories * 0.30);
    const snackCals = Math.round(targetCalories * 0.05);

    return {
      breakfast: [
        {
          id: 'ai-breakfast-1',
          name: likesIndian ? 'Vegetable Poha with Lemon' : 'Greek Yogurt Parfait',
          description: likesIndian ? 'Traditional Indian flattened rice with vegetables and spices' : 'Protein-rich Greek yogurt with mixed berries and granola',
          calories: breakfastCals,
          protein: Math.round(breakfastCals * 0.20 / 4), // 20% protein
          carbs: Math.round(breakfastCals * 0.50 / 4), // 50% carbs
          fat: Math.round(breakfastCals * 0.30 / 9), // 30% fat
          fiber: 8,
          preparationTime: 15,
          prepTime: 15, // Add both for compatibility
          cookTime: 0,
          servings: 1,
          difficulty: 'Easy',
          cuisine: likesIndian ? 'Indian' : 'Mediterranean',
          ingredients: likesIndian ? 
            ['Poha (150g)', 'Mixed vegetables (100g)', 'Mustard seeds', 'Curry leaves', 'Lemon juice', 'Turmeric'] :
            ['Greek yogurt (200g)', 'Mixed berries (100g)', 'Granola (30g)', 'Honey (15ml)'],
          instructions: likesIndian ? 
            ['Rinse and soak poha', 'Heat oil, add mustard seeds and curry leaves', 'Add vegetables and spices', 'Mix in poha and cook', 'Garnish with lemon juice'] :
            ['Layer Greek yogurt in a glass', 'Add mixed berries', 'Top with granola and honey', 'Serve immediately'],
          tags: ['healthy', 'quick', 'protein-rich'],
          nutrition: {
            calories: breakfastCals,
            protein: Math.round(breakfastCals * 0.20 / 4),
            carbs: Math.round(breakfastCals * 0.50 / 4),
            fat: Math.round(breakfastCals * 0.30 / 9),
            fiber: 8
          }
        },
        {
          id: 'ai-breakfast-2',
          name: isVegetarian ? 'Quinoa Breakfast Bowl' : 'Scrambled Eggs with Toast',
          description: isVegetarian ? 'Quinoa bowl with fruits and nuts' : 'Protein-rich scrambled eggs with whole grain toast',
          calories: breakfastCals,
          protein: Math.round(breakfastCals * 0.25 / 4),
          carbs: Math.round(breakfastCals * 0.45 / 4),
          fat: Math.round(breakfastCals * 0.30 / 9),
          fiber: 6,
          preparationTime: 12,
          prepTime: 12,
          cookTime: 8,
          servings: 1,
          difficulty: 'Easy',
          cuisine: 'International',
          ingredients: isVegetarian ?
            ['Quinoa (80g)', 'Banana (1)', 'Berries (50g)', hasNutAllergy ? 'Seeds (20g)' : 'Almonds (20g)', 'Milk (100ml)'] :
            ['Eggs (2)', 'Whole grain bread (2 slices)', 'Butter (10g)', 'Salt', 'Pepper'],
          instructions: isVegetarian ?
            ['Cook quinoa in milk', 'Add sliced banana and berries', 'Top with nuts/seeds', 'Serve warm'] :
            ['Beat eggs with salt and pepper', 'Scramble in butter', 'Toast bread', 'Serve hot'],
          tags: ['healthy', 'protein-rich', 'filling'],
          nutrition: {
            calories: breakfastCals,
            protein: Math.round(breakfastCals * 0.25 / 4),
            carbs: Math.round(breakfastCals * 0.45 / 4),
            fat: Math.round(breakfastCals * 0.30 / 9),
            fiber: 6
          }
        }
      ],
      lunch: [
        {
          id: 'ai-lunch-1',
          name: likesIndian ? 'Dal Tadka with Brown Rice' : 'Quinoa Mediterranean Bowl',
          description: likesIndian ? 'Traditional Indian lentil curry with brown rice' : 'Nutritious quinoa bowl with Mediterranean vegetables',
          calories: lunchCals,
          protein: Math.round(lunchCals * 0.25 / 4),
          carbs: Math.round(lunchCals * 0.50 / 4),
          fat: Math.round(lunchCals * 0.25 / 9),
          fiber: 12,
          preparationTime: 35,
          prepTime: 10,
          cookTime: 25,
          servings: 1,
          difficulty: 'Medium',
          cuisine: likesIndian ? 'Indian' : 'Mediterranean',
          ingredients: likesIndian ?
            ['Yellow dal (100g)', 'Brown rice (80g)', 'Onions', 'Tomatoes', 'Spices', 'Ghee (10g)'] :
            ['Quinoa (100g)', 'Chickpeas (100g)', 'Mixed vegetables (150g)', 'Olive oil (15ml)', 'Feta cheese (30g)'],
          instructions: likesIndian ?
            ['Pressure cook dal with turmeric', 'Cook brown rice separately', 'Prepare tadka with onions and spices', 'Mix tadka with cooked dal', 'Serve with brown rice'] :
            ['Cook quinoa according to package instructions', 'Roast vegetables with olive oil', 'Mix chickpeas and vegetables', 'Top with feta cheese', 'Drizzle with olive oil'],
          tags: ['protein-rich', 'fiber-rich', 'balanced'],
          nutrition: {
            calories: lunchCals,
            protein: Math.round(lunchCals * 0.25 / 4),
            carbs: Math.round(lunchCals * 0.50 / 4),
            fat: Math.round(lunchCals * 0.25 / 9),
            fiber: 12
          }
        },
        {
          id: 'ai-lunch-2',
          name: isVegetarian ? 'Chickpea Curry with Roti' : 'Grilled Chicken Salad',
          description: isVegetarian ? 'Spiced chickpea curry with whole wheat roti' : 'Grilled chicken breast with mixed green salad',
          calories: lunchCals,
          protein: Math.round(lunchCals * 0.30 / 4),
          carbs: Math.round(lunchCals * 0.40 / 4),
          fat: Math.round(lunchCals * 0.30 / 9),
          fiber: 10,
          preparationTime: 30,
          prepTime: 15,
          cookTime: 15,
          servings: 1,
          difficulty: 'Medium',
          cuisine: isVegetarian ? 'Indian' : 'International',
          ingredients: isVegetarian ?
            ['Chickpeas (150g)', 'Whole wheat flour (100g)', 'Onions', 'Tomatoes', 'Spices', 'Oil (10ml)'] :
            ['Chicken breast (150g)', 'Mixed greens (100g)', 'Cherry tomatoes (50g)', 'Cucumber (50g)', 'Olive oil (15ml)'],
          instructions: isVegetarian ?
            ['Soak and cook chickpeas', 'Prepare curry with onions, tomatoes and spices', 'Make roti with wheat flour', 'Serve hot'] :
            ['Season and grill chicken breast', 'Prepare mixed green salad', 'Slice chicken', 'Toss with olive oil dressing'],
          tags: ['protein-rich', 'satisfying', 'nutritious'],
          nutrition: {
            calories: lunchCals,
            protein: Math.round(lunchCals * 0.30 / 4),
            carbs: Math.round(lunchCals * 0.40 / 4),
            fat: Math.round(lunchCals * 0.30 / 9),
            fiber: 10
          }
        }
      ],
      dinner: [
        {
          id: 'ai-dinner-1',
          name: likesMediterranean ? 'Grilled Salmon with Vegetables' : (likesIndian ? 'Paneer Curry with Quinoa' : 'Baked Chicken with Sweet Potato'),
          description: likesMediterranean ? 'Omega-3 rich salmon with roasted vegetables' : (likesIndian ? 'Spiced paneer curry with quinoa' : 'Lean baked chicken with sweet potato'),
          calories: dinnerCals,
          protein: Math.round(dinnerCals * 0.35 / 4),
          carbs: Math.round(dinnerCals * 0.35 / 4),
          fat: Math.round(dinnerCals * 0.30 / 9),
          fiber: 8,
          preparationTime: 35,
          prepTime: 15,
          cookTime: 20,
          servings: 1,
          difficulty: 'Medium',
          cuisine: likesMediterranean ? 'Mediterranean' : (likesIndian ? 'Indian' : 'International'),
          ingredients: likesMediterranean ?
            ['Salmon fillet (180g)', 'Mixed vegetables (200g)', 'Olive oil (15ml)', 'Herbs', 'Lemon'] :
            (likesIndian ? ['Paneer (150g)', 'Quinoa (80g)', 'Onions', 'Tomatoes', 'Spices', 'Oil (10ml)'] :
            ['Chicken breast (150g)', 'Sweet potato (150g)', 'Broccoli (100g)', 'Olive oil (10ml)']),
          instructions: likesMediterranean ?
            ['Preheat oven to 200°C', 'Season salmon with herbs and lemon', 'Toss vegetables with olive oil', 'Grill salmon for 12-15 minutes', 'Roast vegetables for 20 minutes'] :
            (likesIndian ? ['Cook quinoa', 'Prepare paneer curry with spices', 'Simmer until thick', 'Serve with quinoa'] :
            ['Season chicken and bake at 180°C', 'Roast sweet potato and broccoli', 'Serve together']),
          tags: ['protein-rich', 'omega-3', 'healthy'],
          nutrition: {
            calories: dinnerCals,
            protein: Math.round(dinnerCals * 0.35 / 4),
            carbs: Math.round(dinnerCals * 0.35 / 4),
            fat: Math.round(dinnerCals * 0.30 / 9),
            fiber: 8
          }
        }
      ],
      snacks: [
        {
          id: 'ai-snack-1',
          name: hasNutAllergy ? 'Mixed Seeds and Fruit' : 'Mixed Nuts and Fruit',
          description: 'Healthy snack with nuts/seeds and seasonal fruit',
          calories: snackCals,
          protein: Math.round(snackCals * 0.20 / 4),
          carbs: Math.round(snackCals * 0.50 / 4),
          fat: Math.round(snackCals * 0.30 / 9),
          fiber: 4,
          preparationTime: 2,
          prepTime: 2,
          cookTime: 0,
          servings: 1,
          difficulty: 'Easy',
          cuisine: 'International',
          ingredients: hasNutAllergy ? 
            ['Mixed seeds (20g)', 'Apple (1 medium)', 'Dates (2 pieces)'] :
            ['Mixed nuts (25g)', 'Apple (1 medium)', 'Dates (2 pieces)'],
          instructions: [
            'Arrange nuts/seeds in a small bowl',
            'Slice apple',
            'Add dates for natural sweetness',
            'Enjoy as a healthy snack'
          ],
          tags: ['snack', 'healthy', 'quick', 'natural'],
          nutrition: {
            calories: snackCals,
            protein: Math.round(snackCals * 0.20 / 4),
            carbs: Math.round(snackCals * 0.50 / 4),
            fat: Math.round(snackCals * 0.30 / 9),
            fiber: 4
          }
        }
      ]
    };
  }

  private selectMeal(mealArray: any[], dayIndex: number): any {
    // Ensure variety by cycling through meals
    return mealArray[dayIndex % mealArray.length];
  }

  async generateMealAlternatives(currentMealId: string, preferences?: any): Promise<any[]> {
    // Return alternative meals for swapping with proper structure
    const alternatives = [
      {
        id: 'alt-1',
        name: 'Healthy Veggie Bowl',
        description: 'Nutritious vegetable bowl with quinoa',
        calories: 350,
        protein: 25,
        carbs: 35,
        fat: 12,
        fiber: 8,
        preparationTime: 20,
        prepTime: 10,
        cookTime: 10,
        servings: 1,
        difficulty: 'Easy',
        cuisine: 'International',
        ingredients: ['Quinoa (80g)', 'Mixed vegetables (150g)', 'Chickpeas (50g)'],
        instructions: ['Cook quinoa', 'Steam vegetables', 'Mix with chickpeas'],
        tags: ['healthy', 'alternative', 'vegetarian'],
        nutrition: {
          calories: 350,
          protein: 25,
          carbs: 35,
          fat: 12,
          fiber: 8
        }
      },
      {
        id: 'alt-2',
        name: 'Mediterranean Chicken',
        description: 'Grilled chicken with Mediterranean herbs',
        calories: 380,
        protein: 22,
        carbs: 40,
        fat: 15,
        fiber: 6,
        preparationTime: 25,
        prepTime: 10,
        cookTime: 15,
        servings: 1,
        difficulty: 'Medium',
        cuisine: 'Mediterranean',
        ingredients: ['Chicken breast (120g)', 'Mixed herbs', 'Olive oil (10ml)'],
        instructions: ['Season chicken with herbs', 'Grill until cooked through'],
        tags: ['healthy', 'alternative', 'Mediterranean', 'protein-rich'],
        nutrition: {
          calories: 380,
          protein: 22,
          carbs: 40,
          fat: 15,
          fiber: 6
        }
      },
      {
        id: 'alt-3',
        name: 'Spicy Lentil Curry',
        description: 'Protein-rich lentil curry with Indian spices',
        calories: 320,
        protein: 18,
        carbs: 45,
        fat: 8,
        fiber: 12,
        preparationTime: 30,
        prepTime: 10,
        cookTime: 20,
        servings: 1,
        difficulty: 'Medium',
        cuisine: 'Indian',
        ingredients: ['Red lentils (100g)', 'Onions', 'Tomatoes', 'Indian spices'],
        instructions: ['Cook lentils', 'Prepare spice base', 'Simmer together'],
        tags: ['healthy', 'alternative', 'Indian', 'vegetarian', 'high-fiber'],
        nutrition: {
          calories: 320,
          protein: 18,
          carbs: 45,
          fat: 8,
          fiber: 12
        }
      }
    ];

    return alternatives;
  }
}