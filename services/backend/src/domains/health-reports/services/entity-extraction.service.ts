import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuredEntity, EntityType, DataType, CriticalityLevel } from '../entities/structured-entity.entity';
import { AIRoutingService } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';

export interface ExtractedEntity {
  entityName: string;
  entityType: EntityType;
  value: any;
  unit?: string;
  dataType: DataType;
  referenceRange?: {
    min?: number;
    max?: number;
    text?: string;
  };
  confidence: number;
  originalText: string;
  sourceLocation?: {
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  standardCode?: string;
  codeSystem?: string;
  category?: string;
  flags?: string[];
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  processingTimeMs: number;
  confidence: number;
  extractionMethod: string;
  aiProvider?: string;
  unrecognizedText: string[];
}

export interface BiomakrerMapping {
  names: string[];
  standardName: string;
  category: string;
  entityType: EntityType;
  dataType: DataType;
  units: string[];
  standardUnit: string;
  loincCode?: string;
  snomedCode?: string;
  referenceRanges: {
    ageGroup: string;
    gender: 'male' | 'female' | 'all';
    min?: number;
    max?: number;
    text?: string;
  }[];
}

@Injectable()
export class EntityExtractionService {
  private readonly logger = new Logger(EntityExtractionService.name);
  private readonly biomarkerMappings: Map<string, BiomakrerMapping> = new Map();

  constructor(
    @InjectRepository(StructuredEntity)
    private readonly structuredEntityRepository: Repository<StructuredEntity>,
    private readonly configService: ConfigService,
    private readonly aiRoutingService: AIRoutingService,
  ) {
    this.initializeBiomarkerMappings();
  }

  /**
   * Extract structured entities from OCR text using AI-powered NER
   */
  async extractEntities(
    text: string,
    options: {
      userId?: string;
      sessionId?: string;
      healthReportId: string;
      userAge?: number;
      userGender?: 'male' | 'female';
      tableData?: any[];
      documentSections?: any[];
    },
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    this.logger.debug(`Starting entity extraction for health report: ${options.healthReportId}`);

    try {
      // Use AI routing for Level 1 (highest accuracy) processing
      const routingResult = await this.aiRoutingService.routeRequest({
        userId: options.userId,
        sessionId: options.sessionId,
        requestType: RequestType.HEALTH_REPORT_ANALYSIS,
        contextTokens: this.estimateTokens(text),
        maxResponseTokens: 2000,
        accuracyRequirement: 0.95, // High accuracy for health data
      });

      // Extract entities using AI-powered analysis
      const extractedEntities = await this.performAIExtraction(text, routingResult, options);

      // Enhance with rule-based extraction for known patterns
      const ruleBasedEntities = this.performRuleBasedExtraction(text, options);

      // Merge and deduplicate results
      const mergedEntities = this.mergeExtractionResults(extractedEntities, ruleBasedEntities);

      // Normalize units and reference ranges
      const normalizedEntities = this.normalizeEntities(mergedEntities, options);

      // Validate and score entities
      const validatedEntities = this.validateExtractedEntities(normalizedEntities);

      const result: ExtractionResult = {
        entities: validatedEntities,
        processingTimeMs: Date.now() - startTime,
        confidence: this.calculateOverallConfidence(validatedEntities),
        extractionMethod: 'ai_enhanced_ner',
        aiProvider: routingResult.provider,
        unrecognizedText: this.findUnrecognizedText(text, validatedEntities),
      };

      this.logger.log(`Entity extraction completed: ${validatedEntities.length} entities found in ${result.processingTimeMs}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Entity extraction failed: ${error.message}`);
      
      // Fallback to rule-based extraction only
      const fallbackEntities = this.performRuleBasedExtraction(text, options);
      const normalizedEntities = this.normalizeEntities(fallbackEntities, options);
      
      return {
        entities: normalizedEntities,
        processingTimeMs: Date.now() - startTime,
        confidence: 0.7, // Lower confidence for fallback
        extractionMethod: 'rule_based_fallback',
        unrecognizedText: [],
      };
    }
  }

