import { ErrorIsolation, TestError, IsolationPolicy } from '../../../../lib/testing/parallel/ErrorIsolation';

describe('ErrorIsolation', () => {
  let errorIsolation: ErrorIsolation;
  let mockPolicy: IsolationPolicy;

  beforeEach(() => {
    mockPolicy = {
      maxErrorsPerWorker: 3,
      maxErrorRate: 0.3,
      timeWindowMs: 60000, // 1 minute
      isolationDurationMs: 30000, // 30 seconds
      autoRestart: true
    };

    errorIsolation = new ErrorIsolation(mockPolicy);
  });

  afterEach(() => {
    errorIsolation.cleanup();
  });

  describe('worker registration', () => {
    it('should register workers correctly', () => {
      const registeredSpy = jest.fn();
      errorIsolation.on('worker:registered', registeredSpy);

      errorIsolation.registerWorker(1);
      errorIsolation.registerWorker(2);

      expect(registeredSpy).toHaveBeenCalledTimes(2);
      expect(registeredSpy).toHaveBeenCalledWith({ workerId: 1 });
      expect(registeredSpy).toHaveBeenCalledWith({ workerId: 2 });

      const allWorkers = errorIsolation.getAllWorkerHealth();
      expect(allWorkers).toHaveLength(2);
      expect(allWorkers[0].isHealthy).toBe(true);
      expect(allWorkers[1].isHealthy).toBe(true);
    });
  });

  describe('error classification', () => {
    beforeEach(() => {
      errorIsolation.registerWorker(1);
    });

    it('should classify timeout errors correctly', async () => {
      const timeoutError: TestError = {
        message: 'Test execution timed out after 30 seconds',
        type: 'runtime',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      const handledSpy = jest.fn();
      errorIsolation.on('error:handled', handledSpy);

      const result = await errorIsolation.handleError(timeoutError);

      expect(result.action).toBe('retry');
      expect(handledSpy).toHaveBeenCalledWith({
        error: expect.objectContaining({
          type: 'timeout',
          severity: 'high'
        }),
        strategy: expect.objectContaining({
          type: 'retry',
          maxAttempts: 2
        }),
        result
      });
    });

    it('should classify memory errors correctly', async () => {
      const memoryError: TestError = {
        message: 'JavaScript heap out of memory',
        type: 'runtime',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(memoryError);

      expect(result.action).toBe('restart');
      expect(result.workerId).toBe(1);
    });

    it('should classify network errors correctly', async () => {
      const networkError: TestError = {
        message: 'Network connection refused',
        type: 'runtime',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(networkError);

      expect(result.action).toBe('retry');
      expect(result.maxAttempts).toBe(3);
    });

    it('should classify assertion errors correctly', async () => {
      const assertionError: TestError = {
        message: 'Expected true but received false',
        type: 'runtime',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(assertionError);

      expect(result.action).toBe('skip');
    });

    it('should classify setup errors correctly', async () => {
      const setupError: TestError = {
        message: 'BeforeAll hook failed to initialize database',
        type: 'runtime',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(setupError);

      expect(result.action).toBe('restart');
    });
  });

  describe('worker health tracking', () => {
    beforeEach(() => {
      errorIsolation.registerWorker(1);
    });

    it('should update worker health on errors', async () => {
      const error: TestError = {
        message: 'Test failed',
        type: 'assertion',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      await errorIsolation.handleError(error);

      const workerHealth = errorIsolation.getWorkerHealth(1);
      expect(workerHealth?.errorCount).toBe(1);
      expect(workerHealth?.lastError).toEqual(expect.objectContaining({
        message: 'Test failed',
        type: 'assertion'
      }));
    });

    it('should isolate worker after exceeding error threshold', async () => {
      const isolatedSpy = jest.fn();
      errorIsolation.on('worker:isolated', isolatedSpy);

      // Generate errors exceeding threshold
      for (let i = 0; i < mockPolicy.maxErrorsPerWorker + 1; i++) {
        const error: TestError = {
          message: `Test failed ${i}`,
          type: 'assertion',
          severity: 'low',
          workerId: 1,
          timestamp: Date.now()
        };

        await errorIsolation.handleError(error);
      }

      expect(isolatedSpy).toHaveBeenCalledWith({
        workerId: 1,
        reason: 'High error rate',
        isolatedUntil: expect.any(Number)
      });

      expect(errorIsolation.isWorkerHealthy(1)).toBe(false);
    });

    it('should isolate worker based on error rate', async () => {
      const isolatedSpy = jest.fn();
      errorIsolation.on('worker:isolated', isolatedSpy);

      // Mock high error rate scenario
      const workerHealth = errorIsolation.getWorkerHealth(1);
      if (workerHealth) {
        workerHealth.errorCount = 3;
        workerHealth.errorRate = 0.4; // Above threshold
      }

      const error: TestError = {
        message: 'Test failed',
        type: 'assertion',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      await errorIsolation.handleError(error);

      expect(isolatedSpy).toHaveBeenCalled();
    });

    it('should auto-recover isolated workers', (done) => {
      const recoveredSpy = jest.fn();
      errorIsolation.on('worker:recovered', recoveredSpy);

      // Use very short isolation duration for testing
      const shortIsolationPolicy = { ...mockPolicy, isolationDurationMs: 100 };
      const shortErrorIsolation = new ErrorIsolation(shortIsolationPolicy);
      shortErrorIsolation.registerWorker(1);
      shortErrorIsolation.on('worker:recovered', recoveredSpy);

      // Force isolation
      const workerHealth = shortErrorIsolation.getWorkerHealth(1);
      if (workerHealth) {
        workerHealth.isHealthy = false;
        workerHealth.isolatedUntil = Date.now() + 100;
      }

      // Manually trigger recovery for testing
      setTimeout(() => {
        shortErrorIsolation['recoverWorker'](1);
        
        expect(recoveredSpy).toHaveBeenCalledWith({
          workerId: 1,
          restartCount: 1
        });
        
        expect(shortErrorIsolation.isWorkerHealthy(1)).toBe(true);
        shortErrorIsolation.cleanup();
        done();
      }, 150);
    });
  });

  describe('recovery strategies', () => {
    beforeEach(() => {
      errorIsolation.registerWorker(1);
    });

    it('should execute retry strategy with backoff', async () => {
      const error: TestError = {
        message: 'Network timeout occurred',
        type: 'network',
        severity: 'medium',
        workerId: 1,
        timestamp: Date.now()
      };

      const startTime = Date.now();
      const result = await errorIsolation.handleError(error);
      const endTime = Date.now();

      expect(result.action).toBe('retry');
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000); // 2s backoff
    });

    it('should execute restart strategy', async () => {
      const restartSpy = jest.fn();
      errorIsolation.on('worker:restart_requested', restartSpy);

      const error: TestError = {
        message: 'Out of memory error',
        type: 'memory',
        severity: 'critical',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(error);

      expect(result.action).toBe('restart');
      expect(restartSpy).toHaveBeenCalledWith({
        workerId: 1,
        reason: 'Out of memory error'
      });
    });

    it('should execute isolate strategy', async () => {
      const isolatedSpy = jest.fn();
      errorIsolation.on('worker:isolated', isolatedSpy);

      const error: TestError = {
        message: 'Critical runtime error',
        type: 'runtime',
        severity: 'critical',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(error);

      expect(result.action).toBe('isolate');
      expect(isolatedSpy).toHaveBeenCalled();
    });

    it('should execute skip strategy', async () => {
      const error: TestError = {
        message: 'Assertion failed',
        type: 'assertion',
        severity: 'low',
        workerId: 1,
        testName: 'failing-test',
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(error);

      expect(result.action).toBe('skip');
      expect(result.testName).toBe('failing-test');
    });
  });

  describe('error statistics', () => {
    beforeEach(() => {
      errorIsolation.registerWorker(1);
      errorIsolation.registerWorker(2);
    });

    it('should provide comprehensive error statistics', async () => {
      const errors: TestError[] = [
        {
          message: 'Timeout error',
          type: 'timeout',
          severity: 'high',
          workerId: 1,
          timestamp: Date.now()
        },
        {
          message: 'Assertion error',
          type: 'assertion',
          severity: 'low',
          workerId: 1,
          timestamp: Date.now()
        },
        {
          message: 'Memory error',
          type: 'memory',
          severity: 'critical',
          workerId: 2,
          timestamp: Date.now()
        }
      ];

      for (const error of errors) {
        await errorIsolation.handleError(error);
      }

      const stats = errorIsolation.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.get('timeout')).toBe(1);
      expect(stats.errorsByType.get('assertion')).toBe(1);
      expect(stats.errorsByType.get('memory')).toBe(1);
      expect(stats.errorsBySeverity.get('high')).toBe(1);
      expect(stats.errorsBySeverity.get('low')).toBe(1);
      expect(stats.errorsBySeverity.get('critical')).toBe(1);
      expect(stats.errorsByWorker.get(1)).toBe(2);
      expect(stats.errorsByWorker.get(2)).toBe(1);
    });

    it('should filter errors by time window', async () => {
      // Add old error (outside time window)
      const oldError: TestError = {
        message: 'Old error',
        type: 'assertion',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now() - (mockPolicy.timeWindowMs + 10000) // Outside window
      };

      // Add recent error
      const recentError: TestError = {
        message: 'Recent error',
        type: 'timeout',
        severity: 'high',
        workerId: 1,
        timestamp: Date.now()
      };

      // Manually add to history to simulate old error
      errorIsolation['errorHistory'].push(oldError);
      await errorIsolation.handleError(recentError);

      const stats = errorIsolation.getErrorStatistics();

      // Should only count recent error
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.get('timeout')).toBe(1);
      expect(stats.errorsByType.has('assertion')).toBe(false);
    });
  });

  describe('custom error patterns', () => {
    it('should allow adding custom error patterns', async () => {
      const patternSpy = jest.fn();
      errorIsolation.on('pattern:added', patternSpy);

      errorIsolation.addErrorPattern({
        id: 'custom-db-error',
        pattern: /database.*connection.*lost/i,
        type: 'network',
        severity: 'high',
        description: 'Database connection lost',
        recovery: { type: 'retry', maxAttempts: 5, backoffMs: 3000 }
      });

      expect(patternSpy).toHaveBeenCalledWith({
        patternId: 'custom-db-error'
      });

      errorIsolation.registerWorker(1);

      const dbError: TestError = {
        message: 'Database connection lost unexpectedly',
        type: 'runtime',
        severity: 'low',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(dbError);

      expect(result.action).toBe('retry');
      expect(result.maxAttempts).toBe(5);
    });
  });

  describe('policy updates', () => {
    it('should allow updating isolation policy', () => {
      const policySpy = jest.fn();
      errorIsolation.on('policy:updated', policySpy);

      const newPolicy = {
        maxErrorsPerWorker: 5,
        maxErrorRate: 0.4
      };

      errorIsolation.updatePolicy(newPolicy);

      expect(policySpy).toHaveBeenCalledWith({
        policy: expect.objectContaining(newPolicy)
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      errorIsolation.registerWorker(1);
      errorIsolation.registerWorker(2);

      // Add some error history
      errorIsolation['errorHistory'].push({
        message: 'Test error',
        type: 'assertion',
        severity: 'low',
        timestamp: Date.now()
      });

      expect(errorIsolation.getAllWorkerHealth()).toHaveLength(2);
      expect(errorIsolation['errorHistory']).toHaveLength(1);

      errorIsolation.cleanup();

      expect(errorIsolation.getAllWorkerHealth()).toHaveLength(0);
      expect(errorIsolation['errorHistory']).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle errors for unregistered workers', async () => {
      const error: TestError = {
        message: 'Error from unknown worker',
        type: 'assertion',
        severity: 'low',
        workerId: 999, // Unregistered worker
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(error);

      expect(result.action).toBe('skip');
      expect(result.success).toBe(true);
    });

    it('should handle errors without worker ID', async () => {
      const error: TestError = {
        message: 'General error',
        type: 'assertion',
        severity: 'low',
        timestamp: Date.now()
        // No workerId
      };

      const result = await errorIsolation.handleError(error);

      expect(result.action).toBe('skip');
      expect(result.success).toBe(true);
    });

    it('should handle unknown error types', async () => {
      errorIsolation.registerWorker(1);

      const unknownError: TestError = {
        message: 'Unknown error type',
        type: 'unknown' as any,
        severity: 'medium',
        workerId: 1,
        timestamp: Date.now()
      };

      const result = await errorIsolation.handleError(unknownError);

      expect(result.action).toBe('skip');
      expect(result.success).toBe(false);
    });
  });
});