import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Recipe } from './recipe.entity';

export enum InstructionType {
  PREPARATION = 'preparation',
  COOKING = 'cooking',
  ASSEMBLY = 'assembly',
  GARNISHING = 'garnishing',
  SERVING = 'serving',
  STORAGE = 'storage',
  TIPS = 'tips',
}

export enum CookingMethod {
  CHOPPING = 'chopping',
  DICING = 'dicing',
  MINCING = 'mincing',
  SLICING = 'slicing',
  GRATING = 'grating',
  MARINATING = 'marinating',
  SAUTEING = 'sauteing',
  FRYING = 'frying',
  DEEP_FRYING = 'deep_frying',
  BOILING = 'boiling',
  STEAMING = 'steaming',
  GRILLING = 'grilling',
  ROASTING = 'roasting',
  BAKING = 'baking',
  SIMMERING = 'simmering',
  TEMPERING = 'tempering', // Tadka
  GRINDING = 'grinding',
  MIXING = 'mixing',
  WHISKING = 'whisking',
  KNEADING = 'kneading',
  RESTING = 'resting',
  COOLING = 'cooling',
  GARNISHING = 'garnishing',
  PLATING = 'plating',
}

@Entity('recipe_instructions')
@Index(['recipeId', 'stepNumber'])
@Index(['instructionType', 'cookingMethod'])
export class RecipeInstruction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @Column({ name: 'step_number', type: 'int' })
  stepNumber: number;

  @Column({
    type: 'enum',
    enum: InstructionType,
    name: 'instruction_type',
    default: InstructionType.COOKING,
  })
  instructionType: InstructionType;

  // Instruction Content
  @Column({ type: 'text' })
  instruction: string;

  @Column({ name: 'instruction_hindi', type: 'text', nullable: true })
  instructionHindi?: string;

  @Column({ name: 'instruction_local', type: 'text', nullable: true })
  instructionLocal?: string; // Regional language

  // Timing
  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number; // Time for this step

  @Column({ name: 'is_active_time', default: true })
  isActiveTime: boolean; // Whether this requires active attention

  // Cooking Details
  @Column({
    type: 'enum',
    enum: CookingMethod,
    name: 'cooking_method',
    nullable: true,
  })
  cookingMethod?: CookingMethod;

  @Column({ length: 100, nullable: true })
  temperature?: string; // "medium heat", "350°F", "high flame"

  @Column({ name: 'equipment_needed', length: 200, nullable: true })
  equipmentNeeded?: string; // "heavy-bottomed pan", "pressure cooker"

  // Visual and Safety Cues
  @Column({ name: 'visual_cues', type: 'text', nullable: true })
  visualCues?: string; // "until golden brown", "when bubbles form"

  @Column({ name: 'audio_cues', type: 'text', nullable: true })
  audioCues?: string; // "until sizzling stops", "when pressure cooker whistles"

  @Column({ name: 'texture_cues', type: 'text', nullable: true })
  textureCues?: string; // "until soft to touch", "when knife pierces easily"

  @Column({ name: 'safety_warnings', type: 'text', nullable: true })
  safetyWarnings?: string; // "handle hot oil carefully", "steam release caution"

  // Ingredients for this step
  @Column({
    type: 'text',
    array: true,
    name: 'ingredients_used',
    default: [],
  })
  ingredientsUsed: string[]; // Ingredient names used in this step

  @Column({
    type: 'text',
    array: true,
    name: 'equipment_list',
    default: [],
  })
  equipmentList: string[]; // Equipment needed for this step

  // Tips and Variations
  @Column({ type: 'text', nullable: true })
  tips?: string;

  @Column({ type: 'text', nullable: true })
  troubleshooting?: string; // What to do if something goes wrong

  @Column({ name: 'chef_notes', type: 'text', nullable: true })
  chefNotes?: string;

  @Column({ name: 'alternative_methods', type: 'text', nullable: true })
  alternativeMethods?: string;

  // Media
  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string; // Step-by-step photo

  @Column({ name: 'video_url', length: 500, nullable: true })
  videoUrl?: string; // Video demonstration

  @Column({ name: 'gif_url', length: 500, nullable: true })
  gifUrl?: string; // Animated demonstration

  // Interactive Elements
  @Column({ name: 'has_timer', default: false })
  hasTimer: boolean; // Whether to show a timer for this step

  @Column({ name: 'is_critical_step', default: false })
  isCriticalStep: boolean; // Step that affects recipe success significantly

  @Column({ name: 'difficulty_level', type: 'int', default: 3 })
  difficultyLevel: number; // 1-5 scale for this specific step

  // Quality Indicators
  @Column({ name: 'success_indicators', type: 'text', nullable: true })
  successIndicators?: string; // How to know if the step was done correctly

  @Column({ name: 'common_mistakes', type: 'text', nullable: true })
  commonMistakes?: string; // Common errors and how to avoid them

  // Nutritional Impact
  @Column({ name: 'nutritional_notes', type: 'text', nullable: true })
  nutritionalNotes?: string; // How this step affects nutrition

  @Column({ name: 'cooking_loss_factor', type: 'decimal', precision: 5, scale: 2, default: 1 })
  cookingLossFactor: number; // Factor for nutrient loss during cooking

  // Customization
  @Column({ name: 'is_customizable', default: false })
  isCustomizable: boolean;

  @Column({ name: 'customization_options', type: 'text', nullable: true })
  customizationOptions?: string;

  // Regional Variations
  @Column({ name: 'regional_variations', type: 'text', nullable: true })
  regionalVariations?: string;

  @Column({ name: 'cultural_significance', type: 'text', nullable: true })
  culturalSignificance?: string;

  // Data classification
  @Column({ name: 'content_classification', default: 'PUBLIC' })
  contentClassification: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Recipe, (recipe) => recipe.instructions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Helper methods
  getDisplayInstruction(language: 'en' | 'hi' | 'local' = 'en'): string {
    switch (language) {
      case 'hi':
        return this.instructionHindi || this.instruction;
      case 'local':
        return this.instructionLocal || this.instructionHindi || this.instruction;
      default:
        return this.instruction;
    }
  }

  getFormattedDuration(): string {
    if (!this.durationMinutes) return '';

    if (this.durationMinutes < 60) {
      return `${this.durationMinutes} minutes`;
    }

    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;

    if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }

  getStepType(): string {
    return this.instructionType.replace('_', ' ').toLowerCase();
  }

  isPreparationStep(): boolean {
    return this.instructionType === InstructionType.PREPARATION;
  }

  isCookingStep(): boolean {
    return this.instructionType === InstructionType.COOKING;
  }

  requiresActiveAttention(): boolean {
    return this.isActiveTime;
  }

  hasVisualAids(): boolean {
    return !!(this.imageUrl || this.videoUrl || this.gifUrl);
  }

  getCompletionCues(): string {
    const cues = [];

    if (this.visualCues) cues.push(`Visual: ${this.visualCues}`);
    if (this.audioCues) cues.push(`Audio: ${this.audioCues}`);
    if (this.textureCues) cues.push(`Texture: ${this.textureCues}`);
    if (this.durationMinutes) cues.push(`Time: ${this.getFormattedDuration()}`);

    return cues.join(' | ');
  }

  getFullInstruction(language: 'en' | 'hi' | 'local' = 'en'): {
    instruction: string;
    equipment?: string;
    temperature?: string;
    duration?: string;
    cues?: string;
    tips?: string;
    safety?: string;
  } {
    return {
      instruction: this.getDisplayInstruction(language),
      equipment: this.equipmentNeeded,
      temperature: this.temperature,
      duration: this.getFormattedDuration(),
      cues: this.getCompletionCues(),
      tips: this.tips,
      safety: this.safetyWarnings,
    };
  }

  addIngredient(ingredientName: string): void {
    if (!this.ingredientsUsed.includes(ingredientName)) {
      this.ingredientsUsed.push(ingredientName);
    }
  }

  removeIngredient(ingredientName: string): void {
    this.ingredientsUsed = this.ingredientsUsed.filter((name) => name !== ingredientName);
  }

  addEquipment(equipment: string): void {
    if (!this.equipmentList.includes(equipment)) {
      this.equipmentList.push(equipment);
    }
  }

  removeEquipment(equipment: string): void {
    this.equipmentList = this.equipmentList.filter((eq) => eq !== equipment);
  }

  markAsCritical(): void {
    this.isCriticalStep = true;
  }

  setDifficulty(level: number): void {
    this.difficultyLevel = Math.max(1, Math.min(5, level));
  }

  enableTimer(): void {
    this.hasTimer = true;
  }

  disableTimer(): void {
    this.hasTimer = false;
  }
}
