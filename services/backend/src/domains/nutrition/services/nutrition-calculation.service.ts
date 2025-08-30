import { Injectable, Logger } from '@nestjs/common';
import { UserProfile, Gender, ActivityLevel } from '../../users/entities/user-profile.entity';
import { UserGoals, GoalType, IntensityLevel } from '../../users/entities/user-goals.entity';
import { UserPreferences } from '../../users/entities/user-preferences.entity';

export interface NutritionCalculationInput {
  userProfile: UserProfile;
  userGoals: UserGoals;
  userPreferences?: UserPreferences;
  currentWeight?: number;
  bodyFatPercentage?: number;
}

export interface TDEECalculation {
  bmr: number; // Basal Metabolic Rate
  tdee: number; // Total Daily Energy Expenditure
  activityFactor: number;
  method: 'mifflin_st_jeor' | 'harris_benedict' | 'katch_mcardle';
  adjustedTdee: number; // TDEE adjusted for goals
}

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  fiber: number; // grams
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
}

export interface MicronutrientTargets {
  // Vitamins (daily targets in appropriate units)
  vitaminA: number; // mcg RAE
  vitaminC: number; // mg
  vitaminD: number; // mcg
  vitaminE: number; // mg
  vitaminK: number; // mcg
  thiamin: number; // mg (B1)
  riboflavin: number; // mg (B2)
  niacin: number; // mg (B3)
  vitaminB6: number; // mg
  folate: number; // mcg DFE
  vitaminB12: number; // mcg

  // Minerals (daily targets in mg unless specified)
  calcium: number;
  iron: number;
  magnesium: number;
  phosphorus: number;
  potassium: number;
  sodium: number;
  zinc: number;
  copper: number; // mcg
  manganese: number;
  selenium: number; // mcg
  iodine: number; // mcg
}

export interface WeightManagementPlan {
  currentWeight: number;
  targetWeight: number;
  weeklyWeightChangeTarget: number; // kg/week
  timeToGoalWeeks: number;
  calorieAdjustment: number; // calories to add/subtract from TDEE
  safeWeightLossRange: [number, number]; // [min, max] kg/week
  estimatedCompletionDate: Date;
}

export interface NutritionRecommendations {
  mealFrequency: number;
  snackFrequency: number;
  waterIntake: number; // ml/day
  mealTiming: {
    breakfast: string;
    morningSnack?: string;
    lunch: string;
    afternoonSnack?: string;
    dinner: string;
    eveningSnack?: string;
  };
  specialConsiderations: string[];
  supplementRecommendations: string[];
}

@Injectable()
export class NutritionCalculationService {
  private readonly logger = new Logger(NutritionCalculationService.name);

