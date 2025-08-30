import Foundation
import Combine

@MainActor
class MealLogViewModel: ObservableObject {
    @Published var searchResults: [FoodSearchResult] = []
    @Published var isSearching = false
    @Published var isLogging = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    private var searchTask: Task<Void, Never>?
    
    func searchFoods(query: String) async {
        // Cancel any existing search
        searchTask?.cancel()
        
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            searchResults = []
            return
        }
        
        searchTask = Task {
            isSearching = true
            
            do {
                // Add a small delay to avoid too many requests
                try await Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds
                
                if !Task.isCancelled {
                    let results = try await apiService.searchFoods(query: query, limit: 10)
                    
                    if !Task.isCancelled {
                        searchResults = results ?? []
                    }
                }
            } catch {
                if !Task.isCancelled {
                    print("Search error: \(error)")
                    searchResults = []
                }
            }
            
            if !Task.isCancelled {
                isSearching = false
            }
        }
    }
    
    func logMeal(_ mealData: CreateMealLogRequest) async -> Bool {
        isLogging = true
        errorMessage = nil
        
        do {
            let _ = try await apiService.logMeal(mealData)
            isLogging = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLogging = false
            return false
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
}