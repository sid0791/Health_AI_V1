import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, ILike, In } from 'typeorm';
import { Exercise, ExerciseCategory, DifficultyLevel, MuscleGroup, EquipmentType } from '../entities/exercise.entity';
import { 
  CreateExerciseDto, 
  UpdateExerciseDto, 
  ExerciseFilterDto,
  ExerciseResponseDto,
  ExerciseStatsDto 
} from '../dto/exercise.dto';

@Injectable()
export class ExerciseLibraryService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
  ) {}

  /**
   * Create a new exercise in the library
   */
  async createExercise(createExerciseDto: CreateExerciseDto, createdBy?: string): Promise<Exercise> {
    // Check if exercise with same name already exists
    const existingExercise = await this.exerciseRepository.findOne({
      where: { name: createExerciseDto.name }
    });

    if (existingExercise) {
      throw new ConflictException(`Exercise with name '${createExerciseDto.name}' already exists`);
    }

    // Validate equipment consistency
    if (createExerciseDto.isBodyweight && createExerciseDto.equipment?.length) {
      const hasNonBodyweightEquipment = createExerciseDto.equipment.some(
        eq => eq !== EquipmentType.NONE && eq !== EquipmentType.BODYWEIGHT
      );
      if (hasNonBodyweightEquipment) {
        throw new BadRequestException('Bodyweight exercises should not require additional equipment');
      }
    }

    // Set defaults
    const exercise = this.exerciseRepository.create({
      ...createExerciseDto,
      createdBy: createdBy || 'system',
      isActive: createExerciseDto.isActive ?? true,
      isApproved: false, // New exercises need approval
      usageCount: 0,
      totalRatings: 0,
    });

    return await this.exerciseRepository.save(exercise);
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id }
    });

    if (!exercise) {
      throw new NotFoundException(`Exercise with ID '${id}' not found`);
    }

    return exercise;
  }

  /**
   * Update an existing exercise
   */
  async updateExercise(id: string, updateExerciseDto: UpdateExerciseDto): Promise<Exercise> {
    const exercise = await this.getExerciseById(id);

    // Check for name conflicts if name is being updated
    if (updateExerciseDto.name && updateExerciseDto.name !== exercise.name) {
      const existingExercise = await this.exerciseRepository.findOne({
        where: { name: updateExerciseDto.name }
      });
      if (existingExercise) {
        throw new ConflictException(`Exercise with name '${updateExerciseDto.name}' already exists`);
      }
    }

    // Validate equipment consistency if being updated
    if (updateExerciseDto.isBodyweight !== undefined || updateExerciseDto.equipment !== undefined) {
      const isBodyweight = updateExerciseDto.isBodyweight ?? exercise.isBodyweight;
      const equipment = updateExerciseDto.equipment ?? exercise.equipment;
      
      if (isBodyweight && equipment?.length) {
        const hasNonBodyweightEquipment = equipment.some(
          eq => eq !== EquipmentType.NONE && eq !== EquipmentType.BODYWEIGHT
        );
        if (hasNonBodyweightEquipment) {
          throw new BadRequestException('Bodyweight exercises should not require additional equipment');
        }
      }
    }

    Object.assign(exercise, updateExerciseDto);
    return await this.exerciseRepository.save(exercise);
  }

  /**
   * Delete an exercise (soft delete by marking as inactive)
   */
  async deleteExercise(id: string): Promise<void> {
    const exercise = await this.getExerciseById(id);
    exercise.isActive = false;
    await this.exerciseRepository.save(exercise);
  }

  /**
   * Get exercises with filtering, sorting, and pagination
   */
  async getExercises(filterDto: ExerciseFilterDto): Promise<{
    exercises: Exercise[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      search,
      category,
      difficultyLevel,
      primaryMuscleGroup,
      equipment,
      availableEquipment,
      healthConditions,
      isCompound,
      isBodyweight,
      isCardio,
      isActive = true,
      isApproved,
      tags,
      limit = 20,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc'
    } = filterDto;

    const queryBuilder = this.exerciseRepository.createQueryBuilder('exercise');

    // Apply filters
    queryBuilder.where('exercise.isActive = :isActive', { isActive });

    if (isApproved !== undefined) {
      queryBuilder.andWhere('exercise.isApproved = :isApproved', { isApproved });
    }

    if (search) {
      queryBuilder.andWhere(
        '(exercise.name ILIKE :search OR exercise.description ILIKE :search OR exercise.tags @> ARRAY[:search])',
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('exercise.category = :category', { category });
    }

    if (difficultyLevel) {
      queryBuilder.andWhere('exercise.difficultyLevel = :difficultyLevel', { difficultyLevel });
    }

    if (primaryMuscleGroup) {
      queryBuilder.andWhere('exercise.primaryMuscleGroup = :primaryMuscleGroup', { primaryMuscleGroup });
    }

    if (isCompound !== undefined) {
      queryBuilder.andWhere('exercise.isCompound = :isCompound', { isCompound });
    }

    if (isBodyweight !== undefined) {
      queryBuilder.andWhere('exercise.isBodyweight = :isBodyweight', { isBodyweight });
    }

    if (isCardio !== undefined) {
      queryBuilder.andWhere('exercise.isCardio = :isCardio', { isCardio });
    }

    if (equipment && equipment.length > 0) {
      queryBuilder.andWhere('exercise.equipment && :equipment', { equipment });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('exercise.tags && :tags', { tags });
    }

    // Filter by available equipment (exercises that can be done with user's equipment)
    if (availableEquipment && availableEquipment.length > 0) {
      queryBuilder.andWhere(
        '(exercise.equipment IS NULL OR exercise.equipment = \'{}\' OR exercise.equipment <@ :availableEquipment)',
        { availableEquipment }
      );
    }

    // Filter out exercises that are contraindicated for user's health conditions
    if (healthConditions && healthConditions.length > 0) {
      queryBuilder.andWhere(
        '(exercise.healthConditionsToAvoid IS NULL OR NOT (exercise.healthConditionsToAvoid && :healthConditions))',
        { healthConditions }
      );
    }

    // Apply sorting
    const allowedSortFields = [
      'name', 'category', 'difficultyLevel', 'primaryMuscleGroup', 
      'usageCount', 'averageRating', 'createdAt', 'updatedAt'
    ];
    
    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`exercise.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('exercise.name', 'ASC');
    }

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const [exercises, total] = await queryBuilder.getManyAndCount();

    return {
      exercises,
      total,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Search exercises by name or description
   */
  async searchExercises(query: string, limit = 10): Promise<Exercise[]> {
    return await this.exerciseRepository.find({
      where: [
        { name: ILike(`%${query}%`), isActive: true },
        { description: ILike(`%${query}%`), isActive: true },
      ],
      take: limit,
      order: { usageCount: 'DESC' }
    });
  }

  /**
   * Get exercises by muscle group
   */
  async getExercisesByMuscleGroup(
    muscleGroup: MuscleGroup, 
    availableEquipment?: EquipmentType[],
    difficultyLevel?: DifficultyLevel
  ): Promise<Exercise[]> {
    const queryBuilder = this.exerciseRepository.createQueryBuilder('exercise');
    
    queryBuilder.where(
      '(exercise.primaryMuscleGroup = :muscleGroup OR :muscleGroup = ANY(exercise.secondaryMuscleGroups))',
      { muscleGroup }
    );
    
    queryBuilder.andWhere('exercise.isActive = true');
    queryBuilder.andWhere('exercise.isApproved = true');

    if (availableEquipment && availableEquipment.length > 0) {
      queryBuilder.andWhere(
        '(exercise.equipment IS NULL OR exercise.equipment = \'{}\' OR exercise.equipment <@ :availableEquipment)',
        { availableEquipment }
      );
    }

    if (difficultyLevel) {
      queryBuilder.andWhere('exercise.difficultyLevel = :difficultyLevel', { difficultyLevel });
    }

    queryBuilder.orderBy('exercise.usageCount', 'DESC');
    
    return await queryBuilder.getMany();
  }

  /**
   * Get exercises by category
   */
  async getExercisesByCategory(
    category: ExerciseCategory,
    availableEquipment?: EquipmentType[],
    limit = 20
  ): Promise<Exercise[]> {
    const queryBuilder = this.exerciseRepository.createQueryBuilder('exercise');
    
    queryBuilder.where('exercise.category = :category', { category });
    queryBuilder.andWhere('exercise.isActive = true');
    queryBuilder.andWhere('exercise.isApproved = true');

    if (availableEquipment && availableEquipment.length > 0) {
      queryBuilder.andWhere(
        '(exercise.equipment IS NULL OR exercise.equipment = \'{}\' OR exercise.equipment <@ :availableEquipment)',
        { availableEquipment }
      );
    }

    queryBuilder.orderBy('exercise.averageRating', 'DESC');
    queryBuilder.addOrderBy('exercise.usageCount', 'DESC');
    queryBuilder.take(limit);
    
    return await queryBuilder.getMany();
  }

  /**
   * Get suitable exercises for user's profile
   */
  async getSuitableExercises(
    userProfile: {
      experienceLevel: DifficultyLevel;
      availableEquipment: EquipmentType[];
      healthConditions?: string[];
      physicalLimitations?: string[];
      preferredMuscleGroups?: MuscleGroup[];
      dislikedExercises?: string[];
    },
    limit = 50
  ): Promise<Exercise[]> {
    const queryBuilder = this.exerciseRepository.createQueryBuilder('exercise');
    
    queryBuilder.where('exercise.isActive = true');
    queryBuilder.andWhere('exercise.isApproved = true');

    // Filter by experience level (include current and lower levels)
    const levelOrder = {
      [DifficultyLevel.BEGINNER]: 1,
      [DifficultyLevel.INTERMEDIATE]: 2,
      [DifficultyLevel.ADVANCED]: 3,
      [DifficultyLevel.EXPERT]: 4,
    };
    
    const maxLevel = levelOrder[userProfile.experienceLevel];
    const allowedLevels = Object.entries(levelOrder)
      .filter(([_, value]) => value <= maxLevel)
      .map(([key, _]) => key);
    
    queryBuilder.andWhere('exercise.difficultyLevel IN (:...allowedLevels)', { allowedLevels });

    // Filter by available equipment
    if (userProfile.availableEquipment.length > 0) {
      queryBuilder.andWhere(
        '(exercise.equipment IS NULL OR exercise.equipment = \'{}\' OR exercise.equipment <@ :availableEquipment)',
        { availableEquipment: userProfile.availableEquipment }
      );
    }

    // Filter out exercises contraindicated for health conditions
    if (userProfile.healthConditions && userProfile.healthConditions.length > 0) {
      queryBuilder.andWhere(
        '(exercise.healthConditionsToAvoid IS NULL OR NOT (exercise.healthConditionsToAvoid && :healthConditions))',
        { healthConditions: userProfile.healthConditions }
      );
    }

    // Filter out disliked exercises
    if (userProfile.dislikedExercises && userProfile.dislikedExercises.length > 0) {
      queryBuilder.andWhere('exercise.name NOT IN (:...dislikedExercises)', { 
        dislikedExercises: userProfile.dislikedExercises 
      });
    }

    // Prefer exercises for preferred muscle groups
    if (userProfile.preferredMuscleGroups && userProfile.preferredMuscleGroups.length > 0) {
      queryBuilder.addSelect(
        `CASE WHEN exercise.primaryMuscleGroup IN (:...preferredMuscleGroups) THEN 1 ELSE 0 END`,
        'preference_score'
      );
      queryBuilder.setParameter('preferredMuscleGroups', userProfile.preferredMuscleGroups);
      queryBuilder.orderBy('preference_score', 'DESC');
    }

    queryBuilder.addOrderBy('exercise.averageRating', 'DESC');
    queryBuilder.addOrderBy('exercise.usageCount', 'DESC');
    queryBuilder.take(limit);
    
    return await queryBuilder.getMany();
  }

  /**
   * Get exercise alternatives and progressions
   */
  async getExerciseAlternatives(exerciseId: string): Promise<{
    progressions: Exercise[];
    regressions: Exercise[];
    alternatives: Exercise[];
    substitutes: Exercise[];
  }> {
    const exercise = await this.getExerciseById(exerciseId);

    const [progressions, regressions, alternatives, substitutes] = await Promise.all([
      this.getExercisesByIds(exercise.progressionExercises || []),
      this.getExercisesByIds(exercise.regressionExercises || []),
      this.getExercisesByIds(exercise.alternativeExercises || []),
      this.getExercisesByIds(exercise.substituteExercises || []),
    ]);

    return {
      progressions,
      regressions,
      alternatives,
      substitutes,
    };
  }

  /**
   * Record exercise usage for analytics
   */
  async recordExerciseUsage(exerciseId: string): Promise<void> {
    await this.exerciseRepository.increment({ id: exerciseId }, 'usageCount', 1);
  }

  /**
   * Rate an exercise
   */
  async rateExercise(exerciseId: string, rating: number): Promise<Exercise> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const exercise = await this.getExerciseById(exerciseId);
    exercise.updateRating(rating);
    
    return await this.exerciseRepository.save(exercise);
  }

  /**
   * Approve an exercise
   */
  async approveExercise(exerciseId: string, approvedBy: string): Promise<Exercise> {
    const exercise = await this.getExerciseById(exerciseId);
    exercise.approve(approvedBy);
    
    return await this.exerciseRepository.save(exercise);
  }

  /**
   * Get exercise library statistics
   */
  async getExerciseStats(): Promise<ExerciseStatsDto> {
    const [
      totalExercises,
      byCategory,
      byDifficulty,
      byMuscleGroup,
      approved,
      active,
      mostUsed,
      highestRated
    ] = await Promise.all([
      this.exerciseRepository.count({ where: { isActive: true } }),
      this.getCountByCategory(),
      this.getCountByDifficulty(),
      this.getCountByMuscleGroup(),
      this.exerciseRepository.count({ where: { isActive: true, isApproved: true } }),
      this.exerciseRepository.count({ where: { isActive: true } }),
      this.getMostUsedExercises(5),
      this.getHighestRatedExercises(5),
    ]);

    return {
      totalExercises,
      byCategory,
      byDifficulty,
      byMuscleGroup,
      approved,
      active,
      mostUsed,
      highestRated,
    };
  }

  /**
   * Get popular exercises
   */
  async getPopularExercises(limit = 10): Promise<Exercise[]> {
    return await this.exerciseRepository.find({
      where: { isActive: true, isApproved: true },
      order: { usageCount: 'DESC', averageRating: 'DESC' },
      take: limit,
    });
  }

  // Private helper methods

  private async getExercisesByIds(ids: string[]): Promise<Exercise[]> {
    if (ids.length === 0) return [];
    
    return await this.exerciseRepository.find({
      where: { id: In(ids), isActive: true }
    });
  }

  private async getMostUsedExercises(limit: number): Promise<Exercise[]> {
    return await this.exerciseRepository.find({
      where: { isActive: true, isApproved: true },
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  private async getHighestRatedExercises(limit: number): Promise<Exercise[]> {
    return await this.exerciseRepository.find({
      where: { 
        isActive: true, 
        isApproved: true,
        totalRatings: { $gte: 5 } as any // Minimum ratings for credibility
      },
      order: { averageRating: 'DESC', totalRatings: 'DESC' },
      take: limit,
    });
  }

  private async getCountByCategory(): Promise<Record<ExerciseCategory, number>> {
    const results = await this.exerciseRepository
      .createQueryBuilder('exercise')
      .select('exercise.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('exercise.isActive = true')
      .groupBy('exercise.category')
      .getRawMany();

    const counts = {} as Record<ExerciseCategory, number>;
    Object.values(ExerciseCategory).forEach(category => {
      counts[category] = 0;
    });

    results.forEach(result => {
      counts[result.category as ExerciseCategory] = parseInt(result.count);
    });

    return counts;
  }

  private async getCountByDifficulty(): Promise<Record<DifficultyLevel, number>> {
    const results = await this.exerciseRepository
      .createQueryBuilder('exercise')
      .select('exercise.difficultyLevel', 'difficultyLevel')
      .addSelect('COUNT(*)', 'count')
      .where('exercise.isActive = true')
      .groupBy('exercise.difficultyLevel')
      .getRawMany();

    const counts = {} as Record<DifficultyLevel, number>;
    Object.values(DifficultyLevel).forEach(level => {
      counts[level] = 0;
    });

    results.forEach(result => {
      counts[result.difficultyLevel as DifficultyLevel] = parseInt(result.count);
    });

    return counts;
  }

  private async getCountByMuscleGroup(): Promise<Record<MuscleGroup, number>> {
    const results = await this.exerciseRepository
      .createQueryBuilder('exercise')
      .select('exercise.primaryMuscleGroup', 'primaryMuscleGroup')
      .addSelect('COUNT(*)', 'count')
      .where('exercise.isActive = true')
      .groupBy('exercise.primaryMuscleGroup')
      .getRawMany();

    const counts = {} as Record<MuscleGroup, number>;
    Object.values(MuscleGroup).forEach(group => {
      counts[group] = 0;
    });

    results.forEach(result => {
      counts[result.primaryMuscleGroup as MuscleGroup] = parseInt(result.count);
    });

    return counts;
  }
}