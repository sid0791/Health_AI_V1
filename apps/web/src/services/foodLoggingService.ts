/**
 * Food Logging Service
 * Tracks actual food consumption and provides analytics
 */

import apiRequest, { APIError } from './api'
import { Recipe, NutritionInfo } from './mealPlanningService'

export interface FoodLogEntry {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timestamp: string // ISO datetime when logged
  recipe?: Recipe
  customFood?: {
    name: string
    nutrition: NutritionInfo
    portionSize: number
    unit: string
  }
  portionSize: number // multiplier from recipe/food
  notes?: string
  source: 'meal_plan' | 'manual_entry' | 'photo_log'
}

export interface DailyFoodLog {
  date: string
  entries: FoodLogEntry[]
  totalNutrition: NutritionInfo
  plannedVsActual?: {
    planned: NutritionInfo
    actual: NutritionInfo
    adherenceScore: number // 0-100
  }
}

export interface FoodLogStats {
  period: string // 'week' | 'month'
  startDate: string
  endDate: string
  averageDailyCalories: number
  averageAdherenceScore: number
  nutritionTrends: {
    calories: number[]
    protein: number[]
    carbs: number[]
    fat: number[]
  }
  insights: string[]
}

export interface LogFoodRequest {
  userId: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipeId?: string
  customFood?: {
    name: string
    nutrition: NutritionInfo
    portionSize: number
    unit: string
  }
  portionSize: number
  notes?: string
  source: 'meal_plan' | 'manual_entry' | 'photo_log'
}

class FoodLoggingService {
  /**
   * Log a food entry
   */
  async logFood(request: LogFoodRequest): Promise<FoodLogEntry> {
    return apiRequest<FoodLogEntry>('/food-log/entries', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get food log for a specific date
   */
  async getDailyLog(userId: string, date: string): Promise<DailyFoodLog | null> {
    try {
      return await apiRequest<DailyFoodLog>(`/food-log/${userId}/daily/${date}`)
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Get food log for a date range
   */
  async getLogRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyFoodLog[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    })
    return apiRequest<DailyFoodLog[]>(`/food-log/${userId}/range?${params.toString()}`)
  }

  /**
   * Update a food log entry
   */
  async updateEntry(entryId: string, updates: Partial<LogFoodRequest>): Promise<FoodLogEntry> {
    return apiRequest<FoodLogEntry>(`/food-log/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  /**
   * Delete a food log entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    await apiRequest(`/food-log/entries/${entryId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get food logging statistics
   */
  async getStats(
    userId: string,
    period: 'week' | 'month',
    endDate?: string
  ): Promise<FoodLogStats> {
    const params = new URLSearchParams({ period })
    if (endDate) {
      params.append('endDate', endDate)
    }
    return apiRequest<FoodLogStats>(`/food-log/${userId}/stats?${params.toString()}`)
  }

  /**
   * Compare planned vs actual nutrition for a date
   */
  async getAdherenceAnalysis(
    userId: string,
    date: string
  ): Promise<{
    planned: NutritionInfo
    actual: NutritionInfo
    adherenceScore: number
    insights: string[]
    recommendations: string[]
  }> {
    return apiRequest(`/food-log/${userId}/adherence/${date}`)
  }

  /**
   * Search food database for manual entry
   */
  async searchFoods(query: string): Promise<Array<{
    id: string
    name: string
    brand?: string
    nutrition: NutritionInfo
    commonPortions: Array<{
      name: string
      amount: number
      unit: string
    }>
  }>> {
    const params = new URLSearchParams({ q: query })
    return apiRequest(`/food-log/search?${params.toString()}`)
  }
}

export const foodLoggingService = new FoodLoggingService()
export default foodLoggingService