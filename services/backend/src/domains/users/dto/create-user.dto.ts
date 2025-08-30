import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'User phone number (with country code)',
    example: '+91987654321',
  })
  @IsOptional()
  @IsPhoneNumber('IN')
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Data residency region',
    example: 'IN',
    default: 'IN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  dataResidencyRegion?: string;

  @ApiPropertyOptional({
    description: 'Whether email is verified',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether phone is verified',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  // Profile information (optional during user creation)
  @ApiPropertyOptional({
    description: 'First name',
    example: 'Rajesh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Kumar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'Rajesh K.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;
}
