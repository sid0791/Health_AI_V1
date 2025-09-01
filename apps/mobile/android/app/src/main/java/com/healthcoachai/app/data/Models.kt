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
    val image: String? = null,
    val isFavorite: Boolean = false
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
    val processingStatus: String? = null,
    val metadata: ChatMetadata? = null,
    val ragSources: List<String>? = null,
    val actionRequests: List<String>? = null,
    val tokenCount: Int? = null,
    val costUsd: Double? = null
)

@Serializable
data class ChatMetadata(
    val domainClassification: String? = null,
    val confidence: Double? = null,
    val isInScope: Boolean? = null,
    val reason: String? = null,
    val references: List<String>? = null
)

@Serializable
data class ChatSession(
    val id: String,
    val userId: String,
    val sessionType: String,
    val title: String? = null,
    val isActive: Boolean = true,
    val createdAt: String,
    val updatedAt: String,
    val messages: List<ChatMessage>,
    val context: Map<String, String>? = null
)

@Serializable
data class SendMessageRequest(
    val message: String,
    val sessionId: String? = null,
    val sessionType: String? = null,
    val context: Map<String, String>? = null,
    val userPreferences: UserPreferences? = null
)

@Serializable
data class UserPreferences(
    val language: String = "en",
    val responseStyle: String = "friendly",
    val domainFocus: List<String>? = null
)

@Serializable
data class SendMessageResponse(
    val success: Boolean,
    val messageId: String,
    val sessionId: String,
    val response: ChatMessage,
    val quotaStatus: QuotaStatus? = null,
    val suggestedActions: List<String>? = null,
    val error: String? = null
)

@Serializable
data class SuggestedQuestion(
    val id: String,
    val question: String,
    val category: String,
    val description: String? = null,
    val priority: Int = 0
)

@Serializable
data class SuggestedQuestionsRequest(
    val currentGoals: List<String>? = null,
    val healthConditions: List<String>? = null,
    val preferences: List<String>? = null,
    val currentPage: String? = null,
    val userGoals: List<String>? = null,
    val recentTopics: List<String>? = null
)

// MARK: - Health Reports Data Models

@Serializable
data class HealthReport(
    val id: String,
    val title: String,
    val date: String,
    val summary: String,
    val keyFindings: List<String>,
    val hasAIInsights: Boolean,
    val reportType: String, // "lab_results", "medical_checkup", "imaging", etc.
    val status: String, // "processed", "pending", "error"
    val uploadedAt: String,
    val fileUrl: String? = null
)

@Serializable
data class RedFlagAlert(
    val id: String,
    val title: String,
    val description: String,
    val severity: String, // "critical", "high", "medium", "low"
    val recommendation: String,
    val isRead: Boolean,
    val createdAt: String,
    val reportId: String? = null,
    val metricName: String? = null,
    val alertType: String // "abnormal_value", "trend_concern", "missing_data", etc.
)

@Serializable
data class HealthMetric(
    val id: String,
    val name: String,
    val value: String,
    val unit: String,
    val trend: String, // "up", "down", "stable"
    val type: String, // "blood_pressure", "cholesterol", "glucose", etc.
    val lastUpdated: String,
    val normalRange: String? = null,
    val isNormal: Boolean,
    val changePercent: Double? = null
)

@Serializable
data class HealthReportMetadata(
    val reportType: String,
    val testDate: String? = null,
    val labName: String? = null,
    val physicianName: String? = null,
    val notes: String? = null
)

@Serializable
data class HealthReportUploadResponse(
    val reportId: String,
    val status: String,
    val uploadUrl: String? = null,
    val processingEstimate: String? = null
)

@Serializable
data class HealthReportAnalysis(
    val reportId: String,
    val aiInsights: List<String>,
    val keyMetrics: List<HealthMetric>,
    val recommendations: List<String>,
    val redFlags: List<RedFlagAlert>,
    val comparisonWithPrevious: String? = null,
    val confidenceScore: Double,
    val analysisDate: String
)

@Serializable
data class PhysicianReviewRequest(
    val requestId: String,
    val reportId: String,
    val urgency: String,
    val estimatedResponseTime: String,
    val status: String, // "submitted", "in_review", "completed"
    val notes: String? = null
)

@Serializable
data class HealthTrend(
    val metricType: String,
    val metricName: String,
    val dataPoints: List<TrendDataPoint>,
    val overallTrend: String, // "improving", "declining", "stable"
    val trendAnalysis: String,
    val predictions: List<TrendPrediction>? = null
)

@Serializable
data class TrendDataPoint(
    val date: String,
    val value: Double,
    val unit: String,
    val isNormal: Boolean
)

@Serializable
data class TrendPrediction(
    val date: String,
    val predictedValue: Double,
    val confidence: Double,
    val factors: List<String>
)

@Serializable
data class HealthCheckReminder(
    val id: String,
    val reminderType: String,
    val nextDueDate: String,
    val intervalDays: Int,
    val customMessage: String? = null,
    val isActive: Boolean
)

@Serializable
data class HealthInsights(
    val overallHealthScore: Int, // 0-100
    val insights: List<HealthInsight>,
    val actionableRecommendations: List<String>,
    val riskFactors: List<RiskFactor>,
    val strengths: List<String>,
    val generatedAt: String
)

@Serializable
data class HealthInsight(
    val category: String,
    val insight: String,
    val severity: String,
    val confidence: Double,
    val evidencePoints: List<String>
)

@Serializable
data class RiskFactor(
    val name: String,
    val riskLevel: String, // "low", "medium", "high", "critical"
    val description: String,
    val mitigationStrategies: List<String>
)

@Serializable
data class PopulationComparison(
    val userMetrics: List<HealthMetric>,
    val populationAverages: Map<String, Double>,
    val percentileRankings: Map<String, Int>,
    val comparisonInsights: List<String>,
    val demographicInfo: String
)

@Serializable
data class DateRange(
    val startDate: String,
    val endDate: String
)

@Serializable
data class ExportResponse(
    val downloadUrl: String,
    val fileName: String,
    val format: String,
    val expiresAt: String
)

@Serializable
data class PhysicianRecommendation(
    val id: String,
    val category: String,
    val recommendation: String,
    val priority: String, // "immediate", "high", "medium", "low"
    val basedOnReports: List<String>,
    val specialistType: String? = null,
    val followUpInDays: Int? = null
)

@Serializable
data class HealthQuestionnaire(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val estimatedMinutes: Int,
    val questions: List<QuestionnaireQuestion>,
    val isRequired: Boolean = false
)

@Serializable
data class QuestionnaireQuestion(
    val id: String,
    val question: String,
    val type: String, // "multiple_choice", "text", "number", "scale", "yes_no"
    val options: List<String>? = null,
    val required: Boolean = true,
    val validation: QuestionValidation? = null
)

@Serializable
data class QuestionValidation(
    val minValue: Double? = null,
    val maxValue: Double? = null,
    val maxLength: Int? = null,
    val pattern: String? = null
)

@Serializable
data class QuestionnaireSubmissionResponse(
    val submissionId: String,
    val status: String,
    val insights: List<String>? = null,
    val recommendations: List<String>? = null
)