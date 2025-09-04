/**
 * API Service Layer for HealthCoach AI
 * Provides integration between frontend and backend services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || false

// Console info about API mode
if (typeof window !== 'undefined') {
  console.log(`🔧 API Mode: ${USE_MOCK_API ? 'MOCK' : 'REAL'} | Base URL: ${API_BASE_URL}`)
}

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
  // OR for specific endpoints that are always mocked (chat, auth in demo mode)
  if (USE_MOCK_API || endpoint.includes('/chat/') || (endpoint.includes('/auth/') && process.env.NEXT_PUBLIC_DEMO_MODE === 'true')) {
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
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

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    } else {
      // Handle non-JSON responses
      return await response.text() as unknown as T
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    console.error('API Request failed:', error)
    
    // Fallback to mock data if real API fails and we're in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔄 Real API failed, falling back to mock data for:', endpoint)
      return handleMockRequest<T>(endpoint, options)
    }
    
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

  // Meal plan endpoints
  if (endpoint.includes('/meal-plans/generate') || endpoint.includes('/meal-plans/current')) {
    return {
      id: 'meal-plan-' + Date.now(),
      userId: 'user-123',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      goals: ['weight_loss', 'muscle_gain'],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      days: [
        {
          date: new Date().toISOString().split('T')[0],
          meals: [
            {
              id: 'meal-1',
              mealType: 'breakfast',
              time: '08:00',
              portionSize: 1,
              recipe: {
                id: 'recipe-1',
                name: 'Greek Yogurt Parfait',
                cuisine: 'Mediterranean',
                difficulty: 'easy',
                prepTime: 10,
                cookTime: 0,
                servings: 1,
                ingredients: [
                  { name: 'Greek yogurt', amount: 200, unit: 'g' },
                  { name: 'Mixed berries', amount: 100, unit: 'g' },
                  { name: 'Granola', amount: 30, unit: 'g' },
                  { name: 'Honey', amount: 15, unit: 'ml' }
                ],
                instructions: [
                  'Layer yogurt with berries and granola',
                  'Drizzle with honey and serve'
                ],
                nutrition: {
                  calories: 280,
                  protein: 20,
                  carbs: 35,
                  fat: 8,
                  fiber: 5,
                  sugar: 22
                },
                tags: ['healthy', 'quick', 'protein-rich'],
                healthBenefits: ['High protein', 'Probiotics', 'Antioxidants']
              }
            },
            {
              id: 'meal-2',
              mealType: 'lunch',
              time: '13:00',
              portionSize: 1,
              recipe: {
                id: 'recipe-2',
                name: 'Quinoa Buddha Bowl',
                cuisine: 'Fusion',
                difficulty: 'medium',
                prepTime: 15,
                cookTime: 20,
                servings: 1,
                ingredients: [
                  { name: 'Quinoa', amount: 80, unit: 'g' },
                  { name: 'Chickpeas', amount: 100, unit: 'g' },
                  { name: 'Spinach', amount: 50, unit: 'g' },
                  { name: 'Avocado', amount: 50, unit: 'g' },
                  { name: 'Tahini', amount: 20, unit: 'ml' }
                ],
                instructions: [
                  'Cook quinoa according to package instructions',
                  'Roast chickpeas with spices',
                  'Combine with fresh spinach and avocado',
                  'Drizzle with tahini dressing'
                ],
                nutrition: {
                  calories: 420,
                  protein: 18,
                  carbs: 55,
                  fat: 12,
                  fiber: 12,
                  sugar: 8
                },
                tags: ['vegan', 'high-fiber', 'complete-protein'],
                healthBenefits: ['Complete protein', 'High fiber', 'Healthy fats']
              }
            },
            {
              id: 'meal-3',
              mealType: 'dinner',
              time: '19:30',
              portionSize: 1,
              recipe: {
                id: 'recipe-3',
                name: 'Grilled Salmon with Vegetables',
                cuisine: 'Mediterranean',
                difficulty: 'medium',
                prepTime: 10,
                cookTime: 15,
                servings: 1,
                ingredients: [
                  { name: 'Salmon fillet', amount: 150, unit: 'g' },
                  { name: 'Broccoli', amount: 100, unit: 'g' },
                  { name: 'Sweet potato', amount: 120, unit: 'g' },
                  { name: 'Olive oil', amount: 10, unit: 'ml' }
                ],
                instructions: [
                  'Season salmon with herbs and spices',
                  'Grill salmon for 6-8 minutes per side',
                  'Roast vegetables with olive oil',
                  'Serve hot with lemon wedge'
                ],
                nutrition: {
                  calories: 380,
                  protein: 35,
                  carbs: 20,
                  fat: 18,
                  fiber: 6,
                  sugar: 8
                },
                tags: ['high-protein', 'omega-3', 'anti-inflammatory'],
                healthBenefits: ['Omega-3 fatty acids', 'High protein', 'Antioxidants']
              }
            }
          ],
          totalNutrition: {
            calories: 1080,
            protein: 73,
            carbs: 110,
            fat: 38,
            fiber: 23,
            sugar: 38
          },
          adherenceScore: 92
        },
        // Add more days with similar structure for Tuesday to Sunday
        {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          meals: [
            {
              id: 'meal-4',
              mealType: 'breakfast',
              time: '08:00',
              portionSize: 1,
              recipe: {
                id: 'recipe-4',
                name: 'Overnight Oats',
                cuisine: 'International',
                difficulty: 'easy',
                prepTime: 5,
                cookTime: 0,
                servings: 1,
                ingredients: [
                  { name: 'Rolled oats', amount: 50, unit: 'g' },
                  { name: 'Almond milk', amount: 150, unit: 'ml' },
                  { name: 'Chia seeds', amount: 10, unit: 'g' },
                  { name: 'Banana', amount: 100, unit: 'g' }
                ],
                instructions: [
                  'Mix oats with almond milk and chia seeds',
                  'Refrigerate overnight',
                  'Top with sliced banana in the morning'
                ],
                nutrition: {
                  calories: 290,
                  protein: 12,
                  carbs: 45,
                  fat: 9,
                  fiber: 8,
                  sugar: 18
                },
                tags: ['high-fiber', 'make-ahead', 'vegan-option'],
                healthBenefits: ['High fiber', 'Sustained energy', 'Omega-3 from chia']
              }
            },
            {
              id: 'meal-5',
              mealType: 'lunch',
              time: '13:00',
              portionSize: 1,
              recipe: {
                id: 'recipe-5',
                name: 'Chickpea Salad Bowl',
                cuisine: 'Mediterranean',
                difficulty: 'Easy',
                prepTime: 15,
                cookTime: 0,
                servings: 1,
                ingredients: [
                  'canned chickpeas (1 cup)',
                  'cucumber (1 medium)',
                  'cherry tomatoes (100g)',
                  'red onion (1/4 cup)',
                  'olive oil (2 tbsp)',
                  'lemon juice (1 tbsp)',
                  'fresh herbs (mixed)'
                ],
                instructions: [
                  'Drain and rinse chickpeas',
                  'Chop all vegetables',
                  'Mix with olive oil and lemon juice',
                  'Season with herbs and spices'
                ],
                nutrition: {
                  calories: 350,
                  protein: 15,
                  carbs: 45,
                  fat: 12,
                  fiber: 12,
                  sugar: 8
                },
                tags: ['vegan', 'high-fiber', 'protein-rich'],
                healthBenefits: ['Plant protein', 'High fiber', 'Antioxidants']
              }
            },
            {
              id: 'meal-6',
              mealType: 'dinner',
              time: '19:30',
              portionSize: 1,
              recipe: {
                id: 'recipe-6',
                name: 'Lentil Curry with Brown Rice',
                cuisine: 'Indian',
                difficulty: 'Medium',
                prepTime: 10,
                cookTime: 25,
                servings: 1,
                ingredients: [
                  { name: 'Red lentils', amount: 80, unit: 'g' },
                  { name: 'Brown rice', amount: 60, unit: 'g' },
                  { name: 'Onion', amount: 50, unit: 'g' },
                  { name: 'Tomato', amount: 100, unit: 'g' },
                  { name: 'Coconut milk', amount: 100, unit: 'ml' },
                  { name: 'Spinach', amount: 50, unit: 'g' }
                ],
                instructions: [
                  'Cook brown rice according to package instructions',
                  'Sauté onions until golden',
                  'Add lentils, tomatoes, and spices',
                  'Simmer with coconut milk',
                  'Add spinach at the end'
                ],
                nutrition: {
                  calories: 420,
                  protein: 18,
                  carbs: 65,
                  fat: 8,
                  fiber: 15,
                  sugar: 6
                },
                tags: ['vegan', 'high-protein', 'comfort-food'],
                healthBenefits: ['Complete protein', 'High fiber', 'Iron rich']
              }
            }
          ],
          totalNutrition: {
            calories: 1060,
            protein: 45,
            carbs: 155,
            fat: 29,
            fiber: 35,
            sugar: 32
          },
          adherenceScore: 90
        },
        // Add Wednesday with more variety
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          meals: [
            {
              id: 'meal-7',
              mealType: 'breakfast',
              time: '08:00',
              portionSize: 1,
              recipe: {
                id: 'recipe-7',
                name: 'Avocado Toast with Egg',
                cuisine: 'International',
                difficulty: 'Easy',
                prepTime: 10,
                cookTime: 5,
                servings: 1,
                ingredients: [
                  'whole grain bread (2 slices)',
                  'avocado (1 medium)',
                  'eggs (2 large)',
                  'cherry tomatoes (5-6)',
                  'olive oil (1 tsp)',
                  'black pepper (to taste)',
                  'sea salt (pinch)'
                ],
                instructions: [
                  'Toast bread slices until golden',
                  'Mash avocado with salt and pepper',
                  'Cook eggs sunny side up',
                  'Spread avocado on toast',
                  'Top with eggs and tomatoes'
                ],
                nutrition: {
                  calories: 380,
                  protein: 18,
                  carbs: 30,
                  fat: 22,
                  fiber: 12,
                  sugar: 4
                },
                tags: ['vegetarian', 'high-protein', 'healthy-fats'],
                healthBenefits: ['Healthy fats', 'Complete protein', 'High fiber']
              }
            }
          ],
          totalNutrition: {
            calories: 1200,
            protein: 65,
            carbs: 140,
            fat: 35,
            fiber: 28,
            sugar: 25
          },
          adherenceScore: 92
        }
      ]
    } as T
  }

  if (endpoint.includes('/meal-plans/swap-meal')) {
    return {
      success: true,
      alternatives: [
        {
          name: 'Overnight Oats',
          calories: 290,
          protein: 15,
          carbs: 45,
          fat: 9,
          ingredients: ['oats', 'milk', 'chia seeds', 'banana'],
          swapReason: 'Similar nutrition profile with more fiber'
        },
        {
          name: 'Avocado Toast',
          calories: 310,
          protein: 12,
          carbs: 30,
          fat: 18,
          ingredients: ['whole grain bread', 'avocado', 'egg', 'tomato'],
          swapReason: 'Higher in healthy fats, good protein source'
        }
      ]
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