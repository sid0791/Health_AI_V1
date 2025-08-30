import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealLog } from '../logs/entities/meal-log.entity';
import { MealPlan } from '../meal-planning/entities/meal-plan.entity';
import { User } from '../users/entities/user.entity';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealLog, MealPlan, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}