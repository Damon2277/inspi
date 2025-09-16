import { ParallelTestExecutor, TestSuite, ParallelExecutionOptions } from '../../../../lib/testing/parallel/ParallelTestExecutor';
import { EventEmitter } from 'events';

// Mock worker_threads
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('ParallelTestExecutor', () => {
  let executor: ParallelTestExecutor;
  let mockWorker: any;

  beforeEach(() => {
    const { Worker } = require('worker_threads');
    mockWorker = {
      on: jest.fn(),
      postMessage: jest.fn(),
      terminate: jest.fn().mockResolvedValue(undefined)
    };
    Worker.mockImplementation(() => mockWorker);

    executor = new ParallelTestExecutor({
      maxWorkers: 2,
      timeout: 30000,
      loadBalancing: 'weighted'
    });
  });

  afterEach(async () => {
    await executor['cleanup']();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const defaultExecutor = new ParallelTestExecutor();
      expect(defaultExecutor['maxWorkers']).toBeGreaterThan(0);
      expect(defaultExecutor['options'].timeout).toBe(30000);
    });

    it('should initialize with custom options', () => {
      const options: ParallelExecutionOptions = {
        maxWorkers: 4,
        timeout: 60000,
        loadBalancing: 'round-robin'
      };
      
      const customExecutor = new ParallelTestExecutor(options);
      expect(customExecutor['maxWorkers']).toBe(4);
      expect(customExecutor['options'].timeout).toBe(60000);
    });
  });

  describe('worker management', () => {
    it('should initialize workers correctly', async () => {
      const testSuites: TestSuite[] = [{
        id: 'test-suite-1',
        name: 'Test Suite 1',
        files: ['test1.spec.ts'],
        config: { timeout: 5000, retries: 1, parallel: true },
        priority: 'P0'
      }];

      // Mock worker ready event
      setTimeout(() => {
        const readyHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        readyHandler({ type: 'ready' });
        readyHandler({ type: 'ready' }); // Second worker
      }, 10);

      // Mock task completion
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: expect.any(String),
            workerId: 0,
            result: {
              suiteId: 'test-suite-1',
              status: 'passed',
              duration: 1000,
              tests: [],
              workerId: 0
            },
            duration: 1000
          }
        });
      }, 50);

      const results = await executor.runTestsInParallel(testSuites);
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
    });

    it('should handle worker errors gracefully', async () => {
      const testSuites: TestSuite[] = [{
        id: 'test-suite-1',
        name: 'Test Suite 1',
        files: ['test1.spec.ts'],
        config: { timeout: 5000, retries: 1, parallel: true },
        priority: 'P0'
      }];

      // Mock worker ready event
      setTimeout(() => {
        const readyHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        readyHandler({ type: 'ready' });
        readyHandler({ type: 'ready' });
      }, 10);

      // Mock worker error
      setTimeout(() => {
        const errorHandler = mockWorker.on.mock.calls.find(call => call[0] === 'error')[1];
        errorHandler(new Error('Worker crashed'));
      }, 30);

      // Mock task error
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({
          type: 'task:error',
          data: {
            taskId: expect.any(String),
            error: {
              message: 'Test failed',
              type: 'runtime'
            }
          }
        });
      }, 50);

      const results = await executor.runTestsInParallel(testSuites);
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
    });
  });

  describe('load balancing', () => {
    it('should sort suites by weighted strategy', () => {
      const testSuites: TestSuite[] = [
        {
          id: 'p2-suite',
          name: 'P2 Suite',
          files: ['test1.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P2',
          estimatedDuration: 1000
        },
        {
          id: 'p0-suite',
          name: 'P0 Suite',
          files: ['test2.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0',
          estimatedDuration: 2000
        },
        {
          id: 'p1-suite',
          name: 'P1 Suite',
          files: ['test3.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P1',
          estimatedDuration: 1500
        }
      ];

      const sorted = executor['sortSuitesByLoadBalancing'](testSuites);
      
      // P0 should come first (highest priority * duration)
      expect(sorted[0].priority).toBe('P0');
      expect(sorted[1].priority).toBe('P1');
      expect(sorted[2].priority).toBe('P2');
    });

    it('should handle dynamic load balancing', () => {
      const dynamicExecutor = new ParallelTestExecutor({
        loadBalancing: 'dynamic'
      });

      const testSuites: TestSuite[] = [
        {
          id: 'simple-suite',
          name: 'Simple Suite',
          files: ['test1.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P1',
          estimatedDuration: 500
        },
        {
          id: 'complex-suite',
          name: 'Complex Suite',
          files: ['test1.spec.ts', 'test2.spec.ts', 'test3.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P1',
          estimatedDuration: 3000
        }
      ];

      const sorted = dynamicExecutor['sortSuitesByLoadBalancing'](testSuites);
      
      // Complex suite should come first (more files * longer duration)
      expect(sorted[0].id).toBe('complex-suite');
    });
  });

  describe('task execution', () => {
    it('should execute tasks in parallel', async () => {
      const testSuites: TestSuite[] = [
        {
          id: 'suite-1',
          name: 'Suite 1',
          files: ['test1.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P0'
        },
        {
          id: 'suite-2',
          name: 'Suite 2',
          files: ['test2.spec.ts'],
          config: { timeout: 5000, retries: 1, parallel: true },
          priority: 'P1'
        }
      ];

      let taskCount = 0;
      
      // Mock worker ready events
      setTimeout(() => {
        const readyHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        readyHandler({ type: 'ready' });
        readyHandler({ type: 'ready' });
      }, 10);

      // Mock task completions
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        
        // Complete first task
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: expect.any(String),
            workerId: 0,
            result: {
              suiteId: 'suite-1',
              status: 'passed',
              duration: 1000,
              tests: [{ name: 'test1', status: 'passed', duration: 500 }],
              workerId: 0
            },
            duration: 1000
          }
        });

        // Complete second task
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: expect.any(String),
            workerId: 1,
            result: {
              suiteId: 'suite-2',
              status: 'passed',
              duration: 800,
              tests: [{ name: 'test2', status: 'passed', duration: 400 }],
              workerId: 1
            },
            duration: 800
          }
        });
      }, 50);

      const results = await executor.runTestsInParallel(testSuites);
      
      expect(results).toHaveLength(2);
      expect(results.find(r => r.suiteId === 'suite-1')).toBeDefined();
      expect(results.find(r => r.suiteId === 'suite-2')).toBeDefined();
    });

    it('should handle task retries', async () => {
      const testSuites: TestSuite[] = [{
        id: 'flaky-suite',
        name: 'Flaky Suite',
        files: ['flaky.spec.ts'],
        config: { timeout: 5000, retries: 2, parallel: true },
        priority: 'P0'
      }];

      let attemptCount = 0;

      // Mock worker ready events
      setTimeout(() => {
        const readyHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        readyHandler({ type: 'ready' });
        readyHandler({ type: 'ready' });
      }, 10);

      // Mock task failure then success
      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        
        if (attemptCount === 0) {
          attemptCount++;
          // First attempt fails
          messageHandler({
            type: 'task:error',
            data: {
              taskId: expect.any(String),
              error: {
                message: 'Flaky test failed',
                type: 'assertion'
              }
            }
          });
          
          // Retry succeeds
          setTimeout(() => {
            messageHandler({
              type: 'task:complete',
              data: {
                taskId: expect.any(String),
                workerId: 0,
                result: {
                  suiteId: 'flaky-suite',
                  status: 'passed',
                  duration: 1200,
                  tests: [{ name: 'flaky-test', status: 'passed', duration: 600 }],
                  workerId: 0
                },
                duration: 1200
              }
            });
          }, 20);
        }
      }, 50);

      const results = await executor.runTestsInParallel(testSuites);
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
    });
  });

  describe('execution statistics', () => {
    it('should provide execution statistics', () => {
      // Initialize some mock worker stats
      executor['workerStats'].set(0, {
        id: 0,
        tasksCompleted: 5,
        totalDuration: 10000,
        errors: 1,
        isAvailable: true,
        currentLoad: 0
      });

      executor['workerStats'].set(1, {
        id: 1,
        tasksCompleted: 3,
        totalDuration: 6000,
        errors: 0,
        isAvailable: false,
        currentLoad: 2000
      });

      const stats = executor.getExecutionStats();
      
      expect(stats.totalWorkers).toBe(2);
      expect(stats.activeWorkers).toBe(1); // One worker is not available
      expect(stats.totalTasksCompleted).toBe(8);
      expect(stats.totalErrors).toBe(1);
      expect(stats.averageTaskDuration).toBe(2000); // 16000 / 8
      expect(stats.workerUtilization).toBe(0.5); // 1 busy worker out of 2
    });
  });

  describe('error handling', () => {
    it('should handle execution timeout', async () => {
      const shortTimeoutExecutor = new ParallelTestExecutor({
        timeout: 100 // Very short timeout
      });

      const testSuites: TestSuite[] = [{
        id: 'slow-suite',
        name: 'Slow Suite',
        files: ['slow.spec.ts'],
        config: { timeout: 5000, retries: 1, parallel: true },
        priority: 'P0'
      }];

      // Don't mock any responses to simulate hanging

      await expect(shortTimeoutExecutor.runTestsInParallel(testSuites))
        .rejects.toThrow('Task execution timeout');
    });

    it('should detect deadlock conditions', async () => {
      const testSuites: TestSuite[] = [{
        id: 'deadlock-suite',
        name: 'Deadlock Suite',
        files: ['deadlock.spec.ts'],
        config: { timeout: 5000, retries: 1, parallel: true },
        priority: 'P0'
      }];

      // Mock workers as ready but never complete tasks
      setTimeout(() => {
        const readyHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        readyHandler({ type: 'ready' });
        readyHandler({ type: 'ready' });
      }, 10);

      // Simulate all workers becoming idle without completing tasks
      setTimeout(() => {
        executor['activeTasks'].clear(); // Clear active tasks to simulate deadlock
      }, 100);

      await expect(executor.runTestsInParallel(testSuites))
        .rejects.toThrow('Task execution deadlock detected');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      const testSuites: TestSuite[] = [{
        id: 'cleanup-suite',
        name: 'Cleanup Suite',
        files: ['cleanup.spec.ts'],
        config: { timeout: 5000, retries: 1, parallel: true },
        priority: 'P0'
      }];

      // Mock successful execution
      setTimeout(() => {
        const readyHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        readyHandler({ type: 'ready' });
        readyHandler({ type: 'ready' });
      }, 10);

      setTimeout(() => {
        const messageHandler = mockWorker.on.mock.calls.find(call => call[0] === 'message')[1];
        messageHandler({
          type: 'task:complete',
          data: {
            taskId: expect.any(String),
            workerId: 0,
            result: {
              suiteId: 'cleanup-suite',
              status: 'passed',
              duration: 1000,
              tests: [],
              workerId: 0
            },
            duration: 1000
          }
        });
      }, 50);

      await executor.runTestsInParallel(testSuites);

      // Verify cleanup was called
      expect(mockWorker.terminate).toHaveBeenCalledTimes(2); // Two workers
      expect(executor['workers'].size).toBe(0);
      expect(executor['workerStats'].size).toBe(0);
      expect(executor['taskQueue']).toHaveLength(0);
      expect(executor['activeTasks'].size).toBe(0);
      expect(executor['results'].size).toBe(0);
    });
  });
});