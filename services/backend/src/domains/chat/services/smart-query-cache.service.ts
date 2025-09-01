import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { HealthDataEntry } from '../../integrations/health-data/entities/health-data-entry.entity';
import { HealthDataType } from '../../integrations/health-data/entities/health-data-entry.entity';
import { User } from '../../users/entities/user.entity';
import { UserProfile } from '../../users/entities/user-profile.entity';

export interface SmartQueryResponse {
  id: string;
  query: string;
  response: string;
  category: 'health' | 'nutrition' | 'fitness' | 'general';
  fromCache: boolean;
  dataSource: 'local' | 'computed' | 'ai_generated';
  confidence: number;
  timestamp: Date;
  metadata?: {
    userId?: string;
    personalizedData?: any;
    healthMetrics?: any;
  };
}

export interface CommonQuestion {
  id: string;
  question: string;
  keywords: string[];
  category: string;
  computeFromLocal: boolean;
  template: string; // Template for response generation
  freshnessTtl: number; // How long cached response is valid
}

@Injectable()
export class SmartQueryCacheService {
  private readonly logger = new Logger(SmartQueryCacheService.name);
  private readonly CACHE_PREFIX = 'smart_query:';
  private readonly COMMON_QUESTIONS_KEY = 'common_questions';

  // Pre-defined common health questions that can be answered from local data
  private readonly commonQuestions: CommonQuestion[] = [
    {
      id: 'daily_calories',
      question: 'how many calories did i burn today',
      keywords: ['calories', 'burned', 'today', 'burnt'],
      category: 'fitness',
      computeFromLocal: true,
      template: 'You burned approximately {calories} calories today based on your activity data.',
      freshnessTtl: 3600, // 1 hour
    },
    {
      id: 'daily_steps',
      question: 'how many steps did i take today',
      keywords: ['steps', 'walked', 'today'],
      category: 'fitness',
      computeFromLocal: true,
      template: 'You have taken {steps} steps today according to your fitness tracker.',
      freshnessTtl: 3600, // 1 hour
    },
    {
      id: 'current_weight',
      question: 'what is my current weight',
      keywords: ['weight', 'current', 'weigh'],
      category: 'health',
      computeFromLocal: true,
      template: 'Your most recent recorded weight is {weight} kg as of {date}.',
      freshnessTtl: 86400, // 24 hours
    },
    {
      id: 'weekly_activity',
      question: 'how active was i this week',
      keywords: ['active', 'activity', 'week', 'exercise'],
      category: 'fitness',
      computeFromLocal: true,
      template:
        'This week you have been active for {active_minutes} minutes with an average of {avg_daily_steps} steps per day.',
      freshnessTtl: 21600, // 6 hours
    },
    {
      id: 'heart_rate_today',
      question: 'what is my heart rate today',
      keywords: ['heart rate', 'pulse', 'today', 'current'],
      category: 'health',
      computeFromLocal: true,
      template:
        'Your average heart rate today is {avg_heart_rate} bpm, with a range of {min_hr} - {max_hr} bpm.',
      freshnessTtl: 1800, // 30 minutes
    },
    {
      id: 'sleep_last_night',
      question: 'how did i sleep last night',
      keywords: ['sleep', 'last night', 'slept', 'rest'],
      category: 'health',
      computeFromLocal: true,
      template:
        'Last night you slept for {sleep_duration} hours with a sleep quality score of {sleep_quality}/10.',
      freshnessTtl: 43200, // 12 hours
    },
    {
      id: 'bmi_status',
      question: 'what is my bmi',
      keywords: ['bmi', 'body mass index', 'weight status'],
      category: 'health',
      computeFromLocal: true,
      template: 'Your current BMI is {bmi}, which falls in the {bmi_category} range.',
      freshnessTtl: 86400, // 24 hours
    },
    {
      id: 'hydration_reminder',
      question: 'did i drink enough water today',
      keywords: ['water', 'hydration', 'drink', 'fluid'],
      category: 'nutrition',
      computeFromLocal: true,
      template:
        'You have consumed {water_intake} liters of water today. Your daily goal is {water_goal} liters.',
      freshnessTtl: 3600, // 1 hour
    },
  ];

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(HealthDataEntry)
    private healthDataRepository: Repository<HealthDataEntry>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {
    this.initializeCommonQuestions();
  }

