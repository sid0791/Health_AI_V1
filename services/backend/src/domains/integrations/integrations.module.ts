import { Module } from '@nestjs/common';
import { HealthDataModule } from './health-data/health-data.module';
import { WeatherModule } from './weather/weather.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [HealthDataModule, WeatherModule, NotificationsModule],
  exports: [HealthDataModule, WeatherModule, NotificationsModule],
})
export class IntegrationsModule {}
