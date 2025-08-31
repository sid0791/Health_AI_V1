import { IsEnum, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';
import { HealthDataProvider, HealthDataType } from '../entities/health-data-entry.entity';

export class ConnectHealthProviderDto {
  @IsEnum(HealthDataProvider)
  provider: HealthDataProvider;

  @IsOptional()
  @IsString()
  authCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class SyncHealthDataDto {
  @IsEnum(HealthDataProvider)
  provider: HealthDataProvider;

  @IsOptional()
  @IsArray()
  @IsEnum(HealthDataType, { each: true })
  dataTypes?: HealthDataType[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  force?: boolean;
}

export class HealthDataQueryDto {
  @IsOptional()
  @IsEnum(HealthDataProvider)
  provider?: HealthDataProvider;

  @IsOptional()
  @IsEnum(HealthDataType)
  dataType?: HealthDataType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}
