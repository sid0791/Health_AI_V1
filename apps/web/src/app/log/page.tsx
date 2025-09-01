'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  BeakerIcon,
  CalculatorIcon,
  ScaleIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline'

const logTabs = [
  { id: 'food', name: 'Food', icon: BeakerIcon },
  { id: 'water', name: 'Water', icon: BeakerIcon },
  { id: 'weight', name: 'Weight', icon: ScaleIcon },
  { id: 'mood', name: 'Mood', icon: FaceSmileIcon },
]

const recentFoods = [
  { name: 'Banana', calories: 105, carbs: 27, protein: 1, fat: 0, serving: '1 medium' },
  { name: 'Greek Yogurt', calories: 130, carbs: 9, protein: 23, fat: 0, serving: '1 cup' },
  { name: 'Almonds', calories: 162, carbs: 6, protein: 6, fat: 14, serving: '1 oz (23 nuts)' },
  { name: 'Apple', calories: 95, carbs: 25, protein: 0, fat: 0, serving: '1 medium' },
  { name: 'Chicken Breast', calories: 231, carbs: 0, protein: 43, fat: 5, serving: '100g' },
  { name: 'Brown Rice', calories: 216, carbs: 44, protein: 5, fat: 2, serving: '1 cup cooked' },
]

const quickAddFoods = [
  { name: 'Chapati', calories: 120, emoji: '🫓' },
  { name: 'Dal', calories: 180, emoji: '🍲' },
  { name: 'Rice', calories: 205, emoji: '🍚' },
  { name: 'Sabzi', calories: 80, emoji: '🥬' },
  { name: 'Chai', calories: 50, emoji: '☕' },
  { name: 'Fruits', calories: 60, emoji: '🍎' },
]

const todaysLog = [
  { time: '8:00 AM', food: 'Oatmeal with Berries', calories: 340, meal: 'Breakfast' },
  { time: '10:30 AM', food: 'Green Tea', calories: 0, meal: 'Snack' },
  { time: '1:00 PM', food: 'Quinoa Bowl', calories: 485, meal: 'Lunch' },
  { time: '4:00 PM', food: 'Greek Yogurt', calories: 150, meal: 'Snack' },
]

const nutritionGoals = {
  calories: { current: 975, target: 2000 },
  protein: { current: 45, target: 150 },
  carbs: { current: 120, target: 250 },
  fat: { current: 35, target: 67 },
}

export default function LogPage() {
  const [activeTab, setActiveTab] = useState('food')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setIsSearching(query.length > 0)
  }

  const filteredFoods = recentFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const NutritionRing = ({ label, current, target, color }: { 
    label: string, 
    current: number, 
    target: number, 
    color: string 
  }) => {
    const percentage = Math.min((current / target) * 100, 100)
    const circumference = 2 * Math.PI * 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={color}
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-900">{current}</span>
            <span className="text-xs text-gray-500">/{target}</span>
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700 mt-2">{label}</span>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
          Food & Activity Log
        </h1>
        <p className="text-gray-600">
          Track your meals, water intake, weight, and mood throughout the day
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {logTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'food' && (
        <>
          {/* Nutrition Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
                  Today&apos;s Nutrition
                </h3>
                <div className="grid grid-cols-4 gap-6">
                  <NutritionRing 
                    label="Calories" 
                    current={nutritionGoals.calories.current} 
                    target={nutritionGoals.calories.target}
                    color="text-blue-500"
                  />
                  <NutritionRing 
                    label="Protein" 
                    current={nutritionGoals.protein.current} 
                    target={nutritionGoals.protein.target}
                    color="text-red-500"
                  />
                  <NutritionRing 
                    label="Carbs" 
                    current={nutritionGoals.carbs.current} 
                    target={nutritionGoals.carbs.target}
                    color="text-yellow-500"
                  />
                  <NutritionRing 
                    label="Fat" 
                    current={nutritionGoals.fat.current} 
                    target={nutritionGoals.fat.target}
                    color="text-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
                  Quick Add
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickAddFoods.map((food, index) => (
                    <button
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-2xl">{food.emoji}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{food.name}</p>
                        <p className="text-xs text-gray-600">{food.calories} cal</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Food Search & Add */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
                  Add Food
                </h3>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search for food (English/Hindi/Hinglish)"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 pl-10"
                  />
                </div>

                {/* Search Results or Recent Foods */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    searchQuery.length > 2 ? (
                      filteredFoods.length > 0 ? (
                        filteredFoods.map((food, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{food.name}</p>
                              <p className="text-sm text-gray-600">{food.serving}</p>
                              <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                                <span>{food.calories} cal</span>
                                <span>{food.protein}g protein</span>
                                <span>{food.carbs}g carbs</span>
                                <span>{food.fat}g fat</span>
                              </div>
                            </div>
                            <button className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500">
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No foods found for &quot;{searchQuery}&quot;</p>
                          <button className="mt-2 text-sm text-primary-600 hover:text-primary-700">
                            Add as custom food
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Type at least 3 characters to search</p>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-900 mb-2">Recent Foods</div>
                      {recentFoods.map((food, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{food.name}</p>
                            <p className="text-sm text-gray-600">{food.serving}</p>
                            <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                              <span>{food.calories} cal</span>
                              <span>{food.protein}g protein</span>
                              <span>{food.carbs}g carbs</span>
                              <span>{food.fat}g fat</span>
                            </div>
                          </div>
                          <button className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500">
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
                Today&apos;s Log
              </h3>
              <div className="space-y-4">
                {todaysLog.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">{entry.time}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{entry.food}</p>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                            {entry.meal}
                          </span>
                          <span className="text-sm text-gray-600">{entry.calories} cal</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <CalculatorIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total Calories:</span>
                  <span className="text-lg font-bold text-primary-600">
                    {todaysLog.reduce((sum, entry) => sum + entry.calories, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'water' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
            Water Intake
          </h3>
          <div className="text-center py-12">
            <BeakerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Track your daily water intake</p>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-blue-600">6.2L</div>
              <div className="text-gray-600">of 8L daily goal</div>
              <div className="flex justify-center space-x-2">
                <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">+250ml</button>
                <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">+500ml</button>
                <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm">+1L</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'weight' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
            Weight Tracking
          </h3>
          <div className="text-center py-12">
            <ScaleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Log your weight measurements</p>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-green-600">72.5 kg</div>
              <div className="text-gray-600">Last updated: Today</div>
              <button className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500">
                Add New Weight
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mood' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
            Mood & Energy
          </h3>
          <div className="text-center py-12">
            <FaceSmileIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">How are you feeling today?</p>
            <div className="flex justify-center space-x-4 mb-6">
              {['😢', '😕', '😐', '😊', '😄'].map((emoji, index) => (
                <button
                  key={index}
                  className="text-4xl p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add notes about your mood or energy levels..."
              className="w-full max-w-md mx-auto p-3 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}