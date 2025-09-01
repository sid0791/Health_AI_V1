package com.healthcoachai.app.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * API Client for HealthCoach AI Backend
 * Provides HTTP client with authentication and error handling
 */
class ApiClient(private val getAccessToken: (() -> String?)? = null) {
    companion object {
        private val BASE_URL = BuildConfig.API_BASE_URL ?: "https://api.healthcoachai.com/api"
        private const val TIMEOUT_SECONDS = 30L
    }

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(getAccessToken ?: { null }))
        .addInterceptor(LoggingInterceptor())
        .build()

    /**
     * Generic API request method
     */
    suspend inline fun <reified T> request(
        endpoint: String,
        method: String = "GET",
        body: Any? = null,
        headers: Map<String, String> = emptyMap()
    ): ApiResult<T> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL$endpoint"
            val requestBuilder = Request.Builder().url(url)

            // Add headers
            headers.forEach { (key, value) ->
                requestBuilder.addHeader(key, value)
            }

            // Add body for POST/PUT/PATCH
            if (body != null && method in listOf("POST", "PUT", "PATCH")) {
                val jsonBody = json.encodeToString(kotlinx.serialization.serializer<Any>(), body)
                requestBuilder.method(
                    method,
                    jsonBody.toRequestBody("application/json".toMediaType())
                )
            } else {
                requestBuilder.method(method, null)
            }

            val response = client.newCall(requestBuilder.build()).execute()
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: ""
                if (responseBody.isEmpty()) {
                    @Suppress("UNCHECKED_CAST")
                    ApiResult.Success(Unit as T)
                } else {
                    val data = json.decodeFromString<T>(responseBody)
                    ApiResult.Success(data)
                }
            } else {
                val errorBody = response.body?.string()
                ApiResult.Error(
                    ApiException(
                        code = response.code,
                        message = errorBody ?: "Unknown error",
                        url = url
                    )
                )
            }
        } catch (e: IOException) {
            ApiResult.Error(ApiException(0, "Network error: ${e.message}", endpoint))
        } catch (e: Exception) {
            ApiResult.Error(ApiException(0, "Unexpected error: ${e.message}", endpoint))
        }
    }

    /**
     * Multipart request method for file uploads
     */
    suspend inline fun <reified T> requestWithMultipart(
        endpoint: String,
        multipartBody: MultipartBody,
        headers: Map<String, String> = emptyMap()
    ): ApiResult<T> = withContext(Dispatchers.IO) {
        try {
            val url = "$BASE_URL$endpoint"
            val requestBuilder = Request.Builder()
                .url(url)
                .post(multipartBody)

            // Add headers
            headers.forEach { (key, value) ->
                requestBuilder.addHeader(key, value)
            }

            val request = requestBuilder.build()
            val response = client.newCall(request).execute()

            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: ""
                
                if (T::class == Unit::class) {
                    @Suppress("UNCHECKED_CAST")
                    return@withContext ApiResult.Success(Unit as T)
                }
                
                val data = json.decodeFromString<T>(responseBody)
                ApiResult.Success(data)
            } else {
                val errorBody = response.body?.string() ?: "Unknown error"
                ApiResult.Error(ApiException(response.code, errorBody, endpoint))
            }
        } catch (e: IOException) {
            ApiResult.Error(ApiException(0, "Network error: ${e.message}", endpoint))
        } catch (e: Exception) {
            ApiResult.Error(ApiException(0, "Unexpected error: ${e.message}", endpoint))
        }
    }
}

/**
 * Authentication interceptor for adding auth tokens
 */
class AuthInterceptor(private val getAccessToken: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = getAccessToken()
        
        val authenticatedRequest = originalRequest.newBuilder()
            .apply {
                if (token != null) {
                    addHeader("Authorization", "Bearer $token")
                }
                addHeader("Content-Type", "application/json")
            }
            .build()
            
        return chain.proceed(authenticatedRequest)
    }
}

/**
 * Logging interceptor for debugging
 */
class LoggingInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        println("API Request: ${request.method} ${request.url}")
        
        val response = chain.proceed(request)
        println("API Response: ${response.code} for ${request.url}")
        
        return response
    }
}

/**
 * API result wrapper
 */
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val exception: ApiException) : ApiResult<Nothing>()
    
    fun isSuccess(): Boolean = this is Success
    fun isError(): Boolean = this is Error
    
    fun getOrNull(): T? = when (this) {
        is Success -> data
        is Error -> null
    }
    
    fun exceptionOrNull(): ApiException? = when (this) {
        is Success -> null
        is Error -> exception
    }
}

/**
 * Custom API exception
 */
data class ApiException(
    val code: Int,
    override val message: String,
    val url: String
) : Exception(message)