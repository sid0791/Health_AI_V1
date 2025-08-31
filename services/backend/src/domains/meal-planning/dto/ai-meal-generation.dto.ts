import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MealPlanType } from '../entities/meal-plan.entity';

export class UserProfileDto {
  @ApiProperty({ description: 'User age in years', example: 28, minimum: 13, maximum: 100 })
  @IsNumber()
  @Min(13)
  @Max(100)
  age: number;

  @ApiProperty({ description: 'User gender', enum: ['male', 'female', 'other'], example: 'female' })
  @IsString()
  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @ApiProperty({ description: 'User weight in kg', example: 65, minimum: 30, maximum: 300 })
  @IsNumber()
  @Min(30)
  @Max(300)
  weight: number;

  @ApiProperty({ description: 'User height in cm', example: 165, minimum: 100, maximum: 250 })
  @IsNumber()
  @Min(100)
  @Max(250)
  height: number;

  @ApiProperty({
    description: 'Activity level',
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    example: 'moderate',
  })
  @IsString()
  @IsEnum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

  @ApiProperty({
    description: 'Health and fitness goals',
    example: ['weight_loss', 'muscle_gain', 'better_energy'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  goals: string[];

  @ApiProperty({
    description: 'Health conditions to consider',
    example: ['diabetes', 'hypertension'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @ApiProperty({
    description: 'Food allergies and intolerances',
    example: ['nuts', 'dairy'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({
    description: 'Dietary preferences and restrictions',
    example: ['vegetarian', 'gluten-free'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  dietaryPreferences: string[];

  @ApiProperty({
    description: 'Preferred cuisines',
    example: ['indian', 'mediterranean', 'asian'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences: string[];

  @ApiProperty({
    description: 'Preferred ingredients',
    example: ['quinoa', 'spinach', 'salmon'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIngredients?: string[];

  @ApiProperty({
    description: 'Ingredients to avoid',
    example: ['eggplant', 'bitter gourd'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidedIngredients?: string[];

  @ApiProperty({
    description: 'Daily budget range in INR',
    example: { min: 200, max: 500 },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange: BudgetRangeDto;

  @ApiProperty({
    description: 'Cooking skill level (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  cookingSkillLevel: number;

  @ApiProperty({
    description: 'Available cooking time per meal in minutes',
    example: 45,
    minimum: 10,
    maximum: 180,
  })
  @IsNumber()
  @Min(10)
  @Max(180)
  availableCookingTime: number;

  @ApiProperty({
    description: 'Meal frequency preferences',
    example: { mealsPerDay: 3, snacksPerDay: 2, includeBeverages: true },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MealFrequencyDto)
  mealFrequency: MealFrequencyDto;
}

export class BudgetRangeDto {
  @ApiProperty({ description: 'Minimum budget per day in INR', example: 200 })
  @IsNumber()
  @Min(50)
  min: number;

  @ApiProperty({ description: 'Maximum budget per day in INR', example: 500 })
  @IsNumber()
  @Min(50)
  max: number;
}

export class MealFrequencyDto {
  @ApiProperty({ description: 'Number of main meals per day', example: 3, minimum: 1, maximum: 6 })
  @IsNumber()
  @Min(1)
  @Max(6)
  mealsPerDay: number;

  @ApiProperty({ description: 'Number of snacks per day', example: 2, minimum: 0, maximum: 4 })
  @IsNumber()
  @Min(0)
  @Max(4)
  snacksPerDay: number;

  @ApiProperty({ description: 'Include beverages in the plan', example: true })
  @IsBoolean()
  includeBeverages: boolean;
}

export class MacroTargetsDto {
  @ApiProperty({
    description: 'Protein percentage of total calories',
    example: 25,
    minimum: 10,
    maximum: 40,
  })
  @IsNumber()
  @Min(10)
  @Max(40)
  proteinPercent: number;

  @ApiProperty({
    description: 'Carbohydrate percentage of total calories',
    example: 45,
    minimum: 20,
    maximum: 70,
  })
  @IsNumber()
  @Min(20)
  @Max(70)
  carbPercent: number;

  @ApiProperty({
    description: 'Fat percentage of total calories',
    example: 30,
    minimum: 15,
    maximum: 50,
  })
  @IsNumber()
  @Min(15)
  @Max(50)
  fatPercent: number;
}

export class PlanPreferencesDto {
  @ApiProperty({ description: 'Plan duration in days', example: 7, minimum: 1, maximum: 30 })
  @IsNumber()
  @Min(1)
  @Max(30)
  duration: number;

  @ApiProperty({
    description: 'Type of meal plan',
    enum: MealPlanType,
    example: MealPlanType.WEIGHT_LOSS,
  })
  @IsEnum(MealPlanType)
  planType: MealPlanType;

  @ApiProperty({ description: 'Target daily calories', example: 2000, minimum: 800, maximum: 5000 })
  @IsNumber()
  @Min(800)
  @Max(5000)
  targetCalories: number;

  @ApiProperty({
    description: 'Macronutrient targets',
    example: { proteinPercent: 25, carbPercent: 45, fatPercent: 30 },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MacroTargetsDto)
  macroTargets: MacroTargetsDto;

  @ApiProperty({
    description: 'Special requests or notes',
    example: 'Focus on anti-inflammatory foods',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ description: 'Include controlled cheat meals', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  includeCheatMeals?: boolean;

  @ApiProperty({ description: 'Include weekend treats', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  weekendTreats?: boolean;
}

export class ContextDataDto {
  @ApiProperty({ description: 'Current season', example: 'summer', required: false })
  @IsOptional()
  @IsString()
  currentSeason?: string;

  @ApiProperty({
    description: 'User location for ingredient availability',
    example: 'Mumbai',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Available ingredients in local area',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableIngredients?: string[];

  @ApiProperty({
    description: 'Previous meal plan IDs for variety',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previousPlans?: string[];

  @ApiProperty({
    description: 'User feedback on previous meals',
    required: false,
  })
  @IsOptional()
  @IsObject()
  userFeedback?: {
    likedMeals: string[];
    dislikedMeals: string[];
    intolerances: string[];
  };
}

export class GeneratePersonalizedMealPlanDto {
  @ApiProperty({
    description: 'User profile information',
    type: UserProfileDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UserProfileDto)
  userProfile: UserProfileDto;

  @ApiProperty({
    description: 'Plan preferences and requirements',
    type: PlanPreferencesDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => PlanPreferencesDto)
  planPreferences: PlanPreferencesDto;

  @ApiProperty({
    description: 'Additional context data',
    type: ContextDataDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContextDataDto)
  contextData?: ContextDataDto;
}

export class NutritionTargetsDto {
  @ApiProperty({ description: 'Maximum calories per serving', example: 400 })
  @IsNumber()
  @Min(50)
  @Max(1500)
  maxCalories: number;

  @ApiProperty({ description: 'Minimum protein in grams', example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minProtein: number;

  @ApiProperty({ description: 'Maximum carbs in grams', example: 45, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  maxCarbs?: number;

  @ApiProperty({
    description: 'Health focus areas',
    example: ['low_gi', 'anti_inflammatory', 'heart_healthy'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  healthFocus: string[];
}

export class RecipeUserPreferencesDto {
  @ApiProperty({ description: 'Preferred cuisine style', example: 'indian' })
  @IsString()
  @IsNotEmpty()
  cuisineStyle: string;

  @ApiProperty({ description: 'Available cooking time in minutes', example: 45 })
  @IsNumber()
  @Min(10)
  @Max(180)
  availableTime: number;

  @ApiProperty({ description: 'Cooking skill level (1-5)', example: 3 })
  @IsNumber()
  @Min(1)
  @Max(5)
  skillLevel: number;

  @ApiProperty({
    description: 'Budget range for the recipe',
    type: BudgetRangeDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange: BudgetRangeDto;
}

export class GenerateInnovativeRecipeDto {
  @ApiProperty({ description: 'Base recipe name or concept', example: 'Healthy Pizza' })
  @IsString()
  @IsNotEmpty()
  baseRecipeName: string;

  @ApiProperty({
    description: 'Dietary constraints to follow',
    example: ['vegetarian', 'low-carb'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  dietaryConstraints: string[];

  @ApiProperty({
    description: 'Nutritional targets for the recipe',
    type: NutritionTargetsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => NutritionTargetsDto)
  nutritionTargets: NutritionTargetsDto;

  @ApiProperty({
    description: 'User preferences for the recipe',
    type: RecipeUserPreferencesDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => RecipeUserPreferencesDto)
  userPreferences: RecipeUserPreferencesDto;
}

export class ShoppingListConstraintsDto {
  @ApiProperty({ description: 'Maximum budget for shopping', example: 2000 })
  @IsNumber()
  @Min(100)
  maxBudget: number;

  @ApiProperty({
    description: 'Preferred stores for shopping',
    example: ['Big Bazaar', 'Reliance Fresh'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStores?: string[];
}

export class GenerateShoppingListDto {
  @ApiProperty({
    description: 'Budget constraints for shopping',
    type: ShoppingListConstraintsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ShoppingListConstraintsDto)
  budgetConstraints: ShoppingListConstraintsDto;

  @ApiProperty({ description: 'User location for availability checking', example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  userLocation: string;

  @ApiProperty({
    description: 'Recipe IDs to generate shopping list for',
    example: ['recipe-1', 'recipe-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  recipeIds: string[];
}
