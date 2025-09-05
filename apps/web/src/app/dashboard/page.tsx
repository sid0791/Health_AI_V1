'use client'

import { 
  HeartIcon, 
  ChartBarIcon, 
  ClipboardDocumentListIcon,
  BeakerIcon,
  FireIcon,
  ClockIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid, 
  ChartBarIcon as ChartBarIconSolid 
} from '@heroicons/react/24/solid'
import { useAuth } from '../../hooks/useAuth'
import Link from 'next/link'

const stats = [
  { name: 'Daily Calories', value: '1,847', target: '2,000', icon: FireIcon, change: '+5%', changeType: 'positive' },
  { name: 'Water Intake', value: '6.2L', target: '8L', icon: BeakerIcon, change: '-2%', changeType: 'negative' },
  { name: 'Active Minutes', value: '45', target: '60', icon: ClockIcon, change: '+12%', changeType: 'positive' },
  { name: 'Goal Progress', value: '78%', target: '100%', icon: TrophyIcon, change: '+8%', changeType: 'positive' },
]

const recentMeals = [
  { name: 'Quinoa Bowl with Grilled Chicken', time: '12:30 PM', calories: 485, protein: 32 },
  { name: 'Greek Yogurt with Berries', time: '9:15 AM', calories: 180, protein: 15 },
  { name: 'Green Smoothie', time: '7:00 AM', calories: 165, protein: 8 },
]

const todaysPlan = [
  { time: '6:00 PM', activity: 'Leg Workout', duration: '45 min', type: 'fitness' },
  { time: '7:30 PM', activity: 'Grilled Salmon with Vegetables', calories: 420, type: 'meal' },
  { time: '9:00 PM', activity: 'Evening Meditation', duration: '10 min', type: 'wellness' },
]

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth(true) // Require authentication

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, the useAuth hook will redirect, but show loading state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-display">
          Good morning, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          You&apos;re on track to meet your health goals today. Keep up the great work!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm text-gray-500">of {stat.target}</p>
              </div>
              <div className="flex flex-col items-end">
                <stat.icon className="h-8 w-8 text-primary-600 mb-2" />
                <div className={`flex items-center text-sm ${
                  stat.changeType === 'positive' ? 'text-success-600' : 'text-error-600'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {stat.change}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 font-display">Today&apos;s Schedule</h2>
            <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {todaysPlan.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    item.type === 'fitness' ? 'bg-secondary-500' :
                    item.type === 'meal' ? 'bg-primary-500' : 'bg-purple-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{item.activity}</p>
                    <p className="text-sm text-gray-600">{item.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  {item.duration && (
                    <p className="text-sm font-medium text-gray-900">{item.duration}</p>
                  )}
                  {item.calories && (
                    <p className="text-sm text-gray-600">{item.calories} cal</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Meals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 font-display">Recent Meals</h2>
            <BeakerIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentMeals.map((meal, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{meal.name}</p>
                  <p className="text-sm text-gray-600">{meal.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{meal.calories} cal</p>
                  <p className="text-sm text-gray-600">{meal.protein}g protein</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 font-display">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/log" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 flex items-center justify-center space-x-2">
            <ClipboardDocumentListIcon className="h-5 w-5" />
            <span>Log Meal</span>
          </Link>
          <Link href="/fitness" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 flex items-center justify-center space-x-2">
            <HeartIcon className="h-5 w-5" />
            <span>Start Workout</span>
          </Link>
          <Link href="/analytics" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500 flex items-center justify-center space-x-2">
            <ChartBarIcon className="h-5 w-5" />
            <span>View Analytics</span>
          </Link>
        </div>
      </div>

      {/* Health Insights */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 font-display">AI Health Insights</h2>
          <ChartBarIconSolid className="h-5 w-5 text-primary-600" />
        </div>
        <div className="bg-primary-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <HeartIconSolid className="h-6 w-6 text-primary-600 mt-1" />
            <div>
              <h3 className="font-medium text-primary-900">Great progress on your protein intake!</h3>
              <p className="text-primary-700 text-sm mt-1">
                You&apos;ve increased your protein consumption by 15% this week. Your muscle recovery should improve. 
                Consider adding a post-workout protein shake for optimal results.
              </p>
              <button className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700">
                View detailed analysis →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}