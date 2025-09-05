/**
 * Enhanced Meal Planning Service
 * Integrates with backend AI meal generation and provides comprehensive meal planning features
 */

import { apiRequest } from './api'

export interface UserProfile {
  userId: string
  basicInfo: {
    age: number
    gender: 'male' | 'female' | 'other'
    weight: number // kg
    height: number // cm
    activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
    targetWeight?: number
  }
  healthInfo: {
    healthConditions: string[]
    allergies: string[]
    vitaminDeficiencies: string[]
    currentMedications: string[]
  }
  preferences: {
    dietaryPreference: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian' | 'jain' | 'halal' | 'kosher'
    cuisinePreferences: string[]
    foodAllergies: string[]
    cravings: string[]
    regularFoodItems: string[]
    mealsPerDay: number
    snacksPerDay: number
  }
  goals: {
    primaryGoals: string[]
    targetWeight?: number
    timelineWeeks?: number
    healthConditionGoals: string[]
    lifestyleGoals: string[]
  }
  lifestyle: {
    cookingSkillLevel?: number // 1-5
    availableCookingTime?: number // minutes per meal
    budgetRange?: { min: number; max: number } // INR per day
    eatingOutFrequency: number
  }
}

export interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
  calcium?: number
  iron?: number
  vitaminD?: number
  vitaminB12?: number
  glycemicIndex?: number
  glycemicLoad?: number
}

export interface Ingredient {
  name: string
  amount: number
  unit: string
  cost?: number
  availability?: 'available' | 'seasonal' | 'expensive'
}

export interface Recipe {
  id: string
  name: string
  cuisine: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  difficulty: 'easy' | 'medium' | 'hard'
  prepTime: number // minutes
  cookTime: number // minutes
  servings: number
  ingredients: Ingredient[]
  instructions: string[]
  nutrition: NutritionInfo
  tags: string[]
  healthBenefits?: string[]
  image?: string
  videoUrl?: string
  cost?: number
  substitutions?: { [key: string]: string[] }
  tips?: string[]
}

export interface MealPlanDay {
  date: string
  meals: Meal[]
  totalNutrition: NutritionInfo
  adherenceScore?: number
  notes?: string
}

export interface Meal {
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  time: string
  portionSize: number
  recipe: Recipe
  alternatives?: Recipe[]
}

export interface MealPlan {
  id: string
  userId: string
  startDate: string
  endDate: string
  goals: string[]
  createdAt: string
  lastModified: string
  days: MealPlanDay[]
  totalCost?: number
  shoppingList?: ShoppingList
  weeklyNutritionSummary?: NutritionInfo
}

export interface ShoppingList {
  id: string
  mealPlanId: string
  categories: ShoppingCategory[]
  totalCost: number
  generatedAt: string
}

export interface ShoppingCategory {
  name: string
  items: ShoppingItem[]
}

export interface ShoppingItem {
  name: string
  quantity: string
  unit: string
  estimatedCost: number
  priority: 'high' | 'medium' | 'low'
  alternatives: string[]
}

export interface MealPlanRequest {
  userId: string
  preferences?: {
    startDate?: string
    duration?: number // days
    budgetPerDay?: number
    excludeIngredients?: string[]
    focusNutrients?: string[]
    specialRequests?: string
  }
}


class MealPlanningService {
  /**
   * Generate a personalized 7-day meal plan using AI
   */
  async generateMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    try {
      console.log('Generating AI meal plan for user:', request.userId)
      
      const response = await apiRequest<MealPlan>('/meal-planning/ai/generate-meal-plan', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      console.log('✅ AI meal plan generated successfully')
      return response
    } catch (error) {
      console.error('Meal plan generation failed:', error)
      throw error
    }
  }

  /**
   * Get current active meal plan for user
   */
  async getCurrentMealPlan(): Promise<MealPlan | null> {
    try {
      return await apiRequest<MealPlan>('/meal-plans/current')
    } catch (error) {
      console.error('Failed to get current meal plan:', error)
      return null
    }
  }

  /**
   * Get all meal plans for user
   */
  async getUserMealPlans(): Promise<MealPlan[]> {
    try {
      return await apiRequest<MealPlan[]>('/meal-plans')
    } catch (error) {
      console.error('Failed to get user meal plans:', error)
      return []
    }
  }

