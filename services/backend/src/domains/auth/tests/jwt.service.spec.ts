import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JWTService } from '../services/jwt.service';
import { AuditService } from '../services/audit.service';
import { UserSession } from '../entities/user-session.entity';
import { User } from '../../users/entities/user.entity';
import { JwtService as NestJwtService } from '@nestjs/jwt';

describe('JWTService', () => {
  let service: JWTService;
  let sessionRepository: Repository<UserSession>;
  let jwtService: NestJwtService;
  let auditService: AuditService;

  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockAuditService = {
    logAuthEvent: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        JWT_ACCESS_TTL: 900,
        JWT_REFRESH_TTL: 1209600,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JWTService,
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockSessionRepository,
        },
        {
          provide: NestJwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JWTService>(JWTService);
    sessionRepository = module.get<Repository<UserSession>>(getRepositoryToken(UserSession));
    jwtService = module.get<NestJwtService>(NestJwtService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate tokens successfully', async () => {
      const user: User = {
        id: 'user-id',
        phone: '+919876543210',
        email: 'test@example.com',
      } as User;

      const sessionInfo = {
        deviceId: 'device-123',
        deviceName: 'iPhone',
        devicePlatform: 'ios',
        loginMethod: 'phone_otp',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      };

      const mockSession = {
        id: 'session-id',
        userId: user.id,
        refreshToken: '',
        deviceId: sessionInfo.deviceId,
        expiresAt: new Date(Date.now() + 1209600 * 1000),
      };

      mockSessionRepository.create.mockReturnValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(mockSession);
      mockJwtService.sign.mockReturnValue('mock-access-token');

      const result = await service.generateTokens(user, sessionInfo);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: expect.any(String),
        expiresIn: 900,
      });
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(mockSessionRepository.save).toHaveBeenCalledTimes(2); // Once for create, once for update with refresh token
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockSession = {
        id: 'session-id',
        userId: 'user-id',
        refreshToken,
        deviceId: 'device-123',
        isActive: true,
        isValid: jest.fn().mockReturnValue(true),
        markAsUsed: jest.fn(),
        user: {
          id: 'user-id',
          phone: '+919876543210',
        },
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(mockSession);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: expect.any(String),
        expiresIn: 900,
      });
      expect(mockSession.markAsUsed).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockSessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshTokens(refreshToken)
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const sessionId = 'session-id';
      const userId = 'user-id';
      const mockSession = {
        id: sessionId,
        userId,
        revoke: jest.fn(),
      };

      mockSessionRepository.findOne.mockResolvedValue(mockSession);
      mockSessionRepository.save.mockResolvedValue(mockSession);

      await service.revokeSession(sessionId, userId);

      expect(mockSession.revoke).toHaveBeenCalled();
      expect(mockSessionRepository.save).toHaveBeenCalled();
      expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for user', async () => {
      const userId = 'user-id';
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.revokeAllSessions(userId);

      expect(result).toBe(3);
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
      expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions', async () => {
      const userId = 'user-id';
      const mockSessions = [
        { id: 'session-1', userId, isActive: true },
        { id: 'session-2', userId, isActive: true },
      ];

      mockSessionRepository.find.mockResolvedValue(mockSessions);

      const result = await service.getUserSessions(userId);

      expect(result).toEqual(mockSessions);
      expect(mockSessionRepository.find).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        order: { lastUsedAt: 'DESC' },
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      mockSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(2);
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});