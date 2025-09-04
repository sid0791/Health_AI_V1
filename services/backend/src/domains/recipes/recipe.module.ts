import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipeStep } from './entities/recipe-step.entity';
import { RecipeNutrition } from './entities/recipe-nutrition.entity';
import { RecipeService } from './services/recipe.service';
import { PersonalizationRulesService } from './services/personalization-rules.service';
import { ContentModerationService } from './services/content-moderation.service';
import { RecipeNutritionService } from './services/recipe-nutrition.service';
import { RecipeSeedingService } from './services/recipe-seeding.service';
import { RecipeController } from './controllers/recipe.controller';
import { RecipeRepository } from './repositories/recipe.repository';
import { NutritionModule } from '../nutrition/nutrition.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep, RecipeNutrition]),
    NutritionModule,
  ],
  providers: [
    RecipeService,
    PersonalizationRulesService,
    ContentModerationService,
    RecipeNutritionService,
    RecipeSeedingService,
    RecipeRepository,
  ],
  controllers: [RecipeController],
  exports: [
    RecipeService,
    PersonalizationRulesService,
    ContentModerationService,
    RecipeNutritionService,
    RecipeSeedingService,
    RecipeRepository,
    // Export TypeORM repositories for use in other modules
    TypeOrmModule,
  ],
})
export class RecipeModule {}
