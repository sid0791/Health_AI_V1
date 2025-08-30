import SwiftUI

// MARK: - Enhanced Food Logging View for Phase 9
struct MealLogView: View {
    @StateObject private var viewModel = MealLogViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var selectedMealType: MealType = .breakfast
    @State private var searchText = ""
    @State private var selectedFood: FoodSearchResult?
    @State private var selectedQuantity: QuantityOption = QuantityOption.defaultOptions[1] // 1×
    @State private var showingQuantityPicker = false
    @State private var showingMealTypeSelector = false
    @State private var notes = ""
    @State private var satisfactionLevel: SatisfactionLevel?
    @State private var showingCamera = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Meal Type Selector
                    MealTypeSelector(
                        selectedMealType: $selectedMealType,
                        onTap: { showingMealTypeSelector = true }
                    )
                    
                    // Food Search Section
                    FoodSearchSection(
                        searchText: $searchText,
                        searchResults: viewModel.searchResults,
                        selectedFood: $selectedFood,
                        isSearching: viewModel.isSearching,
                        onSearchChanged: { query in
                            Task {
                                await viewModel.searchFoods(query: query)
                            }
                        }
                    )
                    
                    // Selected Food Summary
                    if let food = selectedFood {
                        SelectedFoodCard(
                            food: food,
                            selectedQuantity: selectedQuantity,
                            onQuantityTap: { showingQuantityPicker = true },
                            onRemove: { selectedFood = nil }
                        )
                    }
                    
                    // Quick Add Section
                    QuickAddSection(
                        onFoodSelected: { food in
                            selectedFood = food
                        }
                    )
                    
                    // Additional Details
                    AdditionalDetailsSection(
                        notes: $notes,
                        satisfactionLevel: $satisfactionLevel,
                        onPhotoTap: { showingCamera = true }
                    )
                    
                    // Log Button
                    LogMealButton(
                        isEnabled: selectedFood != nil,
                        isLoading: viewModel.isLogging
                    ) {
                        await logMeal()
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Log Meal")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
        }
        .sheet(isPresented: $showingMealTypeSelector) {
            MealTypeSelectorSheet(selectedMealType: $selectedMealType)
        }
        .sheet(isPresented: $showingQuantityPicker) {
            QuantityPickerSheet(selectedQuantity: $selectedQuantity)
        }
        .sheet(isPresented: $showingCamera) {
            FoodCameraView { image in
                // Handle captured image
                // This would integrate with ML food recognition in future phases
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
        .onAppear {
            // Set meal type based on current time
            selectedMealType = currentMealTypeForTime()
        }
    }
    
    private func logMeal() async {
        guard let food = selectedFood else { return }
        
        let logRequest = CreateMealLogRequest(
            foodName: food.name,
            foodDescription: nil,
            hinglishDescription: food.nameHinglish,
            mealType: selectedMealType.rawValue,
            portionSize: selectedQuantity.multiplier,
            portionUnit: food.unit,
            recipeId: nil,
            caloriesConsumed: food.calories * selectedQuantity.multiplier,
            proteinGrams: food.protein * selectedQuantity.multiplier,
            carbsGrams: food.carbs * selectedQuantity.multiplier,
            fatGrams: food.fat * selectedQuantity.multiplier,
            fiberGrams: nil,
            sugarGrams: nil,
            sodiumMg: nil,
            loggedAt: nil, // Will use current time
            location: nil,
            notes: notes.isEmpty ? nil : notes,
            satisfactionLevel: satisfactionLevel?.rawValue
        )
        
        let success = await viewModel.logMeal(logRequest)
        if success {
            dismiss()
        }
    }
    
    private func currentMealTypeForTime() -> MealType {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 6..<11: return .breakfast
        case 11..<15: return .lunch
        case 15..<18: return .snack
        default: return .dinner
        }
    }
}

// MARK: - Meal Type Selector
struct MealTypeSelector: View {
    @Binding var selectedMealType: MealType
    let onTap: () -> Void
    
