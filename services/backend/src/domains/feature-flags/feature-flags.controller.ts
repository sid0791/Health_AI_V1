import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import {
  FeatureFlag,
  UserContext,
  FeatureFlagEvaluation,
} from './types';

@ApiTags('feature-flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags retrieved successfully' })
  async getAllFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagsService.getAllFlags();
  }

  @Get(':flagId')
  @ApiOperation({ summary: 'Get a specific feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async getFlag(@Param('flagId') flagId: string): Promise<FeatureFlag> {
    const flag = await this.featureFlagsService.getFlag(flagId);
    if (!flag) {
      throw new NotFoundException(`Feature flag ${flagId} not found`);
    }
    return flag;
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate feature flags for a user' })
  @ApiResponse({ status: 200, description: 'Feature flags evaluated successfully' })
  async evaluateFlags(
    @Body() body: {
      flags: string[];
      userContext?: UserContext;
    },
  ): Promise<Record<string, any>> {
    const { flags, userContext = {} } = body;
    
    if (!flags || !Array.isArray(flags)) {
      throw new BadRequestException('Flags array is required');
    }

    const results: Record<string, any> = {};
    
    for (const flagId of flags) {
      try {
        results[flagId] = await this.featureFlagsService.evaluateFlag(flagId, userContext);
      } catch (error) {
        results[flagId] = null;
      }
    }

    return results;
  }

  @Post('evaluate/:flagId')
  @ApiOperation({ summary: 'Evaluate a specific feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag evaluated successfully' })
  async evaluateFlag(
    @Param('flagId') flagId: string,
    @Body() body: {
      userContext?: UserContext;
      defaultValue?: any;
    } = {},
  ): Promise<{ flagId: string; value: any }> {
    const { userContext = {}, defaultValue } = body;
    
    const value = await this.featureFlagsService.evaluateFlag(
      flagId,
      userContext,
      defaultValue,
    );

    return { flagId, value };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created successfully' })
  async createFlag(@Body() flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    if (!flag.id || !flag.name) {
      throw new BadRequestException('Flag ID and name are required');
    }

    const existingFlag = await this.featureFlagsService.getFlag(flag.id);
    if (existingFlag) {
      throw new BadRequestException(`Feature flag ${flag.id} already exists`);
    }

    return this.featureFlagsService.createFlag(flag);
  }

  @Put(':flagId')
  @ApiOperation({ summary: 'Update a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag updated successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async updateFlag(
    @Param('flagId') flagId: string,
    @Body() updates: Partial<FeatureFlag>,
  ): Promise<FeatureFlag> {
    const updatedFlag = await this.featureFlagsService.updateFlag(flagId, updates);
    if (!updatedFlag) {
      throw new NotFoundException(`Feature flag ${flagId} not found`);
    }
    return updatedFlag;
  }

  @Delete(':flagId')
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async deleteFlag(@Param('flagId') flagId: string): Promise<{ success: boolean }> {
    const deleted = await this.featureFlagsService.deleteFlag(flagId);
    if (!deleted) {
      throw new NotFoundException(`Feature flag ${flagId} not found`);
    }
    return { success: true };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh feature flags from remote source' })
  @ApiResponse({ status: 200, description: 'Feature flags refreshed successfully' })
  async refreshFlags(): Promise<{ success: boolean }> {
    await this.featureFlagsService.refreshFlags();
    return { success: true };
  }

  @Get('admin/health')
  @ApiOperation({ summary: 'Health check for feature flags service' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck(): Promise<{
    status: string;
    flagsCount: number;
    environment: string;
    timestamp: string;
  }> {
    const flags = await this.featureFlagsService.getAllFlags();
    
    return {
      status: 'healthy',
      flagsCount: flags.length,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/flags-summary')
  @ApiOperation({ summary: 'Get summary of all feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags summary' })
  async getFlagsSummary(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byEnvironment: Record<string, number>;
  }> {
    const flags = await this.featureFlagsService.getAllFlags();
    const environment = process.env.NODE_ENV || 'development';
    
    const summary = {
      total: flags.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byEnvironment: {} as Record<string, number>,
    };

    flags.forEach(flag => {
      // Count by status
      summary.byStatus[flag.status] = (summary.byStatus[flag.status] || 0) + 1;
      
      // Count by type
      summary.byType[flag.type] = (summary.byType[flag.type] || 0) + 1;
      
      // Count by environment enablement
      const envConfig = flag.environments[environment];
      const envKey = envConfig?.enabled ? 'enabled' : 'disabled';
      summary.byEnvironment[envKey] = (summary.byEnvironment[envKey] || 0) + 1;
    });

    return summary;
  }

  @Post('admin/bulk-evaluate')
  @ApiOperation({ summary: 'Bulk evaluate flags for testing' })
  @ApiResponse({ status: 200, description: 'Bulk evaluation completed' })
  async bulkEvaluate(
    @Body() body: {
      userContexts: UserContext[];
      flagIds?: string[];
    },
  ): Promise<Record<string, Record<string, any>>> {
    const { userContexts, flagIds } = body;
    
    if (!userContexts || !Array.isArray(userContexts)) {
      throw new BadRequestException('User contexts array is required');
    }

    const flags = flagIds || (await this.featureFlagsService.getAllFlags()).map(f => f.id);
    const results: Record<string, Record<string, any>> = {};

    for (let i = 0; i < userContexts.length; i++) {
      const context = userContexts[i];
      const userId = context.userId || `user_${i}`;
      results[userId] = {};

      for (const flagId of flags) {
        try {
          results[userId][flagId] = await this.featureFlagsService.evaluateFlag(flagId, context);
        } catch (error) {
          results[userId][flagId] = { error: error.message };
        }
      }
    }

    return results;
  }
}