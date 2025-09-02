import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Health analysis cache entity (we'll create this)
export interface HealthAnalysisCache {
  id: string;
  userId: string;
  reportId?: string;
  analysisType: 'micronutrients' | 'biomarkers' | 'health_summary' | 'deficiencies' | 'conditions';
  analysis: {
    findings: Array<{
      type: string;
      severity: 'low' | 'moderate' | 'high' | 'critical';
      description: string;
      recommendedAction: string;
      improvementTimeline?: {
        estimatedDays: number;
        milestones: Array<{ days: number; description: string }>;
      };
    }>;
    summary: string;
    riskFactors: string[];
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  validUntil: Date;
  isActive: boolean;
}

export interface HealthInsight {
  micronutrients?: {
    deficiencies: Array<{ nutrient: string; severity: string; timeline: number }>;
    optimal: Array<{ nutrient: string; level: string }>;
  };
  biomarkers?: {
    abnormal: Array<{ marker: string; value: string; reference: string; concern: string }>;
    normal: Array<{ marker: string; value: string }>;
  };
  conditions?: {
    detected: Array<{ condition: string; severity: string; timeline?: number }>;
    riskFactors: string[];
  };
  summary?: string;
  overallScore?: number;
}

@Injectable()
export class HealthAnalysisCacheService {
  private readonly logger = new Logger(HealthAnalysisCacheService.name);

  // In-memory cache for now (in production, use Redis or database)
  private cache: Map<string, HealthAnalysisCache> = new Map();

  constructor() {
    this.logger.log('HealthAnalysisCacheService initialized');
  }

  /**
   * Store health analysis results from Level 1 AI processing
   */
  async storeHealthAnalysis(
    userId: string,
    analysisType: HealthAnalysisCache['analysisType'],
    analysis: HealthAnalysisCache['analysis'],
    reportId?: string,
    validityDays: number = 90,
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(userId, analysisType, reportId);
    
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const cachedAnalysis: HealthAnalysisCache = {
      id: cacheKey,
      userId,
      reportId,
      analysisType,
      analysis,
      createdAt: new Date(),
      updatedAt: new Date(),
      validUntil,
      isActive: true,
    };

    this.cache.set(cacheKey, cachedAnalysis);
    
    this.logger.log(`Stored health analysis for user ${userId}, type: ${analysisType}`);
    
    return cacheKey;
  }

  /**
   * Retrieve cached health analysis
   */
  async getHealthAnalysis(
    userId: string,
    analysisType: HealthAnalysisCache['analysisType'],
    reportId?: string,
  ): Promise<HealthAnalysisCache | null> {
    const cacheKey = this.generateCacheKey(userId, analysisType, reportId);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (new Date() > cached.validUntil || !cached.isActive) {
      this.cache.delete(cacheKey);
      return null;
    }

    this.logger.log(`Retrieved cached health analysis for user ${userId}, type: ${analysisType}`);
    return cached;
  }

  /**
   * Get comprehensive health insights for diet planning
   */
  async getHealthInsights(userId: string): Promise<HealthInsight> {
    const insights: HealthInsight = {};

    // Get micronutrient analysis
    const micronutrients = await this.getHealthAnalysis(userId, 'micronutrients');
    if (micronutrients) {
      insights.micronutrients = this.extractMicronutrientInsights(micronutrients.analysis);
    }

    // Get biomarker analysis
    const biomarkers = await this.getHealthAnalysis(userId, 'biomarkers');
    if (biomarkers) {
      insights.biomarkers = this.extractBiomarkerInsights(biomarkers.analysis);
    }

    // Get condition analysis
    const conditions = await this.getHealthAnalysis(userId, 'conditions');
    if (conditions) {
      insights.conditions = this.extractConditionInsights(conditions.analysis);
    }

    // Get overall health summary
    const summary = await this.getHealthAnalysis(userId, 'health_summary');
    if (summary) {
      insights.summary = summary.analysis.summary;
      insights.overallScore = this.calculateHealthScore(summary.analysis);
    }

    this.logger.log(`Generated comprehensive health insights for user ${userId}`);
    return insights;
  }

  /**
   * Invalidate cache when new health report is uploaded
   */
  async invalidateHealthAnalysis(userId: string, reportId?: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache) {
      if (cached.userId === userId) {
        // If reportId is provided, only invalidate analyses for that report
        if (reportId && cached.reportId && cached.reportId !== reportId) {
          continue;
        }
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    this.logger.log(`Invalidated ${keysToDelete.length} cached analyses for user ${userId}`);
  }

  /**
   * Update existing analysis with new information (partial update)
   */
  async updateHealthAnalysis(
    userId: string,
    analysisType: HealthAnalysisCache['analysisType'],
    newFindings: HealthAnalysisCache['analysis']['findings'],
    reportId?: string,
  ): Promise<boolean> {
    const cacheKey = this.generateCacheKey(userId, analysisType, reportId);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return false;
    }

    // Merge new findings with existing ones
    const existingFindings = cached.analysis.findings;
    const mergedFindings = [...existingFindings];

    newFindings.forEach(newFinding => {
      const existingIndex = mergedFindings.findIndex(f => f.type === newFinding.type);
      if (existingIndex >= 0) {
        // Update existing finding
        mergedFindings[existingIndex] = newFinding;
      } else {
        // Add new finding
        mergedFindings.push(newFinding);
      }
    });

    cached.analysis.findings = mergedFindings;
    cached.updatedAt = new Date();

    this.cache.set(cacheKey, cached);
    
    this.logger.log(`Updated health analysis for user ${userId}, type: ${analysisType}`);
    
    return true;
  }

  /**
   * Check if health analysis exists and is valid
   */
  async hasValidAnalysis(
    userId: string,
    analysisType: HealthAnalysisCache['analysisType'],
    reportId?: string,
  ): Promise<boolean> {
    const analysis = await this.getHealthAnalysis(userId, analysisType, reportId);
    return analysis !== null;
  }

  /**
   * Get cache statistics for cost tracking
   */
  async getCacheStats(userId: string): Promise<{
    totalCachedAnalyses: number;
    cacheHitsSaved: number;
    estimatedCostSavings: number;
    validAnalyses: number;
    expiredAnalyses: number;
  }> {
    const userCaches = Array.from(this.cache.values()).filter(c => c.userId === userId);
    
    const now = new Date();
    const valid = userCaches.filter(c => c.isActive && now <= c.validUntil);
    const expired = userCaches.filter(c => !c.isActive || now > c.validUntil);

    // Estimate cost savings (Level 1 AI calls typically cost $0.02-0.10 each)
    const estimatedCostSavings = valid.length * 0.05; // $0.05 per saved call

    return {
      totalCachedAnalyses: userCaches.length,
      cacheHitsSaved: valid.length * 2, // Assume 2 reuses per analysis on average
      estimatedCostSavings,
      validAnalyses: valid.length,
      expiredAnalyses: expired.length,
    };
  }

  // Private helper methods

  private generateCacheKey(
    userId: string,
    analysisType: string,
    reportId?: string,
  ): string {
    return reportId 
      ? `${userId}:${analysisType}:${reportId}`
      : `${userId}:${analysisType}`;
  }

  private extractMicronutrientInsights(analysis: HealthAnalysisCache['analysis']) {
    const micronutrients = {
      deficiencies: [] as Array<{ nutrient: string; severity: string; timeline: number }>,
      optimal: [] as Array<{ nutrient: string; level: string }>,
    };

    analysis.findings.forEach(finding => {
      if (finding.type.includes('deficiency') && finding.improvementTimeline) {
        micronutrients.deficiencies.push({
          nutrient: finding.type.replace('_deficiency', ''),
          severity: finding.severity,
          timeline: finding.improvementTimeline.estimatedDays,
        });
      } else if (finding.type.includes('optimal')) {
        micronutrients.optimal.push({
          nutrient: finding.type.replace('_optimal', ''),
          level: finding.description,
        });
      }
    });

    return micronutrients;
  }

  private extractBiomarkerInsights(analysis: HealthAnalysisCache['analysis']) {
    const biomarkers = {
      abnormal: [] as Array<{ marker: string; value: string; reference: string; concern: string }>,
      normal: [] as Array<{ marker: string; value: string }>,
    };

    analysis.findings.forEach(finding => {
      if (finding.severity === 'low') {
        biomarkers.normal.push({
          marker: finding.type,
          value: finding.description,
        });
      } else {
        biomarkers.abnormal.push({
          marker: finding.type,
          value: finding.description,
          reference: 'Normal range',
          concern: finding.recommendedAction,
        });
      }
    });

    return biomarkers;
  }

  private extractConditionInsights(analysis: HealthAnalysisCache['analysis']) {
    const conditions = {
      detected: [] as Array<{ condition: string; severity: string; timeline?: number }>,
      riskFactors: [] as string[],
    };

    analysis.findings.forEach(finding => {
      conditions.detected.push({
        condition: finding.type,
        severity: finding.severity,
        timeline: finding.improvementTimeline?.estimatedDays,
      });
    });

    conditions.riskFactors = analysis.riskFactors;

    return conditions;
  }

  private calculateHealthScore(analysis: HealthAnalysisCache['analysis']): number {
    // Simple scoring algorithm
    let score = 100;
    
    analysis.findings.forEach(finding => {
      switch (finding.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'moderate':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }
}