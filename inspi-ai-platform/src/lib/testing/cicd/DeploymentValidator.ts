/**
 * Deployment Validator
 * Validates deployments with health checks, smoke tests, and rollback capabilities
 */

import {
  DeploymentConfig,
  ValidationConfig,
  HealthCheck,
  SmokeTest,
  RollbackConfig,
} from './types';

export class DeploymentValidator {
  private deploymentHistory: DeploymentRecord[] = [];
  private validationTimeout = 300000; // 5 minutes default

  /**
   * Validate a deployment
   */
  async validateDeployment(config: DeploymentConfig): Promise<DeploymentValidationResult> {
    console.log(`🚀 Validating deployment to ${config.environment}`);

    const startTime = Date.now();
    const validationId = `validation-${Date.now()}`;

    try {
      // Run health checks
      const healthResults = await this.runHealthChecks(config.validation.healthChecks);

      // Run smoke tests
      const smokeResults = await this.runSmokeTests(config.validation.smokeTests);

      // Check overall validation status
      const allHealthPassed = healthResults.every(r => r.passed);
      const allSmokesPassed = smokeResults.every(r => r.passed);
      const validationPassed = allHealthPassed && allSmokesPassed;

      const result: DeploymentValidationResult = {
        id: validationId,
        environment: config.environment,
        strategy: config.strategy,
        passed: validationPassed,
        duration: Date.now() - startTime,
        healthChecks: healthResults,
        smokeTests: smokeResults,
        timestamp: new Date(),
      };

      // Record deployment
      this.recordDeployment({
        id: validationId,
        environment: config.environment,
        strategy: config.strategy,
        validation: result,
        timestamp: new Date(),
      });

      // Handle rollback if validation failed
      if (!validationPassed && config.rollback.automatic) {
        console.log('🔄 Validation failed, initiating automatic rollback');
        await this.initiateRollback(config.rollback);
      }

      return result;
    } catch (error) {
      const result: DeploymentValidationResult = {
        id: validationId,
        environment: config.environment,
        strategy: config.strategy,
        passed: false,
        duration: Date.now() - startTime,
        healthChecks: [],
        smokeTests: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };

      return result;
    }
  }

