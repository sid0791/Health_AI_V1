import { PartialType } from '@nestjs/mapped-types';
import {
  CreateRecipeDto,
  CreateRecipeIngredientDto,
  CreateRecipeStepDto,
} from './create-recipe.dto';
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  qualityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  popularityScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTimeMinutes?: number;

  // Override to make ingredients and steps optional for updates
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps?: CreateRecipeStepDto[];
}
