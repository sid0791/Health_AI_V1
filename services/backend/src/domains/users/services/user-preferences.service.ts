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
}
