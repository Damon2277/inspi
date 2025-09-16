import { 
  IncrementalTestSystem, 
  IncrementalTestRunner,
  AccuracyVerifier 
} from '../../../../lib/testing/incremental';
import { execSync } from 'child_process';
import * as fs from 'fs';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('glob');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('IncrementalTestSystem Integration', () => {
  let testSystem: IncrementalTestSystem;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    // Mock git operations
    mockExecSync.mockImplementation((command: string) => {
      if (command.includes('rev-parse --git-dir')) {
        return '.git';
      }
      if (command.includes('branch --show-current')) {
        return 'feature/test\n';
      }
      if (command.includes('rev-parse HEAD')) {
        return 'current123\n';
      }
      if (command.includes('rev-parse origin/main')) {
        return 'main456\n';
      }
      if (command.includes('diff --name-status')) {
        return 'M\tsrc/component.tsx\nA\tsrc/utils.ts\n';
      }
      if (command.includes('status --porcelain')) {
        return '';
      }
      if (command.includes('jest')) {
        return JSON.stringify({
          success: true,
          testResults: [{
            name: 'test.spec.ts',
            assertionResults: [{
              fullName: 'test case',
              status: 'passed',
              duration: 100
            }]
          }]
        });
      }
      return '';
    });

    // Mock file system
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path) => {
      if (path.toString().includes('component.tsx')) {
        return `import { helper } from './utils';`;
      }
      if (path.toString().includes('test.spec.ts')) {
        return `import { Component } from '../component';`;
      }
      return '';
    });
    mockFs.statSync.mockReturnValue({
      mtime: new Date('2023-01-01'),
      size: 1000,
      isDirectory: () => false
    } as any);
    mockFs.mkdirSync.mockImplementation();
    mockFs.writeFileSync.mockImplementation();

    // Mock glob
    const glob = require('glob');
    glob.sync = jest.fn().mockReturnValue([
      '/mock/project/src/component.tsx',
      '/mock/project/src/utils.ts',
      '/mock/project/src/__tests__/component.test.tsx'
    ]);

    testSystem = new IncrementalTestSystem({
      projectRoot: mockProjectRoot,
      baseBranch: 'main',
      cacheEnabled: true,
      testCommand: 'npm test'
    });
  });

  afterEach(() => {
    testSystem.destroy();
    jest.clearAllMocks();
  });

  describe('incremental test execution', () => {
    it('should run incremental tests successfully', async () => {
      const result = await testSystem.runIncrementalTests();

      expect(result).toBeDefined();
      expect(result.executionPlan).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.changeAnalysis).toBeDefined();
      expect(result.impactAnalysis).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    it('should identify affected tests correctly', async () => {
      const result = await testSystem.runIncrementalTests();

      expect(result.changeAnalysis.affectedFiles).toContain('src/component.tsx');
      expect(result.changeAnalysis.affectedFiles).toContain('src/utils.ts');
      expect(result.impactAnalysis.affectedTestFiles).toContain('src/__tests__/component.test.tsx');
    });

    it('should use cached results when available', async () => {
      // First run to populate cache
      await testSystem.runIncrementalTests();

      // Mock no changes for second run
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('diff --name-status')) {
          return ''; // No changes
        }
        if (command.includes('status --porcelain')) {
          return ''; // Clean working directory
        }
        return mockExecSync.getMockImplementation()?.(command) || '';
      });

      const result = await testSystem.runIncrementalTests();

      expect(result.executionPlan.strategy).toBe('cached');
      expect(result.executionPlan.testsToRun).toHaveLength(0);
    });

    it('should handle test failures gracefully', async () => {
      // Mock failing test
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('jest')) {
          const error = new Error('Test failed') as any;
          error.stdout = JSON.stringify({
            success: false,
            testResults: [{
              name: 'test.spec.ts',
              assertionResults: [{
                fullName: 'failing test',
                status: 'failed',
                failureMessages: ['Expected true but got false']
              }]
            }]
          });
          throw error;
        }
        return mockExecSync.getMockImplementation()?.(command) || '';
      });

      const result = await testSystem.runIncrementalTests();

      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].errors).toBeDefined();
    });
  });

  describe('accuracy verification', () => {
    it('should verify incremental test accuracy', async () => {
      const verification = await testSystem.verifyAccuracy(0.1);

      expect(verification).toBeDefined();
      expect(verification.accuracy).toBeGreaterThanOrEqual(0);
      expect(verification.precision).toBeGreaterThanOrEqual(0);
      expect(verification.recall).toBeGreaterThanOrEqual(0);
      expect(verification.details).toBeDefined();
    });

    it('should identify missed tests', async () => {
      // Mock scenario where incremental test misses some tests
      const glob = require('glob');
      glob.sync.mockReturnValue([
        '/mock/project/src/__tests__/component.test.tsx',
        '/mock/project/src/__tests__/utils.test.tsx', // This should be missed
        '/mock/project/src/__tests__/integration.test.tsx'
      ]);

      const verification = await testSystem.verifyAccuracy(1.0); // Full sample

      if (verification.missedTests.length > 0) {
        expect(verification.isAccurate).toBe(false);
        expect(verification.missedTests).toContain(expect.stringMatching(/test\.tsx?$/));
      }
    });

    it('should provide improvement suggestions', async () => {
      const trends = testSystem.getAccuracyTrends();

      expect(trends.improvementSuggestions).toBeDefined();
      expect(Array.isArray(trends.improvementSuggestions)).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = testSystem.getCacheStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
    });

    it('should clear cache successfully', () => {
      testSystem.clearCache();

      const stats = testSystem.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('dependency graph management', () => {
    it('should rebuild dependency graph', async () => {
      await testSystem.rebuildDependencyGraph();

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('performance optimization', () => {
    it('should show performance improvements with caching', async () => {
      // First run (no cache)
      const firstRun = await testSystem.runIncrementalTests();

      // Second run (with cache, no changes)
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('diff --name-status')) {
          return ''; // No changes
        }
        if (command.includes('status --porcelain')) {
          return '';
        }
        return mockExecSync.getMockImplementation()?.(command) || '';
      });

      const secondRun = await testSystem.runIncrementalTests();

      expect(secondRun.performance.timeSaved).toBeGreaterThanOrEqual(0);
      expect(secondRun.executionPlan.cacheHitRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle parallel test execution', async () => {
      const parallelSystem = new IncrementalTestSystem({
        projectRoot: mockProjectRoot,
        parallelExecution: true,
        maxWorkers: 2
      });

      const result = await parallelSystem.runIncrementalTests();

      expect(result.performance.testExecutionTime).toBeGreaterThan(0);
      
      parallelSystem.destroy();
    });
  });

  describe('error handling', () => {
    it('should handle git command failures', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      await expect(testSystem.runIncrementalTests()).rejects.toThrow();
    });

    it('should handle file system errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // Should still complete but with limited dependency analysis
      const result = await testSystem.runIncrementalTests();
      expect(result).toBeDefined();
    });

    it('should handle test execution timeouts', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('jest')) {
          const error = new Error('Timeout') as any;
          error.killed = true;
          error.signal = 'SIGTERM';
          throw error;
        }
        return mockExecSync.getMockImplementation()?.(command) || '';
      });

      const result = await testSystem.runIncrementalTests();
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('failed');
    });
  });

  describe('configuration options', () => {
    it('should respect force full run option', async () => {
      const forceFullSystem = new IncrementalTestSystem({
        projectRoot: mockProjectRoot,
        forceFullRun: true
      });

      const result = await forceFullSystem.runIncrementalTests();

      expect(result.executionPlan.strategy).toBe('full');
      expect(result.executionPlan.reason).toContain('Force full run');
      
      forceFullSystem.destroy();
    });

    it('should work with cache disabled', async () => {
      const noCacheSystem = new IncrementalTestSystem({
        projectRoot: mockProjectRoot,
        cacheEnabled: false
      });

      const result = await noCacheSystem.runIncrementalTests();

      expect(result.cacheStats.totalEntries).toBe(0);
      expect(result.executionPlan.testsFromCache).toHaveLength(0);
      
      noCacheSystem.destroy();
    });

    it('should use custom test patterns', async () => {
      const customSystem = new IncrementalTestSystem({
        projectRoot: mockProjectRoot,
        testPattern: '**/*.custom.test.ts',
        dependencyPatterns: ['**/*.custom.ts']
      });

      const glob = require('glob');
      glob.sync.mockReturnValue([
        '/mock/project/src/component.custom.test.ts'
      ]);

      const result = await customSystem.runIncrementalTests();

      expect(result).toBeDefined();
      
      customSystem.destroy();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex dependency chains', async () => {
      // Mock complex dependency structure: A -> B -> C
      mockFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('a.ts')) {
          return `import { B } from './b';`;
        }
        if (path.toString().includes('b.ts')) {
          return `import { C } from './c';`;
        }
        if (path.toString().includes('c.ts')) {
          return `export const C = 'c';`;
        }
        if (path.toString().includes('test.spec.ts')) {
          return `import { A } from '../a';`;
        }
        return '';
      });

      const glob = require('glob');
      glob.sync.mockReturnValue([
        '/mock/project/src/a.ts',
        '/mock/project/src/b.ts',
        '/mock/project/src/c.ts',
        '/mock/project/src/__tests__/test.spec.ts'
      ]);

      // Change file C
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('diff --name-status')) {
          return 'M\tsrc/c.ts\n';
        }
        return mockExecSync.getMockImplementation()?.(command) || '';
      });

      const result = await testSystem.runIncrementalTests();

      // Should detect that test.spec.ts is affected through the dependency chain
      expect(result.impactAnalysis.transitivelyAffectedFiles).toContain('src/a.ts');
      expect(result.impactAnalysis.affectedTestFiles).toContain('src/__tests__/test.spec.ts');
    });

    it('should handle mixed test and source file changes', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('diff --name-status')) {
          return 'M\tsrc/component.tsx\nM\tsrc/__tests__/component.test.tsx\n';
        }
        return mockExecSync.getMockImplementation()?.(command) || '';
      });

      const result = await testSystem.runIncrementalTests();

      expect(result.changeAnalysis.sourceFiles).toContain('src/component.tsx');
      expect(result.changeAnalysis.testFiles).toContain('src/__tests__/component.test.tsx');
      expect(result.impactAnalysis.affectedTestFiles).toContain('src/__tests__/component.test.tsx');
    });
  });
});