'use client'

import { useState, useEffect, useRef } from 'react'
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize chat with welcome message
  useEffect(() => {
    if (!initialized) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: "Hi! I'm your AI Health Coach. I can help you with meal planning, fitness advice, and health insights. What would you like to know?",
          timestamp: new Date().toISOString()
        }
      ])
      setInitialized(true)
    }
  }, [initialized])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Mock AI response - in real app this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))

      let response = "I'm here to help with your health and nutrition goals. "
      const userMsg = userMessage.content.toLowerCase()
      
      if (userMsg.includes('protein')) {
        response = "Great question about protein! For most adults, aim for 0.8-1g of protein per kg of body weight daily. Good sources include lean meats, fish, eggs, beans, and Greek yogurt. Would you like specific meal suggestions?"
      } else if (userMsg.includes('weight')) {
        response = "Weight management involves balancing calories in vs calories out. Focus on whole foods, regular exercise, and staying hydrated. I can help create a personalized plan based on your goals!"
      } else if (userMsg.includes('meal') || userMsg.includes('food')) {
        response = "I'd be happy to help with meal planning! A balanced plate should include lean protein, complex carbs, healthy fats, and plenty of vegetables. What are your dietary preferences?"
      } else if (userMsg.includes('exercise') || userMsg.includes('workout')) {
        response = "For effective workouts, combine cardio and strength training. Aim for 150 minutes of moderate cardio per week plus 2-3 strength sessions. What's your current fitness level?"
      } else {
        response += "I can help with meal planning, nutrition advice, fitness guidance, and analyzing health reports. What specific area would you like to explore?"
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
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

  const suggestedQuestions = [
    "How can I improve my protein intake?",
    "What exercises are best for weight loss?",
    "Help me plan meals for this week",
    "How much water should I drink daily?"
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <SparklesIcon className="h-6 w-6 text-primary-600 mr-2" />
          <h1 className="text-lg font-semibold text-gray-900">AI Health Coach</h1>
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
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
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
            <p className="text-sm text-gray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
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
              placeholder="Ask about nutrition, fitness, or health..."
              rows={1}
              className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              style={{ minHeight: '40px', maxHeight: '120px' }}
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