  /**
   * AI-powered entity extraction using Level 1 routing
   */
  private async performAIExtraction(
    text: string,
    routingResult: any,
    options: any,
  ): Promise<ExtractedEntity[]> {
    // This would make actual API call to the routed AI provider
    // For now, implementing mock extraction that follows the patterns
    
    const prompt = this.buildExtractionPrompt(text, options);
    
    // Mock AI response - in production, this would call the actual AI provider
    const mockEntities: ExtractedEntity[] = [
      {
        entityName: 'Total Cholesterol',
        entityType: EntityType.BIOMARKER,
        value: 195,
        unit: 'mg/dL',
        dataType: DataType.NUMERIC,
        referenceRange: { max: 200, text: '<200 mg/dL' },
        confidence: 0.96,
        originalText: 'Total Cholesterol: 195 mg/dL (Normal: <200 mg/dL)',
        standardCode: '2093-3',
        codeSystem: 'LOINC',
        category: 'Lipid Profile',
      },
      {
        entityName: 'LDL Cholesterol',
        entityType: EntityType.BIOMARKER,
        value: 115,
        unit: 'mg/dL',
        dataType: DataType.NUMERIC,
        referenceRange: { max: 100, text: '<100 mg/dL' },
        confidence: 0.95,
        originalText: 'LDL Cholesterol: 115 mg/dL (Normal: <100 mg/dL) - HIGH',
        standardCode: '18262-6',
        codeSystem: 'LOINC',
        category: 'Lipid Profile',
        flags: ['H'],
      },
      {
        entityName: 'HDL Cholesterol',
        entityType: EntityType.BIOMARKER,
        value: 45,
        unit: 'mg/dL',
        dataType: DataType.NUMERIC,
        referenceRange: { min: 40, text: '>40 mg/dL' },
        confidence: 0.94,
        originalText: 'HDL Cholesterol: 45 mg/dL (Normal: >40 mg/dL)',
        standardCode: '2085-9',
        codeSystem: 'LOINC',
        category: 'Lipid Profile',
      },
      {
        entityName: 'Fasting Glucose',
        entityType: EntityType.BIOMARKER,
        value: 102,
        unit: 'mg/dL',
        dataType: DataType.NUMERIC,
        referenceRange: { min: 70, max: 100, text: '70-100 mg/dL' },
        confidence: 0.97,
        originalText: 'Fasting Glucose: 102 mg/dL (Normal: 70-100 mg/dL) - HIGH',
        standardCode: '1558-6',
        codeSystem: 'LOINC',
        category: 'Diabetes Panel',
        flags: ['H'],
      },
      {
        entityName: 'HbA1c',
        entityType: EntityType.BIOMARKER,
        value: 5.8,
        unit: '%',
        dataType: DataType.NUMERIC,
        referenceRange: { max: 5.7, text: '<5.7%' },
        confidence: 0.96,
        originalText: 'HbA1c: 5.8% (Normal: <5.7%) - BORDERLINE',
        standardCode: '4548-4',
        codeSystem: 'LOINC',
        category: 'Diabetes Panel',
        flags: ['H'],
      },
      {
        entityName: 'Hemoglobin',
        entityType: EntityType.BIOMARKER,
        value: 14.2,
        unit: 'g/dL',
        dataType: DataType.NUMERIC,
        referenceRange: { min: 13.5, max: 17.5, text: '13.5-17.5 g/dL' },
        confidence: 0.98,
        originalText: 'Hemoglobin: 14.2 g/dL (Normal: 13.5-17.5 g/dL)',
        standardCode: '718-7',
        codeSystem: 'LOINC',
        category: 'Complete Blood Count',
      },
      {
        entityName: 'Vitamin D',
        entityType: EntityType.BIOMARKER,
        value: 28,
        unit: 'ng/mL',
        dataType: DataType.NUMERIC,
        referenceRange: { min: 30, max: 100, text: '30-100 ng/mL' },
        confidence: 0.95,
        originalText: 'Vitamin D: 28 ng/mL (Normal: 30-100 ng/mL) - LOW',
        standardCode: '25058-6',
        codeSystem: 'LOINC',
        category: 'Vitamin Levels',
        flags: ['L'],
      },
    ];

    return mockEntities;
  }

