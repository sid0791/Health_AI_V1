import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum HealthMetricStatus {
  OPTIMAL = 'optimal',
  NORMAL = 'normal',
  LOW = 'low',
  HIGH = 'high',
  DEFICIENT = 'deficient',
  EXCESSIVE = 'excessive',
  UNKNOWN = 'unknown',
}

export enum HealthMetricTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  UNKNOWN = 'unknown',
}

export enum DataSource {
  HEALTH_REPORT = 'health_report',
  MANUAL_ENTRY = 'manual_entry',
  AI_ANALYSIS = 'ai_analysis',
  WEARABLE_DEVICE = 'wearable_device',
}

export interface MicronutrientProfile {
  nutrient: string;
  currentValue: number | null;
  unit: string;
  idealRange: {
    min: number;
    max: number;
  };
  status: HealthMetricStatus;
  trend: HealthMetricTrend;
  lastMeasured: Date;
  dataSource: DataSource;
  recommendations: string[];
  targetImprovementDays?: number;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface BiomarkerProfile {
  biomarker: string;
  currentValue: number | null;
  unit: string;
  referenceRange: {
    min: number;
    max: number;
  };
  status: HealthMetricStatus;
  trend: HealthMetricTrend;
  lastMeasured: Date;
  dataSource: DataSource;
  historicalValues: Array<{
    value: number;
    measuredAt: Date;
    dataSource: DataSource;
  }>;
  clinicalSignificance: string;
  recommendations: string[];
}

export interface HealthConditionProfile {
  condition: string;
  status: 'active' | 'resolved' | 'monitoring' | 'risk';
  severity: 'mild' | 'moderate' | 'severe';
  diagnosedAt?: Date;
  lastAssessed: Date;
  dataSource: DataSource;
  managementPlan: string[];
  relatedBiomarkers: string[];
  lifestyle_recommendations: string[];
  monitoringFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface DietaryProfile {
  recommendations: string[];
  restrictions: string[];
  preferences: string[];
  targetCalories?: number;
  macroTargets?: {
    protein: number; // percentage
    carbs: number; // percentage
    fats: number; // percentage
  };
  lastUpdated: Date;
  dataSource: DataSource;
}

export interface HealthTimeline {
  date: Date;
  event: string;
  type: 'measurement' | 'diagnosis' | 'improvement' | 'milestone';
  description: string;
  relatedMetrics: string[];
  dataSource: DataSource;
}

@Entity('user_health_profiles')
export class UserHealthProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Comprehensive micronutrient tracking
  @Column({ type: 'jsonb', default: {} })
  micronutrients: Record<string, MicronutrientProfile>;

  // Biomarker tracking with historical data
  @Column({ type: 'jsonb', default: {} })
  biomarkers: Record<string, BiomarkerProfile>;

  // Health conditions management
  @Column({ type: 'jsonb', default: {} })
  healthConditions: Record<string, HealthConditionProfile>;

  // Personalized dietary profile
  @Column({ type: 'jsonb', nullable: true })
  dietaryProfile?: DietaryProfile;

  // Health timeline for trend analysis
  @Column({ type: 'jsonb', default: [] })
  healthTimeline: HealthTimeline[];

  // Overall health scores and metrics
  @Column({ type: 'jsonb', nullable: true })
  healthScores?: {
    overallHealth: number; // 0-100
    nutritionalHealth: number; // 0-100
    metabolicHealth: number; // 0-100
    cardiovascularHealth: number; // 0-100
    lastCalculated: Date;
  };

  // Health goals and progress tracking
  @Column({ type: 'jsonb', default: [] })
  healthGoals: Array<{
    goal: string;
    targetValue?: number;
    currentProgress: number; // 0-100
    targetDate: Date;
    priority: 'high' | 'medium' | 'low';
    relatedMetrics: string[];
  }>;

