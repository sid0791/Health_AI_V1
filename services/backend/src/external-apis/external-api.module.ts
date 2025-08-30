import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsdaFoodDataService } from './usda/usda-food-data.service';
import { ExternalApiController } from './external-api.controller';

@Module({
  imports: [HttpModule],
  controllers: [ExternalApiController],
  providers: [UsdaFoodDataService],
  exports: [UsdaFoodDataService],
})
export class ExternalApiModule {}
