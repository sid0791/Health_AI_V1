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
 * Manages AI chat functionality and UI state
 */
class ChatViewModel : ViewModel() {
    
    private val apiClient = ApiClient()
    private val chatService = ChatService(apiClient)
    
    // UI State
    var uiState by mutableStateOf(ChatUiState())
        private set
    
    // Mock user ID - in real app this would come from auth context
    private val userId = "user_123"
    
    init {
        initializeChat()
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
                userPreferences = UserPreferences(
                    language = "en",
                    responseStyle = "friendly"
                )
            )
            
            when (val result = chatService.sendMessage(request)) {
                is ApiResult.Success -> {
                    if (result.data.success) {
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