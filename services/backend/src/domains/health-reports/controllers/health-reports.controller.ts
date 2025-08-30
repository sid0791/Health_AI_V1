import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthReportsService } from '../services/health-reports.service';

@ApiTags('health-reports')
@Controller('health-reports')
export class HealthReportsController {
  constructor(private readonly healthReportsService: HealthReportsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get health reports for a user' })
  @ApiResponse({ status: 200, description: 'Health reports retrieved successfully' })
  async findByUserId(@Param('userId') userId: string) {
    return this.healthReportsService.findByUserId(userId);
  }
}
