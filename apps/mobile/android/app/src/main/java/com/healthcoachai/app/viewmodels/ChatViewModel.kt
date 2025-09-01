package com.healthcoachai.app.viewmodels

import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.healthcoachai.app.data.*
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult
import com.healthcoachai.app.services.ChatService
import kotlinx.coroutines.launch

/**
 * ViewModel for Chat Screen
 * Manages AI chat functionality and UI state with cost optimization
 */
class ChatViewModel : ViewModel() {
    
    private val apiClient = ApiClient()
    private val chatService = ChatService(apiClient)
    private val costOptimizationService = CostOptimizationService(apiClient)
    
    // UI State
    var uiState by mutableStateOf(ChatUiState())
        private set
    
    // Cost optimization state
    val costMetrics = costOptimizationService.costMetrics
    val quotaStatus = costOptimizationService.quotaStatus
    val isNearLimit = costOptimizationService.isNearLimit
    val isOverLimit = costOptimizationService.isOverLimit
    
    // Mock user ID - in real app this would come from auth context
    private val userId = "user_123"
    
    init {
        initializeChat()
        startPeriodicCostUpdates()
    }
    
    private fun initializeChat() {
        viewModelScope.launch {
            uiState = uiState.copy(isInitializing = true, error = null)
            
            // Create chat session
            when (val sessionResult = chatService.createSession(
                userId = userId,
                sessionType = "general_health",
                context = mapOf(
                    "userGoals" to "weight_loss,muscle_gain",
                    "currentPage" to "chat"
                )
            )) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isInitializing = false,
                        isConnected = true,
                        currentSession = sessionResult.data,
                        error = null
                    )
                    
                    // Load suggested questions
                    loadSuggestedQuestions()
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        isInitializing = false,
                        isConnected = false,
                        error = "Failed to initialize chat: ${sessionResult.exception.message}"
                    )
                }
            }
        }
    }
    
    fun sendMessage(messageText: String) {
        val session = uiState.currentSession ?: return
        
        viewModelScope.launch {
            // Check if over limit
            if (costOptimizationService.isOverLimit.value) {
                uiState = uiState.copy(
                    sendError = "You've exceeded your daily AI usage limit. Please upgrade your plan or wait until tomorrow."
                )
                return@launch
            }
            
            // Add user message to UI immediately
            val userMessage = ChatMessage(
                id = "temp_${System.currentTimeMillis()}",
                type = "user",
                message = messageText,
                timestamp = getCurrentTimestamp()
            )
            
            uiState = uiState.copy(
                messages = uiState.messages + userMessage,
                isThinking = true,
                sendError = null
            )
            
            val request = SendMessageRequest(
                message = messageText,
                sessionId = session.id,
                sessionType = "general_health",
                context = mapOf(
                    "domain_restriction" to "health_nutrition_fitness_only",
                    "cost_optimization" to "enabled"
                ),
                userPreferences = UserPreferences(
                    language = "en",
                    responseStyle = "friendly",
                    domainFocus = listOf("health", "nutrition", "fitness", "diet", "mental_wellbeing")
                )
            )
            
            when (val result = chatService.sendMessage(request)) {
                is ApiResult.Success -> {
                    if (result.data.success) {
                        // Track usage for cost optimization
                        val response = result.data.response
                        costOptimizationService.trackUsage(
                            userId = userId,
                            endpoint = "/chat/message",
                            method = "POST",
                            tokenCount = response.tokenCount,
                            cost = response.costUsd
                        )
                        
                        // Update quota status if provided
                        result.data.quotaStatus?.let { quotaStatus ->
                            costOptimizationService.getQuotaStatus(userId)
                        }
                        
                        // Refresh session to get updated messages
                        refreshSession()
                    } else {
                        uiState = uiState.copy(
                            isThinking = false,
                            sendError = result.data.error ?: "Unknown error occurred"
                        )
                    }
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        isThinking = false,
                        sendError = "Failed to send message: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    private fun refreshSession() {
        val session = uiState.currentSession ?: return
        
        viewModelScope.launch {
            when (val result = chatService.getSession(session.id)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isThinking = false,
                        currentSession = result.data,
                        messages = result.data.messages,
                        sendError = null
                    )
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        isThinking = false,
                        sendError = "Failed to refresh messages: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    private fun loadSuggestedQuestions() {
        viewModelScope.launch {
            val request = SuggestedQuestionsRequest(
                currentPage = "chat",
                userGoals = listOf("weight_loss", "muscle_gain")
            )
            
            when (val result = chatService.getSuggestedQuestions(userId, request)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(suggestedQuestions = result.data)
                }
                is ApiResult.Error -> {
                    // Suggested questions are not critical, so we don't show error
                    // Just log it or handle silently
                    println("Failed to load suggested questions: ${result.exception.message}")
                }
            }
        }
    }
    
    fun retry() {
        uiState = uiState.copy(error = null)
        initializeChat()
    }
    
    fun clearSendError() {
        uiState = uiState.copy(sendError = null)
    }
    
    fun sendSuggestedQuestion(question: String) {
        sendMessage(question)
    }
    
    fun deleteSession() {
        val session = uiState.currentSession ?: return
        
        viewModelScope.launch {
            when (chatService.deleteSession(session.id)) {
                is ApiResult.Success -> {
                    // Reinitialize chat
                    initializeChat()
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        sendError = "Failed to delete session"
                    )
                }
            }
        }
    }
    
    private fun startPeriodicCostUpdates() {
        viewModelScope.launch {
            // Update cost metrics every 5 minutes
            while (true) {
                kotlinx.coroutines.delay(300_000) // 5 minutes
                costOptimizationService.getCostMetrics(userId)
                costOptimizationService.getQuotaStatus(userId)
            }
        }
    }
    
    fun executeOptimizedPrompt(templateId: String, variables: Map<String, Any>) {
        if (!costOptimizationService.shouldOptimizeForCost()) {
            // Use regular messaging if not over limits
            return
        }
        
        viewModelScope.launch {
            when (val result = costOptimizationService.executeOptimizedPrompt(
                userId = userId,
                templateId = templateId,
                variables = variables,
                category = "health_chat"
            )) {
                is ApiResult.Success -> {
                    val response = result.data
                    val assistantMessage = ChatMessage(
                        id = "optimized_${System.currentTimeMillis()}",
                        type = "assistant",
                        message = response.response,
                        timestamp = getCurrentTimestamp()
                    )
                    
                    uiState = uiState.copy(
                        messages = uiState.messages + assistantMessage
                    )
                }
                is ApiResult.Error -> {
                    uiState = uiState.copy(
                        sendError = "Failed to execute optimized prompt: ${result.exception.message}"
                    )
                }
            }
        }
    }
    
    fun getOptimizationRecommendations(): List<String> {
        return costOptimizationService.getOptimizationRecommendations()
    }
    
    private fun getCurrentTimestamp(): String {
        return java.time.Instant.now().toString()
    }
}

/**
 * UI state for chat screen
 */
data class ChatUiState(
    val isInitializing: Boolean = false,
    val isConnected: Boolean = false,
    val isThinking: Boolean = false,
    val currentSession: ChatSession? = null,
    val messages: List<ChatMessage> = emptyList(),
    val suggestedQuestions: List<SuggestedQuestion> = emptyList(),
    val error: String? = null,
    val sendError: String? = null
)