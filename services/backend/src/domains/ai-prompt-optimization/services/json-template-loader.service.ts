import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PromptTemplate, PromptCategory } from '../services/prompt-optimization.service';

@Injectable()
export class JsonTemplateLoaderService {
  private readonly logger = new Logger(JsonTemplateLoaderService.name);
  private readonly templatesPath = join(__dirname, '..', 'templates', 'json');
  private readonly templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.loadTemplatesFromJson();
  }

  /**
   * Load all JSON templates from the templates/json directory
   */
  private loadTemplatesFromJson(): void {
    try {
      const templateFiles = [
        'nutrition-advice.json',
        'meal-planning.json', 
        'fitness-guidance.json',
        'health-analysis.json',
        'general-chat.json'
      ];

      let loadedCount = 0;
      
      for (const file of templateFiles) {
        try {
          const filePath = join(this.templatesPath, file);
          const templateData = JSON.parse(readFileSync(filePath, 'utf8'));
          
          // Validate template structure
          if (this.validateTemplate(templateData)) {
            this.templates.set(templateData.id, templateData as PromptTemplate);
            loadedCount++;
            this.logger.log(`Loaded template: ${templateData.id} from ${file}`);
          } else {
            this.logger.warn(`Invalid template structure in ${file}`);
          }
        } catch (error) {
          this.logger.error(`Failed to load template from ${file}: ${error.message}`);
        }
      }

      this.logger.log(`Successfully loaded ${loadedCount} JSON templates`);
    } catch (error) {
      this.logger.error(`Failed to load JSON templates: ${error.message}`);
    }
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: any): boolean {
    const requiredFields = ['id', 'category', 'name', 'template', 'variables'];
    return requiredFields.every(field => template.hasOwnProperty(field));
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template metadata for cost optimization
   */
  getTemplateMetadata(id: string): any {
    const template = this.templates.get(id);
    return template?.metadata || null;
  }

  /**
   * Reload templates from JSON files (useful for dynamic updates)
   */
  reloadTemplates(): void {
    this.templates.clear();
    this.loadTemplatesFromJson();
    this.logger.log('Templates reloaded from JSON files');
  }

  /**
   * Get templates optimized for cost
   */
  getCostOptimizedTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.costOptimized);
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    total: number;
    byCategory: Record<string, number>;
    costOptimized: number;
    byLanguage: Record<string, number>;
  } {
    const templates = Array.from(this.templates.values());
    
    const byCategory = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byLanguage = templates.reduce((acc, t) => {
      acc[t.language] = (acc[t.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: templates.length,
      byCategory,
      costOptimized: templates.filter(t => t.costOptimized).length,
      byLanguage
    };
  }
}