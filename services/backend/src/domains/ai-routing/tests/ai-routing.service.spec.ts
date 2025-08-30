import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { AIRoutingService } from '../services/ai-routing.service';
import { AIRoutingDecision, AIServiceLevel, AIProvider, RequestType } from '../entities/ai-routing-decision.entity';

describe('AIRoutingService', () => {
  let service: AIRoutingService;
  let repository: Repository<AIRoutingDecision>;
  let cacheManager: any;
  let configService: ConfigService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const configs = {
        'AI_LEVEL1_DAILY_QUOTA': 1000000,
        'AI_LEVEL2_DAILY_QUOTA': 5000000,
        'OPENAI_API_KEY': 'test-openai-key',
        'ANTHROPIC_API_KEY': 'test-anthropic-key',
        'OPENROUTER_API_KEY': 'test-openrouter-key',
        'DLP_ENABLE_REDACTION': true,
        'DLP_ENABLE_PSEUDONYMIZATION': true,
      };
      return configs[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIRoutingService,
        {
          provide: getRepositoryToken(AIRoutingDecision),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AIRoutingService>(AIRoutingService);
    repository = module.get<Repository<AIRoutingDecision>>(getRepositoryToken(AIRoutingDecision));
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('routeRequest', () => {
    it('should route Level 1 request to highest accuracy provider', async () => {
      const request = {
        userId: 'test-user',
        requestType: RequestType.HEALTH_REPORT_ANALYSIS,
        contextTokens: 1000,
        maxResponseTokens: 500,
      };

      const mockDecision = {
        id: 'test-decision-id',
        provider: AIProvider.ANTHROPIC,
        model: 'claude-3-opus',
      };

      mockRepository.create.mockReturnValue(mockDecision);
      mockRepository.save.mockResolvedValue(mockDecision);
      mockCacheManager.get.mockResolvedValue(null); // No cache hit

      const result = await service.routeRequest(request);

      expect(result).toBeDefined();
      expect(result.provider).toBe(AIProvider.ANTHROPIC);
      expect(result.decisionId).toBe('test-decision-id');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should route Level 2 request to cost-optimized provider', async () => {
      const request = {
        userId: 'test-user',
        requestType: RequestType.RECIPE_GENERATION,
        contextTokens: 500,
        maxResponseTokens: 1000,
      };

      const mockDecision = {
        id: 'test-decision-id',
        provider: AIProvider.OPENROUTER,
        model: 'llama-3.1-70b',
      };

      mockRepository.create.mockReturnValue(mockDecision);
      mockRepository.save.mockResolvedValue(mockDecision);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.routeRequest(request);

      expect(result).toBeDefined();
      expect(result.provider).toBe(AIProvider.OPENROUTER);
      expect(result.routingDecision).toBe('cost_optimization');
    });

    it('should return cached result when available', async () => {
      const request = {
        userId: 'test-user',
        requestType: RequestType.NUTRITION_ADVICE,
      };

      const cachedResult = {
        provider: AIProvider.OPENAI,
        model: 'gpt-4o',
        decisionId: 'cached-decision',
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.routeRequest(request);

      expect(result).toEqual(cachedResult);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle emergency requests with highest priority', async () => {
      const request = {
        userId: 'test-user',
        requestType: RequestType.EMERGENCY_ASSESSMENT,
        emergencyRequest: true,
      };

      const mockDecision = {
        id: 'emergency-decision-id',
        provider: AIProvider.ANTHROPIC,
        model: 'claude-3-opus',
      };

      mockRepository.create.mockReturnValue(mockDecision);
      mockRepository.save.mockResolvedValue(mockDecision);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.routeRequest(request);

      expect(result.routingDecision).toBe('emergency_override');
      expect(result.routingReason).toContain('Emergency request');
    });
  });

  describe('updateCompletion', () => {
    it('should update decision with completion data', async () => {
      const decisionId = 'test-decision-id';
      const completionData = {
        responseTokens: 750,
        confidence: 95,
        actualCost: 0.025,
        processingDuration: 2500,
      };

      const mockDecision = {
        id: decisionId,
        complete: jest.fn(),
        calculateCostEfficiency: jest.fn(),
      };

      mockRepository.findOne.mockResolvedValue(mockDecision);
      mockRepository.save.mockResolvedValue(mockDecision);

      await service.updateCompletion(decisionId, completionData);

      expect(mockDecision.complete).toHaveBeenCalledWith(
        completionData.responseTokens,
        completionData.confidence,
        completionData.actualCost,
      );
      expect(mockDecision.calculateCostEfficiency).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(mockDecision);
    });

    it('should handle missing decision gracefully', async () => {
      const decisionId = 'nonexistent-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateCompletion(decisionId, {})).resolves.not.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getRoutingAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const mockDecisions = [
        {
          provider: AIProvider.OPENAI,
          serviceLevel: AIServiceLevel.LEVEL_1,
          isCompleted: () => true,
          isLevel1Request: () => true,
          actualCostUsd: 0.05,
          getTotalLatency: () => 1500,
          accuracyScore: 95,
          costEfficiencyScore: 80,
        },
        {
          provider: AIProvider.OPENROUTER,
          serviceLevel: AIServiceLevel.LEVEL_2,
          isCompleted: () => true,
          isLevel1Request: () => false,
          actualCostUsd: 0.01,
          getTotalLatency: () => 2000,
          accuracyScore: 85,
          costEfficiencyScore: 90,
        },
      ];

      mockRepository.createQueryBuilder().getMany.mockResolvedValue(mockDecisions);

      const analytics = await service.getRoutingAnalytics(startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.totalRequests).toBe(2);
      expect(analytics.successRate).toBe(100);
      expect(analytics.avgCost).toBe(0.03);
      expect(analytics.providerDistribution).toHaveProperty(AIProvider.OPENAI);
      expect(analytics.providerDistribution).toHaveProperty(AIProvider.OPENROUTER);
    });
  });

  describe('resetDailyQuotas', () => {
    it('should reset quota tracking', () => {
      // Setup some quota usage
      service['dailyQuotaUsage'].set('2023-01-01-openai', 50000);
      service['dailyQuotaUsage'].set('2023-01-02-openai', 30000);

      service.resetDailyQuotas();

      // Check that old entries are removed (implementation detail test)
      expect(service['dailyQuotaUsage'].size).toBeLessThanOrEqual(1);
    });
  });

  describe('Step-down quota logic', () => {
    it('should implement step-down for Level 1 requests when quota is exceeded', async () => {
      const request = {
        userId: 'test-user',
        requestType: RequestType.HEALTH_REPORT_ANALYSIS,
        contextTokens: 1000,
        maxResponseTokens: 500,
      };

      // Mock high quota usage
      jest.spyOn(service as any, 'getDailyQuotaUsage').mockReturnValue(950000); // 95% used

      const mockDecision = {
        id: 'step-down-decision-id',
        provider: AIProvider.OPENAI,
        model: 'gpt-4o',
      };

      mockRepository.create.mockReturnValue(mockDecision);
      mockRepository.save.mockResolvedValue(mockDecision);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.routeRequest(request);

      expect(result.routingReason).toContain('quota level');
    });
  });

  describe('Cost optimization for Level 2', () => {
    it('should select cheapest model within 5% accuracy window', async () => {
      const request = {
        userId: 'test-user',
        requestType: RequestType.MEAL_PLANNING,
      };

      const mockDecision = {
        id: 'cost-optimized-decision-id',
        provider: AIProvider.OPENROUTER,
        model: 'llama-3.1-70b',
      };

      mockRepository.create.mockReturnValue(mockDecision);
      mockRepository.save.mockResolvedValue(mockDecision);
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.routeRequest(request);

      expect(result.provider).toBe(AIProvider.OPENROUTER);
      expect(result.routingDecision).toBe('cost_optimization');
    });
  });

  describe('Retry logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('Success');

      const result = await service.executeWithRetry(operation, 'test operation');

      expect(result).toBe('Success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        service.executeWithRetry(operation, 'test operation', 2)
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});