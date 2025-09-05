'use client'

import { useState } from 'react'
import { ClockIcon, UserGroupIcon, HeartIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { LifestyleInfo } from '../../services/onboardingService'

interface LifestyleStepProps {
  onNext: (data: LifestyleInfo) => void
  onSkip?: () => void
  loading?: boolean
  error?: string | null
}

export default function LifestyleStep({ onNext, onSkip, loading, error }: LifestyleStepProps) {
  const [formData, setFormData] = useState<LifestyleInfo>({
    smokingFrequency: 0,
    alcoholFrequency: 0,
    sleepHours: 8,
    sleepTime: '23:00',
    wakeTime: '07:00',
    jobActivityLevel: 'sedentary',
    eatingOutFrequency: 2,
    stressLevel: 5,
    waterIntake: 8
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  const handleInputChange = (field: keyof LifestyleInfo, value: string | string[] | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const frequencyLabels = [
    'Never',
    'Rarely (Monthly)',
    'Occasionally (Weekly)',
    'Regularly (Few times/week)',
    'Frequently (Daily)',
    'Very Frequently (Multiple times/day)'
  ]

  return (
    <form onSubmit={handleSubmit} className="p-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Habits Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2 text-primary-600" />
            Personal Habits
          </h3>
          
          <div className="space-y-6">
            {/* Smoking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Smoking Frequency
              </label>
              <div className="space-y-2">
                {frequencyLabels.map((label, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="radio"
                      name="smoking"
                      value={index}
                      checked={formData.smokingFrequency === index}
                      onChange={(e) => handleInputChange('smokingFrequency', Number(e.target.value))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Alcohol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Alcohol Frequency
              </label>
              <div className="space-y-2">
                {frequencyLabels.map((label, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="radio"
                      name="alcohol"
                      value={index}
                      checked={formData.alcoholFrequency === index}
                      onChange={(e) => handleInputChange('alcoholFrequency', Number(e.target.value))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sleep Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-primary-600" />
            Sleep Pattern
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Average Sleep Hours
              </label>
              <input
                type="number"
                value={formData.sleepHours}
                onChange={(e) => handleInputChange('sleepHours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="4"
                max="12"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usual Bedtime
              </label>
              <input
                type="time"
                value={formData.sleepTime}
                onChange={(e) => handleInputChange('sleepTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usual Wake Time
              </label>
              <input
                type="time"
                value={formData.wakeTime}
                onChange={(e) => handleInputChange('wakeTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Work & Activity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HeartIcon className="h-5 w-5 mr-2 text-primary-600" />
            Work & Daily Activity
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Activity Level
              </label>
              <select
                value={formData.jobActivityLevel}
                onChange={(e) => handleInputChange('jobActivityLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="sedentary">Sedentary (Desk job, mostly sitting)</option>
                <option value="standing">Standing (Cashier, teacher, etc.)</option>
                <option value="walking">Walking (Nurse, waiter, etc.)</option>
                <option value="physical">Physical (Construction, sports, etc.)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Eating Out Frequency (times/week)
              </label>
              <input
                type="number"
                value={formData.eatingOutFrequency}
                onChange={(e) => handleInputChange('eatingOutFrequency', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                min="0"
                max="21"
              />
            </div>
          </div>
        </div>

        {/* Stress & Hydration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stress Level (1-10)
            </label>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Low</span>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.stressLevel}
                onChange={(e) => handleInputChange('stressLevel', Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-500">High</span>
              <span className="text-sm font-medium text-primary-600 min-w-[2rem]">
                {formData.stressLevel}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Water Intake (glasses)
            </label>
            <input
              type="number"
              value={formData.waterIntake}
              onChange={(e) => handleInputChange('waterIntake', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              min="0"
              max="20"
            />
            <p className="text-xs text-gray-500 mt-1">1 glass = ~250ml</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-between">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Skip this step
          </button>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}