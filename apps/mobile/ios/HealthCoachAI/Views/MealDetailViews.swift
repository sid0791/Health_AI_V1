import SwiftUI

// MARK: - Meal Detail View
struct MealDetailView: View {
    let meal: MealPlanEntry
    let viewModel: MealPlanViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPortion: Double = 1.0
    @State private var showingRecipeInstructions = false
    @State private var satisfactionRating: Int?
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 24) {
                    // Meal Header
                    MealHeaderSection(meal: meal)
                    
                    // Recipe Image (if available)
                    if let recipe = meal.recipe, let imageUrl = recipe.imageUrl {
                        RecipeImageSection(imageUrl: imageUrl)
                    }
                    
                    // Nutrition Info
                    NutritionInfoSection(meal: meal, portionMultiplier: selectedPortion)
                    
                    // Portion Selector
                    PortionSelectorSection(
                        selectedPortion: $selectedPortion,
                        originalPortion: meal.portionSize
                    ) {
                        Task {
                            await viewModel.updatePortionSize(meal.id, portionSize: selectedPortion)
                            dismiss()
                        }
                    }
                    
                    // Recipe Details (if available)
                    if let recipe = meal.recipe {
                        RecipeDetailsSection(recipe: recipe) {
                            showingRecipeInstructions = true
                        }
                    }
                    
                    // Preparation Info
                    PreparationInfoSection(meal: meal)
                    
                    // Completion Section
                    CompletionSection(
                        meal: meal,
                        satisfactionRating: $satisfactionRating
                    ) { rating in
                        Task {
                            await viewModel.markMealCompleted(meal.id, rating: rating)
                            dismiss()
                        }
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle(meal.mealName)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Mark as Completed") {
                            Task {
                                await viewModel.markMealCompleted(meal.id)
                                dismiss()
                            }
                        }
                        
                        Button("Skip This Meal") {
                            Task {
                                await viewModel.markMealSkipped(meal.id)
                                dismiss()
                            }
                        }
                        
                        if meal.recipe != nil {
                            Button("View Full Recipe") {
                                showingRecipeInstructions = true
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .sheet(isPresented: $showingRecipeInstructions) {
            if let recipe = meal.recipe {
                RecipeInstructionsView(recipe: recipe)
            }
        }
        .onAppear {
            selectedPortion = meal.portionSize
        }
    }
}

// MARK: - Meal Header Section
struct MealHeaderSection: View {
    let meal: MealPlanEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(meal.mealType.emoji + " " + meal.mealType.displayName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(DesignColors.primary600)
                    
                    Text(meal.mealName)
                        .font(.title2)
                        .fontWeight(.bold)
                }
                
                Spacer()
                
                StatusBadge(status: meal.status)
            }
            
            if let description = meal.mealDescription {
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            
            // Time and Prep Info
            HStack(spacing: 16) {
                if let plannedTime = meal.plannedTime {
                    InfoTag(icon: "clock", text: plannedTime, color: DesignColors.primary500)
                }
                
                if let prepTime = meal.prepTimeMinutes {
                    InfoTag(icon: "timer", text: "\(prepTime) min", color: DesignColors.secondary500)
                }
                
                if let cookTime = meal.cookTimeMinutes {
                    InfoTag(icon: "flame", text: "\(cookTime) min cook", color: DesignColors.warning500)
                }
            }
        }
    }
}

// MARK: - Recipe Image Section
struct RecipeImageSection: View {
    let imageUrl: String
    
    var body: some View {
        AsyncImage(url: URL(string: imageUrl)) { image in
            image
                .resizable()
                .aspectRatio(contentMode: .fill)
        } placeholder: {
            Rectangle()
                .fill(Color(.systemGray5))
                .overlay {
                    Image(systemName: "photo")
                        .foregroundColor(.secondary)
                        .font(.largeTitle)
                }
        }
        .frame(height: 200)
        .cornerRadius(12)
    }
}

// MARK: - Nutrition Info Section
struct NutritionInfoSection: View {
    let meal: MealPlanEntry
    let portionMultiplier: Double
    
