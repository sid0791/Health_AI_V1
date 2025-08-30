import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ExerciseCategory,
  DifficultyLevel,
  MuscleGroup,
  EquipmentType,
} from '../entities/exercise.entity';

export class CreateExerciseDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsEnum(ExerciseCategory)
  category: ExerciseCategory;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsEnum(MuscleGroup)
  primaryMuscleGroup: MuscleGroup;

  @IsOptional()
  @IsArray()
  @IsEnum(MuscleGroup, { each: true })
  secondaryMuscleGroups?: MuscleGroup[];

  @IsOptional()
  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  equipment?: EquipmentType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditionsToAvoid?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injuryWarnings?: string[];

  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formCues?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  demoGifUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  defaultSets?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  defaultRepsMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  defaultRepsMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(7200)
  defaultDurationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  defaultRestSeconds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  progressionExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regressionExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  substituteExercises?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  caloriesPerMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(20)
  metValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workoutTypes?: string[];

  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @IsOptional()
  @IsBoolean()
  isUnilateral?: boolean;

  @IsOptional()
  @IsBoolean()
  isBodyweight?: boolean;

  @IsOptional()
  @IsBoolean()
  isCardio?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsEnum(MuscleGroup)
  primaryMuscleGroup?: MuscleGroup;

  @IsOptional()
  @IsArray()
  @IsEnum(MuscleGroup, { each: true })
  secondaryMuscleGroups?: MuscleGroup[];

  @IsOptional()
  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  equipment?: EquipmentType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditionsToAvoid?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injuryWarnings?: string[];

  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  formCues?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  demoGifUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  defaultSets?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  defaultRepsMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  defaultRepsMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(7200)
  defaultDurationSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  defaultRestSeconds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  progressionExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regressionExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternativeExercises?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  substituteExercises?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  caloriesPerMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(20)
  metValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workoutTypes?: string[];

  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @IsOptional()
  @IsBoolean()
  isUnilateral?: boolean;

  @IsOptional()
  @IsBoolean()
  isBodyweight?: boolean;

  @IsOptional()
  @IsBoolean()
  isCardio?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExerciseFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsEnum(MuscleGroup)
  primaryMuscleGroup?: MuscleGroup;

  @IsOptional()
  @IsArray()
  @IsEnum(EquipmentType, { each: true })
  equipment?: EquipmentType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableEquipment?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @IsOptional()
  @IsBoolean()
  isCompound?: boolean;

  @IsOptional()
  @IsBoolean()
  isBodyweight?: boolean;

  @IsOptional()
  @IsBoolean()
  isCardio?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class ExerciseResponseDto {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  category: ExerciseCategory;
  difficultyLevel: DifficultyLevel;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment?: EquipmentType[];
  contraindications?: string[];
  healthConditionsToAvoid?: string[];
  injuryWarnings?: string[];
  safetyNotes?: string;
  formCues?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  demoGifUrl?: string;
  defaultSets?: number;
  defaultRepsMin?: number;
  defaultRepsMax?: number;
  defaultDurationSeconds?: number;
  defaultRestSeconds?: number;
  progressionExercises?: string[];
  regressionExercises?: string[];
  alternativeExercises?: string[];
  substituteExercises?: string[];
  caloriesPerMinute?: number;
  metValue?: number;
  tags?: string[];
  workoutTypes?: string[];
  isCompound: boolean;
  isUnilateral: boolean;
  isBodyweight: boolean;
  isCardio: boolean;
  isActive: boolean;
  isApproved: boolean;
  usageCount: number;
  averageRating?: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ExerciseStatsDto {
  totalExercises: number;
  byCategory: Record<ExerciseCategory, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byMuscleGroup: Record<MuscleGroup, number>;
  approved: number;
  active: number;
  mostUsed: ExerciseResponseDto[];
  highestRated: ExerciseResponseDto[];
}
