import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { MealPlanStatus, MealPlanType } from '../entities/meal-plan.entity';
import { Transform } from 'class-transformer';

export class MealPlanQueryDto {
  @ApiProperty({ description: 'Filter by meal plan status', required: false, enum: MealPlanStatus })
  @IsOptional()
  @IsEnum(MealPlanStatus)
  status?: MealPlanStatus;

  @ApiProperty({ description: 'Filter by meal plan type', required: false, enum: MealPlanType })
  @IsOptional()
  @IsEnum(MealPlanType)
  planType?: MealPlanType;

  @ApiProperty({ description: 'Filter by active status', required: false, type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Number of results to return',
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @ApiProperty({ description: 'Number of results to skip', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number;

  @ApiProperty({ description: 'Search by name or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
