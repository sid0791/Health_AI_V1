import SwiftUI
import Charts

// MARK: - Enhanced Analytics View for Phase 9
struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    @State private var selectedTimeframe: Timeframe = .week
    @State private var showingDetailSheet = false
    @State private var selectedMetric: AnalyticsMetric = .weight
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Timeframe Selector
                    TimeframeSelectorCard(selectedTimeframe: $selectedTimeframe)
                        .onChange(of: selectedTimeframe) { _, newValue in
                            Task {
                                await viewModel.loadData(for: newValue)
                            }
                        }
                    
                    // Weight Trend Chart
                    WeightTrendCard(
                        weightData: viewModel.weightTrend,
                        timeframe: selectedTimeframe
                    ) {
                        selectedMetric = .weight
                        showingDetailSheet = true
                    }
                    
                    // Macro Distribution Chart
                    MacroDistributionCard(
                        macroData: viewModel.macroBreakdown,
                        timeframe: selectedTimeframe
                    ) {
                        selectedMetric = .macros
                        showingDetailSheet = true
                    }
                    
                    // Micronutrient Analysis
                    MicronutrientCard(
                        microData: viewModel.micronutrientAnalysis
                    ) {
                        selectedMetric = .micronutrients
                        showingDetailSheet = true
                    }
                    
                    // Goal Progress Cards
                    GoalProgressSection(
                        goalProgress: viewModel.goalProgress
                    )
                    
                    // Activity Overview
                    ActivityOverviewCard(
                        activityData: viewModel.activitySummary,
                        timeframe: selectedTimeframe
                    )
                    
                    // Adherence Score
                    AdherenceScoreCard(
                        adherenceData: viewModel.adherenceScore
                    )
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Analytics")
            .navigationBarTitleDisplayMode(.large)
            .background(Color(.systemGroupedBackground))
            .refreshable {
                await viewModel.refreshData(for: selectedTimeframe)
            }
        }
        .onAppear {
            Task {
                await viewModel.loadData(for: selectedTimeframe)
            }
        }
        .sheet(isPresented: $showingDetailSheet) {
            AnalyticsDetailView(metric: selectedMetric, viewModel: viewModel)
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

// MARK: - Timeframe Selector Card
struct TimeframeSelectorCard: View {
    @Binding var selectedTimeframe: Timeframe
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text("Time Period")
                    .font(.headline)
                
                HStack(spacing: 0) {
                    ForEach(Timeframe.allCases, id: \.self) { timeframe in
                        TimeframeButton(
                            timeframe: timeframe,
                            isSelected: selectedTimeframe == timeframe
                        ) {
                            selectedTimeframe = timeframe
                        }
                    }
                }
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
        }
    }
}

struct TimeframeButton: View {
    let timeframe: Timeframe
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(timeframe.displayName)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : .primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(isSelected ? DesignColors.primary500 : Color.clear)
                .cornerRadius(6)
        }
    }
}

// MARK: - Weight Trend Card
struct WeightTrendCard: View {
    let weightData: WeightTrendData?
    let timeframe: Timeframe
    let onTap: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Weight Trend")
                            .font(.headline)
                        
                        if let data = weightData {
                            Text("\(data.trend.direction.capitalized): \(String(format: "%.1f", abs(data.trend.change))) kg")
                                .font(.subheadline)
                                .foregroundColor(trendColor(data.trend.direction))
                        }
                    }
                    
                    Spacer()
                    
                    Button("Details", action: onTap)
                        .font(.caption)
                        .foregroundColor(DesignColors.primary600)
                }
                
                if let data = weightData, !data.data.isEmpty {
                    WeightChart(data: data.data, timeframe: timeframe)
                        .frame(height: 120)
                } else {
                    Text("Start tracking your weight to see trends")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(height: 120)
                        .frame(maxWidth: .infinity)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                }
            }
        }
        .onTapGesture(perform: onTap)
    }
    
    private func trendColor(_ direction: String) -> Color {
        switch direction.lowercased() {
        case "decrease": return DesignColors.success500
        case "increase": return DesignColors.warning500
        default: return DesignColors.gray500
        }
    }
}

