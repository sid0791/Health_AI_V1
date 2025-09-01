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
    
    // MARK: - AI Cost Optimization
    
    func getCostMetrics(userId: String) async throws -> CostMetrics? {
        return try await request(
            endpoint: "/ai-prompt-optimization/cost-metrics?userId=\(userId)",
            method: .GET,
            responseType: CostMetrics.self
        )
    }
    
    func getQuotaStatus(userId: String) async throws -> QuotaStatus? {
        return try await request(
            endpoint: "/ai-prompt-optimization/quota-status?userId=\(userId)",
            method: .GET,
            responseType: QuotaStatus.self
        )
    }
    
    func executeOptimizedPrompt(request: OptimizedPromptRequest) async throws -> OptimizedPromptResponse? {
        return try await self.request(
            endpoint: "/ai-prompt-optimization/execute",
            method: .POST,
            body: request,
            responseType: OptimizedPromptResponse.self
        )
    }
    
    func trackUsage(request: UsageTrackingRequest) async throws {
        _ = try await self.request(
            endpoint: "/ai-prompt-optimization/track-usage",
            method: .POST,
            body: request,
            responseType: EmptyResponse.self
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

// MARK: - Cost Optimization Request Models

struct OptimizedPromptRequest: Codable {
    let userId: String
    let templateId: String
    let variables: [String: AnyCodable]
    let category: String
}

struct UsageTrackingRequest: Codable {
    let userId: String
    let endpoint: String
    let method: String
    let tokenCount: Int?
    let cost: Double?
    let timestamp: String
}

// MARK: - Helper for Any Codable

struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let arrayValue as [Any]:
            let codableArray = arrayValue.map { AnyCodable($0) }
            try container.encode(codableArray)
        case let dictValue as [String: Any]:
            let codableDict = dictValue.mapValues { AnyCodable($0) }
            try container.encode(codableDict)
        default:
            try container.encodeNil()
        }
    }
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