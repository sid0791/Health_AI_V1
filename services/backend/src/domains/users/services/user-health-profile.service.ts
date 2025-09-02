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
          lastMeasured: healthReport.testDate || new Date(),
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
          lastMeasured: healthReport.testDate || new Date(),
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

    // Extract micronutrient deficiencies - COMPREHENSIVE LIST
    const micronutrientPatterns = [
      // Vitamins
      { name: 'Vitamin A', keywords: ['vitamin a', 'retinol'], unit: 'µg/dL', idealRange: { min: 28, max: 86 } },
      { name: 'Vitamin D', keywords: ['vitamin d', 'vit d', 'vitamin-d', '25(oh)d'], unit: 'ng/mL', idealRange: { min: 30, max: 100 } },
      { name: 'Vitamin E', keywords: ['vitamin e', 'tocopherol'], unit: 'mg/L', idealRange: { min: 5.5, max: 17 } },
      { name: 'Vitamin K', keywords: ['vitamin k', 'phylloquinone'], unit: 'ng/mL', idealRange: { min: 0.13, max: 1.19 } },
      { name: 'Vitamin C', keywords: ['vitamin c', 'ascorbic acid'], unit: 'mg/dL', idealRange: { min: 0.4, max: 2.0 } },
      
      // B-Complex Vitamins
      { name: 'Vitamin B1', keywords: ['vitamin b1', 'thiamine'], unit: 'µg/L', idealRange: { min: 70, max: 180 } },
      { name: 'Vitamin B2', keywords: ['vitamin b2', 'riboflavin'], unit: 'µg/L', idealRange: { min: 137, max: 370 } },
      { name: 'Vitamin B3', keywords: ['vitamin b3', 'niacin'], unit: 'µg/mL', idealRange: { min: 3, max: 36 } },
      { name: 'Vitamin B5', keywords: ['vitamin b5', 'pantothenic acid'], unit: 'µg/mL', idealRange: { min: 1.6, max: 2.7 } },
      { name: 'Vitamin B6', keywords: ['vitamin b6', 'pyridoxine'], unit: 'ng/mL', idealRange: { min: 5, max: 50 } },
      { name: 'Vitamin B7', keywords: ['vitamin b7', 'biotin'], unit: 'ng/mL', idealRange: { min: 0.5, max: 2.2 } },
      { name: 'Vitamin B9', keywords: ['vitamin b9', 'folate', 'folic acid'], unit: 'ng/mL', idealRange: { min: 3, max: 17 } },
      { name: 'Vitamin B12', keywords: ['b12', 'vitamin b12', 'cobalamin'], unit: 'pg/mL', idealRange: { min: 200, max: 900 } },
      
      // Essential Minerals
      { name: 'Iron', keywords: ['iron', 'ferritin', 'serum iron'], unit: 'ng/mL', idealRange: { min: 12, max: 150 } },
      { name: 'Calcium', keywords: ['calcium', 'ca'], unit: 'mg/dL', idealRange: { min: 8.5, max: 10.2 } },
      { name: 'Magnesium', keywords: ['magnesium', 'mg'], unit: 'mg/dL', idealRange: { min: 1.7, max: 2.2 } },
      { name: 'Zinc', keywords: ['zinc', 'zn'], unit: 'µg/dL', idealRange: { min: 70, max: 120 } },
      { name: 'Selenium', keywords: ['selenium', 'se'], unit: 'µg/L', idealRange: { min: 70, max: 150 } },
      { name: 'Copper', keywords: ['copper', 'cu'], unit: 'µg/dL', idealRange: { min: 70, max: 140 } },
      { name: 'Chromium', keywords: ['chromium', 'cr'], unit: 'µg/L', idealRange: { min: 0.5, max: 2.0 } },
      { name: 'Iodine', keywords: ['iodine', 'i'], unit: 'µg/L', idealRange: { min: 52, max: 109 } },
      { name: 'Manganese', keywords: ['manganese', 'mn'], unit: 'µg/L', idealRange: { min: 4, max: 15 } },
      { name: 'Molybdenum', keywords: ['molybdenum', 'mo'], unit: 'µg/L', idealRange: { min: 0.3, max: 1.4 } },
      
      // Electrolytes
      { name: 'Sodium', keywords: ['sodium', 'na'], unit: 'mmol/L', idealRange: { min: 135, max: 145 } },
      { name: 'Potassium', keywords: ['potassium', 'k'], unit: 'mmol/L', idealRange: { min: 3.5, max: 5.0 } },
      { name: 'Chloride', keywords: ['chloride', 'cl'], unit: 'mmol/L', idealRange: { min: 96, max: 106 } },
      { name: 'Phosphorus', keywords: ['phosphorus', 'phosphate', 'po4'], unit: 'mg/dL', idealRange: { min: 2.5, max: 4.5 } },
      
      // Fatty Acids
      { name: 'Omega-3', keywords: ['omega-3', 'omega 3', 'epa', 'dha'], unit: '%', idealRange: { min: 4, max: 8 } },
      { name: 'Omega-6', keywords: ['omega-6', 'omega 6'], unit: '%', idealRange: { min: 15, max: 30 } },
      
      // Amino Acids & Protein
      { name: 'Protein', keywords: ['protein', 'total protein'], unit: 'g/dL', idealRange: { min: 6.0, max: 8.3 } },
      { name: 'Albumin', keywords: ['albumin'], unit: 'g/dL', idealRange: { min: 3.5, max: 5.0 } },
      
      // Antioxidants
      { name: 'CoQ10', keywords: ['coq10', 'coenzyme q10'], unit: 'µg/mL', idealRange: { min: 0.5, max: 1.5 } },
      { name: 'Glutathione', keywords: ['glutathione'], unit: 'µmol/L', idealRange: { min: 900, max: 1600 } },
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

    // Extract biomarkers - COMPREHENSIVE LIST
    const biomarkerPatterns = [
      // Lipid Panel
      { name: 'Total Cholesterol', keywords: ['cholesterol', 'total cholesterol'], unit: 'mg/dL', range: { min: 100, max: 200 } },
      { name: 'LDL Cholesterol', keywords: ['ldl', 'ldl cholesterol', 'low density lipoprotein'], unit: 'mg/dL', range: { min: 70, max: 130 } },
      { name: 'HDL Cholesterol', keywords: ['hdl', 'hdl cholesterol', 'high density lipoprotein'], unit: 'mg/dL', range: { min: 40, max: 100 } },
      { name: 'Triglycerides', keywords: ['triglycerides', 'trigs'], unit: 'mg/dL', range: { min: 50, max: 150 } },
      { name: 'Non-HDL Cholesterol', keywords: ['non-hdl', 'non hdl'], unit: 'mg/dL', range: { min: 100, max: 160 } },
      
      // Diabetes/Glucose Metabolism
      { name: 'HbA1c', keywords: ['hba1c', 'glycated hemoglobin', 'hemoglobin a1c'], unit: '%', range: { min: 4.0, max: 5.6 } },
      { name: 'Fasting Glucose', keywords: ['fasting glucose', 'glucose', 'blood sugar'], unit: 'mg/dL', range: { min: 70, max: 99 } },
      { name: 'Insulin', keywords: ['insulin', 'fasting insulin'], unit: 'µU/mL', range: { min: 2.6, max: 24.9 } },
      { name: 'C-Peptide', keywords: ['c-peptide', 'c peptide'], unit: 'ng/mL', range: { min: 1.1, max: 4.4 } },
      
      // Liver Function
      { name: 'ALT', keywords: ['alt', 'alanine aminotransferase'], unit: 'U/L', range: { min: 7, max: 40 } },
      { name: 'AST', keywords: ['ast', 'aspartate aminotransferase'], unit: 'U/L', range: { min: 10, max: 40 } },
      { name: 'ALP', keywords: ['alp', 'alkaline phosphatase'], unit: 'U/L', range: { min: 44, max: 147 } },
      { name: 'Bilirubin Total', keywords: ['bilirubin', 'total bilirubin'], unit: 'mg/dL', range: { min: 0.3, max: 1.2 } },
      { name: 'GGT', keywords: ['ggt', 'gamma glutamyl transferase'], unit: 'U/L', range: { min: 9, max: 48 } },
      
      // Kidney Function  
      { name: 'Creatinine', keywords: ['creatinine'], unit: 'mg/dL', range: { min: 0.6, max: 1.2 } },
      { name: 'BUN', keywords: ['bun', 'blood urea nitrogen'], unit: 'mg/dL', range: { min: 6, max: 20 } },
      { name: 'eGFR', keywords: ['egfr', 'estimated glomerular filtration rate'], unit: 'mL/min/1.73m²', range: { min: 90, max: 120 } },
      { name: 'Uric Acid', keywords: ['uric acid', 'urate'], unit: 'mg/dL', range: { min: 3.5, max: 7.2 } },
      
      // Thyroid Function
      { name: 'TSH', keywords: ['tsh', 'thyroid stimulating hormone'], unit: 'µIU/mL', range: { min: 0.27, max: 4.2 } },
      { name: 'Free T4', keywords: ['free t4', 'ft4'], unit: 'ng/dL', range: { min: 0.93, max: 1.7 } },
      { name: 'Free T3', keywords: ['free t3', 'ft3'], unit: 'pg/mL', range: { min: 2.0, max: 4.4 } },
      { name: 'T4 Total', keywords: ['t4', 'total t4', 'thyroxine'], unit: 'µg/dL', range: { min: 4.5, max: 12.0 } },
      { name: 'T3 Total', keywords: ['t3', 'total t3', 'triiodothyronine'], unit: 'ng/dL', range: { min: 71, max: 180 } },
      
      // Complete Blood Count
      { name: 'Hemoglobin', keywords: ['hemoglobin', 'hgb', 'hb'], unit: 'g/dL', range: { min: 12.0, max: 18.0 } },
      { name: 'Hematocrit', keywords: ['hematocrit', 'hct'], unit: '%', range: { min: 36, max: 52 } },
      { name: 'RBC Count', keywords: ['rbc', 'red blood cells'], unit: 'M/µL', range: { min: 4.2, max: 5.4 } },
      { name: 'WBC Count', keywords: ['wbc', 'white blood cells'], unit: 'K/µL', range: { min: 3.4, max: 10.8 } },
      { name: 'Platelet Count', keywords: ['platelets', 'plt'], unit: 'K/µL', range: { min: 150, max: 450 } },
      { name: 'MCV', keywords: ['mcv', 'mean corpuscular volume'], unit: 'fL', range: { min: 80, max: 100 } },
      { name: 'MCH', keywords: ['mch', 'mean corpuscular hemoglobin'], unit: 'pg', range: { min: 27, max: 31 } },
      { name: 'MCHC', keywords: ['mchc', 'mean corpuscular hemoglobin concentration'], unit: 'g/dL', range: { min: 32, max: 36 } },
      
      // Inflammatory Markers
      { name: 'CRP', keywords: ['crp', 'c-reactive protein'], unit: 'mg/L', range: { min: 0.0, max: 3.0 } },
      { name: 'ESR', keywords: ['esr', 'erythrocyte sedimentation rate'], unit: 'mm/hr', range: { min: 0, max: 30 } },
      
      // Cardiovascular Risk
      { name: 'Blood Pressure Systolic', keywords: ['systolic', 'systolic bp', 'systolic blood pressure'], unit: 'mmHg', range: { min: 90, max: 120 } },
      { name: 'Blood Pressure Diastolic', keywords: ['diastolic', 'diastolic bp', 'diastolic blood pressure'], unit: 'mmHg', range: { min: 60, max: 80 } },
      { name: 'Homocysteine', keywords: ['homocysteine'], unit: 'µmol/L', range: { min: 5, max: 15 } },
      { name: 'Lipoprotein(a)', keywords: ['lp(a)', 'lipoprotein a'], unit: 'mg/dL', range: { min: 0, max: 30 } },
      
      // Hormones
      { name: 'Testosterone Total', keywords: ['testosterone', 'total testosterone'], unit: 'ng/dL', range: { min: 300, max: 1000 } },
      { name: 'Testosterone Free', keywords: ['free testosterone'], unit: 'pg/mL', range: { min: 9.3, max: 26.5 } },
      { name: 'Cortisol', keywords: ['cortisol'], unit: 'µg/dL', range: { min: 6.2, max: 19.4 } },
      { name: 'DHEA-S', keywords: ['dhea-s', 'dheas'], unit: 'µg/dL', range: { min: 95, max: 530 } },
      
      // Bone Health
      { name: 'Vitamin D3', keywords: ['vitamin d3', 'cholecalciferol'], unit: 'ng/mL', range: { min: 30, max: 100 } },
      { name: 'PTH', keywords: ['pth', 'parathyroid hormone'], unit: 'pg/mL', range: { min: 15, max: 65 } },
      
      // Other Important Markers
      { name: 'Ferritin', keywords: ['ferritin'], unit: 'ng/mL', range: { min: 12, max: 150 } },
      { name: 'TIBC', keywords: ['tibc', 'total iron binding capacity'], unit: 'µg/dL', range: { min: 250, max: 450 } },
      { name: 'Transferrin Saturation', keywords: ['transferrin saturation', 'tsat'], unit: '%', range: { min: 15, max: 50 } },
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

    // Extract health conditions - COMPREHENSIVE LIST
    const conditionPatterns = [
      // Cardiovascular Conditions
      { name: 'Hypertension', keywords: ['hypertension', 'high blood pressure'], severity: 'moderate' as const },
      { name: 'Hypotension', keywords: ['hypotension', 'low blood pressure'], severity: 'mild' as const },
      { name: 'Coronary Artery Disease', keywords: ['coronary artery disease', 'cad'], severity: 'severe' as const },
      { name: 'Heart Disease', keywords: ['heart disease', 'cardiac disease'], severity: 'severe' as const },
      { name: 'Arrhythmia', keywords: ['arrhythmia', 'irregular heartbeat'], severity: 'moderate' as const },
      { name: 'Atherosclerosis', keywords: ['atherosclerosis'], severity: 'moderate' as const },
      
      // Metabolic Conditions
      { name: 'Diabetes Type 1', keywords: ['type 1 diabetes', 't1d', 'diabetes mellitus type 1'], severity: 'severe' as const },
      { name: 'Diabetes Type 2', keywords: ['type 2 diabetes', 't2d', 'diabetes mellitus type 2'], severity: 'moderate' as const },
      { name: 'Prediabetes', keywords: ['prediabetes', 'pre-diabetes'], severity: 'mild' as const },
      { name: 'Insulin Resistance', keywords: ['insulin resistance'], severity: 'moderate' as const },
      { name: 'Metabolic Syndrome', keywords: ['metabolic syndrome'], severity: 'moderate' as const },
      { name: 'Obesity', keywords: ['obesity', 'obese'], severity: 'moderate' as const },
      
      // Liver Conditions
      { name: 'Fatty Liver', keywords: ['fatty liver', 'hepatic steatosis'], severity: 'mild' as const },
      { name: 'NASH', keywords: ['nash', 'nonalcoholic steatohepatitis'], severity: 'moderate' as const },
      { name: 'Hepatitis', keywords: ['hepatitis'], severity: 'moderate' as const },
      { name: 'Liver Cirrhosis', keywords: ['cirrhosis', 'liver cirrhosis'], severity: 'severe' as const },
      
      // Kidney Conditions
      { name: 'Chronic Kidney Disease', keywords: ['chronic kidney disease', 'ckd'], severity: 'moderate' as const },
      { name: 'Kidney Stones', keywords: ['kidney stones', 'nephrolithiasis'], severity: 'mild' as const },
      
      // Thyroid Conditions
      { name: 'Hypothyroidism', keywords: ['hypothyroidism', 'underactive thyroid'], severity: 'mild' as const },
      { name: 'Hyperthyroidism', keywords: ['hyperthyroidism', 'overactive thyroid'], severity: 'moderate' as const },
      { name: 'Hashimoto\'s Disease', keywords: ['hashimoto', 'hashimotos'], severity: 'moderate' as const },
      { name: 'Graves\' Disease', keywords: ['graves disease'], severity: 'moderate' as const },
      
      // Blood/Hematological Conditions
      { name: 'Anemia', keywords: ['anemia', 'anaemia'], severity: 'mild' as const },
      { name: 'Iron Deficiency Anemia', keywords: ['iron deficiency anemia'], severity: 'mild' as const },
      { name: 'B12 Deficiency Anemia', keywords: ['b12 deficiency anemia', 'pernicious anemia'], severity: 'moderate' as const },
      { name: 'Hemochromatosis', keywords: ['hemochromatosis'], severity: 'moderate' as const },
      { name: 'Thrombocytopenia', keywords: ['thrombocytopenia', 'low platelet'], severity: 'moderate' as const },
      
      // Digestive Conditions
      { name: 'GERD', keywords: ['gerd', 'gastroesophageal reflux'], severity: 'mild' as const },
      { name: 'IBS', keywords: ['ibs', 'irritable bowel syndrome'], severity: 'mild' as const },
      { name: 'IBD', keywords: ['ibd', 'inflammatory bowel disease'], severity: 'moderate' as const },
      { name: 'Crohn\'s Disease', keywords: ['crohns', 'crohn disease'], severity: 'moderate' as const },
      { name: 'Ulcerative Colitis', keywords: ['ulcerative colitis'], severity: 'moderate' as const },
      { name: 'Celiac Disease', keywords: ['celiac', 'coeliac'], severity: 'moderate' as const },
      { name: 'Peptic Ulcer', keywords: ['peptic ulcer', 'stomach ulcer'], severity: 'mild' as const },
      
      // Autoimmune Conditions
      { name: 'Rheumatoid Arthritis', keywords: ['rheumatoid arthritis', 'ra'], severity: 'moderate' as const },
      { name: 'Lupus', keywords: ['lupus', 'sle', 'systemic lupus erythematosus'], severity: 'severe' as const },
      { name: 'Multiple Sclerosis', keywords: ['multiple sclerosis', 'ms'], severity: 'severe' as const },
      { name: 'Psoriasis', keywords: ['psoriasis'], severity: 'mild' as const },
      
      // Bone/Joint Conditions
      { name: 'Osteoporosis', keywords: ['osteoporosis'], severity: 'moderate' as const },
      { name: 'Osteopenia', keywords: ['osteopenia'], severity: 'mild' as const },
      { name: 'Arthritis', keywords: ['arthritis'], severity: 'mild' as const },
      { name: 'Osteoarthritis', keywords: ['osteoarthritis'], severity: 'mild' as const },
      
      // Mental Health Conditions
      { name: 'Depression', keywords: ['depression', 'major depressive disorder'], severity: 'moderate' as const },
      { name: 'Anxiety', keywords: ['anxiety', 'anxiety disorder'], severity: 'mild' as const },
      { name: 'ADHD', keywords: ['adhd', 'attention deficit'], severity: 'mild' as const },
      
      // Respiratory Conditions
      { name: 'Asthma', keywords: ['asthma'], severity: 'mild' as const },
      { name: 'COPD', keywords: ['copd', 'chronic obstructive pulmonary'], severity: 'moderate' as const },
      { name: 'Sleep Apnea', keywords: ['sleep apnea', 'sleep apnoea'], severity: 'moderate' as const },
      
      // Hormonal Conditions
      { name: 'PCOS', keywords: ['pcos', 'polycystic ovary syndrome'], severity: 'moderate' as const },
      { name: 'Low Testosterone', keywords: ['low testosterone', 'hypogonadism'], severity: 'mild' as const },
      { name: 'Adrenal Fatigue', keywords: ['adrenal fatigue'], severity: 'mild' as const },
      
      // Skin Conditions
      { name: 'Eczema', keywords: ['eczema', 'atopic dermatitis'], severity: 'mild' as const },
      { name: 'Dermatitis', keywords: ['dermatitis'], severity: 'mild' as const },
      
      // Neurological Conditions
      { name: 'Migraine', keywords: ['migraine', 'migraines'], severity: 'mild' as const },
      { name: 'Neuropathy', keywords: ['neuropathy', 'peripheral neuropathy'], severity: 'moderate' as const },
      
      // Cancer/Oncological
      { name: 'Cancer History', keywords: ['cancer', 'malignancy', 'tumor', 'carcinoma'], severity: 'severe' as const },
      
      // Other Common Conditions
      { name: 'Chronic Fatigue', keywords: ['chronic fatigue', 'cfs'], severity: 'mild' as const },
      { name: 'Fibromyalgia', keywords: ['fibromyalgia'], severity: 'mild' as const },
      { name: 'Gout', keywords: ['gout'], severity: 'mild' as const },
      { name: 'High Cholesterol', keywords: ['high cholesterol', 'hypercholesterolemia'], severity: 'mild' as const },
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
      // Vitamins - Fat soluble (longer to improve)
      'Vitamin A': 60,
      'Vitamin D': 45, // 6-8 weeks  
      'Vitamin E': 60,
      'Vitamin K': 30,
      'Vitamin C': 14, // Water soluble, faster
      
      // B-Complex Vitamins - Water soluble (faster improvement)
      'Vitamin B1': 21,
      'Vitamin B2': 21,
      'Vitamin B3': 21,
      'Vitamin B5': 21,
      'Vitamin B6': 21,
      'Vitamin B7': 30,
      'Vitamin B9': 30,
      'Vitamin B12': 30, // 4-6 weeks
      
      // Essential Minerals
      'Iron': 60, // 8-12 weeks
      'Calcium': 30,
      'Magnesium': 21, // 3-4 weeks
      'Zinc': 30,
      'Selenium': 30,
      'Copper': 45,
      'Chromium': 30,
      'Iodine': 30,
      'Manganese': 30,
      'Molybdenum': 30,
      
      // Electrolytes - Fast correction
      'Sodium': 7,
      'Potassium': 14,
      'Chloride': 7,
      'Phosphorus': 21,
      
      // Fatty Acids
      'Omega-3': 60, // 8-12 weeks
      'Omega-6': 60,
      
      // Protein/Amino Acids
      'Protein': 21,
      'Albumin': 30,
      
      // Antioxidants
      'CoQ10': 45,
      'Glutathione': 30,
    };
    return timelines[nutrient] || 30; // Default 30 days
  }

  private getConditionManagementPlan(condition: string): string[] {
    const plans: Record<string, string[]> = {
      // Cardiovascular Conditions
      'Hypertension': [
        'Reduce sodium intake (<2300mg daily)',
        'Maintain healthy weight (BMI 18.5-24.9)',
        'Regular aerobic exercise (150min/week)',
        'Stress management techniques',
        'Blood pressure monitoring',
        'Limit alcohol consumption',
      ],
      'Hypotension': [
        'Increase fluid intake',
        'Add salt to diet (if appropriate)',
        'Wear compression stockings',
        'Avoid sudden position changes',
        'Monitor blood pressure regularly',
      ],
      'Coronary Artery Disease': [
        'Heart-healthy diet (Mediterranean/DASH)',
        'Regular supervised exercise',
        'Medication compliance',
        'Stress management',
        'Smoking cessation',
        'Regular cardiology follow-up',
      ],
      'Heart Disease': [
        'Low-sodium, heart-healthy diet',
        'Cardiac rehabilitation program',
        'Medication adherence',
        'Weight management',
        'Regular monitoring',
      ],
      
      // Metabolic Conditions  
      'Diabetes Type 1': [
        'Continuous glucose monitoring',
        'Insulin therapy management',
        'Carbohydrate counting',
        'Regular exercise routine',
        'HbA1c monitoring every 3 months',
        'Diabetic eye/foot exams',
      ],
      'Diabetes Type 2': [
        'Blood glucose monitoring',
        'Diabetic diet plan',
        'Regular physical activity',
        'Medication compliance',
        'Weight management',
        'HbA1c monitoring every 3-6 months',
      ],
      'Prediabetes': [
        'Weight loss (5-10% body weight)',
        'Low glycemic index diet',
        'Regular exercise (150min/week)',
        'Annual glucose screening',
        'Lifestyle modification program',
      ],
      'Insulin Resistance': [
        'Low-carbohydrate diet',
        'Intermittent fasting (if appropriate)',
        'Regular strength training',
        'Weight management',
        'Insulin sensitivity monitoring',
      ],
      'Metabolic Syndrome': [
        'Mediterranean diet pattern',
        'Regular physical activity',
        'Weight reduction',
        'Blood pressure management',
        'Lipid profile monitoring',
      ],
      
      // Liver Conditions
      'Fatty Liver': [
        'Weight loss (7-10% body weight)',
        'Reduce/eliminate alcohol consumption',
        'Low-fat, high-fiber diet',
        'Regular exercise and weight management',
        'Monitor liver enzymes regularly',
        'Avoid hepatotoxic medications',
      ],
      'NASH': [
        'Significant weight loss',
        'Anti-inflammatory diet',
        'Regular monitoring of liver function',
        'Avoid alcohol completely',
        'Diabetes/insulin resistance management',
      ],
      
      // Thyroid Conditions
      'Hypothyroidism': [
        'Thyroid hormone replacement therapy',
        'Regular TSH monitoring',
        'Iodine-rich foods',
        'Selenium supplementation',
        'Avoid goitrogenic foods in excess',
      ],
      'Hyperthyroidism': [
        'Anti-thyroid medication compliance',
        'Regular thyroid function monitoring',
        'Avoid iodine excess',
        'Stress management',
        'Calcium and vitamin D supplementation',
      ],
      
      // Blood Conditions
      'Anemia': [
        'Iron-rich food consumption',
        'Vitamin C with iron-rich meals',
        'Avoid tea/coffee with meals',
        'Regular complete blood count',
        'Address underlying cause',
      ],
      'Iron Deficiency Anemia': [
        'Iron supplementation',
        'Iron-rich diet (heme iron sources)',
        'Vitamin C supplementation',
        'Avoid calcium/tea with iron',
        'Regular hemoglobin monitoring',
      ],
      
      // Digestive Conditions
      'GERD': [
        'Avoid trigger foods',
        'Smaller, more frequent meals',
        'Elevate head of bed',
        'Weight management',
        'Avoid late evening meals',
      ],
      'IBS': [
        'Low-FODMAP diet trial',
        'Stress management',
        'Regular meal timing',
        'Probiotics supplementation',
        'Food diary maintenance',
      ],
      'Celiac Disease': [
        'Strict gluten-free diet',
        'Nutrient deficiency screening',
        'Bone density monitoring',
        'Gluten-free product education',
        'Regular follow-up with gastroenterologist',
      ],
      
      // Autoimmune Conditions
      'Rheumatoid Arthritis': [
        'Anti-inflammatory diet',
        'Regular low-impact exercise',
        'Medication compliance',
        'Joint protection techniques',
        'Regular rheumatology follow-up',
      ],
      'Lupus': [
        'Sun protection measures',
        'Anti-inflammatory diet',
        'Regular exercise as tolerated',
        'Stress management',
        'Regular monitoring of organ function',
      ],
      
      // Bone Health
      'Osteoporosis': [
        'Calcium and vitamin D supplementation',
        'Weight-bearing exercises',
        'Fall prevention measures',
        'Bone density monitoring',
        'Limit alcohol and caffeine',
      ],
      'Osteopenia': [
        'Adequate calcium and vitamin D intake',
        'Regular weight-bearing exercise',
        'Lifestyle modifications',
        'Bone density monitoring',
        'Risk factor assessment',
      ],
      
      // Mental Health
      'Depression': [
        'Regular counseling/therapy',
        'Medication compliance if prescribed',
        'Regular exercise routine',
        'Social support maintenance',
        'Sleep hygiene practices',
      ],
      'Anxiety': [
        'Stress management techniques',
        'Regular physical activity',
        'Adequate sleep (7-9 hours)',
        'Limit caffeine intake',
        'Mindfulness/meditation practice',
      ],
      
      // Default for unspecified conditions
    };
    return plans[condition] || ['Regular monitoring and lifestyle modifications', 'Consult with healthcare provider', 'Maintain healthy diet and exercise'];
  }

  private getRelatedBiomarkers(condition: string): string[] {
    const relations: Record<string, string[]> = {
      // Cardiovascular
      'Hypertension': ['blood pressure systolic', 'blood pressure diastolic', 'sodium', 'potassium'],
      'Hypotension': ['blood pressure systolic', 'blood pressure diastolic'],
      'Coronary Artery Disease': ['total cholesterol', 'ldl cholesterol', 'hdl cholesterol', 'triglycerides', 'crp'],
      'Heart Disease': ['total cholesterol', 'ldl cholesterol', 'hdl cholesterol', 'triglycerides', 'crp', 'homocysteine'],
      'High Cholesterol': ['total cholesterol', 'ldl cholesterol', 'hdl cholesterol', 'triglycerides'],
      
      // Metabolic
      'Diabetes Type 1': ['hba1c', 'fasting glucose', 'insulin', 'c-peptide'],
      'Diabetes Type 2': ['hba1c', 'fasting glucose', 'insulin', 'c-peptide'],
      'Prediabetes': ['hba1c', 'fasting glucose', 'insulin'],
      'Insulin Resistance': ['hba1c', 'fasting glucose', 'insulin'],
      'Metabolic Syndrome': ['hba1c', 'fasting glucose', 'triglycerides', 'hdl cholesterol', 'blood pressure systolic'],
      'Obesity': ['hba1c', 'fasting glucose', 'insulin', 'triglycerides'],
      
      // Liver
      'Fatty Liver': ['alt', 'ast', 'triglycerides', 'hba1c'],
      'NASH': ['alt', 'ast', 'alp', 'bilirubin total', 'triglycerides'],
      'Hepatitis': ['alt', 'ast', 'alp', 'bilirubin total'],
      'Liver Cirrhosis': ['alt', 'ast', 'alp', 'bilirubin total', 'albumin'],
      
      // Kidney
      'Chronic Kidney Disease': ['creatinine', 'bun', 'egfr', 'uric acid'],
      'Kidney Stones': ['creatinine', 'bun', 'uric acid', 'calcium'],
      
      // Thyroid
      'Hypothyroidism': ['tsh', 'free t4', 'free t3'],
      'Hyperthyroidism': ['tsh', 'free t4', 'free t3'],
      'Hashimoto\'s Disease': ['tsh', 'free t4', 'free t3'],
      'Graves\' Disease': ['tsh', 'free t4', 'free t3'],
      
      // Blood/Hematological
      'Anemia': ['hemoglobin', 'hematocrit', 'rbc count', 'mcv', 'ferritin'],
      'Iron Deficiency Anemia': ['hemoglobin', 'hematocrit', 'ferritin', 'tibc', 'transferrin saturation'],
      'B12 Deficiency Anemia': ['hemoglobin', 'hematocrit', 'mcv', 'vitamin b12'],
      'Hemochromatosis': ['ferritin', 'transferrin saturation', 'iron'],
      'Thrombocytopenia': ['platelet count'],
      
      // Inflammatory
      'Rheumatoid Arthritis': ['crp', 'esr'],
      'Lupus': ['crp', 'esr'],
      'Multiple Sclerosis': ['crp'],
      
      // Bone Health
      'Osteoporosis': ['calcium', 'vitamin d3', 'pth'],
      'Osteopenia': ['calcium', 'vitamin d3', 'pth'],
      
      // Hormonal
      'PCOS': ['testosterone total', 'insulin', 'hba1c'],
      'Low Testosterone': ['testosterone total', 'testosterone free'],
      'Adrenal Fatigue': ['cortisol', 'dhea-s'],
      
      // Other
      'Gout': ['uric acid'],
      'Chronic Fatigue': ['tsh', 'cortisol', 'vitamin d3', 'vitamin b12'],
      'Depression': ['tsh', 'vitamin d3', 'vitamin b12'],
      'Anxiety': ['cortisol', 'magnesium'],
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

    return Array.from(new Set(recommendations)); // Remove duplicates
  }
}