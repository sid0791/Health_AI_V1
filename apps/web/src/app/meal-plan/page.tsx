'use client'

import { useState, useEffect } from 'react'
import { 
  ClockIcon,
  FireIcon,
  HeartIcon,
  StarIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { mealPlanningService, type MealPlan, type MealSwapRequest } from '../../services/mealPlanningService'
import { authService } from '../../services/authService'
import { getApiStatus, isUsingMockData } from '../../services/api'
import ApiDisclaimer from '../../components/ApiDisclaimer'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MealPlanPage() {
  const [selectedDay, setSelectedDay] = useState(0)
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null)

  // Load current meal plan
  useEffect(() => {
    loadCurrentMealPlan()
  }, [])

  const loadCurrentMealPlan = async () => {
    try {
      setLoading(true)
      setError(null)
      const mealPlan = await mealPlanningService.getCurrentMealPlan()
      setCurrentMealPlan(mealPlan)
    } catch (err) {
      console.error('Failed to load meal plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePlan = async () => {
    try {
      setIsGeneratingPlan(true)
      setError(null)
      
      const user = authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log('🤖 Generating AI-powered meal plan...')
      
      const mealPlan = await mealPlanningService.generateMealPlan({
        userId: user.id,
        preferences: {
          startDate: new Date().toISOString().split('T')[0],
          duration: 7,
          specialRequests: 'Generate a comprehensive 7-day meal plan with balanced nutrition'
        }
      })

      // Save the generated plan
      await mealPlanningService.saveMealPlan(mealPlan, 'AI Generated Plan')
      
      setCurrentMealPlan(mealPlan)
      console.log('✅ Meal plan generated and saved successfully!')
      
    } catch (err) {
      console.error('Failed to generate meal plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate meal plan')
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const handleSwapMeal = async (mealType: string, dayIndex: number) => {
    if (!currentMealPlan) return

    const currentMeal = selectedDayPlan?.meals.find(m => m.mealType === mealType)
    if (!currentMeal) return

    try {
      setSwappingMeal(currentMeal.id)
      setError(null)
      
      console.log('🔄 Finding alternative meals...')
      
      const swapRequest: MealSwapRequest = {
        mealPlanId: 'current-plan', // This would come from current meal plan
        dayIndex: 0, // This would be determined by the selected meal
        mealType: 'lunch', // This would be determined by the meal type
        currentRecipeId: currentMeal.id,
        preferences: {
          maxPrepTime: 45
        }
      }

      const result = await mealPlanningService.swapMeal(swapRequest)
      
      if (result.success && result.alternatives.length > 0) {
        console.log(`✅ Found ${result.alternatives.length} alternatives`)
        
        // Update the meal plan with the new recipe
        const updatedPlan = { ...currentMealPlan }
        updatedPlan.days.forEach(day => {
          day.meals.forEach(meal => {
            if (meal.id === currentMeal.id) {
              meal.recipe = result.alternatives[0]
              meal.alternatives = result.alternatives.slice(1)
            }
          })
        })
        setCurrentMealPlan(updatedPlan)
      } else {
        throw new Error('No suitable alternatives found')
      }
      
    } catch (err) {
      console.error('Failed to swap meal:', err)
      setError(err instanceof Error ? err.message : 'Failed to swap meal')
    } finally {
      setSwappingMeal(null)
    }
  }

  const selectedDayPlan = currentMealPlan?.days[selectedDay]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your meal plan...</p>
        </div>
      </div>
    )
  }

  if (!currentMealPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <SparklesIcon className="h-16 w-16 text-primary-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Create Your Personalized Meal Plan?
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Our AI nutritionist will create a customized 7-day meal plan based on your health goals, 
              dietary preferences, and lifestyle. Each meal is designed to be nutritious, delicious, and easy to prepare.
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {isGeneratingPlan ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Generate My Meal Plan
                </>
              )}
            </button>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <HeartIcon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Health-Focused</h3>
                <p className="text-sm text-gray-600">Tailored to your health conditions and goals</p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FireIcon className="h-6 w-6 text-secondary-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Nutritionally Balanced</h3>
                <p className="text-sm text-gray-600">Optimal macros and micronutrients</p>
              </div>
              
              <div className="text-center">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ClockIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Time-Efficient</h3>
                <p className="text-sm text-gray-600">Quick and easy recipes for busy lifestyles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculate daily nutrition totals
  const dailyNutrition = selectedDayPlan?.totalNutrition || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
              Weekly Meal Plan
            </h1>
            <p className="text-gray-600">
              Your personalized AI-generated meal plan based on your health goals and preferences
            </p>
          </div>
          <button
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {isGeneratingPlan ? 'Generating...' : 'Regenerate Plan'}
          </button>
        </div>
      </div>

      {/* API Status Disclaimer */}
      <div className="mb-8">
        <ApiDisclaimer 
          mode={isUsingMockData() ? 'mock' : 'real'} 
          className="mb-0"
        />
      </div>

      {/* Day Selector */}
      <div className="mb-8">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {daysOfWeek.map((day, index) => (
            <button
              key={day}
              onClick={() => setSelectedDay(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDay === index
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calories</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(dailyNutrition.calories)}</p>
            </div>
            <FireIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Protein</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(dailyNutrition.protein)}g</p>
            </div>
            <HeartIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Carbs</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(dailyNutrition.carbs)}g</p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fat</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(dailyNutrition.fat)}g</p>
            </div>
            <PlusIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>
      {/* Meals */}
      <div className="space-y-6">
        {selectedDayPlan?.meals.map((mealEntry) => {
          const meal = mealEntry.recipe
          return (
            <div key={mealEntry.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-display">
                    {mealEntry.mealType.charAt(0).toUpperCase() + mealEntry.mealType.slice(1)}
                  </h3>
                  <p className="text-sm text-gray-600">{mealEntry.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  {swappingMeal === mealEntry.id ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                      Finding alternatives...
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSwapMeal(mealEntry.mealType, selectedDay)}
                      disabled={swappingMeal === mealEntry.id}
                      className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Swap
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{meal.image || '🍽️'}</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{meal.name}</h4>
                      {meal.description && (
                        <p className="text-sm text-gray-600 mb-3">{meal.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <FireIcon className="h-4 w-4 mr-1" />
                          {Math.round(meal.nutrition.calories)} cal
                        </span>
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {meal.prepTime} min prep
                        </span>
                        {meal.cookTime > 0 && (
                          <span className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {meal.cookTime} min cook
                          </span>
                        )}
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          {meal.difficulty}
                        </span>
                        {meal.cuisine && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {meal.cuisine}
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Ingredients:</h5>
                        <div className="flex flex-wrap gap-1">
                          {meal.ingredients.map((ingredient, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {typeof ingredient === 'string' 
                                ? ingredient 
                                : `${ingredient.name} (${ingredient.amount}${ingredient.unit})`
                              }
                            </span>
                          ))}
                        </div>
                      </div>

                      {meal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {meal.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Nutrition Facts</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="font-medium text-gray-900 ml-1">{Math.round(meal.nutrition.protein)}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Carbs:</span>
                        <span className="font-medium text-gray-900 ml-1">{Math.round(meal.nutrition.carbs)}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fat:</span>
                        <span className="font-medium text-gray-900 ml-1">{Math.round(meal.nutrition.fat)}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Calories:</span>
                        <span className="font-medium text-gray-900 ml-1">{Math.round(meal.nutrition.calories)}</span>
                      </div>
                      {meal.nutrition.fiber && (
                        <div>
                          <span className="text-gray-600">Fiber:</span>
                          <span className="font-medium text-gray-900 ml-1">{Math.round(meal.nutrition.fiber)}g</span>
                        </div>
                      )}
                      {meal.nutrition.glycemicIndex && (
                        <div>
                          <span className="text-gray-600">GI:</span>
                          <span className="font-medium text-gray-900 ml-1">{meal.nutrition.glycemicIndex}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500">
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add to Log
                    </button>
                    <button className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500">
                      <HeartIconSolid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Insights */}
      <div className="mt-8 bg-primary-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary-900 mb-2 font-display">
          AI Nutritionist Insights
        </h3>
        <p className="text-primary-700 mb-4">
          Your meal plan is optimized for your weight loss goals and provides balanced nutrition. 
          The protein content supports muscle maintenance while creating a caloric deficit.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
            High Protein
          </span>
          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
            Low Glycemic Index
          </span>
          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
            Anti-inflammatory
          </span>
        </div>
        
        {/* Additional disclaimer for meal plan insights */}
        {!isUsingMockData() && (
          <div className="mt-4 pt-4 border-t border-primary-200">
            <p className="text-sm text-primary-700 flex items-start">
              <ExclamationTriangleIcon className="h-4 w-4 text-primary-600 mt-0.5 mr-2 flex-shrink-0" />
              <span>
                <strong>Medical Disclaimer:</strong> These AI-generated meal recommendations are for informational purposes only 
                and should not replace professional medical advice. Consult with a registered dietitian or healthcare provider 
                before making significant dietary changes, especially if you have health conditions or are taking medications.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}