'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    // This would typically redirect to onboarding or login
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6">
              Your AI-Powered
              <span className="text-primary-500 block">Health Coach</span>
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Personalized nutrition, fitness, and wellness guidance powered by AI. 
              Get instant meal plans, workout routines, and health insights tailored just for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                disabled={isLoading}
                className="btn-primary text-lg px-8 py-3"
                aria-label="Get started with HealthCoachAI"
              >
                {isLoading ? 'Loading...' : 'Get Started Free'}
              </button>
              <Link href="/demo" className="btn-outline text-lg px-8 py-3">
                View Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Everything You Need for Better Health
            </h2>
            <p className="text-text-secondary">
              Comprehensive tools to help you achieve your health and wellness goals
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="AI Meal Planning"
              description="Get personalized meal plans based on your preferences, dietary restrictions, and health goals."
              icon="🍽️"
            />
            <FeatureCard
              title="Fitness Tracking"
              description="Custom workout routines and progress tracking to help you stay active and reach your fitness goals."
              icon="💪"
            />
            <FeatureCard
              title="Health Analytics"
              description="Comprehensive health insights and analytics to track your progress and optimize your wellness journey."
              icon="📊"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Ready to Start Your Health Journey?
          </h2>
          <p className="text-text-secondary mb-8">
            Join thousands of users who have transformed their health with HealthCoachAI
          </p>
          <button 
            onClick={handleGetStarted}
            className="btn-primary text-lg px-8 py-3"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon }: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="card text-center">
      <div className="text-4xl mb-4" role="img" aria-label={title}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary">
        {description}
      </p>
    </div>
  );
}