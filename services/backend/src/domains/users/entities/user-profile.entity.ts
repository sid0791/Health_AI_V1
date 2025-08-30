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

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary', // Little to no exercise
  LIGHTLY_ACTIVE = 'lightly_active', // Light exercise 1-3 days/week
  MODERATELY_ACTIVE = 'moderately_active', // Moderate exercise 3-5 days/week
  VERY_ACTIVE = 'very_active', // Hard exercise 6-7 days/week
  EXTREMELY_ACTIVE = 'extremely_active', // Very hard exercise, physical job
}

export enum HealthCondition {
  DIABETES_TYPE1 = 'diabetes_type1',
  DIABETES_TYPE2 = 'diabetes_type2',
  PREDIABETES = 'prediabetes',
  HYPERTENSION = 'hypertension',
  HIGH_CHOLESTEROL = 'high_cholesterol',
  HEART_DISEASE = 'heart_disease',
  THYROID_DISORDER = 'thyroid_disorder',
  PCOD_PCOS = 'pcod_pcos',
  KIDNEY_DISEASE = 'kidney_disease',
  LIVER_DISEASE = 'liver_disease',
  CELIAC_DISEASE = 'celiac_disease',
  IBD = 'ibd', // Inflammatory Bowel Disease
  IBS = 'ibs', // Irritable Bowel Syndrome
  FOOD_ALLERGIES = 'food_allergies',
  LACTOSE_INTOLERANCE = 'lactose_intolerance',
  GLUTEN_SENSITIVITY = 'gluten_sensitivity',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'display_name', length: 150, nullable: true })
  displayName?: string;

  @Column({ type: 'date', nullable: true })
  birthday?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height?: number; // in cm

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number; // in kg

  @Column({
    type: 'enum',
    enum: ActivityLevel,
    default: ActivityLevel.MODERATELY_ACTIVE,
  })
  activityLevel: ActivityLevel;

  // Health flags (encrypted in production)
  @Column({
    type: 'enum',
    enum: HealthCondition,
    array: true,
    default: [],
  })
  healthConditions: HealthCondition[];

  @Column({ name: 'emergency_contact_name', length: 100, nullable: true })
  emergencyContactName?: string;

  @Column({ name: 'emergency_contact_phone', length: 20, nullable: true })
  emergencyContactPhone?: string;

  // Location for regional data residency
  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  state?: string;

  @Column({ length: 10, default: 'IN' })
  country: string;

  @Column({ name: 'timezone', length: 50, default: 'Asia/Kolkata' })
  timezone: string;

  // Language preferences
  @Column({ name: 'preferred_language', length: 10, default: 'en' })
  preferredLanguage: string;

  @Column({ name: 'supports_hinglish', default: true })
  supportsHinglish: boolean;

  // Avatar and profile picture
  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl?: string;

  // Onboarding completion
  @Column({ name: 'onboarding_completed', default: false })
  onboardingCompleted: boolean;

  @Column({ name: 'onboarding_step', default: 0 })
  onboardingStep: number;

  // Data classification for compliance
  @Column({ name: 'phi_classification', default: 'HEALTH' })
  phiClassification: string;

  // Additional onboarding data stored as JSON
  @Column({ type: 'jsonb', nullable: true, name: 'lifestyle_data' })
  lifestyleData?: {
    smokingFrequency?: number;
    alcoholFrequency?: number;
    sleepHours?: number;
    jobActivityLevel?: number;
    eatingOutFrequency?: number;
    stressLevel?: number;
    waterIntake?: number;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'health_data' })
  healthData?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    fastingBloodSugar?: number;
    hba1c?: number;
    fattyLiver?: boolean;
    vitaminDeficiencies?: string[];
    currentMedications?: string[];
    familyHistory?: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Computed properties
  get age(): number | null {
    if (!this.birthday) return null;
    const today = new Date();
    const birthDate = new Date(this.birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  get bmi(): number | null {
    if (!this.height || !this.weight) return null;
    const heightInM = this.height / 100;
    return Number((this.weight / (heightInM * heightInM)).toFixed(1));
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
