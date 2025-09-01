package com.healthcoachai.app.auth

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.healthcoachai.app.BuildConfig
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Comprehensive Authentication Service for HealthCoach AI
 * Handles OTP, OAuth (Google, Apple, Facebook), and secure token management
 */
class AuthenticationService(private val context: Context) {
    companion object {
        private const val PREFS_NAME = "health_coach_auth"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_DATA = "user_data"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEYSTORE_ALIAS = "HealthCoachAIKey"
    }

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    private val apiClient: ApiClient
    private val securePrefs: SharedPreferences
    private val googleSignInClient: GoogleSignInClient

    init {
        // Initialize encrypted shared preferences
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        securePrefs = EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        // Initialize API client with token provider
        apiClient = ApiClient { getAccessToken() }

        // Initialize Google Sign-In
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(BuildConfig.GOOGLE_CLIENT_ID ?: "demo_client_id")
            .requestServerAuthCode(BuildConfig.GOOGLE_CLIENT_ID ?: "demo_client_id")
            .build()

        googleSignInClient = GoogleSignIn.getClient(context, gso)
    }

    /**
     * Check if user is currently authenticated
     */
    fun isLoggedIn(): Boolean {
        return securePrefs.getBoolean(KEY_IS_LOGGED_IN, false) && 
               getAccessToken() != null
    }

    /**
     * Get current access token
     */
    fun getAccessToken(): String? {
        return securePrefs.getString(KEY_ACCESS_TOKEN, null)
    }

    /**
     * Get current refresh token
     */
    fun getRefreshToken(): String? {
        return securePrefs.getString(KEY_REFRESH_TOKEN, null)
    }

