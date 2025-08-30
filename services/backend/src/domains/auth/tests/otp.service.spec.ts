import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OTPService } from '../services/otp.service';
import { AuditService } from '../services/audit.service';
import { UserOTP, OTPType, OTPStatus } from '../entities/user-otp.entity';

describe('OTPService', () => {
  let service: OTPService;
  let repository: Repository<UserOTP>;
  let auditService: AuditService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };

  const mockAuditService = {
    logAuthEvent: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        NODE_ENV: 'test',
        TWILIO_ACCOUNT_SID: 'test_sid',
        TWILIO_AUTH_TOKEN: 'test_token',
        TWILIO_SERVICE_SID: 'test_service',
        TWILIO_FROM_NUMBER: '+1234567890',
        MAX_OTPS_PER_HOUR: 3,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OTPService,
        {
          provide: getRepositoryToken(UserOTP),
          useValue: mockRepository,
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

    service = module.get<OTPService>(OTPService);
    repository = module.get<Repository<UserOTP>>(getRepositoryToken(UserOTP));
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOTP', () => {
    it('should generate OTP successfully', async () => {
      const phone = '+919876543210';
      const userId = 'test-user-id';
      const mockOTP = {
        id: 'otp-id',
        phone,
        userId,
        otpCode: '123456',
        type: OTPType.LOGIN,
        status: OTPStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
      };

      mockRepository.count.mockResolvedValue(0); // No recent OTPs
      mockRepository.create.mockReturnValue(mockOTP);
      mockRepository.save.mockResolvedValue(mockOTP);

      const result = await service.generateOTP(phone, OTPType.LOGIN, userId);

      expect(result).toEqual({
        otpId: mockOTP.id,
        expiresAt: mockOTP.expiresAt,
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
    });

    it('should throw error if rate limit exceeded', async () => {
      const phone = '+919876543210';
      
      mockRepository.count.mockResolvedValue(5); // Exceeds limit

      await expect(
        service.generateOTP(phone, OTPType.LOGIN)
      ).rejects.toThrow('Too many OTP requests');
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP successfully', async () => {
      const phone = '+919876543210';
      const otpCode = '123456';
      const userId = 'test-user-id';
      
      const mockOTP = {
        id: 'otp-id',
        phone,
        userId,
        otpCode,
        type: OTPType.LOGIN,
        status: OTPStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        maxAttempts: 3,
        canAttempt: jest.fn().mockReturnValue(true),
        verify: jest.fn().mockReturnValue(true),
        incrementAttempt: jest.fn(),
      };

      mockRepository.findOne.mockResolvedValue(mockOTP);
      mockRepository.save.mockResolvedValue(mockOTP);

      const result = await service.verifyOTP(phone, otpCode, OTPType.LOGIN);

      expect(result).toEqual({
        userId,
        verified: true,
      });
      expect(mockOTP.verify).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditService.logAuthEvent).toHaveBeenCalled();
    });

    it('should throw error for invalid OTP', async () => {
      const phone = '+919876543210';
      const otpCode = '999999';
      
      const mockOTP = {
        id: 'otp-id',
        phone,
        otpCode: '123456', // Different code
        type: OTPType.LOGIN,
        status: OTPStatus.PENDING,
        attempts: 0,
        maxAttempts: 3,
        canAttempt: jest.fn().mockReturnValue(true),
        incrementAttempt: jest.fn(),
      };

      mockRepository.findOne.mockResolvedValue(mockOTP);
      mockRepository.save.mockResolvedValue(mockOTP);

      await expect(
        service.verifyOTP(phone, otpCode, OTPType.LOGIN)
      ).rejects.toThrow('Invalid OTP code');

      expect(mockOTP.incrementAttempt).toHaveBeenCalled();
    });

    it('should throw error when no pending OTP found', async () => {
      const phone = '+919876543210';
      const otpCode = '123456';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyOTP(phone, otpCode, OTPType.LOGIN)
      ).rejects.toThrow('No valid OTP found');
    });
  });

  describe('cleanupExpiredOTPs', () => {
    it('should cleanup expired OTPs', async () => {
      mockRepository.update.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredOTPs();

      expect(result).toBe(5);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('getOTPStatistics', () => {
    it('should return OTP statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(10) // total generated
        .mockResolvedValueOnce(8)  // total verified
        .mockResolvedValueOnce(1); // total failed

      const result = await service.getOTPStatistics(24);

      expect(result).toEqual({
        totalGenerated: 10,
        totalVerified: 8,
        totalFailed: 1,
        verificationRate: 80,
        period: '24 hours',
      });
    });
  });
});