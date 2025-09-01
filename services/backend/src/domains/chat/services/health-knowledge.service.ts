import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { User } from '../../users/entities/user.entity';
import { HealthDataEntry } from '../../integrations/health-data/entities/health-data-entry.entity';
import { LogEntry, LogType } from '../../logs/entities/log-entry.entity';
import { MealPlan } from '../../meal-planning/entities/meal-plan.entity';

export interface HealthKnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  variables: string[];
  lastUpdated: Date;
  usageCount: number;
  dynamicAnswer?: (userContext: UserHealthContext) => string;
}

export interface UserHealthContext {
  userId: string;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
  healthConditions?: string[];
  goals?: string[];
  recentStats?: {
    stepCount?: number;
    caloriesBurned?: number;
    sleepHours?: number;
    heartRate?: number;
  };
}

export interface QuickHealthResponse {
  answer: string;
  source: 'cache' | 'calculated' | 'knowledge_base';
  confidence: number;
  cacheUntil?: Date;
  relatedQuestions?: string[];
  userSpecific: boolean;
}

/**
 * Health Knowledge Service
 * Provides quick responses to common health questions using local data and cached knowledge
 * Reduces AI API calls by serving frequently asked questions from local knowledge base
 */
@Injectable()
export class HealthKnowledgeService {
  private readonly logger = new Logger(HealthKnowledgeService.name);

