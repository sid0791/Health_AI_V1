import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SecurityEvent {
  id: string;
  type: 'auth_failure' | 'brute_force' | 'suspicious_ip' | 'data_access' | 'privilege_escalation' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  description: string;
  metadata: Record<string, any>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export interface AnomalyPattern {
  name: string;
  description: string;
  threshold: number;
  timeWindow: number; // seconds
  enabled: boolean;
  severity: SecurityEvent['severity'];
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topSources: Array<{ ip: string; count: number; severity: string }>;
  recentEvents: SecurityEvent[];
  anomaliesDetected: number;
  falsePositiveRate: number;
}

@Injectable()
export class SecurityAnomalyDetectionService {
  private readonly logger = new Logger(SecurityAnomalyDetectionService.name);
  private readonly securityEvents = new Map<string, SecurityEvent>();
  private readonly ipActivityMap = new Map<string, Array<{ timestamp: number; event: string }>>();
  private readonly userActivityMap = new Map<string, Array<{ timestamp: number; endpoint: string; success: boolean }>>();
  private readonly anomalyPatterns = new Map<string, AnomalyPattern>();

  // Thresholds for anomaly detection
  private readonly thresholds = {
    login_attempts_per_ip: 10, // per 15 minutes
    failed_requests_per_user: 20, // per 15 minutes
    requests_per_ip: 1000, // per hour
    unusual_endpoints_per_user: 15, // per hour
    data_access_rate: 100, // per hour
    privilege_escalation_attempts: 3, // per hour
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeAnomalyPatterns();
    this.startAnomalyDetection();
  }

  /**
   * Record a security event
   */
  recordSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    ipAddress: string,
    description: string,
    metadata: Record<string, any> = {},
    userId?: string,
    userAgent?: string,
    endpoint?: string
  ): string {
    const eventId = this.generateEventId();
    
    const event: SecurityEvent = {
      id: eventId,
      type,
      severity,
      timestamp: new Date(),
      userId,
      ipAddress,
      userAgent,
      endpoint,
      description,
      metadata,
      status: 'open',
    };

    this.securityEvents.set(eventId, event);

    // Update activity maps for anomaly detection
    this.updateActivityMaps(event);

    // Check for immediate anomalies
    this.checkForAnomalies(event);

    this.logger.log(`Security event recorded: ${type} from ${ipAddress} (severity: ${severity})`);
    
    // Clean up old events
    this.cleanupOldEvents();

    return eventId;
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(
    ipAddress: string,
    userId?: string,
    userAgent?: string,
    reason: string = 'Invalid credentials'
  ): string {
    return this.recordSecurityEvent(
      'auth_failure',
      'medium',
      ipAddress,
      `Authentication failure: ${reason}`,
      { reason, attempts: this.getRecentAuthFailures(ipAddress) + 1 },
      userId,
      userAgent,
      '/auth/login'
    );
  }

  /**
   * Record suspicious data access
   */
  recordSuspiciousDataAccess(
    userId: string,
    endpoint: string,
    ipAddress: string,
    userAgent?: string,
    dataType?: string
  ): string {
    return this.recordSecurityEvent(
      'data_access',
      'high',
      ipAddress,
      `Suspicious data access to ${endpoint}`,
      { 
        dataType,
        userAccessPattern: this.getUserAccessPattern(userId),
        timeOfDay: new Date().getHours()
      },
      userId,
      userAgent,
      endpoint
    );
  }

  /**
   * Record brute force attempt
   */
  recordBruteForceAttempt(
    ipAddress: string,
    target: string,
    attemptCount: number,
    userAgent?: string
  ): string {
    return this.recordSecurityEvent(
      'brute_force',
      'high',
      ipAddress,
      `Brute force attack detected against ${target}`,
      { target, attemptCount, blocked: true },
      undefined,
      userAgent
    );
  }

  /**
   * Record privilege escalation attempt
   */
  recordPrivilegeEscalation(
    userId: string,
    endpoint: string,
    ipAddress: string,
    attemptedAction: string,
    userAgent?: string
  ): string {
    return this.recordSecurityEvent(
      'privilege_escalation',
      'critical',
      ipAddress,
      `Privilege escalation attempt: ${attemptedAction}`,
      { attemptedAction, currentRole: 'user', targetRole: 'admin' },
      userId,
      userAgent,
      endpoint
    );
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const events = Array.from(this.securityEvents.values());
    
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get top source IPs
    const ipCounts = events.reduce((acc, event) => {
      acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSources = Object.entries(ipCounts)
      .map(([ip, count]) => ({
        ip,
        count,
        severity: this.getIPSeverity(ip, events),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent events (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events
      .filter(event => event.timestamp >= yesterday)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);

    // Calculate false positive rate
    const totalResolved = events.filter(e => e.status === 'resolved' || e.status === 'false_positive').length;
    const falsePositives = events.filter(e => e.status === 'false_positive').length;
    const falsePositiveRate = totalResolved > 0 ? (falsePositives / totalResolved) * 100 : 0;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      topSources,
      recentEvents,
      anomaliesDetected: events.filter(e => e.type === 'unusual_activity').length,
      falsePositiveRate: Math.round(falsePositiveRate * 100) / 100,
    };
  }

  /**
   * Get events by criteria
   */
  getEvents(criteria: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    ipAddress?: string;
    userId?: string;
    status?: SecurityEvent['status'];
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): SecurityEvent[] {
    let events = Array.from(this.securityEvents.values());

    // Apply filters
    if (criteria.type) {
      events = events.filter(e => e.type === criteria.type);
    }
    if (criteria.severity) {
      events = events.filter(e => e.severity === criteria.severity);
    }
    if (criteria.ipAddress) {
      events = events.filter(e => e.ipAddress === criteria.ipAddress);
    }
    if (criteria.userId) {
      events = events.filter(e => e.userId === criteria.userId);
    }
    if (criteria.status) {
      events = events.filter(e => e.status === criteria.status);
    }
    if (criteria.timeRange) {
      events = events.filter(e => 
        e.timestamp >= criteria.timeRange!.start && 
        e.timestamp <= criteria.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (criteria.limit) {
      events = events.slice(0, criteria.limit);
    }

    return events;
  }

  /**
   * Update event status
   */
  updateEventStatus(eventId: string, status: SecurityEvent['status']): boolean {
    const event = this.securityEvents.get(eventId);
    if (!event) {
      return false;
    }

    event.status = status;
    this.logger.log(`Updated event ${eventId} status to ${status}`);
    return true;
  }

  /**
   * Get security dashboard data
   */
  getSecurityDashboard(): {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      blockedIPs: number;
      suspiciousUsers: number;
    };
    recentThreats: SecurityEvent[];
    topThreats: Array<{ type: string; count: number; trend: string }>;
    geographicThreats: Array<{ country: string; count: number; severity: string }>;
    timelineData: Array<{ hour: number; events: number; severity: string }>;
  } {
    const events = Array.from(this.securityEvents.values());
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(e => e.timestamp >= last24Hours);

    const summary = {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      blockedIPs: new Set(events.filter(e => e.type === 'brute_force').map(e => e.ipAddress)).size,
      suspiciousUsers: new Set(events.filter(e => e.userId).map(e => e.userId)).size,
    };

    const recentThreats = recentEvents
      .filter(e => e.severity === 'high' || e.severity === 'critical')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // Top threat types
    const threatCounts = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topThreats = Object.entries(threatCounts)
      .map(([type, count]) => ({
        type,
        count,
        trend: this.calculateTrend(type, recentEvents),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Geographic threats (simplified - would need GeoIP in production)
    const geographicThreats = [
      { country: 'Unknown', count: recentEvents.length, severity: 'medium' },
    ];

    // Timeline data (hourly breakdown)
    const timelineData: Array<{ hour: number; events: number; severity: string }> = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(Date.now() - (24 - i) * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourEvents = recentEvents.filter(e => 
        e.timestamp >= hourStart && e.timestamp < hourEnd
      );

      const criticalCount = hourEvents.filter(e => e.severity === 'critical').length;
      const highCount = hourEvents.filter(e => e.severity === 'high').length;
      
      const severity = criticalCount > 0 ? 'critical' : 
                      highCount > 0 ? 'high' : 
                      hourEvents.length > 10 ? 'medium' : 'low';

      timelineData.push({
        hour: i,
        events: hourEvents.length,
        severity,
      });
    }

    return {
      summary,
      recentThreats,
      topThreats,
      geographicThreats,
      timelineData,
    };
  }

  /**
   * Initialize anomaly detection patterns
   */
  private initializeAnomalyPatterns(): void {
    const patterns: AnomalyPattern[] = [
      {
        name: 'rapid_login_attempts',
        description: 'Multiple login attempts from same IP',
        threshold: 10,
        timeWindow: 900, // 15 minutes
        enabled: true,
        severity: 'high',
      },
      {
        name: 'unusual_access_pattern',
        description: 'Unusual access pattern for user',
        threshold: 5,
        timeWindow: 3600, // 1 hour
        enabled: true,
        severity: 'medium',
      },
      {
        name: 'high_request_rate',
        description: 'Abnormally high request rate',
        threshold: 1000,
        timeWindow: 3600, // 1 hour
        enabled: true,
        severity: 'medium',
      },
      {
        name: 'data_exfiltration',
        description: 'Potential data exfiltration pattern',
        threshold: 50,
        timeWindow: 1800, // 30 minutes
        enabled: true,
        severity: 'critical',
      },
    ];

    for (const pattern of patterns) {
      this.anomalyPatterns.set(pattern.name, pattern);
    }

    this.logger.log(`Initialized ${patterns.length} anomaly detection patterns`);
  }

  /**
   * Update activity maps for anomaly detection
   */
  private updateActivityMaps(event: SecurityEvent): void {
    const now = Date.now();

    // Update IP activity
    if (!this.ipActivityMap.has(event.ipAddress)) {
      this.ipActivityMap.set(event.ipAddress, []);
    }
    const ipActivity = this.ipActivityMap.get(event.ipAddress)!;
    ipActivity.push({ timestamp: now, event: event.type });

    // Clean old activity (keep last 24 hours)
    const cutoff = now - 24 * 60 * 60 * 1000;
    this.ipActivityMap.set(
      event.ipAddress,
      ipActivity.filter(activity => activity.timestamp > cutoff)
    );

    // Update user activity
    if (event.userId) {
      if (!this.userActivityMap.has(event.userId)) {
        this.userActivityMap.set(event.userId, []);
      }
      const userActivity = this.userActivityMap.get(event.userId)!;
      userActivity.push({
        timestamp: now,
        endpoint: event.endpoint || 'unknown',
        success: !['auth_failure', 'privilege_escalation'].includes(event.type),
      });

      // Clean old activity
      this.userActivityMap.set(
        event.userId,
        userActivity.filter(activity => activity.timestamp > cutoff)
      );
    }
  }

  /**
   * Check for anomalies based on new event
   */
  private checkForAnomalies(event: SecurityEvent): void {
    // Check for brute force attacks
    if (event.type === 'auth_failure') {
      const recentFailures = this.getRecentAuthFailures(event.ipAddress);
      if (recentFailures >= this.thresholds.login_attempts_per_ip) {
        this.recordBruteForceAttempt(event.ipAddress, 'login', recentFailures);
      }
    }

    // Check for unusual user activity
    if (event.userId) {
      const userActivity = this.getUserActivityPattern(event.userId);
      if (userActivity.uniqueEndpoints > this.thresholds.unusual_endpoints_per_user) {
        this.recordSecurityEvent(
          'unusual_activity',
          'medium',
          event.ipAddress,
          `Unusual activity pattern detected for user ${event.userId}`,
          { 
            uniqueEndpoints: userActivity.uniqueEndpoints,
            requestRate: userActivity.requestRate,
            failureRate: userActivity.failureRate
          },
          event.userId
        );
      }
    }

    // Check for high request rate from IP
    const ipActivity = this.ipActivityMap.get(event.ipAddress) || [];
    const recentRequests = ipActivity.filter(
      activity => activity.timestamp > Date.now() - 3600000 // Last hour
    );
    
    if (recentRequests.length > this.thresholds.requests_per_ip) {
      this.recordSecurityEvent(
        'suspicious_ip',
        'medium',
        event.ipAddress,
        `High request rate detected from IP ${event.ipAddress}`,
        { requestCount: recentRequests.length, hourlyRate: recentRequests.length }
      );
    }
  }

  /**
   * Start anomaly detection background process
   */
  private startAnomalyDetection(): void {
    // Run anomaly detection every 5 minutes
    setInterval(() => {
      this.runAnomalyDetection();
    }, 5 * 60 * 1000);

    this.logger.log('Started anomaly detection background process');
  }

  /**
   * Run comprehensive anomaly detection
   */
  private runAnomalyDetection(): void {
    try {
      // Check for patterns across all data
      for (const pattern of this.anomalyPatterns.values()) {
        if (pattern.enabled) {
          this.checkPattern(pattern);
        }
      }
    } catch (error) {
      this.logger.error(`Error in anomaly detection: ${error.message}`);
    }
  }

  /**
   * Check specific anomaly pattern
   */
  private checkPattern(pattern: AnomalyPattern): void {
    // Implementation would depend on the specific pattern
    // This is a simplified version
    this.logger.debug(`Checking pattern: ${pattern.name}`);
  }

  /**
   * Get recent auth failures for IP
   */
  private getRecentAuthFailures(ipAddress: string): number {
    const events = Array.from(this.securityEvents.values());
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    return events.filter(event =>
      event.type === 'auth_failure' &&
      event.ipAddress === ipAddress &&
      event.timestamp >= fifteenMinutesAgo
    ).length;
  }

  /**
   * Get user activity pattern
   */
  private getUserActivityPattern(userId: string): {
    uniqueEndpoints: number;
    requestRate: number;
    failureRate: number;
  } {
    const userActivity = this.userActivityMap.get(userId) || [];
    const lastHour = userActivity.filter(
      activity => activity.timestamp > Date.now() - 3600000
    );

    const uniqueEndpoints = new Set(lastHour.map(a => a.endpoint)).size;
    const requestRate = lastHour.length;
    const failures = lastHour.filter(a => !a.success).length;
    const failureRate = lastHour.length > 0 ? (failures / lastHour.length) * 100 : 0;

    return { uniqueEndpoints, requestRate, failureRate };
  }

  /**
   * Get IP severity based on events
   */
  private getIPSeverity(ip: string, events: SecurityEvent[]): string {
    const ipEvents = events.filter(e => e.ipAddress === ip);
    const criticalCount = ipEvents.filter(e => e.severity === 'critical').length;
    const highCount = ipEvents.filter(e => e.severity === 'high').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (ipEvents.length > 10) return 'medium';
    return 'low';
  }

  /**
   * Calculate trend for threat type
   */
  private calculateTrend(type: string, recentEvents: SecurityEvent[]): string {
    const now = Date.now();
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;

    const recent = recentEvents.filter(e => 
      e.type === type && e.timestamp.getTime() > sixHoursAgo
    ).length;
    
    const previous = recentEvents.filter(e => 
      e.type === type && 
      e.timestamp.getTime() > twelveHoursAgo && 
      e.timestamp.getTime() <= sixHoursAgo
    ).length;

    if (recent > previous * 1.5) return 'increasing';
    if (recent < previous * 0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old events (keep last 30 days)
   */
  private cleanupOldEvents(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [eventId, event] of this.securityEvents.entries()) {
      if (event.timestamp < thirtyDaysAgo) {
        this.securityEvents.delete(eventId);
      }
    }
  }

  /**
   * Reset all security data
   */
  reset(): void {
    this.securityEvents.clear();
    this.ipActivityMap.clear();
    this.userActivityMap.clear();
    this.logger.log('Security anomaly detection service reset');
  }
}