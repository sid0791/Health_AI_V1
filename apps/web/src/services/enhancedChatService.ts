/**
 * Enhanced Real AI Chat Service
 * Integrates with actual AI chat APIs for health consultations
 */

import { chatService, ChatRequest, ChatResponse } from './chatService'

export interface EnhancedChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: {
    processingTime?: number
    aiProvider?: string
    tokensUsed?: number
    domainClassification?: {
      domain: string
      confidence: number
      isInScope: boolean
    }
    suggestedFollowUps?: string[]
  }
}

export interface HealthContext {
  recentHealthReports?: string[]
  currentMealPlan?: string
  fitnessGoals?: string[]
  healthConditions?: string[]
  allergies?: string[]
  medications?: string[]
}

export interface ChatSessionContext extends HealthContext {
  userProfile?: {
    age?: number
    gender?: string
    weight?: number
    height?: number
    activityLevel?: string
  }
  recentActivity?: {
    lastMeal?: string
    lastWorkout?: string
    sleepHours?: number
    stressLevel?: number
  }
}

class EnhancedChatService {
  private currentSessionId: string | null = null
  private sessionContext: ChatSessionContext = {}

  /**
   * Start a new health consultation session with context
   */
  async startHealthSession(
    type: 'nutrition_advice' | 'fitness_guidance' | 'health_consultation' | 'meal_planning',
    context?: ChatSessionContext
  ): Promise<{ sessionId: string; welcomeMessage: EnhancedChatMessage }> {
    try {
      // Create new session with context
      const session = await chatService.createSession('current-user', type, context)
      this.currentSessionId = session.id
      this.sessionContext = context || {}

      // Generate contextual welcome message
      const welcomeContent = this.generateWelcomeMessage(type, context)
      
      const welcomeMessage: EnhancedChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: 0,
          aiProvider: 'system',
          domainClassification: {
            domain: type,
            confidence: 1.0,
            isInScope: true
          }
        }
      }

