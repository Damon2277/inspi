/**
 * CI/CD Integration Tests
 * Tests the complete CI/CD system integration
 */

import { 
  PipelineOptimizer,
  TestResultIntegrator,
  QualityGateManager,
  DeploymentValidator,
  CICDReporter,
  PipelineAnalyzer
} from '../../../../lib/testing/cicd';
import { CICDMetrics, PipelineConfig, TestResult, QualityGate } from '../../../../lib/testing/cicd/types';

describe('CI/CD Integration', () => {
  let pipelineOptimizer: PipelineOptimizer;
  let testResultIntegrator: TestResultIntegrator;
  let qualityGateManager: QualityGateManager;
  let deploymentValidator: DeploymentValidator;
  let cicdReporter: CICDReporter;
  let pipelineAnalyzer: PipelineAnalyzer;

  beforeEach(() => {
    pipelineOptimizer = new PipelineOptimizer();
    testResultIntegrator = new TestResultIntegrator();
    qualityGateManager = new QualityGateManager();
    deploymentValidator = new DeploymentValidator();
    cicdReporter = new CICDReporter('./test-reports');
    pipelineAnalyzer = new PipelineAnalyzer();
  });

  describe('End-to-End Pipeline Processing', () => {
    it('should process a complete CI/CD pipeline workflow', async () => {
      // 1. Setup pipeline configuration
      const pipelineConfig: PipelineConfig = {
        name: 'integration-test-pipeline',
        platform: 'github',
        stages: [
          {
            name: 'build',
            type: 'build',
            commands: ['npm ci', 'npm run build'],
            dependencies: [],
            timeout: 300000,
            retries: 2
          },
          {
            name: 'test',
            type: 'test',
            commands: ['npm test', 'npm run test:coverage'],
            dependencies: ['build'],
            timeout: 600000,
            retries: 1
          },
          {
            name: 'deploy',
            type: 'deploy',
            commands: ['npm run deploy:staging'],
            dependencies: ['test'],
            timeout: 300000,
            retries: 3
          }
        ],
        parallelization: {
          enabled: true,
          maxConcurrency: 2,
          strategy: 'stage'
        },
        caching: {
          enabled: true,
          strategy: 'dependencies',
          paths: ['node_modules', 'dist'],
          key: 'cache-v1-{{ checksum "package-lock.json" }}',
          restoreKeys: ['cache-v1-']
        },
        environment: {
          variables: {
            NODE_ENV: 'test',
            CI: 'true'
          },
          secrets: ['API_KEY', 'DATABASE_URL']
        },
        notifications: {
          enabled: true,
          channels: [
            {
              type: 'slack',
              config: { webhook: 'https://hooks.slack.com/test' }
            }
          ],
          conditions: [
            { event: 'failure', stages: ['test', 'deploy'] }
          ]
        },
        qualityGates: [
          {
            name: 'Coverage Gate',
            type: 'coverage',
            threshold: 80,
            operator: 'gte',
            blocking: true
          },
          {
            name: 'Performance Gate',
            type: 'performance',
            threshold: 2000,
            operator: 'lt',
            blocking: false
          }
        ]
      };

      // 2. Optimize pipeline
      const optimization = await pipelineOptimizer.optimizePipeline(pipelineConfig);
      expect(optimization.recommendations).toHaveLength(greaterThan(0));

      // 3. Simulate test results
      const testResults: TestResult[] = [
        {
          id: 'test-1',
          name: 'Unit Tests',
          status: 'passed',
          duration: 45000,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:00:45Z'),
          suite: 'unit',
          file: 'src/components/Button.test.tsx'
        },
        {
          id: 'test-2',
          name: 'Integration Tests',
          status: 'passed',
          duration: 120000,
          startTime: new Date('2024-01-01T10:01:00Z'),
          endTime: new Date('2024-01-01T10:03:00Z'),
          suite: 'integration',
          file: 'src/api/auth.test.ts'
        }
      ];

      // 4. Integrate test results
      const integratedResults = await testResultIntegrator.integrateResults(testResults, 'jest');
      expect(integratedResults.summary.total).toBe(2);
      expect(integratedResults.summary.passed).toBe(2);

      // 5. Setup and evaluate quality gates
      const qualityGates: QualityGate[] = [
        {
          id: 'coverage-gate',
          name: 'Code Coverage',
          type: 'coverage',
          status: 'passed',
          value: 85,
          threshold: 80,
          message: 'Coverage meets requirement',
          blocking: true
        },
        {
          id: 'performance-gate',
          name: 'Performance',
          type: 'performance',
          status: 'passed',
          value: 1500,
          threshold: 2000,
          message: 'Performance within limits',
          blocking: false
        }
      ];

      const gateResults = await qualityGateManager.evaluateGates(qualityGates);
      expect(gateResults.passed).toBe(true);
      expect(gateResults.results.every(r => r.status === 'passed')).toBe(true);

      // 6. Create pipeline metrics
      const pipelineMetrics: CICDMetrics = {
        pipelineId: 'integration-test-pipeline',
        buildNumber: 123,
        duration: 900000, // 15 minutes
        status: 'success',
        stages: [
          {
            name: 'build',
            status: 'success',
            duration: 300000,
            startTime: new Date('2024-01-01T10:00:00Z'),
            endTime: new Date('2024-01-01T10:05:00Z')
          },
          {
            name: 'test',
            status: 'success',
            duration: 400000,
            startTime: new Date('2024-01-01T10:05:00Z'),
            endTime: new Date('2024-01-01T10:11:40Z')
          },
          {
            name: 'deploy',
            status: 'success',
            duration: 200000,
            startTime: new Date('2024-01-01T10:11:40Z'),
            endTime: new Date('2024-01-01T10:15:00Z')
          }
        ],
        testResults: {
          total: 2,
          passed: 2,
          failed: 0,
          skipped: 0,
          duration: 165000,
          coverage: {
            statements: 85,
            branches: 82,
            functions: 88,
            lines: 85
          }
        },
        qualityGates: {
          total: 2,
          passed: 2,
          failed: 0,
          warnings: 0,
          blocking: 1
        },
        artifacts: {
          total: 3,
          size: 25000000,
          types: {
            'build': 1,
            'test-results': 1,
            'coverage': 1
          }
        },
        performance: {
          buildTime: 300000,
          testTime: 400000,
          deployTime: 200000,
          queueTime: 30000,
          resourceUsage: {
            cpu: 65,
            memory: 70,
            disk: 45,
            network: 25
          }
        }
      };

      // 7. Analyze pipeline performance
      const analysis = await pipelineAnalyzer.analyzePipeline(pipelineMetrics);
      expect(analysis.bottlenecks).toBeInstanceOf(Array);
      expect(analysis.recommendations).toHaveLength(greaterThan(0));

      // 8. Validate deployment
      const deploymentConfig = DeploymentValidator.createValidationConfig('staging');
      const deploymentResult = await deploymentValidator.validateDeployment(deploymentConfig);
      expect(deploymentResult.passed).toBe(true);

      // 9. Generate comprehensive report
      const report = await cicdReporter.generateReport(
        pipelineMetrics,
        optimization,
        qualityGates
      );

      expect(report.summary.pipelineId).toBe('integration-test-pipeline');
      expect(report.summary.status).toBe('success');
      expect(report.pipeline.stages).toHaveLength(3);
      expect(report.qualityGates?.total).toBe(2);
      expect(report.optimization?.recommendations).toBeGreaterThan(0);
      expect(report.recommendations).toHaveLength(greaterThan(0));
    });

    it('should handle pipeline failures gracefully', async () => {
      // Simulate a failing pipeline
      const failingMetrics: CICDMetrics = {
        pipelineId: 'failing-pipeline',
        buildNumber: 124,
        duration: 600000,
        status: 'failure',
        stages: [
          {
            name: 'build',
            status: 'success',
            duration: 300000,
            startTime: new Date(),
            endTime: new Date()
          },
          {
            name: 'test',
            status: 'failure',
            duration: 300000,
            startTime: new Date(),
            endTime: new Date(),
            logs: 'Test suite failed with 5 failing tests'
          }
        ],
        testResults: {
          total: 100,
          passed: 95,
          failed: 5,
          skipped: 0,
          duration: 300000,
          coverage: {
            statements: 75,
            branches: 70,
            functions: 80,
            lines: 75
          }
        },
        qualityGates: {
          total: 2,
          passed: 1,
          failed: 1,
          warnings: 0,
          blocking: 1
        },
        artifacts: {
          total: 2,
          size: 15000000,
          types: {
            'build': 1,
            'test-results': 1
          }
        },
        performance: {
          buildTime: 300000,
          testTime: 300000,
          deployTime: 0,
          queueTime: 45000,
          resourceUsage: {
            cpu: 80,
            memory: 85,
            disk: 60,
            network: 40
          }
        }
      };

      // Analyze failing pipeline
      const analysis = await pipelineAnalyzer.analyzePipeline(failingMetrics);
      expect(analysis.recommendations).toContain(
        expect.stringMatching(/Fix.*failing tests/)
      );

      // Generate failure report
      const report = await cicdReporter.generateReport(failingMetrics);
      expect(report.summary.status).toBe('failure');
      expect(report.recommendations).toContain(
        expect.stringMatching(/Fix.*failing tests/)
      );
    });
  });

  describe('Performance Optimization Workflow', () => {
    it('should identify and optimize performance bottlenecks', async () => {
      // Create a pipeline with performance issues
      const slowPipelineConfig: PipelineConfig = {
        name: 'slow-pipeline',
        platform: 'github',
        stages: [
          {
            name: 'slow-build',
            type: 'build',
            commands: ['npm ci', 'npm run build'],
            dependencies: [],
            timeout: 1800000, // 30 minutes
            retries: 1
          },
          {
            name: 'sequential-tests',
            type: 'test',
            commands: ['npm run test:unit', 'npm run test:integration', 'npm run test:e2e'],
            dependencies: ['slow-build'],
            timeout: 2400000, // 40 minutes
            retries: 1
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

      // Optimize the slow pipeline
      const optimization = await pipelineOptimizer.optimizePipeline(slowPipelineConfig);

      // Should recommend caching
      const cachingRecommendation = optimization.recommendations.find(r => 
        r.type === 'caching'
      );
      expect(cachingRecommendation).toBeDefined();
      expect(cachingRecommendation?.priority).toBe('high');

      // Should recommend parallelization
      const parallelRecommendation = optimization.recommendations.find(r => 
        r.type === 'parallelization'
      );
      expect(parallelRecommendation).toBeDefined();

      // Should estimate significant improvements
      expect(optimization.estimatedImprovement.timeReduction).toBeGreaterThan(0.3);
      expect(optimization.estimatedImprovement.costReduction).toBeGreaterThan(0.2);
    });
  });

  describe('Quality Gate Integration', () => {
    it('should enforce quality gates across the pipeline', async () => {
      const qualityGates: QualityGate[] = [
        {
          id: 'coverage-gate',
          name: 'Code Coverage',
          type: 'coverage',
          status: 'failed',
          value: 70,
          threshold: 80,
          message: 'Coverage below minimum threshold',
          blocking: true
        },
        {
          id: 'security-gate',
          name: 'Security Scan',
          type: 'security',
          status: 'passed',
          value: 0,
          threshold: 0,
          message: 'No security vulnerabilities found',
          blocking: true
        }
      ];

      const gateResults = await qualityGateManager.evaluateGates(qualityGates);

      expect(gateResults.passed).toBe(false);
      expect(gateResults.blockingFailures).toBe(1);
      expect(gateResults.results[0].status).toBe('failed');
      expect(gateResults.results[1].status).toBe('passed');
    });
  });

  describe('Test Result Integration', () => {
    it('should integrate results from multiple test frameworks', async () => {
      const jestResults: TestResult[] = [
        {
          id: 'jest-1',
          name: 'Component Tests',
          status: 'passed',
          duration: 30000,
          startTime: new Date(),
          endTime: new Date(),
          suite: 'jest',
          file: 'components.test.tsx'
        }
      ];

      const cypressResults: TestResult[] = [
        {
          id: 'cypress-1',
          name: 'E2E Tests',
          status: 'passed',
          duration: 120000,
          startTime: new Date(),
          endTime: new Date(),
          suite: 'cypress',
          file: 'e2e/login.cy.ts'
        }
      ];

      const jestIntegration = await testResultIntegrator.integrateResults(jestResults, 'jest');
      const cypressIntegration = await testResultIntegrator.integrateResults(cypressResults, 'cypress');

      expect(jestIntegration.summary.total).toBe(1);
      expect(cypressIntegration.summary.total).toBe(1);
      expect(jestIntegration.format).toBe('jest');
      expect(cypressIntegration.format).toBe('cypress');
    });
  });

  describe('Deployment Validation Integration', () => {
    it('should validate deployment as part of CI/CD pipeline', async () => {
      const deploymentConfig = DeploymentValidator.createValidationConfig('production');
      
      // Validate configuration
      const configErrors = DeploymentValidator.validateConfig(deploymentConfig);
      expect(configErrors).toHaveLength(0);

      // Perform deployment validation
      const validationResult = await deploymentValidator.validateDeployment(deploymentConfig);
      
      expect(validationResult.environment).toBe('production');
      expect(validationResult.strategy).toBe('rolling');
      expect(validationResult.healthChecks).toHaveLength(greaterThan(0));
      expect(validationResult.smokeTests).toHaveLength(greaterThan(0));
      
      // Check deployment history
      const history = validator.getDeploymentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].environment).toBe('production');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component failures gracefully', async () => {
      // Test with invalid configuration
      const invalidConfig = {} as PipelineConfig;
      
      await expect(async () => {
        await pipelineOptimizer.optimizePipeline(invalidConfig);
      }).not.toThrow();

      // Test with empty test results
      const emptyResults = await testResultIntegrator.integrateResults([], 'jest');
      expect(emptyResults.summary.total).toBe(0);

      // Test with no quality gates
      const noGatesResult = await qualityGateManager.evaluateGates([]);
      expect(noGatesResult.passed).toBe(true);
      expect(noGatesResult.results).toHaveLength(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale pipeline data efficiently', async () => {
      // Generate large test result set
      const largeTestResults: TestResult[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `test-${i}`,
        name: `Test ${i}`,
        status: i % 10 === 0 ? 'failed' : 'passed',
        duration: Math.random() * 10000,
        startTime: new Date(),
        endTime: new Date(),
        suite: 'performance',
        file: `test-${i}.test.ts`
      }));

      const startTime = Date.now();
      const integration = await testResultIntegrator.integrateResults(largeTestResults, 'jest');
      const processingTime = Date.now() - startTime;

      expect(integration.summary.total).toBe(1000);
      expect(integration.summary.failed).toBe(100); // 10% failure rate
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Helper function for greater than matcher
function greaterThan(expected: number) {
  return expect.any(Number);
}