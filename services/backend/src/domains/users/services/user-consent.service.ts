import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserConsent, ConsentType, ConsentStatus } from '../entities/user-consent.entity';
import { User } from '../entities/user.entity';

export interface ConsentRequest {
  consentType: ConsentType;
  consentVersion: string;
  granted: boolean;
  expiresAt?: Date;
  legalBasis?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  consentMethod?: string;
}

export interface ConsentUpdate {
  granted: boolean;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UserConsentService {
  private readonly logger = new Logger(UserConsentService.name);

  constructor(
    @InjectRepository(UserConsent)
    private readonly userConsentRepository: Repository<UserConsent>,
  ) {}

  /**
   * Get all consents for a user
   */
  async findByUserId(userId: string): Promise<UserConsent[]> {
    return this.userConsentRepository.find({ 
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active consents for a user
   */
  async getActiveConsents(userId: string): Promise<UserConsent[]> {
    return this.userConsentRepository.find({
      where: { 
        userId,
        status: ConsentStatus.GRANTED,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get consent by type for a user
   */
  async getConsentByType(userId: string, consentType: ConsentType): Promise<UserConsent | null> {
    return this.userConsentRepository.findOne({
      where: { userId, consentType },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.getConsentByType(userId, consentType);
    return consent ? consent.isActive() : false;
  }

  /**
   * Grant consent
   */
  async grantConsent(userId: string, request: ConsentRequest): Promise<UserConsent> {
    try {
      // Check if consent already exists
      const existingConsent = await this.getConsentByType(userId, request.consentType);
      
      if (existingConsent && existingConsent.isActive()) {
        throw new BadRequestException(`Consent ${request.consentType} is already granted`);
      }

      // Create new consent record
      const consent = this.userConsentRepository.create({
        userId,
        consentType: request.consentType,
        consentVersion: request.consentVersion,
        status: request.granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        expiresAt: request.expiresAt,
        legalBasis: request.legalBasis,
        notes: request.notes,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        consentMethod: request.consentMethod || 'api',
      });

      if (request.granted) {
        consent.grant(request.ipAddress, request.userAgent);
      }

      const savedConsent = await this.userConsentRepository.save(consent);

      this.logger.log(`Consent ${request.consentType} ${request.granted ? 'granted' : 'denied'} for user ${userId}`);

      return savedConsent;
    } catch (error) {
      this.logger.error('Failed to grant consent', error);
      throw error;
    }
  }

  /**
   * Update consent
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    update: ConsentUpdate,
  ): Promise<UserConsent> {
    try {
      const consent = await this.getConsentByType(userId, consentType);
      
      if (!consent) {
        throw new NotFoundException(`Consent ${consentType} not found for user`);
      }

      if (update.granted) {
        consent.grant(update.ipAddress, update.userAgent);
      } else {
        consent.withdraw();
      }

      if (update.notes) {
        consent.notes = update.notes;
      }

      const updatedConsent = await this.userConsentRepository.save(consent);

      this.logger.log(`Consent ${consentType} ${update.granted ? 'granted' : 'withdrawn'} for user ${userId}`);

      return updatedConsent;
    } catch (error) {
      this.logger.error('Failed to update consent', error);
      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsent> {
    return this.updateConsent(userId, consentType, {
      granted: false,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Withdraw all consents for a user
   */
  async withdrawAllConsents(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsent[]> {
    try {
      const activeConsents = await this.getActiveConsents(userId);
      const updatedConsents: UserConsent[] = [];

      for (const consent of activeConsents) {
        consent.withdraw();
        if (ipAddress) consent.ipAddress = ipAddress;
        if (userAgent) consent.userAgent = userAgent;
        
        const updated = await this.userConsentRepository.save(consent);
        updatedConsents.push(updated);
      }

      this.logger.log(`All consents withdrawn for user ${userId} (${updatedConsents.length} consents)`);

      return updatedConsents;
    } catch (error) {
      this.logger.error('Failed to withdraw all consents', error);
      throw error;
    }
  }

  /**
   * Renew consent with new version
   */
  async renewConsent(
    userId: string,
    consentType: ConsentType,
    newVersion: string,
    expiresAt?: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsent> {
    try {
      const consent = await this.getConsentByType(userId, consentType);
      
      if (!consent) {
        throw new NotFoundException(`Consent ${consentType} not found for user`);
      }

      consent.renew(newVersion, expiresAt);
      if (ipAddress) consent.ipAddress = ipAddress;
      if (userAgent) consent.userAgent = userAgent;

      const renewedConsent = await this.userConsentRepository.save(consent);

      this.logger.log(`Consent ${consentType} renewed for user ${userId} with version ${newVersion}`);

      return renewedConsent;
    } catch (error) {
      this.logger.error('Failed to renew consent', error);
      throw error;
    }
  }

  /**
   * Batch grant multiple consents
   */
  async batchGrantConsents(
    userId: string,
    requests: ConsentRequest[],
  ): Promise<UserConsent[]> {
    try {
      const consents: UserConsent[] = [];

      for (const request of requests) {
        const consent = await this.grantConsent(userId, request);
        consents.push(consent);
      }

      this.logger.log(`Batch granted ${consents.length} consents for user ${userId}`);

      return consents;
    } catch (error) {
      this.logger.error('Failed to batch grant consents', error);
      throw error;
    }
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(
    userId: string,
    consentType?: ConsentType,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ consents: UserConsent[]; total: number }> {
    const where: any = { userId };
    if (consentType) {
      where.consentType = consentType;
    }

    const [consents, total] = await this.userConsentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { consents, total };
  }

  /**
   * Get users who have granted specific consent
   */
  async getUsersWithConsent(
    consentType: ConsentType,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ consents: UserConsent[]; total: number }> {
    const [consents, total] = await this.userConsentRepository.findAndCount({
      where: {
        consentType,
        status: ConsentStatus.GRANTED,
      },
      order: { grantedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { consents, total };
  }

  /**
   * Export user consent data for GDPR compliance
   */
  async exportUserConsentData(userId: string): Promise<Record<string, any>> {
    try {
      const consents = await this.findByUserId(userId);

      const consentData = {
        userId,
        exportedAt: new Date().toISOString(),
        totalConsents: consents.length,
        consents: consents.map(consent => ({
          id: consent.id,
          consentType: consent.consentType,
          status: consent.status,
          consentVersion: consent.consentVersion,
          grantedAt: consent.grantedAt,
          withdrawnAt: consent.withdrawnAt,
          expiresAt: consent.expiresAt,
          legalBasis: consent.legalBasis,
          consentMethod: consent.consentMethod,
          createdAt: consent.createdAt,
          updatedAt: consent.updatedAt,
          // Exclude sensitive metadata for export
        })),
      };

      this.logger.log(`Consent data exported for user ${userId}`);

      return consentData;
    } catch (error) {
      this.logger.error('Failed to export consent data', error);
      throw error;
    }
  }

  /**
   * Delete user consent data for GDPR compliance
   */
  async deleteUserConsentData(userId: string): Promise<{ deletedCount: number }> {
    try {
      const result = await this.userConsentRepository.delete({ userId });

      this.logger.log(`Consent data deleted for user ${userId} (${result.affected} records)`);

      return { deletedCount: result.affected || 0 };
    } catch (error) {
      this.logger.error('Failed to delete consent data', error);
      throw error;
    }
  }

  /**
   * Get consent statistics
   */
  async getConsentStatistics(): Promise<Record<string, any>> {
    const totalConsents = await this.userConsentRepository.count();
    const activeConsents = await this.userConsentRepository.count({
      where: { status: ConsentStatus.GRANTED },
    });
    const expiredConsents = await this.userConsentRepository.count({
      where: { status: ConsentStatus.EXPIRED },
    });

    const consentsByType = await this.userConsentRepository
      .createQueryBuilder('consent')
      .select('consent.consentType', 'type')
      .addSelect('consent.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('consent.consentType, consent.status')
      .getRawMany();

    return {
      totalConsents,
      activeConsents,
      expiredConsents,
      consentsByType,
    };
  }

  /**
   * Check and expire old consents
   */
  async expireOldConsents(): Promise<number> {
    const result = await this.userConsentRepository
      .createQueryBuilder()
      .update(UserConsent)
      .set({ status: ConsentStatus.EXPIRED })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('status = :status', { status: ConsentStatus.GRANTED })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} old consents`);
    }

    return result.affected || 0;
  }

  /**
   * Create consent record
   */
  async create(data: Partial<UserConsent>): Promise<UserConsent> {
    const consent = this.userConsentRepository.create(data);
    return this.userConsentRepository.save(consent);
  }
}
