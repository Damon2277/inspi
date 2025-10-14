import * as fs from 'fs';
import * as path from 'path';

import { ResultAggregator, TestResult, AggregationOptions } from '../../../../lib/testing/parallel/ResultAggregator';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ResultAggregator', () => {
  let aggregator: ResultAggregator;
  let mockResults: TestResult[];

  beforeEach(() => {
    const options: Partial<AggregationOptions> = {
      outputDir: 'test-output',
      outputFormats: ['json'],
      coverageThreshold: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
      },
    };

    aggregator = new ResultAggregator(options);

    mockResults = [
      {
        suiteId: 'suite-1',
        status: 'passed',
        duration: 1000,
        tests: [
          { name: 'test-1', status: 'passed', duration: 500 },
          { name: 'test-2', status: 'passed', duration: 500 },
        ],
        coverage: {
          statements: 85,
          branches: 80,
          functions: 90,
          lines: 85,
        },
        workerId: 1,
      },
      {
        suiteId: 'suite-2',
        status: 'failed',
        duration: 800,
        tests: [
          { name: 'test-3', status: 'passed', duration: 300 },
          { name: 'test-4', status: 'failed', duration: 500, error: 'Assertion failed' },
        ],
        coverage: {
          statements: 75,
          branches: 70,
          functions: 80,
          lines: 75,
        },
        error: {
          message: 'Test suite failed',
          type: 'assertion',
        },
        workerId: 2,
      },
    ];

    // Mock fs methods
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation();
    mockFs.writeFileSync.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregation lifecycle', () => {
    it('should start aggregation correctly', () => {
      const startSpy = jest.fn();
      aggregator.on('aggregation:started', startSpy);

      aggregator.startAggregation();

      expect(startSpy).toHaveBeenCalled();
    });

    it('should add results and track timeline', () => {
      aggregator.startAggregation();

      const addSpy = jest.fn();
      aggregator.on('result:added', addSpy);

      aggregator.recordExecutionStart('suite-1', 1);
      aggregator.addResult(mockResults[0]);

      expect(addSpy).toHaveBeenCalledWith({
        suiteId: 'suite-1',
        status: 'passed',
      });
    });

    it('should finalize and generate aggregated results', async () => {
      aggregator.startAggregation();

      mockResults.forEach(result => {
        aggregator.recordExecutionStart(result.suiteId, result.workerId!);
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.summary.totalSuites).toBe(2);
      expect(finalResult.summary.passedSuites).toBe(1);
      expect(finalResult.summary.failedSuites).toBe(1);
      expect(finalResult.summary.totalTests).toBe(4);
      expect(finalResult.summary.passedTests).toBe(3);
      expect(finalResult.summary.failedTests).toBe(1);
      expect(finalResult.summary.successRate).toBe(0.75);
    });
  });

  describe('coverage aggregation', () => {
    it('should aggregate coverage correctly', async () => {
      aggregator.startAggregation();

      mockResults.forEach(result => {
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      // Should calculate weighted average
      expect(finalResult.coverage.overall.statements).toBe(80); // (85 + 75) / 2
      expect(finalResult.coverage.overall.branches).toBe(75);   // (80 + 70) / 2
      expect(finalResult.coverage.overall.functions).toBe(85);  // (90 + 80) / 2
      expect(finalResult.coverage.overall.lines).toBe(80);      // (85 + 75) / 2
    });

    it('should check coverage thresholds', async () => {
      aggregator.startAggregation();

      mockResults.forEach(result => {
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      // All metrics meet or exceed thresholds
      expect(finalResult.coverage.passed).toBe(true);
    });

    it('should handle missing coverage data', async () => {
      const resultsWithoutCoverage = mockResults.map(result => ({
        ...result,
        coverage: undefined,
      }));

      aggregator.startAggregation();

      resultsWithoutCoverage.forEach(result => {
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.coverage.overall.statements).toBe(0);
      expect(finalResult.coverage.passed).toBe(false);
    });
  });

  describe('performance analysis', () => {
    it('should calculate performance metrics', async () => {
      aggregator.startAggregation();

      // Record execution timeline
      mockResults.forEach(result => {
        aggregator.recordExecutionStart(result.suiteId, result.workerId!);
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.performance.totalExecutionTime).toBeGreaterThan(0);
      expect(finalResult.performance.parallelEfficiency).toBeGreaterThan(0);
      expect(finalResult.performance.workerUtilization).toHaveLength(2);
      expect(finalResult.performance.averageTaskTime).toBe(900); // (1000 + 800) / 2
    });

    it('should identify performance bottlenecks', async () => {
      // Create results with uneven worker utilization
      const unevenResults = [
        { ...mockResults[0], workerId: 1, duration: 5000 }, // Long running
        { ...mockResults[1], workerId: 2, duration: 500 },   // Short running
      ];

      aggregator.startAggregation();

      unevenResults.forEach(result => {
        aggregator.recordExecutionStart(result.suiteId, result.workerId!);
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.performance.bottlenecks.length).toBeGreaterThan(0);
      expect(finalResult.performance.bottlenecks[0].type).toBe('worker');
    });

    it('should identify slow tests', async () => {
      const slowTestResult: TestResult = {
        suiteId: 'slow-suite',
        status: 'passed',
        duration: 70000, // 70 seconds - exceeds default threshold
        tests: [
          { name: 'slow-test', status: 'passed', duration: 70000 },
        ],
        workerId: 1,
      };

      aggregator.startAggregation();
      aggregator.addResult(slowTestResult);

      const finalResult = await aggregator.finalize();

      const slowTestBottleneck = finalResult.performance.bottlenecks
        .find(b => b.type === 'test');

      expect(slowTestBottleneck).toBeDefined();
      expect(slowTestBottleneck?.description).toContain('exceeded performance threshold');
    });
  });

  describe('error analysis', () => {
    it('should analyze errors correctly', async () => {
      aggregator.startAggregation();

      mockResults.forEach(result => {
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.errors.totalErrors).toBe(1);
      expect(finalResult.errors.errorsByType.get('assertion')).toBe(1);
      expect(finalResult.errors.errorsByWorker.get(2)).toBe(1);
    });

    it('should identify critical errors', async () => {
      const criticalErrorResult: TestResult = {
        suiteId: 'critical-suite',
        status: 'failed',
        duration: 1000,
        tests: [],
        error: {
          message: 'Setup failed',
          type: 'setup',
        },
        workerId: 1,
      };

      aggregator.startAggregation();
      aggregator.addResult(criticalErrorResult);

      const finalResult = await aggregator.finalize();

      expect(finalResult.errors.criticalErrors).toHaveLength(1);
      expect(finalResult.errors.criticalErrors[0].type).toBe('setup');
    });

    it('should identify flaky tests', async () => {
      const flakyResults = [
        {
          suiteId: 'flaky-suite-1',
          status: 'failed' as const,
          duration: 1000,
          tests: [
            { name: 'flaky-test', status: 'failed' as const, duration: 500, error: 'Random failure' },
          ],
          workerId: 1,
        },
        {
          suiteId: 'flaky-suite-2',
          status: 'failed' as const,
          duration: 1000,
          tests: [
            { name: 'flaky-test', status: 'failed' as const, duration: 500, error: 'Another failure' },
          ],
          workerId: 2,
        },
      ];

      aggregator.startAggregation();

      flakyResults.forEach(result => {
        aggregator.addResult(result);
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.errors.flakyTests).toContain('flaky-test');
    });
  });

  describe('report generation', () => {
    it('should generate JSON report', async () => {
      aggregator.startAggregation();

      mockResults.forEach(result => {
        aggregator.addResult(result);
      });

      await aggregator.finalize();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('test-output', { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/test-output\/test-results-.*\.json$/),
        expect.any(String),
      );
    });

    it('should generate HTML report', async () => {
      const htmlAggregator = new ResultAggregator({
        outputDir: 'test-output',
        outputFormats: ['html'],
      });

      htmlAggregator.startAggregation();

      mockResults.forEach(result => {
        htmlAggregator.addResult(result);
      });

      await htmlAggregator.finalize();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/test-output\/test-results-.*\.html$/),
        expect.stringContaining('<!DOCTYPE html>'),
      );
    });

    it('should generate XML report', async () => {
      const xmlAggregator = new ResultAggregator({
        outputDir: 'test-output',
        outputFormats: ['xml'],
      });

      xmlAggregator.startAggregation();

      mockResults.forEach(result => {
        xmlAggregator.addResult(result);
      });

      await xmlAggregator.finalize();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/test-output\/test-results-.*\.xml$/),
        expect.stringContaining('<?xml version="1.0"'),
      );
    });

    it('should generate Markdown report', async () => {
      const markdownAggregator = new ResultAggregator({
        outputDir: 'test-output',
        outputFormats: ['markdown'],
      });

      markdownAggregator.startAggregation();

      mockResults.forEach(result => {
        markdownAggregator.addResult(result);
      });

      await markdownAggregator.finalize();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/test-output\/test-results-.*\.md$/),
        expect.stringContaining('# Test Results Report'),
      );
    });

    it('should handle report generation errors', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const errorSpy = jest.fn();
      aggregator.on('report:error', errorSpy);

      aggregator.startAggregation();
      mockResults.forEach(result => {
        aggregator.addResult(result);
      });

      await aggregator.finalize();

      expect(errorSpy).toHaveBeenCalledWith({
        format: 'json',
        error: expect.any(Error),
      });
    });
  });

  describe('timeline tracking', () => {
    it('should track execution timeline', async () => {
      aggregator.startAggregation();

      aggregator.recordExecutionStart('suite-1', 1);
      aggregator.addResult(mockResults[0]);

      const finalResult = await aggregator.finalize();

      expect(finalResult.timeline).toHaveLength(2); // start + complete
      expect(finalResult.timeline[0].event).toBe('start');
      expect(finalResult.timeline[1].event).toBe('complete');
      expect(finalResult.timeline[0].workerId).toBe(1);
      expect(finalResult.timeline[1].workerId).toBe(1);
    });

    it('should track error events in timeline', async () => {
      aggregator.startAggregation();

      aggregator.recordExecutionStart('suite-2', 2);
      aggregator.addResult(mockResults[1]); // Failed result

      const finalResult = await aggregator.finalize();

      const errorEvent = finalResult.timeline.find(event => event.event === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.workerId).toBe(2);
    });
  });

  describe('worker metrics', () => {
    it('should track worker metrics correctly', async () => {
      aggregator.startAggregation();

      // Record multiple tasks for same worker
      aggregator.recordExecutionStart('suite-1', 1);
      aggregator.addResult(mockResults[0]);

      aggregator.recordExecutionStart('suite-2', 1);
      aggregator.addResult({
        ...mockResults[1],
        workerId: 1,
        status: 'passed',
      });

      const finalResult = await aggregator.finalize();

      expect(finalResult.performance.workerUtilization).toHaveLength(1);
      expect(finalResult.performance.workerUtilization[0].workerId).toBe(1);
      expect(finalResult.performance.workerUtilization[0].tasksCompleted).toBe(2);
    });
  });
});
