package com.healthcoachai.app.services

import com.healthcoachai.app.data.*
import com.healthcoachai.app.network.ApiClient
import com.healthcoachai.app.network.ApiResult

/**
 * Chat Service
 * Integrates with backend domain-scoped AI chat service
 */
class ChatService(private val apiClient: ApiClient) {

    /**
     * Create a new chat session
     */
    suspend fun createSession(
        userId: String,
        sessionType: String,
        context: Map<String, String>? = null
    ): ApiResult<ChatSession> {
        return apiClient.request(
            endpoint = "/chat/sessions",
            method = "POST",
            body = mapOf(
                "userId" to userId,
                "sessionType" to sessionType,
                "context" to context
            )
        )
    }

    /**
     * Get chat session with messages
     */
    suspend fun getSession(sessionId: String): ApiResult<ChatSession> {
        return apiClient.request("/chat/sessions/$sessionId")
    }

    /**
     * Send a message to the AI assistant
     */
    suspend fun sendMessage(request: SendMessageRequest): ApiResult<SendMessageResponse> {
        return apiClient.request(
            endpoint = "/chat/message",
            method = "POST",
            body = request
        )
    }

    /**
     * Get suggested questions based on user context
     */
    suspend fun getSuggestedQuestions(
        userId: String,
        context: SuggestedQuestionsRequest
    ): ApiResult<List<SuggestedQuestion>> {
        return apiClient.request(
            endpoint = "/chat/suggested-questions",
            method = "POST",
            body = mapOf(
                "userId" to userId,
                "context" to context
            )
        )
    }

    /**
     * Get chat history for user
     */
    suspend fun getChatHistory(
        userId: String,
        limit: Int = 50,
        offset: Int = 0
    ): ApiResult<List<ChatSession>> {
        return apiClient.request("/chat/sessions?userId=$userId&limit=$limit&offset=$offset")
    }

    /**
     * Delete a chat session
     */
    suspend fun deleteSession(sessionId: String): ApiResult<Unit> {
        return apiClient.request(
            endpoint = "/chat/sessions/$sessionId",
            method = "DELETE"
        )
    }

    /**
     * Mark messages as read
     */
    suspend fun markMessagesAsRead(sessionId: String, messageIds: List<String>): ApiResult<Unit> {
        return apiClient.request(
            endpoint = "/chat/sessions/$sessionId/mark-read",
            method = "POST",
            body = mapOf("messageIds" to messageIds)
        )
    }

    /**
     * Get AI capabilities and restrictions info
     */
    suspend fun getAiCapabilities(): ApiResult<AiCapabilities> {
        return apiClient.request("/chat/capabilities")
    }
}

@kotlinx.serialization.Serializable
data class AiCapabilities(
    val allowedTopics: List<String>,
    val restrictedTopics: List<String>,
    val supportedLanguages: List<String>,
    val features: List<String>
)