  // In-memory knowledge base for frequently asked questions
  private knowledgeBase: Map<string, HealthKnowledgeEntry> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(HealthDataEntry)
    private readonly healthDataRepository: Repository<HealthDataEntry>,
    @InjectRepository(LogEntry)
    private readonly logRepository: Repository<LogEntry>,
    @InjectRepository(MealPlan)
    private readonly mealPlanRepository: Repository<MealPlan>,
    private readonly configService: ConfigService,
  ) {
    this.initializeKnowledgeBase();
  }

  /**
   * Get quick response to common health questions without API calls
   */
  async getQuickHealthResponse(
    userId: string,
    question: string,
  ): Promise<QuickHealthResponse | null> {
    const normalizedQuestion = this.normalizeQuestion(question);

    // First, check if we can calculate from user's health data
    const calculatedResponse = await this.calculateFromHealthData(userId, normalizedQuestion);
    if (calculatedResponse) {
      return calculatedResponse;
    }

    // Then check if this is a common question we can answer locally
    const knowledgeEntry = this.findMatchingKnowledgeEntry(normalizedQuestion);

    if (knowledgeEntry) {
      // Get user context for personalized response
      const userContext = await this.getUserHealthContext(userId);

      // Generate personalized answer
      const answer = knowledgeEntry.dynamicAnswer
        ? knowledgeEntry.dynamicAnswer(userContext)
        : this.personalizeAnswer(knowledgeEntry.answer, userContext);

      // Update usage count
      knowledgeEntry.usageCount++;

      return {
        answer,
        source: 'knowledge_base',
        confidence: 0.95,
        cacheUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        relatedQuestions: this.getRelatedQuestions(knowledgeEntry.category),
        userSpecific: knowledgeEntry.variables.length > 0,
      };
    }

    return null; // Fall back to AI if no local answer available
  }

  /**
   * Get user's current health metrics without external API calls
   */
  async getUserHealthMetrics(userId: string): Promise<Record<string, any>> {
    const userContext = await this.getUserHealthContext(userId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get today's health data
    const todayHealthData = await this.healthDataRepository.find({
      where: {
        userId,
        recordedAt: Between(startOfDay, new Date()),
      },
      order: { recordedAt: 'DESC' },
    });

    // Get recent logs
    const recentLogs = await this.logRepository.find({
      where: {
        userId,
        createdAt: Between(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()), // Last 7 days
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      profile: {
        age: userContext.age,
        weight: userContext.weight,
        height: userContext.height,
        activityLevel: userContext.activityLevel,
      },
      todayMetrics: this.aggregateHealthData(todayHealthData),
      weeklyTrends: this.analyzeHealthTrends(recentLogs),
      goals: userContext.goals,
      healthConditions: userContext.healthConditions,
    };
  }

  /**
   * Add new knowledge entry to the knowledge base
   */
  async addKnowledgeEntry(
    entry: Omit<HealthKnowledgeEntry, 'id' | 'usageCount' | 'lastUpdated'>,
  ): Promise<void> {
    const knowledgeEntry: HealthKnowledgeEntry = {
      ...entry,
      id: this.generateKnowledgeId(),
      usageCount: 0,
      lastUpdated: new Date(),
    };

    this.knowledgeBase.set(knowledgeEntry.id, knowledgeEntry);
    this.logger.log(`Added knowledge entry: ${entry.question}`);
  }

  /**
   * Get knowledge base statistics
   */
  getKnowledgeBaseStats(): Record<string, any> {
    const entries = Array.from(this.knowledgeBase.values());

    return {
      totalEntries: entries.length,
      totalUsage: entries.reduce((sum, entry) => sum + entry.usageCount, 0),
      topCategories: this.getTopCategories(entries),
      mostUsedQuestions: entries
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10)
        .map((entry) => ({
          question: entry.question,
          usageCount: entry.usageCount,
          category: entry.category,
        })),
    };
  }

  // Private methods

  private async getUserHealthContext(userId: string): Promise<UserHealthContext> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile', 'goals'],
      });

      if (!user) {
        return { userId };
      }

      // Get recent health data for stats
      const recentHealthData = await this.healthDataRepository.find({
        where: {
          userId,
          recordedAt: Between(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()), // Last 24 hours
        },
        order: { recordedAt: 'DESC' },
        take: 20,
      });

      const recentStats = this.aggregateHealthData(recentHealthData);

      return {
        userId,
        age: user.profile?.age,
        weight: user.profile?.weight,
        height: user.profile?.height,
        activityLevel: user.profile?.activityLevel,
        healthConditions: user.profile?.healthConditions || [],
        goals: user.goals ? [user.goals.primaryGoal] : [],
        recentStats,
      };
    } catch (error) {
      this.logger.error(`Error getting user health context for ${userId}:`, error);
      // Return minimal context on error
      return {
        userId,
        recentStats: {},
      };
    }
  }

  private aggregateHealthData(healthData: HealthDataEntry[]): Record<string, number> {
    const stats: Record<string, number> = {};

    healthData.forEach((entry) => {
      switch (entry.dataType) {
        case 'steps':
          stats.stepCount = (stats.stepCount || 0) + entry.value;
          break;
        case 'calories_burned':
          stats.caloriesBurned = (stats.caloriesBurned || 0) + entry.value;
          break;
        case 'heart_rate':
          stats.heartRate = entry.value; // Use latest value
          break;
        case 'sleep_duration':
          stats.sleepHours = entry.value;
          break;
      }
    });

    return stats;
  }

  private analyzeHealthTrends(logs: LogEntry[]): Record<string, any> {
    // Simple trend analysis - in production would be more sophisticated
    const trends: Record<string, any> = {};

    // Group logs by type and analyze
    const logsByType = logs.reduce(
      (acc, log) => {
        if (!acc[log.logType]) acc[log.logType] = [];
        acc[log.logType].push(log);
        return acc;
      },
      {} as Record<string, LogEntry[]>,
    );

    Object.entries(logsByType).forEach(([type, typeLogs]) => {
      if (typeLogs.length >= 3) {
        trends[type] = {
          count: typeLogs.length,
          trend: this.calculateTrend(typeLogs),
        };
      }
    });

    return trends;
  }

  private calculateTrend(logs: LogEntry[]): 'increasing' | 'decreasing' | 'stable' {
    if (logs.length < 3) return 'stable';

    const values = logs
      .filter((log) => log.data?.value !== undefined)
      .map((log) => parseFloat(log.data.value))
      .filter((val) => !isNaN(val));

    if (values.length < 3) return 'stable';

    const firstThird = values.slice(0, Math.floor(values.length / 3));
    const lastThird = values.slice(-Math.floor(values.length / 3));

    const avgFirst = firstThird.reduce((sum, val) => sum + val, 0) / firstThird.length;
    const avgLast = lastThird.reduce((sum, val) => sum + val, 0) / lastThird.length;

    const changePercent = ((avgLast - avgFirst) / avgFirst) * 100;

    if (changePercent > 5) return 'increasing';
    if (changePercent < -5) return 'decreasing';
    return 'stable';
  }

  private async calculateFromHealthData(
    userId: string,
    question: string,
  ): Promise<QuickHealthResponse | null> {
    const userContext = await this.getUserHealthContext(userId);

    // Handle specific calculable questions
    if (question.includes('calories') && question.includes('burned')) {
      const calories = userContext.recentStats?.caloriesBurned || 0;
      return {
        answer: `Based on your recent activity, you've burned ${calories} calories today.`,
        source: 'calculated',
        confidence: 0.9,
        userSpecific: true,
      };
    }

    if (question.includes('steps') && question.includes('today')) {
      const steps = userContext.recentStats?.stepCount || 0;
      return {
        answer: `You've taken ${steps} steps today. ${this.getStepsEncouragement(steps)}`,
        source: 'calculated',
        confidence: 0.95,
        userSpecific: true,
      };
    }

    if (question.includes('weight') && question.includes('goal')) {
      if (
        userContext.goals?.includes('weight_loss') ||
        userContext.goals?.includes('weight_gain')
      ) {
        const progress = await this.calculateWeightProgress(userId);
        return {
          answer: `Your current weight goal progress: ${progress}`,
          source: 'calculated',
          confidence: 0.85,
          userSpecific: true,
        };
      }
    }

    return null;
  }

  private async calculateWeightProgress(userId: string): Promise<string> {
    // Get recent weight logs
    const weightLogs = await this.logRepository.find({
      where: {
        userId,
        logType: LogType.WEIGHT,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (weightLogs.length < 2) {
      return 'Not enough data to calculate progress. Please log your weight regularly.';
    }

    const current = parseFloat(weightLogs[0].data?.value || '0');
    const previous = parseFloat(weightLogs[1].data?.value || '0');
    const change = current - previous;

    if (change > 0) {
      return `You've gained ${change.toFixed(1)} kg since your last weigh-in.`;
    } else if (change < 0) {
      return `You've lost ${Math.abs(change).toFixed(1)} kg since your last weigh-in. Great progress!`;
    } else {
      return 'Your weight has remained stable since your last weigh-in.';
    }
  }

  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findMatchingKnowledgeEntry(question: string): HealthKnowledgeEntry | null {
    for (const entry of this.knowledgeBase.values()) {
      const normalizedKnowledge = this.normalizeQuestion(entry.question);

      // Simple keyword matching - in production would use embeddings
      const questionWords = question.split(' ').filter((word) => word.length > 2);
      const knowledgeWords = normalizedKnowledge.split(' ').filter((word) => word.length > 2);

      // Check for exact phrase matches first
      if (question.includes('steps') && entry.question.includes('steps')) {
        return entry;
      }
      if (
        question.includes('calories') &&
        question.includes('burn') &&
        entry.question.includes('calories') &&
        entry.question.includes('burn')
      ) {
        return entry;
      }
      if (question.includes('bmi') && entry.question.includes('bmi')) {
        return entry;
      }
      if (question.includes('water') && entry.question.includes('water')) {
        return entry;
      }
      if (question.includes('breakfast') && entry.question.includes('breakfast')) {
        return entry;
      }

      // Fallback to keyword matching for less specific matches
      const matchingWords = questionWords.filter((word) =>
        knowledgeWords.some(
          (kw) => kw.includes(word.toLowerCase()) || word.toLowerCase().includes(kw),
        ),
      );

      // Require higher threshold for non-specific questions
      const threshold = question.includes('weather') || question.includes('politics') ? 0.9 : 0.5;
      if (matchingWords.length >= Math.min(3, questionWords.length * threshold)) {
        return entry;
      }
    }

    return null;
  }

  private personalizeAnswer(answer: string, userContext: UserHealthContext): string {
    let personalizedAnswer = answer;

    // Replace variables with user-specific values
    personalizedAnswer = personalizedAnswer.replace(
      '{age}',
      userContext.age?.toString() || 'your age',
    );
    personalizedAnswer = personalizedAnswer.replace(
      '{weight}',
      userContext.weight?.toString() || 'your weight',
    );
    personalizedAnswer = personalizedAnswer.replace(
      '{activityLevel}',
      userContext.activityLevel || 'your activity level',
    );

    return personalizedAnswer;
  }

  private getRelatedQuestions(category: string): string[] {
    const related = Array.from(this.knowledgeBase.values())
      .filter((entry) => entry.category === category)
      .slice(0, 3)
      .map((entry) => entry.question);

    return related;
  }

  private getStepsEncouragement(steps: number): string {
    if (steps >= 10000) return "Excellent! You've exceeded the recommended daily steps.";
    if (steps >= 7500) return "Great job! You're well on your way to your daily goal.";
    if (steps >= 5000) return 'Good start! Try to get a few more steps in today.';
    return 'Every step counts! Consider taking a short walk to boost your daily activity.';
  }

  private getTopCategories(
    entries: HealthKnowledgeEntry[],
  ): Array<{ category: string; count: number }> {
    const categoryCount = entries.reduce(
      (acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateKnowledgeId(): string {
    return `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeKnowledgeBase(): void {
    // Initialize with common health questions
    const commonQuestions: Array<Omit<HealthKnowledgeEntry, 'id' | 'usageCount' | 'lastUpdated'>> =
      [
        {
          question: 'How many calories did I burn today?',
          answer:
            'Based on your recent activity data, you have burned calories today. Keep up the great work!',
          category: 'calories',
          tags: ['calories', 'activity', 'daily'],
          variables: ['caloriesBurned'],
          dynamicAnswer: (context) => {
            const calories = context.recentStats?.caloriesBurned || 0;
            return `You've burned approximately ${calories} calories today based on your activity tracking.`;
          },
        },
        {
          question: 'What is my BMI?',
          answer: 'Your BMI is calculated based on your height and weight.',
          category: 'health_metrics',
          tags: ['bmi', 'weight', 'health'],
          variables: ['weight', 'height'],
          dynamicAnswer: (context) => {
            if (context.weight && context.height) {
              const bmi = (context.weight / Math.pow(context.height / 100, 2)).toFixed(1);
              return `Your BMI is ${bmi}. ${this.getBMICategory(parseFloat(bmi))}`;
            }
            return 'To calculate your BMI, please update your weight and height in your profile.';
          },
        },
        {
          question: 'How many steps did I take today?',
          answer: 'Your step count for today is being tracked.',
          category: 'activity',
          tags: ['steps', 'activity', 'daily'],
          variables: ['stepCount'],
          dynamicAnswer: (context) => {
            const steps = context.recentStats?.stepCount || 0;
            return `You've taken ${steps} steps today. ${this.getStepsEncouragement(steps)}`;
          },
        },
        {
          question: 'What should I eat for breakfast?',
          answer:
            'Based on your dietary preferences and health goals, here are some breakfast recommendations.',
          category: 'nutrition',
          tags: ['breakfast', 'meal', 'nutrition'],
          variables: ['goals', 'healthConditions'],
        },
        {
          question: 'How much water should I drink?',
          answer:
            'Generally, aim for 8-10 glasses (2-3 liters) of water per day, but this can vary based on your activity level and climate.',
          category: 'hydration',
          tags: ['water', 'hydration', 'daily'],
          variables: ['weight', 'activityLevel'],
          dynamicAnswer: (context) => {
            if (context.weight) {
              const waterNeeded = (context.weight * 35).toFixed(0); // 35ml per kg body weight
              return `Based on your weight, you should aim for approximately ${waterNeeded}ml (${(parseInt(waterNeeded) / 250).toFixed(1)} glasses) of water per day.`;
            }
            return 'Generally, aim for 8-10 glasses (2-3 liters) of water per day, but this can vary based on your weight and activity level.';
          },
        },
      ];

    commonQuestions.forEach((question) => {
      this.addKnowledgeEntry(question);
    });

    this.logger.log(`Initialized knowledge base with ${commonQuestions.length} entries`);
  }

  private getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'This is in the underweight category.';
    if (bmi < 25) return 'This is in the normal weight category.';
    if (bmi < 30) return 'This is in the overweight category.';
    return 'This is in the obese category. Consider consulting with a healthcare professional.';
  }
}
