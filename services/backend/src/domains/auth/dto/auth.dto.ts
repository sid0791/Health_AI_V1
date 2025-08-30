import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({
    description: 'Device identifier',
    example: 'iPhone_12_Pro_ABC123',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;
}

export class AuthUserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+919876543210',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Whether user has completed profile setup',
    example: true,
  })
  profileCompleted: boolean;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Authentication tokens',
  })
  tokens: AuthTokensResponseDto;

  @ApiProperty({
    description: 'User information',
  })
  user: AuthUserResponseDto;

  @ApiProperty({
    description: 'Whether this is a new user registration',
    example: false,
  })
  isNewUser: boolean;
}

export class LogoutDto {
  @ApiProperty({
    description: 'Device identifier to logout specific device',
    example: 'iPhone_12_Pro_ABC123',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Logout scope',
    example: 'current',
    enum: ['current', 'all', 'others'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['current', 'all', 'others'])
  scope?: 'current' | 'all' | 'others';
}