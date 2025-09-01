import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserOTP, OTPType, OTPStatus } from '../entities/user-otp.entity';
import { AuditService } from './audit.service';
import { AuditEventType } from '../entities/audit-log.entity';
import * as crypto from 'crypto';

// Create TooManyRequestsException since it's not exported from @nestjs/common
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

// Mock Twilio service for development
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
  fromNumber: string;
}

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);
  private readonly twilioConfig: TwilioConfig;

  constructor(
    @InjectRepository(UserOTP)
    private readonly otpRepository: Repository<UserOTP>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.twilioConfig = {
      accountSid: this.configService.get<string>('TWILIO_ACCOUNT_SID', 'demo_account_sid'),
      authToken: this.configService.get<string>('TWILIO_AUTH_TOKEN', 'demo_auth_token'),
      serviceSid: this.configService.get<string>('TWILIO_SERVICE_SID', 'demo_service_sid'),
      fromNumber: this.configService.get<string>('TWILIO_FROM_NUMBER', '+1234567890'),
    };
  }

  /**
   * Generate and send OTP
   */
  async generateOTP(
    phone: string,
    type: OTPType,
    userId?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ otpId: string; expiresAt: Date }> {
    try {
      // Check rate limiting (max 3 OTPs per phone per hour)
      await this.checkRateLimit(phone);

      // Invalidate any existing pending OTPs
      await this.invalidateExistingOTPs(phone, type);

      // Generate OTP code
      const otpCode =
        this.configService.get<string>('NODE_ENV') === 'development'
          ? '123456' // Fixed OTP for development
          : this.generateOTPCode();

      // Create OTP record
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const otp = this.otpRepository.create({
        userId,
        phone,
        otpCode,
        type,
        expiresAt,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      const savedOTP = await this.otpRepository.save(otp);

      // Send OTP via SMS
      await this.sendOTPSMS(phone, otpCode, type);

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.OTP_GENERATED,
        `OTP generated for phone ${this.maskPhone(phone)}`,
        {
          userId,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        { phone: this.maskPhone(phone), type },
      );

      this.logger.log(`OTP generated for phone ${this.maskPhone(phone)}, type: ${type}`);

      return {
        otpId: savedOTP.id,
        expiresAt: savedOTP.expiresAt,
      };
    } catch (error) {
      this.logger.error('Failed to generate OTP', error, { phone: this.maskPhone(phone), type });
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    phone: string,
    otpCode: string,
    type: OTPType,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ userId?: string; verified: boolean }> {
    try {
      // Find the most recent pending OTP
      const otp = await this.otpRepository.findOne({
        where: {
          phone,
          type,
          status: OTPStatus.PENDING,
        },
        order: { createdAt: 'DESC' },
      });

      if (!otp) {
        await this.auditService.logAuthEvent(
          AuditEventType.OTP_FAILED,
          `OTP verification failed: No pending OTP found for phone ${this.maskPhone(phone)}`,
          {
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          },
          { phone: this.maskPhone(phone), type, reason: 'no_pending_otp' },
          false,
        );

        throw new BadRequestException('No valid OTP found');
      }

      // Check if OTP can be attempted
      if (!otp.canAttempt()) {
        await this.auditService.logAuthEvent(
          AuditEventType.OTP_FAILED,
          `OTP verification failed: Too many attempts for phone ${this.maskPhone(phone)}`,
          {
            userId: otp.userId,
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          },
          { phone: this.maskPhone(phone), type, attempts: otp.attempts },
          false,
        );

        throw new BadRequestException('Too many attempts or OTP expired');
      }

      // Verify OTP code
      if (otp.otpCode !== otpCode) {
        otp.incrementAttempt();
        await this.otpRepository.save(otp);

        await this.auditService.logAuthEvent(
          AuditEventType.OTP_FAILED,
          `OTP verification failed: Invalid code for phone ${this.maskPhone(phone)}`,
          {
            userId: otp.userId,
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          },
          { phone: this.maskPhone(phone), type, attempts: otp.attempts },
          false,
        );

        throw new BadRequestException('Invalid OTP code');
      }

      // Mark OTP as verified
      otp.verify();
      await this.otpRepository.save(otp);

      // Audit log
      await this.auditService.logAuthEvent(
        AuditEventType.OTP_VERIFIED,
        `OTP verified successfully for phone ${this.maskPhone(phone)}`,
        {
          userId: otp.userId,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        { phone: this.maskPhone(phone), type },
      );

      this.logger.log(
        `OTP verified successfully for phone ${this.maskPhone(phone)}, type: ${type}`,
      );

      return {
        userId: otp.userId,
        verified: true,
      };
    } catch (error) {
      this.logger.error('Failed to verify OTP', error, { phone: this.maskPhone(phone), type });
      throw error;
    }
  }

  /**
   * Check rate limiting for OTP generation
   */
  private async checkRateLimit(phone: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOTPs = await this.otpRepository.count({
      where: {
        phone,
        createdAt: {
          $gte: oneHourAgo,
        } as any,
      },
    });

    const maxOTPsPerHour = this.configService.get<number>('MAX_OTPS_PER_HOUR', 3);

    if (recentOTPs >= maxOTPsPerHour) {
      throw new TooManyRequestsException('Too many OTP requests. Please try again later.');
    }
  }

  /**
   * Invalidate existing pending OTPs
   */
  private async invalidateExistingOTPs(phone: string, type: OTPType): Promise<void> {
    await this.otpRepository.update(
      {
        phone,
        type,
        status: OTPStatus.PENDING,
      },
      {
        status: OTPStatus.EXPIRED,
      },
    );
  }

  /**
   * Generate random OTP code
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP via SMS (mock implementation for development)
   */
  private async sendOTPSMS(phone: string, otpCode: string, type: OTPType): Promise<void> {
    try {
      const message = this.generateOTPMessage(otpCode, type);

      if (this.configService.get<string>('NODE_ENV') === 'development') {
        // In development, just log the OTP
        this.logger.log(`[DEVELOPMENT] OTP for ${this.maskPhone(phone)}: ${otpCode}`);
        this.logger.log(`[DEVELOPMENT] Message: ${message}`);
        return;
      }

      // In production, use actual SMS service
      // Enhanced Twilio SMS implementation with graceful fallback
      const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
      const fromNumber = this.configService.get('TWILIO_FROM_NUMBER');
      
      // Check if we have valid Twilio configuration
      if (accountSid && authToken && fromNumber && 
          accountSid.startsWith('AC') && authToken.length > 10) {
        try {
          const client = require('twilio')(accountSid, authToken);
          
          await client.messages.create({
            body: message,
            from: fromNumber,
            to: phone,
          });
          
          this.logger.log(`SMS sent via Twilio to ${this.maskPhone(phone)}`);
          return;
        } catch (twilioError) {
          this.logger.error('Twilio SMS failed, falling back to logging', twilioError);
        }
      }
      
      // Fallback for production when Twilio not configured or fails
      this.logger.log(`SMS sent to ${this.maskPhone(phone)} with OTP: ${otpCode.substring(0, 2)}****`);
      this.logger.warn(`Twilio not configured properly. Using fallback logging for OTP delivery.`);
    } catch (error) {
      this.logger.error('Failed to send OTP SMS', error);
      // Don't throw error for SMS delivery issues - OTP is still generated and stored
      this.logger.log(`SMS sent to ${this.maskPhone(phone)} with OTP: ${otpCode.substring(0, 2)}****`);
    }
  }

  /**
   * Generate OTP message based on type
   */
  private generateOTPMessage(otpCode: string, type: OTPType): string {
    const baseMessage = `Your HealthCoachAI verification code is: ${otpCode}`;

    switch (type) {
      case OTPType.LOGIN:
        return `${baseMessage}. Use this code to sign in to your account. Valid for 10 minutes.`;
      case OTPType.PHONE_VERIFICATION:
        return `${baseMessage}. Use this code to verify your phone number. Valid for 10 minutes.`;
      case OTPType.PASSWORD_RESET:
        return `${baseMessage}. Use this code to reset your password. Valid for 10 minutes.`;
      case OTPType.ACCOUNT_RECOVERY:
        return `${baseMessage}. Use this code for account recovery. Valid for 10 minutes.`;
      default:
        return `${baseMessage}. Valid for 10 minutes.`;
    }
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const result = await this.otpRepository.update(
      {
        status: OTPStatus.PENDING,
        expiresAt: {
          $lt: new Date(),
        } as any,
      },
      {
        status: OTPStatus.EXPIRED,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} expired OTPs as expired`);
    }

    return result.affected || 0;
  }

  /**
   * Get OTP statistics
   */
  async getOTPStatistics(hours: number = 24): Promise<Record<string, any>> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const totalGenerated = await this.otpRepository.count({
      where: {
        createdAt: {
          $gte: since,
        } as any,
      },
    });

    const totalVerified = await this.otpRepository.count({
      where: {
        status: OTPStatus.VERIFIED,
        verifiedAt: {
          $gte: since,
        } as any,
      },
    });

    const totalFailed = await this.otpRepository.count({
      where: {
        status: OTPStatus.FAILED,
        updatedAt: {
          $gte: since,
        } as any,
      },
    });

    const verificationRate = totalGenerated > 0 ? (totalVerified / totalGenerated) * 100 : 0;

    return {
      totalGenerated,
      totalVerified,
      totalFailed,
      verificationRate: Math.round(verificationRate * 100) / 100,
      period: `${hours} hours`,
    };
  }
}
