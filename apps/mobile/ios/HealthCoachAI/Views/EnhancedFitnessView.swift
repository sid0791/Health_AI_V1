import SwiftUI

// MARK: - Enhanced Fitness View for Phase 9
struct EnhancedFitnessView: View {
    @StateObject private var viewModel = FitnessViewModel()
    @State private var selectedTab = 0
    @State private var showingWorkoutDetail = false
    @State private var selectedWorkout: WorkoutEntry?
    
    private let tabs = ["Today", "Plans", "Progress"]
    
    var body: some View {
        NavigationView {
            VStack {
                // Custom Tab Selector
                FitnessTabSelector(selectedTab: $selectedTab, tabs: tabs)
                
                // Content Based on Selected Tab
                TabView(selection: $selectedTab) {
                    // Today's Workouts
                    TodayWorkoutView(viewModel: viewModel) { workout in
                        selectedWorkout = workout
                        showingWorkoutDetail = true
                    }
                    .tag(0)
                    
                    // Workout Plans
                    WorkoutPlansView(viewModel: viewModel) { workout in
                        selectedWorkout = workout
                        showingWorkoutDetail = true
                    }
                    .tag(1)
                    
                    // Progress View
                    FitnessProgressView(viewModel: viewModel)
                    .tag(2)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
            .navigationTitle("Fitness")
            .navigationBarTitleDisplayMode(.large)
            .background(Color(.systemGroupedBackground))
            .refreshable {
                await viewModel.refreshData()
            }
        }
        .onAppear {
            Task {
                await viewModel.loadData()
            }
        }
        .sheet(isPresented: $showingWorkoutDetail) {
            if let workout = selectedWorkout {
                WorkoutDetailView(workout: workout, viewModel: viewModel)
            }
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") {
                viewModel.clearError()
            }
        } message: {
            if let error = viewModel.errorMessage {
                Text(error)
            }
        }
    }
}

// MARK: - Fitness Tab Selector
struct FitnessTabSelector: View {
    @Binding var selectedTab: Int
    let tabs: [String]
    
    var body: some View {
        HStack {
            ForEach(0..<tabs.count, id: \.self) { index in
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        selectedTab = index
                    }
                }) {
                    Text(tabs[index])
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(selectedTab == index ? DesignColors.primary500 : .secondary)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background(
                            selectedTab == index ? 
                            DesignColors.primary100 : Color.clear
                        )
                        .cornerRadius(DesignRadius.md)
                }
            }
            Spacer()
        }
        .padding()
    }
}

// MARK: - Today's Workout View
struct TodayWorkoutView: View {
    let viewModel: FitnessViewModel
    let onWorkoutTap: (WorkoutEntry) -> Void
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                if let todayWorkout = viewModel.todayWorkout {
                    // Main Workout Card
                    TodayWorkoutCard(
                        workout: todayWorkout,
                        onTap: { onWorkoutTap(todayWorkout) },
                        onStart: {
                            Task {
                                await viewModel.startWorkout(todayWorkout.id)
                            }
                        },
                        onComplete: {
                            Task {
                                await viewModel.completeWorkout(todayWorkout.id)
                            }
                        }
                    )
                } else {
                    EmptyWorkoutView()
                }
                
                // Quick Stats
                if let stats = viewModel.dailyStats {
                    DailyStatsCard(stats: stats)
                }
                
                // Recent Activity
                if !viewModel.recentWorkouts.isEmpty {
                    RecentWorkoutsSection(
                        workouts: viewModel.recentWorkouts,
                        onWorkoutTap: onWorkoutTap
                    )
                }
                
                Spacer()
            }
            .padding()
        }
    }
}

// MARK: - Today's Workout Card
struct TodayWorkoutCard: View {
    let workout: WorkoutEntry
    let onTap: () -> Void
    let onStart: () -> Void
    let onComplete: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Today's Workout")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(DesignColors.primary600)
                        
