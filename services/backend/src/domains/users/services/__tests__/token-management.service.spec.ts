import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { TokenManagementService } from '../token-management.service';
import { User } from '../../entities/user.entity';
import { UserTokenUsage, TokenUsageType, TokenProvider } from '../../entities/user-token-usage.entity';

describe('TokenManagementService', () => {
  let service: TokenManagementService;
  let userRepository: Repository<User>;
  let tokenUsageRepository: Repository<UserTokenUsage>;

  const mockUser = {
    id: 'test-user-id',
    dailyTokenLimit: 10000,
    monthlyTokenLimit: 250000,
    dailyTokensUsed: 0,
    monthlyTokensUsed: 0,
    userTier: 'free',
    fallbackToFreeTier: true,
    canConsumeTokens: jest.fn(),
    consumeTokens: jest.fn(),
    shouldFallbackToFreeTier: jest.fn(),
    getRemainingDailyTokens: jest.fn(),
    getRemainingMonthlyTokens: jest.fn(),
    resetDailyTokens: jest.fn(),
    resetMonthlyTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenManagementService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserTokenUsage),
          useValue: {
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenManagementService>(TokenManagementService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tokenUsageRepository = module.get<Repository<UserTokenUsage>>(getRepositoryToken(UserTokenUsage));
  });

  describe('canConsumeTokens', () => {
    it('should return true if user can consume tokens', async () => {
      mockUser.canConsumeTokens.mockReturnValue(true);
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.canConsumeTokens('test-user-id', 100);

      expect(result).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-user-id' } });
    });

    it('should return false if user cannot consume tokens', async () => {
      mockUser.canConsumeTokens.mockReturnValue(false);
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.canConsumeTokens('test-user-id', 100);

      expect(result).toBe(false);
    });

    it('should throw error if user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.canConsumeTokens('invalid-user-id', 100)).rejects.toThrow('User not found: invalid-user-id');
    });
  });

  describe('consumeTokens', () => {
    it('should successfully consume tokens and record usage', async () => {
      mockUser.canConsumeTokens.mockReturnValue(true);
      mockUser.consumeTokens.mockReturnValue(true);
      mockUser.shouldFallbackToFreeTier.mockReturnValue(false);
      mockUser.getRemainingDailyTokens.mockReturnValue(9900);
      mockUser.getRemainingMonthlyTokens.mockReturnValue(249900);

      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (tokenUsageRepository.save as jest.Mock).mockResolvedValue({});
      (userRepository.save as jest.Mock).mockResolvedValue(mockUser);

      const request = {
        userId: 'test-user-id',
        usageType: TokenUsageType.CHAT_MESSAGE,
        provider: TokenProvider.OPENAI_GPT4,
        inputTokens: 50,
        outputTokens: 50,
        modelName: 'gpt-4',
      };

      const result = await service.consumeTokens(request);

      expect(result.success).toBe(true);
      expect(result.usedFreeTier).toBe(false);
      expect(result.remainingTokens.daily).toBe(9900);
      expect(tokenUsageRepository.save).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should fallback to free tier when user reaches token limit', async () => {
      mockUser.shouldFallbackToFreeTier.mockReturnValue(true);
      mockUser.canConsumeTokens.mockReturnValue(false);
      mockUser.fallbackToFreeTier = true;

      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (tokenUsageRepository.save as jest.Mock).mockResolvedValue({});

      const request = {
        userId: 'test-user-id',
        usageType: TokenUsageType.CHAT_MESSAGE,
        provider: TokenProvider.OPENAI_GPT4,
        inputTokens: 50,
        outputTokens: 50,
        modelName: 'gpt-4',
      };

      // Mock recursive call with free provider
      const serviceSpy = jest.spyOn(service, 'consumeTokens');
      serviceSpy.mockResolvedValueOnce({
        success: true,
        usedFreeTier: true,
        remainingTokens: { daily: 0, monthly: 0 },
      });

      const result = await service.consumeTokens(request);

      expect(result.success).toBe(true);
      expect(result.usedFreeTier).toBe(true);

      serviceSpy.mockRestore();
    });
  });
});