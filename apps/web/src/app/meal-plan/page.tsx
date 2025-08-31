'use client';

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';

export default function MealPlanPage() {
  const [selectedDay, setSelectedDay] = useState('monday');
  
  const days = [
    { id: 'monday', name: 'Mon', date: '12' },
    { id: 'tuesday', name: 'Tue', date: '13' },
    { id: 'wednesday', name: 'Wed', date: '14' },
    { id: 'thursday', name: 'Thu', date: '15' },
    { id: 'friday', name: 'Fri', date: '16' },
    { id: 'saturday', name: 'Sat', date: '17' },
    { id: 'sunday', name: 'Sun', date: '18' },
  ];

  const meals = {
    breakfast: {
      name: 'Oatmeal with Berries',
      calories: 320,
      protein: 12,
      carbs: 58,
      fat: 6,
      description: 'Steel-cut oats topped with fresh blueberries, strawberries, and chopped almonds',
    },
    lunch: {
      name: 'Grilled Chicken Salad',
      calories: 450,
      protein: 35,
      carbs: 20,
      fat: 25,
      description: 'Mixed greens with grilled chicken breast, avocado, cherry tomatoes, and olive oil dressing',
    },
    dinner: {
      name: 'Salmon with Quinoa',
      calories: 580,
      protein: 42,
      carbs: 45,
      fat: 28,
      description: 'Baked salmon fillet served with quinoa pilaf and roasted seasonal vegetables',
    },
    snack: {
      name: 'Greek Yogurt & Nuts',
      calories: 180,
      protein: 15,
      carbs: 12,
      fat: 8,
      description: 'Plain Greek yogurt with mixed nuts and a drizzle of honey',
    },
  };

  return (
    <div className="min-h-screen bg-background-primary">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">7-Day Meal Plan</h1>
          <p className="text-text-secondary mt-1">Personalized meals based on your dietary preferences and goals</p>
        </div>

        {/* Day Selector */}
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`flex-shrink-0 flex flex-col items-center p-3 rounded-lg transition-colors min-w-[80px] ${
                selectedDay === day.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-background-secondary text-text-secondary hover:bg-primary-50 hover:text-primary-600'
              }`}
            >
              <span className="text-sm font-medium">{day.name}</span>
              <span className="text-lg font-bold">{day.date}</span>
            </button>
          ))}
        </div>

        {/* Daily Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Total Calories" value="1,530" />
          <SummaryCard title="Protein" value="104g" />
          <SummaryCard title="Carbs" value="135g" />
          <SummaryCard title="Fat" value="67g" />
        </div>

        {/* Meals */}
        <div className="grid gap-6">
          {Object.entries(meals).map(([mealType, meal]) => (
            <MealCard key={mealType} mealType={mealType} meal={meal} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button className="btn-primary flex-1">
            Generate New Plan
          </button>
          <button className="btn-outline flex-1">
            Save to Favorites
          </button>
          <button className="btn-outline flex-1">
            Add to Shopping List
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="card text-center">
      <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
    </div>
  );
}

function MealCard({ mealType, meal }: { 
  mealType: string; 
  meal: { name: string; calories: number; protein: number; carbs: number; fat: number; description: string } 
}) {
  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary capitalize">{mealType}</h3>
          <h4 className="text-xl font-bold text-primary-600">{meal.name}</h4>
        </div>
        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <span className="text-sm text-text-secondary">{meal.calories} cal</span>
          <button className="btn-outline text-sm">
            Swap Meal
          </button>
        </div>
      </div>
      
      <p className="text-text-secondary mb-4">{meal.description}</p>
      
      {/* Macros */}
      <div className="grid grid-cols-3 gap-4">
        <MacroInfo label="Protein" value={`${meal.protein}g`} color="text-success-600" />
        <MacroInfo label="Carbs" value={`${meal.carbs}g`} color="text-warning-600" />
        <MacroInfo label="Fat" value={`${meal.fat}g`} color="text-secondary-600" />
      </div>
    </div>
  );
}

function MacroInfo({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
    </div>
  );
}