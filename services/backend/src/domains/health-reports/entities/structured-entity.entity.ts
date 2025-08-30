import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { HealthReport } from './health-report.entity';

export enum EntityType {
  BIOMARKER = 'biomarker',
  LAB_VALUE = 'lab_value',
  MEASUREMENT = 'measurement',
  OBSERVATION = 'observation',
  DIAGNOSIS = 'diagnosis',
  MEDICATION = 'medication',
  PROCEDURE = 'procedure',
  ALLERGY = 'allergy',
  VITAL_SIGN = 'vital_sign',
}

export enum DataType {
  NUMERIC = 'numeric',
  TEXT = 'text',
  CATEGORICAL = 'categorical',
  BOOLEAN = 'boolean',
  DATE = 'date',
  RANGE = 'range',
}

export enum CriticalityLevel {
  NORMAL = 'normal',
  BORDERLINE = 'borderline',
  HIGH = 'high',
  LOW = 'low',
  CRITICAL_HIGH = 'critical_high',
  CRITICAL_LOW = 'critical_low',
  ABNORMAL = 'abnormal',
}

@Entity('structured_entities')
@Index(['healthReportId', 'entityType'])
@Index(['standardCode', 'codeSystem'])
@Index(['entityName', 'entityType'])
export class StructuredEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'health_report_id' })
  healthReportId: string;

  @Column({
    type: 'enum',
    enum: EntityType,
    name: 'entity_type',
  })
  entityType: EntityType;

  @Column({ name: 'entity_name', length: 200 })
  entityName: string; // e.g., "Hemoglobin", "Blood Glucose", "Total Cholesterol"

  @Column({ name: 'entity_name_hindi', length: 200, nullable: true })
  entityNameHindi?: string; // Hindi/regional language name

  @Column({ name: 'category', length: 100, nullable: true })
  category?: string; // e.g., "Complete Blood Count", "Lipid Profile"

  // Value information
  @Column({
    type: 'enum',
    enum: DataType,
    name: 'data_type',
  })
  dataType: DataType;

  @Column({ name: 'value_numeric', type: 'decimal', precision: 15, scale: 4, nullable: true })
  valueNumeric?: number;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText?: string;

  @Column({ name: 'value_boolean', type: 'boolean', nullable: true })
  valueBoolean?: boolean;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate?: Date;

  @Column({ name: 'value_range_min', type: 'decimal', precision: 15, scale: 4, nullable: true })
  valueRangeMin?: number;

  @Column({ name: 'value_range_max', type: 'decimal', precision: 15, scale: 4, nullable: true })
  valueRangeMax?: number;

  // Reference ranges
  @Column({ name: 'reference_range_min', type: 'decimal', precision: 15, scale: 4, nullable: true })
  referenceRangeMin?: number;

  @Column({ name: 'reference_range_max', type: 'decimal', precision: 15, scale: 4, nullable: true })
  referenceRangeMax?: number;

  @Column({ name: 'reference_range_text', length: 200, nullable: true })
  referenceRangeText?: string; // e.g., "Normal", "Negative", "Reactive"

  @Column({ length: 20, nullable: true })
  unit: string; // e.g., "mg/dL", "g/dL", "IU/L", "%"

  // Clinical interpretation
  @Column({
    type: 'enum',
    enum: CriticalityLevel,
    name: 'criticality_level',
    default: CriticalityLevel.NORMAL,
  })
  criticalityLevel: CriticalityLevel;

  @Column({ name: 'is_abnormal', type: 'boolean', default: false })
  isAbnormal: boolean;

  @Column({ name: 'clinical_significance', type: 'text', nullable: true })
  clinicalSignificance?: string;

  @Column({ name: 'trend_indicator', length: 20, nullable: true })
  trendIndicator?: string; // 'increasing', 'decreasing', 'stable'

  // Standardization and coding
  @Column({ name: 'standard_code', length: 50, nullable: true })
  standardCode?: string; // LOINC, SNOMED, ICD codes

  @Column({ name: 'code_system', length: 50, nullable: true })
  codeSystem?: string; // 'LOINC', 'SNOMED-CT', 'ICD-10'

  @Column({ name: 'alternative_names', type: 'text', array: true, default: [] })
  alternativeNames: string[]; // Alternative names for the same entity

  // Extraction metadata
  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore?: number; // AI extraction confidence (0-100)

  @Column({ name: 'extraction_method', length: 50, default: 'ocr_ai' })
  extractionMethod: string; // 'ocr_ai', 'manual', 'api'

  @Column({ name: 'source_location', type: 'jsonb', nullable: true })
  sourceLocation?: {
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }; // Where in the document this was found

  @Column({ name: 'original_text', type: 'text', nullable: true })
  originalText?: string; // Original OCR text

  // Quality and validation
  @Column({ name: 'manually_verified', type: 'boolean', default: false })
  manuallyVerified: boolean;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes?: string;

  @Column({ name: 'data_quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  dataQualityScore?: number; // Overall data quality (0-100)

  // Temporal information
  @Column({ name: 'measurement_date', type: 'timestamp', nullable: true })
  measurementDate?: Date;

  @Column({ name: 'fasting_status', type: 'boolean', nullable: true })
  fastingStatus?: boolean;

  @Column({ name: 'specimen_type', length: 100, nullable: true })
  specimenType?: string; // 'serum', 'plasma', 'whole blood', etc.

  // Additional metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  flags: string[]; // 'H' (High), 'L' (Low), 'A' (Abnormal), etc.

  // Relationships and tracking
  @Column({ name: 'parent_entity_id', nullable: true })
  parentEntityId?: string; // For hierarchical relationships

  @Column({ name: 'related_entity_ids', type: 'text', array: true, default: [] })
  relatedEntityIds: string[]; // IDs of related entities

  // Data classification
  @Column({ name: 'phi_classification', default: 'PHI' })
  phiClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => HealthReport, (report) => report.structuredEntities)
  @JoinColumn({ name: 'health_report_id' })
  healthReport: HealthReport;

  // Helper methods
  getValue(): any {
    switch (this.dataType) {
      case DataType.NUMERIC:
        return this.valueNumeric;
      case DataType.TEXT:
        return this.valueText;
      case DataType.BOOLEAN:
        return this.valueBoolean;
      case DataType.DATE:
        return this.valueDate;
      case DataType.RANGE:
        return { min: this.valueRangeMin, max: this.valueRangeMax };
      default:
        return null;
    }
  }

  setValue(value: any, dataType?: DataType): void {
    // Clear all value fields first
    this.valueNumeric = null;
    this.valueText = null;
    this.valueBoolean = null;
    this.valueDate = null;
    this.valueRangeMin = null;
    this.valueRangeMax = null;

    const type = dataType || this.dataType;

    switch (type) {
      case DataType.NUMERIC:
        this.valueNumeric = Number(value);
        break;
      case DataType.TEXT:
        this.valueText = String(value);
        break;
      case DataType.BOOLEAN:
        this.valueBoolean = Boolean(value);
        break;
      case DataType.DATE:
        this.valueDate = value instanceof Date ? value : new Date(value);
        break;
      case DataType.RANGE:
        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          this.valueRangeMin = Number(value.min);
          this.valueRangeMax = Number(value.max);
        }
        break;
    }

    this.dataType = type;
  }

  isWithinReferenceRange(): boolean | null {
    if (this.dataType !== DataType.NUMERIC || this.valueNumeric === null) {
      return null;
    }

    if (this.referenceRangeMin !== null && this.valueNumeric < this.referenceRangeMin) {
      return false;
    }

    if (this.referenceRangeMax !== null && this.valueNumeric > this.referenceRangeMax) {
      return false;
    }

    return true;
  }

  calculateDeviationFromRange(): number | null {
    if (!this.isWithinReferenceRange() || this.valueNumeric === null) {
      return null;
    }

    if (this.referenceRangeMin !== null && this.valueNumeric < this.referenceRangeMin) {
      return ((this.valueNumeric - this.referenceRangeMin) / this.referenceRangeMin) * 100;
    }

    if (this.referenceRangeMax !== null && this.valueNumeric > this.referenceRangeMax) {
      return ((this.valueNumeric - this.referenceRangeMax) / this.referenceRangeMax) * 100;
    }

    return 0; // Within range
  }

  updateCriticality(): void {
    const isWithinRange = this.isWithinReferenceRange();

    if (isWithinRange === null) {
      this.criticalityLevel = CriticalityLevel.NORMAL;
      return;
    }

    if (isWithinRange) {
      this.criticalityLevel = CriticalityLevel.NORMAL;
      this.isAbnormal = false;
    } else {
      const deviation = this.calculateDeviationFromRange();

      if (deviation !== null) {
        if (Math.abs(deviation) > 50) {
          this.criticalityLevel =
            deviation > 0 ? CriticalityLevel.CRITICAL_HIGH : CriticalityLevel.CRITICAL_LOW;
        } else if (Math.abs(deviation) > 20) {
          this.criticalityLevel = deviation > 0 ? CriticalityLevel.HIGH : CriticalityLevel.LOW;
        } else {
          this.criticalityLevel = CriticalityLevel.BORDERLINE;
        }
      } else {
        this.criticalityLevel = CriticalityLevel.ABNORMAL;
      }

      this.isAbnormal = true;
    }
  }

  verify(notes?: string): void {
    this.manuallyVerified = true;
    this.verificationNotes = notes;
  }

  addFlag(flag: string): void {
    if (!this.flags.includes(flag)) {
      this.flags.push(flag);
    }
  }

  removeFlag(flag: string): void {
    this.flags = this.flags.filter((f) => f !== flag);
  }
}
