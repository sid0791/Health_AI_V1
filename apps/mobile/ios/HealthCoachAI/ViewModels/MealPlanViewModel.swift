import Foundation
import Combine

@MainActor
class MealPlanViewModel: ObservableObject {
    @Published var currentWeekPlan: MealPlan?
    @Published var shoppingList: ShoppingListData?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    
    func loadCurrentWeekPlan() async {
        isLoading = true
        errorMessage = nil
        
        do {
            currentWeekPlan = try await apiService.getCurrentWeekPlan()
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to load current week plan: \(error)")
        }
        
        isLoading = false
    }
    
    func refreshData() async {
        await loadCurrentWeekPlan()
    }
    
    func markMealCompleted(_ entryId: String, rating: Int? = nil, feedback: String? = nil) async {
        do {
            var body: [String: Any] = [:]
            if let rating = rating {
                body["rating"] = rating
            }
            if let feedback = feedback {
                body["feedback"] = feedback
            }
            
            let _ = try await apiService.request(
                endpoint: "/meal-plan-entries/\(entryId)/complete",
                method: .PATCH,
                body: body,
                responseType: MealPlanEntry.self
            )
            
            // Refresh the plan to show updated status
            await loadCurrentWeekPlan()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to mark meal completed: \(error)")
        }
    }
    
    func markMealSkipped(_ entryId: String, reason: String? = nil) async {
        do {
            var body: [String: Any] = [:]
            if let reason = reason {
                body["reason"] = reason
            }
            
            let _ = try await apiService.request(
                endpoint: "/meal-plan-entries/\(entryId)/skip",
                method: .PATCH,
                body: body,
                responseType: MealPlanEntry.self
            )
            
            // Refresh the plan to show updated status
            await loadCurrentWeekPlan()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to mark meal skipped: \(error)")
        }
    }
    
    func substituteMeal(_ entryId: String, newRecipeId: String, reason: String? = nil) async {
        do {
            var body: [String: Any] = ["newRecipeId": newRecipeId]
            if let reason = reason {
                body["reason"] = reason
            }
            
            let _ = try await apiService.request(
                endpoint: "/meal-plan-entries/\(entryId)/substitute",
                method: .PATCH,
                body: body,
                responseType: MealPlanEntry.self
            )
            
            // Refresh the plan to show updated meal
            await loadCurrentWeekPlan()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to substitute meal: \(error)")
        }
    }
    
    func updatePortionSize(_ entryId: String, portionSize: Double) async {
        do {
            let body = ["portionSize": portionSize]
            
            let _ = try await apiService.request(
                endpoint: "/meal-plan-entries/\(entryId)/portion",
                method: .PATCH,
                body: body,
                responseType: MealPlanEntry.self
            )
            
            // Refresh the plan to show updated nutrition
            await loadCurrentWeekPlan()
            
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to update portion size: \(error)")
        }
    }
    
    func generateShoppingList() async {
        guard let mealPlan = currentWeekPlan else { return }
        
        do {
            shoppingList = try await apiService.request(
                endpoint: "/meal-plans/\(mealPlan.id)/shopping-list",
                method: .GET,
                responseType: ShoppingListData.self
            )
        } catch {
            errorMessage = error.localizedDescription
            print("Failed to generate shopping list: \(error)")
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
}

// MARK: - Shopping List Data Model

struct ShoppingListData: Codable {
    let mealPlanId: String
    let mealPlanName: String
    let shoppingList: ShoppingListCategories
    let totalEstimatedCost: Double
    let generatedAt: Date
}

struct ShoppingListCategories: Codable {
    let vegetables: [ShoppingListItem]
    let fruits: [ShoppingListItem]
    let grains: [ShoppingListItem]
    let proteins: [ShoppingListItem]
    let dairy: [ShoppingListItem]
    let spices: [ShoppingListItem]
    let other: [ShoppingListItem]
}

struct ShoppingListItem: Codable, Identifiable {
    let id = UUID()
    let name: String
    let quantity: Double
    let unit: String
    let estimatedCost: Double
    
    private enum CodingKeys: String, CodingKey {
        case name, quantity, unit, estimatedCost
    }
}