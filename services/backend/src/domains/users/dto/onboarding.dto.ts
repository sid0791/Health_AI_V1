import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  IsBoolean,
  Min,
  Max,
  Length,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, ActivityLevel, HealthCondition } from '../entities/user-profile.entity';
import {
  DietaryPreference,
  CuisinePreference,
  Allergen,
  SpiceLevel,
} from '../entities/user-preferences.entity';
import { GoalType, GoalPriority, IntensityLevel } from '../entities/user-goals.entity';

export class OnboardingBasicInfoDto {
  @ApiProperty({ description: 'User first name', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ description: 'User last name', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiPropertyOptional({ description: 'User display name', maxLength: 150 })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  displayName?: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User birthday (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiProperty({ description: 'User gender', enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: 'User height in centimeters', minimum: 50, maximum: 300 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(300)
  height: number;

  @ApiProperty({ description: 'User weight in kilograms', minimum: 20, maximum: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(500)
  weight: number;

  @ApiPropertyOptional({ description: 'User city' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ description: 'User state' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @ApiPropertyOptional({ description: 'User country code', default: 'IN' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  country?: string;

  @ApiPropertyOptional({ description: 'Preferred language', default: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  preferredLanguage?: string;

  @ApiPropertyOptional({ description: 'Supports Hinglish input', default: true })
  @IsOptional()
  @IsBoolean()
  supportsHinglish?: boolean;
}

export class OnboardingLifestyleDto {
  @ApiProperty({ description: 'Activity level', enum: ActivityLevel })
  @IsEnum(ActivityLevel)
  activityLevel: ActivityLevel;

  @ApiPropertyOptional({
    description: 'Smoking frequency (0-10 scale, 0=never, 10=heavy smoker)',
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  smokingFrequency?: number;

  @ApiPropertyOptional({
    description: 'Alcohol frequency (drinks per week)',
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  alcoholFrequency?: number;

  @ApiPropertyOptional({
    description: 'Average sleep hours per night',
    minimum: 3,
    maximum: 12,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(3)
  @Max(12)
  sleepHours?: number;

  @ApiPropertyOptional({
    description: 'Job activity level (1-5 scale, 1=desk job, 5=very physical)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  jobActivityLevel?: number;

  @ApiPropertyOptional({
    description: 'Eating out frequency (meals per week)',
    minimum: 0,
    maximum: 21,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(21)
  eatingOutFrequency?: number;

  @ApiPropertyOptional({
    description: 'Stress level (1-10 scale)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  stressLevel?: number;

  @ApiPropertyOptional({ description: 'Water intake in liters per day' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(8)
  waterIntake?: number;
}

export class OnboardingHealthDto {
  @ApiPropertyOptional({ description: 'Health conditions', enum: HealthCondition, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(HealthCondition, { each: true })
  healthConditions?: HealthCondition[];

  @ApiPropertyOptional({ description: 'Blood pressure systolic (mmHg)' })
  @IsOptional()
  @IsInt()
  @Min(70)
  @Max(250)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ description: 'Blood pressure diastolic (mmHg)' })
  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(150)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ description: 'Fasting blood sugar (mg/dL)' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(400)
  fastingBloodSugar?: number;

  @ApiPropertyOptional({ description: 'HbA1c percentage' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(3)
  @Max(15)
  hba1c?: number;

  @ApiPropertyOptional({ description: 'Has fatty liver' })
  @IsOptional()
  @IsBoolean()
  fattyLiver?: boolean;

  @ApiPropertyOptional({ description: 'Vitamin deficiencies', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vitaminDeficiencies?: string[];

  @ApiPropertyOptional({ description: 'Current medications', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @ApiPropertyOptional({ description: 'Family history of diseases', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familyHistory?: string[];

  @ApiPropertyOptional({ description: 'Emergency contact name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  emergencyContactPhone?: string;
}

export class OnboardingPreferencesDto {
  @ApiProperty({ description: 'Dietary preference', enum: DietaryPreference })
  @IsEnum(DietaryPreference)
  dietaryPreference: DietaryPreference;

  @ApiPropertyOptional({
    description: 'Favorite cuisines',
    enum: CuisinePreference,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CuisinePreference, { each: true })
  favoriteCuisines?: CuisinePreference[];

  @ApiPropertyOptional({ description: 'Allergens and intolerances', enum: Allergen, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Allergen, { each: true })
  allergens?: Allergen[];

  @ApiPropertyOptional({ description: 'Custom allergens not in predefined list', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customAllergens?: string[];

  @ApiProperty({ description: 'Spice tolerance level', enum: SpiceLevel })
  @IsEnum(SpiceLevel)
  spiceTolerance: SpiceLevel;

  @ApiPropertyOptional({ description: 'Favorite ingredients', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteIngredients?: string[];

  @ApiPropertyOptional({ description: 'Disliked ingredients', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dislikedIngredients?: string[];

  @ApiPropertyOptional({ description: 'Cravings (snacks/treats)', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cravings?: string[];

  @ApiPropertyOptional({ description: 'Number of meals per day', minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  mealsPerDay?: number;

  @ApiPropertyOptional({ description: 'Number of snacks per day', minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  snacksPerDay?: number;

  @ApiPropertyOptional({
    description: 'Maximum cooking time in minutes',
    minimum: 5,
    maximum: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  maxCookingTime?: number;

  @ApiPropertyOptional({
    description: 'Cooking skill level (1-5 scale)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cookingSkillLevel?: number;

  @ApiPropertyOptional({ description: 'Daily food budget in INR' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(5000)
  dailyFoodBudget?: number;
}

export class OnboardingGoalsDto {
  @ApiProperty({ description: 'Primary health goal', enum: GoalType })
  @IsEnum(GoalType)
  primaryGoal: GoalType;

  @ApiProperty({ description: 'Goal priority level', enum: GoalPriority })
  @IsEnum(GoalPriority)
  goalPriority: GoalPriority;

  @ApiProperty({ description: 'Goal intensity/pace', enum: IntensityLevel })
  @IsEnum(IntensityLevel)
  intensity: IntensityLevel;

  @ApiPropertyOptional({ description: 'Target weight in kg' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(500)
  targetWeight?: number;

  @ApiPropertyOptional({ description: 'Weekly weight change target in kg/week' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-2)
  @Max(2)
  weeklyWeightChangeTarget?: number;

  @ApiPropertyOptional({ description: 'Target body fat percentage' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(5)
  @Max(50)
  targetBodyFatPercentage?: number;

  @ApiPropertyOptional({ description: 'Target date for achieving goal (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Daily calorie target' })
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(5000)
  dailyCalorieTarget?: number;

  @ApiPropertyOptional({ description: 'Daily protein target in grams' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  dailyProteinTarget?: number;

  @ApiPropertyOptional({ description: 'Weekly exercise target in minutes' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(1000)
  weeklyExerciseTarget?: number;

  @ApiPropertyOptional({ description: 'Daily steps target' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(25000)
  dailyStepsTarget?: number;

  @ApiPropertyOptional({ description: 'Weekly strength training sessions' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  weeklyStrengthSessions?: number;

  @ApiPropertyOptional({ description: 'Weekly cardio sessions' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  weeklyCardioSessions?: number;

  @ApiPropertyOptional({ description: 'Motivation/reason for the goal' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  motivation?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Enable reminders' })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Reminder time (HH:MM)' })
  @IsOptional()
  @IsString()
  reminderTime?: string;
}

export class OnboardingProgressDto {
  @ApiProperty({ description: 'Current onboarding step (0-based)' })
  currentStep: number;

  @ApiProperty({ description: 'Whether onboarding is completed' })
  onboardingCompleted: boolean;

  @ApiProperty({ description: 'Total number of onboarding steps' })
  totalSteps: number;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completionPercentage: number;

  @ApiProperty({ description: 'Steps completed', isArray: true })
  completedSteps: number[];

  @ApiProperty({ description: 'Steps skipped', isArray: true })
  skippedSteps: number[];

  @ApiPropertyOptional({ description: 'User profile completion status' })
  profileCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Last updated timestamp' })
  lastUpdated?: Date;
}

export class OnboardingAnalyticsDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  eventName: string;

  @ApiProperty({ description: 'Onboarding step' })
  @IsInt()
  @Min(0)
  @Max(10)
  step: number;

  @ApiPropertyOptional({ description: 'Additional event properties' })
  @IsOptional()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Time spent on step in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;
}
