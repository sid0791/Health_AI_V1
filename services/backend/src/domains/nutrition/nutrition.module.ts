import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Services
import { NutritionCalculationService } from './services/nutrition-calculation.service';
import { CookingTransformationService } from './services/cooking-transformation.service';
import { GlycemicIndexService } from './services/glycemic-index.service';
import { EnhancedNutritionService } from './services/enhanced-nutrition.service';

// Controllers
import { NutritionController } from './controllers/nutrition.controller';

// External APIs
import { UsdaFoodDataService } from '../../external-apis/usda/usda-food-data.service';
import { IFCTDataService } from '../../external-apis/ifct/ifct-data.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [
    // Core nutrition services
    NutritionCalculationService,
    CookingTransformationService,
    GlycemicIndexService,
    EnhancedNutritionService,
    
    // External data services
    UsdaFoodDataService,
    IFCTDataService,
  ],
  controllers: [
    NutritionController,
  ],
  exports: [
    NutritionCalculationService,
    CookingTransformationService,
    GlycemicIndexService,
    EnhancedNutritionService,
    UsdaFoodDataService,
    IFCTDataService,
  ],
})
export class NutritionModule {}