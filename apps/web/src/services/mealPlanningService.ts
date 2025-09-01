/**
 * Meal Planning API Service
 * Integrates with backend AI meal generation service
 */

import apiRequest, { APIError } from './api'

export interface UserProfile {
  age: number
  gender: 'male' | 'female' | 'other'
  weight: number // kg
  height: number // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goals: string[]
  healthConditions: string[]
  allergies: string[]
  dietaryPreferences: string[]
  cuisinePreferences: string[]
  preferredIngredients: string[]
  avoidedIngredients: string[]
  budgetRange: { min: number; max: number } // INR per day
  cookingSkillLevel: number // 1-5
  availableCookingTime: number // minutes per meal
  mealFrequency: {
    mealsPerDay: number
    snacksPerDay: number
    includeBeverages: boolean
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
  glycemicIndex?: number
  glycemicLoad?: number
}

export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  cuisine: string
  tags: string[]
  nutrition: NutritionInfo
  image?: string
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

class MealPlanningService {
  /**
   * Generate a personalized meal plan using AI
   */
  async generateMealPlan(request: GenerateMealPlanRequest): Promise<WeeklyMealPlan> {
    return apiRequest<WeeklyMealPlan>('/meal-plans/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get existing meal plan by ID
   */
  async getMealPlan(planId: string): Promise<WeeklyMealPlan> {
    return apiRequest<WeeklyMealPlan>(`/meal-plans/${planId}`)
  }

  /**
   * Get user's current/latest meal plan
   */
  async getCurrentMealPlan(userId: string): Promise<WeeklyMealPlan | null> {
    try {
      return await apiRequest<WeeklyMealPlan>(`/meal-plans/current/${userId}`)
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Swap a meal with alternative options
   */
  async swapMeal(request: MealSwapRequest): Promise<Recipe[]> {
    return apiRequest<Recipe[]>('/meal-plans/swap-meal', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Apply a meal swap to the plan
   */
  async applyMealSwap(
    planId: string,
    dayIndex: number,
    mealType: string,
    newRecipeId: string
  ): Promise<WeeklyMealPlan> {
    return apiRequest<WeeklyMealPlan>(`/meal-plans/${planId}/apply-swap`, {
      method: 'PATCH',
      body: JSON.stringify({
        dayIndex,
        mealType,
        newRecipeId,
      }),
    })
  }

  /**
   * Get nutrition analysis for a specific day
   */
  async getDayNutritionAnalysis(
    planId: string,
    dayIndex: number
  ): Promise<{
    nutrition: NutritionInfo
    deficiencies: string[]
    excesses: string[]
    recommendations: string[]
  }> {
    return apiRequest(`/meal-plans/${planId}/days/${dayIndex}/nutrition`)
  }

  /**
   * Search recipes by criteria
   */
  async searchRecipes(criteria: {
    query?: string
    cuisine?: string
    dietaryRestrictions?: string[]
    maxPrepTime?: number
    difficulty?: string
    nutrition?: {
      maxCalories?: number
      minProtein?: number
    }
  }): Promise<Recipe[]> {
    const params = new URLSearchParams()
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v))
        } else if (typeof value === 'object') {
          params.append(key, JSON.stringify(value))
        } else {
          params.append(key, value.toString())
        }
      }
    })

    return apiRequest<Recipe[]>(`/recipes/search?${params.toString()}`)
  }

  /**
   * Get recipe details by ID
   */
  async getRecipe(recipeId: string): Promise<Recipe> {
    return apiRequest<Recipe>(`/recipes/${recipeId}`)
  }

  /**
   * Save user preferences for future meal planning
   */
  async saveUserPreferences(userId: string, preferences: Partial<UserProfile>): Promise<void> {
    await apiRequest(`/users/${userId}/meal-preferences`, {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    })
  }
}

export const mealPlanningService = new MealPlanningService()
export default mealPlanningService