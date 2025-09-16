/**
 * Quality Gate System Tests
 */

import { QualityGateSystem } from '../../../../lib/testing/quality-gates/QualityGateSystem';

// Mock the checker classes
jest.mock('../../../../lib/testing/quality-gates/CoverageChecker');
jest.mock('../../../../lib/testing/quality-gates/PerformanceChecker');
jest.mock('../../../../lib/testing/quality-gates/SecurityChecker');
jest.mock('../../../../lib/testing/quality-gates/ComplianceChecker');

describe('QualityGateSystem', () => {
  let qualityGate: QualityGateSystem;

  beforeEach(() => {
    qualityGate = new QualityGateSystem({
      coverage: {
        enabled: true,
        thresholds: {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90
        },
        excludePatterns: ['**/*.test.ts'],
        failOnThreshold: true
      },
      performance: {
        enabled: true,
        thresholds: {
          maxRegressionPercent: 20,
          maxExecutionTime: 60000,
          maxMemoryUsage: 512 * 1024 * 1024
        },
        failOnRegression: true
      },
      security: {
        enabled: true,
        rules: {
          noHardcodedSecrets: true,
          noInsecureRandomness: true,
          noSqlInjection: true,
          noXssVulnerabilities: true
        },
        failOnViolation: true
      },
      compliance: {
        enabled: true,
        rules: {
          requireTestDocumentation: true,
          enforceNamingConventions: true,
          requireErrorHandling: true,
          enforceTypeScript: true
        },
        failOnViolation: false
      }
    });
  });

  describe('executeQualityGate', () => {
    it('should execute all quality checks', async () => {
      const result = await qualityGate.executeQualityGate();

      expect(result).toMatchObject({
        passed: expect.any(Boolean),
        timestamp: expect.any(Date),
        results: {
          coverage: expect.any(Object),
          performance: expect.any(Object),
          security: expect.any(Object),
          compliance: expect.any(Object)
        },
        overallScore: expect.any(Number),
        recommendations: expect.any(Array),
        blockers: expect.any(Array)
      });
    });

    it('should pass when all checks pass', async () => {
      // Mock all checkers to return passing results
      const mockCoverageResult = {
        passed: true,
        current: { statements: 95, branches: 90, functions: 95, lines: 95 },
        thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
        violations: [],
        uncoveredFiles: []
      };

      const mockPerformanceResult = {
        passed: true,
        current: { executionTime: 30000, memoryUsage: 256 * 1024 * 1024, testCount: 100 },
        regressions: { executionTime: 0, memoryUsage: 0 },
        violations: []
      };

      const mockSecurityResult = {
        passed: true,
        violations: [],
        riskLevel: 'low' as const,
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
      };

      const mockComplianceResult = {
        passed: true,
        violations: [],
        summary: { total: 0, documentation: 0, naming: 0, errorHandling: 0, typeScript: 0 }
      };

      // Mock the check methods
      jest.spyOn(qualityGate, 'checkCoverage').mockResolvedValue(mockCoverageResult);
      jest.spyOn(qualityGate, 'checkPerformance').mockResolvedValue(mockPerformanceResult);
      jest.spyOn(qualityGate, 'checkSecurity').mockResolvedValue(mockSecurityResult);
      jest.spyOn(qualityGate, 'checkCompliance').mockResolvedValue(mockComplianceResult);

      const result = await qualityGate.executeQualityGate();

      expect(result.passed).toBe(true);
      expect(result.overallScore).toBeGreaterThan(90);
      expect(result.blockers).toHaveLength(0);
    });

    it('should fail when coverage threshold is not met', async () => {
      const mockCoverageResult = {
        passed: false,
        current: { statements: 80, branches: 75, functions: 85, lines: 80 },
        thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
        violations: ['Statement coverage 80% is below threshold 90%'],
        uncoveredFiles: ['src/uncovered.ts']
      };

      jest.spyOn(qualityGate, 'checkCoverage').mockResolvedValue(mockCoverageResult);

      const result = await qualityGate.executeQualityGate();

      expect(result.passed).toBe(false);
      expect(result.blockers).toContain('Coverage thresholds not met');
    });

    it('should fail when security violations are found', async () => {
      const mockSecurityResult = {
        passed: false,
        violations: [{
          rule: 'hardcoded-api-key',
          severity: 'critical' as const,
          file: 'src/config.ts',
          line: 10,
          message: 'Hardcoded API key detected',
          recommendation: 'Use environment variables',
          evidence: 'apiKey = "sk-1234567890"'
        }],
        riskLevel: 'critical' as const,
        summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0 }
      };

      jest.spyOn(qualityGate, 'checkSecurity').mockResolvedValue(mockSecurityResult);

      const result = await qualityGate.executeQualityGate();

      expect(result.passed).toBe(false);
      expect(result.blockers).toContain('Security violations found');
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive quality gate report', async () => {
      const result = await qualityGate.executeQualityGate();
      const report = qualityGate.generateReport(result);

      expect(report).toContain('# Quality Gate Report');
      expect(report).toContain('Overall Result:');
      expect(report).toContain('Quality Score:');
      expect(report).toContain('## Coverage Analysis');
      expect(report).toContain('## Performance Analysis');
      expect(report).toContain('## Security Analysis');
      expect(report).toContain('## Compliance Analysis');
    });

    it('should include violations in report', async () => {
      const mockResult = {
        passed: false,
        timestamp: new Date(),
        results: {
          coverage: {
            passed: false,
            current: { statements: 80, branches: 75, functions: 85, lines: 80 },
            thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
            violations: ['Coverage too low'],
            uncoveredFiles: []
          },
          performance: {
            passed: true,
            current: { executionTime: 30000, memoryUsage: 256 * 1024 * 1024, testCount: 100 },
            regressions: { executionTime: 0, memoryUsage: 0 },
            violations: []
          },
          security: {
            passed: false,
            violations: [{
              rule: 'test-rule',
              severity: 'high' as const,
              file: 'test.ts',
              line: 1,
              message: 'Test violation',
              recommendation: 'Fix it',
              evidence: 'code'
            }],
            riskLevel: 'high' as const,
            summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0 }
          },
          compliance: {
            passed: true,
            violations: [],
            summary: { total: 0, documentation: 0, naming: 0, errorHandling: 0, typeScript: 0 }
          }
        },
        overallScore: 75,
        recommendations: ['Improve coverage'],
        blockers: ['Coverage too low']
      };

      const report = qualityGate.generateReport(mockResult);

      expect(report).toContain('❌ FAILED');
      expect(report).toContain('Coverage too low');
      expect(report).toContain('Test violation');
      expect(report).toContain('## Blockers');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        coverage: {
          thresholds: {
            statements: 95,
            branches: 90,
            functions: 95,
            lines: 95
          }
        }
      };

      qualityGate.updateConfig(newConfig);
      const config = qualityGate.getConfig();

      expect(config.coverage.thresholds.statements).toBe(95);
      expect(config.coverage.thresholds.branches).toBe(90);
    });
  });

  describe('individual checkers', () => {
    it('should check coverage when enabled', async () => {
      const result = await qualityGate.checkCoverage();
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should skip coverage when disabled', async () => {
      qualityGate.updateConfig({
        coverage: { enabled: false }
      });

      const result = await qualityGate.checkCoverage();
      expect(result.passed).toBe(true);
    });

    it('should check performance when enabled', async () => {
      const result = await qualityGate.checkPerformance();
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should check security when enabled', async () => {
      const result = await qualityGate.checkSecurity();
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should check compliance when enabled', async () => {
      const result = await qualityGate.checkCompliance();
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('should calculate overall score correctly', async () => {
      // Mock results with known scores
      const mockResults = {
        coverage: {
          passed: true,
          current: { statements: 95, branches: 90, functions: 95, lines: 95 },
          thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
          violations: [],
          uncoveredFiles: []
        },
        performance: {
          passed: true,
          current: { executionTime: 30000, memoryUsage: 256 * 1024 * 1024, testCount: 100 },
          baseline: { executionTime: 30000, memoryUsage: 256 * 1024 * 1024, testCount: 100 },
          regressions: { executionTime: 0, memoryUsage: 0 },
          violations: []
        },
        security: {
          passed: true,
          violations: [],
          riskLevel: 'low' as const,
          summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
        },
        compliance: {
          passed: true,
          violations: [],
          summary: { total: 0, documentation: 0, naming: 0, errorHandling: 0, typeScript: 0 }
        }
      };

      jest.spyOn(qualityGate, 'checkCoverage').mockResolvedValue(mockResults.coverage);
      jest.spyOn(qualityGate, 'checkPerformance').mockResolvedValue(mockResults.performance);
      jest.spyOn(qualityGate, 'checkSecurity').mockResolvedValue(mockResults.security);
      jest.spyOn(qualityGate, 'checkCompliance').mockResolvedValue(mockResults.compliance);

      const result = await qualityGate.executeQualityGate();

      expect(result.overallScore).toBeGreaterThan(90);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('recommendations', () => {
    it('should generate appropriate recommendations', async () => {
      const mockResults = {
        coverage: {
          passed: false,
          current: { statements: 80, branches: 75, functions: 85, lines: 80 },
          thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
          violations: ['Low coverage'],
          uncoveredFiles: ['file1.ts', 'file2.ts']
        },
        performance: {
          passed: false,
          current: { executionTime: 90000, memoryUsage: 512 * 1024 * 1024, testCount: 100 },
          baseline: { executionTime: 60000, memoryUsage: 256 * 1024 * 1024, testCount: 100 },
          regressions: { executionTime: 50, memoryUsage: 100 },
          violations: ['Performance regression']
        },
        security: {
          passed: false,
          violations: [{ 
            rule: 'test', 
            severity: 'critical' as const, 
            file: 'test.ts', 
            line: 1, 
            message: 'Critical issue', 
            recommendation: 'Fix it',
            evidence: 'code'
          }],
          riskLevel: 'critical' as const,
          summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0 }
        },
        compliance: {
          passed: false,
          violations: [{ 
            rule: 'test', 
            severity: 'error' as const, 
            file: 'test.ts', 
            message: 'Compliance issue', 
            recommendation: 'Fix it',
            category: 'documentation' as const
          }],
          summary: { total: 1, documentation: 1, naming: 0, errorHandling: 0, typeScript: 0 }
        }
      };

      jest.spyOn(qualityGate, 'checkCoverage').mockResolvedValue(mockResults.coverage);
      jest.spyOn(qualityGate, 'checkPerformance').mockResolvedValue(mockResults.performance);
      jest.spyOn(qualityGate, 'checkSecurity').mockResolvedValue(mockResults.security);
      jest.spyOn(qualityGate, 'checkCompliance').mockResolvedValue(mockResults.compliance);

      const result = await qualityGate.executeQualityGate();

      expect(result.recommendations).toContain('Increase test coverage to meet minimum thresholds');
      expect(result.recommendations).toContain('Address critical security vulnerabilities immediately');
    });
  });
});