import Foundation
import Combine

// MARK: - API Service

class APIService: ObservableObject {
    static let shared = APIService()
    
    private let baseURL: String
    private let urlSession: URLSession
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder
    
    @Published var isAuthenticated = false
    @Published var authToken: String?
    
    private init() {
        // Get base URL from config
        self.baseURL = ConfigManager.shared.apiBaseURL
        
        // Configure URL session
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.urlSession = URLSession(configuration: config)
        
        // Configure JSON handling
        self.jsonDecoder = JSONDecoder()
        self.jsonEncoder = JSONEncoder()
        
        // Configure date handling
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        jsonDecoder.dateDecodingStrategy = .formatted(dateFormatter)
        jsonEncoder.dateEncodingStrategy = .formatted(dateFormatter)
        
        // Load saved auth token
        loadAuthToken()
    }
    
    // MARK: - Authentication
    
    func setAuthToken(_ token: String) {
        self.authToken = token
        self.isAuthenticated = true
        saveAuthToken(token)
    }
    
    func clearAuth() {
        self.authToken = nil
        self.isAuthenticated = false
        clearAuthToken()
    }
    
    private func loadAuthToken() {
        if let token = KeychainHelper.get(key: "auth_token") {
            self.authToken = token
            self.isAuthenticated = true
        }
    }
    
    private func saveAuthToken(_ token: String) {
        KeychainHelper.save(key: "auth_token", value: token)
    }
    
    private func clearAuthToken() {
        KeychainHelper.delete(key: "auth_token")
    }
    
    // MARK: - Generic Request Method
    
