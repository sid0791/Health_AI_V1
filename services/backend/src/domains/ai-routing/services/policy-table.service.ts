import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Hot-Reloadable AI Policy Tables Service
 * Manages dynamic AI routing policies that can be updated without service restart
 */

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher priority rules are evaluated first
  conditions: {
    requestType?: string[];
    userTier?: string[];
    userRegion?: string[];
    timeRange?: {
      start: string; // HH:mm format
      end: string;
      timezone?: string;
    };
    emergencyRequest?: boolean;
    accuracyRequirement?: {
      min?: number;
      max?: number;
    };
    costLimit?: {
      maxCostPerRequest?: number;
      maxDailyCost?: number;
    };
    privacyLevel?: ('standard' | 'high' | 'maximum')[];
    containsPHI?: boolean;
  };
  actions: {
    preferredProviders: string[]; // Ordered list of preferred AI providers
    fallbackProviders: string[];
    modelRestrictions?: {
      allowedModels?: string[];
      blockedModels?: string[];
    };
    rateLimitOverride?: {
      requestsPerMinute?: number;
      tokensPerMinute?: number;
    };
    routingStrategy: 'cost_optimized' | 'performance_optimized' | 'privacy_optimized' | 'balanced';
    cacheEnabled?: boolean;
    cacheTTL?: number; // seconds
  };
  enabled: boolean;
  validFrom: Date;
  validUntil?: Date;
  lastModified: Date;
  modifiedBy: string;
}

export interface PolicyTable {
  version: string;
  lastUpdated: Date;
  rules: PolicyRule[];
  globalSettings: {
    defaultRoutingStrategy: string;
    fallbackProvider: string;
    maxRetries: number;
    timeoutMs: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
}

@Injectable()
export class PolicyTableService {
  private readonly logger = new Logger(PolicyTableService.name);
  private policyTable: PolicyTable | null = null;
  private readonly policyFilePath: string;
  private fileWatcher: fs.FileHandle | null = null;

  constructor(
    private configService: ConfigService,
  ) {
    this.policyFilePath = this.configService.get<string>('AI_POLICY_TABLE_PATH') || 
      path.join(process.cwd(), 'data', 'ai-policy-table.json');
  }

  async onModuleInit() {
    await this.loadPolicyTable();
    this.startFileWatcher();
  }

  /**
   * Load policy table from file
   */
  async loadPolicyTable(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.policyFilePath, 'utf-8');
      const parsedTable = JSON.parse(fileContent);
      
      // Validate policy table structure
      this.validatePolicyTable(parsedTable);
      
      // Convert date strings to Date objects
      parsedTable.lastUpdated = new Date(parsedTable.lastUpdated);
      parsedTable.rules = parsedTable.rules.map((rule: any) => ({
        ...rule,
        validFrom: new Date(rule.validFrom),
        validUntil: rule.validUntil ? new Date(rule.validUntil) : undefined,
        lastModified: new Date(rule.lastModified),
      }));

