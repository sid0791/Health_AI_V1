import { Injectable, Logger } from '@nestjs/common';
import { HealthAnalysisCacheService, HealthInsight } from './health-analysis-cache.service';

export interface DietPlan {
  id: string;
  userId: string;
  planName: string;
  phase: 'correction' | 'maintenance' | 'optimization';
  timeline: {
    startDate: Date;
    estimatedEndDate: Date;
    currentDay: number;
    totalDays: number;
  };
  targetConditions: Array<{
    condition: string;
    targetImprovement: string;
    estimatedResolutionDays: number;
  }>;
  nutritionalFocus: {
    emphasizeNutrients: string[];
    avoidFoods: string[];
    recommendedFoods: string[];
  };
  meals: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks: string[];
  };
  progressTracking: {
    milestones: Array<{
      day: number;
      description: string;
      completed: boolean;
    }>;
    nextMilestone: {
      day: number;
      description: string;
    };
  };
  transitionPlan?: {
    triggerConditions: string[];
    nextPhase: 'maintenance' | 'optimization';
    scheduledDate: Date;
    notificationSent: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DietPlanRequest {
  userId: string;
  preferences?: {
    dietaryRestrictions: string[];
    cuisinePreferences: string[];
    mealComplexity: 'simple' | 'moderate' | 'complex';
  };
  forceRefresh?: boolean;
}

@Injectable()
export class TimelineDietPlanningService {
  private readonly logger = new Logger(TimelineDietPlanningService.name);
  
  // In-memory storage for now (in production, use database)
  private dietPlans: Map<string, DietPlan> = new Map();

  constructor(
    private readonly healthAnalysisCacheService: HealthAnalysisCacheService,
  ) {
    this.logger.log('TimelineDietPlanningService initialized');
  }

  /**
   * Generate a personalized diet plan based on cached health analysis
   */
  async generateDietPlan(request: DietPlanRequest): Promise<DietPlan> {
    this.logger.log(`Generating diet plan for user ${request.userId}`);

    // Get comprehensive health insights from cache
    const healthInsights = await this.healthAnalysisCacheService.getHealthInsights(request.userId);

    if (!healthInsights || Object.keys(healthInsights).length === 0) {
      throw new Error('No health analysis available. Please upload health reports first.');
    }

    // Check if user already has an active diet plan
    const existingPlan = await this.getActiveDietPlan(request.userId);
    if (existingPlan && !request.forceRefresh) {
      // Update existing plan with current progress
      return await this.updateDietPlanProgress(existingPlan);
    }

    // Create new diet plan based on health insights
    const dietPlan = await this.createDietPlanFromInsights(request, healthInsights);
    
    // Store the plan
    this.dietPlans.set(dietPlan.id, dietPlan);
    
    this.logger.log(`Created diet plan ${dietPlan.id} for user ${request.userId}`);
    
    return dietPlan;
  }

  /**
   * Get current diet plan for user
   */
  async getDietPlan(userId: string): Promise<DietPlan | null> {
    const plan = await this.getActiveDietPlan(userId);
    
    if (!plan) {
      return null;
    }

    // Update progress and check for phase transitions
    return await this.updateDietPlanProgress(plan);
  }

  /**
   * Check if diet plan needs to transition to next phase
   */
  async checkPhaseTransition(userId: string): Promise<{
    shouldTransition: boolean;
    currentPhase: string;
    nextPhase?: string;
    message?: string;
  }> {
    const plan = await this.getActiveDietPlan(userId);
    
    if (!plan) {
      return { shouldTransition: false, currentPhase: 'none' };
    }

    const currentDay = this.calculateCurrentDay(plan.timeline.startDate);
    
    // Check if we've reached the estimated end date
    const shouldTransition = currentDay >= plan.timeline.totalDays;
    
    if (shouldTransition && plan.phase === 'correction') {
      return {
        shouldTransition: true,
        currentPhase: plan.phase,
        nextPhase: 'maintenance',
        message: `Great progress! Your ${plan.targetConditions[0]?.condition} improvement plan is complete. Ready to switch to a balanced maintenance diet?`,
      };
    }

    if (shouldTransition && plan.phase === 'maintenance') {
      return {
        shouldTransition: true,
        currentPhase: plan.phase,
        nextPhase: 'optimization',
        message: 'Your maintenance phase is complete. Consider optimizing your diet for peak wellness, or continue with balanced nutrition.',
      };
    }

    return { shouldTransition: false, currentPhase: plan.phase };
  }

  /**
   * Transition to next phase of diet plan
   */
  async transitionToNextPhase(
    userId: string,
    userChoice: 'continue' | 'maintain' | 'recheck',
  ): Promise<DietPlan> {
    const existingPlan = await this.getActiveDietPlan(userId);
    
    if (!existingPlan) {
      throw new Error('No active diet plan found');
    }

    if (userChoice === 'recheck') {
      // Recommend health report recheck
      return await this.createRecheckRecommendation(existingPlan);
    }

    if (userChoice === 'maintain') {
      // Keep current approach but extend timeline
      return await this.extendCurrentPhase(existingPlan);
    }

    // Transition to next phase
    const nextPhase = existingPlan.phase === 'correction' ? 'maintenance' : 'optimization';
    const newPlan = await this.createNextPhasePlan(existingPlan, nextPhase);
    
    // Archive old plan and store new one
    existingPlan.transitionPlan!.notificationSent = true;
    this.dietPlans.set(existingPlan.id, existingPlan);
    this.dietPlans.set(newPlan.id, newPlan);
    
    this.logger.log(`Transitioned user ${userId} from ${existingPlan.phase} to ${nextPhase} phase`);
    
    return newPlan;
  }

  /**
   * Update diet plan when new health report is uploaded
   */
  async updatePlanForNewHealthData(userId: string): Promise<DietPlan | null> {
    this.logger.log(`Updating diet plan for new health data - user ${userId}`);
    
    // Get updated health insights
    const newHealthInsights = await this.healthAnalysisCacheService.getHealthInsights(userId);
    
    const existingPlan = await this.getActiveDietPlan(userId);
    if (!existingPlan) {
      // No existing plan, generate new one
      return await this.generateDietPlan({ userId, forceRefresh: true });
    }

    // Compare new insights with plan targets
    const planNeedsUpdate = await this.shouldUpdatePlanForNewData(existingPlan, newHealthInsights);
    
    if (planNeedsUpdate) {
      // Generate updated plan
      const updatedPlan = await this.generateDietPlan({ userId, forceRefresh: true });
      
      this.logger.log(`Updated diet plan for user ${userId} based on new health data`);
      return updatedPlan;
    }

    return existingPlan;
  }

  // Private helper methods

  private async getActiveDietPlan(userId: string): Promise<DietPlan | null> {
    for (const plan of this.dietPlans.values()) {
      if (plan.userId === userId && this.isPlanActive(plan)) {
        return plan;
      }
    }
    return null;
  }

  private isPlanActive(plan: DietPlan): boolean {
    const now = new Date();
    return now >= plan.timeline.startDate && now <= plan.timeline.estimatedEndDate;
  }

  private async createDietPlanFromInsights(
    request: DietPlanRequest,
    insights: HealthInsight,
  ): Promise<DietPlan> {
    const planId = `diet_plan_${request.userId}_${Date.now()}`;
    const now = new Date();
    
    // Analyze primary health concerns
    const primaryConcerns = this.identifyPrimaryConcerns(insights);
    const estimatedDays = this.calculateTotalTimelineDays(primaryConcerns);
    
    const estimatedEndDate = new Date(now);
    estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays);

    const dietPlan: DietPlan = {
      id: planId,
      userId: request.userId,
      planName: this.generatePlanName(primaryConcerns),
      phase: 'correction',
      timeline: {
        startDate: now,
        estimatedEndDate,
        currentDay: 1,
        totalDays: estimatedDays,
      },
      targetConditions: primaryConcerns,
      nutritionalFocus: this.createNutritionalFocus(insights, request.preferences),
      meals: this.generateMealPlan(insights, request.preferences),
      progressTracking: {
        milestones: this.createMilestones(primaryConcerns),
        nextMilestone: this.createMilestones(primaryConcerns)[0],
      },
      transitionPlan: {
        triggerConditions: primaryConcerns.map(c => c.condition),
        nextPhase: 'maintenance',
        scheduledDate: estimatedEndDate,
        notificationSent: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    return dietPlan;
  }

  private identifyPrimaryConcerns(insights: HealthInsight): Array<{
    condition: string;
    targetImprovement: string;
    estimatedResolutionDays: number;
  }> {
    const concerns = [];

    if (insights.micronutrients?.deficiencies) {
      for (const deficiency of insights.micronutrients.deficiencies) {
        concerns.push({
          condition: `${deficiency.nutrient} deficiency`,
          targetImprovement: `Restore ${deficiency.nutrient} to optimal levels`,
          estimatedResolutionDays: deficiency.timeline || 30,
        });
      }
    }

    if (insights.conditions?.detected) {
      for (const condition of insights.conditions.detected) {
        concerns.push({
          condition: condition.condition,
          targetImprovement: `Improve ${condition.condition} markers`,
          estimatedResolutionDays: condition.timeline || 60,
        });
      }
    }

    // Sort by priority (shorter timelines first)
    return concerns.sort((a, b) => a.estimatedResolutionDays - b.estimatedResolutionDays).slice(0, 3);
  }

  private calculateTotalTimelineDays(concerns: Array<{ estimatedResolutionDays: number }>): number {
    if (concerns.length === 0) return 30; // Default 30 days
    
    // Take the longest timeline as the main plan duration
    return Math.max(...concerns.map(c => c.estimatedResolutionDays));
  }

  private generatePlanName(concerns: Array<{ condition: string }>): string {
    if (concerns.length === 0) return 'General Wellness Plan';
    
    const mainConcern = concerns[0].condition;
    return `${mainConcern} Recovery Plan`;
  }

  private createNutritionalFocus(
    insights: HealthInsight, 
    preferences?: DietPlanRequest['preferences'],
  ) {
    const focus = {
      emphasizeNutrients: [] as string[],
      avoidFoods: [] as string[],
      recommendedFoods: [] as string[],
    };

    // Based on micronutrient deficiencies
    if (insights.micronutrients?.deficiencies) {
      for (const deficiency of insights.micronutrients.deficiencies) {
        focus.emphasizeNutrients.push(deficiency.nutrient);
        
        // Add foods rich in this nutrient
        const nutrientFoods = this.getFoodsForNutrient(deficiency.nutrient);
        focus.recommendedFoods.push(...nutrientFoods);
      }
    }

    // Based on health conditions
    if (insights.conditions?.detected) {
      for (const condition of insights.conditions.detected) {
        const avoidFoods = this.getFoodsToAvoidForCondition(condition.condition);
        focus.avoidFoods.push(...avoidFoods);
      }
    }

    // Apply dietary preferences
    if (preferences?.dietaryRestrictions) {
      focus.avoidFoods.push(...preferences.dietaryRestrictions);
    }

    return focus;
  }

  private generateMealPlan(
    insights: HealthInsight,
    preferences?: DietPlanRequest['preferences'],
  ) {
    // This would be more sophisticated in production
    return {
      breakfast: [
        'Iron-rich spinach and egg scramble',
        'Vitamin D fortified cereal with berries',
        'Whole grain toast with avocado',
      ],
      lunch: [
        'Salmon salad with leafy greens',
        'Quinoa bowl with mixed vegetables',
        'Lentil soup with whole grain bread',
      ],
      dinner: [
        'Grilled chicken with sweet potato',
        'Tofu stir-fry with broccoli',
        'Lean beef with roasted vegetables',
      ],
      snacks: [
        'Mixed nuts and seeds',
        'Greek yogurt with berries',
        'Hummus with carrot sticks',
      ],
    };
  }

  private createMilestones(concerns: Array<{ condition: string; estimatedResolutionDays: number }>) {
    const milestones = [];
    
    for (const concern of concerns) {
      const quarterPoint = Math.floor(concern.estimatedResolutionDays * 0.25);
      const halfPoint = Math.floor(concern.estimatedResolutionDays * 0.5);
      const threeQuarterPoint = Math.floor(concern.estimatedResolutionDays * 0.75);
      
      milestones.push(
        {
          day: quarterPoint,
          description: `Initial improvement in ${concern.condition}`,
          completed: false,
        },
        {
          day: halfPoint,
          description: `Halfway point - noticeable ${concern.condition} improvement`,
          completed: false,
        },
        {
          day: threeQuarterPoint,
          description: `Significant ${concern.condition} improvement`,
          completed: false,
        },
        {
          day: concern.estimatedResolutionDays,
          description: `Target ${concern.condition} resolution`,
          completed: false,
        },
      );
    }

    return milestones.sort((a, b) => a.day - b.day);
  }

  private async updateDietPlanProgress(plan: DietPlan): Promise<DietPlan> {
    const currentDay = this.calculateCurrentDay(plan.timeline.startDate);
    
    plan.timeline.currentDay = currentDay;
    plan.updatedAt = new Date();

    // Update milestone completion
    plan.progressTracking.milestones.forEach(milestone => {
      if (currentDay >= milestone.day) {
        milestone.completed = true;
      }
    });

    // Find next milestone
    const nextMilestone = plan.progressTracking.milestones.find(m => !m.completed);
    if (nextMilestone) {
      plan.progressTracking.nextMilestone = nextMilestone;
    }

    this.dietPlans.set(plan.id, plan);
    
    return plan;
  }

  private calculateCurrentDay(startDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getFoodsForNutrient(nutrient: string): string[] {
    const nutrientFoodMap: Record<string, string[]> = {
      'iron': ['spinach', 'red meat', 'lentils', 'tofu', 'quinoa'],
      'vitamin_d': ['fatty fish', 'egg yolks', 'fortified dairy', 'mushrooms'],
      'b12': ['fish', 'meat', 'dairy', 'nutritional yeast', 'eggs'],
      'folate': ['leafy greens', 'legumes', 'citrus fruits', 'fortified grains'],
      'calcium': ['dairy products', 'leafy greens', 'almonds', 'tahini'],
      'magnesium': ['nuts', 'seeds', 'whole grains', 'dark chocolate'],
    };

    return nutrientFoodMap[nutrient.toLowerCase()] || ['nutrient-rich whole foods'];
  }

  private getFoodsToAvoidForCondition(condition: string): string[] {
    const conditionAvoidMap: Record<string, string[]> = {
      'fatty_liver': ['alcohol', 'refined sugars', 'processed foods', 'saturated fats'],
      'high_cholesterol': ['trans fats', 'excessive saturated fats', 'processed meats'],
      'diabetes': ['refined sugars', 'white bread', 'sugary drinks', 'processed snacks'],
      'hypertension': ['excessive sodium', 'processed foods', 'canned soups', 'deli meats'],
    };

    return conditionAvoidMap[condition.toLowerCase()] || ['processed foods'];
  }

  private async createRecheckRecommendation(plan: DietPlan): Promise<DietPlan> {
    // Extend current plan with recheck recommendation
    plan.transitionPlan = {
      triggerConditions: ['health_report_recheck_recommended'],
      nextPhase: 'maintenance',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      notificationSent: false,
    };

    return plan;
  }

  private async extendCurrentPhase(plan: DietPlan): Promise<DietPlan> {
    // Extend current phase by 30 days
    const extendedDate = new Date(plan.timeline.estimatedEndDate);
    extendedDate.setDate(extendedDate.getDate() + 30);
    
    plan.timeline.estimatedEndDate = extendedDate;
    plan.timeline.totalDays += 30;
    plan.updatedAt = new Date();

    return plan;
  }

  private async createNextPhasePlan(existingPlan: DietPlan, nextPhase: 'maintenance' | 'optimization'): Promise<DietPlan> {
    const newPlan: DietPlan = {
      ...existingPlan,
      id: `diet_plan_${existingPlan.userId}_${Date.now()}`,
      phase: nextPhase,
      planName: `${nextPhase === 'maintenance' ? 'Maintenance' : 'Optimization'} Wellness Plan`,
      timeline: {
        startDate: new Date(),
        estimatedEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        currentDay: 1,
        totalDays: 60,
      },
      targetConditions: nextPhase === 'maintenance' 
        ? [{ condition: 'maintain current health', targetImprovement: 'Sustain improvements', estimatedResolutionDays: 60 }]
        : [{ condition: 'optimal wellness', targetImprovement: 'Peak health optimization', estimatedResolutionDays: 90 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return newPlan;
  }

  private async shouldUpdatePlanForNewData(
    existingPlan: DietPlan, 
    newInsights: HealthInsight,
  ): Promise<boolean> {
    // Simple logic: if new deficiencies are detected, update plan
    if (newInsights.micronutrients?.deficiencies && newInsights.micronutrients.deficiencies.length > 0) {
      const newDeficiencies = newInsights.micronutrients.deficiencies.map(d => d.nutrient);
      const planTargets = existingPlan.targetConditions.map(t => t.condition);
      
      // Check if there are new deficiencies not covered in current plan
      return newDeficiencies.some(deficiency => 
        !planTargets.some(target => target.includes(deficiency))
      );
    }

    return false;
  }
}