import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { ChatContext, ContextType } from '../entities/chat-context.entity';

// Integration with other domains for RAG data
import { User } from '../../users/entities/user.entity';
import { HealthReport } from '../../health-reports/entities/health-report.entity';
import { MealPlan } from '../../meal-planning/entities/meal-plan.entity';
import { FitnessPlan } from '../../fitness-planning/entities/fitness-plan.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';

export interface RAGRetrievalOptions {
  maxDocuments?: number;
  relevanceThreshold?: number;
  contextTypes?: string[];
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  includeUserProfile?: boolean;
  includeKnowledgeBase?: boolean;
}

export interface RAGContext {
  sources: Array<{
    sourceId: string;
    sourceType: string;
    title: string;
    excerpt: string;
    relevanceScore: number;
    url?: string;
  }>;
  contextText: string;
  metadata: {
    totalDocuments: number;
    documentsRetrieved: number;
    retrievalTimeMs: number;
    avgRelevanceScore: number;
    contextTypes: string[];
  };
}

export interface DocumentEmbedding {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  // Simple in-memory knowledge base for Phase 13
  // In production, this would use a vector database like Pinecone or Weaviate
  private knowledgeBase: Map<string, DocumentEmbedding> = new Map();

  constructor(
    @InjectRepository(ChatContext)
    private readonly chatContextRepository: Repository<ChatContext>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
    @InjectRepository(MealPlan)
    private readonly mealPlanRepository: Repository<MealPlan>,
    @InjectRepository(FitnessPlan)
    private readonly fitnessPlanRepository: Repository<FitnessPlan>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    private readonly configService: ConfigService,
  ) {
    this.initializeKnowledgeBase();
  }

  /**
   * Retrieve relevant context for a user query
   */
  async retrieveContext(
    userId: string,
    query: string,
    domain: string,
    options: RAGRetrievalOptions = {}
  ): Promise<RAGContext> {
    const startTime = Date.now();
    
    this.logger.log(`Retrieving RAG context for user ${userId}, domain: ${domain}`);

    const {
      maxDocuments = 5,
      relevanceThreshold = 0.7,
      contextTypes = [],
      timeRange,
      includeUserProfile = true,
      includeKnowledgeBase = true,
    } = options;

    try {
      const allSources = [];

      // 1. Get user-specific context (stored chat context)
      const userContext = await this.getUserContext(userId, contextTypes, timeRange);
      allSources.push(...userContext);

      // 2. Get user profile data if requested
      if (includeUserProfile) {
        const profileContext = await this.getUserProfileContext(userId);
        allSources.push(...profileContext);
      }

      // 3. Get domain-specific data
      const domainContext = await this.getDomainSpecificContext(userId, domain, timeRange);
      allSources.push(...domainContext);

      // 4. Get knowledge base articles if requested
      if (includeKnowledgeBase) {
        const kbContext = await this.getKnowledgeBaseContext(query, domain);
        allSources.push(...kbContext);
      }

      // 5. Calculate relevance scores (simplified - would use embeddings in production)
      const scoredSources = allSources.map(source => ({
        ...source,
        relevanceScore: this.calculateRelevanceScore(query, source.content, domain),
      }));

      // 6. Filter and sort by relevance
      const relevantSources = scoredSources
        .filter(source => source.relevanceScore >= relevanceThreshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxDocuments);

      // 7. Build context text
      const contextText = this.buildContextText(relevantSources);

      // 8. Build response sources
      const sources = relevantSources.map(source => ({
        sourceId: source.id,
        sourceType: source.sourceType,
        title: source.title,
        excerpt: this.createExcerpt(source.content, 150),
        relevanceScore: source.relevanceScore,
        url: source.url,
      }));

      const retrievalTime = Date.now() - startTime;

      return {
        sources,
        contextText,
        metadata: {
          totalDocuments: allSources.length,
          documentsRetrieved: relevantSources.length,
          retrievalTimeMs: retrievalTime,
          avgRelevanceScore: relevantSources.length > 0 
            ? relevantSources.reduce((sum, s) => sum + s.relevanceScore, 0) / relevantSources.length 
            : 0,
          contextTypes: [...new Set(relevantSources.map(s => s.sourceType))],
        },
      };

    } catch (error) {
      this.logger.error(`Error retrieving RAG context for user ${userId}:`, error);
      return this.getEmptyContext();
    }
  }

