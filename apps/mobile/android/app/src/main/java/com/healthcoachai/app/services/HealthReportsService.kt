package com.healthcoachai.app.services

import com.healthcoachai.app.data.*
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult

/**
 * Health Reports Service
 * Integrates with backend health reports and AI analysis services
 */
class HealthReportsService(private val apiClient: ApiClient = ApiClient()) {

    /**
     * Get user's health reports
     */
    suspend fun getHealthReports(
        limit: Int = 20,
        offset: Int = 0
    ): ApiResult<List<HealthReport>> {
        return apiClient.request(
            endpoint = "/health-reports",
            method = "GET"
        )
    }

    /**
     * Get red flag alerts for user
     */
    suspend fun getRedFlagAlerts(
        includeRead: Boolean = false
    ): ApiResult<List<RedFlagAlert>> {
        return apiClient.request(
            endpoint = "/health-reports/alerts?includeRead=$includeRead",
            method = "GET"
        )
    }

    /**
     * Get health metrics overview
     */
    suspend fun getHealthMetrics(): ApiResult<List<HealthMetric>> {
        return apiClient.request(
            endpoint = "/health-reports/metrics",
            method = "GET"
        )
    }

    /**
     * Upload health report file
     */
    suspend fun uploadHealthReport(
        fileData: ByteArray,
        fileName: String,
        fileType: String,
        metadata: HealthReportMetadata? = null
    ): ApiResult<HealthReportUploadResponse> {
        // TODO: Implement multipart file upload
        // This would involve creating a multipart request with file data
        return apiClient.request(
            endpoint = "/health-reports/upload",
            method = "POST",
            body = mapOf(
                "fileName" to fileName,
                "fileType" to fileType,
                "metadata" to metadata
            )
        )
    }

    /**
     * Get detailed health report analysis
     */
    suspend fun getReportAnalysis(reportId: String): ApiResult<HealthReportAnalysis> {
        return apiClient.request(
            endpoint = "/health-reports/$reportId/analysis",
            method = "GET"
        )
    }

    /**
     * Mark red flag alert as read
     */
    suspend fun markAlertAsRead(alertId: String): ApiResult<Unit> {
        return apiClient.request(
            endpoint = "/health-reports/alerts/$alertId/mark-read",
            method = "POST"
        )
    }

    /**
     * Request physician review for a report
     */
    suspend fun requestPhysicianReview(
        reportId: String,
        urgency: String = "normal",
        notes: String? = null
    ): ApiResult<PhysicianReviewRequest> {
        return apiClient.request(
            endpoint = "/health-reports/$reportId/physician-review",
            method = "POST",
            body = mapOf(
                "urgency" to urgency,
                "notes" to notes
            )
        )
    }

    /**
     * Get health trends and insights
     */
    suspend fun getHealthTrends(
        timeRange: String = "3months",
        metricTypes: List<String>? = null
    ): ApiResult<List<HealthTrend>> {
        val params = mutableMapOf("timeRange" to timeRange)
        if (metricTypes != null) {
            params["metricTypes"] = metricTypes.joinToString(",")
        }
        
        val queryString = params.entries.joinToString("&") { "${it.key}=${it.value}" }
        
        return apiClient.request(
            endpoint = "/health-reports/trends?$queryString",
            method = "GET"
        )
    }

    /**
     * Schedule health check reminder
     */
    suspend fun scheduleHealthCheckReminder(
        reminderType: String,
        intervalDays: Int,
        customMessage: String? = null
    ): ApiResult<HealthCheckReminder> {
        return apiClient.request(
            endpoint = "/health-reports/reminders",
            method = "POST",
            body = mapOf(
                "reminderType" to reminderType,
                "intervalDays" to intervalDays,
                "customMessage" to customMessage
            )
        )
    }

    /**
     * Get AI-powered health insights
     */
    suspend fun getAIHealthInsights(
        reportIds: List<String>? = null,
        insightType: String = "comprehensive"
    ): ApiResult<HealthInsights> {
        return apiClient.request(
            endpoint = "/health-reports/ai-insights",
            method = "POST",
            body = mapOf(
                "reportIds" to reportIds,
                "insightType" to insightType
            )
        )
    }

    /**
     * Compare health metrics with population averages
     */
    suspend fun compareWithPopulation(
        age: Int,
        gender: String,
        metricTypes: List<String>
    ): ApiResult<PopulationComparison> {
        return apiClient.request(
            endpoint = "/health-reports/population-comparison",
            method = "POST",
            body = mapOf(
                "age" to age,
                "gender" to gender,
                "metricTypes" to metricTypes
            )
        )
    }

    /**
     * Export health data
     */
    suspend fun exportHealthData(
        format: String = "pdf", // pdf, csv, json
        dateRange: DateRange? = null,
        includeCharts: Boolean = true
    ): ApiResult<ExportResponse> {
        return apiClient.request(
            endpoint = "/health-reports/export",
            method = "POST",
            body = mapOf(
                "format" to format,
                "dateRange" to dateRange,
                "includeCharts" to includeCharts
            )
        )
    }

    /**
     * Get physician recommendations based on health data
     */
    suspend fun getPhysicianRecommendations(): ApiResult<List<PhysicianRecommendation>> {
        return apiClient.request(
            endpoint = "/health-reports/physician-recommendations",
            method = "GET"
        )
    }

    /**
     * Submit health questionnaire
     */
    suspend fun submitHealthQuestionnaire(
        questionnaireId: String,
        responses: Map<String, Any>
    ): ApiResult<QuestionnaireSubmissionResponse> {
        return apiClient.request(
            endpoint = "/health-reports/questionnaires/$questionnaireId/submit",
            method = "POST",
            body = mapOf(
                "responses" to responses
            )
        )
    }

    /**
     * Get available health questionnaires
     */
    suspend fun getAvailableQuestionnaires(): ApiResult<List<HealthQuestionnaire>> {
        return apiClient.request(
            endpoint = "/health-reports/questionnaires",
            method = "GET"
        )
    }
}