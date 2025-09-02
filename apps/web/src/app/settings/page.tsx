'use client'

import { useState } from 'react'
import { 
  UserIcon, 
  BellIcon, 
  ShieldCheckIcon,
  CogIcon,
  HeartIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const [notifications, setNotifications] = useState({
    mealReminders: true,
    workoutReminders: true,
    healthReports: true,
    weeklyProgress: true,
    marketing: false
  })

  const [privacy, setPrivacy] = useState({
    dataSharing: false,
    analytics: true,
    healthDataExport: true
  })

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handlePrivacyChange = (key: keyof typeof privacy) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-display">
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your account preferences and privacy settings
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 text-primary-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue="Alex Johnson"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue="alex@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  defaultValue="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  defaultValue="1990-05-15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  defaultValue="175"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Weight (kg)
                </label>
                <input
                  type="number"
                  defaultValue="70"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Health Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <HeartIcon className="w-5 h-5 text-red-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Health Preferences</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="sedentary">Sedentary (little/no exercise)</option>
                  <option value="light">Light (light exercise 1-3 days/week)</option>
                  <option value="moderate" selected>Moderate (moderate exercise 3-5 days/week)</option>
                  <option value="very">Very Active (hard exercise 6-7 days/week)</option>
                  <option value="extremely">Extremely Active (very hard exercise, physical job)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Goal
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="weight-loss" selected>Weight Loss</option>
                  <option value="weight-gain">Weight Gain</option>
                  <option value="maintenance">Weight Maintenance</option>
                  <option value="muscle-gain">Muscle Gain</option>
                  <option value="general-health">General Health</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dietary Restrictions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Low-Carb', 'Keto', 'Paleo'].map((diet) => (
                  <label key={diet} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      defaultChecked={diet === 'Vegetarian'}
                    />
                    <span className="ml-2 text-sm text-gray-700">{diet}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Health Conditions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Diabetes', 'Hypertension', 'High Cholesterol', 'PCOS', 'Thyroid', 'Heart Disease'].map((condition) => (
                  <label key={condition} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{condition}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <BellIcon className="w-5 h-5 text-yellow-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { key: 'mealReminders', label: 'Meal Reminders', description: 'Get notified when it\'s time for your scheduled meals' },
                { key: 'workoutReminders', label: 'Workout Reminders', description: 'Reminders for your scheduled fitness activities' },
                { key: 'healthReports', label: 'Health Report Analysis', description: 'Notifications when your health reports are analyzed' },
                { key: 'weeklyProgress', label: 'Weekly Progress Updates', description: 'Summary of your weekly health and fitness progress' },
                { key: 'marketing', label: 'Marketing Communications', description: 'Updates about new features and health tips' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifications[key as keyof typeof notifications]}
                      onChange={() => handleNotificationChange(key as keyof typeof notifications)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 text-green-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { key: 'dataSharing', label: 'Data Sharing with Partners', description: 'Allow sharing anonymized data with research partners' },
                { key: 'analytics', label: 'Usage Analytics', description: 'Help improve the app by sharing usage analytics' },
                { key: 'healthDataExport', label: 'Health Data Export', description: 'Allow exporting your health data for personal use' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={privacy[key as keyof typeof privacy]}
                      onChange={() => handlePrivacyChange(key as keyof typeof privacy)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* App Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <CogIcon className="w-5 h-5 text-gray-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">App Preferences</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="en" selected>English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="light" selected>Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Units
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="metric" selected>Metric (kg, cm)</option>
                  <option value="imperial">Imperial (lbs, ft/in)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                  <option value="Asia/Kolkata" selected>India Standard Time (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="Europe/London">GMT</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <DevicePhoneMobileIcon className="w-5 h-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">Connected Devices</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { name: 'Apple Health', status: 'Connected', lastSync: '2 hours ago', icon: '🍎' },
                { name: 'Google Fit', status: 'Disconnected', lastSync: 'Never', icon: '📱' },
                { name: 'Fitbit', status: 'Connected', lastSync: '1 day ago', icon: '⌚' }
              ].map((device) => (
                <div key={device.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{device.icon}</span>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{device.name}</h3>
                      <p className="text-sm text-gray-500">Last sync: {device.lastSync}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    device.status === 'Connected' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {device.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Actions</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <GlobeAltIcon className="w-4 h-4 mr-2" />
                Export My Data
              </button>
              
              <button className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete Account
              </button>
              
              <button className="inline-flex items-center justify-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}