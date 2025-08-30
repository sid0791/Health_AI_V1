import { IsEnum, IsNumber, IsOptional, IsString, IsObject, ValidateNested, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CookingMethod } from '../enums/cooking-method.enum';

export class NutrientContentDto {
  @ApiProperty({ description: 'Energy in kcal per 100g' })
  @IsNumber()
  @Min(0)
  energy: number;

  @ApiProperty({ description: 'Protein in grams per 100g' })
  @IsNumber()
  @Min(0)
  protein: number;

  @ApiProperty({ description: 'Carbohydrates in grams per 100g' })
  @IsNumber()
  @Min(0)
  carbohydrates: number;

  @ApiProperty({ description: 'Fat in grams per 100g' })
  @IsNumber()
  @Min(0)
  fat: number;

  @ApiProperty({ description: 'Fiber in grams per 100g' })
  @IsNumber()
  @Min(0)
  fiber: number;

  @ApiProperty({ description: 'Sugar in grams per 100g' })
  @IsNumber()
  @Min(0)
  sugar: number;

  @ApiPropertyOptional({ description: 'Calcium in mg per 100g' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calcium?: number;

  @ApiPropertyOptional({ description: 'Iron in mg per 100g' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  iron?: number;

  @ApiPropertyOptional({ description: 'Vitamin C in mg per 100g' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminC?: number;

  @ApiPropertyOptional({ description: 'Sodium in mg per 100g' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;

  @ApiPropertyOptional({ description: 'Potassium in mg per 100g' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  potassium?: number;
}

export class CookingParametersDto {
  @ApiProperty({ 
    description: 'Cooking method to apply',
    enum: CookingMethod,
    example: CookingMethod.BOILED
  })
  @IsEnum(CookingMethod)
  method: CookingMethod;

  @ApiPropertyOptional({ description: 'Cooking temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Cooking time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  cookingTime?: number;

  @ApiPropertyOptional({ description: 'Added fat/oil in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  addedFat?: number;

  @ApiPropertyOptional({ description: 'Added salt in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  addedSalt?: number;

  @ApiPropertyOptional({ description: 'Added water in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  addedWater?: number;
}

export class FoodCompositionDto {
  @ApiProperty({ description: 'Total carbohydrates in grams per 100g' })
  @IsNumber()
  @Min(0)
  totalCarbohydrates: number;

  @ApiProperty({ description: 'Fiber in grams per 100g' })
  @IsNumber()
  @Min(0)
  fiber: number;

  @ApiProperty({ description: 'Sugar in grams per 100g' })
  @IsNumber()
  @Min(0)
  sugar: number;

  @ApiProperty({ description: 'Starch in grams per 100g' })
  @IsNumber()
  @Min(0)
  starch: number;

  @ApiProperty({ description: 'Protein in grams per 100g' })
  @IsNumber()
  @Min(0)
  protein: number;

  @ApiProperty({ description: 'Fat in grams per 100g' })
  @IsNumber()
  @Min(0)
  fat: number;

  @ApiProperty({ 
    description: 'Processing level of the food',
    enum: ['minimal', 'processed', 'highly_processed']
  })
  @IsEnum(['minimal', 'processed', 'highly_processed'])
  processingLevel: 'minimal' | 'processed' | 'highly_processed';

  @ApiProperty({ 
    description: 'Physical form of the food',
    enum: ['liquid', 'solid', 'gel']
  })
  @IsEnum(['liquid', 'solid', 'gel'])
  foodForm: 'liquid' | 'solid' | 'gel';

  @ApiPropertyOptional({ description: 'Preparation method if any' })
  @IsOptional()
  @IsString()
  preparationMethod?: string;
}

export class EnhancedIngredientDto {
  @ApiProperty({ description: 'Unique food identifier' })
  @IsString()
  foodId: string;

  @ApiProperty({ description: 'Human-readable food name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Raw weight in grams' })
  @IsNumber()
  @Min(0.1)
  @Max(10000)
  rawWeight: number;

  @ApiProperty({ description: 'Raw nutritional content per 100g' })
  @ValidateNested()
  @Type(() => NutrientContentDto)
  rawNutrients: NutrientContentDto;

  @ApiPropertyOptional({ description: 'Cooking parameters to apply' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CookingParametersDto)
  cookingParams?: CookingParametersDto;

  @ApiPropertyOptional({ description: 'Food composition for GI estimation' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FoodCompositionDto)
  foodComposition?: FoodCompositionDto;

  @ApiPropertyOptional({ description: 'Known glycemic index value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  knownGI?: number;
}

export class EnhancedRecipeDto {
  @ApiProperty({ description: 'Unique recipe identifier' })
  @IsString()
  recipeId: string;

  @ApiProperty({ description: 'Recipe name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Number of servings' })
  @IsNumber()
  @Min(1)
  @Max(50)
  servings: number;

  @ApiProperty({ description: 'List of ingredients with cooking parameters' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnhancedIngredientDto)
  ingredients: EnhancedIngredientDto[];

  @ApiProperty({ description: 'Cooking instructions' })
  @IsArray()
  @IsString({ each: true })
  instructions: string[];

  @ApiPropertyOptional({ description: 'Total cooking time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  totalCookingTime?: number;

  @ApiPropertyOptional({ 
    description: 'Recipe difficulty level',
    enum: ['easy', 'medium', 'hard']
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';
}

export class GlycemicIndexEstimationDto {
  @ApiProperty({ description: 'Food composition for GI estimation' })
  @ValidateNested()
  @Type(() => FoodCompositionDto)
  composition: FoodCompositionDto;

  @ApiPropertyOptional({ description: 'Food category for better estimation' })
  @IsOptional()
  @IsString()
  foodCategory?: string;
}

export class GlycemicLoadCalculationDto {
  @ApiProperty({ description: 'Glycemic index value' })
  @IsNumber()
  @Min(0)
  @Max(150)
  gi: number;

  @ApiProperty({ description: 'Available carbohydrates in grams' })
  @IsNumber()
  @Min(0)
  availableCarbohydrates: number;

  @ApiProperty({ description: 'Portion size in grams' })
  @IsNumber()
  @Min(0.1)
  portionSize: number;
}

export class CookingTransformationDto {
  @ApiProperty({ description: 'Raw nutritional content per 100g' })
  @ValidateNested()
  @Type(() => NutrientContentDto)
  rawNutrients: NutrientContentDto;

  @ApiProperty({ description: 'Raw weight in grams' })
  @IsNumber()
  @Min(0.1)
  @Max(10000)
  rawWeight: number;

  @ApiProperty({ description: 'Cooking parameters to apply' })
  @ValidateNested()
  @Type(() => CookingParametersDto)
  cookingParams: CookingParametersDto;
}

export class NutritionTargetsDto {
  @ApiProperty({ description: 'Target calories' })
  @IsNumber()
  @Min(100)
  @Max(10000)
  calories: number;

  @ApiProperty({ description: 'Target protein in grams' })
  @IsNumber()
  @Min(5)
  @Max(500)
  protein: number;

  @ApiProperty({ description: 'Target carbohydrates in grams' })
  @IsNumber()
  @Min(5)
  @Max(1000)
  carbohydrates: number;

  @ApiProperty({ description: 'Target fat in grams' })
  @IsNumber()
  @Min(5)
  @Max(300)
  fat: number;
}

export class EnhancedMealPlanDto {
  @ApiProperty({ description: 'Unique meal identifier' })
  @IsString()
  mealId: string;

  @ApiProperty({ 
    description: 'Type of meal',
    enum: ['breakfast', 'lunch', 'dinner', 'snack']
  })
  @IsEnum(['breakfast', 'lunch', 'dinner', 'snack'])
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  @ApiProperty({ description: 'Recipes in this meal' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnhancedRecipeDto)
  recipes: EnhancedRecipeDto[];

  @ApiPropertyOptional({ description: 'Nutrition targets for this meal' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NutritionTargetsDto)
  nutritionTargets?: NutritionTargetsDto;
}

export class RecipeOptimizationGoalsDto {
  @ApiPropertyOptional({ description: 'Minimize glycemic index' })
  @IsOptional()
  @IsBoolean()
  minimizeGI?: boolean;

  @ApiPropertyOptional({ description: 'Maximize protein content' })
  @IsOptional()
  @IsBoolean()
  maximizeProtein?: boolean;

  @ApiPropertyOptional({ description: 'Minimize sodium content' })
  @IsOptional()
  @IsBoolean()
  minimizeSodium?: boolean;

  @ApiPropertyOptional({ description: 'Preserve vitamin content' })
  @IsOptional()
  @IsBoolean()
  preserveVitamins?: boolean;
}

// Add IsBoolean import
import { IsBoolean } from 'class-validator';