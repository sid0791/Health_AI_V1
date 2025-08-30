import { Injectable, Logger } from '@nestjs/common';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { Recipe } from '../entities/recipe.entity';

export interface ModerationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContentModerationConfig {
  enableStrictMode: boolean;
  allowedDataSources: string[];
  requiredFields: string[];
  maxIngredientCount: number;
  maxStepCount: number;
  bannedIngredients: string[];
  restrictedTerms: string[];
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  private readonly config: ContentModerationConfig = {
    enableStrictMode: process.env.NODE_ENV === 'production',
    allowedDataSources: ['internal', 'verified_partner', 'nutritionist', 'bulk_import'],
    requiredFields: ['name', 'cuisine', 'dietType', 'ingredients', 'steps'],
    maxIngredientCount: 50,
    maxStepCount: 30,
    bannedIngredients: [
      'tobacco',
      'alcohol',
      'wine',
      'beer',
      'spirits',
      'synthetic additives',
      'artificial colors',
      'msg',
      'high fructose corn syrup',
    ],
    restrictedTerms: [
      'weight loss guarantee',
      'miracle cure',
      'instant results',
      'medical claims',
      'drug substitute',
    ],
  };

  // Ingredient safety database
  private readonly ingredientSafety: Record<string, { safe: boolean; reason?: string; alternatives?: string[] }> = {
    // Unsafe/banned ingredients
    'raw eggs': { safe: false, reason: 'Salmonella risk', alternatives: ['pasteurized eggs', 'egg substitute'] },
    'raw chicken': { safe: false, reason: 'Must be cooked', alternatives: ['cooked chicken'] },
    'raw fish': { safe: false, reason: 'Parasite risk unless sushi-grade', alternatives: ['cooked fish', 'sushi-grade fish'] },
    'unpasteurized dairy': { safe: false, reason: 'Bacterial contamination risk', alternatives: ['pasteurized dairy'] },
    'wild mushrooms': { safe: false, reason: 'Poisoning risk', alternatives: ['store-bought mushrooms'] },
    
    // Allergen-heavy ingredients requiring warnings
    peanuts: { safe: true, reason: 'Major allergen - requires warning' },
    'tree nuts': { safe: true, reason: 'Major allergen - requires warning' },
    shellfish: { safe: true, reason: 'Major allergen - requires warning' },
    
    // Health condition incompatible ingredients
    'high sodium': { safe: true, reason: 'Not suitable for hypertension' },
    'high sugar': { safe: true, reason: 'Not suitable for diabetes' },
    'trans fats': { safe: false, reason: 'Health risk', alternatives: ['healthy fats', 'olive oil'] },
  };

  async validateRecipe(recipeDto: CreateRecipeDto): Promise<ModerationResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    this.validateRequiredFields(recipeDto, violations);

    // Content length and structure validation
    this.validateStructure(recipeDto, violations, warnings);

    // Ingredient safety validation
    await this.validateIngredients(recipeDto.ingredients, violations, warnings);

    // Instruction safety validation
    this.validateInstructions(recipeDto.steps, violations, warnings);

    // Content moderation (banned terms, inappropriate content)
    this.validateContent(recipeDto, violations, warnings);

    // Data source validation
    this.validateDataSource(recipeDto.dataSource, violations);

    const severity = this.calculateSeverity(violations);
    const isValid = violations.length === 0;

    this.logger.debug(`Recipe validation for "${recipeDto.name}": ${isValid ? 'PASSED' : 'FAILED'}`);
    if (!isValid) {
      this.logger.warn(`Recipe validation violations: ${violations.join(', ')}`);
    }

