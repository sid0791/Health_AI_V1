'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-background-primary border-b border-border-primary sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-xl text-text-primary">HealthCoachAI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/meal-plan" className="text-text-secondary hover:text-text-primary transition-colors">
              Meal Plans
            </Link>
            <Link href="/fitness" className="text-text-secondary hover:text-text-primary transition-colors">
              Fitness
            </Link>
            <Link href="/analytics" className="text-text-secondary hover:text-text-primary transition-colors">
              Analytics
            </Link>
            <Link href="/chat" className="text-text-secondary hover:text-text-primary transition-colors">
              AI Chat
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="btn-outline">
                Sign In
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-background-secondary"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-primary">
            <div className="flex flex-col space-y-4">
              <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/meal-plan" className="text-text-secondary hover:text-text-primary transition-colors">
                Meal Plans
              </Link>
              <Link href="/fitness" className="text-text-secondary hover:text-text-primary transition-colors">
                Fitness
              </Link>
              <Link href="/analytics" className="text-text-secondary hover:text-text-primary transition-colors">
                Analytics
              </Link>
              <Link href="/chat" className="text-text-secondary hover:text-text-primary transition-colors">
                AI Chat
              </Link>
              <div className="flex flex-col space-y-2 pt-4">
                <Link href="/login" className="btn-outline">
                  Sign In
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}