  /**
   * Calculate Total Daily Energy Expenditure (TDEE)
   */
  calculateTDEE(input: NutritionCalculationInput): TDEECalculation {
    const { userProfile, userGoals, currentWeight, bodyFatPercentage } = input;

    const weight = currentWeight || userProfile.weight || 70; // Default 70kg
    const height = userProfile.height || 170; // Default 170cm
    const age = userProfile.age || 30; // Default 30 years
    const gender = userProfile.gender || Gender.MALE;

    // Calculate BMR using Mifflin-St Jeor equation (most accurate for general population)
    let bmr: number;
    if (gender === Gender.MALE) {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // If body fat percentage is available, use Katch-McArdle (more accurate for lean individuals)
    let method: 'mifflin_st_jeor' | 'harris_benedict' | 'katch_mcardle' = 'mifflin_st_jeor';
    if (bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 50) {
      const leanBodyMass = weight * (1 - bodyFatPercentage / 100);
      bmr = 370 + 21.6 * leanBodyMass;
      method = 'katch_mcardle';
    }

    // Activity factor based on activity level
    const activityFactor = this.getActivityFactor(userProfile.activityLevel);
    const tdee = bmr * activityFactor;

    // Adjust TDEE based on goals
    const adjustedTdee = this.adjustTDEEForGoals(tdee, userGoals);

    return {
      bmr,
      tdee,
      activityFactor,
      method,
      adjustedTdee,
    };
  }

  /**
   * Calculate macro targets based on goals and TDEE
   */
  calculateMacroTargets(
    tdeeCalculation: TDEECalculation,
    userGoals: UserGoals,
    userProfile: UserProfile,
  ): MacroTargets {
    const calories = tdeeCalculation.adjustedTdee;
    const goalType = userGoals.primaryGoal;
    const intensity = userGoals.intensity;

    let proteinPercent: number;
    let carbPercent: number;
    let fatPercent: number;

    // Macro distribution based on goal type
    switch (goalType) {
      case GoalType.WEIGHT_LOSS:
      case GoalType.FAT_LOSS:
        // Higher protein for muscle preservation, moderate carbs, moderate fat
        proteinPercent = intensity === IntensityLevel.AGGRESSIVE ? 35 : 30;
        carbPercent = 35;
        fatPercent = 35;
        break;

      case GoalType.WEIGHT_GAIN:
      case GoalType.MUSCLE_GAIN:
        // High carbs for energy, high protein for muscle building
        proteinPercent = 25;
        carbPercent = 45;
        fatPercent = 30;
        break;

      case GoalType.ATHLETIC_PERFORMANCE:
        // High carbs for performance, adequate protein
        proteinPercent = 20;
        carbPercent = 55;
        fatPercent = 25;
        break;

      case GoalType.DISEASE_MANAGEMENT:
        // Balanced approach, may need customization based on condition
        proteinPercent = 20;
        carbPercent = 50;
        fatPercent = 30;
        break;

      default:
        // Maintenance/general health
        proteinPercent = 20;
        carbPercent = 50;
        fatPercent = 30;
    }

    // Adjust for activity level - more active people need more carbs
    if (
      userProfile.activityLevel === ActivityLevel.VERY_ACTIVE ||
      userProfile.activityLevel === ActivityLevel.EXTREMELY_ACTIVE
    ) {
      carbPercent += 5;
      fatPercent -= 5;
    }

    // Calculate grams
    const protein = (calories * proteinPercent) / 100 / 4; // 4 cal/g
    const carbohydrates = (calories * carbPercent) / 100 / 4; // 4 cal/g
    const fat = (calories * fatPercent) / 100 / 9; // 9 cal/g

    // Fiber recommendation (25-35g per day, scaled by calories)
    const fiber = Math.max(25, (calories / 1000) * 14);

    return {
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      proteinPercent,
      carbPercent,
      fatPercent,
    };
  }

  /**
   * Calculate micronutrient targets based on demographics and goals
   */
  calculateMicronutrientTargets(userProfile: UserProfile): MicronutrientTargets {
    const age = userProfile.age || 30;
    const gender = userProfile.gender || Gender.MALE;
    const isMale = gender === Gender.MALE;

    // Base RDA values for healthy adults (18-50 years)
    // Values are based on Indian Council of Medical Research (ICMR) and WHO recommendations
    const targets: MicronutrientTargets = {
      // Vitamins
      vitaminA: isMale ? 600 : 500, // mcg RAE
      vitaminC: isMale ? 40 : 40, // mg
      vitaminD: 15, // mcg (same for both genders)
      vitaminE: isMale ? 10 : 7.5, // mg
      vitaminK: isMale ? 55 : 55, // mcg
      thiamin: isMale ? 1.2 : 1.0, // mg
      riboflavin: isMale ? 1.4 : 1.1, // mg
      niacin: isMale ? 16 : 12, // mg
      vitaminB6: isMale ? 2.0 : 1.9, // mg
      folate: isMale ? 200 : 200, // mcg DFE (increased for women of childbearing age)
      vitaminB12: 1.0, // mcg

      // Minerals
      calcium: isMale ? 600 : 600, // mg
      iron: isMale ? 17 : 21, // mg (higher for women due to menstruation)
      magnesium: isMale ? 340 : 310, // mg
      phosphorus: 600, // mg
      potassium: 3500, // mg
      sodium: 2300, // mg (upper limit)
      zinc: isMale ? 12 : 10, // mg
      copper: 1.05, // mg
      manganese: isMale ? 2.3 : 1.8, // mg
      selenium: isMale ? 34 : 30, // mcg
      iodine: 150, // mcg
    };

    // Adjust for age groups
    if (age >= 51) {
      // Elderly adjustments
      targets.calcium = 800; // Higher calcium for bone health
      targets.vitaminD = 20; // Higher vitamin D for elderly
      targets.vitaminB12 = 2.5; // Higher B12 due to absorption issues
    }

    // Adjust for pregnancy/lactation if applicable
    if (!isMale && age >= 18 && age <= 45) {
      // Assume potential for pregnancy - increase key nutrients
      targets.folate = 400; // Crucial for neural tube development
      targets.iron = 35; // Higher iron needs during pregnancy
      targets.calcium = 1000; // Higher calcium during pregnancy/lactation
    }

    // Adjust for Indian dietary patterns
    this.adjustForIndianDiet(targets);

    return targets;
  }

  /**
   * Create a weight management plan
   */
  createWeightManagementPlan(
    input: NutritionCalculationInput,
    tdeeCalculation: TDEECalculation,
  ): WeightManagementPlan {
    const { userProfile, userGoals, currentWeight } = input;

    const currentWt = currentWeight || userProfile.weight || 70;
    const targetWt = userGoals.targetWeight || currentWt;
    const intensity = userGoals.intensity;

    // Safe weight loss/gain ranges (kg/week)
    const safeWeightLossRange: [number, number] = [0.25, 1.0];
    const safeWeightGainRange: [number, number] = [0.25, 0.75];

    let weeklyTarget: number;
    let calorieAdjustment: number;

    if (targetWt < currentWt) {
      // Weight loss
      switch (intensity) {
        case IntensityLevel.SLOW:
          weeklyTarget = 0.25;
          break;
        case IntensityLevel.MODERATE:
          weeklyTarget = 0.5;
          break;
        case IntensityLevel.AGGRESSIVE:
          weeklyTarget = 0.75;
          break;
        default:
          weeklyTarget = 0.5;
      }
      calorieAdjustment = -(weeklyTarget * 7700) / 7; // 7700 cal per kg fat
    } else if (targetWt > currentWt) {
      // Weight gain
      switch (intensity) {
        case IntensityLevel.SLOW:
          weeklyTarget = 0.25;
          break;
        case IntensityLevel.MODERATE:
          weeklyTarget = 0.5;
          break;
        case IntensityLevel.AGGRESSIVE:
          weeklyTarget = 0.75;
          break;
        default:
          weeklyTarget = 0.5;
      }
      calorieAdjustment = (weeklyTarget * 7700) / 7; // Surplus for weight gain
    } else {
      // Maintenance
      weeklyTarget = 0;
      calorieAdjustment = 0;
    }

    // Ensure calorie adjustment doesn't exceed safe limits based on TDEE
    const maxDeficit = tdeeCalculation.adjustedTdee * 0.25; // Max 25% deficit
    const maxSurplus = tdeeCalculation.adjustedTdee * 0.15; // Max 15% surplus

    if (calorieAdjustment < -maxDeficit) {
      calorieAdjustment = -maxDeficit;
    } else if (calorieAdjustment > maxSurplus) {
      calorieAdjustment = maxSurplus;
    }

    const totalWeightChange = Math.abs(targetWt - currentWt);
    const timeToGoalWeeks = weeklyTarget > 0 ? totalWeightChange / weeklyTarget : 0;

    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + timeToGoalWeeks * 7);

    return {
      currentWeight: currentWt,
      targetWeight: targetWt,
      weeklyWeightChangeTarget: targetWt > currentWt ? weeklyTarget : -weeklyTarget,
      timeToGoalWeeks,
      calorieAdjustment,
      safeWeightLossRange: targetWt < currentWt ? safeWeightLossRange : safeWeightGainRange,
      estimatedCompletionDate,
    };
  }

