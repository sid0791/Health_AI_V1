import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../auth/guards/optional-auth.guard';
import '../../../types/express'; // Import type declarations
import { ExerciseLibraryService } from '../services/exercise-library.service';
import { 
  CreateExerciseDto, 
  UpdateExerciseDto, 
  ExerciseFilterDto,
  ExerciseResponseDto,
  ExerciseStatsDto 
} from '../dto/exercise.dto';
import { Exercise } from '../entities/exercise.entity';

@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseLibraryService: ExerciseLibraryService) {}

  /**
   * Create a new exercise (admin/trainer only)
   * POST /exercises
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExercise(
    @Body(ValidationPipe) createExerciseDto: CreateExerciseDto,
    @Req() req: AuthenticatedRequest
  ): Promise<Exercise> {
    // In a real app, you'd extract user ID from JWT token
    const createdBy = req.user?.userId || 'system';
    return await this.exerciseLibraryService.createExercise(createExerciseDto, createdBy);
  }

  /**
   * Get all exercises with filtering
   * GET /exercises
   */
  @Get()
  async getExercises(
    @Query(ValidationPipe) filterDto: ExerciseFilterDto
  ): Promise<{
    exercises: Exercise[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.exerciseLibraryService.getExercises(filterDto);
  }

  /**
   * Get exercise by ID
   * GET /exercises/:id
   */
  @Get(':id')
  async getExerciseById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Exercise> {
    return await this.exerciseLibraryService.getExerciseById(id);
  }

  /**
   * Update an exercise
   * PUT /exercises/:id
   */
  @Put(':id')
  async updateExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateExerciseDto: UpdateExerciseDto
  ): Promise<Exercise> {
    return await this.exerciseLibraryService.updateExercise(id, updateExerciseDto);
  }

  /**
   * Delete an exercise (soft delete)
   * DELETE /exercises/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExercise(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.exerciseLibraryService.deleteExercise(id);
  }

  /**
   * Search exercises by name or description
   * GET /exercises/search
   */
  @Get('search/:query')
  async searchExercises(
    @Param('query') query: string,
    @Query('limit') limit?: number
  ): Promise<Exercise[]> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }
    return await this.exerciseLibraryService.searchExercises(query, limit);
  }

  /**
   * Get exercises by muscle group
   * GET /exercises/muscle-group/:muscleGroup
   */
  @Get('muscle-group/:muscleGroup')
  async getExercisesByMuscleGroup(
    @Param('muscleGroup') muscleGroup: string,
    @Query('equipment') equipment?: string[],
    @Query('difficultyLevel') difficultyLevel?: string
  ): Promise<Exercise[]> {
    return await this.exerciseLibraryService.getExercisesByMuscleGroup(
      muscleGroup as any,
      equipment as any,
      difficultyLevel as any
    );
  }

  /**
   * Get exercises by category
   * GET /exercises/category/:category
   */
  @Get('category/:category')
  async getExercisesByCategory(
    @Param('category') category: string,
    @Query('equipment') equipment?: string[],
    @Query('limit') limit?: number
  ): Promise<Exercise[]> {
    return await this.exerciseLibraryService.getExercisesByCategory(
      category as any,
      equipment as any,
      limit
    );
  }

  /**
   * Get suitable exercises for user profile
   * POST /exercises/suitable
   */
  @Post('suitable')
  async getSuitableExercises(
    @Body() userProfile: {
      experienceLevel: string;
      availableEquipment: string[];
      healthConditions?: string[];
      physicalLimitations?: string[];
      preferredMuscleGroups?: string[];
      dislikedExercises?: string[];
    },
    @Query('limit') limit?: number
  ): Promise<Exercise[]> {
    return await this.exerciseLibraryService.getSuitableExercises(
      userProfile as any,
      limit
    );
  }

  /**
   * Get exercise alternatives and progressions
   * GET /exercises/:id/alternatives
   */
  @Get(':id/alternatives')
  async getExerciseAlternatives(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{
    progressions: Exercise[];
    regressions: Exercise[];
    alternatives: Exercise[];
    substitutes: Exercise[];
  }> {
    return await this.exerciseLibraryService.getExerciseAlternatives(id);
  }

  /**
   * Rate an exercise
   * POST /exercises/:id/rate
   */
  @Post(':id/rate')
  async rateExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() ratingDto: { rating: number }
  ): Promise<Exercise> {
    if (!ratingDto.rating || ratingDto.rating < 1 || ratingDto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    return await this.exerciseLibraryService.rateExercise(id, ratingDto.rating);
  }

  /**
   * Approve an exercise (admin/trainer only)
   * POST /exercises/:id/approve
   */
  @Post(':id/approve')
  async approveExercise(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<Exercise> {
    const approvedBy = req.user?.userId || 'admin';
    return await this.exerciseLibraryService.approveExercise(id, approvedBy);
  }

  /**
   * Get exercise library statistics
   * GET /exercises/stats
   */
  @Get('stats/overview')
  async getExerciseStats(): Promise<ExerciseStatsDto> {
    return await this.exerciseLibraryService.getExerciseStats();
  }

  /**
   * Get popular exercises
   * GET /exercises/popular
   */
  @Get('popular/list')
  async getPopularExercises(
    @Query('limit') limit?: number
  ): Promise<Exercise[]> {
    return await this.exerciseLibraryService.getPopularExercises(limit);
  }

  /**
   * Record exercise usage (for analytics)
   * POST /exercises/:id/use
   */
  @Post(':id/use')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordExerciseUsage(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.exerciseLibraryService.recordExerciseUsage(id);
  }
}