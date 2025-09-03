/**
 * API Service Layer for HealthCoach AI
 * Provides integration between frontend and backend services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' || false

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use mock responses for development when backend is not available
  if (USE_MOCK_API || endpoint.includes('/chat/') || endpoint.includes('/auth/') ) {
    return handleMockRequest<T>(endpoint, options)
  }

  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  if (token) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new APIError(response.status, errorData.message || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    console.error('API Request failed:', error)
    throw new APIError(0, 'Network error occurred')
  }
}

// Mock API responses for development
async function handleMockRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))

  const method = options.method || 'GET'

  // Chat endpoints
  if (endpoint.includes('/chat/suggestions')) {
    return [
      "How can I improve my protein intake?",
      "What exercises are best for weight loss?",
      "Can you analyze my latest blood work?",
      "Help me plan meals for this week"
    ] as T
  }

  if (endpoint.includes('/chat/session')) {
    return {
      sessionId: 'mock-session-' + Date.now(),
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "Hi! I'm your AI Health Coach. I can help you with meal planning, fitness advice, and health insights. What would you like to know?",
          timestamp: new Date().toISOString()
        }
      ]
    } as T
  }

  if (endpoint.includes('/chat/message')) {
    const body = options.body ? JSON.parse(options.body as string) : {}
    const userMessage = body.message || 'Hello'
    
    // Simple mock responses based on message content
    let response = "I'm here to help with your health and nutrition goals. "
    
    if (userMessage.toLowerCase().includes('protein')) {
      response = "Great question about protein! For most adults, aim for 0.8-1g of protein per kg of body weight daily. Good sources include lean meats, fish, eggs, beans, and Greek yogurt. Would you like specific meal suggestions?"
    } else if (userMessage.toLowerCase().includes('weight')) {
      response = "Weight management involves balancing calories in vs calories out. Focus on whole foods, regular exercise, and staying hydrated. I can help create a personalized plan based on your goals!"
    } else if (userMessage.toLowerCase().includes('meal')) {
      response = "I'd be happy to help with meal planning! A balanced plate should include lean protein, complex carbs, healthy fats, and plenty of vegetables. What are your dietary preferences?"
    } else {
      response += "I can help with meal planning, nutrition advice, fitness guidance, and analyzing health reports. What specific area would you like to explore?"
    }

    return {
      id: 'response-' + Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    } as T
  }

  // Auth endpoints
  if (endpoint.includes('/auth/login')) {
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'user-123',
        email: 'demo@healthcoachai.com',
        name: 'Alex Johnson',
        profileCompleted: true
      }
    } as T
  }

  // Default mock response
  return { success: true, message: 'Mock response', data: null } as T
}

export default apiRequest