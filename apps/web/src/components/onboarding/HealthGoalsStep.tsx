'use client'

import { useState } from 'react'
import { TrophyIcon, HeartIcon, FireIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { HealthGoals } from '../../services/onboardingService'

interface HealthGoalsStepProps {
  onNext: (data: HealthGoals) => void
  onSkip?: () => void
  loading?: boolean
  error?: string | null
}

export default function HealthGoalsStep({ onNext, loading, error }: HealthGoalsStepProps) {
  const [formData, setFormData] = useState<HealthGoals>({
    primaryGoals: [],
    targetWeight: undefined,
    targetBodyFat: undefined,
    targetMuscle: undefined,
    timelineWeeks: 12,
    healthConditionGoals: [],
    lifestyleGoals: [],
    motivation: '',
    previousDietExperience: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  const handleInputChange = (field: keyof HealthGoals, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelectChange = (field: keyof HealthGoals, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }))
  }

  const primaryGoalOptions = [
    { value: 'weight_loss', label: 'Weight Loss', icon: '⚖️', desc: 'Lose weight healthily' },
    { value: 'weight_gain', label: 'Weight Gain', icon: '📈', desc: 'Gain healthy weight' },
    { value: 'maintain_weight', label: 'Maintain Weight', icon: '⚖️', desc: 'Stay at current weight' },
    { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪', desc: 'Build lean muscle mass' },
    { value: 'fat_loss', label: 'Fat Loss', icon: '🔥', desc: 'Reduce body fat percentage' },
    { value: 'improve_fitness', label: 'Improve Fitness', icon: '🏃‍♂️', desc: 'Enhance overall fitness' },
    { value: 'better_energy', label: 'Better Energy', icon: '⚡', desc: 'Increase daily energy levels' },
    { value: 'better_sleep', label: 'Better Sleep', icon: '😴', desc: 'Improve sleep quality' }
  ]

  const healthConditionGoalsOptions = [
    'Manage PCOS/PCOD', 'Control diabetes', 'Lower blood pressure', 
    'Reduce cholesterol', 'Improve thyroid function', 'Heal fatty liver',
    'Reduce inflammation', 'Improve digestion', 'Boost immunity',
    'Manage anxiety/stress', 'Improve hormone balance', 'Strengthen bones'
  ]

  const lifestyleGoalsOptions = [
    'Reduce smoking', 'Limit alcohol consumption', 'Improve sleep schedule',
    'Reduce stress levels', 'Increase water intake', 'Eat less outside food',
    'Cook more at home', 'Exercise regularly', 'Take regular breaks',
    'Practice mindfulness', 'Improve work-life balance'
  ]

  return (
    <form onSubmit={handleSubmit} className="p-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Primary Goals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrophyIcon className="h-5 w-5 mr-2 text-primary-600" />
            Primary Health Goals *
          </h3>
          <p className="text-sm text-gray-600 mb-4">Select your main goals (you can choose multiple)</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryGoalOptions.map((goal) => (
              <label key={goal.value} className={`
                flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors
                ${formData.primaryGoals.includes(goal.value)
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}>
                <input
                  type="checkbox"
                  checked={formData.primaryGoals.includes(goal.value)}
                  onChange={(e) => handleMultiSelectChange('primaryGoals', goal.value, e.target.checked)}
                  className="sr-only"
                />
                <div className="flex items-center flex-1">
                  <span className="text-2xl mr-3">{goal.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{goal.label}</div>
                    <div className="text-sm text-gray-600">{goal.desc}</div>
                  </div>
                </div>
                {formData.primaryGoals.includes(goal.value) && (
                  <CheckIcon className="h-5 w-5 text-primary-600" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Target Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Target Metrics (Optional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Weight (kg)
              </label>
              <input
                type="number"
                value={formData.targetWeight || ''}
                onChange={(e) => handleInputChange('targetWeight', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="30"
                max="200"
                step="0.1"
                placeholder="65"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Body Fat (%)
              </label>
              <input
                type="number"
                value={formData.targetBodyFat || ''}
                onChange={(e) => handleInputChange('targetBodyFat', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="5"
                max="50"
                step="0.1"
                placeholder="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Muscle Mass (kg)
              </label>
              <input
                type="number"
                value={formData.targetMuscle || ''}
                onChange={(e) => handleInputChange('targetMuscle', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="20"
                max="100"
                step="0.1"
                placeholder="45"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeline (weeks)
              </label>
              <select
                value={formData.timelineWeeks}
                onChange={(e) => handleInputChange('timelineWeeks', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={4}>1 Month (4 weeks)</option>
                <option value={8}>2 Months (8 weeks)</option>
                <option value={12}>3 Months (12 weeks)</option>
                <option value={16}>4 Months (16 weeks)</option>
                <option value={24}>6 Months (24 weeks)</option>
                <option value={52}>1 Year (52 weeks)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Health Condition Goals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HeartIcon className="h-5 w-5 mr-2 text-primary-600" />
            Health Condition Management
          </h3>
          <p className="text-sm text-gray-600 mb-4">Select health conditions you want to improve</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {healthConditionGoalsOptions.map((goal) => (
              <label key={goal} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.healthConditionGoals.includes(goal)}
                  onChange={(e) => handleMultiSelectChange('healthConditionGoals', goal, e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Lifestyle Goals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FireIcon className="h-5 w-5 mr-2 text-primary-600" />
            Lifestyle Improvements
          </h3>
          <p className="text-sm text-gray-600 mb-4">Select lifestyle changes you want to make</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lifestyleGoalsOptions.map((goal) => (
              <label key={goal} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.lifestyleGoals.includes(goal)}
                  onChange={(e) => handleMultiSelectChange('lifestyleGoals', goal, e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Motivation */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Motivation *
          </h3>
          <p className="text-sm text-gray-600 mb-4">What motivates you to achieve these health goals?</p>
          
          <textarea
            value={formData.motivation}
            onChange={(e) => handleInputChange('motivation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            rows={4}
            placeholder="e.g., I want to feel more confident, have better energy for my family, improve my health markers, etc."
            required
          />
        </div>

        {/* Previous Experience */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Previous Diet/Fitness Experience
          </h3>
          <p className="text-sm text-gray-600 mb-4">Tell us about your previous attempts or experiences</p>
          
          <textarea
            value={formData.previousDietExperience}
            onChange={(e) => handleInputChange('previousDietExperience', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            rows={4}
            placeholder="e.g., Tried keto for 3 months, used to go to gym regularly, attempted intermittent fasting, etc."
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creating Your Plan...
            </>
          ) : (
            <>
              Complete Setup
              <CheckIcon className="h-5 w-5 ml-2" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}