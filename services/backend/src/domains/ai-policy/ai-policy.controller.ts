import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AIPolicyService } from './ai-policy.service';
import {
  UserTier,
  AIModel,
  UserQuota,
  AIUsageMetrics,
  PolicyDecision,
  AIRequest,
} from './types';

@ApiTags('ai-policy')
@Controller('ai-policy')
export class AIPolicyController {
  constructor(private readonly aiPolicyService: AIPolicyService) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate AI request against policies' })
  @ApiResponse({ status: 200, description: 'Policy decision returned' })
  async evaluateRequest(
    @Body() body: {
      userId: string;
      requestedModel: AIModel;
      estimatedTokens: number;
      contentType: string;
    },
  ): Promise<PolicyDecision> {
    const { userId, requestedModel, estimatedTokens, contentType } = body;
    
    if (!userId || !requestedModel || !estimatedTokens || !contentType) {
      throw new BadRequestException('Missing required fields');
    }

    return this.aiPolicyService.evaluateRequest(
      userId,
      requestedModel,
      estimatedTokens,
      contentType,
    );
  }

  @Post('usage')
  @ApiOperation({ summary: 'Record AI usage' })
  @ApiResponse({ status: 201, description: 'Usage recorded successfully' })
  async recordUsage(@Body() aiRequest: AIRequest): Promise<{ success: boolean }> {
    if (!aiRequest.userId || !aiRequest.model) {
      throw new BadRequestException('Missing required fields');
    }

    await this.aiPolicyService.recordUsage(aiRequest);
    return { success: true };
  }

  @Get('quota/:userId')
  @ApiOperation({ summary: 'Get user quota information' })
  @ApiResponse({ status: 200, description: 'User quota retrieved' })
  async getUserQuota(@Param('userId') userId: string): Promise<UserQuota> {
    return this.aiPolicyService.getUserQuota(userId);
  }

  @Put('tier/:userId')
  @ApiOperation({ summary: 'Update user tier' })
  @ApiResponse({ status: 200, description: 'User tier updated' })
  async updateUserTier(
    @Param('userId') userId: string,
    @Body() body: { tier: UserTier },
  ): Promise<{ success: boolean }> {
    const { tier } = body;
    
    if (!Object.values(UserTier).includes(tier)) {
      throw new BadRequestException('Invalid tier');
    }

    await this.aiPolicyService.updateUserTier(userId, tier);
    return { success: true };
  }

  @Get('usage/:userId')
  @ApiOperation({ summary: 'Get user usage metrics' })
  @ApiResponse({ status: 200, description: 'Usage metrics retrieved' })
  async getUserUsage(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ): Promise<AIUsageMetrics[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.aiPolicyService.getUsageHistory(userId, daysNum);
  }

  @Get('usage/:userId/today')
  @ApiOperation({ summary: 'Get user usage for today' })
  @ApiResponse({ status: 200, description: 'Today usage retrieved' })
  async getTodayUsage(@Param('userId') userId: string): Promise<AIUsageMetrics> {
    return this.aiPolicyService.getTodayUsage(userId);
  }

  @Post('cost-estimate')
  @ApiOperation({ summary: 'Get cost estimate for AI request' })
  @ApiResponse({ status: 200, description: 'Cost estimate calculated' })
  async getCostEstimate(
    @Body() body: {
      model: AIModel;
      inputTokens: number;
      outputTokens: number;
    },
  ): Promise<{ estimatedCostUSD: number }> {
    const { model, inputTokens, outputTokens } = body;
    
    if (!model || inputTokens === undefined || outputTokens === undefined) {
      throw new BadRequestException('Missing required fields');
    }

    const estimatedCostUSD = await this.aiPolicyService.getCostEstimate(
      model,
      inputTokens,
      outputTokens,
    );

    return { estimatedCostUSD };
  }

  @Get('health')
  @ApiOperation({ summary: 'AI Policy service health check' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    userQuotasCount: number;
    environment: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      userQuotasCount: 0, // Would get from actual storage
      environment: process.env.NODE_ENV || 'development',
    };
  }
}