      this.policyTable = parsedTable;
      this.logger.log(`Loaded policy table v${parsedTable.version} with ${parsedTable.rules.length} rules`);
      
    } catch (error) {
      this.logger.error('Failed to load policy table, using default policies', error);
      this.policyTable = this.getDefaultPolicyTable();
    }
  }

  /**
   * Get routing decision based on current policies
   */
  async getRoutingDecision(request: {
    requestType: string;
    userTier: string;
    userRegion?: string;
    emergencyRequest?: boolean;
    accuracyRequirement?: number;
    privacyLevel?: 'standard' | 'high' | 'maximum';
    containsPHI?: boolean;
    estimatedCost?: number;
  }): Promise<{
    preferredProviders: string[];
    fallbackProviders: string[];
    routingStrategy: string;
    cacheEnabled: boolean;
    cacheTTL: number;
    appliedRules: string[];
    rateLimitOverride?: {
      requestsPerMinute?: number;
      tokensPerMinute?: number;
    };
  }> {
    if (!this.policyTable) {
      await this.loadPolicyTable();
    }

    const now = new Date();
    const appliedRules: string[] = [];
    let decision = {
      preferredProviders: [this.policyTable!.globalSettings.fallbackProvider],
      fallbackProviders: ['openai'],
      routingStrategy: this.policyTable!.globalSettings.defaultRoutingStrategy,
      cacheEnabled: this.policyTable!.globalSettings.cacheEnabled,
      cacheTTL: this.policyTable!.globalSettings.cacheTTL,
      appliedRules,
      rateLimitOverride: undefined as any,
    };

    // Sort rules by priority (higher first)
    const sortedRules = this.policyTable!.rules
      .filter(rule => rule.enabled)
      .filter(rule => now >= rule.validFrom && (!rule.validUntil || now <= rule.validUntil))
      .sort((a, b) => b.priority - a.priority);

    // Apply matching rules
    for (const rule of sortedRules) {
      if (this.ruleMatches(rule, request, now)) {
        appliedRules.push(rule.id);
        
        // Merge rule actions (later rules override earlier ones for conflicts)
        if (rule.actions.preferredProviders?.length) {
          decision.preferredProviders = rule.actions.preferredProviders;
        }
        if (rule.actions.fallbackProviders?.length) {
          decision.fallbackProviders = rule.actions.fallbackProviders;
        }
        if (rule.actions.routingStrategy) {
          decision.routingStrategy = rule.actions.routingStrategy;
        }
        if (rule.actions.cacheEnabled !== undefined) {
          decision.cacheEnabled = rule.actions.cacheEnabled;
        }
        if (rule.actions.cacheTTL !== undefined) {
          decision.cacheTTL = rule.actions.cacheTTL;
        }
        if (rule.actions.rateLimitOverride) {
          decision.rateLimitOverride = rule.actions.rateLimitOverride;
        }
        
        this.logger.debug(`Applied policy rule: ${rule.name} (${rule.id})`);
      }
    }

    this.logger.debug(`Routing decision for ${request.requestType}: ${JSON.stringify(decision)}`);
    return decision;
  }

  /**
   * Check if a rule matches the current request
   */
  private ruleMatches(rule: PolicyRule, request: any, now: Date): boolean {
    const conditions = rule.conditions;

    // Check request type
    if (conditions.requestType && !conditions.requestType.includes(request.requestType)) {
      return false;
    }

    // Check user tier
    if (conditions.userTier && !conditions.userTier.includes(request.userTier)) {
      return false;
    }

    // Check user region
    if (conditions.userRegion && request.userRegion && 
        !conditions.userRegion.includes(request.userRegion)) {
      return false;
    }

    // Check emergency request
    if (conditions.emergencyRequest !== undefined && 
        conditions.emergencyRequest !== request.emergencyRequest) {
      return false;
    }

    // Check accuracy requirement
    if (conditions.accuracyRequirement && request.accuracyRequirement !== undefined) {
      const req = conditions.accuracyRequirement;
      if ((req.min !== undefined && request.accuracyRequirement < req.min) ||
          (req.max !== undefined && request.accuracyRequirement > req.max)) {
        return false;
      }
    }

    // Check privacy level
    if (conditions.privacyLevel && request.privacyLevel &&
        !conditions.privacyLevel.includes(request.privacyLevel)) {
      return false;
    }

    // Check PHI content
    if (conditions.containsPHI !== undefined &&
        conditions.containsPHI !== request.containsPHI) {
      return false;
    }

    // Check time range
    if (conditions.timeRange) {
      const timeStr = now.toTimeString().substr(0, 5); // HH:mm
      if (timeStr < conditions.timeRange.start || timeStr > conditions.timeRange.end) {
        return false;
      }
    }

    // Check cost limit
    if (conditions.costLimit && request.estimatedCost !== undefined) {
      if (conditions.costLimit.maxCostPerRequest !== undefined &&
          request.estimatedCost > conditions.costLimit.maxCostPerRequest) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update policy table (hot reload)
   */
  async updatePolicyTable(newTable: PolicyTable, updatedBy: string): Promise<void> {
    try {
      // Validate new policy table
      this.validatePolicyTable(newTable);
      
      // Update version and timestamps
      newTable.lastUpdated = new Date();
      newTable.rules.forEach(rule => {
        if (!rule.lastModified) {
          rule.lastModified = new Date();
          rule.modifiedBy = updatedBy;
        }
      });

      // Write to file
      const fileContent = JSON.stringify(newTable, null, 2);
      await fs.writeFile(this.policyFilePath, fileContent, 'utf-8');
      
      // Reload in memory
      this.policyTable = newTable;
      
      this.logger.log(`Policy table updated to v${newTable.version} by ${updatedBy}`);
      
    } catch (error) {
      this.logger.error('Failed to update policy table', error);
      throw error;
    }
  }

  /**
   * Get current policy table
   */
  getCurrentPolicyTable(): PolicyTable | null {
    return this.policyTable;
  }

  /**
   * Add or update a single policy rule
   */
  async updatePolicyRule(rule: PolicyRule, updatedBy: string): Promise<void> {
    if (!this.policyTable) {
      await this.loadPolicyTable();
    }

    rule.lastModified = new Date();
    rule.modifiedBy = updatedBy;

    const existingIndex = this.policyTable!.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.policyTable!.rules[existingIndex] = rule;
    } else {
      this.policyTable!.rules.push(rule);
    }

    await this.updatePolicyTable(this.policyTable!, updatedBy);
  }

  /**
   * File watcher for hot reloading
   */
  private async startFileWatcher(): Promise<void> {
    // Note: In production, you might want to use a more robust file watching mechanism
    this.logger.log('Starting policy table file watcher');
  }

  /**
   * Periodic reload (backup for file watcher)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async periodicReload(): Promise<void> {
    try {
      const stats = await fs.stat(this.policyFilePath);
      if (this.policyTable && stats.mtime > this.policyTable.lastUpdated) {
        this.logger.log('Policy table file changed, reloading...');
        await this.loadPolicyTable();
      }
    } catch {
      // File doesn't exist or other error, ignore
    }
  }

  /**
   * Validate policy table structure
   */
  private validatePolicyTable(table: any): void {
    if (!table.version || !table.rules || !Array.isArray(table.rules)) {
      throw new Error('Invalid policy table structure');
    }

    for (const rule of table.rules) {
      if (!rule.id || !rule.name || typeof rule.priority !== 'number') {
        throw new Error(`Invalid rule structure: ${JSON.stringify(rule)}`);
      }
    }
  }

  /**
   * Get default policy table
   */
  private getDefaultPolicyTable(): PolicyTable {
    return {
      version: '1.0.0',
      lastUpdated: new Date(),
      rules: [
        {
          id: 'emergency-high-priority',
          name: 'Emergency Requests - High Priority',
          description: 'Route emergency requests to fastest, most reliable providers',
          priority: 1000,
          conditions: {
            emergencyRequest: true,
          },
          actions: {
            preferredProviders: ['openai', 'anthropic'],
            fallbackProviders: ['vertex'],
            routingStrategy: 'performance_optimized',
            cacheEnabled: false,
          },
          enabled: true,
          validFrom: new Date(),
          lastModified: new Date(),
          modifiedBy: 'system',
        },
        {
          id: 'phi-high-privacy',
          name: 'PHI Data - High Privacy',
          description: 'Route PHI-containing requests to privacy-compliant providers only',
          priority: 900,
          conditions: {
            containsPHI: true,
          },
          actions: {
            preferredProviders: ['vertex', 'anthropic'],
            fallbackProviders: ['openai'],
            routingStrategy: 'privacy_optimized',
            cacheEnabled: false,
          },
          enabled: true,
          validFrom: new Date(),
          lastModified: new Date(),
          modifiedBy: 'system',
        },
        {
          id: 'cost-optimized-default',
          name: 'Cost Optimized Default',
          description: 'Default cost-optimized routing for standard requests',
          priority: 100,
          conditions: {},
          actions: {
            preferredProviders: ['openrouter', 'together'],
            fallbackProviders: ['openai', 'anthropic'],
            routingStrategy: 'cost_optimized',
            cacheEnabled: true,
            cacheTTL: 3600,
          },
          enabled: true,
          validFrom: new Date(),
          lastModified: new Date(),
          modifiedBy: 'system',
        },
      ],
      globalSettings: {
        defaultRoutingStrategy: 'balanced',
        fallbackProvider: 'openai',
        maxRetries: 3,
        timeoutMs: 30000,
        cacheEnabled: true,
        cacheTTL: 1800,
      },
    };
  }
}