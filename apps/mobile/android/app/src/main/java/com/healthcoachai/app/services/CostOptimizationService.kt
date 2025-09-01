package com.healthcoachai.app.services

import com.healthcoachai.app.data.*
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * AI Cost Optimization Service
 * Manages AI usage tracking, cost optimization, and quota monitoring
 */
class CostOptimizationService(private val apiClient: ApiClient) {

    private val _costMetrics = MutableStateFlow<CostMetrics?>(null)
    val costMetrics: StateFlow<CostMetrics?> = _costMetrics.asStateFlow()
    
    private val _quotaStatus = MutableStateFlow<QuotaStatus?>(null)
    val quotaStatus: StateFlow<QuotaStatus?> = _quotaStatus.asStateFlow()
    
    private val _isNearLimit = MutableStateFlow(false)
    val isNearLimit: StateFlow<Boolean> = _isNearLimit.asStateFlow()
    
    private val _isOverLimit = MutableStateFlow(false)
    val isOverLimit: StateFlow<Boolean> = _isOverLimit.asStateFlow()

    /**
     * Get cost metrics for current user
     */
    suspend fun getCostMetrics(userId: String): ApiResult<CostMetrics> {
        val result = apiClient.request<CostMetrics>(
            endpoint = "/ai-prompt-optimization/cost-metrics?userId=$userId",
            method = "GET"
        )
        
        if (result is ApiResult.Success) {
            _costMetrics.value = result.data
        }
        
        return result
    }

    /**
     * Get quota status for current user
     */
    suspend fun getQuotaStatus(userId: String): ApiResult<QuotaStatus> {
        val result = apiClient.request<QuotaStatus>(
            endpoint = "/ai-prompt-optimization/quota-status?userId=$userId",
            method = "GET"
        )
        
        if (result is ApiResult.Success) {
            _quotaStatus.value = result.data
            _isNearLimit.value = result.data.isNearLimit
            _isOverLimit.value = result.data.isOverLimit
        }
        
        return result
    }

    /**
     * Execute optimized prompt template
     */
    suspend fun executeOptimizedPrompt(
        userId: String,
        templateId: String,
        variables: Map<String, Any>,
        category: String = "general"
    ): ApiResult<OptimizedPromptResponse> {
        val requestBody = mapOf(
            "userId" to userId,
            "templateId" to templateId,
            "variables" to variables,
            "category" to category
        )
        
        val result = apiClient.request<OptimizedPromptResponse>(
            endpoint = "/ai-prompt-optimization/execute",
            method = "POST",
            body = requestBody
        )
        
        // Update quota status if provided
        if (result is ApiResult.Success) {
            result.data.quotaStatus?.let { quotaStatus ->
                _quotaStatus.value = quotaStatus
                _isNearLimit.value = quotaStatus.isNearLimit
                _isOverLimit.value = quotaStatus.isOverLimit
            }
        }
        
        return result
    }

    /**
     * Get available prompt templates
     */
    suspend fun getTemplates(category: String? = null): ApiResult<List<PromptTemplate>> {
        val endpoint = if (category != null) {
            "/ai-prompt-optimization/templates?category=$category"
        } else {
            "/ai-prompt-optimization/templates"
        }
        
        return apiClient.request(endpoint)
    }

    /**
     * Track API usage for cost optimization
     */
    suspend fun trackUsage(
        userId: String,
        endpoint: String,
        method: String,
        tokenCount: Int? = null,
        cost: Double? = null
    ): ApiResult<Unit> {
        val requestBody = mapOf(
            "userId" to userId,
            "endpoint" to endpoint,
            "method" to method,
            "tokenCount" to tokenCount,
            "cost" to cost,
            "timestamp" to System.currentTimeMillis()
        )
        
        return apiClient.request(
            endpoint = "/ai-prompt-optimization/track-usage",
            method = "POST",
            body = requestBody
        )
    }

    /**
     * Get cost optimization settings
     */
    suspend fun getSettings(userId: String): ApiResult<CostOptimizationSettings> {
        return apiClient.request("/ai-prompt-optimization/settings?userId=$userId")
    }

    /**
     * Update cost optimization settings
     */
    suspend fun updateSettings(
        userId: String,
        settings: CostOptimizationSettings
    ): ApiResult<Unit> {
        return apiClient.request(
            endpoint = "/ai-prompt-optimization/settings",
            method = "PUT",
            body = mapOf("userId" to userId, "settings" to settings)
        )
    }

    /**
     * Check if user is approaching cost limits
     */
    fun shouldOptimizeForCost(): Boolean {
        val quota = _quotaStatus.value
        return quota?.isNearLimit == true || quota?.isOverLimit == true
    }

    /**
     * Get recommended optimization actions
     */
    fun getOptimizationRecommendations(): List<String> {
        val recommendations = mutableListOf<String>()
        val quota = _quotaStatus.value
        val metrics = _costMetrics.value

        if (quota?.isOverLimit == true) {
            recommendations.add("You've exceeded your daily quota. Consider upgrading your plan.")
        } else if (quota?.isNearLimit == true) {
            recommendations.add("You're approaching your daily limit. Consider using optimized templates.")
        }

        metrics?.let {
            if (it.averageCostPerRequest > 0.05) {
                recommendations.add("Your average cost per request is high. Try using batch processing.")
            }
            
            if (it.averageTokensPerRequest > 1000) {
                recommendations.add("Consider using shorter, more focused prompts to reduce token usage.")
            }
        }

        return recommendations
    }
}

// MARK: - Data Models

@kotlinx.serialization.Serializable
data class CostMetrics(
    val totalRequests: Int,
    val totalTokens: Int,
    val totalCost: Double,
    val averageTokensPerRequest: Double,
    val averageCostPerRequest: Double,
    val costByModel: Map<String, Double>,
    val tokensByModel: Map<String, Int>,
    val requestsByCategory: Map<String, Int>,
    val dailyCost: Double,
    val monthlyCost: Double,
    val projectedMonthlyCost: Double
)

@kotlinx.serialization.Serializable
data class QuotaStatus(
    val userId: String,
    val dailyQuota: Int,
    val dailyUsed: Int,
    val monthlyQuota: Int,
    val monthlyUsed: Int,
    val isNearLimit: Boolean,
    val isOverLimit: Boolean,
    val resetTime: String // ISO 8601 timestamp
)

@kotlinx.serialization.Serializable
data class OptimizedPromptResponse(
    val success: Boolean,
    val response: String,
    val templateId: String,
    val tokenCount: Int,
    val costUsd: Double,
    val optimizationRatio: Double,
    val quotaStatus: QuotaStatus? = null,
    val executionTime: Double
)

@kotlinx.serialization.Serializable
data class PromptTemplate(
    val id: String,
    val name: String,
    val description: String,
    val category: String,
    val template: String,
    val variables: List<String>,
    val estimatedTokens: Int,
    val averageCost: Double,
    val usageCount: Int,
    val successRate: Double
)

@kotlinx.serialization.Serializable
data class CostOptimizationSettings(
    val enableBatching: Boolean,
    val maxBatchSize: Int,
    val batchTimeoutSeconds: Int,
    val enableTemplateOptimization: Boolean,
    val costThresholdUsd: Double,
    val preferredModel: String? = null
)