import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'User status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
  })
  @IsOptional()
  @IsDateString()
  lastLoginAt?: string;

  @ApiPropertyOptional({
    description: 'Login count',
  })
  @IsOptional()
  loginCount?: number;

  @ApiPropertyOptional({
    description: 'Failed login attempts',
  })
  @IsOptional()
  failedLoginAttempts?: number;

  @ApiPropertyOptional({
    description: 'Whether the account is locked until a specific time',
  })
  @IsOptional()
  @IsDateString()
  lockedUntil?: string;
}
