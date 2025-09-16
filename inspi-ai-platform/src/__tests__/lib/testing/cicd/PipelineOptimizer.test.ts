/**
 * Tests for PipelineOptimizer
 */

import { PipelineOptimizer } from '../../../../lib/testing/cicd/PipelineOptimizer';
import { PipelineConfig, CICDMetrics } from '../../../../lib/testing/cicd/types';

describe('PipelineOptimizer', () => {
  let optimizer: PipelineOptimizer;

  beforeEach(() => {
    optimizer = new PipelineOptimizer();
  });

  afterEach(() => {
    optimizer.clearCache();
  });

  describe('optimizePipeline', () => {
    it('should generate optimization recommendations for basic pipeline', async () => {
      const config: PipelineConfig = {
        name: 'test-pipeline',
        platform: 'github',
        stages: [
          {
            name: 'build',
            type: 'build',
            commands: ['npm install', 'npm run build'],
            dependencies: [],
            timeout: 600000,
            retries: 1
          },
          {
            name: 'test',
            type: 'test',
            commands: ['npm test'],
            dependencies: [],
            timeout: 300000,
            retries: 2
          }
        ],
        parallelization: {
          enabled: false,
          maxConcurrency: 1,
          strategy: 'stage'
        },
        caching: {
          enabled: false,
          strategy: 'dependencies',
          paths: [],
          key: '',
          restoreKeys: []
        },
        environment: {
          variables: {},
          secrets: []
        },
        notifications: {
          enabled: false,
          channels: [],
          conditions: []
        },
        qualityGates: []
      };

      const optimization = await optimizer.optimizePipeline(config);

      expect(optimization).toHaveProperty('recommendations');
      expect(optimization).toHaveProperty('estimatedImprovement');
      expect(optimization).toHaveProperty('implementationPlan');

      expect(optimization.recommendations.length).toBeGreaterThan(0);
      expect(optimization.estimatedImprovement.timeReduction).toBeGreaterThan(0);
      expect(optimization.implementationPlan.length).toBeGreaterThan(0);
    });

    it('should recommend caching when not enabled', async () => {
      const config: PipelineConfig = {
        name: 'no-cache-pipeline',
        platform: 'github',
        stages: [
          {
            name: 'install',
            type: 'build',
            commands: ['npm install'],
            dependencies: [],
            timeout: 300000,
            retries: 1
          }
        ],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: false, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      const optimization = await optimizer.optimizePipeline(config);

      const cachingRec = optimization.recommendations.find(r => r.type === 'caching');
      expect(cachingRec).toBeDefined();
      expect(cachingRec?.priority).toBe('high');
      expect(cachingRec?.title).toContain('Caching');
    });

    it('should recommend parallelization for independent stages', async () => {
      const config: PipelineConfig = {
        name: 'sequential-pipeline',
        platform: 'github',
        stages: [
          {
            name: 'lint',
            type: 'lint',
            commands: ['npm run lint'],
            dependencies: [],
            timeout: 180000,
            retries: 1
          },
          {
            name: 'test',
            type: 'test',
            commands: ['npm test'],
            dependencies: [],
            timeout: 300000,
            retries: 1
          },
          {
            name: 'build',
            type: 'build',
            commands: ['npm run build'],
            dependencies: [],
            timeout: 600000,
            retries: 1
          }
        ],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: true, strategy: 'dependencies', paths: ['node_modules'], key: 'deps', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      const optimization = await optimizer.optimizePipeline(config);

      const parallelRec = optimization.recommendations.find(r => r.type === 'parallelization');
      expect(parallelRec).toBeDefined();
      expect(parallelRec?.priority).toBe('high');
    });

    it('should identify long-running stages as bottlenecks', async () => {
      const config: PipelineConfig = {
        name: 'slow-pipeline',
        platform: 'github',
        stages: [
          {
            name: 'slow-build',
            type: 'build',
            commands: ['npm run build'],
            dependencies: [],
            timeout: 2400000, // 40 minutes
            retries: 1
          }
        ],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: true, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      const optimization = await optimizer.optimizePipeline(config);

      const resourceRec = optimization.recommendations.find(r => r.type === 'resource');
      expect(resourceRec).toBeDefined();
      expect(resourceRec?.title).toContain('Long-Running');
    });

    it('should cache optimization results', async () => {
      const config: PipelineConfig = {
        name: 'cache-test',
        platform: 'github',
        stages: [],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: false, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      // First call
      const optimization1 = await optimizer.optimizePipeline(config);
      
      // Second call should use cache
      const optimization2 = await optimizer.optimizePipeline(config);

      expect(optimization1).toEqual(optimization2);
    });

    it('should provide implementation plan with correct order', async () => {
      const config: PipelineConfig = {
        name: 'implementation-test',
        platform: 'github',
        stages: [
          {
            name: 'test',
            type: 'test',
            commands: ['npm test'],
            dependencies: [],
            timeout: 300000,
            retries: 0 // No retries
          }
        ],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: false, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      const optimization = await optimizer.optimizePipeline(config);

      expect(optimization.implementationPlan.length).toBeGreaterThan(0);
      
      // Check that steps are ordered
      const orders = optimization.implementationPlan.map(step => step.order);
      const sortedOrders = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sortedOrders);
    });
  });

  describe('optimization statistics', () => {
    it('should track optimization statistics', async () => {
      const config: PipelineConfig = {
        name: 'stats-test',
        platform: 'github',
        stages: [],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: false, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      await optimizer.optimizePipeline(config);
      
      const stats = optimizer.getOptimizationStats();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('metricsCount');
      expect(stats.cacheSize).toBe(1);
    });

    it('should calculate average improvement estimates', async () => {
      const configs = [
        {
          name: 'pipeline-1',
          platform: 'github' as const,
          stages: [],
          parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' as const },
          caching: { enabled: false, strategy: 'dependencies' as const, paths: [], key: '', restoreKeys: [] },
          environment: { variables: {}, secrets: [] },
          notifications: { enabled: false, channels: [], conditions: [] },
          qualityGates: []
        },
        {
          name: 'pipeline-2',
          platform: 'github' as const,
          stages: [],
          parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' as const },
          caching: { enabled: false, strategy: 'dependencies' as const, paths: [], key: '', restoreKeys: [] },
          environment: { variables: {}, secrets: [] },
          notifications: { enabled: false, channels: [], conditions: [] },
          qualityGates: []
        }
      ];

      for (const config of configs) {
        await optimizer.optimizePipeline(config);
      }

      const stats = optimizer.getOptimizationStats();
      expect(stats.avgImprovementEstimate).toBeDefined();
      expect(stats.avgImprovementEstimate?.timeReduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('metrics integration', () => {
    it('should use historical metrics for trend analysis', async () => {
      const config: PipelineConfig = {
        name: 'trend-test',
        platform: 'github',
        stages: [],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: false, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      const mockMetrics: CICDMetrics[] = [
        {
          pipelineId: 'test-pipeline',
          buildNumber: 1,
          duration: 600000,
          status: 'success',
          stages: [],
          testResults: { total: 10, passed: 10, failed: 0, skipped: 0, duration: 30000 },
          qualityGates: { total: 2, passed: 2, failed: 0, warnings: 0, blocking: 1 },
          artifacts: { total: 1, size: 1000000, types: { 'zip': 1 } },
          performance: {
            buildTime: 300000,
            testTime: 30000,
            deployTime: 0,
            queueTime: 60000,
            resourceUsage: { cpu: 50, memory: 60, disk: 30, network: 20 }
          }
        }
      ];

      const optimization = await optimizer.optimizePipeline(config, mockMetrics);
      
      expect(optimization).toBeDefined();
      expect(optimization.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid pipeline configuration gracefully', async () => {
      const invalidConfig = {} as PipelineConfig;

      await expect(optimizer.optimizePipeline(invalidConfig)).resolves.toBeDefined();
    });

    it('should handle empty stages array', async () => {
      const config: PipelineConfig = {
        name: 'empty-pipeline',
        platform: 'github',
        stages: [],
        parallelization: { enabled: false, maxConcurrency: 1, strategy: 'stage' },
        caching: { enabled: false, strategy: 'dependencies', paths: [], key: '', restoreKeys: [] },
        environment: { variables: {}, secrets: [] },
        notifications: { enabled: false, channels: [], conditions: [] },
        qualityGates: []
      };

      const optimization = await optimizer.optimizePipeline(config);
      
      expect(optimization).toBeDefined();
      expect(optimization.recommendations).toBeDefined();
    });
  });
});