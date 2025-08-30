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
}
