import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditEventType, AuditSeverity } from '../entities/audit-log.entity';
import { AuditService } from '../services/audit.service';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  message?: string;
}

class TooManyRequestsException extends HttpException {
  constructor(objectOrError?: string | object | any, description?: string) {
    super(
      HttpException.createBody(
        objectOrError,
        description || 'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Injectable()
export class AuthRateLimitInterceptor implements NestInterceptor {
  private readonly requestMap = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly auditService: AuditService,
    private readonly config: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 requests per 15 minutes
      message: 'Too many authentication attempts. Please try again later.',
    },
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Temporarily simplified - just pass through for development
    return next.handle();
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, data] of this.requestMap.entries()) {
      if (now > data.resetTime) {
        this.requestMap.delete(key);
      }
    }
  }
}
