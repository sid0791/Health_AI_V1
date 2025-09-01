package com.healthcoachai.app.services

import com.healthcoachai.app.data.*
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult

/**
 * Meal Planning Service
 * Integrates with backend AI meal generation service
 */
class MealPlanningService(private val apiClient: ApiClient) {

    /**
     * Generate a personalized meal plan using AI
     */
    suspend fun generateMealPlan(request: GenerateMealPlanRequest): ApiResult<WeeklyMealPlan> {
        return apiClient.request(
            endpoint = "/meal-plans/generate",
            method = "POST",
            body = request
        )
    }

    /**
     * Get existing meal plan by ID
     */
    suspend fun getMealPlan(planId: String): ApiResult<WeeklyMealPlan> {
        return apiClient.request("/meal-plans/$planId")
    }

    /**
     * Get user's current/latest meal plan
     */
    suspend fun getCurrentMealPlan(userId: String): ApiResult<WeeklyMealPlan?> {
        return try {
            apiClient.request("/meal-plans/current/$userId")
        } catch (e: Exception) {
            // Return null if no meal plan exists (404)
            ApiResult.Success(null)
        }
    }

    /**
     * Swap a meal with alternative options
     */
    suspend fun swapMeal(request: MealSwapRequest): ApiResult<List<Recipe>> {
        return apiClient.request(
            endpoint = "/meal-plans/swap-meal",
            method = "POST",
            body = request
        )
    }

    /**
     * Apply a meal swap to the plan
     */
    suspend fun applyMealSwap(
        planId: String,
        request: ApplyMealSwapRequest
    ): ApiResult<WeeklyMealPlan> {
        return apiClient.request(
            endpoint = "/meal-plans/$planId/apply-swap",
            method = "PATCH",
            body = request
        )
    }

    /**
     * Get nutrition analysis for a specific day
     */
    suspend fun getDayNutritionAnalysis(
        planId: String,
        dayIndex: Int
    ): ApiResult<NutritionAnalysis> {
        return apiClient.request("/meal-plans/$planId/days/$dayIndex/nutrition")
    }

    /**
     * Search recipes by criteria
     */
    suspend fun searchRecipes(criteria: RecipeSearchCriteria): ApiResult<List<Recipe>> {
        val queryParams = buildString {
            criteria.query?.let { append("query=$it&") }
            criteria.cuisine?.let { append("cuisine=$it&") }
            criteria.maxPrepTime?.let { append("maxPrepTime=$it&") }
            criteria.difficulty?.let { append("difficulty=$it&") }
            // Add more parameters as needed
        }.trimEnd('&')
        
        return apiClient.request("/recipes/search?$queryParams")
    }

    /**
     * Get recipe details by ID
     */
    suspend fun getRecipe(recipeId: String): ApiResult<Recipe> {
        return apiClient.request("/recipes/$recipeId")
    }

    /**
     * Save user preferences for future meal planning
     */
    suspend fun saveUserPreferences(userId: String, preferences: UserProfile): ApiResult<Unit> {
        return apiClient.request(
            endpoint = "/users/$userId/meal-preferences",
            method = "PATCH",
            body = preferences
        )
    }
}

// Additional data classes for service
@kotlinx.serialization.Serializable
data class NutritionAnalysis(
    val nutrition: NutritionInfo,
    val deficiencies: List<String>,
    val excesses: List<String>,
    val recommendations: List<String>
)

@kotlinx.serialization.Serializable
data class RecipeSearchCriteria(
    val query: String? = null,
    val cuisine: String? = null,
    val dietaryRestrictions: List<String>? = null,
    val maxPrepTime: Int? = null,
    val difficulty: String? = null,
    val nutrition: NutritionCriteria? = null
)

@kotlinx.serialization.Serializable
data class NutritionCriteria(
    val maxCalories: Double? = null,
    val minProtein: Double? = null
)