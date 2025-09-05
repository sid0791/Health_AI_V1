'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, User, Heart, Target, ArrowRight, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface OnboardingData {
  basic?: {
    firstName: string
    lastName: string
    age: number
    gender: 'male' | 'female' | 'other'
    height: number
    weight: number
  }
  lifestyle?: {
    activityLevel: string
    sleepHours: number
    stressLevel: number
    smokingStatus: string
    alcoholConsumption: string
  }
  health?: {
    healthConditions: string[]
    medications: string[]
    allergies: string[]
  }
  preferences?: {
    dietType: string[]
    cuisinePreferences: string[]
    dislikes: string[]
    mealFrequency: number
  }
  goals?: {
    primaryGoals: string[]
    targetWeight: number
    timeline: string
    motivation: string
  }
}

const STEPS = [
  { id: 'basic', title: 'Basic Information', icon: User, description: 'Tell us about yourself' },
  { id: 'lifestyle', title: 'Lifestyle', icon: Heart, description: 'Your daily habits' },
  { id: 'health', title: 'Health', icon: AlertCircle, description: 'Health conditions & allergies' },
  { id: 'preferences', title: 'Food Preferences', icon: Heart, description: 'What you like to eat' },
  { id: 'goals', title: 'Goals', icon: Target, description: 'What you want to achieve' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const updateData = (stepData: any) => {
    const stepKey = STEPS[currentStep].id
    setOnboardingData(prev => ({
      ...prev,
      [stepKey]: stepData
    }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      // Send onboarding data to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(onboardingData)
      })

      if (response.ok) {
        // Redirect to dashboard with welcome message
        router.push('/dashboard?welcome=true&onboarding=complete')
      } else {
        setError('Failed to complete onboarding. Please try again.')
      }
    } catch (err) {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'basic':
        return <BasicInfoStep data={onboardingData.basic} onUpdate={updateData} />
      case 'lifestyle':
        return <LifestyleStep data={onboardingData.lifestyle} onUpdate={updateData} />
      case 'health':
        return <HealthStep data={onboardingData.health} onUpdate={updateData} />
      case 'preferences':
        return <PreferencesStep data={onboardingData.preferences} onUpdate={updateData} />
      case 'goals':
        return <GoalsStep data={onboardingData.goals} onUpdate={updateData} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to HealthCoach AI!</h1>
            <p className="text-gray-600 mt-2">Let's personalize your health journey</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center mt-6 space-x-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div key={step.id} className={`flex flex-col items-center space-y-1 ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isActive ? 'border-blue-600 bg-blue-50' : 
                    isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-300'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {/* @ts-ignore */}
              {React.createElement(STEPS[currentStep].icon, { className: "w-6 h-6" })}
              <span>{STEPS[currentStep].title}</span>
            </CardTitle>
            <CardDescription>{STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          <Button 
            onClick={nextStep} 
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <span>{currentStep === STEPS.length - 1 ? 'Complete Setup' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step Components
function BasicInfoStep({ data, onUpdate }: { data?: any, onUpdate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    firstName: data?.firstName || '',
    lastName: data?.lastName || '',
    age: data?.age || '',
    gender: data?.gender || '',
    height: data?.height || '',
    weight: data?.weight || ''
  })

  useEffect(() => {
    onUpdate(formData)
  }, [formData])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || '' }))}
            placeholder="Your age"
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            value={formData.height}
            onChange={(e) => setFormData(prev => ({ ...prev, height: parseInt(e.target.value) || '' }))}
            placeholder="Height in centimeters"
          />
        </div>
        <div>
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || '' }))}
            placeholder="Weight in kilograms"
          />
        </div>
      </div>
    </div>
  )
}

