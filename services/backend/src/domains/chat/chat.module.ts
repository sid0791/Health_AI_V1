import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ChatController } from './controllers/chat.controller';
import { DomainScopedChatService } from './services/domain-scoped-chat.service';
import { RAGService } from './services/rag.service';
import { HinglishNLPService } from './services/hinglish-nlp.service';
import { ChatSessionService } from './services/chat-session.service';
import { ChatRateLimitInterceptor } from './interceptors/chat-rate-limit.interceptor';

import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatContext } from './entities/chat-context.entity';

// Import related domains for integration
import { AIRoutingModule } from '../ai-routing/ai-routing.module';
import { UsersModule } from '../users/users.module';
import { HealthReportsModule } from '../health-reports/health-reports.module';
import { MealPlanningModule } from '../meal-planning/meal-planning.module';
import { FitnessPlanningModule } from '../fitness-planning/fitness-planning.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecipeModule } from '../recipes/recipe.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage, ChatContext]),
    ConfigModule,
    AIRoutingModule,
    UsersModule,
    HealthReportsModule,
    MealPlanningModule,
    FitnessPlanningModule,
    NutritionModule,
    RecipeModule,
  ],
  controllers: [ChatController],
  providers: [
    DomainScopedChatService,
    RAGService,
    HinglishNLPService,
    ChatSessionService,
    ChatRateLimitInterceptor,
  ],
  exports: [DomainScopedChatService, RAGService, HinglishNLPService, ChatSessionService],
})
export class ChatModule {}
