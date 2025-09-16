/**
 * Test Error Handling System
 * 
 * This module provides comprehensive error handling for tests,
 * including error classification, recovery strategies, and
 * detailed error reporting.
 */

export enum TestErrorType {
  ASSERTION_FAILED = 'assertion_failed',
  TIMEOUT = 'timeout',
  SETUP_FAILED = 'setup_failed',
  TEARDOWN_FAILED = 'teardown_failed',
  MOCK_FAILED = 'mock_failed',
  COVERAGE_FAILED = 'coverage_failed',
  PERFORMANCE_FAILED = 'performance_failed',
  SECURITY_FAILED = 'security_failed',
  NETWORK_FAILED = 'network_failed',
  DATABASE_FAILED = 'database_failed',
  CONFIGURATION_FAILED = 'configuration_failed',
  DEPENDENCY_FAILED = 'dependency_failed',
}

export interface TestErrorContext {
  testName?: string;
  testFile?: string;
  testSuite?: string;
  timestamp?: Date;
  stackTrace?: string;
  additionalInfo?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  canRecover(error: TestError): boolean;
  recover(error: TestError): Promise<void>;
  getRetryCount(): number;
  getMaxRetries(): number;
}

/**
 * Custom error class for test-specific errors
 */
export class TestError extends Error {
  public readonly type: TestErrorType;
  public readonly context: TestErrorContext;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    type: TestErrorType,
    message: string,
    context: TestErrorContext = {},
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'TestError';
    this.type = type;
    this.context = {
      ...context,
      timestamp: context.timestamp || new Date(),
      stackTrace: context.stackTrace || this.stack,
    };
    this.timestamp = new Date();
    this.recoverable = recoverable;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TestError);
    }
  }

  /**
   * Create a formatted error message with context
   */
  getFormattedMessage(): string {
    const parts = [
      `[${this.type.toUpperCase()}] ${this.message}`,
    ];

    if (this.context.testName) {
      parts.push(`Test: ${this.context.testName}`);
    }

    if (this.context.testFile) {
      parts.push(`File: ${this.context.testFile}`);
    }

    if (this.context.testSuite) {
      parts.push(`Suite: ${this.context.testSuite}`);
    }

    if (this.context.additionalInfo) {
      parts.push(`Additional Info: ${JSON.stringify(this.context.additionalInfo, null, 2)}`);
    }

    return parts.join('\n');
  }

  /**
   * Convert error to JSON for serialization
   */
  toJSON(): object {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }

  /**
   * Create TestError from regular Error
   */
  static fromError(error: Error, type: TestErrorType, context: TestErrorContext = {}): TestError {
    return new TestError(
      type,
      error.message,
      {
        ...context,
        stackTrace: error.stack,
      }
    );
  }
}

/**
 * Error handler for managing test errors and recovery
 */
export class TestErrorHandler {
  private strategies: Map<TestErrorType, ErrorRecoveryStrategy> = new Map();
  private errorHistory: TestError[] = [];
  private maxHistorySize: number = 100;

  /**
   * Register an error recovery strategy
   */
  registerStrategy(errorType: TestErrorType, strategy: ErrorRecoveryStrategy): void {
    this.strategies.set(errorType, strategy);
  }

  /**
   * Handle a test error with potential recovery
   */
  async handleError(error: TestError): Promise<boolean> {
    // Record error in history
    this.recordError(error);

    // Try to recover if strategy exists
    const strategy = this.strategies.get(error.type);
    if (strategy && error.recoverable && strategy.canRecover(error)) {
      try {
        await strategy.recover(error);
        return true;
      } catch (recoveryError) {
        // Recovery failed, create new error
        const newError = new TestError(
          TestErrorType.SETUP_FAILED,
          `Recovery failed: ${recoveryError.message}`,
          {
            ...error.context,
            additionalInfo: {
              originalError: error.toJSON(),
              recoveryError: recoveryError.message,
            },
          }
        );
        this.recordError(newError);
      }
    }

    return false;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<TestErrorType, number>;
    recent: TestError[];
    mostCommon: TestErrorType | null;
  } {
    const byType: Record<TestErrorType, number> = {} as any;
    
    for (const error of this.errorHistory) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }

    const mostCommon = Object.entries(byType)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as TestErrorType | null;

    return {
      total: this.errorHistory.length,
      byType,
      recent: this.errorHistory.slice(-10),
      mostCommon,
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: TestErrorType): TestError[] {
    return this.errorHistory.filter(error => error.type === type);
  }

  /**
   * Get errors by test name
   */
  getErrorsByTest(testName: string): TestError[] {
    return this.errorHistory.filter(error => error.context.testName === testName);
  }

