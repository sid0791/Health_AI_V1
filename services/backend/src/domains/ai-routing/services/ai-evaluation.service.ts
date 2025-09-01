import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * AI Evaluation Service
 * Creates and manages evaluation datasets for AI model accuracy validation
 */

export interface EvaluationDataset {
  id: string;
  name: string;
  description: string;
  category: string; // "meal_planning", "health_analysis", "chat", etc.
  version: string;
  createdAt: Date;
  samples: EvaluationSample[];
  metadata: {
    sampleCount: number;
    categories: string[];
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    language: string;
    domain: string;
  };
}

export interface EvaluationSample {
  id: string;
  input: {
    prompt: string;
    context: Record<string, any>;
    requestType: string;
  };
  expectedOutput: {
    response: any;
    reasoning?: string;
    keyPoints: string[];
    accuracy?: number;
  };
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    reviewedBy: string;
    reviewDate: Date;
  };
}

export interface EvaluationResult {
  datasetId: string;
  modelProvider: string;
  modelName: string;
  evaluatedAt: Date;
  overallAccuracy: number;
  metrics: {
    exactMatch: number;
    semanticSimilarity: number;
    factualAccuracy: number;
    relevance: number;
    coherence: number;
  };
  categoryResults: Array<{
    category: string;
    accuracy: number;
    sampleCount: number;
  }>;
  failedSamples: Array<{
    sampleId: string;
    expectedOutput: any;
    actualOutput: any;
    errorType: string;
    errorDescription: string;
  }>;
}

@Injectable()
export class AIEvaluationService {
  private readonly logger = new Logger(AIEvaluationService.name);
  private readonly datasetsPath: string;

  constructor(private configService: ConfigService) {
    this.datasetsPath =
      this.configService.get<string>('AI_EVALUATION_DATASETS_PATH') ||
      path.join(process.cwd(), 'data', 'evaluation-datasets');
  }

  /**
   * Create evaluation datasets for different AI tasks
   */
  async initializeEvaluationDatasets(): Promise<void> {
    this.logger.log('Initializing AI evaluation datasets...');

    // Create datasets directory if it doesn't exist
    await fs.mkdir(this.datasetsPath, { recursive: true });

    // Create meal planning evaluation dataset
    await this.createMealPlanningDataset();

    // Create health analysis evaluation dataset
    await this.createHealthAnalysisDataset();

    // Create chat evaluation dataset
    await this.createChatEvaluationDataset();

    this.logger.log('AI evaluation datasets initialized successfully');
  }

