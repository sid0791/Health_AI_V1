import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthReport } from '../entities/health-report.entity';
import { StructuredEntity, CriticalityLevel } from '../entities/structured-entity.entity';
import { AIRoutingService } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';

export interface HealthInterpretation {
  overallAssessment: OverallAssessment;
  categoryAssessments: CategoryAssessment[];
  anomalies: HealthAnomaly[];
  trends: HealthTrend[];
  recommendations: HealthRecommendation[];
  redFlags: RedFlag[];
  plainLanguageSummary: string;
  technicalSummary: string;
  confidence: number;
  interpretationDate: Date;
  aiProvider?: string;
  processingTimeMs: number;
}

export interface OverallAssessment {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  score: number; // 0-100
  keyFindings: string[];
  majorConcerns: string[];
}

export interface CategoryAssessment {
  category: string;
  status: 'normal' | 'borderline' | 'abnormal' | 'critical';
  score: number; // 0-100
  findings: string[];
  abnormalValues: {
    entityName: string;
    value: any;
    unit: string;
    deviation: string;
    significance: string;
  }[];
}

export interface HealthAnomaly {
  entityName: string;
  currentValue: any;
  unit: string;
  referenceRange: string;
  deviation: number; // percentage deviation
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  clinicalSignificance: string;
  possibleCauses: string[];
  immediateAction: boolean;
}

export interface HealthTrend {
  entityName: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  rate: string; // "slowly", "rapidly", "moderately"
  clinicalImplication: string;
  recommendedMonitoring: string;
}

export interface HealthRecommendation {
  category: 'lifestyle' | 'medical' | 'nutrition' | 'exercise' | 'monitoring';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  timeframe: string;
  followUpRequired: boolean;
}

export interface RedFlag {
  severity: 'urgent' | 'high' | 'moderate';
  finding: string;
  clinicalReason: string;
  recommendedAction: string;
  timeframe: 'immediate' | 'within_24h' | 'within_week';
  specialistConsultation: string | null;
}

@Injectable()
export class HealthInterpretationService {
  private readonly logger = new Logger(HealthInterpretationService.name);

  constructor(
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
    @InjectRepository(StructuredEntity)
    private readonly structuredEntityRepository: Repository<StructuredEntity>,
    private readonly configService: ConfigService,
    private readonly aiRoutingService: AIRoutingService,
  ) {}

