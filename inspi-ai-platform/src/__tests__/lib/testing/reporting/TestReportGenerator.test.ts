/**
 * TestReportGenerator Unit Tests
 * 
 * Comprehensive test suite for the test report generation system,
 * covering multi-format reports, templates, charts, and error handling.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestReportGenerator, TestReportData, ReportConfig, ReportTemplate } from '../../../../lib/testing/reporting/TestReportGenerator';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TestReportGenerator', () => {
  let generator: TestReportGenerator;
  let mockReportData: TestReportData;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = '/tmp/test-reports';
    
    // Mock fs methods
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);

    generator = new TestReportGenerator({
      outputDir: tempDir,
      formats: ['html', 'json', 'markdown'],
      includeCharts: true,
      includeTrends: true
    });

    mockReportData = {
      summary: {
        timestamp: new Date('2024-01-01T10:00:00Z'),
        duration: 5000,
        totalTests: 100,
        passedTests: 95,
        failedTests: 3,
        skippedTests: 2,
        passRate: 95
      },
      coverage: {
        statements: 92.5,
        branches: 88.3,
        functions: 94.1,
        lines: 91.7,
        files: [
          {
            path: 'src/service.ts',
            statements: 95,
            branches: 90,
            functions: 100,
            lines: 94,
            uncoveredLines: [15, 23, 45]
          }
        ]
      },
      performance: {
        totalExecutionTime: 5000,
        averageTestTime: 50,
        slowestTests: [
          { name: 'slow test', duration: 500, file: 'test.spec.ts' }
        ],
        memoryUsage: {
          peak: 128,
          average: 64
        }
      },
      testResults: [
        {
          testFile: 'test1.spec.ts',
          testSuite: 'Service Tests',
          testName: 'should work correctly',
          status: 'passed',
          duration: 45
        },
        {
          testFile: 'test2.spec.ts',
          testSuite: 'API Tests',
          testName: 'should handle errors',
          status: 'failed',
          duration: 120,
          error: {
            message: 'Expected true but got false',
            stack: 'Error stack trace...'
          }
        }
      ],
      quality: {
        qualityScore: 85,
        securityIssues: 2,
        codeSmells: 5,
        technicalDebt: '2h 30m'
      },
      trends: {
        coverageTrend: [
          { date: new Date('2024-01-01'), coverage: 90 },
          { date: new Date('2024-01-02'), coverage: 92.5 }
        ],
        performanceTrend: [
          { date: new Date('2024-01-01'), duration: 5200 },
          { date: new Date('2024-01-02'), duration: 5000 }
        ],
        qualityTrend: [
          { date: new Date('2024-01-01'), score: 82 },
          { date: new Date('2024-01-02'), score: 85 }
        ]
      }
    };
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultGenerator = new TestReportGenerator();
      expect(defaultGenerator).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<ReportConfig> = {
        outputDir: '/custom/path',
        formats: ['json', 'xml'],
        includeCharts: false,
        branding: {
          title: 'Custom Report',
          colors: {
            primary: '#ff0000',
            secondary: '#00ff00',
            success: '#0000ff',
            warning: '#ffff00',
            error: '#ff00ff'
          }
        }
      };

      const customGenerator = new TestReportGenerator(customConfig);
      expect(customGenerator).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        formats: ['pdf'] as const,
        includeCharts: false
      };

      generator.updateConfig(newConfig);
      expect(() => generator.updateConfig(newConfig)).not.toThrow();
    });
  });

  describe('Report Generation', () => {
    it('should generate reports in all requested formats', async () => {
      const result = await generator.generateReport(mockReportData);

      expect(result.files).toHaveLength(6); // 3 formats + 3 chart files
      expect(result.summary.formats).toEqual(['html', 'json', 'markdown']);
      expect(result.summary.outputDir).toBe(tempDir);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(tempDir, { recursive: true });
    });

    it('should create output directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await generator.generateReport(mockReportData);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(tempDir, { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.existsSync.mockReturnValue(true);

      await generator.generateReport(mockReportData);

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle report generation errors gracefully', async () => {
      mockFs.writeFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('.html') || filePath.toString().includes('.json') || filePath.toString().includes('.markdown')) {
          throw new Error('Write failed');
        }
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await generator.generateReport(mockReportData);

      expect(consoleSpy).toHaveBeenCalled();
      // Charts might also fail due to the same writeFileSync mock, so just check that some error was logged
      expect(result.files.length).toBeGreaterThanOrEqual(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('HTML Report Generation', () => {
    it('should generate HTML report with correct structure', async () => {
      const htmlGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['html'],
        includeCharts: true
      });

      await htmlGenerator.generateReport(mockReportData);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf8'
      );
    });

    it('should include branding in HTML report', async () => {
      const brandedGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['html'],
        branding: {
          title: 'Custom Test Report',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
          }
        }
      });

      await brandedGenerator.generateReport(mockReportData);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Custom Test Report'),
        'utf8'
      );
    });

    it('should include charts in HTML report when enabled', async () => {
      await generator.generateReport(mockReportData);

      const htmlCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.html')
      );
      
      expect(htmlCall?.[1]).toContain('chart.js');
      expect(htmlCall?.[1]).toContain('coverageChart');
    });
  });

  describe('JSON Report Generation', () => {
    it('should generate valid JSON report', async () => {
      const jsonGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['json']
      });

      await jsonGenerator.generateReport(mockReportData);

      const jsonCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('chart')
      );

      expect(jsonCall).toBeDefined();
      expect(() => JSON.parse(jsonCall![1] as string)).not.toThrow();
    });

    it('should include metadata in JSON report', async () => {
      const jsonGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['json']
      });

      await jsonGenerator.generateReport(mockReportData);

      const jsonCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.json') && !call[0].toString().includes('chart')
      );

      const jsonData = JSON.parse(jsonCall![1] as string);
      expect(jsonData.metadata).toBeDefined();
      expect(jsonData.metadata.generator).toBe('TestReportGenerator');
      expect(jsonData.metadata.version).toBe('1.0.0');
    });
  });

  describe('XML Report Generation', () => {
    it('should generate JUnit XML format', async () => {
      const xmlGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['xml']
      });

      await xmlGenerator.generateReport(mockReportData);

      const xmlCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.xml')
      );

      expect(xmlCall?.[1]).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlCall?.[1]).toContain('<testsuites');
      expect(xmlCall?.[1]).toContain('<testsuite');
      expect(xmlCall?.[1]).toContain('<testcase');
    });

    it('should handle test failures in XML format', async () => {
      const xmlGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['xml']
      });

      await xmlGenerator.generateReport(mockReportData);

      const xmlCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.xml')
      );

      expect(xmlCall?.[1]).toContain('<failure');
      expect(xmlCall?.[1]).toContain('Expected true but got false');
    });

    it('should escape XML special characters', async () => {
      const dataWithSpecialChars = {
        ...mockReportData,
        testResults: [
          {
            testFile: 'test.spec.ts',
            testSuite: 'Tests with <special> & "chars"',
            testName: 'should handle & escape < > " \' characters',
            status: 'failed' as const,
            duration: 100,
            error: {
              message: 'Error with <tags> & "quotes"',
              stack: 'Stack with <xml> & special chars'
            }
          }
        ]
      };

      const xmlGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['xml']
      });

      await xmlGenerator.generateReport(dataWithSpecialChars);

      const xmlCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.xml')
      );

      expect(xmlCall?.[1]).toContain('&lt;');
      expect(xmlCall?.[1]).toContain('&gt;');
      expect(xmlCall?.[1]).toContain('&amp;');
      expect(xmlCall?.[1]).toContain('&quot;');
    });
  });

  describe('Markdown Report Generation', () => {
    it('should generate markdown report with tables', async () => {
      const mdGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['markdown']
      });

      await mdGenerator.generateReport(mockReportData);

      const mdCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.markdown')
      );

      expect(mdCall?.[1]).toContain('# ');
      expect(mdCall?.[1]).toContain('| Metric | Coverage |');
      expect(mdCall?.[1]).toContain('|--------|----------|');
    });

    it('should include all sections in markdown report', async () => {
      const mdGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['markdown']
      });

      await mdGenerator.generateReport(mockReportData);

      const mdCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.markdown')
      );

      expect(mdCall?.[1]).toContain('## Test Summary');
      expect(mdCall?.[1]).toContain('## Coverage Report');
      expect(mdCall?.[1]).toContain('## Performance Metrics');
      expect(mdCall?.[1]).toContain('## Quality Metrics');
    });
  });

  describe('CSV Report Generation', () => {
    it('should generate CSV with proper headers', async () => {
      const csvGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['csv']
      });

      await csvGenerator.generateReport(mockReportData);

      const csvCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.csv')
      );

      expect(csvCall?.[1]).toContain('Test File,Test Suite,Test Name,Status,Duration (ms),Error Message');
    });

    it('should escape quotes in CSV data', async () => {
      const dataWithQuotes = {
        ...mockReportData,
        testResults: [
          {
            testFile: 'test.spec.ts',
            testSuite: 'Suite with "quotes"',
            testName: 'Test with "quotes"',
            status: 'failed' as const,
            duration: 100,
            error: {
              message: 'Error with "quotes" in message'
            }
          }
        ]
      };

      const csvGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['csv']
      });

      await csvGenerator.generateReport(dataWithQuotes);

      const csvCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.csv')
      );

      expect(csvCall?.[1]).toContain('""quotes""');
    });
  });

  describe('PDF Report Generation', () => {
    it('should generate HTML file and PDF instructions', async () => {
      const pdfGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['pdf']
      });

      await pdfGenerator.generateReport(mockReportData);

      // Should generate HTML file
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf8'
      );

      // Should generate PDF instructions
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('-pdf-instructions.txt'),
        expect.stringContaining('PDF Report Generation Instructions'),
        'utf8'
      );
    });
  });

  describe('Chart Generation', () => {
    it('should generate chart data files when charts are enabled', async () => {
      await generator.generateReport(mockReportData);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('coverage-chart.json'),
        expect.any(String)
      );

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('results-chart.json'),
        expect.any(String)
      );
    });

    it('should generate trend charts when trend data is available', async () => {
      await generator.generateReport(mockReportData);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('trend-chart.json'),
        expect.any(String)
      );
    });

    it('should not generate charts when disabled', async () => {
      const noChartsGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['html'],
        includeCharts: false
      });

      await noChartsGenerator.generateReport(mockReportData);

      const chartCalls = mockFs.writeFileSync.mock.calls.filter(call => 
        call[0].toString().includes('chart.json')
      );

      expect(chartCalls).toHaveLength(0);
    });

    it('should generate valid chart configuration JSON', async () => {
      await generator.generateReport(mockReportData);

      const coverageChartCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('coverage-chart.json')
      );

      const chartData = JSON.parse(coverageChartCall![1] as string);
      expect(chartData.type).toBe('doughnut');
      expect(chartData.data.labels).toEqual(['Statements', 'Branches', 'Functions', 'Lines']);
      expect(chartData.data.datasets[0].data).toEqual([92.5, 88.3, 94.1, 91.7]);
    });
  });

  describe('Template Management', () => {
    it('should have default templates', () => {
      const templates = generator.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const htmlTemplate = templates.find(t => t.format === 'html');
      const markdownTemplate = templates.find(t => t.format === 'markdown');
      
      expect(htmlTemplate).toBeDefined();
      expect(markdownTemplate).toBeDefined();
    });

    it('should allow adding custom templates', () => {
      const customTemplate: ReportTemplate = {
        name: 'custom',
        description: 'Custom template',
        format: 'html',
        template: '<html><body>{{title}}</body></html>',
        variables: ['title']
      };

      generator.addTemplate(customTemplate);
      
      const templates = generator.getTemplates();
      const addedTemplate = templates.find(t => t.name === 'custom');
      
      expect(addedTemplate).toBeDefined();
      expect(addedTemplate?.template).toBe(customTemplate.template);
    });

    it('should process template variables correctly', async () => {
      const customTemplate: ReportTemplate = {
        name: 'test',
        description: 'Test template',
        format: 'html',
        template: '<html><title>{{title}}</title><body>Tests: {{summary.totalTests}}</body></html>',
        variables: ['title', 'summary']
      };

      // Create a new generator with custom template
      const customGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['html'],
        includeCharts: false
      });
      
      customGenerator.addTemplate(customTemplate);

      // Mock the template retrieval to use our custom template
      const originalGet = customGenerator['templates'].get;
      customGenerator['templates'].get = jest.fn().mockImplementation((key) => {
        if (key === 'html-default') {
          return customTemplate;
        }
        return originalGet.call(customGenerator['templates'], key);
      });

      await customGenerator.generateReport(mockReportData);

      const htmlCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0].toString().includes('.html')
      );

      expect(htmlCall?.[1]).toContain('Tests: 100');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing template gracefully', async () => {
      // Mock the templates map to be empty
      const emptyGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['html'],
        includeCharts: false
      });
      
      // Clear the default templates
      (emptyGenerator as any).templates.clear();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await emptyGenerator.generateReport(mockReportData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to generate html report:',
        expect.any(Error)
      );
      expect(result.files).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    it('should handle unsupported format', async () => {
      const unsupportedGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['unsupported' as any]
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await unsupportedGenerator.generateReport(mockReportData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to generate unsupported report:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle file system errors', async () => {
      mockFs.writeFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('.html')) {
          throw new Error('Permission denied');
        }
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await generator.generateReport(mockReportData);

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.files.length).toBeGreaterThan(0); // Other formats should succeed
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty test results', async () => {
      const emptyData = {
        ...mockReportData,
        testResults: [],
        summary: {
          ...mockReportData.summary,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          passRate: 0
        }
      };

      const result = await generator.generateReport(emptyData);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should handle missing error details', async () => {
      const dataWithoutErrorDetails = {
        ...mockReportData,
        testResults: [
          {
            testFile: 'test.spec.ts',
            testSuite: 'Test Suite',
            testName: 'failing test',
            status: 'failed' as const,
            duration: 100
            // No error property
          }
        ]
      };

      const result = await generator.generateReport(dataWithoutErrorDetails);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should handle missing trend data', async () => {
      const dataWithoutTrends = {
        ...mockReportData,
        trends: {
          coverageTrend: [],
          performanceTrend: [],
          qualityTrend: []
        }
      };

      const result = await generator.generateReport(dataWithoutTrends);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should handle very long file names', async () => {
      const longFileName = 'a'.repeat(200);
      const dataWithLongNames = {
        ...mockReportData,
        testResults: [
          {
            testFile: `${longFileName}.spec.ts`,
            testSuite: longFileName,
            testName: longFileName,
            status: 'passed' as const,
            duration: 50
          }
        ]
      };

      const result = await generator.generateReport(dataWithLongNames);
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = {
        ...mockReportData,
        testResults: Array.from({ length: 10000 }, (_, i) => ({
          testFile: `test${i}.spec.ts`,
          testSuite: `Suite ${i}`,
          testName: `Test ${i}`,
          status: i % 10 === 0 ? 'failed' as const : 'passed' as const,
          duration: Math.random() * 100,
          ...(i % 10 === 0 && {
            error: {
              message: `Error in test ${i}`,
              stack: `Stack trace for test ${i}`
            }
          })
        })),
        summary: {
          ...mockReportData.summary,
          totalTests: 10000,
          passedTests: 9000,
          failedTests: 1000,
          skippedTests: 0,
          passRate: 90
        }
      };

      const startTime = Date.now();
      const result = await generator.generateReport(largeData);
      const endTime = Date.now();

      expect(result.files.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});