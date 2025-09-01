import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { HealthKnowledgeService } from './health-knowledge.service';
import { User } from '../../users/entities/user.entity';
import { HealthDataEntry } from '../../integrations/health-data/entities/health-data-entry.entity';
import { LogEntry } from '../../logs/entities/log-entry.entity';
import { MealPlan } from '../../meal-planning/entities/meal-plan.entity';

describe('HealthKnowledgeService', () => {
  let service: HealthKnowledgeService;
  let userRepository: jest.Mocked<Repository<User>>;
  let healthDataRepository: jest.Mocked<Repository<HealthDataEntry>>;
  let logRepository: jest.Mocked<Repository<LogEntry>>;
  let mealPlanRepository: jest.Mocked<Repository<MealPlan>>;

  const mockUser = {
    id: 'user-1',
    profile: {
      age: 30,
      weight: 70,
      height: 175,
      activityLevel: 'moderately_active',
      healthConditions: [],
    },
    goals: {
      primaryGoal: 'weight_loss',
    },
  };

  const mockHealthData = [
    {
      id: 'health-1',
      userId: 'user-1',
      dataType: 'steps',
      value: 8500,
      recordedAt: new Date(),
    },
    {
      id: 'health-2',
      userId: 'user-1',
      dataType: 'calories_burned',
      value: 350,
      recordedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthKnowledgeService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(HealthDataEntry),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LogEntry),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MealPlan),
          useValue: {
            find: jest.fn(),
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

    service = module.get<HealthKnowledgeService>(HealthKnowledgeService);
    userRepository = module.get(getRepositoryToken(User));
    healthDataRepository = module.get(getRepositoryToken(HealthDataEntry));
    logRepository = module.get(getRepositoryToken(LogEntry));
    mealPlanRepository = module.get(getRepositoryToken(MealPlan));

    // Mock repository responses
    userRepository.findOne.mockResolvedValue(mockUser as any);
    healthDataRepository.find.mockResolvedValue(mockHealthData as any);
    logRepository.find.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQuickHealthResponse', () => {
    it('should return a quick response for steps question', async () => {
      const response = await service.getQuickHealthResponse(
        'user-1',
        'How many steps did I take today?',
      );

      expect(response).toBeDefined();
      expect(response.source).toBe('calculated');
      expect(response.answer).toContain('8500 steps');
      expect(response.userSpecific).toBe(true);
    });

    it('should return a quick response for calories question', async () => {
      const response = await service.getQuickHealthResponse(
        'user-1',
        'How many calories did I burn today?',
      );

      expect(response).toBeDefined();
      expect(response.source).toBe('knowledge_base'); // It's matching a knowledge base entry first
      expect(response.answer).toContain('350 calories');
      expect(response.userSpecific).toBe(true);
    });

    it('should return null for unrecognized questions', async () => {
      const response = await service.getQuickHealthResponse('user-1', 'What is the weather like?');

      expect(response).toBeNull();
    });

    it('should handle BMI calculation questions', async () => {
      const response = await service.getQuickHealthResponse('user-1', 'What is my BMI?');

      expect(response).toBeDefined();
      expect(response.source).toBe('knowledge_base');
      expect(response.answer).toContain('BMI is');
      // BMI for 70kg, 175cm should be around 22.9
      expect(response.answer).toContain('22.9');
    });
  });

  describe('getUserHealthMetrics', () => {
    it('should return comprehensive health metrics', async () => {
      const metrics = await service.getUserHealthMetrics('user-1');

      expect(metrics).toBeDefined();
      expect(metrics.profile).toBeDefined();
      expect(metrics.profile.age).toBe(30);
      expect(metrics.profile.weight).toBe(70);
      expect(metrics.todayMetrics).toBeDefined();
      expect(metrics.todayMetrics.stepCount).toBe(8500);
      expect(metrics.todayMetrics.caloriesBurned).toBe(350);
    });
  });

  describe('getKnowledgeBaseStats', () => {
    it('should return knowledge base statistics', () => {
      const stats = service.getKnowledgeBaseStats();

      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.totalUsage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.topCategories)).toBe(true);
      expect(Array.isArray(stats.mostUsedQuestions)).toBe(true);
    });
  });

  describe('addKnowledgeEntry', () => {
    it('should add a new knowledge entry', async () => {
      const newEntry = {
        question: 'How much protein should I eat?',
        answer: 'Generally, aim for 0.8-1.2g per kg of body weight.',
        category: 'nutrition',
        tags: ['protein', 'nutrition', 'daily'],
        variables: ['weight'],
      };

      await service.addKnowledgeEntry(newEntry);

      const stats = service.getKnowledgeBaseStats();
      expect(stats.totalEntries).toBeGreaterThan(5); // Should include initial + new entry
    });
  });

  describe('Knowledge base initialization', () => {
    it('should initialize with common health questions', () => {
      const stats = service.getKnowledgeBaseStats();

      expect(stats.totalEntries).toBeGreaterThan(0);

      // Check that common categories are present
      const categories = stats.topCategories.map((c) => c.category);
      expect(categories).toContain('calories');
      expect(categories).toContain('activity');
      expect(categories).toContain('health_metrics');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      const response = await service.getQuickHealthResponse('user-1', 'How many steps did I take?');

      // Should still return a response, just less personalized
      expect(response).toBeDefined();
    });

    it('should handle missing user data', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const metrics = await service.getUserHealthMetrics('user-1');

      expect(metrics).toBeDefined();
      expect(metrics.profile).toBeDefined();
    });
  });

  describe('Response personalization', () => {
    it('should personalize responses based on user data', async () => {
      const response = await service.getQuickHealthResponse('user-1', 'What is my BMI?');

      expect(response).toBeDefined();
      expect(response.userSpecific).toBe(true);
      expect(response.answer).toContain('22.9'); // Specific BMI for user
    });

    it('should provide generic responses when user data is missing', async () => {
      const userWithoutData = { ...mockUser, profile: null };
      userRepository.findOne.mockResolvedValue(userWithoutData as any);

      const response = await service.getQuickHealthResponse('user-1', 'What is my BMI?');

      expect(response).toBeDefined();
      expect(response.answer).toContain('please update your weight and height');
    });
  });
});
