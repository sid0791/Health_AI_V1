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
import { MealPlanService } from '../services/meal-plan.service';
import { CreateMealPlanDto } from '../dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from '../dto/update-meal-plan.dto';
import { MealPlanQueryDto } from '../dto/meal-plan-query.dto';
import { MealPlan } from '../entities/meal-plan.entity';
import { Request } from 'express';

@ApiTags('meal-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meal-plans')
export class MealPlanController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new meal plan' })
  @ApiResponse({ status: 201, description: 'Meal plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Body() createMealPlanDto: CreateMealPlanDto,
    @Req() req: Request,
  ): Promise<MealPlan> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.create(createMealPlanDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all meal plans for the current user' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'planType', required: false, description: 'Filter by plan type' })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'Meal plans retrieved successfully' })
  async findAll(@Query() query: MealPlanQueryDto, @Req() req: Request): Promise<MealPlan[]> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.findAllByUser(userId, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active meal plan' })
  @ApiResponse({ status: 200, description: 'Active meal plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active meal plan found' })
  async findActive(@Req() req: Request): Promise<MealPlan | null> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.findActivePlan(userId);
  }

  @Get('current-week')
  @ApiOperation({ summary: 'Get the current week meal plan with entries' })
  @ApiResponse({ status: 200, description: 'Current week meal plan retrieved successfully' })
  async getCurrentWeek(@Req() req: Request): Promise<MealPlan | null> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.getCurrentWeekPlan(userId);
  }

  @Get('today-meals')
  @ApiOperation({ summary: "Get today's meals" })
  @ApiResponse({ status: 200, description: "Today's meals retrieved successfully" })
  async getTodayMeals(@Req() req: Request): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.getTodayMeals(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meal plan by ID' })
  @ApiResponse({ status: 200, description: 'Meal plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<MealPlan> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    const mealPlan = await this.mealPlanService.findOne(id, userId);
    if (!mealPlan) {
      throw new HttpException('Meal plan not found', HttpStatus.NOT_FOUND);
    }
    return mealPlan;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  async update(
    @Param('id') id: string,
    @Body() updateMealPlanDto: UpdateMealPlanDto,
    @Req() req: Request,
  ): Promise<MealPlan> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.update(id, updateMealPlanDto, userId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan activated successfully' })
  async activate(@Param('id') id: string, @Req() req: Request): Promise<MealPlan> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.activate(id, userId);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause a meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan paused successfully' })
  async pause(@Param('id') id: string, @Req() req: Request): Promise<MealPlan> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.pause(id, userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete a meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan completed successfully' })
  async complete(@Param('id') id: string, @Req() req: Request): Promise<MealPlan> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.complete(id, userId);
  }

  @Get(':id/shopping-list')
  @ApiOperation({ summary: 'Generate shopping list for a meal plan' })
  @ApiResponse({ status: 200, description: 'Shopping list generated successfully' })
  async generateShoppingList(@Param('id') id: string, @Req() req: Request): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.mealPlanService.generateShoppingList(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meal plan' })
  @ApiResponse({ status: 200, description: 'Meal plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Meal plan not found' })
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    await this.mealPlanService.remove(id, userId);
  }
}
