import SwiftUI

// MARK: - Enhanced Dashboard View for Phase 9
struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showingNutritionDetail = false
    @State private var showingMealLog = false
    @State private var showingWeightUpdate = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Greeting Section with Dynamic Content
                    GreetingCard(dashboardData: viewModel.dashboardData)
                    
                    // Today's Nutrition Summary
                    TodayNutritionCard(
                        nutritionData: viewModel.todayNutrition,
                        onTap: { showingNutritionDetail = true }
                    )
                    
                    // Today's Meals Progress
                    TodayMealsCard(
                        mealsData: viewModel.todayMeals,
                        onLogMeal: { showingMealLog = true }
                    )
                    
                    // Quick Actions
                    QuickActionsSection(
                        onLogMeal: { showingMealLog = true },
                        onUpdateWeight: { showingWeightUpdate = true },
                        onChat: { /* Navigate to chat */ }
                    )
                    
                    // Activity Widget with Real Data
                    ActivityCard(activityData: viewModel.activityData)
                    
                    // Weekly Progress Summary
                    WeeklyProgressCard(progressData: viewModel.weeklyProgress)
                    
                    // Health Insights & Nudges
                    InsightsCard(insights: viewModel.insights)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Good \(timeOfDay)!")
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
        .sheet(isPresented: $showingNutritionDetail) {
            NutritionDetailView()
        }
        .sheet(isPresented: $showingMealLog) {
            MealLogView()
        }
        .sheet(isPresented: $showingWeightUpdate) {
            WeightUpdateView()
        }
    }
    
    private var timeOfDay: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Morning"
        case 12..<18: return "Afternoon"
        default: return "Evening"
        }
    }
}

// MARK: - Enhanced Greeting Card
struct GreetingCard: View {
    let dashboardData: DashboardData?
    
    var body: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text("How are you feeling today?")
                        .font(.title2)
                        .fontWeight(.medium)
                    
                    if let data = dashboardData {
                        Text("\(data.mealsToday) meals logged • \(data.caloriesConsumed) calories")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Let's start logging your day!")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Dynamic Avatar
                ProfileAvatar(moodLevel: dashboardData?.moodLevel ?? 3)
            }
        }
    }
}

// MARK: - Today's Nutrition Card
struct TodayNutritionCard: View {
    let nutritionData: TodayNutrition?
    let onTap: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Today's Nutrition")
                        .font(.headline)
                    
                    Spacer()
                    
                    Button("Details", action: onTap)
                        .font(.caption)
                        .foregroundColor(DesignColors.primary600)
                }
                
                if let nutrition = nutritionData {
                    HStack(spacing: 20) {
                        // Calories Ring
                        NutritionRing(
                            label: "Calories",
                            current: nutrition.calories,
                            goal: nutrition.calorieTarget,
                            color: DesignColors.primary500,
                            size: 80
                        )
                        
                        // Macro Bars
                        VStack(spacing: 12) {
                            MacroProgressBar(
                                label: "Protein",
                                current: nutrition.protein,
                                goal: nutrition.proteinTarget,
                                color: DesignColors.primary400
                            )
                            MacroProgressBar(
                                label: "Carbs",
                                current: nutrition.carbs,
                                goal: nutrition.carbTarget,
                                color: DesignColors.warning400
                            )
                            MacroProgressBar(
                                label: "Fat",
                                current: nutrition.fat,
                                goal: nutrition.fatTarget,
                                color: DesignColors.secondary400
                            )
                        }
                    }
                } else {
                    Text("Start logging meals to see your nutrition progress")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Today's Meals Card
struct TodayMealsCard: View {
    let mealsData: TodayMeals?
    let onLogMeal: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Today's Meals")
                        .font(.headline)
                    
                    Spacer()
                    
                    if let meals = mealsData {
                        Text("\(meals.completed) of \(meals.total)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let meals = mealsData, !meals.meals.isEmpty {
                    LazyVStack(spacing: 8) {
                        ForEach(meals.meals, id: \.id) { meal in
                            TodayMealRow(meal: meal)
                        }
                    }
                    
                    // Progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(DesignColors.primary200)
                                .frame(height: 4)
                                .cornerRadius(2)
                            
                            Rectangle()
                                .fill(DesignColors.primary500)
                                .frame(
                                    width: geometry.size.width * (Double(meals.completed) / Double(meals.total)),
                                    height: 4
                                )
                                .cornerRadius(2)
                                .animation(.easeInOut, value: meals.completed)
                        }
                    }
                    .frame(height: 4)
                } else {
                    VStack(spacing: 16) {
                        Text("No meals planned for today")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Button("Log Your First Meal", action: onLogMeal)
                            .buttonStyle(PrimaryButtonStyle())
                    }
                }
            }
        }
    }
}

// MARK: - Enhanced Quick Actions
struct QuickActionsSection: View {
    let onLogMeal: () -> Void
    let onUpdateWeight: () -> Void
    let onChat: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .padding(.horizontal)
            
