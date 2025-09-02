import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  HealthAnalysisCacheService,
  HealthInsights,
  HealthAnalysisType,
} from './health-analysis-cache.service';
import { AIRoutingService, AIRoutingRequest } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';

export interface TimelineDietPlan {
  id: string;
  userId: string;
  planName: string;
  healthGoals: string[];
  basedOnInsights: Array<{
    analysisType: HealthAnalysisType;
    targetDeficiency: string;
    severity: string;
    targetTimeline: number; // days
  }>;
  phases: DietPhase[];
  totalDuration: number; // days
  expectedOutcomes: Array<{
    parameter: string;
    currentValue: number;
    targetValue: number;
    timelineToAchieve: number; // days
  }>;
  recheckReminders: Array<{
    type: 'health_test' | 'progress_check' | 'diet_transition';
    scheduledDate: Date;
    description: string;
  }>;
  createdAt: Date;
  lastUpdated: Date;
  isActive: boolean;
}

export interface DietPhase {
  phaseNumber: number;
  name: string;
  duration: number; // days
  startDate: Date;
  endDate: Date;
  primaryFocus: string[]; // nutrients/health goals
  dietaryGuidelines: {
    emphasize: string[]; // foods to focus on
    limit: string[]; // foods to reduce
    avoid: string[]; // foods to eliminate
    supplementation?: string[]; // if needed
  };
  expectedProgress: string;
  transitionCriteria: string;
  nextPhasePrep: string;
}

export interface DietAdaptationRequest {
  userId: string;
  currentPlanId?: string;
  newHealthInsights?: HealthInsights;
  progressFeedback?: {
    completedDays: number;
    adherenceRate: number; // 0-100%
    reportedImprovements: string[];
    challenges: string[];
  };
  adaptationType: 'new_health_data' | 'timeline_completion' | 'progress_adjustment';
}

export interface DietAdaptationResult {
  adaptationNeeded: boolean;
  newPlan?: TimelineDietPlan;
  transitionPlan?: {
    transitionType: 'phase_advance' | 'maintenance_mode' | 'goal_refocus';
    transitionDate: Date;
    transitionInstructions: string[];
    newFocus: string[];
  };
  notifications: Array<{
    type: 'success' | 'reminder' | 'action_required';
    title: string;
    message: string;
    actionRequired?: string;
    scheduledFor?: Date;
  }>;
}

@Injectable()
export class TimelineDietPlanningService {
  private readonly logger = new Logger(TimelineDietPlanningService.name);

  // Store active diet plans (would be database in production)
  private activePlans = new Map<string, TimelineDietPlan>();

  constructor(
    private readonly healthAnalysisCacheService: HealthAnalysisCacheService,
    private readonly aiRoutingService: AIRoutingService,
    private readonly configService: ConfigService,
  ) {
    // Check for plan transitions every day
    setInterval(() => this.checkPlanTransitions(), 24 * 60 * 60 * 1000);
  }

  /**
   * Generate a timeline-based diet plan using cached health analysis
   */
  async generateTimelineDietPlan(userId: string): Promise<TimelineDietPlan> {
    this.logger.debug(`Generating timeline diet plan for user ${userId}`);

    // Get nutrition deficiencies and excesses from cached health analysis
    const nutritionData = await this.healthAnalysisCacheService.getNutritionDeficiencies(userId);

    if (nutritionData.deficiencies.length === 0 && nutritionData.excesses.length === 0) {
      return this.generateMaintenancePlan(userId);
    }

    // Create phased diet plan based on improvement timelines
    const phases = this.createDietPhases(nutritionData);
    const totalDuration = Math.max(...phases.map(p => p.duration));

    // Generate expected outcomes
    const expectedOutcomes = this.generateExpectedOutcomes(nutritionData);

    // Create recheck reminders
    const recheckReminders = this.generateRecheckReminders(phases, expectedOutcomes);

    const dietPlan: TimelineDietPlan = {
      id: this.generatePlanId(),
      userId,
      planName: this.generatePlanName(nutritionData),
      healthGoals: this.extractHealthGoals(nutritionData),
      basedOnInsights: nutritionData.deficiencies.map(def => ({
        analysisType: HealthAnalysisType.NUTRIENT_DEFICIENCY,
        targetDeficiency: def.nutrient,
        severity: def.severity,
        targetTimeline: def.improvementTimeline,
      })),
      phases,
      totalDuration,
      expectedOutcomes,
      recheckReminders,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    };

    // Store the plan
    this.activePlans.set(userId, dietPlan);

    this.logger.log(
      `Generated timeline diet plan for user ${userId} with ${phases.length} phases over ${totalDuration} days`,
    );

    return dietPlan;
  }