  /**
   * Rule-based extraction for known biomarker patterns
   */
  private performRuleBasedExtraction(text: string, options: any): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    // Extract numeric biomarkers with units
    const numericPattern = /([A-Za-z\s]+):\s*(\d+\.?\d*)\s*([a-zA-Z\/μμ%]+)/g;
    let match;
    
    while ((match = numericPattern.exec(text)) !== null) {
      const [fullMatch, name, value, unit] = match;
      const cleanName = name.trim();
      
      // Check if this is a known biomarker
      const mapping = this.findBiomarkerMapping(cleanName);
      if (mapping) {
        entities.push({
          entityName: mapping.standardName,
          entityType: mapping.entityType,
          value: parseFloat(value),
          unit: this.normalizeUnit(unit, mapping.units, mapping.standardUnit),
          dataType: mapping.dataType,
          confidence: 0.85, // Rule-based has lower confidence than AI
          originalText: fullMatch,
          standardCode: mapping.loincCode,
          codeSystem: mapping.loincCode ? 'LOINC' : undefined,
          category: mapping.category,
        });
      }
    }

    // Extract percentage values
    const percentagePattern = /([A-Za-z\s]+):\s*(\d+\.?\d*)%/g;
    while ((match = percentagePattern.exec(text)) !== null) {
      const [fullMatch, name, value] = match;
      const cleanName = name.trim();
      
      const mapping = this.findBiomarkerMapping(cleanName);
      if (mapping) {
        entities.push({
          entityName: mapping.standardName,
          entityType: mapping.entityType,
          value: parseFloat(value),
          unit: '%',
          dataType: DataType.NUMERIC,
          confidence: 0.85,
          originalText: fullMatch,
          standardCode: mapping.loincCode,
          codeSystem: mapping.loincCode ? 'LOINC' : undefined,
          category: mapping.category,
        });
      }
    }

    return entities;
  }

  /**
   * Build extraction prompt for AI processing
   */
  private buildExtractionPrompt(text: string, options: any): string {
    return `
Extract all medical test results, biomarkers, and lab values from the following health report text.
For each entity found, provide:
1. Entity name (standardized)
2. Numeric value (if applicable)
3. Unit of measurement
4. Reference range (if mentioned)
5. Any flags (H, L, High, Low, etc.)
6. Category/test panel name

Focus on:
- Blood chemistry panels (glucose, cholesterol, liver function, kidney function)
- Complete blood count (CBC) values
- Hormone levels (thyroid, etc.)
- Vitamin and mineral levels
- Cardiac markers
- Inflammatory markers

Text to analyze:
${text}

Return structured data in JSON format.
    `;
  }

  /**
   * Merge AI and rule-based extraction results
   */
  private mergeExtractionResults(aiEntities: ExtractedEntity[], ruleEntities: ExtractedEntity[]): ExtractedEntity[] {
    const merged = [...aiEntities];
    
    // Add rule-based entities that weren't found by AI
    for (const ruleEntity of ruleEntities) {
      const exists = aiEntities.some(aiEntity => 
        aiEntity.entityName.toLowerCase() === ruleEntity.entityName.toLowerCase()
      );
      
      if (!exists) {
        merged.push(ruleEntity);
      }
    }
    
    return merged;
  }

