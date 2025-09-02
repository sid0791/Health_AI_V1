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
import { HealthReport } from '../../health-reports/entities/health-report.entity';

export enum InsightCategory {
  MICRONUTRIENT_DEFICIENCY = 'micronutrient_deficiency',
  BIOMARKER_ANALYSIS = 'biomarker_analysis',
  HEALTH_CONDITION = 'health_condition',
  DIETARY_RECOMMENDATION = 'dietary_recommendation',
  HEALTH_SUMMARY = 'health_summary',
  RED_FLAG = 'red_flag',
}

export enum InsightSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('health_insights')
@Index(['userId', 'category'])
@Index(['userId', 'isActive'])
export class HealthInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'health_report_id', nullable: true })
  healthReportId?: string;

  @ManyToOne(() => HealthReport, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'health_report_id' })
  healthReport?: HealthReport;

  @Column({ type: 'enum', enum: InsightCategory })
  category: InsightCategory;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  insight: string;

  @Column({ type: 'text', nullable: true })
  recommendation?: string;

  @Column({ type: 'enum', enum: InsightSeverity, default: InsightSeverity.MEDIUM })
  severity: InsightSeverity;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    // Biomarker values if applicable
    biomarkerValues?: Record<string, number>;
    // Deficiency details
    deficiencyInfo?: {
      nutrient: string;
      currentValue: number;
      normalRange: { min: number; max: number };
      severity: 'mild' | 'moderate' | 'severe';
    };
    // Health condition details
    conditionInfo?: {
      condition: string;
      indicators: string[];
      riskLevel: 'low' | 'medium' | 'high';
    };
    // Timeline information for trackable conditions
    timeline?: {
      expectedImprovementDays: number;
      milestones: Array<{
        day: number;
        description: string;
        expectedValue?: number;
      }>;
    };
    // AI generation details
    aiMetadata?: {
      model: string;
      confidence: number;
      cost: number;
      generatedAt: string;
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isManuallyUpdated: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastReviewedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isOutdated(days: number = 90): boolean {
    const daysSinceUpdate = (Date.now() - this.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > days;
  }

  shouldTriggerRecheck(): boolean {
    if (!this.metadata?.timeline) return false;

    const daysSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated >= this.metadata.timeline.expectedImprovementDays;
  }

  getNextMilestone(): { day: number; description: string; expectedValue?: number } | null {
    if (!this.metadata?.timeline?.milestones) return null;

    const daysSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const milestones = this.metadata.timeline.milestones as Array<{
      day: number;
      description: string;
      expectedValue?: number;
    }>;
    return milestones.find((m) => m.day > daysSinceCreated) || null;
  }
}
