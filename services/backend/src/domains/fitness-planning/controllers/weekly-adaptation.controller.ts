import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User as UserDecorator } from '../../auth/decorators/user.decorator';
import { User } from '../../users/entities/user.entity';
import { 
  WeeklyAdaptationService, 
  WeeklyAdaptationRequest,
  WeeklyAdaptationResult 
} from '../services/weekly-adaptation.service';

export class TriggerWeeklyAdaptationDto {
  triggerType: 'weekly_schedule' | 'user_requested' | 'manual';
  timestamp?: Date;
  userId?: string; // Optional for manual triggers
}

export class WeeklyAdaptationResponseDto {
  success: boolean;
  data: WeeklyAdaptationResult;
  message: string;
  timestamp: Date;
}

export class BatchAdaptationResponseDto {
  success: boolean;
  totalUsers: number;
  processedUsers: number;
  errors: string[];
  timestamp: Date;
}

@ApiTags('Fitness Planning - Weekly Adaptation')
@Controller('fitness-planning/weekly-adaptation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeeklyAdaptationController {
  private readonly logger = new Logger(WeeklyAdaptationController.name);

  constructor(
    private readonly weeklyAdaptationService: WeeklyAdaptationService,
  ) {}

  /**
   * Trigger weekly adaptation for current user
   */
  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger weekly fitness plan adaptation',
    description: 'Analyzes the past week\'s adherence and adapts the upcoming week\'s fitness plan',
  })
  @ApiBody({ type: TriggerWeeklyAdaptationDto })
  @ApiResponse({
    status: 200,
    description: 'Weekly adaptation completed successfully',
    type: WeeklyAdaptationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or no active fitness plan',
  })
  async triggerWeeklyAdaptation(
    @UserDecorator() user: User,
    @Body() triggerDto: TriggerWeeklyAdaptationDto,
  ): Promise<WeeklyAdaptationResponseDto> {
    try {
      this.logger.log(`Triggering weekly adaptation for user ${user.id} via ${triggerDto.triggerType}`);

      const request: WeeklyAdaptationRequest = {
        userId: user.id,
        adaptationType: triggerDto.triggerType === 'user_requested' ? 'user_requested' : 'automatic',
      };

      const result = await this.weeklyAdaptationService.adaptUserFitnessPlan(request);

      return {
        success: true,
        data: result,
        message: 'Weekly adaptation completed successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error in weekly adaptation for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to complete weekly adaptation');
    }
  }

  /**
   * Trigger weekly adaptation for specific user (admin only)
   */
  @Post('trigger/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger weekly adaptation for specific user',
    description: 'Admin endpoint to trigger weekly adaptation for any user',
  })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiBody({ type: TriggerWeeklyAdaptationDto })
  @ApiResponse({
    status: 200,
    description: 'Weekly adaptation completed successfully',
    type: WeeklyAdaptationResponseDto,
  })
  async triggerUserAdaptation(
    @Param('userId') userId: string,
    @Body() triggerDto: TriggerWeeklyAdaptationDto,
    @UserDecorator() currentUser: User,
  ): Promise<WeeklyAdaptationResponseDto> {
    // TODO: Add admin role check
    // if (!currentUser.roles.includes('admin')) {
    //   throw new ForbiddenException('Admin access required');
    // }

    try {
      this.logger.log(`Admin ${currentUser.id} triggering weekly adaptation for user ${userId}`);

      const request: WeeklyAdaptationRequest = {
        userId,
        adaptationType: 'user_requested',
      };

      const result = await this.weeklyAdaptationService.adaptUserFitnessPlan(request);

      return {
        success: true,
        data: result,
        message: `Weekly adaptation completed for user ${userId}`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error in admin weekly adaptation for user ${userId}:`, error);
      throw new BadRequestException(error.message || 'Failed to complete weekly adaptation');
    }
  }

  /**
   * Get latest adaptation result for current user
   */
  @Get('latest')
  @ApiOperation({
    summary: 'Get latest weekly adaptation result',
    description: 'Retrieves the most recent weekly adaptation results for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest adaptation result retrieved successfully',
  })
  async getLatestAdaptation(@UserDecorator() user: User): Promise<any> {
    try {
      // This would retrieve from a stored adaptations table
      // For now, return a placeholder response
      return {
        success: true,
        message: 'Latest adaptation endpoint - implementation pending',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error retrieving latest adaptation for user ${user.id}:`, error);
      throw new BadRequestException('Failed to retrieve adaptation history');
    }
  }

  /**
   * Get adaptation history for current user
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get weekly adaptation history',
    description: 'Retrieves the history of weekly adaptations for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Adaptation history retrieved successfully',
  })
  async getAdaptationHistory(@UserDecorator() user: User): Promise<any> {
    try {
      // This would retrieve from a stored adaptations table
      // For now, return a placeholder response
      return {
        success: true,
        data: [],
        message: 'Adaptation history endpoint - implementation pending',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error retrieving adaptation history for user ${user.id}:`, error);
      throw new BadRequestException('Failed to retrieve adaptation history');
    }
  }

  /**
   * N8N webhook endpoint for batch processing
   */
  @Post('batch-trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch trigger weekly adaptations',
    description: 'N8N webhook endpoint to trigger weekly adaptations for all users',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch adaptation process initiated',
    type: BatchAdaptationResponseDto,
  })
  async batchTriggerAdaptations(): Promise<BatchAdaptationResponseDto> {
    try {
      this.logger.log('N8N triggered batch weekly adaptations');

      // The actual processing is handled by the scheduled job
      // This endpoint just confirms the trigger was received
      await this.weeklyAdaptationService.runScheduledWeeklyAdaptation();

      return {
        success: true,
        totalUsers: 0, // Would be populated by the actual service
        processedUsers: 0,
        errors: [],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error in batch weekly adaptation trigger:', error);
      return {
        success: false,
        totalUsers: 0,
        processedUsers: 0,
        errors: [error.message || 'Batch adaptation failed'],
        timestamp: new Date(),
      };
    }
  }
}