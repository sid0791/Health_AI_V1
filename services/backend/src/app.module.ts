import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AppConfigService } from './config/app-config.service';

// Domain modules
import { UsersModule } from './domains/users/users.module';
import { HealthReportsModule } from './domains/health-reports/health-reports.module';
import { ExternalApiModule } from './external-apis/external-api.module';

// Entity imports for TypeORM
import { User } from './domains/users/entities/user.entity';
import { UserProfile } from './domains/users/entities/user-profile.entity';
import { UserConsent } from './domains/users/entities/user-consent.entity';
import { UserPreferences } from './domains/users/entities/user-preferences.entity';
import { UserGoals } from './domains/users/entities/user-goals.entity';
import { HealthReport } from './domains/health-reports/entities/health-report.entity';
import { StructuredEntity } from './domains/health-reports/entities/structured-entity.entity';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'healthcoachai'),
        password: configService.get('DB_PASSWORD', 'demo-password'),
        database: configService.get('DB_NAME', 'healthcoachai_dev'),
        entities: [
          User,
          UserProfile,
          UserConsent,
          UserPreferences,
          UserGoals,
          HealthReport,
          StructuredEntity,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DB_SSL', false)
          ? {
              rejectUnauthorized: false,
            }
          : false,
        // Connection pool settings
        extra: {
          max: configService.get('DB_MAX_CONNECTIONS', 20),
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
        },
        // Migration settings
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        // Entity metadata cache
        cache: {
          type: 'redis',
          options: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            ttl: 60, // 1 minute default TTL
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Redis Cache Configuration
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: 'redis',
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        ttl: configService.get('CACHE_TTL', 300), // 5 minutes default
        max: configService.get('CACHE_MAX_ITEMS', 1000),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),

    // Rate Limiting Configuration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('THROTTLE_TTL', 60) * 1000, // Convert to milliseconds
            limit: configService.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // HTTP Client Configuration
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT', 10000),
        maxRedirects: 5,
        headers: {
          'User-Agent': 'HealthCoachAI/1.0',
        },
      }),
      inject: [ConfigService],
    }),

    // Domain Modules
    UsersModule,
    HealthReportsModule,
    ExternalApiModule,

    // Health Check Module
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}