function LifestyleStep({ data, onUpdate }: { data?: any, onUpdate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    activityLevel: data?.activityLevel || '',
    sleepHours: data?.sleepHours || '',
    stressLevel: data?.stressLevel || '',
    smokingStatus: data?.smokingStatus || '',
    alcoholConsumption: data?.alcoholConsumption || ''
  })

  useEffect(() => {
    onUpdate(formData)
  }, [formData])

  return (
    <div className="space-y-4">
      <div>
        <Label>Activity Level</Label>
        <Select value={formData.activityLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, activityLevel: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select your activity level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
            <SelectItem value="light">Light (light exercise 1-3 days/week)</SelectItem>
            <SelectItem value="moderate">Moderate (moderate exercise 3-5 days/week)</SelectItem>
            <SelectItem value="active">Active (hard exercise 6-7 days/week)</SelectItem>
            <SelectItem value="very_active">Very Active (very hard exercise, physical job)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="sleepHours">Average Sleep Hours per Night</Label>
        <Input
          id="sleepHours"
          type="number"
          min="4"
          max="12"
          value={formData.sleepHours}
          onChange={(e) => setFormData(prev => ({ ...prev, sleepHours: parseInt(e.target.value) || '' }))}
          placeholder="7-8 hours recommended"
        />
      </div>

      <div>
        <Label>Stress Level</Label>
        <Select value={formData.stressLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, stressLevel: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="How would you rate your stress level?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Very Low</SelectItem>
            <SelectItem value="2">Low</SelectItem>
            <SelectItem value="3">Moderate</SelectItem>
            <SelectItem value="4">High</SelectItem>
            <SelectItem value="5">Very High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Smoking Status</Label>
        <Select value={formData.smokingStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, smokingStatus: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select your smoking status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never smoked</SelectItem>
            <SelectItem value="former">Former smoker</SelectItem>
            <SelectItem value="occasional">Occasional smoker</SelectItem>
            <SelectItem value="regular">Regular smoker</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Alcohol Consumption</Label>
        <Select value={formData.alcoholConsumption} onValueChange={(value) => setFormData(prev => ({ ...prev, alcoholConsumption: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="How often do you drink alcohol?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="rarely">Rarely (special occasions)</SelectItem>
            <SelectItem value="social">Social drinker (1-2 times/week)</SelectItem>
            <SelectItem value="regular">Regular (3-5 times/week)</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function HealthStep({ data, onUpdate }: { data?: any, onUpdate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    healthConditions: data?.healthConditions || [],
    medications: data?.medications || [],
    allergies: data?.allergies || []
  })

  useEffect(() => {
    onUpdate(formData)
  }, [formData])

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Health Conditions</Label>
        <p className="text-sm text-gray-600 mb-3">Select any conditions that apply to you</p>
        <div className="grid grid-cols-2 gap-2">
          {['Diabetes', 'Hypertension', 'High Cholesterol', 'Heart Disease', 'PCOS', 'Thyroid Issues', 'Fatty Liver', 'Kidney Disease'].map(condition => (
            <label key={condition} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.healthConditions.includes(condition)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, healthConditions: [...prev.healthConditions, condition] }))
                  } else {
                    setFormData(prev => ({ ...prev, healthConditions: prev.healthConditions.filter(c => c !== condition) }))
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{condition}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Food Allergies & Intolerances</Label>
        <p className="text-sm text-gray-600 mb-3">Select any allergies or intolerances</p>
        <div className="grid grid-cols-2 gap-2">
          {['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Lactose'].map(allergy => (
            <label key={allergy} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.allergies.includes(allergy)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, allergies: [...prev.allergies, allergy] }))
                  } else {
                    setFormData(prev => ({ ...prev, allergies: prev.allergies.filter(a => a !== allergy) }))
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{allergy}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="medications">Current Medications</Label>
        <p className="text-sm text-gray-600 mb-2">List any medications you're currently taking (optional)</p>
        <textarea
          id="medications"
          className="w-full p-3 border border-gray-300 rounded-md"
          rows={3}
          placeholder="e.g., Metformin, Vitamin D, etc."
          value={formData.medications.join(', ')}
          onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value.split(',').map(m => m.trim()).filter(Boolean) }))}
        />
      </div>
    </div>
  )
}

function PreferencesStep({ data, onUpdate }: { data?: any, onUpdate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    dietType: data?.dietType || [],
    cuisinePreferences: data?.cuisinePreferences || [],
    dislikes: data?.dislikes || [],
    mealFrequency: data?.mealFrequency || 3
  })

  useEffect(() => {
    onUpdate(formData)
  }, [formData])

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Dietary Preferences</Label>
        <p className="text-sm text-gray-600 mb-3">Select your dietary style</p>
        <div className="grid grid-cols-2 gap-2">
          {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Mediterranean', 'Low Carb', 'High Protein', 'Gluten Free'].map(diet => (
            <label key={diet} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.dietType.includes(diet)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, dietType: [...prev.dietType, diet] }))
                  } else {
                    setFormData(prev => ({ ...prev, dietType: prev.dietType.filter(d => d !== diet) }))
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{diet}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Cuisine Preferences</Label>
        <p className="text-sm text-gray-600 mb-3">What cuisines do you enjoy?</p>
        <div className="grid grid-cols-2 gap-2">
          {['Indian', 'Chinese', 'Italian', 'Mexican', 'Mediterranean', 'Thai', 'Japanese', 'American'].map(cuisine => (
            <label key={cuisine} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.cuisinePreferences.includes(cuisine)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, cuisinePreferences: [...prev.cuisinePreferences, cuisine] }))
                  } else {
                    setFormData(prev => ({ ...prev, cuisinePreferences: prev.cuisinePreferences.filter(c => c !== cuisine) }))
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{cuisine}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="mealFrequency">Preferred Meals per Day</Label>
        <Select value={formData.mealFrequency.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, mealFrequency: parseInt(value) }))}>
          <SelectTrigger>
            <SelectValue placeholder="How many meals per day?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 meals (IF style)</SelectItem>
            <SelectItem value="3">3 meals (traditional)</SelectItem>
            <SelectItem value="4">4 meals (with snack)</SelectItem>
            <SelectItem value="5">5 meals (frequent small meals)</SelectItem>
            <SelectItem value="6">6 meals (bodybuilding style)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dislikes">Foods You Dislike</Label>
        <p className="text-sm text-gray-600 mb-2">List foods you'd prefer to avoid (optional)</p>
        <textarea
          id="dislikes"
          className="w-full p-3 border border-gray-300 rounded-md"
          rows={3}
          placeholder="e.g., broccoli, mushrooms, spicy food..."
          value={formData.dislikes.join(', ')}
          onChange={(e) => setFormData(prev => ({ ...prev, dislikes: e.target.value.split(',').map(d => d.trim()).filter(Boolean) }))}
        />
      </div>
    </div>
  )
}