  private recordError(error: TestError): void {
    this.errorHistory.push(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }
}

/**
 * Default recovery strategies
 */
export class DefaultRecoveryStrategies {
  /**
   * Timeout recovery strategy with retry
   */
  static createTimeoutRecovery(maxRetries: number = 3): ErrorRecoveryStrategy {
    let retryCount = 0;

    return {
      canRecover: (error: TestError) => error.type === TestErrorType.TIMEOUT && retryCount < maxRetries,
      recover: async (error: TestError) => {
        retryCount++;
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      },
      getRetryCount: () => retryCount,
      getMaxRetries: () => maxRetries,
    };
  }

  /**
   * Network failure recovery strategy
   */
  static createNetworkRecovery(maxRetries: number = 5): ErrorRecoveryStrategy {
    let retryCount = 0;

    return {
      canRecover: (error: TestError) => error.type === TestErrorType.NETWORK_FAILED && retryCount < maxRetries,
      recover: async (error: TestError) => {
        retryCount++;
        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, retryCount) * 1000;
        const jitter = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
      },
      getRetryCount: () => retryCount,
      getMaxRetries: () => maxRetries,
    };
  }

  /**
   * Database failure recovery strategy
   */
  static createDatabaseRecovery(maxRetries: number = 3): ErrorRecoveryStrategy {
    let retryCount = 0;

    return {
      canRecover: (error: TestError) => error.type === TestErrorType.DATABASE_FAILED && retryCount < maxRetries,
      recover: async (error: TestError) => {
        retryCount++;
        // Wait and potentially reset database connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Additional database-specific recovery logic would go here
      },
      getRetryCount: () => retryCount,
      getMaxRetries: () => maxRetries,
    };
  }

  /**
   * Mock failure recovery strategy
   */
  static createMockRecovery(): ErrorRecoveryStrategy {
    let retryCount = 0;

    return {
      canRecover: (error: TestError) => error.type === TestErrorType.MOCK_FAILED && retryCount < 1,
      recover: async (error: TestError) => {
        retryCount++;
        // Reset all mocks
        if (jest && jest.clearAllMocks) {
          jest.clearAllMocks();
        }
      },
      getRetryCount: () => retryCount,
      getMaxRetries: () => 1,
    };
  }
}

/**
 * Error assertion helpers
 */
export class ErrorAssertions {
  /**
   * Assert that an error is of a specific type
   */
  static assertErrorType(error: any, expectedType: TestErrorType): asserts error is TestError {
    if (!(error instanceof TestError)) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Expected TestError, but got ${error?.constructor?.name || typeof error}`
      );
    }

    if (error.type !== expectedType) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Expected error type ${expectedType}, but got ${error.type}`
      );
    }
  }

  /**
   * Assert that an error has specific context
   */
  static assertErrorContext(error: TestError, expectedContext: Partial<TestErrorContext>): void {
    for (const [key, expectedValue] of Object.entries(expectedContext)) {
      const actualValue = (error.context as any)[key];
      if (actualValue !== expectedValue) {
        throw new TestError(
          TestErrorType.ASSERTION_FAILED,
          `Expected error context.${key} to be ${expectedValue}, but got ${actualValue}`
        );
      }
    }
  }

  /**
   * Assert that an error is recoverable
   */
  static assertErrorRecoverable(error: TestError, shouldBeRecoverable: boolean = true): void {
    if (error.recoverable !== shouldBeRecoverable) {
      throw new TestError(
        TestErrorType.ASSERTION_FAILED,
        `Expected error to be ${shouldBeRecoverable ? 'recoverable' : 'non-recoverable'}, but it was ${error.recoverable ? 'recoverable' : 'non-recoverable'}`
      );
    }
  }
}

/**
 * Global error handler instance
 */
export const globalTestErrorHandler = new TestErrorHandler();

// Register default recovery strategies
globalTestErrorHandler.registerStrategy(
  TestErrorType.TIMEOUT,
  DefaultRecoveryStrategies.createTimeoutRecovery()
);

globalTestErrorHandler.registerStrategy(
  TestErrorType.NETWORK_FAILED,
  DefaultRecoveryStrategies.createNetworkRecovery()
);

globalTestErrorHandler.registerStrategy(
  TestErrorType.DATABASE_FAILED,
  DefaultRecoveryStrategies.createDatabaseRecovery()
);

globalTestErrorHandler.registerStrategy(
  TestErrorType.MOCK_FAILED,
  DefaultRecoveryStrategies.createMockRecovery()
);