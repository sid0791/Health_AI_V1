'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai' as const,
      content: "Hi! I'm your personal health coach AI. How can I help you today? You can ask me about nutrition, fitness, or any health-related questions.",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai' as const,
        content: generateAIResponse(inputMessage),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('meal') || lowerInput.includes('food') || lowerInput.includes('nutrition')) {
      return "Based on your dietary preferences, I'd recommend focusing on whole foods with a good balance of protein, healthy fats, and complex carbohydrates. Would you like me to suggest a specific meal plan or recipe?";
    }
    
    if (lowerInput.includes('exercise') || lowerInput.includes('workout') || lowerInput.includes('fitness')) {
      return "Great question about fitness! For optimal results, I recommend combining cardiovascular exercise with strength training. What's your current fitness level and what are your goals?";
    }
    
    if (lowerInput.includes('weight') || lowerInput.includes('lose') || lowerInput.includes('gain')) {
      return "Weight management is about creating sustainable habits. The key is finding the right balance of nutrition and physical activity that works for your lifestyle. What specific weight goals do you have?";
    }
    
    return "That's an interesting question! I'm here to help with all aspects of your health journey. Could you tell me more about what specific area you'd like guidance on - nutrition, fitness, sleep, or something else?";
  };

  const quickPrompts = [
    "Create a meal plan for weight loss",
    "What's a good beginner workout routine?",
    "How can I improve my sleep quality?",
    "Suggest healthy snack options",
  ];

  return (
    <div className="min-h-screen bg-background-primary">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">AI Health Coach Chat</h1>
          <p className="text-text-secondary mt-1">Get personalized health advice powered by AI</p>
        </div>

        {/* Chat Container */}
        <div className="card h-96 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-primary-100 rounded-lg p-3 max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about your health..."
              className="flex-1 input"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="btn-primary"
            >
              Send
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Try asking:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(prompt)}
                className="text-left p-3 bg-background-secondary hover:bg-primary-50 rounded-lg text-text-secondary hover:text-primary-600 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-warning-50 rounded-lg">
          <p className="text-sm text-warning-800">
            <strong>Disclaimer:</strong> This AI health coach provides general wellness information and suggestions. 
            Always consult with healthcare professionals for medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { 
  message: { id: number; type: 'user' | 'ai'; content: string; timestamp: Date } 
}) {
  const isAI = message.type === 'ai';
  
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`rounded-lg p-3 max-w-xs md:max-w-md ${
        isAI 
          ? 'bg-primary-100 text-text-primary' 
          : 'bg-primary-500 text-white'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${
          isAI ? 'text-text-secondary' : 'text-primary-100'
        }`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}