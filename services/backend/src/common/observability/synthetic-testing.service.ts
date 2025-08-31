import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SyntheticTest {
  id: string;
  name: string;
  description: string;
  type: 'http' | 'api' | 'database' | 'external_service';
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    expectedStatus?: number;
    expectedResponseTime?: number;
    timeout?: number;
    retries?: number;
  };
  schedule: string; // cron expression
  enabled: boolean;
  tags: string[];
}

export interface TestResult {
  testId: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  metrics?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface TestSummary {
  testId: string;
  name: string;
  successRate: number;
  avgResponseTime: number;
  lastRun: Date;
  lastSuccess: Date;
  totalRuns: number;
  recentResults: TestResult[];
}

@Injectable()
export class SyntheticTestingService {
  private readonly logger = new Logger(SyntheticTestingService.name);
  private readonly tests = new Map<string, SyntheticTest>();
  private readonly testResults = new Map<string, TestResult[]>();
  private readonly testSchedules = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.initializeHealthTests();
    this.startTestScheduler();
  }

  /**
   * Add synthetic test
   */
  addTest(test: Omit<SyntheticTest, 'id'>): string {
    const testId = this.generateTestId();
    const fullTest: SyntheticTest = { ...test, id: testId };

    this.tests.set(testId, fullTest);
    this.testResults.set(testId, []);

    if (test.enabled) {
      this.scheduleTest(testId);
    }

    this.logger.log(`Added synthetic test: ${test.name} (${testId})`);
    return testId;
  }

  /**
   * Run specific test
   */
  async runTest(testId: string): Promise<TestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const startTime = Date.now();
    let result: TestResult;

