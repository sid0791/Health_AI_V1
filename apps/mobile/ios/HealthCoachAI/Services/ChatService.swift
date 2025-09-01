import Foundation
import Combine

// MARK: - Chat Service

class ChatService: ObservableObject {
    static let shared = ChatService()
    
    private let apiService = APIService.shared
    
    private init() {}
    
    // MARK: - Session Management
    
    /**
     * Create a new chat session
     */
    func createSession(
        userId: String,
        sessionType: String,
        context: [String: String]? = nil
    ) async throws -> ChatSession {
        let requestBody = [
            "userId": userId,
            "sessionType": sessionType,
            "context": context as Any
        ]
        
        guard let session = try await apiService.request(
            endpoint: "/chat/sessions",
            method: .POST,
            body: requestBody,
            responseType: ChatSession.self
        ) else {
            throw APIError.decodingError(NSError(domain: "ChatService", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to create session"]))
        }
        
        return session
    }
    
    /**
     * Get chat session with messages
     */
    func getSession(sessionId: String) async throws -> ChatSession {
        guard let session = try await apiService.request(
            endpoint: "/chat/sessions/\(sessionId)",
            method: .GET,
            responseType: ChatSession.self
        ) else {
            throw APIError.notFound
        }
        
        return session
    }
    
    /**
     * Send a message to the AI assistant
     */
    func sendMessage(request: SendMessageRequest) async throws -> SendMessageResponse {
        guard let response = try await apiService.request(
            endpoint: "/chat/message",
            method: .POST,
            body: request,
            responseType: SendMessageResponse.self
        ) else {
            throw APIError.decodingError(NSError(domain: "ChatService", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to send message"]))
        }
        
        return response
    }
    
    /**
     * Get suggested questions based on user context
     */
    func getSuggestedQuestions(
        userId: String,
        context: SuggestedQuestionsRequest
    ) async throws -> [SuggestedQuestion] {
        let requestBody = [
            "userId": userId,
            "context": context
        ] as [String: Any]
        
        guard let questions = try await apiService.request(
            endpoint: "/chat/suggested-questions",
            method: .POST,
            body: requestBody,
            responseType: [SuggestedQuestion].self
        ) else {
            return []
        }
        
        return questions
    }
    
    /**
     * Get chat history for user
     */
    func getChatHistory(
        userId: String,
        limit: Int = 50,
        offset: Int = 0
    ) async throws -> [ChatSession] {
        guard let sessions = try await apiService.request(
            endpoint: "/chat/sessions?userId=\(userId)&limit=\(limit)&offset=\(offset)",
            method: .GET,
            responseType: [ChatSession].self
        ) else {
            return []
        }
        
        return sessions
    }
    
    /**
     * Get messages for a specific session
     */
    func getChatMessages(sessionId: String, limit: Int = 50) async throws -> [ChatMessage] {
        struct ChatHistoryResponse: Codable {
            let success: Bool
            let sessionId: String
            let messages: [ChatMessage]
            let total: Int
        }
        
        guard let response = try await apiService.request(
            endpoint: "/chat/sessions/\(sessionId)/history?limit=\(limit)",
            method: .GET,
            responseType: ChatHistoryResponse.self
        ) else {
            return []
        }
        
        return response.messages
    }
    
    /**
     * Delete a chat session
     */
    func deleteSession(sessionId: String) async throws {
        _ = try await apiService.request(
            endpoint: "/chat/sessions/\(sessionId)",
            method: .DELETE,
            responseType: EmptyResponse.self
        )
    }
    
    /**
     * Mark messages as read
     */
    func markMessagesAsRead(sessionId: String, messageIds: [String]) async throws {
        let requestBody = ["messageIds": messageIds]
        
        _ = try await apiService.request(
            endpoint: "/chat/sessions/\(sessionId)/mark-read",
            method: .POST,
            body: requestBody,
            responseType: EmptyResponse.self
        )
    }
    
    /**
     * Get AI capabilities and restrictions info
     */
    func getAiCapabilities() async throws -> AiCapabilities {
        guard let capabilities = try await apiService.request(
            endpoint: "/chat/capabilities",
            method: .GET,
            responseType: AiCapabilities.self
        ) else {
            throw APIError.decodingError(NSError(domain: "ChatService", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to get AI capabilities"]))
        }
        
        return capabilities
    }
}

// MARK: - Supporting Types

struct EmptyResponse: Codable {}