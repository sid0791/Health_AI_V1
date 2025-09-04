import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AppConfigService } from './config/app-config.service';
import { MockAuthController } from './mock-auth.controller';
import { MockMealPlanController } from './mock-meal-plan.controller';
import { FoodLogController } from './food-log.controller';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Health Check Module
    HealthModule,
  ],
  controllers: [AppController, MockAuthController, MockMealPlanController, FoodLogController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}