import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron } from '@nestjs/schedule';

import { WeatherData, AQILevel, WeatherCondition } from '../entities/weather-data.entity';
import { WeatherNudge, NudgeType, NudgeStatus } from '../entities/weather-nudge.entity';
import { GetWeatherDto, WeatherNudgeQueryDto } from '../dto/weather.dto';

interface OpenWeatherResponse {
  weather: Array<{ main: string; description: string; id: number }>;
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  visibility: number;
  wind: { speed: number; deg: number };
  coord: { lat: number; lon: number };
  name: string;
}

interface AirQualityResponse {
  list: Array<{
    main: { aqi: number };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
  }>;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly openWeatherApiKey: string;
  private readonly openWeatherBaseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(
    @InjectRepository(WeatherData)
    private readonly weatherRepository: Repository<WeatherData>,
    @InjectRepository(WeatherNudge)
    private readonly nudgeRepository: Repository<WeatherNudge>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.openWeatherApiKey = this.configService.get('OPENWEATHER_API_KEY');
  }

  /**
   * Get current weather and AQI data for a location
   */
  async getCurrentWeather(
    latitude: number,
    longitude: number,
    location?: string,
  ): Promise<WeatherData> {
    try {
      // Fetch weather data
      const weatherUrl = `${this.openWeatherBaseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.openWeatherApiKey}&units=metric`;
      const weatherResponse = await firstValueFrom(
        this.httpService.get<OpenWeatherResponse>(weatherUrl),
      );

      // Fetch air quality data
      const aqiUrl = `${this.openWeatherBaseUrl}/air_pollution?lat=${latitude}&lon=${longitude}&appid=${this.openWeatherApiKey}`;
      const aqiResponse = await firstValueFrom(this.httpService.get<AirQualityResponse>(aqiUrl));

      // Process and save weather data
      const weatherData = this.processWeatherData(weatherResponse.data, aqiResponse.data, location);
      return await this.weatherRepository.save(weatherData);
    } catch (error) {
      this.logger.error(`Error fetching weather data for ${latitude}, ${longitude}:`, error);
      throw error;
    }
  }

