import Foundation
import Combine

@MainActor
class AnalyticsViewModel: ObservableObject {
    @Published var weightTrend: WeightTrendData?
    @Published var macroBreakdown: MacroBreakdownResponse?
    @Published var micronutrientAnalysis: MicronutrientAnalysisResponse?
    @Published var goalProgress: GoalProgressResponse?
    @Published var activitySummary: ActivitySummaryResponse?
    @Published var adherenceScore: AdherenceResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    
    func loadData(for timeframe: Timeframe) async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let weightTask = loadWeightTrend(days: timeframe.days)
            async let macroTask = loadMacroBreakdown(days: timeframe.days)
            async let microTask = loadMicronutrientAnalysis(days: min(timeframe.days, 30))
            async let goalTask = loadGoalProgress()
            async let activityTask = loadActivitySummary(days: timeframe.days)
            async let adherenceTask = loadAdherenceScore(days: min(timeframe.days, 30))
            
            let (weight, macro, micro, goal, activity, adherence) = await (
                weightTask,
                macroTask,
                microTask,
                goalTask,
                activityTask,
                adherenceTask
            )
            
            self.weightTrend = weight
            self.macroBreakdown = macro
            self.micronutrientAnalysis = micro
            self.goalProgress = goal
            self.activitySummary = activity
            self.adherenceScore = adherence
            
        } catch {
            self.errorMessage = error.localizedDescription
            print("Analytics load error: \(error)")
        }
        
        isLoading = false
    }
    
    func refreshData(for timeframe: Timeframe) async {
        await loadData(for: timeframe)
    }
    
    func clearError() {
        errorMessage = nil
    }
    
    // MARK: - Private Methods
    
    private func loadWeightTrend(days: Int) async -> WeightTrendData? {
        do {
            return try await apiService.getWeightTrend(days: days)
        } catch {
            print("Failed to load weight trend: \(error)")
            return nil
        }
    }
    
    private func loadMacroBreakdown(days: Int) async -> MacroBreakdownResponse? {
        do {
            let endDate = Date()
            let startDate = Calendar.current.date(byAdding: .day, value: -days, to: endDate) ?? endDate
            
            return try await apiService.getMacroBreakdown(startDate: startDate, endDate: endDate)
        } catch {
            print("Failed to load macro breakdown: \(error)")
            return nil
        }
    }
    
    private func loadMicronutrientAnalysis(days: Int) async -> MicronutrientAnalysisResponse? {
        do {
            return try await apiService.request(
                endpoint: "/analytics/micronutrient-analysis?days=\(days)",
                method: .GET,
                responseType: MicronutrientAnalysisResponse.self
            )
        } catch {
            print("Failed to load micronutrient analysis: \(error)")
            return nil
        }
    }
    
    private func loadGoalProgress() async -> GoalProgressResponse? {
        do {
            return try await apiService.request(
                endpoint: "/analytics/goal-progress",
                method: .GET,
                responseType: GoalProgressResponse.self
            )
        } catch {
            print("Failed to load goal progress: \(error)")
            return nil
        }
    }
    
    private func loadActivitySummary(days: Int) async -> ActivitySummaryResponse? {
        do {
            return try await apiService.request(
                endpoint: "/analytics/activity-summary?days=\(days)",
                method: .GET,
                responseType: ActivitySummaryResponse.self
            )
        } catch {
            print("Failed to load activity summary: \(error)")
            // Return mock data for demo
            return createMockActivityData(days: days)
        }
    }
    
    private func loadAdherenceScore(days: Int) async -> AdherenceResponse? {
        do {
            return try await apiService.request(
                endpoint: "/analytics/adherence-score?days=\(days)",
                method: .GET,
                responseType: AdherenceResponse.self
            )
        } catch {
            print("Failed to load adherence score: \(error)")
            return nil
        }
    }
    
    private func createMockActivityData(days: Int) -> ActivitySummaryResponse {
        var dailyData: [DailyActivityData] = []
        
        for i in 0..<days {
            let date = Calendar.current.date(byAdding: .day, value: -i, to: Date()) ?? Date()
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            
            dailyData.append(DailyActivityData(
                date: formatter.string(from: date),
                steps: Int.random(in: 6000...12000),
                caloriesBurned: Int.random(in: 300...600),
                activeMinutes: Int.random(in: 20...90),
                workouts: Int.random(in: 0...2)
            ))
        }
        
        let totalSteps = dailyData.reduce(0) { $0 + $1.steps }
        let totalCalories = dailyData.reduce(0) { $0 + $1.caloriesBurned }
        let totalActiveMinutes = dailyData.reduce(0) { $0 + $1.activeMinutes }
        let totalWorkouts = dailyData.reduce(0) { $0 + $1.workouts }
        
        return ActivitySummaryResponse(
            period: "Last \(days) days",
            totals: ActivityTotals(
                steps: totalSteps,
                caloriesBurned: totalCalories,
                activeMinutes: totalActiveMinutes,
                workouts: totalWorkouts
            ),
            averages: ActivityAverages(
                dailySteps: totalSteps / days,
                dailyCalories: totalCalories / days,
                dailyActiveMinutes: totalActiveMinutes / days,
                weeklyWorkouts: (totalWorkouts * 7) / days
            ),
            dailyData: dailyData.reversed(),
            goals: ActivityGoals(
                dailySteps: 10000,
                weeklyWorkouts: 4,
                weeklyActiveMinutes: 150
            )
        )
    }
}

// MARK: - Additional Response Models

struct MicronutrientAnalysisResponse: Codable {
    let period: String
    let deficiencies: [MicronutrientDeficiency]
    let overallScore: Int
    let recommendations: [String]
}

struct MicronutrientDeficiency: Codable {
    let nutrient: String
    let currentIntake: Double
    let recommendedIntake: Double
    let unit: String
    let deficiency: Int
    let status: String
    let improvementSuggestions: [String]
}

struct GoalProgressResponse: Codable {
    let goals: [GoalItem]
    let overallProgress: Int
    let activePlan: ActivePlanInfo?
}

struct GoalItem: Codable {
    let type: String
    let target: Double
    let current: Double
    let unit: String
    let startValue: Double?
    let targetDate: String?
    let progress: Int
    let eta: String?
    let status: String
}

struct ActivePlanInfo: Codable {
    let name: String
    let adherence: Double
    let daysRemaining: Int
}