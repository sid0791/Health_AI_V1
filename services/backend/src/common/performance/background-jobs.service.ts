import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface JobData {
  type: string;
  payload: any;
  userId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

@Injectable()
export class BackgroundJobService {
  private readonly logger = new Logger(BackgroundJobService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  // Job types for health application
  private readonly jobTypes = {
    HEALTH_DATA_SYNC: 'health_data_sync',
    MEAL_PLAN_GENERATION: 'meal_plan_generation',
    FITNESS_PLAN_GENERATION: 'fitness_plan_generation',
    AI_PROMPT_BATCH: 'ai_prompt_batch',
    REPORT_GENERATION: 'report_generation',
    DATA_CLEANUP: 'data_cleanup',
    NOTIFICATION_SEND: 'notification_send',
    HEALTH_INSIGHTS: 'health_insights',
    BACKUP_DATA: 'backup_data',
    CACHE_WARMUP: 'cache_warmup',
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeQueues();
  }

  /**
   * Initialize job queues and workers
   */
  private async initializeQueues(): Promise<void> {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
    };

    try {
      // Create queues for different job types
      const queueConfigs = [
        { name: 'high-priority', concurrency: 5 },
        { name: 'medium-priority', concurrency: 3 },
        { name: 'low-priority', concurrency: 2 },
        { name: 'scheduled', concurrency: 1 },
      ];

      for (const config of queueConfigs) {
        const queue = new Queue(config.name, {
          connection: redisConfig,
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        });

        const worker = new Worker(config.name, this.createJobProcessor(), {
          connection: redisConfig,
          concurrency: config.concurrency,
        });

        // Add event listeners
        this.addEventListeners(worker, config.name);

        this.queues.set(config.name, queue);
        this.workers.set(config.name, worker);
      }

      this.logger.log('Background job service initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize job service: ${error.message}`);
    }
  }

  /**
   * Add job to queue
   */
  async addJob(jobData: JobData, queueName: string = 'medium-priority'): Promise<string | null> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(jobData.type, jobData, {
        priority: jobData.priority || 0,
        delay: jobData.delay || 0,
        attempts: jobData.attempts || 3,
      });

      this.logger.log(`Job ${job.id} added to queue ${queueName}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to add job: ${error.message}`);
      return null;
    }
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob(jobData: JobData, cronPattern: string): Promise<string | null> {
    try {
      const queue = this.queues.get('scheduled');
      if (!queue) {
        throw new Error('Scheduled queue not found');
      }

      const job = await queue.add(jobData.type, jobData, {
        repeat: { pattern: cronPattern },
        jobId: `recurring-${jobData.type}-${Date.now()}`,
      });

      this.logger.log(`Recurring job ${job.id} scheduled with pattern: ${cronPattern}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to schedule recurring job: ${error.message}`);
      return null;
    }
  }

  /**
   * Create job processor function
   */
  private createJobProcessor() {
    return async (job: Job): Promise<JobResult> => {
      const start = Date.now();

      try {
        this.logger.log(`Processing job ${job.id}: ${job.name}`);

        let result: any;

        switch (job.name) {
          case this.jobTypes.HEALTH_DATA_SYNC:
            result = await this.processHealthDataSync(job.data);
            break;
          case this.jobTypes.MEAL_PLAN_GENERATION:
            result = await this.processMealPlanGeneration(job.data);
            break;
          case this.jobTypes.FITNESS_PLAN_GENERATION:
            result = await this.processFitnessPlanGeneration(job.data);
            break;
          case this.jobTypes.AI_PROMPT_BATCH:
            result = await this.processAIPromptBatch(job.data);
            break;
          case this.jobTypes.REPORT_GENERATION:
            result = await this.processReportGeneration(job.data);
            break;
          case this.jobTypes.DATA_CLEANUP:
            result = await this.processDataCleanup(job.data);
            break;
          case this.jobTypes.NOTIFICATION_SEND:
            result = await this.processNotificationSend(job.data);
            break;
          case this.jobTypes.HEALTH_INSIGHTS:
            result = await this.processHealthInsights(job.data);
            break;
          case this.jobTypes.BACKUP_DATA:
            result = await this.processBackupData(job.data);
            break;
          case this.jobTypes.CACHE_WARMUP:
            result = await this.processCacheWarmup(job.data);
            break;
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }

        const duration = Date.now() - start;
        this.logger.log(`Job ${job.id} completed in ${duration}ms`);

        return {
          success: true,
          result,
          duration,
        };
      } catch (error) {
        const duration = Date.now() - start;
        this.logger.error(`Job ${job.id} failed after ${duration}ms: ${error.message}`);

        return {
          success: false,
          error: error.message,
          duration,
        };
      }
    };
  }

  /**
   * Add event listeners to worker
   */
  private addEventListeners(worker: Worker, queueName: string): void {
    worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed in queue ${queueName}: ${err.message}`);
    });

    worker.on('progress', (job, progress) => {
      this.logger.debug(`Job ${job.id} progress: ${progress}%`);
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error in queue ${queueName}: ${err.message}`);
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [name, queue] of this.queues.entries()) {
      try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + completed.length + failed.length,
        };
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }

    return stats;
  }

  // Job Processors

  private async processHealthDataSync(data: any): Promise<any> {
    // Sync health data from external providers
    this.logger.log(`Syncing health data for user: ${data.userId}`);

    // Simulate processing
    await this.delay(2000);

    return { synced: true, records: 10 };
  }

  private async processMealPlanGeneration(data: any): Promise<any> {
    // Generate personalized meal plan
    this.logger.log(`Generating meal plan for user: ${data.userId}`);

    // Simulate processing
    await this.delay(5000);

    return { planId: `plan_${Date.now()}`, meals: 21 };
  }

  private async processFitnessPlanGeneration(data: any): Promise<any> {
    // Generate personalized fitness plan
    this.logger.log(`Generating fitness plan for user: ${data.userId}`);

    // Simulate processing
    await this.delay(3000);

    return { planId: `fitness_${Date.now()}`, exercises: 15 };
  }

  private async processAIPromptBatch(data: any): Promise<any> {
    // Process batch of AI prompts
    this.logger.log(`Processing AI prompt batch: ${data.batchId}`);

    // Simulate processing
    await this.delay(4000);

    return { batchId: data.batchId, processed: data.requests?.length || 0 };
  }

  private async processReportGeneration(data: any): Promise<any> {
    // Generate health reports
    this.logger.log(`Generating report for user: ${data.userId}`);

    // Simulate processing
    await this.delay(6000);

    return { reportId: `report_${Date.now()}`, pages: 5 };
  }

  private async processDataCleanup(data: any): Promise<any> {
    // Clean up old data
    this.logger.log('Processing data cleanup');

    // Simulate processing
    await this.delay(3000);

    return { deleted: 100, cleaned: true };
  }

  private async processNotificationSend(data: any): Promise<any> {
    // Send notifications
    this.logger.log(`Sending notification to user: ${data.userId}`);

    // Simulate processing
    await this.delay(1000);

    return { sent: true, notificationId: `notif_${Date.now()}` };
  }

  private async processHealthInsights(data: any): Promise<any> {
    // Generate health insights
    this.logger.log(`Generating health insights for user: ${data.userId}`);

    // Simulate processing
    await this.delay(4000);

    return { insights: 5, recommendations: 3 };
  }

  private async processBackupData(data: any): Promise<any> {
    // Backup user data
    this.logger.log('Processing data backup');

    // Simulate processing
    await this.delay(8000);

    return { backupId: `backup_${Date.now()}`, size: '100MB' };
  }

  private async processCacheWarmup(data: any): Promise<any> {
    // Warm up cache
    this.logger.log('Processing cache warmup');

    // Simulate processing
    await this.delay(2000);

    return { warmedUp: true, keys: 50 };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check job scheduling
   */
  async scheduleHealthJobs(): Promise<void> {
    // Schedule daily health data sync
    await this.scheduleRecurringJob(
      {
        type: this.jobTypes.HEALTH_DATA_SYNC,
        payload: { action: 'daily_sync' },
      },
      '0 6 * * *',
    ); // 6 AM daily

    // Schedule weekly report generation
    await this.scheduleRecurringJob(
      {
        type: this.jobTypes.REPORT_GENERATION,
        payload: { action: 'weekly_reports' },
      },
      '0 9 * * 1',
    ); // 9 AM every Monday

    // Schedule daily cache warmup
    await this.scheduleRecurringJob(
      {
        type: this.jobTypes.CACHE_WARMUP,
        payload: { action: 'daily_warmup' },
      },
      '0 5 * * *',
    ); // 5 AM daily

    // Schedule weekly data cleanup
    await this.scheduleRecurringJob(
      {
        type: this.jobTypes.DATA_CLEANUP,
        payload: { action: 'weekly_cleanup' },
      },
      '0 2 * * 0',
    ); // 2 AM every Sunday

    this.logger.log('Health-related recurring jobs scheduled');
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    for (const queue of this.queues.values()) {
      await queue.close();
    }

    this.logger.log('Background job service cleaned up');
  }
}
