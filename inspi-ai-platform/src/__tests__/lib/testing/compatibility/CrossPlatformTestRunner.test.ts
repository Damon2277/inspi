/**
 * Tests for CrossPlatformTestRunner
 */

import { CrossPlatformTestRunner } from '../../../../lib/testing/compatibility/CrossPlatformTestRunner';
import { NodeVersionTester } from '../../../../lib/testing/compatibility/NodeVersionTester';
import { BrowserCompatibilityTester } from '../../../../lib/testing/compatibility/BrowserCompatibilityTester';
import { ContainerTestRunner } from '../../../../lib/testing/compatibility/ContainerTestRunner';

// Mock the dependencies
jest.mock('../../../../lib/testing/compatibility/NodeVersionTester');
jest.mock('../../../../lib/testing/compatibility/BrowserCompatibilityTester');
jest.mock('../../../../lib/testing/compatibility/ContainerTestRunner');

describe('CrossPlatformTestRunner', () => {
  let runner: CrossPlatformTestRunner;
  let mockNodeTester: jest.Mocked<NodeVersionTester>;
  let mockBrowserTester: jest.Mocked<BrowserCompatibilityTester>;
  let mockContainerRunner: jest.Mocked<ContainerTestRunner>;

  beforeEach(() => {
    // Create mocked instances
    mockNodeTester = new NodeVersionTester() as jest.Mocked<NodeVersionTester>;
    mockBrowserTester = new BrowserCompatibilityTester() as jest.Mocked<BrowserCompatibilityTester>;
    mockContainerRunner = new ContainerTestRunner() as jest.Mocked<ContainerTestRunner>;

    runner = new CrossPlatformTestRunner();

    // Set up default mock implementations
    mockNodeTester.testSingleVersion = jest.fn().mockResolvedValue({
      environment: {
        platform: 'darwin',
        arch: 'x64',
        nodeVersion: 'v18.18.0',
        npmVersion: '9.8.1',
        osVersion: 'macOS 13.0',
        cpuCount: 8,
        totalMemory: 17179869184,
        availableMemory: 8589934592,
        timezone: 'America/New_York',
        locale: 'en-US'
      },
      testSuite: 'node-18.18.0',
      passed: true,
      duration: 30000,
      errors: [],
      warnings: [],
      performance: {
        executionTime: 30000,
        memoryUsage: { peak: 100000000, average: 80000000, final: 90000000 },
        cpuUsage: { peak: 50, average: 30 }
      }
    });

    mockBrowserTester.testMultipleBrowsers = jest.fn().mockResolvedValue([]);
    mockContainerRunner.testSingleContainer = jest.fn().mockResolvedValue({
      environment: {
        platform: 'linux',
        arch: 'x64',
        nodeVersion: 'v18.18.0',
        npmVersion: '9.8.1',
        osVersion: 'Alpine Linux',
        cpuCount: 4,
        totalMemory: 8589934592,
        availableMemory: 4294967296,
        timezone: 'UTC',
        locale: 'en-US'
      },
      testSuite: 'docker-node:18-alpine',
      passed: true,
      duration: 45000,
      errors: [],
      warnings: [],
      performance: {
        executionTime: 45000,
        memoryUsage: { peak: 120000000, average: 100000000, final: 110000000 },
        cpuUsage: { peak: 60, average: 40 }
      }
    });

    mockNodeTester.getCompatibilityMatrix = jest.fn().mockResolvedValue([
      {
        version: '18.18.0',
        compatible: true,
        issues: [],
        features: ['fetch', 'test-runner', 'watch-mode']
      }
    ]);

    mockBrowserTester.getBrowserFeatureMatrix = jest.fn().mockResolvedValue([
      {
        browser: 'chrome',
        version: 'latest',
        features: [
          { name: 'es6-modules', supported: true, polyfillRequired: false },
          { name: 'fetch-api', supported: true, polyfillRequired: false }
        ]
      }
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runComprehensiveTests', () => {
    it('should run tests across all environments', async () => {
      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('supportMatrix');

      expect(report.summary.totalEnvironments).toBeGreaterThan(0);
      expect(Array.isArray(report.results)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should use custom configuration when provided', async () => {
      const testCommand = 'npm test';
      const config = {
        nodeVersions: ['20.8.0'],
        parallel: false,
        timeout: 120000
      };

      const report = await runner.runComprehensiveTests(testCommand, config);

      expect(mockNodeTester.testSingleVersion).toHaveBeenCalledWith('20.8.0', testCommand);
    });

    it('should handle test failures gracefully', async () => {
      mockNodeTester.testSingleVersion = jest.fn().mockResolvedValue({
        environment: {
          platform: 'darwin',
          arch: 'x64',
          nodeVersion: 'v18.18.0',
          npmVersion: '9.8.1',
          osVersion: 'macOS 13.0',
          cpuCount: 8,
          totalMemory: 17179869184,
          availableMemory: 8589934592,
          timezone: 'America/New_York',
          locale: 'en-US'
        },
        testSuite: 'node-18.18.0',
        passed: false,
        duration: 30000,
        errors: [{
          type: 'version',
          message: 'Test failed',
          severity: 'major',
          affectedTests: ['test1.js']
        }],
        warnings: [],
        performance: {
          executionTime: 30000,
          memoryUsage: { peak: 100000000, average: 80000000, final: 90000000 },
          cpuUsage: { peak: 50, average: 30 }
        }
      });

      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report.summary.failedEnvironments).toBeGreaterThan(0);
      expect(report.recommendations.some(rec => rec.includes('failed'))).toBe(true);
    });

    it('should skip browser tests for non-browser commands', async () => {
      const testCommand = 'npm run test:unit';
      await runner.runComprehensiveTests(testCommand);

      expect(mockBrowserTester.testMultipleBrowsers).not.toHaveBeenCalled();
    });

    it('should include browser tests for browser-related commands', async () => {
      const testCommand = 'npm run test:e2e';
      await runner.runComprehensiveTests(testCommand);

      expect(mockBrowserTester.testMultipleBrowsers).toHaveBeenCalled();
    });
  });

  describe('runQuickCheck', () => {
    it('should perform quick compatibility check', async () => {
      const testCommand = 'npm test';
      const result = await runner.runQuickCheck(testCommand);

      expect(result).toHaveProperty('compatible');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');

      expect(typeof result.compatible).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify compatibility issues', async () => {
      mockNodeTester.testSingleVersion = jest.fn().mockResolvedValue({
        environment: {
          platform: 'darwin',
          arch: 'x64',
          nodeVersion: 'v18.18.0',
          npmVersion: '9.8.1',
          osVersion: 'macOS 13.0',
          cpuCount: 8,
          totalMemory: 17179869184,
          availableMemory: 8589934592,
          timezone: 'America/New_York',
          locale: 'en-US'
        },
        testSuite: 'node-18.18.0',
        passed: false,
        duration: 30000,
        errors: [{
          type: 'version',
          message: 'Compatibility issue',
          severity: 'major',
          affectedTests: ['test1.js']
        }],
        warnings: [],
        performance: {
          executionTime: 30000,
          memoryUsage: { peak: 100000000, average: 80000000, final: 90000000 },
          cpuUsage: { peak: 50, average: 30 }
        }
      });

      const testCommand = 'npm test';
      const result = await runner.runQuickCheck(testCommand);

      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('generateSupportMatrix', () => {
    it('should generate comprehensive support matrix', async () => {
      const matrix = await runner.generateSupportMatrix();

      expect(matrix).toHaveProperty('platforms');
      expect(matrix).toHaveProperty('nodeVersions');
      expect(matrix).toHaveProperty('browsers');
      expect(matrix).toHaveProperty('containers');

      expect(Array.isArray(matrix.platforms)).toBe(true);
      expect(Array.isArray(matrix.nodeVersions)).toBe(true);
      expect(Array.isArray(matrix.browsers)).toBe(true);
      expect(Array.isArray(matrix.containers)).toBe(true);

      // Check platform support structure
      if (matrix.platforms.length > 0) {
        const platform = matrix.platforms[0];
        expect(platform).toHaveProperty('platform');
        expect(platform).toHaveProperty('supported');
        expect(typeof platform.supported).toBe('boolean');
      }

      // Check Node.js version support structure
      if (matrix.nodeVersions.length > 0) {
        const nodeVersion = matrix.nodeVersions[0];
        expect(nodeVersion).toHaveProperty('version');
        expect(nodeVersion).toHaveProperty('supported');
        expect(nodeVersion).toHaveProperty('tested');
        expect(typeof nodeVersion.supported).toBe('boolean');
        expect(typeof nodeVersion.tested).toBe('boolean');
      }
    });

    it('should include all major platforms', async () => {
      const matrix = await runner.generateSupportMatrix();

      const platformNames = matrix.platforms.map(p => p.platform);
      expect(platformNames).toContain('darwin');
      expect(platformNames).toContain('linux');
      expect(platformNames).toContain('win32');
    });

    it('should include container support information', async () => {
      const matrix = await runner.generateSupportMatrix();

      expect(matrix.containers.length).toBeGreaterThan(0);
      
      const dockerSupport = matrix.containers.find(c => c.runtime === 'docker');
      expect(dockerSupport).toBeDefined();
      expect(dockerSupport?.supported).toBe(true);
      expect(Array.isArray(dockerSupport?.baseImages)).toBe(true);
    });
  });

  describe('parallel execution', () => {
    it('should run tests in parallel when enabled', async () => {
      const testCommand = 'npm test';
      const config = {
        nodeVersions: ['18.18.0', '20.8.0'],
        parallel: true
      };

      await runner.runComprehensiveTests(testCommand, config);

      // Verify that testSingleVersion was called for each version
      expect(mockNodeTester.testSingleVersion).toHaveBeenCalledTimes(2);
      expect(mockNodeTester.testSingleVersion).toHaveBeenCalledWith('18.18.0', testCommand);
      expect(mockNodeTester.testSingleVersion).toHaveBeenCalledWith('20.8.0', testCommand);
    });

    it('should run tests sequentially when parallel is disabled', async () => {
      const testCommand = 'npm test';
      const config = {
        nodeVersions: ['18.18.0', '20.8.0'],
        parallel: false
      };

      await runner.runComprehensiveTests(testCommand, config);

      expect(mockNodeTester.testSingleVersion).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle Node.js tester errors gracefully', async () => {
      mockNodeTester.testSingleVersion = jest.fn().mockRejectedValue(new Error('Node test failed'));

      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report.summary.totalEnvironments).toBeGreaterThan(0);
      // Should still complete despite errors
    });

    it('should handle container runner errors gracefully', async () => {
      mockContainerRunner.testSingleContainer = jest.fn().mockRejectedValue(new Error('Container test failed'));

      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report.summary.totalEnvironments).toBeGreaterThan(0);
      // Should still complete despite errors
    });
  });

  describe('recommendations generation', () => {
    it('should generate appropriate recommendations for successful tests', async () => {
      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report.recommendations.some(rec => 
        rec.includes('All environments passed')
      )).toBe(true);
    });

    it('should generate recommendations for failed tests', async () => {
      mockNodeTester.testSingleVersion = jest.fn().mockResolvedValue({
        environment: {
          platform: 'darwin',
          arch: 'x64',
          nodeVersion: 'v18.18.0',
          npmVersion: '9.8.1',
          osVersion: 'macOS 13.0',
          cpuCount: 8,
          totalMemory: 17179869184,
          availableMemory: 8589934592,
          timezone: 'America/New_York',
          locale: 'en-US'
        },
        testSuite: 'node-18.18.0',
        passed: false,
        duration: 30000,
        errors: [{
          type: 'version',
          message: 'Test failed',
          severity: 'major',
          affectedTests: ['test1.js']
        }],
        warnings: [],
        performance: {
          executionTime: 30000,
          memoryUsage: { peak: 100000000, average: 80000000, final: 90000000 },
          cpuUsage: { peak: 50, average: 30 }
        }
      });

      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report.recommendations.some(rec => 
        rec.includes('environments failed')
      )).toBe(true);
    });

    it('should generate performance recommendations for slow tests', async () => {
      mockNodeTester.testSingleVersion = jest.fn().mockResolvedValue({
        environment: {
          platform: 'darwin',
          arch: 'x64',
          nodeVersion: 'v18.18.0',
          npmVersion: '9.8.1',
          osVersion: 'macOS 13.0',
          cpuCount: 8,
          totalMemory: 17179869184,
          availableMemory: 8589934592,
          timezone: 'America/New_York',
          locale: 'en-US'
        },
        testSuite: 'node-18.18.0',
        passed: true,
        duration: 120000, // 2 minutes - slow
        errors: [],
        warnings: [],
        performance: {
          executionTime: 120000,
          memoryUsage: { peak: 100000000, average: 80000000, final: 90000000 },
          cpuUsage: { peak: 50, average: 30 }
        }
      });

      const testCommand = 'npm test';
      const report = await runner.runComprehensiveTests(testCommand);

      expect(report.recommendations.some(rec => 
        rec.includes('slow') || rec.includes('performance')
      )).toBe(true);
    });
  });
});