    private var adjustedNutrition: (calories: Double, protein: Double, carbs: Double, fat: Double) {
        return (
            calories: meal.calories * portionMultiplier,
            protein: meal.proteinGrams * portionMultiplier,
            carbs: meal.carbsGrams * portionMultiplier,
            fat: meal.fatGrams * portionMultiplier
        )
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Nutrition Information")
                .font(.headline)
                .fontWeight(.semibold)
            
            HStack(spacing: 20) {
                NutritionCard(
                    title: "Calories",
                    value: "\(Int(adjustedNutrition.calories))",
                    unit: "kcal",
                    color: DesignColors.primary500
                )
                
                NutritionCard(
                    title: "Protein",
                    value: "\(Int(adjustedNutrition.protein))",
                    unit: "g",
                    color: DesignColors.primary400
                )
                
                NutritionCard(
                    title: "Carbs",
                    value: "\(Int(adjustedNutrition.carbs))",
                    unit: "g",
                    color: DesignColors.warning400
                )
                
                NutritionCard(
                    title: "Fat",
                    value: "\(Int(adjustedNutrition.fat))",
                    unit: "g",
                    color: DesignColors.secondary400
                )
            }
            
            // Additional nutrients if available
            if let fiber = meal.fiberGrams {
                HStack {
                    Text("Fiber:")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(fiber * portionMultiplier))g")
                        .fontWeight(.medium)
                }
            }
            
            if let sugar = meal.sugarGrams {
                HStack {
                    Text("Sugar:")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(sugar * portionMultiplier))g")
                        .fontWeight(.medium)
                }
            }
            
            if let sodium = meal.sodiumMg {
                HStack {
                    Text("Sodium:")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(sodium * portionMultiplier))mg")
                        .fontWeight(.medium)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4)
    }
}

// MARK: - Portion Selector Section
struct PortionSelectorSection: View {
    @Binding var selectedPortion: Double
    let originalPortion: Double
    let onSave: () -> Void
    
    private let portionOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Portion Size")
                .font(.headline)
                .fontWeight(.semibold)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(portionOptions, id: \.self) { portion in
                        PortionOptionButton(
                            portion: portion,
                            isSelected: selectedPortion == portion
                        ) {
                            selectedPortion = portion
                        }
                    }
                }
                .padding(.horizontal)
            }
            
            if selectedPortion != originalPortion {
                Button("Update Portion Size", action: onSave)
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4)
    }
}

struct PortionOptionButton: View {
    let portion: Double
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(portionText)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("serving")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? DesignColors.primary500 : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(8)
        }
    }
    
    private var portionText: String {
        if portion == 0.5 {
            return "½"
        } else if portion == 0.75 {
            return "¾"
        } else if portion == 1.25 {
            return "1¼"
        } else if portion == 1.5 {
            return "1½"
        } else if portion == floor(portion) {
            return "\(Int(portion))×"
        } else {
            return String(format: "%.1f×", portion)
        }
    }
}

// MARK: - Recipe Details Section
struct RecipeDetailsSection: View {
    let recipe: Recipe
    let onViewInstructions: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recipe Details")
                .font(.headline)
                .fontWeight(.semibold)
            
            HStack(spacing: 20) {
                RecipeMetric(title: "Prep Time", value: "\(recipe.prepTimeMinutes) min", icon: "timer")
                RecipeMetric(title: "Cook Time", value: "\(recipe.cookTimeMinutes) min", icon: "flame")
                RecipeMetric(title: "Difficulty", value: recipe.difficulty, icon: "chart.bar")
                RecipeMetric(title: "Servings", value: "\(recipe.servings)", icon: "person.2")
            }
            