  /**
   * Adapt diet plan based on new health data or progress
   */
  async adaptDietPlan(request: DietAdaptationRequest): Promise<DietAdaptationResult> {
    this.logger.debug(
      `Adapting diet plan for user ${request.userId}, type: ${request.adaptationType}`,
    );

    const currentPlan = this.activePlans.get(request.userId);
    const notifications: DietAdaptationResult['notifications'] = [];

    switch (request.adaptationType) {
      case 'new_health_data':
        return await this.adaptForNewHealthData(request, currentPlan);

      case 'timeline_completion':
        return await this.adaptForTimelineCompletion(request, currentPlan, notifications);

      case 'progress_adjustment':
        return await this.adaptForProgress(request, currentPlan, notifications);

      default:
        return {
          adaptationNeeded: false,
          notifications: [{
            type: 'success',
            title: 'No Changes Needed',
            message: 'Your current diet plan remains optimal.',
          }],
        };
    }
  }

  /**
   * Get current diet plan for user
   */
  async getCurrentDietPlan(userId: string): Promise<TimelineDietPlan | null> {
    return this.activePlans.get(userId) || null;
  }

  /**
   * Check if user should transition to maintenance diet
   */
  async checkMaintenanceTransition(userId: string): Promise<{
    shouldTransition: boolean;
    reason: string;
    recommendedActions: string[];
  }> {
    const currentPlan = this.activePlans.get(userId);
    if (!currentPlan) {
      return {
        shouldTransition: false,
        reason: 'No active diet plan found',
        recommendedActions: ['Consider creating a new health-focused diet plan'],
      };
    }

    const now = new Date();
    const completedPhases = currentPlan.phases.filter(phase => phase.endDate <= now);
    const totalPhases = currentPlan.phases.length;

    // Check if 80% of timeline goals should be completed
    const expectedCompletionRate = completedPhases.length / totalPhases;
    
    if (expectedCompletionRate >= 0.8) {
      return {
        shouldTransition: true,
        reason: 'Most improvement goals achieved based on timeline',
        recommendedActions: [
          'Schedule comprehensive health test to verify improvements',
          'Transition to balanced maintenance diet',
          'Continue monitoring key biomarkers',
          'Consider new health optimization goals',
        ],
      };
    }

    return {
      shouldTransition: false,
      reason: `Diet plan in progress (${Math.round(expectedCompletionRate * 100)}% timeline completed)`,
      recommendedActions: [
        'Continue with current phase recommendations',
        'Monitor adherence and progress',
        `Review plan effectiveness in ${Math.ceil((currentPlan.totalDuration * 0.8) - 
          ((now.getTime() - currentPlan.createdAt.getTime()) / (1000 * 60 * 60 * 24)))} days`,
      ],
    };
  }

  /**
   * Generate maintenance diet plan
   */
  private generateMaintenancePlan(userId: string): TimelineDietPlan {
    const maintenancePhase: DietPhase = {
      phaseNumber: 1,
      name: 'Balanced Maintenance',
      duration: 365, // 1 year
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      primaryFocus: ['overall_health', 'maintenance', 'prevention'],
      dietaryGuidelines: {
        emphasize: [
          'variety_of_vegetables',
          'lean_proteins',
          'whole_grains',
          'healthy_fats',
          'adequate_hydration',
        ],
        limit: ['processed_foods', 'added_sugars', 'excessive_sodium'],
        avoid: ['trans_fats', 'excessive_alcohol'],
      },
      expectedProgress: 'Maintain current health status and prevent chronic disease',
      transitionCriteria: 'New health concerns or optimization goals identified',
      nextPhasePrep: 'Regular health monitoring and goal reassessment',
    };

    return {
      id: this.generatePlanId(),
      userId,
      planName: 'Balanced Maintenance Diet',
      healthGoals: ['maintain_health', 'prevent_disease', 'optimize_energy'],
      basedOnInsights: [],
      phases: [maintenancePhase],
      totalDuration: 365,
      expectedOutcomes: [],
      recheckReminders: [{
        type: 'health_test',
        scheduledDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
        description: 'Comprehensive health check to assess current status and set new goals',
      }],
      createdAt: new Date(),
      lastUpdated: new Date(),
      isActive: true,
    };
  }

