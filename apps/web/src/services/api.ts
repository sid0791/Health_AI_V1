/**
 * API Service Layer for HealthCoach AI
 * Provides integration between frontend and backend services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

export default apiRequest