function GoalsStep({ data, onUpdate }: { data?: any, onUpdate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    primaryGoals: data?.primaryGoals || [],
    targetWeight: data?.targetWeight || '',
    timeline: data?.timeline || '',
    motivation: data?.motivation || ''
  })

  useEffect(() => {
    onUpdate(formData)
  }, [formData])

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Primary Health Goals</Label>
        <p className="text-sm text-gray-600 mb-3">What do you want to achieve? (select all that apply)</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            'Weight Loss', 
            'Weight Gain', 
            'Muscle Building', 
            'Improve Energy', 
            'Better Sleep', 
            'Manage Health Condition', 
            'Athletic Performance', 
            'General Health'
          ].map(goal => (
            <label key={goal} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.primaryGoals.includes(goal)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, primaryGoals: [...prev.primaryGoals, goal] }))
                  } else {
                    setFormData(prev => ({ ...prev, primaryGoals: prev.primaryGoals.filter(g => g !== goal) }))
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{goal}</span>
            </label>
          ))}
        </div>
      </div>

      {formData.primaryGoals.includes('Weight Loss') || formData.primaryGoals.includes('Weight Gain') ? (
        <div>
          <Label htmlFor="targetWeight">Target Weight (kg)</Label>
          <Input
            id="targetWeight"
            type="number"
            value={formData.targetWeight}
            onChange={(e) => setFormData(prev => ({ ...prev, targetWeight: parseInt(e.target.value) || '' }))}
            placeholder="Your target weight"
          />
        </div>
      ) : null}

      <div>
        <Label>Timeline for Goals</Label>
        <Select value={formData.timeline} onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="When do you want to achieve your goals?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">1 Month</SelectItem>
            <SelectItem value="3months">3 Months</SelectItem>
            <SelectItem value="6months">6 Months</SelectItem>
            <SelectItem value="1year">1 Year</SelectItem>
            <SelectItem value="ongoing">Ongoing/Lifestyle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="motivation">What motivates you?</Label>
        <p className="text-sm text-gray-600 mb-2">This helps us personalize your experience</p>
        <textarea
          id="motivation"
          className="w-full p-3 border border-gray-300 rounded-md"
          rows={3}
          placeholder="e.g., I want to feel more confident, have energy to play with my kids, manage my diabetes better..."
          value={formData.motivation}
          onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
        />
      </div>
    </div>
  )
}