import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Exercise } from './entities/exercise.entity';
import { FitnessPlan } from './entities/fitness-plan.entity';
import { FitnessPlanWeek } from './entities/fitness-plan-week.entity';
import { FitnessPlanWorkout } from './entities/fitness-plan-workout.entity';
import { FitnessPlanExercise } from './entities/fitness-plan-exercise.entity';

// Services
import { ExerciseLibraryService } from './services/exercise-library.service';
import { FitnessPlanService } from './services/fitness-plan.service';
import { FitnessPlanGeneratorService } from './services/fitness-plan-generator.service';
import { SafetyValidationService } from './services/safety-validation.service';

// Controllers
import { ExerciseController } from './controllers/exercise.controller';
import { FitnessPlanController } from './controllers/fitness-plan.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercise,
      FitnessPlan,
      FitnessPlanWeek,
      FitnessPlanWorkout,
      FitnessPlanExercise,
    ]),
  ],
  providers: [
    ExerciseLibraryService,
    FitnessPlanService,
    FitnessPlanGeneratorService,
    SafetyValidationService,
  ],
  controllers: [ExerciseController, FitnessPlanController],
  exports: [
    ExerciseLibraryService,
    FitnessPlanService,
    FitnessPlanGeneratorService,
    SafetyValidationService,
  ],
})
export class FitnessPlanningModule {}