// MARK: - Macro Distribution Card
struct MacroDistributionCard: View {
    let macroData: MacroBreakdownResponse?
    let timeframe: Timeframe
    let onTap: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Macro Distribution")
                        .font(.headline)
                    
                    Spacer()
                    
                    Button("Details", action: onTap)
                        .font(.caption)
                        .foregroundColor(DesignColors.primary600)
                }
                
                if let data = macroData {
                    HStack(spacing: 20) {
                        // Donut Chart
                        MacroDonutChart(macroPercentages: data.macroPercentages)
                            .frame(width: 80, height: 80)
                        
                        // Legend and Values
                        VStack(alignment: .leading, spacing: 8) {
                            MacroLegendItem(
                                label: "Protein",
                                percentage: data.macroPercentages.proteinPercent,
                                grams: Int(data.averageDaily.totalProtein),
                                color: DesignColors.primary400
                            )
                            
                            MacroLegendItem(
                                label: "Carbs",
                                percentage: data.macroPercentages.carbsPercent,
                                grams: Int(data.averageDaily.totalCarbs),
                                color: DesignColors.warning400
                            )
                            
                            MacroLegendItem(
                                label: "Fat",
                                percentage: data.macroPercentages.fatPercent,
                                grams: Int(data.averageDaily.totalFat),
                                color: DesignColors.secondary400
                            )
                        }
                        
                        Spacer()
                    }
                } else {
                    Text("Log some meals to see your macro distribution")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Micronutrient Card
struct MicronutrientCard: View {
    let microData: MicronutrientAnalysisResponse?
    let onTap: () -> Void
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Micronutrient Analysis")
                        .font(.headline)
                    
                    Spacer()
                    
                    if let data = microData {
                        ScoreCircle(score: data.overallScore, color: scoreColor(data.overallScore))
                    }
                    
                    Button("Details", action: onTap)
                        .font(.caption)
                        .foregroundColor(DesignColors.primary600)
                }
                
                if let data = microData {
                    LazyVStack(spacing: 8) {
                        ForEach(Array(data.deficiencies.prefix(3)), id: \.nutrient) { deficiency in
                            MicronutrientBar(deficiency: deficiency)
                        }
                    }
                    
                    if data.deficiencies.count > 3 {
                        Text("and \(data.deficiencies.count - 3) more...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                } else {
                    Text("Complete a few days of logging to see micronutrient analysis")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
        .onTapGesture(perform: onTap)
    }
    
    private func scoreColor(_ score: Int) -> Color {
        switch score {
        case 80...100: return DesignColors.success500
        case 60...79: return DesignColors.warning500
        default: return DesignColors.error500
        }
    }
}

// MARK: - Goal Progress Section
struct GoalProgressSection: View {
    let goalProgress: GoalProgressResponse?
    
    var body: some View {
        if let progress = goalProgress {
            VStack(alignment: .leading, spacing: 12) {
                Text("Goal Progress")
                    .font(.headline)
                    .padding(.horizontal)
                
                LazyVStack(spacing: 12) {
                    ForEach(progress.goals, id: \.type) { goal in
                        GoalProgressCard(goal: goal)
                    }
                }
            }
        }
    }
}

struct GoalProgressCard: View {
    let goal: GoalItem
    
    var body: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.type.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Text("\(formatValue(goal.current)) of \(formatValue(goal.target)) \(goal.unit)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if let eta = goal.eta {
                        Text("ETA: \(eta)")
                            .font(.caption)
                            .foregroundColor(DesignColors.primary600)
                    }
                }
                
                Spacer()
                
                CircularProgressView(progress: Double(goal.progress) / 100.0, color: statusColor(goal.status))
                    .frame(width: 50, height: 50)
            }
        }
    }
    
    private func formatValue(_ value: Double) -> String {
        if value == floor(value) {
            return String(format: "%.0f", value)
        } else {
            return String(format: "%.1f", value)
        }
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status {
        case "achieved": return DesignColors.success500
        case "on_track": return DesignColors.primary500
        default: return DesignColors.warning500
        }
    }
}

// MARK: - Activity Overview Card
struct ActivityOverviewCard: View {
    let activityData: ActivitySummaryResponse?
    let timeframe: Timeframe
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Activity Overview")
                    .font(.headline)
                
