import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { AIRoutingService } from './services/ai-routing.service';
import { EnhancedAIProviderService } from './services/enhanced-ai-provider.service';
import { FreeAIIntegrationService } from './services/free-ai-integration.service';
import { RealAIIntegrationService } from './services/real-ai-integration.service';
import { AIRoutingController } from './controllers/ai-routing.controller';
import { AIRoutingWebhookController } from './controllers/ai-routing-webhook.controller';
import { AIRoutingDecision } from './entities/ai-routing-decision.entity';
import { DLPService } from '../auth/services/dlp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIRoutingDecision]),
    CacheModule.register({
      ttl: 300, // 5 minutes default
      max: 1000, // maximum number of items in cache
    }),
    ConfigModule,
  ],
  controllers: [AIRoutingController, AIRoutingWebhookController],
  providers: [AIRoutingService, EnhancedAIProviderService, FreeAIIntegrationService, RealAIIntegrationService, DLPService],
  exports: [AIRoutingService, EnhancedAIProviderService, FreeAIIntegrationService, RealAIIntegrationService],
})
export class AIRoutingModule {}
