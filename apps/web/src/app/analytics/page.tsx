'use client'

import { useState } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  FireIcon,
  HeartIcon,
  BeakerIcon,
  ScaleIcon,
  TrophyIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const timeRanges = [
  { id: '7d', name: '7 Days' },
  { id: '30d', name: '30 Days' },
  { id: '3m', name: '3 Months' },
  { id: '1y', name: '1 Year' },
  { id: 'custom', name: 'Custom Range' },
]

const keyMetrics = [
  {
    name: 'Average Calories',
    value: '1,847',
    change: '+5.2%',
    changeType: 'positive',
    icon: FireIcon,
    description: 'Daily calorie intake'
  },
  {
    name: 'Weight Change',
    value: '-2.3 kg',
    change: '-3.1%',
    changeType: 'positive',
    icon: ScaleIcon,
    description: 'Since last month'
  },
  {
    name: 'Workout Consistency',
    value: '85%',
    change: '+12%',
    changeType: 'positive',
    icon: HeartIcon,
    description: 'Weekly goal completion'
  },
  {
    name: 'Sleep Quality',
    value: '7.2h',
    change: '-0.3h',
    changeType: 'negative',
    icon: ClockIcon,
    description: 'Average per night'
  },
]

const nutritionTrends = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  calories: [1650, 1820, 1750, 1900, 1680, 1950, 1800],
  protein: [120, 135, 128, 145, 125, 140, 130],
  carbs: [180, 200, 175, 220, 185, 210, 190],
  fat: [65, 70, 68, 75, 62, 78, 72],
}

const healthInsights = [
  {
    title: 'Protein Intake Improved',
    description: 'Your protein consumption increased by 15% this week, supporting muscle recovery.',
    type: 'positive',
    icon: TrophyIcon,
    date: '2 days ago'
  },
  {
    title: 'Hydration Goal Met',
    description: 'You consistently met your daily water intake goals for 6 days straight.',
    type: 'positive',
    icon: BeakerIcon,
    date: '1 day ago'
  },
  {
    title: 'Sleep Pattern Irregular',
    description: 'Your sleep schedule varied by more than 2 hours this week. Consider a consistent bedtime.',
    type: 'warning',
    icon: ClockIcon,
    date: 'Today'
  },
]

const progressGoals = [
  {
    name: 'Weight Loss Goal',
    current: 72.5,
    target: 68,
    unit: 'kg',
    progress: 78,
    timeframe: '3 months remaining'
  },
  {
    name: 'Muscle Gain',
    current: 45,
    target: 50,
    unit: 'kg lean mass',
    progress: 60,
    timeframe: '4 months remaining'
  },
  {
    name: 'Cardio Fitness',
    current: 42,
    target: 50,
    unit: 'VO2 max',
    progress: 84,
    timeframe: '2 months remaining'
  },
]

