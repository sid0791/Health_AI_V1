import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { MealPlan } from './entities/meal-plan.entity';
import { MealPlanEntry } from './entities/meal-plan-entry.entity';
import { MealPlanController } from './controllers/meal-plan.controller';
import { MealPlanEntryController } from './controllers/meal-plan-entry.controller';
import { AIMealPlanningController } from './controllers/ai-meal-planning.controller';
import { MealPlanService } from './services/meal-plan.service';
import { MealPlanEntryService } from './services/meal-plan-entry.service';
import { AIMealGenerationService } from './services/ai-meal-generation.service';

// Import related modules
import { AIRoutingModule } from '../ai-routing/ai-routing.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecipeModule } from '../recipes/recipe.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealPlan, MealPlanEntry]),
    CacheModule.register({
      ttl: 3600, // 1 hour cache for AI results
      max: 100, // Maximum number of cached items
    }),
    AIRoutingModule,
    NutritionModule,
    RecipeModule,
    UsersModule,
  ],
  controllers: [MealPlanController, MealPlanEntryController, AIMealPlanningController],
  providers: [MealPlanService, MealPlanEntryService, AIMealGenerationService],
  exports: [MealPlanService, MealPlanEntryService, AIMealGenerationService],
})
export class MealPlanningModule {}
