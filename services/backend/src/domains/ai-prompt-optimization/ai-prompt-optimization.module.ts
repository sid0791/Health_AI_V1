import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PromptOptimizationService } from './services/prompt-optimization.service';
import { PromptOptimizationController } from './controllers/prompt-optimization.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User])
  ],
  providers: [PromptOptimizationService],
  controllers: [PromptOptimizationController],
  exports: [PromptOptimizationService],
})
export class AIPromptOptimizationModule {}