import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface DLPConfig {
  enableRedaction: boolean;
  enablePseudonymization: boolean;
  retainOriginalHashes: boolean;
  customPatterns: RegexPattern[];
}

export interface RegexPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface DLPResult {
  processedText: string;
  redactedFields: string[];
  pseudonymizedFields: string[];
  originalHashes?: Map<string, string>;
  riskScore: number;
}

@Injectable()
export class DLPService {
  private readonly logger = new Logger(DLPService.name);
  private readonly config: DLPConfig;

  // Predefined patterns for PII/PHI detection
  private readonly patterns = new Map<string, RegExp>([
    // Personal Identifiers
    ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
    ['phone_in', /(\+91[\s-]?)?[6-9]\d{9}/g],
    ['phone_us', /(\+1[\s-]?)?(\d{3}[\s-]?\d{3}[\s-]?\d{4})/g],
    ['ssn', /\b\d{3}-\d{2}-\d{4}\b/g],
    ['aadhar', /\b\d{4}\s?\d{4}\s?\d{4}\b/g],
    ['pan', /\b[A-Z]{5}\d{4}[A-Z]\b/g],

    // Medical Information
    ['medical_record', /\b(MR|MRN|Medical Record)\s*:?\s*\d+/gi],
    ['prescription', /\b(Rx|prescription)\s*:?\s*[\w\s]+/gi],
    ['dosage', /\b\d+\s*(mg|ml|mcg|g|kg|units?)\b/gi],

    // Biometric Data
    ['height', /\b\d+\s*(cm|ft|inches?|'|")\b/gi],
    ['weight', /\b\d+\s*(kg|lbs?|pounds?)\b/gi],
    ['bp', /\b\d{2,3}\/\d{2,3}\s*(mmhg)?\b/gi],
    ['heart_rate', /\b\d{2,3}\s*(bpm|beats?\s*per\s*minute)\b/gi],

    // Financial Information
    ['credit_card', /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g],
    ['bank_account', /\b\d{9,18}\b/g],

    // Geographic Data
    [
      'address',
      /\b\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd)/gi,
    ],
    ['pincode', /\b\d{6}\b/g],
    ['zipcode', /\b\d{5}(-\d{4})?\b/g],
  ]);

  constructor(private configService: ConfigService) {
    this.config = {
      enableRedaction: this.configService.get<boolean>('DLP_ENABLE_REDACTION', true),
      enablePseudonymization: this.configService.get<boolean>('DLP_ENABLE_PSEUDONYMIZATION', true),
      retainOriginalHashes: this.configService.get<boolean>('DLP_RETAIN_HASHES', false),
      customPatterns: [],
    };
  }

  /**
   * Process text through DLP pipeline
   */
  async processText(text: string, options?: Partial<DLPConfig>): Promise<DLPResult> {
    const config = { ...this.config, ...options };
    let processedText = text;
    const redactedFields: string[] = [];
    const pseudonymizedFields: string[] = [];
    const originalHashes = new Map<string, string>();

    try {
      // Detection phase
      const detectedPatterns = this.detectSensitiveData(text);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(detectedPatterns);

      // Processing phase
      for (const [patternName, matches] of detectedPatterns) {
        if (matches.length === 0) continue;

        if (config.enableRedaction && this.shouldRedact(patternName)) {
          const result = this.redactMatches(processedText, matches, patternName);
          processedText = result.text;
          redactedFields.push(patternName);

          if (config.retainOriginalHashes) {
            result.hashes.forEach((hash, original) => {
              originalHashes.set(original, hash);
            });
          }
        } else if (config.enablePseudonymization && this.shouldPseudonymize(patternName)) {
          const result = this.pseudonymizeMatches(processedText, matches, patternName);
          processedText = result.text;
          pseudonymizedFields.push(patternName);

          if (config.retainOriginalHashes) {
            result.hashes.forEach((hash, original) => {
              originalHashes.set(original, hash);
            });
          }
        }
      }

      // Audit logging
      if (redactedFields.length > 0 || pseudonymizedFields.length > 0) {
        this.logger.log(
          `DLP processed text: redacted=${redactedFields.join(',')}, pseudonymized=${pseudonymizedFields.join(',')}, riskScore=${riskScore}`,
        );
      }

      return {
        processedText,
        redactedFields,
        pseudonymizedFields,
        originalHashes: config.retainOriginalHashes ? originalHashes : undefined,
        riskScore,
      };
    } catch (error) {
      this.logger.error('Error processing text through DLP', error);
      // Fail safe - return heavily redacted version
      return {
        processedText: '[DLP_ERROR_CONTENT_REDACTED]',
        redactedFields: ['error_fallback'],
        pseudonymizedFields: [],
        riskScore: 100,
      };
    }
  }

  /**
   * Detect sensitive data patterns in text
   */
  private detectSensitiveData(text: string): Map<string, string[]> {
    const detected = new Map<string, string[]>();

    for (const [patternName, pattern] of this.patterns) {
      const matches = Array.from(text.matchAll(pattern)).map((match) => match[0]);
      detected.set(patternName, matches);
    }

    return detected;
  }

  /**
   * Calculate risk score based on detected patterns
   */
  private calculateRiskScore(detectedPatterns: Map<string, string[]>): number {
    let score = 0;
    const weights = new Map([
      ['email', 10],
      ['phone_in', 15],
      ['ssn', 50],
      ['aadhar', 40],
      ['pan', 30],
      ['medical_record', 40],
      ['prescription', 30],
      ['credit_card', 50],
      ['height', 5],
      ['weight', 5],
      ['bp', 20],
      ['heart_rate', 15],
    ]);

    for (const [patternName, matches] of detectedPatterns) {
      const weight = weights.get(patternName) || 10;
      score += matches.length * weight;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Redact sensitive matches
   */
  private redactMatches(
    text: string,
    matches: string[],
    patternName: string,
  ): { text: string; hashes: Map<string, string> } {
    let processedText = text;
    const hashes = new Map<string, string>();

    for (const match of matches) {
      const hash = this.generateHash(match);
      const redactedValue = this.generateRedactedValue(match, patternName);
      processedText = processedText.replace(
        new RegExp(this.escapeRegex(match), 'g'),
        redactedValue,
      );
      hashes.set(match, hash);
    }

    return { text: processedText, hashes };
  }

  /**
   * Pseudonymize sensitive matches
   */
  private pseudonymizeMatches(
    text: string,
    matches: string[],
    patternName: string,
  ): { text: string; hashes: Map<string, string> } {
    let processedText = text;
    const hashes = new Map<string, string>();

    for (const match of matches) {
      const hash = this.generateHash(match);
      const pseudonym = this.generatePseudonym(match, patternName);
      processedText = processedText.replace(new RegExp(this.escapeRegex(match), 'g'), pseudonym);
      hashes.set(match, hash);
    }

    return { text: processedText, hashes };
  }

  /**
   * Generate consistent hash for value
   */
  private generateHash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
  }

  /**
   * Generate redacted replacement value
   */
  private generateRedactedValue(value: string, patternName: string): string {
    const length = value.length;
    switch (patternName) {
      case 'email':
        return '[EMAIL_REDACTED]';
      case 'phone_in':
      case 'phone_us':
        return '[PHONE_REDACTED]';
      case 'aadhar':
        return '[AADHAR_REDACTED]';
      case 'pan':
        return '[PAN_REDACTED]';
      case 'medical_record':
        return '[MEDICAL_ID_REDACTED]';
      default:
        return `[${patternName.toUpperCase()}_REDACTED]`;
    }
  }

  /**
   * Generate pseudonym replacement value
   */
  private generatePseudonym(value: string, patternName: string): string {
    const hash = this.generateHash(value);
    const shortHash = hash.substring(0, 8);

    switch (patternName) {
      case 'email':
        return `user_${shortHash}@example.com`;
      case 'phone_in':
        return `+91${shortHash.substring(0, 10).padEnd(10, '0')}`;
      case 'phone_us':
        return `+1555${shortHash.substring(0, 7).padEnd(7, '0')}`;
      case 'aadhar':
        return `${shortHash.substring(0, 4)} ${shortHash.substring(4, 8)} ${shortHash.substring(0, 4)}`;
      case 'pan':
        return `PSU${shortHash.substring(0, 2).toUpperCase()}${shortHash.substring(2, 6)}P`;
      default:
        return `${patternName}_${shortHash}`;
    }
  }

  /**
   * Determine if pattern should be redacted
   */
  private shouldRedact(patternName: string): boolean {
    const highRiskPatterns = ['ssn', 'aadhar', 'pan', 'credit_card', 'medical_record'];
    return highRiskPatterns.includes(patternName);
  }

  /**
   * Determine if pattern should be pseudonymized
   */
  private shouldPseudonymize(patternName: string): boolean {
    const mediumRiskPatterns = ['email', 'phone_in', 'phone_us', 'height', 'weight', 'bp'];
    return mediumRiskPatterns.includes(patternName);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Add custom pattern
   */
  addCustomPattern(name: string, pattern: RegExp): void {
    this.patterns.set(name, pattern);
  }

  /**
   * Get processing statistics
   */
  getStatistics(): Record<string, any> {
    return {
      totalPatterns: this.patterns.size,
      enabledFeatures: {
        redaction: this.config.enableRedaction,
        pseudonymization: this.config.enablePseudonymization,
        hashRetention: this.config.retainOriginalHashes,
      },
    };
  }
}
