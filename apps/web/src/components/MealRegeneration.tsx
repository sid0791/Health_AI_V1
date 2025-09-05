'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Sparkles, Clock, Users, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import realAIMealPlanningService from '@/services/realAIMealPlanningService'

interface MealRegenerationProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  currentMeal?: {
    name: string
    calories: number
    prepTime: number
    ingredients: string[]
  }
  onMealSelected: (newMeal: any) => void
  className?: string
}

export default function MealRegeneration({
  mealType,
  currentMeal,
  onMealSelected,
  className = ''
}: MealRegenerationProps) {
  const [regenerating, setRegenerating] = useState(false)
  const [alternatives, setAlternatives] = useState<any[]>([])
  const [error, setError] = useState('')
  const [showAlternatives, setShowAlternatives] = useState(false)

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError('')
    
    try {
      const response = await realAIMealPlanningService.regenerateMeal({
        mealType,
        preferences: {
          cuisine: 'indian',
          maxCalories: currentMeal?.calories ? currentMeal.calories + 100 : 500,
          dietaryRestrictions: []
        },
        excludeIngredients: currentMeal?.ingredients || []
      })

      if (response.success) {
        setAlternatives(response.alternatives || [])
        setShowAlternatives(true)
      } else {
        setError(response.error || 'Failed to generate alternatives')
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred')
    } finally {
      setRegenerating(false)
    }
  }

  const selectAlternative = (meal: any) => {
    onMealSelected(meal)
    setShowAlternatives(false)
    setAlternatives([])
  }

  const getMealTypeLabel = () => {
    return mealType.charAt(0).toUpperCase() + mealType.slice(1)
  }

  const getMealTypeIcon = () => {
    switch (mealType) {
      case 'breakfast':
        return '🌅'
      case 'lunch':
        return '☀️'
      case 'dinner':
        return '🌙'
      case 'snack':
        return '🍎'
      default:
        return '🍽️'
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getMealTypeIcon()}</span>
          <h3 className="text-lg font-semibold">{getMealTypeLabel()}</h3>
          {currentMeal && (
            <Badge variant="secondary" className="text-xs">
              {currentMeal.calories} cal
            </Badge>
          )}
        </div>
        
        <Button
          onClick={handleRegenerate}
          disabled={regenerating}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          {regenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>{regenerating ? 'Generating...' : 'Regenerate'}</span>
          <Sparkles className="w-4 h-4 text-yellow-500" />
        </Button>
      </div>

      {/* Current Meal Display */}
      {currentMeal && !showAlternatives && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{currentMeal.name}</CardTitle>
            <CardDescription className="flex items-center space-x-4 text-sm">
              <span className="flex items-center space-x-1">
                <Zap className="w-4 h-4" />
                <span>{currentMeal.calories} calories</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{currentMeal.prepTime} min</span>
              </span>
              <span className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>1 serving</span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {currentMeal.ingredients.slice(0, 4).map((ingredient, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {ingredient}
                </Badge>
              ))}
              {currentMeal.ingredients.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{currentMeal.ingredients.length - 4} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Alternatives Display */}
      {showAlternatives && alternatives.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              🤖 AI Generated Alternatives
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlternatives(false)}
              className="text-xs"
            >
              Keep Current
            </Button>
          </div>
          
          <div className="grid gap-3">
            {alternatives.map((alternative, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                onClick={() => selectAlternative(alternative)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{alternative.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      AI Generated
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-4 text-xs">
                    <span className="flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>{alternative.calories || alternative.nutrition?.calories} cal</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{alternative.prepTime || '15'} min</span>
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {alternative.description && (
                    <p className="text-xs text-gray-600 mb-2">{alternative.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(alternative.ingredients || []).slice(0, 3).map((ingredient: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {typeof ingredient === 'string' ? ingredient : ingredient.name}
                      </Badge>
                    ))}
                    {alternative.ingredients && alternative.ingredients.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{alternative.ingredients.length - 3} more
                      </Badge>
                    )}
                  </div>
                  {alternative.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {alternative.tags.slice(0, 2).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Generate More Options
            </Button>
          </div>
        </div>
      )}

      {/* No Alternatives Message */}
      {showAlternatives && alternatives.length === 0 && !regenerating && (
        <Alert>
          <AlertDescription>
            No alternatives found. Try adjusting your preferences or generate again.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Information */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-blue-800">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">AI-Powered Meal Regeneration</span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Our AI considers your dietary preferences, health conditions, and nutritional needs 
          to suggest personalized alternatives.
        </p>
      </div>
    </div>
  )
}