import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsDecimal, Min, Max } from 'class-validator';
import { MealType } from '../entities/meal-plan-entry.entity';

export class CreateMealPlanEntryDto {
  @ApiProperty({ description: 'Meal plan ID' })
  @IsString()
  @IsNotEmpty()
  mealPlanId: string;

  @ApiProperty({ description: 'Recipe ID (optional)', required: false })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiProperty({ description: 'Day number (1-7 for weekly plans)', minimum: 1, maximum: 30 })
  @IsNumber()
  @Min(1)
  @Max(30)
  dayNumber: number;

  @ApiProperty({ description: 'Type of meal', enum: MealType })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiProperty({ description: 'Name of the meal' })
  @IsString()
  @IsNotEmpty()
  mealName: string;

  @ApiProperty({ description: 'Description of the meal', required: false })
  @IsOptional()
  @IsString()
  mealDescription?: string;

  @ApiProperty({ description: 'Planned time (HH:MM format)', required: false })
  @IsOptional()
  @IsString()
  plannedTime?: string;

  @ApiProperty({ description: 'Portion size', minimum: 0.1, maximum: 10, default: 1.0 })
  @IsNumber()
  @Min(0.1)
  @Max(10)
  portionSize: number = 1.0;

  @ApiProperty({ description: 'Serving size in grams', required: false })
  @IsOptional()
  @IsNumber()
  servingSizeGrams?: number;

  @ApiProperty({ description: 'Calories per serving' })
  @IsNumber()
  @Min(0)
  calories: number;

  @ApiProperty({ description: 'Protein in grams' })
  @IsNumber()
  @Min(0)
  proteinGrams: number;

  @ApiProperty({ description: 'Carbs in grams' })
  @IsNumber()
  @Min(0)
  carbsGrams: number;

  @ApiProperty({ description: 'Fat in grams' })
  @IsNumber()
  @Min(0)
  fatGrams: number;

  @ApiProperty({ description: 'Fiber in grams', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiberGrams?: number;

  @ApiProperty({ description: 'Sugar in grams', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sugarGrams?: number;

  @ApiProperty({ description: 'Sodium in mg', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sodiumMg?: number;

  @ApiProperty({ description: 'Estimated cost in INR', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCostInr?: number;

  @ApiProperty({ description: 'Preparation time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prepTimeMinutes?: number;

  @ApiProperty({ description: 'Cooking time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cookTimeMinutes?: number;

  @ApiProperty({ description: 'Customization notes', required: false })
  @IsOptional()
  @IsString()
  customizationNotes?: string;

  @ApiProperty({ description: 'Alternative recipe options', required: false })
  @IsOptional()
  alternativeOptions?: string[];

  @ApiProperty({ description: 'Sort order within the day', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}