import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { User as CurrentUser } from '../../../auth/decorators/user.decorator';
import { User } from '../../../users/entities/user.entity';
import { HealthDataService } from '../services/health-data.service';
import {
  ConnectHealthProviderDto,
  SyncHealthDataDto,
  HealthDataQueryDto,
} from '../dto/health-data.dto';
import { HealthDataEntry, HealthDataProvider } from '../entities/health-data-entry.entity';
import { HealthDataConnection } from '../entities/health-data-connection.entity';

@Controller('integrations/health-data')
@UseGuards(JwtAuthGuard)
export class HealthDataController {
  constructor(private readonly healthDataService: HealthDataService) {}

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connectProvider(
    @CurrentUser() user: User,
    @Body() connectDto: ConnectHealthProviderDto,
  ): Promise<HealthDataConnection> {
    return await this.healthDataService.connectProvider(user.id, connectDto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncHealthData(
    @CurrentUser() user: User,
    @Body() syncDto: SyncHealthDataDto,
  ): Promise<any> {
    const results = await this.healthDataService.syncHealthData(user.id, syncDto);
    return {
      success: true,
      message: 'Health data sync completed',
      results,
    };
  }

  @Get('data')
  async getHealthData(
    @CurrentUser() user: User,
    @Query() queryDto: HealthDataQueryDto,
  ): Promise<HealthDataEntry[]> {
    return await this.healthDataService.getHealthData(user.id, queryDto);
  }

  @Get('connections')
  async getConnections(@CurrentUser() user: User): Promise<HealthDataConnection[]> {
    return await this.healthDataService.getConnections(user.id);
  }

  @Delete('connections/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnectProvider(
    @CurrentUser() user: User,
    @Param('provider') provider: HealthDataProvider,
  ): Promise<void> {
    await this.healthDataService.disconnectProvider(user.id, provider);
  }

  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: HealthDataProvider,
    @Body() payload: any,
  ): Promise<{ success: boolean }> {
    await this.healthDataService.processWebhookData(provider, payload);
    return { success: true };
  }

  @Get('data/summary')
  async getHealthDataSummary(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ): Promise<any> {
    const daysNum = days ? parseInt(days, 10) : 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const healthData = await this.healthDataService.getHealthData(user.id, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Group data by type and calculate summaries
    const summary = this.calculateHealthDataSummary(healthData, daysNum);
    
    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: daysNum,
      },
      summary,
    };
  }

  private calculateHealthDataSummary(data: HealthDataEntry[], days: number): any {
    const grouped = data.reduce((acc, entry) => {
      const key = entry.dataType;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {} as Record<string, HealthDataEntry[]>);

    const summary: any = {};

    for (const [dataType, entries] of Object.entries(grouped)) {
      const values = entries.map(e => e.value);
      const total = values.reduce((sum, val) => sum + val, 0);
      const average = total / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      summary[dataType] = {
        total: Math.round(total),
        average: Math.round(average * 100) / 100,
        max: Math.round(max),
        min: Math.round(min),
        entries: entries.length,
        unit: entries[0]?.unit || '',
        dailyAverage: Math.round((total / days) * 100) / 100,
      };
    }

    return summary;
  }
}