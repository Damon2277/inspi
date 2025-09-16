/**
 * Test Retry Manager Tests
 */

import { TestRetryManager, TestRetryContext } from '../../../../lib/testing/stability/TestRetryManager';

describe('TestRetryManager', () => {
  let retryManager: TestRetryManager;

  beforeEach(() => {
    retryManager = new TestRetryManager({
      maxRetries: 3,
      retryDelay: 10, // Short delay for tests
      exponentialBackoff: true,
      retryOnlyFlaky: false
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const testFunction = jest.fn().mockResolvedValue('success');
      const context: TestRetryContext = {
        testName: 'stable test',
        testFile: 'stable.spec.ts',
        isFlaky: false,
        flakinessScore: 0
      };

      const result = await retryManager.executeWithRetry(testFunction, context);

      expect(result.result).toBe('success');
      expect(result.retryInfo.success).toBe(true);
      expect(result.retryInfo.attempts).toBe(1);
      expect(testFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const testFunction = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const context: TestRetryContext = {
        testName: 'flaky test',
        testFile: 'flaky.spec.ts',
        isFlaky: true,
        flakinessScore: 0.3
      };

      const result = await retryManager.executeWithRetry(testFunction, context);

      expect(result.result).toBe('success');
      expect(result.retryInfo.success).toBe(true);
      expect(result.retryInfo.attempts).toBe(3);
      expect(result.retryInfo.errors).toHaveLength(2);
      expect(testFunction).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const testFunction = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      const context: TestRetryContext = {
        testName: 'failing test',
        testFile: 'failing.spec.ts',
        isFlaky: true,
        flakinessScore: 0.5
      };

      await expect(retryManager.executeWithRetry(testFunction, context)).rejects.toThrow('Persistent failure');
      expect(testFunction).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not retry non-flaky tests when retryOnlyFlaky is true', async () => {
      const retryManagerFlaky = new TestRetryManager({
        maxRetries: 3,
        retryDelay: 10,
        retryOnlyFlaky: true
      });

      const testFunction = jest.fn().mockRejectedValue(new Error('Failure'));
      const context: TestRetryContext = {
        testName: 'stable test',
        testFile: 'stable.spec.ts',
        isFlaky: false,
        flakinessScore: 0
      };

      await expect(retryManagerFlaky.executeWithRetry(testFunction, context)).rejects.toThrow('Failure');
      expect(testFunction).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry syntax errors', async () => {
      const testFunction = jest.fn().mockRejectedValue(new Error('Syntax error in test'));
      const context: TestRetryContext = {
        testName: 'syntax error test',
        testFile: 'syntax.spec.ts',
        isFlaky: true,
        flakinessScore: 0.3
      };

      await expect(retryManager.executeWithRetry(testFunction, context)).rejects.toThrow('Syntax error in test');
      expect(testFunction).toHaveBeenCalledTimes(1); // No retries for syntax errors
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test
      });

      let attempts = 0;
      const testFunction = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const context: TestRetryContext = {
        testName: 'backoff test',
        testFile: 'backoff.spec.ts',
        isFlaky: true,
        flakinessScore: 0.3
      };

      await retryManager.executeWithRetry(testFunction, context);

      expect(delays).toHaveLength(2); // 2 retries with delays
      expect(delays[1]).toBeGreaterThan(delays[0]); // Exponential backoff

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('getRetryStats', () => {
    beforeEach(async () => {
      // Generate some retry history
      const contexts = [
        { testName: 'test1', testFile: 'test1.spec.ts', isFlaky: true, flakinessScore: 0.3 },
        { testName: 'test2', testFile: 'test2.spec.ts', isFlaky: true, flakinessScore: 0.5 }
      ];

      for (const context of contexts) {
        let attempts = 0;
        const testFunction = jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return Promise.resolve('success');
        });

        try {
          await retryManager.executeWithRetry(testFunction, context);
        } catch {
          // Ignore failures for stats generation
        }
      }
    });

    it('should provide retry statistics', () => {
      const stats = retryManager.getRetryStats('test1', 'test1.spec.ts');

      expect(stats.totalRetries).toBeGreaterThan(0);
      expect(stats.averageAttempts).toBeGreaterThan(1);
      expect(stats.retrySuccessRate).toBeGreaterThanOrEqual(0);
      expect(stats.retrySuccessRate).toBeLessThanOrEqual(1);
    });

    it('should return empty stats for non-existent test', () => {
      const stats = retryManager.getRetryStats('nonexistent', 'nonexistent.spec.ts');

      expect(stats.totalRetries).toBe(0);
      expect(stats.successfulRetries).toBe(0);
      expect(stats.averageAttempts).toBe(0);
      expect(stats.retrySuccessRate).toBe(0);
    });
  });

  describe('addRetryStrategy', () => {
    it('should use custom retry strategy', async () => {
      const customStrategy = {
        shouldRetry: jest.fn().mockReturnValue(true),
        getDelay: jest.fn().mockReturnValue(5),
        maxAttempts: 2
      };

      retryManager.addRetryStrategy('custom', customStrategy);

      let attempts = 0;
      const testFunction = jest.fn().mockImplementation(() => {
        attempts++;
        throw new Error('Always fails');
      });

      const context: TestRetryContext = {
        testName: 'custom test',
        testFile: 'custom.spec.ts',
        isFlaky: true,
        flakinessScore: 0.3
      };

      await expect(retryManager.executeWithRetry(testFunction, context)).rejects.toThrow('Always fails');
      
      expect(customStrategy.shouldRetry).toHaveBeenCalled();
      expect(customStrategy.getDelay).toHaveBeenCalled();
      expect(testFunction).toHaveBeenCalledTimes(2); // Custom maxAttempts
    });
  });

  describe('clearRetryHistory', () => {
    beforeEach(async () => {
      // Generate some retry history
      const testFunction = jest.fn().mockResolvedValue('success');
      const context: TestRetryContext = {
        testName: 'history test',
        testFile: 'history.spec.ts',
        isFlaky: true,
        flakinessScore: 0.3
      };

      await retryManager.executeWithRetry(testFunction, context);
    });

    it('should clear specific test history', () => {
      let stats = retryManager.getRetryStats('history test', 'history.spec.ts');
      expect(stats.totalRetries).toBeGreaterThan(0);

      retryManager.clearRetryHistory('history test', 'history.spec.ts');

      stats = retryManager.getRetryStats('history test', 'history.spec.ts');
      expect(stats.totalRetries).toBe(0);
    });

    it('should clear all history', () => {
      retryManager.clearRetryHistory();

      const stats = retryManager.getRetryStats('history test', 'history.spec.ts');
      expect(stats.totalRetries).toBe(0);
    });
  });

  describe('error categorization', () => {
    it('should categorize different error types', async () => {
      const errorTypes = [
        'Timeout error occurred',
        'Network connection failed',
        'Out of memory',
        'Race condition detected',
        'Async operation failed',
        'Assertion failed',
        'Unknown error'
      ];

      for (const errorMessage of errorTypes) {
        const testFunction = jest.fn().mockRejectedValue(new Error(errorMessage));
        const context: TestRetryContext = {
          testName: `error test ${errorMessage}`,
          testFile: 'error.spec.ts',
          isFlaky: true,
          flakinessScore: 0.3
        };

        try {
          await retryManager.executeWithRetry(testFunction, context);
        } catch {
          // Expected to fail
        }

        const stats = retryManager.getRetryStats(`error test ${errorMessage}`, 'error.spec.ts');
        expect(stats.mostCommonErrors).toBeDefined();
      }
    });
  });

  describe('retry strategies', () => {
    it('should use different strategies based on flakiness score', async () => {
      const contexts = [
        { testName: 'low flaky', testFile: 'low.spec.ts', isFlaky: true, flakinessScore: 0.2 },
        { testName: 'high flaky', testFile: 'high.spec.ts', isFlaky: true, flakinessScore: 0.8 }
      ];

      for (const context of contexts) {
        let attempts = 0;
        const testFunction = jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 6) { // Ensure it fails enough times to test max attempts
            throw new Error('Temporary failure');
          }
          return Promise.resolve('success');
        });

        try {
          await retryManager.executeWithRetry(testFunction, context);
        } catch {
          // May fail due to max attempts
        }

        // High flakiness should allow more attempts
        if (context.flakinessScore > 0.5) {
          expect(testFunction).toHaveBeenCalledTimes(6); // Should try more times
        }
      }
    });
  });
});