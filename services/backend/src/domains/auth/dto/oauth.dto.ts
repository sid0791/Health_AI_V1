import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { OAuthProvider } from '../entities/user-oauth-account.entity';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'OAuth provider',
    example: 'google',
    enum: OAuthProvider,
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'OAuth state parameter for CSRF protection',
    example: 'random-state-string',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

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
    example: 'John\'s iPhone',
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

export class OAuthUrlResponseDto {
  @ApiProperty({
    description: 'OAuth authorization URL',
    example: 'https://accounts.google.com/oauth2/auth?client_id=...',
  })
  authUrl: string;

  @ApiProperty({
    description: 'OAuth state parameter for CSRF protection',
    example: 'random-state-string',
  })
  state: string;
}

export class ConnectOAuthDto {
  @ApiProperty({
    description: 'OAuth provider to connect',
    example: 'google',
    enum: OAuthProvider,
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'OAuth state parameter for CSRF protection',
    example: 'random-state-string',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;
}

export class DisconnectOAuthDto {
  @ApiProperty({
    description: 'OAuth provider to disconnect',
    example: 'google',
    enum: OAuthProvider,
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;
}