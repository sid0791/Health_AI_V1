import { Controller, Get, Query, UseGuards, Req, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { Request } from 'express';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics retrieved successfully' })
  async getDashboardAnalytics(@Req() req: Request): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getDashboardAnalytics(userId);
  }

  @Get('weight-trend')
  @ApiOperation({ summary: 'Get weight trend data' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Weight trend data retrieved successfully' })
  async getWeightTrend(@Req() req: Request, @Query('days') days?: number): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getWeightTrend(userId, days || 30);
  }

  @Get('macro-breakdown')
  @ApiOperation({ summary: 'Get macro nutrient breakdown' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Macro breakdown retrieved successfully' })
  async getMacroBreakdown(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getMacroBreakdown(userId, startDate, endDate);
  }

  @Get('micronutrient-analysis')
  @ApiOperation({ summary: 'Get micronutrient deficiency analysis' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Micronutrient analysis retrieved successfully' })
  async getMicronutrientAnalysis(@Req() req: Request, @Query('days') days?: number): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getMicronutrientAnalysis(userId, days || 7);
  }

  @Get('goal-progress')
  @ApiOperation({ summary: 'Get goal progress and ETA' })
  @ApiResponse({ status: 200, description: 'Goal progress retrieved successfully' })
  async getGoalProgress(@Req() req: Request): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getGoalProgress(userId);
  }

  @Get('activity-summary')
  @ApiOperation({ summary: 'Get activity and fitness summary' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Activity summary retrieved successfully' })
  async getActivitySummary(@Req() req: Request, @Query('days') days?: number): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getActivitySummary(userId, days || 7);
  }

  @Get('adherence-score')
  @ApiOperation({ summary: 'Get meal plan adherence score' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Adherence score retrieved successfully' })
  async getAdherenceScore(@Req() req: Request, @Query('days') days?: number): Promise<any> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.analyticsService.getAdherenceScore(userId, days || 7);
  }
}