  /**
   * Generate nutrition recommendations
   */
  generateNutritionRecommendations(
    input: NutritionCalculationInput,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _macroTargets: MacroTargets,
  ): NutritionRecommendations {
    const { userProfile, userPreferences } = input;

    // Base meal frequency on preferences and goals
    const mealFrequency = userPreferences?.mealsPerDay || 3;
    const snackFrequency = userPreferences?.snacksPerDay || 2;

    // Water intake calculation (35ml per kg body weight + activity adjustment)
    const weight = userProfile.weight || 70;
    let waterIntake = weight * 35; // Base requirement

    // Activity adjustment
    if (userProfile.activityLevel === ActivityLevel.VERY_ACTIVE) {
      waterIntake += 500;
    } else if (userProfile.activityLevel === ActivityLevel.EXTREMELY_ACTIVE) {
      waterIntake += 1000;
    }

    // Meal timing based on preferences and Indian eating patterns
    const mealTiming = {
      breakfast: '07:00-09:00',
      morningSnack: snackFrequency > 0 ? '10:30-11:00' : undefined,
      lunch: '12:30-14:00',
      afternoonSnack: snackFrequency > 1 ? '16:00-17:00' : undefined,
      dinner: '19:00-21:00',
      eveningSnack: snackFrequency > 2 ? '22:00-22:30' : undefined,
    };

    const specialConsiderations: string[] = [];
    const supplementRecommendations: string[] = [];

    // Add considerations based on health conditions
    if (userProfile.healthConditions?.length > 0) {
      userProfile.healthConditions.forEach((condition) => {
        switch (condition) {
          case 'diabetes_type2':
          case 'prediabetes':
            specialConsiderations.push('Focus on low glycemic index foods');
            specialConsiderations.push('Smaller, frequent meals to manage blood sugar');
            break;
          case 'hypertension':
            specialConsiderations.push('Limit sodium intake to less than 2000mg/day');
            specialConsiderations.push('Increase potassium-rich foods');
            break;
          case 'high_cholesterol':
            specialConsiderations.push('Limit saturated fat to less than 7% of total calories');
            specialConsiderations.push('Include soluble fiber foods');
            break;
        }
      });
    }

    // Supplement recommendations based on Indian dietary patterns
    if (userPreferences?.isVegetarian()) {
      supplementRecommendations.push('Consider Vitamin B12 supplementation');
      supplementRecommendations.push('Monitor iron levels and consider supplementation if needed');
    }

    if (userPreferences?.isVegan()) {
      supplementRecommendations.push('Vitamin B12 supplementation recommended');
      supplementRecommendations.push('Consider Vitamin D supplementation');
      supplementRecommendations.push('Monitor zinc and omega-3 fatty acids');
    }

    // General recommendations for Indian population
    supplementRecommendations.push(
      'Consider Vitamin D supplementation due to limited sun exposure',
    );

    if (userProfile.gender === Gender.FEMALE) {
      supplementRecommendations.push('Consider iron supplementation if menstruating');
      if (userProfile.age && userProfile.age >= 18 && userProfile.age <= 45) {
        supplementRecommendations.push(
          'Folic acid supplementation recommended for women of childbearing age',
        );
      }
    }

    return {
      mealFrequency,
      snackFrequency,
      waterIntake,
      mealTiming,
      specialConsiderations,
      supplementRecommendations,
    };
  }

