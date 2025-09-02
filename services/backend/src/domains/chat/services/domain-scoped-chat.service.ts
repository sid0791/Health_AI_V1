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

// Enhanced health analysis and timeline diet planning
import {
  HealthAnalysisCacheService,
  HealthAnalysisType,
  CachedAnalysisResult,
} from './health-analysis-cache.service';
import {
  TimelineDietPlanningService,
  DietAdaptationRequest,
  TimelineDietPlan,
} from './timeline-diet-planning.service';

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
    private readonly healthAnalysisCacheService: HealthAnalysisCacheService,
    private readonly timelineDietPlanningService: TimelineDietPlanningService,
  ) {}

  /**
   * Process a chat message with enhanced Level 1/Level 2 AI routing and health analysis caching
   */
  async processMessage(userId: string, request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    this.logger.log(`Processing chat message for user ${userId}`);

    try {
      // Get or create chat session
      const session = await this.getOrCreateSession(userId, request);

      // Process the user's message with Hinglish NLP
      const processedMessage = await this.hinglishNLPService.processMessage(request.message);

      // Classify domain and determine if this is a Level 1 (health-critical) or Level 2 (general) request
      const domainClassification = await this.classifyDomain(processedMessage.content);
      const aiRoutingLevel = this.determineAIRoutingLevel(domainClassification.domain);

      this.logger.debug(
        `Domain: ${domainClassification.domain}, AI Level: ${aiRoutingLevel}, Confidence: ${domainClassification.confidence}`,
      );

      // **LEVEL 1 ROUTING**: Health reports, biomarkers, deficiencies (highest accuracy + cached analysis)
      if (aiRoutingLevel === 'L1') {
        return await this.processLevel1HealthQuery(
          userId,
          session,
          processedMessage,
          domainClassification,
          request,
          startTime,
        );
      }

      // **LEVEL 2 ROUTING**: Diet plans, general wellness (cost-optimized + timeline-based planning)
      return await this.processLevel2GeneralQuery(
        userId,
        session,
        processedMessage,
        domainClassification,
        request,
        startTime,
      );
    } catch (error) {
      this.logger.error(`Error processing chat message for user ${userId}:`, error);
      throw new BadRequestException(`Chat processing failed: ${error.message}`);
    }
  }

  /**
   * Process Level 1 (health-critical) queries with cached analysis and highest accuracy AI
   */
  private async processLevel1HealthQuery(
    userId: string,
    session: ChatSession,
    processedMessage: any,
    domainClassification: any,
    request: ChatRequest,
    startTime: number,
  ): Promise<ChatResponse> {
    this.logger.debug(`Processing Level 1 health query for user ${userId}`);

    // Determine the type of health analysis needed
    const analysisType = this.mapDomainToAnalysisType(domainClassification.domain);

    // **CHECK HEALTH ANALYSIS CACHE FIRST** - This is the key optimization
    const cachedAnalysis = await this.healthAnalysisCacheService.getHealthAnalysis(
      userId,
      processedMessage.content,
      analysisType,
      request.context?.healthReportId,
    );

    // Create user message record
    const userMessage = await this.createUserMessage(session, request.message, {
      processedContent: processedMessage.content,
      languageDetection: processedMessage.languageDetection,
      domainClassification,
      hinglishProcessing: processedMessage.metadata,
      aiRoutingLevel: 'L1',
      analysisType,
    });

    // If we have cached analysis, return it immediately (major cost & time savings)
    if (cachedAnalysis.fromCache) {
      this.logger.log(`Using cached Level 1 health analysis for user ${userId}: ${analysisType}`);

      // Create assistant message with cached response
      const assistantMessage = await this.createAssistantMessage(session, cachedAnalysis.response, {
        healthAnalysisCache: {
          fromCache: true,
          analysisType: cachedAnalysis.analysisType,
          confidence: cachedAnalysis.confidence,
          lastAnalyzed: cachedAnalysis.lastAnalyzed,
          validUntil: cachedAnalysis.validUntil,
        },
        domainClassification,
        languageDetection: processedMessage.languageDetection,
        routingDecision: {
          level: 'L1',
          provider: 'cached_analysis',
          model: cachedAnalysis.aiModel,
        },
        performance: {
          processingTimeMs: Date.now() - startTime,
          tokenCount: 0, // No new AI tokens used
          retrievalTimeMs: 50, // Fast cache retrieval
          generationTimeMs: 0,
        },
        tokenUsage: {
          tokensUsed: 0,
          usedFreeTier: true,
          cost: 0,
        },
        healthInsights: cachedAnalysis.insights,
      });

      // Update session activity
      session.incrementMessageCount();
      await this.chatSessionRepository.save(session);

      return {
        success: true,
        sessionId: session.id,
        messageId: assistantMessage.id,
        response: cachedAnalysis.response,
        metadata: {
          processingTime: Date.now() - startTime,
          domainClassification,
          languageDetection: processedMessage.languageDetection,
          ragContext: { documentsUsed: 0, sources: [] },
          actionRequests: this.extractHealthActionRequests(cachedAnalysis.insights),
          cost: 0,
          routingDecision: {
            level: 'L1',
            provider: 'cached_analysis',
            model: cachedAnalysis.aiModel,
          },
        },
        citations: ['Cached health report analysis'],
        followUpQuestions: this.generateHealthFollowUps(cachedAnalysis.insights),
      };
    }

    // If no cached analysis, generate new Level 1 AI analysis (high cost but highest accuracy)
    this.logger.debug(`No cached analysis found. Generating new Level 1 AI analysis for user ${userId}`);
    
    // This would be a full Level 1 AI call with highest accuracy routing
    // For now, we return the newly generated analysis from the cache service
    const assistantMessage = await this.createAssistantMessage(session, cachedAnalysis.response, {
      healthAnalysisCache: {
        fromCache: false,
        analysisType: cachedAnalysis.analysisType,
        confidence: cachedAnalysis.confidence,
        lastAnalyzed: cachedAnalysis.lastAnalyzed,
        validUntil: cachedAnalysis.validUntil,
      },
      domainClassification,
      languageDetection: processedMessage.languageDetection,
      routingDecision: {
        level: 'L1',
        provider: cachedAnalysis.aiProvider,
        model: cachedAnalysis.aiModel,
      },
      performance: {
        processingTimeMs: Date.now() - startTime,
        tokenCount: 2500, // Typical Level 1 analysis cost
        retrievalTimeMs: 200,
        generationTimeMs: 3000, // Level 1 takes longer for accuracy
      },
      tokenUsage: {
        tokensUsed: 2500,
        usedFreeTier: false,
        cost: 0.05, // Estimated Level 1 cost
      },
      healthInsights: cachedAnalysis.insights,
    });

    // Update session activity
    session.incrementMessageCount();
    await this.chatSessionRepository.save(session);

    return {
      success: true,
      sessionId: session.id,
      messageId: assistantMessage.id,
      response: cachedAnalysis.response,
      metadata: {
        processingTime: Date.now() - startTime,
        domainClassification,
        languageDetection: processedMessage.languageDetection,
        ragContext: { documentsUsed: 0, sources: [] },
        actionRequests: this.extractHealthActionRequests(cachedAnalysis.insights),
        cost: 0.05,
        routingDecision: {
          level: 'L1',
          provider: cachedAnalysis.aiProvider,
          model: cachedAnalysis.aiModel,
        },
      },
      citations: ['New health report analysis'],
      followUpQuestions: this.generateHealthFollowUps(cachedAnalysis.insights),
    };
  }

  /**
   * Process Level 2 (cost-optimized) queries with timeline-based diet planning
   */
  private async processLevel2GeneralQuery(
    userId: string,
    session: ChatSession,
    processedMessage: any,
    domainClassification: any,
    request: ChatRequest,
    startTime: number,
  ): Promise<ChatResponse> {
    this.logger.debug(`Processing Level 2 general query for user ${userId}`);

    // **CHECK SMART QUERY CACHE FIRST** for Level 2 queries
    const smartResponse = await this.smartQueryCacheService.processQuery(
      userId,
      processedMessage.content,
      session.id,
    );

    // Create user message record
    const userMessage = await this.createUserMessage(session, request.message, {
      processedContent: processedMessage.content,
      languageDetection: processedMessage.languageDetection,
      domainClassification,
      hinglishProcessing: processedMessage.metadata,
      aiRoutingLevel: 'L2',
      smartCacheResult: smartResponse,
    });

    // If smart cache has the answer, use it
    if (smartResponse) {
      this.logger.log(`Using Level 2 smart cache for user ${userId}`);

      const assistantMessage = await this.createAssistantMessage(session, smartResponse.response, {
        smartQueryCache: {
          fromCache: smartResponse.fromCache,
          dataSource: smartResponse.dataSource,
          confidence: smartResponse.confidence,
          category: smartResponse.category,
        },
        domainClassification,
        languageDetection: processedMessage.languageDetection,
        routingDecision: { level: 'L2', provider: 'smart_cache', model: 'local_data' },
        performance: {
          processingTimeMs: Date.now() - startTime,
          tokenCount: 0,
          retrievalTimeMs: 30,
          generationTimeMs: 0,
        },
        tokenUsage: { tokensUsed: 0, usedFreeTier: true, cost: 0 },
      });

      session.incrementMessageCount();
      await this.chatSessionRepository.save(session);

      return {
        success: true,
        sessionId: session.id,
        messageId: assistantMessage.id,
        response: smartResponse.response,
        metadata: {
          processingTime: Date.now() - startTime,
          domainClassification,
          languageDetection: processedMessage.languageDetection,
          ragContext: { documentsUsed: 0, sources: [] },
          actionRequests: [],
          cost: 0,
          routingDecision: { level: 'L2', provider: 'smart_cache', model: 'local_data' },
        },
        citations: smartResponse.dataSource === 'local' ? ['Local health data'] : [],
        followUpQuestions: this.generateSmartFollowUps(smartResponse.category),
      };
    }

    // For diet/meal planning queries, use timeline-based planning with stored health insights
    if (this.isDietPlanningQuery(processedMessage.content)) {
      return await this.processTimelineDietQuery(
        userId,
        session,
        processedMessage,
        domainClassification,
        startTime,
      );
    }

    // **REGULAR LEVEL 2 AI ROUTING** (cost-optimized)
    return await this.processRegularLevel2Query(
      userId,
      session,
      processedMessage,
      domainClassification,
      request,
      startTime,
    );
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

  private determineRoutingLevel(domain: string): 'L1' | 'L2' {
    // Health reports and medical-related queries use Level 1 (highest accuracy)
    const level1Domains = ['health_reports', 'health'];
    return level1Domains.includes(domain) ? 'L1' : 'L2';
  }

  /**
   * Enhanced AI routing level determination based on domain and query content
   */
  private determineAIRoutingLevel(domain: string): 'L1' | 'L2' {
    // Level 1: Health reports, biomarkers, medical analysis (highest accuracy, rate limited)
    const level1Domains = [
      'health_reports',
      'health_report_analysis',
      'biomarker_analysis',
      'nutrient_deficiency',
      'micronutrient_status',
      'health_risk_assessment',
      'metabolic_analysis',
      'hormone_analysis',
      'medical_consultation',
    ];

    // Level 2: Diet plans, meal planning, general wellness (cost-optimized)
    const level2Domains = [
      'nutrition',
      'meal_planning',
      'recipe',
      'fitness',
      'workout_planning',
      'general_wellness',
      'lifestyle',
    ];

    if (level1Domains.includes(domain)) {
      return 'L1';
    }

    return 'L2'; // Default to cost-optimized Level 2
  }

  /**
   * Map domain classification to health analysis type
   */
  private mapDomainToAnalysisType(domain: string): HealthAnalysisType {
    const mapping = {
      health_reports: HealthAnalysisType.HEALTH_REPORT_SUMMARY,
      health_report_analysis: HealthAnalysisType.HEALTH_REPORT_SUMMARY,
      biomarker_analysis: HealthAnalysisType.BIOMARKER_ANALYSIS,
      nutrient_deficiency: HealthAnalysisType.NUTRIENT_DEFICIENCY,
      micronutrient_status: HealthAnalysisType.MICRONUTRIENT_STATUS,
      metabolic_analysis: HealthAnalysisType.METABOLIC_ANALYSIS,
      hormone_analysis: HealthAnalysisType.HORMONE_ANALYSIS,
      health_risk_assessment: HealthAnalysisType.HEALTH_RISK_ASSESSMENT,
    };

    return mapping[domain] || HealthAnalysisType.HEALTH_REPORT_SUMMARY;
  }

  /**
   * Check if query is about diet/meal planning
   */
  private isDietPlanningQuery(message: string): boolean {
    const dietKeywords = [
      'diet plan',
      'meal plan',
      'what should I eat',
      'food recommendations',
      'nutrition plan',
      'create diet',
      'meal suggestions',
      'healthy eating plan',
    ];

    const lowerMessage = message.toLowerCase();
    return dietKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Process timeline-based diet planning queries using stored health insights
   */
  private async processTimelineDietQuery(
    userId: string,
    session: ChatSession,
    processedMessage: any,
    domainClassification: any,
    startTime: number,
  ): Promise<ChatResponse> {
    this.logger.debug(`Processing timeline diet query for user ${userId}`);

    try {
      // Get or generate timeline diet plan based on stored health insights
      let dietPlan = await this.timelineDietPlanningService.getCurrentDietPlan(userId);
      
      if (!dietPlan) {
        this.logger.debug(`No existing diet plan found. Generating new plan for user ${userId}`);
        dietPlan = await this.timelineDietPlanningService.generateTimelineDietPlan(userId);
      }

      // Check if plan needs adaptation
      const transitionCheck = await this.timelineDietPlanningService.checkMaintenanceTransition(userId);

      // Generate response based on current diet plan and health insights
      const response = this.generateDietPlanResponse(dietPlan, transitionCheck, processedMessage.content);

      const assistantMessage = await this.createAssistantMessage(session, response, {
        timelineDietPlan: {
          planId: dietPlan.id,
          planName: dietPlan.planName,
          currentPhase: this.getCurrentPhase(dietPlan),
          totalDuration: dietPlan.totalDuration,
          basedOnInsights: dietPlan.basedOnInsights,
        },
        domainClassification,
        routingDecision: {
          level: 'L2',
          provider: 'timeline_diet_planner',
          model: 'health_insights_based',
        },
        performance: {
          processingTimeMs: Date.now() - startTime,
          tokenCount: 0, // Using stored analysis, no new AI tokens
          retrievalTimeMs: 100,
          generationTimeMs: 0,
        },
        tokenUsage: {
          tokensUsed: 0,
          usedFreeTier: true,
          cost: 0,
        },
      });

      // Update session activity
      session.incrementMessageCount();
      await this.chatSessionRepository.save(session);

      return {
        success: true,
        sessionId: session.id,
        messageId: assistantMessage.id,
        response,
        metadata: {
          processingTime: Date.now() - startTime,
          domainClassification,
          languageDetection: { detected: 'en', confidence: 1.0 },
          ragContext: { documentsUsed: 0, sources: [] },
          actionRequests: this.extractDietPlanActions(dietPlan, transitionCheck),
          cost: 0,
          routingDecision: {
            level: 'L2',
            provider: 'timeline_diet_planner',
            model: 'health_insights_based',
          },
        },
        citations: ['Personalized timeline diet plan based on health analysis'],
        followUpQuestions: this.generateDietPlanFollowUps(dietPlan, transitionCheck),
      };
    } catch (error) {
      this.logger.error(`Error processing timeline diet query for user ${userId}:`, error);
      // Fallback to regular Level 2 processing
      return await this.processRegularLevel2Query(
        userId,
        session,
        processedMessage,
        domainClassification,
        { message: processedMessage.content },
        startTime,
      );
    }
  }

  /**
   * Process regular Level 2 queries with cost-optimized AI routing
   */
  private async processRegularLevel2Query(
    userId: string,
    session: ChatSession,
    processedMessage: any,
    domainClassification: any,
    request: any,
    startTime: number,
  ): Promise<ChatResponse> {
    this.logger.debug(`Processing regular Level 2 query for user ${userId}`);

    // Apply privacy and compliance checks
    const dlpProcessedContent = await this.dlpService.processText(processedMessage.content);

    // Get RAG context
    const ragContext = await this.ragService.retrieveContext(
      userId,
      processedMessage.content,
      domainClassification.domain,
      {
        maxDocuments: 3, // Less context for cost optimization
        relevanceThreshold: 0.8, // Higher threshold for Level 2
        contextTypes: this.getDomainContextTypes(domainClassification.domain),
      },
    );

    // Build Level 2 AI request (cost-optimized)
    const aiRequest: AIRoutingRequest = {
      requestType: RequestType.GENERAL_CHAT,
      userId,
      sessionId: session.id,
      contextTokens: Math.ceil(dlpProcessedContent.processedText.length / 4),
      maxResponseTokens: 800, // Shorter responses for cost efficiency
      accuracyRequirement: 0.85, // Lower accuracy requirement for cost optimization
      privacyLevel: 'standard', // Standard privacy for general queries
    };

    // Route to cost-optimized AI (Level 2)
    const aiResponse = await this.aiRoutingService.routeRequestWithUserTokens(aiRequest);

    // Mock response for now - would be actual AI response in production
    const mockResponse = this.generateMockLevel2Response(domainClassification.domain, processedMessage.content);

    const assistantMessage = await this.createAssistantMessage(session, mockResponse, {
      routingDecision: {
        level: 'L2',
        provider: aiResponse.provider,
        model: aiResponse.model,
      },
      ragContext: {
        documentsUsed: ragContext.metadata?.documentsRetrieved || 0,
        sources: ragContext.sources?.map((s) => ({
          title: s.title,
          excerpt: s.excerpt,
          relevanceScore: s.relevanceScore,
        })) || [],
      },
      domainClassification,
      performance: {
        processingTimeMs: Date.now() - startTime,
        tokenCount: 800,
        retrievalTimeMs: 150,
        generationTimeMs: 1000, // Faster Level 2 processing
      },
      tokenUsage: {
        tokensUsed: 800,
        usedFreeTier: aiResponse.usedFreeTier,
        cost: aiResponse.estimatedCost || 0.01, // Lower cost for Level 2
      },
    });

    // Update session activity
    session.incrementMessageCount();
    await this.chatSessionRepository.save(session);

    return {
      success: true,
      sessionId: session.id,
      messageId: assistantMessage.id,
      response: mockResponse,
      metadata: {
        processingTime: Date.now() - startTime,
        domainClassification,
        languageDetection: processedMessage.languageDetection,
        ragContext: {
          documentsUsed: ragContext.metadata?.documentsRetrieved || 0,
          sources: ragContext.sources?.map((s) => ({
            title: s.title,
            excerpt: s.excerpt,
            relevanceScore: s.relevanceScore,
          })) || [],
        },
        actionRequests: [],
        cost: aiResponse.estimatedCost || 0.01,
        routingDecision: {
          level: 'L2',
          provider: aiResponse.provider,
          model: aiResponse.model,
        },
      },
      citations: this.buildCitations(ragContext.sources || []),
      followUpQuestions: this.generateLevel2FollowUps(domainClassification.domain),
    };
  }

  /**
   * Extract health-specific action requests from insights
   */
  private extractHealthActionRequests(insights: any): any[] {
    const actions = [];

    if (insights?.deficiencies?.length > 0) {
      actions.push({
        actionType: 'create_nutrition_plan',
        description: 'Create a targeted nutrition plan to address identified deficiencies',
        requiresConfirmation: true,
        parameters: { deficiencies: insights.deficiencies.map(d => d.nutrient) },
      });
    }

    if (insights?.recommendations?.length > 0) {
      actions.push({
        actionType: 'schedule_health_followup',
        description: 'Schedule follow-up health test to track improvement',
        requiresConfirmation: true,
        parameters: { recommendations: insights.recommendations },
      });
    }

    return actions;
  }

  /**
   * Generate health-specific follow-up questions
   */
  private generateHealthFollowUps(insights: any): string[] {
    const followUps = [];

    if (insights?.deficiencies?.length > 0) {
      followUps.push(
        'Would you like a specific meal plan to address these deficiencies?',
        'How long have you been experiencing symptoms related to these deficiencies?',
      );
    }

    if (insights?.risks?.length > 0) {
      followUps.push(
        'What lifestyle changes would you like to focus on first?',
        'Do you have any family history of these health concerns?',
      );
    }

    followUps.push(
      'When was your last comprehensive health check?',
      'Are you currently taking any supplements or medications?',
    );

    return followUps;
  }

  /**
   * Generate diet plan response based on timeline and health insights
   */
  private generateDietPlanResponse(
    dietPlan: TimelineDietPlan,
    transitionCheck: any,
    userQuery: string,
  ): string {
    const currentPhase = this.getCurrentPhase(dietPlan);
    
    let response = `## Your Personalized ${dietPlan.planName}\n\n`;

    if (currentPhase) {
      response += `**Current Phase:** ${currentPhase.name} (Day ${this.getCurrentDay(dietPlan, currentPhase)} of ${currentPhase.duration})\n\n`;
      
      response += `**Primary Focus:** ${currentPhase.primaryFocus.join(', ')}\n\n`;
      
      response += `**Dietary Guidelines:**\n`;
      response += `• **Emphasize:** ${currentPhase.dietaryGuidelines.emphasize.join(', ')}\n`;
      response += `• **Limit:** ${currentPhase.dietaryGuidelines.limit.join(', ')}\n`;
      if (currentPhase.dietaryGuidelines.avoid?.length > 0) {
        response += `• **Avoid:** ${currentPhase.dietaryGuidelines.avoid.join(', ')}\n`;
      }
      
      response += `\n**Expected Progress:** ${currentPhase.expectedProgress}\n`;
    }

    // Add timeline information
    if (dietPlan.expectedOutcomes.length > 0) {
      response += `\n**Expected Outcomes:**\n`;
      dietPlan.expectedOutcomes.forEach(outcome => {
        const daysRemaining = Math.max(0, outcome.timelineToAchieve - this.getDaysElapsed(dietPlan));
        response += `• ${outcome.parameter}: Target ${outcome.targetValue} in ${daysRemaining} days\n`;
      });
    }

    // Add transition guidance if applicable
    if (transitionCheck.shouldTransition) {
      response += `\n🎉 **Great Progress!** ${transitionCheck.reason}\n\n`;
      response += `**Next Steps:**\n`;
      transitionCheck.recommendedActions.forEach((action, i) => {
        response += `${i + 1}. ${action}\n`;
      });
    }

    // Add reminders if any are upcoming
    const upcomingReminders = dietPlan.recheckReminders.filter(
      r => r.scheduledDate > new Date() && r.scheduledDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    
    if (upcomingReminders.length > 0) {
      response += `\n**Upcoming Reminders:**\n`;
      upcomingReminders.forEach(reminder => {
        response += `• ${reminder.description} (${reminder.scheduledDate.toLocaleDateString()})\n`;
      });
    }

    return response;
  }

  /**
   * Extract diet plan actions
   */
  private extractDietPlanActions(dietPlan: TimelineDietPlan, transitionCheck: any): any[] {
    const actions = [];

    if (transitionCheck.shouldTransition) {
      actions.push({
        actionType: 'schedule_health_test',
        description: 'Schedule comprehensive health test to verify improvements',
        requiresConfirmation: true,
      });

      actions.push({
        actionType: 'transition_to_maintenance',
        description: 'Transition to balanced maintenance diet',
        requiresConfirmation: true,
      });
    }

    // Add upcoming reminder actions
    const upcomingReminders = dietPlan.recheckReminders.filter(
      r => r.scheduledDate > new Date() && r.scheduledDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    upcomingReminders.forEach(reminder => {
      actions.push({
        actionType: 'reminder_action',
        description: reminder.description,
        requiresConfirmation: false,
      });
    });

    return actions;
  }

  /**
   * Generate diet plan follow-up questions
   */
  private generateDietPlanFollowUps(dietPlan: TimelineDietPlan, transitionCheck: any): string[] {
    const followUps = [];

    if (transitionCheck.shouldTransition) {
      followUps.push(
        'Are you ready to schedule a health test to verify your improvements?',
        'Would you like to set new health optimization goals?',
      );
    } else {
      followUps.push(
        'How is your adherence to the current dietary recommendations?',
        'Are you experiencing any challenges with the meal plan?',
        'Would you like specific recipes for your current phase?',
      );
    }

    followUps.push(
      'Do you need help with meal prep for this phase?',
      'Any questions about the nutritional guidelines?',
    );

    return followUps;
  }

  /**
   * Get current phase of diet plan
   */
  private getCurrentPhase(dietPlan: TimelineDietPlan): any {
    const now = new Date();
    return dietPlan.phases.find(phase => phase.startDate <= now && phase.endDate >= now);
  }

  /**
   * Get current day within a phase
   */
  private getCurrentDay(dietPlan: TimelineDietPlan, phase: any): number {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - phase.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, daysSinceStart + 1);
  }

  /**
   * Get days elapsed since diet plan started
   */
  private getDaysElapsed(dietPlan: TimelineDietPlan): number {
    const now = new Date();
    return Math.floor((now.getTime() - dietPlan.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate mock Level 2 response
   */
  private generateMockLevel2Response(domain: string, query: string): string {
    const responses = {
      nutrition: `Based on your query about nutrition, here are some general recommendations: Focus on a balanced diet with plenty of vegetables, lean proteins, and whole grains. Stay hydrated and consider the timing of your meals for optimal energy levels.`,
      fitness: `For your fitness goals, I recommend starting with a combination of cardio and strength training. Begin with 30 minutes of activity 3-4 times per week and gradually increase intensity.`,
      meal_planning: `Here's a simple approach to meal planning: Plan your meals around lean proteins, colorful vegetables, and complex carbohydrates. Prep ingredients in advance and consider batch cooking for efficiency.`,
      general_wellness: `For overall wellness, focus on the fundamentals: balanced nutrition, regular physical activity, adequate sleep (7-9 hours), stress management, and staying hydrated. Small, consistent changes make the biggest impact.`,
    };

    return responses[domain] || `I'd be happy to help with your ${domain} question. Let me provide some guidance based on current best practices and your personal health context.`;
  }

  /**
   * Generate Level 2 follow-up questions
   */
  private generateLevel2FollowUps(domain: string): string[] {
    const followUps = {
      nutrition: [
        'What are your current dietary preferences or restrictions?',
        'Are you trying to achieve any specific nutrition goals?',
        'Would you like help with meal planning?',
      ],
      fitness: [
        'What type of physical activities do you enjoy?',
        'Do you have access to a gym or prefer home workouts?',
        'Any fitness goals you\'d like to work toward?',
      ],
      meal_planning: [
        'How many meals do you typically prepare at home?',
        'Do you have any cooking time constraints?',
        'Are there foods you particularly enjoy or want to avoid?',
      ],
      general_wellness: [
        'Which aspect of wellness would you like to focus on first?',
        'Are there any specific health challenges you\'re addressing?',
        'What does a typical day look like for you?',
      ],
    };

    return followUps[domain] || [
      'What specific aspect would you like to explore further?',
      'Are there any particular concerns or goals you have?',
      'Would you like more personalized recommendations?',
    ];
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
}
