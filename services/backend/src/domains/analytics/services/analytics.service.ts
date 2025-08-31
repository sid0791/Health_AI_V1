import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { MealLog } from '../../logs/entities/meal-log.entity';
import { MealPlan } from '../../meal-planning/entities/meal-plan.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(MealLog)
    private mealLogRepository: Repository<MealLog>,
    @InjectRepository(MealPlan)
    private mealPlanRepository: Repository<MealPlan>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getDashboardAnalytics(userId: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get today's nutrition
    const todayNutrition = await this.getTodayNutritionSummary(userId);

    // Get this week's progress
    const weekProgress = await this.getWeekProgress(userId);

    // Get active meal plan
    const activePlan = await this.mealPlanRepository.findOne({
      where: { userId, isActive: true },
      relations: ['entries'],
    });

    // Get recent activity
    const recentLogs = await this.mealLogRepository.find({
      where: { userId, loggedAt: Between(weekAgo, new Date()) },
      order: { loggedAt: 'DESC' },
      take: 5,
    });

    return {
      todayNutrition,
      weekProgress,
      activePlan: activePlan
        ? {
            id: activePlan.id,
            name: activePlan.name,
            daysRemaining: activePlan.getDaysRemaining(),
            adherenceScore: activePlan.adherenceScore,
            progressPercentage: activePlan.getProgressPercentage(),
          }
        : null,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        foodName: log.foodName,
        mealType: log.mealType,
        calories: log.caloriesConsumed,
        loggedAt: log.loggedAt,
      })),
      insights: await this.generateInsights(userId),
    };
  }

  async getWeightTrend(userId: string, days: number): Promise<any> {
    // Mock weight data - in production this would come from a weight logs table
    const mockWeightData = [];
    const baseWeight = 70; // kg

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Generate some realistic weight variation
      const variation = Math.sin(i * 0.1) * 0.5 + Math.random() * 0.3 - 0.15;
      const weight = baseWeight + variation - i * 0.02; // Slight downward trend

      mockWeightData.push({
        date: date.toISOString().split('T')[0],
        weight: Math.round(weight * 10) / 10,
      });
    }

    const weightChange =
      mockWeightData.length > 1
        ? mockWeightData[mockWeightData.length - 1].weight - mockWeightData[0].weight
        : 0;

    return {
      data: mockWeightData,
      trend: {
        change: Math.round(weightChange * 10) / 10,
        direction: weightChange > 0 ? 'increase' : weightChange < 0 ? 'decrease' : 'stable',
        averageWeeklyChange: Math.round((weightChange / (days / 7)) * 10) / 10,
      },
      goals: {
        targetWeight: 68,
        goalType: 'weight_loss',
        estimatedETA: this.calculateWeightETA(
          mockWeightData[mockWeightData.length - 1].weight,
          68,
          weightChange,
        ),
      },
    };
  }

  async getMacroBreakdown(userId: string, startDate?: string, endDate?: string): Promise<any> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const logs = await this.mealLogRepository.find({
      where: {
        userId,
        loggedAt: Between(start, end),
      },
    });

    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (Number(log.caloriesConsumed) || 0),
        protein: acc.protein + (Number(log.proteinGrams) || 0),
        carbs: acc.carbs + (Number(log.carbsGrams) || 0),
        fat: acc.fat + (Number(log.fatGrams) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const totalCalories = totals.calories;
    const macroPercentages =
      totalCalories > 0
        ? {
            protein: Math.round(((totals.protein * 4) / totalCalories) * 100),
            carbs: Math.round(((totals.carbs * 4) / totalCalories) * 100),
            fat: Math.round(((totals.fat * 9) / totalCalories) * 100),
          }
        : { protein: 0, carbs: 0, fat: 0 };

    // Daily breakdown
    const dailyData = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayLogs = logs.filter((log) => log.loggedAt >= dayStart && log.loggedAt <= dayEnd);

      const dayTotals = dayLogs.reduce(
        (acc, log) => ({
          calories: acc.calories + (Number(log.caloriesConsumed) || 0),
          protein: acc.protein + (Number(log.proteinGrams) || 0),
          carbs: acc.carbs + (Number(log.carbsGrams) || 0),
          fat: acc.fat + (Number(log.fatGrams) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      dailyData.push({
        date: currentDate.toISOString().split('T')[0],
        ...dayTotals,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      totals,
      averageDaily: {
        calories: Math.round(totals.calories / dailyData.length),
        protein: Math.round(totals.protein / dailyData.length),
        carbs: Math.round(totals.carbs / dailyData.length),
        fat: Math.round(totals.fat / dailyData.length),
      },
      macroPercentages,
      dailyBreakdown: dailyData,
      recommendations: this.generateMacroRecommendations(macroPercentages),
    };
  }

  async getMicronutrientAnalysis(userId: string, days: number): Promise<any> {
    // Mock micronutrient data - in production this would be calculated from detailed food data
    const mockDeficiencies = [
      {
        nutrient: 'Vitamin D',
        currentIntake: 15,
        recommendedIntake: 20,
        unit: 'mcg',
        deficiency: 25,
      },
      { nutrient: 'Iron', currentIntake: 12, recommendedIntake: 15, unit: 'mg', deficiency: 20 },
      {
        nutrient: 'Calcium',
        currentIntake: 800,
        recommendedIntake: 1000,
        unit: 'mg',
        deficiency: 20,
      },
      {
        nutrient: 'Vitamin B12',
        currentIntake: 2.0,
        recommendedIntake: 2.4,
        unit: 'mcg',
        deficiency: 17,
      },
      {
        nutrient: 'Folate',
        currentIntake: 350,
        recommendedIntake: 400,
        unit: 'mcg',
        deficiency: 12,
      },
    ];

    return {
      period: `Last ${days} days`,
      deficiencies: mockDeficiencies.map((def) => ({
        ...def,
        status: def.deficiency > 20 ? 'low' : def.deficiency > 10 ? 'borderline' : 'adequate',
        improvementSuggestions: this.getMicronutrientSuggestions(def.nutrient),
      })),
      overallScore: Math.round(
        100 -
          mockDeficiencies.reduce((sum, def) => sum + def.deficiency, 0) / mockDeficiencies.length,
      ),
      recommendations: [
        'Consider adding more leafy greens for iron and folate',
        'Include dairy or fortified alternatives for calcium',
        'Get some sunlight or consider vitamin D supplement',
        'Include more fish or B12-fortified foods',
      ],
    };
  }

  async getGoalProgress(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const activePlan = await this.mealPlanRepository.findOne({
      where: { userId, isActive: true },
    });

    // Mock goal data - in production this would come from user preferences/goals
    const goals = [
      {
        type: 'weight_loss',
        target: 68,
        current: 70,
        unit: 'kg',
        startValue: 75,
        targetDate: '2024-03-01',
        progress: 67, // (75-70)/(75-68) * 100
      },
      {
        type: 'daily_calories',
        target: 2000,
        current: 1850,
        unit: 'calories',
        progress: 93,
      },
      {
        type: 'weekly_workouts',
        target: 4,
        current: 3,
        unit: 'sessions',
        progress: 75,
      },
    ];

    return {
      goals: goals.map((goal) => ({
        ...goal,
        eta: this.calculateGoalETA(goal),
        status:
          goal.progress >= 100 ? 'achieved' : goal.progress >= 75 ? 'on_track' : 'needs_attention',
      })),
      overallProgress: Math.round(
        goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length,
      ),
      activePlan: activePlan
        ? {
            name: activePlan.name,
            adherence: activePlan.adherenceScore,
            daysRemaining: activePlan.getDaysRemaining(),
          }
        : null,
    };
  }

  async getActivitySummary(userId: string, days: number): Promise<any> {
    // Mock activity data - in production this would come from fitness tracking
    const activities = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      activities.push({
        date: date.toISOString().split('T')[0],
        steps: Math.floor(Math.random() * 3000) + 7000,
        caloriesBurned: Math.floor(Math.random() * 200) + 400,
        activeMinutes: Math.floor(Math.random() * 30) + 30,
        workouts: Math.random() > 0.7 ? 1 : 0,
      });
    }

    const totals = activities.reduce(
      (acc, day) => ({
        steps: acc.steps + day.steps,
        caloriesBurned: acc.caloriesBurned + day.caloriesBurned,
        activeMinutes: acc.activeMinutes + day.activeMinutes,
        workouts: acc.workouts + day.workouts,
      }),
      { steps: 0, caloriesBurned: 0, activeMinutes: 0, workouts: 0 },
    );

    return {
      period: `Last ${days} days`,
      totals,
      averages: {
        dailySteps: Math.round(totals.steps / days),
        dailyCalories: Math.round(totals.caloriesBurned / days),
        dailyActiveMinutes: Math.round(totals.activeMinutes / days),
        weeklyWorkouts: Math.round((totals.workouts / days) * 7),
      },
      dailyData: activities,
      goals: {
        dailySteps: 10000,
        weeklyWorkouts: 4,
        weeklyActiveMinutes: 150,
      },
    };
  }

  async getAdherenceScore(userId: string, days: number): Promise<any> {
    const activePlan = await this.mealPlanRepository.findOne({
      where: { userId, isActive: true },
      relations: ['entries'],
    });

    if (!activePlan) {
      return {
        score: 0,
        message: 'No active meal plan',
        breakdown: {},
      };
    }

    // Calculate adherence based on logged vs planned meals
    const plannedMeals = activePlan.entries.length;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const loggedMeals = await this.mealLogRepository.count({
      where: {
        userId,
        loggedAt: Between(startDate, endDate),
      },
    });

    const adherenceScore = plannedMeals > 0 ? Math.round((loggedMeals / plannedMeals) * 100) : 0;

    return {
      score: Math.min(adherenceScore, 100),
      period: `Last ${days} days`,
      breakdown: {
        plannedMeals,
        loggedMeals,
        missedMeals: Math.max(plannedMeals - loggedMeals, 0),
      },
      trend: this.calculateAdherenceTrend(userId, days),
      recommendations: this.generateAdherenceRecommendations(adherenceScore),
    };
  }

  private async getTodayNutritionSummary(userId: string): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayLogs = await this.mealLogRepository.find({
      where: {
        userId,
        loggedAt: Between(startOfDay, endOfDay),
      },
    });

    const totals = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (Number(log.caloriesConsumed) || 0),
        protein: acc.protein + (Number(log.proteinGrams) || 0),
        carbs: acc.carbs + (Number(log.carbsGrams) || 0),
        fat: acc.fat + (Number(log.fatGrams) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      ...totals,
      mealsLogged: todayLogs.length,
      targets: { calories: 2000, protein: 120, carbs: 200, fat: 67 },
    };
  }

  private async getWeekProgress(userId: string): Promise<any> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weekLogs = await this.mealLogRepository.find({
      where: {
        userId,
        loggedAt: Between(weekAgo, new Date()),
      },
    });

    return {
      totalMealsLogged: weekLogs.length,
      averageDailyCalories:
        weekLogs.length > 0
          ? Math.round(
              weekLogs.reduce((sum, log) => sum + (Number(log.caloriesConsumed) || 0), 0) / 7,
            )
          : 0,
    };
  }

  private generateInsights(userId: string): string[] {
    return [
      "You're maintaining consistent meal logging!",
      'Consider adding more vegetables to increase fiber intake',
      'Your protein intake is on track for your goals',
    ];
  }

  private calculateWeightETA(
    currentWeight: number,
    targetWeight: number,
    weeklyChange: number,
  ): string {
    if (weeklyChange === 0) return 'Unable to estimate';

    const remainingWeight = Math.abs(currentWeight - targetWeight);
    const weeksToGoal = Math.ceil(remainingWeight / Math.abs(weeklyChange));

    return `${weeksToGoal} weeks`;
  }

  private generateMacroRecommendations(percentages: any): string[] {
    const recommendations = [];

    if (percentages.protein < 20) {
      recommendations.push('Consider increasing protein intake with lean meats, legumes, or dairy');
    }
    if (percentages.carbs > 60) {
      recommendations.push('Try reducing refined carbs and focus on complex carbohydrates');
    }
    if (percentages.fat > 35) {
      recommendations.push('Consider reducing fat intake and focus on healthy fats');
    }

    return recommendations;
  }

  private getMicronutrientSuggestions(nutrient: string): string[] {
    const suggestions: Record<string, string[]> = {
      'Vitamin D': [
        'Get 15-20 minutes of sunlight daily',
        'Include fatty fish like salmon',
        'Consider fortified foods',
      ],
      Iron: ['Add spinach and leafy greens', 'Include lean meats', 'Pair with vitamin C foods'],
      Calcium: ['Include dairy products', 'Try fortified plant milks', 'Add sesame seeds'],
      'Vitamin B12': [
        'Include fish and meat',
        'Try fortified cereals',
        'Consider supplements if vegetarian',
      ],
      Folate: ['Add more leafy greens', 'Include legumes and beans', 'Try fortified grains'],
    };

    return suggestions[nutrient] || ['Consult with a nutritionist for specific recommendations'];
  }

  private calculateGoalETA(goal: any): string {
    if (goal.progress >= 100) return 'Achieved';

    // Simple estimation based on current progress rate
    return '2-3 weeks';
  }

  private calculateAdherenceTrend(userId: string, days: number): string {
    // Mock trend calculation
    return 'improving';
  }

  private generateAdherenceRecommendations(score: number): string[] {
    if (score >= 80) {
      return ['Great job! Keep up the consistent logging'];
    } else if (score >= 60) {
      return ['Try setting meal reminders', 'Log meals immediately after eating'];
    } else {
      return [
        'Start with logging one meal per day',
        'Use quick-add foods to save time',
        'Set daily logging goals',
      ];
    }
  }
}
