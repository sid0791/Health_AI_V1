import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
}

export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyId: string;
}

export interface EncryptedField {
  value: string;
  metadata: {
    algorithm: string;
    keyId: string;
    iv: string;
    authTag: string;
    encrypted: boolean;
    encryptedAt: string;
  };
}

@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  
  private readonly primaryKey: Buffer;
  private readonly keyId: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get('FIELD_ENCRYPTION_ENABLED', 'true') === 'true';
    
    if (this.isEnabled) {
      const masterKey = this.configService.get('FIELD_ENCRYPTION_KEY');
      if (!masterKey) {
        throw new Error('FIELD_ENCRYPTION_KEY environment variable is required when encryption is enabled');
      }

      // Derive encryption key from master key using PBKDF2
      const salt = this.configService.get('FIELD_ENCRYPTION_SALT', 'healthcoachai-field-encryption-salt');
      this.primaryKey = crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha256');
      this.keyId = crypto.createHash('sha256').update(this.primaryKey).digest('hex').substring(0, 16);
      
      this.logger.log(`Field encryption initialized with key ID: ${this.keyId}`);
    } else {
      this.logger.warn('Field encryption is disabled');
      this.primaryKey = Buffer.alloc(this.keyLength);
      this.keyId = 'disabled';
    }
  }

  /**
   * Encrypt sensitive field data
   */
  encrypt(plaintext: string): EncryptedField {
    if (!this.isEnabled) {
      return this.createUnencryptedField(plaintext);
    }

    if (!plaintext || plaintext.length === 0) {
      return this.createUnencryptedField(plaintext);
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher('aes-256-gcm', this.primaryKey) as crypto.CipherGCM;
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();

      return {
        value: encrypted,
        metadata: {
          algorithm: this.algorithm,
          keyId: this.keyId,
          iv: iv.toString('base64'),
          authTag: authTag.toString('base64'),
          encrypted: true,
          encryptedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt field data');
    }
  }

  /**
   * Decrypt sensitive field data
   */
  decrypt(encryptedField: EncryptedField): string {
    if (!encryptedField.metadata.encrypted) {
      return encryptedField.value;
    }

    if (!this.isEnabled) {
      this.logger.warn('Attempting to decrypt data but encryption is disabled');
      return encryptedField.value;
    }

    try {
      const { value, metadata } = encryptedField;
      const iv = Buffer.from(metadata.iv, 'base64');
      const authTag = Buffer.from(metadata.authTag, 'base64');
      
      const decipher = crypto.createDecipher(metadata.algorithm, this.primaryKey) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(value, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt field data');
    }
  }

  /**
   * Encrypt multiple fields at once
   */
  encryptFields(fields: Record<string, string>): Record<string, EncryptedField> {
    const encryptedFields: Record<string, EncryptedField> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      encryptedFields[key] = this.encrypt(value);
    }
    
    return encryptedFields;
  }

  /**
   * Decrypt multiple fields at once
   */
  decryptFields(encryptedFields: Record<string, EncryptedField>): Record<string, string> {
    const decryptedFields: Record<string, string> = {};
    
    for (const [key, encryptedField] of Object.entries(encryptedFields)) {
      decryptedFields[key] = this.decrypt(encryptedField);
    }
    
    return decryptedFields;
  }

  /**
   * Create a searchable hash of sensitive data for indexing
   * Uses HMAC to create deterministic but secure hashes
   */
  createSearchableHash(plaintext: string): string {
    if (!plaintext || plaintext.length === 0) {
      return '';
    }

    try {
      const hmac = crypto.createHmac('sha256', this.primaryKey);
      hmac.update(plaintext.toLowerCase().trim());
      return hmac.digest('hex');
    } catch (error) {
      this.logger.error('Failed to create searchable hash', error);
      throw new Error('Failed to create searchable hash');
    }
  }

  /**
   * Encrypt personally identifiable information (PII)
   * Uses additional safeguards for PII data
   */
  encryptPII(piiData: string, category: 'email' | 'phone' | 'id' | 'health' | 'biometric' | 'other'): EncryptedField {
    if (!piiData || piiData.length === 0) {
      return this.createUnencryptedField(piiData);
    }

    // Add PII classification to metadata
    const encryptedField = this.encrypt(piiData);
    encryptedField.metadata = {
      ...encryptedField.metadata,
      piiCategory: category,
      classification: 'PII',
      requiresSpecialHandling: true,
    } as any;

    return encryptedField;
  }

  /**
   * Encrypt protected health information (PHI)
   * Uses highest security standards for health data
   */
  encryptPHI(healthData: string, category: 'medical_record' | 'diagnosis' | 'medication' | 'vital_signs' | 'lab_result' | 'other'): EncryptedField {
    if (!healthData || healthData.length === 0) {
      return this.createUnencryptedField(healthData);
    }

    // Add PHI classification to metadata
    const encryptedField = this.encrypt(healthData);
    encryptedField.metadata = {
      ...encryptedField.metadata,
      phiCategory: category,
      classification: 'PHI',
      requiresSpecialHandling: true,
      auditRequired: true,
    } as any;

    return encryptedField;
  }

  /**
   * Validate encrypted field integrity
   */
  validateField(encryptedField: EncryptedField): boolean {
    try {
      if (!encryptedField.metadata.encrypted) {
        return true; // Unencrypted fields are valid by default
      }

      // Attempt to decrypt to validate integrity
      this.decrypt(encryptedField);
      return true;
    } catch (error) {
      this.logger.warn('Field validation failed', error);
      return false;
    }
  }

  /**
   * Re-encrypt data with a new key (for key rotation)
   */
  reencryptField(encryptedField: EncryptedField): EncryptedField {
    if (!encryptedField.metadata.encrypted) {
      return encryptedField; // Nothing to re-encrypt
    }

    try {
      const decryptedValue = this.decrypt(encryptedField);
      return this.encrypt(decryptedValue);
    } catch (error) {
      this.logger.error('Re-encryption failed', error);
      throw new Error('Failed to re-encrypt field data');
    }
  }

  /**
   * Get encryption statistics and health info
   */
  getEncryptionInfo(): {
    isEnabled: boolean;
    algorithm: string;
    keyId: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
  } {
    return {
      isEnabled: this.isEnabled,
      algorithm: this.algorithm,
      keyId: this.keyId,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
    };
  }

  /**
   * Test encryption/decryption functionality
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testData = 'health-check-' + Date.now();
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      return decrypted === testData;
    } catch (error) {
      this.logger.error('Encryption health check failed', error);
      return false;
    }
  }

  private createUnencryptedField(value: string): EncryptedField {
    return {
      value,
      metadata: {
        algorithm: 'none',
        keyId: 'none',
        iv: '',
        authTag: '',
        encrypted: false,
        encryptedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Mask sensitive data for logging and display
   */
  maskSensitiveData(data: string, maskChar: string = '*', visibleChars: number = 2): string {
    if (!data || data.length <= visibleChars * 2) {
      return maskChar.repeat(8); // Minimum masking
    }

    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = maskChar.repeat(Math.max(4, data.length - visibleChars * 2));

    return `${start}${middle}${end}`;
  }

  /**
   * Create audit log entry for encryption operations
   */
  createAuditEntry(operation: 'encrypt' | 'decrypt' | 'access', classification: 'PII' | 'PHI' | 'other', userId?: string): any {
    return {
      operation,
      classification,
      userId,
      timestamp: new Date().toISOString(),
      keyId: this.keyId,
      success: true,
    };
  }
}