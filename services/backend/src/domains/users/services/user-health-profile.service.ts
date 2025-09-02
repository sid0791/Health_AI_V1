import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  UserHealthProfile,
  MicronutrientProfile,
  BiomarkerProfile,
  HealthConditionProfile,
  DietaryProfile,
  HealthMetricStatus,
  HealthMetricTrend,
  DataSource,
} from '../entities/user-health-profile.entity';
import { User } from '../entities/user.entity';
import { HealthReport } from '../../health-reports/entities/health-report.entity';

export interface HealthValueExtraction {
  micronutrients: Array<{
    nutrient: string;
    currentValue: number;
    unit: string;
    status: HealthMetricStatus;
    idealRange: { min: number; max: number };
    recommendations: string[];
    targetImprovementDays?: number;
  }>;
  biomarkers: Array<{
    biomarker: string;
    currentValue: number;
    unit: string;
    status: HealthMetricStatus;
    referenceRange: { min: number; max: number };
    clinicalSignificance: string;
    recommendations: string[];
  }>;
  healthConditions: Array<{
    condition: string;
    severity: 'mild' | 'moderate' | 'severe';
    status: 'active' | 'resolved' | 'monitoring' | 'risk';
    managementPlan: string[];
    relatedBiomarkers: string[];
  }>;
  dietaryRecommendations: string[];
}

@Injectable()
export class UserHealthProfileService {
  private readonly logger = new Logger(UserHealthProfileService.name);

