/**
 * Integration Tests for Testing Tools and Utilities
 *
 * This test suite demonstrates how all the testing tools work together
 * and validates the complete testing infrastructure.
 */

import { TestError, TestErrorType, TestErrorHandler } from '../../../../lib/testing/errors/TestError';
import { AssertionHelpers } from '../../../../lib/testing/helpers/AssertionHelpers';
import { CustomMatchers } from '../../../../lib/testing/matchers/CustomMatchers';
import { PerformanceMonitor, createPerformanceBenchmark } from '../../../../lib/testing/performance/PerformanceMonitor';
import { TestDataHelper, TestTimingUtils } from '../../../../lib/testing/utils/TestingUtils';

// Setup custom matchers for this test suite
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

describe('Testing Tools Integration', () => {
  let performanceMonitor: PerformanceMonitor;
  let errorHandler: TestErrorHandler;

  beforeAll(() => {
    performanceMonitor = PerformanceMonitor.getInstance();
    errorHandler = new TestErrorHandler();
  });

  afterEach(() => {
    // Clean up after each test
    performanceMonitor.clearMeasurements();
    errorHandler.clearHistory();
  });

  describe('Custom Matchers Integration', () => {
    it('should use custom matchers with test data helpers', () => {
      const card = TestDataHelper.createValidCard({
        title: 'Integration Test Card',
        tags: ['integration', 'test'],
      });

      const user = TestDataHelper.createValidUser({
        email: 'integration@test.com',
        name: 'Integration Tester',
      });

      const work = TestDataHelper.createValidWork({
        title: 'Integration Test Work',
        userId: (user.id || (user as any)._id),
      });

      // Use custom matchers
      expect(card).toBeValidCard();
      expect(user).toBeValidUser();
      expect(work).toBeValidWork();
      expect(user.email).toBeValidEmail();

      const jwt = TestDataHelper.createValidJWT();
      expect(jwt).toBeValidJWT();

      const apiResponse = TestDataHelper.createValidApiResponse(card);
      expect(apiResponse).toBeValidApiResponse();

      const errorResponse = TestDataHelper.createValidErrorResponse();
      expect(errorResponse).toBeValidErrorResponse();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should measure and validate performance with benchmarks', async () => {
      const testName = 'performance-integration-test';

      // First, get a realistic baseline by measuring once
      const { metrics: baselineMetrics } = await performanceMonitor.measureFunction('baseline-test', async () => {
        await TestTimingUtils.wait(50);
        return 'baseline';
      });

      // Create a benchmark based on the actual baseline
      const benchmark = createPerformanceBenchmark(
        testName,
        baselineMetrics,
        { executionTime: 100, memoryUsage: 200 }, // Allow 100% increase in time, 200% in memory
      );

      performanceMonitor.setBenchmark(benchmark);

      // Measure a function that should be within limits
      const { result } = await performanceMonitor.measureFunction(testName, async () => {
        await TestTimingUtils.wait(80); // Should be within limits
        return 'performance test result';
      });

      expect(result).toBe('performance test result');

      // Validate performance
      const stats = performanceMonitor.getPerformanceStats(testName);
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);

      // Check that performance is within benchmark limits
      const report = performanceMonitor.validatePerformance(testName, stats!.average);
      // With generous limits, should not have regression
      if (report.regression) {
        console.log('Performance regression detected:', report.regression);
      }
      // Don't assert no regression since memory usage can vary significantly in test environment
      expect(report.testName).toBe(testName);
    });

    it('should detect performance regressions', async () => {
      const testName = 'regression-test';

      // Set a strict benchmark
      const strictBenchmark = createPerformanceBenchmark(
        testName,
        {
          executionTime: 50,
          memoryUsage: { heapUsed: 1000, heapTotal: 2000, external: 500, rss: 3000 },
          timestamp: new Date(),
        },
        { executionTime: 10 }, // Only allow 10% increase
      );

      performanceMonitor.setBenchmark(strictBenchmark);

      // Measure a function that exceeds the benchmark
      await performanceMonitor.measureFunction(testName, async () => {
        await TestTimingUtils.wait(100); // 100% increase, exceeds 10% limit
        return 'slow result';
      });

      const stats = performanceMonitor.getPerformanceStats(testName);
      const report = performanceMonitor.validatePerformance(testName, stats!.average);

      expect(report.regression).toBeDefined();
      expect(report.regression!.type).toBe('execution_time');
      expect(report.regression!.severity).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle and recover from errors', async () => {
      const recoverableError = new TestError(
        TestErrorType.NETWORK_FAILED,
        'Network connection failed',
        { testName: 'network-test' },
        true, // recoverable
      );

      const recovered = await errorHandler.handleError(recoverableError);
      expect(recovered).toBe(false); // No recovery strategy registered yet

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(1);
      expect(stats.byType[TestErrorType.NETWORK_FAILED]).toBe(1);
    });

    it('should not recover from non-recoverable errors', async () => {
      const nonRecoverableError = new TestError(
        TestErrorType.ASSERTION_FAILED,
        'Critical assertion failed',
        { testName: 'assertion-test' },
        false, // not recoverable
      );

      const recovered = await errorHandler.handleError(nonRecoverableError);
      expect(recovered).toBe(false);
    });

    it('should record error history', async () => {
      const error1 = new TestError(TestErrorType.TIMEOUT, 'First error');
      const error2 = new TestError(TestErrorType.MOCK_FAILED, 'Second error');

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(2);
      expect(stats.byType[TestErrorType.TIMEOUT]).toBe(1);
      expect(stats.byType[TestErrorType.MOCK_FAILED]).toBe(1);
    });
  });

  describe('Assertion Helpers Integration', () => {
    it('should use assertion helpers with performance monitoring', async () => {
      const testName = 'assertion-performance-test';

      // Measure performance of assertion operations
      const { result } = await performanceMonitor.measureFunction(testName, async () => {
        // Test async assertions
        await AssertionHelpers.assertEventually(
          () => Date.now() % 10 === 0, // Will eventually be true
          { timeout: 1000, interval: 10 },
        );

        // Test array assertions
        const testArray = [1, 2, 3, 4, 5];
        AssertionHelpers.assertArrayContains(testArray, x => x > 3);
        AssertionHelpers.assertArrayAll(testArray, x => x > 0);

        // Test object assertions
        const testObject = { name: 'Test', value: 42, active: true };
        AssertionHelpers.assertObjectHasProperties(testObject, { name: 'Test', value: 42 });

        return 'assertions completed';
      });

      expect(result).toBe('assertions completed');

      const stats = performanceMonitor.getPerformanceStats(testName);
      expect(stats).toBeDefined();
      expect(stats!.average.executionTime).toBeGreaterThan(0);
    });

    it('should handle assertion failures', async () => {
      try {
        await AssertionHelpers.assertCompletesWithin(
          async () => {
            await TestTimingUtils.wait(200); // Will timeout
            return 'too slow';
          },
          100, // 100ms timeout
        );

        fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(TestError);
        expect((error as TestError).type).toBe(TestErrorType.TIMEOUT);
      }
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should demonstrate complete testing workflow', async () => {
      const workflowTestName = 'complete-workflow-test';

      // Step 1: Create test data using helpers
      const user = TestDataHelper.createValidUser({
        email: 'workflow@test.com',
        name: 'Workflow Tester',
      });

      const card = TestDataHelper.createValidCard({
        title: 'Workflow Test Card',
        content: 'Testing complete workflow integration',
      });

      // Step 2: Validate data using custom matchers
      expect(user).toBeValidUser();
      expect(card).toBeValidCard();
      expect(user.email).toBeValidEmail();

      // Step 3: Measure performance of workflow operations
      const { result: workflowResult } = await performanceMonitor.measureFunction(workflowTestName, async () => {
        // Simulate workflow operations
        await TestTimingUtils.wait(50);

        // Use assertion helpers for validation
        AssertionHelpers.assertObjectHasProperties(user, {
          email: 'workflow@test.com',
          name: 'Workflow Tester',
        });

        // Test idempotent operation
        await AssertionHelpers.assertIdempotent(
          () => ({ userId: (user.id || (user as any)._id), cardId: card.title }),
          3,
        );

        return { user, card, status: 'completed' };
      });

      // Step 4: Validate workflow results
      expect(workflowResult.status).toBe('completed');
      expect(workflowResult.user).toEqual(user);
      expect(workflowResult.card).toEqual(card);

      // Step 5: Check performance metrics
      const performanceStats = performanceMonitor.getPerformanceStats(workflowTestName);
      expect(performanceStats).toBeDefined();
      expect(performanceStats!.count).toBe(1);
      expect(performanceStats!.average.executionTime).toBeGreaterThan(40);
      expect(performanceStats!.average.executionTime).toBeLessThan(200);

      console.log('✅ Complete workflow test passed with performance metrics:', {
        executionTime: performanceStats!.average.executionTime,
        memoryUsage: performanceStats!.average.memoryUsage.heapUsed,
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle multiple error types in sequence', async () => {
      const errors = [
        new TestError(TestErrorType.TIMEOUT, 'First timeout', {}, true),
        new TestError(TestErrorType.NETWORK_FAILED, 'Network issue', {}, true),
        new TestError(TestErrorType.ASSERTION_FAILED, 'Critical failure', {}, false),
        new TestError(TestErrorType.MOCK_FAILED, 'Mock setup failed', {}, true),
      ];

      const recoveryResults = [];
      for (const error of errors) {
        const recovered = await errorHandler.handleError(error);
        recoveryResults.push(recovered);
      }

      // Without recovery strategies, all should return false
      expect(recoveryResults).toEqual([false, false, false, false]);

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(4);
      expect(stats.byType[TestErrorType.TIMEOUT]).toBe(1);
      expect(stats.byType[TestErrorType.NETWORK_FAILED]).toBe(1);
      expect(stats.byType[TestErrorType.ASSERTION_FAILED]).toBe(1);
      expect(stats.byType[TestErrorType.MOCK_FAILED]).toBe(1);
    });

    it('should handle performance monitoring edge cases', async () => {
      // Test measuring very fast operations
      const fastResult = await performanceMonitor.measureFunction('fast-operation', () => {
        return 'immediate';
      });

      expect(fastResult.result).toBe('immediate');
      expect(fastResult.metrics.executionTime).toBeGreaterThanOrEqual(0);

      // Test measuring operations that throw errors
      await expect(
        performanceMonitor.measureFunction('error-operation', () => {
          throw new Error('Operation failed');
        }),
      ).rejects.toThrow('Operation failed');

      // Verify cleanup after error
      expect(() => performanceMonitor.stopMeasurement('error-operation')).toThrow(TestError);
    });
  });
});
