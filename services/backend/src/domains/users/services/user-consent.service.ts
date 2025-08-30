import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConsent } from '../entities/user-consent.entity';

@Injectable()
export class UserConsentService {
  constructor(
    @InjectRepository(UserConsent)
    private readonly userConsentRepository: Repository<UserConsent>,
  ) {}

  // Placeholder implementation - will be expanded in later phases
  async findByUserId(userId: string): Promise<UserConsent[]> {
    return this.userConsentRepository.find({ where: { userId } });
  }

  async create(data: Partial<UserConsent>): Promise<UserConsent> {
    const consent = this.userConsentRepository.create(data);
    return this.userConsentRepository.save(consent);
  }
}