                        Text(workout.name)
                            .font(.title2)
                            .fontWeight(.bold)
                    }
                    
                    Spacer()
                    
                    WorkoutStatusBadge(status: workout.status)
                }
                
                // Description
                if let description = workout.description {
                    Text(description)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                // Workout Stats
                HStack(spacing: 20) {
                    WorkoutStat(
                        icon: "clock",
                        label: "Duration",
                        value: "\(workout.durationMinutes) min",
                        color: DesignColors.primary500
                    )
                    
                    WorkoutStat(
                        icon: "dumbbell",
                        label: "Exercises",
                        value: "\(workout.exerciseCount)",
                        color: DesignColors.secondary500
                    )
                    
                    WorkoutStat(
                        icon: "chart.bar",
                        label: "Difficulty",
                        value: workout.difficulty,
                        color: difficultyColor(workout.difficulty)
                    )
                    
                    if let calories = workout.estimatedCalories {
                        WorkoutStat(
                            icon: "flame",
                            label: "Calories",
                            value: "\(calories)",
                            color: DesignColors.warning500
                        )
                    }
                }
                
                // Action Buttons
                HStack(spacing: 12) {
                    Button("View Details", action: onTap)
                        .buttonStyle(SecondaryButtonStyle())
                    
                    Spacer()
                    
                    switch WorkoutStatus(rawValue: workout.status) ?? .ready {
                    case .ready:
                        Button("Start Workout", action: onStart)
                            .buttonStyle(PrimaryButtonStyle())
                    case .inProgress:
                        Button("Continue", action: onTap)
                            .buttonStyle(PrimaryButtonStyle())
                    case .completed:
                        Button("View Summary", action: onTap)
                            .buttonStyle(SecondaryButtonStyle())
                    case .skipped:
                        Text("Skipped")
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .onTapGesture(perform: onTap)
    }
    
    private func difficultyColor(_ difficulty: String) -> Color {
        switch difficulty.lowercased() {
        case "easy": return DesignColors.success500
        case "medium": return DesignColors.warning500
        case "hard": return DesignColors.error500
        default: return DesignColors.gray500
        }
    }
}

// MARK: - Daily Stats Card
struct DailyStatsCard: View {
    let stats: DailyFitnessStats
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Today's Activity")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 20) {
                    StatRing(
                        title: "Steps",
                        current: stats.steps,
                        goal: stats.stepGoal,
                        color: DesignColors.primary500,
                        unit: ""
                    )
                    
                    VStack(spacing: 12) {
                        StatProgress(
                            title: "Active Minutes",
                            current: stats.activeMinutes,
                            goal: stats.activeMinutesGoal,
                            color: DesignColors.success500
                        )
                        
                        StatProgress(
                            title: "Calories Burned",
                            current: stats.caloriesBurned,
                            goal: stats.caloriesGoal,
                            color: DesignColors.warning500
                        )
                        
                        StatProgress(
                            title: "Workouts",
                            current: stats.workoutsCompleted,
                            goal: stats.workoutsGoal,
                            color: DesignColors.secondary500
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Workout Plans View
struct WorkoutPlansView: View {
    let viewModel: FitnessViewModel
    let onWorkoutTap: (WorkoutEntry) -> Void
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                if let fitnessPlans = viewModel.fitnessPlans {
                    // Current Plan Overview
                    if let currentPlan = fitnessPlans.first {
                        CurrentPlanCard(plan: currentPlan)
                    }
                    
                    // Weekly Schedule
                    WeeklyScheduleSection(
                        plans: fitnessPlans,
                        onWorkoutTap: onWorkoutTap
                    )
                    
                } else {
                    EmptyPlansView()
                }
                
                Spacer()
            }
            .padding()
        }
    }
}

// MARK: - Current Plan Card
struct CurrentPlanCard: View {
    let plan: FitnessPlan
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Current Plan")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(DesignColors.primary600)
                        
                        Text(plan.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    
                    Spacer()
                    
                    StatusBadge(status: plan.status)
                }
                
                if let description = plan.description {
                    Text(description)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                
                // Plan Progress
                HStack(spacing: 20) {
                    PlanMetric(
                        title: "Week",
                        value: "\(plan.currentWeek) of \(plan.totalWeeks)",
                        color: DesignColors.primary500
                    )
                    
                    PlanMetric(
                        title: "Completion",
                        value: "\(Int(plan.completionPercentage))%",
                        color: DesignColors.success500
                    )
                    
                    PlanMetric(
                        title: "Adherence",
                        value: "\(Int(plan.adherenceScore))%",
                        color: adherenceColor(plan.adherenceScore)
                    )
                }
                
                // Progress Bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(DesignColors.primary200)
                            .frame(height: 6)
                            .cornerRadius(3)
                        
                        Rectangle()
                            .fill(DesignColors.primary500)
                            .frame(
                                width: geometry.size.width * (plan.completionPercentage / 100),
                                height: 6
                            )
                            .cornerRadius(3)
                            .animation(.easeInOut, value: plan.completionPercentage)
                    }
                }
                .frame(height: 6)
            }
        }
    }
    
    private func adherenceColor(_ score: Double) -> Color {
        switch score {
        case 80...100: return DesignColors.success500
        case 60..<80: return DesignColors.warning500
        default: return DesignColors.error500
        }
    }
}