      return { sessionId: session.id, welcomeMessage }
    } catch (error) {
      console.error('Error starting health session:', error)
      
      // Fallback to mock session
      const mockSessionId = `mock-session-${Date.now()}`
      this.currentSessionId = mockSessionId
      
      const fallbackMessage: EnhancedChatMessage = {
        id: `welcome-fallback-${Date.now()}`,
        role: 'assistant',
        content: this.generateWelcomeMessage(type, context),
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: 0,
          aiProvider: 'fallback',
          domainClassification: {
            domain: type,
            confidence: 1.0,
            isInScope: true
          }
        }
      }
      
      return { sessionId: mockSessionId, welcomeMessage: fallbackMessage }
    }
  }

  /**
   * Send message with enhanced health context
   */
  async sendHealthMessage(
    message: string,
    context?: Partial<ChatSessionContext>
  ): Promise<EnhancedChatMessage> {
    try {
      // Update session context
      if (context) {
        this.sessionContext = { ...this.sessionContext, ...context }
      }

      const chatRequest: ChatRequest = {
        message,
        sessionId: this.currentSessionId || undefined,
        sessionType: 'health_consultation',
        context: this.sessionContext,
        userPreferences: {
          language: 'en',
          responseStyle: 'friendly',
          domainFocus: ['health', 'nutrition', 'fitness']
        }
      }

      const response = await chatService.sendMessage(chatRequest)
      
      return this.transformChatResponse(response)
    } catch (error) {
      console.error('Error sending health message:', error)
      return this.generateFallbackResponse(message)
    }
  }

  /**
   * Get AI recommendations based on health data
   */
  async getHealthRecommendations(healthData: {
    bloodWork?: any
    symptoms?: string[]
    goals?: string[]
  }): Promise<EnhancedChatMessage> {
    const recommendationPrompt = this.buildRecommendationPrompt(healthData)
    
    return this.sendHealthMessage(recommendationPrompt, {
      recentHealthReports: healthData.bloodWork ? ['latest_blood_work'] : []
    })
  }

  /**
   * Ask about meal planning with current health context
   */
  async getMealPlanningAdvice(mealRequest: {
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    ingredients?: string[]
    dietaryRestrictions?: string[]
    targetCalories?: number
  }): Promise<EnhancedChatMessage> {
    const mealPrompt = this.buildMealPlanningPrompt(mealRequest)
    
    return this.sendHealthMessage(mealPrompt, {
      recentActivity: {
        lastMeal: mealRequest.mealType
      }
    })
  }

  /**
   * Get fitness advice with current activity context
   */
  async getFitnessAdvice(fitnessRequest: {
    currentActivity?: string
    goals?: string[]
    timeAvailable?: number
    equipment?: string[]
  }): Promise<EnhancedChatMessage> {
    const fitnessPrompt = this.buildFitnessPrompt(fitnessRequest)
    
    return this.sendHealthMessage(fitnessPrompt, {
      fitnessGoals: fitnessRequest.goals
    })
  }

  /**
   * Analyze symptoms and provide guidance
   */
  async analyzeSymptoms(symptoms: {
    primary: string
    duration: string
    severity: number
    associatedSymptoms?: string[]
  }): Promise<EnhancedChatMessage> {
    const symptomPrompt = this.buildSymptomAnalysisPrompt(symptoms)
    
    return this.sendHealthMessage(symptomPrompt)
  }

  /**
   * Get session history with enhanced metadata
   */
  async getSessionHistory(): Promise<EnhancedChatMessage[]> {
    if (!this.currentSessionId) return []

    try {
      const messages = await chatService.getSessionHistory(this.currentSessionId)
      return messages.map(msg => ({
        id: msg.id,
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.message,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      }))
    } catch (error) {
      console.error('Error getting session history:', error)
      return []
    }
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (this.currentSessionId) {
      try {
        await chatService.endSession(this.currentSessionId)
      } catch (error) {
        console.error('Error ending session:', error)
      }
      this.currentSessionId = null
      this.sessionContext = {}
    }
  }

  // Private helper methods

  private generateWelcomeMessage(
    type: string, 
    context?: ChatSessionContext
  ): string {
    const welcomeMessages = {
      nutrition_advice: `Hi! I'm your AI Nutrition Coach. I can help you with meal planning, nutritional analysis, and dietary recommendations. ${
        context?.healthConditions?.length 
          ? `I see you have some health considerations - I'll keep those in mind for personalized advice.` 
          : ''
      } What would you like to know about nutrition today?`,
      
      fitness_guidance: `Hello! I'm your AI Fitness Coach. I can help you with workout plans, exercise form, and fitness goals. ${
        context?.fitnessGoals?.length 
          ? `I see your goals include ${context.fitnessGoals.join(', ')}. Let's work towards achieving them!` 
          : ''
      } How can I help with your fitness journey?`,
      
      health_consultation: `Welcome! I'm your AI Health Assistant. I can help analyze symptoms, interpret health reports, and provide health guidance. ${
        context?.recentHealthReports?.length 
          ? `I have access to your recent health reports for personalized insights.` 
          : ''
      } Please note: I'm not a replacement for professional medical advice. What health question can I help with?`,
      
      meal_planning: `Hi there! I'm your AI Meal Planning Assistant. I can create personalized meal plans, suggest recipes, and help with grocery lists. ${
        context?.allergies?.length 
          ? `I'll make sure to avoid ${context.allergies.join(', ')} in all suggestions.` 
          : ''
      } What kind of meal planning help do you need today?`
    }

    return welcomeMessages[type] || "Hello! I'm your AI Health Assistant. How can I help you today?"
  }

  private transformChatResponse(response: ChatResponse): EnhancedChatMessage {
    return {
      id: response.messageId,
      role: 'assistant',
      content: response.response,
      timestamp: new Date().toISOString(),
      metadata: {
        processingTime: response.metadata.processingTime,
        aiProvider: response.metadata.aiProvider,
        tokensUsed: response.metadata.tokensUsed,
        domainClassification: response.metadata.domainClassification,
        suggestedFollowUps: response.metadata.suggestedFollowUps
      }
    }
  }

  private generateFallbackResponse(message: string): EnhancedChatMessage {
    const messageLower = message.toLowerCase()
    let response = "I'm here to help with your health and wellness questions. "

    if (messageLower.includes('meal') || messageLower.includes('food') || messageLower.includes('recipe')) {
      response = "For meal planning, I recommend focusing on balanced nutrition with plenty of vegetables, lean proteins, and whole grains. Consider your health conditions and dietary preferences when making choices. Would you like specific recipe suggestions?"
    } else if (messageLower.includes('exercise') || messageLower.includes('workout') || messageLower.includes('fitness')) {
      response = "For fitness guidance, it's important to start gradually and listen to your body. Combine cardiovascular exercise with strength training for best results. What are your current fitness goals?"
    } else if (messageLower.includes('symptom') || messageLower.includes('pain') || messageLower.includes('feel')) {
      response = "I can provide general health information, but for specific symptoms, it's always best to consult with a healthcare professional. Can you tell me more about what you're experiencing?"
    } else if (messageLower.includes('weight') || messageLower.includes('diet')) {
      response = "Weight management involves a balanced approach of nutrition and physical activity. Focus on creating sustainable habits rather than quick fixes. What specific aspect of weight management interests you?"
    }

    return {
      id: `fallback-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
      metadata: {
        processingTime: 500,
        aiProvider: 'fallback',
        domainClassification: {
          domain: 'health',
          confidence: 0.8,
          isInScope: true
        }
      }
    }
  }

  private buildRecommendationPrompt(healthData: any): string {
    let prompt = "Based on my health data, can you provide personalized recommendations? "
    
    if (healthData.bloodWork) {
      prompt += "I have recent blood work results available. "
    }
    
    if (healthData.symptoms?.length) {
      prompt += `I've been experiencing: ${healthData.symptoms.join(', ')}. `
    }
    
    if (healthData.goals?.length) {
      prompt += `My health goals are: ${healthData.goals.join(', ')}. `
    }
    
    return prompt
  }

  private buildMealPlanningPrompt(mealRequest: any): string {
    let prompt = `Can you help me plan a ${mealRequest.mealType || 'meal'}? `
    
    if (mealRequest.ingredients?.length) {
      prompt += `I have these ingredients available: ${mealRequest.ingredients.join(', ')}. `
    }
    
    if (mealRequest.dietaryRestrictions?.length) {
      prompt += `Please consider these dietary restrictions: ${mealRequest.dietaryRestrictions.join(', ')}. `
    }
    
    if (mealRequest.targetCalories) {
      prompt += `I'm aiming for around ${mealRequest.targetCalories} calories. `
    }
    
    return prompt
  }

  private buildFitnessPrompt(fitnessRequest: any): string {
    let prompt = "Can you suggest a workout routine? "
    
    if (fitnessRequest.currentActivity) {
      prompt += `I currently do ${fitnessRequest.currentActivity}. `
    }
    
    if (fitnessRequest.goals?.length) {
      prompt += `My fitness goals are: ${fitnessRequest.goals.join(', ')}. `
    }
    
    if (fitnessRequest.timeAvailable) {
      prompt += `I have ${fitnessRequest.timeAvailable} minutes available. `
    }
    
    if (fitnessRequest.equipment?.length) {
      prompt += `Equipment available: ${fitnessRequest.equipment.join(', ')}. `
    }
    
    return prompt
  }

  private buildSymptomAnalysisPrompt(symptoms: any): string {
    let prompt = `I'd like help understanding some symptoms I'm experiencing. `
    prompt += `Primary symptom: ${symptoms.primary}. `
    prompt += `Duration: ${symptoms.duration}. `
    prompt += `Severity (1-10): ${symptoms.severity}. `
    
    if (symptoms.associatedSymptoms?.length) {
      prompt += `Associated symptoms: ${symptoms.associatedSymptoms.join(', ')}. `
    }
    
    prompt += "What could this indicate and when should I see a doctor?"
    
    return prompt
  }
}

export const enhancedChatService = new EnhancedChatService()
export default enhancedChatService