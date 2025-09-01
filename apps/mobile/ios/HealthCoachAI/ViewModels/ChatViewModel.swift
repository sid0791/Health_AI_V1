import Foundation
import Combine

// MARK: - Chat UI State

struct ChatUiState {
    var isInitializing: Bool = false
    var isConnected: Bool = false
    var isSending: Bool = false
    var isLoadingHistory: Bool = false
    var isLoadingSuggestions: Bool = false
    var currentSession: ChatSession? = nil
    var messages: [ChatMessage] = []
    var suggestedQuestions: [SuggestedQuestion] = []
    var aiCapabilities: AiCapabilities? = nil
    var error: String? = nil
    var connectionStatus: String = "Disconnected"
}

// MARK: - Chat ViewModel

@MainActor
class ChatViewModel: ObservableObject {
    @Published var uiState = ChatUiState()
    
    private let chatService = ChatService.shared
    private let costService = CostOptimizationService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // Mock user ID - in real app this would come from auth context
    private let userId = "user_123"
    
    init() {
        initializeChat()
        observeCostUpdates()
    }
    
    // MARK: - Initialization
    
    func initializeChat() {
        Task {
            uiState.isInitializing = true
            uiState.error = nil
            
            do {
                // Create chat session
                let session = try await chatService.createSession(
                    userId: userId,
                    sessionType: "general_health",
                    context: [
                        "userGoals": "weight_loss,muscle_gain",
                        "currentPage": "chat"
                    ]
                )
                
                uiState.isInitializing = false
                uiState.isConnected = true
                uiState.currentSession = session
                uiState.connectionStatus = "Connected"
                uiState.error = nil
                
                // Load AI capabilities
                await loadAiCapabilities()
                
                // Load suggested questions
                await loadSuggestedQuestions()
                
                // Load existing messages if any
                if let messages = session.messages {
                    uiState.messages = messages
                }
                
            } catch {
                uiState.isInitializing = false
                uiState.isConnected = false
                uiState.connectionStatus = "Failed to connect"
                uiState.error = "Failed to initialize chat: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Message Handling
    
    func sendMessage(_ messageText: String) {
        guard let session = uiState.currentSession else { return }
        
        Task {
            // Add user message to UI immediately
            let userMessage = ChatMessage(
                id: "temp_\(Date().timeIntervalSince1970)",
                type: "user",
                message: messageText,
                timestamp: Date(),
                processingStatus: nil,
                metadata: nil,
                ragSources: nil,
                actionRequests: nil,
                tokenCount: nil,
                costUsd: nil
            )
            
            uiState.messages.append(userMessage)
            uiState.isSending = true
            uiState.error = nil
            
            do {
                // Send message with domain restrictions and cost optimization
                let request = SendMessageRequest(
                    message: messageText,
                    sessionId: session.id,
                    sessionType: "general_health",
                    context: [
                        "domain_restriction": "health_nutrition_fitness_only",
                        "cost_optimization": "enabled"
                    ],
                    userPreferences: UserPreferences(
                        language: "en",
                        responseStyle: "friendly",
                        domainFocus: ["health", "nutrition", "fitness", "diet", "mental_wellbeing"]
                    )
                )
                
                let response = try await chatService.sendMessage(request: request)
                
                // Update UI with response
                uiState.isSending = false
                
                // Replace temporary user message with actual one
                if let index = uiState.messages.firstIndex(where: { $0.id == userMessage.id }) {
                    uiState.messages[index] = ChatMessage(
                        id: response.messageId,
                        type: "user",
                        message: messageText,
                        timestamp: Date(),
                        processingStatus: "completed",
                        metadata: nil,
                        ragSources: nil,
                        actionRequests: nil,
                        tokenCount: nil,
                        costUsd: nil
                    )
                }
                
                // Add assistant response
                uiState.messages.append(response.response)
                
                // Update quota status if provided
                if let quotaStatus = response.quotaStatus {
                    costService.quotaStatus = quotaStatus
                    costService.isNearLimit = quotaStatus.isNearLimit
                    costService.isOverLimit = quotaStatus.isOverLimit
                }
                
                // Track usage for cost optimization
                await costService.trackUsage(
                    userId: userId,
                    endpoint: "/chat/message",
                    method: "POST",
                    tokenCount: response.response.tokenCount,
                    cost: response.response.costUsd
                )
                
                // Refresh suggested questions based on conversation
                await loadSuggestedQuestions()
                
            } catch {
                uiState.isSending = false
                uiState.error = "Failed to send message: \(error.localizedDescription)"
                
                // Remove the temporary user message on error
                uiState.messages.removeAll { $0.id == userMessage.id }
            }
        }
    }
    
    func sendSuggestedQuestion(_ question: SuggestedQuestion) {
        sendMessage(question.question)
    }
    
    // MARK: - Data Loading
    
    private func loadAiCapabilities() async {
        do {
            let capabilities = try await chatService.getAiCapabilities()
            uiState.aiCapabilities = capabilities
        } catch {
            print("Failed to load AI capabilities: \(error.localizedDescription)")
        }
    }
    
    private func loadSuggestedQuestions() async {
        uiState.isLoadingSuggestions = true
        
        do {
            let context = SuggestedQuestionsRequest(
                currentGoals: ["weight_loss", "muscle_gain"],
                healthConditions: nil,
                preferences: ["healthy_eating", "fitness"],
                currentPage: "chat"
            )
            
            let questions = try await chatService.getSuggestedQuestions(
                userId: userId,
                context: context
            )
            
            uiState.suggestedQuestions = questions
            uiState.isLoadingSuggestions = false
            
        } catch {
            uiState.isLoadingSuggestions = false
            print("Failed to load suggested questions: \(error.localizedDescription)")
        }
    }
    
    func loadChatHistory() async {
        guard let sessionId = uiState.currentSession?.id else { return }
        
        uiState.isLoadingHistory = true
        
        do {
            let messages = try await chatService.getChatMessages(sessionId: sessionId)
            uiState.messages = messages
            uiState.isLoadingHistory = false
        } catch {
            uiState.isLoadingHistory = false
            uiState.error = "Failed to load chat history: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Session Management
    
    func createNewSession() {
        uiState.currentSession = nil
        uiState.messages = []
        uiState.error = nil
        initializeChat()
    }
    
    func deleteCurrentSession() {
        guard let sessionId = uiState.currentSession?.id else { return }
        
        Task {
            do {
                try await chatService.deleteSession(sessionId: sessionId)
                uiState.currentSession = nil
                uiState.messages = []
                uiState.isConnected = false
                uiState.connectionStatus = "Disconnected"
            } catch {
                uiState.error = "Failed to delete session: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Cost Optimization
    
    private func observeCostUpdates() {
        costService.$isNearLimit
            .sink { [weak self] isNearLimit in
                if isNearLimit {
                    self?.uiState.error = "You're approaching your daily AI usage limit. Consider using optimized templates."
                }
            }
            .store(in: &cancellables)
        
        costService.$isOverLimit
            .sink { [weak self] isOverLimit in
                if isOverLimit {
                    self?.uiState.error = "You've exceeded your daily AI usage limit. Please upgrade your plan or wait until tomorrow."
                }
            }
            .store(in: &cancellables)
    }
    
    func executeOptimizedPrompt(templateId: String, variables: [String: Any]) async {
        guard costService.shouldOptimizeForCost() else {
            // Use regular messaging if not over limits
            return
        }
        
        do {
            let response = try await costService.executeOptimizedPrompt(
                userId: userId,
                templateId: templateId,
                variables: variables,
                category: "health_chat"
            )
            
            let assistantMessage = ChatMessage(
                id: UUID().uuidString,
                type: "assistant",
                message: response.response,
                timestamp: Date(),
                processingStatus: "completed",
                metadata: ChatMessageMetadata(
                    domainClassification: "health",
                    confidence: 0.95,
                    isInScope: true,
                    reason: "Optimized template response"
                ),
                ragSources: nil,
                actionRequests: nil,
                tokenCount: response.tokenCount,
                costUsd: response.costUsd
            )
            
            uiState.messages.append(assistantMessage)
            
        } catch {
            uiState.error = "Failed to execute optimized prompt: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Utility Methods
    
    func retryLastMessage() {
        guard let lastUserMessage = uiState.messages.last(where: { $0.type == "user" }) else { return }
        sendMessage(lastUserMessage.message)
    }
    
    func clearError() {
        uiState.error = nil
    }
    
    func getFilteredSuggestedQuestions(category: String) -> [SuggestedQuestion] {
        if category == "all" {
            return uiState.suggestedQuestions
        }
        return uiState.suggestedQuestions.filter { $0.category == category }
    }
}