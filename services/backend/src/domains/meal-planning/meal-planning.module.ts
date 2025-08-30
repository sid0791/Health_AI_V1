import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealPlan } from './entities/meal-plan.entity';
import { MealPlanEntry } from './entities/meal-plan-entry.entity';
import { MealPlanController } from './controllers/meal-plan.controller';
import { MealPlanEntryController } from './controllers/meal-plan-entry.controller';
import { MealPlanService } from './services/meal-plan.service';
import { MealPlanEntryService } from './services/meal-plan-entry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealPlan, MealPlanEntry]),
  ],
  controllers: [MealPlanController, MealPlanEntryController],
  providers: [MealPlanService, MealPlanEntryService],
  exports: [MealPlanService, MealPlanEntryService],
})
export class MealPlanningModule {}