import { PartialType } from '@nestjs/swagger';
import { CreateMealPlanEntryDto } from './create-meal-plan-entry.dto';

export class UpdateMealPlanEntryDto extends PartialType(CreateMealPlanEntryDto) {}