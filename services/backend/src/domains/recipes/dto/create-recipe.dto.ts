import { IsString, IsArray, IsOptional, IsNumber, IsEnum, IsBoolean, ValidateNested, IsUrl, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DietType, MealType, DifficultyLevel } from '../entities/recipe.entity';

export class CreateRecipeIngredientDto {
  @IsString()
  ingredientName: string;

  @IsOptional()
  @IsString()
  ingredientNameHindi?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @IsOptional()
  @IsString()
  preparationNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  substitutes?: string[];

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  usdaFoodId?: string;

  @IsOptional()
  @IsString()
  ifctFoodId?: string;

  @IsOptional()
  @IsString()
  openFoodFactsBarcode?: string;
}

export class CreateRecipeStepDto {
  @IsNumber()
  @Min(1)
  stepNumber: number;

  @IsString()
  instruction: string;

  @IsOptional()
  @IsString()
  instructionHindi?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  temperatureCelsius?: number;

  @IsOptional()
  @IsString()
  cookingMethod?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentNeeded?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredientsUsed?: string[];

  @IsOptional()
  @IsString()
  tips?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @IsString()
  safetyNote?: string;
}

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  cuisine: string;

  @IsArray()
  @IsEnum(DietType, { each: true })
  dietType: DietType[];

  @IsArray()
  @IsEnum(MealType, { each: true })
  mealType: MealType[];

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsNumber()
  @Min(0)
  prepTimeMinutes: number;

  @IsNumber()
  @Min(0)
  cookTimeMinutes: number;

  @IsNumber()
  @Min(1)
  servingsCount: number;

  @IsOptional()
  @IsBoolean()
  isDiabeticFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  isHypertensionFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  isPcosFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  isFattyLiverFriendly?: boolean;

  @IsOptional()
  @IsBoolean()
  isHighProtein?: boolean;

  @IsOptional()
  @IsBoolean()
  isLowCalorie?: boolean;

  @IsOptional()
  @IsBoolean()
  isGlutenFree?: boolean;

  @IsOptional()
  @IsBoolean()
  isDairyFree?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  sourceAttribution?: string;

  @IsOptional()
  @IsString()
  recipeYield?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentNeeded?: string[];

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps: CreateRecipeStepDto[];

  // Helper method to calculate total time
  getTotalTimeMinutes(): number {
    return this.prepTimeMinutes + this.cookTimeMinutes;
  }
}