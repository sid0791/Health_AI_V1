import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AIMealPlanningService, UserPreferences } from './services/ai-meal-planning.service';

interface MealPlanRequest {
  userId: string;
  userProfile?: UserPreferences;
  goals?: string[];
  dietaryPreferences?: string[];
  healthConditions?: string[];
  allergens?: string[];
  targetCalories?: number;
  planDuration?: number;
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

@ApiTags('ai-meal-plans')
@Controller('api/meal-plans')
export class MockMealPlanController {
  private aiMealPlanningService: AIMealPlanningService;

  constructor() {
    this.aiMealPlanningService = new AIMealPlanningService();
  }

  @Get('current/:userId')
  @ApiOperation({ summary: 'Get current meal plan for user' })
  @ApiResponse({ status: 200, description: 'Current meal plan retrieved' })
  async getCurrentMealPlan(@Param('userId') userId: string): Promise<WeeklyMealPlan> {
    // Generate an AI-powered meal plan
    return this.aiMealPlanningService.generateMealPlan({
      userId,
      planDuration: 7,
      targetCalories: 1800
    });
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate personalized AI meal plan' })
  @ApiResponse({ status: 200, description: 'AI meal plan generated successfully' })
  async generateMealPlan(@Body() request: MealPlanRequest): Promise<WeeklyMealPlan> {
    console.log('🤖 Generating AI-powered meal plan for user:', request.userId);
    console.log('📊 User preferences:', request.userProfile);
    
    // Use AI service to generate meal plan
    const mealPlan = await this.aiMealPlanningService.generateMealPlan({
      userId: request.userId,
      userPreferences: request.userProfile,
      planDuration: request.planDuration || 7,
      targetCalories: request.targetCalories || 1800
    });

    console.log('✅ Generated AI meal plan with', mealPlan.days.length, 'days');
    return mealPlan;
  }

  @Post('swap-meal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-generated meal alternatives' })
  @ApiResponse({ status: 200, description: 'AI meal alternatives generated' })
  async swapMeal(@Body() body: { mealId: string; mealType: string; preferences?: any }): Promise<Meal[]> {
    console.log('🔄 Generating AI meal alternatives for:', body.mealId);
    
    // Use AI service to get alternatives
    const alternatives = await this.aiMealPlanningService.generateMealAlternatives(
      body.mealId,
      body.preferences
    );

    console.log('✅ Generated', alternatives.length, 'AI meal alternatives');
    return alternatives;
  }

}