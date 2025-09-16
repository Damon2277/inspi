/**
 * Tests for Test Error Handling System
 */

import { 
  TestError, 
  TestErrorHandler, 
  DefaultRecoveryStrategies, 
  ErrorAssertions,
  TestErrorType 
} from '../../../../lib/testing/errors/TestError';

describe('TestError', () => {
  describe('constructor and basic properties', () => {
    it('should create error with basic properties', () => {
      const error = new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Test assertion failed'
      );
      
      expect(error.type).toBe(TestErrorType.ASSERTION_FAILED);
      expect(error.message).toBe('Test assertion failed');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.recoverable).toBe(false);
      expect(error.context.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with context', () => {
      const context = {
        testName: 'my-test',
        testFile: 'test.spec.ts',
        testSuite: 'MyTestSuite',
        additionalInfo: { userId: '123' }
      };
      
      const error = new TestError(
        TestErrorType.TIMEOUT,
        'Test timed out',
        context,
        true
      );
      
      expect(error.context.testName).toBe('my-test');
      expect(error.context.testFile).toBe('test.spec.ts');
      expect(error.context.testSuite).toBe('MyTestSuite');
      expect(error.context.additionalInfo).toEqual({ userId: '123' });
      expect(error.recoverable).toBe(true);
    });
  });

  describe('getFormattedMessage', () => {
    it('should format message with context', () => {
      const error = new TestError(
        TestErrorType.MOCK_FAILED,
        'Mock setup failed',
        {
          testName: 'should-mock-service',
          testFile: 'service.test.ts',
          testSuite: 'ServiceTests',
          additionalInfo: { mockName: 'EmailService' }
        }
      );
      
      const formatted = error.getFormattedMessage();
      
      expect(formatted).toContain('[MOCK_FAILED] Mock setup failed');
      expect(formatted).toContain('Test: should-mock-service');
      expect(formatted).toContain('File: service.test.ts');
      expect(formatted).toContain('Suite: ServiceTests');
      expect(formatted).toContain('mockName');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new TestError(
        TestErrorType.COVERAGE_FAILED,
        'Coverage below threshold',
        { testName: 'coverage-test' }
      );
      
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'TestError');
      expect(json).toHaveProperty('type', TestErrorType.COVERAGE_FAILED);
      expect(json).toHaveProperty('message', 'Coverage below threshold');
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('recoverable');
      expect(json).toHaveProperty('stack');
    });
  });

  describe('fromError', () => {
    it('should create TestError from regular Error', () => {
      const originalError = new Error('Original error message');
      const testError = TestError.fromError(
        originalError,
        TestErrorType.SETUP_FAILED,
        { testName: 'setup-test' }
      );
      
      expect(testError).toBeInstanceOf(TestError);
      expect(testError.type).toBe(TestErrorType.SETUP_FAILED);
      expect(testError.message).toBe('Original error message');
      expect(testError.context.testName).toBe('setup-test');
      expect(testError.context.stackTrace).toBe(originalError.stack);
    });
  });
});

