import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { ChatSession, ChatSessionType, ChatSessionStatus } from '../entities/chat-session.entity';
import { ChatMessage, MessageType, MessageProcessingStatus } from '../entities/chat-message.entity';
import { User } from '../../users/entities/user.entity';

import { RAGService } from './rag.service';
import { HinglishNLPService } from './hinglish-nlp.service';
import { ChatSessionService } from './chat-session.service';
import { SmartQueryCacheService } from './smart-query-cache.service';
import { HealthInsightsService } from './health-insights.service';
import { Level1RateLimitService } from './level1-rate-limit.service';

// AI routing integration
import { AIRoutingService, AIRoutingRequest } from '../../ai-routing/services/ai-routing.service';
import { RequestType } from '../../ai-routing/entities/ai-routing-decision.entity';

// Token management integration
import {
  TokenManagementService,
  TokenConsumptionRequest,
} from '../../users/services/token-management.service';
import { TokenUsageType, TokenProvider } from '../../users/entities/user-token-usage.entity';

// DLP integration for privacy
import { DLPService } from '../../auth/services/dlp.service';

// Health insights integration
import { HealthInsight, InsightCategory } from '../entities/health-insights.entity';
import { DietPlan } from '../entities/diet-plan.entity';

export interface ChatRequest {
  message: string;
  sessionId?: string;
  sessionType?: ChatSessionType;
  context?: Record<string, any>;
  userPreferences?: {
    language?: 'en' | 'hi' | 'hinglish';
    responseStyle?: 'detailed' | 'concise' | 'friendly';
    domainFocus?: string[];
  };
}

export interface ChatResponse {
  success: boolean;
  sessionId: string;
  messageId: string;
  response: string;
  metadata: {
    processingTime: number;
    domainClassification: {
      domain: string;
      confidence: number;
      isInScope: boolean;
    };
    languageDetection: {
      detected: 'en' | 'hi' | 'hinglish' | 'mixed';
      confidence: number;
    };
    ragContext?: {
      documentsUsed: number;
      sources: Array<{
        title: string;
        excerpt: string;
        relevanceScore: number;
      }>;
    };
    actionRequests?: Array<{
      actionType: string;
      description: string;
      requiresConfirmation: boolean;
    }>;
    cost: number;
    routingDecision: {
      level: 'L1' | 'L2';
      provider: string;
      model: string;
    };
  };
  citations?: string[];
  followUpQuestions?: string[];
}

@Injectable()
export class DomainScopedChatService {
  private readonly logger = new Logger(DomainScopedChatService.name);

  // Allowed domains for scoped chat
  private readonly allowedDomains = [
    'nutrition',
    'fitness',
    'health',
    'meal_planning',
    'workout_planning',
    'recipe',
    'health_reports',
    'general_wellness',
  ];

