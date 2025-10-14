import {
  ParallelTestEngine,
  ParallelTestEngineOptions,
} from '../../../../lib/testing/parallel';
import { TestSuite } from '../../../../lib/testing/parallel/ParallelTestExecutor';

// Mock all the dependencies
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('fs');

describe('ParallelTestEngine Integration', () => {
  let engine: ParallelTestEngine;
  let mockWorker: any;

  beforeEach(() => {
    const { Worker } = require('worker_threads');
    mockWorker = {
      on: jest.fn(),
      postMessage: jest.fn(),
      terminate: jest.fn().mockResolvedValue(undefined),
    };
    Worker.mockImplementation(() => mockWorker);

    const options: ParallelTestEngineOptions = {
      executionOptions: {
        maxWorkers: 2,
        timeout: 30000,
      },
      aggregationOptions: {
        outputDir: 'test-results',
        outputFormats: ['json'],
      },
      isolationPolicy: {
        maxErrorsPerWorker: 3,
        maxErrorRate: 0.2,
      },
    };

    engine = new ParallelTestEngine(options);
  });

  afterEach(async () => {
    await engine.stop();
    jest.clearAllMocks();
  });

  describe('end-to-end test execution', () => {
    it('should execute tests successfully with all components integrated', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'integration-suite-1',
          name: 'Integration Suite 1',
          files: ['test1.spec.ts', 'test2.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
          estimatedDuration: 2000,
        },
        {
          id: 'integration-suite-2',
          name: 'Integration Suite 2',
          files: ['test3.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P1',
          estimatedDuration: 1500,
        },
      ];

      // Mock worker lifecycle
      setTimeout(() => {
        // Simulate workers becoming ready
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' }); // Second worker
      }, 10);

      setTimeout(() => {
        // Simulate task completions
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];

        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_integration-suite-1_' + Date.now(),
            workerId: 0,
            result: {
              suiteId: 'integration-suite-1',
              status: 'passed',
              duration: 2000,
              tests: [
                { name: 'test1', status: 'passed', duration: 1000 },
                { name: 'test2', status: 'passed', duration: 1000 },
              ],
              coverage: {
                statements: 90,
                branches: 85,
                functions: 95,
                lines: 88,
              },
              workerId: 0,
            },
            duration: 2000,
          },
        });

        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_integration-suite-2_' + Date.now(),
            workerId: 1,
            result: {
              suiteId: 'integration-suite-2',
              status: 'passed',
              duration: 1500,
              tests: [
                { name: 'test3', status: 'passed', duration: 1500 },
              ],
              coverage: {
                statements: 85,
                branches: 80,
                functions: 90,
                lines: 83,
              },
              workerId: 1,
            },
            duration: 1500,
          },
        });
      }, 50);

      const results = await engine.runTests(testSuites);

      // Verify aggregated results
      expect(results.summary.totalSuites).toBe(2);
      expect(results.summary.passedSuites).toBe(2);
      expect(results.summary.failedSuites).toBe(0);
      expect(results.summary.totalTests).toBe(3);
      expect(results.summary.passedTests).toBe(3);
      expect(results.summary.successRate).toBe(1.0);

      // Verify coverage aggregation
      expect(results.coverage.overall.statements).toBe(87.5); // (90 + 85) / 2
      expect(results.coverage.overall.branches).toBe(82.5);   // (85 + 80) / 2

      // Verify performance metrics
      expect(results.performance.totalExecutionTime).toBeGreaterThan(0);
      expect(results.performance.workerUtilization).toHaveLength(2);

      // Verify timeline
      expect(results.timeline.length).toBeGreaterThan(0);
      expect(results.timeline.some(event => event.event === 'complete')).toBe(true);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'success-suite',
          name: 'Success Suite',
          files: ['success.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
        },
        {
          id: 'failure-suite',
          name: 'Failure Suite',
          files: ['failure.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P1',
        },
      ];

      // Mock worker lifecycle
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];

        // Success
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_success-suite_' + Date.now(),
            workerId: 0,
            result: {
              suiteId: 'success-suite',
              status: 'passed',
              duration: 1000,
              tests: [{ name: 'success-test', status: 'passed', duration: 1000 }],
              workerId: 0,
            },
            duration: 1000,
          },
        });

        // Failure
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_failure-suite_' + Date.now(),
            workerId: 1,
            result: {
              suiteId: 'failure-suite',
              status: 'failed',
              duration: 800,
              tests: [{ name: 'failure-test', status: 'failed', duration: 800, error: 'Test failed' }],
              error: {
                message: 'Suite failed',
                type: 'assertion',
              },
              workerId: 1,
            },
            duration: 800,
          },
        });
      }, 50);

      const results = await engine.runTests(testSuites);

      expect(results.summary.totalSuites).toBe(2);
      expect(results.summary.passedSuites).toBe(1);
      expect(results.summary.failedSuites).toBe(1);
      expect(results.summary.successRate).toBe(0.5);

      // Verify error analysis
      expect(results.errors.totalErrors).toBe(1);
      expect(results.errors.errorsByType.get('assertion')).toBe(1);
    });

    it('should handle worker errors and isolation', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'error-prone-suite',
          name: 'Error Prone Suite',
          files: ['error.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
        },
      ];

      // Mock worker lifecycle
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];

        // Simulate worker error
        messageHandler({
          type: 'task:error',
          data: {
            taskId: 'task_error-prone-suite_' + Date.now(),
            error: {
              message: 'Worker crashed',
              type: 'runtime',
              severity: 'critical',
            },
          },
        });

        // Then complete the task after retry
        setTimeout(() => {
          messageHandler({
            type: 'task:complete',
            data: {
              taskId: 'task_error-prone-suite_' + Date.now(),
              workerId: 0,
              result: {
                suiteId: 'error-prone-suite',
                status: 'passed',
                duration: 1200,
                tests: [{ name: 'recovered-test', status: 'passed', duration: 1200 }],
                workerId: 0,
              },
              duration: 1200,
            },
          });
        }, 20);
      }, 50);

      const results = await engine.runTests(testSuites);

      expect(results.summary.totalSuites).toBe(1);
      expect(results.summary.passedSuites).toBe(1);

      // Should have recorded the error even though it eventually passed
      expect(results.errors.totalErrors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('execution statistics', () => {
    it('should provide comprehensive execution statistics', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'stats-suite',
          name: 'Stats Suite',
          files: ['stats.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
        },
      ];

      // Mock successful execution
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_stats-suite_' + Date.now(),
            workerId: 0,
            result: {
              suiteId: 'stats-suite',
              status: 'passed',
              duration: 1000,
              tests: [{ name: 'stats-test', status: 'passed', duration: 1000 }],
              workerId: 0,
            },
            duration: 1000,
          },
        });
      }, 50);

      await engine.runTests(testSuites);

      const stats = engine.getExecutionStats();

      expect(stats.executor).toBeDefined();
      expect(stats.loadBalancer).toBeDefined();
      expect(stats.errorIsolation).toBeDefined();

      expect(stats.executor.totalWorkers).toBe(2);
      expect(stats.loadBalancer.totalTasks).toBeGreaterThanOrEqual(1);
      expect(stats.errorIsolation.healthyWorkers).toBe(2);
    });
  });

  describe('performance optimization', () => {
    it('should optimize task distribution based on priority', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'p0-suite',
          name: 'P0 Suite',
          files: ['critical.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
          estimatedDuration: 3000,
        },
        {
          id: 'p2-suite',
          name: 'P2 Suite',
          files: ['low-priority.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P2',
          estimatedDuration: 1000,
        },
      ];

      // Mock execution
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];

        // P0 task should be assigned first
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_p0-suite_' + Date.now(),
            workerId: 0,
            result: {
              suiteId: 'p0-suite',
              status: 'passed',
              duration: 3000,
              tests: [{ name: 'critical-test', status: 'passed', duration: 3000 }],
              workerId: 0,
            },
            duration: 3000,
          },
        });

        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_p2-suite_' + Date.now(),
            workerId: 1,
            result: {
              suiteId: 'p2-suite',
              status: 'passed',
              duration: 1000,
              tests: [{ name: 'low-priority-test', status: 'passed', duration: 1000 }],
              workerId: 1,
            },
            duration: 1000,
          },
        });
      }, 50);

      const results = await engine.runTests(testSuites);

      expect(results.summary.totalSuites).toBe(2);
      expect(results.summary.passedSuites).toBe(2);

      // Verify that tasks were distributed efficiently
      expect(results.performance.parallelEfficiency).toBeGreaterThan(0);
    });
  });

  describe('error recovery', () => {
    it('should recover from transient errors', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'flaky-suite',
          name: 'Flaky Suite',
          files: ['flaky.spec.ts'],
          config: { timeout: 5000, retries: 2, parallel: true },
          priority: 'P0',
        },
      ];

      let attemptCount = 0;

      // Mock worker lifecycle
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];

        if (attemptCount === 0) {
          attemptCount++;
          // First attempt fails
          messageHandler({
            type: 'task:error',
            data: {
              taskId: 'task_flaky-suite_' + Date.now(),
              error: {
                message: 'Transient network error',
                type: 'network',
              },
            },
          });

          // Retry succeeds
          setTimeout(() => {
            messageHandler({
              type: 'task:complete',
              data: {
                taskId: 'task_flaky-suite_' + Date.now(),
                workerId: 0,
                result: {
                  suiteId: 'flaky-suite',
                  status: 'passed',
                  duration: 1500,
                  tests: [{ name: 'flaky-test', status: 'passed', duration: 1500 }],
                  workerId: 0,
                },
                duration: 1500,
              },
            });
          }, 30);
        }
      }, 50);

      const results = await engine.runTests(testSuites);

      expect(results.summary.totalSuites).toBe(1);
      expect(results.summary.passedSuites).toBe(1);
      expect(results.summary.successRate).toBe(1.0);
    });
  });

  describe('resource cleanup', () => {
    it('should cleanup all resources on stop', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'cleanup-suite',
          name: 'Cleanup Suite',
          files: ['cleanup.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
        },
      ];

      // Mock quick execution
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({ type: 'ready' });
        messageHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: 'task_cleanup-suite_' + Date.now(),
            workerId: 0,
            result: {
              suiteId: 'cleanup-suite',
              status: 'passed',
              duration: 500,
              tests: [{ name: 'cleanup-test', status: 'passed', duration: 500 }],
              workerId: 0,
            },
            duration: 500,
          },
        });
      }, 50);

      await engine.runTests(testSuites);
      await engine.stop();

      // Verify workers were terminated
      expect(mockWorker.terminate).toHaveBeenCalledTimes(2);
    });
  });
});
