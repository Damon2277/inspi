/**
 * Container Test Runner
 * Runs tests in containerized environments for consistency
 */

import { spawn, SpawnOptions } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { ContainerInfo, ContainerConfig, CompatibilityTestResult } from './types';
import { EnvironmentDetector } from './EnvironmentDetector';

export class ContainerTestRunner {
  private supportedContainers: ContainerConfig[] = [
    {
      runtime: 'docker',
      image: 'node:18-alpine',
      nodeVersion: '18.18.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true'
      }
    },
    {
      runtime: 'docker',
      image: 'node:20-alpine',
      nodeVersion: '20.8.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true'
      }
    },
    {
      runtime: 'docker',
      image: 'node:18-slim',
      nodeVersion: '18.18.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true'
      }
    },
    {
      runtime: 'docker',
      image: 'node:20-slim',
      nodeVersion: '20.8.0',
      environment: {
        NODE_ENV: 'test',
        CI: 'true'
      }
    }
  ];

  private testTimeout = 600000; // 10 minutes for container tests

  /**
   * Test in multiple container environments
   */
  async testMultipleContainers(
    testCommand: string,
    containers?: ContainerConfig[]
  ): Promise<CompatibilityTestResult[]> {
    const containersToTest = containers || this.supportedContainers;
    const results: CompatibilityTestResult[] = [];

    for (const container of containersToTest) {
      try {
        const result = await this.testSingleContainer(container, testCommand);
        results.push(result);
      } catch (error) {
        results.push({
          environment: await EnvironmentDetector.getEnvironmentInfo(),
          testSuite: `${container.runtime}-${container.image}`,
          passed: false,
          duration: 0,
          errors: [{
            type: 'platform',
            message: `Failed to test container ${container.image}: ${error}`,
            severity: 'critical',
            affectedTests: ['all']
          }],
          warnings: [],
          performance: this.getEmptyPerformanceMetrics()
        });
      }
    }

    return results;
  }

  /**
   * Test in a specific container environment
   */
  async testSingleContainer(
    container: ContainerConfig,
    testCommand: string
  ): Promise<CompatibilityTestResult> {
    const startTime = Date.now();
    const environment = await EnvironmentDetector.getEnvironmentInfo();

    // Check if container runtime is available
    const isAvailable = await this.isContainerRuntimeAvailable(container.runtime);
    if (!isAvailable) {
      return {
        environment,
        testSuite: `${container.runtime}-${container.image}`,
        passed: false,
        duration: Date.now() - startTime,
        errors: [{
          type: 'platform',
          message: `Container runtime ${container.runtime} is not available`,
          severity: 'critical',
          suggestion: `Install ${container.runtime} to run containerized tests`,
          affectedTests: ['all']
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics()
      };
    }

    try {
      // Pull container image if needed
      await this.ensureContainerImage(container);

      // Run tests in container
      const testResult = await this.runContainerTest(container, testCommand);
      const duration = Date.now() - startTime;

      return {
        environment: {
          ...environment,
          nodeVersion: container.nodeVersion
        },
        testSuite: `${container.runtime}-${container.image}`,
        passed: testResult.passed,
        duration,
        errors: testResult.errors,
        warnings: testResult.warnings,
        performance: testResult.performance
      };
    } catch (error) {
      return {
        environment,
        testSuite: `${container.runtime}-${container.image}`,
        passed: false,
        duration: Date.now() - startTime,
        errors: [{
          type: 'platform',
          message: `Error running container tests: ${error}`,
          severity: 'critical',
          affectedTests: ['all']
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics()
      };
    }
  }

  /**
   * Get container information
   */
  async getContainerInfo(container: ContainerConfig): Promise<ContainerInfo> {
    const version = await this.getContainerRuntimeVersion(container.runtime);
    
    return {
      runtime: container.runtime as 'docker' | 'podman' | 'containerd',
      version,
      baseImage: container.image,
      nodeVersion: container.nodeVersion,
      architecture: process.arch,
      memoryLimit: container.environment?.MEMORY_LIMIT ? 
        parseInt(container.environment.MEMORY_LIMIT, 10) : undefined,
      cpuLimit: container.environment?.CPU_LIMIT ? 
        parseFloat(container.environment.CPU_LIMIT) : undefined
    };
  }

  /**
   * Create optimized container configuration
   */
  createOptimizedConfig(baseConfig: ContainerConfig): ContainerConfig {
    return {
      ...baseConfig,
      environment: {
        ...baseConfig.environment,
        // Optimize for testing
        NODE_OPTIONS: '--max-old-space-size=4096',
        FORCE_COLOR: '0', // Disable colors for cleaner logs
        CI: 'true',
        // Enable test optimizations
        JEST_WORKERS: '2',
        NODE_ENV: 'test'
      },
      volumes: [
        // Mount source code
        `${process.cwd()}:/app`,
        // Mount node_modules for faster installs
        '/app/node_modules'
      ]
    };
  }

  /**
   * Check if container runtime is available
   */
  private async isContainerRuntimeAvailable(runtime: string): Promise<boolean> {
    try {
      const result = await this.runCommand(`${runtime} --version`);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get container runtime version
   */
  private async getContainerRuntimeVersion(runtime: string): Promise<string> {
    try {
      const result = await this.runCommand(`${runtime} --version`);
      if (result.exitCode === 0) {
        // Extract version from output
        const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : 'unknown';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Ensure container image is available
   */
  private async ensureContainerImage(container: ContainerConfig): Promise<void> {
    // Check if image exists locally
    const checkResult = await this.runCommand(
      `${container.runtime} images -q ${container.image}`
    );

    if (checkResult.exitCode !== 0 || !checkResult.stdout.trim()) {
      // Pull the image
      console.log(`Pulling container image: ${container.image}`);
      const pullResult = await this.runCommand(
        `${container.runtime} pull ${container.image}`,
        { timeout: 300000 } // 5 minutes for image pull
      );

      if (pullResult.exitCode !== 0) {
        throw new Error(`Failed to pull image ${container.image}: ${pullResult.stderr}`);
      }
    }
  }

  /**
   * Run tests in container
   */
  private async runContainerTest(
    container: ContainerConfig,
    testCommand: string
  ): Promise<{
    passed: boolean;
    errors: any[];
    warnings: any[];
    performance: any;
  }> {
    const startTime = Date.now();

    // Prepare container run command
    const containerCmd = this.buildContainerCommand(container, testCommand);

    try {
      const result = await this.runCommand(containerCmd, { 
        timeout: this.testTimeout,
        cwd: process.cwd()
      });

      const endTime = Date.now();
      const performance = {
        executionTime: endTime - startTime,
        memoryUsage: {
          peak: 0, // Would need container stats
          average: 0,
          final: 0
        },
        cpuUsage: {
          peak: 0,
          average: 0
        }
      };

      return {
        passed: result.exitCode === 0,
        errors: result.exitCode !== 0 ? [{
          type: 'platform',
          message: `Container tests failed: ${result.stderr}`,
          severity: 'major',
          affectedTests: this.parseFailedTests(result.stderr)
        }] : [],
        warnings: this.parseContainerWarnings(result.stdout, result.stderr),
        performance
      };
    } catch (error) {
      return {
        passed: false,
        errors: [{
          type: 'platform',
          message: `Container test execution failed: ${error}`,
          severity: 'critical',
          affectedTests: ['all']
        }],
        warnings: [],
        performance: this.getEmptyPerformanceMetrics()
      };
    }
  }

  /**
   * Build container run command
   */
  private buildContainerCommand(container: ContainerConfig, testCommand: string): string {
    const parts = [container.runtime, 'run'];

    // Add flags
    parts.push('--rm'); // Remove container after run
    parts.push('--interactive'); // Keep STDIN open

    // Add environment variables
    if (container.environment) {
      for (const [key, value] of Object.entries(container.environment)) {
        parts.push('-e', `${key}=${value}`);
      }
    }

    // Add volumes
    if (container.volumes) {
      for (const volume of container.volumes) {
        parts.push('-v', volume);
      }
    } else {
      // Default volume mapping
      parts.push('-v', `${process.cwd()}:/app`);
    }

    // Add working directory
    parts.push('-w', '/app');

    // Add ports if specified
    if (container.ports) {
      for (const port of container.ports) {
        parts.push('-p', `${port}:${port}`);
      }
    }

    // Add resource limits
    if (container.environment?.MEMORY_LIMIT) {
      parts.push('--memory', container.environment.MEMORY_LIMIT);
    }

    if (container.environment?.CPU_LIMIT) {
      parts.push('--cpus', container.environment.CPU_LIMIT);
    }

    // Add image
    parts.push(container.image);

    // Add command
    parts.push('sh', '-c');
    
    // Prepare the test command with npm install
    const fullCommand = `npm ci --silent && ${testCommand}`;
    parts.push(fullCommand);

    return parts.join(' ');
  }

  /**
   * Run a command and return result
   */
  private async runCommand(
    command: string,
    options: SpawnOptions & { timeout?: number } = {}
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: 'pipe',
        ...options
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
          stderr
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Parse failed tests from stderr
   */
  private parseFailedTests(stderr: string): string[] {
    const failedTests: string[] = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
      // Look for test failure patterns
      const testMatch = line.match(/FAIL\s+(.+\.test\.[jt]s)/);
      if (testMatch) {
        failedTests.push(testMatch[1]);
      }
    }

    return failedTests.length > 0 ? failedTests : ['unknown'];
  }

  /**
   * Parse container-specific warnings
   */
  private parseContainerWarnings(stdout: string, stderr: string): Array<{
    type: 'deprecation' | 'performance' | 'compatibility';
    message: string;
    affectedTests: string[];
  }> {
    const warnings = [];
    const output = stdout + stderr;

    // Look for container-specific warnings
    const containerMatches = output.match(/WARNING: (.+)/g);
    if (containerMatches) {
      for (const match of containerMatches) {
        warnings.push({
          type: 'compatibility' as const,
          message: match,
          affectedTests: ['all']
        });
      }
    }

    // Look for resource warnings
    const resourceMatches = output.match(/Memory usage: (.+)/g);
    if (resourceMatches) {
      for (const match of resourceMatches) {
        warnings.push({
          type: 'performance' as const,
          message: match,
          affectedTests: ['all']
        });
      }
    }

    return warnings;
  }

  /**
   * Get empty performance metrics
   */
  private getEmptyPerformanceMetrics() {
    return {
      executionTime: 0,
      memoryUsage: {
        peak: 0,
        average: 0,
        final: 0
      },
      cpuUsage: {
        peak: 0,
        average: 0
      }
    };
  }
}