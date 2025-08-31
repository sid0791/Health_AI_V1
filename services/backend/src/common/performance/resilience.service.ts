import { Injectable, Logger } from '@nestjs/common';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<
    string,
    {
      state: CircuitState;
      failures: number;
      successes: number;
      requests: number;
      lastFailureTime?: Date;
      nextAttemptTime?: Date;
      options: CircuitBreakerOptions;
    }
  >();

  private readonly defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 10000, // 10 seconds
  };

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitName, options);

    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < (circuit.nextAttemptTime?.getTime() || 0)) {
        this.logger.warn(`Circuit breaker ${circuitName} is OPEN, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker ${circuitName} is OPEN`);
      } else {
        // Transition to half-open
        circuit.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit breaker ${circuitName} transitioning to HALF_OPEN`);
      }
    }

    circuit.requests++;

    try {
      const result = await fn();

      // Success
      circuit.successes++;

      if (circuit.state === CircuitState.HALF_OPEN) {
        // If successful in half-open state, close the circuit
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        this.logger.log(`Circuit breaker ${circuitName} closed after successful test`);
      }

      return result;
    } catch (error) {
      // Failure
      circuit.failures++;
      circuit.lastFailureTime = new Date();

      this.logger.error(`Circuit breaker ${circuitName} recorded failure: ${error.message}`);

      // Check if we should open the circuit
      if (circuit.failures >= circuit.options.failureThreshold) {
        circuit.state = CircuitState.OPEN;
        circuit.nextAttemptTime = new Date(Date.now() + circuit.options.resetTimeout);
        this.logger.warn(`Circuit breaker ${circuitName} opened due to failures`);
      }

      // Use fallback if available
      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuit(name: string, options?: Partial<CircuitBreakerOptions>) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        requests: 0,
        options: { ...this.defaultOptions, ...options },
      });
    }

    return this.circuits.get(name)!;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(circuitName: string): CircuitBreakerStats | null {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return null;
    }

    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      requests: circuit.requests,
      lastFailureTime: circuit.lastFailureTime,
      nextAttemptTime: circuit.nextAttemptTime,
    };
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const allStats: Record<string, CircuitBreakerStats> = {};

    for (const [name, circuit] of this.circuits.entries()) {
      allStats[name] = {
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        requests: circuit.requests,
        lastFailureTime: circuit.lastFailureTime,
        nextAttemptTime: circuit.nextAttemptTime,
      };
    }

    return allStats;
  }

  /**
   * Reset circuit breaker
   */
  reset(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.requests = 0;
      circuit.lastFailureTime = undefined;
      circuit.nextAttemptTime = undefined;
      this.logger.log(`Circuit breaker ${circuitName} manually reset`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const [name] of this.circuits.entries()) {
      this.reset(name);
    }
  }
}

@Injectable()
export class TimeoutService {
  private readonly logger = new Logger(TimeoutService.name);

  /**
   * Execute function with timeout
   */
  async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Clean up timer if promise resolves
      return timer;
    });

    try {
      return await Promise.race([fn(), timeout]);
    } catch (error) {
      this.logger.error(`Timeout error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute multiple functions with timeout and collect results
   */
  async withTimeoutAll<T>(
    functions: Array<() => Promise<T>>,
    timeoutMs: number,
  ): Promise<Array<{ success: boolean; result?: T; error?: string }>> {
    const results = await Promise.allSettled(
      functions.map((fn) => this.withTimeout(fn, timeoutMs)),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return { success: true, result: result.value };
      } else {
        return { success: false, error: result.reason.message };
      }
    });
  }
}

@Injectable()
export class GracefulDegradationService {
  private readonly logger = new Logger(GracefulDegradationService.name);
  private readonly degradationLevels = new Map<string, number>();

  /**
   * Execute with graceful degradation
   */
  async executeWithDegradation<T>(
    primaryFn: () => Promise<T>,
    fallbackFns: Array<() => Promise<T>>,
    serviceName: string,
  ): Promise<T> {
    const currentLevel = this.degradationLevels.get(serviceName) || 0;

    // Try primary function first if not degraded
    if (currentLevel === 0) {
      try {
        const result = await primaryFn();
        this.recordSuccess(serviceName);
        return result;
      } catch (error) {
        this.logger.warn(`Primary function failed for ${serviceName}: ${error.message}`);
        this.recordFailure(serviceName);
      }
    }

    // Try fallback functions in order
    for (let i = 0; i < fallbackFns.length; i++) {
      const fallbackLevel = i + 1;

      if (currentLevel <= fallbackLevel) {
        try {
          const result = await fallbackFns[i]();
          this.logger.log(`Using fallback level ${fallbackLevel} for ${serviceName}`);
          return result;
        } catch (error) {
          this.logger.warn(
            `Fallback level ${fallbackLevel} failed for ${serviceName}: ${error.message}`,
          );
          this.recordFailure(serviceName);
        }
      }
    }

    throw new Error(`All functions failed for service: ${serviceName}`);
  }

  /**
   * Record successful operation
   */
  private recordSuccess(serviceName: string): void {
    const currentLevel = this.degradationLevels.get(serviceName) || 0;

    if (currentLevel > 0) {
      // Gradually improve service level
      this.degradationLevels.set(serviceName, Math.max(0, currentLevel - 1));
      this.logger.log(`Service ${serviceName} degradation level improved to ${currentLevel - 1}`);
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(serviceName: string): void {
    const currentLevel = this.degradationLevels.get(serviceName) || 0;
    const newLevel = Math.min(5, currentLevel + 1); // Max degradation level of 5

    this.degradationLevels.set(serviceName, newLevel);
    this.logger.warn(`Service ${serviceName} degradation level increased to ${newLevel}`);
  }

  /**
   * Get degradation status
   */
  getDegradationStatus(): Record<
    string,
    {
      level: number;
      status: string;
      description: string;
    }
  > {
    const status: Record<string, any> = {};

    for (const [serviceName, level] of this.degradationLevels.entries()) {
      status[serviceName] = {
        level,
        status: this.getLevelStatus(level),
        description: this.getLevelDescription(level),
      };
    }

    return status;
  }

  /**
   * Get status string for degradation level
   */
  private getLevelStatus(level: number): string {
    switch (level) {
      case 0:
        return 'HEALTHY';
      case 1:
        return 'MINOR_DEGRADATION';
      case 2:
        return 'MODERATE_DEGRADATION';
      case 3:
        return 'MAJOR_DEGRADATION';
      case 4:
        return 'SEVERE_DEGRADATION';
      case 5:
        return 'CRITICAL_DEGRADATION';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get description for degradation level
   */
  private getLevelDescription(level: number): string {
    switch (level) {
      case 0:
        return 'Service operating normally';
      case 1:
        return 'Minor issues, using simple fallbacks';
      case 2:
        return 'Moderate issues, reduced functionality';
      case 3:
        return 'Major issues, basic functionality only';
      case 4:
        return 'Severe issues, minimal functionality';
      case 5:
        return 'Critical issues, emergency mode';
      default:
        return 'Unknown degradation state';
    }
  }

  /**
   * Reset degradation level for a service
   */
  resetService(serviceName: string): void {
    this.degradationLevels.set(serviceName, 0);
    this.logger.log(`Service ${serviceName} degradation level reset to 0`);
  }

  /**
   * Reset all services
   */
  resetAll(): void {
    for (const serviceName of this.degradationLevels.keys()) {
      this.resetService(serviceName);
    }
  }
}
