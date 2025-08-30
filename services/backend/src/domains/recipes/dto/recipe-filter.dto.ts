import {
  IsOptional,
  IsArray,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DietType, MealType, DifficultyLevel } from '../entities/recipe.entity';

export class RecipeFilterDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  cuisine?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(DietType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  dietType?: DietType[];

  @IsOptional()
  @IsArray()
  @IsEnum(MealType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  mealType?: MealType[];

  @IsOptional()
  @IsArray()
  @IsEnum(DifficultyLevel, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  difficultyLevel?: DifficultyLevel[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrepTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCookTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCalories?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDiabeticFriendly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isHypertensionFriendly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPcosFriendly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFattyLiverFriendly?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isHighProtein?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isLowCalorie?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isGlutenFree?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDairyFree?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  allergens?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  excludeIngredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  minQualityScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: 'popularity' | 'quality' | 'recent' | 'prepTime' | 'calories' = 'popularity';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // Helper method to convert to repository filter options
  toRepositoryFilter() {
    const healthConditions: any = {};

    if (this.isDiabeticFriendly !== undefined) {
      healthConditions.diabetes = this.isDiabeticFriendly;
    }
    if (this.isHypertensionFriendly !== undefined) {
      healthConditions.hypertension = this.isHypertensionFriendly;
    }
    if (this.isPcosFriendly !== undefined) {
      healthConditions.pcos = this.isPcosFriendly;
    }
    if (this.isFattyLiverFriendly !== undefined) {
      healthConditions.fattyLiver = this.isFattyLiverFriendly;
    }

    return {
      cuisine: this.cuisine,
      dietType: this.dietType,
      mealType: this.mealType,
      difficultyLevel: this.difficultyLevel,
      maxPrepTime: this.maxPrepTime,
      maxCookTime: this.maxCookTime,
      maxCalories: this.maxCalories,
      isHealthConditionFriendly:
        Object.keys(healthConditions).length > 0 ? healthConditions : undefined,
      allergens: this.allergens,
      excludeIngredients: this.excludeIngredients,
      tags: this.tags,
      isActive: this.isActive,
      isVerified: this.isVerified,
      minQualityScore: this.minQualityScore,
    };
  }
}