  /**
   * Index user data for RAG retrieval
   */
  async indexUserData(userId: string, contextType: ContextType, data: any): Promise<void> {
    try {
      let content = '';
      let title = '';
      let metadata = { sourceId: data.id, sourceType: contextType };

      switch (contextType) {
        case ContextType.HEALTH_REPORT:
          content = this.extractHealthReportContent(data);
          title = `Health Report - ${data.reportDate || 'Recent'}`;
          break;

        case ContextType.MEAL_PLAN:
          content = this.extractMealPlanContent(data);
          title = `Meal Plan - Week ${data.weekNumber || 'Current'}`;
          break;

        case ContextType.FITNESS_PLAN:
          content = this.extractFitnessPlanContent(data);
          title = `Fitness Plan - Week ${data.currentWeek || 'Current'}`;
          break;

        case ContextType.NUTRITION_LOG:
          content = this.extractNutritionLogContent(data);
          title = `Nutrition Log - ${data.date || 'Recent'}`;
          break;

        case ContextType.WORKOUT_LOG:
          content = this.extractWorkoutLogContent(data);
          title = `Workout Log - ${data.date || 'Recent'}`;
          break;

        case ContextType.RECIPE:
          content = this.extractRecipeContent(data);
          title = `Recipe - ${data.name}`;
          break;

        default:
          content = JSON.stringify(data);
          title = `${contextType} - ${data.id}`;
      }

      if (content.length > 0) {
        const chatContext = this.chatContextRepository.create({
          userId,
          contextType,
          title,
          content,
          metadata,
          isActive: true,
          // Set expiration based on context type
          expiresAt: this.getExpirationDate(contextType),
        });

        await this.chatContextRepository.save(chatContext);
        this.logger.log(`Indexed ${contextType} for user ${userId}`);
      }

    } catch (error) {
      this.logger.error(`Error indexing user data for ${userId}:`, error);
    }
  }

  /**
   * Update context relevance scores based on user interactions
   */
  async updateRelevanceScore(contextId: string, interactionType: 'viewed' | 'cited' | 'useful', userId: string): Promise<void> {
    try {
      const context = await this.chatContextRepository.findOne({
        where: { id: contextId, userId },
      });

      if (context) {
        context.incrementAccess();
        
        // Adjust relevance based on interaction type
        let currentScore = context.getRelevanceScore();
        switch (interactionType) {
          case 'useful':
            currentScore = Math.min(1.0, currentScore + 0.1);
            break;
          case 'cited':
            currentScore = Math.min(1.0, currentScore + 0.05);
            break;
          case 'viewed':
            currentScore = Math.min(1.0, currentScore + 0.01);
            break;
        }

        context.updateRelevanceScore(currentScore);
        await this.chatContextRepository.save(context);
      }
    } catch (error) {
      this.logger.error(`Error updating relevance score for context ${contextId}:`, error);
    }
  }

  // Private helper methods

  private async getUserContext(userId: string, contextTypes: string[], timeRange?: any): Promise<any[]> {
    const whereConditions: any = { userId, isActive: true };
    
    if (contextTypes.length > 0) {
      whereConditions.contextType = In(contextTypes);
    }

    if (timeRange?.start) {
      whereConditions.createdAt = { $gte: timeRange.start };
    }

    const contexts = await this.chatContextRepository.find({
      where: whereConditions,
      order: { lastAccessedAt: 'DESC', createdAt: 'DESC' },
      take: 20,
    });

    return contexts.map(context => ({
      id: context.id,
      sourceType: context.contextType,
      title: context.title,
      content: context.content,
      metadata: context.metadata,
      lastAccessed: context.lastAccessedAt,
    }));
  }

