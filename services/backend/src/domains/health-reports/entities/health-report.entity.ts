import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StructuredEntity } from './structured-entity.entity';

export enum HealthReportType {
  BLOOD_TEST = 'blood_test',
  URINE_TEST = 'urine_test',
  LIPID_PROFILE = 'lipid_profile',
  LIVER_FUNCTION = 'liver_function',
  KIDNEY_FUNCTION = 'kidney_function',
  THYROID_FUNCTION = 'thyroid_function',
  DIABETES_PANEL = 'diabetes_panel',
  VITAMIN_PANEL = 'vitamin_panel',
  MINERAL_PANEL = 'mineral_panel',
  HORMONE_PANEL = 'hormone_panel',
  CARDIAC_MARKERS = 'cardiac_markers',
  INFLAMMATORY_MARKERS = 'inflammatory_markers',
  CANCER_MARKERS = 'cancer_markers',
  ALLERGY_TEST = 'allergy_test',
  X_RAY = 'x_ray',
  ULTRASOUND = 'ultrasound',
  ECG = 'ecg',
  ECHO = 'echo',
  CT_SCAN = 'ct_scan',
  MRI = 'mri',
  ENDOSCOPY = 'endoscopy',
  BIOPSY = 'biopsy',
  OTHER = 'other',
}

export enum ProcessingStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  MANUAL_REVIEW = 'manual_review',
  ARCHIVED = 'archived',
}

@Entity('health_reports')
@Index(['userId', 'reportType', 'testDate'])
@Index(['processingStatus', 'createdAt'])
export class HealthReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: HealthReportType,
    name: 'report_type',
  })
  reportType: HealthReportType;

  @Column({ name: 'report_title', length: 200 })
  reportTitle: string;

  @Column({ name: 'test_date', type: 'date' })
  testDate: Date;

  @Column({ name: 'lab_name', length: 200, nullable: true })
  labName?: string;

  @Column({ name: 'doctor_name', length: 200, nullable: true })
  doctorName?: string;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber?: string;

  // File storage metadata
  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number; // in bytes

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'storage_path', length: 500 })
  storagePath: string; // S3/GCS path

  @Column({ name: 'storage_bucket', length: 100 })
  storageBucket: string;

  @Column({ name: 'file_hash', length: 128 })
  fileHash: string; // SHA-256 hash for integrity

  @Column({ name: 'encrypted', default: true })
  encrypted: boolean;

  // Processing metadata
  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    name: 'processing_status',
    default: ProcessingStatus.UPLOADED,
  })
  processingStatus: ProcessingStatus;

  @Column({ name: 'ocr_confidence', type: 'decimal', precision: 5, scale: 2, nullable: true })
  ocrConfidence?: number; // 0-100

  @Column({ name: 'ai_processing_version', length: 50, nullable: true })
  aiProcessingVersion?: string;

  @Column({ name: 'processing_started_at', type: 'timestamp', nullable: true })
  processingStartedAt?: Date;

  @Column({ name: 'processing_completed_at', type: 'timestamp', nullable: true })
  processingCompletedAt?: Date;

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError?: string;

  // Manual review
  @Column({ name: 'requires_manual_review', default: false })
  requiresManualReview: boolean;

  @Column({ name: 'reviewed_by', length: 100, nullable: true })
  reviewedBy?: string; // Admin/doctor ID

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string;

  // Extracted text content (encrypted)
  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText?: string;

  // Metadata and tags
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  tags: string[];

  // Privacy and compliance
  @Column({ name: 'phi_classification', default: 'PHI' })
  phiClassification: string;

  @Column({ name: 'data_residency_region', length: 10 })
  dataResidencyRegion: string;

  @Column({ name: 'retention_policy', length: 50, default: '7_years' })
  retentionPolicy: string;

  @Column({ name: 'consent_id', length: 36, nullable: true })
  consentId?: string;

  // Audit trail
  @Column({ name: 'uploaded_ip', length: 45, nullable: true })
  uploadedIp?: string;

  @Column({ name: 'uploaded_user_agent', length: 500, nullable: true })
  uploadedUserAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => StructuredEntity, (entity) => entity.healthReport, {
    cascade: true,
  })
  structuredEntities: StructuredEntity[];

  // Helper methods
  isProcessed(): boolean {
    return this.processingStatus === ProcessingStatus.PROCESSED;
  }

  isProcessing(): boolean {
    return this.processingStatus === ProcessingStatus.PROCESSING;
  }

  hasFailed(): boolean {
    return this.processingStatus === ProcessingStatus.FAILED;
  }

  needsReview(): boolean {
    return this.processingStatus === ProcessingStatus.MANUAL_REVIEW || this.requiresManualReview;
  }

  markAsProcessing(): void {
    this.processingStatus = ProcessingStatus.PROCESSING;
    this.processingStartedAt = new Date();
  }

  markAsProcessed(confidence?: number, version?: string): void {
    this.processingStatus = ProcessingStatus.PROCESSED;
    this.processingCompletedAt = new Date();
    if (confidence !== undefined) this.ocrConfidence = confidence;
    if (version) this.aiProcessingVersion = version;
  }

  markAsFailed(error: string): void {
    this.processingStatus = ProcessingStatus.FAILED;
    this.processingCompletedAt = new Date();
    this.processingError = error;
  }

  markForReview(reason?: string): void {
    this.processingStatus = ProcessingStatus.MANUAL_REVIEW;
    this.requiresManualReview = true;
    if (reason) this.reviewNotes = reason;
  }

  completeReview(reviewerId: string, approved: boolean, notes?: string): void {
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.reviewNotes = notes || this.reviewNotes;
    this.requiresManualReview = false;

    if (approved) {
      this.processingStatus = ProcessingStatus.PROCESSED;
    } else {
      this.processingStatus = ProcessingStatus.FAILED;
    }
  }

  archive(): void {
    this.processingStatus = ProcessingStatus.ARCHIVED;
    this.archivedAt = new Date();
  }

  getProcessingDuration(): number | null {
    if (!this.processingStartedAt || !this.processingCompletedAt) return null;
    return this.processingCompletedAt.getTime() - this.processingStartedAt.getTime();
  }
}
