import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../../users/entities/user.entity';
import { JsonTemplateLoaderService } from './json-template-loader.service';
import { CostOptimizationService, BatchedRequest } from './cost-optimization.service';

export interface PromptTemplate {
  id: string;
  category: PromptCategory;
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  costOptimized: boolean;
  language: 'en' | 'hi' | 'hinglish';
  metadata?: Record<string, any>;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  source?: 'user_profile' | 'health_data' | 'preferences' | 'input' | 'context';
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
}

export enum PromptCategory {
  NUTRITION_ADVICE = 'nutrition_advice',
  MEAL_PLANNING = 'meal_planning',
  FITNESS_GUIDANCE = 'fitness_guidance',
  HEALTH_ANALYSIS = 'health_analysis',
  LIFESTYLE_TIPS = 'lifestyle_tips',
  SYMPTOM_CHECKER = 'symptom_checker',
  MEDICATION_INFO = 'medication_info',
  DIET_MODIFICATION = 'diet_modification',
  WEIGHT_MANAGEMENT = 'weight_management',
  GENERAL_CHAT = 'general_chat',
}

export interface PromptExecutionResult {
  prompt: string;
  response?: string;
  tokensUsed?: number;
  cost?: number;
  executionTime?: number;
  model?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UserContext {
  userId: string;
  profile?: {
    name?: string;
    age?: number;
    gender?: string;
    height?: number;
    weight?: number;
    location?: string;
    lifestyle?: string;
  };
  healthData?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    vitals?: Record<string, any>;
    reports?: any[];
  };
  preferences?: {
    dietType?: string;
    cuisines?: string[];
    restrictions?: string[];
    goals?: string[];
    languages?: string[];
  };
  history?: {
    recentQueries?: string[];
    commonTopics?: string[];
    interactions?: number;
  };
}

