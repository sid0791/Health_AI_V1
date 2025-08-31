import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HinglishProcessingResult {
  content: string; // Processed/normalized content
  originalContent: string;
  languageDetection: {
    detected: 'en' | 'hi' | 'hinglish' | 'mixed';
    confidence: number;
  };
  metadata: {
    transliterations: Record<string, string>;
    normalizations: Record<string, string>;
    detectedWords: {
      english: string[];
      hindi: string[];
      hinglish: string[];
    };
    processingTime: number;
  };
}

@Injectable()
export class HinglishNLPService {
  private readonly logger = new Logger(HinglishNLPService.name);

  // Hinglish to English transliteration dictionary
  private readonly hinglishToEnglish: Map<string, string> = new Map([
    // Food/Nutrition terms
    ['khana', 'food'],
    ['paani', 'water'],
    ['doodh', 'milk'],
    ['roti', 'bread'],
    ['chawal', 'rice'],
    ['dal', 'lentils'],
    ['sabzi', 'vegetables'],
    ['phool', 'fruits'],
    ['gosht', 'meat'],
    ['machhli', 'fish'],
    ['anda', 'egg'],
    ['ghee', 'clarified butter'],
    ['namak', 'salt'],
    ['chini', 'sugar'],
    ['mirch', 'pepper'],
    ['haldi', 'turmeric'],
    ['jeera', 'cumin'],
    ['hari mirch', 'green chili'],
    ['pyaaz', 'onion'],
    ['lahsun', 'garlic'],

    // Fitness/Exercise terms
    ['exercise', 'exercise'],
    ['vyayam', 'exercise'],
    ['kasrat', 'workout'],
    ['yoga', 'yoga'],
    ['running', 'running'],
    ['walking', 'walking'],
    ['gym', 'gym'],
    ['weight', 'weight'],
    ['muscle', 'muscle'],
    ['stamina', 'stamina'],
    ['energy', 'energy'],
    ['rest', 'rest'],
    ['aram', 'rest'],

    // Health terms
    ['sehat', 'health'],
    ['bimari', 'disease'],
    ['dawai', 'medicine'],
    ['doctor', 'doctor'],
    ['hospital', 'hospital'],
    ['checkup', 'checkup'],
    ['test', 'test'],
    ['report', 'report'],
    ['diabetes', 'diabetes'],
    ['blood pressure', 'blood pressure'],
    ['cholesterol', 'cholesterol'],
    ['heart', 'heart'],
    ['dil', 'heart'],

    // Time/Frequency terms
    ['daily', 'daily'],
    ['roz', 'daily'],
    ['weekly', 'weekly'],
    ['hafta', 'week'],
    ['mahina', 'month'],
    ['saal', 'year'],
    ['subah', 'morning'],
    ['shaam', 'evening'],
    ['raat', 'night'],

    // Measurements
    ['kilo', 'kilogram'],
    ['gram', 'gram'],
    ['liter', 'liter'],
    ['cup', 'cup'],
    ['spoon', 'spoon'],
    ['chammach', 'spoon'],

    // Common phrases
    ['kaise', 'how'],
    ['kya', 'what'],
    ['kahan', 'where'],
    ['kab', 'when'],
    ['kaun', 'who'],
    ['kyun', 'why'],
    ['kitna', 'how much'],
    ['accha', 'good'],
    ['bura', 'bad'],
    ['theek', 'okay'],
    ['nahi', 'no'],
    ['haan', 'yes'],
    ['help', 'help'],
    ['madad', 'help'],
    ['bataiye', 'tell me'],
    ['batao', 'tell'],
    ['chahiye', 'want'],
    ['karna', 'to do'],
    ['lena', 'to take'],
    ['dena', 'to give'],
  ]);

  // Roman to Devanagari transliteration patterns (simplified)
  private readonly romanToDevanagari: Map<string, string> = new Map([
    ['namaste', 'नमस्ते'],
    ['dhanyawad', 'धन्यवाद'],
    ['kripaya', 'कृपया'],
    ['paani', 'पानी'],
    ['khana', 'खाना'],
    ['sehat', 'सेहत'],
    ['vyayam', 'व्यायाम'],
  ]);

