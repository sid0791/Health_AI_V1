import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsObject } from 'class-validator';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { User as UserEntity } from '../../users/entities/user.entity';
import { ChatRateLimitInterceptor } from '../interceptors/chat-rate-limit.interceptor';
import { Level1AIRateLimitInterceptor } from '../interceptors/level1-ai-rate-limit.interceptor';
import { TokenManagementService } from '../../users/services/token-management.service';

import {
  DomainScopedChatService,
  ChatRequest,
  ChatResponse,
} from '../services/domain-scoped-chat.service';
import { ChatSessionService, CreateSessionOptions } from '../services/chat-session.service';
import { SmartQueryCacheService } from '../services/smart-query-cache.service';
import { HealthAnalysisCacheService } from '../services/health-analysis-cache.service';
import { TimelineDietPlanningService } from '../services/timeline-diet-planning.service';
import { ChatSessionType } from '../entities/chat-session.entity';

// DTOs
export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsEnum(ChatSessionType)
  sessionType?: ChatSessionType;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsObject()
  userPreferences?: {
    language?: 'en' | 'hi' | 'hinglish';
    responseStyle?: 'detailed' | 'concise' | 'friendly';
    domainFocus?: string[];
  };
}

export class CreateSessionDto {
  @IsOptional()
  @IsEnum(ChatSessionType)
  type?: ChatSessionType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  userPreferences?: CreateSessionOptions['userPreferences'];

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  expirationHours?: number;
}

export class UpdateSessionPreferencesDto {
  @IsOptional()
  @IsEnum(['en', 'hi', 'hinglish'])
  language?: 'en' | 'hi' | 'hinglish';

  @IsOptional()
  @IsEnum(['detailed', 'concise', 'friendly'])
  responseStyle?: 'detailed' | 'concise' | 'friendly';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainFocus?: string[];
}

export class ExecuteActionDto {
  @IsBoolean()
  confirmed: boolean;
}

