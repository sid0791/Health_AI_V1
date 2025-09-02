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
    const request = context.switchToHttp().getRequest();
    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const endpoint = `${request.method} ${request.route?.path || request.url}`;

    // Create unique key for rate limiting
    const key = `${ipAddress}:${endpoint}`;
    const now = Date.now();

    // Get or create rate limit data for this key
    let rateLimitData = this.requestMap.get(key);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Create new window
      rateLimitData = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    // Increment request count
    rateLimitData.count++;
    this.requestMap.set(key, rateLimitData);

    // Check if limit exceeded
    if (rateLimitData.count > this.config.maxRequests) {
      // Log security event asynchronously (fire and forget)
      this.auditService
        .logSecurityEvent(
          AuditEventType.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded for ${endpoint}`,
          AuditSeverity.HIGH,
          {
            ipAddress,
            userAgent,
          },
          {
            endpoint,
            requests: rateLimitData.count,
            windowMs: this.config.windowMs,
            maxRequests: this.config.maxRequests,
          },
        )
        .catch(() => {
          // Ignore audit logging errors - don't block rate limiting
        });

      throw new TooManyRequestsException({
        message: this.config.message,
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
      });
    }

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      this.cleanupExpiredEntries();
    }

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