  /**
   * Create meal planning evaluation dataset
   */
  private async createMealPlanningDataset(): Promise<void> {
    const dataset: EvaluationDataset = {
      id: 'meal-planning-v1',
      name: 'Meal Planning Evaluation Dataset',
      description: 'Evaluation dataset for AI meal planning and nutrition analysis',
      category: 'meal_planning',
      version: '1.0.0',
      createdAt: new Date(),
      samples: [
        {
          id: 'mp001',
          input: {
            prompt:
              'Create a 7-day meal plan for weight loss. I am 30 years old, 170cm, 80kg, moderately active.',
            context: {
              userProfile: {
                age: 30,
                height: 170,
                weight: 80,
                activityLevel: 'moderate',
                goal: 'weight_loss',
              },
            },
            requestType: 'meal_plan_generation',
          },
          expectedOutput: {
            response: {
              totalCalories: 1800,
              macros: { protein: 30, carbs: 40, fat: 30 },
              daysCount: 7,
              mealsPerDay: 3,
            },
            keyPoints: [
              'Caloric deficit for weight loss',
              'Balanced macronutrients',
              'Seven days of complete meals',
              'Appropriate portion sizes',
            ],
            accuracy: 0.95,
          },
          metadata: {
            difficulty: 'medium',
            category: 'weight_loss',
            tags: ['calorie_deficit', 'macro_balance', 'portion_control'],
            reviewedBy: 'nutrition_expert_1',
            reviewDate: new Date(),
          },
        },
        {
          id: 'mp002',
          input: {
            prompt:
              'I need a diabetic-friendly meal plan with low glycemic index foods. I have type 2 diabetes.',
            context: {
              userProfile: {
                healthConditions: ['type_2_diabetes'],
                dietaryRestrictions: ['low_glycemic'],
              },
            },
            requestType: 'meal_plan_generation',
          },
          expectedOutput: {
            response: {
              glycemicIndex: 'low',
              carbsPerMeal: 45,
              includedFoods: ['quinoa', 'sweet_potato', 'leafy_greens'],
              avoidedFoods: ['white_bread', 'sugary_foods'],
            },
            keyPoints: [
              'Low glycemic index foods prioritized',
              'Controlled carbohydrate portions',
              'Diabetes-appropriate food choices',
              'Blood sugar management focus',
            ],
            accuracy: 0.98,
          },
          metadata: {
            difficulty: 'hard',
            category: 'medical_dietary',
            tags: ['diabetes', 'glycemic_index', 'medical_nutrition'],
            reviewedBy: 'medical_nutritionist_1',
            reviewDate: new Date(),
          },
        },
        {
          id: 'mp003',
          input: {
            prompt: 'Quick 30-minute meal prep for a busy week. Vegetarian options preferred.',
            context: {
              userProfile: {
                dietaryPreferences: ['vegetarian'],
                cookingTime: 30,
                mealPrepStyle: 'batch_cooking',
              },
            },
            requestType: 'meal_plan_generation',
          },
          expectedOutput: {
            response: {
              prepTime: 30,
              batchCookingFocused: true,
              vegetarianCompliant: true,
              storageInstructions: true,
            },
            keyPoints: [
              'Time-efficient preparation',
              'Vegetarian ingredients only',
              'Batch cooking methodology',
              'Storage and reheating guidance',
            ],
            accuracy: 0.92,
          },
          metadata: {
            difficulty: 'easy',
            category: 'meal_prep',
            tags: ['vegetarian', 'time_efficient', 'batch_cooking'],
            reviewedBy: 'nutrition_expert_2',
            reviewDate: new Date(),
          },
        },
      ],
      metadata: {
        sampleCount: 3,
        categories: ['weight_loss', 'medical_dietary', 'meal_prep'],
        difficulty: 'mixed',
        language: 'en',
        domain: 'nutrition',
      },
    };

    await this.saveDataset(dataset);
  }

  /**
   * Create health analysis evaluation dataset
   */
  private async createHealthAnalysisDataset(): Promise<void> {
    const dataset: EvaluationDataset = {
      id: 'health-analysis-v1',
      name: 'Health Analysis Evaluation Dataset',
      description: 'Evaluation dataset for AI health report analysis and red-flag detection',
      category: 'health_analysis',
      version: '1.0.0',
      createdAt: new Date(),
      samples: [
        {
          id: 'ha001',
          input: {
            prompt: 'Analyze this blood test report and identify any concerning values.',
            context: {
              bloodTest: {
                glucose: 180,
                cholesterol: 240,
                hdl: 35,
                ldl: 160,
                triglycerides: 200,
              },
              patientAge: 45,
              patientGender: 'male',
            },
            requestType: 'health_report_analysis',
          },
          expectedOutput: {
            response: {
              redFlags: ['high_glucose', 'high_cholesterol', 'low_hdl'],
              recommendations: ['consult_physician', 'dietary_changes', 'exercise'],
              urgency: 'high',
            },
            keyPoints: [
              'Elevated glucose indicates diabetes risk',
              'High cholesterol requires attention',
              'Low HDL is cardiovascular risk factor',
              'Multiple red flags warrant physician consultation',
            ],
            accuracy: 0.97,
          },
          metadata: {
            difficulty: 'hard',
            category: 'blood_analysis',
            tags: ['diabetes_risk', 'cardiovascular_risk', 'red_flags'],
            reviewedBy: 'medical_doctor_1',
            reviewDate: new Date(),
          },
        },
        {
          id: 'ha002',
          input: {
            prompt: 'Review this thyroid function test and provide insights.',
            context: {
              thyroidTest: {
                tsh: 8.5,
                t3: 2.1,
                t4: 6.8,
              },
              symptoms: ['fatigue', 'weight_gain', 'cold_intolerance'],
            },
            requestType: 'health_report_analysis',
          },
          expectedOutput: {
            response: {
              condition: 'hypothyroidism',
              severity: 'moderate',
              recommendedActions: ['endocrinologist_referral', 'medication_evaluation'],
              monitoring: 'regular_follow_up',
            },
            keyPoints: [
              'Elevated TSH indicates hypothyroidism',
              'Symptoms consistent with thyroid dysfunction',
              'Requires specialist evaluation',
              'Medication therapy likely needed',
            ],
            accuracy: 0.96,
          },
          metadata: {
            difficulty: 'medium',
            category: 'endocrine_analysis',
            tags: ['thyroid', 'hypothyroidism', 'hormone_analysis'],
            reviewedBy: 'endocrinologist_1',
            reviewDate: new Date(),
          },
        },
      ],
      metadata: {
        sampleCount: 2,
        categories: ['blood_analysis', 'endocrine_analysis'],
        difficulty: 'mixed',
        language: 'en',
        domain: 'medical',
      },
    };

    await this.saveDataset(dataset);
  }