    return {
      isValid,
      violations,
      warnings,
      severity,
    };
  }

  async validateRecipeUpdate(
    existingRecipe: Recipe,
    updateDto: UpdateRecipeDto,
  ): Promise<ModerationResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // If ingredients are being updated, validate them
    if (updateDto.ingredients) {
      await this.validateIngredients(updateDto.ingredients, violations, warnings);
    }

    // If steps are being updated, validate them
    if (updateDto.steps) {
      this.validateInstructions(updateDto.steps, violations, warnings);
    }

    // Validate content changes
    if (updateDto.name || updateDto.description || updateDto.tags) {
      this.validateContent(updateDto, violations, warnings);
    }

    // Check for quality score manipulation
    if (updateDto.qualityScore !== undefined && updateDto.qualityScore > existingRecipe.qualityScore + 2) {
      warnings.push('Quality score increase seems unusual');
    }

    const severity = this.calculateSeverity(violations);
    const isValid = violations.length === 0;

    return {
      isValid,
      violations,
      warnings,
      severity,
    };
  }

  async validateUserConstraints(
    recipe: Recipe,
    userConstraints: {
      allergies?: string[];
      dietaryRestrictions?: string[];
      healthConditions?: string[];
      religionRestrictions?: string[];
    },
  ): Promise<ModerationResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check allergen compatibility
    if (userConstraints.allergies?.length > 0) {
      userConstraints.allergies.forEach(allergen => {
        if (recipe.hasAllergen(allergen)) {
          violations.push(`Recipe contains allergen: ${allergen}`);
        }
      });
    }

    // Check dietary restriction compatibility
    if (userConstraints.dietaryRestrictions?.length > 0) {
      const isCompatible = userConstraints.dietaryRestrictions.some(restriction => {
        return recipe.isDietTypeCompatible(restriction as any);
      });
      if (!isCompatible) {
        violations.push('Recipe not compatible with dietary restrictions');
      }
    }

    // Check health condition compatibility
    if (userConstraints.healthConditions?.length > 0) {
      userConstraints.healthConditions.forEach(condition => {
        if (!recipe.isHealthConditionFriendly(condition)) {
          warnings.push(`Recipe may not be suitable for ${condition}`);
        }
      });
    }

    const severity = this.calculateSeverity(violations);
    const isValid = violations.length === 0;

    return {
      isValid,
      violations,
      warnings,
      severity,
    };
  }

  private validateRequiredFields(recipeDto: CreateRecipeDto, violations: string[]): void {
    this.config.requiredFields.forEach(field => {
      if (!recipeDto[field as keyof CreateRecipeDto]) {
        violations.push(`Required field missing: ${field}`);
      }
    });

    // Additional specific validations
    if (!recipeDto.ingredients || recipeDto.ingredients.length === 0) {
      violations.push('Recipe must have at least one ingredient');
    }

    if (!recipeDto.steps || recipeDto.steps.length === 0) {
      violations.push('Recipe must have at least one step');
    }
  }

  private validateStructure(
    recipeDto: CreateRecipeDto,
    violations: string[],
    warnings: string[],
  ): void {
    // Check ingredient count
    if (recipeDto.ingredients && recipeDto.ingredients.length > this.config.maxIngredientCount) {
      violations.push(`Too many ingredients (max: ${this.config.maxIngredientCount})`);
    }

    // Check step count
    if (recipeDto.steps && recipeDto.steps.length > this.config.maxStepCount) {
      violations.push(`Too many steps (max: ${this.config.maxStepCount})`);
    }

    // Check reasonable time values
    if (recipeDto.prepTimeMinutes > 480) { // 8 hours
      warnings.push('Unusually long prep time');
    }

    if (recipeDto.cookTimeMinutes > 720) { // 12 hours
      warnings.push('Unusually long cook time');
    }

    // Check reasonable serving count
    if (recipeDto.servingsCount > 50) {
      warnings.push('Unusually large serving count');
    }

    // Validate URLs if provided
    if (recipeDto.imageUrl && !this.isValidUrl(recipeDto.imageUrl)) {
      violations.push('Invalid image URL');
    }

    if (recipeDto.videoUrl && !this.isValidUrl(recipeDto.videoUrl)) {
      violations.push('Invalid video URL');
    }
  }

  private async validateIngredients(
    ingredients: any[],
    violations: string[],
    warnings: string[],
  ): Promise<void> {
    for (const ingredient of ingredients) {
      const ingredientName = ingredient.ingredientName?.toLowerCase();
      
      // Check against banned ingredients
      if (this.config.bannedIngredients.some(banned => ingredientName.includes(banned))) {
        violations.push(`Banned ingredient: ${ingredient.ingredientName}`);
      }

      // Check ingredient safety
      const safetyInfo = this.ingredientSafety[ingredientName];
      if (safetyInfo && !safetyInfo.safe) {
        violations.push(`Unsafe ingredient: ${ingredient.ingredientName} - ${safetyInfo.reason}`);
      }

      // Check for allergens requiring warnings
      if (safetyInfo && safetyInfo.reason?.includes('allergen')) {
        warnings.push(`Allergen present: ${ingredient.ingredientName}`);
      }

      // Validate quantity and unit
      if (ingredient.quantity <= 0) {
        violations.push(`Invalid quantity for ${ingredient.ingredientName}`);
      }

      if (!ingredient.unit || ingredient.unit.trim() === '') {
        violations.push(`Missing unit for ${ingredient.ingredientName}`);
      }
    }
  }

  private validateInstructions(steps: any[], violations: string[], warnings: string[]): void {
    steps.forEach((step, index) => {
      // Check for dangerous cooking instructions
      if (step.instruction) {
        const instruction = step.instruction.toLowerCase();
        
        // Check for unsafe cooking practices
        if (instruction.includes('raw') && instruction.includes('chicken')) {
          violations.push(`Step ${index + 1}: Raw chicken is unsafe`);
        }

        if (instruction.includes('deep fry') && !instruction.includes('temperature')) {
          warnings.push(`Step ${index + 1}: Deep frying should specify temperature`);
        }

        // Check for missing safety information
        if (step.isCritical && !step.safetyNote) {
          warnings.push(`Step ${index + 1}: Critical step missing safety note`);
        }
      }

      // Validate step order
      if (step.stepNumber !== index + 1) {
        violations.push(`Step numbering error at step ${index + 1}`);
      }
    });
  }

  private validateContent(recipeDto: any, violations: string[], warnings: string[]): void {
    const textFields = [recipeDto.name, recipeDto.description, ...(recipeDto.tags || [])];
    const combinedText = textFields.join(' ').toLowerCase();

    // Check for restricted terms
    this.config.restrictedTerms.forEach(term => {
      if (combinedText.includes(term.toLowerCase())) {
        violations.push(`Restricted term found: ${term}`);
      }
    });

    // Check for medical claims
    const medicalTerms = ['cure', 'treat', 'diagnose', 'prevent', 'medical'];
    medicalTerms.forEach(term => {
      if (combinedText.includes(term)) {
        warnings.push(`Potential medical claim detected: ${term}`);
      }
    });

    // Check for excessive promotional language
    const promotionalTerms = ['best', 'amazing', 'incredible', 'miracle'];
    const promotionalCount = promotionalTerms.reduce((count, term) => {
      return count + (combinedText.split(term).length - 1);
    }, 0);

    if (promotionalCount > 3) {
      warnings.push('Excessive promotional language detected');
    }
  }

  private validateDataSource(dataSource: string | undefined, violations: string[]): void {
    if (dataSource && !this.config.allowedDataSources.includes(dataSource)) {
      violations.push(`Invalid data source: ${dataSource}`);
    }
  }

  private calculateSeverity(violations: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.length === 0) return 'low';
    
    const criticalKeywords = ['unsafe', 'banned', 'dangerous', 'raw chicken'];
    const hasCritical = violations.some(violation =>
      criticalKeywords.some(keyword => violation.toLowerCase().includes(keyword))
    );

    if (hasCritical) return 'critical';
    if (violations.length >= 5) return 'high';
    if (violations.length >= 3) return 'medium';
    return 'low';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get ingredient alternatives for banned or unsafe ingredients
   */
  getIngredientAlternatives(ingredient: string): string[] {
    const safetyInfo = this.ingredientSafety[ingredient.toLowerCase()];
    return safetyInfo?.alternatives || [];
  }

  /**
   * Check if recipe requires special handling or warnings
   */
  requiresSpecialHandling(recipe: Recipe): { warnings: string[]; specialInstructions: string[] } {
    const warnings: string[] = [];
    const specialInstructions: string[] = [];

    // Check for allergens
    if (recipe.allergens?.length > 0) {
      warnings.push(`Contains allergens: ${recipe.allergens.join(', ')}`);
    }

    // Check for high-risk cooking methods
    recipe.steps?.forEach(step => {
      if (step.cookingMethod === 'deep_fry') {
        specialInstructions.push('Use thermometer to maintain oil temperature');
      }
      if (step.cookingMethod === 'pressure_cook') {
        specialInstructions.push('Follow pressure cooker safety guidelines');
      }
    });

    return { warnings, specialInstructions };
  }
}