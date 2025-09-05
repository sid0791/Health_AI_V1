/**
 * Real AI Meal Planning Service
 * Connects to actual backend AI endpoints instead of mock data
 */

import apiRequest from './api'

export interface RealMealPlanRequest {
  userProfile: {
    age: number
    gender: 'male' | 'female' | 'other'
    weight: number
    height: number
    activityLevel: string
    goals: string[]
    healthConditions: string[]
    allergies: string[]
  }
  preferences: {
    dietaryPreferences: string[]
    cuisinePreferences: string[]
    mealFrequency: number
    maxCalories?: number
  }
  options?: {
    duration?: number
    planType?: string
    useRealAI?: boolean
  }
}

export interface MealRegenerationRequest {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  preferences?: {
    cuisine?: string
    maxCalories?: number
    dietaryRestrictions?: string[]
  }
  excludeIngredients?: string[]
}

class RealAIMealPlanningService {
  /**
   * Test free AI meal planning (no auth required)
   */
  async testFreeAI(): Promise<any> {
    return apiRequest('/meal-planning/ai/test-free-ai')
  }

  /**
   * Test real AI meal planning with actual APIs
   */
  async testRealAI(): Promise<any> {
    return apiRequest('/meal-planning/ai/test-real-ai')
  }

  /**
   * Get AI integration status
   */
  async getAIStatus(): Promise<any> {
    return apiRequest('/meal-planning/ai/ai-status')
  }

  /**
   * Generate meal plan using real AI
   */
  async generateMealPlan(request: RealMealPlanRequest): Promise<any> {
    // Convert to backend format
    const backendRequest = {
      userProfile: {
        ...request.userProfile,
        budgetRange: { min: 200, max: 500 }, // Default budget range in INR
        preferredIngredients: [],
        avoidedIngredients: request.userProfile.allergies || [],
        cookingSkillLevel: 3,
        availableCookingTime: 30,
        mealFrequency: {
          mealsPerDay: request.preferences.mealFrequency || 3,
          snacksPerDay: 1,
          includeBeverages: true
        }
      },
      planPreferences: {
        duration: request.options?.duration || 7,
        planType: request.options?.planType || 'weight_management',
        targetCalories: request.preferences.maxCalories || 1800,
        macroTargets: {
          proteinPercent: 25,
          carbPercent: 45,
          fatPercent: 30
        },
        includeCheatMeals: false,
        weekendTreats: false
      },
      contextData: {
        currentSeason: 'summer',
        location: 'Mumbai',
        availableIngredients: [],
        previousPlans: [],
        userFeedback: []
      }
    }

    return apiRequest('/meal-planning/ai/generate-meal-plan', {
      method: 'POST',
      body: JSON.stringify(backendRequest)
    })
  }

  /**
   * Regenerate a specific meal
   */
  async regenerateMeal(request: MealRegenerationRequest): Promise<any> {
    return apiRequest('/meal-planning/ai/regenerate-meal', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  }

  /**
   * Save generated meal plan
   */
  async saveMealPlan(planData: any, planName: string, activate: boolean = false): Promise<any> {
    return apiRequest('/meal-planning/ai/save-generated-plan', {
      method: 'POST',
      body: JSON.stringify({
        generatedPlanData: planData,
        planName,
        activate
      })
    })
  }

  /**
   * Generate shopping list
   */
  async generateShoppingList(mealPlanId: string, preferences?: any): Promise<any> {
    return apiRequest('/meal-planning/ai/shopping-list', {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId,
        preferences: preferences || {
          budget: { min: 200, max: 500 },
          preferredStores: ['local_market'],
          organicPreference: false
        }
      })
    })
  }

  /**
   * Generate innovative recipe
   */
  async generateInnovativeRecipe(baseRecipe: string, constraints?: any): Promise<any> {
    return apiRequest('/meal-planning/ai/generate-recipe', {
      method: 'POST',
      body: JSON.stringify({
        baseRecipeName: baseRecipe,
        dietaryConstraints: constraints?.dietaryConstraints || [],
        nutritionTargets: constraints?.nutritionTargets || {
          calories: 400,
          protein: 20,
          carbs: 50,
          fat: 15
        },
        userPreferences: constraints?.userPreferences || {
          spiceLevel: 'medium',
          cookingTime: 30,
          difficulty: 'medium'
        }
      })
    })
  }

  /**
   * Get user's current meal plan
   */
  async getCurrentMealPlan(): Promise<any> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    return apiRequest(`/meal-plans/current/${userId}`)
  }

  /**
   * Get meal plan by ID
   */
  async getMealPlan(planId: string): Promise<any> {
    return apiRequest(`/meal-plans/${planId}`)
  }

  /**
   * Update meal plan
   */
  async updateMealPlan(planId: string, updates: any): Promise<any> {
    return apiRequest(`/meal-plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(planId: string): Promise<any> {
    return apiRequest(`/meal-plans/${planId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Search recipes
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
  }): Promise<any> {
    const params = new URLSearchParams()
    
    if (criteria.query) params.append('query', criteria.query)
    if (criteria.cuisine) params.append('cuisine', criteria.cuisine)
    if (criteria.maxPrepTime) params.append('maxPrepTime', criteria.maxPrepTime.toString())
    if (criteria.difficulty) params.append('difficulty', criteria.difficulty)
    
    if (criteria.dietaryRestrictions) {
      criteria.dietaryRestrictions.forEach(restriction => 
        params.append('dietaryRestrictions', restriction)
      )
    }
    
    if (criteria.nutrition) {
      params.append('nutrition', JSON.stringify(criteria.nutrition))
    }

    return apiRequest(`/recipes/search?${params.toString()}`)
  }

  /**
   * Get recipe by ID
   */
  async getRecipe(recipeId: string): Promise<any> {
    return apiRequest(`/recipes/${recipeId}`)
  }

  /**
   * Rate recipe
   */
  async rateRecipe(recipeId: string, rating: number, review?: string): Promise<any> {
    return apiRequest(`/recipes/${recipeId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    })
  }

  /**
   * Get nutrition analysis for a day
   */
  async getDayNutritionAnalysis(planId: string, dayIndex: number): Promise<any> {
    return apiRequest(`/meal-plans/${planId}/days/${dayIndex}/nutrition`)
  }

  /**
   * Apply meal swap
   */
  async applyMealSwap(
    planId: string,
    dayIndex: number,
    mealType: string,
    newRecipeId: string
  ): Promise<any> {
    return apiRequest(`/meal-plans/${planId}/apply-swap`, {
      method: 'PATCH',
      body: JSON.stringify({
        dayIndex,
        mealType,
        newRecipeId
      })
    })
  }

  /**
   * Get meal alternatives
   */
  async getMealAlternatives(
    planId: string,
    dayIndex: number,
    mealType: string,
    preferences?: any
  ): Promise<any> {
    return apiRequest(`/meal-plans/${planId}/swap-meal`, {
      method: 'POST',
      body: JSON.stringify({
        mealPlanId: planId,
        dayIndex,
        mealType,
        currentRecipeId: 'current', // Backend will determine current recipe
        preferences: preferences || {}
      })
    })
  }

  /**
   * Get current user ID from token
   */
  private getCurrentUserId(): string | null {
    if (typeof window === 'undefined') return null
    
    const token = localStorage.getItem('auth_token')
    if (!token) return null
    
    try {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub || payload.userId || payload.id
    } catch (error) {
      console.error('Failed to decode auth token', error)
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getCurrentUserId()
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}

export const realAIMealPlanningService = new RealAIMealPlanningService()
export default realAIMealPlanningService