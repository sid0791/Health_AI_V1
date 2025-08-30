import SwiftUI

// MARK: - Enhanced Meal Plan View for Phase 9
struct EnhancedMealPlanView: View {
    @StateObject private var viewModel = MealPlanViewModel()
    @State private var selectedDay = 0
    @State private var showingMealDetail = false
    @State private var selectedMeal: MealPlanEntry?
    @State private var showingShoppingList = false
    @State private var showingSwapOptions = false
    
    private let days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    var body: some View {
        NavigationView {
            VStack {
                if viewModel.isLoading {
                    ProgressView("Loading meal plan...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let mealPlan = viewModel.currentWeekPlan {
                    // Plan Header
                    PlanHeaderCard(mealPlan: mealPlan) {
                        showingShoppingList = true
                    }
                    
                    // Day Selector
                    DaySelector(
                        selectedDay: $selectedDay,
                        days: days,
                        mealPlan: mealPlan
                    )
                    
                    // Meals for Selected Day
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(mealsForSelectedDay(mealPlan), id: \.id) { meal in
                                EnhancedMealCard(
                                    meal: meal,
                                    onTap: {
                                        selectedMeal = meal
                                        showingMealDetail = true
                                    },
                                    onSwap: {
                                        selectedMeal = meal
                                        showingSwapOptions = true
                                    },
                                    onComplete: {
                                        Task {
                                            await viewModel.markMealCompleted(meal.id)
                                        }
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                } else {
                    EmptyPlanView {
                        Task {
                            await viewModel.loadCurrentWeekPlan()
                        }
                    }
                }
            }
            .navigationTitle("7-Day Meal Plan")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Shopping List") {
                        showingShoppingList = true
                    }
                    .foregroundColor(DesignColors.primary600)
                }
            }
            .background(Color(.systemGroupedBackground))
            .refreshable {
                await viewModel.refreshData()
            }
        }
        .onAppear {
            Task {
                await viewModel.loadCurrentWeekPlan()
                selectCurrentDay()
            }
        }
        .sheet(isPresented: $showingMealDetail) {
            if let meal = selectedMeal {
                MealDetailView(meal: meal, viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showingShoppingList) {
            if let mealPlan = viewModel.currentWeekPlan {
                ShoppingListView(mealPlan: mealPlan, viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showingSwapOptions) {
            if let meal = selectedMeal {
                MealSwapView(meal: meal, viewModel: viewModel)
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
    
    private func mealsForSelectedDay(_ mealPlan: MealPlan) -> [MealPlanEntry] {
        return mealPlan.entries.filter { $0.dayNumber == selectedDay + 1 }
            .sorted { $0.mealType.sortOrder < $1.mealType.sortOrder }
    }
    
    private func selectCurrentDay() {
        let today = Calendar.current.component(.weekday, from: Date())
        // Convert to 0-based index (Monday = 0)
        selectedDay = (today + 5) % 7
    }
}

// MARK: - Plan Header Card
struct PlanHeaderCard: View {
    let mealPlan: MealPlan
    let onShoppingList: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(mealPlan.name)
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Text(mealPlan.description ?? "Your personalized meal plan")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    StatusBadge(status: mealPlan.status)
                }
                
                // Progress Overview
                HStack(spacing: 20) {
                    ProgressMetric(
                        title: "Days Left",
                        value: "\(max(mealPlan.getDaysRemaining(), 0))",
                        color: DesignColors.primary500
                    )
                    
                    ProgressMetric(
                        title: "Adherence",
                        value: "\(Int(mealPlan.adherenceScore))%",
                        color: adherenceColor(mealPlan.adherenceScore)
                    )
                    
                    ProgressMetric(
                        title: "Progress",
                        value: "\(Int(mealPlan.getProgressPercentage()))%",
                        color: DesignColors.success500
                    )
                }
                
                // Daily Nutrition Targets
                VStack(alignment: .leading, spacing: 8) {
                    Text("Daily Targets")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    HStack(spacing: 16) {
                        NutritionTarget(
                            label: "Calories",
                            value: "\(mealPlan.targetCaloriesPerDay)",
                            unit: "kcal",
                            color: DesignColors.primary500
                        )
                        
                        NutritionTarget(
                            label: "Protein",
                            value: "\(Int(mealPlan.targetProteinGrams))",
                            unit: "g",
                            color: DesignColors.primary400
                        )
                        
                        NutritionTarget(
                            label: "Carbs",
                            value: "\(Int(mealPlan.targetCarbGrams))",
                            unit: "g",
                            color: DesignColors.warning400
                        )
                        
                        NutritionTarget(
                            label: "Fat",
                            value: "\(Int(mealPlan.targetFatGrams))",
                            unit: "g",
                            color: DesignColors.secondary400
                        )
                    }
                }
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

// MARK: - Day Selector
struct DaySelector: View {
    @Binding var selectedDay: Int
    let days: [String]
    let mealPlan: MealPlan
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(0..<days.count, id: \.self) { index in
                    DayButton(
                        day: days[index],
                        dayNumber: index + 1,
                        isSelected: selectedDay == index,
                        completion: dayCompletion(for: index + 1),
                        isToday: isToday(index)
                    ) {
                        selectedDay = index
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }
    
    private func dayCompletion(for dayNumber: Int) -> Double {
        let dayMeals = mealPlan.entries.filter { $0.dayNumber == dayNumber }
        guard !dayMeals.isEmpty else { return 0 }
        
        let completedMeals = dayMeals.filter { $0.isCompleted() }.count
        return Double(completedMeals) / Double(dayMeals.count)
    }
    
    private func isToday(_ index: Int) -> Bool {
        let today = Calendar.current.component(.weekday, from: Date())
        let mondayBasedIndex = (today + 5) % 7
        return index == mondayBasedIndex
    }
}

struct DayButton: View {
    let day: String
    let dayNumber: Int
    let isSelected: Bool
    let completion: Double
    let isToday: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(isSelected ? DesignColors.primary500 : Color(.systemGray5))
                        .frame(width: 44, height: 44)
                    
                    // Completion ring
                    if completion > 0 {
                        Circle()
                            .trim(from: 0, to: completion)
                            .stroke(
                                DesignColors.success500,
                                style: StrokeStyle(lineWidth: 3, lineCap: .round)
                            )
                            .frame(width: 50, height: 50)
                            .rotationEffect(.degrees(-90))
                    }
                    
                    Text("\(dayNumber)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(isSelected ? .white : .primary)
                }
                
                Text(day)
                    .font(.caption2)
                    .fontWeight(isToday ? .semibold : .regular)
                    .foregroundColor(isToday ? DesignColors.primary600 : .secondary)
            }
        }
        .buttonStyle(PlainButtonStyle())
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

// MARK: - Enhanced Meal Card
struct EnhancedMealCard: View {
    let meal: MealPlanEntry
    let onTap: () -> Void
    let onSwap: () -> Void
    let onComplete: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(meal.mealType.emoji)
                            Text(meal.mealType.displayName.uppercased())
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(DesignColors.primary600)
                        }
                        
                        Text(meal.mealName)
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 12) {
                        // Swap Button
                        Button(action: onSwap) {
                            Image(systemName: "arrow.2.squarepath")
                                .foregroundColor(DesignColors.secondary500)
                                .font(.title3)
                                .frame(width: 44, height: 44)
                        }
                        
                        // Completion Status
                        CompletionButton(
                            isCompleted: meal.isCompleted(),
                            onComplete: onComplete
                        )
                    }
                }
                
                // Description
                if let description = meal.mealDescription {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                // Meal Info Tags
                HStack {
                    InfoChip(
                        icon: "clock",
                        text: meal.plannedTime ?? "Anytime",
                        color: DesignColors.primary500
                    )
                    
                    if let prepTime = meal.prepTimeMinutes {
                        InfoChip(
                            icon: "timer",
                            text: "\(prepTime) min prep",
                            color: DesignColors.secondary500
                        )
                    }
                    
                    InfoChip(
                        icon: "flame",
                        text: "\(Int(meal.calories)) cal",
                        color: DesignColors.warning500
                    )
                    
                    Spacer()
                }
                
                // Macro Bars
                MacroDistributionBars(
                    protein: meal.proteinGrams,
                    carbs: meal.carbsGrams,
                    fat: meal.fatGrams,
                    calories: meal.calories
                )
                
                // Action Buttons
                HStack {
                    Button("View Details", action: onTap)
                        .buttonStyle(SecondaryButtonStyle())
                    
                    Spacer()
                    
                    if let recipe = meal.recipe {
                        Button("Recipe") {
                            // Navigate to recipe details
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                }
            }
        }
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Supporting Views

struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.1))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }
    
    private var statusColor: Color {
        switch status.lowercased() {
        case "active": return DesignColors.success500
        case "paused": return DesignColors.warning500
        case "completed": return DesignColors.primary500
        default: return DesignColors.gray500
        }
    }
}

struct ProgressMetric: View {
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

struct NutritionTarget: View {
    let label: String
    let value: String
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(color)
                
                Text(unit)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct CompletionButton: View {
    let isCompleted: Bool
    let onComplete: () -> Void
    
    var body: some View {
        Button(action: onComplete) {
            Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isCompleted ? DesignColors.success500 : DesignColors.gray400)
                .font(.title2)
                .frame(width: 44, height: 44)
        }
        .disabled(isCompleted)
    }
}

struct InfoChip: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            
            Text(text)
                .font(.caption2)
        }
        .foregroundColor(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.1))
        .cornerRadius(DesignRadius.sm)
    }
}

