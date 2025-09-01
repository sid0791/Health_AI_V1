import Foundation

// MARK: - Dashboard Data Models

struct DashboardData: Codable {
    let mealsToday: Int
    let caloriesConsumed: Int
    let moodLevel: Int
    let activePlan: ActivePlan?
    let recentActivity: [RecentActivity]
    let insights: [String]
}

struct ActivePlan: Codable {
    let id: String
    let name: String
    let daysRemaining: Int
    let adherenceScore: Int
    let progressPercentage: Int
}

struct RecentActivity: Codable {
    let id: String
    let foodName: String
    let mealType: String
    let calories: Int?
    let loggedAt: Date
}

struct TodayNutrition: Codable {
    let calories: Int
    let protein: Int
    let carbs: Int
    let fat: Int
    let calorieTarget: Int
    let proteinTarget: Int
    let carbTarget: Int
    let fatTarget: Int
}

struct TodayMeals: Codable {
    let total: Int
    let completed: Int
    let meals: [TodayMeal]
}

struct TodayMeal: Codable {
    let id: String
    let name: String
    let mealType: String
    let calories: Int
    let isCompleted: Bool
    let plannedTime: String?
}

struct ActivityData: Codable {
    let steps: Int
    let caloriesBurned: Int
    let activeMinutes: Int
    let workouts: Int
}

struct WeeklyProgress: Codable {
    let adherenceScore: Int
    let mealsLogged: Int
    let plannedMeals: Int
    let averageCalories: Int
    let targetCalories: Int
    let workouts: Int
    let targetWorkouts: Int
}

// MARK: - Meal Plan Data Models

struct MealPlan: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let planType: String
    let status: String
    let startDate: Date
    let endDate: Date
    let durationDays: Int
    let isActive: Bool
    let targetCaloriesPerDay: Int
    let targetProteinGrams: Double
    let targetCarbGrams: Double
    let targetFatGrams: Double
    let adherenceScore: Double
    let entries: [MealPlanEntry]
}

struct MealPlanEntry: Codable, Identifiable {
    let id: String
    let dayNumber: Int
    let mealType: String
    let mealName: String
    let mealDescription: String?
    let calories: Double
    let proteinGrams: Double
    let carbsGrams: Double
    let fatGrams: Double
    let prepTimeMinutes: Int?
    let cookTimeMinutes: Int?
    let status: String
    let plannedTime: String?
    let portionSize: Double
    let recipe: Recipe?
}

struct Recipe: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let prepTimeMinutes: Int
    let cookTimeMinutes: Int
    let difficulty: String
    let servings: Int
    let instructions: [String]
    let ingredients: [RecipeIngredient]
    let tags: [String]
    let imageUrl: String?
    let nutrition: RecipeNutrition?
}

struct RecipeIngredient: Codable, Identifiable {
    let id: String
    let name: String
    let quantity: Double
    let unit: String
    let isOptional: Bool
    let notes: String?
}

struct RecipeNutrition: Codable {
    let caloriesPerServing: Double
    let proteinGrams: Double
    let carbsGrams: Double
    let fatGrams: Double
    let fiberGrams: Double?
    let sugarGrams: Double?
    let sodiumMg: Double?
}

// MARK: - Food Search Models

struct FoodSearchResult: Codable, Identifiable {
    let id: String
    let name: String
    let nameHinglish: String?
    let calories: Double
    let protein: Double
    let carbs: Double
    let fat: Double
    let unit: String
    let searchRelevance: Double
}

// MARK: - Meal Log Models

struct MealLog: Codable, Identifiable {
    let id: String
    let foodName: String
    let foodDescription: String?
    let hinglishDescription: String?
    let mealType: String
    let portionSize: Double
    let portionUnit: String
    let caloriesConsumed: Double?
    let proteinGrams: Double?
    let carbsGrams: Double?
    let fatGrams: Double?
    let loggedAt: Date
    let location: String?
    let notes: String?
    let satisfactionLevel: Int?
    let photoUrl: String?
}

struct CreateMealLogRequest: Codable {
    let foodName: String
    let foodDescription: String?
    let hinglishDescription: String?
    let mealType: String
    let portionSize: Double
    let portionUnit: String
    let recipeId: String?
    let caloriesConsumed: Double?
    let proteinGrams: Double?
    let carbsGrams: Double?
    let fatGrams: Double?
    let fiberGrams: Double?
    let sugarGrams: Double?
    let sodiumMg: Double?
    let loggedAt: String?
    let location: String?
    let notes: String?
    let satisfactionLevel: Int?
}

// MARK: - Analytics Models

struct NutritionSummary: Codable {
    let period: DatePeriod
    let summary: NutritionTotals
    let macroPercentages: MacroPercentages
    let mealTypeBreakdown: [String: MealTypeNutrition]
    let goals: NutritionGoals
    let progress: NutritionProgress
}

struct DatePeriod: Codable {
    let startDate: String
    let endDate: String
}

struct NutritionTotals: Codable {
    let totalCalories: Double
    let totalProtein: Double
    let totalCarbs: Double
    let totalFat: Double
    let totalFiber: Double
    let totalSugar: Double
    let totalSodium: Double
    let mealCount: Int
    let averageCaloriesPerMeal: Double
}

struct MacroPercentages: Codable {
    let proteinPercent: Int
    let carbsPercent: Int
    let fatPercent: Int
}

struct MealTypeNutrition: Codable {
    let calories: Double
    let protein: Double
    let carbs: Double
    let fat: Double
    let count: Int
}

struct NutritionGoals: Codable {
    let targetCalories: Int
    let targetProtein: Int
    let targetCarbs: Int
    let targetFat: Int
}

