import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from '../entities/user-preferences.entity';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
  ) {}

  // Placeholder implementation - will be expanded in later phases
  async findByUserId(userId: string): Promise<UserPreferences | null> {
    return this.userPreferencesRepository.findOne({ where: { userId } });
  }

  async create(data: Partial<UserPreferences>): Promise<UserPreferences> {
    const preferences = this.userPreferencesRepository.create(data);
    return this.userPreferencesRepository.save(preferences);
  }

  /**
   * Save user preferences for onboarding
   */
  async savePreferences(userId: string, preferencesData: any): Promise<UserPreferences> {
    const existingPreferences = await this.findByUserId(userId);
    
    if (existingPreferences) {
      // Update existing preferences
      Object.assign(existingPreferences, preferencesData);
      return this.userPreferencesRepository.save(existingPreferences);
    } else {
      // Create new preferences
      return this.create({ userId, ...preferencesData });
    }
  }

  /**
   * Get user preferences for meal planning
   */
  async getUserPreferences(userId: string): Promise<any> {
    const preferences = await this.findByUserId(userId);
    return preferences || {
      dietaryPreferences: ['vegetarian'],
      cuisinePreferences: ['indian'],
      allergies: [],
      mealFrequency: 3
    };
  }
}
