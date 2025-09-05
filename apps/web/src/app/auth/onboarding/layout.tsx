'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import { onboardingService, type OnboardingProgress } from '../../../services/onboardingService'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const currentStep = parseInt(params.step as string) || 1
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      const progressData = await onboardingService.getProgress()
      setProgress(progressData)
    } catch (error) {
      console.error('Failed to load onboarding progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const steps = onboardingService.getSteps()

  const handleBack = () => {
    const prevStep = onboardingService.getPreviousStep(currentStep)
    if (prevStep) {
      router.push(`/auth/onboarding/${prevStep}`)
    } else {
      router.push('/auth/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              Back
            </button>

            {/* Logo */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">H</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">HealthCoach AI</span>
            </div>

            {/* Progress */}
            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.step} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium
                    ${step.step < currentStep 
                      ? 'bg-primary-600 border-primary-600 text-white' 
                      : step.step === currentStep
                      ? 'bg-white border-primary-600 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-400'
                    }
                  `}>
                    {step.step < currentStep ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      step.step
                    )}
                  </div>
                  
                  {/* Progress line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 mx-4
                      ${step.step < currentStep ? 'bg-primary-600' : 'bg-gray-300'}
                    `} />
                  )}
                </div>
              ))}
            </div>

            {/* Progress percentage */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>

            {/* Current step info */}
            <div className="mt-4 text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {steps[currentStep - 1]?.title}
              </h1>
              <p className="text-gray-600 mt-1">
                {steps[currentStep - 1]?.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center text-sm text-gray-500">
            <span>Your data is secure and encrypted</span>
            <span className="mx-2">•</span>
            <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}