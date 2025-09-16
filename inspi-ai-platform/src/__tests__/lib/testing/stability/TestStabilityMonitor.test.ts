/**
 * Test Stability Monitor Tests
 */

import { TestStabilityMonitor, TestExecutionRecord } from '../../../../lib/testing/stability/TestStabilityMonitor';

describe('TestStabilityMonitor', () => {
  let monitor: TestStabilityMonitor;

  beforeEach(() => {
    monitor = new TestStabilityMonitor({
      minRunsForAnalysis: 5,
      flakinessThreshold: 0.2,
      analysisWindowDays: 7
    }, false); // Disable persistence for tests
  });

  describe('recordTestExecution', () => {
    it('should record test execution', () => {
      const record: TestExecutionRecord = {
        testName: 'sample test',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      monitor.recordTestExecution(record);
      
      const metrics = monitor.getTestStabilityMetrics('sample test', 'test.spec.ts');
      expect(metrics).toBeNull(); // Not enough runs yet
    });

    it('should track multiple executions', () => {
      const baseRecord: TestExecutionRecord = {
        testName: 'sample test',
        testFile: 'test.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      // Record 6 executions (above minimum threshold)
      for (let i = 0; i < 6; i++) {
        monitor.recordTestExecution({
          ...baseRecord,
          status: i === 2 ? 'failed' : 'passed', // One failure
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      const metrics = monitor.getTestStabilityMetrics('sample test', 'test.spec.ts');
      expect(metrics).not.toBeNull();
      expect(metrics!.totalRuns).toBe(6);
      expect(metrics!.passCount).toBe(5);
      expect(metrics!.failCount).toBe(1);
    });
  });

  describe('getTestStabilityMetrics', () => {
    beforeEach(() => {
      // Setup test data
      const baseRecord: TestExecutionRecord = {
        testName: 'flaky test',
        testFile: 'flaky.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      // Create alternating pass/fail pattern
      for (let i = 0; i < 10; i++) {
        monitor.recordTestExecution({
          ...baseRecord,
          status: i % 2 === 0 ? 'passed' : 'failed',
          duration: 100 + (i * 10), // Varying duration
          timestamp: new Date(Date.now() + i * 1000)
        });
      }
    });

    it('should calculate flakiness score correctly', () => {
      const metrics = monitor.getTestStabilityMetrics('flaky test', 'flaky.spec.ts');
      
      expect(metrics).not.toBeNull();
      expect(metrics!.flakinessScore).toBeGreaterThan(0.4); // High flakiness due to alternating pattern
      expect(metrics!.isFlaky).toBe(true);
    });

    it('should calculate duration metrics', () => {
      const metrics = monitor.getTestStabilityMetrics('flaky test', 'flaky.spec.ts');
      
      expect(metrics).not.toBeNull();
      expect(metrics!.averageDuration).toBeGreaterThan(0);
      expect(metrics!.durationVariance).toBeGreaterThan(0);
    });

    it('should detect stability trend', () => {
      const metrics = monitor.getTestStabilityMetrics('flaky test', 'flaky.spec.ts');
      
      expect(metrics).not.toBeNull();
      expect(['improving', 'degrading', 'stable']).toContain(metrics!.stabilityTrend);
    });
  });

  describe('getFlakyTests', () => {
    beforeEach(() => {
      // Create stable test
      const stableRecord: TestExecutionRecord = {
        testName: 'stable test',
        testFile: 'stable.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      for (let i = 0; i < 10; i++) {
        monitor.recordTestExecution({
          ...stableRecord,
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      // Create flaky test
      const flakyRecord: TestExecutionRecord = {
        testName: 'flaky test',
        testFile: 'flaky.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      for (let i = 0; i < 10; i++) {
        monitor.recordTestExecution({
          ...flakyRecord,
          status: i % 3 === 0 ? 'failed' : 'passed', // 33% failure rate
          timestamp: new Date(Date.now() + i * 1000)
        });
      }
    });

    it('should identify flaky tests', () => {
      const flakyTests = monitor.getFlakyTests();
      
      expect(flakyTests).toHaveLength(1);
      expect(flakyTests[0].testName).toBe('flaky test');
      expect(flakyTests[0].isFlaky).toBe(true);
    });

    it('should sort flaky tests by flakiness score', () => {
      // Add another flaky test with different flakiness
      const anotherFlakyRecord: TestExecutionRecord = {
        testName: 'very flaky test',
        testFile: 'very-flaky.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      for (let i = 0; i < 10; i++) {
        monitor.recordTestExecution({
          ...anotherFlakyRecord,
          status: i % 2 === 0 ? 'failed' : 'passed', // 50% failure rate
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      const flakyTests = monitor.getFlakyTests();
      
      expect(flakyTests).toHaveLength(2);
      expect(flakyTests[0].flakinessScore).toBeGreaterThanOrEqual(flakyTests[1].flakinessScore);
    });
  });

  describe('getStabilitySummary', () => {
    beforeEach(() => {
      // Create mix of stable and flaky tests
      const tests = [
        { name: 'stable1', file: 'stable1.spec.ts', failureRate: 0 },
        { name: 'stable2', file: 'stable2.spec.ts', failureRate: 0 },
        { name: 'flaky1', file: 'flaky1.spec.ts', failureRate: 0.3 },
        { name: 'flaky2', file: 'flaky2.spec.ts', failureRate: 0.5 }
      ];

      tests.forEach(test => {
        for (let i = 0; i < 10; i++) {
          monitor.recordTestExecution({
            testName: test.name,
            testFile: test.file,
            status: Math.random() < test.failureRate ? 'failed' : 'passed',
            duration: 100,
            timestamp: new Date(Date.now() + i * 1000),
            environment: {
              nodeVersion: 'v18.0.0',
              platform: 'linux',
              ci: false
            }
          });
        }
      });
    });

    it('should provide accurate summary statistics', () => {
      const summary = monitor.getStabilitySummary();
      
      expect(summary.totalTests).toBe(4);
      expect(summary.stableTests).toBeGreaterThan(0);
      expect(summary.flakyTests).toBeGreaterThan(0);
      expect(summary.overallStabilityScore).toBeGreaterThan(0);
      expect(summary.overallStabilityScore).toBeLessThanOrEqual(1);
    });

    it('should include most flaky tests', () => {
      const summary = monitor.getStabilitySummary();
      
      expect(summary.mostFlakyTests).toBeDefined();
      expect(Array.isArray(summary.mostFlakyTests)).toBe(true);
    });
  });

  describe('clearTestHistory', () => {
    beforeEach(() => {
      const record: TestExecutionRecord = {
        testName: 'test to clear',
        testFile: 'clear.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      for (let i = 0; i < 10; i++) {
        monitor.recordTestExecution({
          ...record,
          timestamp: new Date(Date.now() + i * 1000)
        });
      }
    });

    it('should clear specific test history', () => {
      let metrics = monitor.getTestStabilityMetrics('test to clear', 'clear.spec.ts');
      expect(metrics).not.toBeNull();

      monitor.clearTestHistory('test to clear', 'clear.spec.ts');
      
      metrics = monitor.getTestStabilityMetrics('test to clear', 'clear.spec.ts');
      expect(metrics).toBeNull();
    });

    it('should clear all history', () => {
      let summary = monitor.getStabilitySummary();
      expect(summary.totalTests).toBeGreaterThan(0);

      monitor.clearAllHistory();
      
      summary = monitor.getStabilitySummary();
      expect(summary.totalTests).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty history gracefully', () => {
      const metrics = monitor.getTestStabilityMetrics('nonexistent', 'test.spec.ts');
      expect(metrics).toBeNull();
    });

    it('should handle tests with insufficient runs', () => {
      const record: TestExecutionRecord = {
        testName: 'insufficient runs',
        testFile: 'insufficient.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      // Record only 2 executions (below minimum threshold of 5)
      for (let i = 0; i < 2; i++) {
        monitor.recordTestExecution({
          ...record,
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      const metrics = monitor.getTestStabilityMetrics('insufficient runs', 'insufficient.spec.ts');
      expect(metrics).toBeNull();
    });

    it('should handle tests with zero duration', () => {
      const record: TestExecutionRecord = {
        testName: 'zero duration',
        testFile: 'zero.spec.ts',
        status: 'passed',
        duration: 0,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false
        }
      };

      for (let i = 0; i < 10; i++) {
        monitor.recordTestExecution({
          ...record,
          timestamp: new Date(Date.now() + i * 1000)
        });
      }

      const metrics = monitor.getTestStabilityMetrics('zero duration', 'zero.spec.ts');
      expect(metrics).not.toBeNull();
      expect(metrics!.averageDuration).toBe(0);
      expect(metrics!.durationVariance).toBe(0);
    });
  });
});