struct MacroDistributionBars: View {
    let protein: Double
    let carbs: Double
    let fat: Double
    let calories: Double
    
    private var macroPercentages: (protein: Double, carbs: Double, fat: Double) {
        let proteinCals = protein * 4
        let carbsCals = carbs * 4
        let fatCals = fat * 9
        let totalCals = max(calories, 1) // Avoid division by zero
        
        return (
            protein: (proteinCals / totalCals) * 100,
            carbs: (carbsCals / totalCals) * 100,
            fat: (fatCals / totalCals) * 100
        )
    }
    
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Macros")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                HStack(spacing: 12) {
                    MacroLegend(label: "P", value: Int(protein), color: DesignColors.primary400)
                    MacroLegend(label: "C", value: Int(carbs), color: DesignColors.warning400)
                    MacroLegend(label: "F", value: Int(fat), color: DesignColors.secondary400)
                }
            }
            
            // Stacked bar
            GeometryReader { geometry in
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(DesignColors.primary400)
                        .frame(width: geometry.size.width * (macroPercentages.protein / 100))
                    
                    Rectangle()
                        .fill(DesignColors.warning400)
                        .frame(width: geometry.size.width * (macroPercentages.carbs / 100))
                    
                    Rectangle()
                        .fill(DesignColors.secondary400)
                        .frame(width: geometry.size.width * (macroPercentages.fat / 100))
                    
                    Spacer()
                }
                .frame(height: 6)
                .cornerRadius(3)
            }
            .frame(height: 6)
        }
    }
}

struct MacroLegend: View {
    let label: String
    let value: Int
    let color: Color
    
    var body: some View {
        HStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            
            Text("\(value)g")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(color)
        }
    }
}

struct EmptyPlanView: View {
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(DesignColors.primary300)
            
            Text("No Active Meal Plan")
                .font(.title2)
                .fontWeight(.medium)
            
            Text("Create a meal plan to see your weekly meals here")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Create Meal Plan", action: onRetry)
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(.systemGray6))
            .foregroundColor(.primary)
            .cornerRadius(6)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

// MARK: - Extensions

extension String {
    var mealTypeFromString: MealType {
        switch self.lowercased() {
        case "breakfast": return .breakfast
        case "lunch": return .lunch
        case "dinner": return .dinner
        case "snack": return .snack
        default: return .breakfast
        }
    }
}

extension MealType {
    var emoji: String {
        switch self {
        case .breakfast: return "🌅"
        case .lunch: return "☀️"
        case .dinner: return "🌙"
        case .snack: return "🍎"
        }
    }
    
    var sortOrder: Int {
        switch self {
        case .breakfast: return 0
        case .snack: return 1
        case .lunch: return 2
        case .dinner: return 3
        }
    }
}

#Preview {
    EnhancedMealPlanView()
}