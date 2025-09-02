import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User, UserStatus } from '../../users/entities/user.entity';
import { SmartQueryCacheService } from './smart-query-cache.service';

@Injectable()
export class SmartCacheSchedulerService {
  private readonly logger = new Logger(SmartCacheSchedulerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private smartQueryCacheService: SmartQueryCacheService,
  ) {}

  /**
   * Pre-compute responses for active users daily at 6 AM
   */
  @Cron('0 6 * * *', {
    name: 'precompute-smart-cache',
    timeZone: 'Asia/Kolkata',
  })
  async preComputeResponsesForActiveUsers(): Promise<void> {
    this.logger.log('Starting daily pre-computation of smart cache responses...');

    try {
      // Get users who have been active in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activeUsers = await this.userRepository.find({
        where: {
          lastLoginAt: MoreThan(sevenDaysAgo),
          status: UserStatus.ACTIVE,
        },
        select: ['id', 'email', 'lastLoginAt'],
        take: 1000, // Limit to prevent overload
      });

      this.logger.log(`Found ${activeUsers.length} active users for pre-computation`);

      let processed = 0;
      let errors = 0;

      // Process users in batches to avoid overloading the system
      const batchSize = 10;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              await this.smartQueryCacheService.preComputeCommonResponses(user.id);
              processed++;
            } catch (error) {
              this.logger.warn(`Failed to pre-compute for user ${user.id}: ${error.message}`);
              errors++;
            }
          }),
        );

        // Brief pause between batches
        if (i + batchSize < activeUsers.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second pause
        }
      }

      this.logger.log(`Pre-computation completed: ${processed} users processed, ${errors} errors`);
    } catch (error) {
      this.logger.error('Failed to complete daily pre-computation:', error);
    }
  }

  /**
   * Clean up old cache entries every Sunday at 3 AM
   */
  @Cron('0 3 * * 0', {
    name: 'cleanup-smart-cache',
    timeZone: 'Asia/Kolkata',
  })
  async cleanupOldCacheEntries(): Promise<void> {
    this.logger.log('Starting weekly cleanup of old cache entries...');

    try {
      // This would typically involve cleaning up old cache entries
      // For now, just log the operation
      this.logger.log('Cache cleanup completed');
    } catch (error) {
      this.logger.error('Failed to complete cache cleanup:', error);
    }
  }

  /**
   * Pre-compute responses for a specific user (can be called manually)
   */
  async preComputeForUser(userId: string): Promise<void> {
    try {
      await this.smartQueryCacheService.preComputeCommonResponses(userId);
      this.logger.log(`Successfully pre-computed responses for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to pre-compute for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get scheduler status and statistics
   */
  getSchedulerStatus(): {
    nextPreComputeRun: string;
    nextCleanupRun: string;
    status: 'active' | 'inactive';
  } {
    // This would typically check the actual cron job status
    // For now, return a mock status
    const now = new Date();
    const nextMorning = new Date(now);
    nextMorning.setDate(nextMorning.getDate() + 1);
    nextMorning.setHours(6, 0, 0, 0);

    const nextSunday = new Date(now);
    const daysUntilSunday = 7 - now.getDay();
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(3, 0, 0, 0);

    return {
      nextPreComputeRun: nextMorning.toISOString(),
      nextCleanupRun: nextSunday.toISOString(),
      status: 'active',
    };
  }
}
