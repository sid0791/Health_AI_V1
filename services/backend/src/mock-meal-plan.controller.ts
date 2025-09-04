import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface MealPlanRequest {
  userId: string;
  goals?: string[];
  dietaryPreferences?: string[];
  healthConditions?: string[];
  allergens?: string[];
}

interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  preparationTime: number;
  difficulty: string;
  cuisine: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

interface DayMealPlan {
  date: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface WeeklyMealPlan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: DayMealPlan[];
  totalWeeklyCalories: number;
  averageDailyCalories: number;
  nutritionSummary: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

@ApiTags('mock-meal-plans')
@Controller('api/meal-plans')
export class MockMealPlanController {
  private sampleMeals: Meal[] = [
    {
      id: 'meal-1',
      name: 'Greek Yogurt Parfait',
      description: 'Protein-rich Greek yogurt with mixed berries and granola',
      calories: 280,
      protein: 20,
      carbs: 35,
      fat: 8,
      fiber: 5,
      preparationTime: 10,
      difficulty: 'Easy',
      cuisine: 'Mediterranean',
      ingredients: ['Greek yogurt (200g)', 'Mixed berries (100g)', 'Granola (30g)', 'Honey (15ml)'],
      instructions: [
        'Layer Greek yogurt in a glass',
        'Add mixed berries',
        'Top with granola and honey',
        'Serve immediately'
      ],
      tags: ['healthy', 'quick', 'protein-rich', 'Mediterranean']
    },
    {
      id: 'meal-2',
      name: 'Quinoa Bowl with Grilled Chicken',
      description: 'Nutritious quinoa bowl with grilled chicken, vegetables, and tahini dressing',
      calories: 485,
      protein: 32,
      carbs: 45,
      fat: 18,
      fiber: 8,
      preparationTime: 25,
      difficulty: 'Medium',
      cuisine: 'Mediterranean',
      ingredients: ['Quinoa (100g)', 'Chicken breast (150g)', 'Mixed vegetables (150g)', 'Tahini (20g)', 'Lemon juice (15ml)'],
      instructions: [
        'Cook quinoa according to package instructions',
        'Grill chicken breast with herbs',
        'Steam or roast vegetables',
        'Mix tahini with lemon juice for dressing',
        'Combine all ingredients in a bowl'
      ],
      tags: ['healthy', 'protein-rich', 'balanced', 'Mediterranean']
    },
    {
      id: 'meal-3',
      name: 'Green Smoothie',
      description: 'Nutrient-packed green smoothie with spinach, banana, and protein powder',
      calories: 165,
      protein: 8,
      carbs: 28,
      fat: 4,
      fiber: 6,
      preparationTime: 5,
      difficulty: 'Easy',
      cuisine: 'International',
      ingredients: ['Spinach (50g)', 'Banana (1 medium)', 'Protein powder (20g)', 'Almond milk (200ml)', 'Chia seeds (10g)'],
      instructions: [
        'Add all ingredients to blender',
        'Blend until smooth',
        'Add ice if desired',
        'Serve immediately'
      ],
      tags: ['healthy', 'quick', 'protein-rich', 'green', 'smoothie']
    },
    {
      id: 'meal-4',
      name: 'Grilled Salmon with Vegetables',
      description: 'Omega-3 rich salmon with roasted seasonal vegetables',
      calories: 420,
      protein: 35,
      carbs: 20,
      fat: 25,
      fiber: 6,
      preparationTime: 30,
      difficulty: 'Medium',
      cuisine: 'International',
      ingredients: ['Salmon fillet (180g)', 'Mixed vegetables (200g)', 'Olive oil (15ml)', 'Herbs', 'Lemon'],
      instructions: [
        'Preheat oven to 200°C',
        'Season salmon with herbs and lemon',
        'Toss vegetables with olive oil',
        'Grill salmon for 12-15 minutes',
        'Roast vegetables for 20 minutes'
      ],
      tags: ['healthy', 'omega-3', 'protein-rich', 'low-carb']
    },
    {
      id: 'meal-5',
      name: 'Dal Tadka with Brown Rice',
      description: 'Traditional Indian lentil curry with brown rice',
      calories: 350,
      protein: 18,
      carbs: 55,
      fat: 8,
      fiber: 12,
      preparationTime: 35,
      difficulty: 'Medium',
      cuisine: 'Indian',
      ingredients: ['Yellow dal (100g)', 'Brown rice (80g)', 'Onions', 'Tomatoes', 'Spices', 'Ghee (10g)'],
      instructions: [
        'Pressure cook dal with turmeric',
        'Cook brown rice separately',
        'Prepare tadka with onions and spices',
        'Mix tadka with cooked dal',
        'Serve with brown rice'
      ],
      tags: ['vegetarian', 'protein-rich', 'Indian', 'fiber-rich']
    },
    {
      id: 'meal-6',
      name: 'Mixed Nuts and Fruit',
      description: 'Healthy snack with mixed nuts and seasonal fruit',
      calories: 180,
      protein: 8,
      carbs: 15,
      fat: 12,
      fiber: 4,
      preparationTime: 2,
      difficulty: 'Easy',
      cuisine: 'International',
      ingredients: ['Mixed nuts (30g)', 'Apple (1 medium)', 'Dates (2 pieces)'],
      instructions: [
        'Arrange nuts in a small bowl',
        'Slice apple',
        'Add dates for natural sweetness',
        'Enjoy as a healthy snack'
      ],
      tags: ['snack', 'healthy', 'quick', 'natural']
    }
  ];

