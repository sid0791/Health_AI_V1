'use client'

import { useState } from 'react'
import { 
  ClockIcon,
  FireIcon,
  HeartIcon,
  StarIcon,
  ArrowPathIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const mealTypes = [
  { id: 'breakfast', name: 'Breakfast', time: '7:00 AM' },
  { id: 'lunch', name: 'Lunch', time: '12:30 PM' },
  { id: 'snack', name: 'Snack', time: '4:00 PM' },
  { id: 'dinner', name: 'Dinner', time: '7:30 PM' },
]

const sampleMeals = {
  breakfast: [
    {
      id: 1,
      name: 'Oatmeal with Berries and Nuts',
      calories: 340,
      protein: 12,
      carbs: 58,
      fat: 8,
      prepTime: 10,
      difficulty: 'Easy',
      image: '🥣',
      ingredients: ['Rolled oats', 'Mixed berries', 'Almonds', 'Chia seeds', 'Honey']
    },
    {
      id: 2,
      name: 'Vegetable Poha with Peanuts',
      calories: 280,
      protein: 8,
      carbs: 45,
      fat: 6,
      prepTime: 15,
      difficulty: 'Easy',
      image: '🍛',
      ingredients: ['Poha (flattened rice)', 'Mixed vegetables', 'Peanuts', 'Curry leaves', 'Turmeric']
    }
  ],
  lunch: [
    {
      id: 3,
      name: 'Quinoa Bowl with Grilled Chicken',
      calories: 485,
      protein: 32,
      carbs: 45,
      fat: 15,
      prepTime: 25,
      difficulty: 'Medium',
      image: '🥗',
      ingredients: ['Quinoa', 'Grilled chicken', 'Mixed greens', 'Cherry tomatoes', 'Avocado']
    },
    {
      id: 4,
      name: 'Dal Tadka with Brown Rice',
      calories: 420,
      protein: 18,
      carbs: 65,
      fat: 8,
      prepTime: 30,
      difficulty: 'Medium',
      image: '🍚',
      ingredients: ['Toor dal', 'Brown rice', 'Onions', 'Tomatoes', 'Spices']
    }
  ],
  snack: [
    {
      id: 5,
      name: 'Greek Yogurt with Honey',
      calories: 150,
      protein: 15,
      carbs: 20,
      fat: 3,
      prepTime: 2,
      difficulty: 'Easy',
      image: '🥄',
      ingredients: ['Greek yogurt', 'Honey', 'Walnuts']
    }
  ],
  dinner: [
    {
      id: 6,
      name: 'Grilled Salmon with Vegetables',
      calories: 420,
      protein: 35,
      carbs: 15,
      fat: 22,
      prepTime: 20,
      difficulty: 'Medium',
      image: '🐟',
      ingredients: ['Salmon fillet', 'Broccoli', 'Asparagus', 'Olive oil', 'Lemon']
    }
  ]
}

export default function MealPlanPage() {
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [currentMeals, setCurrentMeals] = useState(() => {
    // Initialize with first meal from each category
    return {
      breakfast: sampleMeals.breakfast[0],
      lunch: sampleMeals.lunch[0],
      snack: sampleMeals.snack[0],
      dinner: sampleMeals.dinner[0],
    }
  })

  const swapMeal = (mealType: string) => {
    const availableMeals = sampleMeals[mealType as keyof typeof sampleMeals]
    const currentMealId = currentMeals[mealType as keyof typeof currentMeals].id
    const nextMeal = availableMeals.find(meal => meal.id !== currentMealId) || availableMeals[0]
    
    setCurrentMeals(prev => ({
      ...prev,
      [mealType]: nextMeal
    }))
  }

  const totalCalories = Object.values(currentMeals).reduce((sum, meal) => sum + meal.calories, 0)
  const totalProtein = Object.values(currentMeals).reduce((sum, meal) => sum + meal.protein, 0)
  const totalCarbs = Object.values(currentMeals).reduce((sum, meal) => sum + meal.carbs, 0)
  const totalFat = Object.values(currentMeals).reduce((sum, meal) => sum + meal.fat, 0)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
          Weekly Meal Plan
        </h1>
        <p className="text-gray-600">
          Your personalized AI-generated meal plan based on your health goals and preferences
        </p>
      </div>

      {/* Day Selector */}
      <div className="mb-8">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {daysOfWeek.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDay === day
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
              <p className="text-xl font-bold text-gray-900">{totalCalories}</p>
            </div>
            <FireIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Protein</p>
              <p className="text-xl font-bold text-gray-900">{totalProtein}g</p>
            </div>
            <HeartIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Carbs</p>
              <p className="text-xl font-bold text-gray-900">{totalCarbs}g</p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fat</p>
              <p className="text-xl font-bold text-gray-900">{totalFat}g</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-6">
        {mealTypes.map((mealType) => {
          const meal = currentMeals[mealType.id as keyof typeof currentMeals]
          return (
            <div key={mealType.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-display">
                    {mealType.name}
                  </h3>
                  <p className="text-sm text-gray-600">{mealType.time}</p>
                </div>
                <button
                  onClick={() => swapMeal(mealType.id)}
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Swap
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{meal.image}</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{meal.name}</h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <FireIcon className="h-4 w-4 mr-1" />
                          {meal.calories} cal
                        </span>
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {meal.prepTime} min
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          {meal.difficulty}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Ingredients:</h5>
                        <div className="flex flex-wrap gap-1">
                          {meal.ingredients.map((ingredient, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Nutrition Facts</h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="font-medium text-gray-900 ml-1">{meal.protein}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Carbs:</span>
                        <span className="font-medium text-gray-900 ml-1">{meal.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fat:</span>
                        <span className="font-medium text-gray-900 ml-1">{meal.fat}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Calories:</span>
                        <span className="font-medium text-gray-900 ml-1">{meal.calories}</span>
                      </div>
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
        <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  )
}