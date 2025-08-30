import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  ssl: boolean;
  maxConnections: number;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface RedisConfig {
  url: string;
  password?: string;
  ttlDefault: number;
  host?: string;
  port?: number;
}

export interface S3Config {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region: string;
  forcePathStyle: boolean;
}

export interface AIConfig {
  policyLevel1DailyTiers: number[];
  policyLevel2AccuracyWindow: number;
  vendorList: string[];
  zeroRetention: boolean;
  providers: {
    openai: {
      apiKey: string;
      organization?: string;
      modelsLevel1: string[];
      modelsLevel2: string[];
    };
    anthropic: {
      apiKey: string;
      modelsLevel1: string[];
      modelsLevel2: string[];
    };
    vertex: {
      project: string;
      location: string;
      credentialsB64: string;
      modelsLevel1: string[];
      modelsLevel2: string[];
    };
  };
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiBaseUrl: string;
  appOrigin: string;
  corsOrigins: string[];
}

export interface JWTConfig {
  secret: string;
  accessTtl: number;
  refreshTtl: number;
  issuer: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  helmetEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  rateLimitAuthMaxRequests: number;
}

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private configService: ConfigService) {
    this.validateConfiguration();
  }

  /**
   * Validate critical configuration on startup
   */
  private validateConfiguration(): void {
    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'API_BASE_URL',
      'POSTGRES_URL',
      'REDIS_URL',
      'JWT_SECRET',
    ];

    const missingVars = requiredVars.filter((varName) => !this.configService.get(varName));

    if (missingVars.length > 0) {
      this.logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      throw new Error('Configuration validation failed');
    }

    // Validate JWT secret strength
    const jwtSecret = this.configService.get('JWT_SECRET');
    if (jwtSecret && jwtSecret.includes('demo') && this.isProduction()) {
      throw new Error('Production environment cannot use demo JWT secret');
    }

    this.logger.log('Configuration validation completed successfully');
  }

  /**
   * Get application configuration
   */
  getAppConfig(): AppConfig {
    return {
      nodeEnv: this.configService.get('NODE_ENV', 'development'),
      port: this.configService.get<number>('PORT', 8080),
      apiBaseUrl: this.configService.get('API_BASE_URL', 'http://localhost:8080'),
      appOrigin: this.configService.get('APP_ORIGIN', 'http://localhost:3000'),
      corsOrigins: this.configService.get('CORS_ORIGINS', 'http://localhost:3000').split(','),
    };
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    const url = this.configService.get('POSTGRES_URL');
    if (!url) {
      throw new Error('POSTGRES_URL is required');
    }

    return {
      url,
      ssl: this.configService.get<boolean>('POSTGRES_SSL', false),
      maxConnections: this.configService.get<number>('POSTGRES_MAX_CONNECTIONS', 10),
    };
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig(): RedisConfig {
    const url = this.configService.get('REDIS_URL');
    if (!url) {
      throw new Error('REDIS_URL is required');
    }

    return {
      url,
      password: this.configService.get('REDIS_PASSWORD'),
      ttlDefault: this.configService.get<number>('REDIS_TTL_DEFAULT', 3600),
    };
  }

  /**
   * Get S3 configuration
   */
  getS3Config(): S3Config {
    return {
      endpoint: this.configService.get('S3_ENDPOINT', 'http://localhost:9000'),
      bucket: this.configService.get('S3_BUCKET', 'healthcoachai-dev'),
      accessKey: this.configService.get('S3_ACCESS_KEY', ''),
      secretKey: this.configService.get('S3_SECRET_KEY', ''),
      region: this.configService.get('S3_REGION', 'us-east-1'),
      forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', true),
    };
  }

  /**
   * Get JWT configuration
   */
  getJWTConfig(): JWTConfig {
    return {
      secret: this.configService.get('JWT_SECRET'),
      accessTtl: this.configService.get<number>('JWT_ACCESS_TTL', 900),
      refreshTtl: this.configService.get<number>('JWT_REFRESH_TTL', 1209600),
      issuer: this.configService.get('JWT_ISSUER', 'healthcoachai'),
    };
  }

  /**
   * Get AI configuration
   */
  getAIConfig(): AIConfig {
    const level1Tiers = this.configService.get('AI_POLICY_LEVEL1_DAILY_TIERS', '100,200,500');

    return {
      policyLevel1DailyTiers: level1Tiers.split(',').map(Number),
      policyLevel2AccuracyWindow: this.configService.get<number>(
        'AI_POLICY_LEVEL2_ACCURACY_WINDOW',
        0.05,
      ),
      vendorList: this.configService.get('AI_VENDOR_LIST', 'openai,anthropic').split(','),
      zeroRetention: this.configService.get<boolean>('AI_ZERO_RETENTION', true),
      providers: {
        openai: {
          apiKey: this.configService.get('OPENAI_API_KEY', ''),
          organization: this.configService.get('OPENAI_ORGANIZATION'),
          modelsLevel1: this.configService
            .get('OPENAI_MODELS_LEVEL1', 'gpt-4-turbo,gpt-4')
            .split(','),
          modelsLevel2: this.configService.get('OPENAI_MODELS_LEVEL2', 'gpt-3.5-turbo').split(','),
        },
        anthropic: {
          apiKey: this.configService.get('ANTHROPIC_API_KEY', ''),
          modelsLevel1: this.configService
            .get('ANTHROPIC_MODELS_LEVEL1', 'claude-3-opus,claude-3-sonnet')
            .split(','),
          modelsLevel2: this.configService
            .get('ANTHROPIC_MODELS_LEVEL2', 'claude-3-haiku')
            .split(','),
        },
        vertex: {
          project: this.configService.get('GOOGLE_VERTEX_PROJECT', ''),
          location: this.configService.get('GOOGLE_VERTEX_LOCATION', 'us-central1'),
          credentialsB64: this.configService.get('GOOGLE_APPLICATION_CREDENTIALS_B64', ''),
          modelsLevel1: this.configService
            .get('VERTEX_MODELS_LEVEL1', 'gemini-pro,gemini-pro-vision')
            .split(','),
          modelsLevel2: this.configService.get('VERTEX_MODELS_LEVEL2', 'gemini-pro').split(','),
        },
      },
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return {
      bcryptRounds: this.configService.get<number>('BCRYPT_ROUNDS', 12),
      helmetEnabled: this.configService.get<boolean>('HELMET_ENABLED', true),
      rateLimitWindowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000),
      rateLimitMaxRequests: this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
      rateLimitAuthMaxRequests: this.configService.get<number>(
        'RATE_LIMIT_AUTH_MAX_REQUESTS',
        1000,
      ),
    };
  }

  /**
   * Get feature flags
   */
  getFeatureFlags(): Record<string, boolean> {
    return {
      chatEnabled: this.configService.get<boolean>('FEATURE_CHAT_ENABLED', true),
      photoLogEnabled: this.configService.get<boolean>('FEATURE_PHOTO_LOG_ENABLED', false),
      voiceInputEnabled: this.configService.get<boolean>('FEATURE_VOICE_INPUT_ENABLED', false),
      premiumFeaturesEnabled: this.configService.get<boolean>(
        'FEATURE_PREMIUM_FEATURES_ENABLED',
        false,
      ),
    };
  }

  /**
   * Check if running in production environment
   */
  isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  /**
   * Check if running in development environment
   */
  isDevelopment(): boolean {
    return this.configService.get('NODE_ENV') === 'development';
  }

  /**
   * Check if running in test environment
   */
  isTest(): boolean {
    return this.configService.get('NODE_ENV') === 'test';
  }

  /**
   * Validate that demo keys are not used in production
   */
  validateProductionSecrets(): void {
    if (!this.isProduction()) {
      return;
    }

    const demoKeyPatterns = ['demo', 'test', 'changeme', 'password', 'secret'];
    const criticalVars = [
      'JWT_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
    ];

    for (const varName of criticalVars) {
      const value = this.configService.get(varName, '').toLowerCase();
      const hasDemoPattern = demoKeyPatterns.some((pattern) => value.includes(pattern));

      if (hasDemoPattern) {
        this.logger.error(`Production environment detected demo value for ${varName}`);
        throw new Error(`Production environment cannot use demo secrets for ${varName}`);
      }
    }

    this.logger.log('Production secret validation completed successfully');
  }

  /**
   * Get configuration summary for logging (without sensitive values)
   */
  getConfigSummary(): Record<string, any> {
    const appConfig = this.getAppConfig();
    const featureFlags = this.getFeatureFlags();

    return {
      environment: appConfig.nodeEnv,
      port: appConfig.port,
      apiBaseUrl: appConfig.apiBaseUrl,
      featureFlags,
      aiVendors: this.getAIConfig().vendorList,
      timestamp: new Date().toISOString(),
    };
  }
}