@ApiTags('Chat - Domain Scoped AI Assistant')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly domainScopedChatService: DomainScopedChatService,
    private readonly chatSessionService: ChatSessionService,
    private readonly tokenManagementService: TokenManagementService,
    private readonly smartQueryCacheService: SmartQueryCacheService,
    private readonly healthAnalysisCacheService: HealthAnalysisCacheService,
    private readonly timelineDietPlanningService: TimelineDietPlanningService,
  ) {}

  /**
   * Send a message to the AI assistant with Level 1/Level 2 routing
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ChatRateLimitInterceptor)
  @ApiOperation({
    summary: 'Send message to AI assistant with Level 1/Level 2 routing',
    description: 'Send a message to the AI assistant. Health-critical queries use Level 1 (highest accuracy, rate limited), general queries use Level 2 (cost-optimized)',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully with appropriate AI routing level',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid message or processing error',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (Level 1 health queries have stricter limits)',
  })
  async sendMessage(
    @User() user: UserEntity,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto,
  ): Promise<ChatResponse> {
    try {
      this.logger.log(`Processing chat message for user ${user.id}`);

      const chatRequest: ChatRequest = {
        message: sendMessageDto.message,
        sessionId: sendMessageDto.sessionId,
        sessionType: sendMessageDto.sessionType,
        context: sendMessageDto.context,
        userPreferences: sendMessageDto.userPreferences,
      };

      return await this.domainScopedChatService.processMessage(user.id, chatRequest);
    } catch (error) {
      this.logger.error(`Error processing message for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to process message');
    }
  }

  /**
   * Send a health analysis message (Level 1 routing with enhanced rate limiting)
   */
  @Post('health-analysis')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(Level1AIRateLimitInterceptor)
  @ApiOperation({
    summary: 'Send health analysis message (Level 1 AI with enhanced rate limiting)',
    description: 'Send a health-critical analysis request. Uses Level 1 AI routing (highest accuracy) with strict rate limiting for health data protection.',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Health analysis completed successfully',
  })
  @ApiResponse({
    status: 429,
    description: 'Level 1 AI rate limit exceeded - health analysis requests are strictly limited',
  })
  async sendHealthAnalysisMessage(
    @User() user: UserEntity,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto,
  ): Promise<ChatResponse> {
    try {
      this.logger.log(`Processing Level 1 health analysis for user ${user.id}`);

      const chatRequest: ChatRequest = {
        message: sendMessageDto.message,
        sessionId: sendMessageDto.sessionId,
        sessionType: sendMessageDto.sessionType || ChatSessionType.HEALTH_CONSULTATION,
        context: { ...sendMessageDto.context, forceLevel1: true },
        userPreferences: sendMessageDto.userPreferences,
      };

      const response = await this.domainScopedChatService.processMessage(user.id, chatRequest);
      
      // Ensure Level 1 routing was used
      if (response.metadata.routingDecision.level !== 'L1') {
        this.logger.warn(`Health analysis request did not use Level 1 routing for user ${user.id}`);
      }

      return response;
    } catch (error) {
      this.logger.error(`Error processing Level 1 health analysis for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to process health analysis');
    }
  }

  /**
   * Get user's health insights from cached analysis
   */
  @Get('health-insights')
  @ApiOperation({
    summary: 'Get cached health insights',
    description: 'Retrieve all cached health analysis insights for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Health insights retrieved successfully',
  })
  async getHealthInsights(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Retrieving health insights for user ${user.id}`);

      const insights = await this.healthAnalysisCacheService.getUserHealthInsights(user.id);
      const nutritionData = await this.healthAnalysisCacheService.getNutritionDeficiencies(user.id);
      const cacheStats = this.healthAnalysisCacheService.getCacheStats();

      return {
        success: true,
        insights: Object.fromEntries(insights),
        nutritionDeficiencies: nutritionData.deficiencies,
        nutritionExcesses: nutritionData.excesses,
        timelinedRecommendations: nutritionData.timelinedRecommendations,
        cacheStats,
        recommendations: this.getHealthInsightsRecommendations(nutritionData),
      };
    } catch (error) {
      this.logger.error(`Error retrieving health insights for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve health insights');
    }
  }

  /**
   * Get user's timeline diet plan
   */
  @Get('diet-plan')
  @ApiOperation({
    summary: 'Get timeline-based diet plan',
    description: 'Retrieve the user\'s personalized timeline diet plan based on health analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Diet plan retrieved successfully',
  })
  async getDietPlan(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Retrieving diet plan for user ${user.id}`);

      const dietPlan = await this.timelineDietPlanningService.getCurrentDietPlan(user.id);
      
      if (!dietPlan) {
        return {
          success: true,
          hasPlan: false,
          message: 'No active diet plan found. Complete a health analysis to generate a personalized plan.',
          suggestedActions: [
            'Upload health reports for analysis',
            'Complete health questionnaire',
            'Schedule health consultation',
          ],
        };
      }

      const transitionCheck = await this.timelineDietPlanningService.checkMaintenanceTransition(user.id);

      return {
        success: true,
        hasPlan: true,
        dietPlan: {
          id: dietPlan.id,
          planName: dietPlan.planName,
          healthGoals: dietPlan.healthGoals,
          currentPhase: this.getCurrentPhaseInfo(dietPlan),
          totalDuration: dietPlan.totalDuration,
          expectedOutcomes: dietPlan.expectedOutcomes,
          upcomingReminders: this.getUpcomingReminders(dietPlan),
          progress: this.calculateDietPlanProgress(dietPlan),
        },
        transitionStatus: transitionCheck,
        recommendations: this.getDietPlanRecommendations(dietPlan, transitionCheck),
      };
    } catch (error) {
      this.logger.error(`Error retrieving diet plan for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve diet plan');
    }
  }

  /**
   * Generate new timeline diet plan
   */
  @Post('diet-plan/generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate new timeline diet plan',
    description: 'Generate a new personalized timeline diet plan based on current health analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Diet plan generated successfully',
  })
  async generateDietPlan(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Generating new diet plan for user ${user.id}`);

      const dietPlan = await this.timelineDietPlanningService.generateTimelineDietPlan(user.id);

      return {
        success: true,
        message: 'Personalized timeline diet plan generated successfully',
        dietPlan: {
          id: dietPlan.id,
          planName: dietPlan.planName,
          healthGoals: dietPlan.healthGoals,
          totalDuration: dietPlan.totalDuration,
          phases: dietPlan.phases.length,
          basedOnInsights: dietPlan.basedOnInsights,
          expectedOutcomes: dietPlan.expectedOutcomes,
        },
        nextSteps: [
          'Review your personalized diet plan phases',
          'Start with Phase 1 dietary guidelines',
          'Track your adherence and progress',
          'Follow up on scheduled health reminders',
        ],
      };
    } catch (error) {
      this.logger.error(`Error generating diet plan for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to generate diet plan');
    }
  }

  /**
   * Get health analysis cache statistics
   */
  @Get('health-cache/stats')
  @ApiOperation({
    summary: 'Get health analysis cache statistics',
    description: 'Get statistics about cached health analyses and cost savings',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
  })
  async getHealthCacheStats(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Retrieving health cache stats for user ${user.id}`);

      const cacheStats = this.healthAnalysisCacheService.getCacheStats();
      const userInsights = await this.healthAnalysisCacheService.getUserHealthInsights(user.id);

      // Calculate estimated cost savings
      const estimatedSavings = cacheStats.hitRate * cacheStats.activeEntries * 0.05; // Assume $0.05 per Level 1 analysis

      return {
        success: true,
        cacheStats,
        userStats: {
          cachedAnalyses: userInsights.size,
          estimatedCostSavings: estimatedSavings,
        },
        performance: {
          description: 'Health analysis cache provides instant responses for previously analyzed health data',
          benefits: [
            'Instant health insights without AI processing delays',
            'Significant cost savings on repeated health queries',
            'Consistent analysis results for same health data',
            'Reduced load on Level 1 AI resources',
          ],
        },
        recommendations: this.getCacheOptimizationRecommendations(cacheStats, userInsights.size),
      };
    } catch (error) {
      this.logger.error(`Error retrieving cache stats for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve cache statistics');
    }
  }

  /**
   * Invalidate health analysis cache
   */
  @Post('health-cache/invalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invalidate health analysis cache',
    description: 'Clear cached health analysis to force fresh analysis with new data',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidated successfully',
  })
  async invalidateHealthCache(
    @User() user: UserEntity,
    @Body() body: { healthReportId?: string },
  ): Promise<any> {
    try {
      this.logger.log(`Invalidating health cache for user ${user.id}`);

      await this.healthAnalysisCacheService.invalidateHealthReportCache(user.id, body.healthReportId);

      return {
        success: true,
        message: 'Health analysis cache invalidated successfully',
        impact: 'Next health-related queries will generate fresh analysis',
        recommendation: 'This will result in higher accuracy but increased processing time and cost for next analysis',
      };
    } catch (error) {
      this.logger.error(`Error invalidating health cache for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to invalidate health cache');
    }
  }

  /**
   * Create a new chat session
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new chat session',
    description: 'Create a new chat session with specified type and preferences',
  })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Chat session created successfully',
  })
  async createSession(
    @User() user: UserEntity,
    @Body(ValidationPipe) createSessionDto: CreateSessionDto,
  ): Promise<any> {
    try {
      this.logger.log(`Creating chat session for user ${user.id}`);

      const session = await this.chatSessionService.createSession(user.id, createSessionDto);

      return {
        success: true,
        sessionId: session.id,
        session: {
          id: session.id,
          type: session.type,
          title: session.title,
          status: session.status,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          userPreferences: session.userPreferences,
        },
        message: 'Chat session created successfully',
      };
    } catch (error) {
      this.logger.error(`Error creating session for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to create session');
    }
  }

  /**
   * Get user's chat sessions
   */
  @Get('sessions')
  @ApiOperation({
    summary: 'Get user chat sessions',
    description: 'Retrieve all chat sessions for the current user',
  })
  @ApiQuery({ name: 'includeExpired', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  async getUserSessions(
    @User() user: UserEntity,
    @Query('includeExpired') includeExpired?: boolean,
  ): Promise<any> {
    try {
      const sessions = await this.chatSessionService.getUserSessions(
        user.id,
        includeExpired || false,
      );

      return {
        success: true,
        sessions,
        total: sessions.length,
      };
    } catch (error) {
      this.logger.error(`Error retrieving sessions for user ${user.id}:`, error);
      throw new BadRequestException('Failed to retrieve sessions');
    }
  }

  /**
   * Get specific chat session
   */
  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'Get chat session details',
    description: 'Retrieve details of a specific chat session',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved successfully',
  })
  async getSession(@User() user: UserEntity, @Param('sessionId') sessionId: string): Promise<any> {
    try {
      const session = await this.chatSessionService.getSession(sessionId, user.id);

      return {
        success: true,
        session: {
          id: session.id,
          type: session.type,
          status: session.status,
          title: session.title,
          description: session.description,
          messageCount: session.messageCount,
          lastActivityAt: session.lastActivityAt,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          userPreferences: session.userPreferences,
          context: session.context,
        },
      };
    } catch (error) {
      this.logger.error(`Error retrieving session ${sessionId} for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve session');
    }
  }

  /**
   * Get chat history for a session
   */
  @Get('sessions/:sessionId/messages')
  @ApiOperation({
    summary: 'Get chat history',
    description: 'Retrieve message history for a chat session',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
  })
  async getChatHistory(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    try {
      const messages = await this.domainScopedChatService.getChatHistory(
        user.id,
        sessionId,
        limit || 50,
      );

      return {
        success: true,
        sessionId,
        messages: messages.map((message) => ({
          id: message.id,
          type: message.type,
          content: message.content,
          processingStatus: message.processingStatus,
          metadata: message.metadata,
          ragSources: message.ragSources,
          actionRequests: message.actionRequests,
          createdAt: message.createdAt,
          tokenCount: message.tokenCount,
          costUsd: message.costUsd,
        })),
        total: messages.length,
      };
    } catch (error) {
      this.logger.error(`Error retrieving chat history for session ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve chat history');
    }
  }

  /**
   * Update session preferences
   */
  @Put('sessions/:sessionId/preferences')
  @ApiOperation({
    summary: 'Update session preferences',
    description: 'Update user preferences for a chat session',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiBody({ type: UpdateSessionPreferencesDto })
  @ApiResponse({
    status: 200,
    description: 'Session preferences updated successfully',
  })
  async updateSessionPreferences(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
    @Body(ValidationPipe) updateDto: UpdateSessionPreferencesDto,
  ): Promise<any> {
    try {
      const session = await this.chatSessionService.updateSessionPreferences(
        sessionId,
        user.id,
        updateDto,
      );

      return {
        success: true,
        sessionId: session.id,
        userPreferences: session.userPreferences,
        message: 'Session preferences updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating preferences for session ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to update preferences');
    }
  }

  /**
   * Pause a chat session
   */
  @Put('sessions/:sessionId/pause')
  @ApiOperation({
    summary: 'Pause chat session',
    description: 'Pause an active chat session',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session paused successfully',
  })
  async pauseSession(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
  ): Promise<any> {
    try {
      const session = await this.chatSessionService.pauseSession(sessionId, user.id);

      return {
        success: true,
        sessionId: session.id,
        status: session.status,
        message: 'Session paused successfully',
      };
    } catch (error) {
      this.logger.error(`Error pausing session ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to pause session');
    }
  }

  /**
   * Resume a paused chat session
   */
  @Put('sessions/:sessionId/resume')
  @ApiOperation({
    summary: 'Resume chat session',
    description: 'Resume a paused chat session',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session resumed successfully',
  })
  async resumeSession(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
  ): Promise<any> {
    try {
      const session = await this.chatSessionService.resumeSession(sessionId, user.id);

      return {
        success: true,
        sessionId: session.id,
        status: session.status,
        message: 'Session resumed successfully',
      };
    } catch (error) {
      this.logger.error(`Error resuming session ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to resume session');
    }
  }

  /**
   * Archive a chat session
   */
  @Put('sessions/:sessionId/archive')
  @ApiOperation({
    summary: 'Archive chat session',
    description: 'Archive a chat session (soft delete)',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session archived successfully',
  })
  async archiveSession(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
  ): Promise<any> {
    try {
      await this.chatSessionService.archiveSession(sessionId, user.id);

      return {
        success: true,
        sessionId,
        message: 'Session archived successfully',
      };
    } catch (error) {
      this.logger.error(`Error archiving session ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to archive session');
    }
  }

  /**
   * Delete a chat session
   */
  @Delete('sessions/:sessionId')
  @ApiOperation({
    summary: 'Delete chat session',
    description: 'Permanently delete a chat session and all its messages',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
  })
  async deleteSession(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
  ): Promise<any> {
    try {
      await this.chatSessionService.deleteSession(sessionId, user.id);

      return {
        success: true,
        sessionId,
        message: 'Session deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting session ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to delete session');
    }
  }

  /**
   * Execute an action request from a chat message
   */
  @Post('messages/:messageId/actions/:actionIndex/execute')
  @ApiOperation({
    summary: 'Execute chat action',
    description: 'Execute an action request from a chat message',
  })
  @ApiParam({ name: 'messageId', description: 'Chat message ID' })
  @ApiParam({ name: 'actionIndex', description: 'Action index in the message' })
  @ApiBody({ type: ExecuteActionDto })
  @ApiResponse({
    status: 200,
    description: 'Action executed successfully',
  })
  async executeAction(
    @User() user: UserEntity,
    @Param('messageId') messageId: string,
    @Param('actionIndex') actionIndex: string,
    @Body(ValidationPipe) executeDto: ExecuteActionDto,
  ): Promise<any> {
    try {
      const actionIndexNum = parseInt(actionIndex, 10);
      if (isNaN(actionIndexNum)) {
        throw new BadRequestException('Invalid action index');
      }

      const result = await this.domainScopedChatService.executeAction(
        user.id,
        messageId,
        actionIndexNum,
        executeDto.confirmed,
      );

      return {
        success: true,
        messageId,
        actionIndex: actionIndexNum,
        result,
      };
    } catch (error) {
      this.logger.error(`Error executing action for message ${messageId}:`, error);
      throw new BadRequestException(error.message || 'Failed to execute action');
    }
  }

  /**
   * Get session statistics
   */
  @Get('sessions/stats')
  @ApiOperation({
    summary: 'Get session statistics',
    description: 'Get statistics about user chat sessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getSessionStats(@User() user: UserEntity): Promise<any> {
    try {
      const stats = await this.chatSessionService.getSessionStats(user.id);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      this.logger.error(`Error retrieving session stats for user ${user.id}:`, error);
      throw new BadRequestException('Failed to retrieve session statistics');
    }
  }

  /**
   * Get session recommendations
   */
  @Get('sessions/recommendations')
  @ApiOperation({
    summary: 'Get session recommendations',
    description: 'Get personalized session recommendations based on user history',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
  })
  async getSessionRecommendations(@User() user: UserEntity): Promise<any> {
    try {
      const recommendations = await this.chatSessionService.getSessionRecommendations(user.id);

      return {
        success: true,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error retrieving recommendations for user ${user.id}:`, error);
      throw new BadRequestException('Failed to retrieve recommendations');
    }
  }

  /**
   * Get session health check
   */
  @Get('sessions/:sessionId/health')
  @ApiOperation({
    summary: 'Get session health',
    description: 'Get health check information for a session',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session health retrieved successfully',
  })
  async getSessionHealth(
    @User() user: UserEntity,
    @Param('sessionId') sessionId: string,
  ): Promise<any> {
    try {
      const health = await this.chatSessionService.getSessionHealth(sessionId, user.id);

      return {
        success: true,
        sessionId,
        health,
      };
    } catch (error) {
      this.logger.error(`Error retrieving session health for ${sessionId}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve session health');
    }
  }

  /**
   * Get user token usage statistics
   */
  @Get('token-usage')
  @ApiOperation({
    summary: 'Get user token usage statistics',
    description: 'Retrieve current token usage and limits for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Token usage statistics retrieved successfully',
  })
  async getTokenUsage(@User() user: UserEntity) {
    try {
      this.logger.log(`Retrieving token usage for user ${user.id}`);

      const tokenStats = await this.tokenManagementService.getUserTokenStats(user.id);

      return {
        success: true,
        tokenUsage: tokenStats,
        recommendations: this.getUsageRecommendations(tokenStats),
      };
    } catch (error) {
      this.logger.error(`Error retrieving token usage for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve token usage');
    }
  }

  /**
   * Get user token usage history
   */
  @Get('token-usage/history')
  @ApiOperation({
    summary: 'Get user token usage history',
    description: 'Retrieve detailed token usage history for the authenticated user',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to retrieve (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Token usage history retrieved successfully',
  })
  async getTokenUsageHistory(@User() user: UserEntity, @Query('limit') limit?: string) {
    try {
      this.logger.log(`Retrieving token usage history for user ${user.id}`);

      const limitNumber = limit ? parseInt(limit, 10) : 50;
      const history = await this.tokenManagementService.getUserTokenHistory(
        user.id,
        undefined,
        undefined,
        limitNumber,
      );

      return {
        success: true,
        history,
        totalRecords: history.length,
      };
    } catch (error) {
      this.logger.error(`Error retrieving token usage history for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve token usage history');
    }
  }

  /**
   * Pre-compute common responses for the user
   */
  @Post('cache/precompute')
  @ApiOperation({
    summary: 'Pre-compute common responses',
    description: 'Pre-compute and cache responses for frequently asked questions',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-computation completed successfully',
  })
  async preComputeResponses(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Pre-computing smart cache responses for user ${user.id}`);

      await this.smartQueryCacheService.preComputeCommonResponses(user.id);

      return {
        success: true,
        message: 'Common responses pre-computed successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error pre-computing responses for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to pre-compute responses');
    }
  }

  /**
   * Get smart query cache analytics
   */
  @Get('cache/analytics')
  @ApiOperation({
    summary: 'Get smart cache analytics',
    description: 'Get analytics about cached queries and performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  async getCacheAnalytics(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Retrieving cache analytics for user ${user.id}`);

      const analytics = await this.smartQueryCacheService.getQueryAnalytics();

      return {
        success: true,
        analytics,
        recommendations: this.getCacheRecommendations(analytics),
      };
    } catch (error) {
      this.logger.error(`Error retrieving cache analytics for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to retrieve cache analytics');
    }
  }

  /**
   * Get health insights recommendations
   */
  private getHealthInsightsRecommendations(nutritionData: any): string[] {
    const recommendations = [];

    if (nutritionData.deficiencies.length > 0) {
      recommendations.push(
        `You have ${nutritionData.deficiencies.length} nutrient deficiencies that can be addressed through targeted diet planning.`,
      );
      recommendations.push(
        'Consider generating a timeline diet plan to systematically address these deficiencies.',
      );
    }

    if (nutritionData.timelinedRecommendations.length > 0) {
      const shortestTimeline = Math.min(...nutritionData.timelinedRecommendations.map(r => r.targetDays));
      recommendations.push(
        `Some improvements can be seen as early as ${shortestTimeline} days with targeted dietary changes.`,
      );
    }

    if (nutritionData.excesses.length > 0) {
      recommendations.push(
        `You have ${nutritionData.excesses.length} parameters that exceed optimal ranges and should be reduced.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Your current health analysis shows balanced nutrition levels.');
      recommendations.push('Continue with your current dietary approach and regular health monitoring.');
    }

    return recommendations;
  }

  /**
   * Get current phase information for diet plan
   */
  private getCurrentPhaseInfo(dietPlan: any): any {
    const now = new Date();
    const currentPhase = dietPlan.phases.find(phase => phase.startDate <= now && phase.endDate >= now);
    
    if (!currentPhase) {
      return null;
    }

    const daysSinceStart = Math.floor((now.getTime() - currentPhase.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.floor((currentPhase.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      phaseNumber: currentPhase.phaseNumber,
      name: currentPhase.name,
      currentDay: Math.max(1, daysSinceStart + 1),
      totalDays: currentPhase.duration,
      daysRemaining: Math.max(0, daysRemaining),
      primaryFocus: currentPhase.primaryFocus,
      dietaryGuidelines: currentPhase.dietaryGuidelines,
      expectedProgress: currentPhase.expectedProgress,
      progressPercentage: Math.min(100, Math.max(0, ((daysSinceStart + 1) / currentPhase.duration) * 100)),
    };
  }

  /**
   * Get upcoming reminders for diet plan
   */
  private getUpcomingReminders(dietPlan: any): any[] {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return dietPlan.recheckReminders
      .filter(reminder => reminder.scheduledDate >= now && reminder.scheduledDate <= nextWeek)
      .map(reminder => ({
        type: reminder.type,
        description: reminder.description,
        scheduledDate: reminder.scheduledDate,
        daysUntil: Math.ceil((reminder.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }));
  }

  /**
   * Calculate diet plan progress
   */
  private calculateDietPlanProgress(dietPlan: any): any {
    const now = new Date();
    const startDate = dietPlan.createdAt;
    const totalDuration = dietPlan.totalDuration;
    
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100));
    
    const completedPhases = dietPlan.phases.filter(phase => phase.endDate < now);
    const totalPhases = dietPlan.phases.length;

    return {
      daysElapsed,
      totalDays: totalDuration,
      progressPercentage: Math.round(progressPercentage),
      phasesCompleted: completedPhases.length,
      totalPhases,
      phaseProgressPercentage: Math.round((completedPhases.length / totalPhases) * 100),
      estimatedCompletion: new Date(startDate.getTime() + totalDuration * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Get diet plan recommendations
   */
  private getDietPlanRecommendations(dietPlan: any, transitionCheck: any): string[] {
    const recommendations = [];

    if (transitionCheck.shouldTransition) {
      recommendations.push('🎉 Congratulations! You\'re ready to transition to maintenance mode.');
      recommendations.push('Schedule a comprehensive health test to verify your improvements.');
      recommendations.push('Consider setting new health optimization goals.');
    } else {
      const currentPhase = this.getCurrentPhaseInfo(dietPlan);
      if (currentPhase) {
        recommendations.push(`Continue with Phase ${currentPhase.phaseNumber} for ${currentPhase.daysRemaining} more days.`);
        recommendations.push(`Focus on: ${currentPhase.primaryFocus.join(', ')}.`);
      }
      
      recommendations.push('Track your adherence to dietary guidelines for better outcomes.');
      recommendations.push('Monitor how you feel and any improvements in energy or symptoms.');
    }

    const upcomingReminders = this.getUpcomingReminders(dietPlan);
    if (upcomingReminders.length > 0) {
      recommendations.push(`You have ${upcomingReminders.length} upcoming reminders in the next week.`);
    }

    return recommendations;
  }

  /**
   * Get cache optimization recommendations
   */
  private getCacheOptimizationRecommendations(cacheStats: any, userCachedAnalyses: number): string[] {
    const recommendations = [];

    if (cacheStats.hitRate > 0.8) {
      recommendations.push('Excellent cache performance! Your health queries are being answered efficiently.');
    } else if (cacheStats.hitRate < 0.5) {
      recommendations.push('Cache hit rate could be improved. More health analysis will build up your cache.');
    }

    if (userCachedAnalyses < 3) {
      recommendations.push('Upload more health reports to build comprehensive analysis cache.');
      recommendations.push('Complete health questionnaires to expand your health insights.');
    }

    if (cacheStats.expiredEntries > cacheStats.activeEntries * 0.5) {
      recommendations.push('Some cached analyses have expired. Upload recent health data for fresh insights.');
    }

    recommendations.push('Regular health data updates keep your analysis current and actionable.');

    return recommendations;
  }

  /**
   * Get usage recommendations based on token stats
   */
  private getUsageRecommendations(tokenStats: any): string[] {
    const recommendations = [];

    if (tokenStats.dailyUsed / tokenStats.dailyLimit > 0.8) {
      recommendations.push(
        "You've used over 80% of your daily token limit. Consider upgrading your plan for unlimited usage.",
      );
    }

    if (tokenStats.shouldFallbackToFree) {
      recommendations.push(
        "You've reached your token limit and are now using free AI models. Responses may be slower but still helpful.",
      );
    }

    if (tokenStats.userTier === 'free' && tokenStats.dailyUsed > 5000) {
      recommendations.push(
        "You're a power user! Consider upgrading to Premium for faster responses and higher limits.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Your usage looks healthy. Keep chatting with our AI assistant!');
    }

    return recommendations;
  }
}
