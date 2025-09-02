'use client'

import { useState } from 'react'
import {
  HeartIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ChevronRightIcon,
  FireIcon,
  StarIcon,
  CalendarIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

const fitnessGoals = [
  { name: 'Weight Loss', progress: 78, target: 100, unit: '%' },
  { name: 'Muscle Gain', progress: 45, target: 100, unit: '%' },
  { name: 'Cardio Endurance', progress: 60, target: 100, unit: '%' },
  { name: 'Strength', progress: 82, target: 100, unit: '%' },
]

const todaysWorkout = {
  name: 'Full Body Strength Training',
  duration: 45,
  exercises: 8,
  calories: 320,
  difficulty: 'Intermediate',
  completed: false,
  exercises_list: [
    { name: 'Push-ups', sets: 3, reps: 12, completed: true },
    { name: 'Squats', sets: 3, reps: 15, completed: true },
    { name: 'Planks', sets: 3, duration: '30s', completed: false },
    { name: 'Lunges', sets: 3, reps: '10 each leg', completed: false },
    { name: 'Pull-ups', sets: 3, reps: 8, completed: false },
    { name: 'Deadlifts', sets: 3, reps: 10, completed: false },
    { name: 'Burpees', sets: 2, reps: 8, completed: false },
    { name: 'Mountain Climbers', sets: 3, duration: '20s', completed: false },
  ]
}

const weeklyPlan = [
  { day: 'Monday', workout: 'Full Body Strength', duration: 45, completed: true },
  { day: 'Tuesday', workout: 'Cardio & HIIT', duration: 30, completed: true },
  { day: 'Wednesday', workout: 'Rest Day', duration: 0, completed: true },
  { day: 'Thursday', workout: 'Upper Body Focus', duration: 40, completed: false },
  { day: 'Friday', workout: 'Lower Body & Core', duration: 45, completed: false },
  { day: 'Saturday', workout: 'Yoga & Flexibility', duration: 60, completed: false },
  { day: 'Sunday', workout: 'Light Cardio Walk', duration: 30, completed: false },
]

const exerciseLibrary = [
  {
    name: 'High-Intensity Interval Training',
    category: 'Cardio',
    duration: 20,
    difficulty: 'Hard',
    equipment: 'None',
    calories: 250,
    rating: 4.8,
    image: '🏃‍♂️'
  },
  {
    name: 'Strength Training Circuit',
    category: 'Strength',
    duration: 35,
    difficulty: 'Intermediate',
    equipment: 'Dumbbells',
    calories: 180,
    rating: 4.9,
    image: '💪'
  },
  {
    name: 'Yoga Flow',
    category: 'Flexibility',
    duration: 45,
    difficulty: 'Beginner',
    equipment: 'Yoga Mat',
    calories: 120,
    rating: 4.7,
    image: '🧘‍♀️'
  },
  {
    name: 'Core Blast',
    category: 'Core',
    duration: 15,
    difficulty: 'Intermediate',
    equipment: 'None',
    calories: 100,
    rating: 4.6,
    image: '🔥'
  },
]

const recentWorkouts = [
  { name: 'Morning Yoga', date: 'Today', duration: 30, calories: 120 },
  { name: 'HIIT Cardio', date: 'Yesterday', duration: 25, calories: 280 },
  { name: 'Strength Training', date: '2 days ago', duration: 45, calories: 320 },
]

export default function FitnessPage() {
  const [activeTab, setActiveTab] = useState('today')
  const [workoutStarted, setWorkoutStarted] = useState(false)

  const tabs = [
    { id: 'today', name: "Today's Workout" },
    { id: 'plan', name: 'Weekly Plan' },
    { id: 'library', name: 'Exercise Library' },
    { id: 'progress', name: 'Progress' },
  ]

  const ProgressRing = ({ progress, size = 'md' }: { progress: number, size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = {
      sm: { w: 12, h: 12, r: 18 },
      md: { w: 16, h: 16, r: 28 },
      lg: { w: 24, h: 24, r: 45 }
    }
    const { w, h, r } = sizes[size]
    const circumference = 2 * Math.PI * r
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
      <div className={`relative w-${w} h-${h}`}>
        <svg className={`w-${w} h-${h} transform -rotate-90`} viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={r}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary-500"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-gray-900 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'}`}>
            {progress}%
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
          Fitness & Workouts
        </h1>
        <p className="text-gray-600">
          AI-powered fitness plans tailored to your goals and fitness level
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {fitnessGoals.map((goal, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">{goal.name}</h3>
              <ProgressRing progress={goal.progress} size="sm" />
            </div>
            <p className="text-lg font-bold text-primary-600">{goal.progress}%</p>
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
      {activeTab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Workout */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 font-display">
                    {todaysWorkout.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {todaysWorkout.duration} min
                    </span>
                    <span className="flex items-center">
                      <FireIcon className="h-4 w-4 mr-1" />
                      {todaysWorkout.calories} cal
                    </span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                      {todaysWorkout.difficulty}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setWorkoutStarted(!workoutStarted)}
                  className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    workoutStarted
                      ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'
                      : 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500'
                  }`}
                >
                  {workoutStarted ? (
                    <>
                      <PauseIcon className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start Workout
                    </>
                  )}
                </button>
              </div>

              {/* Exercise List */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 mb-3">Exercises ({todaysWorkout.exercises})</h4>
                {todaysWorkout.exercises_list.map((exercise, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      exercise.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        exercise.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {exercise.completed ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          exercise.completed ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {exercise.name}
                        </p>
                        <p className={`text-sm ${
                          exercise.completed ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {exercise.sets} sets × {exercise.reps || exercise.duration}
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Workouts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-display">
                Recent Workouts
              </h3>
              <div className="space-y-3">
                {recentWorkouts.map((workout, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{workout.name}</p>
                      <p className="text-sm text-gray-600">{workout.date}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-gray-900">{workout.duration} min</p>
                      <p className="text-gray-600">{workout.calories} cal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Coach Tip */}
            <div className="bg-primary-50 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <HeartIconSolid className="h-6 w-6 text-primary-600 mt-1" />
                <div>
                  <h3 className="font-medium text-primary-900 mb-2">AI Coach Tip</h3>
                  <p className="text-primary-700 text-sm">
                    Great job staying consistent! Your strength has improved 15% this month. 
                    Consider adding 5 more minutes to your cardio sessions for better endurance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
            Weekly Fitness Plan
          </h3>
          <div className="space-y-4">
            {weeklyPlan.map((day, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  day.completed
                    ? 'bg-green-50 border-green-200'
                    : day.day === 'Thursday'
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    day.completed
                      ? 'bg-green-500 text-white'
                      : day.day === 'Thursday'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {day.completed ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <CalendarIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{day.day}</p>
                    <p className="text-sm text-gray-600">{day.workout}</p>
                  </div>
                </div>
                <div className="text-right">
                  {day.duration > 0 && (
                    <p className="text-sm font-medium text-gray-900">{day.duration} min</p>
                  )}
                  <p className={`text-xs ${
                    day.completed ? 'text-green-600' : day.day === 'Thursday' ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {day.completed ? 'Completed' : day.day === 'Thursday' ? 'Today' : 'Upcoming'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exerciseLibrary.map((exercise, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{exercise.image}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{exercise.name}</h3>
                    <p className="text-sm text-gray-600">{exercise.category}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-yellow-600">
                  <StarIcon className="h-4 w-4 mr-1" />
                  {exercise.rating}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                <div>
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {exercise.duration} min
                  </span>
                </div>
                <div>
                  <span className="flex items-center">
                    <FireIcon className="h-4 w-4 mr-1" />
                    {exercise.calories} cal
                  </span>
                </div>
                <div>
                  <span>Equipment: {exercise.equipment}</span>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                    exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500">
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Start
                </button>
                <button className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500">
                  <HeartIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
              Monthly Progress
            </h3>
            <div className="space-y-6">
              {fitnessGoals.map((goal, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">{goal.name}</span>
                    <span className="text-sm text-gray-600">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 font-display">
              This Week&apos;s Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">5</div>
                <div className="text-sm text-gray-600">Workouts</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">180</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">1,240</div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">92%</div>
                <div className="text-sm text-gray-600">Goal Met</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}