  constructor(
    @InjectRepository(UserHealthProfile)
    private readonly healthProfileRepository: Repository<UserHealthProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get or create user health profile
   */
  async getOrCreateHealthProfile(userId: string): Promise<UserHealthProfile> {
    let healthProfile = await this.healthProfileRepository.findOne({
      where: { userId },
    });

    if (!healthProfile) {
      this.logger.debug(`Creating new health profile for user: ${userId}`);
      
      healthProfile = this.healthProfileRepository.create({
        userId,
        micronutrients: {},
        biomarkers: {},
        healthConditions: {},
        healthTimeline: [],
        healthGoals: [],
        aiAnalysisHistory: [],
      });

      healthProfile = await this.healthProfileRepository.save(healthProfile);
    }

    return healthProfile;
  }

  /**
   * Extract and store health values from AI analysis
   * This replaces the old caching approach with structured data extraction
   */
  async extractAndStoreHealthValues(
    userId: string,
    aiResponse: string,
    analysisType: string,
    confidence: number,
    aiCost: number,
    dataSource: DataSource = DataSource.AI_ANALYSIS,
    sourceReportId?: string,
  ): Promise<UserHealthProfile> {
    this.logger.debug(`Extracting health values from AI analysis for user: ${userId}`);

    const healthProfile = await this.getOrCreateHealthProfile(userId);
    const extraction = this.parseAIResponseForHealthValues(aiResponse, analysisType);

    // Update micronutrients
    for (const nutrient of extraction.micronutrients) {
      healthProfile.updateMicronutrient(nutrient.nutrient, {
        currentValue: nutrient.currentValue,
        unit: nutrient.unit,
        status: nutrient.status,
        idealRange: nutrient.idealRange,
        trend: this.calculateTrend(healthProfile, 'micronutrients', nutrient.nutrient, nutrient.currentValue),
        lastMeasured: new Date(),
        dataSource,
        recommendations: nutrient.recommendations,
        targetImprovementDays: nutrient.targetImprovementDays,
      });

      // Add timeline event
      healthProfile.addHealthTimelineEvent({
        event: `${nutrient.nutrient} Analysis`,
        type: 'measurement',
        description: `${nutrient.nutrient} levels analyzed: ${nutrient.status} (${nutrient.currentValue} ${nutrient.unit})`,
        relatedMetrics: [nutrient.nutrient.toLowerCase()],
        dataSource,
      });
    }

    // Update biomarkers
    for (const biomarker of extraction.biomarkers) {
      healthProfile.updateBiomarker(biomarker.biomarker, {
        currentValue: biomarker.currentValue,
        unit: biomarker.unit,
        status: biomarker.status,
        referenceRange: biomarker.referenceRange,
        trend: this.calculateTrend(healthProfile, 'biomarkers', biomarker.biomarker, biomarker.currentValue),
        lastMeasured: new Date(),
        dataSource,
        clinicalSignificance: biomarker.clinicalSignificance,
        recommendations: biomarker.recommendations,
      });

      // Add timeline event
      healthProfile.addHealthTimelineEvent({
        event: `${biomarker.biomarker} Analysis`,
        type: 'measurement',
        description: `${biomarker.biomarker}: ${biomarker.currentValue} ${biomarker.unit} (${biomarker.status})`,
        relatedMetrics: [biomarker.biomarker.toLowerCase()],
        dataSource,
      });
    }

    // Update health conditions
    for (const condition of extraction.healthConditions) {
      healthProfile.updateHealthCondition(condition.condition, {
        status: condition.status,
        severity: condition.severity,
        lastAssessed: new Date(),
        dataSource,
        managementPlan: condition.managementPlan,
        relatedBiomarkers: condition.relatedBiomarkers,
        lifestyle_recommendations: condition.managementPlan.filter(plan => 
          plan.toLowerCase().includes('diet') || 
          plan.toLowerCase().includes('exercise') ||
          plan.toLowerCase().includes('lifestyle')
        ),
        monitoringFrequency: this.determineMonitoringFrequency(condition.severity, condition.condition),
      });

      // Add timeline event
      healthProfile.addHealthTimelineEvent({
        event: `${condition.condition} Assessment`,
        type: condition.status === 'active' ? 'diagnosis' : 'improvement',
        description: `${condition.condition} assessed as ${condition.severity} ${condition.status}`,
        relatedMetrics: condition.relatedBiomarkers,
        dataSource,
      });
    }

    // Update dietary profile if recommendations exist
    if (extraction.dietaryRecommendations.length > 0) {
      healthProfile.dietaryProfile = {
        recommendations: extraction.dietaryRecommendations,
        restrictions: this.extractDietaryRestrictions(extraction.dietaryRecommendations),
        preferences: [],
        lastUpdated: new Date(),
        dataSource,
      };
    }

    // Record AI analysis
    healthProfile.addAIAnalysis({
      analysisType,
      findings: this.extractFindings(extraction),
      recommendations: this.extractAllRecommendations(extraction),
      confidence,
      aiCost,
      dataSource,
    });

    // Update health scores
    healthProfile.healthScores = {
      overallHealth: healthProfile.calculateHealthScore(),
      nutritionalHealth: this.calculateNutritionalScore(healthProfile),
      metabolicHealth: this.calculateMetabolicScore(healthProfile),
      cardiovascularHealth: this.calculateCardiovascularScore(healthProfile),
      lastCalculated: new Date(),
    };

    return await this.healthProfileRepository.save(healthProfile);
  }

  /**
   * Get health insight for chat query
   * This replaces the old cache lookup with smart profile querying
   */
  async getHealthInsightForQuery(userId: string, query: string): Promise<string | null> {
    const healthProfile = await this.getOrCreateHealthProfile(userId);
    return healthProfile.getHealthInsightForQuery(query);
  }

  /**
   * Update health profile from new health report
   */
  async updateFromHealthReport(
    userId: string,
    healthReport: HealthReport,
    preserveExisting: boolean = true,
  ): Promise<UserHealthProfile> {
    this.logger.debug(`Updating health profile from new report for user: ${userId}`);

    const healthProfile = await this.getOrCreateHealthProfile(userId);

    // Extract values from health report (this would parse actual report data)
    const reportValues = await this.extractValuesFromHealthReport(healthReport);

    // Update each metric, preserving existing data if requested
    for (const value of reportValues.micronutrients) {
      const existing = healthProfile.micronutrients?.[value.nutrient.toLowerCase()];
      
      // Only update if new report has this metric OR we're not preserving existing
      if (value.currentValue !== null || !preserveExisting || !existing) {
        healthProfile.updateMicronutrient(value.nutrient, {
          ...value,
          dataSource: DataSource.HEALTH_REPORT,
          lastMeasured: healthReport.reportDate || new Date(),
        });
      }
    }

    // Similar logic for biomarkers and conditions...
    for (const value of reportValues.biomarkers) {
      const existing = healthProfile.biomarkers?.[value.biomarker.toLowerCase()];
      
      if (value.currentValue !== null || !preserveExisting || !existing) {
        healthProfile.updateBiomarker(value.biomarker, {
          ...value,
          dataSource: DataSource.HEALTH_REPORT,
          lastMeasured: healthReport.reportDate || new Date(),
        });
      }
    }

    // Add timeline event for new report
    healthProfile.addHealthTimelineEvent({
      event: 'New Health Report Processed',
      type: 'measurement',
      description: `Health report uploaded and processed: ${reportValues.micronutrients.length + reportValues.biomarkers.length} metrics updated`,
      relatedMetrics: [...reportValues.micronutrients.map(m => m.nutrient), ...reportValues.biomarkers.map(b => b.biomarker)],
      dataSource: DataSource.HEALTH_REPORT,
    });

    return await this.healthProfileRepository.save(healthProfile);
  }

  /**
   * Get health profile statistics
   */
  async getHealthProfileStats(userId: string): Promise<any> {
    const healthProfile = await this.getOrCreateHealthProfile(userId);
    
    const micronutrientCount = Object.keys(healthProfile.micronutrients || {}).length;
    const biomarkerCount = Object.keys(healthProfile.biomarkers || {}).length;
    const conditionCount = Object.keys(healthProfile.healthConditions || {}).length;
    
    const deficientNutrients = Object.values(healthProfile.micronutrients || {})
      .filter(n => n.status === HealthMetricStatus.DEFICIENT || n.status === HealthMetricStatus.LOW).length;

    const costSavings = healthProfile.aiAnalysisHistory.reduce((sum, analysis) => sum + analysis.aiCost, 0);

    return {
      totalMetrics: micronutrientCount + biomarkerCount + conditionCount,
      micronutrientCount,
      biomarkerCount,
      conditionCount,
      deficientNutrients,
      healthScore: healthProfile.calculateHealthScore(),
      totalAnalyses: healthProfile.aiAnalysisHistory.length,
      totalCostSavings: costSavings,
      lastUpdated: healthProfile.updatedAt,
      timelineEvents: healthProfile.healthTimeline.length,
    };
  }

  // Private helper methods

  private parseAIResponseForHealthValues(response: string, analysisType: string): HealthValueExtraction {
    const extraction: HealthValueExtraction = {
      micronutrients: [],
      biomarkers: [],
      healthConditions: [],
      dietaryRecommendations: [],
    };

    // This is a simplified parser - in production would use more sophisticated NLP
    const responseLower = response.toLowerCase();

    // Extract micronutrient deficiencies
    const micronutrientPatterns = [
      { name: 'Vitamin D', keywords: ['vitamin d', 'vit d', 'vitamin-d'], unit: 'ng/mL', idealRange: { min: 30, max: 100 } },
      { name: 'Iron', keywords: ['iron', 'ferritin'], unit: 'ng/mL', idealRange: { min: 12, max: 150 } },
      { name: 'Vitamin B12', keywords: ['b12', 'vitamin b12', 'cobalamin'], unit: 'pg/mL', idealRange: { min: 200, max: 900 } },
      { name: 'Magnesium', keywords: ['magnesium', 'mg'], unit: 'mg/dL', idealRange: { min: 1.7, max: 2.2 } },
      { name: 'Calcium', keywords: ['calcium', 'ca'], unit: 'mg/dL', idealRange: { min: 8.5, max: 10.2 } },
    ];

    for (const pattern of micronutrientPatterns) {
      if (pattern.keywords.some(keyword => responseLower.includes(keyword))) {
        let status = HealthMetricStatus.NORMAL;
        let recommendations = [`Maintain adequate ${pattern.name} levels through diet and sunlight/supplements`];
        let targetDays = undefined;

        if (responseLower.includes('deficient') || responseLower.includes('low')) {
          status = HealthMetricStatus.DEFICIENT;
          recommendations = [
            `Increase ${pattern.name} intake through food sources and supplements`,
            `Monitor ${pattern.name} levels regularly`,
            'Consult healthcare provider for appropriate supplementation',
          ];
          targetDays = this.getImprovementTimeline(pattern.name);
        } else if (responseLower.includes('high') || responseLower.includes('elevated')) {
          status = HealthMetricStatus.HIGH;
          recommendations = [`Reduce ${pattern.name} intake and recheck levels`];
        }

        // Try to extract actual value (simplified)
        const valueMatch = response.match(new RegExp(`${pattern.keywords[0]}[^\\d]*([\\d.]+)\\s*${pattern.unit}`, 'i'));
        const currentValue = valueMatch ? parseFloat(valueMatch[1]) : null;

        extraction.micronutrients.push({
          nutrient: pattern.name,
          currentValue,
          unit: pattern.unit,
          status,
          idealRange: pattern.idealRange,
          recommendations,
          targetImprovementDays: targetDays,
        });
      }
    }

    // Extract biomarkers
    const biomarkerPatterns = [
      { name: 'Total Cholesterol', keywords: ['cholesterol', 'total cholesterol'], unit: 'mg/dL', range: { min: 100, max: 200 } },
      { name: 'HbA1c', keywords: ['hba1c', 'glycated hemoglobin'], unit: '%', range: { min: 4.0, max: 5.6 } },
      { name: 'Blood Pressure', keywords: ['blood pressure', 'bp', 'hypertension'], unit: 'mmHg', range: { min: 90, max: 140 } },
      { name: 'ALT', keywords: ['alt', 'alanine aminotransferase'], unit: 'U/L', range: { min: 7, max: 40 } },
    ];

    for (const pattern of biomarkerPatterns) {
      if (pattern.keywords.some(keyword => responseLower.includes(keyword))) {
        let status = HealthMetricStatus.NORMAL;
        let significance = `${pattern.name} levels are within normal range`;
        let recommendations = [`Continue current lifestyle to maintain healthy ${pattern.name}`];

        if (responseLower.includes('high') || responseLower.includes('elevated')) {
          status = HealthMetricStatus.HIGH;
          significance = `Elevated ${pattern.name} may indicate health risks`;
          recommendations = [
            `Lifestyle modifications to reduce ${pattern.name}`,
            'Regular monitoring and follow-up',
            'Consider dietary changes and exercise',
          ];
        }

        const valueMatch = response.match(new RegExp(`${pattern.keywords[0]}[^\\d]*([\\d.]+)\\s*${pattern.unit}`, 'i'));
        const currentValue = valueMatch ? parseFloat(valueMatch[1]) : null;

        extraction.biomarkers.push({
          biomarker: pattern.name,
          currentValue,
          unit: pattern.unit,
          status,
          referenceRange: pattern.range,
          clinicalSignificance: significance,
          recommendations,
        });
      }
    }

    // Extract health conditions
    const conditionPatterns = [
      { name: 'Fatty Liver', keywords: ['fatty liver', 'hepatic steatosis'], severity: 'mild' as const },
      { name: 'Diabetes', keywords: ['diabetes', 'diabetic'], severity: 'moderate' as const },
      { name: 'Hypertension', keywords: ['hypertension', 'high blood pressure'], severity: 'moderate' as const },
    ];

    for (const pattern of conditionPatterns) {
      if (pattern.keywords.some(keyword => responseLower.includes(keyword))) {
        let status: 'active' | 'resolved' | 'monitoring' | 'risk' = 'monitoring';
        let severity = pattern.severity;

        if (responseLower.includes('severe') || responseLower.includes('advanced')) {
          severity = 'severe';
          status = 'active';
        } else if (responseLower.includes('mild') || responseLower.includes('early')) {
          severity = 'mild';
          status = 'monitoring';
        }

        extraction.healthConditions.push({
          condition: pattern.name,
          severity,
          status,
          managementPlan: this.getConditionManagementPlan(pattern.name),
          relatedBiomarkers: this.getRelatedBiomarkers(pattern.name),
        });
      }
    }

    // Extract dietary recommendations
    const dietPatterns = [
      'increase protein intake',
      'reduce sugar consumption',
      'increase fiber intake',
      'reduce sodium intake',
      'increase omega-3 fatty acids',
      'Mediterranean diet',
      'DASH diet',
      'low glycemic index foods',
    ];

    for (const pattern of dietPatterns) {
      if (responseLower.includes(pattern)) {
        extraction.dietaryRecommendations.push(pattern);
      }
    }

    return extraction;
  }

  private calculateTrend(
    healthProfile: UserHealthProfile,
    category: 'micronutrients' | 'biomarkers',
    metricName: string,
    currentValue: number,
  ): HealthMetricTrend {
    if (category === 'biomarkers' && healthProfile.biomarkers?.[metricName.toLowerCase()]) {
      const historical = healthProfile.biomarkers[metricName.toLowerCase()].historicalValues;
      if (historical.length >= 2) {
        const previous = historical[historical.length - 2].value;
        if (currentValue > previous) return HealthMetricTrend.IMPROVING;
        if (currentValue < previous) return HealthMetricTrend.DECLINING;
        return HealthMetricTrend.STABLE;
      }
    }
    return HealthMetricTrend.UNKNOWN;
  }

  private async extractValuesFromHealthReport(healthReport: HealthReport): Promise<HealthValueExtraction> {
    // This would parse actual health report data
    // For now, return empty extraction - would be implemented based on actual report format
    return {
      micronutrients: [],
      biomarkers: [],
      healthConditions: [],
      dietaryRecommendations: [],
    };
  }

  private getImprovementTimeline(nutrient: string): number {
    const timelines: Record<string, number> = {
      'Iron': 60, // 8-12 weeks
      'Vitamin D': 45, // 6-8 weeks  
      'Vitamin B12': 30, // 4-6 weeks
      'Magnesium': 21, // 3-4 weeks
      'Calcium': 30, // 4-6 weeks
    };
    return timelines[nutrient] || 30;
  }

  private getConditionManagementPlan(condition: string): string[] {
    const plans: Record<string, string[]> = {
      'Fatty Liver': [
        'Reduce alcohol consumption',
        'Follow low-fat, high-fiber diet',
        'Regular exercise and weight management',
        'Monitor liver enzymes regularly',
      ],
      'Diabetes': [
        'Maintain blood glucose levels',
        'Follow diabetic diet plan',
        'Regular physical activity',
        'Medication compliance',
        'Regular HbA1c monitoring',
      ],
      'Hypertension': [
        'Reduce sodium intake',
        'Maintain healthy weight',
        'Regular exercise',
        'Stress management',
        'Blood pressure monitoring',
      ],
    };
    return plans[condition] || ['Regular monitoring and lifestyle modifications'];
  }

  private getRelatedBiomarkers(condition: string): string[] {
    const relations: Record<string, string[]> = {
      'Fatty Liver': ['alt', 'ast', 'triglycerides'],
      'Diabetes': ['hba1c', 'fasting glucose', 'insulin'],
      'Hypertension': ['blood pressure', 'sodium', 'potassium'],
    };
    return relations[condition] || [];
  }

  private determineMonitoringFrequency(severity: string, condition: string): 'daily' | 'weekly' | 'monthly' | 'quarterly' {
    if (severity === 'severe') return 'weekly';
    if (severity === 'moderate') return 'monthly';
    return 'quarterly';
  }

  private calculateNutritionalScore(profile: UserHealthProfile): number {
    const micronutrients = Object.values(profile.micronutrients || {});
    if (micronutrients.length === 0) return 85;

    const totalScore = micronutrients.reduce((sum, m) => {
      switch (m.status) {
        case HealthMetricStatus.OPTIMAL: return sum + 100;
        case HealthMetricStatus.NORMAL: return sum + 85;
        case HealthMetricStatus.LOW: return sum + 60;
        case HealthMetricStatus.DEFICIENT: return sum + 30;
        default: return sum + 70;
      }
    }, 0);

    return Math.round(totalScore / micronutrients.length);
  }

  private calculateMetabolicScore(profile: UserHealthProfile): number {
    const metabolicMarkers = ['hba1c', 'fasting glucose', 'insulin', 'triglycerides'];
    const relevantBiomarkers = Object.entries(profile.biomarkers || {})
      .filter(([key]) => metabolicMarkers.some(marker => key.includes(marker.toLowerCase())));

    if (relevantBiomarkers.length === 0) return 85;

    const totalScore = relevantBiomarkers.reduce((sum, [, biomarker]) => {
      switch (biomarker.status) {
        case HealthMetricStatus.OPTIMAL: return sum + 100;
        case HealthMetricStatus.NORMAL: return sum + 85;
        case HealthMetricStatus.HIGH: return sum + 60;
        case HealthMetricStatus.UNKNOWN: return sum + 30;
        default: return sum + 70;
      }
    }, 0);

    return Math.round(totalScore / relevantBiomarkers.length);
  }

  private calculateCardiovascularScore(profile: UserHealthProfile): number {
    const cvMarkers = ['cholesterol', 'blood pressure', 'triglycerides', 'ldl', 'hdl'];
    const relevantBiomarkers = Object.entries(profile.biomarkers || {})
      .filter(([key]) => cvMarkers.some(marker => key.includes(marker.toLowerCase())));

    if (relevantBiomarkers.length === 0) return 85;

    const totalScore = relevantBiomarkers.reduce((sum, [, biomarker]) => {
      switch (biomarker.status) {
        case HealthMetricStatus.OPTIMAL: return sum + 100;
        case HealthMetricStatus.NORMAL: return sum + 85;
        case HealthMetricStatus.HIGH: return sum + 50;
        case HealthMetricStatus.UNKNOWN: return sum + 30;
        default: return sum + 70;
      }
    }, 0);

    return Math.round(totalScore / relevantBiomarkers.length);
  }

  private extractDietaryRestrictions(recommendations: string[]): string[] {
    const restrictions = [];
    for (const rec of recommendations) {
      if (rec.includes('reduce') || rec.includes('avoid') || rec.includes('limit')) {
        restrictions.push(rec);
      }
    }
    return restrictions;
  }

  private extractFindings(extraction: HealthValueExtraction): string[] {
    const findings = [];
    
    findings.push(...extraction.micronutrients.map(m => 
      `${m.nutrient}: ${m.status} (${m.currentValue || 'N/A'} ${m.unit})`
    ));
    
    findings.push(...extraction.biomarkers.map(b => 
      `${b.biomarker}: ${b.status} (${b.currentValue || 'N/A'} ${b.unit})`
    ));
    
    findings.push(...extraction.healthConditions.map(c => 
      `${c.condition}: ${c.severity} ${c.status}`
    ));

    return findings;
  }

  private extractAllRecommendations(extraction: HealthValueExtraction): string[] {
    const recommendations = [];
    
    extraction.micronutrients.forEach(m => recommendations.push(...m.recommendations));
    extraction.biomarkers.forEach(b => recommendations.push(...b.recommendations));
    extraction.healthConditions.forEach(c => recommendations.push(...c.managementPlan));
    recommendations.push(...extraction.dietaryRecommendations);

    return [...new Set(recommendations)]; // Remove duplicates
  }
}