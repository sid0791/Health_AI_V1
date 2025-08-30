import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserSession } from '../entities/user-session.entity';
import { User } from '../../users/entities/user.entity';
import { AuditService } from './audit.service';
import { AuditEventType } from '../entities/audit-log.entity';
import { JwtPayload } from '../strategies/jwt.strategy';
import * as crypto from 'crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionInfo {
  deviceId?: string;
  deviceName?: string;
  devicePlatform?: string;
  userAgent?: string;
  ipAddress?: string;
  loginMethod: string;
}

@Injectable()
export class JWTService {
  private readonly logger = new Logger(JWTService.name);
  private readonly accessTokenTTL: number;
  private readonly refreshTokenTTL: number;

  constructor(
    private readonly jwtService: NestJwtService,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.accessTokenTTL = this.configService.get<number>('JWT_ACCESS_TTL', 900); // 15 minutes
    this.refreshTokenTTL = this.configService.get<number>('JWT_REFRESH_TTL', 1209600); // 14 days
  }

  /**
   * Generate JWT tokens for user
   */
  async generateTokens(
    user: User,
    sessionInfo: SessionInfo,
  ): Promise<TokenPair> {
    try {
      // Create session record
      const session = await this.createSession(user, sessionInfo);

      // Create JWT payload
      const payload: JwtPayload = {
        sub: user.id,
        phone: user.phone,
        deviceId: sessionInfo.deviceId,
        sessionId: session.id,
      };

      // Generate access token
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: this.accessTokenTTL,
      });

      // Generate refresh token
      const refreshToken = this.generateRefreshToken();
      
      // Update session with refresh token
      session.refreshToken = refreshToken;
      await this.sessionRepository.save(session);

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.TOKEN_REFRESH,
        `JWT tokens generated for user ${user.id}`,
        {
          userId: user.id,
          sessionId: session.id,
          ipAddress: sessionInfo.ipAddress,
          userAgent: sessionInfo.userAgent,
        },
        {
          loginMethod: sessionInfo.loginMethod,
          deviceId: sessionInfo.deviceId,
          devicePlatform: sessionInfo.devicePlatform,
        },
      );

      this.logger.log(`JWT tokens generated for user ${user.id}`);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenTTL,
      };
    } catch (error) {
      this.logger.error('Failed to generate JWT tokens', error, { userId: user.id });
      throw error;
    }
  }

  /**
   * Refresh JWT tokens
   */
  async refreshTokens(
    refreshToken: string,
    deviceId?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    try {
      // Find session by refresh token
      const session = await this.sessionRepository.findOne({
        where: { refreshToken, isActive: true },
        relations: ['user'],
      });

      if (!session || !session.isValid()) {
        await this.auditService.logAuthEvent(
          AuditEventType.TOKEN_REFRESH,
          'Token refresh failed: Invalid or expired refresh token',
          {
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          },
          { refreshToken: this.maskToken(refreshToken) },
          false,
        );

        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Verify device binding if provided
      if (deviceId && session.deviceId && session.deviceId !== deviceId) {
        await this.auditService.logAuthEvent(
          AuditEventType.TOKEN_REFRESH,
          'Token refresh failed: Device binding mismatch',
          {
            userId: session.userId,
            sessionId: session.id,
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          },
          { 
            expectedDeviceId: session.deviceId,
            providedDeviceId: deviceId,
          },
          false,
        );

        throw new UnauthorizedException('Device binding mismatch');
      }

      // Update session usage
      session.markAsUsed();
      if (context?.ipAddress) session.ipAddress = context.ipAddress;
      if (context?.userAgent) session.userAgent = context.userAgent;

      // Create new JWT payload
      const payload: JwtPayload = {
        sub: session.userId,
        phone: session.user.phone,
        deviceId: session.deviceId,
        sessionId: session.id,
      };

      // Generate new access token
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: this.accessTokenTTL,
      });

      // Generate new refresh token
      const newRefreshToken = this.generateRefreshToken();
      session.refreshToken = newRefreshToken;
      
      await this.sessionRepository.save(session);

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.TOKEN_REFRESH,
        `JWT tokens refreshed for user ${session.userId}`,
        {
          userId: session.userId,
          sessionId: session.id,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        {
          deviceId: session.deviceId,
          devicePlatform: session.devicePlatform,
        },
      );

      this.logger.log(`JWT tokens refreshed for user ${session.userId}`);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.accessTokenTTL,
      };
    } catch (error) {
      this.logger.error('Failed to refresh JWT tokens', error);
      throw error;
    }
  }

  /**
   * Revoke session/tokens
   */
  async revokeSession(
    sessionId: string,
    userId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId },
      });

      if (session) {
        session.revoke();
        await this.sessionRepository.save(session);

        // Audit log
        await this.auditService.logAuthEvent(
          AuditEventType.LOGOUT,
          `Session revoked for user ${userId}`,
          {
            userId,
            sessionId,
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          },
          {
            deviceId: session.deviceId,
            devicePlatform: session.devicePlatform,
          },
        );

        this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Failed to revoke session', error, { sessionId, userId });
      throw error;
    }
  }

  /**
   * Revoke all sessions for user
   */
  async revokeAllSessions(
    userId: string,
    excludeSessionId?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<number> {
    try {
      const queryBuilder = this.sessionRepository
        .createQueryBuilder()
        .update(UserSession)
        .set({ isActive: false })
        .where('userId = :userId', { userId })
        .andWhere('isActive = true');

      if (excludeSessionId) {
        queryBuilder.andWhere('id != :excludeSessionId', { excludeSessionId });
      }

      const result = await queryBuilder.execute();

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.LOGOUT,
        `All sessions revoked for user ${userId}`,
        {
          userId,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        {
          excludedSessionId: excludeSessionId,
          revokedCount: result.affected,
        },
      );

      this.logger.log(`${result.affected || 0} sessions revoked for user ${userId}`);
      
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to revoke all sessions', error, { userId });
      throw error;
    }
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    return session ? session.isValid() : false;
  }

  /**
   * Create new session
   */
  private async createSession(user: User, sessionInfo: SessionInfo): Promise<UserSession> {
    const expiresAt = new Date(Date.now() + this.refreshTokenTTL * 1000);
    
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshToken: '', // Will be set later
      deviceId: sessionInfo.deviceId,
      deviceName: sessionInfo.deviceName,
      devicePlatform: sessionInfo.devicePlatform,
      userAgent: sessionInfo.userAgent,
      ipAddress: sessionInfo.ipAddress,
      loginMethod: sessionInfo.loginMethod,
      expiresAt,
      lastUsedAt: new Date(),
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Generate secure refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Mask token for logging
   */
  private maskToken(token: string): string {
    if (token.length <= 8) return '****';
    return token.substring(0, 4) + '****' + token.substring(token.length - 4);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired sessions`);
    }

    return result.affected || 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(): Promise<Record<string, any>> {
    const totalSessions = await this.sessionRepository.count();
    const activeSessions = await this.sessionRepository.count({
      where: { isActive: true },
    });
    const expiredSessions = await this.sessionRepository.count({
      where: { 
        expiresAt: {
          $lt: new Date(),
        } as any,
      },
    });

    const devicePlatforms = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.devicePlatform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('session.isActive = true')
      .groupBy('session.devicePlatform')
      .getRawMany();

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
      devicePlatforms,
    };
  }
}