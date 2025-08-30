import Foundation
import Combine

@MainActor
class FitnessViewModel: ObservableObject {
    @Published var todayWorkout: WorkoutEntry?
    @Published var fitnessPlans: [FitnessPlan]?
    @Published var recentWorkouts: [WorkoutEntry] = []
    @Published var dailyStats: DailyFitnessStats?
    @Published var weeklyProgress: WeeklyFitnessProgress?
    @Published var monthlyGoals: MonthlyFitnessGoals?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    
    func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            async let todayWorkoutTask = loadTodayWorkout()
            async let fitnessPlansTask = loadFitnessPlans()
            async let recentWorkoutsTask = loadRecentWorkouts()
            async let dailyStatsTask = loadDailyStats()
            async let weeklyProgressTask = loadWeeklyProgress()
            async let monthlyGoalsTask = loadMonthlyGoals()
            
            let (todayWorkout, fitnessPlans, recentWorkouts, dailyStats, weeklyProgress, monthlyGoals) = await (
                todayWorkoutTask,
                fitnessPlansTask,
                recentWorkoutsTask,
                dailyStatsTask,
                weeklyProgressTask,
                monthlyGoalsTask
            )
            
            self.todayWorkout = todayWorkout
            self.fitnessPlans = fitnessPlans
            self.recentWorkouts = recentWorkouts ?? []
            self.dailyStats = dailyStats
            self.weeklyProgress = weeklyProgress
            self.monthlyGoals = monthlyGoals
            
        } catch {
            self.errorMessage = error.localizedDescription
            print("Fitness data load error: \(error)")
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        await loadData()
    }
    
    func startWorkout(_ workoutId: String) async {
        do {
            let _ = try await apiService.request(
                endpoint: "/fitness-plans/workouts/\(workoutId)/start",
                method: .POST,
                responseType: WorkoutEntry.self
            )
            
            // Refresh data to show updated status
            await loadData()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to start workout: \(error)")
        }
    }
    
    func completeWorkout(_ workoutId: String, rating: Int? = nil, notes: String? = nil) async {
        do {
            var body: [String: Any] = [:]
            if let rating = rating {
                body["rating"] = rating
            }
            if let notes = notes {
                body["notes"] = notes
            }
            
            let _ = try await apiService.request(
                endpoint: "/fitness-plans/workouts/\(workoutId)/complete",
                method: .POST,
                body: body,
                responseType: WorkoutEntry.self
            )
            
            // Refresh data to show updated status
            await loadData()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to complete workout: \(error)")
        }
    }
    
    func skipWorkout(_ workoutId: String, reason: String? = nil) async {
        do {
            var body: [String: Any] = [:]
            if let reason = reason {
                body["reason"] = reason
            }
            
            let _ = try await apiService.request(
                endpoint: "/fitness-plans/workouts/\(workoutId)/skip",
                method: .POST,
                body: body,
                responseType: WorkoutEntry.self
            )
            
            // Refresh data to show updated status
            await loadData()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to skip workout: \(error)")
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
    
    // MARK: - Private Methods
    
    private func loadTodayWorkout() async -> WorkoutEntry? {
        do {
            return try await apiService.request(
                endpoint: "/fitness-plans/today-workout",
                method: .GET,
                responseType: WorkoutEntry.self
            )
        } catch {
            print("Failed to load today's workout: \(error)")
            // Return mock data for demo
            return createMockTodayWorkout()
        }
    }
    
    private func loadFitnessPlans() async -> [FitnessPlan]? {
        do {
            return try await apiService.request(
                endpoint: "/fitness-plans",
                method: .GET,
                responseType: [FitnessPlan].self
            )
        } catch {
            print("Failed to load fitness plans: \(error)")
            // Return mock data for demo
            return [createMockFitnessPlan()]
        }
    }
    
    private func loadRecentWorkouts() async -> [WorkoutEntry]? {
        do {
            return try await apiService.request(
                endpoint: "/fitness-plans/recent-workouts?limit=5",
                method: .GET,
                responseType: [WorkoutEntry].self
            )
        } catch {
            print("Failed to load recent workouts: \(error)")
            return createMockRecentWorkouts()
        }
    }
    
    private func loadDailyStats() async -> DailyFitnessStats? {
        do {
            return try await apiService.request(
                endpoint: "/analytics/activity-summary?days=1",
                method: .GET,
                responseType: DailyFitnessStats.self
            )
        } catch {
            print("Failed to load daily stats: \(error)")
            return createMockDailyStats()
        }
    }
    
    private func loadWeeklyProgress() async -> WeeklyFitnessProgress? {
        do {
            return try await apiService.request(
                endpoint: "/fitness-plans/weekly-progress",
                method: .GET,
                responseType: WeeklyFitnessProgress.self
            )
        } catch {
            print("Failed to load weekly progress: \(error)")
            return createMockWeeklyProgress()
        }
    }
    
    private func loadMonthlyGoals() async -> MonthlyFitnessGoals? {
        do {
            return try await apiService.request(
                endpoint: "/fitness-plans/monthly-goals",
                method: .GET,
                responseType: MonthlyFitnessGoals.self
            )
        } catch {
            print("Failed to load monthly goals: \(error)")
            return createMockMonthlyGoals()
        }
    }
    
    // MARK: - Mock Data Creation (for demo purposes)
    
    private func createMockTodayWorkout() -> WorkoutEntry {
        return WorkoutEntry(
            id: "today-workout-1",
            name: "Upper Body Strength",
            description: "Focus on chest, shoulders, and arms with compound movements",
            durationMinutes: 45,
            exerciseCount: 8,
            difficulty: "Medium",
            status: "ready",
            scheduledDate: Date(),
            estimatedCalories: 320
        )
    }
    
    private func createMockFitnessPlan() -> FitnessPlan {
        return FitnessPlan(
            id: "plan-1",
            name: "Strength Building Program",
            description: "8-week progressive strength training program",
            status: "active",
            currentWeek: 3,
            totalWeeks: 8,
            completionPercentage: 37.5,
            adherenceScore: 85.0
        )
    }
    
    private func createMockRecentWorkouts() -> [WorkoutEntry] {
        return [
            WorkoutEntry(
                id: "recent-1",
                name: "Full Body HIIT",
                description: "High-intensity interval training",
                durationMinutes: 30,
                exerciseCount: 6,
                difficulty: "Hard",
                status: "completed",
                scheduledDate: Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date(),
                estimatedCalories: 280
            ),
            WorkoutEntry(
                id: "recent-2",
                name: "Lower Body Power",
                description: "Legs and glutes focused workout",
                durationMinutes: 50,
                exerciseCount: 10,
                difficulty: "Medium",
                status: "completed",
                scheduledDate: Calendar.current.date(byAdding: .day, value: -3, to: Date()) ?? Date(),
                estimatedCalories: 380
            ),
            WorkoutEntry(
                id: "recent-3",
                name: "Core & Flexibility",
                description: "Core strengthening and stretching",
                durationMinutes: 25,
                exerciseCount: 8,
                difficulty: "Easy",
                status: "completed",
                scheduledDate: Calendar.current.date(byAdding: .day, value: -5, to: Date()) ?? Date(),
                estimatedCalories: 180
            )
        ]
    }
    
    private func createMockDailyStats() -> DailyFitnessStats {
        return DailyFitnessStats(
            steps: 8245,
            stepGoal: 10000,
            activeMinutes: 45,
            activeMinutesGoal: 60,
            caloriesBurned: 456,
            caloriesGoal: 500,
            workoutsCompleted: 1,
            workoutsGoal: 1
        )
    }
    
    private func createMockWeeklyProgress() -> WeeklyFitnessProgress {
        return WeeklyFitnessProgress(
            workoutsCompleted: 3,
            workoutsPlanned: 4,
            totalMinutes: 125,
            targetMinutes: 180,
            totalCalories: 840,
            targetCalories: 1200
        )
    }
    
    private func createMockMonthlyGoals() -> MonthlyFitnessGoals {
        return MonthlyFitnessGoals(
            goals: [
                FitnessGoal(name: "Workout Sessions", current: 12, target: 16, unit: "sessions"),
                FitnessGoal(name: "Total Minutes", current: 480, target: 720, unit: "minutes"),
                FitnessGoal(name: "Calories Burned", current: 3200, target: 4800, unit: "calories"),
                FitnessGoal(name: "Steps", current: 180000, target: 300000, unit: "steps")
            ]
        )
    }
}

// MARK: - Fitness Data Models

struct WorkoutEntry: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let durationMinutes: Int
    let exerciseCount: Int
    let difficulty: String
    let status: String
    let scheduledDate: Date
    let estimatedCalories: Int?
}

