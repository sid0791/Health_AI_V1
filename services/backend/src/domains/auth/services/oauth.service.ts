import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UserOAuthAccount, OAuthProvider } from '../entities/user-oauth-account.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users.service';
import { AuditService } from './audit.service';
import { AuditEventType } from '../entities/audit-log.entity';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  profilePicture?: string;
  rawData: Record<string, any>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly oauthConfigs: Map<OAuthProvider, OAuthConfig>;

  constructor(
    @InjectRepository(UserOAuthAccount)
    private readonly oauthRepository: Repository<UserOAuthAccount>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {
    this.oauthConfigs = new Map([
      [
        OAuthProvider.GOOGLE,
        {
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID', 'demo_google_client_id'),
          clientSecret: this.configService.get<string>(
            'GOOGLE_CLIENT_SECRET',
            'demo_google_secret',
          ),
          redirectUri: this.configService.get<string>(
            'GOOGLE_REDIRECT_URI',
            'https://api.healthcoachai.com/auth/oauth/google/callback',
          ),
          scope: ['openid', 'profile', 'email'],
        },
      ],
      [
        OAuthProvider.APPLE,
        {
          clientId: this.configService.get<string>('APPLE_CLIENT_ID', 'demo_apple_client_id'),
          clientSecret: this.configService.get<string>('APPLE_CLIENT_SECRET', 'demo_apple_secret'),
          redirectUri: this.configService.get<string>(
            'APPLE_REDIRECT_URI',
            'https://api.healthcoachai.com/auth/oauth/apple/callback',
          ),
          scope: ['name', 'email'],
        },
      ],
      [
        OAuthProvider.FACEBOOK,
        {
          clientId: this.configService.get<string>('FACEBOOK_CLIENT_ID', 'demo_facebook_client_id'),
          clientSecret: this.configService.get<string>(
            'FACEBOOK_CLIENT_SECRET',
            'demo_facebook_secret',
          ),
          redirectUri: this.configService.get<string>(
            'FACEBOOK_REDIRECT_URI',
            'https://api.healthcoachai.com/auth/oauth/facebook/callback',
          ),
          scope: ['email', 'public_profile'],
        },
      ],
    ]);
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(provider: OAuthProvider, state?: string): { authUrl: string; state: string } {
    const config = this.oauthConfigs.get(provider);
    if (!config) {
      throw new BadRequestException(`OAuth provider ${provider} not configured`);
    }

    const generatedState = state || this.generateState();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      state: generatedState,
      response_type: 'code',
    });

    let authUrl: string;
    switch (provider) {
      case OAuthProvider.GOOGLE:
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        break;
      case OAuthProvider.APPLE:
        params.set('response_mode', 'form_post');
        authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
        break;
      case OAuthProvider.FACEBOOK:
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
        break;
      default:
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }

    this.logger.log(`Generated OAuth URL for provider ${provider}`);

    return { authUrl, state: generatedState };
  }

  /**
   * Exchange authorization code for tokens and user info
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string,
    state?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ user: User; isNewUser: boolean; oauthAccount: UserOAuthAccount }> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code);

      // Get user info from provider
      const userInfo = await this.getUserInfo(provider, tokens.accessToken);

      // Find or create user
      const { user, isNewUser } = await this.findOrCreateUser(userInfo, provider);

      // Create or update OAuth account
      const oauthAccount = await this.createOrUpdateOAuthAccount(user, provider, userInfo, tokens);

      // Audit log
      await this.auditService.logAuthEvent(
        isNewUser ? AuditEventType.OAUTH_CONNECTED : AuditEventType.LOGIN_SUCCESS,
        `OAuth ${provider} authentication ${isNewUser ? 'registered new user' : 'successful'}`,
        {
          userId: user.id,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        {
          provider,
          providerUserId: userInfo.id,
          isNewUser,
        },
      );

      this.logger.log(`OAuth ${provider} authentication successful for user ${user.id}`);

      return { user, isNewUser, oauthAccount };
    } catch (error) {
      this.logger.error(`OAuth ${provider} callback failed`, error);

      await this.auditService.logAuthEvent(
        AuditEventType.LOGIN_FAILED,
        `OAuth ${provider} authentication failed`,
        {
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        { provider, error: error.message },
        false,
      );

      throw error;
    }
  }

  /**
   * Connect OAuth account to existing user
   */
  async connectOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    code: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<UserOAuthAccount> {
    try {
      // Get user
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if OAuth account already exists
      const existingAccount = await this.oauthRepository.findOne({
        where: { userId, provider },
      });

      if (existingAccount) {
        throw new BadRequestException(`${provider} account already connected`);
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code);

      // Get user info from provider
      const userInfo = await this.getUserInfo(provider, tokens.accessToken);

      // Check if this OAuth account is already connected to another user
      const existingProviderAccount = await this.oauthRepository.findOne({
        where: { provider, providerId: userInfo.id },
      });

      if (existingProviderAccount) {
        throw new BadRequestException(
          `This ${provider} account is already connected to another user`,
        );
      }

      // Create OAuth account
      const oauthAccount = await this.createOrUpdateOAuthAccount(user, provider, userInfo, tokens);

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.OAUTH_CONNECTED,
        `OAuth ${provider} account connected to user ${userId}`,
        {
          userId,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        {
          provider,
          providerUserId: userInfo.id,
        },
      );

      this.logger.log(`OAuth ${provider} account connected to user ${userId}`);

      return oauthAccount;
    } catch (error) {
      this.logger.error(`Failed to connect OAuth ${provider} account`, error);
      throw error;
    }
  }

  /**
   * Disconnect OAuth account from user
   */
  async disconnectOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    try {
      const oauthAccount = await this.oauthRepository.findOne({
        where: { userId, provider },
      });

      if (!oauthAccount) {
        throw new BadRequestException(`${provider} account not found`);
      }

      // Revoke and remove the account
      oauthAccount.revoke();
      await this.oauthRepository.remove(oauthAccount);

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.OAUTH_DISCONNECTED,
        `OAuth ${provider} account disconnected from user ${userId}`,
        {
          userId,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        {
          provider,
          providerUserId: oauthAccount.providerId,
        },
      );

      this.logger.log(`OAuth ${provider} account disconnected from user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect OAuth ${provider} account`, error);
      throw error;
    }
  }

  /**
   * Get user's OAuth accounts
   */
  async getUserOAuthAccounts(userId: string): Promise<UserOAuthAccount[]> {
    return this.oauthRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(provider: OAuthProvider, code: string): Promise<OAuthTokens> {
    const config = this.oauthConfigs.get(provider);
    if (!config) {
      throw new BadRequestException(`OAuth provider ${provider} not configured`);
    }

    // For development mode, return mock tokens
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this.logger.log(`[DEVELOPMENT] Mock OAuth tokens for ${provider}`);
      return {
        accessToken: `mock_access_token_${provider}_${Date.now()}`,
        refreshToken: `mock_refresh_token_${provider}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: config.scope.join(' '),
      };
    }

    try {
      let tokenUrl: string;
      const tokenParams = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      });

      switch (provider) {
        case OAuthProvider.GOOGLE:
          tokenUrl = 'https://oauth2.googleapis.com/token';
          break;
        case OAuthProvider.APPLE:
          tokenUrl = 'https://appleid.apple.com/auth/token';
          break;
        case OAuthProvider.FACEBOOK:
          tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
          break;
        default:
          throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
      }

      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, tokenParams.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const data = (response as any).data;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens for ${provider}`, error);
      throw new UnauthorizedException('Failed to authenticate with OAuth provider');
    }
  }

  /**
   * Get user info from OAuth provider
   */
  private async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo> {
    // For development mode, return mock user info
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      const mockId = crypto.randomUUID();
      return {
        id: `mock_${provider}_${mockId}`,
        email: `user_${mockId}@example.com`,
        name: `Mock User ${provider}`,
        profilePicture: `https://example.com/avatar/${mockId}.jpg`,
        rawData: { mock: true, provider },
      };
    }

    try {
      let userInfoUrl: string;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };

      switch (provider) {
        case OAuthProvider.GOOGLE:
          userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
          break;
        case OAuthProvider.APPLE:
          // Apple doesn't provide a userinfo endpoint, info comes with the ID token
          throw new BadRequestException('Apple OAuth userinfo not implemented');
        case OAuthProvider.FACEBOOK:
          userInfoUrl = 'https://graph.facebook.com/me?fields=id,name,email,picture';
          break;
        default:
          throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
      }

      const response = await firstValueFrom(this.httpService.get(userInfoUrl, { headers }));

      const data = (response as any).data;

      return this.normalizeUserInfo(provider, data);
    } catch (error) {
      this.logger.error(`Failed to get user info from ${provider}`, error);
      throw new UnauthorizedException('Failed to get user information from OAuth provider');
    }
  }

  /**
   * Normalize user info from different providers
   */
  private normalizeUserInfo(provider: OAuthProvider, rawData: any): OAuthUserInfo {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return {
          id: rawData.id,
          email: rawData.email,
          name: rawData.name,
          profilePicture: rawData.picture,
          rawData,
        };
      case OAuthProvider.FACEBOOK:
        return {
          id: rawData.id,
          email: rawData.email,
          name: rawData.name,
          profilePicture: rawData.picture?.data?.url,
          rawData,
        };
      case OAuthProvider.APPLE:
        return {
          id: rawData.sub,
          email: rawData.email,
          name: rawData.name ? `${rawData.name.firstName} ${rawData.name.lastName}` : undefined,
          rawData,
        };
      default:
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Find or create user based on OAuth info
   */
  private async findOrCreateUser(
    userInfo: OAuthUserInfo,
    provider: OAuthProvider,
  ): Promise<{ user: User; isNewUser: boolean }> {
    // First, try to find existing OAuth account
    const existingOAuth = await this.oauthRepository.findOne({
      where: { provider, providerId: userInfo.id },
      relations: ['user'],
    });

    if (existingOAuth && existingOAuth.user) {
      return { user: existingOAuth.user, isNewUser: false };
    }

    // If email is available, try to find user by email
    if (userInfo.email) {
      const existingUser = await this.usersService.findByEmail(userInfo.email);
      if (existingUser) {
        return { user: existingUser, isNewUser: false };
      }
    }

    // Create new user
    const userData = {
      email: userInfo.email,
      name: userInfo.name,
      profilePictureUrl: userInfo.profilePicture,
      // OAuth users don't have phone initially
      isEmailVerified: true, // OAuth emails are considered verified
    };

    const newUser = await this.usersService.createFromOAuth(userData);
    return { user: newUser, isNewUser: true };
  }

  /**
   * Create or update OAuth account
   */
  private async createOrUpdateOAuthAccount(
    user: User,
    provider: OAuthProvider,
    userInfo: OAuthUserInfo,
    tokens: OAuthTokens,
  ): Promise<UserOAuthAccount> {
    let oauthAccount = await this.oauthRepository.findOne({
      where: { userId: user.id, provider },
    });

    if (oauthAccount) {
      // Update existing account
      oauthAccount.updateTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
      oauthAccount.providerEmail = userInfo.email;
      oauthAccount.providerName = userInfo.name;
      oauthAccount.profilePictureUrl = userInfo.profilePicture;
      oauthAccount.scope = tokens.scope;
      oauthAccount.providerRawData = userInfo.rawData;
      oauthAccount.isActive = true;
    } else {
      // Create new account
      oauthAccount = this.oauthRepository.create({
        userId: user.id,
        provider,
        providerId: userInfo.id,
        providerEmail: userInfo.email,
        providerName: userInfo.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        profilePictureUrl: userInfo.profilePicture,
        providerRawData: userInfo.rawData,
        isActive: true,
      });
    }

    return this.oauthRepository.save(oauthAccount);
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get OAuth statistics
   */
  async getOAuthStatistics(): Promise<Record<string, any>> {
    const totalAccounts = await this.oauthRepository.count();
    const activeAccounts = await this.oauthRepository.count({
      where: { isActive: true },
    });

    const providerDistribution = await this.oauthRepository
      .createQueryBuilder('oauth')
      .select('oauth.provider', 'provider')
      .addSelect('COUNT(*)', 'count')
      .where('oauth.isActive = true')
      .groupBy('oauth.provider')
      .getRawMany();

    return {
      totalAccounts,
      activeAccounts,
      providerDistribution,
    };
  }
}
