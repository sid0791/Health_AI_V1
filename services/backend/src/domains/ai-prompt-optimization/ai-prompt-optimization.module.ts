import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PromptOptimizationService } from './services/prompt-optimization.service';
import { JsonTemplateLoaderService } from './services/json-template-loader.service';
import { CostOptimizationService } from './services/cost-optimization.service';
import { PromptOptimizationController } from './controllers/prompt-optimization.controller';
import { AIPromptOptimizationController } from './controllers/ai-prompt-optimization.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PromptOptimizationService, JsonTemplateLoaderService, CostOptimizationService],
  controllers: [PromptOptimizationController, AIPromptOptimizationController],
  exports: [PromptOptimizationService, JsonTemplateLoaderService, CostOptimizationService],
})
export class AIPromptOptimizationModule {}