@Injectable()
export class PromptOptimizationService {
  private readonly logger = new Logger(PromptOptimizationService.name);
  private readonly templates: Map<string, PromptTemplate> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jsonTemplateLoader: JsonTemplateLoaderService,
    private readonly costOptimization: CostOptimizationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.initializeDefaultTemplates();
    this.loadJsonTemplates();
  }

  /**
   * Load templates from JSON files
   */
  private loadJsonTemplates(): void {
    const jsonTemplates = this.jsonTemplateLoader.getAllTemplates();

    for (const template of jsonTemplates) {
      this.templates.set(template.id, template);
    }

    this.logger.log(`Loaded ${jsonTemplates.length} JSON templates`);
  }

  /**
   * Execute optimized prompt with cost optimization
   */
  async executePrompt(
    userId: string,
    category: PromptCategory,
    userInput: Record<string, any>,
    options?: {
      template?: string;
      language?: 'en' | 'hi' | 'hinglish';
      model?: string;
      maxTokens?: number;
      enableBatching?: boolean;
    },
  ): Promise<PromptExecutionResult> {
    const startTime = Date.now();

    try {
      // Check quota first
      const quotaStatus = await this.costOptimization.checkQuota(userId);
      if (quotaStatus.isOverLimit) {
        throw new Error('User has exceeded their quota limit');
      }

      // Get user context
      const userContext = await this.getUserContext(userId);

      // Select appropriate template (prefer JSON templates)
      const template = this.selectTemplate(category, options?.template, options?.language);
      if (!template) {
        throw new Error(`No template found for category: ${category}`);
      }

      // If batching is enabled and this is a cost-optimized template, add to batch
      if (options?.enableBatching && template.costOptimized) {
        const batchRequest: BatchedRequest = {
          userId,
          category,
          templateId: template.id,
          userQuery: userInput.user_query || JSON.stringify(userInput),
          variables: userInput,
          priority: this.determinePriority(category),
          timestamp: new Date(),
        };

        const batchId = await this.costOptimization.addToBatch(batchRequest);

        return {
          prompt: 'Request added to batch for cost optimization',
          success: true,
          executionTime: Date.now() - startTime,
          metadata: {
            templateId: template.id,
            category,
            batchId,
            batched: true,
            costOptimized: true,
          },
        };
      }

      // Generate optimized prompt
      const optimizedPrompt = await this.generateOptimizedPrompt(template, userContext, userInput);

      // Track usage for cost monitoring
      const estimatedTokens = template.metadata?.estimatedTokens || 500;
      const estimatedCost = this.estimateCost(estimatedTokens, template.metadata?.model);
      this.costOptimization.trackRequest(
        userId,
        category,
        template.id,
        estimatedTokens,
        estimatedCost,
      );

      // Log the prompt execution for cost tracking
      this.logger.log(
        `Executing prompt for user ${userId}, category: ${category}, template: ${template.id}`,
      );

      // Return the prompt (actual AI execution would happen in AI routing service)
      return {
        prompt: optimizedPrompt,
        success: true,
        executionTime: Date.now() - startTime,
        metadata: {
          templateId: template.id,
          category,
          variablesResolved: this.getResolvedVariableCount(template, userContext, userInput),
          costOptimized: template.costOptimized,
          estimatedTokens,
          estimatedCost,
          quotaRemaining: quotaStatus.dailyQuota - quotaStatus.dailyUsed,
        },
      };
    } catch (error) {
      this.logger.error(`Prompt execution failed: ${error.message}`);
      return {
        prompt: '',
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Determine request priority based on category
   */
  private determinePriority(category: PromptCategory): 'high' | 'medium' | 'low' {
    const highPriorityCategories = [PromptCategory.HEALTH_ANALYSIS, PromptCategory.SYMPTOM_CHECKER];

    const lowPriorityCategories = [PromptCategory.GENERAL_CHAT, PromptCategory.LIFESTYLE_TIPS];

    if (highPriorityCategories.includes(category)) {
      return 'high';
    } else if (lowPriorityCategories.includes(category)) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Estimate cost based on tokens and model
   */
  private estimateCost(tokens: number, model?: string): number {
    const costPerToken = {
      'gpt-3.5-turbo': 0.00002,
      'gpt-4-turbo-preview': 0.0001,
      'gpt-4': 0.00006,
    };

    const selectedModel = model || 'gpt-3.5-turbo';
    return tokens * (costPerToken[selectedModel] || costPerToken['gpt-3.5-turbo']);
  }

  /**
   * Generate optimized prompt by replacing variables
   */
  private async generateOptimizedPrompt(
    template: PromptTemplate,
    userContext: UserContext,
    userInput: Record<string, any>,
  ): Promise<string> {
    let prompt = template.template;

    // Replace all variables in the template
    for (const variable of template.variables) {
      const placeholder = `{{${variable.name}}}`;
      const value = await this.resolveVariable(variable, userContext, userInput);

      if (value !== undefined && value !== null) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      } else if (variable.required) {
        // Use default value or safe fallback for required variables
        const fallback = this.getFallbackValue(variable, userContext);
        prompt = prompt.replace(new RegExp(placeholder, 'g'), fallback);
      } else {
        // Remove optional variable placeholders
        prompt = prompt.replace(new RegExp(placeholder, 'g'), '');
      }
    }

    // Clean up extra spaces and formatting
    prompt = prompt.replace(/\s+/g, ' ').trim();

    return prompt;
  }

  /**
   * Resolve variable value from various sources
   */
  private async resolveVariable(
    variable: PromptVariable,
    userContext: UserContext,
    userInput: Record<string, any>,
  ): Promise<any> {
    // First check user input
    if (userInput[variable.name] !== undefined) {
      return this.validateValue(userInput[variable.name], variable);
    }

    // Then check based on source
    switch (variable.source) {
      case 'user_profile':
        return this.getFromUserProfile(variable.name, userContext);

      case 'health_data':
        return this.getFromHealthData(variable.name, userContext);

      case 'preferences':
        return this.getFromPreferences(variable.name, userContext);

      case 'context':
        return this.getFromContext(variable.name, userContext);

      default:
        return variable.defaultValue;
    }
  }

  /**
   * Get value from user profile
   */
  private getFromUserProfile(fieldName: string, userContext: UserContext): any {
    const profile = userContext.profile;
    if (!profile) return undefined;

    // Map common field names
    const fieldMapping: Record<string, string> = {
      user_name: 'name',
      userName: 'name',
      user_age: 'age',
      userAge: 'age',
      user_gender: 'gender',
      userGender: 'gender',
      user_height: 'height',
      userHeight: 'height',
      user_weight: 'weight',
      userWeight: 'weight',
      user_location: 'location',
      userLocation: 'location',
      user_lifestyle: 'lifestyle',
      userLifestyle: 'lifestyle',
    };

    const actualField = fieldMapping[fieldName] || fieldName;
    return profile[actualField as keyof typeof profile];
  }

  /**
   * Get value from health data
   */
  private getFromHealthData(fieldName: string, userContext: UserContext): any {
    const healthData = userContext.healthData;
    if (!healthData) return undefined;

    const fieldMapping: Record<string, string> = {
      health_conditions: 'conditions',
      healthConditions: 'conditions',
      user_medications: 'medications',
      userMedications: 'medications',
      user_allergies: 'allergies',
      userAllergies: 'allergies',
      health_reports: 'reports',
      healthReports: 'reports',
    };

    const actualField = fieldMapping[fieldName] || fieldName;
    const value = healthData[actualField as keyof typeof healthData];

    // Format arrays as readable text
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'none reported';
    }

    return value;
  }

  /**
   * Get value from user preferences
   */
  private getFromPreferences(fieldName: string, userContext: UserContext): any {
    const preferences = userContext.preferences;
    if (!preferences) return undefined;

    const fieldMapping: Record<string, string> = {
      diet_type: 'dietType',
      dietType: 'dietType',
      user_cuisines: 'cuisines',
      userCuisines: 'cuisines',
      dietary_restrictions: 'restrictions',
      dietaryRestrictions: 'restrictions',
      user_goals: 'goals',
      userGoals: 'goals',
      preferred_languages: 'languages',
      preferredLanguages: 'languages',
    };

    const actualField = fieldMapping[fieldName] || fieldName;
    const value = preferences[actualField as keyof typeof preferences];

    // Format arrays as readable text
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'not specified';
    }

    return value;
  }

  /**
   * Get value from context
   */
  private getFromContext(fieldName: string, userContext: UserContext): any {
    // This can include current date/time, session info, etc.
    const contextValues: Record<string, any> = {
      current_date: new Date().toLocaleDateString(),
      currentDate: new Date().toLocaleDateString(),
      current_time: new Date().toLocaleTimeString(),
      currentTime: new Date().toLocaleTimeString(),
      user_id: userContext.userId,
      userId: userContext.userId,
      interaction_count: userContext.history?.interactions || 0,
      interactionCount: userContext.history?.interactions || 0,
    };

    return contextValues[fieldName];
  }

  /**
   * Validate value against variable constraints
   */
  private validateValue(value: any, variable: PromptVariable): any {
    if (!variable.validation) return value;

    const { min, max, pattern, options } = variable.validation;

    if (variable.type === 'number') {
      const numValue = Number(value);
      if (min !== undefined && numValue < min) return min;
      if (max !== undefined && numValue > max) return max;
      return numValue;
    }

    if (variable.type === 'string') {
      const strValue = String(value);
      if (pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(strValue)) {
          return variable.defaultValue || '';
        }
      }
      if (min !== undefined && strValue.length < min) {
        return variable.defaultValue || '';
      }
      if (max !== undefined && strValue.length > max) {
        return strValue.substring(0, max);
      }
      return strValue;
    }

    if (options && Array.isArray(options)) {
      return options.includes(value) ? value : variable.defaultValue;
    }

    return value;
  }

  /**
   * Get fallback value for required variables
   */
  private getFallbackValue(variable: PromptVariable, userContext: UserContext): string {
    if (variable.defaultValue !== undefined) {
      return String(variable.defaultValue);
    }

    // Provide safe defaults based on variable type and context
    const safeFallbacks: Record<string, string> = {
      user_name: 'user',
      userName: 'user',
      user_age: 'adult',
      userAge: 'adult',
      user_gender: 'person',
      userGender: 'person',
      health_conditions: 'none reported',
      healthConditions: 'none reported',
      dietary_restrictions: 'none specified',
      dietaryRestrictions: 'none specified',
      user_goals: 'general wellness',
      userGoals: 'general wellness',
    };

    return safeFallbacks[variable.name] || '[not specified]';
  }

  /**
   * Select appropriate template based on criteria
   */
  private selectTemplate(
    category: PromptCategory,
    templateId?: string,
    language?: 'en' | 'hi' | 'hinglish',
  ): PromptTemplate | null {
    // If specific template requested, try to find it
    if (templateId && this.templates.has(templateId)) {
      return this.templates.get(templateId)!;
    }

    // Find templates matching category and language
    const candidates = Array.from(this.templates.values()).filter(
      (t) => t.category === category && (!language || t.language === language),
    );

    if (candidates.length === 0) {
      // Fallback to any template in the category
      const fallbackCandidates = Array.from(this.templates.values()).filter(
        (t) => t.category === category,
      );
      return fallbackCandidates[0] || null;
    }

    // Prefer cost-optimized templates
    const costOptimized = candidates.filter((t) => t.costOptimized);
    if (costOptimized.length > 0) {
      return costOptimized[0];
    }

    return candidates[0];
  }

  /**
   * Get user context from database and other sources
   */
  private async getUserContext(userId: string): Promise<UserContext> {
    try {
      // This would typically fetch from multiple sources
      // For now, return a basic context structure
      const context: UserContext = {
        userId,
        profile: {
          name: 'User',
          age: 30,
          location: 'India',
        },
        healthData: {
          conditions: [],
          medications: [],
          allergies: [],
        },
        preferences: {
          dietType: 'vegetarian',
          cuisines: ['Indian'],
          restrictions: [],
          goals: ['weight management'],
          languages: ['en', 'hinglish'],
        },
        history: {
          interactions: 0,
          recentQueries: [],
          commonTopics: [],
        },
      };

      return context;
    } catch (error) {
      this.logger.error(`Failed to get user context: ${error.message}`);
      return { userId };
    }
  }

  /**
   * Count resolved variables for analytics
   */
  private getResolvedVariableCount(
    template: PromptTemplate,
    userContext: UserContext,
    userInput: Record<string, any>,
  ): number {
    let resolved = 0;

    for (const variable of template.variables) {
      if (userInput[variable.name] !== undefined) {
        resolved++;
      } else {
        const value = this.getVariableValueSync(variable, userContext);
        if (value !== undefined && value !== null) {
          resolved++;
        }
      }
    }

    return resolved;
  }

  /**
   * Get variable value synchronously for counting
   */
  private getVariableValueSync(variable: PromptVariable, userContext: UserContext): any {
    switch (variable.source) {
      case 'user_profile':
        return this.getFromUserProfile(variable.name, userContext);
      case 'health_data':
        return this.getFromHealthData(variable.name, userContext);
      case 'preferences':
        return this.getFromPreferences(variable.name, userContext);
      case 'context':
        return this.getFromContext(variable.name, userContext);
      default:
        return variable.defaultValue;
    }
  }

  /**
   * Add or update a prompt template
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    this.logger.log(`Added prompt template: ${template.id} (${template.category})`);
  }

  /**
   * Get all templates for a category
   */
  getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Nutrition Advice Template
    this.addTemplate({
      id: 'nutrition_advice_basic',
      category: PromptCategory.NUTRITION_ADVICE,
      name: 'Basic Nutrition Advice',
      description: 'Provides personalized nutrition advice based on user profile and query',
      language: 'en',
      costOptimized: true,
      template: `You are a certified nutritionist providing personalized advice to {{user_name}}, a {{user_age}} year old {{user_gender}} from {{user_location}}.

User Profile:
- Health conditions: {{health_conditions}}
- Dietary restrictions: {{dietary_restrictions}}
- Diet type: {{diet_type}}
- Current goals: {{user_goals}}
- Allergies: {{user_allergies}}

User Query: {{user_query}}

Please provide specific, actionable nutrition advice that:
1. Considers their health conditions and dietary restrictions
2. Aligns with their stated goals
3. Is culturally appropriate for their location
4. Is safe and evidence-based

Keep the response concise, practical, and include specific food recommendations when relevant.`,
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          source: 'user_profile',
          defaultValue: 'there',
        },
        {
          name: 'user_age',
          type: 'string',
          required: false,
          source: 'user_profile',
          defaultValue: 'adult',
        },
        {
          name: 'user_gender',
          type: 'string',
          required: false,
          source: 'user_profile',
          defaultValue: 'person',
        },
        {
          name: 'user_location',
          type: 'string',
          required: false,
          source: 'user_profile',
          defaultValue: 'your area',
        },
        {
          name: 'health_conditions',
          type: 'string',
          required: false,
          source: 'health_data',
          defaultValue: 'none reported',
        },
        {
          name: 'dietary_restrictions',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'none specified',
        },
        {
          name: 'diet_type',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'balanced',
        },
        {
          name: 'user_goals',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'general wellness',
        },
        {
          name: 'user_allergies',
          type: 'string',
          required: false,
          source: 'health_data',
          defaultValue: 'none reported',
        },
        { name: 'user_query', type: 'string', required: true, source: 'input' },
      ],
    });

    // Meal Planning Template
    this.addTemplate({
      id: 'meal_planning_weekly',
      category: PromptCategory.MEAL_PLANNING,
      name: 'Weekly Meal Planning',
      description: 'Creates personalized weekly meal plans',
      language: 'en',
      costOptimized: true,
      template: `Create a personalized weekly meal plan for {{user_name}}.

User Details:
- Age: {{user_age}} years
- Weight: {{user_weight}} kg
- Height: {{user_height}} cm
- Activity level: {{user_lifestyle}}
- Health conditions: {{health_conditions}}
- Diet preference: {{diet_type}}
- Favorite cuisines: {{user_cuisines}}
- Allergies/restrictions: {{dietary_restrictions}}
- Goals: {{user_goals}}

Requirements:
- 7 days of meals (breakfast, lunch, dinner, 2 snacks)
- Include calorie estimates for each meal
- Focus on {{meal_focus}} if specified
- Use primarily {{user_cuisines}} cuisine
- Ensure nutritional balance
- Provide simple cooking instructions

Format as a structured weekly plan with shopping list.`,
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          source: 'user_profile',
          defaultValue: 'user',
        },
        {
          name: 'user_age',
          type: 'number',
          required: false,
          source: 'user_profile',
          defaultValue: '30',
        },
        {
          name: 'user_weight',
          type: 'number',
          required: false,
          source: 'user_profile',
          defaultValue: '70',
        },
        {
          name: 'user_height',
          type: 'number',
          required: false,
          source: 'user_profile',
          defaultValue: '170',
        },
        {
          name: 'user_lifestyle',
          type: 'string',
          required: false,
          source: 'user_profile',
          defaultValue: 'moderate',
        },
        {
          name: 'health_conditions',
          type: 'string',
          required: false,
          source: 'health_data',
          defaultValue: 'none',
        },
        {
          name: 'diet_type',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'balanced',
        },
        {
          name: 'user_cuisines',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'Indian',
        },
        {
          name: 'dietary_restrictions',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'none',
        },
        {
          name: 'user_goals',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'maintenance',
        },
        {
          name: 'meal_focus',
          type: 'string',
          required: false,
          source: 'input',
          defaultValue: 'balanced nutrition',
        },
      ],
    });

    // Fitness Guidance Template
    this.addTemplate({
      id: 'fitness_guidance_basic',
      category: PromptCategory.FITNESS_GUIDANCE,
      name: 'Basic Fitness Guidance',
      description: 'Provides personalized fitness advice and workout recommendations',
      language: 'en',
      costOptimized: true,
      template: `Provide personalized fitness guidance for {{user_name}}.

Current Status:
- Age: {{user_age}}
- Current weight: {{user_weight}} kg
- Target weight: {{target_weight}} kg
- Fitness level: {{fitness_level}}
- Available time: {{workout_time}} minutes per session
- Equipment: {{available_equipment}}
- Health considerations: {{health_conditions}}
- Fitness goals: {{user_goals}}

User Question: {{user_query}}

Please provide:
1. Specific exercise recommendations
2. Workout frequency and duration
3. Progression plan
4. Safety considerations
5. Tips for consistency

Consider their current fitness level and any health conditions.`,
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          source: 'user_profile',
          defaultValue: 'there',
        },
        {
          name: 'user_age',
          type: 'number',
          required: false,
          source: 'user_profile',
          defaultValue: '30',
        },
        {
          name: 'user_weight',
          type: 'number',
          required: false,
          source: 'user_profile',
          defaultValue: '70',
        },
        {
          name: 'target_weight',
          type: 'number',
          required: false,
          source: 'input',
          defaultValue: '65',
        },
        {
          name: 'fitness_level',
          type: 'string',
          required: false,
          source: 'input',
          defaultValue: 'beginner',
        },
        {
          name: 'workout_time',
          type: 'number',
          required: false,
          source: 'input',
          defaultValue: '30',
        },
        {
          name: 'available_equipment',
          type: 'string',
          required: false,
          source: 'input',
          defaultValue: 'basic home equipment',
        },
        {
          name: 'health_conditions',
          type: 'string',
          required: false,
          source: 'health_data',
          defaultValue: 'none',
        },
        {
          name: 'user_goals',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'general fitness',
        },
        { name: 'user_query', type: 'string', required: true, source: 'input' },
      ],
    });

    // Hinglish Nutrition Template
    this.addTemplate({
      id: 'nutrition_advice_hinglish',
      category: PromptCategory.NUTRITION_ADVICE,
      name: 'Hinglish Nutrition Advice',
      description: 'Provides nutrition advice in Hinglish for Indian users',
      language: 'hinglish',
      costOptimized: true,
      template: `Aap ek experienced nutritionist hain jo {{user_name}} ko advice de rahe hain. User {{user_age}} saal ka/ki {{user_gender}} hai jo {{user_location}} mein rehta/rehti hai.

User Ki Details:
- Health problems: {{health_conditions}}
- Diet restrictions: {{dietary_restrictions}}
- Diet type: {{diet_type}}
- Goals: {{user_goals}}
- Allergies: {{user_allergies}}

User ka sawal: {{user_query}}

Please provide practical aur specific nutrition advice jo:
1. Unke health conditions aur restrictions ko consider kare
2. Indian food context mein practical ho
3. Easily available ingredients suggest kare
4. Safe aur scientific basis par ho

Response Hinglish mein dein aur simple language use karein.`,
      variables: [
        {
          name: 'user_name',
          type: 'string',
          required: true,
          source: 'user_profile',
          defaultValue: 'dost',
        },
        {
          name: 'user_age',
          type: 'number',
          required: false,
          source: 'user_profile',
          defaultValue: '30',
        },
        {
          name: 'user_gender',
          type: 'string',
          required: false,
          source: 'user_profile',
          defaultValue: 'person',
        },
        {
          name: 'user_location',
          type: 'string',
          required: false,
          source: 'user_profile',
          defaultValue: 'India',
        },
        {
          name: 'health_conditions',
          type: 'string',
          required: false,
          source: 'health_data',
          defaultValue: 'koi nahi',
        },
        {
          name: 'dietary_restrictions',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'koi nahi',
        },
        {
          name: 'diet_type',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'vegetarian',
        },
        {
          name: 'user_goals',
          type: 'string',
          required: false,
          source: 'preferences',
          defaultValue: 'healthy rehna',
        },
        {
          name: 'user_allergies',
          type: 'string',
          required: false,
          source: 'health_data',
          defaultValue: 'koi nahi',
        },
        { name: 'user_query', type: 'string', required: true, source: 'input' },
      ],
    });

    this.logger.log(`Initialized ${this.templates.size} default prompt templates`);
  }

  /**
   * Reload templates from JSON files
   */
  async reloadTemplates(): Promise<void> {
    // Clear existing templates (keep only default ones)
    const defaultTemplateIds = [
      'nutrition_advice_basic_legacy',
      'meal_planning_weekly_legacy',
      'fitness_guidance_basic_legacy',
      'nutrition_advice_hinglish_legacy',
    ];

    for (const [id, template] of this.templates.entries()) {
      if (!defaultTemplateIds.includes(id)) {
        this.templates.delete(id);
      }
    }

    // Reload JSON templates
    this.jsonTemplateLoader.reloadTemplates();
    this.loadJsonTemplates();

    this.logger.log('Templates reloaded successfully');
  }

  /**
   * Get cost metrics for a user
   */
  async getCostMetrics(userId: string) {
    return this.costOptimization.getCostMetrics(userId);
  }

  /**
   * Get quota status for a user
   */
  async getQuotaStatus(userId: string) {
    return this.costOptimization.checkQuota(userId);
  }

  /**
   * Get template statistics
   */
  getTemplateStatistics() {
    return this.jsonTemplateLoader.getTemplateStats();
  }

  /**
   * Create custom template and save to JSON
   */
  async createCustomTemplate(template: PromptTemplate): Promise<boolean> {
    try {
      // Validate template
      if (!template.id || !template.category || !template.template || !template.variables) {
        throw new Error('Invalid template structure');
      }

      // Add to memory
      this.templates.set(template.id, template);

      // Enhanced persistent storage implementation
      await this.saveTemplateToPersistentStorage(template);
      this.logger.log(`Custom template created and saved: ${template.id}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to create custom template: ${error.message}`);
      return false;
    }
  }

  /**
   * Test template with sample data
   */
  async testTemplate(
    templateId: string,
    sampleData: Record<string, any>,
  ): Promise<{
    success: boolean;
    prompt?: string;
    error?: string;
    missingVariables?: string[];
  }> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      // Check for missing required variables
      const missingVariables = template.variables
        .filter((v) => v.required && !sampleData[v.name])
        .map((v) => v.name);

      if (missingVariables.length > 0) {
        return { success: false, missingVariables };
      }

      // Generate test prompt
      const testContext: UserContext = {
        userId: 'test-user',
        profile: sampleData,
        preferences: sampleData,
        healthData: sampleData,
      };

      const prompt = await this.generateOptimizedPrompt(template, testContext, sampleData);

      return { success: true, prompt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get template usage analytics
   */
  getTemplateUsageAnalytics(): {
    mostUsed: string[];
    leastUsed: string[];
    averageExecutionTime: Record<string, number>;
    costEffective: string[];
  } {
    // Enhanced analytics implementation based on tracked usage data
    try {
      const analytics = this.calculateTemplateAnalytics();
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get template usage analytics', error);
      return {
        mostUsed: [],
        leastUsed: [],
        averageExecutionTime: {},
        costEffective: [],
      };
    }
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   */
  private sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename provided');
    }
    
    // Remove any path traversal sequences and unsafe characters
    // First replace path traversal sequences specifically
    let sanitized = filename
      .replace(/\.\./g, '') // Remove all .. sequences
      .replace(/[\/\\]/g, '_') // Replace forward and backward slashes
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_') // Only allow safe characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .replace(/_+/g, '_') // Collapse multiple underscores
      .substring(0, 255); // Limit length
    
    if (!sanitized || sanitized.length === 0) {
      throw new Error('Filename becomes empty after sanitization');
    }
    
    return sanitized;
  }

  /**
   * Enhanced persistent storage implementation for templates
   */
  private async saveTemplateToPersistentStorage(template: PromptTemplate): Promise<void> {
    try {
      // Save to cache with persistence flag
      const persistentKey = `template_persistent:${template.id}`;
      await this.cacheManager.set(persistentKey, template, 0); // No expiration

      // Optional: Save to file system for backup
      if (this.configService.get('ENABLE_FILE_BACKUP')) {
        const fs = require('fs').promises;
        const path = require('path');
        const templatesDir = path.join(process.cwd(), 'data', 'templates');
        
        // Ensure directory exists
        await fs.mkdir(templatesDir, { recursive: true });
        
        // Sanitize template ID to prevent path traversal
        const safeFilename = this.sanitizeFilename(template.id);
        const filePath = path.join(templatesDir, `${safeFilename}.json`);
        await fs.writeFile(filePath, JSON.stringify(template, null, 2));
        
        this.logger.debug(`Template saved to file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to save template to persistent storage: ${error.message}`);
    }
  }

  /**
   * Enhanced analytics calculation based on tracked usage data
   */
  private calculateTemplateAnalytics(): {
    mostUsed: string[];
    leastUsed: string[];
    averageExecutionTime: Record<string, number>;
    costEffective: string[];
  } {
    const usageData: Record<string, { count: number; totalTime: number; totalCost: number }> = {};
    
    // Analyze template usage patterns
    for (const [templateId, template] of this.templates.entries()) {
      const templateWithUsage = template as any; // Type assertion for usage tracking
      const usage = {
        count: templateWithUsage.usageCount || 0,
        totalTime: templateWithUsage.totalExecutionTime || 0,
        totalCost: templateWithUsage.totalCost || 0,
      };
      usageData[templateId] = usage;
    }

    // Sort by usage count
    const sortedByUsage = Object.entries(usageData)
      .sort(([, a], [, b]) => b.count - a.count);

    const mostUsed = sortedByUsage.slice(0, 5).map(([id]) => id);
    const leastUsed = sortedByUsage.slice(-5).map(([id]) => id);

    // Calculate average execution times
    const averageExecutionTime: Record<string, number> = {};
    for (const [templateId, data] of Object.entries(usageData)) {
      averageExecutionTime[templateId] = data.count > 0 ? data.totalTime / data.count : 0;
    }

    // Find cost-effective templates (high usage, low cost)
    const costEffective = Object.entries(usageData)
      .filter(([, data]) => data.count > 10 && data.totalCost / Math.max(data.count, 1) < 0.01)
      .map(([id]) => id)
      .slice(0, 5);

    return {
      mostUsed,
      leastUsed,
      averageExecutionTime,
      costEffective,
    };
  }
}