    var body: some View {
        Card {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Meal Type")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Text(selectedMealType.emoji)
                        Text(selectedMealType.displayName)
                            .font(.headline)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.down")
                    .foregroundColor(.secondary)
            }
        }
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Food Search Section
struct FoodSearchSection: View {
    @Binding var searchText: String
    let searchResults: [FoodSearchResult]
    @Binding var selectedFood: FoodSearchResult?
    let isSearching: Bool
    let onSearchChanged: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Search Food")
                .font(.headline)
            
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search food (English/Hindi)", text: $searchText)
                    .textFieldStyle(PlainTextFieldStyle())
                    .onChange(of: searchText) { _, newValue in
                        if !newValue.isEmpty {
                            onSearchChanged(newValue)
                        }
                    }
                
                if isSearching {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(DesignRadius.md)
            
            // Search Results
            if !searchResults.isEmpty {
                Text("Search Results")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                LazyVStack(spacing: 8) {
                    ForEach(searchResults) { result in
                        FoodSearchResultRow(
                            food: result,
                            isSelected: selectedFood?.id == result.id
                        ) {
                            selectedFood = result
                            searchText = result.name
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Food Search Result Row
struct FoodSearchResultRow: View {
    let food: FoodSearchResult
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(food.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    if let hinglish = food.nameHinglish {
                        Text(hinglish)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Text("\(Int(food.calories)) cal per \(food.unit)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    NutritionMacro(label: "P", value: Int(food.protein), color: DesignColors.primary400)
                    NutritionMacro(label: "C", value: Int(food.carbs), color: DesignColors.warning400)
                    NutritionMacro(label: "F", value: Int(food.fat), color: DesignColors.secondary400)
                }
            }
            .padding()
            .background(isSelected ? DesignColors.primary100 : Color(.systemBackground))
            .cornerRadius(DesignRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: DesignRadius.md)
                    .stroke(isSelected ? DesignColors.primary500 : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Selected Food Card
struct SelectedFoodCard: View {
    let food: FoodSearchResult
    let selectedQuantity: QuantityOption
    let onQuantityTap: () -> Void
    let onRemove: () -> Void
    
    private var adjustedNutrition: (calories: Double, protein: Double, carbs: Double, fat: Double) {
        let multiplier = selectedQuantity.multiplier
        return (
            calories: food.calories * multiplier,
            protein: food.protein * multiplier,
            carbs: food.carbs * multiplier,
            fat: food.fat * multiplier
        )
    }
    
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    Text("Selected Food")
                        .font(.headline)
                    
                    Spacer()
                    
                    Button(action: onRemove) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
                
                // Food Info
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(food.name)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        if let hinglish = food.nameHinglish {
                            Text(hinglish)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                }
                
                // Quantity Selector
                HStack {
                    Text("Quantity:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Button(action: onQuantityTap) {
                        HStack {
                            Text("\(selectedQuantity.displayText) \(food.unit)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Image(systemName: "chevron.down")
                                .font(.caption)
                        }
                        .foregroundColor(DesignColors.primary600)
                    }
                }
                
                // Nutrition Summary
                HStack(spacing: 20) {
                    NutritionSummaryItem(
                        label: "Calories",
                        value: "\(Int(adjustedNutrition.calories))",
                        color: DesignColors.primary500
                    )
                    
                    NutritionSummaryItem(
                        label: "Protein",
                        value: "\(Int(adjustedNutrition.protein))g",
                        color: DesignColors.primary400
                    )
                    
                    NutritionSummaryItem(
                        label: "Carbs",
                        value: "\(Int(adjustedNutrition.carbs))g",
                        color: DesignColors.warning400
                    )
                    
                    NutritionSummaryItem(
                        label: "Fat",
                        value: "\(Int(adjustedNutrition.fat))g",
                        color: DesignColors.secondary400
                    )
                }
            }
        }
    }
}

// MARK: - Quick Add Section
struct QuickAddSection: View {
    let onFoodSelected: (FoodSearchResult) -> Void
    
    private let quickFoods = [
        FoodSearchResult(id: "rice", name: "Rice", nameHinglish: "Chawal", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: "1 cup", searchRelevance: 1.0),
        FoodSearchResult(id: "roti", name: "Roti", nameHinglish: "Roti", calories: 104, protein: 3.6, carbs: 22, fat: 0.4, unit: "1 piece", searchRelevance: 1.0),
        FoodSearchResult(id: "dal", name: "Dal", nameHinglish: "Dal", calories: 230, protein: 18, carbs: 40, fat: 0.8, unit: "1 cup", searchRelevance: 1.0),
        FoodSearchResult(id: "tea", name: "Tea", nameHinglish: "Chai", calories: 25, protein: 1, carbs: 3, fat: 1, unit: "1 cup", searchRelevance: 1.0)
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Add")
                .font(.headline)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(quickFoods) { food in
                        QuickAddButton(food: food) {
                            onFoodSelected(food)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Additional Details Section
struct AdditionalDetailsSection: View {
    @Binding var notes: String
    @Binding var satisfactionLevel: SatisfactionLevel?
    let onPhotoTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Additional Details")
                .font(.headline)
            
            // Notes
            VStack(alignment: .leading, spacing: 8) {
                Text("Notes (optional)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextField("Add any notes about your meal...", text: $notes, axis: .vertical)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .lineLimit(3...6)
            }
            
            // Satisfaction Level
            VStack(alignment: .leading, spacing: 8) {
                Text("How satisfied were you?")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 16) {
                    ForEach(SatisfactionLevel.allCases, id: \.self) { level in
                        SatisfactionButton(
                            level: level,
                            isSelected: satisfactionLevel == level
                        ) {
                            satisfactionLevel = level
                        }
                    }
                }
            }
            
            // Photo Option
            Button(action: onPhotoTap) {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Add Photo")
                }
                .foregroundColor(DesignColors.primary600)
            }
        }
    }
}

// MARK: - Supporting Views

struct NutritionMacro: View {
    let label: String
    let value: Int
    let color: Color
    
    var body: some View {
        HStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text("\(value)")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(color)
        }
    }
}

struct NutritionSummaryItem: View {
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(color)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct QuickAddButton: View {
    let food: FoodSearchResult
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(food.nameHinglish ?? food.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                
                Text("\(Int(food.calories)) cal")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(DesignColors.primary100)
            .cornerRadius(DesignRadius.sm)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SatisfactionButton: View {
    let level: SatisfactionLevel
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(level.emoji)
                    .font(.title2)
                
                Text("\(level.rawValue)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(width: 44, height: 44)
            .background(isSelected ? DesignColors.primary100 : Color.clear)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? DesignColors.primary500 : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct LogMealButton: View {
    let isEnabled: Bool
    let isLoading: Bool
    let action: () async -> Void
    
    var body: some View {
        Button {
            Task {
                await action()
            }
        } label: {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "plus.circle.fill")
                }
                
                Text("Log Meal")
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(isEnabled ? DesignColors.primary500 : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(DesignRadius.md)
        }
        .disabled(!isEnabled || isLoading)
    }
}

// MARK: - Sheet Views

struct MealTypeSelectorSheet: View {
    @Binding var selectedMealType: MealType
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                ForEach(MealType.allCases, id: \.self) { mealType in
                    Button {
                        selectedMealType = mealType
                        dismiss()
                    } label: {
                        HStack {
                            Text(mealType.emoji)
                            Text(mealType.displayName)
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            if selectedMealType == mealType {
                                Image(systemName: "checkmark")
                                    .foregroundColor(DesignColors.primary500)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Meal Type")
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

struct QuantityPickerSheet: View {
    @Binding var selectedQuantity: QuantityOption
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                ForEach(QuantityOption.defaultOptions, id: \.displayText) { option in
                    Button {
                        selectedQuantity = option
                        dismiss()
                    } label: {
                        HStack {
                            Text(option.displayText)
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            if selectedQuantity.displayText == option.displayText {
                                Image(systemName: "checkmark")
                                    .foregroundColor(DesignColors.primary500)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Quantity")
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

struct FoodCameraView: View {
    let onImageCaptured: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        // Placeholder for camera functionality
        // In Phase 12/13, this would integrate with ML food recognition
        VStack {
            Text("Camera functionality coming in Phase 12/13")
                .font(.headline)
                .multilineTextAlignment(.center)
            
            Button("Cancel") {
                dismiss()
            }
            .padding()
        }
    }
}

#Preview {
    MealLogView()
}