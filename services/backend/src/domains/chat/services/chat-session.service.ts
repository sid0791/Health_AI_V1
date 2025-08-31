import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { ChatSession, ChatSessionType, ChatSessionStatus } from '../entities/chat-session.entity';
import { User } from '../../users/entities/user.entity';

export interface CreateSessionOptions {
  type?: ChatSessionType;
  title?: string;
  description?: string;
  userPreferences?: {
    language?: 'en' | 'hi' | 'hinglish';
    responseStyle?: 'detailed' | 'concise' | 'friendly';
    domainFocus?: string[];
  };
  context?: Record<string, any>;
  expirationHours?: number;
}

export interface SessionSummary {
  id: string;
  type: ChatSessionType;
  status: ChatSessionStatus;
  title: string;
  messageCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  isActive: boolean;
  isExpired: boolean;
}

@Injectable()
export class ChatSessionService {
  private readonly logger = new Logger(ChatSessionService.name);

  // Default session configuration
  private readonly defaultExpirationHours = 24 * 7; // 1 week
  private readonly maxSessionsPerUser = 50;

  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new chat session
   */
  async createSession(userId: string, options: CreateSessionOptions = {}): Promise<ChatSession> {
    this.logger.log(`Creating new chat session for user ${userId}`);

    try {
      // Verify user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      // Check session limits and cleanup old sessions if needed
      await this.enforceSessionLimits(userId);

      // Set expiration time
      const expiresAt = new Date();
      expiresAt.setHours(
        expiresAt.getHours() + (options.expirationHours || this.defaultExpirationHours),
      );

      // Generate appropriate title if not provided
      const title =
        options.title || this.generateSessionTitle(options.type || ChatSessionType.GENERAL);

      // Create session
      const session = this.chatSessionRepository.create({
        userId,
        type: options.type || ChatSessionType.GENERAL,
        status: ChatSessionStatus.ACTIVE,
        title,
        description: options.description,
        context: options.context || {},
        userPreferences: options.userPreferences || this.getDefaultUserPreferences(),
        expiresAt,
        lastActivityAt: new Date(),
      });

      const savedSession = await this.chatSessionRepository.save(session);

      this.logger.log(`Created chat session ${savedSession.id} for user ${userId}`);

      return savedSession;
    } catch (error) {
      this.logger.error(`Error creating chat session for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get active session by ID
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: ['messages'],
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Check if session is expired
    if (session.isExpired()) {
      await this.expireSession(sessionId);
      throw new NotFoundException(`Session ${sessionId} has expired`);
    }

    return session;
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string, includeExpired = false): Promise<SessionSummary[]> {
    const whereCondition: any = { userId };

    if (!includeExpired) {
      whereCondition.status = ChatSessionStatus.ACTIVE;
    }

    const sessions = await this.chatSessionRepository.find({
      where: whereCondition,
      order: { lastActivityAt: 'DESC' },
      take: this.maxSessionsPerUser,
    });

    return sessions.map((session) => ({
      id: session.id,
      type: session.type,
      status: session.status,
      title: session.title || 'Untitled Session',
      messageCount: session.messageCount,
      lastActivityAt: session.lastActivityAt || session.createdAt,
      createdAt: session.createdAt,
      isActive: session.isActive(),
      isExpired: session.isExpired(),
    }));
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, userId: string): Promise<void> {
    const result = await this.chatSessionRepository.update(
      { id: sessionId, userId },
      {
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    );

    if (result.affected === 0) {
      this.logger.warn(`Failed to update activity for session ${sessionId}`);
    }
  }

  /**
   * Update session preferences
   */
  async updateSessionPreferences(
    sessionId: string,
    userId: string,
    preferences: Partial<CreateSessionOptions['userPreferences']>,
  ): Promise<ChatSession> {
    const session = await this.getSession(sessionId, userId);

    session.userPreferences = {
      ...session.userPreferences,
      ...preferences,
    };

    session.updateActivity();

    return await this.chatSessionRepository.save(session);
  }

  /**
   * Update session context
   */
  async updateSessionContext(
    sessionId: string,
    userId: string,
    context: Record<string, any>,
  ): Promise<ChatSession> {
    const session = await this.getSession(sessionId, userId);

    session.context = {
      ...session.context,
      ...context,
    };

    session.updateActivity();

    return await this.chatSessionRepository.save(session);
  }

  /**
   * Pause a session
   */
  async pauseSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.getSession(sessionId, userId);

    session.status = ChatSessionStatus.PAUSED;
    session.updateActivity();

    return await this.chatSessionRepository.save(session);
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId, status: ChatSessionStatus.PAUSED },
    });

    if (!session) {
      throw new NotFoundException(`Paused session ${sessionId} not found`);
    }

    session.status = ChatSessionStatus.ACTIVE;
    session.updateActivity();

    return await this.chatSessionRepository.save(session);
  }

  /**
   * Archive a session
   */
  async archiveSession(sessionId: string, userId: string): Promise<void> {
    const result = await this.chatSessionRepository.update(
      { id: sessionId, userId },
      {
        status: ChatSessionStatus.ARCHIVED,
        updatedAt: new Date(),
      },
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    this.logger.log(`Archived session ${sessionId} for user ${userId}`);
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.chatSessionRepository.remove(session);

    this.logger.log(`Deleted session ${sessionId} for user ${userId}`);
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<any> {
    const sessions = await this.chatSessionRepository.find({
      where: { userId },
      select: ['id', 'type', 'status', 'messageCount', 'createdAt', 'lastActivityAt'],
    });

    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === ChatSessionStatus.ACTIVE).length,
      pausedSessions: sessions.filter((s) => s.status === ChatSessionStatus.PAUSED).length,
      archivedSessions: sessions.filter((s) => s.status === ChatSessionStatus.ARCHIVED).length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      avgMessagesPerSession:
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length
          : 0,
      sessionsByType: {} as Record<string, number>,
      oldestSession:
        sessions.length > 0 ? Math.min(...sessions.map((s) => s.createdAt.getTime())) : null,
      lastActivity:
        sessions.length > 0
          ? Math.max(...sessions.map((s) => (s.lastActivityAt || s.createdAt).getTime()))
          : null,
    };

    // Count sessions by type
    for (const type of Object.values(ChatSessionType)) {
      stats.sessionsByType[type] = sessions.filter((s) => s.type === type).length;
    }

    return stats;
  }

  /**
   * Cleanup expired sessions (scheduled task)
   */
  async cleanupExpiredSessions(): Promise<number> {
    this.logger.log('Starting cleanup of expired chat sessions');

    try {
      const expiredSessions = await this.chatSessionRepository.find({
        where: {
          status: ChatSessionStatus.ACTIVE,
        },
      });

      const nowExpiredSessions = expiredSessions.filter((session) => session.isExpired());

      for (const session of nowExpiredSessions) {
        await this.expireSession(session.id);
      }

      this.logger.log(`Cleaned up ${nowExpiredSessions.length} expired sessions`);

      return nowExpiredSessions.length;
    } catch (error) {
      this.logger.error('Error during session cleanup:', error);
      return 0;
    }
  }

  /**
   * Get session recommendations based on user history
   */
  async getSessionRecommendations(userId: string): Promise<any[]> {
    const sessions = await this.chatSessionRepository.find({
      where: { userId },
      order: { lastActivityAt: 'DESC' },
      take: 10,
    });

    const recommendations = [];

    // Analyze user patterns
    const preferredType = this.getMostUsedSessionType(sessions);
    const avgSessionLength = this.getAverageSessionLength(sessions);
    const lastActivity = sessions.length > 0 ? sessions[0].lastActivityAt : null;

    // Generate recommendations
    if (preferredType && preferredType !== ChatSessionType.GENERAL) {
      recommendations.push({
        type: 'continue_preferred',
        title: `Continue with ${preferredType.replace('_', ' ')} session`,
        description: `Based on your usage, you might want to start a ${preferredType} session`,
        sessionType: preferredType,
      });
    }

    if (avgSessionLength > 10) {
      recommendations.push({
        type: 'deep_dive',
        title: 'Deep dive session',
        description: 'You tend to have longer conversations. Perfect for detailed planning!',
        sessionType: ChatSessionType.GENERAL,
      });
    }

    if (lastActivity && Date.now() - lastActivity.getTime() > 24 * 60 * 60 * 1000) {
      recommendations.push({
        type: 'check_in',
        title: 'Health check-in',
        description: 'Time for a health and wellness check-in!',
        sessionType: ChatSessionType.HEALTH_FOCUSED,
      });
    }

    return recommendations;
  }

  // Private helper methods

  private async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await this.chatSessionRepository.count({
      where: {
        userId,
        status: ChatSessionStatus.ACTIVE,
      },
    });

    if (activeSessions >= this.maxSessionsPerUser) {
      // Archive oldest sessions
      const oldestSessions = await this.chatSessionRepository.find({
        where: {
          userId,
          status: ChatSessionStatus.ACTIVE,
        },
        order: { lastActivityAt: 'ASC' },
        take: Math.max(1, activeSessions - this.maxSessionsPerUser + 1),
      });

      for (const session of oldestSessions) {
        await this.archiveSession(session.id, userId);
      }

      this.logger.log(`Archived ${oldestSessions.length} old sessions for user ${userId}`);
    }
  }

  private async expireSession(sessionId: string): Promise<void> {
    await this.chatSessionRepository.update(
      { id: sessionId },
      {
        status: ChatSessionStatus.COMPLETED,
        updatedAt: new Date(),
      },
    );
  }

  private generateSessionTitle(type: ChatSessionType): string {
    const titles = {
      [ChatSessionType.GENERAL]: 'General Health Chat',
      [ChatSessionType.HEALTH_FOCUSED]: 'Health Consultation',
      [ChatSessionType.NUTRITION_FOCUSED]: 'Nutrition Discussion',
      [ChatSessionType.FITNESS_FOCUSED]: 'Fitness Planning',
      [ChatSessionType.MEAL_PLANNING]: 'Meal Planning Session',
      [ChatSessionType.WORKOUT_PLANNING]: 'Workout Planning Session',
    };

    const baseTitle = titles[type] || 'Health Chat';
    const timestamp = new Date().toLocaleDateString();

    return `${baseTitle} - ${timestamp}`;
  }

  private getDefaultUserPreferences(): CreateSessionOptions['userPreferences'] {
    return {
      language: 'en',
      responseStyle: 'friendly',
      domainFocus: ['health', 'nutrition', 'fitness'],
    };
  }

  private getMostUsedSessionType(sessions: ChatSession[]): ChatSessionType | null {
    if (sessions.length === 0) return null;

    const typeCounts = new Map<ChatSessionType, number>();

    for (const session of sessions) {
      const count = typeCounts.get(session.type) || 0;
      typeCounts.set(session.type, count + 1);
    }

    let maxCount = 0;
    let mostUsedType: ChatSessionType | null = null;

    for (const [type, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedType = type;
      }
    }

    return mostUsedType;
  }

  private getAverageSessionLength(sessions: ChatSession[]): number {
    if (sessions.length === 0) return 0;

    const totalMessages = sessions.reduce((sum, session) => sum + session.messageCount, 0);
    return totalMessages / sessions.length;
  }

  /**
   * Get session health - detect sessions that might need attention
   */
  async getSessionHealth(sessionId: string, userId: string): Promise<any> {
    const session = await this.getSession(sessionId, userId);

    const health = {
      isHealthy: true,
      issues: [] as string[],
      recommendations: [] as string[],
      metrics: {
        messageCount: session.messageCount,
        ageInHours: (Date.now() - session.createdAt.getTime()) / (1000 * 60 * 60),
        timeSinceLastActivity: session.lastActivityAt
          ? (Date.now() - session.lastActivityAt.getTime()) / (1000 * 60 * 60)
          : 0,
      },
    };

    // Check for potential issues
    if (session.messageCount > 100) {
      health.issues.push('Very long conversation - consider summarizing key points');
      health.recommendations.push('Create a summary of important decisions and plans');
      health.isHealthy = false;
    }

    if (health.metrics.timeSinceLastActivity > 24) {
      health.issues.push('Session has been inactive for over 24 hours');
      health.recommendations.push('Consider archiving if no longer needed');
    }

    if (health.metrics.ageInHours > 168) {
      // 1 week
      health.issues.push('Session is over a week old');
      health.recommendations.push('Review session goals and progress');
    }

    return health;
  }
}
