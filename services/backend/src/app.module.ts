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

// Recipe entities
import { Recipe } from './domains/recipes/entities/recipe.entity';
import { RecipeIngredient } from './domains/recipes/entities/recipe-ingredient.entity';
import { RecipeStep } from './domains/recipes/entities/recipe-step.entity';
import { RecipeNutrition } from './domains/recipes/entities/recipe-nutrition.entity';

// Meal planning entities
import { MealPlan } from './domains/meal-planning/entities/meal-plan.entity';
import { MealPlanEntry } from './domains/meal-planning/entities/meal-plan-entry.entity';

// Fitness planning entities
import { FitnessPlan } from './domains/fitness-planning/entities/fitness-plan.entity';
import { FitnessPlanWeek } from './domains/fitness-planning/entities/fitness-plan-week.entity';
import { FitnessPlanWorkout } from './domains/fitness-planning/entities/fitness-plan-workout.entity';
import { FitnessPlanExercise } from './domains/fitness-planning/entities/fitness-plan-exercise.entity';

// Logs entities
import { MealLog } from './domains/logs/entities/meal-log.entity';

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
          FitnessPlan,
          FitnessPlanWeek,
          FitnessPlanWorkout,
          FitnessPlanExercise,

          // Logs entities
          MealLog,
        ],
        synchronize: false, // Never use synchronize in production
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DB_SSL', false)
          ? {
              rejectUnauthorized:
                configService.get('NODE_ENV') === 'production',
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
    HealthReportsModule,
    ExternalApiModule,

    // Health Check Module
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}
