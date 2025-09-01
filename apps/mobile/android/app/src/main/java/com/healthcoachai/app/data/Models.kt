package com.healthcoachai.app.data

import kotlinx.serialization.Serializable

/**
 * Data models matching backend API interfaces
 */

@Serializable
data class UserProfile(
    val age: Int,
    val gender: String, // 'male' | 'female' | 'other'
    val weight: Double, // kg
    val height: Double, // cm
    val activityLevel: String, // 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
    val goals: List<String>,
    val healthConditions: List<String>,
    val allergies: List<String>,
    val dietaryPreferences: List<String>,
    val cuisinePreferences: List<String>,
    val preferredIngredients: List<String>,
    val avoidedIngredients: List<String>,
    val budgetRange: BudgetRange,
    val cookingSkillLevel: Int, // 1-5
    val availableCookingTime: Int, // minutes per meal
    val mealFrequency: MealFrequency
)

@Serializable
data class BudgetRange(
    val min: Double,
    val max: Double // INR per day
)

@Serializable
data class MealFrequency(
    val mealsPerDay: Int,
    val snacksPerDay: Int,
    val includeBeverages: Boolean
)

@Serializable
data class NutritionInfo(
    val calories: Double,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
    val fiber: Double? = null,
    val sugar: Double? = null,
    val sodium: Double? = null,
    val glycemicIndex: Int? = null,
    val glycemicLoad: Double? = null
)

@Serializable
data class Recipe(
    val id: String,
    val name: String,
    val description: String? = null,
    val ingredients: List<String>,
    val instructions: List<String>,
    val prepTime: Int,
    val cookTime: Int,
    val servings: Int,
    val difficulty: String, // 'Easy' | 'Medium' | 'Hard'
    val cuisine: String,
    val tags: List<String>,
    val nutrition: NutritionInfo,
    val image: String? = null
)

@Serializable
data class MealPlanEntry(
    val id: String,
    val mealType: String, // 'breakfast' | 'lunch' | 'snack' | 'dinner'
    val time: String,
    val recipe: Recipe,
    val portionSize: Double,
    val alternatives: List<Recipe>? = null
)

@Serializable
data class DayMealPlan(
    val date: String,
    val meals: List<MealPlanEntry>,
    val totalNutrition: NutritionInfo,
    val adherenceScore: Double? = null
)

@Serializable
data class WeeklyMealPlan(
    val id: String,
    val userId: String,
    val startDate: String,
    val endDate: String,
    val days: List<DayMealPlan>,
    val goals: List<String>,
    val createdAt: String,
    val lastModified: String
)

@Serializable
data class GenerateMealPlanRequest(
    val userId: String,
    val userProfile: UserProfile,
    val planDuration: Int, // days
    val targetCalories: Double? = null,
    val macroTargets: MacroTargets? = null,
    val excludeRecipeIds: List<String>? = null,
    val regenerateDay: String? = null // YYYY-MM-DD format
)

@Serializable
data class MacroTargets(
    val protein: Double, // percentage
    val carbs: Double, // percentage
    val fat: Double // percentage
)

@Serializable
data class MealSwapRequest(
    val mealPlanId: String,
    val dayIndex: Int,
    val mealType: String, // 'breakfast' | 'lunch' | 'snack' | 'dinner'
    val currentRecipeId: String,
    val preferences: SwapPreferences? = null
)

@Serializable
data class SwapPreferences(
    val cuisine: String? = null,
    val maxPrepTime: Int? = null,
    val difficulty: String? = null // 'Easy' | 'Medium' | 'Hard'
)

@Serializable
data class ApplyMealSwapRequest(
    val dayIndex: Int,
    val mealType: String,
    val newRecipeId: String
)

// Chat Models
@Serializable
data class ChatMessage(
    val id: String,
    val type: String, // 'user' | 'assistant'
    val message: String,
    val timestamp: String,
    val metadata: ChatMetadata? = null
)

@Serializable
data class ChatMetadata(
    val domainClassification: DomainClassification? = null,
    val references: List<String>? = null,
    val confidence: Double? = null
)

@Serializable
data class DomainClassification(
    val isInScope: Boolean,
    val category: String? = null,
    val reason: String? = null
)

@Serializable
data class ChatSession(
    val id: String,
    val userId: String,
    val sessionType: String,
    val messages: List<ChatMessage>,
    val metadata: Map<String, String>? = null,
    val createdAt: String,
    val lastActivity: String
)

@Serializable
data class SendMessageRequest(
    val message: String,
    val sessionId: String,
    val sessionType: String,
    val userPreferences: UserPreferences? = null
)

@Serializable
data class UserPreferences(
    val language: String = "en",
    val responseStyle: String = "friendly"
)

@Serializable
data class SendMessageResponse(
    val success: Boolean,
    val messageId: String? = null,
    val assistantResponse: String? = null,
    val error: String? = null
)

@Serializable
data class SuggestedQuestion(
    val id: String,
    val question: String,
    val category: String,
    val priority: Int = 0
)

@Serializable
data class SuggestedQuestionsRequest(
    val currentPage: String? = null,
    val userGoals: List<String>? = null,
    val recentTopics: List<String>? = null
)