  /**
   * Normalize units and apply reference ranges
   */
  private normalizeEntities(entities: ExtractedEntity[], options: any): ExtractedEntity[] {
    return entities.map(entity => {
      const mapping = this.findBiomarkerMapping(entity.entityName);
      if (mapping) {
        // Normalize unit
        entity.unit = this.normalizeUnit(entity.unit, mapping.units, mapping.standardUnit);
        
        // Apply age/gender-specific reference range
        const refRange = this.getAgeGenderSpecificRange(mapping, options.userAge, options.userGender);
        if (refRange && !entity.referenceRange) {
          entity.referenceRange = refRange;
        }
        
        // Set standard codes
        if (mapping.loincCode) {
          entity.standardCode = mapping.loincCode;
          entity.codeSystem = 'LOINC';
        }
        
        entity.category = mapping.category;
      }
      
      return entity;
    });
  }

  /**
   * Validate extracted entities
   */
  private validateExtractedEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    return entities.filter(entity => {
      // Minimum confidence threshold
      if (entity.confidence < 0.7) {
        return false;
      }
      
      // Must have a value for numeric entities
      if (entity.dataType === DataType.NUMERIC && (entity.value === null || entity.value === undefined)) {
        return false;
      }
      
      // Reasonable value ranges
      if (entity.dataType === DataType.NUMERIC) {
        if (entity.value < 0 || entity.value > 100000) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0;
    
    const totalConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0);
    return totalConfidence / entities.length;
  }

  /**
   * Find text that wasn't recognized as entities
   */
  private findUnrecognizedText(text: string, entities: ExtractedEntity[]): string[] {
    // Simple implementation - in production would be more sophisticated
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const recognizedLines = entities.map(e => e.originalText);
    
    return lines.filter(line => 
      !recognizedLines.some(recognized => 
        line.includes(recognized) || recognized.includes(line)
      )
    );
  }

  /**
   * Estimate token count for AI routing
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Find biomarker mapping by name
   */
  private findBiomarkerMapping(name: string): BiomakrerMapping | undefined {
    const normalized = name.toLowerCase().trim();
    
    for (const [key, mapping] of this.biomarkerMappings.entries()) {
      if (mapping.names.some(mappingName => 
        mappingName.toLowerCase() === normalized ||
        normalized.includes(mappingName.toLowerCase()) ||
        mappingName.toLowerCase().includes(normalized)
      )) {
        return mapping;
      }
    }
    
    return undefined;
  }

  /**
   * Normalize unit to standard format
   */
  private normalizeUnit(unit: string, validUnits: string[], standardUnit: string): string {
    if (!unit) return standardUnit;
    
    const normalized = unit.toLowerCase().trim();
    const found = validUnits.find(validUnit => 
      validUnit.toLowerCase() === normalized ||
      validUnit.toLowerCase().replace(/[\/\s]/g, '') === normalized.replace(/[\/\s]/g, '')
    );
    
    return found || standardUnit;
  }

  /**
   * Get age and gender specific reference range
   */
  private getAgeGenderSpecificRange(
    mapping: BiomakrerMapping, 
    age?: number, 
    gender?: 'male' | 'female'
  ): { min?: number; max?: number; text?: string } | undefined {
    
    if (!age || !gender) {
      // Return general range
      const generalRange = mapping.referenceRanges.find(r => r.gender === 'all');
      return generalRange ? {
        min: generalRange.min,
        max: generalRange.max,
        text: generalRange.text,
      } : undefined;
    }
    
    // Find age-specific range
    const ageGroup = age >= 65 ? 'elderly' : age >= 40 ? 'adult' : 'young_adult';
    const specificRange = mapping.referenceRanges.find(r => 
      r.ageGroup === ageGroup && (r.gender === gender || r.gender === 'all')
    );
    
    if (specificRange) {
      return {
        min: specificRange.min,
        max: specificRange.max,
        text: specificRange.text,
      };
    }
    
    // Fallback to general range
    const fallbackRange = mapping.referenceRanges.find(r => r.gender === 'all');
    return fallbackRange ? {
      min: fallbackRange.min,
      max: fallbackRange.max,
      text: fallbackRange.text,
    } : undefined;
  }

  /**
   * Initialize biomarker mappings with standard reference ranges
   */
  private initializeBiomarkerMappings(): void {
    // Lipid Profile
    this.biomarkerMappings.set('total_cholesterol', {
      names: ['Total Cholesterol', 'Cholesterol Total', 'Cholesterol', 'TC'],
      standardName: 'Total Cholesterol',
      category: 'Lipid Profile',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['mg/dL', 'mg/dl', 'mmol/L'],
      standardUnit: 'mg/dL',
      loincCode: '2093-3',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'all', max: 200, text: '<200 mg/dL' },
        { ageGroup: 'elderly', gender: 'all', max: 240, text: '<240 mg/dL' },
      ],
    });

