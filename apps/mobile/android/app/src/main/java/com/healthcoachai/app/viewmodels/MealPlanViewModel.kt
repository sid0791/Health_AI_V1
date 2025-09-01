package com.healthcoachai.app.viewmodels

import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healthcoachai.app.data.*
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult
import com.healthcoachai.app.services.MealPlanningService
import kotlinx.coroutines.launch

/**
 * ViewModel for Meal Planning Screen
 * Manages API calls and UI state
 */
class MealPlanViewModel : ViewModel() {
    
    private val apiClient = ApiClient()
    private val mealPlanningService = MealPlanningService(apiClient)
    
    // UI State
    var uiState by mutableStateOf(MealPlanUiState())
        private set
    
    // Mock user profile - in real app this would come from user repository
    private val mockUserProfile = UserProfile(
        age = 28,
        gender = "female",
        weight = 65.0,
        height = 165.0,
        activityLevel = "moderate",
        goals = listOf("weight_loss", "muscle_gain"),
        healthConditions = listOf("PCOS"),
        allergies = listOf("nuts"),
        dietaryPreferences = listOf("vegetarian"),
        cuisinePreferences = listOf("Indian", "Mediterranean"),
        preferredIngredients = listOf("quinoa", "lentils", "vegetables"),
        avoidedIngredients = listOf("refined_sugar", "white_rice"),
        budgetRange = BudgetRange(min = 200.0, max = 500.0),
        cookingSkillLevel = 3,
        availableCookingTime = 30,
        mealFrequency = MealFrequency(
            mealsPerDay = 4,
            snacksPerDay = 1,
            includeBeverages = true
        )
    )
    
    init {
        loadCurrentMealPlan()
    }
    
    fun loadCurrentMealPlan() {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, error = null)
            
            when (val result = mealPlanningService.getCurrentMealPlan("user_123")) {
                is ApiResult.Success -> {
                    if (result.data != null) {
                        uiState = uiState.copy(
                            isLoading = false,
                            mealPlan = result.data,
                            error = null
                        )
                    } else {
                        // No meal plan exists, generate one
                        generateMealPlan()
                    }
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        isLoading = false,
                        error = "Failed to load meal plan: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    fun generateMealPlan() {
        viewModelScope.launch {
            uiState = uiState.copy(isGenerating = true, error = null)
            
            val request = GenerateMealPlanRequest(
                userId = "user_123",
                userProfile = mockUserProfile,
                planDuration = 7,
                targetCalories = 1800.0,
                macroTargets = MacroTargets(
                    protein = 25.0,
                    carbs = 45.0,
                    fat = 30.0
                )
            )
            
            when (val result = mealPlanningService.generateMealPlan(request)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isGenerating = false,
                        mealPlan = result.data,
                        error = null
                    )
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        isGenerating = false,
                        error = "Failed to generate meal plan: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    fun swapMeal(dayIndex: Int, mealType: String, currentRecipeId: String) {
        val mealPlan = uiState.mealPlan ?: return
        
        viewModelScope.launch {
            uiState = uiState.copy(isSwapping = true, error = null)
            
            val request = MealSwapRequest(
                mealPlanId = mealPlan.id,
                dayIndex = dayIndex,
                mealType = mealType,
                currentRecipeId = currentRecipeId,
                preferences = SwapPreferences(
                    maxPrepTime = 30,
                    difficulty = "Easy"
                )
            )
            
            when (val result = mealPlanningService.swapMeal(request)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isSwapping = false,
                        swapOptions = result.data,
                        swappingMeal = SwappingMeal(dayIndex, mealType)
                    )
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        isSwapping = false,
                        error = "Failed to get meal alternatives: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    fun applyMealSwap(newRecipeId: String) {
        val mealPlan = uiState.mealPlan ?: return
        val swappingMeal = uiState.swappingMeal ?: return
        
        viewModelScope.launch {
            val request = ApplyMealSwapRequest(
                dayIndex = swappingMeal.dayIndex,
                mealType = swappingMeal.mealType,
                newRecipeId = newRecipeId
            )
            
            when (val result = mealPlanningService.applyMealSwap(mealPlan.id, request)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        mealPlan = result.data,
                        swapOptions = null,
                        swappingMeal = null
                    )
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        error = "Failed to apply meal swap: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    fun clearError() {
        uiState = uiState.copy(error = null)
    }
    
    fun cancelSwap() {
        uiState = uiState.copy(
            swapOptions = null,
            swappingMeal = null
        )
    }
}

/**
 * UI state for meal plan screen
 */
data class MealPlanUiState(
    val isLoading: Boolean = false,
    val isGenerating: Boolean = false,
    val isSwapping: Boolean = false,
    val mealPlan: WeeklyMealPlan? = null,
    val swapOptions: List<Recipe>? = null,
    val swappingMeal: SwappingMeal? = null,
    val error: String? = null
)

data class SwappingMeal(
    val dayIndex: Int,
    val mealType: String
)