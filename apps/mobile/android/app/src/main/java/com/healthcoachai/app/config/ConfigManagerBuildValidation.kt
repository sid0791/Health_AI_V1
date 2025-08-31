package com.healthcoachai.app.config

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import java.net.URL
import java.util.Date
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

/**
 * Configuration Manager for HealthCoachAI (Build Validation Version)
 * This version compiles without Android dependencies for build validation.
 * In actual Android runtime, use the full Android version with Context and SharedPreferences.
 */
class ConfigManager private constructor() {
    companion object {
        @Volatile
        private var INSTANCE: ConfigManager? = null
        
        fun getInstance(): ConfigManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ConfigManager().also { INSTANCE = it }
            }
        }
    }
    
    private val json = Json { ignoreUnknownKeys = true }
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val _config = MutableStateFlow<AppConfig?>(null)
    val config: StateFlow<AppConfig?> = _config.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val configCacheKey = "app_config_cache"
    private val configCacheTimestampKey = "app_config_timestamp"
    private val cacheValidityHours = 24L // 24 hours
    
    // Simple in-memory cache for build validation
    private var memoryCache: String? = null
    private var memoryCacheTimestamp: Long = 0
    
    init {
        loadCachedConfig()
    }
    
    // MARK: - Public Methods
    
    suspend fun loadConfiguration() {
        _isLoading.value = true
        _error.value = null
        
        try {
            val freshConfig = fetchConfigFromBackend()
            _config.value = freshConfig
            cacheConfig(freshConfig)
        } catch (e: Exception) {
            _error.value = e.message ?: "Unknown error occurred"
            // Fall back to cached config if available
            if (_config.value == null) {
                loadCachedConfig()
            }
        } finally {
            _isLoading.value = false
        }
    }
    
    fun getAPIBaseURL(): String {
        return _config.value?.apiBaseURL ?: "https://api.healthcoachai.com"
    }
    
    fun getFeatureFlags(): FeatureFlags {
        return _config.value?.featureFlags ?: FeatureFlags()
    }
    
    fun getUISettings(): UISettings {
        return _config.value?.uiSettings ?: UISettings()
    }
    
    // MARK: - Private Methods
    
    private fun loadCachedConfig() {
        try {
            val cachedConfigJson = getCachedString(configCacheKey)
            val cacheTimestamp = getCachedLong(configCacheTimestampKey)
            
            if (cachedConfigJson != null && isCacheValid(cacheTimestamp)) {
                val cachedConfig = json.decodeFromString<AppConfig>(cachedConfigJson)
                _config.value = cachedConfig
            }
        } catch (e: Exception) {
            // Ignore cache loading errors, will fetch fresh config
        }
    }
    
    private suspend fun fetchConfigFromBackend(): AppConfig {
        val url = getConfigURL()
        val request = Request.Builder()
            .url(url)
            .get()
            .build()
        
        return try {
            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() 
                    ?: throw ConfigException("Empty response body")
                json.decodeFromString<AppConfig>(responseBody)
            } else {
                throw ConfigException("HTTP ${response.code}: ${response.message}")
            }
        } catch (e: Exception) {
            when (e) {
                is ConfigException -> throw e
                else -> throw ConfigException("Network error: ${e.message}")
            }
        }
    }
    
    private fun cacheConfig(config: AppConfig) {
        try {
            val configJson = json.encodeToString(config)
            val currentTime = System.currentTimeMillis()
            
            setCachedString(configCacheKey, configJson)
            setCachedLong(configCacheTimestampKey, currentTime)
        } catch (e: Exception) {
            // Ignore cache saving errors
        }
    }
    
    private fun getConfigURL(): String {
        return "${getAPIBaseURL()}/config/mobile"
    }
    
    private fun isCacheValid(timestamp: Long): Boolean {
        val currentTime = System.currentTimeMillis()
        val maxAge = cacheValidityHours * 60 * 60 * 1000 // Convert to milliseconds
        return (currentTime - timestamp) < maxAge
    }
    
    // Simple memory-based cache for build validation
    private fun getCachedString(key: String): String? = if (key == configCacheKey) memoryCache else null
    private fun getCachedLong(key: String): Long = if (key == configCacheTimestampKey) memoryCacheTimestamp else 0L
    private fun setCachedString(key: String, value: String) { if (key == configCacheKey) memoryCache = value }
    private fun setCachedLong(key: String, value: Long) { if (key == configCacheTimestampKey) memoryCacheTimestamp = value }
}

// Data Classes
@Serializable
data class AppConfig(
    @SerialName("api_base_url") val apiBaseURL: String = "https://api.healthcoachai.com",
    @SerialName("feature_flags") val featureFlags: FeatureFlags = FeatureFlags(),
    @SerialName("ui_settings") val uiSettings: UISettings = UISettings()
)

@Serializable
data class FeatureFlags(
    @SerialName("enable_meal_logging") val enableMealLogging: Boolean = true,
    @SerialName("enable_fitness_tracking") val enableFitnessTracking: Boolean = true,
    @SerialName("enable_ai_chat") val enableAIChat: Boolean = true,
    @SerialName("enable_health_reports") val enableHealthReports: Boolean = false,
    @SerialName("enable_social_sharing") val enableSocialSharing: Boolean = false,
    @SerialName("enable_notifications") val enableNotifications: Boolean = true,
    @SerialName("debug_mode") val debugMode: Boolean = false
)

@Serializable
data class UISettings(
    @SerialName("theme_mode") val themeMode: String = "auto", // auto, light, dark
    @SerialName("primary_color") val primaryColor: String = "#14B8A6",
    @SerialName("secondary_color") val secondaryColor: String = "#F97316",
    @SerialName("refresh_interval_minutes") val refreshIntervalMinutes: Int = 30,
    @SerialName("max_cache_age_days") val maxCacheAgeDays: Int = 7,
    @SerialName("animation_duration_ms") val animationDurationMs: Int = 250,
    @SerialName("enable_animations") val enableAnimations: Boolean = true,
    @SerialName("default_language") val defaultLanguage: String = "en",
    @SerialName("supported_languages") val supportedLanguages: List<String> = listOf("en", "hi")
)

class ConfigException(message: String) : Exception(message)