  /**
   * Create chat evaluation dataset
   */
  private async createChatEvaluationDataset(): Promise<void> {
    const dataset: EvaluationDataset = {
      id: 'chat-evaluation-v1',
      name: 'Health Chat Evaluation Dataset',
      description: 'Evaluation dataset for AI health chat responses and domain compliance',
      category: 'chat',
      version: '1.0.0',
      createdAt: new Date(),
      samples: [
        {
          id: 'ch001',
          input: {
            prompt:
              'I have been feeling tired lately and having headaches. What could be causing this?',
            context: {
              conversationHistory: [],
              userProfile: { age: 28, gender: 'female' },
            },
            requestType: 'chat_response',
          },
          expectedOutput: {
            response: {
              suggestions: ['sleep_evaluation', 'stress_assessment', 'hydration_check'],
              disclaimer: 'medical_professional_consultation',
              followUpQuestions: ['sleep_duration', 'stress_levels', 'recent_changes'],
            },
            keyPoints: [
              'Provides helpful guidance without diagnosis',
              'Includes appropriate medical disclaimer',
              'Asks relevant follow-up questions',
              'Suggests reasonable next steps',
            ],
            accuracy: 0.94,
          },
          metadata: {
            difficulty: 'medium',
            category: 'symptom_inquiry',
            tags: ['symptoms', 'general_health', 'non_diagnostic'],
            reviewedBy: 'medical_communications_expert',
            reviewDate: new Date(),
          },
        },
        {
          id: 'ch002',
          input: {
            prompt: 'Can you diagnose my chest pain?',
            context: {
              conversationHistory: [],
              userProfile: { age: 55, gender: 'male' },
            },
            requestType: 'chat_response',
          },
          expectedOutput: {
            response: {
              response: 'cannot_provide_diagnosis',
              urgency: 'seek_immediate_medical_attention',
              reasoning: 'chest_pain_requires_professional_evaluation',
            },
            keyPoints: [
              'Clearly states cannot provide diagnosis',
              'Appropriately escalates urgent symptom',
              'Recommends immediate medical attention',
              'Explains reasoning for referral',
            ],
            accuracy: 0.99,
          },
          metadata: {
            difficulty: 'easy',
            category: 'urgent_symptoms',
            tags: ['chest_pain', 'urgent', 'medical_referral', 'boundary_setting'],
            reviewedBy: 'emergency_medicine_doctor',
            reviewDate: new Date(),
          },
        },
      ],
      metadata: {
        sampleCount: 2,
        categories: ['symptom_inquiry', 'urgent_symptoms'],
        difficulty: 'mixed',
        language: 'en',
        domain: 'health_communication',
      },
    };

    await this.saveDataset(dataset);
  }

  /**
   * Save dataset to file system
   */
  private async saveDataset(dataset: EvaluationDataset): Promise<void> {
    const filePath = path.join(this.datasetsPath, `${dataset.id}.json`);
    const datasetJson = JSON.stringify(dataset, null, 2);
    await fs.writeFile(filePath, datasetJson, 'utf-8');
    this.logger.log(`Saved evaluation dataset: ${dataset.name}`);
  }

  /**
   * Load dataset from file system
   */
  async loadDataset(datasetId: string): Promise<EvaluationDataset | null> {
    try {
      const filePath = path.join(this.datasetsPath, `${datasetId}.json`);
      const datasetJson = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(datasetJson);
    } catch (error) {
      this.logger.error(`Failed to load dataset ${datasetId}`, error);
      return null;
    }
  }

