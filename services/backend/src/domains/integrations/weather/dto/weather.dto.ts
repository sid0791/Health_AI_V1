import { IsOptional, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { AQILevel, WeatherCondition } from '../entities/weather-data.entity';
import { NudgeType } from '../entities/weather-nudge.entity';

export class GetWeatherDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class WeatherNudgeQueryDto {
  @IsOptional()
  @IsEnum(NudgeType)
  nudgeType?: NudgeType;

  @IsOptional()
  @IsString()
  status?: string;

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

export class UpdateUserLocationDto {
  @IsString()
  location: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class WeatherAlertSettingsDto {
  @IsOptional()
  @IsString()
  enableAQIAlerts?: boolean;

  @IsOptional()
  @IsEnum(AQILevel)
  aqiThreshold?: AQILevel;

  @IsOptional()
  @IsString()
  enableWeatherAlerts?: boolean;

  @IsOptional()
  @IsString()
  enableUVAlerts?: boolean;

  @IsOptional()
  @IsNumber()
  uvThreshold?: number;

  @IsOptional()
  @IsString()
  quietHoursStart?: string; // HH:mm format

  @IsOptional()
  @IsString()
  quietHoursEnd?: string; // HH:mm format
}