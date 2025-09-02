import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { AIRoutingService, AIRoutingRequest } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';
import { HealthReport } from '../../health-reports/entities/health-report.entity';

// Entity to store health analysis cache
export interface HealthAnalysisCache {
  id: string;
  userId: string;
  healthReportId?: string;
  analysisType: HealthAnalysisType;
  query: string;
  queryHash: string; // For quick lookups
  aiResponse: string;
  aiProvider: string;
  aiModel: string;
  confidence: number;
  validUntil: Date;
  extractedInsights: HealthInsights;
  relatedBiomarkers: string[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
  usageCount: number;
}

export enum HealthAnalysisType {
  HEALTH_REPORT_SUMMARY = 'health_report_summary',
  BIOMARKER_ANALYSIS = 'biomarker_analysis',
  NUTRIENT_DEFICIENCY = 'nutrient_deficiency',
  HEALTH_RISK_ASSESSMENT = 'health_risk_assessment',
  MICRONUTRIENT_STATUS = 'micronutrient_status',
  METABOLIC_ANALYSIS = 'metabolic_analysis',
  HORMONE_ANALYSIS = 'hormone_analysis',
  CARDIAC_RISK = 'cardiac_risk',
  LIVER_FUNCTION = 'liver_function',
  KIDNEY_FUNCTION = 'kidney_function',
  THYROID_ANALYSIS = 'thyroid_analysis',
}

export interface HealthInsights {
  deficiencies: Array<{
    nutrient: string;
    severity: 'mild' | 'moderate' | 'severe';
    currentValue?: number;
    normalRange?: string;
    improvementTimeline: number; // days to normalize
    dietaryFocus: string[];
  }>;
  excesses: Array<{
    parameter: string;
    severity: 'mild' | 'moderate' | 'severe';
    currentValue?: number;
    normalRange?: string;
    reductionTimeline: number; // days to normalize
    restrictions: string[];
  }>;
  risks: Array<{
    riskType: string;
    level: 'low' | 'moderate' | 'high';
    factors: string[];
    mitigation: string[];
  }>;
  healthScore: number; // 0-100
  keyRecommendations: string[];
}

export interface CachedAnalysisResult {
  fromCache: boolean;
  response: string;
  insights: HealthInsights;
  analysisType: HealthAnalysisType;
  confidence: number;
  lastAnalyzed: Date;
  validUntil: Date;
  aiProvider: string;
  aiModel: string;
}

@Injectable()
export class HealthAnalysisCacheService {
  private readonly logger = new Logger(HealthAnalysisCacheService.name);

  // In-memory cache for frequent queries (would be Redis in production)
  private memoryCache = new Map<string, HealthAnalysisCache>();

