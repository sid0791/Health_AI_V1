/**
 * Authentication Service
 * Handles login, registration, and OAuth flows with backend integration
 */

import { apiRequest } from './api'

export interface LoginCredentials {
  email?: string
  phone?: string
  password?: string
}

export interface OAuthProvider {
  provider: 'google' | 'facebook' | 'apple'
  code?: string
  state?: string
}

export interface User {
  id: string
  email?: string
  phone?: string
  name?: string
  profileCompleted: boolean
  onboardingCompleted?: boolean
  onboardingStep?: number
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  isNewUser?: boolean
  message?: string
}

class AuthService {
  private readonly storageKeys = {
    token: 'auth_token',
    user: 'user_data',
    refreshToken: 'refresh_token'
  }

  /**
   * Login with email/phone and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      })

      if (response.success && response.token && response.user) {
        this.storeAuthData(response.token, response.user)
      }

      return response
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * Send OTP for phone login
   */
  async sendOTP(phone: string): Promise<{ success: boolean; message?: string }> {
    try {
      return await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone })
      })
    } catch (error) {
      console.error('Send OTP error:', error)
      throw error
    }
  }

  /**
   * Verify OTP and login
   */
  async verifyOTP(phone: string, code: string): Promise<AuthResponse> {
    try {
      const response = await apiRequest<AuthResponse>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code })
      })

      if (response.success && response.token && response.user) {
        this.storeAuthData(response.token, response.user)
      }

      return response
    } catch (error) {
      console.error('Verify OTP error:', error)
      throw error
    }
  }

  /**
   * OAuth login/registration flow
   */
  async oauthLogin(provider: string, authCode?: string): Promise<AuthResponse> {
    try {
      // In real implementation, this would handle OAuth flow properly
      // For now, let's create a proper flow that checks user existence
      
      if (!authCode) {
        // Generate OAuth URL and redirect
        const oauthUrl = await this.generateOAuthUrl(provider)
        window.location.href = oauthUrl
        return { success: false, message: 'Redirecting to OAuth provider' }
      }

      // Handle OAuth callback with auth code
      const response = await apiRequest<AuthResponse>('/auth/oauth/callback', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          code: authCode,
          deviceInfo: {
            deviceId: this.getDeviceId(),
            deviceName: navigator.userAgent,
            devicePlatform: 'web'
          }
        })
      })

      if (response.success && response.token && response.user) {
        this.storeAuthData(response.token, response.user)
      }

      return response
    } catch (error) {
      console.error('OAuth login error:', error)
      throw error
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateOAuthUrl(provider: string): Promise<string> {
    try {
      const response = await apiRequest<{ url: string }>(`/auth/oauth/${provider}/url`, {
        method: 'GET'
      })
      return response.url
    } catch (error) {
      console.error('Generate OAuth URL error:', error)
      throw error
    }
  }

  /**
   * Register new user
   */
  async register(userData: {
    email?: string
    phone?: string
    password?: string
    name?: string
  }): Promise<AuthResponse> {
    try {
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      })

      if (response.success && response.token && response.user) {
        this.storeAuthData(response.token, response.user)
      }

      return response
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout if token exists
      const token = this.getToken()
      if (token) {
        await apiRequest('/auth/logout', {
          method: 'POST'
        }).catch(console.error) // Don't fail logout if API call fails
      }
    } finally {
      // Always clear local storage
      this.clearAuthData()
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem(this.storageKeys.user)
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem(this.storageKeys.token)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    const user = this.getCurrentUser()
    return !!(token && user)
  }

  /**
   * Check if user needs onboarding
   */
  needsOnboarding(): boolean {
    const user = this.getCurrentUser()
    return user ? !user.profileCompleted || !user.onboardingCompleted : false
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(this.storageKeys.refreshToken)
      if (!refreshToken) {
        return false
      }

      const response = await apiRequest<{ token: string; user: User }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      })

      if (response.token && response.user) {
        this.storeAuthData(response.token, response.user)
        return true
      }

      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      this.clearAuthData()
      return false
    }
  }

  /**
   * Store authentication data
   */
  private storeAuthData(token: string, user: User, refreshToken?: string): void {
    localStorage.setItem(this.storageKeys.token, token)
    localStorage.setItem(this.storageKeys.user, JSON.stringify(user))
    if (refreshToken) {
      localStorage.setItem(this.storageKeys.refreshToken, refreshToken)
    }
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.storageKeys.token)
    localStorage.removeItem(this.storageKeys.user)
    localStorage.removeItem(this.storageKeys.refreshToken)
  }

  /**
   * Get or generate device ID
   */
  private getDeviceId(): string {
    const key = 'device_id'
    let deviceId = localStorage.getItem(key)
    if (!deviceId) {
      deviceId = 'web_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
      localStorage.setItem(key, deviceId)
    }
    return deviceId
  }
}

export const authService = new AuthService()
export default authService