  @Get('current/:userId')
  @ApiOperation({ summary: 'Get current meal plan for user' })
  @ApiResponse({ status: 200, description: 'Current meal plan retrieved' })
  async getCurrentMealPlan(@Param('userId') userId: string): Promise<WeeklyMealPlan> {
    // Generate a mock meal plan
    return this.generateMockMealPlan(userId);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate personalized meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan generated successfully' })
  async generateMealPlan(@Body() request: MealPlanRequest): Promise<WeeklyMealPlan> {
    // Simulate AI generation time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return this.generateMockMealPlan(request.userId, request);
  }

  @Post('swap-meal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Swap a meal in the plan' })
  @ApiResponse({ status: 200, description: 'Meal swapped successfully' })
  async swapMeal(@Body() body: { mealId: string; mealType: string; preferences?: string[] }): Promise<Meal[]> {
    // Return alternative meals
    return this.sampleMeals.filter(meal => meal.id !== body.mealId).slice(0, 3);
  }

  private generateMockMealPlan(userId: string, preferences?: MealPlanRequest): WeeklyMealPlan {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000); // 7 days

    const days: DayMealPlan[] = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Select meals based on preferences (simple logic for demo)
      const breakfast = this.selectMeal(['quick', 'protein-rich']);
      const lunch = this.selectMeal(['balanced', 'protein-rich']);
      const dinner = this.selectMeal(['protein-rich']);
      const snacks = [this.selectMeal(['snack', 'healthy'])];

      const dayPlan: DayMealPlan = {
        date: dayDate.toISOString().split('T')[0],
        breakfast,
        lunch,
        dinner,
        snacks,
        totalCalories: breakfast.calories + lunch.calories + dinner.calories + snacks[0].calories,
        totalProtein: breakfast.protein + lunch.protein + dinner.protein + snacks[0].protein,
        totalCarbs: breakfast.carbs + lunch.carbs + dinner.carbs + snacks[0].carbs,
        totalFat: breakfast.fat + lunch.fat + dinner.fat + snacks[0].fat,
      };

      days.push(dayPlan);
    }

    const totalWeeklyCalories = days.reduce((sum, day) => sum + day.totalCalories, 0);

    return {
      id: `plan-${Date.now()}`,
      userId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
      totalWeeklyCalories,
      averageDailyCalories: Math.round(totalWeeklyCalories / 7),
      nutritionSummary: {
        protein: days.reduce((sum, day) => sum + day.totalProtein, 0),
        carbs: days.reduce((sum, day) => sum + day.totalCarbs, 0),
        fat: days.reduce((sum, day) => sum + day.totalFat, 0),
        fiber: days.reduce((sum, day) => sum + (day.breakfast.fiber + day.lunch.fiber + day.dinner.fiber + day.snacks[0].fiber), 0),
      }
    };
  }

  private selectMeal(preferredTags: string[]): Meal {
    // Find meals that match preferred tags
    const matchingMeals = this.sampleMeals.filter(meal => 
      preferredTags.some(tag => meal.tags.includes(tag))
    );

    if (matchingMeals.length > 0) {
      return matchingMeals[Math.floor(Math.random() * matchingMeals.length)];
    }

    // Fallback to random meal
    return this.sampleMeals[Math.floor(Math.random() * this.sampleMeals.length)];
  }
}