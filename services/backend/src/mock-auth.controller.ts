import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface MockLoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

interface MockUser {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  profileCompleted: boolean;
}

interface MockLoginResponse {
  success: boolean;
  token: string;
  user: MockUser;
  isNewUser: boolean;
}

interface MockOAuthRequest {
  provider: 'google' | 'facebook' | 'apple';
  code?: string;
  accessToken?: string;
}

@ApiTags('mock-auth')
@Controller('api/auth')
export class MockAuthController {
  // Simple in-memory store for development
  private users: Map<string, MockUser> = new Map();

  constructor() {
    // Pre-populate with some mock users
    this.users.set('demo@example.com', {
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      profileCompleted: true
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mock login endpoint' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() body: MockLoginRequest): Promise<MockLoginResponse> {
    const identifier = body.email || body.phone;
    
    // Check if user exists
    let user = this.users.get(identifier);
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = {
        id: `user-${Date.now()}`,
        email: body.email,
        phone: body.phone,
        name: `User ${Date.now()}`,
        profileCompleted: false // New users need onboarding
      };
      this.users.set(identifier, user);
      isNewUser = true;
    }

    return {
      success: true,
      token: `mock-jwt-${Date.now()}`,
      user,
      isNewUser
    };
  }

  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mock OAuth login endpoint' })
  @ApiResponse({ status: 200, description: 'OAuth login successful' })
  async oauthLogin(@Body() body: MockOAuthRequest): Promise<MockLoginResponse> {
    // Mock OAuth logic - in real implementation this would validate with the provider
    const mockEmail = `demo@${body.provider}.com`;
    
    let user = this.users.get(mockEmail);
    let isNewUser = false;

    if (!user) {
      // Create new user from OAuth
      user = {
        id: `${body.provider}-user-${Date.now()}`,
        email: mockEmail,
        name: `Demo ${body.provider.charAt(0).toUpperCase() + body.provider.slice(1)} User`,
        profileCompleted: false // New users need onboarding
      };
      this.users.set(mockEmail, user);
      isNewUser = true;
    }

    return {
      success: true,
      token: `mock-${body.provider}-jwt-${Date.now()}`,
      user,
      isNewUser
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  async getCurrentUser(): Promise<MockUser | null> {
    // For now, return a mock user
    // In real implementation, this would get user from JWT token
    return {
      id: 'current-user',
      email: 'current@example.com',
      name: 'Current User',
      profileCompleted: false
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'List all mock users (dev only)' })
  @ApiResponse({ status: 200, description: 'Users listed' })
  async listUsers(): Promise<MockUser[]> {
    return Array.from(this.users.values());
  }
}