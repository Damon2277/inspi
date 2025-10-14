/**
 * Node.js Version Compatibility Tester
 * Tests compatibility across different Node.js versions
 */

import { spawn, SpawnOptions } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import { EnvironmentDetector } from './EnvironmentDetector';
import { NodeVersionInfo, CompatibilityTestResult, PerformanceMetrics } from './types';

export class NodeVersionTester {
  private supportedVersions: string[] = [
    '18.17.0',
    '18.18.0',
    '20.5.0',
    '20.6.0',
    '20.8.0',
    '21.0.0',
  ];

  private testTimeout = 300000; // 5 minutes

  /**
   * Test compatibility across multiple Node.js versions
   */
  async testMultipleVersions(
    testCommand: string,
    versions?: string[],
  ): Promise<CompatibilityTestResult[]> {
    const versionsToTest = versions || this.supportedVersions;
    const results: CompatibilityTestResult[] = [];

    for (const version of versionsToTest) {
      try {
        const result = await this.testSingleVersion(version, testCommand);
        results.push(result);
      } catch (error) {
        results.push({
          environment: await EnvironmentDetector.getEnvironmentInfo(),
          testSuite: `node-${version}`,
          passed: false,
          duration: 0,
          errors: [{
            type: 'version',
            message: `Failed to test Node.js ${version}: ${error}`,
            severity: 'critical',
            affectedTests: ['all'],
          }],
          warnings: [],
          performance: this.getEmptyPerformanceMetrics(),
        });
      }
    }

    return results;
  }