  /**
   * Create diet phases based on improvement timelines
   */
  private createDietPhases(nutritionData: ReturnType<typeof this.healthAnalysisCacheService.getNutritionDeficiencies> extends Promise<infer T> ? T : never): DietPhase[] {
    const phases: DietPhase[] = [];
    
    // Sort deficiencies by timeline (shortest first for quick wins)
    const sortedDeficiencies = [...nutritionData.deficiencies].sort(
      (a, b) => a.improvementTimeline - b.improvementTimeline
    );

    // Group deficiencies by similar timelines
    const phaseGroups = this.groupDeficienciesByTimeline(sortedDeficiencies);
    
    let cumulativeDays = 0;

    phaseGroups.forEach((group, index) => {
      const phaseDuration = Math.max(...group.map(d => d.improvementTimeline));
      const startDate = new Date(Date.now() + cumulativeDays * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + phaseDuration * 24 * 60 * 60 * 1000);

      const phase: DietPhase = {
        phaseNumber: index + 1,
        name: this.generatePhaseName(group, index),
        duration: phaseDuration,
        startDate,
        endDate,
        primaryFocus: group.map(d => d.nutrient.toLowerCase()),
        dietaryGuidelines: this.generateDietaryGuidelines(group, nutritionData.excesses),
        expectedProgress: this.generateExpectedProgress(group),
        transitionCriteria: this.generateTransitionCriteria(group),
        nextPhasePrep: this.generateNextPhasePrep(index, phaseGroups.length),
      };

      phases.push(phase);
      cumulativeDays += phaseDuration;
    });

    return phases;
  }

  private groupDeficienciesByTimeline(deficiencies: HealthInsights['deficiencies']): HealthInsights['deficiencies'][] {
    const groups: HealthInsights['deficiencies'][] = [];
    
    for (const deficiency of deficiencies) {
      // Find group with similar timeline (within 15 days)
      const existingGroup = groups.find(group => 
        Math.abs(group[0].improvementTimeline - deficiency.improvementTimeline) <= 15
      );
      
      if (existingGroup) {
        existingGroup.push(deficiency);
      } else {
        groups.push([deficiency]);
      }
    }
    
    return groups;
  }

  private generateDietaryGuidelines(
    deficiencies: HealthInsights['deficiencies'],
    excesses: HealthInsights['excesses']
  ): DietPhase['dietaryGuidelines'] {
    const emphasize = new Set<string>();
    const limit = new Set<string>();
    const avoid = new Set<string>();

    // Add foods for deficiencies
    deficiencies.forEach(def => {
      def.dietaryFocus.forEach(food => emphasize.add(food));
    });

    // Add restrictions for excesses
    excesses.forEach(excess => {
      excess.restrictions.forEach(restriction => {
        if (restriction.includes('avoid')) {
          avoid.add(restriction.replace('avoid_', ''));
        } else {
          limit.add(restriction);
        }
      });
    });

    return {
      emphasize: Array.from(emphasize),
      limit: Array.from(limit),
      avoid: Array.from(avoid),
    };
  }

  private async adaptForNewHealthData(
    request: DietAdaptationRequest,
    currentPlan: TimelineDietPlan | undefined
  ): Promise<DietAdaptationResult> {
    if (!request.newHealthInsights) {
      return {
        adaptationNeeded: false,
        notifications: [{
          type: 'success',
          title: 'No New Health Data',
          message: 'No new health insights to adapt diet plan.',
        }],
      };
    }

    // Compare new insights with current plan
    const newDeficiencies = request.newHealthInsights.deficiencies;
    const currentDeficiencies = currentPlan?.basedOnInsights || [];

    // Check for new deficiencies or changed severities
    const significantChanges = this.detectSignificantHealthChanges(
      newDeficiencies,
      currentDeficiencies
    );

    if (significantChanges.hasNewDeficiencies || significantChanges.hasSeverityChanges) {
      // Generate updated plan
      const newPlan = await this.generateTimelineDietPlan(request.userId);
      
      return {
        adaptationNeeded: true,
        newPlan,
        notifications: [{
          type: 'action_required',
          title: 'Diet Plan Updated',
          message: 'Your health analysis shows new insights. Your diet plan has been updated.',
          actionRequired: 'Review new dietary recommendations and phase timeline',
        }],
      };
    }

    return {
      adaptationNeeded: false,
      notifications: [{
        type: 'success',
        title: 'Health Progress Confirmed',
        message: 'Your health improvements are on track. Continue with current diet plan.',
      }],
    };
  }

