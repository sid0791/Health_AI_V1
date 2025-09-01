package com.healthcoachai.app.viewmodels

import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healthcoachai.app.data.*
import com.healthcoachai.app.services.HealthReportsService
import com.healthcoachai.app.network.ApiResult
import kotlinx.coroutines.launch

data class HealthReportsUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val healthReports: List<HealthReport> = emptyList(),
    val redFlagAlerts: List<RedFlagAlert> = emptyList(),
    val healthMetrics: List<HealthMetric> = emptyList(),
    val isUploading: Boolean = false
)

class HealthReportsViewModel : ViewModel() {
    private val healthReportsService = HealthReportsService()
    
    private var _uiState by mutableStateOf(HealthReportsUiState())
    val uiState: HealthReportsUiState get() = _uiState

    init {
        loadHealthReports()
    }

    fun loadHealthReports() {
        viewModelScope.launch {
            _uiState = _uiState.copy(isLoading = true, error = null)
            
            try {
                // Load health reports
                val reportsResult = healthReportsService.getHealthReports()
                val reports = when (reportsResult) {
                    is ApiResult.Success -> reportsResult.data
                    is ApiResult.Error -> {
                        _uiState = _uiState.copy(
                            isLoading = false,
                            error = reportsResult.exception.message
                        )
                        return@launch
                    }
                }

                // Load red flag alerts
                val alertsResult = healthReportsService.getRedFlagAlerts()
                val alerts = when (alertsResult) {
                    is ApiResult.Success -> alertsResult.data
                    is ApiResult.Error -> emptyList() // Don't fail if alerts can't be loaded
                }

                // Load health metrics
                val metricsResult = healthReportsService.getHealthMetrics()
                val metrics = when (metricsResult) {
                    is ApiResult.Success -> metricsResult.data
                    is ApiResult.Error -> emptyList() // Don't fail if metrics can't be loaded
                }

                _uiState = _uiState.copy(
                    isLoading = false,
                    healthReports = reports,
                    redFlagAlerts = alerts,
                    healthMetrics = metrics
                )

            } catch (e: Exception) {
                _uiState = _uiState.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load health reports"
                )
            }
        }
    }

    fun uploadHealthReport() {
        viewModelScope.launch {
            _uiState = _uiState.copy(isUploading = true)
            
            try {
                // TODO: Implement file picker and upload logic
                // This would involve:
                // 1. Opening file picker for PDF/image selection
                // 2. Uploading file to backend
                // 3. Triggering AI analysis
                // 4. Refreshing the reports list
                
                // For now, just simulate upload
                kotlinx.coroutines.delay(2000)
                
                // Refresh reports after upload
                loadHealthReports()
                
            } catch (e: Exception) {
                _uiState = _uiState.copy(
                    isUploading = false,
                    error = e.message ?: "Failed to upload health report"
                )
            } finally {
                _uiState = _uiState.copy(isUploading = false)
            }
        }
    }

    fun markAlertAsRead(alertId: String) {
        viewModelScope.launch {
            try {
                val result = healthReportsService.markAlertAsRead(alertId)
                
                if (result is ApiResult.Success) {
                    // Update local state
                    _uiState = _uiState.copy(
                        redFlagAlerts = _uiState.redFlagAlerts.map { alert ->
                            if (alert.id == alertId) {
                                alert.copy(isRead = true)
                            } else {
                                alert
                            }
                        }
                    )
                }

            } catch (e: Exception) {
                // Handle error silently for this action
                println("Failed to mark alert as read: ${e.message}")
            }
        }
    }

    fun openReportDetails(reportId: String) {
        // TODO: Navigate to report details screen
        println("Opening report details for: $reportId")
    }

    fun openMetricDetails(metricType: String) {
        // TODO: Navigate to metric details/trends screen
        println("Opening metric details for: $metricType")
    }

    fun clearError() {
        _uiState = _uiState.copy(error = null)
    }

    fun requestPhysicianReview(reportId: String) {
        viewModelScope.launch {
            try {
                val result = healthReportsService.requestPhysicianReview(reportId)
                
                when (result) {
                    is ApiResult.Success -> {
                        // Show success message
                        // TODO: Implement success notification
                    }
                    is ApiResult.Error -> {
                        _uiState = _uiState.copy(
                            error = "Failed to request physician review: ${result.exception.message}"
                        )
                    }
                }

            } catch (e: Exception) {
                _uiState = _uiState.copy(
                    error = e.message ?: "Failed to request physician review"
                )
            }
        }
    }

    fun scheduleHealthCheckReminder(reminderType: String, intervalDays: Int) {
        viewModelScope.launch {
            try {
                val result = healthReportsService.scheduleHealthCheckReminder(reminderType, intervalDays)
                
                when (result) {
                    is ApiResult.Success -> {
                        // Show success message
                        // TODO: Implement success notification
                    }
                    is ApiResult.Error -> {
                        _uiState = _uiState.copy(
                            error = "Failed to schedule reminder: ${result.exception.message}"
                        )
                    }
                }

            } catch (e: Exception) {
                _uiState = _uiState.copy(
                    error = e.message ?: "Failed to schedule reminder"
                )
            }
        }
    }
}