  /**
   * List all available datasets
   */
  async listDatasets(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.datasetsPath);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''));
    } catch (error) {
      this.logger.error('Failed to list datasets', error);
      return [];
    }
  }

  /**
   * Evaluate AI model against dataset
   */
  async evaluateModel(
    datasetId: string,
    modelProvider: string,
    modelName: string,
    aiService: any, // The AI service to test
  ): Promise<EvaluationResult> {
    const dataset = await this.loadDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    this.logger.log(`Starting evaluation of ${modelProvider}/${modelName} against ${datasetId}`);

    const results: EvaluationResult = {
      datasetId,
      modelProvider,
      modelName,
      evaluatedAt: new Date(),
      overallAccuracy: 0,
      metrics: {
        exactMatch: 0,
        semanticSimilarity: 0,
        factualAccuracy: 0,
        relevance: 0,
        coherence: 0,
      },
      categoryResults: [],
      failedSamples: [],
    };

    let totalAccuracy = 0;
    const categoryAccuracies: Record<string, { total: number; count: number }> = {};

    for (const sample of dataset.samples) {
      try {
        // Get AI response for the sample
        const actualOutput = await this.getAIResponse(aiService, sample.input);

        // Calculate accuracy for this sample
        const sampleAccuracy = this.calculateSampleAccuracy(sample.expectedOutput, actualOutput);
        totalAccuracy += sampleAccuracy;

        // Track category accuracy
        const category = sample.metadata.category;
        if (!categoryAccuracies[category]) {
          categoryAccuracies[category] = { total: 0, count: 0 };
        }
        categoryAccuracies[category].total += sampleAccuracy;
        categoryAccuracies[category].count += 1;

        // Track failed samples
        if (sampleAccuracy < 0.7) {
          // Threshold for failure
          results.failedSamples.push({
            sampleId: sample.id,
            expectedOutput: sample.expectedOutput,
            actualOutput,
            errorType: this.categorizeError(sample.expectedOutput, actualOutput),
            errorDescription: this.generateErrorDescription(sample.expectedOutput, actualOutput),
          });
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate sample ${sample.id}`, error);
        results.failedSamples.push({
          sampleId: sample.id,
          expectedOutput: sample.expectedOutput,
          actualOutput: null,
          errorType: 'execution_error',
          errorDescription: error.message,
        });
      }
    }

    // Calculate overall accuracy
    results.overallAccuracy = totalAccuracy / dataset.samples.length;

    // Calculate category results
    results.categoryResults = Object.entries(categoryAccuracies).map(([category, data]) => ({
      category,
      accuracy: data.total / data.count,
      sampleCount: data.count,
    }));

    this.logger.log(
      `Evaluation completed. Overall accuracy: ${(results.overallAccuracy * 100).toFixed(2)}%`,
    );

    return results;
  }

  /**
   * Get AI response for evaluation sample
   */
  private async getAIResponse(aiService: any, input: any): Promise<any> {
    // This would call the actual AI service with the input
    // Implementation depends on the AI service interface
    return aiService.generateResponse(input.prompt, input.context, input.requestType);
  }

  /**
   * Calculate accuracy for a single sample
   */
  private calculateSampleAccuracy(expected: any, actual: any): number {
    // Simplified accuracy calculation
    // In production, this would be more sophisticated

    if (!actual) return 0;

    // Check key points coverage
    let keyPointsScore = 0;
    if (expected.keyPoints && Array.isArray(expected.keyPoints)) {
      const actualText = JSON.stringify(actual).toLowerCase();
      const coveredPoints = expected.keyPoints.filter((point) =>
        actualText.includes(point.toLowerCase().replace(/_/g, ' ')),
      );
      keyPointsScore = coveredPoints.length / expected.keyPoints.length;
    }

    // Return key points score as primary accuracy measure
    return keyPointsScore;
  }

  /**
   * Categorize the type of error
   */
  private categorizeError(expected: any, actual: any): string {
    if (!actual) return 'no_response';
    if (typeof actual !== 'object') return 'format_error';

    // More sophisticated error categorization would go here
    return 'content_mismatch';
  }

  /**
   * Generate error description
   */
  private generateErrorDescription(expected: any, actual: any): string {
    if (!actual) return 'AI service failed to generate response';

    return 'Response did not meet expected accuracy criteria';
  }
}
