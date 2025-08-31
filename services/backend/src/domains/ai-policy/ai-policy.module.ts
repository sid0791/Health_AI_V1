import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AIPolicyService } from './ai-policy.service';
import { AIPolicyController } from './ai-policy.controller';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
  ],
  controllers: [AIPolicyController],
  providers: [AIPolicyService],
  exports: [AIPolicyService],
})
export class AIPolicyModule {}