  private async adaptForTimelineCompletion(
    request: DietAdaptationRequest,
    currentPlan: TimelineDietPlan | undefined,
    notifications: DietAdaptationResult['notifications']
  ): Promise<DietAdaptationResult> {
    if (!currentPlan) {
      return {
        adaptationNeeded: false,
        notifications: [{
          type: 'reminder',
          title: 'No Active Plan',
          message: 'Consider creating a new health-focused diet plan.',
        }],
      };
    }

    const transitionCheck = await this.checkMaintenanceTransition(request.userId);
    
    if (transitionCheck.shouldTransition) {
      const maintenancePlan = this.generateMaintenancePlan(request.userId);
      
      return {
        adaptationNeeded: true,
        newPlan: maintenancePlan,
        transitionPlan: {
          transitionType: 'maintenance_mode',
          transitionDate: new Date(),
          transitionInstructions: [
            'Congratulations! Your targeted health improvements are complete.',
            'Transition to balanced maintenance diet to sustain improvements.',
            'Schedule comprehensive health test to verify progress.',
            'Continue monitoring key biomarkers quarterly.',
          ],
          newFocus: ['maintenance', 'prevention', 'overall_wellness'],
        },
        notifications: [
          {
            type: 'success',
            title: '🎉 Health Goals Achieved!',
            message: `Your ${currentPlan.totalDuration}-day improvement plan is complete. Time to transition to maintenance mode.`,
          },
          {
            type: 'reminder',
            title: 'Schedule Health Recheck',
            message: 'Book a comprehensive health test to verify your improvements and set new goals.',
            actionRequired: 'Schedule health test appointment',
            scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
          },
        ],
      };
    }

    return {
      adaptationNeeded: false,
      notifications: [{
        type: 'reminder',
        title: 'Continue Current Plan',
        message: transitionCheck.reason,
      }],
    };
  }

  private async adaptForProgress(
    request: DietAdaptationRequest,
    currentPlan: TimelineDietPlan | undefined,
    notifications: DietAdaptationResult['notifications']
  ): Promise<DietAdaptationResult> {
    if (!request.progressFeedback || !currentPlan) {
      return {
        adaptationNeeded: false,
        notifications: [{ type: 'reminder', title: 'Progress Tracking', message: 'Keep tracking your diet adherence for better recommendations.' }],
      };
    }

    const { adherenceRate, reportedImprovements, challenges } = request.progressFeedback;

    // Analyze progress and adapt plan
    if (adherenceRate < 60) {
      // Low adherence - simplify plan
      notifications.push({
        type: 'action_required',
        title: 'Diet Plan Simplified',
        message: 'We notice adherence challenges. Your plan has been simplified to focus on the most important changes.',
        actionRequired: 'Review simplified dietary recommendations',
      });

      // Create simplified version of current plan
      const simplifiedPlan = this.simplifyDietPlan(currentPlan);
      
      return {
        adaptationNeeded: true,
        newPlan: simplifiedPlan,
        notifications,
      };
    }

    if (reportedImprovements.length > 2 && adherenceRate > 80) {
      // Good progress - potentially accelerate timeline
      notifications.push({
        type: 'success',
        title: '🎯 Excellent Progress!',
        message: 'Your adherence and reported improvements are outstanding. Consider advancing to next phase earlier.',
      });
    }

    return {
      adaptationNeeded: false,
      notifications,
    };
  }

  // Helper methods for plan generation
  private generatePlanName(nutritionData: any): string {
    const primaryDeficiency = nutritionData.deficiencies[0]?.nutrient;
    if (primaryDeficiency) {
      return `${primaryDeficiency} Optimization Plan`;
    }
    return 'Personalized Health Optimization Plan';
  }

  private extractHealthGoals(nutritionData: any): string[] {
    const goals = [];
    nutritionData.deficiencies.forEach(def => {
      goals.push(`optimize_${def.nutrient.toLowerCase()}`);
    });
    nutritionData.excesses.forEach(excess => {
      goals.push(`reduce_${excess.parameter.toLowerCase()}`);
    });
    return goals;
  }

  private generateExpectedOutcomes(nutritionData: any): TimelineDietPlan['expectedOutcomes'] {
    return nutritionData.deficiencies.map(def => ({
      parameter: def.nutrient,
      currentValue: def.currentValue || 0,
      targetValue: this.parseTargetValue(def.normalRange),
      timelineToAchieve: def.improvementTimeline,
    }));
  }

