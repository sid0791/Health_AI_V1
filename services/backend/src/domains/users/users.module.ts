import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserConsent } from './entities/user-consent.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserGoals } from './entities/user-goals.entity';
import { UserTokenUsage } from './entities/user-token-usage.entity';
import { UserHealthProfile } from './entities/user-health-profile.entity';
import { UsersController } from './controllers/users.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { UsersService } from './services/users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserConsentService } from './services/user-consent.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UserGoalsService } from './services/user-goals.service';
import { OnboardingService } from './services/onboarding.service';
import { TokenManagementService } from './services/token-management.service';
import { TokenSchedulerService } from './services/token-scheduler.service';
import { UserHealthProfileService } from './services/user-health-profile.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserConsent,
      UserPreferences,
      UserGoals,
      UserTokenUsage,
      UserHealthProfile,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, OnboardingController],
  providers: [
    UsersService,
    UserProfileService,
    UserConsentService,
    UserPreferencesService,
    UserGoalsService,
    OnboardingService,
    TokenManagementService,
    TokenSchedulerService,
    UserHealthProfileService,
  ],
  exports: [
    UsersService,
    UserProfileService,
    UserConsentService,
    UserPreferencesService,
    UserGoalsService,
    OnboardingService,
    TokenManagementService,
    UserHealthProfileService,
    // Export TypeORM repositories for use in other modules
    TypeOrmModule,
  ],
})
export class UsersModule {}