                if let data = activityData {
                    VStack(spacing: 12) {
                        HStack(spacing: 20) {
                            ActivityMetric(
                                title: "Avg Steps",
                                value: "\(data.averages.dailySteps)",
                                icon: "figure.walk",
                                color: DesignColors.primary500
                            )
                            
                            ActivityMetric(
                                title: "Avg Calories",
                                value: "\(data.averages.dailyCalories)",
                                icon: "flame.fill",
                                color: DesignColors.warning500
                            )
                            
                            ActivityMetric(
                                title: "Workouts",
                                value: "\(data.totals.workouts)",
                                icon: "dumbbell.fill",
                                color: DesignColors.secondary500
                            )
                        }
                        
                        // Activity Chart
                        if !data.dailyData.isEmpty {
                            ActivityChart(data: data.dailyData, timeframe: timeframe)
                                .frame(height: 100)
                        }
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

// MARK: - Adherence Score Card
struct AdherenceScoreCard: View {
    let adherenceData: AdherenceResponse?
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                Text("Meal Plan Adherence")
                    .font(.headline)
                
                if let data = adherenceData {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(data.score)%")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .foregroundColor(adherenceColor(data.score))
                            
                            Text("This \(data.period)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("\(data.breakdown.loggedMeals) logged")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text("\(data.breakdown.plannedMeals) planned")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    if !data.recommendations.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Suggestions:")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            Text(data.recommendations.first ?? "")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } else {
                    Text("Start following a meal plan to see adherence")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    private func adherenceColor(_ score: Int) -> Color {
        switch score {
        case 80...100: return DesignColors.success500
        case 60...79: return DesignColors.warning500
        default: return DesignColors.error500
        }
    }
}

// MARK: - Supporting Views and Charts

struct WeightChart: View {
    let data: [WeightDataPoint]
    let timeframe: Timeframe
    
    var body: some View {
        Chart {
            ForEach(data, id: \.date) { point in
                LineMark(
                    x: .value("Date", dateFromString(point.date)),
                    y: .value("Weight", point.weight)
                )
                .foregroundStyle(DesignColors.primary500)
                .lineStyle(StrokeStyle(lineWidth: 2))
                
                AreaMark(
                    x: .value("Date", dateFromString(point.date)),
                    y: .value("Weight", point.weight)
                )
                .foregroundStyle(
                    LinearGradient(
                        colors: [DesignColors.primary500.opacity(0.3), DesignColors.primary500.opacity(0.1)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                AxisTick()
                AxisValueLabel(format: .dateTime.month(.abbreviated).day())
            }
        }
        .chartYAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                AxisTick()
                AxisValueLabel()
            }
        }
    }
    
    private func dateFromString(_ dateString: String) -> Date {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString) ?? Date()
    }
}

struct MacroDonutChart: View {
    let macroPercentages: MacroPercentages
    
    var body: some View {
        ZStack {
            // Protein
            Circle()
                .trim(from: 0, to: CGFloat(macroPercentages.proteinPercent) / 100)
                .stroke(DesignColors.primary400, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            
            // Carbs
            Circle()
                .trim(
                    from: CGFloat(macroPercentages.proteinPercent) / 100,
                    to: CGFloat(macroPercentages.proteinPercent + macroPercentages.carbsPercent) / 100
                )
                .stroke(DesignColors.warning400, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            
            // Fat
            Circle()
                .trim(
                    from: CGFloat(macroPercentages.proteinPercent + macroPercentages.carbsPercent) / 100,
                    to: 1.0
                )
                .stroke(DesignColors.secondary400, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

struct MacroLegendItem: View {
    let label: String
    let percentage: Int
    let grams: Int
    let color: Color
    
    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            
            Text(label)
                .font(.caption)
                .frame(width: 40, alignment: .leading)
            
            Text("\(percentage)%")
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 30, alignment: .leading)
            
            Text("\(grams)g")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct MicronutrientBar: View {
    let deficiency: MicronutrientDeficiency
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(deficiency.nutrient)
                    .font(.caption)
                    .fontWeight(.medium)
                
                Text("\(String(format: "%.1f", deficiency.currentIntake))/\(String(format: "%.1f", deficiency.recommendedIntake)) \(deficiency.unit)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color(.systemGray5))
                        .frame(height: 4)
                        .cornerRadius(2)
                    
                    Rectangle()
                        .fill(statusColor(deficiency.status))
                        .frame(
                            width: geometry.size.width * (deficiency.currentIntake / deficiency.recommendedIntake),
                            height: 4
                        )
                        .cornerRadius(2)
                }
            }
            .frame(width: 60, height: 4)
            
            Text("\(100 - deficiency.deficiency)%")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(statusColor(deficiency.status))
                .frame(width: 30, alignment: .trailing)
        }
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status {
        case "adequate": return DesignColors.success500
        case "borderline": return DesignColors.warning500
        default: return DesignColors.error500
        }
    }
}

struct ActivityChart: View {
    let data: [DailyActivityData]
    let timeframe: Timeframe
    
    var body: some View {
        Chart {
            ForEach(data, id: \.date) { point in
                BarMark(
                    x: .value("Date", dateFromString(point.date)),
                    y: .value("Steps", point.steps)
                )
                .foregroundStyle(DesignColors.primary500)
                .cornerRadius(2)
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisValueLabel(format: .dateTime.weekday(.abbreviated))
            }
        }
        .chartYAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                AxisValueLabel()
            }
        }
    }
    
    private func dateFromString(_ dateString: String) -> Date {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: dateString) ?? Date()
    }
}

struct CircularProgressView: View {
    let progress: Double
    let color: Color
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 4)
            
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut, value: progress)
            
            Text("\(Int(progress * 100))%")
                .font(.caption2)
                .fontWeight(.medium)
        }
    }
}

