'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  PaperAirplaneIcon,
  MicrophoneIcon,
  PlusIcon,
  ClockIcon,
  HeartIcon,
  BeakerIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useApiCall, useAutoFetch } from '../../hooks/useApi'
import chatService, { ChatMessage, ChatSession, SuggestedQuestion } from '../../services/chatService'

const quickActions = [
  { icon: BeakerIcon, label: 'Log Food', color: 'bg-blue-100 text-blue-700' },
  { icon: HeartIcon, label: 'Health Tips', color: 'bg-red-100 text-red-700' },
  { icon: LightBulbIcon, label: 'Meal Ideas', color: 'bg-yellow-100 text-yellow-700' },
  { icon: ClockIcon, label: 'Schedule', color: 'bg-green-100 text-green-700' },
]

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedQuestionCategory, setSelectedQuestionCategory] = useState<string>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock user ID - in real app this would come from auth context
  const userId = 'user_123'

  // Get current chat session
  const [sessionState, { refetch: refetchSession }] = useAutoFetch(
    () => currentSessionId ? chatService.getSession(currentSessionId) : Promise.resolve(null),
    [],
    { enabled: !!currentSessionId, retryCount: 1 }
  )

  // Get suggested questions
  const [suggestedQuestionsState] = useAutoFetch(
    () => chatService.getSuggestedQuestions(userId, {
      currentPage: 'chat',
      userGoals: ['weight_loss', 'muscle_gain']
    }),
    [],
    { enabled: true, retryCount: 1 }
  )

  // Send message
  const [messageState, { execute: sendMessage }] = useApiCall(
    chatService.sendMessage
  )

  // Create session
  const [createSessionState, { execute: createSession }] = useApiCall(
    chatService.createSession
  )

  const currentSession = sessionState.data
  const messages = currentSession?.messages || []
  const suggestedQuestions = suggestedQuestionsState.data || []

  // Create initial session
  useEffect(() => {
    if (!currentSessionId && !createSessionState.loading) {
      initializeSession()
    }
  }, [currentSessionId, createSessionState.loading])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeSession = async () => {
    const session = await createSession(userId, 'general_health', {
      userGoals: ['weight_loss', 'muscle_gain'],
      currentPage: 'chat'
    })
    
    if (session) {
      setCurrentSessionId(session.id)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentSessionId || messageState.loading) return

    const userMessage = message.trim()
    setMessage('')

    const response = await sendMessage({
      message: userMessage,
      sessionId: currentSessionId,
      sessionType: 'general_health',
      userPreferences: {
        language: 'en',
        responseStyle: 'friendly'
      }
    })

    if (response?.success) {
      await refetchSession()
    }
  }

  const handleSuggestedQuestion = async (question: string) => {
    if (!currentSessionId || messageState.loading) return

    const response = await sendMessage({
      message: question,
      sessionId: currentSessionId,
      sessionType: 'general_health',
      userPreferences: {
        language: 'en',
        responseStyle: 'detailed'
      }
    })

    if (response?.success) {
      await refetchSession()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Show loading state while creating session
  if (createSessionState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing AI Health Assistant...</h2>
          <p className="text-gray-600">Setting up your personalized chat experience.</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (createSessionState.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Start Chat</h2>
          <p className="text-gray-600 mb-4">{createSessionState.error}</p>
          <button
            onClick={initializeSession}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-display">
              AI Health Coach
            </h1>
            <p className="text-sm text-gray-600">
              Your personal nutrition and wellness assistant
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {currentSession ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            {messageState.loading && (
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                <span className="text-sm text-gray-600">AI thinking...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex space-x-2 overflow-x-auto">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${action.color}`}
            >
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !messageState.loading && (
          <div className="text-center py-8">
            <div className="max-w-md mx-auto">
              <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to AI Health Coach!</h3>
              <p className="text-gray-600 mb-4">
                I&apos;m here to help with your nutrition, fitness, and health questions. 
                Ask me anything about your wellness journey!
              </p>
              <p className="text-sm text-gray-500">
                🔒 This chat is domain-restricted to health, nutrition, and fitness topics only.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
              msg.type === 'user' 
                ? 'bg-primary-500 text-white' 
                : 'bg-white border border-gray-200 text-gray-900'
            }`}>
              <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
              <div className={`text-xs mt-2 ${
                msg.type === 'user' ? 'text-primary-100' : 'text-gray-500'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              {msg.metadata?.domainClassification && !msg.metadata.domainClassification.isInScope && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ This question is outside my health expertise. I can only help with nutrition, fitness, and wellness topics.
                </div>
              )}
            </div>
          </div>
        ))}

        {messageState.loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-xs lg:max-w-md">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">AI is analyzing your question...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {(messages.length === 0 || suggestedQuestions.length > 0) && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Suggested questions:</h3>
            <select 
              value={selectedQuestionCategory}
              onChange={(e) => setSelectedQuestionCategory(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Categories</option>
              <option value="nutrition">Nutrition</option>
              <option value="fitness">Fitness</option>
              <option value="health">Health</option>
              <option value="meal_planning">Meal Planning</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedQuestions
              .filter(q => selectedQuestionCategory === 'all' || q.category === selectedQuestionCategory)
              .slice(0, 6)
              .map((questionObj) => (
              <button
                key={questionObj.id}
                onClick={() => handleSuggestedQuestion(questionObj.question)}
                disabled={messageState.loading}
                className="text-left p-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <span className="block text-xs text-gray-500 mb-1 capitalize">{questionObj.category}</span>
                {questionObj.question}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-3">
          <button className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <PlusIcon className="h-5 w-5" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me about nutrition, health, meal planning, or fitness..."
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent max-h-32"
              rows={1}
              disabled={messageState.loading}
            />
          </div>

          <button className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <MicrophoneIcon className="h-5 w-5" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || messageState.loading}
            className="flex-shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>🔒 Health-focused AI • English, Hindi & Hinglish supported</span>
        </div>

        {messageState.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            Failed to send message: {messageState.error}
          </div>
        )}
      </div>
    </div>
  )
}