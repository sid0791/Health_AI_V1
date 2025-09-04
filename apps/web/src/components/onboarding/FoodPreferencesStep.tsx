'use client'

import { useState } from 'react'
import { CakeIcon, GlobeAltIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { FoodPreferences } from '../../services/onboardingService'

interface FoodPreferencesStepProps {
  onNext: (data: FoodPreferences) => void
  onSkip?: () => void
  loading?: boolean
  error?: string | null
}

export default function FoodPreferencesStep({ onNext, loading, error }: FoodPreferencesStepProps) {
  const [formData, setFormData] = useState<FoodPreferences>({
    dietaryPreference: 'vegetarian',
    cuisinePreferences: [],
    mealsPerDay: 3,
    snacksPerDay: 1,
    foodAllergies: [],
    foodDislikes: [],
    cravings: [],
    regularFoodItems: []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  const handleInputChange = (field: keyof FoodPreferences, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelectChange = (field: keyof FoodPreferences, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }))
  }

  const cuisineOptions = [
    'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'American',
    'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Middle Eastern',
    'Greek', 'Spanish', 'Lebanese', 'Punjabi', 'South Indian', 'Bengali',
    'Gujarati', 'Maharashtrian', 'Rajasthani'
  ]

  const commonAllergies = [
    'Nuts (Peanuts)', 'Tree nuts (Almonds, Walnuts)', 'Dairy/Milk', 'Eggs',
    'Soy', 'Wheat/Gluten', 'Shellfish', 'Fish', 'Sesame', 'Mustard'
  ]

  const commonCravings = [
    'Tea/Chai', 'Coffee', 'Ice cream', 'Chocolate', 'Cold drinks/Soda',
    'Street food', 'Sweets/Mithai', 'Fried foods', 'Spicy food', 'Salty snacks',
    'Bread/Roti', 'Rice', 'Pizza', 'Burger', 'Pasta'
  ]

  const regularFoodOptions = [
    'Rice', 'Wheat/Roti', 'Milk', 'Yogurt', 'Tea', 'Coffee',
    'Onions', 'Garlic', 'Ginger', 'Tomatoes', 'Potatoes', 'Lentils/Dal',
    'Eggs', 'Chicken', 'Fish', 'Paneer', 'Nuts', 'Oil'
  ]

  return (
    <form onSubmit={handleSubmit} className="p-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Dietary Preference */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CakeIcon className="h-5 w-5 mr-2 text-primary-600" />
            Dietary Preference *
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { value: 'vegetarian', label: 'Vegetarian', desc: 'No meat, fish, or poultry' },
              { value: 'non_vegetarian', label: 'Non-Vegetarian', desc: 'Includes all foods' },
              { value: 'vegan', label: 'Vegan', desc: 'No animal products' },
              { value: 'eggetarian', label: 'Eggetarian', desc: 'Vegetarian + eggs' },
              { value: 'jain', label: 'Jain', desc: 'No root vegetables' },
              { value: 'halal', label: 'Halal', desc: 'Islamic dietary laws' },
              { value: 'kosher', label: 'Kosher', desc: 'Jewish dietary laws' }
            ].map((option) => (
              <label key={option.value} className={`
                flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors
                ${formData.dietaryPreference === option.value 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}>
                <input
                  type="radio"
                  name="dietaryPreference"
                  value={option.value}
                  checked={formData.dietaryPreference === option.value}
                  onChange={(e) => handleInputChange('dietaryPreference', e.target.value)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">{option.label}</span>
                <span className="text-sm text-gray-600">{option.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cuisine Preferences */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <GlobeAltIcon className="h-5 w-5 mr-2 text-primary-600" />
            Cuisine Preferences *
          </h3>
          <p className="text-sm text-gray-600 mb-4">Select all cuisines you enjoy</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {cuisineOptions.map((cuisine) => (
              <label key={cuisine} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.cuisinePreferences.includes(cuisine)}
                  onChange={(e) => handleMultiSelectChange('cuisinePreferences', cuisine, e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{cuisine}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Meal Structure */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Meal Structure
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meals per day *
              </label>
              <select
                value={formData.mealsPerDay}
                onChange={(e) => handleInputChange('mealsPerDay', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value={2}>2 meals (Breakfast + Dinner)</option>
                <option value={3}>3 meals (Breakfast, Lunch, Dinner)</option>
                <option value={4}>4 meals (+ 1 heavy snack)</option>
                <option value={5}>5 meals (+ 2 snacks)</option>
                <option value={6}>6 meals (+ 3 snacks/mini meals)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Snacks per day
              </label>
              <select
                value={formData.snacksPerDay}
                onChange={(e) => handleInputChange('snacksPerDay', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={0}>No snacks</option>
                <option value={1}>1 snack</option>
                <option value={2}>2 snacks</option>
                <option value={3}>3 snacks</option>
              </select>
            </div>
          </div>
        </div>

        {/* Food Allergies */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Food Allergies & Restrictions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {commonAllergies.map((allergy) => (
              <label key={allergy} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.foodAllergies.includes(allergy)}
                  onChange={(e) => handleMultiSelectChange('foodAllergies', allergy, e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{allergy}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cravings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
            Common Cravings
          </h3>
          <p className="text-sm text-gray-600 mb-4">What do you often crave or find hard to resist?</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {commonCravings.map((craving) => (
              <label key={craving} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.cravings.includes(craving)}
                  onChange={(e) => handleMultiSelectChange('cravings', craving, e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{craving}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Regular Food Items */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Must-Have Regular Foods
          </h3>
          <p className="text-sm text-gray-600 mb-4">Foods you eat regularly and would like to include in your meal plans</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {regularFoodOptions.map((food) => (
              <label key={food} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.regularFoodItems.includes(food)}
                  onChange={(e) => handleMultiSelectChange('regularFoodItems', food, e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{food}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional food preferences or notes
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            placeholder="Any other preferences, foods you love or hate, timing preferences, etc."
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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