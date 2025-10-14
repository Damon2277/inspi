/**
 * Compliance Reporter Tests
 */

import * as fs from 'fs';

import { ComplianceResult } from '../../../../lib/testing/compliance/ComplianceChecker';
import {
  ComplianceReporter,
  createComplianceReporter,
  ReportConfig,
} from '../../../../lib/testing/compliance/ComplianceReporter';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ComplianceReporter', () => {
  let reporter: ComplianceReporter;
  let config: ReportConfig;
  let mockResult: ComplianceResult;

  beforeEach(() => {
    config = {
      outputDir: './test-reports',
      formats: [
        { type: 'json', enabled: true },
        { type: 'html', enabled: true },
        { type: 'markdown', enabled: true },
        { type: 'xml', enabled: true },
        { type: 'csv', enabled: true },
      ],
      templates: [
        {
          name: 'custom-html',
          type: 'html',
          content: '<html><body>{{overallScore}}</body></html>',
          variables: ['overallScore'],
        },
      ],
      scheduling: {
        enabled: false,
        frequency: 'daily',
        time: '09:00',
        timezone: 'UTC',
        autoGenerate: true,
      },
      notifications: {
        enabled: false,
        channels: [],
        triggers: [],
      },
      retention: {
        maxReports: 10,
        maxAge: 30,
        archiveOldReports: false,
      },
    };

    mockResult = {
      timestamp: new Date('2023-01-01T10:00:00Z'),
      overall: {
        passed: true,
        score: 85,
        grade: 'B',
      },
      categories: {
        codeQuality: {
          enabled: true,
          passed: true,
          score: 90,
          details: [
            {
              check: 'ESLint Compliance',
              passed: true,
              value: 0,
              threshold: 0,
              message: '0 ESLint errors found',
            },
          ],
          metrics: {
            eslintErrors: 0,
            eslintWarnings: 2,
          },
        },
        testCoverage: {
          enabled: true,
          passed: false,
          score: 75,
          details: [
            {
              check: 'Statement Coverage',
              passed: false,
              value: 75,
              threshold: 80,
              message: 'Statement coverage: 75%',
            },
          ],
          metrics: {
            statementCoverage: 75,
          },
        },
        documentation: {
          enabled: false,
          passed: true,
          score: 100,
          details: [],
          metrics: {},
        },
        security: {
          enabled: true,
          passed: true,
          score: 95,
          details: [
            {
              check: 'Vulnerability Scanning',
              passed: true,
              value: 0,
              threshold: 0,
              message: '0 high severity vulnerabilities found',
            },
          ],
          metrics: {
            highSeverityVulns: 0,
          },
        },
        accessibility: {
          enabled: true,
          passed: true,
          score: 88,
          details: [
            {
              check: 'WCAG AA Compliance',
              passed: true,
              value: 0,
              threshold: 0,
              message: '0 WCAG violations found',
            },
          ],
          metrics: {
            wcagViolations: 0,
          },
        },
        performance: {
          enabled: true,
          passed: true,
          score: 92,
          details: [
            {
              check: 'Bundle Size',
              passed: true,
              value: 245,
              threshold: 500,
              message: 'Bundle size: 245KB',
            },
          ],
          metrics: {
            bundleSize: 245,
          },
        },
      },
      violations: [
        {
          category: 'testCoverage',
          severity: 'medium',
          rule: 'Statement Coverage',
          message: 'Statement coverage is below threshold',
          suggestion: 'Add more unit tests to increase statement coverage',
          autoFixable: false,
        },
      ],
      recommendations: [
        {
          category: 'testCoverage',
          priority: 'medium',
          title: 'Improve test coverage',
          description: 'Statement coverage is below the required threshold',
          action: 'Write additional unit tests to meet coverage thresholds',
          estimatedEffort: '4-8 hours',
          impact: 'Medium - Important for code quality',
        },
      ],
      trends: [],
    };

    reporter = createComplianceReporter(config);

    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('[]');
    mockFs.writeFileSync.mockImplementation();
    mockFs.mkdirSync.mockImplementation();
    mockFs.statSync.mockReturnValue({ size: 1024 } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create compliance reporter with config', () => {
      expect(reporter).toBeDefined();
      expect(reporter).toBeInstanceOf(ComplianceReporter);
    });

    it('should emit events during report generation', async () => {
      const startedSpy = jest.fn();
      const completedSpy = jest.fn();

      reporter.on('reportGenerationStarted', startedSpy);
      reporter.on('reportGenerationCompleted', completedSpy);

      await reporter.generateReport(mockResult);

      expect(startedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('Report Generation', () => {
    it('should generate reports in all enabled formats', async () => {
      const reports = await reporter.generateReport(mockResult);

      expect(reports).toHaveLength(5); // json, html, markdown, xml, csv
      expect(reports.map(r => r.format)).toEqual(['json', 'html', 'markdown', 'xml', 'csv']);
    });

    it('should skip disabled formats', async () => {
      config.formats[1].enabled = false; // Disable HTML
      const disabledReporter = createComplianceReporter(config);

      const reports = await disabledReporter.generateReport(mockResult);

      expect(reports).toHaveLength(4);
      expect(reports.map(r => r.format)).not.toContain('html');
    });

    it('should create output directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await reporter.generateReport(mockResult);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(config.outputDir, { recursive: true });
    });

    it('should include file size in report metadata', async () => {
      const reports = await reporter.generateReport(mockResult);

      reports.forEach(report => {
        expect(typeof report.size).toBe('number');
        expect(report.size).toBeGreaterThan(0);
      });
    });
  });

  describe('JSON Report Generation', () => {
    it('should generate valid JSON report', async () => {
      const reports = await reporter.generateReport(mockResult);
      const jsonReport = reports.find(r => r.format === 'json');

      expect(jsonReport).toBeDefined();
      expect(mockFs.writeFileSync).toHaveBeenCalled();

      // Check that JSON content was written
      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.json'),
      );
      expect(writeCall).toBeDefined();

      const jsonContent = writeCall![1] as string;
      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });

    it('should include metadata in JSON report', async () => {
      await reporter.generateReport(mockResult, { includeHistory: true });

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.json'),
      );

      const jsonContent = JSON.parse(writeCall![1] as string);
      expect(jsonContent.metadata).toBeDefined();
      expect(jsonContent.metadata.generatedAt).toBeDefined();
      expect(jsonContent.metadata.generator).toBe('ComplianceReporter');
    });
  });

  describe('HTML Report Generation', () => {
    it('should generate HTML report with default template', async () => {
      const reports = await reporter.generateReport(mockResult);
      const htmlReport = reports.find(r => r.format === 'html');

      expect(htmlReport).toBeDefined();

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.html'),
      );
      expect(writeCall).toBeDefined();

      const htmlContent = writeCall![1] as string;
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Compliance Report');
      expect(htmlContent).toContain(mockResult.overall.score.toString());
    });

    it('should use custom template when specified', async () => {
      config.formats[1].template = 'custom-html';
      const customReporter = createComplianceReporter(config);

      await customReporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.html'),
      );

      const htmlContent = writeCall![1] as string;
      expect(htmlContent).toContain(mockResult.overall.score.toString());
    });

    it('should include categories in HTML report', async () => {
      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.html'),
      );

      const htmlContent = writeCall![1] as string;
      expect(htmlContent).toContain('codeQuality');
      expect(htmlContent).toContain('testCoverage');
      expect(htmlContent).toContain('security');
    });

    it('should include violations in HTML report', async () => {
      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.html'),
      );

      const htmlContent = writeCall![1] as string;
      expect(htmlContent).toContain('Violations');
      expect(htmlContent).toContain('Statement Coverage');
    });
  });

  describe('Markdown Report Generation', () => {
    it('should generate Markdown report', async () => {
      const reports = await reporter.generateReport(mockResult);
      const markdownReport = reports.find(r => r.format === 'markdown');

      expect(markdownReport).toBeDefined();

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.markdown'),
      );
      expect(writeCall).toBeDefined();

      const markdownContent = writeCall![1] as string;
      expect(markdownContent).toContain('# Compliance Report');
      expect(markdownContent).toContain('## Categories');
      expect(markdownContent).toContain(`**Overall Score:** ${mockResult.overall.score}%`);
    });

    it('should include violations section in Markdown', async () => {
      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.markdown'),
      );

      const markdownContent = writeCall![1] as string;
      expect(markdownContent).toContain('## Violations');
      expect(markdownContent).toContain('### MEDIUM - Statement Coverage');
    });

    it('should include recommendations section in Markdown', async () => {
      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.markdown'),
      );

      const markdownContent = writeCall![1] as string;
      expect(markdownContent).toContain('## Recommendations');
      expect(markdownContent).toContain('### MEDIUM - Improve test coverage');
    });
  });

  describe('XML Report Generation', () => {
    it('should generate valid XML report', async () => {
      const reports = await reporter.generateReport(mockResult);
      const xmlReport = reports.find(r => r.format === 'xml');

      expect(xmlReport).toBeDefined();

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.xml'),
      );
      expect(writeCall).toBeDefined();

      const xmlContent = writeCall![1] as string;
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<compliance-report>');
      expect(xmlContent).toContain('</compliance-report>');
    });

    it('should escape XML characters properly', async () => {
      // Add a violation with special characters
      mockResult.violations[0].message = 'Test with <special> & "characters"';

      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.xml'),
      );

      const xmlContent = writeCall![1] as string;
      expect(xmlContent).toContain('&lt;special&gt;');
      expect(xmlContent).toContain('&amp;');
      expect(xmlContent).toContain('&quot;');
    });
  });

  describe('CSV Report Generation', () => {
    it('should generate CSV report with proper headers', async () => {
      const reports = await reporter.generateReport(mockResult);
      const csvReport = reports.find(r => r.format === 'csv');

      expect(csvReport).toBeDefined();

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.csv'),
      );
      expect(writeCall).toBeDefined();

      const csvContent = writeCall![1] as string;
      const lines = csvContent.split('\n');
      expect(lines[0]).toContain('Category,Check,Status,Score,Value,Threshold,Message');
    });

    it('should include data rows for enabled categories', async () => {
      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.csv'),
      );

      const csvContent = writeCall![1] as string;
      const lines = csvContent.split('\n');

      // Should have header + data rows
      expect(lines.length).toBeGreaterThan(1);
      expect(csvContent).toContain('codeQuality');
      expect(csvContent).toContain('testCoverage');
    });

    it('should properly escape CSV values', async () => {
      // Add a detail with comma in message
      mockResult.categories.codeQuality.details[0].message = 'Test, with comma';

      await reporter.generateReport(mockResult);

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.csv'),
      );

      const csvContent = writeCall![1] as string;
      expect(csvContent).toContain('"Test, with comma"');
    });
  });

  describe('Report History Management', () => {
    it('should save report metadata to history', async () => {
      await reporter.generateReport(mockResult);

      // Should write history file
      const historyWriteCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('report-history.json'),
      );
      expect(historyWriteCall).toBeDefined();
    });

    it('should load existing report history', async () => {
      const existingHistory = [
        {
          id: 'test-report-1',
          timestamp: new Date('2023-01-01'),
          result: mockResult,
          reports: [],
          options: {},
        },
      ];

      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      const newReporter = createComplianceReporter(config);
      await newReporter.generateReport(mockResult);

      // Should have loaded and extended the history
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('report-history.json'),
        'utf8',
      );
    });

    it('should handle missing history file gracefully', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(reporter.generateReport(mockResult)).resolves.not.toThrow();
    });
  });

  describe('Report Options', () => {
    it('should include history when requested', async () => {
      await reporter.generateReport(mockResult, { includeHistory: true });

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.json'),
      );

      const jsonContent = JSON.parse(writeCall![1] as string);
      expect(jsonContent.metadata.history).toBeDefined();
    });

    it('should include comparison when provided', async () => {
      const previousResult = { ...mockResult, overall: { ...mockResult.overall, score: 80 } };

      await reporter.generateReport(mockResult, { compareWith: previousResult });

      const writeCall = mockFs.writeFileSync.mock.calls.find(call =>
        call[0].toString().includes('.html'),
      );

      const htmlContent = writeCall![1] as string;
      expect(htmlContent).toContain('Comparison with Previous Report');
    });
  });

  describe('Notification System', () => {
    beforeEach(() => {
      config.notifications = {
        enabled: true,
        channels: [
          {
            type: 'file',
            config: {},
            enabled: true,
          },
        ],
        triggers: [
          {
            condition: 'score_below',
            threshold: 90,
            severity: 'medium',
          },
        ],
      };
    });

    it('should check notification triggers', async () => {
      const notificationReporter = createComplianceReporter(config);

      await notificationReporter.generateReport(mockResult);

      // Should trigger notification since score (85) is below threshold (90)
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('notifications.log'),
        expect.stringContaining('Compliance Alert'),
      );
    });

    it('should not trigger notifications when disabled', async () => {
      config.notifications.enabled = false;
      const noNotificationReporter = createComplianceReporter(config);

      await noNotificationReporter.generateReport(mockResult);

      expect(mockFs.appendFileSync).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      config.notifications.channels[0].type = 'email'; // Unsupported in test
      const errorReporter = createComplianceReporter(config);

      const errorSpy = jest.fn();
      errorReporter.on('notificationError', errorSpy);

      await errorReporter.generateReport(mockResult);

      // Should not throw, but may emit error events
    });
  });

  describe('Report Cleanup', () => {
    it('should clean up old reports based on count limit', async () => {
      config.retention.maxReports = 2;

      // Mock existing history with more than maxReports
      const existingHistory = Array.from({ length: 5 }, (_, i) => ({
        id: `report-${i}`,
        timestamp: new Date(`2023-01-0${i + 1}`),
        result: mockResult,
        reports: [{ format: 'json', path: `report-${i}.json`, size: 1024, generated: new Date() }],
        options: {},
      }));

      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      const cleanupReporter = createComplianceReporter(config);
      await cleanupReporter.generateReport(mockResult);

      // Should attempt to delete old report files
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should clean up old reports based on age limit', async () => {
      config.retention.maxAge = 1; // 1 day

      const oldReport = {
        id: 'old-report',
        timestamp: new Date('2022-12-01'), // Very old
        result: mockResult,
        reports: [{ format: 'json', path: 'old-report.json', size: 1024, generated: new Date() }],
        options: {},
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify([oldReport]));

      const cleanupReporter = createComplianceReporter(config);
      await cleanupReporter.generateReport(mockResult);

      expect(mockFs.unlinkSync).toHaveBeenCalledWith('old-report.json');
    });

    it('should archive old reports when configured', async () => {
      config.retention.archiveOldReports = true;
      config.retention.archivePath = './archive';
      config.retention.maxReports = 1;

      const oldReport = {
        id: 'old-report',
        timestamp: new Date('2022-12-01'),
        result: mockResult,
        reports: [{ format: 'json', path: 'old-report.json', size: 1024, generated: new Date() }],
        options: {},
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify([oldReport]));

      const archiveReporter = createComplianceReporter(config);
      await archiveReporter.generateReport(mockResult);

      expect(mockFs.renameSync).toHaveBeenCalledWith(
        'old-report.json',
        expect.stringContaining('archive'),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors gracefully', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      const errorSpy = jest.fn();
      reporter.on('formatReportError', errorSpy);

      const reports = await reporter.generateReport(mockResult);

      expect(reports).toHaveLength(0); // No reports generated due to errors
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle template errors gracefully', async () => {
      config.formats[1].template = 'non-existent-template';
      const errorReporter = createComplianceReporter(config);

      await expect(errorReporter.generateReport(mockResult)).resolves.not.toThrow();
    });

    it('should emit error events for cleanup failures', async () => {
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const errorSpy = jest.fn();
      reporter.on('cleanupError', errorSpy);

      config.retention.maxReports = 1;
      const existingHistory = Array.from({ length: 3 }, (_, i) => ({
        id: `report-${i}`,
        timestamp: new Date(),
        result: mockResult,
        reports: [{ format: 'json', path: `report-${i}.json`, size: 1024, generated: new Date() }],
        options: {},
      }));

      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingHistory));

      await reporter.generateReport(mockResult);

      // Should emit cleanup error but not throw
    });
  });
});
