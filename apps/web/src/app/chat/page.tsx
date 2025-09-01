'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  PaperAirplaneIcon,
  MicrophoneIcon,
  PlusIcon,
  ClockIcon,
  HeartIcon,
  BeakerIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

const suggestedQuestions = [
  "What should I eat for dinner tonight?",
  "How can I increase my protein intake?",
  "What exercises are good for weight loss?",
  "Can you analyze my recent blood test?",
  "Suggest a healthy breakfast recipe",
  "How much water should I drink daily?"
]

const chatHistory = [
  {
    id: 1,
    type: 'user' as const,
    message: "I'm feeling tired after lunch. What could be causing this?",
    timestamp: '2:30 PM'
  },
  {
    id: 2,
    type: 'assistant' as const,
    message: "Post-lunch fatigue is common and can be caused by several factors:\n\n1. **Blood sugar fluctuations** - Large, carb-heavy meals can cause energy crashes\n2. **Natural circadian rhythm** - Your body naturally dips in energy around 1-3 PM\n3. **Dehydration** - Not drinking enough water affects energy levels\n\n**Recommendations:**\n- Eat smaller, balanced meals with protein and fiber\n- Take a 10-15 minute walk after eating\n- Stay hydrated throughout the day\n- Consider a 20-minute power nap if possible\n\nWhat did you have for lunch today? I can provide more specific advice based on your meal.",
    timestamp: '2:31 PM'
  },
  {
    id: 3,
    type: 'user' as const,
    message: "I had dal rice and sabzi around 1 PM",
    timestamp: '2:35 PM'
  },
  {
    id: 4,
    type: 'assistant' as const,
    message: "Dal rice with sabzi is a nutritious, balanced meal! However, the timing and portion size might be contributing to your fatigue:\n\n**Analysis of your meal:**\n✅ Good protein from dal\n✅ Complex carbs from rice\n✅ Vitamins and fiber from sabzi\n\n**Possible adjustments:**\n- Try eating a smaller portion of rice\n- Add some yogurt or buttermilk to aid digestion\n- Include a small salad for extra fiber\n- Eat around 12:30 PM instead of 1 PM\n\n**Quick energy boost for now:**\n- Drink a glass of water\n- Take 5 deep breaths\n- Do some light stretching\n\nWould you like me to suggest some energizing afternoon snacks for the future?",
    timestamp: '2:36 PM'
  }
]

const quickActions = [
  { icon: BeakerIcon, label: 'Log Food', color: 'bg-blue-100 text-blue-700' },
  { icon: HeartIcon, label: 'Health Tips', color: 'bg-red-100 text-red-700' },
  { icon: LightBulbIcon, label: 'Meal Ideas', color: 'bg-yellow-100 text-yellow-700' },
  { icon: ClockIcon, label: 'Schedule', color: 'bg-green-100 text-green-700' },
]

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState(chatHistory)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!message.trim()) return

    const newMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, newMessage])
    setMessage('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I understand your question about nutrition. Let me provide you with some personalized recommendations based on your health profile and goals.",
        "That's a great question! Based on your previous meal logs, I can suggest some specific options that align with your dietary preferences.",
        "Thank you for sharing that information. Let me analyze this and provide you with evidence-based recommendations.",
        "I can help you with that! Here are some tailored suggestions based on your health data and preferences."
      ]
      
      const aiResponse = {
        id: messages.length + 2,
        type: 'assistant' as const,
        message: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question)
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
              <span className="text-sm text-gray-600">Online</span>
            </div>
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
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-xs lg:max-w-md">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (show only when chat is empty) */}
      {messages.length === 0 && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Suggested questions:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
              >
                {question}
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
              onKeyPress={handleKeyPress}
              placeholder="Ask me about nutrition, health, meal planning, or upload a food photo..."
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent max-h-32"
              rows={1}
              disabled={isLoading}
            />
          </div>

          <button className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <MicrophoneIcon className="h-5 w-5" />
          </button>

          <button
            onClick={sendMessage}
            disabled={!message.trim() || isLoading}
            className="flex-shrink-0 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>English, Hindi & Hinglish supported</span>
        </div>
      </div>
    </div>
  )
}