  /**
   * Calculate complete nutrition plan
   */
  calculateCompleteNutritionPlan(input: NutritionCalculationInput) {
    this.logger.debug('Calculating complete nutrition plan for user');

    const tdeeCalculation = this.calculateTDEE(input);
    const macroTargets = this.calculateMacroTargets(
      tdeeCalculation,
      input.userGoals,
      input.userProfile,
    );
    const micronutrientTargets = this.calculateMicronutrientTargets(input.userProfile);
    const weightManagementPlan = this.createWeightManagementPlan(input, tdeeCalculation);
    const recommendations = this.generateNutritionRecommendations(input, macroTargets);

    return {
      tdee: tdeeCalculation,
      macroTargets,
      micronutrientTargets,
      weightManagementPlan,
      recommendations,
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
    };
  }

  private getActivityFactor(activityLevel: ActivityLevel): number {
    switch (activityLevel) {
      case ActivityLevel.SEDENTARY:
        return 1.2;
      case ActivityLevel.LIGHTLY_ACTIVE:
        return 1.375;
      case ActivityLevel.MODERATELY_ACTIVE:
        return 1.55;
      case ActivityLevel.VERY_ACTIVE:
        return 1.725;
      case ActivityLevel.EXTREMELY_ACTIVE:
        return 1.9;
      default:
        return 1.55; // Default to moderately active
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private adjustTDEEForGoals(tdee: number, _userGoals: UserGoals): number {
    // TDEE adjustment is handled in weight management plan
    // This keeps TDEE pure for reference
    return tdee;
  }

  private adjustForIndianDiet(targets: MicronutrientTargets): void {
    // Adjustments based on Indian dietary patterns and deficiencies

    // Higher iron needs due to high phytate content in Indian diets
    targets.iron *= 1.2;

    // Higher vitamin C for iron absorption
    targets.vitaminC *= 1.3;

    // Higher B vitamins due to refined grain consumption
    targets.thiamin *= 1.1;
    targets.riboflavin *= 1.1;
    targets.niacin *= 1.1;

    // Higher calcium due to oxalate-rich foods
    targets.calcium *= 1.1;

    // Higher zinc due to phytate interference
    targets.zinc *= 1.15;
  }
}
