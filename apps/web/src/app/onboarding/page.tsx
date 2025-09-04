'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UserData {
  id: string;
  name: string;
  email: string;
  profileCompleted: boolean;
}

export default function Onboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Onboarding steps as defined in PROMPT_README.md
  const steps = [
    'Welcome',
    'Basic Info',
    'Lifestyle',
    'Health',
    'Food Preferences',
    'Goals',
    'Complete'
  ]

  useEffect(() => {
    // Get user data from localStorage
    const storedUserData = localStorage.getItem('user_data')
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData))
    } else {
      // No user data, redirect to login
      router.push('/auth/login')
    }
  }, [router])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding
      completeOnboarding()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeOnboarding = async () => {
    setIsLoading(true)
    try {
      // Update user profile as completed
      if (userData) {
        const updatedUser = { ...userData, profileCompleted: true }
        localStorage.setItem('user_data', JSON.stringify(updatedUser))
      }
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to HealthCoach AI! 👋
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Let's set up your personalized health profile to provide you with the best recommendations.
            </p>
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                What we'll collect:
              </h3>
              <ul className="text-left text-blue-800 space-y-2">
                <li>✓ Basic information (name, age, height, weight)</li>
                <li>✓ Lifestyle habits (sleep, activity, etc.)</li>
                <li>✓ Health conditions and goals</li>
                <li>✓ Food preferences and dietary restrictions</li>
                <li>✓ Health and fitness goals</li>
              </ul>
            </div>
          </div>
        )
      
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Basic Information
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sex
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      className="mr-2"
                    />
                    Male
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      className="mr-2"
                    />
                    Female
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="other"
                      className="mr-2"
                    />
                    Other
                  </label>
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Lifestyle Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select your activity level</option>
                  <option value="sedentary">Sedentary (desk job, no exercise)</option>
                  <option value="light">Light (light exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
                  <option value="active">Very Active (hard exercise 6-7 days/week)</option>
                  <option value="extra">Extra Active (very hard exercise, physical job)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sleep Hours (per night)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="12"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Water Intake (glasses per day)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do you smoke?
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input type="radio" name="smoking" value="never" className="mr-2" />
                    Never
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="smoking" value="occasionally" className="mr-2" />
                    Occasionally
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="smoking" value="regularly" className="mr-2" />
                    Regularly
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alcohol consumption
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select frequency</option>
                  <option value="never">Never</option>
                  <option value="rarely">Rarely (few times a year)</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Health Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health Conditions (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Diabetes', 'High Blood Pressure', 'Low Blood Pressure',
                    'PCOS', 'Thyroid Issues', 'Heart Disease',
                    'Fatty Liver', 'Sleep Disorders', 'Arthritis',
                    'Food Allergies', 'Nutrient Deficiencies', 'None'
                  ].map((condition) => (
                    <label key={condition} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        value={condition}
                      />
                      {condition}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Health Reports (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="health-reports"
                  />
                  <label htmlFor="health-reports" className="cursor-pointer">
                    <div className="text-gray-600">
                      <p>Click to upload blood tests, medical reports</p>
                      <p className="text-sm">PDF, JPG, PNG files supported</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="List any medications you're currently taking..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Food Preferences
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian',
                    'Pescatarian', 'Keto', 'Mediterranean', 'No Preference'
                  ].map((diet) => (
                    <label key={diet} className="flex items-center">
                      <input
                        type="radio"
                        name="diet"
                        value={diet}
                        className="mr-2"
                      />
                      {diet}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favorite Cuisines (select all that apply)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    'Indian', 'Chinese', 'Italian', 'Mexican',
                    'Thai', 'Japanese', 'Mediterranean', 'American',
                    'Continental', 'South Indian', 'North Indian', 'Regional Indian'
                  ].map((cuisine) => (
                    <label key={cuisine} className="flex items-center">
                      <input
                        type="checkbox"
                        value={cuisine}
                        className="mr-2"
                      />
                      {cuisine}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meals per day
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="2">2 meals</option>
                    <option value="3" selected>3 meals</option>
                    <option value="4">4 meals</option>
                    <option value="5">5 meals</option>
                    <option value="6">6 meals</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Snacks per day
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="0">No snacks</option>
                    <option value="1">1 snack</option>
                    <option value="2" selected>2 snacks</option>
                    <option value="3">3 snacks</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Food Cravings & Preferences
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Sweet foods', 'Spicy foods', 'Fried foods', 'Street food',
                    'Ice cream', 'Chocolate', 'Tea/Coffee', 'Cold drinks',
                    'Nuts & dry fruits', 'Dairy products'
                  ].map((craving) => (
                    <label key={craving} className="flex items-center">
                      <input
                        type="checkbox"
                        value={craving}
                        className="mr-2"
                      />
                      {craving}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Health & Fitness Goals
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Goal
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Weight Loss', 'Weight Gain', 'Maintain Weight',
                    'Muscle Gain', 'Improve Health', 'Manage Health Condition'
                  ].map((goal) => (
                    <label key={goal} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="radio"
                        name="primary_goal"
                        value={goal}
                        className="mr-3"
                      />
                      <span className="font-medium">{goal}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Timeline
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select timeline</option>
                  <option value="1-month">1 Month</option>
                  <option value="3-months">3 Months</option>
                  <option value="6-months">6 Months</option>
                  <option value="1-year">1 Year</option>
                  <option value="long-term">Long-term (2+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Health Improvements (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Better Sleep', 'More Energy', 'Better Digestion',
                    'Reduce Stress', 'Improve Skin', 'Better Immunity',
                    'Joint Health', 'Heart Health', 'Mental Health'
                  ].map((improvement) => (
                    <label key={improvement} className="flex items-center">
                      <input
                        type="checkbox"
                        value={improvement}
                        className="mr-2"
                      />
                      {improvement}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific requirements, challenges, or goals you'd like to mention..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Setup Complete! 🎉
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Your personalized health profile is ready. We'll now create your custom meal plans and recommendations.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                What's Next?
              </h3>
              <ul className="text-left text-blue-800 space-y-2">
                <li>✓ AI-generated 7-day meal plan</li>
                <li>✓ Personalized nutrition recommendations</li>
                <li>✓ Health insights and progress tracking</li>
                <li>✓ Chat with your AI health coach</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500">
              You can always update your preferences in your profile settings.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {steps[currentStep]}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              currentStep === steps.length - 1 ? 'Start Your Journey' : 'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}