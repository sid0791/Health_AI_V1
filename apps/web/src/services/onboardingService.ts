/**
 * Onboarding Service
 * Handles multi-step user onboarding process
 */

import { apiRequest } from './api'

export interface OnboardingStep {
  step: number
  title: string
  description: string
  completed: boolean
  skippable: boolean
}

export interface BasicInfo {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  height: number // cm
  weight: number // kg
  targetWeight?: number // kg
  bodyType?: 'ectomorph' | 'mesomorph' | 'endomorph'
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
}

export interface LifestyleInfo {
  // Smoking & Alcohol
  smokingFrequency: number // 0-5 scale (0 = never, 5 = daily)
  alcoholFrequency: number // 0-5 scale (0 = never, 5 = daily)
  
  // Sleep
  sleepHours: number // average hours per night
  sleepTime: string // time when usually go to bed
  wakeTime: string // time when usually wake up
  
  // Work & Activity
  jobActivityLevel: 'sedentary' | 'standing' | 'walking' | 'physical'
  eatingOutFrequency: number // times per week
  stressLevel: number // 1-10 scale
  
  // Hydration
  waterIntake: number // glasses per day
}

export interface HealthInfo {
  // Conditions
  hasHealthConditions: boolean
  healthConditions: string[] // PCOS, diabetes, hypertension, etc.
  
  // Measurements
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  fastingBloodSugar?: number
  hba1c?: number
  
  // Other health indicators
  fattyLiver?: boolean
  vitaminDeficiencies?: string[]
  currentMedications?: string[]
  familyHistory?: string[]
  
  // Health reports
  hasHealthReports: boolean
  healthReportFiles?: File[]
}

export interface FoodPreferences {
  // Dietary preferences
  dietaryPreference: 'vegetarian' | 'non_vegetarian' | 'vegan' | 'eggetarian' | 'jain' | 'halal' | 'kosher'
  
  // Cuisine preferences
  cuisinePreferences: string[] // Indian, Chinese, Italian, etc.
  
  // Meal preferences
  mealsPerDay: number // 2, 3, 4, etc.
  snacksPerDay: number // 0, 1, 2, etc.
  
  // Allergies and restrictions
  foodAllergies: string[]
  foodDislikes: string[]
  
  // Cravings
  cravings: string[] // tea, ice cream, cold drinks, street food, etc.
  
  // Regular food items
  regularFoodItems: string[] // foods they must have regularly
}

export interface HealthGoals {
  // Primary goals
  primaryGoals: string[] // weight_loss, weight_gain, muscle_gain, maintain_weight
  
  // Target metrics
  targetWeight?: number
  targetBodyFat?: number
  targetMuscle?: number
  timelineWeeks?: number
  
  // Advanced goals
  healthConditionGoals: string[] // manage PCOS, reduce BP, improve sleep, etc.
  lifestyleGoals: string[] // reduce smoking, limit alcohol, improve sleep, etc.
  
  // Motivation
  motivation: string
  previousDietExperience: string
}

export interface OnboardingProgress {
  currentStep: number
  onboardingCompleted: boolean
  totalSteps: number
  completionPercentage: number
  completedSteps: number[]
  skippedSteps: number[]
  profileCompleted: boolean
  lastUpdated: string
}

export interface OnboardingData {
  basicInfo?: BasicInfo
  lifestyleInfo?: LifestyleInfo
  healthInfo?: HealthInfo
  foodPreferences?: FoodPreferences
  healthGoals?: HealthGoals
}

class OnboardingService {
  private readonly steps: OnboardingStep[] = [
    {
      step: 1,
      title: 'Basic Information',
      description: 'Tell us about yourself - name, age, height, weight',
      completed: false,
      skippable: false
    },
    {
      step: 2,
      title: 'Lifestyle Details',
      description: 'Your daily habits - sleep, work, activities',
      completed: false,
      skippable: true
    },
    {
      step: 3,
      title: 'Health Information',
      description: 'Health conditions and medical information',
      completed: false,
      skippable: true
    },
    {
      step: 4,
      title: 'Food Preferences',
      description: 'Dietary preferences, cuisines, and cravings',
      completed: false,
      skippable: false
    },
    {
      step: 5,
      title: 'Health Goals',
      description: 'Your health and fitness goals',
      completed: false,
      skippable: false
    }
  ]

  /**
   * Get onboarding progress
   */
  async getProgress(): Promise<OnboardingProgress> {
    try {
      return await apiRequest<OnboardingProgress>('/onboarding/progress')
    } catch (error) {
      console.error('Get onboarding progress error:', error)
      // Return default progress if API fails
      return {
        currentStep: 1,
        onboardingCompleted: false,
        totalSteps: this.steps.length,
        completionPercentage: 0,
        completedSteps: [],
        skippedSteps: [],
        profileCompleted: false,
        lastUpdated: new Date().toISOString()
      }
    }
  }