    func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod,
        body: Encodable? = nil,
        responseType: T.Type
    ) async throws -> T? {
        let url = URL(string: baseURL + endpoint)!
        var request = URLRequest(url: url)
        
        // Set HTTP method
        request.httpMethod = method.rawValue
        
        // Set headers
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Add auth header if available
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add body if provided
        if let body = body {
            do {
                request.httpBody = try jsonEncoder.encode(body)
            } catch {
                throw APIError.encodingError(error)
            }
        }
        
        // Perform request
        do {
            let (data, response) = try await urlSession.data(for: request)
            
            // Check HTTP status
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                // Success - decode response
                if data.isEmpty {
                    return nil
                }
                
                do {
                    return try jsonDecoder.decode(T.self, from: data)
                } catch {
                    print("Decoding error: \(error)")
                    print("Response data: \(String(data: data, encoding: .utf8) ?? "nil")")
                    throw APIError.decodingError(error)
                }
                
            case 401:
                // Unauthorized - clear auth
                await MainActor.run {
                    clearAuth()
                }
                throw APIError.unauthorized
                
            case 404:
                throw APIError.notFound
                
            case 400...499:
                // Client error - try to decode error message
                if let errorResponse = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                    throw APIError.clientError(errorResponse.message)
                } else {
                    throw APIError.clientError("Client error: \(httpResponse.statusCode)")
                }
                
            case 500...599:
                throw APIError.serverError("Server error: \(httpResponse.statusCode)")
                
            default:
                throw APIError.unknownError(httpResponse.statusCode)
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Specific API Methods
    
    // Dashboard
    func getDashboardData() async throws -> DashboardData? {
        return try await request(
            endpoint: "/analytics/dashboard",
            method: .GET,
            responseType: DashboardData.self
        )
    }
    
    // Meal Plans
    func getMealPlans() async throws -> [MealPlan]? {
        return try await request(
            endpoint: "/meal-plans",
            method: .GET,
            responseType: [MealPlan].self
        )
    }
    
    func getActiveMealPlan() async throws -> MealPlan? {
        return try await request(
            endpoint: "/meal-plans/active",
            method: .GET,
            responseType: MealPlan.self
        )
    }
    
    func getCurrentWeekPlan() async throws -> MealPlan? {
        return try await request(
            endpoint: "/meal-plans/current-week",
            method: .GET,
            responseType: MealPlan.self
        )
    }
    
    func getTodayMeals() async throws -> TodayMeals? {
        return try await request(
            endpoint: "/meal-plans/today-meals",
            method: .GET,
            responseType: TodayMeals.self
        )
    }
    
    // Meal Logging
    func logMeal(_ mealData: CreateMealLogRequest) async throws -> MealLog? {
        return try await request(
            endpoint: "/meal-logs",
            method: .POST,
            body: mealData,
            responseType: MealLog.self
        )
    }
    
    func getMealLogs(date: Date? = nil) async throws -> [MealLog]? {
        var endpoint = "/meal-logs"
        
        if let date = date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            endpoint += "?date=\(formatter.string(from: date))"
        }
        
        return try await request(
            endpoint: endpoint,
            method: .GET,
            responseType: [MealLog].self
        )
    }
    
    func getTodayLogs() async throws -> [MealLog]? {
        return try await request(
            endpoint: "/meal-logs/today",
            method: .GET,
            responseType: [MealLog].self
        )
    }
    
    func searchFoods(query: String, limit: Int = 20) async throws -> [FoodSearchResult]? {
        let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return try await request(
            endpoint: "/meal-logs/search?q=\(encodedQuery)&limit=\(limit)",
            method: .GET,
            responseType: [FoodSearchResult].self
        )
    }
    
    // Analytics
    func getNutritionSummary(startDate: Date? = nil, endDate: Date? = nil) async throws -> NutritionSummary? {
        var endpoint = "/meal-logs/nutrition-summary"
        var queryParams: [String] = []
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let startDate = startDate {
            queryParams.append("startDate=\(formatter.string(from: startDate))")
        }
        
        if let endDate = endDate {
            queryParams.append("endDate=\(formatter.string(from: endDate))")
        }
        
        if !queryParams.isEmpty {
            endpoint += "?" + queryParams.joined(separator: "&")
        }
        
        return try await request(
            endpoint: endpoint,
            method: .GET,
            responseType: NutritionSummary.self
        )
    }
    
    func getWeightTrend(days: Int = 30) async throws -> WeightTrendData? {
        return try await request(
            endpoint: "/analytics/weight-trend?days=\(days)",
            method: .GET,
            responseType: WeightTrendData.self
        )
    }
    
    func getMacroBreakdown(startDate: Date? = nil, endDate: Date? = nil) async throws -> MacroBreakdownResponse? {
        var endpoint = "/analytics/macro-breakdown"
        var queryParams: [String] = []
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let startDate = startDate {
            queryParams.append("startDate=\(formatter.string(from: startDate))")
        }
        
        if let endDate = endDate {
            queryParams.append("endDate=\(formatter.string(from: endDate))")
        }
        
        if !queryParams.isEmpty {
            endpoint += "?" + queryParams.joined(separator: "&")
        }
        
        return try await request(
            endpoint: endpoint,
            method: .GET,
            responseType: MacroBreakdownResponse.self
        )
    }
}

// MARK: - Supporting Types

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case PATCH = "PATCH"
    case DELETE = "DELETE"
}

enum APIError: LocalizedError {
    case networkError(Error)
    case invalidResponse
    case unauthorized
    case notFound
    case clientError(String)
    case serverError(String)
    case unknownError(Int)
    case encodingError(Error)
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Please log in again"
        case .notFound:
            return "Resource not found"
        case .clientError(let message):
            return message
        case .serverError(let message):
            return message
        case .unknownError(let code):
            return "Unknown error: \(code)"
        case .encodingError(let error):
            return "Encoding error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Additional Response Models

struct MacroBreakdownResponse: Codable {
    let period: DatePeriod
    let totals: NutritionTotals
    let averageDaily: NutritionTotals
    let macroPercentages: MacroPercentages
    let dailyBreakdown: [DailyNutritionData]
    let recommendations: [String]
}

struct DailyNutritionData: Codable {
    let date: String
    let calories: Double
    let protein: Double
    let carbs: Double
    let fat: Double
}

// MARK: - Keychain Helper

class KeychainHelper {
    static func save(key: String, value: String) {
        let data = value.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    static func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == noErr {
            if let data = dataTypeRef as? Data {
                return String(data: data, encoding: .utf8)
            }
        }
        
        return nil
    }
    
    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}