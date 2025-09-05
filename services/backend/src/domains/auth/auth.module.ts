import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Entities
import { UserSession } from './entities/user-session.entity';
import { UserOTP } from './entities/user-otp.entity';
import { UserOAuthAccount } from './entities/user-oauth-account.entity';
import { AuditLog } from './entities/audit-log.entity';

// Services
import { AuthService } from './services/auth.service';
import { JWTService } from './services/jwt.service';
import { OTPService } from './services/otp.service';
import { OAuthService } from './services/oauth.service';
import { AuditService } from './services/audit.service';
import { DLPService } from './services/dlp.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { ConsentController } from './controllers/consent.controller';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalAuthGuard, DeviceBindingGuard } from './guards/optional-auth.guard';

// Import Users module dependencies
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([UserSession, UserOTP, UserOAuthAccount, AuditLog]),

    // JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TTL', '900'),
          issuer: configService.get<string>('JWT_ISSUER', 'healthcoachai'),
        },
      }),
      inject: [ConfigService],
    }),

    // Passport for authentication strategies
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // HTTP module for OAuth API calls
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'auth',
          ttl: configService.get<number>('THROTTLE_TTL', 60000), // 1 minute
          limit: configService.get<number>('THROTTLE_LIMIT', 10), // 10 requests per minute
        },
      ],
      inject: [ConfigService],
    }),

    // Users module for user management
    forwardRef(() => UsersModule),
  ],

  controllers: [AuthController, ConsentController],

  providers: [
    // Core services
    AuthService,
    JWTService,
    OTPService,
    OAuthService,
    AuditService,
    DLPService,

    // Authentication strategies
    JwtStrategy,

    // Guards
    JwtAuthGuard,
    OptionalAuthGuard,
    DeviceBindingGuard,
  ],

  exports: [
    // Export services that other modules might need
    AuthService,
    JWTService,
    AuditService,
    DLPService,
    JwtAuthGuard,
    OptionalAuthGuard,
    DeviceBindingGuard,
  ],
})
export class AuthModule {}
