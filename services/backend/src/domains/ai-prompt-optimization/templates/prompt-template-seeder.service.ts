import { Injectable, OnModuleInit } from '@nestjs/common';
import { AIPromptOptimizationService } from '../services/ai-prompt-optimization.service';
import { PromptCategory, VariableType, PromptStatus } from '../entities/ai-prompt-template.entity';

@Injectable()
export class PromptTemplateSeeder implements OnModuleInit {
  constructor(
    private readonly promptOptimizationService: AIPromptOptimizationService,
  ) {}

  async onModuleInit() {
    await this.seedPromptTemplates();
  }

  private async seedPromptTemplates() {
    const templates = [
      // Nutrition Advice Template
      {
        name: 'General Nutrition Advice',
        description: 'Provides personalized nutrition advice based on user profile and goals',
        category: PromptCategory.NUTRITION_ADVICE,
        systemPrompt: `You are a certified nutritionist AI assistant specialized in personalized health and nutrition advice. Provide evidence-based, safe, and practical nutrition recommendations. Always consider the user's health conditions, dietary preferences, and goals. If you're unsure about any medical condition, recommend consulting a healthcare professional.`,
        userPromptTemplate: `Please provide nutrition advice for {{userName}}, a {{userAge}} year old person.

User Profile:
- Current Weight: {{userWeight}} kg
- Height: {{userHeight}} cm
- Activity Level: {{activityLevel}}
- Health Conditions: {{healthConditions}}
- Dietary Preferences: {{dietaryPreferences}}
- Goals: {{userGoals}}

Current Context: {{userQuery}}

Please provide specific, actionable nutrition advice that considers their profile and current needs. Focus on practical recommendations they can implement today.`,
        variables: [
          {
            name: 'userName',
            type: VariableType.USER_PROFILE,
            description: 'User\'s first name',
            required: true,
            fallback: 'there',
          },
          {
            name: 'userAge',
            type: VariableType.USER_PROFILE,
            description: 'User\'s age',
            required: false,
            fallback: 'adult',
          },
          {
            name: 'userWeight',
            type: VariableType.USER_PROFILE,
            description: 'User\'s current weight',
            required: false,
            fallback: 'not specified',
          },
          {
            name: 'userHeight',
            type: VariableType.USER_PROFILE,
            description: 'User\'s height',
            required: false,
            fallback: 'not specified',
          },
          {
            name: 'activityLevel',
            type: VariableType.USER_PROFILE,
            description: 'User\'s activity level',
            required: false,
            fallback: 'moderate',
          },
          {
            name: 'healthConditions',
            type: VariableType.HEALTH_DATA,
            description: 'User\'s health conditions',
            required: false,
            fallback: 'none reported',
          },
          {
            name: 'dietaryPreferences',
            type: VariableType.PREFERENCES,
            description: 'User\'s dietary preferences and restrictions',
            required: false,
            fallback: 'none specified',
          },
          {
            name: 'userGoals',
            type: VariableType.GOALS,
            description: 'User\'s health and fitness goals',
            required: false,
            fallback: 'general health improvement',
          },
          {
            name: 'userQuery',
            type: VariableType.CONTEXT,
            description: 'User\'s specific question or context',
            required: true,
            fallback: 'general nutrition guidance',
          },
        ],
        constraints: {
          maxTokens: 500,
          temperature: 0.7,
          topP: 0.9,
        },
        status: PromptStatus.ACTIVE,
        version: '1.0',
      },

      // Meal Planning Template
      {
        name: 'Personalized Meal Planning',
        description: 'Creates optimized meal plans based on user preferences and nutritional needs',
        category: PromptCategory.MEAL_PLANNING,
        systemPrompt: `You are an AI nutritionist specializing in meal planning. Create balanced, nutritious, and practical meal plans that align with the user's goals, preferences, and lifestyle. Ensure meals are culturally appropriate, budget-friendly, and include cooking time estimates. Always provide macro and micro nutrient information when possible.`,
        userPromptTemplate: `Create a personalized meal plan for {{userName}}.

User Details:
- Age: {{userAge}}
- Weight: {{userWeight}} kg, Height: {{userHeight}} cm
- Activity Level: {{activityLevel}}
- Health Conditions: {{healthConditions}}
- Dietary Preferences: {{dietaryPreferences}}
- Goals: {{userGoals}}

Meal Planning Request: {{mealPlanRequest}}

Please create a detailed meal plan that includes:
1. Breakfast, lunch, dinner, and 2 snacks
2. Estimated calories and macronutrients
3. Cooking time and difficulty level
4. Shopping list suggestions
5. Meal prep tips

Focus on Indian cuisine options where possible, with healthy alternatives to common cravings.`,
        variables: [
          {
            name: 'userName',
            type: VariableType.USER_PROFILE,
            description: 'User\'s name',
            required: true,
            fallback: 'there',
          },
          {
            name: 'userAge',
            type: VariableType.USER_PROFILE,
            description: 'User\'s age',
            required: false,
            fallback: 'adult',
          },
          {
            name: 'userWeight',
            type: VariableType.USER_PROFILE,
            description: 'User\'s weight',
            required: false,
            fallback: 'not specified',
          },
          {
            name: 'userHeight',
            type: VariableType.USER_PROFILE,
            description: 'User\'s height',
            required: false,
            fallback: 'not specified',
          },
          {
            name: 'activityLevel',
            type: VariableType.USER_PROFILE,
            description: 'User\'s activity level',
            required: false,
            fallback: 'moderate',
          },
          {
            name: 'healthConditions',
            type: VariableType.HEALTH_DATA,
            description: 'User\'s health conditions',
            required: false,
            fallback: 'none reported',
          },
          {
            name: 'dietaryPreferences',
            type: VariableType.PREFERENCES,
            description: 'Dietary preferences',
            required: false,
            fallback: 'no restrictions',
          },
          {
            name: 'userGoals',
            type: VariableType.GOALS,
            description: 'User\'s goals',
            required: false,
            fallback: 'healthy eating',
          },
          {
            name: 'mealPlanRequest',
            type: VariableType.CONTEXT,
            description: 'Specific meal planning request',
            required: true,
            fallback: 'a balanced weekly meal plan',
          },
        ],
        constraints: {
          maxTokens: 800,
          temperature: 0.8,
          topP: 0.9,
        },
        status: PromptStatus.ACTIVE,
        version: '1.0',
      },

      // Fitness Planning Template
      {
        name: 'AI Fitness Coach',
        description: 'Provides personalized fitness advice and workout recommendations',
        category: PromptCategory.FITNESS_PLANNING,
        systemPrompt: `You are a certified personal trainer AI assistant. Provide safe, effective, and personalized fitness advice. Always prioritize user safety and recommend proper form. Consider the user's experience level, available equipment, and physical limitations. Provide modifications for different fitness levels.`,
        userPromptTemplate: `Create a fitness plan for {{userName}}.

Profile:
- Age: {{userAge}}
- Current Weight: {{userWeight}} kg
- Activity Level: {{activityLevel}}
- Health Conditions: {{healthConditions}}
- Fitness Goals: {{userGoals}}
- Available Time: {{availableTime}}
- Equipment Access: {{equipmentAccess}}

Request: {{fitnessRequest}}

Please provide:
1. Specific workout recommendations
2. Exercise form tips and safety notes
3. Progression plan for next 4 weeks
4. Recovery and rest day guidance
5. Modifications for different fitness levels

Keep it practical and achievable for their current fitness level.`,
        variables: [
          {
            name: 'userName',
            type: VariableType.USER_PROFILE,
            description: 'User\'s name',
            required: true,
            fallback: 'there',
          },
          {
            name: 'userAge',
            type: VariableType.USER_PROFILE,
            description: 'User\'s age',
            required: false,
            fallback: 'adult',
          },
          {
            name: 'userWeight',
            type: VariableType.USER_PROFILE,
            description: 'User\'s weight',
            required: false,
            fallback: 'not specified',
          },
          {
            name: 'activityLevel',
            type: VariableType.USER_PROFILE,
            description: 'Current activity level',
            required: false,
            fallback: 'beginner',
          },
          {
            name: 'healthConditions',
            type: VariableType.HEALTH_DATA,
            description: 'Health conditions or limitations',
            required: false,
            fallback: 'none reported',
          },
          {
            name: 'userGoals',
            type: VariableType.GOALS,
            description: 'Fitness goals',
            required: false,
            fallback: 'general fitness',
          },
          {
            name: 'availableTime',
            type: VariableType.CONTEXT,
            description: 'Available workout time',
            required: false,
            fallback: '30-45 minutes',
          },
          {
            name: 'equipmentAccess',
            type: VariableType.CONTEXT,
            description: 'Available equipment',
            required: false,
            fallback: 'bodyweight exercises',
          },
          {
            name: 'fitnessRequest',
            type: VariableType.CONTEXT,
            description: 'Specific fitness request',
            required: true,
            fallback: 'a complete workout plan',
          },
        ],
        constraints: {
          maxTokens: 700,
          temperature: 0.7,
          topP: 0.9,
        },
        status: PromptStatus.ACTIVE,
        version: '1.0',
      },

      // General Health Chat Template
      {
        name: 'Health Assistant Chat',
        description: 'General health questions and guidance with personalized context',
        category: PromptCategory.GENERAL_CHAT,
        systemPrompt: `You are a knowledgeable health and wellness AI assistant. Provide helpful, evidence-based information while being warm and supportive. Always recommend consulting healthcare professionals for medical concerns. Keep responses conversational and easy to understand.`,
        userPromptTemplate: `Hello {{userName}}! I'm here to help with your health and wellness questions.

Your profile:
- Goals: {{userGoals}}
- Health considerations: {{healthConditions}}
- Preferences: {{dietaryPreferences}}

Your question: {{userQuestion}}

I'll provide helpful information tailored to your situation. Remember, this is for informational purposes and doesn't replace professional medical advice.`,
        variables: [
          {
            name: 'userName',
            type: VariableType.USER_PROFILE,
            description: 'User\'s name',
            required: true,
            fallback: 'there',
          },
          {
            name: 'userGoals',
            type: VariableType.GOALS,
            description: 'User\'s goals',
            required: false,
            fallback: 'general wellness',
          },
          {
            name: 'healthConditions',
            type: VariableType.HEALTH_DATA,
            description: 'Health conditions',
            required: false,
            fallback: 'none reported',
          },
          {
            name: 'dietaryPreferences',
            type: VariableType.PREFERENCES,
            description: 'Dietary preferences',
            required: false,
            fallback: 'none specified',
          },
          {
            name: 'userQuestion',
            type: VariableType.CONTEXT,
            description: 'User\'s question',
            required: true,
            fallback: 'general health guidance',
          },
        ],
        constraints: {
          maxTokens: 400,
          temperature: 0.8,
          topP: 0.9,
        },
        status: PromptStatus.ACTIVE,
        version: '1.0',
      },
    ];

    // Create each template
    for (const templateData of templates) {
      try {
        const existing = await this.promptOptimizationService.getOptimalTemplate(templateData.category as PromptCategory);
        if (!existing) {
          await this.promptOptimizationService.createTemplate(templateData);
          console.log(`Created prompt template: ${templateData.name}`);
        }
      } catch (error) {
        console.error(`Error creating template ${templateData.name}:`, error);
      }
    }
  }
}