/**
 * Test Retry Manager
 * 
 * Manages automatic retry logic for unstable tests with intelligent
 * retry strategies and failure analysis.
 */

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryOnlyFlaky: boolean;
  skipRetryPatterns: string[];
  customRetryStrategies: Map<string, RetryStrategy>;
}

export interface RetryStrategy {
  shouldRetry: (error: Error, attempt: number) => boolean;
  getDelay: (attempt: number, baseDelay: number) => number;
  maxAttempts: number;
}

export interface RetryResult {
  success: boolean;
  attempts: number;
  totalDuration: number;
  errors: Error[];
  finalError?: Error;
  retryReasons: string[];
}

export interface TestRetryContext {
  testName: string;
  testFile: string;
  isFlaky: boolean;
  flakinessScore: number;
  lastFailurePattern?: string;
}

export class TestRetryManager {
  private config: RetryConfig;
  private retryHistory: Map<string, RetryResult[]> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      retryOnlyFlaky: true,
      skipRetryPatterns: [
        'syntax error',
        'module not found',
        'compilation error',
        'import error'
      ],
      customRetryStrategies: new Map(),
      ...config
    };

    this.setupDefaultStrategies();
  }

  /**
   * Execute a test with retry logic
   */
  async executeWithRetry<T>(
    testFunction: () => Promise<T>,
    context: TestRetryContext
  ): Promise<{ result: T; retryInfo: RetryResult }> {
    const startTime = Date.now();
    const errors: Error[] = [];
    const retryReasons: string[] = [];
    let lastError: Error | undefined;

    // Check if we should retry this test at all
    if (!this.shouldAttemptRetry(context)) {
      try {
        const result = await testFunction();
        return {
          result,
          retryInfo: {
            success: true,
            attempts: 1,
            totalDuration: Date.now() - startTime,
            errors: [],
            retryReasons: []
          }
        };
      } catch (error) {
        throw error; // No retry, just throw
      }
    }

    const strategy = this.getRetryStrategy(context);
    const maxAttempts = Math.min(strategy.maxAttempts, this.config.maxRetries + 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await testFunction();
        
        // Success - record retry info if there were previous failures
        const retryInfo: RetryResult = {
          success: true,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          errors,
          retryReasons
        };

        this.recordRetryResult(context, retryInfo);
        return { result, retryInfo };

      } catch (error) {
        const err = error as Error;
        errors.push(err);
        lastError = err;

        // Check if we should retry this specific error
        if (attempt < maxAttempts && this.shouldRetryError(err, attempt, context)) {
          const reason = this.getRetryReason(err, attempt, context);
          retryReasons.push(reason);

          // Calculate delay
          const delay = strategy.getDelay(attempt, this.config.retryDelay);
          
          if (delay > 0) {
            await this.sleep(delay);
          }

          continue;
        }

        // No more retries or shouldn't retry this error
        break;
      }
    }

    // All retries failed
    const retryInfo: RetryResult = {
      success: false,
      attempts: errors.length,
      totalDuration: Date.now() - startTime,
      errors,
      finalError: lastError,
      retryReasons
    };

    this.recordRetryResult(context, retryInfo);
    throw lastError;
  }

  /**
   * Get retry statistics for a test
   */
  getRetryStats(testName: string, testFile: string): {
    totalRetries: number;
    successfulRetries: number;
    averageAttempts: number;
    mostCommonErrors: string[];
    retrySuccessRate: number;
  } {
    const testKey = `${testFile}::${testName}`;
    const history = this.retryHistory.get(testKey) || [];

    if (history.length === 0) {
      return {
        totalRetries: 0,
        successfulRetries: 0,
        averageAttempts: 0,
        mostCommonErrors: [],
        retrySuccessRate: 0
      };
    }

    const totalRetries = history.length;
    const successfulRetries = history.filter(r => r.success).length;
    const averageAttempts = history.reduce((sum, r) => sum + r.attempts, 0) / history.length;
    
    // Count error types
    const errorCounts = new Map<string, number>();
    history.forEach(result => {
      result.errors.forEach(error => {
        const errorType = this.categorizeError(error);
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      });
    });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error]) => error);

    const retrySuccessRate = totalRetries > 0 ? successfulRetries / totalRetries : 0;

    return {
      totalRetries,
      successfulRetries,
      averageAttempts,
      mostCommonErrors,
      retrySuccessRate
    };
  }

  /**
   * Add custom retry strategy
   */
  addRetryStrategy(pattern: string, strategy: RetryStrategy): void {
    this.config.customRetryStrategies.set(pattern, strategy);
  }

  /**
   * Clear retry history
   */
  clearRetryHistory(testName?: string, testFile?: string): void {
    if (testName && testFile) {
      const testKey = `${testFile}::${testName}`;
      this.retryHistory.delete(testKey);
    } else {
      this.retryHistory.clear();
    }
  }

  private shouldAttemptRetry(context: TestRetryContext): boolean {
    // If configured to only retry flaky tests, check flakiness
    if (this.config.retryOnlyFlaky && !context.isFlaky) {
      return false;
    }

    return true;
  }

  private shouldRetryError(error: Error, attempt: number, context: TestRetryContext): boolean {
    // Check skip patterns
    const errorMessage = error.message.toLowerCase();
    for (const pattern of this.config.skipRetryPatterns) {
      if (errorMessage.includes(pattern.toLowerCase())) {
        return false;
      }
    }

    // Use custom strategy if available
    const strategy = this.getRetryStrategy(context);
    return strategy.shouldRetry(error, attempt);
  }

  private getRetryStrategy(context: TestRetryContext): RetryStrategy {
    // Check for custom strategies
    for (const [pattern, strategy] of this.config.customRetryStrategies) {
      if (context.testName.includes(pattern) || 
          context.testFile.includes(pattern) ||
          (context.lastFailurePattern && context.lastFailurePattern.includes(pattern))) {
        return strategy;
      }
    }

    // Return default strategy based on flakiness
    if (context.isFlaky && context.flakinessScore > 0.5) {
      return this.getHighFlakinessStrategy();
    } else if (context.isFlaky) {
      return this.getMediumFlakinessStrategy();
    } else {
      return this.getDefaultStrategy();
    }
  }

  private getRetryReason(error: Error, attempt: number, context: TestRetryContext): string {
    const errorType = this.categorizeError(error);
    return `Attempt ${attempt}: ${errorType} (flakiness: ${(context.flakinessScore * 100).toFixed(1)}%)`;
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'Timeout';
    if (message.includes('network') || message.includes('connection')) return 'Network';
    if (message.includes('memory')) return 'Memory';
    if (message.includes('race') || message.includes('concurrent')) return 'Race Condition';
    if (message.includes('async') || message.includes('promise')) return 'Async';
    if (message.includes('assertion') || message.includes('expect')) return 'Assertion';
    
    return 'Unknown';
  }

  private recordRetryResult(context: TestRetryContext, result: RetryResult): void {
    const testKey = `${context.testFile}::${context.testName}`;
    const history = this.retryHistory.get(testKey) || [];
    
    history.push(result);
    
    // Keep only recent history
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.retryHistory.set(testKey, history);
  }

  private setupDefaultStrategies(): void {
    // Strategy for timing-related issues
    this.config.customRetryStrategies.set('timing', {
      shouldRetry: (error: Error, attempt: number) => {
        const message = error.message.toLowerCase();
        return (message.includes('timeout') || message.includes('timing')) && attempt <= 3;
      },
      getDelay: (attempt: number, baseDelay: number) => baseDelay * Math.pow(2, attempt - 1),
      maxAttempts: 3
    });

    // Strategy for network-related issues
    this.config.customRetryStrategies.set('network', {
      shouldRetry: (error: Error, attempt: number) => {
        const message = error.message.toLowerCase();
        return (message.includes('network') || message.includes('connection')) && attempt <= 5;
      },
      getDelay: (attempt: number, baseDelay: number) => baseDelay * attempt,
      maxAttempts: 5
    });

    // Strategy for race conditions
    this.config.customRetryStrategies.set('race', {
      shouldRetry: (error: Error, attempt: number) => {
        const message = error.message.toLowerCase();
        return (message.includes('race') || message.includes('concurrent')) && attempt <= 2;
      },
      getDelay: (attempt: number, baseDelay: number) => baseDelay + Math.random() * 1000,
      maxAttempts: 2
    });
  }

  private getDefaultStrategy(): RetryStrategy {
    return {
      shouldRetry: (error: Error, attempt: number) => attempt <= 3,
      getDelay: (attempt: number, baseDelay: number) => {
        return this.config.exponentialBackoff 
          ? baseDelay * Math.pow(2, attempt - 1)
          : baseDelay;
      },
      maxAttempts: 4
    };
  }

  private getMediumFlakinessStrategy(): RetryStrategy {
    return {
      shouldRetry: (error: Error, attempt: number) => attempt <= 3,
      getDelay: (attempt: number, baseDelay: number) => {
        return this.config.exponentialBackoff 
          ? baseDelay * Math.pow(1.5, attempt - 1)
          : baseDelay;
      },
      maxAttempts: 3
    };
  }

  private getHighFlakinessStrategy(): RetryStrategy {
    return {
      shouldRetry: (error: Error, attempt: number) => attempt <= 6,
      getDelay: (attempt: number, baseDelay: number) => {
        // Add some randomization to avoid thundering herd
        const jitter = Math.random() * 500;
        const delay = this.config.exponentialBackoff 
          ? baseDelay * Math.pow(1.2, attempt - 1)
          : baseDelay;
        return delay + jitter;
      },
      maxAttempts: 6
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}