describe('TestErrorHandler', () => {
  let handler: TestErrorHandler;

  beforeEach(() => {
    handler = new TestErrorHandler();
  });

  describe('error recording', () => {
    it('should record errors in history', async () => {
      const error = new TestError(TestErrorType.TIMEOUT, 'Test timeout');
      
      await handler.handleError(error);
      
      const stats = handler.getErrorStats();
      expect(stats.total).toBe(1);
      expect(stats.byType[TestErrorType.TIMEOUT]).toBe(1);
      expect(stats.recent).toHaveLength(1);
      expect(stats.mostCommon).toBe(TestErrorType.TIMEOUT);
    });

    it('should maintain error history limit', async () => {
      // Create more errors than the history limit
      for (let i = 0; i < 150; i++) {
        const error = new TestError(TestErrorType.ASSERTION_FAILED, `Error ${i}`);
        await handler.handleError(error);
      }
      
      const stats = handler.getErrorStats();
      expect(stats.total).toBe(100); // Should be limited to 100
    });
  });

  describe('recovery strategies', () => {
    it('should register and use recovery strategies', async () => {
      let recoveryAttempted = false;
      
      const mockStrategy = {
        canRecover: (error: TestError) => error.type === TestErrorType.NETWORK_FAILED,
        recover: async (error: TestError) => {
          recoveryAttempted = true;
        },
        getRetryCount: () => 1,
        getMaxRetries: () => 3
      };
      
      handler.registerStrategy(TestErrorType.NETWORK_FAILED, mockStrategy);
      
      const error = new TestError(
        TestErrorType.NETWORK_FAILED,
        'Network error',
        {},
        true // recoverable
      );
      
      const recovered = await handler.handleError(error);
      
      expect(recovered).toBe(true);
      expect(recoveryAttempted).toBe(true);
    });

    it('should not attempt recovery for non-recoverable errors', async () => {
      let recoveryAttempted = false;
      
      const mockStrategy = {
        canRecover: () => true,
        recover: async () => { recoveryAttempted = true; },
        getRetryCount: () => 0,
        getMaxRetries: () => 3
      };
      
      handler.registerStrategy(TestErrorType.ASSERTION_FAILED, mockStrategy);
      
      const error = new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Assertion failed',
        {},
        false // not recoverable
      );
      
      const recovered = await handler.handleError(error);
      
      expect(recovered).toBe(false);
      expect(recoveryAttempted).toBe(false);
    });

    it('should handle recovery failures', async () => {
      const mockStrategy = {
        canRecover: () => true,
        recover: async () => { throw new Error('Recovery failed'); },
        getRetryCount: () => 1,
        getMaxRetries: () => 3
      };
      
      handler.registerStrategy(TestErrorType.DATABASE_FAILED, mockStrategy);
      
      const error = new TestError(
        TestErrorType.DATABASE_FAILED,
        'Database error',
        {},
        true
      );
      
      const recovered = await handler.handleError(error);
      
      expect(recovered).toBe(false);
      
      // Should have recorded both original and recovery failure errors
      const stats = handler.getErrorStats();
      expect(stats.total).toBe(2);
    });
  });

  describe('error queries', () => {
    beforeEach(async () => {
      // Add some test errors
      await handler.handleError(new TestError(TestErrorType.TIMEOUT, 'Timeout 1', { testName: 'test1' }));
      await handler.handleError(new TestError(TestErrorType.TIMEOUT, 'Timeout 2', { testName: 'test2' }));
      await handler.handleError(new TestError(TestErrorType.ASSERTION_FAILED, 'Assert 1', { testName: 'test1' }));
    });

    it('should get errors by type', () => {
      const timeoutErrors = handler.getErrorsByType(TestErrorType.TIMEOUT);
      expect(timeoutErrors).toHaveLength(2);
      expect(timeoutErrors.every(e => e.type === TestErrorType.TIMEOUT)).toBe(true);
    });

    it('should get errors by test name', () => {
      const test1Errors = handler.getErrorsByTest('test1');
      expect(test1Errors).toHaveLength(2);
      expect(test1Errors.every(e => e.context.testName === 'test1')).toBe(true);
    });

    it('should clear error history', () => {
      handler.clearHistory();
      const stats = handler.getErrorStats();
      expect(stats.total).toBe(0);
    });
  });
});

