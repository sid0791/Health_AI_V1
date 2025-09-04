'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ClockIcon,
  FireIcon,
  HeartIcon,
  StarIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useApiCall, useAutoFetch } from '../../hooks/useApi'
import { getApiStatus, isUsingMockData } from '../../services/api'
import ApiDisclaimer from '../../components/ApiDisclaimer'
import mealPlanningService, { UserProfile } from '../../services/mealPlanningService'
import foodLoggingService from '../../services/foodLoggingService'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Mock user profile - in real app this would come from user context/auth
const mockUserProfile: UserProfile = {
  age: 28,
  gender: 'female',
  weight: 65,
  height: 165,
  activityLevel: 'moderate',
  goals: ['weight_loss', 'muscle_gain'],
  healthConditions: ['PCOS'],
  allergies: ['nuts'],
  dietaryPreferences: ['vegetarian'],
  cuisinePreferences: ['Indian', 'Mediterranean'],
  preferredIngredients: ['quinoa', 'lentils', 'vegetables'],
  avoidedIngredients: ['refined_sugar', 'white_rice'],
  budgetRange: { min: 200, max: 500 },
  cookingSkillLevel: 3,
  availableCookingTime: 30,
  mealFrequency: {
    mealsPerDay: 4,
    snacksPerDay: 1,
    includeBeverages: true
  }
}


export default function MealPlanPage() {
  const [selectedDay, setSelectedDay] = useState(0) // Index instead of name
  const [showSwapOptions, setShowSwapOptions] = useState<{mealType: string, dayIndex: number} | null>(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [apiMode, setApiMode] = useState<'real' | 'mock' | 'fallback'>('mock')
  const [loggingMeal, setLoggingMeal] = useState<{mealId: string, mealType: string} | null>(null)

  // Mock user ID - in real app this would come from auth context
  const userId = 'user_123'

  // Fetch current meal plan
  const [mealPlanState, { refetch: refetchMealPlan }] = useAutoFetch(
    mealPlanningService.getCurrentMealPlan,
    [userId],
    { enabled: true, retryCount: 1 }
  )

  // Generate new meal plan
  const [generateState, { execute: generateMealPlan }] = useApiCall(
    mealPlanningService.generateMealPlan
  )

  // Swap meal functionality
  const [swapState, { execute: swapMeal }] = useApiCall(
    mealPlanningService.swapMeal
  )

  // Apply meal swap - TODO: Connect to swap UI when modal is implemented
  const [applySwapState, { execute: applyMealSwap }] = useApiCall(
    mealPlanningService.applyMealSwap
  )

  // Food logging functionality
  const [logFoodState, { execute: logFood }] = useApiCall(
    foodLoggingService.logFood
  )

  const currentMealPlan = mealPlanState.data
  const selectedDayPlan = currentMealPlan?.days[selectedDay]

  const handleGeneratePlan = useCallback(async () => {
    setIsGeneratingPlan(true)
    const result = await generateMealPlan({
      userId,
      userProfile: mockUserProfile,
      planDuration: 7,
      targetCalories: 1800, // Based on user profile
      macroTargets: {
        protein: 25,
        carbs: 45,
        fat: 30
      }
    })
    
    if (result) {
      await refetchMealPlan()
    }
    setIsGeneratingPlan(false)
  }, [generateMealPlan, userId, refetchMealPlan])

  // Generate initial meal plan if none exists
  useEffect(() => {
    const initializeMealPlan = async () => {
      if (!mealPlanState.loading && !mealPlanState.data && !mealPlanState.error) {
        await handleGeneratePlan()
      }
    }
    initializeMealPlan()
  }, [mealPlanState.loading, mealPlanState.data, mealPlanState.error, handleGeneratePlan])

  // Update API mode when status changes
  useEffect(() => {
    const updateApiMode = () => {
      setApiMode(getApiStatus())
    }
    
    // Check immediately and set up periodic checks
    updateApiMode()
    const interval = setInterval(updateApiMode, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleSwapMeal = async (mealType: string, dayIndex: number) => {
    if (!currentMealPlan) return

    const currentMeal = selectedDayPlan?.meals.find(m => m.mealType === mealType)
    if (!currentMeal) return

    const swapOptions = await swapMeal({
      mealPlanId: currentMealPlan.id,
      dayIndex,
      mealType: mealType as 'breakfast' | 'lunch' | 'snack' | 'dinner',
      currentRecipeId: currentMeal.recipe.id,
      preferences: {
        maxPrepTime: 30,
        difficulty: 'Easy'
      }
    })

    if (swapOptions) {
      setShowSwapOptions({ mealType, dayIndex })
    }
  }

  // TODO: Connect to swap selection UI - currently being prepared
  const handleApplySwap = async (newRecipeId: string) => {
    if (!currentMealPlan || !showSwapOptions) return

    const result = await applyMealSwap(
      currentMealPlan.id,
      showSwapOptions.dayIndex,
      showSwapOptions.mealType,
      newRecipeId
    )

    if (result) {
      await refetchMealPlan()
      setShowSwapOptions(null)
    }
  }

  const handleLogFood = async (mealType: string, recipeId: string) => {
    if (!currentMealPlan) return

    setLoggingMeal({ mealId: recipeId, mealType })
    
    try {
      const today = new Date().toISOString().split('T')[0]
      await logFood({
        userId,
        date: today,
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        recipeId,
        portionSize: 1.0,
        source: 'meal_plan'
      })
      
      // Show success message (you could add a toast notification here)
      console.log(`✅ Successfully logged ${mealType}`)
    } catch (error) {
      console.error('Failed to log meal:', error)
    } finally {
      setLoggingMeal(null)
    }
  }

  // Show loading state while generating or fetching
  if (mealPlanState.loading || isGeneratingPlan || generateState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isGeneratingPlan ? 'Generating Your Personalized Meal Plan...' : 'Loading Meal Plan...'}
          </h2>
          <p className="text-gray-600">
            {isGeneratingPlan 
              ? 'Our AI is creating a plan based on your goals, preferences, and health profile.'
              : 'Please wait while we fetch your meal plan.'
            }
          </p>
        </div>
      </div>
    )
  }

  // Show error state
  if (mealPlanState.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Meal Plan</h2>
          <p className="text-gray-600 mb-4">{mealPlanState.error}</p>
          <button
            onClick={handleGeneratePlan}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
          >
            Generate New Plan
          </button>
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
                  {swapState.loading && showSwapOptions?.mealType === mealEntry.mealType ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                      Finding alternatives...
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSwapMeal(mealEntry.mealType, selectedDay)}
                      disabled={swapState.loading}
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
                    <button 
                      onClick={() => handleLogFood(mealEntry.mealType, meal.id)}
                      disabled={loggingMeal?.mealId === meal.id}
                      className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
                    >
                      {loggingMeal?.mealId === meal.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          Logging...
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add to Log
                        </>
                      )}
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