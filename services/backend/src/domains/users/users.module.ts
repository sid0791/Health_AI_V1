import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserConsent } from './entities/user-consent.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserGoals } from './entities/user-goals.entity';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserConsentService } from './services/user-consent.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UserGoalsService } from './services/user-goals.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, UserConsent, UserPreferences, UserGoals])],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileService,
    UserConsentService,
    UserPreferencesService,
    UserGoalsService,
  ],
  exports: [
    UsersService,
    UserProfileService,
    UserConsentService,
    UserPreferencesService,
    UserGoalsService,
  ],
})
export class UsersModule {}
