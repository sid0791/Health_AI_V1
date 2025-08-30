package com.healthcoachai.app.config

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.State
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
 * Configuration Manager for HealthCoachAI Android App
 * Implements Phase 7 requirement: "Config consumption from backend; no secrets embedded"
 * All configuration loaded from backend API, no hardcoded secrets in client
 */
class ConfigManager private constructor(private val context: Context) {
    companion object {
        @Volatile
        private var INSTANCE: ConfigManager? = null
        
        fun getInstance(context: Context): ConfigManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ConfigManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences("app_config", Context.MODE_PRIVATE)
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
        val cachedData = prefs.getString(configCacheKey, null)
        val timestamp = prefs.getLong(configCacheTimestampKey, 0)
        
        if (cachedData != null && isConfigCacheValid(timestamp)) {
            try {
                val cachedConfig = json.decodeFromString<AppConfig>(cachedData)
                _config.value = cachedConfig
            } catch (e: Exception) {
                println("Failed to decode cached config: ${e.message}")
            }
        }
    }
    
    private fun cacheConfig(config: AppConfig) {
        try {
            val configJson = json.encodeToString(config)
            prefs.edit()
                .putString(configCacheKey, configJson)
                .putLong(configCacheTimestampKey, System.currentTimeMillis())
                .apply()
        } catch (e: Exception) {
            println("Failed to cache config: ${e.message}")
        }
    }
    
    private fun isConfigCacheValid(timestamp: Long): Boolean {
        val ageHours = (System.currentTimeMillis() - timestamp) / (1000 * 60 * 60)
        return ageHours < cacheValidityHours
    }
    
    private fun fetchConfigFromBackend(): AppConfig {
        // Environment-based backend URL (no secrets in code)
        val baseURL = System.getenv("API_BASE_URL") ?: "https://api.healthcoachai.com"
        val url = "$baseURL/api/mobile/config"
        
        val request = Request.Builder()
            .url(url)
            .get()
            .addHeader("Accept", "application/json")
            .addHeader("User-Agent", "HealthCoachAI-Android/1.0")
            .build()
        
        val response = httpClient.newCall(request).execute()
        
        if (!response.isSuccessful) {
            throw ConfigException("Server error: ${response.code}")
        }
        
        val responseBody = response.body?.string()
            ?: throw ConfigException("Empty response body")
        
        return json.decodeFromString<AppConfig>(responseBody)
    }
}

// MARK: - Data Models

@Serializable
data class AppConfig(
    @SerialName("api_base_url") val apiBaseURL: String,
    @SerialName("feature_flags") val featureFlags: FeatureFlags,
    @SerialName("ui_settings") val uiSettings: UISettings,
    val version: String,
    @SerialName("supported_versions") val supportedVersions: List<String>,
    @SerialName("last_updated") val lastUpdated: Long
)

@Serializable
data class FeatureFlags(
    @SerialName("enable_meal_planning") val enableMealPlanning: Boolean = true,
    @SerialName("enable_fitness_tracking") val enableFitnessTracking: Boolean = true,
    @SerialName("enable_ai_chat") val enableAIChat: Boolean = false,
    @SerialName("enable_social_features") val enableSocialFeatures: Boolean = false,
    @SerialName("enable_premium_features") val enablePremiumFeatures: Boolean = false,
    @SerialName("enable_hinglish_support") val enableHinglishSupport: Boolean = true,
    @SerialName("enable_offline_mode") val enableOfflineMode: Boolean = false
)

@Serializable
data class UISettings(
    @SerialName("refresh_interval_minutes") val refreshIntervalMinutes: Int = 30,
    @SerialName("max_cache_age_days") val maxCacheAgeDays: Int = 7,
    @SerialName("animation_duration_ms") val animationDurationMs: Int = 250,
    @SerialName("enable_animations") val enableAnimations: Boolean = true,
    @SerialName("default_language") val defaultLanguage: String = "en",
    @SerialName("supported_languages") val supportedLanguages: List<String> = listOf("en", "hi")
)

class ConfigException(message: String) : Exception(message)