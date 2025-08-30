import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { 
  SendOTPDto, 
  VerifyOTPDto,
} from '../dto/otp.dto';
import {
  RefreshTokenDto,
  AuthTokensResponseDto,
  LoginResponseDto,
  LogoutDto,
} from '../dto/auth.dto';
import {
  OAuthCallbackDto,
  OAuthUrlResponseDto,
  ConnectOAuthDto,
  DisconnectOAuthDto,
} from '../dto/oauth.dto';
import { OAuthProvider } from '../entities/user-oauth-account.entity';
import { AuthenticatedRequest } from '../guards/optional-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP for phone login',
    description: 'Send a one-time password to the provided phone number for authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        otpId: { type: 'string', example: 'uuid' },
        expiresAt: { type: 'string', format: 'date-time' },
        message: { type: 'string', example: 'OTP sent successfully' },
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async sendOTP(@Body() dto: SendOTPDto, @Req() req: any) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    };

    const result = await this.authService.sendLoginOTP(
      dto.phone,
      {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        devicePlatform: dto.devicePlatform,
      },
      context,
    );

    return {
      ...result,
      message: 'OTP sent successfully',
    };
  }

  @Post('otp/verify')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and login',
    description: 'Verify the OTP code and authenticate the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyOTP(@Body() dto: VerifyOTPDto, @Req() req: any): Promise<LoginResponseDto> {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    };

    const result = await this.authService.verifyOTPAndLogin(
      dto.phone,
      dto.otpCode,
      {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        devicePlatform: dto.devicePlatform,
      },
      context,
    );

    return {
      tokens: {
        ...result.tokens,
        tokenType: 'Bearer',
      },
      user: result.user,
      isNewUser: result.isNewUser,
    };
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh JWT tokens',
    description: 'Exchange refresh token for new access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokens(@Body() dto: RefreshTokenDto, @Req() req: any): Promise<AuthTokensResponseDto> {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    };

    const tokens = await this.authService.refreshTokens(
      dto.refreshToken,
      dto.deviceId,
      context,
    );

    return {
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke user session and invalidate tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
        revokedSessions: { type: 'number', example: 1 },
      },
    },
  })
  async logout(@Body() dto: LogoutDto, @Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await this.authService.logout(
      req.user.userId,
      req.user.sessionId,
      dto.scope || 'current',
      context,
    );

    return {
      message: 'Logged out successfully',
      ...result,
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user sessions',
    description: 'Retrieve all active sessions for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              deviceName: { type: 'string' },
              devicePlatform: { type: 'string' },
              lastUsedAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getUserSessions(@Req() req: AuthenticatedRequest) {
    const sessions = await this.authService.getUserSessions(req.user.userId);
    
    return {
      sessions: sessions.map(session => ({
        id: session.id,
        deviceName: session.deviceName,
        devicePlatform: session.devicePlatform,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        isCurrent: session.id === req.user.sessionId,
      })),
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke specific session',
    description: 'Revoke a specific user session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
  })
  async revokeSession(@Param('sessionId') sessionId: string, @Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await this.authService.logout(req.user.userId, sessionId, 'current', context);
    
    return { message: 'Session revoked successfully' };
  }

  @Get('oauth/:provider/url')
  @ApiOperation({
    summary: 'Get OAuth authorization URL',
    description: 'Generate OAuth authorization URL for the specified provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth URL generated successfully',
    type: OAuthUrlResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OAuth provider' })
  async getOAuthUrl(
    @Param('provider') provider: OAuthProvider,
    @Query('state') state?: string,
  ): Promise<OAuthUrlResponseDto> {
    return this.authService.generateOAuthUrl(provider, state);
  }

  @Post('oauth/callback')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'OAuth callback',
    description: 'Handle OAuth provider callback and authenticate user.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid OAuth callback' })
  async oauthCallback(@Body() dto: OAuthCallbackDto, @Req() req: any): Promise<LoginResponseDto> {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    };

    const result = await this.authService.oauthLogin(
      dto.provider,
      dto.code,
      dto.state,
      {
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        devicePlatform: dto.devicePlatform,
      },
      context,
    );

    return {
      tokens: {
        ...result.tokens,
        tokenType: 'Bearer',
      },
      user: result.user,
      isNewUser: result.isNewUser,
    };
  }

  @Post('oauth/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Connect OAuth account',
    description: 'Connect an OAuth provider account to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth account connected successfully',
  })
  @ApiResponse({ status: 400, description: 'OAuth account already connected' })
  async connectOAuth(@Body() dto: ConnectOAuthDto, @Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const oauthAccount = await this.authService.connectOAuthAccount(
      req.user.userId,
      dto.provider,
      dto.code,
      context,
    );

    return {
      message: `${dto.provider} account connected successfully`,
      provider: dto.provider,
      connectedAt: oauthAccount.createdAt,
    };
  }

  @Delete('oauth/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disconnect OAuth account',
    description: 'Disconnect an OAuth provider account from the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth account disconnected successfully',
  })
  @ApiResponse({ status: 404, description: 'OAuth account not found' })
  async disconnectOAuth(@Param('provider') provider: OAuthProvider, @Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    await this.authService.disconnectOAuthAccount(req.user.userId, provider, context);

    return {
      message: `${provider} account disconnected successfully`,
      provider,
    };
  }

  @Get('oauth/accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get connected OAuth accounts',
    description: 'Retrieve all OAuth accounts connected to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth accounts retrieved successfully',
  })
  async getOAuthAccounts(@Req() req: AuthenticatedRequest) {
    const accounts = await this.authService.getUserOAuthAccounts(req.user.userId);
    
    return {
      accounts: accounts.map(account => ({
        provider: account.provider,
        providerEmail: account.providerEmail,
        providerName: account.providerName,
        connectedAt: account.createdAt,
        isActive: account.isActive,
      })),
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authentication statistics',
    description: 'Retrieve authentication statistics (admin only).',
  })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Hours to look back' })
  @ApiResponse({
    status: 200,
    description: 'Authentication statistics retrieved successfully',
  })
  async getAuthStats(@Query('hours') hours: number = 24) {
    return this.authService.getAuthStatistics(hours);
  }
}