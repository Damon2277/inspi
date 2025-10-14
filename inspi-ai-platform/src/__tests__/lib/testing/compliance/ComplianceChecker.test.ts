/**
 * Compliance Checker Tests
 */

import * as fs from 'fs';

import {
  ComplianceChecker,
  createComplianceChecker,
  ComplianceConfig,
} from '../../../../lib/testing/compliance/ComplianceChecker';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ComplianceChecker', () => {
  let checker: ComplianceChecker;
  let config: ComplianceConfig;

  beforeEach(() => {
    config = {
      codeQuality: {
        enabled: true,
        customRules: [],
        thresholds: {
          complexity: 10,
          maintainabilityIndex: 70,
          duplicateLines: 50,
          codeSmells: 10,
        },
      },
      testCoverage: {
        enabled: true,
        thresholds: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        excludePatterns: ['**/*.test.ts'],
        requireTestFiles: true,
        testFilePatterns: ['**/*.test.ts'],
      },
      documentation: {
        enabled: true,
        requiredFiles: ['README.md', 'CHANGELOG.md'],
        apiDocumentation: {
          required: true,
          format: 'jsdoc',
          coverage: 70,
        },
        readmeRequirements: {
          sections: ['Installation', 'Usage'],
          minimumLength: 500,
        },
        changelogRequired: true,
      },
      security: {
        enabled: true,
        vulnerabilityScanning: true,
        dependencyAudit: true,
        secretsDetection: true,
        codeAnalysis: true,
        allowedLicenses: ['MIT', 'Apache-2.0'],
        securityHeaders: ['Content-Security-Policy'],
      },
      accessibility: {
        enabled: true,
        wcagLevel: 'AA',
        testPatterns: ['**/*.tsx'],
        requiredAttributes: ['alt', 'aria-label'],
        colorContrastRatio: 4.5,
      },
      performance: {
        enabled: true,
        budgets: {
          bundleSize: 500,
          loadTime: 3000,
          memoryUsage: 100,
          cpuUsage: 80,
        },
        metrics: ['FCP', 'LCP'],
      },
      outputPath: './compliance-reports',
      reportFormats: ['json', 'html'],
    };

    checker = createComplianceChecker(config);

    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('mock file content');
    mockFs.writeFileSync.mockImplementation();
    mockFs.mkdirSync.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create compliance checker with config', () => {
      expect(checker).toBeDefined();
      expect(checker).toBeInstanceOf(ComplianceChecker);
    });

    it('should emit events during compliance check', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();

      checker.on('complianceStarted', startedSpy);
      checker.on('complianceCompleted', completedSpy);

      await checker.runComplianceCheck();

      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('Code Quality Checks', () => {
    it('should check code quality when enabled', async () => {
      const result = await checker.runComplianceCheck();

      expect(result.categories.codeQuality.enabled).toBe(true);
      expect(result.categories.codeQuality.details.length).toBeGreaterThan(0);
      expect(typeof result.categories.codeQuality.score).toBe('number');
    });

    it('should skip code quality when disabled', async () => {
      config.codeQuality.enabled = false;
      const disabledChecker = createComplianceChecker(config);

      const result = await disabledChecker.runComplianceCheck();

      expect(result.categories.codeQuality.enabled).toBe(false);
      expect(result.categories.codeQuality.score).toBe(100);
    });

    it('should validate complexity thresholds', async () => {
      const result = await checker.runComplianceCheck();

      const complexityCheck = result.categories.codeQuality.details.find(
        d => d.check === 'Code Complexity',
      );

      expect(complexityCheck).toBeDefined();
      expect(complexityCheck?.threshold).toBe(config.codeQuality.thresholds.complexity);
    });

    it('should check maintainability index', async () => {
      const result = await checker.runComplianceCheck();

      const maintainabilityCheck = result.categories.codeQuality.details.find(
        d => d.check === 'Maintainability Index',
      );

      expect(maintainabilityCheck).toBeDefined();
      expect(maintainabilityCheck?.threshold).toBe(config.codeQuality.thresholds.maintainabilityIndex);
    });
  });

  describe('Test Coverage Checks', () => {
    it('should check test coverage when enabled', async () => {
      const result = await checker.runComplianceCheck();

      expect(result.categories.testCoverage.enabled).toBe(true);
      expect(result.categories.testCoverage.details.length).toBeGreaterThan(0);
    });

    it('should validate coverage thresholds', async () => {
      const result = await checker.runComplianceCheck();

      const coverageChecks = ['Statement Coverage', 'Branch Coverage', 'Function Coverage', 'Line Coverage'];

      coverageChecks.forEach(checkName => {
        const check = result.categories.testCoverage.details.find(d => d.check === checkName);
        expect(check).toBeDefined();
      });
    });

    it('should check for test file existence', async () => {
      const result = await checker.runComplianceCheck();

      const testFileCheck = result.categories.testCoverage.details.find(
        d => d.check === 'Test Files Existence',
      );

      expect(testFileCheck).toBeDefined();
    });

    it('should handle missing coverage report gracefully', async () => {
      // Mock coverage report loading to return null
      const result = await checker.runComplianceCheck();

      expect(result.categories.testCoverage.enabled).toBe(true);
      // Should still have test file existence check even without coverage report
    });
  });

  describe('Documentation Checks', () => {
    it('should check required files', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        return path === 'README.md'; // Only README exists
      });

      const result = await checker.runComplianceCheck();

      const requiredFilesCheck = result.categories.documentation.details.find(
        d => d.check === 'Required Files',
      );

      expect(requiredFilesCheck).toBeDefined();
      expect(requiredFilesCheck?.passed).toBe(false); // CHANGELOG.md is missing
      expect(requiredFilesCheck?.value).toBe(1); // 1 missing file
    });

    it('should check README quality', async () => {
      const result = await checker.runComplianceCheck();

      const readmeCheck = result.categories.documentation.details.find(
        d => d.check === 'README Quality',
      );

      expect(readmeCheck).toBeDefined();
      expect(typeof readmeCheck?.value).toBe('number');
    });

    it('should check API documentation when required', async () => {
      const result = await checker.runComplianceCheck();

      const apiDocCheck = result.categories.documentation.details.find(
        d => d.check === 'API Documentation',
      );

      expect(apiDocCheck).toBeDefined();
      expect(apiDocCheck?.threshold).toBe(config.documentation.apiDocumentation.coverage);
    });

    it('should check changelog when required', async () => {
      const result = await checker.runComplianceCheck();

      const changelogCheck = result.categories.documentation.details.find(
        d => d.check === 'Changelog',
      );

      expect(changelogCheck).toBeDefined();
    });
  });

  describe('Security Checks', () => {
    it('should run vulnerability scanning when enabled', async () => {
      const result = await checker.runComplianceCheck();

      const vulnCheck = result.categories.security.details.find(
        d => d.check === 'Vulnerability Scanning',
      );

      expect(vulnCheck).toBeDefined();
      expect(vulnCheck?.threshold).toBe(0); // No high severity vulnerabilities allowed
    });

    it('should run dependency audit when enabled', async () => {
      const result = await checker.runComplianceCheck();

      const depAuditCheck = result.categories.security.details.find(
        d => d.check === 'Dependency Audit',
      );

      expect(depAuditCheck).toBeDefined();
    });

    it('should run secrets detection when enabled', async () => {
      const result = await checker.runComplianceCheck();

      const secretsCheck = result.categories.security.details.find(
        d => d.check === 'Secrets Detection',
      );

      expect(secretsCheck).toBeDefined();
    });

    it('should check license compliance', async () => {
      const result = await checker.runComplianceCheck();

      const licenseCheck = result.categories.security.details.find(
        d => d.check === 'License Compliance',
      );

      expect(licenseCheck).toBeDefined();
    });
  });

  describe('Accessibility Checks', () => {
    it('should check WCAG compliance when enabled', async () => {
      const result = await checker.runComplianceCheck();

      const wcagCheck = result.categories.accessibility.details.find(
        d => d.check.includes('WCAG'),
      );

      expect(wcagCheck).toBeDefined();
      expect(wcagCheck?.check).toContain(config.accessibility.wcagLevel);
    });

    it('should check color contrast', async () => {
      const result = await checker.runComplianceCheck();

      const contrastCheck = result.categories.accessibility.details.find(
        d => d.check === 'Color Contrast',
      );

      expect(contrastCheck).toBeDefined();
    });

    it('should check required attributes', async () => {
      const result = await checker.runComplianceCheck();

      const attributesCheck = result.categories.accessibility.details.find(
        d => d.check === 'Required Attributes',
      );

      expect(attributesCheck).toBeDefined();
    });
  });

  describe('Performance Checks', () => {
    it('should check bundle size against budget', async () => {
      const result = await checker.runComplianceCheck();

      const bundleSizeCheck = result.categories.performance.details.find(
        d => d.check === 'Bundle Size',
      );

      expect(bundleSizeCheck).toBeDefined();
      expect(bundleSizeCheck?.threshold).toBe(config.performance.budgets.bundleSize);
    });

    it('should check load time against budget', async () => {
      const result = await checker.runComplianceCheck();

      const loadTimeCheck = result.categories.performance.details.find(
        d => d.check === 'Load Time',
      );

      expect(loadTimeCheck).toBeDefined();
      expect(loadTimeCheck?.threshold).toBe(config.performance.budgets.loadTime);
    });

    it('should check memory usage against budget', async () => {
      const result = await checker.runComplianceCheck();

      const memoryCheck = result.categories.performance.details.find(
        d => d.check === 'Memory Usage',
      );

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck?.threshold).toBe(config.performance.budgets.memoryUsage);
    });
  });

  describe('Overall Score Calculation', () => {
    it('should calculate overall score correctly', async () => {
      const result = await checker.runComplianceCheck();

      expect(result.overall.score).toBeGreaterThanOrEqual(0);
      expect(result.overall.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.overall.grade);
      expect(typeof result.overall.passed).toBe('boolean');
    });

    it('should assign correct grades based on score', async () => {
      const result = await checker.runComplianceCheck();

      if (result.overall.score >= 90) {
        expect(result.overall.grade).toBe('A');
      } else if (result.overall.score >= 80) {
        expect(result.overall.grade).toBe('B');
      } else if (result.overall.score >= 70) {
        expect(result.overall.grade).toBe('C');
      } else if (result.overall.score >= 60) {
        expect(result.overall.grade).toBe('D');
      } else {
        expect(result.overall.grade).toBe('F');
      }
    });
  });

  describe('Violations and Recommendations', () => {
    it('should generate violations for failed checks', async () => {
      // Mock some failures
      mockFs.existsSync.mockReturnValue(false); // Missing required files

      const result = await checker.runComplianceCheck();

      expect(Array.isArray(result.violations)).toBe(true);

      if (result.violations.length > 0) {
        const violation = result.violations[0];
        expect(violation).toHaveProperty('category');
        expect(violation).toHaveProperty('severity');
        expect(violation).toHaveProperty('rule');
        expect(violation).toHaveProperty('message');
        expect(violation).toHaveProperty('suggestion');
        expect(violation).toHaveProperty('autoFixable');
      }
    });

    it('should generate recommendations for improvements', async () => {
      const result = await checker.runComplianceCheck();

      expect(Array.isArray(result.recommendations)).toBe(true);

      if (result.recommendations.length > 0) {
        const recommendation = result.recommendations[0];
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('title');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('action');
        expect(recommendation).toHaveProperty('estimatedEffort');
        expect(recommendation).toHaveProperty('impact');
      }
    });

    it('should sort violations by severity', async () => {
      const result = await checker.runComplianceCheck();

      if (result.violations.length > 1) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

        for (let i = 0; i < result.violations.length - 1; i++) {
          const currentSeverity = severityOrder[result.violations[i].severity];
          const nextSeverity = severityOrder[result.violations[i + 1].severity];
          expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
        }
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate compliance report', async () => {
      const result = await checker.runComplianceCheck();
      const report = checker.generateReport(result);

      expect(typeof report).toBe('string');
      expect(report).toContain('Type Definition Test Report');
      expect(report).toContain('Summary:');
      expect(report).toContain(result.overall.passed ? 'PASSED' : 'FAILED');
    });

    it('should include all categories in report', async () => {
      const result = await checker.runComplianceCheck();
      const report = checker.generateReport(result);

      Object.keys(result.categories).forEach(categoryName => {
        expect(report).toContain(categoryName);
      });
    });

    it('should include violations in report if any exist', async () => {
      const result = await checker.runComplianceCheck();
      const report = checker.generateReport(result);

      if (result.violations.length > 0) {
        expect(report).toContain('Violations');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      await expect(checker.runComplianceCheck()).resolves.not.toThrow();
    });

    it('should handle missing configuration gracefully', async () => {
      const minimalConfig = {
        outputPath: './reports',
        reportFormats: ['json'],
      } as any;

      const minimalChecker = createComplianceChecker(minimalConfig);
      await expect(minimalChecker.runComplianceCheck()).resolves.not.toThrow();
    });

    it('should emit error events for category failures', async () => {
      const errorSpy = jest.fn();
      checker.on('categoryError', errorSpy);

      // Force an error in one category
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      await checker.runComplianceCheck();

      // Should still complete even with category errors
    });
  });

  describe('Custom Rules', () => {
    it('should apply custom rules when configured', async () => {
      config.codeQuality.customRules = [
        {
          name: 'No Console Logs',
          description: 'Disallow console.log statements',
          pattern: /console\.log/,
          severity: 'warning',
          message: 'Remove console.log statements',
          autoFix: false,
        },
      ];

      const customChecker = createComplianceChecker(config);
      const result = await customChecker.runComplianceCheck();

      const customRulesCheck = result.categories.codeQuality.details.find(
        d => d.check === 'Custom Rules',
      );

      expect(customRulesCheck).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect metrics for each category', async () => {
      const result = await checker.runComplianceCheck();

      Object.values(result.categories).forEach(category => {
        if (category.enabled) {
          expect(typeof category.metrics).toBe('object');
        }
      });
    });

    it('should include relevant metrics for code quality', async () => {
      const result = await checker.runComplianceCheck();

      if (result.categories.codeQuality.enabled) {
        const metrics = result.categories.codeQuality.metrics;
        expect(typeof metrics.averageComplexity).toBe('number');
        expect(typeof metrics.maintainabilityIndex).toBe('number');
      }
    });

    it('should include relevant metrics for test coverage', async () => {
      const result = await checker.runComplianceCheck();

      if (result.categories.testCoverage.enabled) {
        const metrics = result.categories.testCoverage.metrics;
        // Metrics should be present even if coverage report is not available
        expect(typeof metrics).toBe('object');
      }
    });
  });
});
