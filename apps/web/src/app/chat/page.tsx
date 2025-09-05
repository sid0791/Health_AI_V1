'use client'

import { useState, useEffect, useRef } from 'react'
import { PaperAirplaneIcon, SparklesIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { getApiStatus, isUsingMockData } from '../../services/api'
import enhancedChatService, { EnhancedChatMessage, ChatSessionContext } from '../../services/enhancedChatService'
import ApiDisclaimer from '../../components/ApiDisclaimer'

type SessionType = 'nutrition_advice' | 'fitness_guidance' | 'health_consultation' | 'meal_planning'

export default function ChatPage() {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [currentSessionType, setCurrentSessionType] = useState<SessionType>('health_consultation')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize chat session
  useEffect(() => {
    if (!initialized) {
      initializeSession()
      setInitialized(true)
    }
  }, [initialized])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeSession = async () => {
    try {
      setIsLoading(true)
      
      // Create context with mock user data (in real app, this would come from auth/profile)
      const context: ChatSessionContext = {
        userProfile: {
          age: 28,
          gender: 'female',
          activityLevel: 'moderate'
        },
        healthConditions: ['none'],
        allergies: [],
        fitnessGoals: ['general_fitness', 'weight_maintenance']
      }

      const { sessionId: newSessionId, welcomeMessage } = await enhancedChatService.startHealthSession(
        currentSessionType,
        context
      )
      
      setSessionId(newSessionId)
      setMessages([welcomeMessage])
    } catch (error) {
      console.error('Error initializing session:', error)
      // Fallback welcome message
      const fallbackMessage: EnhancedChatMessage = {
        id: '1',
        role: 'assistant',
        content: "Hi! I'm your AI Health Coach. I can help you with nutrition advice, fitness guidance, health consultations, and meal planning. What would you like to know?",
        timestamp: new Date().toISOString(),
        metadata: {
          aiProvider: 'fallback',
          domainClassification: {
            domain: 'health',
            confidence: 1.0,
            isInScope: true
          }
        }
      }
      setMessages([fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: EnhancedChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Use the enhanced chat service
      const aiResponse = await enhancedChatService.sendHealthMessage(userMessage.content)
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Fallback response
      const fallbackResponse: EnhancedChatMessage = {
        id: `fallback-${Date.now()}`,
        role: 'assistant',
        content: "I'm here to help with your health questions. Could you please rephrase your question or try asking about nutrition, fitness, or general health topics?",
        timestamp: new Date().toISOString(),
        metadata: {
          aiProvider: 'fallback',
          processingTime: 500
        }
      }
      setMessages(prev => [...prev, fallbackResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionTypeChange = async (newType: SessionType) => {
    if (newType === currentSessionType) return
    
    setCurrentSessionType(newType)
    setIsLoading(true)
    
    try {
      // End current session
      await enhancedChatService.endSession()
      
      // Start new session with new type
      const context: ChatSessionContext = {
        userProfile: {
          age: 28,
          gender: 'female',
          activityLevel: 'moderate'
        },
        healthConditions: newType === 'health_consultation' ? ['hypertension'] : [],
        allergies: newType === 'nutrition_advice' ? ['nuts'] : [],
        fitnessGoals: newType === 'fitness_guidance' ? ['weight_loss', 'strength_building'] : []
      }

      const { sessionId: newSessionId, welcomeMessage } = await enhancedChatService.startHealthSession(
        newType,
        context
      )
      
      setSessionId(newSessionId)
      setMessages([welcomeMessage])
    } catch (error) {
      console.error('Error changing session type:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getSessionTypeIcon = (type: SessionType) => {
    const icons = {
      health_consultation: '🩺',
      nutrition_advice: '🥗',
      fitness_guidance: '💪',
      meal_planning: '🍽️'
    }
    return icons[type]
  }

  const getSessionTypeLabel = (type: SessionType) => {
    const labels = {
      health_consultation: 'Health Consultation',
      nutrition_advice: 'Nutrition Advice',
      fitness_guidance: 'Fitness Guidance',
      meal_planning: 'Meal Planning'
    }
    return labels[type]
  }

  const suggestedQuestions = {
    health_consultation: [
      "What do my recent blood test results mean?",
      "I have high blood pressure, what foods should I avoid?",
      "How can I improve my sleep quality?",
      "What supplements should I consider?"
    ],
    nutrition_advice: [
      "How can I increase my protein intake?",
      "What are the best foods for heart health?",
      "Help me plan balanced meals for weight loss",
      "How much water should I drink daily?"
    ],
    fitness_guidance: [
      "What exercises are best for weight loss?",
      "How can I build muscle at home?",
      "Create a workout plan for beginners",
      "How often should I exercise per week?"
    ],
    meal_planning: [
      "Plan my meals for this week",
      "Suggest healthy breakfast options",
      "What are good post-workout meals?",
      "Help me meal prep for busy weekdays"
    ]
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SparklesIcon className="h-6 w-6 text-primary-600 mr-2" />
            <h1 className="text-lg font-semibold text-gray-900">AI Health Coach</h1>
            {sessionId && (
              <span className="ml-2 text-xs text-gray-500">
                Session: {sessionId.slice(-8)}
              </span>
            )}
          </div>
          
          {/* Session Type Selector */}
          <div className="flex items-center space-x-2">
            <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-400" />
            <select
              value={currentSessionType}
              onChange={(e) => handleSessionTypeChange(e.target.value as SessionType)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
              disabled={isLoading}
            >
              <option value="health_consultation">🩺 Health Consultation</option>
              <option value="nutrition_advice">🥗 Nutrition Advice</option>
              <option value="fitness_guidance">💪 Fitness Guidance</option>
              <option value="meal_planning">🍽️ Meal Planning</option>
            </select>
          </div>
        </div>
      </div>

      {/* API Status Disclaimer */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <ApiDisclaimer 
            mode={isUsingMockData() ? 'mock' : 'real'} 
            className="mb-0"
            customMessage={isUsingMockData() 
              ? "AI Chat is using intelligent fallback responses. Connect to backend for real AI integration."
              : "✅ Connected to real AI Chat API with domain-scoped health expertise"
            }
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* AI Metadata */}
                {message.role === 'assistant' && message.metadata && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span>
                        {message.metadata.aiProvider && (
                          <>🤖 {message.metadata.aiProvider}</>
                        )}
                        {message.metadata.processingTime && (
                          <> • ⏱️ {message.metadata.processingTime}ms</>
                        )}
                      </span>
                      {message.metadata.domainClassification && (
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          message.metadata.domainClassification.isInScope
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {message.metadata.domainClassification.domain}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 ml-2">AI is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 px-4 py-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 mb-2 flex items-center">
              {getSessionTypeIcon(currentSessionType)} Try asking about {getSessionTypeLabel(currentSessionType).toLowerCase()}:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions[currentSessionType].map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(question)}
                  className="px-3 py-1 text-sm bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${getSessionTypeLabel(currentSessionType).toLowerCase()}...`}
              rows={1}
              className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}