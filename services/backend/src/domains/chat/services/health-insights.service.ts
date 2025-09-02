import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { HealthInsight, InsightCategory, InsightSeverity } from '../entities/health-insights.entity';
import { DietPlan, DietPhase, DietPlanStatus } from '../entities/diet-plan.entity';
import { User } from '../../users/entities/user.entity';
import { HealthReport } from '../../health-reports/entities/health-report.entity';
import { HealthReportsService } from '../../health-reports/services/health-reports.service';
import { HealthInterpretationService } from '../../health-reports/services/health-interpretation.service';

export interface HealthInsightResponse {
  insights: HealthInsight[];
  totalCount: number;
  cacheHit: boolean;
  lastUpdated: Date;
  categories: {
    [key in InsightCategory]?: {
      count: number;
      latestInsight?: HealthInsight;
    };
  };
}

export interface CachedHealthAnalysis {
  userId: string;
  insights: HealthInsight[];
  sourceReportId?: string;
  generatedAt: Date;
  expiresAt: Date;
  aiCost: number;
  cacheVersion: string;
}

export interface DietPlanCreationRequest {
  userId: string;
  targetConditions: string[];
  phase: DietPhase;
  durationDays: number;
  useHealthInsights: boolean;
  customPreferences?: {
    targetCalories?: number;
    dietaryRestrictions?: string[];
    cuisinePreferences?: string[];
  };
}

@Injectable()
export class HealthInsightsService {
  private readonly logger = new Logger(HealthInsightsService.name);
  private readonly CACHE_TTL = 86400; // 24 hours
  private readonly CACHE_PREFIX = 'health_insights_';

  constructor(
    @InjectRepository(HealthInsight)
    private readonly healthInsightsRepository: Repository<HealthInsight>,
    @InjectRepository(DietPlan)
    private readonly dietPlanRepository: Repository<DietPlan>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
    private readonly healthReportsService: HealthReportsService,
    private readonly healthInterpretationService: HealthInterpretationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get cached health insights for a user (Level 1 AI response caching)
   */
  async getHealthInsights(userId: string): Promise<HealthInsightResponse> {
    this.logger.debug(`Getting health insights for user: ${userId}`);

    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    const cachedInsights = await this.cacheManager.get<CachedHealthAnalysis>(cacheKey);

    if (cachedInsights && cachedInsights.expiresAt > new Date()) {
      this.logger.debug(`Returning cached health insights for user: ${userId}`);
      return {
        insights: cachedInsights.insights,
        totalCount: cachedInsights.insights.length,
        cacheHit: true,
        lastUpdated: cachedInsights.generatedAt,
        categories: this.categorizeInsights(cachedInsights.insights),
      };
    }

    // Get from database
    const insights = await this.healthInsightsRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
      relations: ['healthReport'],
    });

    const response = {
      insights,
      totalCount: insights.length,
      cacheHit: false,
      lastUpdated: insights[0]?.updatedAt || new Date(),
      categories: this.categorizeInsights(insights),
    };

    // Cache the result
    if (insights.length > 0) {
      await this.cacheHealthInsights(userId, insights);
    }