  // English synonyms for better understanding
  private readonly synonymExpansion: Map<string, string[]> = new Map([
    ['food', ['meal', 'diet', 'nutrition', 'eating']],
    ['exercise', ['workout', 'training', 'fitness', 'activity']],
    ['health', ['wellness', 'fitness', 'wellbeing']],
    ['weight', ['mass', 'body weight', 'kg']],
    ['plan', ['schedule', 'routine', 'program']],
    ['help', ['assist', 'guide', 'support']],
  ]);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Process a message that may contain Hinglish content
   */
  async processMessage(message: string): Promise<HinglishProcessingResult> {
    const startTime = Date.now();
    const originalContent = message;

    this.logger.log('Processing Hinglish message');

    try {
      // 1. Detect language composition
      const languageDetection = this.detectLanguage(message);

      // 2. Normalize text (lowercase, remove extra spaces, etc.)
      let processedContent = this.normalizeText(message);

      // 3. Apply transliterations
      const transliterations: Record<string, string> = {};
      processedContent = this.applyTransliterations(processedContent, transliterations);

      // 4. Apply normalizations and expand synonyms
      const normalizations: Record<string, string> = {};
      processedContent = this.applyNormalizations(processedContent, normalizations);

      // 5. Detect word categories
      const detectedWords = this.categorizeWords(processedContent);

      const processingTime = Date.now() - startTime;

      return {
        content: processedContent,
        originalContent,
        languageDetection,
        metadata: {
          transliterations,
          normalizations,
          detectedWords,
          processingTime,
        },
      };
    } catch (error) {
      this.logger.error('Error processing Hinglish message:', error);
      
      // Return minimal processing on error
      return {
        content: message,
        originalContent,
        languageDetection: { detected: 'en', confidence: 0.5 },
        metadata: {
          transliterations: {},
          normalizations: {},
          detectedWords: { english: [], hindi: [], hinglish: [] },
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get suggestions for Hinglish words that might need clarification
   */
  getSuggestions(word: string): string[] {
    const lowerWord = word.toLowerCase();
    const suggestions = [];

    // Check for direct transliterations
    if (this.hinglishToEnglish.has(lowerWord)) {
      suggestions.push(this.hinglishToEnglish.get(lowerWord)!);
    }

    // Check for partial matches
    for (const [hinglish, english] of this.hinglishToEnglish.entries()) {
      if (hinglish.includes(lowerWord) || lowerWord.includes(hinglish)) {
        suggestions.push(english);
      }
    }

    // Check for synonym expansions
    if (this.synonymExpansion.has(lowerWord)) {
      suggestions.push(...this.synonymExpansion.get(lowerWord)!);
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Check if a word is likely Hinglish
   */
  isHinglishWord(word: string): boolean {
    const lowerWord = word.toLowerCase();
    return this.hinglishToEnglish.has(lowerWord) || this.romanToDevanagari.has(lowerWord);
  }

  /**
   * Get transliteration for a Hinglish word
   */
  getTransliteration(word: string): string | null {
    const lowerWord = word.toLowerCase();
    return this.hinglishToEnglish.get(lowerWord) || null;
  }

  // Private helper methods

  private detectLanguage(text: string): { detected: 'en' | 'hi' | 'hinglish' | 'mixed'; confidence: number } {
    const words = text.toLowerCase().split(/\s+/);
    let englishCount = 0;
    let hindiCount = 0;
    let hinglishCount = 0;

    for (const word of words) {
      if (this.isEnglishWord(word)) {
        englishCount++;
      } else if (this.isHinglishWord(word)) {
        hinglishCount++;
      } else if (this.containsDevanagari(word)) {
        hindiCount++;
      }
    }

    const totalWords = words.length;
    const englishRatio = englishCount / totalWords;
    const hinglishRatio = hinglishCount / totalWords;
    const hindiRatio = hindiCount / totalWords;

    // Determine dominant language
    let detected: 'en' | 'hi' | 'hinglish' | 'mixed';
    let confidence: number;

    if (hinglishRatio > 0.2) {
      detected = 'hinglish';
      confidence = 0.7 + (hinglishRatio * 0.3);
    } else if (hindiRatio > 0.3) {
      detected = 'hi';
      confidence = 0.7 + (hindiRatio * 0.3);
    } else if (englishRatio > 0.7) {
      detected = 'en';
      confidence = 0.7 + (englishRatio * 0.3);
    } else {
      detected = 'mixed';
      confidence = 0.6;
    }

    return { detected, confidence };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s]/g, ' ') // Remove punctuation but keep spaces
      .trim();
  }

  private applyTransliterations(text: string, transliterations: Record<string, string>): string {
    let processedText = text;
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const transliteration = this.getTransliteration(word);
      
      if (transliteration) {
        transliterations[word] = transliteration;
        words[i] = transliteration;
      }
    }

    return words.join(' ');
  }

  private applyNormalizations(text: string, normalizations: Record<string, string>): string {
    let processedText = text;

    // Common misspellings and variations
    const commonFixes: [RegExp, string][] = [
      [/\bprotein\b/gi, 'protein'],
      [/\bcarbs?\b/gi, 'carbohydrates'],
      [/\bfats?\b/gi, 'fat'],
      [/\bworkouts?\b/gi, 'workout'],
      [/\bexercises?\b/gi, 'exercise'],
      [/\bweights?\b/gi, 'weight'],
      [/\bmuscles?\b/gi, 'muscle'],
      [/\bnutritions?\b/gi, 'nutrition'],
      [/\bdiets?\b/gi, 'diet'],
      [/\bmeals?\b/gi, 'meal'],
    ];

    for (const [pattern, replacement] of commonFixes) {
      const matches = processedText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          normalizations[match] = replacement;
        });
        processedText = processedText.replace(pattern, replacement);
      }
    }

    return processedText;
  }

