'use client'

import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  BeakerIcon,
  CalculatorIcon,
  ScaleIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline'
import { foodDatabaseService, type FoodItem, type DailyNutritionSummary, type FoodLogEntry } from '../../services/foodDatabaseService'
import { useAuth } from '../../hooks/useAuth'

const logTabs = [
  { id: 'food', name: 'Food', icon: BeakerIcon },
  { id: 'water', name: 'Water', icon: BeakerIcon },
  { id: 'weight', name: 'Weight', icon: ScaleIcon },
  { id: 'mood', name: 'Mood', icon: FaceSmileIcon },
]

export default function LogPage() {
  const [activeTab, setActiveTab] = useState('food')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<FoodItem[]>([])
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([])
  const [popularFoods, setPopularFoods] = useState<FoodItem[]>([])
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutritionSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [user])

  const loadInitialData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [recentFoodsData, popularFoodsData, nutritionData] = await Promise.all([
        foodDatabaseService.getRecentFoods(user.id),
        foodDatabaseService.getPopularFoods(),
        foodDatabaseService.getDailyNutrition(new Date().toISOString().split('T')[0], user.id)
      ])

      setRecentFoods(recentFoodsData)
      setPopularFoods(popularFoodsData.slice(0, 6)) // Get 6 for quick add
      setDailyNutrition(nutritionData)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setIsSearching(query.length > 0)

    if (query.length >= 3) {
      try {
        const results = await foodDatabaseService.searchFoodsWithNutrition(query)
        setSearchResults(results)
      } catch (error) {
        console.error('Search failed:', error)
        setSearchResults([])
      }
    } else {
      setSearchResults([])
    }
  }

  const handleAddFood = async (food: FoodItem, servingMultiplier: number = 1, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'snack') => {
    if (!user) return

    try {
      const logEntry = await foodDatabaseService.logFood({
        userId: user.id,
        foodId: food.id,
        food,
        quantity: 1,
        servingMultiplier,
        mealType,
        actualCalories: food.calories * servingMultiplier,
        actualNutrition: {
          protein: food.nutrition.protein * servingMultiplier,
          carbs: food.nutrition.carbs * servingMultiplier,
          fat: food.nutrition.fat * servingMultiplier,
          fiber: (food.nutrition.fiber || 0) * servingMultiplier
        }
      })

      // Refresh daily nutrition
      const updatedNutrition = await foodDatabaseService.getDailyNutrition(
        new Date().toISOString().split('T')[0], 
        user.id
      )
      setDailyNutrition(updatedNutrition)

      // Add to recent foods if not already there
      if (!recentFoods.some(f => f.id === food.id)) {
        setRecentFoods([food, ...recentFoods.slice(0, 9)])
      }

      console.log('Food logged successfully:', logEntry)
    } catch (error) {
      console.error('Failed to log food:', error)
    }
  }

  const filteredFoods = isSearching ? searchResults : recentFoods

  const quickAddFoods = popularFoods.map(food => ({
    name: food.name,
    calories: food.calories,
    emoji: getFoodEmoji(food.category, food.name),
    food
  }))

  function getFoodEmoji(category: string, name: string): string {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('rice')) return '🍚'
    if (lowerName.includes('chapati') || lowerName.includes('bread')) return '🫓'
    if (lowerName.includes('dal') || lowerName.includes('lentil')) return '🍲'
    if (lowerName.includes('chicken')) return '🍗'
    if (lowerName.includes('paneer')) return '🧀'
    if (lowerName.includes('banana')) return '🍌'
    if (lowerName.includes('apple')) return '🍎'
    if (lowerName.includes('egg')) return '🥚'
    if (category === 'Vegetables') return '🥬'
    if (category === 'Fruits') return '🍎'
    if (category === 'Dairy') return '🥛'
    if (category === 'Meat') return '🍖'
    if (category === 'Grains') return '🌾'
    return '🍽️'
  }

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
                    current={dailyNutrition?.totalCalories || 0} 
                    target={dailyNutrition?.goals.calories || 2000}
                    color="text-blue-500"
                  />
                  <NutritionRing 
                    label="Protein" 
                    current={dailyNutrition?.totalProtein || 0} 
                    target={dailyNutrition?.goals.protein || 150}
                    color="text-red-500"
                  />
                  <NutritionRing 
                    label="Carbs" 
                    current={dailyNutrition?.totalCarbs || 0} 
                    target={dailyNutrition?.goals.carbs || 250}
                    color="text-yellow-500"
                  />
                  <NutritionRing 
                    label="Fat" 
                    current={dailyNutrition?.totalFat || 0} 
                    target={dailyNutrition?.goals.fat || 67}
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
                  {quickAddFoods.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddFood(item.food)}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-600">{item.calories} cal</p>
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
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-gray-500">Loading foods...</p>
                    </div>
                  ) : isSearching ? (
                    searchQuery.length > 2 ? (
                      filteredFoods.length > 0 ? (
                        filteredFoods.map((food, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{food.name}</p>
                              <p className="text-sm text-gray-600">{food.servingSize}</p>
                              <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                                <span>{food.calories} cal</span>
                                <span>{Math.round(food.nutrition.protein)}g protein</span>
                                <span>{Math.round(food.nutrition.carbs)}g carbs</span>
                                <span>{Math.round(food.nutrition.fat)}g fat</span>
                              </div>
                              {food.source && (
                                <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                                  food.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {food.verified ? 'Verified' : food.source}
                                </span>
                              )}
                            </div>
                            <button 
                              onClick={() => handleAddFood(food)}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
                            >
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
                        <p className="text-xs text-gray-400 mt-1">Try &quot;white rice&quot;, &quot;chicken&quot;, &quot;dal&quot;</p>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="text-sm font-medium text-gray-900 mb-2">Recent Foods</div>
                      {filteredFoods.length > 0 ? (
                        filteredFoods.map((food, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{food.name}</p>
                              <p className="text-sm text-gray-600">{food.servingSize}</p>
                              <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                                <span>{food.calories} cal</span>
                                <span>{Math.round(food.nutrition.protein)}g protein</span>
                                <span>{Math.round(food.nutrition.carbs)}g carbs</span>
                                <span>{Math.round(food.nutrition.fat)}g fat</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleAddFood(food)}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No recent foods. Search to add your first meal!</p>
                        </div>
                      )}
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
                {dailyNutrition && Object.values(dailyNutrition.meals).flat().length > 0 ? (
                  Object.entries(dailyNutrition.meals).map(([mealType, entries]) => 
                    entries.map((entry, index) => (
                      <div key={`${mealType}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col items-center">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(entry.loggedAt).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{entry.food.name}</p>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                mealType === 'breakfast' ? 'bg-yellow-100 text-yellow-800' :
                                mealType === 'lunch' ? 'bg-green-100 text-green-800' :
                                mealType === 'dinner' ? 'bg-blue-100 text-blue-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                              </span>
                              <span className="text-sm text-gray-600">{Math.round(entry.actualCalories)} cal</span>
                              {entry.servingMultiplier !== 1 && (
                                <span className="text-xs text-gray-500">({entry.servingMultiplier}x)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <CalculatorIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No foods logged today</p>
                    <p className="text-xs text-gray-400 mt-1">Search and add foods to start tracking</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total Calories:</span>
                  <span className="text-lg font-bold text-primary-600">
                    {Math.round(dailyNutrition?.totalCalories || 0)}
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