    return response;
  }

  /**
   * Store Level 1 AI analysis result for future reuse
   */
  async storeHealthAnalysis(
    userId: string,
    insights: Partial<HealthInsight>[],
    healthReportId?: string,
    aiCost = 0,
  ): Promise<HealthInsight[]> {
    this.logger.debug(`Storing health analysis for user: ${userId}, insights: ${insights.length}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create new insights
    const newInsights: HealthInsight[] = [];
    for (const insightData of insights) {
      const insight = this.healthInsightsRepository.create({
        ...insightData,
        userId,
        healthReportId,
        metadata: {
          ...insightData.metadata,
          aiMetadata: {
            model: insightData.metadata?.aiMetadata?.model || 'level-1-ai',
            confidence: insightData.metadata?.aiMetadata?.confidence || 0.9,
            cost: aiCost / insights.length, // Distribute cost across insights
            generatedAt: new Date().toISOString(),
          },
        },
      });
      newInsights.push(insight);
    }

    // Save insights
    const savedInsights = await this.healthInsightsRepository.save(newInsights);

    // Update cache with new insights
    await this.invalidateAndUpdateCache(userId, savedInsights);

    this.logger.debug(`Stored ${savedInsights.length} health insights for user: ${userId}`);
    return savedInsights;
  }

  /**
   * Update insights when new health report is uploaded
   */
  async updateInsightsFromNewReport(
    userId: string,
    newHealthReport: HealthReport,
    preserveExisting = true,
  ): Promise<HealthInsight[]> {
    this.logger.debug(`Updating insights from new health report for user: ${userId}`);

    // Get existing insights to preserve
    const existingInsights = preserveExisting
      ? await this.healthInsightsRepository.find({
          where: { userId, isActive: true },
        })
      : [];

    // Generate new insights from the health report
    const interpretation = await this.healthReportsService.getInterpretation(newHealthReport.id);
    const newInsights = await this.extractInsightsFromInterpretation(
      userId,
      interpretation,
      newHealthReport.id,
    );

    // Merge with existing insights (preserving old data if new report doesn't have it)
    const mergedInsights = this.mergeInsights(existingInsights, newInsights);

    // Deactivate old insights and save merged ones
    if (existingInsights.length > 0) {
      await this.healthInsightsRepository.update(
        { userId, isActive: true },
        { isActive: false },
      );
    }

    const savedInsights = await this.healthInsightsRepository.save(mergedInsights);

    // Update cache
    await this.invalidateAndUpdateCache(userId, savedInsights);

    this.logger.debug(`Updated ${savedInsights.length} insights from new report for user: ${userId}`);
    return savedInsights;
  }

  /**
   * Create timeline-based diet plan using cached health insights
   */
  async createTimelineDietPlan(request: DietPlanCreationRequest): Promise<DietPlan> {
    this.logger.debug(`Creating timeline diet plan for user: ${request.userId}`);

    let healthContext: HealthInsight[] = [];

    if (request.useHealthInsights) {
      const insights = await this.getHealthInsights(request.userId);
      healthContext = insights.insights;
    }

    // Build diet plan based on health insights
    const planDetails = this.buildDietPlanFromInsights(healthContext, request);
    const timeline = this.calculateDietTimeline(healthContext, request.durationDays);

    const dietPlan = this.dietPlanRepository.create({
      userId: request.userId,
      title: this.generatePlanTitle(request.phase, request.targetConditions),
      description: this.generatePlanDescription(healthContext, request),
      phase: request.phase,
      status: DietPlanStatus.ACTIVE,
      targetConditions: {
        primaryConditions: request.targetConditions,
        secondaryConditions: this.extractSecondaryConditions(healthContext),
        expectedImprovementDays: request.durationDays,
        successCriteria: this.buildSuccessCriteria(healthContext, request.targetConditions),
      },
      planDetails,
      timeline,
      nextTransitionCheck: new Date(Date.now() + request.durationDays * 24 * 60 * 60 * 1000),
    });

    const savedPlan = await this.dietPlanRepository.save(dietPlan);
    this.logger.debug(`Created diet plan ${savedPlan.id} for user: ${request.userId}`);

    return savedPlan;
  }

  /**
   * Get current diet plan with timeline progress
   */
  async getCurrentDietPlan(userId: string): Promise<DietPlan | null> {
    const activePlan = await this.dietPlanRepository.findOne({
      where: { userId, status: DietPlanStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (activePlan) {
      // Update progress tracking
      activePlan.progressTracking = {
        ...activePlan.progressTracking,
        adherenceScore: activePlan.calculateAdherenceScore(),
        mealsLogged: activePlan.progressTracking?.mealsLogged || 0,
        totalPlannedMeals: this.calculateTotalPlannedMeals(activePlan),
        userSatisfaction: activePlan.progressTracking?.userSatisfaction || 0,
      };
    }

    return activePlan;
  }

  /**
   * Handle diet plan phase transition with user choice
   */
  async transitionDietPlan(
    userId: string,
    planId: string,
    userChoice: 'continue' | 'maintain' | 'balanced' | 'recheck',
  ): Promise<DietPlan> {
    this.logger.debug(`Transitioning diet plan ${planId} for user: ${userId}, choice: ${userChoice}`);

    const currentPlan = await this.dietPlanRepository.findOne({
      where: { id: planId, userId },
    });

    if (!currentPlan) {
      throw new Error(`Diet plan not found: ${planId}`);
    }

    let newPhase: DietPhase;
    let durationDays = 30; // Default duration

    switch (userChoice) {
      case 'continue':
        newPhase = currentPlan.phase; // Same phase
        durationDays = currentPlan.targetConditions.expectedImprovementDays;
        break;
      case 'maintain':
        newPhase = DietPhase.MAINTENANCE;
        durationDays = 60; // Longer maintenance period
        break;
      case 'balanced':
        newPhase = DietPhase.BALANCED;
        durationDays = 90; // Long-term balanced approach
        break;
      case 'recheck':
        // Mark for recheck and create temporary balanced plan
        newPhase = DietPhase.BALANCED;
        durationDays = 14; // Short term until recheck
        break;
      default:
        newPhase = currentPlan.getRecommendedNextPhase();
    }

    // Mark current plan as transitioned
    currentPlan.status = DietPlanStatus.TRANSITIONED;
    await this.dietPlanRepository.save(currentPlan);

    // Create new plan for next phase
    const newPlan = await this.createTimelineDietPlan({
      userId,
      targetConditions: userChoice === 'balanced' ? [] : currentPlan.targetConditions.primaryConditions,
      phase: newPhase,
      durationDays,
      useHealthInsights: userChoice !== 'balanced',
    });

    this.logger.debug(`Successfully transitioned to plan ${newPlan.id} for user: ${userId}`);
    return newPlan;
  }

  /**
   * Get cache performance statistics
   */
  async getCacheStats(userId: string): Promise<any> {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    const cachedInsights = await this.cacheManager.get<CachedHealthAnalysis>(cacheKey);
    
    if (!cachedInsights) {
      return { cacheHit: false, totalInsights: 0, costSavings: 0 };
    }

    const totalInsights = cachedInsights.insights.length;
    const costSavings = cachedInsights.aiCost; // Cost saved by not re-analyzing

    return {
      cacheHit: true,
      totalInsights,
      costSavings,
      cacheAge: Date.now() - cachedInsights.generatedAt.getTime(),
      expiresIn: cachedInsights.expiresAt.getTime() - Date.now(),
    };
  }

  // Private helper methods

  private categorizeInsights(insights: HealthInsight[]): any {
    const categories = {};
    
    for (const category of Object.values(InsightCategory)) {
      const categoryInsights = insights.filter(i => i.category === category);
      if (categoryInsights.length > 0) {
        categories[category] = {
          count: categoryInsights.length,
          latestInsight: categoryInsights[0], // Already sorted by createdAt DESC
        };
      }
    }

    return categories;
  }

  private async cacheHealthInsights(userId: string, insights: HealthInsight[]): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    const cacheData: CachedHealthAnalysis = {
      userId,
      insights,
      sourceReportId: insights[0]?.healthReportId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL * 1000),
      aiCost: insights.reduce((sum, i) => sum + (i.metadata?.aiMetadata?.cost || 0), 0),
      cacheVersion: '1.0',
    };

    await this.cacheManager.set(cacheKey, cacheData, this.CACHE_TTL);
  }

  private async invalidateAndUpdateCache(userId: string, insights: HealthInsight[]): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${userId}`;
    await this.cacheManager.del(cacheKey);
    await this.cacheHealthInsights(userId, insights);
  }

  private async extractInsightsFromInterpretation(
    userId: string,
    interpretation: any,
    healthReportId: string,
  ): Promise<Partial<HealthInsight>[]> {
    const insights: Partial<HealthInsight>[] = [];

    // Extract micronutrient deficiencies
    if (interpretation?.nutritionalDeficiencies) {
      for (const deficiency of interpretation.nutritionalDeficiencies) {
        insights.push({
          category: InsightCategory.MICRONUTRIENT_DEFICIENCY,
          title: `${deficiency.nutrient} Deficiency`,
          insight: `Your ${deficiency.nutrient} levels are ${deficiency.severity.toLowerCase()} (${deficiency.currentValue} ${deficiency.unit})`,
          recommendation: deficiency.recommendation,
          severity: this.mapSeverity(deficiency.severity),
          metadata: {
            deficiencyInfo: {
              nutrient: deficiency.nutrient,
              currentValue: deficiency.currentValue,
              normalRange: deficiency.normalRange,
              severity: deficiency.severity.toLowerCase(),
            },
            timeline: this.calculateNutrientTimeline(deficiency),
          },
        });
      }
    }

    // Extract biomarker insights
    if (interpretation?.biomarkerAnalysis) {
      for (const biomarker of interpretation.biomarkerAnalysis) {
        insights.push({
          category: InsightCategory.BIOMARKER_ANALYSIS,
          title: `${biomarker.name} Analysis`,
          insight: biomarker.interpretation,
          recommendation: biomarker.recommendation,
          severity: this.mapSeverity(biomarker.status),
          metadata: {
            biomarkerValues: { [biomarker.name]: biomarker.value },
          },
        });
      }
    }

    // Extract health conditions
    if (interpretation?.healthConditions) {
      for (const condition of interpretation.healthConditions) {
        insights.push({
          category: InsightCategory.HEALTH_CONDITION,
          title: condition.condition,
          insight: condition.description,
          recommendation: condition.managementAdvice,
          severity: this.mapSeverity(condition.severity),
          metadata: {
            conditionInfo: {
              condition: condition.condition,
              indicators: condition.indicators,
              riskLevel: condition.riskLevel,
            },
          },
        });
      }
    }

    // Extract dietary recommendations
    if (interpretation?.dietaryRecommendations) {
      insights.push({
        category: InsightCategory.DIETARY_RECOMMENDATION,
        title: 'Dietary Recommendations',
        insight: interpretation.dietaryRecommendations.join(', '),
        recommendation: 'Follow the recommended dietary modifications for optimal health',
        severity: InsightSeverity.MEDIUM,
      });
    }

    return insights;
  }

  private mergeInsights(existing: HealthInsight[], newInsights: Partial<HealthInsight>[]): Partial<HealthInsight>[] {
    const merged = [...newInsights];

    // Add existing insights that don't conflict with new ones
    for (const existingInsight of existing) {
      const hasConflict = newInsights.some(
        (newInsight) =>
          newInsight.category === existingInsight.category &&
          newInsight.title === existingInsight.title,
      );

      if (!hasConflict) {
        merged.push({
          ...existingInsight,
          isManuallyUpdated: true, // Preserve old data
        });
      }
    }

    return merged;
  }

  private buildDietPlanFromInsights(insights: HealthInsight[], request: DietPlanCreationRequest): any {
    const deficiencies = insights.filter(i => i.category === InsightCategory.MICRONUTRIENT_DEFICIENCY);
    const conditions = insights.filter(i => i.category === InsightCategory.HEALTH_CONDITION);
    
    const dietaryFocus = [];
    const keyNutrients = [];
    const recommendedFoods = [];
    const foodsToAvoid = [];

    // Build diet plan based on deficiencies
    for (const deficiency of deficiencies) {
      const nutrient = deficiency.metadata?.deficiencyInfo?.nutrient?.toLowerCase();
      
      switch (nutrient) {
        case 'iron':
          dietaryFocus.push('high_iron');
          keyNutrients.push({ nutrient: 'Iron', targetAmount: 18, unit: 'mg', priority: 'high' });
          recommendedFoods.push('spinach', 'lentils', 'lean_meat', 'fortified_cereals');
          break;
        case 'vitamin_d':
          dietaryFocus.push('high_vitamin_d');
          keyNutrients.push({ nutrient: 'Vitamin D', targetAmount: 600, unit: 'IU', priority: 'high' });
          recommendedFoods.push('fatty_fish', 'fortified_milk', 'mushrooms', 'egg_yolks');
          break;
        case 'vitamin_b12':
          dietaryFocus.push('high_b12');
          keyNutrients.push({ nutrient: 'Vitamin B12', targetAmount: 2.4, unit: 'mcg', priority: 'high' });
          recommendedFoods.push('fish', 'meat', 'dairy', 'fortified_cereals');
          break;
      }
    }

    // Add condition-specific modifications
    for (const condition of conditions) {
      const conditionName = condition.metadata?.conditionInfo?.condition?.toLowerCase();
      
      switch (conditionName) {
        case 'diabetes':
        case 'high_blood_sugar':
          dietaryFocus.push('low_glycemic_index');
          foodsToAvoid.push('refined_sugars', 'white_bread', 'processed_foods');
          break;
        case 'high_cholesterol':
          dietaryFocus.push('heart_healthy');
          foodsToAvoid.push('saturated_fats', 'trans_fats');
          recommendedFoods.push('oats', 'nuts', 'olive_oil');
          break;
        case 'hypertension':
          dietaryFocus.push('low_sodium');
          foodsToAvoid.push('processed_foods', 'canned_foods', 'high_sodium_snacks');
          break;
      }
    }

    return {
      mealsPerDay: 3,
      snacksPerDay: 2,
      targetCalories: request.customPreferences?.targetCalories || 2000,
      macroTargets: {
        proteinPercent: 20,
        carbPercent: 50,
        fatPercent: 30,
      },
      dietaryFocus,
      keyNutrients,
      recommendedFoods,
      foodsToAvoid,
    };
  }

  private calculateDietTimeline(insights: HealthInsight[], durationDays: number): any {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const milestones = [];
    
    // Add milestones based on expected improvement timelines
    const quarterDays = Math.floor(durationDays / 4);
    
    milestones.push({
      day: quarterDays,
      title: 'First Quarter Check',
      description: 'Initial improvements in energy and well-being expected',
      expectedOutcome: 'Improved energy levels and better sleep quality',
      completed: false,
    });

    milestones.push({
      day: quarterDays * 2,
      title: 'Mid-Point Assessment',
      description: 'Biomarker improvements should start showing',
      expectedOutcome: 'Measurable improvements in targeted nutrients',
      completed: false,
    });

    milestones.push({
      day: quarterDays * 3,
      title: 'Third Quarter Review',
      description: 'Major improvements expected',
      expectedOutcome: 'Significant progress towards target ranges',
      completed: false,
    });

    milestones.push({
      day: durationDays,
      title: 'Plan Completion',
      description: 'Full improvement cycle completed',
      expectedOutcome: 'Target improvements achieved, ready for next phase',
      completed: false,
    });

    return {
      startDate: startDate.toISOString(),
      expectedEndDate: endDate.toISOString(),
      totalDurationDays: durationDays,
      milestones,
    };
  }

  private generatePlanTitle(phase: DietPhase, conditions: string[]): string {
    const conditionStr = conditions.length > 0 ? conditions.join(' & ') : 'General Health';
    return `${phase.charAt(0).toUpperCase()}${phase.slice(1)} Plan for ${conditionStr}`;
  }

  private generatePlanDescription(insights: HealthInsight[], request: DietPlanCreationRequest): string {
    const primaryIssues = insights
      .filter(i => i.severity === InsightSeverity.HIGH || i.severity === InsightSeverity.URGENT)
      .map(i => i.title)
      .slice(0, 3);

    if (primaryIssues.length === 0) {
      return `A ${request.durationDays}-day ${request.phase} diet plan designed for optimal health and wellness.`;
    }

    return `A ${request.durationDays}-day ${request.phase} diet plan specifically designed to address: ${primaryIssues.join(', ')}. This plan uses your health insights to provide targeted nutrition recommendations.`;
  }

  private extractSecondaryConditions(insights: HealthInsight[]): string[] {
    return insights
      .filter(i => i.severity === InsightSeverity.MEDIUM)
      .map(i => i.title)
      .slice(0, 3);
  }

  private buildSuccessCriteria(insights: HealthInsight[], primaryConditions: string[]): any[] {
    const criteria = [];

    for (const condition of primaryConditions) {
      const matchingInsight = insights.find(i => 
        i.title.toLowerCase().includes(condition.toLowerCase()) ||
        i.metadata?.deficiencyInfo?.nutrient?.toLowerCase().includes(condition.toLowerCase())
      );

      if (matchingInsight?.metadata?.deficiencyInfo) {
        const deficiency = matchingInsight.metadata.deficiencyInfo;
        criteria.push({
          condition,
          targetRange: deficiency.normalRange,
          description: `Improve ${deficiency.nutrient} levels to normal range`,
        });
      } else {
        criteria.push({
          condition,
          description: `Show measurable improvement in ${condition}`,
        });
      }
    }

    return criteria;
  }

  private calculateTotalPlannedMeals(dietPlan: DietPlan): number {
    const daysPassed = Math.floor((Date.now() - dietPlan.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const mealsPerDay = dietPlan.planDetails.mealsPerDay + dietPlan.planDetails.snacksPerDay;
    return Math.max(1, daysPassed * mealsPerDay);
  }

  private mapSeverity(severity: string): InsightSeverity {
    switch (severity?.toLowerCase()) {
      case 'urgent':
        return InsightSeverity.URGENT;
      case 'high':
      case 'severe':
        return InsightSeverity.HIGH;
      case 'moderate':
      case 'medium':
        return InsightSeverity.MEDIUM;
      default:
        return InsightSeverity.LOW;
    }
  }

  private calculateNutrientTimeline(deficiency: any): any {
    const nutrient = deficiency.nutrient.toLowerCase();
    
    // Default timelines for different nutrients
    const timelines = {
      'iron': 60, // 8-12 weeks for iron stores to normalize
      'vitamin_d': 45, // 6-8 weeks for vitamin D levels to improve
      'vitamin_b12': 30, // 4-6 weeks for B12 levels to improve
      'folate': 21, // 3-4 weeks for folate levels to improve
      'default': 30,
    };

    const expectedDays = timelines[nutrient] || timelines['default'];

    return {
      expectedImprovementDays: expectedDays,
      milestones: [
        { day: Math.floor(expectedDays / 3), description: 'Initial improvements in symptoms' },
        { day: Math.floor(expectedDays / 2), description: 'Measurable improvements in blood levels' },
        { day: expectedDays, description: 'Target levels should be achieved' },
      ],
    };
  }
}