    /**
     * Get current user data
     */
    fun getCurrentUser(): AuthUser? {
        val userData = securePrefs.getString(KEY_USER_DATA, null) ?: return null
        return try {
            json.decodeFromString<AuthUser>(userData)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Send OTP for phone authentication
     */
    suspend fun sendOTP(
        phone: String,
        deviceId: String = android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        )
    ): ApiResult<OTPResponse> = withContext(Dispatchers.IO) {
        apiClient.request<OTPResponse>(
            endpoint = "/auth/otp/send",
            method = "POST",
            body = SendOTPRequest(
                phone = phone,
                deviceId = deviceId,
                deviceName = android.os.Build.MODEL,
                devicePlatform = "android"
            )
        )
    }

    /**
     * Verify OTP and complete authentication
     */
    suspend fun verifyOTP(
        phone: String,
        otpCode: String,
        deviceId: String = android.provider.Settings.Secure.getString(
            context.contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        )
    ): ApiResult<LoginResponse> = withContext(Dispatchers.IO) {
        val result = apiClient.request<LoginResponse>(
            endpoint = "/auth/otp/verify",
            method = "POST",
            body = VerifyOTPRequest(
                phone = phone,
                otpCode = otpCode,
                deviceId = deviceId,
                deviceName = android.os.Build.MODEL,
                devicePlatform = "android"
            )
        )

        // Store authentication data if successful
        if (result.isSuccess()) {
            result.getOrNull()?.let { loginResponse ->
                storeAuthenticationData(loginResponse)
            }
        }

        result
    }

    /**
     * Get Google OAuth URL
     */
    suspend fun getGoogleOAuthUrl(state: String? = null): ApiResult<OAuthUrlResponse> = 
        withContext(Dispatchers.IO) {
            apiClient.request<OAuthUrlResponse>(
                endpoint = "/auth/oauth/google/url",
                method = "GET"
            )
        }

    /**
     * Handle Google Sign-In
     */
    suspend fun handleGoogleSignIn(serverAuthCode: String): ApiResult<LoginResponse> = 
        withContext(Dispatchers.IO) {
            val result = apiClient.request<LoginResponse>(
                endpoint = "/auth/oauth/callback",
                method = "POST",
                body = OAuthCallbackRequest(
                    provider = "google",
                    code = serverAuthCode,
                    deviceId = android.provider.Settings.Secure.getString(
                        context.contentResolver,
                        android.provider.Settings.Secure.ANDROID_ID
                    ),
                    deviceName = android.os.Build.MODEL,
                    devicePlatform = "android"
                )
            )

            // Store authentication data if successful
            if (result.isSuccess()) {
                result.getOrNull()?.let { loginResponse ->
                    storeAuthenticationData(loginResponse)
                }
            }

            result
        }

    /**
     * Handle Apple Sign-In
     */
    suspend fun handleAppleSignIn(authorizationCode: String): ApiResult<LoginResponse> = 
        withContext(Dispatchers.IO) {
            val result = apiClient.request<LoginResponse>(
                endpoint = "/auth/oauth/callback",
                method = "POST",
                body = OAuthCallbackRequest(
                    provider = "apple",
                    code = authorizationCode,
                    deviceId = android.provider.Settings.Secure.getString(
                        context.contentResolver,
                        android.provider.Settings.Secure.ANDROID_ID
                    ),
                    deviceName = android.os.Build.MODEL,
                    devicePlatform = "android"
                )
            )

            // Store authentication data if successful
            if (result.isSuccess()) {
                result.getOrNull()?.let { loginResponse ->
                    storeAuthenticationData(loginResponse)
                }
            }

            result
        }

    /**
     * Handle Facebook Sign-In
     */
    suspend fun handleFacebookSignIn(accessToken: String): ApiResult<LoginResponse> = 
        withContext(Dispatchers.IO) {
            val result = apiClient.request<LoginResponse>(
                endpoint = "/auth/oauth/callback",
                method = "POST",
                body = OAuthCallbackRequest(
                    provider = "facebook",
                    code = accessToken, // Facebook uses access token instead of auth code
                    deviceId = android.provider.Settings.Secure.getString(
                        context.contentResolver,
                        android.provider.Settings.Secure.ANDROID_ID
                    ),
                    deviceName = android.os.Build.MODEL,
                    devicePlatform = "android"
                )
            )

            // Store authentication data if successful
            if (result.isSuccess()) {
                result.getOrNull()?.let { loginResponse ->
                    storeAuthenticationData(loginResponse)
                }
            }

            result
        }

    /**
     * Refresh authentication tokens
     */
    suspend fun refreshTokens(): ApiResult<TokenRefreshResponse> = withContext(Dispatchers.IO) {
        val refreshToken = getRefreshToken() ?: return@withContext ApiResult.Error(
            com.healthcoachai.app.network.ApiException(401, "No refresh token available", "")
        )

        val result = apiClient.request<TokenRefreshResponse>(
            endpoint = "/auth/refresh",
            method = "POST",
            body = RefreshTokenRequest(
                refreshToken = refreshToken,
                deviceId = android.provider.Settings.Secure.getString(
                    context.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                )
            )
        )

        // Update stored tokens if successful
        if (result.isSuccess()) {
            result.getOrNull()?.let { tokenResponse ->
                updateTokens(tokenResponse.accessToken, tokenResponse.refreshToken)
            }
        }

        result
    }

    /**
     * Logout user
     */
    suspend fun logout(): ApiResult<Unit> = withContext(Dispatchers.IO) {
        // Call logout API
        val result = apiClient.request<Unit>(
            endpoint = "/auth/logout",
            method = "POST",
            body = LogoutRequest(scope = "current"),
            headers = mapOf("Authorization" to "Bearer ${getAccessToken()}")
        )

        // Clear stored authentication data regardless of API result
        clearAuthenticationData()

        // Sign out from Google
        try {
            googleSignInClient.signOut()
        } catch (e: Exception) {
            // Ignore Google sign-out errors
        }

        result
    }

    /**
     * Store authentication data securely
     */
    private fun storeAuthenticationData(loginResponse: LoginResponse) {
        with(securePrefs.edit()) {
            putString(KEY_ACCESS_TOKEN, loginResponse.tokens.accessToken)
            putString(KEY_REFRESH_TOKEN, loginResponse.tokens.refreshToken)
            putString(KEY_USER_ID, loginResponse.user.id)
            putString(KEY_USER_DATA, json.encodeToString(AuthUser.serializer(), loginResponse.user))
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }

    /**
     * Update stored tokens
     */
    private fun updateTokens(accessToken: String, refreshToken: String?) {
        with(securePrefs.edit()) {
            putString(KEY_ACCESS_TOKEN, accessToken)
            refreshToken?.let { putString(KEY_REFRESH_TOKEN, it) }
            apply()
        }
    }

    /**
     * Clear all authentication data
     */
    private fun clearAuthenticationData() {
        with(securePrefs.edit()) {
            remove(KEY_ACCESS_TOKEN)
            remove(KEY_REFRESH_TOKEN)
            remove(KEY_USER_ID)
            remove(KEY_USER_DATA)
            putBoolean(KEY_IS_LOGGED_IN, false)
            apply()
        }
    }

    /**
     * Get Google Sign-In client for UI
     */
    fun getGoogleSignInClient(): GoogleSignInClient = googleSignInClient
}

// Data models for API communication
@Serializable
data class SendOTPRequest(
    val phone: String,
    val deviceId: String,
    val deviceName: String,
    val devicePlatform: String
)

@Serializable
data class VerifyOTPRequest(
    val phone: String,
    val otpCode: String,
    val deviceId: String,
    val deviceName: String,
    val devicePlatform: String
)

@Serializable
data class OAuthCallbackRequest(
    val provider: String,
    val code: String,
    val state: String? = null,
    val deviceId: String,
    val deviceName: String,
    val devicePlatform: String
)

@Serializable
data class RefreshTokenRequest(
    val refreshToken: String,
    val deviceId: String
)

@Serializable
data class LogoutRequest(
    val scope: String = "current"
)

@Serializable
data class OTPResponse(
    val otpId: String,
    val expiresAt: String,
    val message: String
)

@Serializable
data class OAuthUrlResponse(
    val authUrl: String,
    val state: String
)

@Serializable
data class LoginResponse(
    val tokens: AuthTokens,
    val user: AuthUser,
    val isNewUser: Boolean
)

@Serializable
data class TokenRefreshResponse(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String,
    val expiresIn: Long
)

@Serializable
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String,
    val expiresIn: Long
)

@Serializable
data class AuthUser(
    val id: String,
    val phone: String? = null,
    val email: String? = null,
    val name: String? = null,
    val profilePictureUrl: String? = null,
    val isEmailVerified: Boolean = false,
    val isPhoneVerified: Boolean = false,
    val createdAt: String,
    val lastLoginAt: String? = null
)