// MARK: - Weekly Schedule Section
struct WeeklyScheduleSection: View {
    let plans: [FitnessPlan]
    let onWorkoutTap: (WorkoutEntry) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("This Week's Schedule")
                .font(.headline)
                .fontWeight(.semibold)
            
            // Mock weekly workouts - in production would come from plan entries
            ForEach(mockWeeklyWorkouts, id: \.id) { workout in
                WeeklyWorkoutRow(workout: workout) {
                    onWorkoutTap(workout)
                }
            }
        }
    }
    
    private var mockWeeklyWorkouts: [WorkoutEntry] {
        [
            WorkoutEntry(
                id: "1",
                name: "Upper Body Strength",
                description: "Focus on chest, shoulders, and arms",
                durationMinutes: 45,
                exerciseCount: 8,
                difficulty: "Medium",
                status: "completed",
                scheduledDate: Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date(),
                estimatedCalories: 320
            ),
            WorkoutEntry(
                id: "2",
                name: "HIIT Cardio",
                description: "High-intensity interval training",
                durationMinutes: 30,
                exerciseCount: 6,
                difficulty: "Hard",
                status: "ready",
                scheduledDate: Date(),
                estimatedCalories: 280
            ),
            WorkoutEntry(
                id: "3",
                name: "Lower Body Power",
                description: "Legs and glutes workout",
                durationMinutes: 50,
                exerciseCount: 10,
                difficulty: "Medium",
                status: "ready",
                scheduledDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                estimatedCalories: 380
            )
        ]
    }
}

struct WeeklyWorkoutRow: View {
    let workout: WorkoutEntry
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(workout.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text("\(workout.durationMinutes) min • \(workout.exerciseCount) exercises")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(dateText(workout.scheduledDate))
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(DesignColors.primary600)
                    
                    WorkoutStatusBadge(status: workout.status)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func dateText(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Fitness Progress View
struct FitnessProgressView: View {
    let viewModel: FitnessViewModel
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                // Weekly Progress Summary
                if let weeklyProgress = viewModel.weeklyProgress {
                    WeeklyProgressCard(progress: weeklyProgress)
                }
                
                // Monthly Goals
                if let monthlyGoals = viewModel.monthlyGoals {
                    MonthlyGoalsCard(goals: monthlyGoals)
                }
                
                // Strength Progress
                StrengthProgressCard()
                
                // Achievement Badges
                AchievementBadgesCard()
                
                Spacer()
            }
            .padding()
        }
    }
}

// MARK: - Supporting Views

struct EmptyWorkoutView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "dumbbell")
                .font(.system(size: 60))
                .foregroundColor(DesignColors.primary300)
            
            Text("No Workout Scheduled")
                .font(.title2)
                .fontWeight(.medium)
            
            Text("Create a fitness plan to see your daily workouts")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Browse Workouts") {
                // Navigate to workout library
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}

