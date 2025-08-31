import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

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
import { WeeklyAdaptationService } from './services/weekly-adaptation.service';

// Controllers
import { ExerciseController } from './controllers/exercise.controller';
import { FitnessPlanController } from './controllers/fitness-plan.controller';
import { WeeklyAdaptationController } from './controllers/weekly-adaptation.controller';

// Import related modules
import { UsersModule } from '../users/users.module';
import { AIRoutingModule } from '../ai-routing/ai-routing.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercise,
      FitnessPlan,
      FitnessPlanWeek,
      FitnessPlanWorkout,
      FitnessPlanExercise,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    UsersModule,
    AIRoutingModule,
    LogsModule,
  ],
  providers: [
    ExerciseLibraryService,
    FitnessPlanService,
    FitnessPlanGeneratorService,
    SafetyValidationService,
    WeeklyAdaptationService,
  ],
  controllers: [
    ExerciseController, 
    FitnessPlanController,
    WeeklyAdaptationController,
  ],
  exports: [
    ExerciseLibraryService,
    FitnessPlanService,
    FitnessPlanGeneratorService,
    SafetyValidationService,
    WeeklyAdaptationService,
  ],
})
export class FitnessPlanningModule {}
