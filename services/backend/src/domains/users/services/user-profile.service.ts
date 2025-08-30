import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  // Placeholder implementation - will be expanded in later phases
  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({ where: { userId } });
  }

  async create(data: Partial<UserProfile>): Promise<UserProfile> {
    const profile = this.userProfileRepository.create(data);
    return this.userProfileRepository.save(profile);
  }

  async update(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    await this.userProfileRepository.update({ userId }, data);
    return this.findByUserId(userId);
  }
}
