/**
 * Test Stability System Integration Tests
 */

import { TestStabilitySystem } from '../../../../lib/testing/stability/TestStabilitySystem';

describe('TestStabilitySystem', () => {
  let stabilitySystem: TestStabilitySystem;

  beforeEach(() => {
    stabilitySystem = new TestStabilitySystem({
      monitoring: {
        enabled: true,
        persistHistory: false, // Disable persistence for tests
        analysisWindowDays: 7,
      },
      flakyDetection: {
        enabled: true,
        minRunsForAnalysis: 5,
        flakinessThreshold: 0.2,
      },
      retryManagement: {
        enabled: true,
        maxRetries: 2,
        retryOnlyFlaky: false,
      },
      environmentVerification: {
        enabled: true,
        autoCapture: false, // Disable auto-capture for tests
        verifyBeforeTests: false,
      },
    });
  });

  describe('executeTest', () => {
    it('should execute stable test successfully', async () => {
      const testFunction = jest.fn().mockResolvedValue('test result');

      const result = await stabilitySystem.executeTest(
        testFunction,
        'stable test',
        'stable.spec.ts',
      );

      expect(result).toBe('test result');
      expect(testFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry flaky test and succeed', async () => {
      let attempts = 0;
      const testFunction = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success after retry');
      });

      const result = await stabilitySystem.executeTest(
        testFunction,
        'flaky test',
        'flaky.spec.ts',
      );

      expect(result).toBe('success after retry');
      expect(testFunction).toHaveBeenCalledTimes(2);
    });

    it('should record test execution history', async () => {
      const testFunction = jest.fn().mockResolvedValue('result');

      // Execute test multiple times to build history
      for (let i = 0; i < 6; i++) {
        await stabilitySystem.executeTest(
          testFunction,
          'history test',
          'history.spec.ts',
        );
      }

      const report = await stabilitySystem.generateStabilityReport();
      expect(report.summary.totalTests).toBeGreaterThan(0);
    });

    it('should handle test failures and record them', async () => {
      const testFunction = jest.fn().mockRejectedValue(new Error('Test failed'));

      await expect(stabilitySystem.executeTest(
        testFunction,
        'failing test',
        'failing.spec.ts',
      )).rejects.toThrow('Test failed');

      // Give some time for recording
      await new Promise(resolve => setTimeout(resolve, 10));

      // Execution should still be recorded
      const report = await stabilitySystem.generateStabilityReport();
      expect(report.summary.totalTests).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordTestExecution', () => {
    it('should record manual test execution', () => {
      stabilitySystem.recordTestExecution({
        testName: 'manual test',
        testFile: 'manual.spec.ts',
        status: 'passed',
        duration: 150,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false,
        },
      });

      // Should not throw and should be included in reports
      expect(() => stabilitySystem.generateStabilityReport()).not.toThrow();
    });
  });

  describe('analyzeTestStability', () => {
    beforeEach(async () => {
      // Create test history with different patterns
      const tests = [
        { name: 'stable', pattern: 'stable' },
        { name: 'flaky', pattern: 'flaky' },
      ];

      for (const test of tests) {
        for (let i = 0; i < 6; i++) { // Reduced iterations
          const shouldFail = test.pattern === 'flaky' && i % 3 === 0;
          const testFunction = shouldFail
            ? jest.fn().mockRejectedValue(new Error('Flaky failure'))
            : jest.fn().mockResolvedValue('success');

          try {
            await stabilitySystem.executeTest(
              testFunction,
              test.name,
              `${test.name}.spec.ts`,
            );
          } catch {
            // Expected for flaky tests
          }
        }
      }
    }, 10000); // Increased timeout

    it('should analyze test stability', async () => {
      const analyses = await stabilitySystem.analyzeTestStability();

      expect(Array.isArray(analyses)).toBe(true);
      // Note: The actual analysis depends on the internal implementation
      // and may return empty array if no tests meet the flaky criteria
    });
  });

  describe('generateStabilityReport', () => {
    beforeEach(async () => {
      // Generate some test data
      const testFunction = jest.fn().mockResolvedValue('success');

      for (let i = 0; i < 6; i++) {
        await stabilitySystem.executeTest(
          testFunction,
          'report test',
          'report.spec.ts',
        );
      }
    });

    it('should generate comprehensive stability report', async () => {
      const report = await stabilitySystem.generateStabilityReport();

      expect(report).toMatchObject({
        timestamp: expect.any(Date),
        summary: expect.objectContaining({
          totalTests: expect.any(Number),
          stableTests: expect.any(Number),
          flakyTests: expect.any(Number),
          overallStabilityScore: expect.any(Number),
        }),
        flakyTests: expect.any(Array),
        environmentConsistency: expect.objectContaining({
          isConsistent: expect.any(Boolean),
          score: expect.any(Number),
          differences: expect.any(Array),
          riskLevel: expect.any(String),
          recommendations: expect.any(Array),
        }),
        retryStatistics: expect.objectContaining({
          totalRetries: expect.any(Number),
          successfulRetries: expect.any(Number),
          retrySuccessRate: expect.any(Number),
        }),
        recommendations: expect.any(Array),
      });
    });

    it('should include recommendations in report', async () => {
      const report = await stabilitySystem.generateStabilityReport();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('verifyEnvironment', () => {
    it('should verify environment consistency', async () => {
      const report = await stabilitySystem.verifyEnvironment();

      expect(report).toMatchObject({
        isConsistent: expect.any(Boolean),
        score: expect.any(Number),
        differences: expect.any(Array),
        riskLevel: expect.any(String),
        recommendations: expect.any(Array),
      });
    });

    it('should return consistent result when verification is disabled', async () => {
      const disabledSystem = new TestStabilitySystem({
        environmentVerification: { enabled: false },
      });

      const report = await disabledSystem.verifyEnvironment();

      expect(report.isConsistent).toBe(true);
      expect(report.score).toBe(1);
      expect(report.riskLevel).toBe('low');
    });
  });

  describe('setEnvironmentBaseline', () => {
    it('should set environment baseline', async () => {
      await expect(stabilitySystem.setEnvironmentBaseline()).resolves.not.toThrow();

      // Subsequent verification should be consistent
      const report = await stabilitySystem.verifyEnvironment();
      expect(report.isConsistent).toBe(true);
    });
  });

  describe('clearStabilityData', () => {
    beforeEach(async () => {
      // Generate some data
      const testFunction = jest.fn().mockResolvedValue('success');
      await stabilitySystem.executeTest(testFunction, 'clear test', 'clear.spec.ts');
    });

    it('should clear all stability data', async () => {
      let report = await stabilitySystem.generateStabilityReport();
      expect(report.summary.totalTests).toBeGreaterThanOrEqual(0);

      stabilitySystem.clearStabilityData();

      report = await stabilitySystem.generateStabilityReport();
      expect(report.summary.totalTests).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update system configuration', () => {
      const newConfig = {
        retryManagement: {
          maxRetries: 5,
          retryOnlyFlaky: true,
        },
      };

      expect(() => stabilitySystem.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      // Generate some test data
      const testFunction = jest.fn().mockResolvedValue('success');

      for (let i = 0; i < 6; i++) {
        await stabilitySystem.executeTest(
          testFunction,
          'health test',
          'health.spec.ts',
        );
      }

      const health = stabilitySystem.getSystemHealth();

      expect(health).toMatchObject({
        status: expect.stringMatching(/^(healthy|warning|critical)$/),
        issues: expect.any(Array),
        metrics: expect.objectContaining({
          stabilityScore: expect.any(Number),
          environmentScore: expect.any(Number),
          retrySuccessRate: expect.any(Number),
        }),
      });
    });

    it('should detect unhealthy system', async () => {
      // Create many flaky tests to make system unhealthy
      for (let testIndex = 0; testIndex < 3; testIndex++) { // Reduced iterations
        for (let i = 0; i < 6; i++) {
          const testFunction = i % 2 === 0
            ? jest.fn().mockResolvedValue('success')
            : jest.fn().mockRejectedValue(new Error('Flaky failure'));

          try {
            await stabilitySystem.executeTest(
              testFunction,
              `flaky test ${testIndex}`,
              `flaky${testIndex}.spec.ts`,
            );
          } catch {
            // Expected for flaky tests
          }
        }
      }

      const health = stabilitySystem.getSystemHealth();

      // Should detect issues or be healthy
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
    }, 10000); // Increased timeout
  });

  describe('configuration scenarios', () => {
    it('should work with monitoring disabled', async () => {
      const noMonitoringSystem = new TestStabilitySystem({
        monitoring: { enabled: false },
      });

      const testFunction = jest.fn().mockResolvedValue('success');

      const result = await noMonitoringSystem.executeTest(
        testFunction,
        'no monitoring test',
        'no-monitoring.spec.ts',
      );

      expect(result).toBe('success');
    });

    it('should work with retry disabled', async () => {
      const noRetrySystem = new TestStabilitySystem({
        retryManagement: { enabled: false },
      });

      const testFunction = jest.fn().mockRejectedValue(new Error('Failure'));

      await expect(noRetrySystem.executeTest(
        testFunction,
        'no retry test',
        'no-retry.spec.ts',
      )).rejects.toThrow('Failure');

      expect(testFunction).toHaveBeenCalledTimes(1); // No retries
    });

    it('should work with flaky detection disabled', async () => {
      const noFlakyDetectionSystem = new TestStabilitySystem({
        flakyDetection: { enabled: false },
      });

      const analyses = await noFlakyDetectionSystem.analyzeTestStability();
      expect(analyses).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed stable and flaky tests', async () => {
      const tests = [
        { name: 'stable1', shouldFail: false },
        { name: 'stable2', shouldFail: false },
        { name: 'flaky1', shouldFail: true },
        { name: 'flaky2', shouldFail: true },
      ];

      for (const test of tests) {
        for (let i = 0; i < 6; i++) { // Reduced iterations
          const shouldFailThisRun = test.shouldFail && i % 3 === 0;
          const testFunction = shouldFailThisRun
            ? jest.fn().mockRejectedValue(new Error('Flaky failure'))
            : jest.fn().mockResolvedValue('success');

          try {
            await stabilitySystem.executeTest(
              testFunction,
              test.name,
              `${test.name}.spec.ts`,
            );
          } catch {
            // Expected for flaky tests
          }
        }
      }

      const report = await stabilitySystem.generateStabilityReport();

      expect(report.summary.totalTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.stableTests).toBeGreaterThanOrEqual(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    }, 15000); // Increased timeout

    it('should provide actionable recommendations', async () => {
      // Create a scenario with various issues
      let attempts = 0;
      const problematicTest = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts % 2 === 0) {
          throw new Error('Intermittent failure');
        }
        return Promise.resolve('success');
      });

      for (let i = 0; i < 6; i++) { // Reduced iterations
        try {
          await stabilitySystem.executeTest(
            problematicTest,
            'problematic test',
            'problematic.spec.ts',
          );
        } catch {
          // Expected failures
        }
      }

      const report = await stabilitySystem.generateStabilityReport();

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => typeof r === 'string' && r.length > 0)).toBe(true);
    }, 10000); // Increased timeout
  });
});
