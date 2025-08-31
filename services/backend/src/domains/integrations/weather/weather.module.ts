import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WeatherData } from './entities/weather-data.entity';
import { WeatherNudge } from './entities/weather-nudge.entity';
import { WeatherService } from './services/weather.service';

@Module({
  imports: [TypeOrmModule.forFeature([WeatherData, WeatherNudge]), HttpModule],
  providers: [WeatherService],
  exports: [WeatherService, TypeOrmModule],
})
export class WeatherModule {}
