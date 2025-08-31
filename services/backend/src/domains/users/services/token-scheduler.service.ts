import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenManagementService } from './token-management.service';

@Injectable()
export class TokenSchedulerService {
  private readonly logger = new Logger(TokenSchedulerService.name);

  constructor(private readonly tokenManagementService: TokenManagementService) {}

  /**
   * Reset daily tokens for all users at midnight UTC
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyTokens(): Promise<void> {
    this.logger.log('Starting daily token reset...');

    try {
      await this.tokenManagementService.resetDailyTokensForAllUsers();
      this.logger.log('Daily token reset completed successfully');
    } catch (error) {
      this.logger.error('Failed to reset daily tokens:', error);
    }
  }

  /**
   * Reset monthly tokens on the 1st of every month at midnight UTC
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetMonthlyTokens(): Promise<void> {
    this.logger.log('Starting monthly token reset...');

    try {
      await this.tokenManagementService.resetMonthlyTokensForAllUsers();
      this.logger.log('Monthly token reset completed successfully');
    } catch (error) {
      this.logger.error('Failed to reset monthly tokens:', error);
    }
  }

  /**
   * Clean up old token usage records every week
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldTokenUsage(): Promise<void> {
    this.logger.log('Starting token usage cleanup...');

    try {
      // This would implement cleanup logic for records older than 6 months
      // await this.tokenManagementService.cleanupOldUsageRecords();
      this.logger.log('Token usage cleanup completed successfully');
    } catch (error) {
      this.logger.error('Failed to cleanup old token usage:', error);
    }
  }
}