struct ScoreCircle: View {
    let score: Int
    let color: Color
    
    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.1))
                .frame(width: 40, height: 40)
            
            Text("\(score)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
    }
}

// MARK: - Supporting Types

enum Timeframe: CaseIterable {
    case week, month, quarter, year
    
    var displayName: String {
        switch self {
        case .week: return "Week"
        case .month: return "Month"
        case .quarter: return "3 Months"
        case .year: return "Year"
        }
    }
    
    var days: Int {
        switch self {
        case .week: return 7
        case .month: return 30
        case .quarter: return 90
        case .year: return 365
        }
    }
}

enum AnalyticsMetric {
    case weight, macros, micronutrients, activity, adherence
}

// MARK: - Analytics Detail View
struct AnalyticsDetailView: View {
    let metric: AnalyticsMetric
    let viewModel: AnalyticsViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    switch metric {
                    case .weight:
                        WeightDetailView(viewModel: viewModel)
                    case .macros:
                        MacroDetailView(viewModel: viewModel)
                    case .micronutrients:
                        MicronutrientDetailView(viewModel: viewModel)
                    case .activity:
                        ActivityDetailView(viewModel: viewModel)
                    case .adherence:
                        AdherenceDetailView(viewModel: viewModel)
                    }
                }
                .padding()
            }
            .navigationTitle(metricTitle)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var metricTitle: String {
        switch metric {
        case .weight: return "Weight Analysis"
        case .macros: return "Macro Analysis"
        case .micronutrients: return "Micronutrients"
        case .activity: return "Activity Analysis"
        case .adherence: return "Adherence Analysis"
        }
    }
}

// Detail view implementations would go here...
struct WeightDetailView: View {
    let viewModel: AnalyticsViewModel
    var body: some View { Text("Weight Detail View - Coming Soon") }
}

struct MacroDetailView: View {
    let viewModel: AnalyticsViewModel
    var body: some View { Text("Macro Detail View - Coming Soon") }
}

struct MicronutrientDetailView: View {
    let viewModel: AnalyticsViewModel
    var body: some View { Text("Micronutrient Detail View - Coming Soon") }
}

struct ActivityDetailView: View {
    let viewModel: AnalyticsViewModel
    var body: some View { Text("Activity Detail View - Coming Soon") }
}

struct AdherenceDetailView: View {
    let viewModel: AnalyticsViewModel
    var body: some View { Text("Adherence Detail View - Coming Soon") }
}

#Preview {
    AnalyticsView()
}