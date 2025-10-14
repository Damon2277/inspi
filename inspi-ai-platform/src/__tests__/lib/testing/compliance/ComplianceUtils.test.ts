/**
 * Compliance Utils Tests
 */

import * as fs from 'fs';

import { ComplianceResult, ComplianceViolation } from '../../../../lib/testing/compliance/ComplianceChecker';
import { ComplianceUtils } from '../../../../lib/testing/compliance/ComplianceUtils';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ComplianceUtils', () => {
  let mockResult: ComplianceResult;
  let mockViolations: ComplianceViolation[];

  beforeEach(() => {
    mockViolations = [
      {
        category: 'codeQuality',
        severity: 'critical',
        rule: 'ESLint Error',
        message: 'Critical ESLint error found',
        suggestion: 'Fix ESLint error',
        autoFixable: true,
      },
      {
        category: 'testCoverage',
        severity: 'high',
        rule: 'Low Coverage',
        message: 'Test coverage is too low',
        suggestion: 'Add more tests',
        autoFixable: false,
      },
      {
        category: 'security',
        severity: 'medium',
        rule: 'Vulnerability',
        message: 'Medium severity vulnerability',
        suggestion: 'Update dependency',
        autoFixable: false,
      },
      {
        category: 'documentation',
        severity: 'low',
        rule: 'Missing Docs',
        message: 'Documentation is missing',
        suggestion: 'Add documentation',
        autoFixable: false,
      },
    ];

    mockResult = {
      timestamp: new Date('2023-01-01T10:00:00Z'),
      overall: {
        passed: false,
        score: 75,
        grade: 'C',
      },
      categories: {
        codeQuality: {
          enabled: true,
          passed: false,
          score: 60,
          details: [
            {
              check: 'ESLint Compliance',
              passed: false,
              value: 5,
              threshold: 0,
              message: '5 ESLint errors found',
            },
          ],
          metrics: { eslintErrors: 5 },
        },
        testCoverage: {
          enabled: true,
          passed: false,
          score: 70,
          details: [
            {
              check: 'Statement Coverage',
              passed: false,
              value: 70,
              threshold: 80,
              message: 'Statement coverage: 70%',
            },
          ],
          metrics: { statementCoverage: 70 },
        },
        documentation: {
          enabled: true,
          passed: true,
          score: 90,
          details: [
            {
              check: 'README Quality',
              passed: true,
              value: 90,
              threshold: 80,
              message: 'README quality: 90%',
            },
          ],
          metrics: { readmeQuality: 90 },
        },
        security: {
          enabled: false,
          passed: true,
          score: 100,
          details: [],
          metrics: {},
        },
        accessibility: {
          enabled: true,
          passed: true,
          score: 85,
          details: [
            {
              check: 'WCAG Compliance',
              passed: true,
              value: 0,
              threshold: 0,
              message: '0 WCAG violations',
            },
          ],
          metrics: { wcagViolations: 0 },
        },
        performance: {
          enabled: true,
          passed: true,
          score: 88,
          details: [
            {
              check: 'Bundle Size',
              passed: true,
              value: 400,
              threshold: 500,
              message: 'Bundle size: 400KB',
            },
          ],
          metrics: { bundleSize: 400 },
        },
      },
      violations: mockViolations,
      recommendations: [
        {
          category: 'codeQuality',
          priority: 'high',
          title: 'Fix code quality issues',
          description: 'Multiple code quality issues found',
          action: 'Run linting tools and fix errors',
          estimatedEffort: '2-4 hours',
          impact: 'High - Critical for production readiness',
        },
      ],
      trends: [],
    };

    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('{"name": "test-project"}');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        outputPath: './reports',
        reportFormats: ['json', 'html'],
        testCoverage: {
          enabled: true,
          thresholds: {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80,
          },
        },
        performance: {
          enabled: true,
          budgets: {
            bundleSize: 500,
            loadTime: 3000,
          },
        },
      };

      const result = ComplianceUtils.validateConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        // Missing outputPath
        reportFormats: ['json'],
      };

      const result = ComplianceUtils.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('outputPath is required');
    });

    it('should validate reportFormats array', () => {
      const invalidConfig = {
        outputPath: './reports',
        reportFormats: 'json', // Should be array
      };

      const result = ComplianceUtils.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('reportFormats must be an array');
    });

    it('should validate test coverage thresholds', () => {
      const invalidConfig = {
        outputPath: './reports',
        reportFormats: ['json'],
        testCoverage: {
          enabled: true,
          thresholds: {
            statements: 150, // Invalid: > 100
            branches: -10,   // Invalid: < 0
            functions: 'invalid', // Invalid: not a number
            lines: 80,
          },
        },
      };

      const result = ComplianceUtils.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('testCoverage.thresholds.statements must be a number between 0 and 100');
      expect(result.errors).toContain('testCoverage.thresholds.branches must be a number between 0 and 100');
    });

    it('should validate performance budgets', () => {
      const invalidConfig = {
        outputPath: './reports',
        reportFormats: ['json'],
        performance: {
          enabled: true,
          budgets: {
            bundleSize: -100, // Invalid: negative
            loadTime: 'invalid', // Invalid: not a number
          },
        },
      };

      const result = ComplianceUtils.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('performance.budgets.bundleSize must be a positive number');
      expect(result.errors).toContain('performance.budgets.loadTime must be a positive number');
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configurations correctly', () => {
      const base = {
        outputPath: './base-reports',
        testCoverage: {
          enabled: true,
          thresholds: {
            statements: 70,
            branches: 65,
          },
        },
        security: {
          enabled: false,
        },
      };

      const override = {
        outputPath: './override-reports',
        testCoverage: {
          thresholds: {
            statements: 80, // Override only statements
          },
        },
        documentation: {
          enabled: true, // Add new section
        },
      };

      const merged = ComplianceUtils.mergeConfigs(base, override);

      expect(merged.outputPath).toBe('./override-reports');
      expect(merged.testCoverage.enabled).toBe(true); // From base
      expect(merged.testCoverage.thresholds.statements).toBe(80); // From override
      expect(merged.testCoverage.thresholds.branches).toBe(65); // From base
      expect(merged.security.enabled).toBe(false); // From base
      expect(merged.documentation.enabled).toBe(true); // From override
    });

    it('should handle array overrides', () => {
      const base = {
        reportFormats: ['json', 'html'],
        excludePatterns: ['*.test.ts'],
      };

      const override = {
        reportFormats: ['markdown'], // Replace entire array
        excludePatterns: ['*.spec.ts'], // Replace entire array
      };

      const merged = ComplianceUtils.mergeConfigs(base, override);

      expect(merged.reportFormats).toEqual(['markdown']);
      expect(merged.excludePatterns).toEqual(['*.spec.ts']);
    });
  });

  describe('Score Calculation', () => {
    it('should return 100 for no violations', () => {
      const score = ComplianceUtils.calculateScore([]);
      expect(score).toBe(100);
    });

    it('should calculate score based on violation severity', () => {
      const violations = [
        { severity: 'critical' } as ComplianceViolation,
        { severity: 'high' } as ComplianceViolation,
        { severity: 'medium' } as ComplianceViolation,
        { severity: 'low' } as ComplianceViolation,
      ];

      const score = ComplianceUtils.calculateScore(violations);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });

    it('should weight critical violations more heavily', () => {
      const criticalViolations = [
        { severity: 'critical' } as ComplianceViolation,
        { severity: 'critical' } as ComplianceViolation,
      ];

      const lowViolations = [
        { severity: 'low' } as ComplianceViolation,
        { severity: 'low' } as ComplianceViolation,
        { severity: 'low' } as ComplianceViolation,
        { severity: 'low' } as ComplianceViolation,
      ];

      const criticalScore = ComplianceUtils.calculateScore(criticalViolations);
      const lowScore = ComplianceUtils.calculateScore(lowViolations);

      expect(criticalScore).toBeLessThan(lowScore);
    });
  });

  describe('Violation Categorization', () => {
    it('should categorize violations by severity', () => {
      const categorized = ComplianceUtils.categorizeViolations(mockViolations);

      expect(categorized.critical).toHaveLength(1);
      expect(categorized.high).toHaveLength(1);
      expect(categorized.medium).toHaveLength(1);
      expect(categorized.low).toHaveLength(1);

      expect(categorized.critical[0].severity).toBe('critical');
      expect(categorized.high[0].severity).toBe('high');
      expect(categorized.medium[0].severity).toBe('medium');
      expect(categorized.low[0].severity).toBe('low');
    });

    it('should handle empty violations array', () => {
      const categorized = ComplianceUtils.categorizeViolations([]);

      expect(categorized.critical).toHaveLength(0);
      expect(categorized.high).toHaveLength(0);
      expect(categorized.medium).toHaveLength(0);
      expect(categorized.low).toHaveLength(0);
    });
  });

  describe('Summary Generation', () => {
    it('should generate comprehensive summary', () => {
      const summary = ComplianceUtils.generateSummary(mockResult);

      expect(summary.overallScore).toBe(75);
      expect(summary.overallGrade).toBe('C');
      expect(summary.overallStatus).toBe('FAILED');
      expect(summary.totalViolations).toBe(4);
      expect(summary.violationsBySeverity.critical).toBe(1);
      expect(summary.violationsBySeverity.high).toBe(1);
      expect(summary.violationsBySeverity.medium).toBe(1);
      expect(summary.violationsBySeverity.low).toBe(1);
      expect(summary.categoriesEnabled).toBe(5); // security is disabled
      expect(summary.categoriesPassed).toBe(3); // documentation, accessibility, performance
      expect(summary.recommendationsCount).toBe(1);
    });

    it('should identify top issues', () => {
      const summary = ComplianceUtils.generateSummary(mockResult);

      expect(Array.isArray(summary.topIssues)).toBe(true);
      expect(summary.topIssues.length).toBeGreaterThan(0);

      const topIssue = summary.topIssues[0];
      expect(topIssue).toHaveProperty('rule');
      expect(topIssue).toHaveProperty('category');
      expect(topIssue).toHaveProperty('severity');
      expect(topIssue).toHaveProperty('count');
      expect(topIssue).toHaveProperty('message');
      expect(topIssue).toHaveProperty('suggestion');
    });

    it('should identify improvement areas', () => {
      const summary = ComplianceUtils.generateSummary(mockResult);

      expect(Array.isArray(summary.improvementAreas)).toBe(true);
      expect(summary.improvementAreas.length).toBeGreaterThan(0);

      const improvementArea = summary.improvementAreas[0];
      expect(improvementArea).toHaveProperty('category');
      expect(improvementArea).toHaveProperty('score');
      expect(improvementArea).toHaveProperty('failedChecks');
      expect(improvementArea).toHaveProperty('totalChecks');
      expect(improvementArea).toHaveProperty('priority');
      expect(['high', 'medium', 'low']).toContain(improvementArea.priority);
    });
  });

  describe('Top Issues Analysis', () => {
    it('should identify and count duplicate issues', () => {
      const duplicateViolations = [
        {
          category: 'codeQuality',
          severity: 'high',
          rule: 'ESLint Error',
          message: 'ESLint error 1',
          suggestion: 'Fix error',
          autoFixable: false,
        },
        {
          category: 'codeQuality',
          severity: 'high',
          rule: 'ESLint Error',
          message: 'ESLint error 2',
          suggestion: 'Fix error',
          autoFixable: false,
        },
        {
          category: 'testCoverage',
          severity: 'medium',
          rule: 'Low Coverage',
          message: 'Coverage too low',
          suggestion: 'Add tests',
          autoFixable: false,
        },
      ];

      const topIssues = ComplianceUtils.getTopIssues(duplicateViolations);

      expect(topIssues).toHaveLength(2);

      const eslintIssue = topIssues.find(issue => issue.rule === 'ESLint Error');
      expect(eslintIssue?.count).toBe(2);

      const coverageIssue = topIssues.find(issue => issue.rule === 'Low Coverage');
      expect(coverageIssue?.count).toBe(1);
    });

    it('should sort issues by severity then count', () => {
      const mixedViolations = [
        { category: 'test', severity: 'low', rule: 'Low Issue', message: 'msg', suggestion: 'fix', autoFixable: false },
        { category: 'test', severity: 'low', rule: 'Low Issue', message: 'msg', suggestion: 'fix', autoFixable: false },
        { category: 'test', severity: 'low', rule: 'Low Issue', message: 'msg', suggestion: 'fix', autoFixable: false },
        { category: 'test', severity: 'critical', rule: 'Critical Issue', message: 'msg', suggestion: 'fix', autoFixable: false },
        { category: 'test', severity: 'high', rule: 'High Issue', message: 'msg', suggestion: 'fix', autoFixable: false },
        { category: 'test', severity: 'high', rule: 'High Issue', message: 'msg', suggestion: 'fix', autoFixable: false },
      ];

      const topIssues = ComplianceUtils.getTopIssues(mixedViolations);

      expect(topIssues[0].severity).toBe('critical');
      expect(topIssues[1].severity).toBe('high');
      expect(topIssues[1].count).toBe(2);
      expect(topIssues[2].severity).toBe('low');
      expect(topIssues[2].count).toBe(3);
    });

    it('should limit results to specified count', () => {
      const manyViolations = Array.from({ length: 10 }, (_, i) => ({
        category: 'test',
        severity: 'medium' as const,
        rule: `Rule ${i}`,
        message: `Message ${i}`,
        suggestion: `Fix ${i}`,
        autoFixable: false,
      }));

      const topIssues = ComplianceUtils.getTopIssues(manyViolations, 3);

      expect(topIssues).toHaveLength(3);
    });
  });

  describe('Improvement Areas Analysis', () => {
    it('should identify failed categories as improvement areas', () => {
      const improvementAreas = ComplianceUtils.getImprovementAreas(mockResult.categories);

      expect(improvementAreas.length).toBeGreaterThan(0);

      // Should include codeQuality and testCoverage (both failed)
      const categoryNames = improvementAreas.map(area => area.category);
      expect(categoryNames).toContain('codeQuality');
      expect(categoryNames).toContain('testCoverage');

      // Should not include passed categories
      expect(categoryNames).not.toContain('documentation');
      expect(categoryNames).not.toContain('accessibility');
      expect(categoryNames).not.toContain('performance');
    });

    it('should calculate priority correctly', () => {
      const improvementAreas = ComplianceUtils.getImprovementAreas(mockResult.categories);

      const codeQualityArea = improvementAreas.find(area => area.category === 'codeQuality');
      expect(codeQualityArea?.priority).toBe('medium'); // Score 60, 1 failed check

      const testCoverageArea = improvementAreas.find(area => area.category === 'testCoverage');
      expect(testCoverageArea?.priority).toBe('medium'); // Score 70, 1 failed check
    });

    it('should sort by priority', () => {
      // Create a result with different priority levels
      const testResult = { ...mockResult };
      testResult.categories.codeQuality.score = 40; // Should be high priority
      testResult.categories.testCoverage.score = 78; // Should be low priority

      const improvementAreas = ComplianceUtils.getImprovementAreas(testResult.categories);

      // Should be sorted with high priority first
      expect(improvementAreas[0].priority).toBe('high');
      expect(improvementAreas[improvementAreas.length - 1].priority).toBe('low');
    });
  });

  describe('Utility Functions', () => {
    it('should format file sizes correctly', () => {
      expect(ComplianceUtils.formatFileSize(500)).toBe('500.0 B');
      expect(ComplianceUtils.formatFileSize(1024)).toBe('1.0 KB');
      expect(ComplianceUtils.formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(ComplianceUtils.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('should format durations correctly', () => {
      expect(ComplianceUtils.formatDuration(500)).toBe('500ms');
      expect(ComplianceUtils.formatDuration(1500)).toBe('1.5s');
      expect(ComplianceUtils.formatDuration(65000)).toBe('1.1m');
      expect(ComplianceUtils.formatDuration(3700000)).toBe('1.0h');
    });

    it('should generate compliance badges', () => {
      const badge = ComplianceUtils.generateBadge(mockResult);

      expect(badge.label).toBe('compliance');
      expect(badge.message).toBe('75% (C)');
      expect(badge.color).toBe('#dfb317'); // Grade C color
      expect(badge.status).toBe('failing');
    });

    it('should generate different badge colors for different grades', () => {
      const gradeAResult = { ...mockResult, overall: { passed: true, score: 95, grade: 'A' as const } };
      const gradeFResult = { ...mockResult, overall: { passed: false, score: 45, grade: 'F' as const } };

      const badgeA = ComplianceUtils.generateBadge(gradeAResult);
      const badgeF = ComplianceUtils.generateBadge(gradeFResult);

      expect(badgeA.color).toBe('#4c1');
      expect(badgeA.status).toBe('passing');
      expect(badgeF.color).toBe('#e05d44');
      expect(badgeF.status).toBe('failing');
    });
  });

  describe('Data Export', () => {
    it('should export to CSV format', () => {
      const csvData = ComplianceUtils.exportData(mockResult, 'csv');

      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('Category,Check,Status,Value,Threshold,Message');
      expect(csvData).toContain('codeQuality');
      expect(csvData).toContain('testCoverage');
    });

    it('should export to JSON format', () => {
      const jsonData = ComplianceUtils.exportData(mockResult, 'json');

      expect(typeof jsonData).toBe('string');
      expect(() => JSON.parse(jsonData)).not.toThrow();

      const parsed = JSON.parse(jsonData);
      expect(parsed.overall.score).toBe(75);
      expect(parsed.categories).toBeDefined();
    });

    it('should export to XML format', () => {
      const xmlData = ComplianceUtils.exportData(mockResult, 'xml');

      expect(typeof xmlData).toBe('string');
      expect(xmlData).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlData).toContain('<compliance-data>');
      expect(xmlData).toContain('</compliance-data>');
    });

    it('should handle unsupported export formats', () => {
      expect(() => {
        ComplianceUtils.exportData(mockResult, 'unsupported' as any);
      }).toThrow('Unsupported export format: unsupported');
    });
  });

  describe('File System Utilities', () => {
    it('should validate file paths', () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        return path === 'existing-file.txt';
      });

      const paths = ['existing-file.txt', 'missing-file.txt', 'another-missing.txt'];
      const result = ComplianceUtils.validatePaths(paths);

      expect(result.valid).toEqual(['existing-file.txt']);
      expect(result.invalid).toEqual(['missing-file.txt', 'another-missing.txt']);
    });

    it('should handle file system errors in path validation', () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = ComplianceUtils.validatePaths(['test-file.txt']);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toEqual(['test-file.txt']);
    });

    it('should ensure directories exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      ComplianceUtils.ensureDirectory('./test-dir');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('./test-dir', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      ComplianceUtils.ensureDirectory('./existing-dir');

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should get file extensions correctly', () => {
      expect(ComplianceUtils.getFileExtension('file.txt')).toBe('.txt');
      expect(ComplianceUtils.getFileExtension('script.js')).toBe('.js');
      expect(ComplianceUtils.getFileExtension('component.tsx')).toBe('.tsx');
      expect(ComplianceUtils.getFileExtension('README')).toBe('');
    });

    it('should identify test files correctly', () => {
      expect(ComplianceUtils.isTestFile('component.test.ts')).toBe(true);
      expect(ComplianceUtils.isTestFile('utils.spec.js')).toBe(true);
      expect(ComplianceUtils.isTestFile('__tests__/component.ts')).toBe(true);
      expect(ComplianceUtils.isTestFile('button.stories.tsx')).toBe(true);
      expect(ComplianceUtils.isTestFile('regular-file.ts')).toBe(false);
    });
  });

  describe('Project Analysis', () => {
    it('should parse package.json correctly', () => {
      const mockPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'lodash': '^4.17.21',
        },
        devDependencies: {
          'jest': '^29.0.0',
          'typescript': '^4.9.0',
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const packageJson = ComplianceUtils.parsePackageJson();

      expect(packageJson).toEqual(mockPackageJson);
    });

    it('should handle missing package.json', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const packageJson = ComplianceUtils.parsePackageJson();

      expect(packageJson).toBeNull();
    });

    it('should get project dependencies', () => {
      const mockPackageJson = {
        dependencies: {
          'react': '^18.0.0',
          'lodash': '^4.17.21',
        },
        devDependencies: {
          'jest': '^29.0.0',
        },
        peerDependencies: {
          'typescript': '^4.9.0',
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const deps = ComplianceUtils.getProjectDependencies();

      expect(deps.dependencies).toEqual(['react', 'lodash']);
      expect(deps.devDependencies).toEqual(['jest']);
      expect(deps.peerDependencies).toEqual(['typescript']);
    });
  });

  describe('CI Environment Detection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should detect CI environment', () => {
      process.env.CI = 'true';
      expect(ComplianceUtils.isCI()).toBe(true);

      delete process.env.CI;
      process.env.GITHUB_ACTIONS = 'true';
      expect(ComplianceUtils.isCI()).toBe(true);

      delete process.env.GITHUB_ACTIONS;
      process.env.GITLAB_CI = 'true';
      expect(ComplianceUtils.isCI()).toBe(true);
    });

    it('should detect non-CI environment', () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;

      expect(ComplianceUtils.isCI()).toBe(false);
    });

    it('should get CI provider information', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_RUN_NUMBER = '123';
      process.env.GITHUB_REF_NAME = 'main';
      process.env.GITHUB_SHA = 'abc123';

      const ciInfo = ComplianceUtils.getCIInfo();

      expect(ciInfo.isCI).toBe(true);
      expect(ciInfo.provider).toBe('github');
      expect(ciInfo.buildNumber).toBe('123');
      expect(ciInfo.branch).toBe('main');
      expect(ciInfo.commit).toBe('abc123');
    });

    it('should handle unknown CI provider', () => {
      process.env.CI = 'true';
      // Don't set any specific provider env vars

      const ciInfo = ComplianceUtils.getCIInfo();

      expect(ciInfo.isCI).toBe(true);
      expect(ciInfo.provider).toBe('unknown');
      expect(ciInfo.buildNumber).toBe('unknown');
      expect(ciInfo.branch).toBe('unknown');
      expect(ciInfo.commit).toBe('unknown');
    });
  });
});
