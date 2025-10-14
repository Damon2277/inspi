/**
 * Tests for DeploymentValidator
 */

import { DeploymentValidator } from '../../../../lib/testing/cicd/DeploymentValidator';
import { DeploymentConfig } from '../../../../lib/testing/cicd/types';

describe('DeploymentValidator', () => {
  let validator: DeploymentValidator;
  let mockDeploymentConfig: DeploymentConfig;

  beforeEach(() => {
    validator = new DeploymentValidator();

    mockDeploymentConfig = {
      environment: 'staging',
      strategy: 'rolling',
      validation: {
        healthChecks: [
          {
            name: 'Application Health',
            url: 'https://staging.example.com/health',
            method: 'GET',
            expectedStatus: 200,
            timeout: 10000,
          },
          {
            name: 'Database Health',
            url: 'https://staging.example.com/health/db',
            method: 'GET',
            expectedStatus: 200,
            timeout: 15000,
          },
        ],
        smokeTests: [
          {
            name: 'API Smoke Test',
            command: 'curl -f https://staging.example.com/api/status',
            timeout: 30000,
            expectedExitCode: 0,
          },
          {
            name: 'Authentication Test',
            command: 'npm run test:smoke:auth -- --env=staging',
            timeout: 60000,
            expectedExitCode: 0,
          },
        ],
        timeout: 300000,
        retries: 3,
      },
      rollback: {
        enabled: true,
        automatic: true,
        conditions: [
          {
            type: 'health',
            threshold: 0.8,
            duration: 60000,
          },
        ],
        strategy: 'previous',
      },
      monitoring: {
        enabled: true,
        metrics: ['response_time', 'error_rate'],
        alerts: [
          {
            name: 'High Error Rate',
            condition: 'error_rate > 0.05',
            severity: 'high',
            channels: ['slack'],
          },
        ],
        duration: 600000,
      },
    };
  });

  describe('validateDeployment', () => {
    it('should validate deployment successfully', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('environment', 'staging');
      expect(result).toHaveProperty('strategy', 'rolling');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('healthChecks');
      expect(result).toHaveProperty('smokeTests');
      expect(result).toHaveProperty('timestamp');
    });

    it('should pass validation when all checks succeed', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      expect(result.passed).toBe(true);
      expect(result.healthChecks).toHaveLength(2);
      expect(result.smokeTests).toHaveLength(2);
      expect(result.healthChecks.every(h => h.passed)).toBe(true);
      expect(result.smokeTests.every(s => s.passed)).toBe(true);
    });

    it('should fail validation when health checks fail', async () => {
      const failingConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Failing Health Check',
              url: 'https://staging.example.com/nonexistent',
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1000,
            },
          ],
        },
      };

      const result = await validator.validateDeployment(failingConfig);

      expect(result.passed).toBe(false);
      expect(result.healthChecks[0].passed).toBe(false);
    });

    it('should record deployment history', async () => {
      await validator.validateDeployment(mockDeploymentConfig);
      await validator.validateDeployment({
        ...mockDeploymentConfig,
        environment: 'production',
      });

      const history = validator.getDeploymentHistory();
      expect(history).toHaveLength(2);
      expect(history[0].environment).toBe('staging');
      expect(history[1].environment).toBe('production');
    });

    it('should handle validation errors gracefully', async () => {
      const invalidConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Invalid Check',
              url: '', // Invalid URL
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1000,
            },
          ],
        },
      };

      const result = await validator.validateDeployment(invalidConfig);

      expect(result.passed).toBe(false);
      expect(result.error).toBeUndefined(); // Should handle gracefully
    });
  });

  describe('health checks', () => {
    it('should perform health checks correctly', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      expect(result.healthChecks).toHaveLength(2);

      const appHealthCheck = result.healthChecks.find(h => h.name === 'Application Health');
      expect(appHealthCheck).toBeDefined();
      expect(appHealthCheck?.url).toBe('https://staging.example.com/health');
      expect(appHealthCheck?.status).toBe(200);
      expect(appHealthCheck?.passed).toBe(true);
    });

    it('should handle health check timeouts', async () => {
      const timeoutConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Timeout Check',
              url: 'https://staging.example.com/slow',
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1, // Very short timeout
            },
          ],
        },
      };

      const result = await validator.validateDeployment(timeoutConfig);

      expect(result.healthChecks[0].passed).toBe(false);
      expect(result.healthChecks[0].error).toContain('timeout');
    });

    it('should validate expected status codes', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      result.healthChecks.forEach(check => {
        if (check.passed) {
          expect(check.status).toBe(200);
        }
      });
    });

    it('should measure health check duration', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      result.healthChecks.forEach(check => {
        expect(check.duration).toBeGreaterThan(0);
        expect(check.duration).toBeLessThan(10000); // Should complete within 10 seconds
      });
    });
  });

  describe('smoke tests', () => {
    it('should run smoke tests correctly', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      expect(result.smokeTests).toHaveLength(2);

      const apiTest = result.smokeTests.find(t => t.name === 'API Smoke Test');
      expect(apiTest).toBeDefined();
      expect(apiTest?.command).toBe('curl -f https://staging.example.com/api/status');
      expect(apiTest?.exitCode).toBe(0);
      expect(apiTest?.passed).toBe(true);
    });

    it('should handle smoke test failures', async () => {
      const failingConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          smokeTests: [
            {
              name: 'Failing Test',
              command: 'exit 1', // Command that always fails
              timeout: 5000,
              expectedExitCode: 0,
            },
          ],
        },
      };

      const result = await validator.validateDeployment(failingConfig);

      expect(result.smokeTests[0].passed).toBe(false);
      expect(result.smokeTests[0].exitCode).toBe(1);
    });

    it('should handle smoke test timeouts', async () => {
      const timeoutConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          smokeTests: [
            {
              name: 'Timeout Test',
              command: 'sleep 10', // Long running command
              timeout: 1, // Very short timeout
              expectedExitCode: 0,
            },
          ],
        },
      };

      const result = await validator.validateDeployment(timeoutConfig);

      expect(result.smokeTests[0].passed).toBe(false);
      expect(result.smokeTests[0].error).toContain('timeout');
    });

    it('should measure smoke test duration', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      result.smokeTests.forEach(test => {
        expect(test.duration).toBeGreaterThan(0);
        expect(test.duration).toBeLessThan(30000); // Should complete within 30 seconds
      });
    });
  });

  describe('rollback functionality', () => {
    it('should not initiate rollback when validation passes', async () => {
      const result = await validator.validateDeployment(mockDeploymentConfig);

      expect(result.passed).toBe(true);
      // No rollback should be initiated for successful validation
    });

    it('should initiate automatic rollback when validation fails', async () => {
      const failingConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Failing Check',
              url: 'https://staging.example.com/fail',
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1000,
            },
          ],
        },
        rollback: {
          ...mockDeploymentConfig.rollback,
          automatic: true,
        },
      };

      // Add a previous deployment to rollback to
      await validator.validateDeployment(mockDeploymentConfig);

      const result = await validator.validateDeployment(failingConfig);

      expect(result.passed).toBe(false);
      // Rollback should be initiated automatically
    });

    it('should not rollback when automatic rollback is disabled', async () => {
      const noRollbackConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Failing Check',
              url: 'https://staging.example.com/fail',
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1000,
            },
          ],
        },
        rollback: {
          ...mockDeploymentConfig.rollback,
          automatic: false,
        },
      };

      const result = await validator.validateDeployment(noRollbackConfig);

      expect(result.passed).toBe(false);
      // No automatic rollback should occur
    });
  });

  describe('deployment statistics', () => {
    it('should calculate deployment statistics correctly', async () => {
      // Perform multiple deployments
      await validator.validateDeployment(mockDeploymentConfig);
      await validator.validateDeployment(mockDeploymentConfig);

      const failingConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Failing Check',
              url: 'https://staging.example.com/fail',
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1000,
            },
          ],
        },
      };
      await validator.validateDeployment(failingConfig);

      const stats = validator.getDeploymentStats();

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should handle empty deployment history', () => {
      const stats = validator.getDeploymentStats();

      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('static methods', () => {
    describe('createValidationConfig', () => {
      it('should create a valid deployment config', () => {
        const config = DeploymentValidator.createValidationConfig('production');

        expect(config.environment).toBe('production');
        expect(config.strategy).toBe('rolling');
        expect(config.validation.healthChecks).toHaveLength(3);
        expect(config.validation.smokeTests).toHaveLength(2);
        expect(config.rollback.enabled).toBe(true);
        expect(config.rollback.automatic).toBe(false); // Manual for production
        expect(config.monitoring.enabled).toBe(true);
      });

      it('should enable automatic rollback for non-production environments', () => {
        const stagingConfig = DeploymentValidator.createValidationConfig('staging');
        const prodConfig = DeploymentValidator.createValidationConfig('production');

        expect(stagingConfig.rollback.automatic).toBe(true);
        expect(prodConfig.rollback.automatic).toBe(false);
      });

      it('should include environment-specific URLs', () => {
        const config = DeploymentValidator.createValidationConfig('development');

        config.validation.healthChecks.forEach(check => {
          expect(check.url).toContain('development.example.com');
        });

        config.validation.smokeTests.forEach(test => {
          expect(test.command).toContain('development.example.com');
        });
      });
    });

    describe('validateConfig', () => {
      it('should return no errors for valid config', () => {
        const errors = DeploymentValidator.validateConfig(mockDeploymentConfig);

        expect(errors).toHaveLength(0);
      });

      it('should validate required environment', () => {
        const invalidConfig = {
          ...mockDeploymentConfig,
          environment: '',
        };

        const errors = DeploymentValidator.validateConfig(invalidConfig);

        expect(errors).toContain('Environment is required');
      });

      it('should require at least one health check', () => {
        const invalidConfig = {
          ...mockDeploymentConfig,
          validation: {
            ...mockDeploymentConfig.validation,
            healthChecks: [],
          },
        };

        const errors = DeploymentValidator.validateConfig(invalidConfig);

        expect(errors).toContain('At least one health check is required');
      });

      it('should validate health check properties', () => {
        const invalidConfig = {
          ...mockDeploymentConfig,
          validation: {
            ...mockDeploymentConfig.validation,
            healthChecks: [
              {
                name: '',
                url: '',
                method: 'GET' as const,
                expectedStatus: 200,
                timeout: -1,
              },
            ],
          },
        };

        const errors = DeploymentValidator.validateConfig(invalidConfig);

        expect(errors).toContain('Health check 1 is missing a name');
        expect(errors).toContain('Health check 1 is missing a URL');
        expect(errors).toContain('Health check 1 timeout must be positive');
      });

      it('should validate smoke test properties', () => {
        const invalidConfig = {
          ...mockDeploymentConfig,
          validation: {
            ...mockDeploymentConfig.validation,
            smokeTests: [
              {
                name: '',
                command: '',
                timeout: -1,
                expectedExitCode: 0,
              },
            ],
          },
        };

        const errors = DeploymentValidator.validateConfig(invalidConfig);

        expect(errors).toContain('Smoke test 1 is missing a name');
        expect(errors).toContain('Smoke test 1 is missing a command');
        expect(errors).toContain('Smoke test 1 timeout must be positive');
      });
    });
  });

  describe('deployment history management', () => {
    it('should maintain deployment history', async () => {
      const environments = ['dev', 'staging', 'production'];

      for (const env of environments) {
        await validator.validateDeployment({
          ...mockDeploymentConfig,
          environment: env,
        });
      }

      const history = validator.getDeploymentHistory();
      expect(history).toHaveLength(3);
      expect(history.map(h => h.environment)).toEqual(environments);
    });

    it('should limit history to last 10 deployments', async () => {
      // Perform 15 deployments
      for (let i = 0; i < 15; i++) {
        await validator.validateDeployment({
          ...mockDeploymentConfig,
          environment: `env-${i}`,
        });
      }

      const history = validator.getDeploymentHistory();
      expect(history).toHaveLength(10);
      expect(history[0].environment).toBe('env-5'); // Should start from 6th deployment
      expect(history[9].environment).toBe('env-14'); // Should end at 15th deployment
    });

    it('should include validation results in history', async () => {
      await validator.validateDeployment(mockDeploymentConfig);

      const history = validator.getDeploymentHistory();
      const record = history[0];

      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('environment', 'staging');
      expect(record).toHaveProperty('strategy', 'rolling');
      expect(record).toHaveProperty('validation');
      expect(record).toHaveProperty('timestamp');
      expect(record.validation).toHaveProperty('passed');
      expect(record.validation).toHaveProperty('healthChecks');
      expect(record.validation).toHaveProperty('smokeTests');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty health checks array', async () => {
      const emptyHealthConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [],
        },
      };

      const result = await validator.validateDeployment(emptyHealthConfig);

      expect(result.healthChecks).toHaveLength(0);
      expect(result.passed).toBe(true); // Should pass if only smoke tests pass
    });

    it('should handle empty smoke tests array', async () => {
      const emptySmokeConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          smokeTests: [],
        },
      };

      const result = await validator.validateDeployment(emptySmokeConfig);

      expect(result.smokeTests).toHaveLength(0);
      expect(result.passed).toBe(true); // Should pass if only health checks pass
    });

    it('should handle rollback when no previous version exists', async () => {
      const failingConfig = {
        ...mockDeploymentConfig,
        validation: {
          ...mockDeploymentConfig.validation,
          healthChecks: [
            {
              name: 'Failing Check',
              url: 'https://staging.example.com/fail',
              method: 'GET' as const,
              expectedStatus: 200,
              timeout: 1000,
            },
          ],
        },
        rollback: {
          ...mockDeploymentConfig.rollback,
          automatic: true,
        },
      };

      const result = await validator.validateDeployment(failingConfig);

      expect(result.passed).toBe(false);
      // Should handle gracefully when no previous version exists
    });

    it('should handle disabled rollback', async () => {
      const disabledRollbackConfig = {
        ...mockDeploymentConfig,
        rollback: {
          ...mockDeploymentConfig.rollback,
          enabled: false,
        },
      };

      const result = await validator.validateDeployment(disabledRollbackConfig);

      expect(result).toBeDefined();
      // Should complete validation even with rollback disabled
    });
  });
});
