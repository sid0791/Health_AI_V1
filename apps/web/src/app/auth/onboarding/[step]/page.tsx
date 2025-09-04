'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BasicInfoStep from '../../../../components/onboarding/BasicInfoStep'
import LifestyleStep from '../../../../components/onboarding/LifestyleStep'
import HealthStep from '../../../../components/onboarding/HealthStep'
import FoodPreferencesStep from '../../../../components/onboarding/FoodPreferencesStep'
import HealthGoalsStep from '../../../../components/onboarding/HealthGoalsStep'
import { onboardingService } from '../../../../services/onboardingService'
import { authService } from '../../../../services/authService'

export default function OnboardingStepPage() {
  const params = useParams()
  const router = useRouter()
  const step = parseInt(params.step as string) || 1
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    // Validate step number
    if (step < 1 || step > 5) {
      router.push('/auth/onboarding/1')
      return
    }
  }, [step, router])

  const handleNext = async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      // Validate data
      const validation = onboardingService.validateStepData(step, data)
      if (!validation.valid) {
        setError(validation.errors.join(', '))
        setLoading(false)
        return
      }

      // Save step data
      let result
      switch (step) {
        case 1:
          result = await onboardingService.saveBasicInfo(data)
          break
        case 2:
          result = await onboardingService.saveLifestyleInfo(data)
          break
        case 3:
          result = await onboardingService.saveHealthInfo(data)
          break
        case 4:
          result = await onboardingService.saveFoodPreferences(data)
          break
        case 5:
          result = await onboardingService.saveHealthGoals(data)
          break
        default:
          throw new Error('Invalid step')
      }

      if (result.success) {
        if (step === 5) {
          // Complete onboarding
          await onboardingService.completeOnboarding()
          router.push('/dashboard')
        } else {
          // Go to next step
          const nextStep = onboardingService.getNextStep(step)
          if (nextStep) {
            router.push(`/auth/onboarding/${nextStep}`)
          }
        }
      } else {
        setError('Failed to save data. Please try again.')
      }
    } catch (error) {
      console.error('Onboarding step error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    const currentStep = onboardingService.getStep(step)
    if (!currentStep?.skippable) return

    setLoading(true)
    try {
      await onboardingService.skipStep(step)
      const nextStep = onboardingService.getNextStep(step)
      if (nextStep) {
        router.push(`/auth/onboarding/${nextStep}`)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Skip step error:', error)
      setError('Failed to skip step. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    const commonProps = {
      onNext: handleNext,
      onSkip: handleSkip,
      loading,
      error
    }

    switch (step) {
      case 1:
        return <BasicInfoStep {...commonProps} />
      case 2:
        return <LifestyleStep {...commonProps} />
      case 3:
        return <HealthStep {...commonProps} />
      case 4:
        return <FoodPreferencesStep {...commonProps} />
      case 5:
        return <HealthGoalsStep {...commonProps} />
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Invalid step</p>
          </div>
        )
    }
  }

  return renderStep()
}