  /**
   * Test compatibility with a specific Node.js version
   */
  async testSingleVersion(
    version: string,
    testCommand: string,
  ): Promise<CompatibilityTestResult> {
    const startTime = Date.now();
    const environment = await EnvironmentDetector.getEnvironmentInfo();

    // Check if version is available
    const isAvailable = await this.isVersionAvailable(version);
    if (!isAvailable) {
      return {
        environment,
        testSuite: `node-${version}`,
        passed: false,
        duration: Date.now() - startTime,
        errors: [{
          type: 'version',
          message: `Node.js version ${version} is not available`,
          severity: 'critical',
          suggestion: 'Install the required Node.js version using nvm or similar tool',
          affectedTests: ['all'],
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics(),
      };
    }

    try {
      const testResult = await this.runTestWithVersion(version, testCommand);
      const duration = Date.now() - startTime;

      return {
        environment: {
          ...environment,
          nodeVersion: `v${version}`,
        },
        testSuite: `node-${version}`,
        passed: testResult.exitCode === 0,
        duration,
        errors: testResult.exitCode !== 0 ? [{
          type: 'version',
          message: `Tests failed with Node.js ${version}`,
          severity: 'major',
          affectedTests: this.parseFailedTests(testResult.stderr),
        }] : [],
        warnings: this.parseWarnings(testResult.stdout, testResult.stderr),
        performance: testResult.performance,
      };
    } catch (error) {
      return {
        environment,
        testSuite: `node-${version}`,
        passed: false,
        duration: Date.now() - startTime,
        errors: [{
          type: 'version',
          message: `Error running tests with Node.js ${version}: ${error}`,
          severity: 'critical',
          affectedTests: ['all'],
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics(),
      };
    }
  }

  /**
   * Get Node.js version compatibility matrix
   */
  async getCompatibilityMatrix(): Promise<{
    version: string;
    compatible: boolean;
    issues: string[];
    features: string[];
  }[]> {
    const matrix = [];

    for (const version of this.supportedVersions) {
      const versionInfo = this.parseVersion(version);
      const compatible = await this.checkVersionCompatibility(version);
      const issues = await this.getVersionIssues(version);
      const features = this.getVersionFeatures(versionInfo.major, versionInfo.minor);

      matrix.push({
        version,
        compatible,
        issues,
        features,
      });
    }

    return matrix;
  }

  /**
   * Check if a specific Node.js version is available
   */
  private async isVersionAvailable(version: string): Promise<boolean> {
    try {
      // Try using nvm if available
      const nvmResult = await this.runCommand(`nvm use ${version} && node --version`);
      if (nvmResult.exitCode === 0) {
        return true;
      }

      // Try direct node command with version check
      const nodeResult = await this.runCommand('node --version');
      if (nodeResult.exitCode === 0 && nodeResult.stdout.includes(version)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Run tests with a specific Node.js version
   */
  private async runTestWithVersion(
    version: string,
    testCommand: string,
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    performance: PerformanceMetrics;
  }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Prepare command with version switching
    const fullCommand = `nvm use ${version} && ${testCommand}`;

    const result = await this.runCommand(fullCommand, {
      timeout: this.testTimeout,
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    const performance: PerformanceMetrics = {
      executionTime: endTime - startTime,
      memoryUsage: {
        peak: Math.max(endMemory.heapUsed, startMemory.heapUsed),
        average: (endMemory.heapUsed + startMemory.heapUsed) / 2,
        final: endMemory.heapUsed,
      },
      cpuUsage: {
        peak: 0, // Would need more sophisticated monitoring
        average: 0,
      },
    };

    return {
      ...result,
      performance,
    };
  }

  /**
   * Run a shell command and return result
   */
  private async runCommand(
    command: string,
    options: SpawnOptions & { timeout?: number } = {},
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        shell: true,
        stdio: 'pipe',
        ...options,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = options.timeout || 30000;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Parse version string into components
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  /**
   * Check version compatibility
   */
  private async checkVersionCompatibility(version: string): Promise<boolean> {
    try {
      const versionInfo = this.parseVersion(version);

      // Check minimum supported version
      if (versionInfo.major < 18) {
        return false;
      }

      // Check for known incompatible versions
      const incompatibleVersions = ['18.0.0', '18.1.0']; // Example
      if (incompatibleVersions.includes(version)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get known issues for a version
   */
  private async getVersionIssues(version: string): Promise<string[]> {
    const issues: string[] = [];
    const versionInfo = this.parseVersion(version);

    // Add known issues based on version
    if (versionInfo.major === 18 && versionInfo.minor < 17) {
      issues.push('Potential memory leak in test runner');
    }

    if (versionInfo.major === 20 && versionInfo.minor < 5) {
      issues.push('Performance regression in module loading');
    }

    return issues;
  }

  /**
   * Get features available in a version
   */
  private getVersionFeatures(major: number, minor: number): string[] {
    const features: string[] = [];

    if (major >= 18) {
      features.push('native-fetch', 'test-runner', 'watch-mode');
    }

    if (major >= 19) {
      features.push('stable-test-runner');
    }

    if (major >= 20) {
      features.push('permission-model', 'single-executable-apps');
    }

    return features;
  }

  /**
   * Parse failed tests from stderr
   */
  private parseFailedTests(stderr: string): string[] {
    const failedTests: string[] = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
      // Look for Jest/test runner failure patterns
      const testMatch = line.match(/FAIL\s+(.+\.test\.[jt]s)/);
      if (testMatch) {
        failedTests.push(testMatch[1]);
      }
    }

    return failedTests.length > 0 ? failedTests : ['unknown'];
  }

  /**
   * Parse warnings from output
   */
  private parseWarnings(stdout: string, stderr: string): Array<{
    type: 'deprecation' | 'performance' | 'compatibility';
    message: string;
    affectedTests: string[];
  }> {
    const warnings = [];
    const output = stdout + stderr;

    // Look for deprecation warnings
    const deprecationMatches = output.match(/DeprecationWarning: (.+)/g);
    if (deprecationMatches) {
      for (const match of deprecationMatches) {
        warnings.push({
          type: 'deprecation' as const,
          message: match,
          affectedTests: ['all'],
        });
      }
    }

    // Look for performance warnings
    const performanceMatches = output.match(/Performance warning: (.+)/g);
    if (performanceMatches) {
      for (const match of performanceMatches) {
        warnings.push({
          type: 'performance' as const,
          message: match,
          affectedTests: ['all'],
        });
      }
    }

    return warnings;
  }

  /**
   * Get empty performance metrics
   */
  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      executionTime: 0,
      memoryUsage: {
        peak: 0,
        average: 0,
        final: 0,
      },
      cpuUsage: {
        peak: 0,
        average: 0,
      },
    };
  }
}