  // Out-of-scope indicators
  private readonly outOfScopeKeywords = [
    'weather',
    'politics',
    'entertainment',
    'sports_news',
    'celebrity_gossip',
    'technology_news',
    'finance',
    'investment',
    'travel',
    'shopping',
    'gaming',
  ];

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly ragService: RAGService,
    private readonly hinglishNLPService: HinglishNLPService,
    private readonly chatSessionService: ChatSessionService,
    private readonly aiRoutingService: AIRoutingService,
    private readonly dlpService: DLPService,
    private readonly tokenManagementService: TokenManagementService,
    private readonly configService: ConfigService,
    private readonly smartQueryCacheService: SmartQueryCacheService,
    private readonly healthInsightsService: HealthInsightsService,
    private readonly level1RateLimitService: Level1RateLimitService,
  ) {}

  /**
   * Process a chat message with domain-scoped RAG
   */
  async processMessage(userId: string, request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    this.logger.log(`Processing chat message for user ${userId}`);

    try {
      // Get or create chat session
      const session = await this.getOrCreateSession(userId, request);

      // Process the user's message with Hinglish NLP
      const processedMessage = await this.hinglishNLPService.processMessage(request.message);

      // **ENHANCEMENT: Check smart query cache first**
      const smartResponse = await this.smartQueryCacheService.processQuery(
        userId,
        processedMessage.content,
        session.id,
      );

      if (smartResponse) {
        // Record that query was answered locally
        await this.smartQueryCacheService.recordQuery(userId, request.message, true);

        // Create user message record
        const userMessage = await this.createUserMessage(session, request.message, {
          processedContent: processedMessage.content,
          languageDetection: processedMessage.languageDetection,
          smartCacheResult: smartResponse,
          hinglishProcessing: processedMessage.metadata,
        });

        // Create assistant message with cached response
        const assistantMessage = await this.createAssistantMessage(
          session,
          smartResponse.response,
          {
            smartQueryCache: {
              fromCache: smartResponse.fromCache,
              dataSource: smartResponse.dataSource,
              confidence: smartResponse.confidence,
              category: smartResponse.category,
            },
            domainClassification: {
              domain: smartResponse.category,
              confidence: smartResponse.confidence,
              isInScope: true,
            },
            languageDetection: processedMessage.languageDetection,
            performance: {
              processingTimeMs: Date.now() - startTime,
              tokenCount: 0, // No AI tokens used
              retrievalTimeMs: 50, // Fast local retrieval
              generationTimeMs: 0,
            },
            tokenUsage: {
              tokensUsed: 0,
              usedFreeTier: true,
              cost: 0,
            },
            routingDecision: {
              level: 'L2',
              provider: 'local_cache',
              model: 'smart_query_cache',
            },
          },
        );

        // Update session activity
        session.incrementMessageCount();
        await this.chatSessionRepository.save(session);

        this.logger.log(
          `Smart cache response provided for user ${userId} in ${Date.now() - startTime}ms`,
        );

        return {
          success: true,
          sessionId: session.id,
          messageId: assistantMessage.id,
          response: smartResponse.response,
          metadata: {
            processingTime: Date.now() - startTime,
            domainClassification: {
              domain: smartResponse.category,
              confidence: smartResponse.confidence,
              isInScope: true,
            },
            languageDetection: processedMessage.languageDetection,
            ragContext: {
              documentsUsed: 0,
              sources: [],
            },
            actionRequests: [],
            cost: 0,
            routingDecision: {
              level: 'L2',
              provider: 'local_cache',
              model: 'smart_query_cache',
            },
          },
          citations: smartResponse.dataSource === 'local' ? ['Local health data'] : [],
          followUpQuestions: this.generateSmartFollowUps(smartResponse.category),
        };
      }

      // Record that query was not answered locally (will go to AI)
      await this.smartQueryCacheService.recordQuery(userId, request.message, false);

      // Classify domain and check scope
      const domainClassification = await this.classifyDomain(processedMessage.content);

      // Create user message record
      const userMessage = await this.createUserMessage(session, request.message, {
        processedContent: processedMessage.content,
        languageDetection: processedMessage.languageDetection,
        domainClassification,
        hinglishProcessing: processedMessage.metadata,
      });

      // Check if message is in scope
      if (!domainClassification.isInScope) {
        return await this.handleOutOfScopeMessage(session, userMessage, domainClassification);
      }

      // Retrieve relevant context using RAG
      const ragContext = await this.ragService.retrieveContext(
        userId,
        processedMessage.content,
        domainClassification.domain,
        {
          maxDocuments: 5,
          relevanceThreshold: 0.7,
          contextTypes: this.getDomainContextTypes(domainClassification.domain),
        },
      );

      // Apply DLP to the message and context
      const dlpProcessedContent = await this.dlpService.processText(processedMessage.content);

      // Determine AI routing level based on domain and message content
      const routingLevel = this.determineRoutingLevel(domainClassification.domain, processedMessage.content);

      // **LEVEL 1 RATE LIMITING**: Apply strict rate limits for health-critical queries
      if (routingLevel === 'L1') {
        const rateLimitInfo = await this.level1RateLimitService.checkRateLimit(userId);
        if (rateLimitInfo.blocked) {
          // Rate limit exceeded - return error response
          this.level1RateLimitService.throwRateLimitException(userId, rateLimitInfo);
        }
      }

      // **LEVEL 1 CACHING**: Check health insights cache for Level 1 queries
      if (routingLevel === 'L1') {
        const cachedResponse = await this.checkLevel1Cache(userId, processedMessage.content, domainClassification);
        if (cachedResponse) {
          // Return cached Level 1 response (major cost savings!)
          const assistantMessage = await this.createAssistantMessage(
            session,
            cachedResponse.response,
            {
              healthInsightsCache: {
                fromCache: true,
                insightId: cachedResponse.insightId,
                confidence: cachedResponse.confidence,
                category: cachedResponse.category,
                originalCost: cachedResponse.originalCost,
              },
              domainClassification,
              languageDetection: processedMessage.languageDetection,
              performance: {
                processingTimeMs: Date.now() - startTime,
                tokenCount: 0, // No new AI tokens used
                retrievalTimeMs: 25, // Fast cache retrieval
                generationTimeMs: 0,
              },
              tokenUsage: {
                tokensUsed: 0,
                usedFreeTier: true,
                cost: 0, // ZERO COST - Major savings!
              },
              routingDecision: {
                level: 'L1',
                provider: 'cached_health_insights',
                model: 'health_insights_cache',
              },
            },
          );

          session.incrementMessageCount();
          await this.chatSessionRepository.save(session);

          this.logger.log(`Level 1 cached response provided for user ${userId} - ZERO COST!`);

          return {
            success: true,
            sessionId: session.id,
            messageId: assistantMessage.id,
            response: cachedResponse.response,
            metadata: {
              processingTime: Date.now() - startTime,
              domainClassification,
              languageDetection: processedMessage.languageDetection,
              ragContext: {
                documentsUsed: 0,
                sources: [],
              },
              actionRequests: [],
              cost: 0, // ZERO COST!
              routingDecision: {
                level: 'L1',
                provider: 'cached_health_insights',
                model: 'health_insights_cache',
              },
            },
            citations: ['Cached health insights from previous analysis'],
            followUpQuestions: this.generateHealthInsightFollowUps(cachedResponse.category),
          };
        }
      }

      // Check user token limits before routing
      const estimatedTokens = this.estimateTokenUsage(
        dlpProcessedContent.processedText,
        ragContext,
      );
      const canConsumeTokens = await this.tokenManagementService.canConsumeTokens(
        userId,
        estimatedTokens,
      );

      // Build AI request with RAG context
      const aiRequest = await this.buildAIRequest(
        userId,
        dlpProcessedContent.processedText,
        ragContext,
        domainClassification,
        routingLevel,
        session,
      );

      // Route to AI provider with token awareness
      const aiResponse = await this.aiRoutingService.routeRequestWithUserTokens({
        ...aiRequest,
        forceFreeTier: !canConsumeTokens,
      });

      // Process AI response for actions and citations
      const processedResponse = await this.processAIResponse(
        'AI response content here', // Would be from actual AI call
        ragContext,
        domainClassification,
      );

      // **LEVEL 1 CACHING**: Store Level 1 AI responses for future reuse
      if (routingLevel === 'L1') {
        const aiCost = aiResponse.estimatedCost || 0.02; // Typical Level 1 cost
        const category = this.mapDomainToInsightCategory(domainClassification.domain);
        await this.storeLevel1Response(userId, processedMessage.content, processedResponse.content, category, aiCost);
        this.logger.debug(`Stored Level 1 response for user ${userId} - Future queries will have ZERO cost!`);
        
        // Record the Level 1 request for rate limiting
        await this.level1RateLimitService.recordRequest(userId);
        this.logger.debug(`Recorded Level 1 API usage for rate limiting - user ${userId}`);
      }

      // Record token consumption
      const actualTokensUsed = this.calculateActualTokenUsage(
        dlpProcessedContent.processedText,
        processedResponse.content,
      );

      if (!aiResponse.usedFreeTier) {
        await this.tokenManagementService.consumeTokens({
          userId,
          usageType: TokenUsageType.CHAT_MESSAGE,
          provider: this.mapAIProviderToTokenProvider(aiResponse.provider),
          inputTokens: Math.floor(actualTokensUsed * 0.6), // Rough estimate
          outputTokens: Math.floor(actualTokensUsed * 0.4), // Rough estimate
          modelName: aiResponse.model,
          sessionId: session.id,
          requestId: aiResponse.decisionId,
          metadata: {
            domainClassification: domainClassification.domain,
            ragDocumentsUsed: ragContext.metadata.documentsRetrieved,
            languageDetected: processedMessage.languageDetection,
          },
        });
      }

      // Create assistant message record
      const assistantMessage = await this.createAssistantMessage(
        session,
        processedResponse.content,
        {
          routingDecision: {
            level: routingLevel,
            provider: aiResponse.provider,
            model: aiResponse.model,
          },
          ragContext: {
            documentsUsed: ragContext.metadata.documentsRetrieved,
            sources: ragContext.sources.map((s) => ({
              title: s.title,
              excerpt: s.excerpt,
              relevanceScore: s.relevanceScore,
            })),
          },
          domainClassification,
          languageDetection: processedMessage.languageDetection,
          actionRequests: processedResponse.actionRequests,
          ragSources: ragContext.sources,
          performance: {
            processingTimeMs: Date.now() - startTime,
            tokenCount: actualTokensUsed,
            retrievalTimeMs: ragContext.metadata.retrievalTimeMs,
            generationTimeMs: 200, // Would be from actual AI response
          },
          safety: {
            contentFiltered: false,
            dlpApplied: dlpProcessedContent.redactedFields.length > 0,
            redactedFields: dlpProcessedContent.redactedFields,
            complianceChecks: ['domain_scope', 'content_safety'],
          },
          tokenUsage: {
            tokensUsed: actualTokensUsed,
            usedFreeTier: aiResponse.usedFreeTier,
            cost: aiResponse.estimatedCost,
          },
        },
      );

      // Update session activity
      session.incrementMessageCount();
      await this.chatSessionRepository.save(session);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        sessionId: session.id,
        messageId: assistantMessage.id,
        response: processedResponse.content,
        metadata: {
          processingTime,
          domainClassification,
          languageDetection: processedMessage.languageDetection,
          ragContext: {
            documentsUsed: ragContext.metadata.documentsRetrieved,
            sources: ragContext.sources.map((s) => ({
              title: s.title,
              excerpt: s.excerpt,
              relevanceScore: s.relevanceScore,
            })),
          },
          actionRequests: processedResponse.actionRequests,
          cost: aiResponse.estimatedCost || 0,
          routingDecision: {
            level: routingLevel,
            provider: aiResponse.provider,
            model: aiResponse.model,
          },
        },
        citations: this.buildCitations(ragContext.sources),
        followUpQuestions: processedResponse.followUpQuestions,
      };
    } catch (error) {
      this.logger.error(`Error processing chat message for user ${userId}:`, error);
      throw new BadRequestException(`Chat processing failed: ${error.message}`);
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(userId: string, sessionId: string, limit = 50): Promise<ChatMessage[]> {
    // Verify session belongs to user
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ForbiddenException('Session not found or access denied');
    }

    return await this.chatMessageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Get user's chat sessions
   */
  async getUserSessions(userId: string, limit = 20): Promise<ChatSession[]> {
    return await this.chatSessionRepository.find({
      where: { userId },
      order: { lastActivityAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Execute action requests from chat
   */
  async executeAction(
    userId: string,
    messageId: string,
    actionIndex: number,
    confirmed: boolean,
  ): Promise<any> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['session'],
    });

    if (!message || message.session.userId !== userId) {
      throw new ForbiddenException('Message not found or access denied');
    }

    const action = message.actionRequests?.[actionIndex];
    if (!action) {
      throw new BadRequestException('Action not found');
    }

    if (action.requiresConfirmation && !confirmed) {
      throw new BadRequestException('Action requires user confirmation');
    }

    // Execute the action based on type
    try {
      const result = await this.executeSpecificAction(action, userId);

      // Update action status
      action.status = 'executed';
      message.actionRequests[actionIndex] = action;
      await this.chatMessageRepository.save(message);

      return {
        success: true,
        action: action.actionType,
        result,
        message: `Action "${action.description}" executed successfully`,
      };
    } catch (error) {
      this.logger.error(`Error executing action for user ${userId}:`, error);

      // Update action status
      action.status = 'rejected';
      message.actionRequests[actionIndex] = action;
      await this.chatMessageRepository.save(message);

      throw new BadRequestException(`Action execution failed: ${error.message}`);
    }
  }

  // Private helper methods

  private async getOrCreateSession(userId: string, request: ChatRequest): Promise<ChatSession> {
    if (request.sessionId) {
      const session = await this.chatSessionRepository.findOne({
        where: { id: request.sessionId, userId },
      });

      if (session && session.isActive()) {
        return session;
      }
    }

    // Create new session
    return await this.chatSessionService.createSession(userId, {
      type: request.sessionType || ChatSessionType.GENERAL,
      userPreferences: request.userPreferences,
      context: request.context,
    });
  }

  private async classifyDomain(message: string): Promise<any> {
    // Simple keyword-based classification for now
    // In production, this would use a dedicated classification model

    const lowerMessage = message.toLowerCase();

    // Check for out-of-scope content first
    for (const keyword of this.outOfScopeKeywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          domain: 'out_of_scope',
          confidence: 0.9,
          isInScope: false,
          reason: `Contains out-of-scope keyword: ${keyword}`,
        };
      }
    }

    // Check for domain-specific keywords
    const domainKeywords = {
      health_reports: ['blood test', 'lab report', 'hba1c', 'cholesterol', 'biomarker'],
      nutrition: ['nutrition', 'calories', 'protein', 'vitamins', 'minerals', 'nutrients'],
      fitness: ['workout', 'exercise', 'training', 'fitness', 'muscle', 'strength'],
      meal_planning: ['meal plan', 'diet plan', 'breakfast', 'lunch', 'dinner', 'recipe'],
      recipe: ['recipe', 'cooking', 'ingredients', 'preparation', 'cook'],
    };

    let bestDomain = 'general_wellness';
    let bestScore = 0.3;

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      const matches = keywords.filter((keyword) => lowerMessage.includes(keyword)).length;
      const score = matches / keywords.length;

      if (score > bestScore) {
        bestDomain = domain;
        bestScore = score;
      }
    }

    return {
      domain: bestDomain,
      confidence: bestScore,
      isInScope: this.allowedDomains.includes(bestDomain) || bestDomain === 'general_wellness',
    };
  }

  private async handleOutOfScopeMessage(
    session: ChatSession,
    userMessage: ChatMessage,
    domainClassification: any,
  ): Promise<ChatResponse> {
    const outOfScopeResponse =
      "I'm a health and wellness coach focused on nutrition, fitness, and health topics. I can help you with meal planning, workout routines, health reports, and wellness questions. Could you please ask something related to your health and fitness goals?";

    userMessage.processingStatus = MessageProcessingStatus.OUT_OF_SCOPE;
    await this.chatMessageRepository.save(userMessage);

    const assistantMessage = await this.createAssistantMessage(session, outOfScopeResponse, {
      domainClassification,
      processingStatus: MessageProcessingStatus.OUT_OF_SCOPE,
    });

    return {
      success: true,
      sessionId: session.id,
      messageId: assistantMessage.id,
      response: outOfScopeResponse,
      metadata: {
        processingTime: 100,
        domainClassification,
        languageDetection: { detected: 'en', confidence: 1.0 },
        cost: 0,
        routingDecision: { level: 'L2', provider: 'none', model: 'rule_based' },
      },
    };
  }

  private getDomainContextTypes(domain: string): string[] {
    const contextMap = {
      health_reports: ['health_report', 'measurement'],
      nutrition: ['nutrition_log', 'recipe', 'knowledge_base'],
      fitness: ['fitness_plan', 'workout_log', 'knowledge_base'],
      meal_planning: ['meal_plan', 'recipe', 'nutrition_log'],
      recipe: ['recipe', 'nutrition_log'],
      general_wellness: ['user_profile', 'knowledge_base'],
    };

    return contextMap[domain] || ['user_profile', 'knowledge_base'];
  }

  private determineRoutingLevel(domain: string, message: string): 'L1' | 'L2' {
    // Enhanced Level 1/Level 2 routing based on user requirements
    
    // Level 1 API triggers (Health-critical queries)
    const level1Keywords = [
      // Health report specific
      'health report', 'report says', 'my report', 'summarize report', 'report summary',
      // Micronutrient questions  
      'micronutrient', 'vitamin deficiency', 'mineral deficiency', 'lacking', 'deficient',
      'vitamin d', 'iron deficiency', 'b12', 'folate', 'calcium', 
      // Biomarker interpretation
      'blood test', 'lab results', 'biomarker', 'cholesterol', 'blood sugar', 'hba1c',
      'liver function', 'kidney function', 'thyroid', 'hemoglobin',
      // Health condition analysis
      'health condition', 'medical condition', 'diagnosis', 'what condition',
      'health issue', 'health problem', 'medical issue',
      // Health summaries
      'health summary', 'overall health', 'health status', 'health assessment',
    ];

    // Level 2 API triggers (Cost-optimized queries) 
    const level2Keywords = [
      // Diet and meal planning
      'diet plan', 'meal plan', 'diet recommendation', 'what to eat', 'food suggestion',
      'menu', 'recipe', 'cooking', 'meal prep', 'nutrition plan',
      // General goals and lifestyle
      'fitness goal', 'weight loss', 'weight gain', 'muscle gain', 'goal',
      'exercise', 'workout', 'fitness', 'activity', 'lifestyle',
      'wellness', 'general health', 'healthy living', 'habit',
      // General wellness advice
      'advice', 'suggestion', 'tip', 'recommendation', 'how to',
      'should i', 'can i', 'general question',
    ];

    const messageLower = message.toLowerCase();
    
    // Check for Level 1 keywords (health report analysis)
    const hasLevel1Keywords = level1Keywords.some(keyword => messageLower.includes(keyword));
    
    // Check for Level 2 keywords (general wellness)  
    const hasLevel2Keywords = level2Keywords.some(keyword => messageLower.includes(keyword));
    
    // Health reports domain always uses Level 1
    if (domain === 'health_reports' || hasLevel1Keywords) {
      return 'L1';
    }
    
    // Nutrition/meal planning domains use Level 2 unless health-report specific
    if (domain === 'nutrition' || domain === 'meal_planning' || hasLevel2Keywords) {
      return 'L2';
    }
    
    // Default: If health domain but not specific enough, use Level 1 for safety
    if (domain === 'health') {
      return 'L1';
    }
    
    // All other general queries use Level 2
    return 'L2';
  }

  private async buildAIRequest(
    userId: string,
    message: string,
    ragContext: any,
    domainClassification: any,
    routingLevel: 'L1' | 'L2',
    session: ChatSession,
  ): Promise<AIRoutingRequest> {
    const requestType =
      routingLevel === 'L1' ? RequestType.HEALTH_REPORT_ANALYSIS : RequestType.GENERAL_CHAT;

    // Build system prompt with domain context and RAG information
    const systemPrompt = this.buildSystemPrompt(domainClassification.domain, ragContext);

    return {
      requestType,
      userId,
      sessionId: session.id,
      contextTokens: Math.ceil(message.length / 4), // Rough estimate
      maxResponseTokens: 1000,
      accuracyRequirement: routingLevel === 'L1' ? 0.95 : 0.85,
    };
  }

  private buildSystemPrompt(domain: string, ragContext: any): string {
    let basePrompt = `You are a helpful health and wellness AI assistant focused on ${domain}. `;

    const domainPrompts = {
      health_reports:
        'You help users understand their health reports and provide evidence-based insights about biomarkers and health conditions.',
      nutrition:
        'You provide scientifically-backed nutrition advice, meal suggestions, and dietary guidance.',
      fitness:
        'You help create and adapt fitness plans, explain exercises, and provide workout guidance.',
      meal_planning:
        'You help users plan healthy, balanced meals that fit their dietary preferences and health goals.',
      recipe: 'You provide healthy recipe suggestions and cooking guidance.',
      general_wellness: 'You provide general health and wellness advice.',
    };

    basePrompt += domainPrompts[domain] || domainPrompts.general_wellness;

    basePrompt += '\n\nIMPORTANT GUIDELINES:\n';
    basePrompt += '- Only answer questions related to health, nutrition, fitness, and wellness\n';
    basePrompt +=
      '- If asked about topics outside your domain, politely redirect to health/wellness topics\n';
    basePrompt += '- Always cite sources when available in your knowledge base\n';
    basePrompt +=
      '- Suggest actionable steps when appropriate, but ask for confirmation before executing actions\n';
    basePrompt += '- Be encouraging and supportive while providing accurate information\n';

    if (ragContext.sources.length > 0) {
      basePrompt += '\n\nRELEVANT CONTEXT:\n';
      ragContext.sources.forEach((source: any, index: number) => {
        basePrompt += `${index + 1}. [${source.title}]: ${source.excerpt}\n`;
      });
    }

    return basePrompt;
  }

  private async processAIResponse(
    response: string,
    ragContext: any,
    domainClassification: any,
  ): Promise<any> {
    // Parse response for action requests and follow-up questions
    const actionRequests = this.extractActionRequests(response);
    const followUpQuestions = this.extractFollowUpQuestions(response);

    // Clean response of action markers
    const cleanedResponse = this.cleanResponseContent(response);

    return {
      content: cleanedResponse,
      actionRequests,
      followUpQuestions,
    };
  }

  private extractActionRequests(response: string): any[] {
    // Simple pattern matching for action requests
    // In production, this would be more sophisticated
    const actions = [];

    if (response.includes('[ACTION:LOG_MEAL]')) {
      actions.push({
        actionType: 'log_meal',
        description: 'Log this meal in your nutrition diary',
        parameters: {},
        requiresConfirmation: true,
        status: 'pending',
      });
    }

    if (response.includes('[ACTION:UPDATE_PROFILE]')) {
      actions.push({
        actionType: 'update_profile',
        description: 'Update your profile with new information',
        parameters: {},
        requiresConfirmation: true,
        status: 'pending',
      });
    }

    return actions;
  }

  private extractFollowUpQuestions(response: string): string[] {
    // Extract suggested follow-up questions
    const followUpPattern = /\[FOLLOWUP:([^\]]+)\]/g;
    const matches = [];
    let match;

    while ((match = followUpPattern.exec(response)) !== null) {
      matches.push(match[1].trim());
    }

    return matches;
  }

  private cleanResponseContent(response: string): string {
    // Remove action markers and follow-up markers from the response
    return response
      .replace(/\[ACTION:[^\]]+\]/g, '')
      .replace(/\[FOLLOWUP:[^\]]+\]/g, '')
      .trim();
  }

  private buildCitations(sources: any[]): string[] {
    return sources.map(
      (source) => `${source.title} (Relevance: ${(source.relevanceScore * 100).toFixed(1)}%)`,
    );
  }

  private async createUserMessage(
    session: ChatSession,
    content: string,
    metadata: any,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      sessionId: session.id,
      type: MessageType.USER,
      content,
      originalContent: content,
      processedContent: metadata.processedContent,
      metadata,
      processingStatus: MessageProcessingStatus.COMPLETED,
    });

    return await this.chatMessageRepository.save(message);
  }

  private async createAssistantMessage(
    session: ChatSession,
    content: string,
    metadata: any,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      sessionId: session.id,
      type: MessageType.ASSISTANT,
      content,
      metadata,
      processingStatus: MessageProcessingStatus.COMPLETED,
      tokenCount: content.length / 4, // Rough estimate
      costUsd: metadata.routingDecision?.cost || 0,
      processingTimeMs: metadata.performance?.processingTimeMs || 0,
    });

    return await this.chatMessageRepository.save(message);
  }

  private async executeSpecificAction(action: any, userId: string): Promise<any> {
    // This would integrate with specific domain services
    switch (action.actionType) {
      case 'log_meal':
        // Integrate with meal logging service
        return { message: 'Meal logging integration pending' };

      case 'update_profile':
        // Integrate with user profile service
        return { message: 'Profile update integration pending' };

      case 'schedule_workout':
        // Integrate with fitness planning service
        return { message: 'Workout scheduling integration pending' };

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  /**
   * Estimate token usage for a request
   */
  private estimateTokenUsage(content: string, ragContext: any): number {
    // Rough estimation: 1 token ≈ 4 characters
    const inputTokens = Math.ceil(content.length / 4);
    const ragTokens = ragContext.sources
      ? Math.ceil(ragContext.sources.reduce((sum, source) => sum + source.content.length, 0) / 4)
      : 0;
    const expectedOutputTokens = 500; // Typical response length

    return inputTokens + ragTokens + expectedOutputTokens;
  }

  /**
   * Calculate actual token usage from request and response
   */
  private calculateActualTokenUsage(inputContent: string, outputContent: string): number {
    // More accurate calculation based on actual content
    const inputTokens = Math.ceil(inputContent.length / 4);
    const outputTokens = Math.ceil(outputContent.length / 4);

    return inputTokens + outputTokens;
  }

  /**
   * Generate follow-up questions based on smart query category
   */
  private generateSmartFollowUps(category: string): string[] {
    const followUpMap = {
      fitness: [
        'How can I improve my daily activity?',
        'What exercises would be best for me?',
        'Can you suggest a workout plan?',
      ],
      health: [
        'How can I improve this health metric?',
        'What should I monitor regularly?',
        'Are there any trends in my health data?',
      ],
      nutrition: [
        'What foods should I focus on?',
        'How can I improve my nutrition?',
        'Can you suggest healthy meal ideas?',
      ],
      general: [
        'What other health metrics should I track?',
        'How can I improve my overall wellness?',
        'Can you help me set health goals?',
      ],
    };

    return followUpMap[category] || followUpMap.general;
  }

  /**
   * Map AI provider to token provider enum
   */
  private mapAIProviderToTokenProvider(aiProvider: string): TokenProvider {
    const mapping = {
      openai: TokenProvider.OPENAI_GPT4,
      anthropic: TokenProvider.ANTHROPIC_CLAUDE,
      huggingface: TokenProvider.HUGGINGFACE_FREE,
      groq: TokenProvider.GROQ_FREE,
    };

    return mapping[aiProvider] || TokenProvider.GROQ_FREE;
  }

  /**
   * Check Level 1 health insights cache for previous AI responses
   * This implements the major cost-saving feature requested
   */
  private async checkLevel1Cache(
    userId: string,
    message: string,
    domainClassification: any
  ): Promise<{
    response: string;
    insightId: string;
    confidence: number;
    category: string;
    originalCost: number;
  } | null> {
    try {
      // Get cached health insights
      const healthInsights = await this.healthInsightsService.getHealthInsights(userId);
      
      if (!healthInsights.cacheHit || healthInsights.insights.length === 0) {
        return null; // No cache hit
      }

      // Find matching insight based on query content
      const matchingInsight = this.findMatchingHealthInsight(message, healthInsights.insights);
      
      if (matchingInsight) {
        this.logger.debug(`Level 1 cache hit for user ${userId} - Cost savings achieved!`);
        
        return {
          response: this.formatHealthInsightResponse(matchingInsight, message),
          insightId: matchingInsight.id,
          confidence: matchingInsight.metadata?.aiMetadata?.confidence || 0.9,
          category: matchingInsight.category,
          originalCost: matchingInsight.metadata?.aiMetadata?.cost || 0.02,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error checking Level 1 cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Find health insight that matches the user's query
   */
  private findMatchingHealthInsight(message: string, insights: HealthInsight[]): HealthInsight | null {
    const messageLower = message.toLowerCase();
    
    // Direct matches for different query types
    const queryPatterns = [
      // Micronutrient queries
      { pattern: ['vitamin d', 'deficient', 'lacking'], category: InsightCategory.MICRONUTRIENT_DEFICIENCY },
      { pattern: ['iron', 'deficiency', 'anemia'], category: InsightCategory.MICRONUTRIENT_DEFICIENCY },
      { pattern: ['b12', 'vitamin b12', 'deficiency'], category: InsightCategory.MICRONUTRIENT_DEFICIENCY },
      { pattern: ['micronutrient', 'nutrient', 'lacking', 'deficient'], category: InsightCategory.MICRONUTRIENT_DEFICIENCY },
      
      // Health condition queries
      { pattern: ['health condition', 'condition', 'diagnosis'], category: InsightCategory.HEALTH_CONDITION },
      { pattern: ['cholesterol', 'high cholesterol'], category: InsightCategory.HEALTH_CONDITION },
      { pattern: ['diabetes', 'blood sugar'], category: InsightCategory.HEALTH_CONDITION },
      
      // Biomarker queries
      { pattern: ['blood test', 'lab results', 'biomarker'], category: InsightCategory.BIOMARKER_ANALYSIS },
      { pattern: ['liver function', 'alt', 'ast'], category: InsightCategory.BIOMARKER_ANALYSIS },
      
      // Health summary queries
      { pattern: ['health summary', 'overall health', 'health status'], category: InsightCategory.HEALTH_SUMMARY },
      { pattern: ['report says', 'my report', 'summarize'], category: InsightCategory.HEALTH_SUMMARY },
    ];

    // Find best matching insight
    for (const pattern of queryPatterns) {
      const hasPatternMatch = pattern.pattern.some(p => messageLower.includes(p));
      if (hasPatternMatch) {
        const matchingInsights = insights.filter(i => i.category === pattern.category && i.isActive);
        if (matchingInsights.length > 0) {
          // Return most recent matching insight
          return matchingInsights.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
        }
      }
    }

    // Fallback: find any relevant insight based on title/content matching
    for (const insight of insights) {
      if (!insight.isActive) continue;
      
      const titleLower = insight.title.toLowerCase();
      const insightLower = insight.insight.toLowerCase();
      
      // Check if query relates to this insight
      const queryWords = messageLower.split(' ').filter(word => word.length > 3);
      const relevanceScore = queryWords.reduce((score, word) => {
        if (titleLower.includes(word) || insightLower.includes(word)) {
          return score + 1;
        }
        return score;
      }, 0);
      
      if (relevanceScore >= 2) { // At least 2 matching words
        return insight;
      }
    }

    return null;
  }

  /**
   * Format cached health insight as a natural response
   */
  private formatHealthInsightResponse(insight: HealthInsight, originalQuery: string): string {
    const queryLower = originalQuery.toLowerCase();
    
    // Customize response based on query type
    if (queryLower.includes('report says') || queryLower.includes('summarize')) {
      return `Based on your health report analysis: ${insight.insight}\n\n${insight.recommendation ? `Recommendation: ${insight.recommendation}` : ''}`;
    }
    
    if (queryLower.includes('deficient') || queryLower.includes('lacking')) {
      if (insight.category === InsightCategory.MICRONUTRIENT_DEFICIENCY) {
        return `According to your health report, ${insight.insight}\n\n${insight.recommendation ? `To address this: ${insight.recommendation}` : ''}`;
      }
    }
    
    if (queryLower.includes('condition') || queryLower.includes('health issue')) {
      return `Based on your health analysis: ${insight.insight}\n\n${insight.recommendation ? `Management advice: ${insight.recommendation}` : ''}`;
    }
    
    // Default formatting
    return `From your health report analysis:\n\n**${insight.title}**\n${insight.insight}\n\n${insight.recommendation ? `💡 **Recommendation:** ${insight.recommendation}` : ''}`;
  }

  /**
   * Generate follow-up questions based on health insight category  
   */
  private generateHealthInsightFollowUps(category: string): string[] {
    const followUpMap = {
      [InsightCategory.MICRONUTRIENT_DEFICIENCY]: [
        'How can I improve this nutrient level naturally?',
        'What foods are rich in this nutrient?',
        'Should I consider supplements?',
        'How long will it take to improve this deficiency?'
      ],
      [InsightCategory.HEALTH_CONDITION]: [
        'What lifestyle changes can help with this condition?',
        'How can I monitor this condition at home?',
        'What diet modifications would be beneficial?'
      ],
      [InsightCategory.BIOMARKER_ANALYSIS]: [
        'How often should I test this biomarker?',
        'What factors can affect this biomarker?',
        'Are there any trends I should watch?'
      ],
      [InsightCategory.HEALTH_SUMMARY]: [
        'What are my priority health areas to focus on?',
        'How can I track my overall health progress?',
        'What should I discuss with my doctor?'
      ]
    };

    return followUpMap[category] || [
      'Can you create a diet plan based on my health report?',
      'What other health insights can you share?',
      'How can I improve my overall health?'
    ];
  }

  /**
   * Store Level 1 AI response for future caching
   * Called after new Level 1 AI responses are generated
   */
  private async storeLevel1Response(
    userId: string, 
    message: string, 
    aiResponse: string,
    category: InsightCategory,
    aiCost: number
  ): Promise<void> {
    try {
      // Extract key insights from AI response to store as structured data
      const insights = this.extractInsightsFromAIResponse(aiResponse, message, category);
      
      if (insights.length > 0) {
        await this.healthInsightsService.storeHealthAnalysis(userId, insights, undefined, aiCost);
        this.logger.debug(`Stored ${insights.length} Level 1 insights for future caching`);
      }
    } catch (error) {
      this.logger.error(`Error storing Level 1 response: ${error.message}`);
    }
  }

  /**
   * Extract structured insights from AI response text
   */
  private extractInsightsFromAIResponse(
    response: string, 
    originalQuery: string, 
    category: InsightCategory
  ): Partial<HealthInsight>[] {
    // This is a simplified extraction - in production would use more sophisticated NLP
    const insights: Partial<HealthInsight>[] = [];
    
    // Extract main insight and recommendation
    const sentences = response.split('.').map(s => s.trim()).filter(s => s.length > 10);
    
    if (sentences.length >= 2) {
      const insight = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ');
      const recommendation = sentences.slice(Math.ceil(sentences.length / 2)).join('. ');
      
      insights.push({
        category,
        title: this.generateInsightTitle(originalQuery, category),
        insight: insight + '.',
        recommendation: recommendation ? recommendation + '.' : undefined,
        severity: this.determineSeverityFromResponse(response),
      });
    }
    
    return insights;
  }

  private generateInsightTitle(query: string, category: InsightCategory): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('vitamin d')) return 'Vitamin D Analysis';
    if (queryLower.includes('iron')) return 'Iron Status Analysis';
    if (queryLower.includes('b12')) return 'Vitamin B12 Analysis';
    if (queryLower.includes('cholesterol')) return 'Cholesterol Analysis';
    if (queryLower.includes('diabetes') || queryLower.includes('blood sugar')) return 'Blood Sugar Analysis';
    
    // Default titles by category
    const defaultTitles = {
      [InsightCategory.MICRONUTRIENT_DEFICIENCY]: 'Nutrient Analysis',
      [InsightCategory.BIOMARKER_ANALYSIS]: 'Biomarker Analysis', 
      [InsightCategory.HEALTH_CONDITION]: 'Health Condition Analysis',
      [InsightCategory.DIETARY_RECOMMENDATION]: 'Dietary Recommendations',
      [InsightCategory.HEALTH_SUMMARY]: 'Health Summary'
    };
    
    return defaultTitles[category] || 'Health Analysis';
  }

  private determineSeverityFromResponse(response: string): InsightSeverity {
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('urgent') || responseLower.includes('critical') || responseLower.includes('severe')) {
      return InsightSeverity.URGENT;
    }
    if (responseLower.includes('high') || responseLower.includes('elevated') || responseLower.includes('concerning')) {
      return InsightSeverity.HIGH;
    }
    if (responseLower.includes('moderate') || responseLower.includes('mild')) {
      return InsightSeverity.MEDIUM;
    }
    
    return InsightSeverity.LOW;
  }

  /**
   * Map domain classification to insight category
   */
  private mapDomainToInsightCategory(domain: string): InsightCategory {
    const domainMap = {
      'health_reports': InsightCategory.HEALTH_SUMMARY,
      'health': InsightCategory.BIOMARKER_ANALYSIS,
      'nutrition': InsightCategory.DIETARY_RECOMMENDATION,
      'micronutrients': InsightCategory.MICRONUTRIENT_DEFICIENCY,
    };
    
    return domainMap[domain] || InsightCategory.HEALTH_SUMMARY;
  }
}