const weeklyStats = [
  { day: 'Mon', calories: 1650, workouts: 1, steps: 8500, water: 2.5 },
  { day: 'Tue', calories: 1820, workouts: 0, steps: 6200, water: 2.8 },
  { day: 'Wed', calories: 1750, workouts: 1, steps: 9100, water: 3.2 },
  { day: 'Thu', calories: 1900, workouts: 1, steps: 7800, water: 2.9 },
  { day: 'Fri', calories: 1680, workouts: 0, steps: 5900, water: 2.4 },
  { day: 'Sat', calories: 1950, workouts: 1, steps: 12500, water: 3.5 },
  { day: 'Sun', calories: 1800, workouts: 1, steps: 10200, water: 3.1 },
]

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'nutrition', name: 'Nutrition' },
    { id: 'fitness', name: 'Fitness' },
    { id: 'health', name: 'Health Trends' },
  ]

  const SimpleChart = ({ data, color = 'primary' }: { data: number[], color?: string }) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    
    return (
      <div className="flex items-end space-x-1 h-20">
        {data.map((value, index) => {
          const height = ((value - min) / (max - min)) * 100
          return (
            <div
              key={index}
              className={`flex-1 rounded-t ${
                color === 'primary' ? 'bg-primary-500' :
                color === 'green' ? 'bg-green-500' :
                color === 'blue' ? 'bg-blue-500' :
                color === 'orange' ? 'bg-orange-500' :
                'bg-gray-500'
              }`}
              style={{ height: `${height}%`, minHeight: '4px' }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
              Health Analytics
            </h1>
            <p className="text-gray-600">
              Track your progress and get AI-powered insights into your health journey
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {timeRanges.filter(range => range.id !== 'custom').map((range) => (
                <button
                  key={range.id}
                  onClick={() => setSelectedRange(range.id)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedRange === range.id
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range.name}
                </button>
              ))}
            </div>
            
            {/* Custom Date Range Button */}
            <button
              onClick={() => setSelectedRange('custom')}
              className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedRange === 'custom'
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4 mr-1.5" />
              Custom
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <metric.icon className="h-8 w-8 text-gray-400" />
              <div className={`flex items-center text-sm font-medium ${
                metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.changeType === 'positive' ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                )}
                {metric.change}
              </div>
            </div>
            <div className="mb-1">
              <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
              <p className="text-sm font-medium text-gray-900">{metric.name}</p>
            </div>
            <p className="text-sm text-gray-600">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Goals */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
                Goal Progress
              </h3>
              <div className="space-y-6">
                {progressGoals.map((goal, index) => (
                  <div key={index} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{goal.name}</h4>
                      <span className="text-sm text-gray-600">{goal.timeframe}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-primary-600">
                        {goal.current} {goal.unit}
                      </span>
                      <span className="text-sm text-gray-600">
                        Target: {goal.target} {goal.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{goal.progress}% complete</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Health Insights */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
                AI Health Insights
              </h3>
              <div className="space-y-4">
                {healthInsights.map((insight, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    insight.type === 'positive' ? 'bg-green-50 border-green-200' :
                    insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <insight.icon className={`h-5 w-5 mt-0.5 ${
                        insight.type === 'positive' ? 'text-green-600' :
                        insight.type === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          insight.type === 'positive' ? 'text-green-900' :
                          insight.type === 'warning' ? 'text-yellow-900' :
                          'text-red-900'
                        }`}>
                          {insight.title}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          insight.type === 'positive' ? 'text-green-700' :
                          insight.type === 'warning' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {insight.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">{insight.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'nutrition' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
              Daily Calories Trend
            </h3>
            <div className="mb-4">
              <SimpleChart data={nutritionTrends.calories} color="primary" />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              {nutritionTrends.labels.map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
              Macronutrient Breakdown
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Protein</span>
                  <span className="font-medium">132g avg</span>
                </div>
                <SimpleChart data={nutritionTrends.protein} color="green" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Carbohydrates</span>
                  <span className="font-medium">194g avg</span>
                </div>
                <SimpleChart data={nutritionTrends.carbs} color="blue" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Fat</span>
                  <span className="font-medium">70g avg</span>
                </div>
                <SimpleChart data={nutritionTrends.fat} color="orange" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fitness' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
            Weekly Activity Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Day</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Calories</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Workouts</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Steps</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Water (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weeklyStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{stat.day}</td>
                    <td className="px-4 py-3 text-gray-600">{stat.calories}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        stat.workouts > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stat.workouts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{stat.steps.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{stat.water}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
              Health Trends
            </h3>
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Advanced health trend analysis</p>
              <p className="text-sm text-gray-400">
                Connect health devices to see detailed trends for heart rate, blood pressure, and more.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
              Upcoming Health Goals
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Blood Pressure Check</p>
                  <p className="text-sm text-gray-600">Due in 3 days</p>
                </div>
                <button className="text-primary-600 hover:text-primary-700">
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Cholesterol Test</p>
                  <p className="text-sm text-gray-600">Due in 2 weeks</p>
                </div>
                <button className="text-primary-600 hover:text-primary-700">
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Annual Physical</p>
                  <p className="text-sm text-gray-600">Due in 1 month</p>
                </div>
                <button className="text-primary-600 hover:text-primary-700">
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}