  /**
   * Get weather data with optional filters
   */
  async getWeatherData(queryDto: GetWeatherDto): Promise<WeatherData[]> {
    const where: any = {};

    if (queryDto.location) {
      where.location = queryDto.location;
    }

    if (queryDto.latitude && queryDto.longitude) {
      // Find weather data within a small radius
      const lat = queryDto.latitude;
      const lon = queryDto.longitude;
      const radius = 0.01; // Approximately 1km

      where.latitude = Between(lat - radius, lat + radius);
      where.longitude = Between(lon - radius, lon + radius);
    }

    if (queryDto.startDate && queryDto.endDate) {
      where.recordedAt = Between(new Date(queryDto.startDate), new Date(queryDto.endDate));
    }

    return await this.weatherRepository.find({
      where,
      order: { recordedAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Generate contextual nudges based on weather/AQI conditions
   */
  async generateWeatherNudges(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherNudge[]> {
    const weatherData = await this.getCurrentWeather(latitude, longitude);
    const nudges: WeatherNudge[] = [];

    // AQI-based nudges
    if (
      weatherData.aqiLevel === AQILevel.UNHEALTHY ||
      weatherData.aqiLevel === AQILevel.VERY_UNHEALTHY ||
      weatherData.aqiLevel === AQILevel.HAZARDOUS
    ) {
      nudges.push(
        await this.createNudge(userId, weatherData, {
          type: NudgeType.WORKOUT_INDOOR,
          title: 'Poor Air Quality Alert',
          message: `Air quality is ${weatherData.aqiLevel.replace('_', ' ')} (AQI: ${weatherData.aqiValue}). Consider indoor workouts today.`,
          priority: 'high',
        }),
      );

      nudges.push(
        await this.createNudge(userId, weatherData, {
          type: NudgeType.MASK_REMINDER,
          title: 'Air Quality Protection',
          message: 'Consider wearing a mask when going outdoors due to poor air quality.',
          priority: 'medium',
        }),
      );
    }

    // Weather-based nudges
    if (weatherData.temperatureCelsius > 30) {
      nudges.push(
        await this.createNudge(userId, weatherData, {
          type: NudgeType.HYDRATION,
          title: 'Hot Weather Alert',
          message: `It's ${weatherData.temperatureCelsius}°C outside. Stay hydrated and avoid prolonged sun exposure.`,
          priority: 'medium',
        }),
      );
    }

    if (weatherData.uvIndex >= 8) {
      nudges.push(
        await this.createNudge(userId, weatherData, {
          type: NudgeType.VITAMIN_D,
          title: 'High UV Index',
          message: `UV index is high (${weatherData.uvIndex}). Use sunscreen if going outdoors.`,
          priority: 'medium',
        }),
      );
    }

    if (
      weatherData.condition === WeatherCondition.CLEAR &&
      weatherData.aqiLevel === AQILevel.GOOD
    ) {
      nudges.push(
        await this.createNudge(userId, weatherData, {
          type: NudgeType.WORKOUT_OUTDOOR,
          title: 'Perfect Weather for Outdoor Activity',
          message: 'Great air quality and clear weather! Perfect time for outdoor workouts.',
          priority: 'low',
        }),
      );
    }

    return nudges;
  }

  /**
   * Get nudges for a user
   */
  async getNudges(userId: string, queryDto: WeatherNudgeQueryDto): Promise<WeatherNudge[]> {
    const where: any = { userId };

    if (queryDto.nudgeType) {
      where.nudgeType = queryDto.nudgeType;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.startDate && queryDto.endDate) {
      where.createdAt = Between(new Date(queryDto.startDate), new Date(queryDto.endDate));
    }

    const limit = queryDto.limit ? parseInt(queryDto.limit, 10) : 50;
    const offset = queryDto.offset ? parseInt(queryDto.offset, 10) : 0;

    return await this.nudgeRepository.find({
      where,
      relations: ['weatherData'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Update nudge status
   */
  async updateNudgeStatus(nudgeId: string, status: NudgeStatus): Promise<WeatherNudge> {
    const nudge = await this.nudgeRepository.findOne({ where: { id: nudgeId } });
    if (!nudge) {
      throw new Error('Nudge not found');
    }

    nudge.status = status;

    switch (status) {
      case NudgeStatus.SENT:
        nudge.sentAt = new Date();
        break;
      case NudgeStatus.DISMISSED:
        nudge.dismissedAt = new Date();
        break;
      case NudgeStatus.ACTED_UPON:
        nudge.actedUponAt = new Date();
        break;
    }

    return await this.nudgeRepository.save(nudge);
  }

  /**
   * Scheduled task to update weather data for active user locations
   */
  @Cron('0 */6 * * *') // Every 6 hours
  async updateWeatherDataForActiveLocations(): Promise<void> {
    this.logger.log('Starting scheduled weather data update');

    // This would typically fetch active user locations and update weather data
    // For now, we'll just log the scheduling
    this.logger.log('Weather data update completed');
  }

  private processWeatherData(
    weatherData: OpenWeatherResponse,
    aqiData: AirQualityResponse,
    location?: string,
  ): Partial<WeatherData> {
    const weather = weatherData.weather[0];
    const aqi = aqiData.list[0];

    return {
      location: location || weatherData.name,
      latitude: weatherData.coord.lat,
      longitude: weatherData.coord.lon,
      recordedAt: new Date(),
      condition: this.mapWeatherCondition(weather.id),
      description: weather.description,
      temperatureCelsius: weatherData.main.temp,
      feelsLikeCelsius: weatherData.main.feels_like,
      humidity: weatherData.main.humidity,
      pressureHpa: weatherData.main.pressure,
      visibilityKm: weatherData.visibility / 1000,
      windSpeedKmh: weatherData.wind.speed * 3.6, // Convert m/s to km/h
      windDirectionDegrees: weatherData.wind.deg || 0,
      uvIndex: 5, // Would need separate UV API call
      aqiValue: this.calculateAQIValue(aqi.components),
      aqiLevel: this.mapAQILevel(aqi.main.aqi),
      pm25: aqi.components.pm2_5,
      pm10: aqi.components.pm10,
      no2: aqi.components.no2,
      o3: aqi.components.o3,
      so2: aqi.components.so2,
      co: aqi.components.co,
      provider: 'openweather',
      rawData: { weather: weatherData, aqi: aqiData },
    };
  }

  private async createNudge(
    userId: string,
    weatherData: WeatherData,
    nudgeData: {
      type: NudgeType;
      title: string;
      message: string;
      priority: string;
    },
  ): Promise<WeatherNudge> {
    const nudge = this.nudgeRepository.create({
      userId,
      weatherDataId: weatherData.id,
      nudgeType: nudgeData.type,
      title: nudgeData.title,
      message: nudgeData.message,
      priority: nudgeData.priority,
      status: NudgeStatus.PENDING,
      triggered: true,
      triggeredAt: new Date(),
    });

    return await this.nudgeRepository.save(nudge);
  }

  private mapWeatherCondition(weatherId: number): WeatherCondition {
    if (weatherId >= 200 && weatherId < 300) return WeatherCondition.THUNDERSTORM;
    if (weatherId >= 300 && weatherId < 400) return WeatherCondition.LIGHT_RAIN;
    if (weatherId >= 500 && weatherId < 600) return WeatherCondition.MODERATE_RAIN;
    if (weatherId >= 600 && weatherId < 700) return WeatherCondition.LIGHT_SNOW;
    if (weatherId >= 700 && weatherId < 800) return WeatherCondition.FOG;
    if (weatherId === 800) return WeatherCondition.CLEAR;
    if (weatherId > 800) return WeatherCondition.CLOUDY;
    return WeatherCondition.CLEAR;
  }

  private mapAQILevel(aqiValue: number): AQILevel {
    if (aqiValue === 1) return AQILevel.GOOD;
    if (aqiValue === 2) return AQILevel.MODERATE;
    if (aqiValue === 3) return AQILevel.UNHEALTHY_SENSITIVE;
    if (aqiValue === 4) return AQILevel.UNHEALTHY;
    if (aqiValue === 5) return AQILevel.VERY_UNHEALTHY;
    return AQILevel.GOOD;
  }

  private calculateAQIValue(components: any): number {
    // Simplified AQI calculation - in production would use proper AQI formulas
    const pm25 = components.pm2_5 || 0;
    const pm10 = components.pm10 || 0;
    const no2 = components.no2 || 0;
    const o3 = components.o3 || 0;

    // Basic weighted average for demonstration
    return Math.round((pm25 * 2 + pm10 + no2 * 0.5 + o3 * 0.3) / 4);
  }
}
