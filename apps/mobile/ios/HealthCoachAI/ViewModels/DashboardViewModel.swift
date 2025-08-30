import Foundation
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var dashboardData: DashboardData?
    @Published var todayNutrition: TodayNutrition?
    @Published var todayMeals: TodayMeals?
    @Published var activityData: ActivityData?
    @Published var weeklyProgress: WeeklyProgress?
    @Published var insights: [String] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Auto-refresh every 5 minutes when app is active
        Timer.publish(every: 300, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                Task {
                    await self?.refreshData()
                }
            }
            .store(in: &cancellables)
    }
    
    func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let dashboardTask = loadDashboardData()
            async let nutritionTask = loadTodayNutrition()
            async let mealsTask = loadTodayMeals()
            async let activityTask = loadActivityData()
            async let progressTask = loadWeeklyProgress()
            
            // Wait for all tasks to complete
            let (dashboard, nutrition, meals, activity, progress) = await (
                dashboardTask,
                nutritionTask,
                mealsTask,
                activityTask,
                progressTask
            )
            
            self.dashboardData = dashboard
            self.todayNutrition = nutrition
            self.todayMeals = meals
            self.activityData = activity
            self.weeklyProgress = progress
            
            // Extract insights from dashboard data
            if let dashboard = dashboard {
                self.insights = dashboard.insights
            }
            
        } catch {
            self.errorMessage = error.localizedDescription
            print("Dashboard load error: \(error)")
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        await loadData()
    }
    
    // MARK: - Private Methods
    
    private func loadDashboardData() async -> DashboardData? {
        do {
            return try await apiService.request(
                endpoint: "/analytics/dashboard",
                method: .GET,
                responseType: DashboardData.self
            )
        } catch {
            print("Failed to load dashboard data: \(error)")
            return nil
        }
    }
    
    private func loadTodayNutrition() async -> TodayNutrition? {
        do {
            let summary = try await apiService.request(
                endpoint: "/meal-logs/nutrition-summary",
                method: .GET,
                responseType: NutritionSummary.self
            )
            
            // Convert NutritionSummary to TodayNutrition
            return TodayNutrition(
                calories: Int(summary?.summary.totalCalories ?? 0),
                protein: Int(summary?.summary.totalProtein ?? 0),
                carbs: Int(summary?.summary.totalCarbs ?? 0),
                fat: Int(summary?.summary.totalFat ?? 0),
                calorieTarget: summary?.goals.targetCalories ?? 2000,
                proteinTarget: summary?.goals.targetProtein ?? 120,
                carbTarget: summary?.goals.targetCarbs ?? 200,
                fatTarget: summary?.goals.targetFat ?? 67
            )
        } catch {
            print("Failed to load nutrition data: \(error)")
            return nil
        }
    }
    
    private func loadTodayMeals() async -> TodayMeals? {
        do {
            return try await apiService.request(
                endpoint: "/meal-plans/today-meals",
                method: .GET,
                responseType: TodayMeals.self
            )
        } catch {
            print("Failed to load today's meals: \(error)")
            return nil
        }
    }
    
    private func loadActivityData() async -> ActivityData? {
        do {
            let activitySummary = try await apiService.request(
                endpoint: "/analytics/activity-summary?days=1",
                method: .GET,
                responseType: ActivitySummaryResponse.self
            )
            
            // Get today's data from the summary
            if let todayData = activitySummary?.dailyData.first {
                return ActivityData(
                    steps: todayData.steps,
                    caloriesBurned: todayData.caloriesBurned,
                    activeMinutes: todayData.activeMinutes,
                    workouts: todayData.workouts
                )
            }
            
            return nil
        } catch {
            print("Failed to load activity data: \(error)")
            // Return mock data for demo purposes
            return ActivityData(
                steps: 8245,
                caloriesBurned: 456,
                activeMinutes: 45,
                workouts: 1
            )
        }
    }
    
    private func loadWeeklyProgress() async -> WeeklyProgress? {
        do {
            let adherence = try await apiService.request(
                endpoint: "/analytics/adherence-score?days=7",
                method: .GET,
                responseType: AdherenceResponse.self
            )
            
            return WeeklyProgress(
                adherenceScore: adherence?.score ?? 0,
                mealsLogged: adherence?.breakdown.loggedMeals ?? 0,
                plannedMeals: adherence?.breakdown.plannedMeals ?? 0,
                averageCalories: 1850, // This would come from nutrition summary
                targetCalories: 2000,
                workouts: 3, // This would come from activity summary
                targetWorkouts: 4
            )
        } catch {
            print("Failed to load weekly progress: \(error)")
            return nil
        }
    }
}

// MARK: - Supporting Response Models

struct ActivitySummaryResponse: Codable {
    let period: String
    let totals: ActivityTotals
    let averages: ActivityAverages
    let dailyData: [DailyActivityData]
    let goals: ActivityGoals
}

struct ActivityTotals: Codable {
    let steps: Int
    let caloriesBurned: Int
    let activeMinutes: Int
    let workouts: Int
}

struct ActivityAverages: Codable {
    let dailySteps: Int
    let dailyCalories: Int
    let dailyActiveMinutes: Int
    let weeklyWorkouts: Int
}

struct DailyActivityData: Codable {
    let date: String
    let steps: Int
    let caloriesBurned: Int
    let activeMinutes: Int
    let workouts: Int
}

struct ActivityGoals: Codable {
    let dailySteps: Int
    let weeklyWorkouts: Int
    let weeklyActiveMinutes: Int
}

struct AdherenceResponse: Codable {
    let score: Int
    let period: String
    let breakdown: AdherenceBreakdown
    let trend: String
    let recommendations: [String]
}

struct AdherenceBreakdown: Codable {
    let plannedMeals: Int
    let loggedMeals: Int
    let missedMeals: Int
}