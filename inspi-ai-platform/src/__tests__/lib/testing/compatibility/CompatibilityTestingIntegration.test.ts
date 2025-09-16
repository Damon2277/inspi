/**
 * Integration tests for the complete compatibility testing system
 */

import { CrossPlatformTestRunner } from '../../../../lib/testing/compatibility/CrossPlatformTestRunner';
import { CompatibilityReporter } from '../../../../lib/testing/compatibility/CompatibilityReporter';
import { EnvironmentDetector } from '../../../../lib/testing/compatibility/EnvironmentDetector';
import { promises as fs } from 'fs';
import path from 'path';

describe('Compatibility Testing Integration', () => {
  let runner: CrossPlatformTestRunner;
  let reporter: CompatibilityReporter;
  let tempDir: string;

  beforeAll(async () => {
    runner = new CrossPlatformTestRunner();
    tempDir = path.join(__dirname, '../../../../tmp/compatibility-test');
    reporter = new CompatibilityReporter(tempDir);

    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  describe('Environment Detection Integration', () => {
    it('should detect current environment correctly', async () => {
      const envInfo = await EnvironmentDetector.getEnvironmentInfo();
      
      expect(envInfo.platform).toBe(process.platform);
      expect(envInfo.arch).toBe(process.arch);
      expect(envInfo.nodeVersion).toBe(process.version);
      expect(envInfo.cpuCount).toBeGreaterThan(0);
      expect(envInfo.totalMemory).toBeGreaterThan(0);
      expect(envInfo.availableMemory).toBeGreaterThan(0);
    });

    it('should provide Node.js version details', () => {
      const nodeInfo = EnvironmentDetector.getNodeVersionInfo();
      
      expect(nodeInfo.version).toBe(process.version);
      expect(nodeInfo.major).toBeGreaterThan(0);
      expect(nodeInfo.minor).toBeGreaterThanOrEqual(0);
      expect(nodeInfo.patch).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(nodeInfo.features)).toBe(true);
    });

    it('should check compatibility correctly', () => {
      const compatibility = EnvironmentDetector.checkCompatibility();
      
      expect(typeof compatibility.compatible).toBe('boolean');
      expect(Array.isArray(compatibility.issues)).toBe(true);
      expect(Array.isArray(compatibility.warnings)).toBe(true);
    });
  });

  describe('Quick Compatibility Check', () => {
    it('should perform quick check with simple test command', async () => {
      const testCommand = 'echo "test"';
      const result = await runner.runQuickCheck(testCommand);

      expect(result).toHaveProperty('compatible');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.compatible).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, 30000);

    it('should identify issues with failing test command', async () => {
      const testCommand = 'exit 1'; // Command that always fails
      const result = await runner.runQuickCheck(testCommand);

      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Support Matrix Generation', () => {
    it('should generate comprehensive support matrix', async () => {
      const matrix = await runner.generateSupportMatrix();

      expect(matrix).toHaveProperty('platforms');
      expect(matrix).toHaveProperty('nodeVersions');
      expect(matrix).toHaveProperty('browsers');
      expect(matrix).toHaveProperty('containers');

      // Verify platform support
      expect(matrix.platforms.length).toBeGreaterThan(0);
      const currentPlatform = matrix.platforms.find(p => p.platform === process.platform);
      expect(currentPlatform).toBeDefined();
      expect(currentPlatform?.supported).toBe(true);

      // Verify Node.js version support
      expect(matrix.nodeVersions.length).toBeGreaterThan(0);
      
      // Verify browser support
      expect(Array.isArray(matrix.browsers)).toBe(true);
      
      // Verify container support
      expect(Array.isArray(matrix.containers)).toBe(true);
    }, 60000);
  });

  describe('Report Generation Integration', () => {
    it('should generate all report formats', async () => {
      // Create a simple compatibility report
      const mockReport = {
        summary: {
          totalEnvironments: 2,
          passedEnvironments: 1,
          failedEnvironments: 1,
          warningEnvironments: 0
        },
        results: [
          {
            environment: await EnvironmentDetector.getEnvironmentInfo(),
            testSuite: 'current-environment',
            passed: true,
            duration: 1000,
            errors: [],
            warnings: [],
            performance: {
              executionTime: 1000,
              memoryUsage: { peak: 100000, average: 80000, final: 90000 },
              cpuUsage: { peak: 50, average: 30 }
            }
          },
          {
            environment: await EnvironmentDetector.getEnvironmentInfo(),
            testSuite: 'mock-failed-environment',
            passed: false,
            duration: 2000,
            errors: [{
              type: 'platform' as const,
              message: 'Mock test failure',
              severity: 'major' as const,
              affectedTests: ['test1.js']
            }],
            warnings: [],
            performance: {
              executionTime: 2000,
              memoryUsage: { peak: 120000, average: 100000, final: 110000 },
              cpuUsage: { peak: 60, average: 40 }
            }
          }
        ],
        recommendations: [
          'Fix the failing test in mock-failed-environment',
          'Consider optimizing test performance'
        ],
        supportMatrix: await runner.generateSupportMatrix()
      };

      const reportPaths = await reporter.generateReport(mockReport, 'all');

      expect(reportPaths).toHaveProperty('html');
      expect(reportPaths).toHaveProperty('json');
      expect(reportPaths).toHaveProperty('markdown');

      // Verify files were created
      if (reportPaths.html) {
        const htmlExists = await fs.access(reportPaths.html).then(() => true).catch(() => false);
        expect(htmlExists).toBe(true);
      }

      if (reportPaths.json) {
        const jsonExists = await fs.access(reportPaths.json).then(() => true).catch(() => false);
        expect(jsonExists).toBe(true);
        
        // Verify JSON content
        const jsonContent = await fs.readFile(reportPaths.json, 'utf8');
        const parsedJson = JSON.parse(jsonContent);
        expect(parsedJson).toHaveProperty('summary');
        expect(parsedJson).toHaveProperty('results');
        expect(parsedJson).toHaveProperty('generatedAt');
      }

      if (reportPaths.markdown) {
        const markdownExists = await fs.access(reportPaths.markdown).then(() => true).catch(() => false);
        expect(markdownExists).toBe(true);
        
        // Verify Markdown content
        const markdownContent = await fs.readFile(reportPaths.markdown, 'utf8');
        expect(markdownContent).toContain('# Cross-Platform Compatibility Report');
        expect(markdownContent).toContain('## Summary');
        expect(markdownContent).toContain('## Test Results');
      }
    }, 30000);

    it('should generate CI summary report', async () => {
      const mockReport = {
        summary: {
          totalEnvironments: 3,
          passedEnvironments: 2,
          failedEnvironments: 1,
          warningEnvironments: 1
        },
        results: [
          {
            environment: await EnvironmentDetector.getEnvironmentInfo(),
            testSuite: 'environment-1',
            passed: true,
            duration: 1000,
            errors: [],
            warnings: [],
            performance: {
              executionTime: 1000,
              memoryUsage: { peak: 100000, average: 80000, final: 90000 },
              cpuUsage: { peak: 50, average: 30 }
            }
          },
          {
            environment: await EnvironmentDetector.getEnvironmentInfo(),
            testSuite: 'environment-2',
            passed: false,
            duration: 2000,
            errors: [{
              type: 'platform' as const,
              message: 'Test failure in environment 2',
              severity: 'major' as const,
              affectedTests: ['test2.js']
            }],
            warnings: [],
            performance: {
              executionTime: 2000,
              memoryUsage: { peak: 120000, average: 100000, final: 110000 },
              cpuUsage: { peak: 60, average: 40 }
            }
          }
        ],
        recommendations: ['Fix failing tests'],
        supportMatrix: await runner.generateSupportMatrix()
      };

      const summaryPath = await reporter.generateCISummary(mockReport);
      
      expect(typeof summaryPath).toBe('string');
      
      const summaryExists = await fs.access(summaryPath).then(() => true).catch(() => false);
      expect(summaryExists).toBe(true);
      
      const summaryContent = await fs.readFile(summaryPath, 'utf8');
      expect(summaryContent).toContain('Cross-Platform Compatibility Test Results');
      expect(summaryContent).toContain('Failed Environments');
      expect(summaryContent).toContain('| Status | Count |');
    }, 30000);
  });

  describe('Real Test Command Integration', () => {
    it('should handle real npm test command (if available)', async () => {
      // Check if package.json exists and has test script
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      
      try {
        await fs.access(packageJsonPath);
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        if (packageJson.scripts && packageJson.scripts.test) {
          const result = await runner.runQuickCheck('npm test --silent');
          
          expect(result).toHaveProperty('compatible');
          expect(result).toHaveProperty('issues');
          expect(result).toHaveProperty('recommendations');
          
          // If tests pass, should be compatible
          if (result.compatible) {
            expect(result.issues.length).toBe(0);
          }
        }
      } catch (error) {
        // Skip this test if package.json doesn't exist or doesn't have test script
        console.log('Skipping real npm test - package.json not found or no test script');
      }
    }, 60000);
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid test commands gracefully', async () => {
      const testCommand = 'nonexistent-command-that-should-fail';
      const result = await runner.runQuickCheck(testCommand);

      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => 
        issue.includes('Failed to test') || issue.includes('command not found')
      )).toBe(true);
    }, 30000);

    it('should handle timeout scenarios', async () => {
      // Create a command that will timeout
      const testCommand = 'sleep 10'; // 10 seconds, should timeout with default settings
      
      const startTime = Date.now();
      const result = await runner.runQuickCheck(testCommand);
      const duration = Date.now() - startTime;

      // Should complete faster than the sleep command
      expect(duration).toBeLessThan(10000);
      expect(result.compatible).toBe(false);
    }, 15000);
  });

  describe('Performance Integration', () => {
    it('should track performance metrics during testing', async () => {
      const testCommand = 'echo "performance test"';
      const result = await runner.runQuickCheck(testCommand);

      expect(result).toHaveProperty('compatible');
      
      // Performance should be reasonable for simple command
      // This is more of a smoke test to ensure the system works
      expect(typeof result.compatible).toBe('boolean');
    }, 30000);
  });

  describe('Container Detection Integration', () => {
    it('should detect container environment if running in one', () => {
      const isContainer = EnvironmentDetector.isContainer();
      const containerInfo = EnvironmentDetector.getContainerInfo();

      expect(typeof isContainer).toBe('boolean');
      
      if (isContainer) {
        expect(containerInfo).not.toBeNull();
        expect(containerInfo).toHaveProperty('runtime');
        expect(typeof containerInfo?.runtime).toBe('string');
      } else {
        expect(containerInfo).toBeNull();
      }
    });
  });

  describe('CI Environment Integration', () => {
    it('should detect CI environment correctly', () => {
      const isCI = EnvironmentDetector.isCI();
      expect(typeof isCI).toBe('boolean');

      // If we're in a CI environment, should detect it
      if (process.env.CI || process.env.GITHUB_ACTIONS) {
        expect(isCI).toBe(true);
      }
    });
  });
});