struct EmptyPlansView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(DesignColors.primary300)
            
            Text("No Active Plan")
                .font(.title2)
                .fontWeight(.medium)
            
            Text("Start with a personalized fitness plan")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Create Plan") {
                // Navigate to plan creation
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}

struct WorkoutStatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.capitalized)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.1))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }
    
    private var statusColor: Color {
        switch status.lowercased() {
        case "ready": return DesignColors.primary500
        case "inprogress", "in_progress": return DesignColors.warning500
        case "completed": return DesignColors.success500
        case "skipped": return DesignColors.gray500
        default: return DesignColors.gray500
        }
    }
}

struct WorkoutStat: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct StatRing: View {
    let title: String
    let current: Int
    let goal: Int
    let color: Color
    let unit: String
    
    private var progress: Double {
        min(Double(current) / Double(goal), 1.0)
    }
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 8)
                    .frame(width: 80, height: 80)
                
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .frame(width: 80, height: 80)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut, value: progress)
                
                VStack(spacing: 2) {
                    Text("\(current)")
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text("\(goal)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct StatProgress: View {
    let title: String
    let current: Int
    let goal: Int
    let color: Color
    
    private var progress: Double {
        min(Double(current) / Double(goal), 1.0)
    }
    
    var body: some View {
        HStack {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(color.opacity(0.2))
                        .frame(height: 4)
                        .cornerRadius(2)
                    
                    Rectangle()
                        .fill(color)
                        .frame(width: geometry.size.width * progress, height: 4)
                        .cornerRadius(2)
                        .animation(.easeInOut, value: progress)
                }
            }
            .frame(height: 4)
            
            Text("\(current)")
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 30, alignment: .trailing)
        }
    }
}

struct PlanMetric: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct WeeklyProgressCard: View {
    let progress: WeeklyFitnessProgress
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("This Week's Progress")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 20) {
                    ProgressMetric(
                        title: "Workouts",
                        value: "\(progress.workoutsCompleted)",
                        goal: "\(progress.workoutsPlanned)",
                        color: DesignColors.primary500
                    )
                    
                    ProgressMetric(
                        title: "Minutes",
                        value: "\(progress.totalMinutes)",
                        goal: "\(progress.targetMinutes)",
                        color: DesignColors.success500
                    )
                    
                    ProgressMetric(
                        title: "Calories",
                        value: "\(progress.totalCalories)",
                        goal: "\(progress.targetCalories)",
                        color: DesignColors.warning500
                    )
                }
            }
        }
    }
}

struct MonthlyGoalsCard: View {
    let goals: MonthlyFitnessGoals
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Monthly Goals")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                ForEach(goals.goals, id: \.name) { goal in
                    GoalProgressRow(goal: goal)
                }
            }
        }
    }
}

struct GoalProgressRow: View {
    let goal: FitnessGoal
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(goal.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("\(goal.current) of \(goal.target) \(goal.unit)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            CircularProgressView(
                progress: Double(goal.current) / Double(goal.target),
                color: DesignColors.primary500
            )
            .frame(width: 40, height: 40)
        }
    }
}

struct StrengthProgressCard: View {
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Strength Progress")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("Track your strength gains over time")
                    .font(.body)
                    .foregroundColor(.secondary)
                
                Text("Coming in Phase 13 with detailed tracking")
                    .font(.caption)
                    .foregroundColor(DesignColors.primary600)
            }
        }
    }
}

struct AchievementBadgesCard: View {
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Achievement Badges")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("Earn badges for reaching fitness milestones")
                    .font(.body)
                    .foregroundColor(.secondary)
                
                Text("Coming in Phase 13 with gamification")
                    .font(.caption)
                    .foregroundColor(DesignColors.primary600)
            }
        }
    }
}

struct RecentWorkoutsSection: View {
    let workouts: [WorkoutEntry]
    let onWorkoutTap: (WorkoutEntry) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Workouts")
                .font(.headline)
                .fontWeight(.semibold)
            
