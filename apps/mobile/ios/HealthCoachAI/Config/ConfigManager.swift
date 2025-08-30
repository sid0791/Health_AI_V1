import Foundation

/**
 * Configuration Manager for HealthCoachAI iOS App
 * Implements Phase 7 requirement: "Config consumption from backend; no secrets embedded"
 * All configuration loaded from backend API, no hardcoded secrets in client
 */
class ConfigManager: ObservableObject {
    static let shared = ConfigManager()
    
    @Published var config: AppConfig?
    @Published var isLoading = false
    @Published var error: Error?
    
    private let userDefaults = UserDefaults.standard
    private let configCacheKey = "app_config_cache"
    private let configCacheTimestampKey = "app_config_timestamp"
    private let cacheValidityHours: TimeInterval = 24 // 24 hours
    
    private init() {
        loadCachedConfig()
    }
    
    // MARK: - Public Methods
    
    func loadConfiguration() async {
        await MainActor.run {
            isLoading = true
            error = nil
        }
        
        do {
            let freshConfig = try await fetchConfigFromBackend()
            await MainActor.run {
                self.config = freshConfig
                self.isLoading = false
                self.cacheConfig(freshConfig)
            }
        } catch {
            await MainActor.run {
                self.error = error
                self.isLoading = false
                // Fall back to cached config if available
                if self.config == nil {
                    self.loadCachedConfig()
                }
            }
        }
    }
    
    func getAPIBaseURL() -> String {
        return config?.apiBaseURL ?? "https://api.healthcoachai.com" // Default fallback
    }
    
    func getFeatureFlags() -> FeatureFlags {
        return config?.featureFlags ?? FeatureFlags()
    }
    
    func getUISettings() -> UISettings {
        return config?.uiSettings ?? UISettings()
    }
    
    // MARK: - Private Methods
    
    private func loadCachedConfig() {
        guard let data = userDefaults.data(forKey: configCacheKey),
              let timestamp = userDefaults.object(forKey: configCacheTimestampKey) as? Date,
              Date().timeIntervalSince(timestamp) < cacheValidityHours * 3600 else {
            return
        }
        
        do {
            let cachedConfig = try JSONDecoder().decode(AppConfig.self, from: data)
            self.config = cachedConfig
        } catch {
            print("Failed to decode cached config: \(error)")
        }
    }
    
    private func cacheConfig(_ config: AppConfig) {
        do {
            let data = try JSONEncoder().encode(config)
            userDefaults.set(data, forKey: configCacheKey)
            userDefaults.set(Date(), forKey: configCacheTimestampKey)
        } catch {
            print("Failed to cache config: \(error)")
        }
    }
    
    private func fetchConfigFromBackend() async throws -> AppConfig {
        // Environment-based backend URL (no secrets in code)
        let baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://api.healthcoachai.com"
        
        guard let url = URL(string: "\(baseURL)/api/mobile/config") else {
            throw ConfigError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("HealthCoachAI-iOS/1.0", forHTTPHeaderField: "User-Agent")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw ConfigError.serverError
        }
        
        let config = try JSONDecoder().decode(AppConfig.self, from: data)
        return config
    }
}

// MARK: - Data Models

struct AppConfig: Codable {
    let apiBaseURL: String
    let featureFlags: FeatureFlags
    let uiSettings: UISettings
    let version: String
    let supportedVersions: [String]
    let lastUpdated: Date
    
    enum CodingKeys: String, CodingKey {
        case apiBaseURL = "api_base_url"
        case featureFlags = "feature_flags"
        case uiSettings = "ui_settings"
        case version
        case supportedVersions = "supported_versions"
        case lastUpdated = "last_updated"
    }
}

struct FeatureFlags: Codable {
    let enableMealPlanning: Bool
    let enableFitnessTracking: Bool
    let enableAIChat: Bool
    let enableSocialFeatures: Bool
    let enablePremiumFeatures: Bool
    let enableHinglishSupport: Bool
    let enableOfflineMode: Bool
    
    init() {
        // Default values when no config available
        self.enableMealPlanning = true
        self.enableFitnessTracking = true
        self.enableAIChat = false
        self.enableSocialFeatures = false
        self.enablePremiumFeatures = false
        self.enableHinglishSupport = true
        self.enableOfflineMode = false
    }
    
    enum CodingKeys: String, CodingKey {
        case enableMealPlanning = "enable_meal_planning"
        case enableFitnessTracking = "enable_fitness_tracking"
        case enableAIChat = "enable_ai_chat"
        case enableSocialFeatures = "enable_social_features"
        case enablePremiumFeatures = "enable_premium_features"
        case enableHinglishSupport = "enable_hinglish_support"
        case enableOfflineMode = "enable_offline_mode"
    }
}

struct UISettings: Codable {
    let refreshIntervalMinutes: Int
    let maxCacheAgeDays: Int
    let animationDurationMs: Int
    let enableAnimations: Bool
    let defaultLanguage: String
    let supportedLanguages: [String]
    
    init() {
        // Default values
        self.refreshIntervalMinutes = 30
        self.maxCacheAgeDays = 7
        self.animationDurationMs = 250
        self.enableAnimations = true
        self.defaultLanguage = "en"
        self.supportedLanguages = ["en", "hi"]
    }
    
    enum CodingKeys: String, CodingKey {
        case refreshIntervalMinutes = "refresh_interval_minutes"
        case maxCacheAgeDays = "max_cache_age_days"
        case animationDurationMs = "animation_duration_ms"
        case enableAnimations = "enable_animations"
        case defaultLanguage = "default_language"
        case supportedLanguages = "supported_languages"
    }
}

enum ConfigError: Error, LocalizedError {
    case invalidURL
    case serverError
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid configuration URL"
        case .serverError:
            return "Server error while fetching configuration"
        case .decodingError:
            return "Failed to decode configuration data"
        }
    }
}