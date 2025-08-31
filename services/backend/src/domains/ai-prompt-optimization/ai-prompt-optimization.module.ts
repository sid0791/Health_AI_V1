import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIPromptTemplate } from './entities/ai-prompt-template.entity';
import { AIPromptExecution } from './entities/ai-prompt-execution.entity';
import { AIPromptOptimizationService } from './services/ai-prompt-optimization.service';
import { AIPromptOptimizationController } from './controllers/ai-prompt-optimization.controller';
import { PromptTemplateSeeder } from './templates/prompt-template-seeder.service';
import { AIRoutingModule } from '../ai-routing/ai-routing.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIPromptTemplate, AIPromptExecution]),
    AIRoutingModule,
    UsersModule,
  ],
  controllers: [AIPromptOptimizationController],
  providers: [AIPromptOptimizationService, PromptTemplateSeeder],
  exports: [AIPromptOptimizationService, TypeOrmModule],
})
export class AIPromptOptimizationModule {}