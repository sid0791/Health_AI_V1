/**
 * Chat API Service
 * Integrates with backend domain-scoped chat service
 */

import apiRequest from './api'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  message: string
  timestamp: string
  metadata?: {
    processingTime?: number
    domainClassification?: {
      domain: string
      confidence: number
      isInScope: boolean
    }
    tokensUsed?: number
    aiProvider?: string
  }
}

export interface ChatSession {
  id: string
  userId: string
  type: 'health_consultation' | 'nutrition_advice' | 'fitness_guidance' | 'general_health'
  status: 'active' | 'paused' | 'completed'
  title?: string
  messages: ChatMessage[]
  context?: {
    userProfile?: unknown
    recentMealPlans?: string[]
    recentHealthReports?: string[]
    currentGoals?: string[]
  }
  createdAt: string
  lastActivity: string
}

export interface ChatRequest {
  message: string
  sessionId?: string
  sessionType?: 'health_consultation' | 'nutrition_advice' | 'fitness_guidance' | 'general_health'
  context?: Record<string, unknown>
  userPreferences?: {
    language?: 'en' | 'hi' | 'hinglish'
    responseStyle?: 'detailed' | 'concise' | 'friendly'
    domainFocus?: string[]
  }
}

export interface ChatResponse {
  success: boolean
  sessionId: string
  messageId: string
  response: string
  metadata: {
    processingTime: number
    domainClassification: {
      domain: string
      confidence: number
      isInScope: boolean
    }
    suggestedFollowUps?: string[]
    tokensUsed: number
    aiProvider: string
    responseQuality: number
  }
  warnings?: string[]
  restrictions?: {
    isOutOfScope: boolean
    reason?: string
    allowedTopics: string[]
  }
}

export interface SuggestedQuestion {
  id: string
  question: string
  category: 'nutrition' | 'fitness' | 'health' | 'meal_planning' | 'general'
  context?: Record<string, unknown>
}

class ChatService {
  /**
   * Send a message to the AI chat assistant
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return apiRequest<ChatResponse>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get chat session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    return apiRequest<ChatSession>(`/chat/sessions/${sessionId}`)
  }

  /**
   * Get user's chat sessions
   */
  async getUserSessions(
    userId: string,
    options?: {
      status?: 'active' | 'paused' | 'completed'
      type?: string
      limit?: number
      offset?: number
    }
  ): Promise<ChatSession[]> {
    const params = new URLSearchParams()
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    return apiRequest<ChatSession[]>(`/chat/users/${userId}/sessions?${params.toString()}`)
  }

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    type: 'health_consultation' | 'nutrition_advice' | 'fitness_guidance' | 'general_health',
    context?: Record<string, unknown>
  ): Promise<ChatSession> {
    return apiRequest<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        type,
        context,
      }),
    })
  }

  /**
   * Update session context (e.g., when user profile changes)
   */
  async updateSessionContext(
    sessionId: string,
    context: Record<string, unknown>
  ): Promise<ChatSession> {
    return apiRequest<ChatSession>(`/chat/sessions/${sessionId}/context`, {
      method: 'PATCH',
      body: JSON.stringify({ context }),
    })
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<void> {
    await apiRequest(`/chat/sessions/${sessionId}/end`, {
      method: 'PATCH',
    })
  }

  /**
   * Get suggested questions based on user context
   */
  async getSuggestedQuestions(
    userId: string,
    context?: {
      currentPage?: string
      recentActivity?: string[]
      userGoals?: string[]
    }
  ): Promise<SuggestedQuestion[]> {
    return apiRequest<SuggestedQuestion[]>('/chat/suggested-questions', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        context,
      }),
    })
  }

  /**
   * Get chat history for a specific session
   */
  async getSessionHistory(
    sessionId: string,
    options?: {
      limit?: number
      offset?: number
      messageType?: 'user' | 'assistant'
    }
  ): Promise<ChatMessage[]> {
    const params = new URLSearchParams()
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    return apiRequest<ChatMessage[]>(`/chat/sessions/${sessionId}/messages?${params.toString()}`)
  }

  /**
   * Report inappropriate content or issues
   */
  async reportMessage(
    messageId: string,
    reason: 'inappropriate' | 'incorrect' | 'unsafe' | 'other',
    details?: string
  ): Promise<void> {
    await apiRequest('/chat/report', {
      method: 'POST',
      body: JSON.stringify({
        messageId,
        reason,
        details,
      }),
    })
  }

  /**
   * Get user's token usage and limits
   */
  async getTokenUsage(userId: string): Promise<{
    dailyUsage: number
    dailyLimit: number
    currentTier: number
    resetTime: string
    estimatedCost: number
  }> {
    return apiRequest(`/chat/users/${userId}/token-usage`)
  }

  /**
   * Test if a message would be in scope before sending
   */
  async validateMessage(message: string): Promise<{
    isInScope: boolean
    domain: string
    confidence: number
    suggestions?: string[]
  }> {
    return apiRequest('/chat/validate', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }
}

export const chatService = new ChatService()
export default chatService