            ForEach(workouts.prefix(3), id: \.id) { workout in
                RecentWorkoutRow(workout: workout) {
                    onWorkoutTap(workout)
                }
            }
        }
    }
}

struct RecentWorkoutRow: View {
    let workout: WorkoutEntry
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(workout.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text("\(workout.durationMinutes) min • \(dateText)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if let calories = workout.estimatedCalories {
                    Text("\(calories) cal")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(DesignColors.warning600)
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var dateText: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: workout.scheduledDate, relativeTo: Date())
    }
}

// MARK: - Workout Detail View
struct WorkoutDetailView: View {
    let workout: WorkoutEntry
    let viewModel: FitnessViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Workout Header
                    WorkoutDetailHeader(workout: workout)
                    
                    // Exercise List (mock data)
                    ExerciseListSection()
                    
                    // Safety Notes
                    SafetyNotesSection()
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle(workout.name)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Start") {
                        Task {
                            await viewModel.startWorkout(workout.id)
                            dismiss()
                        }
                    }
                    .foregroundColor(DesignColors.primary600)
                }
            }
        }
    }
}

struct WorkoutDetailHeader: View {
    let workout: WorkoutEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(workout.description ?? "Complete this workout to build strength and endurance")
                .font(.body)
                .foregroundColor(.secondary)
            
            HStack(spacing: 20) {
                WorkoutStat(
                    icon: "clock",
                    label: "Duration",
                    value: "\(workout.durationMinutes) min",
                    color: DesignColors.primary500
                )
                
                WorkoutStat(
                    icon: "dumbbell",
                    label: "Exercises",
                    value: "\(workout.exerciseCount)",
                    color: DesignColors.secondary500
                )
                
                WorkoutStat(
                    icon: "chart.bar",
                    label: "Difficulty",
                    value: workout.difficulty,
                    color: DesignColors.warning500
                )
                
                if let calories = workout.estimatedCalories {
                    WorkoutStat(
                        icon: "flame",
                        label: "Calories",
                        value: "\(calories)",
                        color: DesignColors.error500
                    )
                }
            }
        }
    }
}

struct ExerciseListSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Exercises")
                .font(.headline)
                .fontWeight(.semibold)
            
            // Mock exercises - in production would come from workout data
            ForEach(mockExercises, id: \.name) { exercise in
                ExerciseRow(exercise: exercise)
            }
        }
    }
    
    private var mockExercises: [MockExercise] {
        [
            MockExercise(name: "Push-ups", sets: "3 sets", reps: "12-15 reps", rest: "60s rest"),
            MockExercise(name: "Squats", sets: "3 sets", reps: "15-20 reps", rest: "45s rest"),
            MockExercise(name: "Plank", sets: "3 sets", reps: "30-45s hold", rest: "30s rest"),
            MockExercise(name: "Lunges", sets: "3 sets", reps: "10 each leg", rest: "60s rest")
        ]
    }
}

struct MockExercise {
    let name: String
    let sets: String
    let reps: String
    let rest: String
}

struct ExerciseRow: View {
    let exercise: MockExercise
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(exercise.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("\(exercise.sets) • \(exercise.reps)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(exercise.rest)
                .font(.caption)
                .foregroundColor(DesignColors.primary600)
        }
        .padding(.vertical, 8)
    }
}

struct SafetyNotesSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Safety Notes")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(alignment: .leading, spacing: 8) {
                SafetyNote(text: "Warm up for 5-10 minutes before starting")
                SafetyNote(text: "Maintain proper form throughout each exercise")
                SafetyNote(text: "Stop if you feel pain or excessive discomfort")
                SafetyNote(text: "Stay hydrated throughout your workout")
            }
        }
        .padding()
        .background(DesignColors.warning100)
        .cornerRadius(12)
    }
}

struct SafetyNote: View {
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(DesignColors.warning500)
                .font(.caption)
                .padding(.top, 2)
            
            Text(text)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    EnhancedFitnessView()
}