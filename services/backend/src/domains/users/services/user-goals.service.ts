import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGoals } from '../entities/user-goals.entity';

@Injectable()
export class UserGoalsService {
  constructor(
    @InjectRepository(UserGoals)
    private readonly userGoalsRepository: Repository<UserGoals>,
  ) {}

  // Placeholder implementation - will be expanded in later phases
  async findByUserId(userId: string): Promise<UserGoals | null> {
    return this.userGoalsRepository.findOne({ where: { userId } });
  }

  async create(data: Partial<UserGoals>): Promise<UserGoals> {
    const goals = this.userGoalsRepository.create(data);
    return this.userGoalsRepository.save(goals);
  }

  /**
   * Save user goals for onboarding
   */
  async saveGoals(userId: string, goalsData: any): Promise<UserGoals> {
    const existingGoals = await this.findByUserId(userId);
    
    if (existingGoals) {
      // Update existing goals
      Object.assign(existingGoals, goalsData);
      return this.userGoalsRepository.save(existingGoals);
    } else {
      // Create new goals
      return this.create({ userId, ...goalsData });
    }
  }

  /**
   * Get user goals for meal planning
   */
  async getUserGoals(userId: string): Promise<any> {
    const goals = await this.findByUserId(userId);
    return goals || {
      primaryGoals: ['weight_loss'],
      targetWeight: 65,
      timeline: '6months'
    };
  }
}