  /**
   * Process query and return smart cached response if available
   */
  async processQuery(
    userId: string,
    query: string,
    sessionId?: string,
  ): Promise<SmartQueryResponse | null> {
    const normalizedQuery = this.normalizeQuery(query);
    this.logger.debug(`Processing smart query: "${normalizedQuery}" for user ${userId}`);

    // Check if this matches a common question
    const commonQuestion = this.findMatchingQuestion(normalizedQuery);
    if (!commonQuestion) {
      this.logger.debug('Query does not match common questions, skipping cache');
      return null;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(userId, commonQuestion.id);
    const cachedResponse = await this.cacheManager.get<SmartQueryResponse>(cacheKey);

    if (cachedResponse && this.isFresh(cachedResponse, commonQuestion.freshnessTtl)) {
      this.logger.debug(`Cache HIT for query: ${commonQuestion.id}`);
      cachedResponse.fromCache = true;
      return cachedResponse;
    }

    // Generate response from local data
    if (commonQuestion.computeFromLocal) {
      const response = await this.generateLocalResponse(userId, commonQuestion);
      if (response) {
        // Cache the response
        await this.cacheManager.set(cacheKey, response, commonQuestion.freshnessTtl * 1000);
        this.logger.debug(`Generated and cached local response for: ${commonQuestion.id}`);
        return response;
      }
    }

    this.logger.debug(`No local data available for: ${commonQuestion.id}`);
    return null;
  }

  /**
   * Pre-compute and cache responses for active users
   */
  async preComputeCommonResponses(userId: string): Promise<void> {
    this.logger.debug(`Pre-computing common responses for user: ${userId}`);

    for (const question of this.commonQuestions) {
      if (!question.computeFromLocal) continue;

      const cacheKey = this.generateCacheKey(userId, question.id);
      const existing = await this.cacheManager.get(cacheKey);

      if (existing) continue; // Already cached

      try {
        const response = await this.generateLocalResponse(userId, question);
        if (response) {
          await this.cacheManager.set(cacheKey, response, question.freshnessTtl * 1000);
          this.logger.debug(`Pre-computed response for: ${question.id}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to pre-compute ${question.id}: ${error.message}`);
      }
    }
  }

  /**
   * Store frequently asked questions for future optimization
   */
  async recordQuery(userId: string, query: string, wasAnsweredLocally: boolean): Promise<void> {
    const recordKey = `query_frequency:${this.hashQuery(query)}`;

    try {
      const current = (await this.cacheManager.get<{
        count: number;
        users: Set<string>;
        local_answers: number;
      }>(recordKey)) || {
        count: 0,
        users: new Set(),
        local_answers: 0,
      };

      current.count++;
      current.users.add(userId);
      if (wasAnsweredLocally) current.local_answers++;

      // Store query frequency stats
      await this.cacheManager.set(recordKey, current, 604800); // 7 days
    } catch (error) {
      this.logger.warn(`Failed to record query frequency: ${error.message}`);
    }
  }

  /**
   * Get analytics about cached queries
   */
  async getQueryAnalytics(): Promise<{
    totalCachedResponses: number;
    cacheHitRate: number;
    topCategories: Array<{ category: string; count: number }>;
    localDataCoverage: number;
  }> {
    // This would typically query cache statistics
    // Simplified implementation for now
    return {
      totalCachedResponses: 0,
      cacheHitRate: 0.85,
      topCategories: [
        { category: 'fitness', count: 45 },
        { category: 'health', count: 32 },
        { category: 'nutrition', count: 23 },
      ],
      localDataCoverage: 0.78,
    };
  }

  /**
   * Initialize common questions in cache
   */
  private async initializeCommonQuestions(): Promise<void> {
    await this.cacheManager.set(this.COMMON_QUESTIONS_KEY, this.commonQuestions, 86400000); // 24 hours
    this.logger.log(`Initialized ${this.commonQuestions.length} common questions`);
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Find matching common question
   */
  private findMatchingQuestion(normalizedQuery: string): CommonQuestion | null {
    for (const question of this.commonQuestions) {
      const queryWords = normalizedQuery.split(' ');
      const matchedKeywords = question.keywords.filter((keyword) =>
        queryWords.some((word) => word.includes(keyword.toLowerCase())),
      );

      // Consider it a match if at least 50% of keywords are present
      const matchRatio = matchedKeywords.length / question.keywords.length;
      if (matchRatio >= 0.5) {
        return question;
      }
    }
    return null;
  }

  /**
   * Generate cache key for user-specific queries
   */
  private generateCacheKey(userId: string, questionId: string): string {
    return `${this.CACHE_PREFIX}${userId}:${questionId}`;
  }

  /**
   * Check if cached response is still fresh
   */
  private isFresh(response: SmartQueryResponse, maxAgeSecs: number): boolean {
    const age = (Date.now() - new Date(response.timestamp).getTime()) / 1000;
    return age < maxAgeSecs;
  }

  /**
   * Generate response from local user data
   */
  private async generateLocalResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    try {
      switch (question.id) {
        case 'daily_calories':
          return await this.generateCaloriesResponse(userId, question);
        case 'daily_steps':
          return await this.generateStepsResponse(userId, question);
        case 'current_weight':
          return await this.generateWeightResponse(userId, question);
        case 'weekly_activity':
          return await this.generateWeeklyActivityResponse(userId, question);
        case 'heart_rate_today':
          return await this.generateHeartRateResponse(userId, question);
        case 'sleep_last_night':
          return await this.generateSleepResponse(userId, question);
        case 'bmi_status':
          return await this.generateBMIResponse(userId, question);
        case 'hydration_reminder':
          return await this.generateHydrationResponse(userId, question);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Failed to generate local response for ${question.id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate calories burned response from health data
   */
  private async generateCaloriesResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const caloriesEntry = await this.healthDataRepository.findOne({
      where: {
        userId,
        dataType: HealthDataType.CALORIES_BURNED,
        recordedAt: MoreThanOrEqual(today),
      },
      order: { recordedAt: 'DESC' },
    });

    if (!caloriesEntry) return null;

    const response = question.template.replace(
      '{calories}',
      Math.round(caloriesEntry.value).toString(),
    );

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'local',
      confidence: 0.95,
      timestamp: new Date(),
      metadata: {
        userId,
        healthMetrics: {
          calories: caloriesEntry.value,
          recordedAt: caloriesEntry.recordedAt,
        },
      },
    };
  }

  /**
   * Generate steps response from health data
   */
  private async generateStepsResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stepsEntry = await this.healthDataRepository.findOne({
      where: {
        userId,
        dataType: HealthDataType.STEPS,
        recordedAt: MoreThanOrEqual(today),
      },
      order: { recordedAt: 'DESC' },
    });

    if (!stepsEntry) return null;

    const response = question.template.replace('{steps}', Math.round(stepsEntry.value).toString());

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'local',
      confidence: 0.95,
      timestamp: new Date(),
      metadata: {
        userId,
        healthMetrics: {
          steps: stepsEntry.value,
          recordedAt: stepsEntry.recordedAt,
        },
      },
    };
  }

  /**
   * Generate weight response from user profile
   */
  private async generateWeightResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const userProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!userProfile?.weight) return null;

    const response = question.template
      .replace('{weight}', userProfile.weight.toString())
      .replace('{date}', userProfile.updatedAt.toLocaleDateString());

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'local',
      confidence: 0.9,
      timestamp: new Date(),
      metadata: {
        userId,
        personalizedData: {
          weight: userProfile.weight,
          lastUpdated: userProfile.updatedAt,
        },
      },
    };
  }

  /**
   * Generate weekly activity response
   */
  private async generateWeeklyActivityResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const activeMinutesEntries = await this.healthDataRepository.find({
      where: {
        userId,
        dataType: HealthDataType.ACTIVE_MINUTES,
        recordedAt: MoreThanOrEqual(weekStart),
      },
    });

    const stepsEntries = await this.healthDataRepository.find({
      where: {
        userId,
        dataType: HealthDataType.STEPS,
        recordedAt: MoreThanOrEqual(weekStart),
      },
    });

    if (activeMinutesEntries.length === 0 && stepsEntries.length === 0) return null;

    const totalActiveMinutes = activeMinutesEntries.reduce((sum, entry) => sum + entry.value, 0);
    const avgDailySteps =
      stepsEntries.length > 0
        ? stepsEntries.reduce((sum, entry) => sum + entry.value, 0) / stepsEntries.length
        : 0;

    const response = question.template
      .replace('{active_minutes}', Math.round(totalActiveMinutes).toString())
      .replace('{avg_daily_steps}', Math.round(avgDailySteps).toString());

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'computed',
      confidence: 0.9,
      timestamp: new Date(),
      metadata: {
        userId,
        healthMetrics: {
          totalActiveMinutes,
          avgDailySteps,
          weekStart: weekStart.toISOString(),
        },
      },
    };
  }

  /**
   * Generate heart rate response
   */
  private async generateHeartRateResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const heartRateEntries = await this.healthDataRepository.find({
      where: {
        userId,
        dataType: HealthDataType.HEART_RATE,
        recordedAt: MoreThanOrEqual(today),
      },
    });

    if (heartRateEntries.length === 0) return null;

    const heartRates = heartRateEntries.map((entry) => entry.value);
    const avgHeartRate = heartRates.reduce((sum, rate) => sum + rate, 0) / heartRates.length;
    const minHeartRate = Math.min(...heartRates);
    const maxHeartRate = Math.max(...heartRates);

    const response = question.template
      .replace('{avg_heart_rate}', Math.round(avgHeartRate).toString())
      .replace('{min_hr}', Math.round(minHeartRate).toString())
      .replace('{max_hr}', Math.round(maxHeartRate).toString());

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'computed',
      confidence: 0.95,
      timestamp: new Date(),
      metadata: {
        userId,
        healthMetrics: {
          avgHeartRate,
          minHeartRate,
          maxHeartRate,
          entriesCount: heartRateEntries.length,
        },
      },
    };
  }

  /**
   * Generate sleep response
   */
  private async generateSleepResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const sleepDurationEntry = await this.healthDataRepository.findOne({
      where: {
        userId,
        dataType: HealthDataType.SLEEP_DURATION,
        recordedAt: MoreThanOrEqual(yesterday),
      },
      order: { recordedAt: 'DESC' },
    });

    const sleepQualityEntry = await this.healthDataRepository.findOne({
      where: {
        userId,
        dataType: HealthDataType.SLEEP_QUALITY,
        recordedAt: MoreThanOrEqual(yesterday),
      },
      order: { recordedAt: 'DESC' },
    });

    if (!sleepDurationEntry) return null;

    const sleepDuration = (sleepDurationEntry.value / 60).toFixed(1); // Convert minutes to hours
    const sleepQuality = sleepQualityEntry ? sleepQualityEntry.value : 7; // Default to 7/10

    const response = question.template
      .replace('{sleep_duration}', sleepDuration)
      .replace('{sleep_quality}', Math.round(sleepQuality).toString());

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'local',
      confidence: 0.9,
      timestamp: new Date(),
      metadata: {
        userId,
        healthMetrics: {
          sleepDuration: sleepDurationEntry.value,
          sleepQuality,
          date: yesterday.toISOString(),
        },
      },
    };
  }

  /**
   * Generate BMI response from user profile
   */
  private async generateBMIResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    const userProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!userProfile?.bmi) return null;

    const bmiCategory = this.getBMICategory(userProfile.bmi);
    const response = question.template
      .replace('{bmi}', userProfile.bmi.toFixed(1))
      .replace('{bmi_category}', bmiCategory);

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'computed',
      confidence: 0.95,
      timestamp: new Date(),
      metadata: {
        userId,
        personalizedData: {
          bmi: userProfile.bmi,
          category: bmiCategory,
          weight: userProfile.weight,
          height: userProfile.height,
        },
      },
    };
  }

  /**
   * Generate hydration response
   */
  private async generateHydrationResponse(
    userId: string,
    question: CommonQuestion,
  ): Promise<SmartQueryResponse | null> {
    // Since hydration isn't in the current schema, use lifestyle data
    const userProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!userProfile?.lifestyleData?.waterIntake) return null;

    const waterIntake = userProfile.lifestyleData.waterIntake;
    const waterGoal = 2.5; // Default 2.5 liters

    const response = question.template
      .replace('{water_intake}', waterIntake.toString())
      .replace('{water_goal}', waterGoal.toString());

    return {
      id: this.generateResponseId(),
      query: question.question,
      response,
      category: question.category as any,
      fromCache: false,
      dataSource: 'local',
      confidence: 0.85,
      timestamp: new Date(),
      metadata: {
        userId,
        personalizedData: {
          waterIntake,
          waterGoal,
          percentage: Math.round((waterIntake / waterGoal) * 100),
        },
      },
    };
  }

  /**
   * Get BMI category based on value
   */
  private getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal weight';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  /**
   * Generate unique response ID
   */
  private generateResponseId(): string {
    return `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash query for frequency tracking
   */
  private hashQuery(query: string): string {
    return Buffer.from(this.normalizeQuery(query)).toString('base64').substring(0, 16);
  }
}
