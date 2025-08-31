import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MealPlanEntryService } from '../services/meal-plan-entry.service';
import { CreateMealPlanEntryDto } from '../dto/create-meal-plan-entry.dto';
import { UpdateMealPlanEntryDto } from '../dto/update-meal-plan-entry.dto';
import { MealPlanEntry } from '../entities/meal-plan-entry.entity';
import { Request } from 'express';

@ApiTags('meal-plan-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meal-plan-entries')
export class MealPlanEntryController {
  constructor(private readonly mealPlanEntryService: MealPlanEntryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new meal plan entry' })
  @ApiResponse({ status: 201, description: 'Meal plan entry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Body() createMealPlanEntryDto: CreateMealPlanEntryDto,
    @Req() req: Request,
  ): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.create(createMealPlanEntryDto, userId);
  }

  @Get('meal-plan/:mealPlanId')
  @ApiOperation({ summary: 'Get all entries for a specific meal plan' })
  @ApiQuery({ name: 'dayNumber', required: false, type: Number, description: 'Filter by day number' })
  @ApiQuery({ name: 'mealType', required: false, description: 'Filter by meal type' })
  @ApiResponse({ status: 200, description: 'Meal plan entries retrieved successfully' })
  async findByMealPlan(
    @Param('mealPlanId') mealPlanId: string,
    @Req() req: Request,
    @Query('dayNumber') dayNumber?: number,
    @Query('mealType') mealType?: string,
  ): Promise<MealPlanEntry[]> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.findByMealPlan(mealPlanId, userId, {
      dayNumber,
      mealType,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meal plan entry by ID' })
  @ApiResponse({ status: 200, description: 'Meal plan entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan entry not found' })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    const entry = await this.mealPlanEntryService.findOne(id, userId);
    if (!entry) {
      throw new HttpException('Meal plan entry not found', HttpStatus.NOT_FOUND);
    }
    return entry;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meal plan entry' })
  @ApiResponse({ status: 200, description: 'Meal plan entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan entry not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMealPlanEntryDto: UpdateMealPlanEntryDto,
    @Req() req: Request,
  ): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.update(id, updateMealPlanEntryDto, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark a meal plan entry as completed' })
  @ApiResponse({ status: 200, description: 'Meal plan entry marked as completed' })
  async markCompleted(
    @Param('id') id: string,
    @Body() body: { rating?: number; feedback?: string },
    @Req() req: Request,
  ): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.markCompleted(id, userId, body.rating, body.feedback);
  }

  @Patch(':id/skip')
  @ApiOperation({ summary: 'Mark a meal plan entry as skipped' })
  @ApiResponse({ status: 200, description: 'Meal plan entry marked as skipped' })
  async markSkipped(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.markSkipped(id, userId, body.reason);
  }

  @Patch(':id/substitute')
  @ApiOperation({ summary: 'Substitute a recipe in a meal plan entry' })
  @ApiResponse({ status: 200, description: 'Meal plan entry recipe substituted' })
  async substitute(
    @Param('id') id: string,
    @Body() body: { newRecipeId: string; reason?: string },
    @Req() req: Request,
  ): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.substitute(id, userId, body.newRecipeId, body.reason);
  }

  @Patch(':id/portion')
  @ApiOperation({ summary: 'Update portion size for a meal plan entry' })
  @ApiResponse({ status: 200, description: 'Portion size updated successfully' })
  async updatePortionSize(
    @Param('id') id: string,
    @Body() body: { portionSize: number },
    @Req() req: Request,
  ): Promise<MealPlanEntry> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanEntryService.updatePortionSize(id, userId, body.portionSize);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meal plan entry' })
  @ApiResponse({ status: 200, description: 'Meal plan entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan entry not found' })
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    await this.mealPlanEntryService.remove(id, userId);
  }
}