struct FitnessPlan: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let status: String
    let currentWeek: Int
    let totalWeeks: Int
    let completionPercentage: Double
    let adherenceScore: Double
}

struct DailyFitnessStats: Codable {
    let steps: Int
    let stepGoal: Int
    let activeMinutes: Int
    let activeMinutesGoal: Int
    let caloriesBurned: Int
    let caloriesGoal: Int
    let workoutsCompleted: Int
    let workoutsGoal: Int
}

struct WeeklyFitnessProgress: Codable {
    let workoutsCompleted: Int
    let workoutsPlanned: Int
    let totalMinutes: Int
    let targetMinutes: Int
    let totalCalories: Int
    let targetCalories: Int
}

struct MonthlyFitnessGoals: Codable {
    let goals: [FitnessGoal]
}

struct FitnessGoal: Codable {
    let name: String
    let current: Int
    let target: Int
    let unit: String
}

enum WorkoutStatus: String, CaseIterable, Codable {
    case ready = "ready"
    case inProgress = "in_progress"
    case completed = "completed"
    case skipped = "skipped"
    
    var displayName: String {
        switch self {
        case .ready: return "Ready"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .skipped: return "Skipped"
        }
    }
    
    var color: Color {
        switch self {
        case .ready: return DesignColors.primary500
        case .inProgress: return DesignColors.warning500
        case .completed: return DesignColors.success500
        case .skipped: return DesignColors.gray500
        }
    }
}