  constructor(
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
    private readonly aiRoutingService: AIRoutingService,
    private readonly configService: ConfigService,
  ) {
    // Cleanup expired cache entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Get or generate health analysis for a query
   */
  async getHealthAnalysis(
    userId: string,
    query: string,
    analysisType: HealthAnalysisType,
    healthReportId?: string,
  ): Promise<CachedAnalysisResult> {
    this.logger.debug(`Getting health analysis for user ${userId}, type: ${analysisType}`);

    const queryHash = this.generateQueryHash(userId, query, analysisType, healthReportId);

    // Check memory cache first
    const memoryResult = this.memoryCache.get(queryHash);
    if (memoryResult && memoryResult.validUntil > new Date()) {
      this.logger.debug('Health analysis found in memory cache');
      memoryResult.lastUsedAt = new Date();
      memoryResult.usageCount++;
      
      return {
        fromCache: true,
        response: memoryResult.aiResponse,
        insights: memoryResult.extractedInsights,
        analysisType: memoryResult.analysisType,
        confidence: memoryResult.confidence,
        lastAnalyzed: memoryResult.createdAt,
        validUntil: memoryResult.validUntil,
        aiProvider: memoryResult.aiProvider,
        aiModel: memoryResult.aiModel,
      };
    }

    // Generate new analysis using Level 1 AI
    this.logger.debug('Generating new health analysis with Level 1 AI');
    const newAnalysis = await this.generateHealthAnalysis(
      userId,
      query,
      analysisType,
      healthReportId,
    );

    // Cache the result
    const cacheEntry: HealthAnalysisCache = {
      id: this.generateCacheId(),
      userId,
      healthReportId,
      analysisType,
      query,
      queryHash,
      aiResponse: newAnalysis.response,
      aiProvider: newAnalysis.provider,
      aiModel: newAnalysis.model,
      confidence: newAnalysis.confidence,
      validUntil: new Date(Date.now() + this.getCacheDuration(analysisType)),
      extractedInsights: newAnalysis.insights,
      relatedBiomarkers: newAnalysis.relatedBiomarkers,
      recommendations: newAnalysis.recommendations,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: new Date(),
      usageCount: 1,
    };

    // Store in memory cache
    this.memoryCache.set(queryHash, cacheEntry);

    this.logger.log(
      `Health analysis generated and cached for user ${userId}, type: ${analysisType}`,
    );

    return {
      fromCache: false,
      response: newAnalysis.response,
      insights: newAnalysis.insights,
      analysisType,
      confidence: newAnalysis.confidence,
      lastAnalyzed: cacheEntry.createdAt,
      validUntil: cacheEntry.validUntil,
      aiProvider: newAnalysis.provider,
      aiModel: newAnalysis.model,
    };
  }

  /**
   * Get all cached analyses for a user's health reports
   */
  async getUserHealthInsights(userId: string): Promise<Map<string, HealthInsights>> {
    const userCache = new Map<string, HealthInsights>();

    for (const [key, cache] of this.memoryCache.entries()) {
      if (cache.userId === userId && cache.validUntil > new Date()) {
        const insightKey = cache.healthReportId || cache.analysisType;
        userCache.set(insightKey, cache.extractedInsights);
      }
    }

    this.logger.debug(`Retrieved ${userCache.size} health insights for user ${userId}`);
    return userCache;
  }

  /**
   * Get nutrition deficiencies for diet planning
   */
  async getNutritionDeficiencies(userId: string): Promise<{
    deficiencies: HealthInsights['deficiencies'];
    excesses: HealthInsights['excesses'];
    timelinedRecommendations: Array<{
      nutrient: string;
      targetDays: number;
      dietaryFocus: string[];
      expectedImprovement: string;
    }>;
  }> {
    const insights = await this.getUserHealthInsights(userId);
    
    const allDeficiencies: HealthInsights['deficiencies'] = [];
    const allExcesses: HealthInsights['excesses'] = [];

    for (const insight of insights.values()) {
      allDeficiencies.push(...insight.deficiencies);
      allExcesses.push(...insight.excesses);
    }

    // Create timeline-based recommendations
    const timelinedRecommendations = allDeficiencies.map(def => ({
      nutrient: def.nutrient,
      targetDays: def.improvementTimeline,
      dietaryFocus: def.dietaryFocus,
      expectedImprovement: this.generateImprovementDescription(def),
    }));

    this.logger.debug(
      `Found ${allDeficiencies.length} deficiencies and ${allExcesses.length} excesses for user ${userId}`,
    );

    return {
      deficiencies: allDeficiencies,
      excesses: allExcesses,
      timelinedRecommendations,
    };
  }

  /**
   * Invalidate cache when new health report is uploaded
   */
  async invalidateHealthReportCache(userId: string, healthReportId?: string): Promise<void> {
    this.logger.debug(`Invalidating cache for user ${userId}, report: ${healthReportId}`);

    let invalidatedCount = 0;

    for (const [key, cache] of this.memoryCache.entries()) {
      if (cache.userId === userId) {
        if (!healthReportId || cache.healthReportId === healthReportId) {
          this.memoryCache.delete(key);
          invalidatedCount++;
        }
      }
    }

    this.logger.log(`Invalidated ${invalidatedCount} cache entries for user ${userId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = new Date();
    let activeEntries = 0;
    let expiredEntries = 0;
    let totalUsage = 0;
    let totalAge = 0;

    for (const cache of this.memoryCache.values()) {
      if (cache.validUntil > now) {
        activeEntries++;
        totalAge += now.getTime() - cache.createdAt.getTime();
      } else {
        expiredEntries++;
      }
      totalUsage += cache.usageCount;
    }

    const totalEntries = this.memoryCache.size;
    const hitRate = totalEntries > 0 ? totalUsage / totalEntries : 0;
    const averageAge = activeEntries > 0 ? totalAge / activeEntries : 0;

    return {
      totalEntries,
      activeEntries,
      expiredEntries,
      hitRate,
      averageAge: Math.floor(averageAge / (1000 * 60 * 60)), // Convert to hours
    };
  }

  // Private helper methods

  private async generateHealthAnalysis(
    userId: string,
    query: string,
    analysisType: HealthAnalysisType,
    healthReportId?: string,
  ): Promise<{
    response: string;
    insights: HealthInsights;
    provider: string;
    model: string;
    confidence: number;
    relatedBiomarkers: string[];
    recommendations: string[];
  }> {
    // Get health report context if provided
    let healthReportContext = '';
    if (healthReportId) {
      const healthReport = await this.healthReportRepository.findOne({
        where: { id: healthReportId, userId },
      });
      
      if (healthReport) {
        healthReportContext = this.buildHealthReportContext(healthReport);
      }
    }

    // Build specialized prompt for health analysis
    const systemPrompt = this.buildHealthAnalysisPrompt(analysisType, healthReportContext);
    
    // Route to Level 1 AI (highest accuracy for health-critical analysis)
    const aiRequest: AIRoutingRequest = {
      requestType: this.mapAnalysisTypeToRequestType(analysisType),
      userId,
      contextTokens: Math.ceil((systemPrompt + query).length / 4),
      maxResponseTokens: 2000, // Detailed analysis needs more tokens
      accuracyRequirement: 0.98, // Highest accuracy for health analysis
      privacyLevel: 'high', // Health data requires high privacy
      containsPHI: true, // Health reports contain PHI
      complianceRequired: ['HIPAA', 'GDPR'],
    };

    const routingResult = await this.aiRoutingService.routeRequest(aiRequest);

    // For now, return mock response since we don't have real AI integration
    // In production, this would call the actual AI API
    const mockResponse = this.generateMockHealthAnalysis(analysisType, query, healthReportContext);

    return {
      response: mockResponse.response,
      insights: mockResponse.insights,
      provider: routingResult.provider,
      model: routingResult.model,
      confidence: 0.95,
      relatedBiomarkers: mockResponse.relatedBiomarkers,
      recommendations: mockResponse.recommendations,
    };
  }

  private buildHealthReportContext(healthReport: HealthReport): string {
    // Extract key information from health report
    // This would parse the actual health report data
    return `Health Report Context:
- Report Type: ${healthReport.type}
- Date: ${healthReport.createdAt}
- Status: ${healthReport.processingStatus}
[In production, this would contain parsed biomarker values, reference ranges, etc.]`;
  }

  private buildHealthAnalysisPrompt(analysisType: HealthAnalysisType, context: string): string {
    const basePrompt = `You are an expert medical AI specializing in health report analysis and nutritional assessment. 
You provide evidence-based insights about biomarkers, nutrient deficiencies, and health optimization.

IMPORTANT: Always provide specific, actionable recommendations with timelines for improvement.
Structure your response to include:
1. Key findings and analysis
2. Specific nutrient deficiencies/excesses with severity levels
3. Timeline for expected improvement (in days)
4. Dietary recommendations and focus areas
5. Risk assessments where applicable

${context}

Analysis Type: ${analysisType}
`;

    const typeSpecificPrompts = {
      [HealthAnalysisType.HEALTH_REPORT_SUMMARY]: `Provide a comprehensive summary of the health report, highlighting key findings, concerns, and recommendations.`,
      [HealthAnalysisType.NUTRIENT_DEFICIENCY]: `Analyze nutrient deficiencies and provide specific dietary recommendations with timelines for improvement.`,
      [HealthAnalysisType.MICRONUTRIENT_STATUS]: `Evaluate micronutrient status and provide targeted supplementation and dietary guidance.`,
      [HealthAnalysisType.METABOLIC_ANALYSIS]: `Assess metabolic health markers and provide recommendations for metabolic optimization.`,
      [HealthAnalysisType.BIOMARKER_ANALYSIS]: `Analyze specific biomarkers and their implications for health and nutrition.`,
      [HealthAnalysisType.HEALTH_RISK_ASSESSMENT]: `Evaluate health risks based on current markers and provide preventive recommendations.`,
    };

    return basePrompt + '\n\n' + (typeSpecificPrompts[analysisType] || typeSpecificPrompts[HealthAnalysisType.HEALTH_REPORT_SUMMARY]);
  }

  private mapAnalysisTypeToRequestType(analysisType: HealthAnalysisType): RequestType {
    // All health analyses use Level 1 routing for highest accuracy
    return RequestType.HEALTH_REPORT_ANALYSIS;
  }

  private generateMockHealthAnalysis(
    analysisType: HealthAnalysisType,
    query: string,
    context: string,
  ): {
    response: string;
    insights: HealthInsights;
    relatedBiomarkers: string[];
    recommendations: string[];
  } {
    // Mock analysis based on type - this would be replaced with real AI response
    const mockInsights: HealthInsights = {
      deficiencies: [
        {
          nutrient: 'Vitamin D',
          severity: 'moderate',
          currentValue: 18,
          normalRange: '30-50 ng/mL',
          improvementTimeline: 60, // 2 months
          dietaryFocus: ['fatty_fish', 'fortified_dairy', 'egg_yolks', 'mushrooms'],
        },
        {
          nutrient: 'Iron',
          severity: 'mild',
          currentValue: 45,
          normalRange: '60-150 μg/dL',
          improvementTimeline: 30, // 1 month
          dietaryFocus: ['lean_meats', 'spinach', 'lentils', 'quinoa'],
        },
      ],
      excesses: [
        {
          parameter: 'Sodium',
          severity: 'mild',
          currentValue: 3200,
          normalRange: '<2300 mg/day',
          reductionTimeline: 14, // 2 weeks
          restrictions: ['processed_foods', 'restaurant_meals', 'canned_soups'],
        },
      ],
      risks: [
        {
          riskType: 'Cardiovascular',
          level: 'moderate',
          factors: ['elevated_sodium', 'low_vitamin_d'],
          mitigation: ['reduce_sodium', 'increase_vitamin_d', 'regular_exercise'],
        },
      ],
      healthScore: 72,
      keyRecommendations: [
        'Increase Vitamin D intake through supplements and sun exposure',
        'Include iron-rich foods in daily meals',
        'Reduce processed food consumption to lower sodium',
        'Consider comprehensive metabolic panel retest in 3 months',
      ],
    };

    const response = `Based on your health analysis, here are the key findings:

**Nutrient Deficiencies:**
- Vitamin D: Moderate deficiency (18 ng/mL, target: 30-50). Expected improvement: 60 days with supplementation and dietary changes.
- Iron: Mild deficiency (45 μg/dL, target: 60-150). Expected improvement: 30 days with iron-rich foods.

**Areas of Concern:**
- Sodium levels elevated (3200mg vs <2300mg target). Reduction possible in 14 days with dietary changes.

**Health Score: 72/100**

**Recommendations:**
1. Start Vitamin D3 supplement (2000 IU daily) + include fatty fish 2x/week
2. Add iron-rich foods like spinach, lean meats, and lentils to daily meals
3. Reduce processed foods and restaurant meals to lower sodium
4. Retest key biomarkers in 3 months to track improvement

**Timeline for Improvement:**
- Sodium reduction: 2 weeks
- Iron normalization: 4 weeks  
- Vitamin D optimization: 8 weeks`;

    return {
      response,
      insights: mockInsights,
      relatedBiomarkers: ['vitamin_d', 'iron', 'sodium', 'ferritin'],
      recommendations: mockInsights.keyRecommendations,
    };
  }

  private generateQueryHash(
    userId: string,
    query: string,
    analysisType: HealthAnalysisType,
    healthReportId?: string,
  ): string {
    const hashInput = `${userId}:${query}:${analysisType}:${healthReportId || 'global'}`;
    // Simple hash for now - would use crypto.createHash in production
    return Buffer.from(hashInput).toString('base64');
  }

  private generateCacheId(): string {
    return `health_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCacheDuration(analysisType: HealthAnalysisType): number {
    // Different cache durations based on analysis type
    const durations = {
      [HealthAnalysisType.HEALTH_REPORT_SUMMARY]: 7 * 24 * 60 * 60 * 1000, // 7 days
      [HealthAnalysisType.NUTRIENT_DEFICIENCY]: 3 * 24 * 60 * 60 * 1000, // 3 days
      [HealthAnalysisType.MICRONUTRIENT_STATUS]: 3 * 24 * 60 * 60 * 1000, // 3 days
      [HealthAnalysisType.METABOLIC_ANALYSIS]: 7 * 24 * 60 * 60 * 1000, // 7 days
      [HealthAnalysisType.BIOMARKER_ANALYSIS]: 5 * 24 * 60 * 60 * 1000, // 5 days
      [HealthAnalysisType.HEALTH_RISK_ASSESSMENT]: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return durations[analysisType] || 3 * 24 * 60 * 60 * 1000; // Default 3 days
  }

  private generateImprovementDescription(deficiency: HealthInsights['deficiencies'][0]): string {
    const timelineText = deficiency.improvementTimeline <= 30 ? 
      `${deficiency.improvementTimeline} days` : 
      `${Math.ceil(deficiency.improvementTimeline / 7)} weeks`;
    
    return `${deficiency.nutrient} levels expected to normalize within ${timelineText} with focused dietary intervention`;
  }

  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, cache] of this.memoryCache.entries()) {
      if (cache.validUntil <= now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    this.logger.debug(`Cleaned up ${cleanedCount} expired health analysis cache entries`);
  }
}