  /**
   * Save basic information
   */
  async saveBasicInfo(data: BasicInfo): Promise<{ success: boolean; nextStep: number }> {
    try {
      return await apiRequest('/onboarding/basic-info', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Save basic info error:', error)
      throw error
    }
  }

  /**
   * Save lifestyle information
   */
  async saveLifestyleInfo(data: LifestyleInfo): Promise<{ success: boolean; nextStep: number }> {
    try {
      return await apiRequest('/onboarding/lifestyle', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Save lifestyle info error:', error)
      throw error
    }
  }

  /**
   * Save health information
   */
  async saveHealthInfo(data: HealthInfo): Promise<{ success: boolean; nextStep: number }> {
    try {
      const formData = new FormData()
      
      // Add non-file data
      const healthData = { ...data }
      delete healthData.healthReportFiles
      formData.append('data', JSON.stringify(healthData))
      
      // Add files if present
      if (data.healthReportFiles) {
        data.healthReportFiles.forEach((file, index) => {
          formData.append(`healthReports`, file)
        })
      }

      return await apiRequest('/onboarding/health', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      })
    } catch (error) {
      console.error('Save health info error:', error)
      throw error
    }
  }

  /**
   * Save food preferences
   */
  async saveFoodPreferences(data: FoodPreferences): Promise<{ success: boolean; nextStep: number }> {
    try {
      return await apiRequest('/onboarding/preferences', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Save food preferences error:', error)
      throw error
    }
  }

  /**
   * Save health goals
   */
  async saveHealthGoals(data: HealthGoals): Promise<{ success: boolean; nextStep: number }> {
    try {
      return await apiRequest('/onboarding/goals', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Save health goals error:', error)
      throw error
    }
  }

  /**
   * Complete onboarding and generate initial meal plan
   */
  async completeOnboarding(): Promise<{ success: boolean; user: Record<string, unknown>; mealPlan?: Record<string, unknown> }> {
    try {
      // Complete onboarding first
      const onboardingResult = await apiRequest('/onboarding/complete', {
        method: 'POST'
      }) as { success: boolean; user: Record<string, unknown> }

      if (onboardingResult.success) {
        console.log('✅ Onboarding completed successfully')
        
        // Generate initial meal plan using collected data
        try {
          const { mealPlanningService } = await import('./mealPlanningService')
          const mealPlan = await mealPlanningService.generateMealPlan({
            userId: onboardingResult.user.id as string,
            preferences: {
              startDate: new Date().toISOString().split('T')[0],
              duration: 7, // 7-day plan
              specialRequests: 'Initial personalized plan based on onboarding data'
            }
          })
          
          console.log('✅ Initial meal plan generated')
          
          return {
            ...onboardingResult,
            mealPlan: mealPlan as unknown as Record<string, unknown>
          }
        } catch (mealPlanError) {
          console.error('Failed to generate initial meal plan:', mealPlanError)
          // Still return success for onboarding completion
          return onboardingResult
        }
      }

      return onboardingResult
    } catch (error) {
      console.error('Complete onboarding error:', error)
      throw error
    }
  }

  /**
   * Skip current step
   */
  async skipStep(step: number): Promise<{ success: boolean; nextStep: number }> {
    try {
      return await apiRequest('/onboarding/skip', {
        method: 'POST',
        body: JSON.stringify({ step })
      })
    } catch (error) {
      console.error('Skip step error:', error)
      throw error
    }
  }

  /**
   * Restart onboarding
   */
  async restartOnboarding(): Promise<{ success: boolean }> {
    try {
      return await apiRequest('/onboarding/restart', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Restart onboarding error:', error)
      throw error
    }
  }

  /**
   * Get all onboarding steps
   */
  getSteps(): OnboardingStep[] {
    return this.steps
  }

  /**
   * Get step by number
   */
  getStep(stepNumber: number): OnboardingStep | undefined {
    return this.steps.find(step => step.step === stepNumber)
  }

  /**
   * Get next step number
   */
  getNextStep(currentStep: number): number | null {
    const nextStep = currentStep + 1
    return nextStep <= this.steps.length ? nextStep : null
  }

  /**
   * Get previous step number
   */
  getPreviousStep(currentStep: number): number | null {
    const prevStep = currentStep - 1
    return prevStep >= 1 ? prevStep : null
  }

  /**
   * Validate step data
   */
  validateStepData(step: number, data: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (step) {
      case 1: // Basic Info
        if (!data.firstName) errors.push('First name is required')
        if (!data.lastName) errors.push('Last name is required')
        if (!data.dateOfBirth) errors.push('Date of birth is required')
        if (!data.gender) errors.push('Gender is required')
        if (!data.height || (data.height as number) < 100 || (data.height as number) > 250) errors.push('Valid height is required (100-250 cm)')
        if (!data.weight || (data.weight as number) < 30 || (data.weight as number) > 300) errors.push('Valid weight is required (30-300 kg)')
        if (!data.activityLevel) errors.push('Activity level is required')
        break

      case 4: // Food Preferences
        if (!data.dietaryPreference) errors.push('Dietary preference is required')
        if (!data.cuisinePreferences || (data.cuisinePreferences as unknown[]).length === 0) errors.push('At least one cuisine preference is required')
        if (!data.mealsPerDay || (data.mealsPerDay as number) < 2 || (data.mealsPerDay as number) > 6) errors.push('Valid meals per day is required (2-6)')
        break

      case 5: // Health Goals
        if (!data.primaryGoals || (data.primaryGoals as unknown[]).length === 0) errors.push('At least one primary goal is required')
        if (!data.motivation) errors.push('Motivation is required')
        break
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export const onboardingService = new OnboardingService()
export default onboardingService