    this.biomarkerMappings.set('ldl_cholesterol', {
      names: ['LDL Cholesterol', 'LDL', 'Low Density Lipoprotein'],
      standardName: 'LDL Cholesterol',
      category: 'Lipid Profile',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['mg/dL', 'mg/dl', 'mmol/L'],
      standardUnit: 'mg/dL',
      loincCode: '18262-6',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'all', max: 100, text: '<100 mg/dL (Optimal)' },
        { ageGroup: 'elderly', gender: 'all', max: 130, text: '<130 mg/dL' },
      ],
    });

    this.biomarkerMappings.set('hdl_cholesterol', {
      names: ['HDL Cholesterol', 'HDL', 'High Density Lipoprotein'],
      standardName: 'HDL Cholesterol',
      category: 'Lipid Profile',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['mg/dL', 'mg/dl', 'mmol/L'],
      standardUnit: 'mg/dL',
      loincCode: '2085-9',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'male', min: 40, text: '>40 mg/dL' },
        { ageGroup: 'adult', gender: 'female', min: 50, text: '>50 mg/dL' },
      ],
    });

    // Diabetes Panel
    this.biomarkerMappings.set('fasting_glucose', {
      names: ['Fasting Glucose', 'Glucose Fasting', 'FBG', 'Fasting Blood Sugar', 'FBS'],
      standardName: 'Fasting Glucose',
      category: 'Diabetes Panel',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['mg/dL', 'mg/dl', 'mmol/L'],
      standardUnit: 'mg/dL',
      loincCode: '1558-6',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'all', min: 70, max: 100, text: '70-100 mg/dL' },
      ],
    });

    this.biomarkerMappings.set('hba1c', {
      names: ['HbA1c', 'Hemoglobin A1c', 'Glycated Hemoglobin', 'A1C'],
      standardName: 'HbA1c',
      category: 'Diabetes Panel',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['%', 'percent'],
      standardUnit: '%',
      loincCode: '4548-4',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'all', max: 5.7, text: '<5.7% (Normal)' },
      ],
    });

    // Complete Blood Count
    this.biomarkerMappings.set('hemoglobin', {
      names: ['Hemoglobin', 'Hb', 'Haemoglobin'],
      standardName: 'Hemoglobin',
      category: 'Complete Blood Count',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['g/dL', 'g/dl', 'g/L'],
      standardUnit: 'g/dL',
      loincCode: '718-7',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'male', min: 13.5, max: 17.5, text: '13.5-17.5 g/dL' },
        { ageGroup: 'adult', gender: 'female', min: 12.0, max: 16.0, text: '12.0-16.0 g/dL' },
      ],
    });

    // Vitamins
    this.biomarkerMappings.set('vitamin_d', {
      names: ['Vitamin D', '25-OH Vitamin D', '25(OH)D', 'Vitamin D3'],
      standardName: 'Vitamin D',
      category: 'Vitamin Levels',
      entityType: EntityType.BIOMARKER,
      dataType: DataType.NUMERIC,
      units: ['ng/mL', 'ng/ml', 'nmol/L'],
      standardUnit: 'ng/mL',
      loincCode: '25058-6',
      referenceRanges: [
        { ageGroup: 'adult', gender: 'all', min: 30, max: 100, text: '30-100 ng/mL' },
      ],
    });

    // Add more biomarkers as needed...
  }
}