import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getReadiness(): { status: string; checks: Record<string, string> } {
    return {
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
        ai_providers: 'ok',
      },
    };
  }
}
