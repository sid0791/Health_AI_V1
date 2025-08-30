import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UsdaFoodDataService } from './usda/usda-food-data.service';

@ApiTags('external-apis')
@Controller('external-apis')
export class ExternalApiController {
  constructor(private readonly usdaFoodDataService: UsdaFoodDataService) {}

  @Get('usda/foods/search')
  @ApiOperation({ summary: 'Search USDA food database' })
  @ApiQuery({ name: 'query', description: 'Search query', example: 'apple' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Page size (max 200)', example: 50 })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  async searchFoods(@Query('query') query: string, @Query('pageSize') pageSize?: number) {
    return this.usdaFoodDataService.searchFoods({
      query,
      pageSize: pageSize || 50,
    });
  }

  @Get('usda/foods/:fdcId')
  @ApiOperation({ summary: 'Get detailed food information by FDC ID' })
  @ApiParam({ name: 'fdcId', description: 'USDA FDC ID', example: '167512' })
  @ApiResponse({ status: 200, description: 'Food details returned successfully' })
  async getFoodDetails(@Param('fdcId') fdcId: string) {
    return this.usdaFoodDataService.getFoodDetails(parseInt(fdcId, 10));
  }

  @Get('usda/health-check')
  @ApiOperation({ summary: 'Check USDA API health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async healthCheck() {
    const isHealthy = await this.usdaFoodDataService.healthCheck();
    return {
      service: 'USDA FoodData Central',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}
