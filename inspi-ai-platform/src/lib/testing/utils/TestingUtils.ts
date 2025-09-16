/**
 * Testing Utilities Index
 * 
 * This module provides a centralized export of all testing utilities,
 * making it easy to import and use testing tools throughout the project.
 */

// Custom Matchers
export { CustomMatchers } from '../matchers/CustomMatchers';
export type { CustomMatcherResult } from '../matchers/CustomMatchers';

// Assertion Helpers
export { AssertionHelpers } from '../helpers/AssertionHelpers';
export type { AssertionOptions, AsyncAssertionOptions } from '../helpers/AssertionHelpers';

// Performance Monitoring
export { 
  PerformanceMonitor, 
  measurePerformance, 
  createPerformanceBenchmark 
} from '../performance/PerformanceMonitor';
export type { 
  PerformanceMetrics, 
  PerformanceBenchmark, 
  PerformanceReport 
} from '../performance/PerformanceMonitor';

// Error Handling
export { 
  TestError, 
  TestErrorHandler, 
  DefaultRecoveryStrategies, 
  ErrorAssertions,
  globalTestErrorHandler,
  TestErrorType 
} from '../errors/TestError';
export type { 
  TestErrorContext, 
  ErrorRecoveryStrategy 
} from '../errors/TestError';

/**
 * Utility function to setup all custom matchers
 */
export function setupCustomMatchers(): void {
  // Only setup if expect is available (in test environment)
  if (typeof expect !== 'undefined' && expect.extend) {
    // Extend Jest matchers
    expect.extend({
      toBeValidCard: CustomMatchers.toBeValidCard,
      toBeValidUser: CustomMatchers.toBeValidUser,
      toBeValidWork: CustomMatchers.toBeValidWork,
      toHavePerformanceWithin: CustomMatchers.toHavePerformanceWithin,
      toBeValidApiResponse: CustomMatchers.toBeValidApiResponse,
      toBeValidErrorResponse: CustomMatchers.toBeValidErrorResponse,
      toBeValidJWT: CustomMatchers.toBeValidJWT,
      toBeValidEmail: CustomMatchers.toBeValidEmail,
    });
  }
}

/**
 * Utility function to setup performance monitoring for a test suite
 */
export function setupPerformanceMonitoring(suiteName: string): {
  monitor: PerformanceMonitor;
  measureTest: (testName: string, fn: () => Promise<any> | any) => Promise<any>;
} {
  const monitor = PerformanceMonitor.getInstance();
  
  const measureTest = async (testName: string, fn: () => Promise<any> | any) => {
    const fullTestName = `${suiteName}.${testName}`;
    const { result } = await monitor.measureFunction(fullTestName, fn);
    return result;
  };

  return { monitor, measureTest };
}

/**
 * Utility function to setup error handling for a test suite
 */
export function setupErrorHandling(): {
  handler: TestErrorHandler;
  handleTestError: (error: any, context?: Partial<TestErrorContext>) => Promise<boolean>;
} {
  const handler = globalTestErrorHandler;
  
  const handleTestError = async (error: any, context: Partial<TestErrorContext> = {}) => {
    let testError: TestError;
    
    if (error instanceof TestError) {
      testError = error;
    } else {
      // Convert regular error to TestError
      testError = TestError.fromError(
        error instanceof Error ? error : new Error(String(error)),
        TestErrorType.ASSERTION_FAILED,
        context
      );
    }
    
    return handler.handleError(testError);
  };

  return { handler, handleTestError };
}

/**
 * Complete test setup utility that configures all testing tools
 */
export function setupTestingEnvironment(options: {
  suiteName?: string;
  enablePerformanceMonitoring?: boolean;
  enableCustomMatchers?: boolean;
  enableErrorHandling?: boolean;
} = {}): {
  performanceMonitor?: PerformanceMonitor;
  errorHandler?: TestErrorHandler;
  measureTest?: (testName: string, fn: () => Promise<any> | any) => Promise<any>;
  handleTestError?: (error: any, context?: Partial<TestErrorContext>) => Promise<boolean>;
} {
  const result: any = {};

  // Setup custom matchers
  if (options.enableCustomMatchers !== false) {
    setupCustomMatchers();
  }

  // Setup performance monitoring
  if (options.enablePerformanceMonitoring && options.suiteName) {
    const { monitor, measureTest } = setupPerformanceMonitoring(options.suiteName);
    result.performanceMonitor = monitor;
    result.measureTest = measureTest;
  }

  // Setup error handling
  if (options.enableErrorHandling !== false) {
    const { handler, handleTestError } = setupErrorHandling();
    result.errorHandler = handler;
    result.handleTestError = handleTestError;
  }

  return result;
}

/**
 * Test helper for creating test data with validation
 */
export class TestDataHelper {
  /**
   * Create valid test card data
   */
  static createValidCard(overrides: any = {}): any {
    return {
      title: 'Test Card Title',
      content: 'Test card content with meaningful information',
      tags: ['test', 'card'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create valid test user data
   */
  static createValidUser(overrides: any = {}): any {
    return {
      email: 'test@example.com',
      name: 'Test User',
      id: 'test-user-id',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create valid test work data
   */
  static createValidWork(overrides: any = {}): any {
    return {
      title: 'Test Work Title',
      description: 'Test work description',
      userId: 'test-user-id',
      status: 'draft',
      tags: ['test', 'work'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create valid API response data
   */
  static createValidApiResponse(data: any = {}, success: boolean = true): any {
    return {
      success,
      ...(success ? { data } : { error: data }),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create valid error response data
   */
  static createValidErrorResponse(message: string = 'Test error', code: string = 'TEST_ERROR'): any {
    return {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create valid JWT token (mock)
   */
  static createValidJWT(): string {
    // This is a mock JWT for testing purposes only
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ 
      sub: 'test-user-id', 
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600 
    })).toString('base64');
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }
}

/**
 * Test timing utilities
 */
export class TestTimingUtils {
  /**
   * Wait for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to become true
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await TestTimingUtils.wait(interval);
    }

    throw new TestError(
      TestErrorType.TIMEOUT,
      `Condition did not become true within ${timeout}ms`
    );
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    
    return { result, duration };
  }
}