  /**
   * Swap a specific meal with AI-generated alternatives
   */
  async swapMeal(request: MealSwapRequest): Promise<{ success: boolean; alternatives: Recipe[] }> {
    try {
      console.log('Requesting meal swap for:', request.currentRecipeId)
      
      const response = await apiRequest<{ success: boolean; alternatives: Recipe[] }>('/meal-planning/ai/swap-meal', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      console.log('✅ Meal alternatives generated')
      return response
    } catch (error) {
      console.error('Meal swap failed:', error)
      throw error
    }
  }

  /**
   * Generate innovative healthy recipe using AI
   */
  async generateInnovativeRecipe(request: {
    baseRecipeName: string
    dietaryConstraints: string[]
    nutritionTargets: Partial<NutritionInfo>
    userPreferences: {
      cuisineStyle?: string
      availableTime?: number
      skillLevel?: number
      healthFocus?: string[]
    }
  }): Promise<Recipe> {
    try {
      console.log('Generating innovative recipe:', request.baseRecipeName)
      
      const response = await apiRequest<Recipe>('/meal-planning/ai/generate-recipe', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      console.log('✅ Innovative recipe generated')
      return response
    } catch (error) {
      console.error('Recipe generation failed:', error)
      throw error
    }
  }

  /**
   * Generate optimized shopping list for meal plan
   */
  async generateShoppingList(mealPlanId: string, preferences?: {
    budget?: number
    preferredStores?: string[]
    groupByCategory?: boolean
  }): Promise<ShoppingList> {
    try {
      const response = await apiRequest<ShoppingList>('/meal-planning/ai/shopping-list', {
        method: 'POST',
        body: JSON.stringify({ mealPlanId, preferences })
      })

      return response
    } catch (error) {
      console.error('Shopping list generation failed:', error)
      throw error
    }
  }

  /**
   * Save AI-generated meal plan to user's collection
   */
  async saveMealPlan(mealPlan: MealPlan, customName?: string): Promise<{ success: boolean; id: string }> {
    try {
      const response = await apiRequest<{ success: boolean; id: string }>('/meal-planning/ai/save-generated-plan', {
        method: 'POST',
        body: JSON.stringify({
          mealPlan,
          customName,
          activate: true
        })
      })

      return response
    } catch (error) {
      console.error('Failed to save meal plan:', error)
      throw error
    }
  }

  /**
   * Get recipe suggestions based on available ingredients
   */
  async getRecipeSuggestions(ingredients: string[], constraints?: {
    mealType?: string
    maxPrepTime?: number
    dietary?: string[]
  }): Promise<Recipe[]> {
    try {
      const response = await apiRequest<Recipe[]>('/meal-planning/recipes/suggest', {
        method: 'POST',
        body: JSON.stringify({ ingredients, constraints })
      })

      return response
    } catch (error) {
      console.error('Failed to get recipe suggestions:', error)
      return []
    }
  }

  /**
   * Log meal consumption
   */
  async logMeal(mealLog: {
    mealId: string
    consumedAt: string
    portionConsumed: number // 0-1 (0% to 100%)
    notes?: string
    satisfaction?: number // 1-5
  }): Promise<{ success: boolean }> {
    try {
      return await apiRequest('/meal-logs', {
        method: 'POST',
        body: JSON.stringify(mealLog)
      })
    } catch (error) {
      console.error('Failed to log meal:', error)
      throw error
    }
  }

  /**
   * Get nutrition analysis for a day
   */
  async getDayNutritionAnalysis(date: string): Promise<{
    totalNutrition: NutritionInfo
    goalProgress: { [key: string]: number }
    deficiencies: string[]
    recommendations: string[]
  }> {
    try {
      return await apiRequest(`/nutrition/daily-analysis?date=${date}`)
    } catch (error) {
      console.error('Failed to get nutrition analysis:', error)
      throw error
    }
  }

  /**
   * Update meal plan preferences
   */
  async updateMealPlanPreferences(preferences: Partial<UserProfile>): Promise<{ success: boolean }> {
    try {
      return await apiRequest('/meal-planning/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      })
    } catch (error) {
      console.error('Failed to update preferences:', error)
      throw error
    }
  }
}

export const mealPlanningService = new MealPlanningService()
export default mealPlanningService

export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: Ingredient[]
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  cuisine: string
  tags: string[]
  nutrition: NutritionInfo
  image?: string
  healthBenefits?: string[]
}

export interface MealPlanEntry {
  id: string
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  time: string
  recipe: Recipe
  portionSize: number
  alternatives?: Recipe[]
}

export interface DayMealPlan {
  date: string
  meals: MealPlanEntry[]
  totalNutrition: NutritionInfo
  adherenceScore?: number
}

export interface WeeklyMealPlan {
  id: string
  userId: string
  startDate: string
  endDate: string
  days: DayMealPlan[]
  goals: string[]
  createdAt: string
  lastModified: string
}

export interface GenerateMealPlanRequest {
  userId: string
  userProfile: UserProfile
  planDuration: number // days
  targetCalories?: number
  macroTargets?: {
    protein: number // percentage
    carbs: number // percentage
    fat: number // percentage
  }
  excludeRecipeIds?: string[]
  regenerateDay?: string // YYYY-MM-DD format
}

export interface MealSwapRequest {
  mealPlanId: string
  dayIndex: number
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  currentRecipeId: string
  preferences?: {
    cuisine?: string
    maxPrepTime?: number
    difficulty?: 'Easy' | 'Medium' | 'Hard'
  }
}

