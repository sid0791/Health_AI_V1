import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { UserGoals } from '../entities/user-goals.entity';
import {
  OnboardingBasicInfoDto,
  OnboardingLifestyleDto,
  OnboardingHealthDto,
  OnboardingPreferencesDto,
  OnboardingGoalsDto,
  OnboardingProgressDto,
} from '../dto/onboarding.dto';
import { AuditService } from '../../auth/services/audit.service';
import { AuditEventType } from '../../auth/entities/audit-log.entity';

interface LifestyleData {
  smokingFrequency?: number;
  alcoholFrequency?: number;
  sleepHours?: number;
  jobActivityLevel?: number;
  eatingOutFrequency?: number;
  stressLevel?: number;
  waterIntake?: number;
}

interface HealthData {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  fastingBloodSugar?: number;
  hba1c?: number;
  fattyLiver?: boolean;
  vitaminDeficiencies?: string[];
  currentMedications?: string[];
  familyHistory?: string[];
}

@Injectable()
export class OnboardingService {
  private readonly TOTAL_STEPS = 6; // splash, auth, basic, lifestyle, health, preferences, goals

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreferences)
    private userPreferencesRepository: Repository<UserPreferences>,
    @InjectRepository(UserGoals)
    private userGoalsRepository: Repository<UserGoals>,
    private auditService: AuditService,
  ) {}

  async getProgress(userId: string): Promise<OnboardingProgressDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'preferences', 'goals'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const completedSteps = this.calculateCompletedSteps(user);
    const currentStep = user.profile?.onboardingStep || 0;
    const onboardingCompleted = user.profile?.onboardingCompleted || false;

    return {
      currentStep,
      onboardingCompleted,
      totalSteps: this.TOTAL_STEPS,
      completionPercentage: Math.round((completedSteps.length / this.TOTAL_STEPS) * 100),
      completedSteps,
      skippedSteps: [], // We'll track this separately if needed
      profileCompleted: user.profileCompleted,
      lastUpdated: user.updatedAt,
    };
  }

  async saveBasicInfo(
    userId: string,
    basicInfoDto: OnboardingBasicInfoDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user basic information
    user.name = `${basicInfoDto.firstName} ${basicInfoDto.lastName}`;
    if (basicInfoDto.email) {
      user.email = basicInfoDto.email;
    }

    // Create or update user profile
    let profile = user.profile;
    if (!profile) {
      profile = new UserProfile();
      profile.userId = userId;
    }

    profile.firstName = basicInfoDto.firstName;
    profile.lastName = basicInfoDto.lastName;
    profile.displayName = basicInfoDto.displayName;
    profile.gender = basicInfoDto.gender;
    profile.height = basicInfoDto.height;
    profile.weight = basicInfoDto.weight;
    profile.city = basicInfoDto.city;
    profile.state = basicInfoDto.state;
    profile.country = basicInfoDto.country || 'IN';
    profile.preferredLanguage = basicInfoDto.preferredLanguage || 'en';
    profile.supportsHinglish = basicInfoDto.supportsHinglish ?? true;

    if (basicInfoDto.birthday) {
      profile.birthday = new Date(basicInfoDto.birthday);
    }

    // Update onboarding progress
    profile.onboardingStep = Math.max(profile.onboardingStep, 1);

    await this.userRepository.save(user);
    await this.userProfileRepository.save(profile);

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_BASIC_INFO_SAVED,
      'Basic information saved during onboarding',
      {
        userId,
      },
      {
        step: 1,
        hasBasicInfo: true,
      },
    );

    return { success: true, nextStep: 2 };
  }

  async saveLifestyle(
    userId: string,
    lifestyleDto: OnboardingLifestyleDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new BadRequestException('Basic information must be completed first');
    }

    // Update profile with lifestyle data
    user.profile.activityLevel = lifestyleDto.activityLevel;

    // Store additional lifestyle data in a JSON field or separate table
    // For now, we'll add fields to the profile entity
    const lifestyleData: LifestyleData = {
      smokingFrequency: lifestyleDto.smokingFrequency,
      alcoholFrequency: lifestyleDto.alcoholFrequency,
      sleepHours: lifestyleDto.sleepHours,
      jobActivityLevel: lifestyleDto.jobActivityLevel,
      eatingOutFrequency: lifestyleDto.eatingOutFrequency,
      stressLevel: lifestyleDto.stressLevel,
      waterIntake: lifestyleDto.waterIntake,
    };

    // Store as JSON (we'll need to add this field to the entity)
    (user.profile as any).lifestyleData = lifestyleData;

    // Update onboarding progress
    user.profile.onboardingStep = Math.max(user.profile.onboardingStep, 2);

    await this.userProfileRepository.save(user.profile);

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_LIFESTYLE_SAVED,
      'Lifestyle information saved during onboarding',
      {
        userId,
      },
      {
        step: 2,
        activityLevel: lifestyleDto.activityLevel,
      },
    );

    return { success: true, nextStep: 3 };
  }

  async saveHealth(
    userId: string,
    healthDto: OnboardingHealthDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new BadRequestException('Basic information must be completed first');
    }

    // Update profile with health conditions
    user.profile.healthConditions = healthDto.healthConditions || [];
    user.profile.emergencyContactName = healthDto.emergencyContactName;
    user.profile.emergencyContactPhone = healthDto.emergencyContactPhone;

    // Store additional health data
    const healthData: HealthData = {
      bloodPressureSystolic: healthDto.bloodPressureSystolic,
      bloodPressureDiastolic: healthDto.bloodPressureDiastolic,
      fastingBloodSugar: healthDto.fastingBloodSugar,
      hba1c: healthDto.hba1c,
      fattyLiver: healthDto.fattyLiver,
      vitaminDeficiencies: healthDto.vitaminDeficiencies,
      currentMedications: healthDto.currentMedications,
      familyHistory: healthDto.familyHistory,
    };

    (user.profile as any).healthData = healthData;

    // Update onboarding progress
    user.profile.onboardingStep = Math.max(user.profile.onboardingStep, 3);

    await this.userProfileRepository.save(user.profile);

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_HEALTH_SAVED,
      'Health information saved during onboarding',
      {
        userId,
      },
      {
        step: 3,
        hasHealthConditions: (healthDto.healthConditions || []).length > 0,
      },
    );

    return { success: true, nextStep: 4 };
  }

  async savePreferences(
    userId: string,
    preferencesDto: OnboardingPreferencesDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['preferences'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create or update user preferences
    let preferences = user.preferences;
    if (!preferences) {
      preferences = new UserPreferences();
      preferences.userId = userId;
    }

    preferences.dietaryPreference = preferencesDto.dietaryPreference;
    preferences.favoriteCuisines = preferencesDto.favoriteCuisines || [];
    preferences.allergens = preferencesDto.allergens || [];
    preferences.customAllergens = preferencesDto.customAllergens || [];
    preferences.spiceTolerance = preferencesDto.spiceTolerance;
    preferences.favoriteIngredients = preferencesDto.favoriteIngredients || [];
    preferences.dislikedIngredients = preferencesDto.dislikedIngredients || [];
    preferences.mealsPerDay = preferencesDto.mealsPerDay || 3;
    preferences.snacksPerDay = preferencesDto.snacksPerDay || 2;
    preferences.maxCookingTime = preferencesDto.maxCookingTime || 30;
    preferences.cookingSkillLevel = preferencesDto.cookingSkillLevel || 3;
    preferences.dailyFoodBudget = preferencesDto.dailyFoodBudget;

    // Store cravings data
    (preferences as any).cravings = preferencesDto.cravings || [];

    await this.userPreferencesRepository.save(preferences);

    // Update onboarding progress in profile
    const profile = await this.userProfileRepository.findOne({ where: { userId } });
    if (profile) {
      profile.onboardingStep = Math.max(profile.onboardingStep, 4);
      await this.userProfileRepository.save(profile);
    }

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_PREFERENCES_SAVED,
      'Preferences saved during onboarding',
      {
        userId,
      },
      {
        step: 4,
        dietaryPreference: preferencesDto.dietaryPreference,
      },
    );

    return { success: true, nextStep: 5 };
  }

  async saveGoals(
    userId: string,
    goalsDto: OnboardingGoalsDto,
  ): Promise<{ success: boolean; onboardingComplete: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['goals', 'profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create or update user goals
    let goals = user.goals;
    if (!goals) {
      goals = new UserGoals();
      goals.userId = userId;
      goals.startDate = new Date();
    }

    goals.primaryGoal = goalsDto.primaryGoal;
    goals.goalPriority = goalsDto.goalPriority;
    goals.intensity = goalsDto.intensity;
    goals.targetWeight = goalsDto.targetWeight;
    goals.weeklyWeightChangeTarget = goalsDto.weeklyWeightChangeTarget;
    goals.targetBodyFatPercentage = goalsDto.targetBodyFatPercentage;
    goals.dailyCalorieTarget = goalsDto.dailyCalorieTarget;
    goals.dailyProteinTarget = goalsDto.dailyProteinTarget;
    goals.weeklyExerciseTarget = goalsDto.weeklyExerciseTarget;
    goals.dailyStepsTarget = goalsDto.dailyStepsTarget;
    goals.weeklyStrengthSessions = goalsDto.weeklyStrengthSessions;
    goals.weeklyCardioSessions = goalsDto.weeklyCardioSessions;
    goals.motivation = goalsDto.motivation;
    goals.notes = goalsDto.notes;
    goals.reminderEnabled = goalsDto.reminderEnabled ?? true;
    goals.reminderTime = goalsDto.reminderTime;

    if (goalsDto.targetDate) {
      goals.targetDate = new Date(goalsDto.targetDate);
    }

    // Set starting weight from profile if available and not set
    if (user.profile && !goals.startingWeight) {
      goals.startingWeight = user.profile.weight;
    }

    await this.userGoalsRepository.save(goals);

    // Complete onboarding
    if (user.profile) {
      user.profile.onboardingStep = 5;
      user.profile.onboardingCompleted = true;
      await this.userProfileRepository.save(user.profile);
    }

    user.profileCompleted = true;
    await this.userRepository.save(user);

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_COMPLETED,
      'Onboarding process completed',
      {
        userId,
      },
      {
        step: 5,
        primaryGoal: goalsDto.primaryGoal,
        completedAt: new Date(),
      },
    );

    return { success: true, onboardingComplete: true };
  }

  async skipStep(userId: string, step: number): Promise<{ success: boolean; nextStep: number }> {
    const profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Update onboarding step but don't mark as completed for that step
    profile.onboardingStep = Math.max(profile.onboardingStep, step + 1);
    await this.userProfileRepository.save(profile);

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_STEP_SKIPPED,
      'Onboarding step skipped',
      {
        userId,
      },
      {
        skippedStep: step,
        nextStep: step + 1,
      },
    );

    return { success: true, nextStep: step + 1 };
  }

  async restartOnboarding(userId: string): Promise<{ success: boolean }> {
    const profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Reset onboarding progress
    profile.onboardingStep = 0;
    profile.onboardingCompleted = false;
    await this.userProfileRepository.save(profile);

    // Update user profile completion
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.profileCompleted = false;
      await this.userRepository.save(user);
    }

    // Audit log
    await this.auditService.logDataEvent(
      AuditEventType.ONBOARDING_RESTARTED,
      'Onboarding process restarted',
      {
        userId,
      },
      {
        restartedAt: new Date(),
      },
    );

    return { success: true };
  }

  private calculateCompletedSteps(user: User): number[] {
    const completed: number[] = [];

    // Step 0: Basic auth (if user exists, this is complete)
    completed.push(0);

    // Step 1: Basic info
    if (user.profile && user.profile.firstName && user.profile.lastName) {
      completed.push(1);
    }

    // Step 2: Lifestyle
    if (user.profile && user.profile.activityLevel && (user.profile as any).lifestyleData) {
      completed.push(2);
    }

    // Step 3: Health
    if (user.profile && (user.profile as any).healthData) {
      completed.push(3);
    }

    // Step 4: Preferences
    if (user.preferences && user.preferences.dietaryPreference) {
      completed.push(4);
    }

    // Step 5: Goals
    if (user.goals && user.goals.primaryGoal) {
      completed.push(5);
    }

    return completed;
  }
}