describe('DefaultRecoveryStrategies', () => {
  describe('timeout recovery', () => {
    it('should create timeout recovery strategy', () => {
      const strategy = DefaultRecoveryStrategies.createTimeoutRecovery(3);
      
      const timeoutError = new TestError(TestErrorType.TIMEOUT, 'Timeout');
      const otherError = new TestError(TestErrorType.ASSERTION_FAILED, 'Assert');
      
      expect(strategy.canRecover(timeoutError)).toBe(true);
      expect(strategy.canRecover(otherError)).toBe(false);
      expect(strategy.getMaxRetries()).toBe(3);
    });

    it('should respect retry limits', async () => {
      const strategy = DefaultRecoveryStrategies.createTimeoutRecovery(2);
      const error = new TestError(TestErrorType.TIMEOUT, 'Timeout');
      
      // Mock setTimeout to avoid actual delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((fn: any) => fn()) as any;
      
      try {
        expect(strategy.canRecover(error)).toBe(true); // First attempt
        await strategy.recover(error); // Actually perform recovery to increment counter
        
        expect(strategy.canRecover(error)).toBe(true); // Second attempt
        await strategy.recover(error); // Actually perform recovery to increment counter
        
        expect(strategy.canRecover(error)).toBe(false); // Third attempt - should fail
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('network recovery', () => {
    it('should create network recovery strategy', () => {
      const strategy = DefaultRecoveryStrategies.createNetworkRecovery(5);
      
      const networkError = new TestError(TestErrorType.NETWORK_FAILED, 'Network');
      expect(strategy.canRecover(networkError)).toBe(true);
      expect(strategy.getMaxRetries()).toBe(5);
    });
  });

  describe('database recovery', () => {
    it('should create database recovery strategy', () => {
      const strategy = DefaultRecoveryStrategies.createDatabaseRecovery(3);
      
      const dbError = new TestError(TestErrorType.DATABASE_FAILED, 'Database');
      expect(strategy.canRecover(dbError)).toBe(true);
      expect(strategy.getMaxRetries()).toBe(3);
    });
  });

  describe('mock recovery', () => {
    it('should create mock recovery strategy', () => {
      const strategy = DefaultRecoveryStrategies.createMockRecovery();
      
      const mockError = new TestError(TestErrorType.MOCK_FAILED, 'Mock');
      expect(strategy.canRecover(mockError)).toBe(true);
      expect(strategy.getMaxRetries()).toBe(1);
    });
  });
});

describe('ErrorAssertions', () => {
  describe('assertErrorType', () => {
    it('should pass for correct error type', () => {
      const error = new TestError(TestErrorType.TIMEOUT, 'Timeout');
      expect(() => ErrorAssertions.assertErrorType(error, TestErrorType.TIMEOUT)).not.toThrow();
    });

    it('should fail for incorrect error type', () => {
      const error = new TestError(TestErrorType.TIMEOUT, 'Timeout');
      expect(() => ErrorAssertions.assertErrorType(error, TestErrorType.ASSERTION_FAILED)).toThrow(TestError);
    });

    it('should fail for non-TestError', () => {
      const error = new Error('Regular error');
      expect(() => ErrorAssertions.assertErrorType(error, TestErrorType.TIMEOUT)).toThrow(TestError);
    });
  });

  describe('assertErrorContext', () => {
    it('should pass for matching context', () => {
      const error = new TestError(
        TestErrorType.SETUP_FAILED,
        'Setup failed',
        { testName: 'my-test', testFile: 'test.spec.ts' }
      );
      
      expect(() => 
        ErrorAssertions.assertErrorContext(error, { testName: 'my-test' })
      ).not.toThrow();
    });

    it('should fail for non-matching context', () => {
      const error = new TestError(
        TestErrorType.SETUP_FAILED,
        'Setup failed',
        { testName: 'my-test' }
      );
      
      expect(() => 
        ErrorAssertions.assertErrorContext(error, { testName: 'other-test' })
      ).toThrow(TestError);
    });
  });

  describe('assertErrorRecoverable', () => {
    it('should pass for correct recoverability', () => {
      const recoverableError = new TestError(TestErrorType.TIMEOUT, 'Timeout', {}, true);
      const nonRecoverableError = new TestError(TestErrorType.ASSERTION_FAILED, 'Assert', {}, false);
      
      expect(() => ErrorAssertions.assertErrorRecoverable(recoverableError, true)).not.toThrow();
      expect(() => ErrorAssertions.assertErrorRecoverable(nonRecoverableError, false)).not.toThrow();
    });

    it('should fail for incorrect recoverability', () => {
      const error = new TestError(TestErrorType.TIMEOUT, 'Timeout', {}, false);
      
      expect(() => ErrorAssertions.assertErrorRecoverable(error, true)).toThrow(TestError);
    });
  });
});