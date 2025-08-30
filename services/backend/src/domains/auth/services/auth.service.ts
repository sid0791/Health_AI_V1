import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { OTPService } from './otp.service';
import { JWTService, SessionInfo, TokenPair } from './jwt.service';
import { OAuthService } from './oauth.service';
import { AuditService } from './audit.service';
import { AuditEventType } from '../entities/audit-log.entity';
import { OTPType } from '../entities/user-otp.entity';
import { OAuthProvider } from '../entities/user-oauth-account.entity';
import { User } from '../../users/entities/user.entity';

export interface AuthContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface LoginResult {
  tokens: TokenPair;
  user: {
    id: string;
    phone?: string;
    email?: string;
    name?: string;
    profileCompleted: boolean;
  };
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OTPService,
    private readonly jwtService: JWTService,
    private readonly oauthService: OAuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Send OTP for phone login
   */
  async sendLoginOTP(
    phone: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      devicePlatform?: string;
    },
    context?: AuthContext,
  ): Promise<{ otpId: string; expiresAt: Date }> {
    try {
      // Find or create user
      let user = await this.usersService.findByPhone(phone);
      
      // Generate OTP
      const result = await this.otpService.generateOTP(
        phone,
        OTPType.LOGIN,
        user?.id,
        context,
      );

      this.logger.log(`Login OTP sent to phone ${this.maskPhone(phone)}`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to send login OTP', error);
      throw error;
    }
  }

  /**
   * Verify OTP and login
   */
  async verifyOTPAndLogin(
    phone: string,
    otpCode: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      devicePlatform?: string;
    },
    context?: AuthContext,
  ): Promise<LoginResult> {
    try {
      // Verify OTP
      const otpResult = await this.otpService.verifyOTP(
        phone,
        otpCode,
        OTPType.LOGIN,
        context,
      );

      if (!otpResult.verified) {
        throw new UnauthorizedException('Invalid OTP');
      }

      // Find or create user
      let user = await this.usersService.findByPhone(phone);
      let isNewUser = false;

      if (!user) {
        // Create new user
        user = await this.usersService.createFromPhone(phone);
        isNewUser = true;
      }

      // Generate JWT tokens
      const sessionInfo: SessionInfo = {
        deviceId: deviceInfo?.deviceId,
        deviceName: deviceInfo?.deviceName,
        devicePlatform: deviceInfo?.devicePlatform,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        loginMethod: 'phone_otp',
      };

      const tokens = await this.jwtService.generateTokens(user, sessionInfo);

      // Audit log
      await this.auditService.logAuthEvent(
        isNewUser ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_SUCCESS,
        `${isNewUser ? 'New user registered and logged in' : 'User logged in'} via phone OTP`,
        {
          userId: user.id,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          requestId: context?.requestId,
        },
        {
          phone: this.maskPhone(phone),
          loginMethod: 'phone_otp',
          isNewUser,
          deviceId: deviceInfo?.deviceId,
          devicePlatform: deviceInfo?.devicePlatform,
        },
      );

      this.logger.log(`User ${user.id} logged in via phone OTP (isNewUser: ${isNewUser})`);

      return {
        tokens,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          profileCompleted: user.profileCompleted || false,
        },
        isNewUser,
      };
    } catch (error) {
      this.logger.error('Failed to verify OTP and login', error);
      
      await this.auditService.logAuthEvent(
        AuditEventType.LOGIN_FAILED,
        `Phone OTP login failed for ${this.maskPhone(phone)}`,
        {
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          requestId: context?.requestId,
        },
        {
          phone: this.maskPhone(phone),
          loginMethod: 'phone_otp',
          error: error.message,
        },
        false,
      );
      
      throw error;
    }
  }

  /**
   * OAuth login
   */
  async oauthLogin(
    provider: OAuthProvider,
    code: string,
    state?: string,
    deviceInfo?: {
      deviceId?: string;
      deviceName?: string;
      devicePlatform?: string;
    },
    context?: AuthContext,
  ): Promise<LoginResult> {
    try {
      // Handle OAuth callback
      const { user, isNewUser } = await this.oauthService.handleCallback(
        provider,
        code,
        state,
        context,
      );

      // Generate JWT tokens
      const sessionInfo: SessionInfo = {
        deviceId: deviceInfo?.deviceId,
        deviceName: deviceInfo?.deviceName,
        devicePlatform: deviceInfo?.devicePlatform,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        loginMethod: `oauth_${provider}`,
      };

      const tokens = await this.jwtService.generateTokens(user, sessionInfo);

      this.logger.log(`User ${user.id} logged in via OAuth ${provider} (isNewUser: ${isNewUser})`);

      return {
        tokens,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          profileCompleted: user.profileCompleted || false,
        },
        isNewUser,
      };
    } catch (error) {
      this.logger.error(`OAuth ${provider} login failed`, error);
      throw error;
    }
  }

  /**
   * Refresh JWT tokens
   */
  async refreshTokens(
    refreshToken: string,
    deviceId?: string,
    context?: AuthContext,
  ): Promise<TokenPair> {
    try {
      const tokens = await this.jwtService.refreshTokens(
        refreshToken,
        deviceId,
        context,
      );

      this.logger.log('JWT tokens refreshed successfully');
      
      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(
    userId: string,
    sessionId: string,
    scope: 'current' | 'all' | 'others' = 'current',
    context?: AuthContext,
  ): Promise<{ revokedSessions: number }> {
    try {
      let revokedSessions = 0;

      switch (scope) {
        case 'current':
          await this.jwtService.revokeSession(sessionId, userId, context);
          revokedSessions = 1;
          break;
        case 'all':
          revokedSessions = await this.jwtService.revokeAllSessions(userId, undefined, context);
          break;
        case 'others':
          revokedSessions = await this.jwtService.revokeAllSessions(userId, sessionId, context);
          break;
      }

      this.logger.log(`User ${userId} logged out (scope: ${scope}, revoked: ${revokedSessions})`);

      return { revokedSessions };
    } catch (error) {
      this.logger.error('Failed to logout user', error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    return this.jwtService.getUserSessions(userId);
  }

  /**
   * Generate OAuth authorization URL
   */
  generateOAuthUrl(provider: OAuthProvider, state?: string) {
    return this.oauthService.generateAuthUrl(provider, state);
  }

  /**
   * Connect OAuth account to existing user
   */
  async connectOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    code: string,
    context?: AuthContext,
  ) {
    return this.oauthService.connectOAuthAccount(userId, provider, code, context);
  }

  /**
   * Disconnect OAuth account from user
   */
  async disconnectOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    context?: AuthContext,
  ) {
    return this.oauthService.disconnectOAuthAccount(userId, provider, context);
  }

  /**
   * Get user's OAuth accounts
   */
  async getUserOAuthAccounts(userId: string) {
    return this.oauthService.getUserOAuthAccounts(userId);
  }

  /**
   * Validate user session
   */
  async validateSession(sessionId: string, userId: string): Promise<boolean> {
    return this.jwtService.validateSession(sessionId, userId);
  }

  /**
   * Get authentication statistics
   */
  async getAuthStatistics(hours: number = 24): Promise<Record<string, any>> {
    const [otpStats, sessionStats, oauthStats] = await Promise.all([
      this.otpService.getOTPStatistics(hours),
      this.jwtService.getSessionStatistics(),
      this.oauthService.getOAuthStatistics(),
    ]);

    return {
      otp: otpStats,
      sessions: sessionStats,
      oauth: oauthStats,
      period: `${hours} hours`,
    };
  }

  /**
   * Cleanup expired data
   */
  async cleanupExpiredData(): Promise<Record<string, number>> {
    const [expiredOTPs, expiredSessions] = await Promise.all([
      this.otpService.cleanupExpiredOTPs(),
      this.jwtService.cleanupExpiredSessions(),
    ]);

    this.logger.log(`Cleanup completed: ${expiredOTPs} OTPs, ${expiredSessions} sessions`);

    return {
      expiredOTPs,
      expiredSessions,
    };
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
  }
}