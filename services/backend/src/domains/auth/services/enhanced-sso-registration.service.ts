import { Injectable, Logger } from '@nestjs/common';
import { OnboardingService } from '../../users/services/onboarding.service';
import { UserProfileService } from '../../users/services/user-profile.service';
import { UserPreferencesService } from '../../users/services/user-preferences.service';
import { UserGoalsService } from '../../users/services/user-goals.service';
import { AIMealGenerationService } from '../../meal-planning/services/ai-meal-generation.service';

/**
 * Enhanced SSO Registration Handler
 *
 * This service handles the complete onboarding flow for new SSO users,
 * ensuring they complete all required profile information and preferences
 * before accessing the main application features.
 */

export interface SSOUserRegistrationData {
  userId: string;
  email?: string;
  name?: string;
  profilePictureUrl?: string;
  provider: string;
  isNewUser: boolean;
}

export interface OnboardingStepData {
  step: 'basic' | 'lifestyle' | 'health' | 'preferences' | 'goals' | 'complete';
  data: any;
  userId: string;
}

export interface OnboardingProgressResponse {
  currentStep: string;
  completionPercentage: number;
  nextStepRequired: boolean;
  redirectUrl?: string;
  welcomeMessage: string;
  requiredData: string[];
}

@Injectable()
export class EnhancedSSORegistrationService {
  private readonly logger = new Logger(EnhancedSSORegistrationService.name);

  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly userProfileService: UserProfileService,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly userGoalsService: UserGoalsService,
    private readonly aiMealService: AIMealGenerationService,
  ) {}

  /**
   * Handle SSO user registration and determine next steps
   */
  async handleSSORegistration(
    userData: SSOUserRegistrationData,
  ): Promise<OnboardingProgressResponse> {
    this.logger.log(
      `Handling SSO registration for user ${userData.userId} (new: ${userData.isNewUser})`,
    );

    try {
      if (!userData.isNewUser) {
        // Existing user - check if onboarding is complete
        const progress = await this.onboardingService.getProgress(userData.userId);

        if (progress.onboardingCompleted) {
          return {
            currentStep: 'complete',
            completionPercentage: 100,
            nextStepRequired: false,
            redirectUrl: '/dashboard',
            welcomeMessage: `Welcome back, ${userData.name}! 👋`,
            requiredData: [],
          };
        } else {
          // Resume incomplete onboarding
          return this.buildOnboardingResponse(progress, userData);
        }
      }

      // New user - start comprehensive onboarding
      return await this.initializeNewUserOnboarding(userData);
    } catch (error) {
      this.logger.error('Error handling SSO registration', error);
      throw error;
    }
  }

  /**
   * Initialize onboarding for new SSO users
   */
  private async initializeNewUserOnboarding(
    userData: SSOUserRegistrationData,
  ): Promise<OnboardingProgressResponse> {
    this.logger.log(`Initializing onboarding for new SSO user ${userData.userId}`);

    // Create initial profile with SSO data
    await this.createInitialProfile(userData);

    return {
      currentStep: 'basic',
      completionPercentage: 10, // SSO info counts as partial completion
      nextStepRequired: true,
      redirectUrl: '/onboarding/basic',
      welcomeMessage: `Welcome to HealthCoach AI, ${userData.name || 'there'}! 🎉\nLet's set up your personalized health profile.`,
      requiredData: this.getRequiredDataForStep('basic'),
    };
  }

  /**
   * Process onboarding step completion
   */
  async processOnboardingStep(stepData: OnboardingStepData): Promise<OnboardingProgressResponse> {
    this.logger.log(`Processing onboarding step ${stepData.step} for user ${stepData.userId}`);

    try {
      let success = false;

      switch (stepData.step) {
        case 'basic':
          success = await this.processBasicInfo(stepData);
          break;
        case 'lifestyle':
          success = await this.processLifestyleInfo(stepData);
          break;
        case 'health':
          success = await this.processHealthInfo(stepData);
          break;
        case 'preferences':
          success = await this.processPreferences(stepData);
          break;
        case 'goals':
          success = await this.processGoals(stepData);
          break;
        default:
          throw new Error(`Unknown onboarding step: ${stepData.step}`);
      }

      if (!success) {
        throw new Error(`Failed to process onboarding step: ${stepData.step}`);
      }

      // Get updated progress
      const progress = await this.onboardingService.getProgress(stepData.userId);

      // Check if onboarding is complete
      if (progress.onboardingCompleted) {
        return await this.completeOnboarding(stepData.userId);
      }

      // Determine next step
      const nextStep = this.getNextStep(stepData.step);
      return {
        currentStep: nextStep,
        completionPercentage: progress.completionPercentage,
        nextStepRequired: true,
        redirectUrl: `/onboarding/${nextStep}`,
        welcomeMessage: this.getStepCompleteMessage(stepData.step),
        requiredData: this.getRequiredDataForStep(nextStep),
      };
    } catch (error) {
      this.logger.error(`Error processing onboarding step ${stepData.step}`, error);
      throw error;
    }
  }

  /**
   * Complete onboarding and generate first meal plan
   */
  private async completeOnboarding(userId: string): Promise<OnboardingProgressResponse> {
    this.logger.log(`Completing onboarding for user ${userId}`);

    try {
      // Generate initial AI meal plan
      await this.generateInitialMealPlan(userId);

      return {
        currentStep: 'complete',
        completionPercentage: 100,
        nextStepRequired: false,
        redirectUrl: '/dashboard?welcome=true',
        welcomeMessage:
          '🎉 Congratulations! Your personalized health profile is complete.\nYour AI-powered meal plan is ready!',
        requiredData: [],
      };
    } catch (error) {
      this.logger.error('Error completing onboarding', error);
      // Even if meal plan generation fails, complete onboarding
      return {
        currentStep: 'complete',
        completionPercentage: 100,
        nextStepRequired: false,
        redirectUrl: '/dashboard',
        welcomeMessage: '🎉 Welcome to HealthCoach AI! Your profile is ready.',
        requiredData: [],
      };
    }
  }

  /**
   * Create initial profile with SSO data
   */
  private async createInitialProfile(userData: SSOUserRegistrationData): Promise<void> {
    // Initial profile creation is handled by the OAuth service
    // Just log the SSO registration
    this.logger.log(
      `Initial profile created for SSO user ${userData.userId} via ${userData.provider}`,
    );
  }

  /**
   * Process basic information step
   */
  private async processBasicInfo(stepData: OnboardingStepData): Promise<boolean> {
    const result = await this.onboardingService.saveBasicInfo(stepData.userId, stepData.data);
    return result.success;
  }

  /**
   * Process lifestyle information step
   */
  private async processLifestyleInfo(stepData: OnboardingStepData): Promise<boolean> {
    const result = await this.onboardingService.saveLifestyle(stepData.userId, stepData.data);
    return result.success;
  }

  /**
   * Process health information step
   */
  private async processHealthInfo(stepData: OnboardingStepData): Promise<boolean> {
    const result = await this.onboardingService.saveHealth(stepData.userId, stepData.data);
    return result.success;
  }

  /**
   * Process food preferences step
   */
  private async processPreferences(stepData: OnboardingStepData): Promise<boolean> {
    await this.userPreferencesService.savePreferences(stepData.userId, stepData.data);
    return true;
  }

  /**
   * Process goals step
   */
  private async processGoals(stepData: OnboardingStepData): Promise<boolean> {
    await this.userGoalsService.saveGoals(stepData.userId, stepData.data);
    return true;
  }

  /**
   * Generate initial AI meal plan for new user
   */
  private async generateInitialMealPlan(userId: string): Promise<void> {
    try {
      this.logger.log(`Generating initial meal plan for user ${userId}`);

      // Get user profile and preferences
      const userProfile = await this.userProfileService.getUserProfile(userId);
      const preferences = await this.userPreferencesService.getUserPreferences(userId);
      const goals = await this.userGoalsService.getUserGoals(userId);

      // Generate personalized meal plan
      const mealPlanRequest = {
        userId,
        userProfile: {
          age: userProfile.age,
          gender: userProfile.gender,
          weight: userProfile.weight,
          height: userProfile.height,
          activityLevel: userProfile.activityLevel,
          goals: goals.primaryGoals,
          healthConditions: userProfile.healthConditions,
          allergies: preferences.allergies,
        },
        planPreferences: {
          duration: 7,
          planType: 'weight_management',
          targetCalories: this.calculateTargetCalories(userProfile),
          macroTargets: this.calculateMacroTargets(goals),
          includeCheatMeals: false,
          weekendTreats: false,
        },
      };

      await this.aiMealService.generatePersonalizedMealPlan(mealPlanRequest);
      this.logger.log(`Initial meal plan generated successfully for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to generate initial meal plan for user ${userId}`, error);
      // Don't throw - onboarding should complete even if meal plan fails
    }
  }

  /**
   * Build onboarding response for existing incomplete user
   */
  private buildOnboardingResponse(
    progress: any,
    userData: SSOUserRegistrationData,
  ): OnboardingProgressResponse {
    const currentStep = this.mapProgressToStep(progress.currentStep);

    return {
      currentStep,
      completionPercentage: progress.completionPercentage,
      nextStepRequired: true,
      redirectUrl: `/onboarding/${currentStep}`,
      welcomeMessage: `Welcome back, ${userData.name}! Let's continue setting up your profile.`,
      requiredData: this.getRequiredDataForStep(currentStep),
    };
  }

  /**
   * Get next onboarding step
   */
  private getNextStep(currentStep: string): string {
    const stepOrder = ['basic', 'lifestyle', 'health', 'preferences', 'goals'];
    const currentIndex = stepOrder.indexOf(currentStep);
    return stepOrder[currentIndex + 1] || 'complete';
  }

  /**
   * Map progress step number to step name
   */
  private mapProgressToStep(stepNumber: number): string {
    const steps = ['basic', 'lifestyle', 'health', 'preferences', 'goals'];
    return steps[stepNumber - 1] || 'basic';
  }

  /**
   * Get required data for each onboarding step
   */
  private getRequiredDataForStep(step: string): string[] {
    const requirements = {
      basic: ['firstName', 'lastName', 'age', 'gender', 'height', 'weight'],
      lifestyle: [
        'activityLevel',
        'sleepHours',
        'stressLevel',
        'smokingStatus',
        'alcoholConsumption',
      ],
      health: ['healthConditions', 'medications', 'allergies', 'healthReports'],
      preferences: ['dietType', 'cuisinePreferences', 'dislikes', 'mealFrequency'],
      goals: ['primaryGoals', 'targetWeight', 'timeline', 'motivation'],
    };

    return requirements[step] || [];
  }

  /**
   * Get completion message for each step
   */
  private getStepCompleteMessage(step: string): string {
    const messages = {
      basic: "✅ Basic information saved! Now let's learn about your lifestyle.",
      lifestyle: "✅ Lifestyle information saved! Let's discuss your health.",
      health: '✅ Health information saved! Now for your food preferences.',
      preferences: "✅ Food preferences saved! Finally, let's set your goals.",
      goals: '✅ Goals saved! Preparing your personalized experience...',
    };

    return messages[step] || 'Step completed successfully!';
  }

  /**
   * Calculate target calories based on user profile
   */
  private calculateTargetCalories(userProfile: any): number {
    // Simplified calorie calculation - in production, use proper BMR calculation
    const baseCalories = userProfile.gender === 'male' ? 2000 : 1600;
    const activityMultiplier = this.getActivityMultiplier(userProfile.activityLevel);
    return Math.round(baseCalories * activityMultiplier);
  }

  /**
   * Calculate macro targets based on goals
   */
  private calculateMacroTargets(goals: any): any {
    if (goals.primaryGoals.includes('weight_loss')) {
      return { proteinPercent: 30, carbPercent: 40, fatPercent: 30 };
    } else if (goals.primaryGoals.includes('muscle_gain')) {
      return { proteinPercent: 35, carbPercent: 40, fatPercent: 25 };
    }
    return { proteinPercent: 25, carbPercent: 45, fatPercent: 30 };
  }

  /**
   * Get activity multiplier for calorie calculation
   */
  private getActivityMultiplier(activityLevel: string): number {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return multipliers[activityLevel] || 1.375;
  }
}