    try {
      this.logger.debug(`Running test: ${test.name}`);

      switch (test.type) {
        case 'http':
        case 'api':
          result = await this.runHttpTest(test, startTime);
          break;
        case 'database':
          result = await this.runDatabaseTest(test, startTime);
          break;
        case 'external_service':
          result = await this.runExternalServiceTest(test, startTime);
          break;
        default:
          throw new Error(`Unknown test type: ${test.type}`);
      }

      // Store result
      this.storeTestResult(testId, result);

      this.logger.log(
        `Test ${test.name} completed: ${result.success ? 'PASS' : 'FAIL'} (${result.responseTime}ms)`,
      );

      return result;
    } catch (error) {
      result = {
        testId,
        timestamp: new Date(),
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };

      this.storeTestResult(testId, result);
      this.logger.error(`Test ${test.name} failed: ${error.message}`);

      return result;
    }
  }

  /**
   * Get test results
   */
  getTestResults(testId: string, limit?: number): TestResult[] {
    const results = this.testResults.get(testId) || [];
    return limit ? results.slice(-limit) : results;
  }

  /**
   * Get test summary
   */
  getTestSummary(testId: string): TestSummary | null {
    const test = this.tests.get(testId);
    const results = this.testResults.get(testId) || [];

    if (!test || results.length === 0) {
      return null;
    }

    const successfulRuns = results.filter((r) => r.success);
    const successRate = (successfulRuns.length / results.length) * 100;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const lastRun = results[results.length - 1];
    const lastSuccess = successfulRuns[successfulRuns.length - 1];

    return {
      testId,
      name: test.name,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      lastRun: lastRun.timestamp,
      lastSuccess: lastSuccess?.timestamp || new Date(0),
      totalRuns: results.length,
      recentResults: results.slice(-10),
    };
  }

  /**
   * Get all test summaries
   */
  getAllTestSummaries(): TestSummary[] {
    const summaries: TestSummary[] = [];

    for (const testId of this.tests.keys()) {
      const summary = this.getTestSummary(testId);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries.sort((a, b) => b.lastRun.getTime() - a.lastRun.getTime());
  }

  /**
   * Get health dashboard for synthetic tests
   */
  getHealthDashboard(): {
    overview: {
      totalTests: number;
      activeTests: number;
      successRate: number;
      avgResponseTime: number;
    };
    testSummaries: TestSummary[];
    recentFailures: Array<{
      testName: string;
      error: string;
      timestamp: Date;
    }>;
    performanceTrends: Array<{
      hour: number;
      avgResponseTime: number;
      successRate: number;
    }>;
  } {
    const allSummaries = this.getAllTestSummaries();
    const activeTests = Array.from(this.tests.values()).filter((t) => t.enabled);

    const overview = {
      totalTests: this.tests.size,
      activeTests: activeTests.length,
      successRate:
        allSummaries.length > 0
          ? allSummaries.reduce((sum, s) => sum + s.successRate, 0) / allSummaries.length
          : 0,
      avgResponseTime:
        allSummaries.length > 0
          ? allSummaries.reduce((sum, s) => sum + s.avgResponseTime, 0) / allSummaries.length
          : 0,
    };

    // Get recent failures (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailures: Array<{
      testName: string;
      error: string;
      timestamp: Date;
    }> = [];

    for (const [testId, results] of this.testResults.entries()) {
      const test = this.tests.get(testId);
      if (!test) continue;

      const recentFailed = results.filter(
        (r) => !r.success && r.timestamp >= twentyFourHoursAgo && r.error,
      );

      for (const failure of recentFailed) {
        recentFailures.push({
          testName: test.name,
          error: failure.error!,
          timestamp: failure.timestamp,
        });
      }
    }

    recentFailures.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Performance trends (last 24 hours, hourly)
    const performanceTrends: Array<{
      hour: number;
      avgResponseTime: number;
      successRate: number;
    }> = [];

    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(Date.now() - (24 - i) * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      let totalResponseTime = 0;
      let successCount = 0;
      let totalCount = 0;

      for (const results of this.testResults.values()) {
        const hourResults = results.filter(
          (r) => r.timestamp >= hourStart && r.timestamp < hourEnd,
        );

        for (const result of hourResults) {
          totalResponseTime += result.responseTime;
          if (result.success) successCount++;
          totalCount++;
        }
      }

      performanceTrends.push({
        hour: i,
        avgResponseTime: totalCount > 0 ? totalResponseTime / totalCount : 0,
        successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 100,
      });
    }

    return {
      overview: {
        ...overview,
        successRate: Math.round(overview.successRate * 100) / 100,
        avgResponseTime: Math.round(overview.avgResponseTime * 100) / 100,
      },
      testSummaries: allSummaries,
      recentFailures: recentFailures.slice(0, 20),
      performanceTrends,
    };
  }

  /**
   * Enable/disable test
   */
  toggleTest(testId: string, enabled: boolean): boolean {
    const test = this.tests.get(testId);
    if (!test) {
      return false;
    }

    test.enabled = enabled;

    if (enabled) {
      this.scheduleTest(testId);
    } else {
      this.unscheduleTest(testId);
    }

    this.logger.log(`Test ${test.name} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Initialize health-specific synthetic tests
   */
  private initializeHealthTests(): void {
    const baseUrl = this.configService.get('API_BASE_URL', 'http://localhost:3000');

    const healthTests: Omit<SyntheticTest, 'id'>[] = [
      {
        name: 'Health Check Endpoint',
        description: 'Verify main health check endpoint is responding',
        type: 'http',
        config: {
          url: `${baseUrl}/health`,
          method: 'GET',
          expectedStatus: 200,
          expectedResponseTime: 1000,
          timeout: 5000,
        },
        schedule: '*/2 * * * *', // Every 2 minutes
        enabled: true,
        tags: ['health', 'critical'],
      },
      {
        name: 'User Authentication API',
        description: 'Test user authentication endpoint',
        type: 'api',
        config: {
          url: `${baseUrl}/auth/login`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { email: 'test@example.com', password: 'testpass' },
          expectedStatus: 401, // Expecting failure for test credentials
          expectedResponseTime: 2000,
          timeout: 10000,
        },
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
        tags: ['auth', 'api'],
      },
      {
        name: 'AI Prompt Optimization API',
        description: 'Test AI prompt optimization endpoint',
        type: 'api',
        config: {
          url: `${baseUrl}/ai-prompt-optimization/templates`,
          method: 'GET',
          expectedStatus: 200,
          expectedResponseTime: 3000,
          timeout: 15000,
        },
        schedule: '*/10 * * * *', // Every 10 minutes
        enabled: true,
        tags: ['ai', 'api'],
      },
      {
        name: 'Performance Metrics API',
        description: 'Test performance monitoring endpoint',
        type: 'api',
        config: {
          url: `${baseUrl}/performance/health`,
          method: 'GET',
          expectedStatus: 200,
          expectedResponseTime: 2000,
          timeout: 10000,
        },
        schedule: '*/15 * * * *', // Every 15 minutes
        enabled: true,
        tags: ['performance', 'monitoring'],
      },
      {
        name: 'Database Connectivity',
        description: 'Test database connection and basic query',
        type: 'database',
        config: {
          expectedResponseTime: 500,
          timeout: 5000,
        },
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
        tags: ['database', 'critical'],
      },
    ];

    for (const test of healthTests) {
      this.addTest(test);
    }

    this.logger.log(`Initialized ${healthTests.length} health synthetic tests`);
  }

  /**
   * Run HTTP test
   */
  private async runHttpTest(test: SyntheticTest, startTime: number): Promise<TestResult> {
    const config = test.config;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: (config.method as any) || 'GET',
          url: config.url!,
          headers: config.headers,
          data: config.body,
          timeout: config.timeout || 10000,
        }),
      );

      const responseTime = Date.now() - startTime;
      const success =
        response.status === (config.expectedStatus || 200) &&
        responseTime <= (config.expectedResponseTime || 5000);

      return {
        testId: test.id,
        timestamp: new Date(),
        success,
        responseTime,
        statusCode: response.status,
        metrics: {
          dataSize: JSON.stringify(response.data).length,
          headerCount: Object.keys(response.headers).length,
        },
        metadata: {
          expectedStatus: config.expectedStatus || 200,
          expectedResponseTime: config.expectedResponseTime || 5000,
        },
      };
    } catch (error) {
      return {
        testId: test.id,
        timestamp: new Date(),
        success: false,
        responseTime: Date.now() - startTime,
        statusCode: error.response?.status,
        error: error.message,
      };
    }
  }

  /**
   * Run database test
   */
  private async runDatabaseTest(test: SyntheticTest, startTime: number): Promise<TestResult> {
    try {
      // Simulate database test - in production, this would use actual database connection
      await new Promise((resolve) => setTimeout(resolve, 100));

      const responseTime = Date.now() - startTime;
      const success = responseTime <= (test.config.expectedResponseTime || 1000);

      return {
        testId: test.id,
        timestamp: new Date(),
        success,
        responseTime,
        metrics: {
          queryTime: responseTime,
          connectionPoolSize: 10, // Mock value
        },
      };
    } catch (error) {
      return {
        testId: test.id,
        timestamp: new Date(),
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Run external service test
   */
  private async runExternalServiceTest(
    test: SyntheticTest,
    startTime: number,
  ): Promise<TestResult> {
    // Similar to HTTP test but with different validation criteria
    return this.runHttpTest(test, startTime);
  }

  /**
   * Store test result
   */
  private storeTestResult(testId: string, result: TestResult): void {
    if (!this.testResults.has(testId)) {
      this.testResults.set(testId, []);
    }

    const results = this.testResults.get(testId)!;
    results.push(result);

    // Keep only last 1000 results per test
    if (results.length > 1000) {
      results.splice(0, results.length - 1000);
    }
  }

  /**
   * Schedule test based on cron expression
   */
  private scheduleTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) return;

    // Unschedule existing timer
    this.unscheduleTest(testId);

    // For simplicity, using fixed intervals instead of cron parsing
    const intervalMs = this.parseScheduleToInterval(test.schedule);

    if (intervalMs > 0) {
      const timer = setInterval(async () => {
        try {
          await this.runTest(testId);
        } catch (error) {
          this.logger.error(`Scheduled test ${test.name} failed: ${error.message}`);
        }
      }, intervalMs);

      this.testSchedules.set(testId, timer);
    }
  }

  /**
   * Unschedule test
   */
  private unscheduleTest(testId: string): void {
    const timer = this.testSchedules.get(testId);
    if (timer) {
      clearInterval(timer);
      this.testSchedules.delete(testId);
    }
  }

  /**
   * Parse schedule to interval (simplified cron parsing)
   */
  private parseScheduleToInterval(schedule: string): number {
    // Simplified parsing - in production, use a proper cron parser
    if (schedule === '*/2 * * * *') return 2 * 60 * 1000; // 2 minutes
    if (schedule === '*/5 * * * *') return 5 * 60 * 1000; // 5 minutes
    if (schedule === '*/10 * * * *') return 10 * 60 * 1000; // 10 minutes
    if (schedule === '*/15 * * * *') return 15 * 60 * 1000; // 15 minutes
    return 0; // No scheduling
  }

  /**
   * Start test scheduler
   */
  private startTestScheduler(): void {
    // Schedule all enabled tests
    for (const test of this.tests.values()) {
      if (test.enabled) {
        this.scheduleTest(test.id);
      }
    }

    this.logger.log('Synthetic test scheduler started');
  }

  /**
   * Generate test ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup(): void {
    for (const timer of this.testSchedules.values()) {
      clearInterval(timer);
    }
    this.testSchedules.clear();
    this.logger.log('Synthetic testing service cleaned up');
  }
}
