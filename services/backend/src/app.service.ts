import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { name: string; version: string; environment: string } {
    return {
      name: 'HealthCoachAI Backend',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