  /**
   * Run health checks
   */
  private async runHealthChecks(healthChecks: HealthCheck[]): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const check of healthChecks) {
      const startTime = Date.now();

      try {
        const response = await this.performHealthCheck(check);

        results.push({
          name: check.name,
          url: check.url,
          passed: response.status === check.expectedStatus,
          status: response.status,
          duration: Date.now() - startTime,
          response: response.body?.substring(0, 500), // Limit response size
        });
      } catch (error) {
        results.push({
          name: check.name,
          url: check.url,
          passed: false,
          status: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Perform a single health check
   */
  private async performHealthCheck(check: HealthCheck): Promise<{
    status: number;
    body?: string;
  }> {
    // Simple HTTP check implementation
    // In a real implementation, you'd use a proper HTTP client
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Health check timeout after ${check.timeout}ms`));
      }, check.timeout);

      // Simulate HTTP request
      // This is a placeholder - replace with actual HTTP client
      setTimeout(() => {
        clearTimeout(timeout);

        // Simulate different responses based on URL
        if (check.url.includes('/health')) {
          resolve({ status: 200, body: '{"status":"healthy"}' });
        } else if (check.url.includes('/ready')) {
          resolve({ status: 200, body: '{"ready":true}' });
        } else {
          resolve({ status: check.expectedStatus, body: 'OK' });
        }
      }, Math.random() * 1000); // Random delay up to 1 second
    });
  }

  /**
   * Run smoke tests
   */
  private async runSmokeTests(smokeTests: SmokeTest[]): Promise<SmokeTestResult[]> {
    const results: SmokeTestResult[] = [];

    for (const test of smokeTests) {
      const startTime = Date.now();

      try {
        const exitCode = await this.runSmokeTest(test);

        results.push({
          name: test.name,
          command: test.command,
          passed: exitCode === test.expectedExitCode,
          exitCode,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          name: test.name,
          command: test.command,
          passed: false,
          exitCode: -1,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Run a single smoke test
   */
  private async runSmokeTest(test: SmokeTest): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Smoke test timeout after ${test.timeout}ms`));
      }, test.timeout);

      // Simulate command execution
      // In a real implementation, you'd use child_process.spawn
      setTimeout(() => {
        clearTimeout(timeout);

        // Simulate different exit codes based on command
        if (test.command.includes('curl')) {
          resolve(0); // Success
        } else if (test.command.includes('test')) {
          resolve(Math.random() > 0.8 ? 1 : 0); // 80% success rate
        } else {
          resolve(test.expectedExitCode);
        }
      }, Math.random() * 2000); // Random delay up to 2 seconds
    });
  }

  /**
   * Initiate rollback
   */
  private async initiateRollback(config: RollbackConfig): Promise<RollbackResult> {
    if (!config.enabled) {
      throw new Error('Rollback is not enabled');
    }

    console.log('🔄 Initiating rollback...');

    const startTime = Date.now();

    try {
      let targetVersion: string;

      if (config.strategy === 'previous') {
        targetVersion = this.getPreviousVersion();
      } else if (config.strategy === 'specific' && config.version) {
        targetVersion = config.version;
      } else {
        throw new Error('Invalid rollback configuration');
      }

      // Simulate rollback process
      await this.performRollback(targetVersion);

      return {
        success: true,
        targetVersion,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform the actual rollback
   */
  private async performRollback(targetVersion: string): Promise<void> {
    // Simulate rollback process
    console.log(`Rolling back to version: ${targetVersion}`);

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Rollback completed');
        resolve();
      }, 5000); // 5 second rollback simulation
    });
  }

  /**
   * Get the previous deployment version
   */
  private getPreviousVersion(): string {
    if (this.deploymentHistory.length < 2) {
      throw new Error('No previous version available for rollback');
    }

    // Return the second-to-last deployment
    return this.deploymentHistory[this.deploymentHistory.length - 2].id;
  }

  /**
   * Record a deployment
   */
  private recordDeployment(record: DeploymentRecord): void {
    this.deploymentHistory.push(record);

    // Keep only the last 10 deployments
    if (this.deploymentHistory.length > 10) {
      this.deploymentHistory = this.deploymentHistory.slice(-10);
    }
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(): DeploymentRecord[] {
    return [...this.deploymentHistory];
  }

  /**
   * Get deployment statistics
   */
  getDeploymentStats(): DeploymentStats {
    const total = this.deploymentHistory.length;
    const successful = this.deploymentHistory.filter(d => d.validation.passed).length;
    const failed = total - successful;

    const avgDuration = total > 0
      ? this.deploymentHistory.reduce((sum, d) => sum + d.validation.duration, 0) / total
      : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: avgDuration,
    };
  }

  /**
   * Create a comprehensive deployment validation config
   */
  static createValidationConfig(environment: string): DeploymentConfig {
    return {
      environment,
      strategy: 'rolling',
      validation: {
        healthChecks: [
          {
            name: 'Application Health',
            url: `https://${environment}.example.com/health`,
            method: 'GET',
            expectedStatus: 200,
            timeout: 10000,
          },
          {
            name: 'Database Connection',
            url: `https://${environment}.example.com/health/db`,
            method: 'GET',
            expectedStatus: 200,
            timeout: 15000,
          },
          {
            name: 'API Readiness',
            url: `https://${environment}.example.com/ready`,
            method: 'GET',
            expectedStatus: 200,
            timeout: 10000,
          },
        ],
        smokeTests: [
          {
            name: 'API Smoke Test',
            command: `curl -f https://${environment}.example.com/api/status`,
            timeout: 30000,
            expectedExitCode: 0,
          },
          {
            name: 'Authentication Test',
            command: `npm run test:smoke:auth -- --env=${environment}`,
            timeout: 60000,
            expectedExitCode: 0,
          },
        ],
        timeout: 300000,
        retries: 3,
      },
      rollback: {
        enabled: true,
        automatic: environment !== 'production', // Manual rollback for production
        conditions: [
          {
            type: 'health',
            threshold: 0.8, // 80% health check success rate
            duration: 60000, // 1 minute
          },
          {
            type: 'error-rate',
            threshold: 0.05, // 5% error rate
            duration: 120000, // 2 minutes
          },
        ],
        strategy: 'previous',
      },
      monitoring: {
        enabled: true,
        metrics: ['response_time', 'error_rate', 'throughput'],
        alerts: [
          {
            name: 'High Error Rate',
            condition: 'error_rate > 0.05',
            severity: 'high',
            channels: ['slack', 'email'],
          },
        ],
        duration: 600000, // 10 minutes
      },
    };
  }

  /**
   * Validate deployment configuration
   */
  static validateConfig(config: DeploymentConfig): string[] {
    const errors: string[] = [];

    if (!config.environment) {
      errors.push('Environment is required');
    }

    if (!config.validation.healthChecks.length) {
      errors.push('At least one health check is required');
    }

    config.validation.healthChecks.forEach((check, index) => {
      if (!check.name) {
        errors.push(`Health check ${index + 1} is missing a name`);
      }
      if (!check.url) {
        errors.push(`Health check ${index + 1} is missing a URL`);
      }
      if (check.timeout <= 0) {
        errors.push(`Health check ${index + 1} timeout must be positive`);
      }
    });

    config.validation.smokeTests.forEach((test, index) => {
      if (!test.name) {
        errors.push(`Smoke test ${index + 1} is missing a name`);
      }
      if (!test.command) {
        errors.push(`Smoke test ${index + 1} is missing a command`);
      }
      if (test.timeout <= 0) {
        errors.push(`Smoke test ${index + 1} timeout must be positive`);
      }
    });

    return errors;
  }
}

// Supporting interfaces
interface DeploymentValidationResult {
  id: string;
  environment: string;
  strategy: string;
  passed: boolean;
  duration: number;
  healthChecks: HealthCheckResult[];
  smokeTests: SmokeTestResult[];
  error?: string;
  timestamp: Date;
}

interface HealthCheckResult {
  name: string;
  url: string;
  passed: boolean;
  status: number;
  duration: number;
  response?: string;
  error?: string;
}

interface SmokeTestResult {
  name: string;
  command: string;
  passed: boolean;
  exitCode: number;
  duration: number;
  output?: string;
  error?: string;
}

interface RollbackResult {
  success: boolean;
  targetVersion?: string;
  duration: number;
  error?: string;
  timestamp: Date;
}

interface DeploymentRecord {
  id: string;
  environment: string;
  strategy: string;
  validation: DeploymentValidationResult;
  timestamp: Date;
}

interface DeploymentStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  averageDuration: number;
}
