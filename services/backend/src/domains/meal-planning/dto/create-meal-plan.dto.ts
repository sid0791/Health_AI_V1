import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { MealPlanType } from '../entities/meal-plan.entity';

export class CreateMealPlanDto {
  @ApiProperty({ description: 'Name of the meal plan', example: 'Weight Loss Plan Week 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the meal plan', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of meal plan',
    enum: MealPlanType,
    example: MealPlanType.WEIGHT_LOSS,
  })
  @IsEnum(MealPlanType)
  planType: MealPlanType;

  @ApiProperty({ description: 'Start date of the meal plan', example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date of the meal plan', example: '2024-01-07' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Duration in days', example: 7, minimum: 1, maximum: 30 })
  @IsNumber()
  @Min(1)
  @Max(30)
  durationDays: number;

  @ApiProperty({
    description: 'Whether to activate this plan immediately',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Target calories per day',
    example: 2000,
    minimum: 800,
    maximum: 5000,
  })
  @IsNumber()
  @Min(800)
  @Max(5000)
  targetCaloriesPerDay: number;

  @ApiProperty({ description: 'Target protein in grams', example: 120 })
  @IsNumber()
  @Min(0)
  targetProteinGrams: number;

  @ApiProperty({ description: 'Target carbs in grams', example: 200 })
  @IsNumber()
  @Min(0)
  targetCarbGrams: number;

  @ApiProperty({ description: 'Target fat in grams', example: 80 })
  @IsNumber()
  @Min(0)
  targetFatGrams: number;

  @ApiProperty({ description: 'Target fiber in grams', example: 25 })
  @IsNumber()
  @Min(0)
  targetFiberGrams: number;

  @ApiProperty({ description: 'Daily budget in INR', required: false, example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyBudgetInr?: number;

  @ApiProperty({ description: 'Maximum cooking time in minutes', required: false, default: 45 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(240)
  maxCookingTimeMinutes?: number;

  @ApiProperty({ description: 'Required skill level (1-5)', required: false, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  skillLevelRequired?: number;

  @ApiProperty({
    description: 'Dietary restrictions',
    required: false,
    example: ['vegetarian', 'gluten-free'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiProperty({
    description: 'Cuisine preferences',
    required: false,
    example: ['indian', 'mediterranean'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences?: string[];

  @ApiProperty({
    description: 'Ingredients to avoid',
    required: false,
    example: ['peanuts', 'shellfish'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidedIngredients?: string[];

  @ApiProperty({
    description: 'Preferred ingredients',
    required: false,
    example: ['quinoa', 'avocado'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIngredients?: string[];

  @ApiProperty({ description: 'Number of meals per day', required: false, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  mealsPerDay?: number;

  @ApiProperty({ description: 'Number of snacks per day', required: false, default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  snacksPerDay?: number;

  @ApiProperty({ description: 'Include beverages in plan', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  includeBeverages?: boolean;

  @ApiProperty({ description: 'Health conditions to consider', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @ApiProperty({ description: 'Special requirements', required: false })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiProperty({ description: 'Generate default meal entries', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  generateDefaultEntries?: boolean;

  @ApiProperty({ description: 'Tags for categorization', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