  private categorizeWords(text: string): { english: string[]; hindi: string[]; hinglish: string[] } {
    const words = text.split(/\s+/);
    const english: string[] = [];
    const hindi: string[] = [];
    const hinglish: string[] = [];

    for (const word of words) {
      if (this.containsDevanagari(word)) {
        hindi.push(word);
      } else if (this.isHinglishWord(word)) {
        hinglish.push(word);
      } else if (this.isEnglishWord(word)) {
        english.push(word);
      }
    }

    return { english, hindi, hinglish };
  }

  private isEnglishWord(word: string): boolean {
    // Simple check for common English words in health/fitness domain
    const commonEnglishWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
      'health', 'fitness', 'nutrition', 'diet', 'exercise', 'workout', 'weight',
      'protein', 'carbs', 'fat', 'calories', 'muscle', 'strength', 'cardio',
      'plan', 'goal', 'target', 'progress', 'result', 'improve', 'increase',
      'decrease', 'maintain', 'lose', 'gain', 'build', 'burn', 'consume',
      'need', 'want', 'help', 'advice', 'suggestion', 'recommendation',
      'good', 'bad', 'better', 'best', 'healthy', 'unhealthy', 'effective',
      'daily', 'weekly', 'monthly', 'morning', 'evening', 'night',
      'food', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'drink',
      'water', 'milk', 'juice', 'tea', 'coffee',
    ];

    return commonEnglishWords.includes(word.toLowerCase()) || 
           /^[a-zA-Z]+$/.test(word) && word.length > 2;
  }

  private containsDevanagari(text: string): boolean {
    // Check for Devanagari script characters (Hindi)
    return /[\u0900-\u097F]/.test(text);
  }

  /**
   * Expand contractions and common abbreviations
   */
  private expandContractions(text: string): string {
    const contractions: Record<string, string> = {
      "won't": "will not",
      "can't": "cannot",
      "n't": " not",
      "'re": " are",
      "'ve": " have",
      "'ll": " will",
      "'d": " would",
      "'m": " am",
      "i'm": "i am",
      "it's": "it is",
      "that's": "that is",
      "what's": "what is",
      "how's": "how is",
    };

    let processedText = text;
    for (const [contraction, expansion] of Object.entries(contractions)) {
      const regex = new RegExp(contraction, 'gi');
      processedText = processedText.replace(regex, expansion);
    }

    return processedText;
  }

  /**
   * Add context-aware processing for health and fitness domain
   */
  private addDomainContext(text: string): string {
    // Add implied context for domain-specific queries
    const contextPatterns: [RegExp, string][] = [
      [/\blose weight\b/gi, 'lose body weight for health'],
      [/\bgain muscle\b/gi, 'gain muscle mass through exercise'],
      [/\beat healthy\b/gi, 'eat nutritious food for health'],
      [/\bget fit\b/gi, 'improve physical fitness through exercise'],
      [/\bbuild strength\b/gi, 'build muscle strength through training'],
    ];

    let processedText = text;
    for (const [pattern, contextualReplacement] of contextPatterns) {
      processedText = processedText.replace(pattern, contextualReplacement);
    }

    return processedText;
  }

  /**
   * Handle code-switching (mixing languages within sentences)
   */
  private handleCodeSwitching(text: string): string {
    // Identify and properly handle sentences that mix languages
    const sentences = text.split(/[.!?]+/);
    const processedSentences = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      const processedWords = words.map(word => {
        const transliteration = this.getTransliteration(word);
        return transliteration || word;
      });
      return processedWords.join(' ');
    });

    return processedSentences.join('. ').trim();
  }

  /**
   * Get language learning suggestions for users
   */
  getLanguageLearningTips(): string[] {
    return [
      "Try using English terms for better AI understanding",
      "Common health terms: protein (प्रोटीन), carbs (कार्ब्स), exercise (व्यायाम)",
      "You can mix Hindi and English - I understand both!",
      "Use simple words if you're not sure about spelling",
    ];
  }

  /**
   * Validate processed message quality
   */
  validateProcessing(original: string, processed: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if processing was too aggressive (lost too much content)
    if (processed.length < original.length * 0.5) {
      issues.push("Processing may have removed too much content");
    }

    // Check if important health/fitness terms are preserved
    const importantTerms = ['protein', 'exercise', 'weight', 'health', 'diet'];
    const originalHasTerms = importantTerms.some(term => 
      original.toLowerCase().includes(term) || 
      original.toLowerCase().includes(this.getHinglishEquivalent(term))
    );
    
    const processedHasTerms = importantTerms.some(term => 
      processed.toLowerCase().includes(term)
    );

    if (originalHasTerms && !processedHasTerms) {
      issues.push("Important health/fitness terms may have been lost");
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  private getHinglishEquivalent(englishTerm: string): string {
    // Reverse lookup in transliteration map
    for (const [hinglish, english] of this.hinglishToEnglish.entries()) {
      if (english === englishTerm) {
        return hinglish;
      }
    }
    return englishTerm;
  }
}