            if !recipe.ingredients.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Ingredients")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    ForEach(Array(recipe.ingredients.prefix(5)), id: \.id) { ingredient in
                        HStack {
                            Text("•")
                                .foregroundColor(DesignColors.primary500)
                            
                            Text("\(String(format: "%.1f", ingredient.quantity)) \(ingredient.unit) \(ingredient.name)")
                                .font(.subheadline)
                        }
                    }
                    
                    if recipe.ingredients.count > 5 {
                        Text("and \(recipe.ingredients.count - 5) more ingredients...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Button("View Full Recipe", action: onViewInstructions)
                .buttonStyle(SecondaryButtonStyle())
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4)
    }
}

// MARK: - Preparation Info Section
struct PreparationInfoSection: View {
    let meal: MealPlanEntry
    
    var body: some View {
        if let notes = meal.customizationNotes {
            VStack(alignment: .leading, spacing: 12) {
                Text("Preparation Notes")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text(notes)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.1), radius: 4)
        }
    }
}

// MARK: - Completion Section
struct CompletionSection: View {
    let meal: MealPlanEntry
    @Binding var satisfactionRating: Int?
    let onComplete: (Int?) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("How was this meal?")
                .font(.headline)
                .fontWeight(.semibold)
            
            if !meal.isCompleted() {
                VStack(spacing: 16) {
                    Text("Rate your satisfaction:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack(spacing: 16) {
                        ForEach(1...5, id: \.self) { rating in
                            SatisfactionButton(
                                rating: rating,
                                isSelected: satisfactionRating == rating
                            ) {
                                satisfactionRating = rating
                            }
                        }
                    }
                    
                    Button("Mark as Completed") {
                        onComplete(satisfactionRating)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(meal.isCompleted())
                }
            } else {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(DesignColors.success500)
                    
                    Text("Completed")
                        .fontWeight(.medium)
                        .foregroundColor(DesignColors.success500)
                    
                    Spacer()
                    
                    if let rating = meal.userRating {
                        Text("\(Int(rating))⭐")
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 4)
    }
}

// MARK: - Supporting Views

struct NutritionCard: View {
    let title: String
    let value: String
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            VStack(spacing: 2) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(color)
                
                Text(unit)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct InfoTag: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
            
            Text(text)
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.1))
        .cornerRadius(6)
    }
}

struct RecipeMetric: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(DesignColors.primary500)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
            
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct SatisfactionButton: View {
    let rating: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(emoji(for: rating))
                    .font(.title2)
                
                Text("\(rating)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(width: 50, height: 50)
            .background(isSelected ? DesignColors.primary100 : Color.clear)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? DesignColors.primary500 : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func emoji(for rating: Int) -> String {
        switch rating {
        case 1: return "😞"
        case 2: return "🙁"
        case 3: return "😐"
        case 4: return "🙂"
        case 5: return "😊"
        default: return "😐"
        }
    }
}

// MARK: - Shopping List View
struct ShoppingListView: View {
    let mealPlan: MealPlan
    let viewModel: MealPlanViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var checkedItems: Set<String> = []
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    if let shoppingList = viewModel.shoppingList {
                        ShoppingListContent(
                            shoppingList: shoppingList,
                            checkedItems: $checkedItems
                        )
                    } else {
                        ProgressView("Generating shopping list...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
                .padding()
            }
            .navigationTitle("Shopping List")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Share") {
                        // Share shopping list
                    }
                }
            }
        }
        .onAppear {
            Task {
                await viewModel.generateShoppingList()
            }
        }
    }
}

struct ShoppingListContent: View {
    let shoppingList: ShoppingListData
    @Binding var checkedItems: Set<String>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text(shoppingList.mealPlanName)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("Estimated total: ₹\(Int(shoppingList.totalEstimatedCost))")
                    .font(.subheadline)
                    .foregroundColor(DesignColors.primary600)
            }
            
            // Categories
            ShoppingCategory(title: "Vegetables", items: shoppingList.shoppingList.vegetables, checkedItems: $checkedItems)
            ShoppingCategory(title: "Fruits", items: shoppingList.shoppingList.fruits, checkedItems: $checkedItems)
            ShoppingCategory(title: "Grains", items: shoppingList.shoppingList.grains, checkedItems: $checkedItems)
            ShoppingCategory(title: "Proteins", items: shoppingList.shoppingList.proteins, checkedItems: $checkedItems)
            ShoppingCategory(title: "Dairy", items: shoppingList.shoppingList.dairy, checkedItems: $checkedItems)
            ShoppingCategory(title: "Spices", items: shoppingList.shoppingList.spices, checkedItems: $checkedItems)
            ShoppingCategory(title: "Other", items: shoppingList.shoppingList.other, checkedItems: $checkedItems)
        }
    }
}

