import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AIRoutingService, AIRoutingRequest } from '../services/ai-routing.service';
import { DLPService } from '../../auth/services/dlp.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { User as UserEntity } from '../../users/entities/user.entity';

export class AIRoutingRequestDto {
  requestType: string;
  content?: string;
  contextTokens?: number;
  maxResponseTokens?: number;
  emergencyRequest?: boolean;
  accuracyRequirement?: number;
  sessionId?: string;
}

export class AIRoutingResponseDto {
  provider: string;
  model: string;
  endpoint: string;
  routingDecision: string;
  routingReason: string;
  estimatedCost: number;
  quotaRemaining: number;
  decisionId: string;
  processedContent?: string;
  dlpReport?: any;
}

export class AnalyticsQueryDto {
  startDate?: string;
  endDate?: string;
  provider?: string;
  serviceLevel?: string;
}

@ApiTags('AI Routing')
@Controller('ai-routing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIRoutingController {
  private readonly logger = new Logger(AIRoutingController.name);

  constructor(
    private readonly aiRoutingService: AIRoutingService,
    private readonly dlpService: DLPService,
  ) {}

  @Post('route')
  @ApiOperation({ summary: 'Route AI request to optimal provider' })
  @ApiBody({ type: AIRoutingRequestDto })
  @ApiResponse({ status: 200, description: 'Request routed successfully', type: AIRoutingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async routeRequest(
    @Body() request: AIRoutingRequestDto,
    @User() user: UserEntity,
  ): Promise<AIRoutingResponseDto> {
    try {
      this.logger.debug(`Routing AI request for user ${user.id}: ${request.requestType}`);

      // Process content through DLP if provided
      let processedContent = request.content;
      let dlpReport = null;

      if (request.content) {
        const dlpResult = await this.dlpService.processText(request.content);
        processedContent = dlpResult.processedText;
        dlpReport = {
          riskScore: dlpResult.riskScore,
          redactedFields: dlpResult.redactedFields,
          pseudonymizedFields: dlpResult.pseudonymizedFields,
        };

        this.logger.debug(`DLP processed content: risk score ${dlpResult.riskScore}`);
      }

      // Create routing request
      const routingRequest: AIRoutingRequest = {
        userId: user.id,
        sessionId: request.sessionId,
        requestType: request.requestType as any,
        contextTokens: request.contextTokens,
        maxResponseTokens: request.maxResponseTokens,
        emergencyRequest: request.emergencyRequest,
        userTier: 'free', // TODO: Add tier to user entity
        userRegion: user.dataResidencyRegion,
        accuracyRequirement: request.accuracyRequirement,
      };

      // Route the request
      const result = await this.aiRoutingService.routeRequest(routingRequest);

      return {
        provider: result.provider,
        model: result.model,
        endpoint: result.endpoint,
        routingDecision: result.routingDecision,
        routingReason: result.routingReason,
        estimatedCost: result.estimatedCost,
        quotaRemaining: result.quotaRemaining,
        decisionId: result.decisionId,
        processedContent,
        dlpReport,
      };
    } catch (error) {
      this.logger.error('Error routing AI request', error);
      throw new HttpException(
        `Failed to route AI request: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete/:decisionId')
  @ApiOperation({ summary: 'Update routing decision with completion data' })
  @ApiResponse({ status: 200, description: 'Decision updated successfully' })
  async updateCompletion(
    @Param('decisionId') decisionId: string,
    @Body()
    data: {
      responseTokens?: number;
      confidence?: number;
      actualCost?: number;
      processingDuration?: number;
      userFeedback?: number;
    },
  ): Promise<{ success: boolean }> {
    try {
      await this.aiRoutingService.updateCompletion(decisionId, data);
      return { success: true };
    } catch (error) {
      this.logger.error('Error updating completion', error);
      throw new HttpException(
        `Failed to update completion: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('failure/:decisionId')
  @ApiOperation({ summary: 'Update routing decision with failure data' })
  @ApiResponse({ status: 200, description: 'Decision updated successfully' })
  async updateFailure(
    @Param('decisionId') decisionId: string,
    @Body() data: { errorCode: string; errorMessage: string },
  ): Promise<{ success: boolean }> {
    try {
      await this.aiRoutingService.updateFailure(decisionId, data.errorCode, data.errorMessage);
      return { success: true };
    } catch (error) {
      this.logger.error('Error updating failure', error);
      throw new HttpException(
        `Failed to update failure: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get routing analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Query() query: AnalyticsQueryDto): Promise<any> {
    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      const analytics = await this.aiRoutingService.getRoutingAnalytics(startDate, endDate);
      return analytics;
    } catch (error) {
      this.logger.error('Error retrieving analytics', error);
      throw new HttpException(
        `Failed to retrieve analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('quota/reset')
  @ApiOperation({ summary: 'Reset daily quotas (admin only)' })
  @ApiResponse({ status: 200, description: 'Quotas reset successfully' })
  async resetQuotas(@User() user: UserEntity): Promise<{ success: boolean }> {
    // Only allow admin users to reset quotas
    if (user.role !== 'admin') {
      throw new HttpException('Insufficient permissions', HttpStatus.FORBIDDEN);
    }

    try {
      this.aiRoutingService.resetDailyQuotas();
      return { success: true };
    } catch (error) {
      this.logger.error('Error resetting quotas', error);
      throw new HttpException(
        `Failed to reset quotas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for AI routing service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    providers: Record<string, any>;
  }> {
    try {
      // Check provider availability
      const providers = {}; // TODO: Add provider health checks

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers,
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      throw new HttpException('Service unhealthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}