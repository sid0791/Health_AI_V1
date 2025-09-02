import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DietPhase {
  CORRECTION = 'correction',     // Address specific deficiencies/issues
  MAINTENANCE = 'maintenance',   // Maintain improvements achieved
  OPTIMIZATION = 'optimization', // Further optimize health parameters
  BALANCED = 'balanced',         // General balanced diet
}

export enum DietPlanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed', 
  TRANSITIONED = 'transitioned',
  PAUSED = 'paused',
}

@Entity('diet_plans')
@Index(['userId', 'status'])
@Index(['userId', 'phase'])
export class DietPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: DietPhase })
  phase: DietPhase;

  @Column({ type: 'enum', enum: DietPlanStatus, default: DietPlanStatus.ACTIVE })
  status: DietPlanStatus;

  @Column({ type: 'jsonb' })
  targetConditions: {
    // Health conditions this plan addresses
    primaryConditions: string[]; // e.g., ['vitamin_d_deficiency', 'iron_deficiency']
    secondaryConditions: string[]; // e.g., ['fatty_liver', 'high_cholesterol']
    // Timeline expectations
    expectedImprovementDays: number;
    // Success criteria
    successCriteria: Array<{
      condition: string;
      targetValue?: number;
      targetRange?: { min: number; max: number };
      description: string;
    }>;
  };

  @Column({ type: 'jsonb' })
  planDetails: {
    // Meal plan structure
    mealsPerDay: number;
    snacksPerDay: number;
    targetCalories: number;
    macroTargets: {
      proteinPercent: number;
      carbPercent: number; 
      fatPercent: number;
    };
    // Special dietary focus
    dietaryFocus: string[]; // e.g., ['high_iron', 'low_sodium', 'high_fiber']
    keyNutrients: Array<{
      nutrient: string;
      targetAmount: number;
      unit: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    // Food recommendations
    recommendedFoods: string[];
    foodsToAvoid: string[];
    supplementsRecommended?: string[];
  };

  @Column({ type: 'jsonb' })
  timeline: {
    startDate: string;
    expectedEndDate: string;
    totalDurationDays: number;
    // Milestones for tracking progress
    milestones: Array<{
      day: number;
      title: string;
      description: string;
      expectedOutcome?: string;
      completed?: boolean;
      completedAt?: string;
    }>;
    // Next phase planning
    nextPhase?: {
      phase: DietPhase;
      transitionDate: string;
      transitionReason: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  progressTracking?: {
    // User adherence
    adherenceScore: number; // 0-100%
    mealsLogged: number;
    totalPlannedMeals: number;
    // Health improvements
    biomarkerImprovements?: Array<{
      marker: string;
      initialValue: number;
      currentValue?: number;
      targetValue: number;
      improvementPercent?: number;
    }>;
    // User feedback
    userSatisfaction: number; // 1-5 rating
    userFeedback?: string[];
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastReviewedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextTransitionCheck?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isReadyForTransition(): boolean {
    if (this.status !== DietPlanStatus.ACTIVE) return false;
    
    const daysSinceStart = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart >= this.targetConditions.expectedImprovementDays;
  }

  getNextMilestone(): any {
    const daysSinceStart = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return this.timeline.milestones.find(m => m.day > daysSinceStart && !m.completed) || null;
  }

  getCompletedMilestones(): any[] {
    return this.timeline.milestones.filter(m => m.completed);
  }

  calculateAdherenceScore(): number {
    if (!this.progressTracking) return 0;
    return Math.round((this.progressTracking.mealsLogged / this.progressTracking.totalPlannedMeals) * 100);
  }

  shouldShowTransitionNotification(): boolean {
    if (!this.nextTransitionCheck) return false;
    return new Date() >= this.nextTransitionCheck;
  }

  getRecommendedNextPhase(): DietPhase {
    const currentPhase = this.phase;
    const adherenceScore = this.calculateAdherenceScore();
    
    // Logic for phase progression
    if (currentPhase === DietPhase.CORRECTION && adherenceScore >= 80) {
      return DietPhase.MAINTENANCE;
    } else if (currentPhase === DietPhase.MAINTENANCE && adherenceScore >= 85) {
      return DietPhase.OPTIMIZATION;
    } else if (currentPhase === DietPhase.OPTIMIZATION) {
      return DietPhase.BALANCED;
    }
    
    return DietPhase.BALANCED;
  }
}