struct NutritionProgress: Codable {
    let caloriesProgress: Int
    let proteinProgress: Int
    let carbsProgress: Int
    let fatProgress: Int
}

struct WeightTrendData: Codable {
    let data: [WeightDataPoint]
    let trend: WeightTrend
    let goals: WeightGoals
}

struct WeightDataPoint: Codable {
    let date: String
    let weight: Double
}

struct WeightTrend: Codable {
    let change: Double
    let direction: String
    let averageWeeklyChange: Double
}

struct WeightGoals: Codable {
    let targetWeight: Double
    let goalType: String
    let estimatedETA: String
}

// MARK: - API Response Models

struct APIResponse<T: Codable>: Codable {
    let data: T?
    let message: String?
    let success: Bool
}

struct ErrorResponse: Codable {
    let message: String
    let statusCode: Int
}

// MARK: - Enums

enum MealType: String, CaseIterable, Codable {
    case breakfast = "breakfast"
    case lunch = "lunch"
    case dinner = "dinner"
    case snack = "snack"
    
    var displayName: String {
        switch self {
        case .breakfast: return "Breakfast"
        case .lunch: return "Lunch"
        case .dinner: return "Dinner"
        case .snack: return "Snack"
        }
    }
    
    var emoji: String {
        switch self {
        case .breakfast: return "🌅"
        case .lunch: return "☀️"
        case .dinner: return "🌙"
        case .snack: return "🍎"
        }
    }
}

enum MealPlanStatus: String, Codable {
    case draft = "draft"
    case active = "active"
    case completed = "completed"
    case paused = "paused"
    case cancelled = "cancelled"
    case expired = "expired"
}

enum LoggingMethod: String, Codable {
    case manual = "manual"
    case photo = "photo"
    case voice = "voice"
    case barcode = "barcode"
}

enum SatisfactionLevel: Int, CaseIterable, Codable {
    case veryUnsatisfied = 1
    case unsatisfied = 2
    case neutral = 3
    case satisfied = 4
    case verySatisfied = 5
    
    var emoji: String {
        switch self {
        case .veryUnsatisfied: return "😞"
        case .unsatisfied: return "🙁"
        case .neutral: return "😐"
        case .satisfied: return "🙂"
        case .verySatisfied: return "😊"
        }
    }
    
    var description: String {
        switch self {
        case .veryUnsatisfied: return "Very Unsatisfied"
        case .unsatisfied: return "Unsatisfied"
        case .neutral: return "Neutral"
        case .satisfied: return "Satisfied"
        case .verySatisfied: return "Very Satisfied"
        }
    }
}

// MARK: - Quantity Options

struct QuantityOption {
    let multiplier: Double
    let displayText: String
    
    static let defaultOptions = [
        QuantityOption(multiplier: 0.5, displayText: "½"),
        QuantityOption(multiplier: 1.0, displayText: "1×"),
        QuantityOption(multiplier: 1.5, displayText: "1½"),
        QuantityOption(multiplier: 2.0, displayText: "2×"),
    ]
}

// MARK: - Chat Data Models

struct ChatSession: Codable, Identifiable {
    let id: String
    let userId: String
    let sessionType: String
    let title: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    let messages: [ChatMessage]?
    let context: [String: String]?
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    let type: String // "user" or "assistant"
    let message: String
    let timestamp: Date
    let processingStatus: String?
    let metadata: ChatMessageMetadata?
    let ragSources: [String]?
    let actionRequests: [String]?
    let tokenCount: Int?
    let costUsd: Double?
}

struct ChatMessageMetadata: Codable {
    let domainClassification: String?
    let confidence: Double?
    let isInScope: Bool?
    let reason: String?
}

struct SendMessageRequest: Codable {
    let message: String
    let sessionId: String?
    let sessionType: String?
    let context: [String: String]?
    let userPreferences: UserPreferences?
}

struct SendMessageResponse: Codable {
    let success: Bool
    let messageId: String
    let sessionId: String
    let response: ChatMessage
    let quotaStatus: QuotaStatus?
    let suggestedActions: [String]?
}

struct UserPreferences: Codable {
    let language: String?
    let responseStyle: String?
    let domainFocus: [String]?
}

struct SuggestedQuestion: Codable, Identifiable {
    let id: String
    let question: String
    let category: String
    let description: String?
}

struct SuggestedQuestionsRequest: Codable {
    let currentGoals: [String]?
    let healthConditions: [String]?
    let preferences: [String]?
    let currentPage: String?
}

struct AiCapabilities: Codable {
    let allowedTopics: [String]
    let restrictedTopics: [String]
    let supportedLanguages: [String]
    let features: [String]
}

// MARK: - AI Cost Optimization Models

struct CostMetrics: Codable {
    let totalRequests: Int
    let totalTokens: Int
    let totalCost: Double
    let averageTokensPerRequest: Double
    let averageCostPerRequest: Double
    let costByModel: [String: Double]
    let tokensByModel: [String: Int]
    let requestsByCategory: [String: Int]
    let dailyCost: Double
    let monthlyCost: Double
    let projectedMonthlyCost: Double
}

struct QuotaStatus: Codable {
    let userId: String
    let dailyQuota: Int
    let dailyUsed: Int
    let monthlyQuota: Int
    let monthlyUsed: Int
    let isNearLimit: Bool
    let isOverLimit: Bool
    let resetTime: Date
}

struct CostOptimizationSettings: Codable {
    let enableBatching: Bool
    let maxBatchSize: Int
    let batchTimeoutSeconds: Int
    let enableTemplateOptimization: Bool
    let costThresholdUsd: Double
    let preferredModel: String?
}