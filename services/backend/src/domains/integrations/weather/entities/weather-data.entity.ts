import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WeatherCondition {
  CLEAR = 'clear',
  PARTLY_CLOUDY = 'partly_cloudy',
  CLOUDY = 'cloudy',
  OVERCAST = 'overcast',
  MIST = 'mist',
  FOG = 'fog',
  LIGHT_RAIN = 'light_rain',
  MODERATE_RAIN = 'moderate_rain',
  HEAVY_RAIN = 'heavy_rain',
  LIGHT_SNOW = 'light_snow',
  MODERATE_SNOW = 'moderate_snow',
  HEAVY_SNOW = 'heavy_snow',
  THUNDERSTORM = 'thunderstorm',
  HAIL = 'hail',
  WINDY = 'windy',
}

export enum AQILevel {
  GOOD = 'good',               // 0-50
  MODERATE = 'moderate',       // 51-100
  UNHEALTHY_SENSITIVE = 'unhealthy_for_sensitive', // 101-150
  UNHEALTHY = 'unhealthy',     // 151-200
  VERY_UNHEALTHY = 'very_unhealthy', // 201-300
  HAZARDOUS = 'hazardous',     // 301+
}

@Entity('weather_data')
@Index(['location', 'recordedAt'])
@Index(['recordedAt'])
@Index(['aqiLevel'])
export class WeatherData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  location: string;

  @Column('decimal', { precision: 10, scale: 6 })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 6 })
  longitude: number;

  @Column('timestamp')
  recordedAt: Date;

  // Weather information
  @Column({
    type: 'enum',
    enum: WeatherCondition,
  })
  condition: WeatherCondition;

  @Column('varchar', { length: 255 })
  description: string;

  @Column('decimal', { precision: 5, scale: 2 })
  temperatureCelsius: number;

  @Column('decimal', { precision: 5, scale: 2 })
  feelsLikeCelsius: number;

  @Column('integer')
  humidity: number; // Percentage

  @Column('decimal', { precision: 8, scale: 2 })
  pressureHpa: number;

  @Column('decimal', { precision: 5, scale: 2 })
  visibilityKm: number;

  @Column('decimal', { precision: 5, scale: 2 })
  windSpeedKmh: number;

  @Column('integer')
  windDirectionDegrees: number;

  @Column('integer')
  uvIndex: number;

  // Air Quality information
  @Column('integer')
  aqiValue: number;

  @Column({
    type: 'enum',
    enum: AQILevel,
  })
  aqiLevel: AQILevel;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  pm25?: number; // µg/m³

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  pm10?: number; // µg/m³

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  no2?: number; // µg/m³

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  o3?: number; // µg/m³

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  so2?: number; // µg/m³

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  co?: number; // µg/m³

  // Data source information
  @Column('varchar', { length: 100 })
  provider: string; // e.g., 'openweather', 'iqair'

  @Column('varchar', { length: 255, nullable: true })
  externalId?: string;

  @Column('jsonb', { nullable: true })
  rawData?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}