            HStack(spacing: 16) {
                QuickActionButton(
                    title: "Log Meal",
                    iconName: "plus.circle.fill",
                    color: DesignColors.success500,
                    action: onLogMeal
                )
                
                QuickActionButton(
                    title: "Update Weight",
                    iconName: "scalemass.fill",
                    color: DesignColors.primary500,
                    action: onUpdateWeight
                )
                
                QuickActionButton(
                    title: "AI Coach",
                    iconName: "message.fill",
                    color: DesignColors.secondary500,
                    action: onChat
                )
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Activity Card
struct ActivityCard: View {
    let activityData: ActivityData?
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Today's Activity")
                        .font(.headline)
                    
                    Spacer()
                    
                    Image(systemName: "figure.walk")
                        .foregroundColor(DesignColors.primary500)
                        .font(.title2)
                }
                
                if let activity = activityData {
                    HStack(spacing: 20) {
                        ActivityMetric(
                            title: "Steps",
                            value: "\(activity.steps)",
                            icon: "figure.walk",
                            color: DesignColors.primary500
                        )
                        
                        ActivityMetric(
                            title: "Calories",
                            value: "\(activity.caloriesBurned)",
                            icon: "flame.fill",
                            color: DesignColors.warning500
                        )
                        
                        ActivityMetric(
                            title: "Active",
                            value: "\(activity.activeMinutes)m",
                            icon: "heart.fill",
                            color: DesignColors.error500
                        )
                    }
                } else {
                    Text("Connect your fitness tracker to see activity data")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

// MARK: - Weekly Progress Card
struct WeeklyProgressCard: View {
    let progressData: WeeklyProgress?
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("This Week's Progress")
                    .font(.headline)
                
                if let progress = progressData {
                    HStack(spacing: 20) {
                        ProgressCircle(
                            title: "Adherence",
                            percentage: progress.adherenceScore,
                            color: DesignColors.success500
                        )
                        
                        VStack(alignment: .leading, spacing: 8) {
                            ProgressStat(
                                label: "Meals logged",
                                value: "\(progress.mealsLogged)",
                                target: "\(progress.plannedMeals)"
                            )
                            
                            ProgressStat(
                                label: "Avg calories",
                                value: "\(progress.averageCalories)",
                                target: "\(progress.targetCalories)"
                            )
                            
                            ProgressStat(
                                label: "Workouts",
                                value: "\(progress.workouts)",
                                target: "\(progress.targetWorkouts)"
                            )
                        }
                    }
                } else {
                    Text("Complete a few days to see your progress")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

// MARK: - Insights Card
struct InsightsCard: View {
    let insights: [String]
    
    var body: some View {
        if !insights.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "lightbulb.fill")
                            .foregroundColor(DesignColors.warning500)
                        
                        Text("Insights & Tips")
                            .font(.headline)
                    }
                    
                    ForEach(insights, id: \.self) { insight in
                        HStack(alignment: .top, spacing: 8) {
                            Circle()
                                .fill(DesignColors.primary500)
                                .frame(width: 4, height: 4)
                                .padding(.top, 6)
                            
                            Text(insight)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Supporting Views
struct Card<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        VStack {
            content
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(DesignRadius.lg)
        .shadow(color: DesignShadows.md, radius: 8)
    }
}

struct ProfileAvatar: View {
    let moodLevel: Int
    
    var body: some View {
        Circle()
            .fill(DesignColors.primary500)
            .frame(width: 50, height: 50)
            .overlay {
                Text(moodEmoji)
                    .font(.title2)
            }
    }
    
    private var moodEmoji: String {
        switch moodLevel {
        case 1...2: return "😔"
        case 3: return "😐"
        case 4: return "🙂"
        case 5: return "😊"
        default: return "🙂"
        }
    }
}

struct NutritionRing: View {
    let label: String
    let current: Int
    let goal: Int
    let color: Color
    let size: CGFloat
    
    private var progress: Double {
        min(Double(current) / Double(goal), 1.0)
    }
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 8)
                    .frame(width: size, height: size)
                
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .frame(width: size, height: size)
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
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct MacroProgressBar: View {
    let label: String
    let current: Int
    let goal: Int
    let color: Color
    
    private var progress: Double {
        min(Double(current) / Double(goal), 1.0)
    }
    
    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 50, alignment: .leading)
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(color.opacity(0.2))
                        .frame(height: 6)
                        .cornerRadius(3)
                    
                    Rectangle()
                        .fill(color)
                        .frame(width: geometry.size.width * progress, height: 6)
                        .cornerRadius(3)
                        .animation(.easeInOut, value: progress)
                }
            }
            .frame(height: 6)
            
            Text("\(current)g")
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 30, alignment: .trailing)
        }
    }
}

struct TodayMealRow: View {
    let meal: TodayMeal
    
    var body: some View {
        HStack {
            Circle()
                .fill(meal.isCompleted ? DesignColors.success500 : DesignColors.gray300)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(meal.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .strikethrough(meal.isCompleted, color: .secondary)
                
                Text("\(meal.mealType) • \(meal.calories) cal")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if let time = meal.plannedTime {
                Text(time)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct ActivityMetric: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title3)
            
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
            
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct ProgressCircle: View {
    let title: String
    let percentage: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 6)
                    .frame(width: 50, height: 50)
                
                Circle()
                    .trim(from: 0, to: Double(percentage) / 100.0)
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 50, height: 50)
                    .rotationEffect(.degrees(-90))
                
                Text("\(percentage)%")
                    .font(.caption2)
                    .fontWeight(.semibold)
            }
            
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

struct ProgressStat: View {
    let label: String
    let value: String
    let target: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text("\(value)/\(target)")
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let iconName: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: iconName)
                    .font(.title2)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(DesignColors.primary500)
            .foregroundColor(.white)
            .cornerRadius(8)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

#Preview {
    DashboardView()
}