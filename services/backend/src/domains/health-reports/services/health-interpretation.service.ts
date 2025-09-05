import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthReport } from '../entities/health-report.entity';
import { StructuredEntity, CriticalityLevel } from '../entities/structured-entity.entity';
import { AIRoutingService } from '../../ai-routing/services/ai-routing.service';
import { EnhancedAIProviderService } from '../../ai-routing/services/enhanced-ai-provider.service';
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
    private readonly enhancedAIProviderService: EnhancedAIProviderService,
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

    try {
      // Make real AI call using Enhanced AI Provider Service
      this.logger.log(`🚀 Making REAL AI call for health interpretation using ${routingResult.provider}`);
      
      const realAIResponse = await this.enhancedAIProviderService.callAIProvider(
        routingResult,
        prompt
      );

      // Extract and parse the AI response
      const aiResponseContent = this.extractResponseContent(realAIResponse);
      
      // Try to parse structured JSON response from AI
      const parsedInterpretation = this.parseAIInterpretationResponse(aiResponseContent, entities);
      
      if (parsedInterpretation) {
        this.logger.log(`✅ Successfully generated AI health interpretation`);
        return parsedInterpretation;
      }
      
      // If parsing fails, fall back to enhanced mock with AI insights
      this.logger.warn(`⚠️ Could not parse AI response, using enhanced mock with AI insights`);
      return this.generateEnhancedMockInterpretation(entities, aiResponseContent, options);
      
    } catch (error) {
      this.logger.error(`❌ AI health interpretation failed: ${error.message}`);
      
      // Fallback to enhanced mock interpretation
      this.logger.log(`🛡️ Falling back to enhanced mock health interpretation`);
      return this.generateEnhancedMockInterpretation(entities, null, options);
    }
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

  /**
   * Extract response content from Enhanced AI Provider response
   */
  private extractResponseContent(aiResponse: any): string {
    if (typeof aiResponse === 'string') {
      return aiResponse;
    }
    
    if (aiResponse.content) {
      return aiResponse.content;
    }
    
    if (aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message) {
      return aiResponse.choices[0].message.content;
    }
    
    if (aiResponse.text) {
      return aiResponse.text;
    }
    
    // Fallback for unknown response formats
    this.logger.warn('Unknown AI response format, attempting JSON stringify');
    return JSON.stringify(aiResponse);
  }

  /**
   * Parse AI interpretation response into structured format
   */
  private parseAIInterpretationResponse(
    aiResponseContent: string, 
    entities: StructuredEntity[]
  ): HealthInterpretation | null {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate that it has the required structure
        if (parsed.overallAssessment && parsed.categoryAssessments) {
          return parsed as HealthInterpretation;
        }
      }
      
      // If no valid JSON, try to extract structured information from text
      return this.extractStructuredInfoFromText(aiResponseContent, entities);
      
    } catch (error) {
      this.logger.warn(`Could not parse AI interpretation response: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract structured health information from AI text response
   */
  private extractStructuredInfoFromText(
    text: string, 
    entities: StructuredEntity[]
  ): HealthInterpretation {
    // Basic text analysis to extract insights
    const lines = text.split('\n').filter(line => line.trim());
    
    const keyFindings = lines
      .filter(line => line.toLowerCase().includes('elevated') || 
                     line.toLowerCase().includes('abnormal') || 
                     line.toLowerCase().includes('concern'))
      .slice(0, 3);
    
    const recommendations = lines
      .filter(line => line.toLowerCase().includes('recommend') || 
                     line.toLowerCase().includes('suggest') || 
                     line.toLowerCase().includes('should'))
      .slice(0, 3);

    return {
      overallAssessment: {
        status: this.determineStatusFromText(text),
        riskLevel: this.determineRiskFromText(text),
        score: this.calculateScoreFromEntities(entities),
        keyFindings: keyFindings.length > 0 ? keyFindings : ['AI analysis completed'],
        majorConcerns: this.extractConcernsFromText(text),
      },
      categoryAssessments: this.generateCategoryAssessments(entities),
      anomalies: this.generateAnomaliesFromEntities(entities),
      trends: [],
      recommendations: this.generateRecommendationsFromText(recommendations),
      redFlags: this.identifyRedFlags(entities),
      plainLanguageSummary: this.extractSummaryFromText(text, 'plain'),
      technicalSummary: this.extractSummaryFromText(text, 'technical'),
      confidence: 0.85, // AI-generated, slightly lower confidence than structured response
      interpretationDate: new Date(),
      processingTimeMs: 0,
    };
  }

  /**
   * Generate enhanced mock interpretation with AI insights
   */
  private generateEnhancedMockInterpretation(
    entities: StructuredEntity[], 
    aiInsights: string | null, 
    options: any
  ): HealthInterpretation {
    // Use AI insights if available, otherwise use structured analysis
    const baseInterpretation = this.generateStructuredInterpretation(entities, options);
    
    if (aiInsights) {
      // Enhance with AI insights
      baseInterpretation.plainLanguageSummary = this.enhanceWithAIInsights(
        baseInterpretation.plainLanguageSummary, 
        aiInsights
      );
      baseInterpretation.confidence = 0.88; // Higher confidence with AI enhancement
    }
    
    return baseInterpretation;
  }

  /**
   * Generate structured interpretation from entities
   */
  private generateStructuredInterpretation(
    entities: StructuredEntity[], 
    options: any
  ): HealthInterpretation {
    return {
      overallAssessment: {
        status: 'fair',
        riskLevel: 'moderate',
        score: this.calculateScoreFromEntities(entities),
        keyFindings: this.extractKeyFindings(entities),
        majorConcerns: this.extractMajorConcerns(entities),
      },
      categoryAssessments: this.generateCategoryAssessments(entities),
      anomalies: this.generateAnomaliesFromEntities(entities),
      trends: [],
      recommendations: this.generateStandardRecommendations(entities),
      redFlags: this.identifyRedFlags(entities),
      plainLanguageSummary: this.generatePlainLanguageSummary(entities),
      technicalSummary: this.generateTechnicalSummary(entities),
      confidence: 0.82,
      interpretationDate: new Date(),
      processingTimeMs: 0,
    };
  }

  // Helper methods for text analysis and interpretation
  private determineStatusFromText(text: string): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('excellent') || lowerText.includes('optimal')) return 'excellent';
    if (lowerText.includes('good') || lowerText.includes('normal')) return 'good';
    if (lowerText.includes('poor') || lowerText.includes('bad')) return 'poor';
    if (lowerText.includes('critical') || lowerText.includes('severe')) return 'critical';
    return 'fair';
  }

  private determineRiskFromText(text: string): 'low' | 'moderate' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('high risk') || lowerText.includes('significant risk')) return 'high';
    if (lowerText.includes('critical') || lowerText.includes('urgent')) return 'critical';
    if (lowerText.includes('low risk') || lowerText.includes('minimal risk')) return 'low';
    return 'moderate';
  }

  private extractConcernsFromText(text: string): string[] {
    const concerns = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('concern') || 
          line.toLowerCase().includes('risk') || 
          line.toLowerCase().includes('elevated')) {
        concerns.push(line.trim());
        if (concerns.length >= 3) break;
      }
    }
    
    return concerns.length > 0 ? concerns : ['Analysis completed - see detailed findings'];
  }

  private generateRecommendationsFromText(recommendations: string[]): HealthRecommendation[] {
    return recommendations.map((rec, index) => ({
      category: index === 0 ? 'lifestyle' : index === 1 ? 'medical' : 'monitoring',
      priority: 'medium' as const,
      recommendation: rec.trim(),
      rationale: 'Based on AI analysis of health data',
      timeframe: 'As recommended by healthcare provider',
      followUpRequired: true,
    }));
  }

  private extractSummaryFromText(text: string, type: 'plain' | 'technical'): string {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
    
    if (paragraphs.length > 0) {
      return paragraphs[0]; // Use first substantial paragraph
    }
    
    return type === 'plain' 
      ? 'Your health report has been analyzed. Please review the detailed findings below.'
      : 'Comprehensive analysis completed based on available biomarker data.';
  }

  private enhanceWithAIInsights(baseSummary: string, aiInsights: string): string {
    // Combine base summary with AI insights
    return `${baseSummary}\n\nAI Analysis: ${aiInsights.substring(0, 200)}...`;
  }

  // Additional helper methods for structured analysis
  private calculateScoreFromEntities(entities: StructuredEntity[]): number {
    const criticalCount = entities.filter(e => e.criticalityLevel === CriticalityLevel.CRITICAL).length;
    const highCount = entities.filter(e => e.criticalityLevel === CriticalityLevel.HIGH).length;
    const totalCount = entities.length;
    
    if (totalCount === 0) return 70;
    
    const score = 100 - (criticalCount * 30) - (highCount * 15);
    return Math.max(30, Math.min(100, score));
  }

  private extractKeyFindings(entities: StructuredEntity[]): string[] {
    return entities
      .filter(e => e.criticalityLevel === CriticalityLevel.HIGH || e.criticalityLevel === CriticalityLevel.CRITICAL)
      .slice(0, 3)
      .map(e => `${e.entityName}: ${e.extractedValue} ${e.unit || ''}`)
      .concat(['Analysis based on available biomarkers']);
  }

  private extractMajorConcerns(entities: StructuredEntity[]): string[] {
    return entities
      .filter(e => e.criticalityLevel === CriticalityLevel.CRITICAL)
      .slice(0, 2)
      .map(e => `Critical finding in ${e.entityName}`);
  }

  private generateCategoryAssessments(entities: StructuredEntity[]): CategoryAssessment[] {
    // Group entities by category and create assessments
    const categories = [...new Set(entities.map(e => e.category || 'General'))];
    
    return categories.map(category => {
      const categoryEntities = entities.filter(e => (e.category || 'General') === category);
      const abnormalEntities = categoryEntities.filter(e => 
        e.criticalityLevel === CriticalityLevel.HIGH || e.criticalityLevel === CriticalityLevel.CRITICAL
      );
      
      return {
        category,
        status: abnormalEntities.length > 0 ? 'abnormal' : 'normal',
        score: this.calculateCategoryScore(categoryEntities),
        findings: abnormalEntities.map(e => `${e.entityName} findings noted`),
        abnormalValues: abnormalEntities.map(e => ({
          entityName: e.entityName,
          value: e.extractedValue,
          unit: e.unit || '',
          deviation: 'Requires attention',
          significance: 'Clinical significance noted',
        })),
      };
    });
  }

  private calculateCategoryScore(entities: StructuredEntity[]): number {
    const scores = entities.map(e => {
      switch (e.criticalityLevel) {
        case CriticalityLevel.CRITICAL: return 40;
        case CriticalityLevel.HIGH: return 60;
        case CriticalityLevel.MEDIUM: return 80;
        default: return 95;
      }
    });
    
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
  }

  private generateAnomaliesFromEntities(entities: StructuredEntity[]): HealthAnomaly[] {
    return entities
      .filter(e => e.criticalityLevel === CriticalityLevel.HIGH || e.criticalityLevel === CriticalityLevel.CRITICAL)
      .map(e => ({
        entityName: e.entityName,
        currentValue: e.extractedValue,
        unit: e.unit || '',
        referenceRange: e.normalRange || 'Within normal limits',
        deviation: e.criticalityLevel === CriticalityLevel.CRITICAL ? -20 : -10,
        severity: e.criticalityLevel === CriticalityLevel.CRITICAL ? 'high' : 'moderate',
        clinicalSignificance: `${e.entityName} requires attention`,
        possibleCauses: ['Multiple factors may contribute'],
        immediateAction: e.criticalityLevel === CriticalityLevel.CRITICAL,
      }));
  }

  private generateStandardRecommendations(entities: StructuredEntity[]): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [
      {
        category: 'monitoring',
        priority: 'high',
        recommendation: 'Follow up with healthcare provider to discuss results',
        rationale: 'Professional interpretation of health data is recommended',
        timeframe: 'Within 2 weeks',
        followUpRequired: true,
      },
    ];

    if (entities.some(e => e.criticalityLevel === CriticalityLevel.CRITICAL)) {
      recommendations.unshift({
        category: 'medical',
        priority: 'high',
        recommendation: 'Immediate medical consultation recommended',
        rationale: 'Critical findings identified in health report',
        timeframe: 'Within 24-48 hours',
        followUpRequired: true,
      });
    }

    return recommendations;
  }

  private identifyRedFlags(entities: StructuredEntity[]): RedFlag[] {
    return entities
      .filter(e => e.criticalityLevel === CriticalityLevel.CRITICAL)
      .map(e => ({
        severity: 'high' as const,
        finding: `Critical finding: ${e.entityName}`,
        clinicalReason: 'Requires immediate attention',
        recommendedAction: 'Consult healthcare provider immediately',
        timeframe: 'within_24_hours' as const,
        specialistConsultation: 'As recommended by primary care physician',
      }));
  }

  private generatePlainLanguageSummary(entities: StructuredEntity[]): string {
    const criticalCount = entities.filter(e => e.criticalityLevel === CriticalityLevel.CRITICAL).length;
    const highCount = entities.filter(e => e.criticalityLevel === CriticalityLevel.HIGH).length;
    
    if (criticalCount > 0) {
      return 'Your health report shows some results that need immediate attention. Please contact your healthcare provider to discuss these findings and next steps.';
    }
    
    if (highCount > 0) {
      return 'Your health report shows some areas that may need attention. We recommend discussing these results with your healthcare provider.';
    }
    
    return 'Your health report has been analyzed. Most values appear to be within expected ranges, but please review with your healthcare provider for complete interpretation.';
  }

  private generateTechnicalSummary(entities: StructuredEntity[]): string {
    const totalEntities = entities.length;
    const abnormalEntities = entities.filter(e => 
      e.criticalityLevel === CriticalityLevel.HIGH || e.criticalityLevel === CriticalityLevel.CRITICAL
    ).length;
    
    return `Analysis of ${totalEntities} biomarkers revealed ${abnormalEntities} values requiring clinical attention. Comprehensive interpretation recommended with healthcare provider consultation.`;
  }
}
