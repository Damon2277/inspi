/**
 * Tests for CICDReporter
 */

import { promises as fs } from 'fs';
import path from 'path';

import { CICDReporter } from '../../../../lib/testing/cicd/CICDReporter';
import { CICDMetrics, PipelineOptimization, QualityGate } from '../../../../lib/testing/cicd/types';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe('CICDReporter', () => {
  let reporter: CICDReporter;
  let mockMetrics: CICDMetrics;
  let mockOptimization: PipelineOptimization;
  let mockQualityGates: QualityGate[];

  beforeEach(() => {
    reporter = new CICDReporter('./test-reports');

    mockMetrics = {
      pipelineId: 'test-pipeline-123',
      buildNumber: 42,
      duration: 1800000, // 30 minutes
      status: 'success',
      stages: [
        {
          name: 'build',
          status: 'success',
          duration: 600000,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:10:00Z'),
        },
        {
          name: 'test',
          status: 'success',
          duration: 900000,
          startTime: new Date('2024-01-01T10:10:00Z'),
          endTime: new Date('2024-01-01T10:25:00Z'),
        },
        {
          name: 'deploy',
          status: 'success',
          duration: 300000,
          startTime: new Date('2024-01-01T10:25:00Z'),
          endTime: new Date('2024-01-01T10:30:00Z'),
        },
      ],
      testResults: {
        total: 150,
        passed: 148,
        failed: 2,
        skipped: 0,
        duration: 600000,
        coverage: {
          statements: 85,
          branches: 80,
          functions: 90,
          lines: 85,
        },
      },
      qualityGates: {
        total: 5,
        passed: 4,
        failed: 1,
        warnings: 0,
        blocking: 1,
      },
      artifacts: {
        total: 3,
        size: 50000000,
        types: {
          'build': 1,
          'test-results': 1,
          'coverage': 1,
        },
      },
      performance: {
        buildTime: 600000,
        testTime: 900000,
        deployTime: 300000,
        queueTime: 120000,
        resourceUsage: {
          cpu: 75,
          memory: 60,
          disk: 40,
          network: 30,
        },
      },
    };

    mockOptimization = {
      recommendations: [
        {
          type: 'caching',
          priority: 'high',
          title: 'Enable build caching',
          description: 'Implement build caching to reduce build times',
          impact: 'High - 40% time reduction',
          effort: 'Medium - 2-3 hours',
          implementation: 'Add cache configuration to CI/CD pipeline',
        },
        {
          type: 'parallelization',
          priority: 'medium',
          title: 'Parallelize test execution',
          description: 'Run tests in parallel to reduce execution time',
          impact: 'Medium - 25% time reduction',
          effort: 'Low - 1 hour',
          implementation: 'Configure parallel test runners',
        },
      ],
      estimatedImprovement: {
        timeReduction: 0.35,
        costReduction: 0.20,
        reliabilityImprovement: 0.15,
        confidence: 0.85,
      },
      implementationPlan: [
        {
          order: 1,
          title: 'Setup build caching',
          description: 'Configure cache for dependencies and build artifacts',
          validation: 'Verify cache hit rate > 80%',
        },
        {
          order: 2,
          title: 'Enable parallel testing',
          description: 'Configure test runners for parallel execution',
          validation: 'Verify test execution time reduction',
        },
      ],
    };

    mockQualityGates = [
      {
        id: 'coverage-gate',
        name: 'Code Coverage',
        type: 'coverage',
        status: 'passed',
        value: 85,
        threshold: 80,
        message: 'Coverage meets minimum threshold',
        blocking: true,
      },
      {
        id: 'performance-gate',
        name: 'Performance',
        type: 'performance',
        status: 'failed',
        value: 2500,
        threshold: 2000,
        message: 'Response time exceeds threshold',
        blocking: false,
      },
    ];

    // Reset mocks
    jest.clearAllMocks();
    (fs.access as jest.Mock).mockRejectedValue(new Error('Directory not found'));
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('generateReport', () => {
    it('should generate a complete report', async () => {
      const report = await reporter.generateReport(
        mockMetrics,
        mockOptimization,
        mockQualityGates,
      );

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('pipeline');
      expect(report).toHaveProperty('qualityGates');
      expect(report).toHaveProperty('optimization');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('generatedAt');
    });

    it('should generate report without optional parameters', async () => {
      const report = await reporter.generateReport(mockMetrics);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('pipeline');
      expect(report.qualityGates).toBeUndefined();
      expect(report.optimization).toBeUndefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should create output directory if it does not exist', async () => {
      await reporter.generateReport(mockMetrics);

      expect(fs.mkdir).toHaveBeenCalledWith('./test-reports', { recursive: true });
    });

    it('should generate all report formats', async () => {
      await reporter.generateReport(mockMetrics);

      expect(fs.writeFile).toHaveBeenCalledTimes(3);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cicd-report.html'),
        expect.any(String),
        'utf8',
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cicd-report.json'),
        expect.any(String),
        'utf8',
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cicd-report.md'),
        expect.any(String),
        'utf8',
      );
    });
  });

  describe('generateSummary', () => {
    it('should generate correct pipeline summary', async () => {
      const report = await reporter.generateReport(mockMetrics);

      expect(report.summary.pipelineId).toBe('test-pipeline-123');
      expect(report.summary.buildNumber).toBe(42);
      expect(report.summary.status).toBe('success');
      expect(report.summary.duration).toBe(1800000);
      expect(report.summary.stages.total).toBe(3);
      expect(report.summary.stages.successful).toBe(3);
      expect(report.summary.stages.failed).toBe(0);
      expect(report.summary.tests.total).toBe(150);
      expect(report.summary.tests.passed).toBe(148);
      expect(report.summary.tests.failed).toBe(2);
    });

    it('should handle failed stages correctly', async () => {
      const failedMetrics = {
        ...mockMetrics,
        stages: [
          ...mockMetrics.stages,
          {
            name: 'security-scan',
            status: 'failure',
            duration: 180000,
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
      };

      const report = await reporter.generateReport(failedMetrics);

      expect(report.summary.stages.total).toBe(4);
      expect(report.summary.stages.successful).toBe(3);
      expect(report.summary.stages.failed).toBe(1);
    });
  });

  describe('analyzePipeline', () => {
    it('should analyze pipeline performance correctly', async () => {
      const report = await reporter.generateReport(mockMetrics);

      expect(report.pipeline.totalDuration).toBe(1800000);
      expect(report.pipeline.stages).toHaveLength(3);
      expect(report.pipeline.longestStage).toBe('test');
      expect(report.pipeline.resourceUsage).toEqual(mockMetrics.performance.resourceUsage);
    });

    it('should identify bottlenecks correctly', async () => {
      const bottleneckMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'slow-build',
            status: 'success',
            duration: 1200000, // 20 minutes (66% of total)
            startTime: new Date(),
            endTime: new Date(),
          },
          {
            name: 'fast-test',
            status: 'success',
            duration: 300000, // 5 minutes
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
      };

      const report = await reporter.generateReport(bottleneckMetrics);

      expect(report.pipeline.bottlenecks).toContain('slow-build');
      expect(report.pipeline.bottlenecks).not.toContain('fast-test');
    });

    it('should calculate stage percentages correctly', async () => {
      const report = await reporter.generateReport(mockMetrics);

      const buildStage = report.pipeline.stages.find(s => s.name === 'build');
      const testStage = report.pipeline.stages.find(s => s.name === 'test');
      const deployStage = report.pipeline.stages.find(s => s.name === 'deploy');

      expect(buildStage?.percentage).toBeCloseTo(33.33, 1);
      expect(testStage?.percentage).toBe(50);
      expect(deployStage?.percentage).toBeCloseTo(16.67, 1);
    });
  });

  describe('analyzeQualityGates', () => {
    it('should analyze quality gates correctly', async () => {
      const report = await reporter.generateReport(mockMetrics, undefined, mockQualityGates);

      expect(report.qualityGates?.total).toBe(2);
      expect(report.qualityGates?.passed).toBe(1);
      expect(report.qualityGates?.failed).toBe(1);
      expect(report.qualityGates?.warnings).toBe(0);
      expect(report.qualityGates?.blocking).toBe(1);
    });

    it('should include gate details', async () => {
      const report = await reporter.generateReport(mockMetrics, undefined, mockQualityGates);

      expect(report.qualityGates?.gates).toHaveLength(2);
      expect(report.qualityGates?.gates[0].name).toBe('Code Coverage');
      expect(report.qualityGates?.gates[0].status).toBe('passed');
      expect(report.qualityGates?.gates[1].name).toBe('Performance');
      expect(report.qualityGates?.gates[1].status).toBe('failed');
    });
  });

  describe('summarizeOptimization', () => {
    it('should summarize optimization correctly', async () => {
      const report = await reporter.generateReport(mockMetrics, mockOptimization);

      expect(report.optimization?.recommendations).toBe(2);
      expect(report.optimization?.estimatedTimeReduction).toBe(0.35);
      expect(report.optimization?.estimatedCostReduction).toBe(0.20);
      expect(report.optimization?.reliabilityImprovement).toBe(0.15);
      expect(report.optimization?.implementationSteps).toBe(2);
      expect(report.optimization?.highPriorityItems).toBe(1);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate performance recommendations', async () => {
      const longPipelineMetrics = {
        ...mockMetrics,
        duration: 2400000, // 40 minutes
      };

      const report = await reporter.generateReport(longPipelineMetrics);

      const durationRecommendation = report.recommendations.find(r =>
        r.includes('pipeline duration'),
      );
      expect(durationRecommendation).toBeDefined();
    });

    it('should recommend fixing failing tests', async () => {
      const failingTestMetrics = {
        ...mockMetrics,
        testResults: {
          ...mockMetrics.testResults,
          failed: 5,
        },
      };

      const report = await reporter.generateReport(failingTestMetrics);

      const testRecommendation = report.recommendations.find(r =>
        r.includes('5 failing tests'),
      );
      expect(testRecommendation).toBeDefined();
    });

    it('should recommend improving test coverage', async () => {
      const lowCoverageMetrics = {
        ...mockMetrics,
        testResults: {
          ...mockMetrics.testResults,
          coverage: {
            statements: 70,
            branches: 65,
            functions: 75,
            lines: 70,
          },
        },
      };

      const report = await reporter.generateReport(lowCoverageMetrics);

      const coverageRecommendation = report.recommendations.find(r =>
        r.includes('test coverage'),
      );
      expect(coverageRecommendation).toBeDefined();
    });

    it('should include optimization recommendations', async () => {
      const report = await reporter.generateReport(mockMetrics, mockOptimization);

      const cachingRecommendation = report.recommendations.find(r =>
        r.includes('Enable build caching'),
      );
      expect(cachingRecommendation).toBeDefined();
    });
  });

  describe('identifyParallelizationOpportunities', () => {
    it('should identify independent stages', async () => {
      const independentStagesMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'lint',
            status: 'success',
            duration: 120000,
            startTime: new Date(),
            endTime: new Date(),
          },
          {
            name: 'type-check',
            status: 'success',
            duration: 180000,
            startTime: new Date(),
            endTime: new Date(),
          },
          {
            name: 'unit-test',
            status: 'success',
            duration: 300000,
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
      };

      const report = await reporter.generateReport(independentStagesMetrics);

      const parallelOpportunity = report.pipeline.parallelizationOpportunities.find(o =>
        o.includes('independent stages'),
      );
      expect(parallelOpportunity).toBeDefined();
    });

    it('should identify test parallelization opportunities', async () => {
      const multipleTestsMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'unit-test',
            status: 'success',
            duration: 300000,
            startTime: new Date(),
            endTime: new Date(),
          },
          {
            name: 'integration-test',
            status: 'success',
            duration: 600000,
            startTime: new Date(),
            endTime: new Date(),
          },
          {
            name: 'e2e-test',
            status: 'success',
            duration: 900000,
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
      };

      const report = await reporter.generateReport(multipleTestsMetrics);

      const testParallelOpportunity = report.pipeline.parallelizationOpportunities.find(o =>
        o.includes('Test stages'),
      );
      expect(testParallelOpportunity).toBeDefined();
    });
  });

  describe('HTML report generation', () => {
    it('should generate valid HTML content', async () => {
      await reporter.generateReport(mockMetrics);

      const htmlCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.html'),
      );

      expect(htmlCall).toBeDefined();
      expect(htmlCall[1]).toContain('<!DOCTYPE html>');
      expect(htmlCall[1]).toContain('<title>CI/CD Pipeline Report</title>');
      expect(htmlCall[1]).toContain('test-pipeline-123');
    });

    it('should include optimization section when provided', async () => {
      await reporter.generateReport(mockMetrics, mockOptimization);

      const htmlCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.html'),
      );

      expect(htmlCall[1]).toContain('Optimization Opportunities');
      expect(htmlCall[1]).toContain('35%'); // Time reduction
    });

    it('should include quality gates section when provided', async () => {
      await reporter.generateReport(mockMetrics, undefined, mockQualityGates);

      const htmlCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.html'),
      );

      expect(htmlCall[1]).toContain('Quality Gates');
      expect(htmlCall[1]).toContain('Code Coverage');
    });
  });

  describe('JSON report generation', () => {
    it('should generate valid JSON content', async () => {
      await reporter.generateReport(mockMetrics);

      const jsonCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.json'),
      );

      expect(jsonCall).toBeDefined();
      expect(() => JSON.parse(jsonCall[1])).not.toThrow();
    });

    it('should include all report data in JSON', async () => {
      await reporter.generateReport(mockMetrics, mockOptimization, mockQualityGates);

      const jsonCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.json'),
      );

      const reportData = JSON.parse(jsonCall[1]);
      expect(reportData).toHaveProperty('summary');
      expect(reportData).toHaveProperty('pipeline');
      expect(reportData).toHaveProperty('qualityGates');
      expect(reportData).toHaveProperty('optimization');
    });
  });

  describe('Markdown report generation', () => {
    it('should generate valid Markdown content', async () => {
      await reporter.generateReport(mockMetrics);

      const mdCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.md'),
      );

      expect(mdCall).toBeDefined();
      expect(mdCall[1]).toContain('# CI/CD Pipeline Report');
      expect(mdCall[1]).toContain('## Summary');
      expect(mdCall[1]).toContain('| Metric | Value |');
    });

    it('should include bottlenecks section when present', async () => {
      const bottleneckMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'slow-stage',
            status: 'success',
            duration: 1200000, // Major bottleneck
            startTime: new Date(),
            endTime: new Date(),
          },
        ],
      };

      await reporter.generateReport(bottleneckMetrics);

      const mdCall = (fs.writeFile as jest.Mock).mock.calls.find(call =>
        call[0].includes('cicd-report.md'),
      );

      expect(mdCall[1]).toContain('## Bottlenecks');
      expect(mdCall[1]).toContain('slow-stage');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(reporter.generateReport(mockMetrics)).rejects.toThrow('Write failed');
    });

    it('should handle missing coverage data', async () => {
      const noCoverageMetrics = {
        ...mockMetrics,
        testResults: {
          ...mockMetrics.testResults,
          coverage: undefined,
        },
      };

      const report = await reporter.generateReport(noCoverageMetrics);

      expect(report.summary.tests.coverage).toBeUndefined();
    });
  });

  describe('custom output directory', () => {
    it('should use custom output directory', async () => {
      const customReporter = new CICDReporter('./custom-reports');
      await customReporter.generateReport(mockMetrics);

      expect(fs.mkdir).toHaveBeenCalledWith('./custom-reports', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await reporter.generateReport(mockMetrics);

      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });
});
