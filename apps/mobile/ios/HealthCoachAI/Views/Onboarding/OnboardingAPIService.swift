import Foundation

// MARK: - API Data Models
struct OnboardingBasicInfoAPI: Codable {
    let firstName: String
    let lastName: String
    let email: String?
    let birthday: String
    let gender: String
    let height: Double
    let weight: Double
    let city: String?
    let state: String?
    let country: String?
    let preferredLanguage: String?
    let supportsHinglish: Bool?
    
    init(firstName: String, lastName: String, email: String?, birthday: String, gender: String, height: Double, weight: Double, city: String?, state: String?, country: String? = "IN", preferredLanguage: String? = "en", supportsHinglish: Bool? = true) {
        self.firstName = firstName
        self.lastName = lastName
        self.email = email
        self.birthday = birthday
        self.gender = gender
        self.height = height
        self.weight = weight
        self.city = city
        self.state = state
        self.country = country
        self.preferredLanguage = preferredLanguage
        self.supportsHinglish = supportsHinglish
    }
}

struct OnboardingLifestyleAPI: Codable {
    let activityLevel: String
    let smokingFrequency: Int?
    let alcoholFrequency: Int?
    let sleepHours: Double?
    let jobActivityLevel: Int?
    let eatingOutFrequency: Int?
    let stressLevel: Int?
    let waterIntake: Double?
}

struct OnboardingHealthAPI: Codable {
    let healthConditions: [String]?
    let bloodPressureSystolic: Int?
    let bloodPressureDiastolic: Int?
    let fastingBloodSugar: Int?
    let hba1c: Double?
    let fattyLiver: Bool?
    let vitaminDeficiencies: [String]?
    let currentMedications: [String]?
    let familyHistory: [String]?
    let emergencyContactName: String?
    let emergencyContactPhone: String?
}

struct OnboardingPreferencesAPI: Codable {
    let dietaryPreference: String
    let favoriteCuisines: [String]?
    let allergens: [String]?
    let customAllergens: [String]?
    let spiceTolerance: String
    let favoriteIngredients: [String]?
    let dislikedIngredients: [String]?
    let cravings: [String]?
    let mealsPerDay: Int?
    let snacksPerDay: Int?
    let maxCookingTime: Int?
    let cookingSkillLevel: Int?
    let dailyFoodBudget: Double?
}

struct OnboardingGoalsAPI: Codable {
    let primaryGoal: String
    let goalPriority: String
    let intensity: String
    let targetWeight: Double?
    let weeklyWeightChangeTarget: Double?
    let targetBodyFatPercentage: Double?
    let targetDate: String?
    let dailyCalorieTarget: Int?
    let dailyProteinTarget: Int?
    let weeklyExerciseTarget: Int?
    let dailyStepsTarget: Int?
    let weeklyStrengthSessions: Int?
    let weeklyCardioSessions: Int?
    let motivation: String?
    let notes: String?
    let reminderEnabled: Bool?
    let reminderTime: String?
}

struct OnboardingProgressAPI: Codable {
    let currentStep: Int
    let onboardingCompleted: Bool
    let totalSteps: Int
    let completionPercentage: Int
    let completedSteps: [Int]
    let skippedSteps: [Int]
    let profileCompleted: Bool?
    let lastUpdated: String?
}

struct OnboardingStepResponse: Codable {
    let success: Bool
    let nextStep: Int?
    let onboardingComplete: Bool?
    let message: String?
}

// MARK: - API Service
class OnboardingAPIService {
    static let shared = OnboardingAPIService()
    
    private let baseURL: String
    private let session: URLSession
    
    private init() {
        // Get base URL from ConfigManager
        self.baseURL = ConfigManager.shared.getAPIBaseURL()
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Authentication Helper
    private func getAuthHeaders() -> [String: String] {
        var headers = [
            "Content-Type": "application/json",
            "Accept": "application/json"
        ]
        
        // Add JWT token if available
        if let token = AuthManager.shared.accessToken {
            headers["Authorization"] = "Bearer \(token)"
        }
        
        return headers
    }
    
    // MARK: - API Methods
    func getProgress() async throws -> OnboardingProgressAPI {
        let url = URL(string: "\(baseURL)/onboarding/progress")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        // Add auth headers
        for (key, value) in getAuthHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(OnboardingProgressAPI.self, from: data)
    }
    
    func saveBasicInfo(_ data: OnboardingBasicInfoAPI) async throws -> OnboardingStepResponse {
        return try await postData(to: "/onboarding/basic-info", data: data)
    }
    
    func saveLifestyle(_ data: OnboardingLifestyleAPI) async throws -> OnboardingStepResponse {
        return try await postData(to: "/onboarding/lifestyle", data: data)
    }
    
    func saveHealth(_ data: OnboardingHealthAPI) async throws -> OnboardingStepResponse {
        return try await postData(to: "/onboarding/health", data: data)
    }
    
    func savePreferences(_ data: OnboardingPreferencesAPI) async throws -> OnboardingStepResponse {
        return try await postData(to: "/onboarding/preferences", data: data)
    }
    
    func saveGoals(_ data: OnboardingGoalsAPI) async throws -> OnboardingStepResponse {
        return try await postData(to: "/onboarding/goals", data: data)
    }
    
    func skipStep(_ step: Int) async throws -> OnboardingStepResponse {
        let url = URL(string: "\(baseURL)/onboarding/skip-step")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        
        // Add auth headers
        for (key, value) in getAuthHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let requestBody = ["step": step]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(OnboardingStepResponse.self, from: data)
    }
    
    func restartOnboarding() async throws -> OnboardingStepResponse {
        let url = URL(string: "\(baseURL)/onboarding/restart")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        
        // Add auth headers
        for (key, value) in getAuthHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(OnboardingStepResponse.self, from: data)
    }
    
    // MARK: - Helper Methods
    private func postData<T: Codable>(to endpoint: String, data: T) async throws -> OnboardingStepResponse {
        let url = URL(string: "\(baseURL)\(endpoint)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        // Add auth headers
        for (key, value) in getAuthHeaders() {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // Encode data
        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(data)
        
        let (responseData, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        return try JSONDecoder().decode(OnboardingStepResponse.self, from: responseData)
    }
}

// MARK: - API Error Types
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case noData
    case decodingError
    case encodingError
    case serverError(Int)
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .noData:
            return "No data received"
        case .decodingError:
            return "Failed to decode response"
        case .encodingError:
            return "Failed to encode request"
        case .serverError(let code):
            return "Server error: \(code)"
        case .networkError:
            return "Network connection error"
        }
    }
}

// MARK: - Auth Manager Stub
class AuthManager {
    static let shared = AuthManager()
    
    var accessToken: String? {
        // Get token from keychain or UserDefaults
        return UserDefaults.standard.string(forKey: "access_token")
    }
    
    private init() {}
}