  private async getUserProfileContext(userId: string): Promise<any[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });

      if (!user) return [];

      const profileContent = this.extractUserProfileContent(user);
      
      return [{
        id: `user_profile_${userId}`,
        sourceType: 'user_profile',
        title: 'User Profile',
        content: profileContent,
        metadata: { sourceId: userId, sourceType: 'user_profile' },
      }];
    } catch (error) {
      this.logger.error(`Error getting user profile context for ${userId}:`, error);
      return [];
    }
  }

  private async getDomainSpecificContext(userId: string, domain: string, timeRange?: any): Promise<any[]> {
    const contexts = [];

    try {
      switch (domain) {
        case 'health_reports':
          const healthReports = await this.getRecentHealthReports(userId, timeRange);
          contexts.push(...healthReports);
          break;

        case 'meal_planning':
        case 'nutrition':
          const mealPlans = await this.getRecentMealPlans(userId, timeRange);
          contexts.push(...mealPlans);
          break;

        case 'fitness':
        case 'workout_planning':
          const fitnessPlans = await this.getRecentFitnessPlans(userId, timeRange);
          contexts.push(...fitnessPlans);
          break;

        case 'recipe':
          const recipes = await this.getRecentRecipes(userId, timeRange);
          contexts.push(...recipes);
          break;
      }
    } catch (error) {
      this.logger.error(`Error getting domain context for ${domain}:`, error);
    }

    return contexts;
  }

  private async getKnowledgeBaseContext(query: string, domain: string): Promise<any[]> {
    // Simple keyword matching for knowledge base
    // In production, this would use vector similarity search
    
    const domainKeywords = {
      nutrition: ['protein', 'carbs', 'fat', 'vitamins', 'minerals', 'calories'],
      fitness: ['strength', 'cardio', 'muscle', 'training', 'recovery'],
      health: ['biomarkers', 'blood test', 'health conditions', 'symptoms'],
    };

    const keywords = domainKeywords[domain] || [];
    const queryLower = query.toLowerCase();
    
    const relevantArticles = [];
    
    for (const [id, doc] of this.knowledgeBase.entries()) {
      if (doc.metadata.domain === domain || doc.metadata.domain === 'general') {
        const hasKeyword = keywords.some(keyword => 
          queryLower.includes(keyword) && doc.content.toLowerCase().includes(keyword)
        );
        
        if (hasKeyword) {
          relevantArticles.push({
            id,
            sourceType: 'knowledge_base',
            title: doc.metadata.title,
            content: doc.content,
            metadata: doc.metadata,
          });
        }
      }
    }

    return relevantArticles.slice(0, 3); // Limit knowledge base results
  }

  private calculateRelevanceScore(query: string, content: string, domain: string): number {
    // Simple relevance scoring based on keyword matching
    // In production, this would use vector similarity (cosine similarity)
    
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let matches = 0;
    let totalWords = queryWords.length;
    
    for (const word of queryWords) {
      if (word.length > 2 && contentWords.some(cw => cw.includes(word) || word.includes(cw))) {
        matches++;
      }
    }

    const baseScore = matches / totalWords;
    
    // Boost score for domain-specific content
    const domainBoost = content.toLowerCase().includes(domain) ? 0.2 : 0;
    
    // Boost for recent content (would check timestamps in production)
    const recencyBoost = 0.1;
    
    return Math.min(1.0, baseScore + domainBoost + recencyBoost);
  }

  private buildContextText(sources: any[]): string {
    if (sources.length === 0) return '';

    let context = 'RELEVANT CONTEXT:\n\n';
    
    sources.forEach((source, index) => {
      context += `${index + 1}. ${source.title}\n`;
      context += `${this.createExcerpt(source.content, 200)}\n\n`;
    });

    return context;
  }

  private createExcerpt(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  private getEmptyContext(): RAGContext {
    return {
      sources: [],
      contextText: '',
      metadata: {
        totalDocuments: 0,
        documentsRetrieved: 0,
        retrievalTimeMs: 0,
        avgRelevanceScore: 0,
        contextTypes: [],
      },
    };
  }

  private initializeKnowledgeBase(): void {
    // Initialize with some basic health and wellness knowledge
    // In production, this would be loaded from a comprehensive database
    
    const articles = [
      {
        id: 'nutrition_basics',
        title: 'Nutrition Basics',
        content: 'Macronutrients include proteins, carbohydrates, and fats. Proteins help build and repair tissues. Carbohydrates provide energy. Healthy fats support brain function and hormone production.',
        domain: 'nutrition',
      },
      {
        id: 'exercise_principles',
        title: 'Exercise Principles',
        content: 'Progressive overload is key to fitness improvement. Start with manageable weights and gradually increase intensity. Rest and recovery are as important as the workout itself.',
        domain: 'fitness',
      },
      {
        id: 'biomarker_understanding',
        title: 'Understanding Biomarkers',
        content: 'HbA1c measures average blood sugar over 2-3 months. Normal is below 5.7%. Cholesterol levels include LDL (bad) and HDL (good). Regular monitoring helps track health progress.',
        domain: 'health',
      },
    ];

    articles.forEach(article => {
      this.knowledgeBase.set(article.id, {
        id: article.id,
        content: article.content,
        embedding: [], // Would be actual embeddings in production
        metadata: {
          title: article.title,
          domain: article.domain,
          type: 'knowledge_base',
        },
      });
    });

    this.logger.log(`Initialized knowledge base with ${articles.length} articles`);
  }

  // Content extraction methods for different data types

  private extractHealthReportContent(report: any): string {
    let content = `Health Report from ${report.reportDate || 'Unknown Date'}\n\n`;
    
    if (report.biomarkers) {
      content += 'Biomarkers:\n';
      Object.entries(report.biomarkers).forEach(([key, value]) => {
        content += `- ${key}: ${value}\n`;
      });
    }

    if (report.interpretation) {
      content += `\nInterpretation: ${report.interpretation}\n`;
    }

    if (report.recommendations) {
      content += `\nRecommendations: ${report.recommendations}\n`;
    }

    return content;
  }

  private extractMealPlanContent(mealPlan: any): string {
    let content = `Meal Plan for Week ${mealPlan.weekNumber || 'Current'}\n\n`;
    
    if (mealPlan.meals) {
      mealPlan.meals.forEach((meal: any) => {
        content += `${meal.type}: ${meal.name}\n`;
        if (meal.ingredients) {
          content += `Ingredients: ${meal.ingredients.join(', ')}\n`;
        }
        if (meal.nutrition) {
          content += `Nutrition: ${JSON.stringify(meal.nutrition)}\n`;
        }
        content += '\n';
      });
    }

    return content;
  }

  private extractFitnessPlanContent(fitnessPlan: any): string {
    let content = `Fitness Plan - Week ${fitnessPlan.currentWeek || 'Current'}\n\n`;
    
    if (fitnessPlan.workouts) {
      fitnessPlan.workouts.forEach((workout: any) => {
        content += `${workout.name}: ${workout.description || ''}\n`;
        if (workout.exercises) {
          workout.exercises.forEach((exercise: any) => {
            content += `- ${exercise.name}: ${exercise.sets}x${exercise.reps || exercise.duration}\n`;
          });
        }
        content += '\n';
      });
    }

    return content;
  }

  private extractNutritionLogContent(log: any): string {
    return `Nutrition Log - ${log.date || 'Recent'}\nFood: ${log.foodName || ''}\nCalories: ${log.calories || 0}\nMacros: P:${log.protein || 0}g C:${log.carbs || 0}g F:${log.fat || 0}g`;
  }

  private extractWorkoutLogContent(log: any): string {
    return `Workout Log - ${log.date || 'Recent'}\nWorkout: ${log.workoutName || ''}\nDuration: ${log.duration || 0} minutes\nIntensity: ${log.intensity || 'Medium'}`;
  }

  private extractRecipeContent(recipe: any): string {
    let content = `Recipe: ${recipe.name}\n\n`;
    
    if (recipe.description) {
      content += `Description: ${recipe.description}\n\n`;
    }

    if (recipe.ingredients) {
      content += 'Ingredients:\n';
      recipe.ingredients.forEach((ingredient: any) => {
        content += `- ${ingredient.name}: ${ingredient.quantity} ${ingredient.unit}\n`;
      });
      content += '\n';
    }

    if (recipe.instructions) {
      content += 'Instructions:\n';
      recipe.instructions.forEach((instruction: string, index: number) => {
        content += `${index + 1}. ${instruction}\n`;
      });
    }

    return content;
  }

  private extractUserProfileContent(user: any): string {
    let content = 'User Profile\n\n';
    
    if (user.profile) {
      const profile = user.profile;
      content += `Age: ${profile.age || 'Not specified'}\n`;
      content += `Gender: ${profile.gender || 'Not specified'}\n`;
      content += `Height: ${profile.height || 'Not specified'} cm\n`;
      content += `Weight: ${profile.weight || 'Not specified'} kg\n`;
      content += `Activity Level: ${profile.activityLevel || 'Not specified'}\n`;
      
      if (profile.goals && profile.goals.length > 0) {
        content += `Goals: ${profile.goals.join(', ')}\n`;
      }
      
      if (profile.healthConditions && profile.healthConditions.length > 0) {
        content += `Health Conditions: ${profile.healthConditions.join(', ')}\n`;
      }
      
      if (profile.allergies && profile.allergies.length > 0) {
        content += `Allergies: ${profile.allergies.join(', ')}\n`;
      }
    }

    return content;
  }

  private getExpirationDate(contextType: ContextType): Date {
    const now = new Date();
    const expiration = new Date(now);

    // Set different expiration times based on context type
    switch (contextType) {
      case ContextType.HEALTH_REPORT:
        expiration.setMonth(expiration.getMonth() + 6); // 6 months
        break;
      case ContextType.MEAL_PLAN:
      case ContextType.FITNESS_PLAN:
        expiration.setMonth(expiration.getMonth() + 3); // 3 months
        break;
      case ContextType.NUTRITION_LOG:
      case ContextType.WORKOUT_LOG:
        expiration.setMonth(expiration.getMonth() + 1); // 1 month
        break;
      case ContextType.USER_PROFILE:
        expiration.setFullYear(expiration.getFullYear() + 1); // 1 year
        break;
      default:
        expiration.setMonth(expiration.getMonth() + 3); // 3 months default
    }

    return expiration;
  }

  private async getRecentHealthReports(userId: string, timeRange?: any): Promise<any[]> {
    try {
      const reports = await this.healthReportRepository.find({
        where: { userId },
        order: { testDate: 'DESC' },
        take: 3,
      });

      return reports.map(report => ({
        id: `health_report_${report.id}`,
        sourceType: 'health_report',
        title: `Health Report - ${report.testDate}`,
        content: this.extractHealthReportContent(report),
        metadata: { sourceId: report.id, sourceType: 'health_report' },
      }));
    } catch (error) {
      this.logger.error('Error fetching health reports:', error);
      return [];
    }
  }

  private async getRecentMealPlans(userId: string, timeRange?: any): Promise<any[]> {
    try {
      const mealPlans = await this.mealPlanRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 2,
        relations: ['entries'],
      });

      return mealPlans.map(plan => ({
        id: `meal_plan_${plan.id}`,
        sourceType: 'meal_plan',
        title: `Meal Plan - ${plan.name}`,
        content: this.extractMealPlanContent(plan),
        metadata: { sourceId: plan.id, sourceType: 'meal_plan' },
      }));
    } catch (error) {
      this.logger.error('Error fetching meal plans:', error);
      return [];
    }
  }

  private async getRecentFitnessPlans(userId: string, timeRange?: any): Promise<any[]> {
    try {
      const fitnessPlans = await this.fitnessPlanRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 2,
        relations: ['weeks', 'weeks.workouts', 'weeks.workouts.exercises'],
      });

      return fitnessPlans.map(plan => ({
        id: `fitness_plan_${plan.id}`,
        sourceType: 'fitness_plan',
        title: `Fitness Plan - Week ${plan.getCurrentWeek()}`,
        content: this.extractFitnessPlanContent(plan),
        metadata: { sourceId: plan.id, sourceType: 'fitness_plan' },
      }));
    } catch (error) {
      this.logger.error('Error fetching fitness plans:', error);
      return [];
    }
  }

  private async getRecentRecipes(userId: string, timeRange?: any): Promise<any[]> {
    try {
      // Get recipes from user's recent meal plans or favorites
      const recipes = await this.recipeRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['ingredients'],
      });

      return recipes.map(recipe => ({
        id: `recipe_${recipe.id}`,
        sourceType: 'recipe',
        title: `Recipe - ${recipe.name}`,
        content: this.extractRecipeContent(recipe),
        metadata: { sourceId: recipe.id, sourceType: 'recipe' },
      }));
    } catch (error) {
      this.logger.error('Error fetching recipes:', error);
      return [];
    }
  }
}