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
import { User } from '../../users/entities/user.entity';

export enum MealPlanType {
  WEIGHT_LOSS = 'weight_loss',
  WEIGHT_GAIN = 'weight_gain',
  MAINTENANCE = 'maintenance',
  MUSCLE_GAIN = 'muscle_gain',
  DISEASE_MANAGEMENT = 'disease_management',
  ATHLETIC_PERFORMANCE = 'athletic_performance',
  PREGNANCY = 'pregnancy',
  LACTATION = 'lactation',
  CHILD_NUTRITION = 'child_nutrition',
  ELDERLY = 'elderly',
  CUSTOM = 'custom',
}

export enum MealPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum GenerationMethod {
  AI_GENERATED = 'ai_generated',
  NUTRITIONIST_CREATED = 'nutritionist_created',
  USER_CUSTOMIZED = 'user_customized',
  TEMPLATE_BASED = 'template_based',
  HYBRID = 'hybrid',
}

@Entity('meal_plans')
@Index(['userId', 'status', 'startDate'])
@Index(['planType', 'isActive'])
@Index(['generationMethod', 'createdAt'])
export class MealPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Plan Details
  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: MealPlanType,
    name: 'plan_type',
  })
  planType: MealPlanType;

  @Column({
    type: 'enum',
    enum: MealPlanStatus,
    default: MealPlanStatus.DRAFT,
  })
  status: MealPlanStatus;

  // Duration and Scheduling
  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number; // Typically 7 for weekly plans

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_pattern', length: 50, nullable: true })
  recurrencePattern?: string; // 'weekly', 'monthly', etc.

  // Generation and Customization
  @Column({
    type: 'enum',
    enum: GenerationMethod,
    name: 'generation_method',
    default: GenerationMethod.AI_GENERATED,
  })
  generationMethod: GenerationMethod;

  @Column({ name: 'ai_model_version', length: 50, nullable: true })
  aiModelVersion?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string; // Nutritionist ID if professionally created

  @Column({ name: 'customization_level', type: 'int', default: 0 })
  customizationLevel: number; // 0-5 scale of how much user customized

  // Nutritional Targets
  @Column({ name: 'target_calories_per_day', type: 'int' })
  targetCaloriesPerDay: number;

  @Column({ name: 'target_protein_grams', type: 'decimal', precision: 8, scale: 2 })
  targetProteinGrams: number;

  @Column({ name: 'target_carb_grams', type: 'decimal', precision: 8, scale: 2 })
  targetCarbGrams: number;

  @Column({ name: 'target_fat_grams', type: 'decimal', precision: 8, scale: 2 })
  targetFatGrams: number;

  @Column({ name: 'target_fiber_grams', type: 'decimal', precision: 8, scale: 2 })
  targetFiberGrams: number;

  // Budget and Preferences
  @Column({ name: 'daily_budget_inr', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dailyBudgetInr?: number;

  @Column({ name: 'max_cooking_time_minutes', type: 'int', default: 45 })
  maxCookingTimeMinutes: number;

  @Column({ name: 'skill_level_required', type: 'int', default: 3 })
  skillLevelRequired: number; // 1-5 scale

  @Column({
    type: 'text',
    array: true,
    name: 'dietary_restrictions',
    default: [],
  })
  dietaryRestrictions: string[];

  @Column({
    type: 'text',
    array: true,
    name: 'cuisine_preferences',
    default: [],
  })
  cuisinePreferences: string[];

  @Column({
    type: 'text',
    array: true,
    name: 'avoided_ingredients',
    default: [],
  })
  avoidedIngredients: string[];

  @Column({
    type: 'text',
    array: true,
    name: 'preferred_ingredients',
    default: [],
  })
  preferredIngredients: string[];

  // Meal Structure
  @Column({ name: 'meals_per_day', type: 'int', default: 3 })
  mealsPerDay: number;

  @Column({ name: 'snacks_per_day', type: 'int', default: 2 })
  snacksPerDay: number;

  @Column({ name: 'include_beverages', default: true })
  includeBeverages: boolean;

  @Column({ name: 'meal_timing_flexible', default: true })
  mealTimingFlexible: boolean;

  // Health and Medical Considerations
  @Column({
    type: 'text',
    array: true,
    name: 'health_conditions',
    default: [],
  })
  healthConditions: string[];

  @Column({ name: 'medication_interactions', type: 'text', nullable: true })
  medicationInteractions?: string;

  @Column({ name: 'special_requirements', type: 'text', nullable: true })
  specialRequirements?: string;

  // Performance and Analytics
  @Column({ name: 'adherence_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  adherenceScore: number; // 0-100% how well user follows the plan

  @Column({ name: 'satisfaction_score', type: 'decimal', precision: 3, scale: 2, default: 0 })
  satisfactionScore: number; // 0-5 user satisfaction rating

  @Column({ name: 'effectiveness_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  effectivenessScore: number; // 0-100% goal achievement rate

  @Column({ name: 'completion_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  // Cost and Shopping
  @Column({
    name: 'estimated_weekly_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimatedWeeklyCost?: number;

  @Column({ name: 'shopping_list_generated', default: false })
  shoppingListGenerated: boolean;

  @Column({ name: 'prep_time_total_minutes', type: 'int', nullable: true })
  prepTimeTotalMinutes?: number;

  @Column({ name: 'cook_time_total_minutes', type: 'int', nullable: true })
  cookTimeTotalMinutes?: number;

  // Adaptation and Learning
  @Column({ name: 'adaptation_count', type: 'int', default: 0 })
  adaptationCount: number; // How many times plan was modified

  @Column({ name: 'last_adapted_at', type: 'timestamp', nullable: true })
  lastAdaptedAt?: Date;

  @Column({ name: 'adaptation_reasons', type: 'text', array: true, default: [] })
  adaptationReasons: string[];

  // Quality and Review
  @Column({ name: 'nutritionist_reviewed', default: false })
  nutritionistReviewed: boolean;

  @Column({ name: 'reviewed_by', length: 100, nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string;

  // Sharing and Templates
  @Column({ name: 'is_template', default: false })
  isTemplate: boolean;

  @Column({ name: 'is_shareable', default: false })
  isShareable: boolean;

  @Column({ name: 'template_category', length: 100, nullable: true })
  templateCategory?: string;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount: number; // How many times this template was used

  // Metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  tags: string[];

  // Data classification
  @Column({ name: 'data_classification', default: 'PERSONAL' })
  dataClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Note: MealPlanDay relationship will be added when that entity is created
  // @OneToMany(() => MealPlanDay, (day) => day.mealPlan, {
  //   cascade: true,
  // })
  // days: MealPlanDay[];

  // Helper methods
  isCurrentlyActive(): boolean {
    const now = new Date();
    return (
      this.isActive &&
      this.status === MealPlanStatus.ACTIVE &&
      this.startDate <= now &&
      this.endDate >= now
    );
  }

  isExpired(): boolean {
    return new Date() > this.endDate;
  }

  getDaysRemaining(): number {
    const now = new Date();
    if (now > this.endDate) return 0;

    const diffTime = this.endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysCompleted(): number {
    const now = new Date();
    const start = this.startDate;

    if (now <= start) return 0;
    if (now > this.endDate) return this.durationDays;

    const diffTime = now.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  getProgressPercentage(): number {
    const completed = this.getDaysCompleted();
    return Math.min((completed / this.durationDays) * 100, 100);
  }

  activate(): void {
    this.status = MealPlanStatus.ACTIVE;
    this.isActive = true;
    this.activatedAt = new Date();
  }

  pause(): void {
    this.status = MealPlanStatus.PAUSED;
    this.isActive = false;
  }

  resume(): void {
    this.status = MealPlanStatus.ACTIVE;
    this.isActive = true;
  }

  complete(): void {
    this.status = MealPlanStatus.COMPLETED;
    this.isActive = false;
    this.completedAt = new Date();
    this.completionPercentage = 100;
  }

  cancel(): void {
    this.status = MealPlanStatus.CANCELLED;
    this.isActive = false;
  }

  extend(additionalDays: number): void {
    this.endDate = new Date(this.endDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    this.durationDays += additionalDays;
  }

  updateAdherence(score: number): void {
    this.adherenceScore = Math.max(0, Math.min(100, score));
  }

  updateSatisfaction(score: number): void {
    this.satisfactionScore = Math.max(0, Math.min(5, score));
  }

  addAdaptation(reason: string): void {
    this.adaptationCount++;
    this.lastAdaptedAt = new Date();
    if (!this.adaptationReasons.includes(reason)) {
      this.adaptationReasons.push(reason);
    }
  }

  markAsReviewed(reviewerId: string, notes?: string): void {
    this.nutritionistReviewed = true;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    if (notes) this.reviewNotes = notes;
  }

  convertToTemplate(category?: string): void {
    this.isTemplate = true;
    this.templateCategory = category;
    this.isShareable = true;
  }

  incrementUsage(): void {
    this.usageCount++;
  }

  getMacroDistribution(): {
    proteinPercent: number;
    carbPercent: number;
    fatPercent: number;
  } {
    const totalCalories = this.targetCaloriesPerDay;
    const proteinCals = this.targetProteinGrams * 4;
    const carbCals = this.targetCarbGrams * 4;
    const fatCals = this.targetFatGrams * 9;

    return {
      proteinPercent: (proteinCals / totalCalories) * 100,
      carbPercent: (carbCals / totalCalories) * 100,
      fatPercent: (fatCals / totalCalories) * 100,
    };
  }

  getEstimatedDailyCost(): number {
    return this.estimatedWeeklyCost ? this.estimatedWeeklyCost / 7 : 0;
  }

  getTotalPrepTime(): number {
    return (this.prepTimeTotalMinutes || 0) + (this.cookTimeTotalMinutes || 0);
  }

  isAffordable(userBudget?: number): boolean {
    if (!userBudget || !this.dailyBudgetInr) return true;
    return this.dailyBudgetInr <= userBudget;
  }

  isSuitableForSkillLevel(userSkillLevel: number): boolean {
    return this.skillLevelRequired <= userSkillLevel;
  }

  checkExpiration(): void {
    if (this.isExpired() && this.status === MealPlanStatus.ACTIVE) {
      this.status = MealPlanStatus.EXPIRED;
      this.isActive = false;
    }
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }
}
