/**
 * Tests for PipelineAnalyzer
 */

import { PipelineAnalyzer } from '../../../../lib/testing/cicd/PipelineAnalyzer';
import { CICDMetrics } from '../../../../lib/testing/cicd/types';

describe('PipelineAnalyzer', () => {
  let analyzer: PipelineAnalyzer;
  let mockMetrics: CICDMetrics;

  beforeEach(() => {
    analyzer = new PipelineAnalyzer();
    mockMetrics = {
      pipelineId: 'test-pipeline-123',
      buildNumber: 42,
      duration: 1800000, // 30 minutes
      status: 'success',
      stages: [
        {
          name: 'build',
          status: 'success',
          duration: 600000, // 10 minutes
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:10:00Z')
        },
        {
          name: 'test',
          status: 'success',
          duration: 900000, // 15 minutes
          startTime: new Date('2024-01-01T10:10:00Z'),
          endTime: new Date('2024-01-01T10:25:00Z')
        },
        {
          name: 'deploy',
          status: 'success',
          duration: 300000, // 5 minutes
          startTime: new Date('2024-01-01T10:25:00Z'),
          endTime: new Date('2024-01-01T10:30:00Z')
        }
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
          lines: 85
        }
      },
      qualityGates: {
        total: 5,
        passed: 4,
        failed: 1,
        warnings: 0,
        blocking: 1
      },
      artifacts: {
        total: 3,
        size: 50000000, // 50MB
        types: {
          'build': 1,
          'test-results': 1,
          'coverage': 1
        }
      },
      performance: {
        buildTime: 600000,
        testTime: 900000,
        deployTime: 300000,
        queueTime: 120000, // 2 minutes
        resourceUsage: {
          cpu: 75,
          memory: 60,
          disk: 40,
          network: 30
        }
      }
    };
  });

  describe('analyzePipeline', () => {
    it('should analyze pipeline performance correctly', async () => {
      const analysis = await analyzer.analyzePipeline(mockMetrics);

      expect(analysis).toHaveProperty('bottlenecks');
      expect(analysis).toHaveProperty('inefficiencies');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis).toHaveProperty('trends');
    });

    it('should identify bottlenecks correctly', async () => {
      // Create metrics with a clear bottleneck
      const metricsWithBottleneck = {
        ...mockMetrics,
        stages: [
          {
            name: 'build',
            status: 'success',
            duration: 300000, // 5 minutes
            startTime: new Date(),
            endTime: new Date()
          },
          {
            name: 'slow-test',
            status: 'success',
            duration: 1200000, // 20 minutes (66% of total)
            startTime: new Date(),
            endTime: new Date()
          },
          {
            name: 'deploy',
            status: 'success',
            duration: 300000, // 5 minutes
            startTime: new Date(),
            endTime: new Date()
          }
        ]
      };

      const analysis = await analyzer.analyzePipeline(metricsWithBottleneck);

      expect(analysis.bottlenecks).toHaveLength(1);
      expect(analysis.bottlenecks[0].stage).toBe('slow-test');
      expect(analysis.bottlenecks[0].impact).toBeGreaterThan(0.6);
    });

    it('should identify CPU bottlenecks', async () => {
      const highCpuMetrics = {
        ...mockMetrics,
        performance: {
          ...mockMetrics.performance,
          resourceUsage: {
            ...mockMetrics.performance.resourceUsage,
            cpu: 85 // High CPU usage
          }
        }
      };

      const analysis = await analyzer.analyzePipeline(highCpuMetrics);

      const cpuBottleneck = analysis.bottlenecks.find(b => b.type === 'cpu');
      expect(cpuBottleneck).toBeDefined();
      expect(cpuBottleneck?.suggestions).toContain('Consider using more powerful runners');
    });

    it('should identify memory bottlenecks', async () => {
      const highMemoryMetrics = {
        ...mockMetrics,
        performance: {
          ...mockMetrics.performance,
          resourceUsage: {
            ...mockMetrics.performance.resourceUsage,
            memory: 90 // High memory usage
          }
        }
      };

      const analysis = await analyzer.analyzePipeline(highMemoryMetrics);

      const memoryBottleneck = analysis.bottlenecks.find(b => b.type === 'memory');
      expect(memoryBottleneck).toBeDefined();
      expect(memoryBottleneck?.suggestions).toContain('Increase memory allocation for runners');
    });

    it('should identify queue time bottlenecks', async () => {
      const highQueueMetrics = {
        ...mockMetrics,
        performance: {
          ...mockMetrics.performance,
          queueTime: 600000 // 10 minutes queue time
        }
      };

      const analysis = await analyzer.analyzePipeline(highQueueMetrics);

      const queueBottleneck = analysis.bottlenecks.find(b => b.stage === 'queue');
      expect(queueBottleneck).toBeDefined();
      expect(queueBottleneck?.type).toBe('dependency');
    });
  });

  describe('identifyInefficiencies', () => {
    it('should detect redundant stages', async () => {
      const redundantMetrics = {
        ...mockMetrics,
        stages: [
          ...mockMetrics.stages,
          {
            name: 'test', // Duplicate stage name
            status: 'success',
            duration: 300000,
            startTime: new Date(),
            endTime: new Date()
          }
        ]
      };

      const analysis = await analyzer.analyzePipeline(redundantMetrics);

      const redundantInefficiency = analysis.inefficiencies.find(i => i.type === 'redundant');
      expect(redundantInefficiency).toBeDefined();
      expect(redundantInefficiency?.description).toContain('Duplicate stages detected');
    });

    it('should detect sequential inefficiencies', async () => {
      const sequentialMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'lint',
            status: 'success',
            duration: 120000,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            name: 'type-check',
            status: 'success',
            duration: 180000,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            name: 'unit-test',
            status: 'success',
            duration: 300000,
            startTime: new Date(),
            endTime: new Date()
          }
        ]
      };

      const analysis = await analyzer.analyzePipeline(sequentialMetrics);

      const sequentialInefficiency = analysis.inefficiencies.find(i => i.type === 'sequential');
      expect(sequentialInefficiency).toBeDefined();
      expect(sequentialInefficiency?.solution).toContain('parallel execution');
    });

    it('should detect oversized artifacts', async () => {
      const oversizedMetrics = {
        ...mockMetrics,
        artifacts: {
          ...mockMetrics.artifacts,
          size: 2000000000 // 2GB
        }
      };

      const analysis = await analyzer.analyzePipeline(oversizedMetrics);

      const oversizedInefficiency = analysis.inefficiencies.find(i => i.type === 'oversized');
      expect(oversizedInefficiency).toBeDefined();
      expect(oversizedInefficiency?.solution).toContain('artifact compression');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate performance recommendations', async () => {
      const analysis = await analyzer.analyzePipeline(mockMetrics);

      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend fixing failing tests', async () => {
      const failingTestMetrics = {
        ...mockMetrics,
        testResults: {
          ...mockMetrics.testResults,
          failed: 5
        }
      };

      const analysis = await analyzer.analyzePipeline(failingTestMetrics);

      const testRecommendation = analysis.recommendations.find(r => 
        r.includes('Fix 5 failing tests')
      );
      expect(testRecommendation).toBeDefined();
    });

    it('should recommend optimization for long pipelines', async () => {
      const longPipelineMetrics = {
        ...mockMetrics,
        duration: 2400000 // 40 minutes
      };

      const analysis = await analyzer.analyzePipeline(longPipelineMetrics);

      const durationRecommendation = analysis.recommendations.find(r => 
        r.includes('Pipeline duration exceeds 30 minutes')
      );
      expect(durationRecommendation).toBeDefined();
    });
  });

  describe('analyzeTrends', () => {
    it('should return empty trends for insufficient data', async () => {
      const analysis = await analyzer.analyzePipeline(mockMetrics);

      expect(analysis.trends.duration.current).toBe(0);
      expect(analysis.trends.duration.trend).toBe('stable');
    });

    it('should analyze trends with sufficient data', async () => {
      // Add multiple metrics to build history
      for (let i = 0; i < 10; i++) {
        await analyzer.analyzePipeline({
          ...mockMetrics,
          pipelineId: `pipeline-${i}`,
          buildNumber: i,
          duration: 1800000 + (i * 60000) // Increasing duration
        });
      }

      const analysis = await analyzer.analyzePipeline(mockMetrics);

      expect(analysis.trends.duration.current).toBeGreaterThan(0);
      expect(['improving', 'degrading', 'stable']).toContain(analysis.trends.duration.trend);
    });
  });

  describe('getPipelineHealthScore', () => {
    it('should calculate health score correctly', () => {
      const healthScore = analyzer.getPipelineHealthScore(mockMetrics);

      expect(healthScore.score).toBeGreaterThanOrEqual(0);
      expect(healthScore.score).toBeLessThanOrEqual(100);
      expect(healthScore.factors).toHaveLength(5);
    });

    it('should give high score for successful pipeline', () => {
      const successfulMetrics = {
        ...mockMetrics,
        status: 'success',
        duration: 900000, // 15 minutes
        testResults: {
          ...mockMetrics.testResults,
          coverage: {
            statements: 95,
            branches: 90,
            functions: 95,
            lines: 95
          }
        },
        performance: {
          ...mockMetrics.performance,
          resourceUsage: {
            cpu: 50,
            memory: 40,
            disk: 30,
            network: 20
          }
        }
      };

      const healthScore = analyzer.getPipelineHealthScore(successfulMetrics);

      expect(healthScore.score).toBeGreaterThan(80);
    });

    it('should give low score for failed pipeline', () => {
      const failedMetrics = {
        ...mockMetrics,
        status: 'failure',
        duration: 3600000, // 60 minutes
        testResults: {
          ...mockMetrics.testResults,
          coverage: {
            statements: 40,
            branches: 35,
            functions: 45,
            lines: 40
          }
        },
        performance: {
          ...mockMetrics.performance,
          resourceUsage: {
            cpu: 95,
            memory: 90,
            disk: 85,
            network: 80
          }
        }
      };

      const healthScore = analyzer.getPipelineHealthScore(failedMetrics);

      expect(healthScore.score).toBeLessThan(50);
    });
  });

  describe('clearCache', () => {
    it('should clear cache and history', async () => {
      await analyzer.analyzePipeline(mockMetrics);
      
      const statsBefore = analyzer.getAnalysisStats();
      expect(statsBefore.historySize).toBe(1);

      analyzer.clearCache();

      const statsAfter = analyzer.getAnalysisStats();
      expect(statsAfter.historySize).toBe(0);
      expect(statsAfter.cacheSize).toBe(0);
    });
  });

  describe('getAnalysisStats', () => {
    it('should return correct statistics', async () => {
      await analyzer.analyzePipeline(mockMetrics);
      await analyzer.analyzePipeline({
        ...mockMetrics,
        pipelineId: 'pipeline-2',
        buildNumber: 43
      });

      const stats = analyzer.getAnalysisStats();

      expect(stats.historySize).toBe(2);
      expect(stats.avgDuration).toBe(1800000);
      expect(stats.successRate).toBe(1.0);
    });

    it('should calculate success rate correctly', async () => {
      await analyzer.analyzePipeline(mockMetrics);
      await analyzer.analyzePipeline({
        ...mockMetrics,
        status: 'failure',
        pipelineId: 'pipeline-2',
        buildNumber: 43
      });

      const stats = analyzer.getAnalysisStats();

      expect(stats.successRate).toBe(0.5);
    });
  });

  describe('categorizeBottleneck', () => {
    it('should categorize build stages as CPU bottlenecks', async () => {
      const buildMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'build-frontend',
            status: 'success',
            duration: 1200000, // 20 minutes (major bottleneck)
            startTime: new Date(),
            endTime: new Date()
          }
        ]
      };

      const analysis = await analyzer.analyzePipeline(buildMetrics);
      const bottleneck = analysis.bottlenecks.find(b => b.stage === 'build-frontend');

      expect(bottleneck?.type).toBe('cpu');
    });

    it('should categorize test stages as memory bottlenecks', async () => {
      const testMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'integration-test',
            status: 'success',
            duration: 1200000, // 20 minutes (major bottleneck)
            startTime: new Date(),
            endTime: new Date()
          }
        ]
      };

      const analysis = await analyzer.analyzePipeline(testMetrics);
      const bottleneck = analysis.bottlenecks.find(b => b.stage === 'integration-test');

      expect(bottleneck?.type).toBe('memory');
    });
  });

  describe('edge cases', () => {
    it('should handle empty stages array', async () => {
      const emptyStagesMetrics = {
        ...mockMetrics,
        stages: []
      };

      const analysis = await analyzer.analyzePipeline(emptyStagesMetrics);

      expect(analysis.bottlenecks).toHaveLength(0);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should handle zero duration stages', async () => {
      const zeroDurationMetrics = {
        ...mockMetrics,
        stages: [
          {
            name: 'instant-stage',
            status: 'success',
            duration: 0,
            startTime: new Date(),
            endTime: new Date()
          }
        ]
      };

      const analysis = await analyzer.analyzePipeline(zeroDurationMetrics);

      expect(analysis).toBeDefined();
      expect(analysis.bottlenecks).toBeInstanceOf(Array);
    });

    it('should handle missing coverage data', async () => {
      const noCoverageMetrics = {
        ...mockMetrics,
        testResults: {
          ...mockMetrics.testResults,
          coverage: undefined
        }
      };

      const analysis = await analyzer.analyzePipeline(noCoverageMetrics);

      expect(analysis.trends.testCoverage.current).toBe(0);
    });
  });
});