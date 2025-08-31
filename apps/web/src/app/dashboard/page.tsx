'use client';

import { Navigation } from '@/components/Navigation';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back! Here's your health overview.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Today's Calories" value="1,847" target="2,000" />
          <StatCard title="Water Intake" value="6 glasses" target="8 glasses" />
          <StatCard title="Steps" value="8,432" target="10,000" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Meals */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Today's Meals</h2>
            <div className="space-y-3">
              <MealItem time="Breakfast" meal="Oatmeal with berries and nuts" calories="320" />
              <MealItem time="Lunch" meal="Grilled chicken salad" calories="450" />
              <MealItem time="Dinner" meal="Salmon with quinoa and vegetables" calories="580" />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <ActivityItem activity="30-minute jog" time="2 hours ago" />
              <ActivityItem activity="Yoga session" time="Yesterday" />
              <ActivityItem activity="Strength training" time="2 days ago" />
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Weekly Progress</h2>
            <div className="space-y-4">
              <ProgressBar label="Nutrition Goals" progress={75} />
              <ProgressBar label="Fitness Goals" progress={60} />
              <ProgressBar label="Sleep Goals" progress={85} />
            </div>
          </div>

          {/* AI Insights */}
          <div className="card">
            <h2 className="text-xl font-semibold text-text-primary mb-4">AI Insights</h2>
            <div className="space-y-3">
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-sm text-text-primary">
                  You're consistently meeting your protein goals. Consider adding more vegetables to your lunch for better nutrient balance.
                </p>
              </div>
              <div className="p-3 bg-success-50 rounded-lg">
                <p className="text-sm text-text-primary">
                  Great job on staying hydrated! Your water intake has improved by 20% this week.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, target }: { title: string; value: string; target: string }) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
      <p className="text-sm text-text-secondary">of {target}</p>
    </div>
  );
}

function MealItem({ time, meal, calories }: { time: string; meal: string; calories: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-background-secondary rounded-lg">
      <div>
        <p className="font-medium text-text-primary">{time}</p>
        <p className="text-sm text-text-secondary">{meal}</p>
      </div>
      <span className="text-sm font-medium text-primary-600">{calories} cal</span>
    </div>
  );
}

function ActivityItem({ activity, time }: { activity: string; time: string }) {
  return (
    <div className="flex justify-between items-center p-3 bg-background-secondary rounded-lg">
      <p className="font-medium text-text-primary">{activity}</p>
      <span className="text-sm text-text-secondary">{time}</span>
    </div>
  );
}

function ProgressBar({ label, progress }: { label: string; progress: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-primary">{label}</span>
        <span className="text-text-secondary">{progress}%</span>
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div 
          className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}