/**
 * Flaky Test Detector Tests
 */

import { FlakyTestDetector } from '../../../../lib/testing/stability/FlakyTestDetector';
import { TestExecutionRecord, TestStabilityMetrics } from '../../../../lib/testing/stability/TestStabilityMonitor';

describe('FlakyTestDetector', () => {
  let detector: FlakyTestDetector;

  beforeEach(() => {
    detector = new FlakyTestDetector();
  });

  const createMockHistory = (pattern: 'stable' | 'intermittent' | 'timing' | 'environmental'): TestExecutionRecord[] => {
    const baseRecord: TestExecutionRecord = {
      testName: 'test',
      testFile: 'test.spec.ts',
      status: 'passed',
      duration: 100,
      timestamp: new Date(),
      environment: {
        nodeVersion: 'v18.0.0',
        platform: 'linux',
        ci: false,
      },
    };

    const history: TestExecutionRecord[] = [];

    switch (pattern) {
      case 'stable':
        for (let i = 0; i < 20; i++) {
          history.push({
            ...baseRecord,
            timestamp: new Date(Date.now() + i * 1000),
          });
        }
        break;

      case 'intermittent':
        for (let i = 0; i < 20; i++) {
          history.push({
            ...baseRecord,
            status: i % 2 === 0 ? 'passed' : 'failed',
            timestamp: new Date(Date.now() + i * 1000),
          });
        }
        break;

      case 'timing':
        for (let i = 0; i < 20; i++) {
          history.push({
            ...baseRecord,
            duration: i % 3 === 0 ? 1000 : 100, // High variance
            status: i % 5 === 0 ? 'failed' : 'passed',
            timestamp: new Date(Date.now() + i * 1000),
          });
        }
        break;

      case 'environmental':
        for (let i = 0; i < 20; i++) {
          history.push({
            ...baseRecord,
            status: (i < 10 && i % 3 === 0) ? 'failed' : 'passed', // Failures only in first half (CI)
            environment: {
              ...baseRecord.environment,
              ci: i < 10, // First half is CI, second half is local
            },
            timestamp: new Date(Date.now() + i * 1000),
          });
        }
        break;
    }

    return history;
  };

  const createMockMetrics = (history: TestExecutionRecord[]): TestStabilityMetrics => {
    const passCount = history.filter(h => h.status === 'passed').length;
    const failCount = history.filter(h => h.status === 'failed').length;
    const durations = history.filter(h => h.duration > 0).map(h => h.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    return {
      testName: 'test',
      totalRuns: history.length,
      passCount,
      failCount,
      skipCount: 0,
      flakinessScore: failCount / history.length,
      averageDuration,
      durationVariance: 0.1, // Mock value
      consecutiveFailures: 0,
      isFlaky: failCount / history.length > 0.1,
      stabilityTrend: 'stable',
    };
  };

  describe('analyzeTest', () => {
    it('should detect stable tests', () => {
      const history = createMockHistory('stable');
      const metrics = createMockMetrics(history);

      const analysis = detector.analyzeTest('stable test', 'stable.spec.ts', history, metrics);

      expect(analysis.isFlaky).toBe(false);
      expect(analysis.confidence).toBeLessThan(0.3);
      expect(analysis.riskLevel).toBe('low');
    });

    it('should detect intermittent pattern', () => {
      const history = createMockHistory('intermittent');
      const metrics = createMockMetrics(history);

      const analysis = detector.analyzeTest('intermittent test', 'intermittent.spec.ts', history, metrics);

      expect(analysis.isFlaky).toBe(true);
      expect(analysis.patterns.some(p => p.type === 'intermittent')).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.3);
    });

    it('should detect timing issues', () => {
      const history = createMockHistory('timing');
      const metrics = {
        ...createMockMetrics(history),
        durationVariance: 0.8, // High variance
      };

      const analysis = detector.analyzeTest('timing test', 'timing.spec.ts', history, metrics);

      expect(analysis.patterns.some(p => p.type === 'timing')).toBe(true);
    });

    it('should detect environmental dependencies', () => {
      const history = createMockHistory('environmental');
      const metrics = createMockMetrics(history);

      const analysis = detector.analyzeTest('env test', 'env.spec.ts', history, metrics);

      expect(analysis.patterns.some(p => p.type === 'environmental')).toBe(true);
    });

    it('should detect race conditions from error messages', () => {
      const history: TestExecutionRecord[] = [];
      const baseRecord: TestExecutionRecord = {
        testName: 'race test',
        testFile: 'race.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false,
        },
      };

      // Add some failures with race condition indicators
      for (let i = 0; i < 15; i++) {
        history.push({
          ...baseRecord,
          status: i % 4 === 0 ? 'failed' : 'passed',
          error: i % 4 === 0 ? {
            message: 'Timeout waiting for async operation',
            type: 'TimeoutError',
          } : undefined,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      const metrics = createMockMetrics(history);
      const analysis = detector.analyzeTest('race test', 'race.spec.ts', history, metrics);

      expect(analysis.patterns.some(p => p.type === 'race_condition')).toBe(true);
    });

    it('should detect resource dependencies', () => {
      const history: TestExecutionRecord[] = [];
      const baseRecord: TestExecutionRecord = {
        testName: 'resource test',
        testFile: 'resource.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: false,
        },
      };

      // Add failures with resource-related errors
      for (let i = 0; i < 15; i++) {
        history.push({
          ...baseRecord,
          status: i % 3 === 0 ? 'failed' : 'passed',
          error: i % 3 === 0 ? {
            message: 'Out of memory error during test execution',
            type: 'MemoryError',
          } : undefined,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      const metrics = createMockMetrics(history);
      const analysis = detector.analyzeTest('resource test', 'resource.spec.ts', history, metrics);

      expect(analysis.patterns.some(p => p.type === 'resource_dependent')).toBe(true);
    });
  });

  describe('analyzeTests', () => {
    it('should analyze multiple tests', () => {
      const testsData = [
        {
          testName: 'stable test',
          testFile: 'stable.spec.ts',
          history: createMockHistory('stable'),
          metrics: createMockMetrics(createMockHistory('stable')),
        },
        {
          testName: 'flaky test',
          testFile: 'flaky.spec.ts',
          history: createMockHistory('intermittent'),
          metrics: createMockMetrics(createMockHistory('intermittent')),
        },
      ];

      const analyses = detector.analyzeTests(testsData);

      expect(analyses).toHaveLength(2);
      expect(analyses[0].testName).toBe('stable test');
      expect(analyses[1].testName).toBe('flaky test');
      expect(analyses[0].isFlaky).toBe(false);
      expect(analyses[1].isFlaky).toBe(true);
    });
  });

  describe('getFlakyTestsByRisk', () => {
    it('should categorize flaky tests by risk level', () => {
      const analyses = [
        {
          testName: 'low risk',
          testFile: 'low.spec.ts',
          isFlaky: true,
          confidence: 0.3,
          patterns: [],
          riskLevel: 'low' as const,
          stabilityScore: 0.7,
          recommendations: [],
        },
        {
          testName: 'high risk',
          testFile: 'high.spec.ts',
          isFlaky: true,
          confidence: 0.8,
          patterns: [],
          riskLevel: 'high' as const,
          stabilityScore: 0.2,
          recommendations: [],
        },
        {
          testName: 'critical risk',
          testFile: 'critical.spec.ts',
          isFlaky: true,
          confidence: 0.9,
          patterns: [],
          riskLevel: 'critical' as const,
          stabilityScore: 0.1,
          recommendations: [],
        },
      ];

      const categorized = detector.getFlakyTestsByRisk(analyses);

      expect(categorized.low).toHaveLength(1);
      expect(categorized.high).toHaveLength(1);
      expect(categorized.critical).toHaveLength(1);
      expect(categorized.medium).toHaveLength(0);
    });

    it('should filter out non-flaky tests', () => {
      const analyses = [
        {
          testName: 'stable test',
          testFile: 'stable.spec.ts',
          isFlaky: false,
          confidence: 0.1,
          patterns: [],
          riskLevel: 'low' as const,
          stabilityScore: 0.9,
          recommendations: [],
        },
        {
          testName: 'flaky test',
          testFile: 'flaky.spec.ts',
          isFlaky: true,
          confidence: 0.6,
          patterns: [],
          riskLevel: 'medium' as const,
          stabilityScore: 0.4,
          recommendations: [],
        },
      ];

      const categorized = detector.getFlakyTestsByRisk(analyses);

      expect(categorized.low).toHaveLength(0);
      expect(categorized.medium).toHaveLength(1);
      expect(categorized.high).toHaveLength(0);
      expect(categorized.critical).toHaveLength(0);
    });
  });

  describe('pattern detection edge cases', () => {
    it('should handle empty history', () => {
      const history: TestExecutionRecord[] = [];
      const metrics: TestStabilityMetrics = {
        testName: 'empty test',
        totalRuns: 0,
        passCount: 0,
        failCount: 0,
        skipCount: 0,
        flakinessScore: 0,
        averageDuration: 0,
        durationVariance: 0,
        consecutiveFailures: 0,
        isFlaky: false,
        stabilityTrend: 'stable',
      };

      const analysis = detector.analyzeTest('empty test', 'empty.spec.ts', history, metrics);

      expect(analysis.isFlaky).toBe(false);
      expect(analysis.patterns).toHaveLength(0);
      expect(analysis.confidence).toBe(0);
    });

    it('should handle history with only passes', () => {
      const history = createMockHistory('stable');
      const metrics = createMockMetrics(history);

      const analysis = detector.analyzeTest('all pass test', 'pass.spec.ts', history, metrics);

      expect(analysis.isFlaky).toBe(false);
      expect(analysis.patterns.length).toBeLessThanOrEqual(1); // May detect timing if duration varies
    });

    it('should handle insufficient data for environmental analysis', () => {
      const history: TestExecutionRecord[] = [];
      const baseRecord: TestExecutionRecord = {
        testName: 'insufficient env test',
        testFile: 'insufficient.spec.ts',
        status: 'passed',
        duration: 100,
        timestamp: new Date(),
        environment: {
          nodeVersion: 'v18.0.0',
          platform: 'linux',
          ci: true,
        },
      };

      // Only 2 CI runs, not enough for environmental analysis
      for (let i = 0; i < 2; i++) {
        history.push({
          ...baseRecord,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      const metrics = createMockMetrics(history);
      const analysis = detector.analyzeTest('insufficient env test', 'insufficient.spec.ts', history, metrics);

      expect(analysis.patterns.some(p => p.type === 'environmental')).toBe(false);
    });
  });
});
