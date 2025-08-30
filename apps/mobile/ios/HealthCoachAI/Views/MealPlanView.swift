import SwiftUI

struct MealPlanView: View {
    @State private var selectedDay = 0
    private let days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    var body: some View {
        NavigationView {
            VStack {
                // Day selector
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(0..<days.count, id: \.self) { index in
                            DayButton(
                                day: days[index],
                                isSelected: selectedDay == index
                            ) {
                                selectedDay = index
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 8)
                
                // Meal cards
                ScrollView {
                    LazyVStack(spacing: 16) {
                        MealCard(
                            mealType: "Breakfast",
                            title: "Oatmeal with Berries",
                            description: "Steel-cut oats with fresh blueberries and almonds",
                            calories: 350,
                            prepTime: "10 min",
                            difficulty: "Easy",
                            macros: (carbs: 45, protein: 12, fat: 15)
                        )
                        
                        MealCard(
                            mealType: "Lunch",
                            title: "Quinoa Buddha Bowl",
                            description: "Quinoa with roasted vegetables and tahini dressing",
                            calories: 480,
                            prepTime: "25 min",
                            difficulty: "Medium",
                            macros: (carbs: 58, protein: 18, fat: 22)
                        )
                        
                        MealCard(
                            mealType: "Snack",
                            title: "Greek Yogurt & Nuts",
                            description: "Plain Greek yogurt with mixed nuts and honey",
                            calories: 220,
                            prepTime: "2 min",
                            difficulty: "Easy",
                            macros: (carbs: 15, protein: 15, fat: 12)
                        )
                        
                        MealCard(
                            mealType: "Dinner",
                            title: "Grilled Salmon",
                            description: "Herb-crusted salmon with roasted sweet potato",
                            calories: 550,
                            prepTime: "30 min",
                            difficulty: "Medium",
                            macros: (carbs: 35, protein: 40, fat: 25)
                        )
                    }
                    .padding()
                }
            }
            .navigationTitle("7-Day Meal Plan")
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct DayButton: View {
    let day: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(day)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : DesignColors.primary500)
                .frame(width: 44, height: 44) // WCAG AA minimum tap target
                .background(isSelected ? DesignColors.primary500 : DesignColors.primary100)
                .clipShape(Circle())
        }
        .animation(.easeInOut(duration: DesignAccessibility.animationFast), value: isSelected)
    }
}

struct MealCard: View {
    let mealType: String
    let title: String
    let description: String
    let calories: Int
    let prepTime: String
    let difficulty: String
    let macros: (carbs: Int, protein: Int, fat: Int)
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(mealType.uppercased())
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(DesignColors.primary600)
                    
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                Button(action: {
                    // Swap meal action
                }) {
                    Image(systemName: "arrow.2.squarepath")
                        .foregroundColor(DesignColors.secondary500)
                        .font(.title3)
                        .frame(width: 44, height: 44) // WCAG AA minimum
                }
            }
            
            // Description
            Text(description)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            // Nutrition info
            HStack {
                NutritionChip(label: "\(calories) cal", color: DesignColors.primary500)
                NutritionChip(label: prepTime, color: DesignColors.secondary500)
                NutritionChip(label: difficulty, color: DesignColors.success500)
                
                Spacer()
                
                Button("Details") {
                    // Show meal details
                }
                .font(.caption)
                .foregroundColor(DesignColors.primary600)
            }
            
            // Macro bars
            VStack(spacing: 6) {
                HStack {
                    Text("Macros")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                
                HStack(spacing: 12) {
                    MacroBar(label: "Carbs", value: macros.carbs, color: DesignColors.warning400)
                    MacroBar(label: "Protein", value: macros.protein, color: DesignColors.primary400)
                    MacroBar(label: "Fat", value: macros.fat, color: DesignColors.secondary400)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(DesignRadius.lg)
        .shadow(color: DesignShadows.md, radius: 8)
    }
}

struct NutritionChip: View {
    let label: String
    let color: Color
    
    var body: some View {
        Text(label)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .cornerRadius(DesignRadius.sm)
    }
}

struct MacroBar: View {
    let label: String
    let value: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            
            Text("\(value)g")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    MealPlanView()
}