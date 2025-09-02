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
import { AuthModule } from './domains/auth/auth.module';
import { HealthReportsModule } from './domains/health-reports/health-reports.module';
import { RecipeModule } from './domains/recipes/recipe.module';
import { FitnessPlanningModule } from './domains/fitness-planning/fitness-planning.module';
import { MealPlanningModule } from './domains/meal-planning/meal-planning.module';
import { NutritionModule } from './domains/nutrition/nutrition.module';
import { AIRoutingModule } from './domains/ai-routing/ai-routing.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';
import { LogsModule } from './domains/logs/logs.module';
import { ChatModule } from './domains/chat/chat.module';
import { ExternalApiModule } from './external-apis/external-api.module';
import { IntegrationsModule } from './domains/integrations/integrations.module';
import { AIPromptOptimizationModule } from './domains/ai-prompt-optimization/ai-prompt-optimization.module';
import { PerformanceModule } from './common/performance/performance.module';
import { ObservabilityModule } from './common/observability/observability.module';

// Entity imports for TypeORM
import { User } from './domains/users/entities/user.entity';
import { UserProfile } from './domains/users/entities/user-profile.entity';
import { UserConsent } from './domains/users/entities/user-consent.entity';
import { UserPreferences } from './domains/users/entities/user-preferences.entity';
import { UserGoals } from './domains/users/entities/user-goals.entity';
import { UserTokenUsage } from './domains/users/entities/user-token-usage.entity';
import { HealthReport } from './domains/health-reports/entities/health-report.entity';
import { StructuredEntity } from './domains/health-reports/entities/structured-entity.entity';

// Recipe entities
import { Recipe } from './domains/recipes/entities/recipe.entity';
import { RecipeIngredient } from './domains/recipes/entities/recipe-ingredient.entity';
import { RecipeStep } from './domains/recipes/entities/recipe-step.entity';
import { RecipeNutrition } from './domains/recipes/entities/recipe-nutrition.entity';

// Meal planning entities
import { MealPlan } from './domains/meal-planning/entities/meal-plan.entity';
import { MealPlanEntry } from './domains/meal-planning/entities/meal-plan-entry.entity';

// Fitness planning entities
import { Exercise } from './domains/fitness-planning/entities/exercise.entity';
import { FitnessPlan } from './domains/fitness-planning/entities/fitness-plan.entity';
import { FitnessPlanWeek } from './domains/fitness-planning/entities/fitness-plan-week.entity';
import { FitnessPlanWorkout } from './domains/fitness-planning/entities/fitness-plan-workout.entity';
import { FitnessPlanExercise } from './domains/fitness-planning/entities/fitness-plan-exercise.entity';

// Logs entities
import { MealLog } from './domains/logs/entities/meal-log.entity';
import { LogEntry } from './domains/logs/entities/log-entry.entity';

// Auth entities
import { UserSession } from './domains/auth/entities/user-session.entity';
import { UserOTP } from './domains/auth/entities/user-otp.entity';
import { UserOAuthAccount } from './domains/auth/entities/user-oauth-account.entity';
import { AuditLog } from './domains/auth/entities/audit-log.entity';

// AI Routing entities
import { AIRoutingDecision } from './domains/ai-routing/entities/ai-routing-decision.entity';

// Chat entities (Phase 13)
import { ChatSession } from './domains/chat/entities/chat-session.entity';
import { ChatMessage } from './domains/chat/entities/chat-message.entity';
import { ChatContext } from './domains/chat/entities/chat-context.entity';
import { HealthInsight } from './domains/chat/entities/health-insights.entity';
import { DietPlan } from './domains/chat/entities/diet-plan.entity';

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
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          // User entities
          User,
          UserProfile,
          UserConsent,
          UserPreferences,
          UserGoals,
          UserTokenUsage,

          // Health reports entities
          HealthReport,
          StructuredEntity,

          // Recipe entities
          Recipe,
          RecipeIngredient,
          RecipeStep,
          RecipeNutrition,

          // Meal planning entities
          MealPlan,
          MealPlanEntry,

          // Fitness planning entities
          Exercise,
          FitnessPlan,
          FitnessPlanWeek,
          FitnessPlanWorkout,
          FitnessPlanExercise,

          // Logs entities
          MealLog,
          LogEntry,

          // Auth entities
          UserSession,
          UserOTP,
          UserOAuthAccount,
          AuditLog,

          // AI Routing entities
          AIRoutingDecision,

          // Chat entities (Phase 13)
          ChatSession,
          ChatMessage,
          ChatContext,
          HealthInsight,
          DietPlan,
        ],
        synchronize: false, // Never use synchronize in production
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DB_SSL', false)
          ? {
              rejectUnauthorized: configService.get('NODE_ENV') === 'production',
            }
          : false,
        // Connection pool settings
        extra: {
          max: parseInt(configService.get('DB_MAX_CONNECTIONS', '20')),
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
        },
        // Migration settings
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: configService.get('NODE_ENV') === 'production', // Auto-run in production
        migrationsTableName: 'typeorm_migrations',
        // Entity metadata cache
        cache: {
          type: 'redis',
          options: {
            host: configService.get('REDIS_HOST'),
            port: parseInt(configService.get('REDIS_PORT', '6379')),
            password: configService.get('REDIS_PASSWORD'),
            ttl: parseInt(configService.get('TYPEORM_CACHE_TTL', '60')), // 1 minute default TTL
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
        host: configService.get('REDIS_HOST'),
        port: parseInt(configService.get('REDIS_PORT', '6379')),
        password: configService.get('REDIS_PASSWORD'),
        ttl: parseInt(configService.get('CACHE_TTL', '300')), // 5 minutes default
        max: parseInt(configService.get('CACHE_MAX_ITEMS', '1000')),
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
            ttl: parseInt(configService.get('THROTTLE_TTL', '60')) * 1000, // Convert to milliseconds
            limit: parseInt(configService.get('THROTTLE_LIMIT', '100')),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // HTTP Client Configuration
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: parseInt(configService.get('HTTP_TIMEOUT', '10000')),
        maxRedirects: 5,
        headers: {
          'User-Agent': 'HealthCoachAI/1.0',
        },
      }),
      inject: [ConfigService],
    }),

    // Domain Modules
    UsersModule,
    AuthModule,
    HealthReportsModule,
    RecipeModule,
    FitnessPlanningModule,
    MealPlanningModule,
    NutritionModule,
    AIRoutingModule,
    AnalyticsModule,
    LogsModule,
    ChatModule, // Phase 13
    ExternalApiModule,

    // Phase 14 Modules
    IntegrationsModule,
    AIPromptOptimizationModule,

    // Phase 15 Modules - Performance & Reliability
    PerformanceModule,
    ObservabilityModule,

    // Health Check Module
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}
