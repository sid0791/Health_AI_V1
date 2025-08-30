import SwiftUI

struct LogView: View {
    @State private var selectedSegment = 0
    private let segments = ["Food", "Water", "Weight", "Mood"]
    
    var body: some View {
        NavigationView {
            VStack {
                // Segment control
                Picker("Log Type", selection: $selectedSegment) {
                    ForEach(0..<segments.count, id: \.self) { index in
                        Text(segments[index]).tag(index)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content based on selected segment
                ScrollView {
                    switch selectedSegment {
                    case 0:
                        FoodLogView()
                    case 1:
                        WaterLogView()
                    case 2:
                        WeightLogView()
                    case 3:
                        MoodLogView()
                    default:
                        FoodLogView()
                    }
                }
            }
            .navigationTitle("Log")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // Add new log entry
                    }) {
                        Image(systemName: "plus")
                            .foregroundColor(DesignColors.primary500)
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct FoodLogView: View {
    var body: some View {
        LazyVStack(spacing: 16) {
            // Today's totals
            VStack(spacing: 16) {
                Text("Today's Nutrition")
                    .font(.headline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                HStack(spacing: 20) {
                    NutritionRing(
                        label: "Calories",
                        current: 1456,
                        goal: 2000,
                        color: DesignColors.primary500
                    )
                    
                    VStack(spacing: 12) {
                        MacroProgress(label: "Carbs", current: 145, goal: 200, color: DesignColors.warning400)
                        MacroProgress(label: "Protein", current: 98, goal: 120, color: DesignColors.primary400)
                        MacroProgress(label: "Fat", current: 65, goal: 80, color: DesignColors.secondary400)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(DesignRadius.lg)
            .shadow(color: DesignShadows.md, radius: 8)
            
            // Search and add food
            VStack(spacing: 12) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    
                    TextField("Search food (English/Hindi)", text: .constant(""))
                        .textFieldStyle(PlainTextFieldStyle())
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(DesignRadius.md)
                
                // Quick add buttons
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        QuickAddButton(title: "Chawal", subtitle: "1 cup") { }
                        QuickAddButton(title: "Dal", subtitle: "1 bowl") { }
                        QuickAddButton(title: "Roti", subtitle: "2 pieces") { }
                        QuickAddButton(title: "Tea", subtitle: "1 cup") { }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(DesignRadius.lg)
            .shadow(color: DesignShadows.md, radius: 8)
            
            // Recent meals
            VStack(alignment: .leading, spacing: 12) {
                Text("Recent Meals")
                    .font(.headline)
                
                ForEach(0..<3) { _ in
                    FoodLogEntry(
                        mealName: "Vegetable Pulao",
                        time: "2:30 PM",
                        calories: 320,
                        quantity: "1 plate"
                    )
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(DesignRadius.lg)
            .shadow(color: DesignShadows.md, radius: 8)
        }
        .padding()
    }
}

struct WaterLogView: View {
    @State private var glassesConsumed = 6
    private let dailyGoal = 8
    
    var body: some View {
        VStack(spacing: 24) {
            // Water progress
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .stroke(DesignColors.primary200, lineWidth: 12)
                        .frame(width: 200, height: 200)
                    
                    Circle()
                        .trim(from: 0, to: CGFloat(glassesConsumed) / CGFloat(dailyGoal))
                        .stroke(DesignColors.primary500, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                        .frame(width: 200, height: 200)
                        .rotationEffect(.degrees(-90))
                    
                    VStack {
                        Text("\(glassesConsumed)")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(DesignColors.primary500)
                        Text("of \(dailyGoal) glasses")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                HStack(spacing: 16) {
                    Button(action: {
                        if glassesConsumed > 0 {
                            glassesConsumed -= 1
                        }
                    }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.title)
                            .foregroundColor(DesignColors.secondary500)
                    }
                    .disabled(glassesConsumed == 0)
                    
                    Button(action: {
                        glassesConsumed += 1
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                            .foregroundColor(DesignColors.primary500)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(DesignRadius.lg)
            .shadow(color: DesignShadows.md, radius: 8)
        }
        .padding()
    }
}

struct WeightLogView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Weight tracking view would be implemented here")
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct MoodLogView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Mood tracking view would be implemented here")
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

// MARK: - Supporting Views

struct NutritionRing: View {
    let label: String
    let current: Int
    let goal: Int
    let color: Color
    
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

struct MacroProgress: View {
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

struct QuickAddButton: View {
    let title: String
    let subtitle: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(DesignColors.primary100)
            .cornerRadius(DesignRadius.sm)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct FoodLogEntry: View {
    let mealName: String
    let time: String
    let calories: Int
    let quantity: String
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(mealName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("\(quantity) • \(time)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("\(calories) cal")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(DesignColors.primary600)
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    LogView()
}