  private parseTargetValue(normalRange: string): number {
    // Simple parser for normal ranges like "30-50 ng/mL" -> 40 (midpoint)
    const match = normalRange.match(/(\d+)-(\d+)/);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      return (min + max) / 2;
    }
    return 0;
  }

  private generateRecheckReminders(phases: DietPhase[], outcomes: TimelineDietPlan['expectedOutcomes']): TimelineDietPlan['recheckReminders'] {
    const reminders: TimelineDietPlan['recheckReminders'] = [];

    // Add mid-point progress check
    const midPointDate = new Date(phases[0].startDate.getTime() + (phases[phases.length - 1].endDate.getTime() - phases[0].startDate.getTime()) / 2);
    reminders.push({
      type: 'progress_check',
      scheduledDate: midPointDate,
      description: 'Mid-plan progress assessment and plan adjustment if needed',
    });

    // Add final health test reminder
    const finalDate = new Date(phases[phases.length - 1].endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    reminders.push({
      type: 'health_test',
      scheduledDate: finalDate,
      description: 'Comprehensive health test to verify improvements and plan next steps',
    });

    return reminders;
  }

  private generatePhaseName(deficiencies: HealthInsights['deficiencies'], index: number): string {
    if (deficiencies.length === 1) {
      return `${deficiencies[0].nutrient} Focus Phase`;
    }
    return `Phase ${index + 1}: Multi-Nutrient Optimization`;
  }

  private generateExpectedProgress(deficiencies: HealthInsights['deficiencies']): string {
    const nutrients = deficiencies.map(d => d.nutrient).join(', ');
    const timeline = Math.max(...deficiencies.map(d => d.improvementTimeline));
    return `Expect ${nutrients} levels to normalize within ${timeline} days with consistent adherence`;
  }

  private generateTransitionCriteria(deficiencies: HealthInsights['deficiencies']): string {
    return `Target nutrient levels achieved or ${Math.max(...deficiencies.map(d => d.improvementTimeline))} days completed`;
  }

  private generateNextPhasePrep(currentIndex: number, totalPhases: number): string {
    if (currentIndex + 1 >= totalPhases) {
      return 'Prepare for transition to maintenance diet and health status verification';
    }
    return `Maintain current improvements while preparing to address next set of health priorities`;
  }

  private detectSignificantHealthChanges(newDeficiencies: any[], currentDeficiencies: any[]): {
    hasNewDeficiencies: boolean;
    hasSeverityChanges: boolean;
  } {
    // Simple comparison logic - would be more sophisticated in production
    const newNutrients = new Set(newDeficiencies.map(d => d.nutrient));
    const currentNutrients = new Set(currentDeficiencies.map(d => d.targetDeficiency));

    const hasNewDeficiencies = newDeficiencies.some(d => !currentNutrients.has(d.nutrient));
    const hasSeverityChanges = newDeficiencies.some(newDef => {
      const currentDef = currentDeficiencies.find(c => c.targetDeficiency === newDef.nutrient);
      return currentDef && currentDef.severity !== newDef.severity;
    });

    return { hasNewDeficiencies, hasSeverityChanges };
  }

  private simplifyDietPlan(plan: TimelineDietPlan): TimelineDietPlan {
    // Create a simplified version focusing on top 2 priorities
    const simplifiedInsights = plan.basedOnInsights.slice(0, 2);
    
    return {
      ...plan,
      id: this.generatePlanId(),
      planName: `Simplified ${plan.planName}`,
      basedOnInsights: simplifiedInsights,
      phases: plan.phases.map(phase => ({
        ...phase,
        primaryFocus: phase.primaryFocus.slice(0, 2),
        dietaryGuidelines: {
          ...phase.dietaryGuidelines,
          emphasize: phase.dietaryGuidelines.emphasize.slice(0, 3),
          limit: phase.dietaryGuidelines.limit.slice(0, 2),
        },
      })),
      lastUpdated: new Date(),
    };
  }

  private generatePlanId(): string {
    return `diet_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkPlanTransitions(): Promise<void> {
    this.logger.debug('Checking for diet plan transitions');

    for (const [userId, plan] of this.activePlans.entries()) {
      const transitionCheck = await this.checkMaintenanceTransition(userId);
      
      if (transitionCheck.shouldTransition) {
        this.logger.log(`User ${userId} ready for maintenance transition`);
        // In production, this would trigger user notifications
      }
    }
  }
}