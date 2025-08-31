import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExerciseLibraryService } from '../exercise-library.service';
import {
  Exercise,
  ExerciseCategory,
  DifficultyLevel,
  MuscleGroup,
  EquipmentType,
} from '../../entities/exercise.entity';
import { CreateExerciseDto, ExerciseFilterDto } from '../../dto/exercise.dto';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ExerciseLibraryService', () => {
  let service: ExerciseLibraryService;
  let repository: jest.Mocked<Repository<Exercise>>;

  const mockExercise: Exercise = {
    id: 'test-id',
    name: 'Push-ups',
    description: 'Classic bodyweight exercise for chest, shoulders, and triceps',
    category: ExerciseCategory.CALISTHENICS,
    difficultyLevel: DifficultyLevel.BEGINNER,
    primaryMuscleGroup: MuscleGroup.CHEST,
    secondaryMuscleGroups: [MuscleGroup.SHOULDERS, MuscleGroup.TRICEPS],
    equipment: [EquipmentType.NONE],
    isBodyweight: true,
    isCompound: true,
    isActive: true,
    isApproved: true,
    usageCount: 0,
    totalRatings: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Exercise;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
        getMany: jest.fn(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        setParameter: jest.fn().mockReturnThis(),
      })),
      count: jest.fn(),
      increment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciseLibraryService,
        {
          provide: getRepositoryToken(Exercise),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ExerciseLibraryService>(ExerciseLibraryService);
    repository = module.get(getRepositoryToken(Exercise));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createExercise', () => {
    const createExerciseDto: CreateExerciseDto = {
      name: 'Push-ups',
      description: 'Classic bodyweight exercise',
      category: ExerciseCategory.CALISTHENICS,
      difficultyLevel: DifficultyLevel.BEGINNER,
      primaryMuscleGroup: MuscleGroup.CHEST,
      isBodyweight: true,
    };

    it('should create a new exercise successfully', async () => {
      repository.findOne.mockResolvedValue(null); // No existing exercise
      repository.create.mockReturnValue(mockExercise);
      repository.save.mockResolvedValue(mockExercise);

      const result = await service.createExercise(createExerciseDto, 'test-user');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: createExerciseDto.name },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(mockExercise);
    });

    it('should throw ConflictException if exercise name already exists', async () => {
      repository.findOne.mockResolvedValue(mockExercise);

      await expect(service.createExercise(createExerciseDto, 'test-user')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid bodyweight equipment combination', async () => {
      const invalidDto = {
        ...createExerciseDto,
        isBodyweight: true,
        equipment: [EquipmentType.DUMBBELLS],
      };

      repository.findOne.mockResolvedValue(null);

      await expect(service.createExercise(invalidDto, 'test-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getExerciseById', () => {
    it('should return exercise when found', async () => {
      repository.findOne.mockResolvedValue(mockExercise);

      const result = await service.getExerciseById('test-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
      expect(result).toEqual(mockExercise);
    });

    it('should throw NotFoundException when exercise not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getExerciseById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getExercises', () => {
    const filterDto: ExerciseFilterDto = {
      category: ExerciseCategory.CALISTHENICS,
      difficultyLevel: DifficultyLevel.BEGINNER,
      limit: 10,
      offset: 0,
    };

    it('should return filtered exercises with pagination', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockExercise], 1]),
      };

      repository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getExercises(filterDto);

      expect(result).toEqual({
        exercises: [mockExercise],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getSuitableExercises', () => {
    const userProfile = {
      experienceLevel: DifficultyLevel.BEGINNER,
      availableEquipment: [EquipmentType.NONE],
      healthConditions: [],
    };

    it('should return exercises suitable for user profile', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExercise]),
      };

      repository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getSuitableExercises(userProfile, 10);

      expect(result).toEqual([mockExercise]);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('difficultyLevel IN'),
        expect.any(Object),
      );
    });
  });

  describe('recordExerciseUsage', () => {
    it('should increment usage count', async () => {
      repository.increment.mockResolvedValue(undefined);

      await service.recordExerciseUsage('test-id');

      expect(repository.increment).toHaveBeenCalledWith({ id: 'test-id' }, 'usageCount', 1);
    });
  });

  describe('rateExercise', () => {
    it('should update exercise rating', async () => {
      const exerciseWithRating = {
        ...mockExercise,
        updateRating: jest.fn(),
        isAvailableForEquipment: jest.fn().mockReturnValue(true),
        isSafeForConditions: jest.fn().mockReturnValue(true),
        isSuitableForLevel: jest.fn().mockReturnValue(true),
        incrementUsage: jest.fn(),
        approve: jest.fn(),
        getEstimatedCaloriesBurn: jest.fn().mockReturnValue(200),
        getRecommendedSets: jest.fn().mockReturnValue(3),
        getRecommendedReps: jest.fn().mockReturnValue({ min: 8, max: 12 }),
      };

      repository.findOne.mockResolvedValue(exerciseWithRating);
      repository.save.mockResolvedValue(exerciseWithRating);

      const result = await service.rateExercise('test-id', 4);

      expect(exerciseWithRating.updateRating).toHaveBeenCalledWith(4);
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(exerciseWithRating);
    });

    it('should throw BadRequestException for invalid rating', async () => {
      await expect(service.rateExercise('test-id', 0)).rejects.toThrow(BadRequestException);

      await expect(service.rateExercise('test-id', 6)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveExercise', () => {
    it('should approve exercise', async () => {
      const exerciseToApprove = {
        ...mockExercise,
        approve: jest.fn(),
        isAvailableForEquipment: jest.fn().mockReturnValue(true),
        isSafeForConditions: jest.fn().mockReturnValue(true),
        isSuitableForLevel: jest.fn().mockReturnValue(true),
        incrementUsage: jest.fn(),
        updateRating: jest.fn(),
        getEstimatedCaloriesBurn: jest.fn().mockReturnValue(200),
        getRecommendedSets: jest.fn().mockReturnValue(3),
        getRecommendedReps: jest.fn().mockReturnValue({ min: 8, max: 12 }),
      };

      repository.findOne.mockResolvedValue(exerciseToApprove);
      repository.save.mockResolvedValue(exerciseToApprove);

      const result = await service.approveExercise('test-id', 'admin-user');

      expect(exerciseToApprove.approve).toHaveBeenCalledWith('admin-user');
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(exerciseToApprove);
    });
  });

  describe('searchExercises', () => {
    it('should search exercises by name and description', async () => {
      repository.find.mockResolvedValue([mockExercise]);

      const result = await service.searchExercises('push', 5);

      expect(repository.find).toHaveBeenCalledWith({
        where: [
          { name: expect.any(Object), isActive: true },
          { description: expect.any(Object), isActive: true },
        ],
        take: 5,
        order: { usageCount: 'DESC' },
      });
      expect(result).toEqual([mockExercise]);
    });
  });

  describe('getPopularExercises', () => {
    it('should return popular exercises ordered by usage and rating', async () => {
      repository.find.mockResolvedValue([mockExercise]);

      const result = await service.getPopularExercises(5);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true, isApproved: true },
        order: { usageCount: 'DESC', averageRating: 'DESC' },
        take: 5,
      });
      expect(result).toEqual([mockExercise]);
    });
  });
});
