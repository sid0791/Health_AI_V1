import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsPhoneNumber, IsOptional, IsEnum } from 'class-validator';

export class SendOTPDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Device identifier for binding',
    example: 'iPhone_12_Pro_ABC123',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Device name for display',
    example: "John's iPhone",
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    description: 'Device platform',
    example: 'ios',
    enum: ['ios', 'android', 'web'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ios', 'android', 'web'])
  devicePlatform?: string;
}

export class VerifyOTPDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'OTP code received via SMS',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @ApiProperty({
    description: 'Device identifier for binding',
    example: 'iPhone_12_Pro_ABC123',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Device name for display',
    example: "John's iPhone",
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({
    description: 'Device platform',
    example: 'ios',
    enum: ['ios', 'android', 'web'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ios', 'android', 'web'])
  devicePlatform?: string;
}