struct ShoppingCategory: View {
    let title: String
    let items: [ShoppingListItem]
    @Binding var checkedItems: Set<String>
    
    var body: some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                ForEach(items) { item in
                    ShoppingListRow(
                        item: item,
                        isChecked: checkedItems.contains(item.name)
                    ) { isChecked in
                        if isChecked {
                            checkedItems.insert(item.name)
                        } else {
                            checkedItems.remove(item.name)
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.1), radius: 4)
        }
    }
}

struct ShoppingListRow: View {
    let item: ShoppingListItem
    let isChecked: Bool
    let onToggle: (Bool) -> Void
    
    var body: some View {
        HStack {
            Button {
                onToggle(!isChecked)
            } label: {
                Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isChecked ? DesignColors.success500 : DesignColors.gray400)
                    .font(.title3)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .strikethrough(isChecked, color: .secondary)
                    .foregroundColor(isChecked ? .secondary : .primary)
                
                Text("\(String(format: "%.1f", item.quantity)) \(item.unit)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("₹\(Int(item.estimatedCost))")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(DesignColors.primary600)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Recipe Instructions View
struct RecipeInstructionsView: View {
    let recipe: Recipe
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 20) {
                    // Recipe Header
                    VStack(alignment: .leading, spacing: 12) {
                        Text(recipe.name)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        if let description = recipe.description {
                            Text(description)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack(spacing: 20) {
                            RecipeMetric(title: "Prep", value: "\(recipe.prepTimeMinutes)m", icon: "timer")
                            RecipeMetric(title: "Cook", value: "\(recipe.cookTimeMinutes)m", icon: "flame")
                            RecipeMetric(title: "Serves", value: "\(recipe.servings)", icon: "person.2")
                            RecipeMetric(title: "Level", value: recipe.difficulty, icon: "chart.bar")
                        }
                    }
                    
                    // Ingredients
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Ingredients")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        ForEach(recipe.ingredients, id: \.id) { ingredient in
                            HStack {
                                Text("•")
                                    .foregroundColor(DesignColors.primary500)
                                
                                Text("\(String(format: "%.1f", ingredient.quantity)) \(ingredient.unit) \(ingredient.name)")
                                    .font(.body)
                                
                                if ingredient.isOptional {
                                    Text("(optional)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    
                    // Instructions
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Instructions")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        ForEach(Array(recipe.instructions.enumerated()), id: \.offset) { index, instruction in
                            HStack(alignment: .top) {
                                Text("\(index + 1)")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                                    .frame(width: 24, height: 24)
                                    .background(DesignColors.primary500)
                                    .clipShape(Circle())
                                
                                Text(instruction)
                                    .font(.body)
                                    .padding(.leading, 8)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Meal Swap View
struct MealSwapView: View {
    let meal: MealPlanEntry
    let viewModel: MealPlanViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Meal swap functionality")
                Text("Coming in Phase 12 with AI recommendations")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Swap Meal")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    MealDetailView(
        meal: MealPlanEntry(
            id: "1",
            dayNumber: 1,
            mealType: "breakfast",
            mealName: "Oatmeal with Berries",
            mealDescription: "Steel-cut oats with fresh blueberries and almonds",
            calories: 350,
            proteinGrams: 12,
            carbsGrams: 45,
            fatGrams: 15,
            prepTimeMinutes: 10,
            cookTimeMinutes: 5,
            status: "planned",
            plannedTime: "08:00",
            portionSize: 1.0,
            recipe: nil
        ),
        viewModel: MealPlanViewModel()
    )
}