'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService, type User } from '../services/authService'

export function useAuth(requireAuth: boolean = false) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser()
        const isAuth = authService.isAuthenticated()
        
        setUser(currentUser)
        setIsAuthenticated(isAuth)
        
        // If authentication is required but user is not authenticated, redirect to login
        if (requireAuth && !isAuth) {
          router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
          return
        }

        // Check if user needs onboarding
        if (isAuth && currentUser && authService.needsOnboarding()) {
          router.push('/onboarding')
          return
        }
        
      } catch (error) {
        console.error('Auth check failed:', error)
        if (requireAuth) {
          router.push('/auth/login')
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [requireAuth, router])

  const login = async (credentials: any) => {
    try {
      const response = await authService.login(credentials)
      if (response.success && response.user) {
        setUser(response.user)
        setIsAuthenticated(true)
        
        // Check for redirect URL
        const params = new URLSearchParams(window.location.search)
        const redirectUrl = params.get('redirect') || '/dashboard'
        router.push(redirectUrl)
      }
      return response
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      setIsAuthenticated(false)
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    needsOnboarding: user ? authService.needsOnboarding() : false
  }
}