  /**
   * Generate comprehensive health interpretation from structured entities
   */
  async interpretHealthReport(
    healthReportId: string,
    options: {
      userId?: string;
      sessionId?: string;
      userAge?: number;
      userGender?: 'male' | 'female';
      userHistory?: any;
      previousReports?: HealthReport[];
    } = {},
  ): Promise<HealthInterpretation> {
    const startTime = Date.now();
    this.logger.debug(`Starting health interpretation for report: ${healthReportId}`);

    try {
      // Get health report and structured entities
      const healthReport = await this.healthReportRepository.findOne({
        where: { id: healthReportId },
        relations: ['structuredEntities'],
      });

      if (!healthReport) {
        throw new Error(`Health report not found: ${healthReportId}`);
      }

      if (!healthReport.structuredEntities || healthReport.structuredEntities.length === 0) {
        throw new Error('No structured entities found for interpretation');
      }

      // Use AI routing for Level 1 (highest accuracy) interpretation
      const routingResult = await this.aiRoutingService.routeRequest({
        userId: options.userId,
        sessionId: options.sessionId,
        requestType: RequestType.HEALTH_REPORT_ANALYSIS,
        contextTokens: this.estimateContextTokens(healthReport.structuredEntities),
        maxResponseTokens: 3000,
        accuracyRequirement: 0.95, // High accuracy for health interpretation
      });

      // Generate interpretation using AI
      const aiInterpretation = await this.generateAIInterpretation(
        healthReport.structuredEntities,
        routingResult,
        options,
      );

      // Enhance with rule-based analysis
      const ruleBasedAnalysis = this.performRuleBasedAnalysis(
        healthReport.structuredEntities,
        options,
      );

      // Merge interpretations
      const interpretation = this.mergeInterpretations(aiInterpretation, ruleBasedAnalysis);

      // Final validation and safety checks
      const validatedInterpretation = this.validateInterpretation(interpretation);

      validatedInterpretation.processingTimeMs = Date.now() - startTime;
      validatedInterpretation.interpretationDate = new Date();
      validatedInterpretation.aiProvider = routingResult.provider;

      this.logger.log(
        `Health interpretation completed in ${validatedInterpretation.processingTimeMs}ms`,
      );
      return validatedInterpretation;
    } catch (error) {
      this.logger.error(`Health interpretation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate AI-powered interpretation
   */
  private async generateAIInterpretation(
    entities: StructuredEntity[],
    routingResult: any,
    options: any,
  ): Promise<HealthInterpretation> {
    const prompt = this.buildInterpretationPrompt(entities, options);

    // Mock AI response - in production, this would call the actual AI provider
    // The response would be parsed from structured JSON returned by the AI

    const mockInterpretation: HealthInterpretation = {
      overallAssessment: {
        status: 'fair',
        riskLevel: 'moderate',
        score: 72,
        keyFindings: [
          'Elevated LDL cholesterol indicating cardiovascular risk',
          'Borderline diabetes markers requiring attention',
          'Vitamin D deficiency affecting bone health',
        ],
        majorConcerns: [
          'Increased risk of cardiovascular disease',
          'Pre-diabetic condition developing',
        ],
      },
      categoryAssessments: [
        {
          category: 'Lipid Profile',
          status: 'abnormal',
          score: 68,
          findings: ['LDL cholesterol elevated above optimal range'],
          abnormalValues: [
            {
              entityName: 'LDL Cholesterol',
              value: 115,
              unit: 'mg/dL',
              deviation: '15% above optimal',
              significance: 'Moderately elevated - increases cardiovascular risk',
            },
          ],
        },
        {
          category: 'Diabetes Panel',
          status: 'borderline',
          score: 75,
          findings: ['Fasting glucose slightly elevated', 'HbA1c in pre-diabetic range'],
          abnormalValues: [
            {
              entityName: 'Fasting Glucose',
              value: 102,
              unit: 'mg/dL',
              deviation: '2% above normal',
              significance: 'Slightly elevated - monitor for diabetes development',
            },
            {
              entityName: 'HbA1c',
              value: 5.8,
              unit: '%',
              deviation: '1.8% above normal',
              significance: 'Pre-diabetic range - lifestyle intervention needed',
            },
          ],
        },
        {
          category: 'Vitamin Levels',
          status: 'abnormal',
          score: 60,
          findings: ['Vitamin D deficiency'],
          abnormalValues: [
            {
              entityName: 'Vitamin D',
              value: 28,
              unit: 'ng/mL',
              deviation: '6.7% below normal',
              significance: 'Deficient - bone health and immune function affected',
            },
          ],
        },
      ],
      anomalies: [
        {
          entityName: 'LDL Cholesterol',
          currentValue: 115,
          unit: 'mg/dL',
          referenceRange: '<100 mg/dL',
          deviation: 15,
          severity: 'moderate',
          clinicalSignificance: 'Increased cardiovascular disease risk',
          possibleCauses: ['Diet high in saturated fats', 'Lack of exercise', 'Genetic factors'],
          immediateAction: false,
        },
        {
          entityName: 'Vitamin D',
          currentValue: 28,
          unit: 'ng/mL',
          referenceRange: '30-100 ng/mL',
          deviation: -6.7,
          severity: 'mild',
          clinicalSignificance: 'Compromised bone health and immune function',
          possibleCauses: ['Limited sun exposure', 'Inadequate dietary intake', 'Poor absorption'],
          immediateAction: false,
        },
      ],
      trends: [
        {
          entityName: 'HbA1c',
          direction: 'increasing',
          rate: 'slowly',
          clinicalImplication: 'Gradual progression toward diabetes',
          recommendedMonitoring: 'Recheck in 3-6 months with lifestyle modifications',
        },
      ],
      recommendations: [
        {
          category: 'lifestyle',
          priority: 'high',
          recommendation:
            'Adopt heart-healthy diet low in saturated fats and refined carbohydrates',
          rationale: 'To reduce LDL cholesterol and improve glucose control',
          timeframe: 'Start immediately, reassess in 3 months',
          followUpRequired: true,
        },
        {
          category: 'exercise',
          priority: 'high',
          recommendation: 'Begin regular aerobic exercise 150 minutes per week',
          rationale: 'Improves insulin sensitivity and cardiovascular health',
          timeframe: 'Start within 1 week, build up gradually',
          followUpRequired: true,
        },
        {
          category: 'medical',
          priority: 'medium',
          recommendation: 'Vitamin D supplementation 1000-2000 IU daily',
          rationale: 'To correct deficiency and support bone health',
          timeframe: 'Start immediately, recheck levels in 3 months',
          followUpRequired: true,
        },
        {
          category: 'monitoring',
          priority: 'high',
          recommendation: 'Repeat lipid panel and diabetes screening in 3 months',
          rationale: 'Monitor response to lifestyle interventions',
          timeframe: '3 months',
          followUpRequired: true,
        },
      ],
      redFlags: [
        {
          severity: 'moderate',
          finding: 'Pre-diabetic HbA1c level',
          clinicalReason: 'Risk of progression to Type 2 diabetes',
          recommendedAction: 'Implement intensive lifestyle modifications',
          timeframe: 'within_week',
          specialistConsultation: 'Endocrinologist if no improvement in 6 months',
        },
      ],
      plainLanguageSummary: `
Your recent health report shows several areas that need attention. Your cholesterol levels indicate an increased risk for heart disease, with your "bad" cholesterol (LDL) being higher than recommended. You're also showing early signs of diabetes risk, with your blood sugar and long-term sugar control (HbA1c) being slightly elevated. Additionally, your vitamin D level is low, which can affect your bones and immune system.

The good news is that these issues can often be improved with lifestyle changes. A heart-healthy diet, regular exercise, and vitamin D supplementation can make a significant difference. It's important to follow up with your healthcare provider to monitor your progress.
      `.trim(),
      technicalSummary: `
Laboratory analysis reveals multiple cardiovascular and metabolic risk factors. LDL cholesterol at 115 mg/dL exceeds optimal targets (<100 mg/dL), contributing to atherogenic risk. Glucose metabolism shows early dysfunction with fasting glucose of 102 mg/dL and HbA1c of 5.8%, both in pre-diabetic ranges. Vitamin D insufficiency at 28 ng/mL may compound metabolic and cardiovascular risks. Immediate lifestyle interventions are indicated with close monitoring for progression.
      `.trim(),
      confidence: 0.92,
      interpretationDate: new Date(),
      processingTimeMs: 0,
    };

    return mockInterpretation;
  }

  /**
   * Perform rule-based analysis for validation
   */
  private performRuleBasedAnalysis(
    entities: StructuredEntity[],
    options: any,
  ): Partial<HealthInterpretation> {
    const anomalies: HealthAnomaly[] = [];
    const redFlags: RedFlag[] = [];
    let riskScore = 100; // Start with perfect score

    for (const entity of entities) {
      // Check for critical values that require immediate attention
      if (
        entity.criticalityLevel === CriticalityLevel.CRITICAL_HIGH ||
        entity.criticalityLevel === CriticalityLevel.CRITICAL_LOW
      ) {
        redFlags.push({
          severity: 'urgent',
          finding: `Critical ${entity.entityName}: ${entity.getValue()} ${entity.unit}`,
          clinicalReason: 'Value outside safe physiological range',
          recommendedAction: 'Immediate medical evaluation required',
          timeframe: 'immediate',
          specialistConsultation: this.getSpecialistForEntity(entity.entityName),
        });

        riskScore -= 30;
      }

      // Check for abnormal values
      if (entity.isAbnormal) {
        const deviation = entity.calculateDeviationFromRange();
        if (deviation !== null) {
          anomalies.push({
            entityName: entity.entityName,
            currentValue: entity.getValue(),
            unit: entity.unit || '',
            referenceRange: entity.referenceRangeText || 'Normal range',
            deviation: Math.abs(deviation),
            severity: this.categorizeSeverity(Math.abs(deviation)),
            clinicalSignificance: this.getClinicalSignificance(entity),
            possibleCauses: this.getPossibleCauses(entity),
            immediateAction: Math.abs(deviation) > 50,
          });

          riskScore -= Math.min(20, Math.abs(deviation) / 2);
        }
      }
    }

    return {
      anomalies,
      redFlags,
      overallAssessment: {
        score: Math.max(0, Math.round(riskScore)),
        riskLevel: this.categorizeRisk(riskScore),
        status: this.categorizeOverallStatus(riskScore),
        keyFindings: [],
        majorConcerns: [],
      },
    };
  }

  /**
   * Merge AI and rule-based interpretations
   */
  private mergeInterpretations(
    aiInterpretation: HealthInterpretation,
    ruleBasedAnalysis: Partial<HealthInterpretation>,
  ): HealthInterpretation {
    return {
      ...aiInterpretation,
      // Merge anomalies, prioritizing rule-based critical findings
      anomalies: [
        ...aiInterpretation.anomalies,
        ...(ruleBasedAnalysis.anomalies || []).filter(
          (ruleAnomaly) =>
            !aiInterpretation.anomalies.some(
              (aiAnomaly) => aiAnomaly.entityName === ruleAnomaly.entityName,
            ),
        ),
      ],
      // Merge red flags, prioritizing urgent ones
      redFlags: [
        ...(ruleBasedAnalysis.redFlags || []).filter((flag) => flag.severity === 'urgent'),
        ...aiInterpretation.redFlags,
        ...(ruleBasedAnalysis.redFlags || []).filter((flag) => flag.severity !== 'urgent'),
      ],
      // Use more conservative overall assessment
      overallAssessment: {
        ...aiInterpretation.overallAssessment,
        score: Math.min(
          aiInterpretation.overallAssessment.score,
          ruleBasedAnalysis.overallAssessment?.score || 100,
        ),
        riskLevel: this.getHigherRiskLevel(
          aiInterpretation.overallAssessment.riskLevel,
          ruleBasedAnalysis.overallAssessment?.riskLevel || 'low',
        ),
      },
    };
  }

  /**
   * Validate interpretation for safety
   */
  private validateInterpretation(interpretation: HealthInterpretation): HealthInterpretation {
    // Ensure urgent red flags are properly prioritized
    interpretation.redFlags.sort((a, b) => {
      const severityOrder = { urgent: 3, high: 2, moderate: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    // Ensure recommendations are properly prioritized
    interpretation.recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Add safety disclaimers
    if (interpretation.redFlags.some((flag) => flag.severity === 'urgent')) {
      interpretation.plainLanguageSummary =
        'IMPORTANT: This report contains urgent findings that require immediate medical attention. ' +
        interpretation.plainLanguageSummary;
    }

    return interpretation;
  }

  /**
   * Build interpretation prompt for AI
   */
  private buildInterpretationPrompt(entities: StructuredEntity[], options: any): string {
    const entitiesData = entities.map((entity) => ({
      name: entity.entityName,
      value: entity.getValue(),
      unit: entity.unit,
      referenceRange: entity.referenceRangeText,
      isAbnormal: entity.isAbnormal,
      category: entity.category,
    }));

    return `
Provide a comprehensive medical interpretation of the following lab results. Consider the patient profile:
- Age: ${options.userAge || 'Not specified'}
- Gender: ${options.userGender || 'Not specified'}

Lab Results:
${JSON.stringify(entitiesData, null, 2)}

Please provide:
1. Overall health assessment with risk stratification
2. Category-specific analysis for each test panel
3. Identification of abnormal values with clinical significance
4. Health recommendations prioritized by importance
5. Any red flags requiring immediate attention
6. Plain language summary for patient understanding
7. Technical summary for healthcare providers

Focus on:
- Cardiovascular risk factors
- Diabetes and metabolic health
- Nutritional deficiencies
- Kidney and liver function
- Any critical values requiring urgent care

Return structured analysis in JSON format.
    `;
  }

  /**
   * Estimate context tokens for AI routing
   */
  private estimateContextTokens(entities: StructuredEntity[]): number {
    // Estimate based on entity data complexity
    const baseTokens = 500; // Base prompt
    const entityTokens = entities.length * 50; // ~50 tokens per entity
    return baseTokens + entityTokens;
  }

  /**
   * Get specialist recommendation for entity
   */
  private getSpecialistForEntity(entityName: string): string | null {
    const specialistMap: Record<string, string> = {
      'Total Cholesterol': 'Cardiologist',
      'LDL Cholesterol': 'Cardiologist',
      'HDL Cholesterol': 'Cardiologist',
      Triglycerides: 'Cardiologist',
      'Fasting Glucose': 'Endocrinologist',
      HbA1c: 'Endocrinologist',
      TSH: 'Endocrinologist',
      'Free T4': 'Endocrinologist',
      Creatinine: 'Nephrologist',
      BUN: 'Nephrologist',
      ALT: 'Hepatologist',
      AST: 'Hepatologist',
      Hemoglobin: 'Hematologist',
    };

    return specialistMap[entityName] || null;
  }

  /**
   * Categorize severity based on deviation percentage
   */
  private categorizeSeverity(deviation: number): 'mild' | 'moderate' | 'severe' | 'critical' {
    if (deviation > 75) return 'critical';
    if (deviation > 50) return 'severe';
    if (deviation > 25) return 'moderate';
    return 'mild';
  }

  /**
   * Get clinical significance for entity
   */
  private getClinicalSignificance(entity: StructuredEntity): string {
    const significanceMap: Record<string, string> = {
      'LDL Cholesterol': 'Increased cardiovascular disease risk',
      'HDL Cholesterol': 'Reduced cardiovascular protection',
      'Fasting Glucose': 'Impaired glucose metabolism',
      HbA1c: 'Poor long-term glucose control',
      'Vitamin D': 'Compromised bone health and immune function',
      Hemoglobin: 'Potential anemia or blood disorder',
    };

    return significanceMap[entity.entityName] || 'May indicate underlying health condition';
  }

  /**
   * Get possible causes for abnormal entity
   */
  private getPossibleCauses(entity: StructuredEntity): string[] {
    const causesMap: Record<string, string[]> = {
      'LDL Cholesterol': [
        'High saturated fat diet',
        'Lack of exercise',
        'Genetic factors',
        'Hypothyroidism',
      ],
      'Fasting Glucose': ['Pre-diabetes', 'Insulin resistance', 'Stress', 'Medications'],
      'Vitamin D': ['Limited sun exposure', 'Poor dietary intake', 'Malabsorption'],
      Hemoglobin: ['Iron deficiency', 'Chronic disease', 'Blood loss', 'Kidney disease'],
    };

    return causesMap[entity.entityName] || ['Various medical conditions', 'Lifestyle factors'];
  }

  /**
   * Categorize overall risk level
   */
  private categorizeRisk(score: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (score >= 85) return 'low';
    if (score >= 70) return 'moderate';
    if (score >= 50) return 'high';
    return 'critical';
  }

  /**
   * Categorize overall status
   */
  private categorizeOverallStatus(
    score: number,
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 65) return 'fair';
    if (score >= 50) return 'poor';
    return 'critical';
  }

  /**
   * Get higher risk level between two assessments
   */
  private getHigherRiskLevel(
    risk1: string,
    risk2: string,
  ): 'low' | 'moderate' | 'high' | 'critical' {
    const riskOrder = { low: 1, moderate: 2, high: 3, critical: 4 };
    const maxRisk = Math.max(riskOrder[risk1] || 1, riskOrder[risk2] || 1);

    const reverseOrder = { 1: 'low', 2: 'moderate', 3: 'high', 4: 'critical' };
    return reverseOrder[maxRisk] as 'low' | 'moderate' | 'high' | 'critical';
  }
}