  // AI analysis history for audit trail
  @Column({ type: 'jsonb', default: [] })
  aiAnalysisHistory: Array<{
    analysisDate: Date;
    analysisType: string;
    findings: string[];
    recommendations: string[];
    confidence: number;
    aiCost: number;
    dataSource: DataSource;
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.healthProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods for health profile management
  updateMicronutrient(nutrient: string, profile: Partial<MicronutrientProfile>): void {
    if (!this.micronutrients) this.micronutrients = {};

    const existing = this.micronutrients[nutrient.toLowerCase()];
    this.micronutrients[nutrient.toLowerCase()] = {
      nutrient: nutrient,
      currentValue: null,
      unit: '',
      idealRange: { min: 0, max: 0 },
      status: HealthMetricStatus.UNKNOWN,
      trend: HealthMetricTrend.UNKNOWN,
      lastMeasured: new Date(),
      dataSource: DataSource.AI_ANALYSIS,
      recommendations: [],
      ...existing,
      ...profile,
    };
  }

  updateBiomarker(biomarker: string, profile: Partial<BiomarkerProfile>): void {
    if (!this.biomarkers) this.biomarkers = {};

    const existing = this.biomarkers[biomarker.toLowerCase()];
    this.biomarkers[biomarker.toLowerCase()] = {
      biomarker: biomarker,
      currentValue: null,
      unit: '',
      referenceRange: { min: 0, max: 0 },
      status: HealthMetricStatus.UNKNOWN,
      trend: HealthMetricTrend.UNKNOWN,
      lastMeasured: new Date(),
      dataSource: DataSource.AI_ANALYSIS,
      historicalValues: [],
      clinicalSignificance: '',
      recommendations: [],
      ...existing,
      ...profile,
    };

    // Add to historical values if we have a current value
    if (profile.currentValue && existing?.currentValue !== profile.currentValue) {
      this.biomarkers[biomarker.toLowerCase()].historicalValues.push({
        value: profile.currentValue,
        measuredAt: profile.lastMeasured || new Date(),
        dataSource: profile.dataSource || DataSource.AI_ANALYSIS,
      });

      // Keep only last 10 historical values
      this.biomarkers[biomarker.toLowerCase()].historicalValues =
        this.biomarkers[biomarker.toLowerCase()].historicalValues.slice(-10);
    }
  }

  updateHealthCondition(condition: string, profile: Partial<HealthConditionProfile>): void {
    if (!this.healthConditions) this.healthConditions = {};

    const existing = this.healthConditions[condition.toLowerCase()];
    this.healthConditions[condition.toLowerCase()] = {
      condition: condition,
      status: 'monitoring',
      severity: 'mild',
      lastAssessed: new Date(),
      dataSource: DataSource.AI_ANALYSIS,
      managementPlan: [],
      relatedBiomarkers: [],
      lifestyle_recommendations: [],
      monitoringFrequency: 'monthly',
      ...existing,
      ...profile,
    };
  }

  addHealthTimelineEvent(event: Partial<HealthTimeline>): void {
    if (!this.healthTimeline) this.healthTimeline = [];

    this.healthTimeline.push({
      date: new Date(),
      event: '',
      type: 'measurement',
      description: '',
      relatedMetrics: [],
      dataSource: DataSource.AI_ANALYSIS,
      ...event,
    });

    // Sort by date, most recent first
    this.healthTimeline.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Keep only last 50 events
    this.healthTimeline = this.healthTimeline.slice(0, 50);
  }

  addAIAnalysis(analysis: {
    analysisType: string;
    findings: string[];
    recommendations: string[];
    confidence: number;
    aiCost: number;
    dataSource?: DataSource;
  }): void {
    if (!this.aiAnalysisHistory) this.aiAnalysisHistory = [];

    this.aiAnalysisHistory.push({
      analysisDate: new Date(),
      ...analysis,
      dataSource: analysis.dataSource || DataSource.AI_ANALYSIS,
    });

    // Keep only last 20 analyses
    this.aiAnalysisHistory = this.aiAnalysisHistory.slice(-20);
  }

  // Get health insights for chat queries
  getHealthInsightForQuery(query: string): string | null {
    const queryLower = query.toLowerCase();

    // Check micronutrients
    for (const [key, profile] of Object.entries(this.micronutrients || {})) {
      if (queryLower.includes(key) || queryLower.includes(profile.nutrient.toLowerCase())) {
        if (
          profile.status === HealthMetricStatus.DEFICIENT ||
          profile.status === HealthMetricStatus.LOW
        ) {
          return `According to your health profile, your ${profile.nutrient} levels are ${profile.status.toLowerCase()} (${profile.currentValue} ${profile.unit}). The ideal range is ${profile.idealRange.min}-${profile.idealRange.max} ${profile.unit}. ${profile.recommendations.join(' ')}`;
        }
      }
    }

    // Check biomarkers
    for (const [key, profile] of Object.entries(this.biomarkers || {})) {
      if (queryLower.includes(key) || queryLower.includes(profile.biomarker.toLowerCase())) {
        return `Your ${profile.biomarker} levels are ${profile.status.toLowerCase()} at ${profile.currentValue} ${profile.unit}. Reference range: ${profile.referenceRange.min}-${profile.referenceRange.max} ${profile.unit}. ${profile.clinicalSignificance} ${profile.recommendations.join(' ')}`;
      }
    }

    // Check health conditions
    for (const [key, profile] of Object.entries(this.healthConditions || {})) {
      if (queryLower.includes(key) || queryLower.includes(profile.condition.toLowerCase())) {
        return `Based on your health profile, you have ${profile.condition} (${profile.severity} severity, ${profile.status} status). ${profile.lifestyle_recommendations.join(' ')}`;
      }
    }

    return null;
  }

  // Calculate overall health score
  calculateHealthScore(): number {
    let totalScore = 0;
    let metricCount = 0;

    // Score micronutrients (40% of total score)
    for (const profile of Object.values(this.micronutrients || {})) {
      switch (profile.status) {
        case HealthMetricStatus.OPTIMAL:
          totalScore += 100;
          break;
        case HealthMetricStatus.NORMAL:
          totalScore += 85;
          break;
        case HealthMetricStatus.LOW:
          totalScore += 60;
          break;
        case HealthMetricStatus.DEFICIENT:
          totalScore += 30;
          break;
        default:
          totalScore += 70;
      }
      metricCount++;
    }

    // Score biomarkers (40% of total score)
    for (const profile of Object.values(this.biomarkers || {})) {
      switch (profile.status) {
        case HealthMetricStatus.OPTIMAL:
          totalScore += 100;
          break;
        case HealthMetricStatus.NORMAL:
          totalScore += 85;
          break;
        case HealthMetricStatus.HIGH:
        case HealthMetricStatus.LOW:
          totalScore += 60;
          break;
        case HealthMetricStatus.CRITICAL:
          totalScore += 20;
          break;
        default:
          totalScore += 70;
      }
      metricCount++;
    }

    // Score health conditions (20% of total score)
    for (const profile of Object.values(this.healthConditions || {})) {
      switch (profile.status) {
        case 'resolved':
          totalScore += 100;
          break;
        case 'monitoring':
          totalScore += 75;
          break;
        case 'active':
          totalScore +=
            profile.severity === 'mild' ? 60 : profile.severity === 'moderate' ? 40 : 20;
          break;
        case 'risk':
          totalScore += 50;
          break;
        default:
          totalScore += 70;
      }
      metricCount++;
    }

    return metricCount > 0 ? Math.round(totalScore / metricCount) : 85; // Default score if no metrics
  }
}
