'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Zap, Database, Brain, CheckCircle, XCircle, Globe, Cpu } from 'lucide-react'
import realAIMealPlanningService from '@/services/realAIMealPlanningService'
import { getApiStatus } from '@/services/api'

export default function APITestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeTest, setActiveTest] = useState('')

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true)
    setError('')
    setActiveTest(testName)
    setResults(null)

    try {
      const result = await testFn()
      setResults(result)
    } catch (err: any) {
      setError(err.message || 'Test failed')
    } finally {
      setLoading(false)
      setActiveTest('')
    }
  }

  const tests = [
    {
      id: 'free-ai',
      name: 'Test Free AI Integration',
      description: 'Test the intelligent fallback meal planning system',
      icon: Database,
      action: () => realAIMealPlanningService.testFreeAI()
    },
    {
      id: 'real-ai',
      name: 'Test Real AI APIs',
      description: 'Test actual AI providers (Gemini, Groq, HuggingFace)',
      icon: Brain,
      action: () => realAIMealPlanningService.testRealAI()
    },
    {
      id: 'ai-status',
      name: 'Check AI Status',
      description: 'Check which AI providers are configured and available',
      icon: CheckCircle,
      action: () => realAIMealPlanningService.getAIStatus()
    },
    {
      id: 'meal-generation',
      name: 'Generate Full Meal Plan',
      description: 'Generate a complete 7-day personalized meal plan',
      icon: Zap,
      action: () => realAIMealPlanningService.generateMealPlan({
        userProfile: {
          age: 30,
          gender: 'female',
          weight: 65,
          height: 165,
          activityLevel: 'moderate',
          goals: ['weight_loss', 'energy'],
          healthConditions: ['diabetes'],
          allergies: ['nuts']
        },
        preferences: {
          dietaryPreferences: ['vegetarian'],
          cuisinePreferences: ['indian', 'mediterranean'],
          mealFrequency: 3
        },
        options: {
          duration: 7,
          planType: 'weight_management',
          useRealAI: true
        }
      })
    },
    {
      id: 'meal-regeneration',
      name: 'Test Meal Regeneration',
      description: 'Regenerate a specific meal with AI alternatives',
      icon: Cpu,
      action: () => realAIMealPlanningService.regenerateMeal({
        mealType: 'breakfast',
        preferences: {
          cuisine: 'indian',
          maxCalories: 400
        },
        excludeIngredients: ['nuts', 'dairy']
      })
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'configured':
        return 'text-green-600'
      case 'failed':
      case 'error':
      case 'not configured':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
      case 'error':
      case 'not configured':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Globe className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🤖 AI Integration Testing</h1>
          <p className="text-gray-600">Test real AI meal planning APIs and backend connectivity</p>
          <div className="mt-4 flex items-center justify-center space-x-4">
            <Badge variant={getApiStatus() === 'real' ? 'default' : 'secondary'}>
              {getApiStatus() === 'real' ? 'Real API Mode' : 'Mock API Mode'}
            </Badge>
            <Badge variant="outline">
              Backend: {process.env.NEXT_PUBLIC_API_URL || 'localhost:8080'}
            </Badge>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {tests.map((test) => {
            const Icon = test.icon
            const isActive = activeTest === test.id
            
            return (
              <Card key={test.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Icon className="w-5 h-5" />
                    <span>{test.name}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">{test.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => runTest(test.id, test.action)}
                    disabled={loading}
                    className="w-full"
                    size="sm"
                  >
                    {isActive && loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Run Test'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {results && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Test Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Success Status */}
                {results.success !== undefined && (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant={results.success ? 'default' : 'destructive'}>
                      {results.success ? 'SUCCESS' : 'FAILED'}
                    </Badge>
                  </div>
                )}

                {/* Message */}
                {results.message && (
                  <div>
                    <span className="font-medium">Message:</span>
                    <p className="text-sm text-gray-600 mt-1">{results.message}</p>
                  </div>
                )}

                {/* AI Provider Info */}
                {results.aiProvider && (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">AI Provider:</span>
                    <Badge variant="outline">{results.aiProvider}</Badge>
                    {results.tokensUsed && (
                      <Badge variant="secondary">{results.tokensUsed} tokens</Badge>
                    )}
                    {results.cost !== undefined && (
                      <Badge variant="secondary">${results.cost}</Badge>
                    )}
                  </div>
                )}

                {/* Features */}
                {results.features && (
                  <div>
                    <span className="font-medium">Features Tested:</span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {results.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Status Details */}
                {results.results && (
                  <div>
                    <span className="font-medium">AI Provider Status:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {Object.entries(results.results).map(([provider, status]: [string, any]) => (
                        <div key={provider} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{provider}</span>
                            {getStatusIcon(status.status)}
                          </div>
                          <div className={`text-sm ${getStatusColor(status.status)}`}>
                            {status.status}
                          </div>
                          {status.model && (
                            <div className="text-xs text-gray-500 mt-1">
                              Model: {status.model}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Setup Guide */}
                {results.setupGuide && (
                  <div>
                    <span className="font-medium">API Setup Guide:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {Object.entries(results.setupGuide).map(([provider, guide]: [string, any]) => (
                        <div key={provider} className="p-3 border rounded-lg">
                          <div className="font-medium text-sm">{guide.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{guide.freeCredits}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            ENV: {guide.envVar}
                          </div>
                          <a 
                            href={guide.setupUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline mt-1 block"
                          >
                            Get API Key →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meal Plan Info */}
                {results.mealPlan && (
                  <div>
                    <span className="font-medium">Generated Meal Plan:</span>
                    <div className="bg-gray-50 p-3 rounded-lg mt-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">ID:</span>
                          <div className="text-gray-600">{results.mealPlan.id}</div>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>
                          <div className="text-gray-600">{results.mealPlan.duration || results.mealPlan.totalDays} days</div>
                        </div>
                        <div>
                          <span className="font-medium">Calories/Day:</span>
                          <div className="text-gray-600">{results.mealPlan.dailyCalorieTarget}</div>
                        </div>
                        <div>
                          <span className="font-medium">Total Meals:</span>
                          <div className="text-gray-600">{results.mealPlan.totalMeals}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample Meal */}
                {results.sampleDay && (
                  <div>
                    <span className="font-medium">Sample Day Meals:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {Object.entries(results.sampleDay.meals || {}).map(([mealType, meal]: [string, any]) => (
                        <div key={mealType} className="p-3 border rounded-lg">
                          <div className="font-medium text-sm capitalize">{mealType}</div>
                          <div className="text-sm text-gray-600 mt-1">{meal.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {meal.calories} cal • {meal.prepTime} min
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {results.alternatives && results.alternatives.length > 0 && (
                  <div>
                    <span className="font-medium">Generated Alternatives:</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {results.alternatives.slice(0, 4).map((alt: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="font-medium text-sm">{alt.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {alt.calories || alt.nutrition?.calories} cal
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Response (for debugging) */}
                <details className="mt-4">
                  <summary className="font-medium cursor-pointer">Raw API Response</summary>
                  <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto max-h-60">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>🔧 Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">1. Backend Connection</h4>
              <p className="text-sm text-gray-600">
                The frontend is configured to connect to: <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}</code>
              </p>
            </div>
            
            <div>
              <h4 className="font-medium">2. Real AI Integration</h4>
              <p className="text-sm text-gray-600 mb-2">
                To use real AI APIs, add these environment variables to your backend:
              </p>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>• <code>GOOGLE_AI_API_KEY</code> - Get from Google AI Studio (generous free tier)</li>
                <li>• <code>GROQ_API_KEY</code> - Get from Groq Console (fast & free)</li>
                <li>• <code>HUGGINGFACE_API_KEY</code> - Get from HuggingFace (completely free)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">3. Testing Flow</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Start with "Check AI Status" to see current configuration</li>
                <li>2. Test "Free AI Integration" (works without API keys)</li>
                <li>3. Test "Real AI APIs" (requires API keys for full functionality)</li>
                <li>4. Try "Generate Full Meal Plan" for complete testing</li>
                <li>5. Test "Meal Regeneration" for individual meal alternatives</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}