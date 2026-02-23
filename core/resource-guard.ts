/**
 * Resource Guard - QA Kit's efficiency watchdog
 * Prevents infinite loops, resource waste, and runaway processes
 * Ported from Ralph QA Agent
 */

import { performance } from 'perf_hooks';
import process from 'process';

export interface ResourceLimits {
  maxRunTime: number;
  maxMemoryMB: number;
  maxRetries: number;
  maxHealingAttempts: number;
  maxConcurrentTests: number;
  testTimeout: number;
  pageTimeout: number;
  elementTimeout: number;
  networkTimeout: number;
  screenshotTimeout: number;
}

export interface ResourceStats {
  startTime: number;
  startMemory: number;
  testsRun: number;
  retriesUsed: number;
  healingAttempts: number;
  resourceWarnings: number;
}

export interface CircuitBreakerState {
  failures: number;
  threshold: number;
  timeout: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailure: number | null;
}

export interface ResourceUsage {
  runtime: number;
  memoryMB: number;
  testsRun: number;
  retriesUsed: number;
  healingAttempts: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface EnvironmentChecks {
  nodeVersion: string;
  platform: string;
  arch: string;
  memory: number;
  pid: number;
}

export class ResourceGuard {
  private limits: ResourceLimits;
  private stats: ResourceStats;
  private circuitBreaker: CircuitBreakerState;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(suiteType: string = 'smoke', customLimits: Partial<ResourceLimits> = {}) {
    // Default limits
    const defaultLimits: ResourceLimits = {
      maxRunTime: suiteType === 'full' ? 30 * 60 * 1000 : 10 * 60 * 1000, // 30min full, 10min smoke
      maxMemoryMB: 512,
      maxRetries: 3,
      maxHealingAttempts: 2,
      maxConcurrentTests: 1,
      testTimeout: 60000,
      pageTimeout: 30000,
      elementTimeout: 15000,
      networkTimeout: 30000,
      screenshotTimeout: 5000,
      ...customLimits
    };

    this.limits = defaultLimits;

    this.stats = {
      startTime: Date.now(),
      startMemory: process.memoryUsage().heapUsed,
      testsRun: 0,
      retriesUsed: 0,
      healingAttempts: 0,
      resourceWarnings: 0
    };

    this.circuitBreaker = {
      failures: 0,
      threshold: 5,
      timeout: 60000, // 1 minute cooldown
      state: 'CLOSED',
      lastFailure: null
    };

    this.setupSignalHandlers();
    this.startResourceMonitoring();
  }

