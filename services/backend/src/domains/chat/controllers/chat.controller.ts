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
import { TokenManagementService } from '../../users/services/token-management.service';

import {
  DomainScopedChatService,
  ChatRequest,
  ChatResponse,
} from '../services/domain-scoped-chat.service';
import { ChatSessionService, CreateSessionOptions } from '../services/chat-session.service';
import { HealthKnowledgeService } from '../services/health-knowledge.service';
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
    private readonly healthKnowledgeService: HealthKnowledgeService,
  ) {}

  /**
   * Send a message to the AI assistant
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(ChatRateLimitInterceptor)
  @ApiOperation({
    summary: 'Send message to AI assistant',
    description: 'Send a message to the domain-scoped AI assistant with RAG context',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid message or processing error',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
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

  /**
   * Get quick health response from knowledge base
   */
  @Get('health/quick-response')
  @ApiOperation({
    summary: 'Get quick health response',
    description: 'Get instant response to common health questions using cached data',
  })
  @ApiQuery({ name: 'question', description: 'Health question to answer' })
  @ApiResponse({
    status: 200,
    description: 'Quick response retrieved successfully or AI routing required',
  })
  async getQuickHealthResponse(
    @User() user: UserEntity,
    @Query('question') question: string,
  ): Promise<any> {
    try {
      this.logger.log(`Getting quick health response for user ${user.id}`);

      if (!question?.trim()) {
        throw new BadRequestException('Question is required');
      }

      const quickResponse = await this.healthKnowledgeService.getQuickHealthResponse(
        user.id,
        question.trim(),
      );

      if (quickResponse) {
        return {
          success: true,
          response: quickResponse.answer,
          source: quickResponse.source,
          confidence: quickResponse.confidence,
          userSpecific: quickResponse.userSpecific,
          relatedQuestions: quickResponse.relatedQuestions,
          cacheUntil: quickResponse.cacheUntil,
        };
      } else {
        return {
          success: false,
          message: 'Question requires AI assistance - use the regular chat endpoint',
          requiresAI: true,
        };
      }
    } catch (error) {
      this.logger.error(`Error getting quick health response for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to get health response');
    }
  }

  /**
   * Get user's health metrics summary
   */
  @Get('health/metrics')
  @ApiOperation({
    summary: 'Get health metrics summary',
    description: 'Get comprehensive health metrics without external API calls',
  })
  @ApiResponse({
    status: 200,
    description: 'Health metrics retrieved successfully',
  })
  async getHealthMetrics(@User() user: UserEntity): Promise<any> {
    try {
      this.logger.log(`Getting health metrics for user ${user.id}`);

      const metrics = await this.healthKnowledgeService.getUserHealthMetrics(user.id);

      return {
        success: true,
        metrics,
        generatedAt: new Date(),
        cacheUntil: new Date(Date.now() + 60 * 60 * 1000), // Cache for 1 hour
      };
    } catch (error) {
      this.logger.error(`Error getting health metrics for user ${user.id}:`, error);
      throw new BadRequestException(error.message || 'Failed to get health metrics');
    }
  }

  /**
   * Get knowledge base statistics
   */
  @Get('health/knowledge-stats')
  @ApiOperation({
    summary: 'Get knowledge base statistics',
    description: 'Get statistics about the health knowledge base usage',
  })
  @ApiResponse({
    status: 200,
    description: 'Knowledge base statistics retrieved successfully',
  })
  async getKnowledgeStats(@User() user: UserEntity): Promise<any> {
    try {
      // Only allow admins or specific users to see global stats
      if (user.role !== 'admin') {
        throw new BadRequestException('Insufficient permissions');
      }

      const stats = this.healthKnowledgeService.getKnowledgeBaseStats();

      return {
        success: true,
        stats,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting knowledge stats:`, error);
      throw new BadRequestException(error.message || 'Failed to get knowledge statistics');
    }
  }
}