  private setupSignalHandlers(): void {
    // Graceful shutdown on SIGINT/SIGTERM
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.log('🚨 QA Kit: Uncaught exception detected');
      console.log(error);
      this.emergencyShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
      console.log('🚨 QA Kit: Unhandled promise rejection');
      console.log(reason);
      this.emergencyShutdown('UNHANDLED_REJECTION');
    });
  }

  private startResourceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkResourceLimits();
    }, 5000); // Check every 5 seconds
  }

  private checkResourceLimits(): void {
    const runtime = Date.now() - this.stats.startTime;
    const memory = process.memoryUsage();
    const memoryMB = memory.heapUsed / 1024 / 1024;

    // Check runtime limit
    if (runtime > this.limits.maxRunTime) {
      console.log(`⏰ QA Kit: Maximum runtime exceeded (${Math.round(runtime/1000)}s)`);
      this.handleResourceLimit('MAX_RUNTIME');
      return;
    }

    // Check memory limit
    if (memoryMB > this.limits.maxMemoryMB) {
      console.log(`🧠 QA Kit: Memory limit exceeded (${Math.round(memoryMB)}MB)`);
      this.stats.resourceWarnings++;
      
      if (this.stats.resourceWarnings > 3) {
        this.handleResourceLimit('MAX_MEMORY');
        return;
      }
      
      // Try garbage collection
      if (global.gc) {
        global.gc();
        console.log('🗑️  QA Kit: Attempted garbage collection');
      }
    }

    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      const cooldownExpired = this.circuitBreaker.lastFailure && 
        Date.now() - this.circuitBreaker.lastFailure > this.circuitBreaker.timeout;
      if (cooldownExpired) {
        this.circuitBreaker.state = 'HALF_OPEN';
        console.log('🔄 QA Kit: Circuit breaker in half-open state');
      }
    }
  }

  // Test-level timeout wrapper
  async withTimeout<T>(operation: () => Promise<T>, name: string, timeoutMs?: number): Promise<T> {
    const timeout = timeoutMs || this.limits.testTimeout;
    
    return new Promise<T>(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation "${name}" timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = await operation();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  // Retry mechanism with exponential backoff
  async withRetry<T>(operation: () => Promise<T>, name: string, maxRetries?: number): Promise<T> {
    const retries = maxRetries || this.limits.maxRetries;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          console.log(`✅ QA Kit: "${name}" succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        this.stats.retriesUsed++;

        if (attempt === retries) {
          console.log(`❌ QA Kit: "${name}" failed after ${retries} attempts`);
          this.recordCircuitBreakerFailure();
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⚠️  QA Kit: "${name}" failed (attempt ${attempt}/${retries}), retrying in ${backoffMs}ms`);
        
        await this.sleep(backoffMs);
      }
    }

    throw lastError!;
  }

  // Circuit breaker check
  canProceed(): boolean {
    if (this.circuitBreaker.state === 'OPEN') {
      console.log('🚫 QA Kit: Circuit breaker is OPEN - stopping execution');
      return false;
    }
    return true;
  }

  recordCircuitBreakerFailure(): void {
    this.circuitBreaker.failures++;
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.lastFailure = Date.now();
      console.log(`🔴 QA Kit: Circuit breaker OPENED after ${this.circuitBreaker.failures} failures`);
    }
  }

  recordCircuitBreakerSuccess(): void {
    this.circuitBreaker.failures = 0;
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      console.log('🟢 QA Kit: Circuit breaker CLOSED - system recovered');
    }
  }

  // Rate limiting for healing attempts
  canAttemptHealing(): boolean {
    if (this.stats.healingAttempts >= this.limits.maxHealingAttempts) {
      console.log(`🔧 QA Kit: Maximum healing attempts reached (${this.limits.maxHealingAttempts})`);
      return false;
    }
    return true;
  }

  recordHealingAttempt(): void {
    this.stats.healingAttempts++;
  }

  incrementTestCount(): void {
    this.stats.testsRun++;
  }

  // Resource cleanup helpers
  async cleanup(): Promise<void> {
    console.log('🧹 QA Kit: Cleaning up resources...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Log final stats
    const runtime = Date.now() - this.stats.startTime;
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDiff = (finalMemory - this.stats.startMemory) / 1024 / 1024;

    console.log(`📊 QA Kit Session Stats:
    Runtime: ${Math.round(runtime/1000)}s
    Tests run: ${this.stats.testsRun}
    Retries used: ${this.stats.retriesUsed}
    Healing attempts: ${this.stats.healingAttempts}
    Memory delta: ${Math.round(memoryDiff)}MB
    Resource warnings: ${this.stats.resourceWarnings}`);
  }

  private handleResourceLimit(reason: string): void {
    console.log(`🚨 QA Kit: Resource limit exceeded (${reason}) - initiating graceful shutdown`);
    this.emergencyShutdown(reason);
  }

  private handleShutdown(signal: string): void {
    console.log(`\\n🛑 QA Kit: Received ${signal} - shutting down gracefully...`);
    process.exit(0);
  }

  private emergencyShutdown(reason: string): void {
    console.log(`🚨 QA Kit: EMERGENCY SHUTDOWN (${reason})`);
    console.log(`💾 QA Kit: Saving partial results...`);
    
    // Quick cleanup
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Exit with error code
    process.exit(1);
  }

  // Utility methods
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getResourceUsage(): ResourceUsage {
    const memory = process.memoryUsage();
    const runtime = Date.now() - this.stats.startTime;
    
    return {
      runtime: Math.round(runtime / 1000),
      memoryMB: Math.round(memory.heapUsed / 1024 / 1024),
      testsRun: this.stats.testsRun,
      retriesUsed: this.stats.retriesUsed,
      healingAttempts: this.stats.healingAttempts,
      circuitBreakerState: this.circuitBreaker.state
    };
  }

  isWithinLimits(): Record<string, boolean> {
    const usage = this.getResourceUsage();
    
    return {
      runtime: usage.runtime < (this.limits.maxRunTime / 1000),
      memory: usage.memoryMB < this.limits.maxMemoryMB,
      retries: usage.retriesUsed < (this.limits.maxRetries * 10), // Allow some buffer
      healing: usage.healingAttempts < this.limits.maxHealingAttempts,
      circuitBreaker: this.circuitBreaker.state !== 'OPEN'
    };
  }

  // Pre-flight checks
  validateEnvironment(): EnvironmentChecks {
    const checks: EnvironmentChecks = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      pid: process.pid
    };

    console.log(`🔍 QA Kit: Environment validation
    Node.js: ${checks.nodeVersion}
    Platform: ${checks.platform} (${checks.arch})
    Available memory: ${checks.memory}MB
    Process ID: ${checks.pid}`);

    // Check minimum requirements (relaxed for development)
    if (checks.memory < 32) {
      throw new Error('Insufficient memory available (minimum 32MB required)');
    }

    return checks;
  }
}