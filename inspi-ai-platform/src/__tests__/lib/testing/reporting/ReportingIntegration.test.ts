/**
 * Test Reporting Integration Tests
 * 
 * Integration tests for the test reporting system with real file operations
 * and end-to-end report generation workflows.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TestReportGenerator, TestReportData } from '../../../../lib/testing/reporting/TestReportGenerator';

describe('Test Reporting Integration', () => {
  let tempDir: string;
  let generator: TestReportGenerator;
  let sampleData: TestReportData;

  beforeEach(() => {
    // Create a real temporary directory for integration tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-reports-'));
    
    generator = new TestReportGenerator({
      outputDir: tempDir,
      formats: ['html', 'json', 'markdown', 'xml', 'csv'],
      includeCharts: true,
      includeTrends: true,
      branding: {
        title: 'Integration Test Report',
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545'
        }
      }
    });

    sampleData = {
      summary: {
        timestamp: new Date(),
        duration: 12500,
        totalTests: 250,
        passedTests: 235,
        failedTests: 10,
        skippedTests: 5,
        passRate: 94
      },
      coverage: {
        statements: 89.5,
        branches: 85.2,
        functions: 92.8,
        lines: 88.7,
        files: [
          {
            path: 'src/services/userService.ts',
            statements: 95,
            branches: 90,
            functions: 100,
            lines: 94,
            uncoveredLines: [15, 23, 45, 67]
          },
          {
            path: 'src/utils/helpers.ts',
            statements: 78,
            branches: 72,
            functions: 85,
            lines: 76,
            uncoveredLines: [12, 34, 56, 78, 90, 112]
          }
        ]
      },
      performance: {
        totalExecutionTime: 12500,
        averageTestTime: 50,
        slowestTests: [
          { name: 'complex integration test', duration: 850, file: 'integration.spec.ts' },
          { name: 'database migration test', duration: 720, file: 'migration.spec.ts' },
          { name: 'file upload test', duration: 650, file: 'upload.spec.ts' }
        ],
        memoryUsage: {
          peak: 256,
          average: 128
        }
      },
      testResults: [
        {
          testFile: 'user.spec.ts',
          testSuite: 'User Service',
          testName: 'should create user successfully',
          status: 'passed',
          duration: 45
        },
        {
          testFile: 'auth.spec.ts',
          testSuite: 'Authentication',
          testName: 'should validate JWT token',
          status: 'passed',
          duration: 32
        },
        {
          testFile: 'api.spec.ts',
          testSuite: 'API Routes',
          testName: 'should handle invalid input',
          status: 'failed',
          duration: 120,
          error: {
            message: 'Expected status 400 but received 500',
            stack: 'AssertionError: Expected status 400 but received 500\n    at test.spec.ts:45:12'
          }
        },
        {
          testFile: 'performance.spec.ts',
          testSuite: 'Performance Tests',
          testName: 'should complete within time limit',
          status: 'skipped',
          duration: 0
        }
      ],
      quality: {
        qualityScore: 87,
        securityIssues: 3,
        codeSmells: 12,
        technicalDebt: '4h 15m'
      },
      trends: {
        coverageTrend: [
          { date: new Date('2024-01-01'), coverage: 85.2 },
          { date: new Date('2024-01-02'), coverage: 87.1 },
          { date: new Date('2024-01-03'), coverage: 89.5 }
        ],
        performanceTrend: [
          { date: new Date('2024-01-01'), duration: 13200 },
          { date: new Date('2024-01-02'), duration: 12800 },
          { date: new Date('2024-01-03'), duration: 12500 }
        ],
        qualityTrend: [
          { date: new Date('2024-01-01'), score: 82 },
          { date: new Date('2024-01-02'), score: 85 },
          { date: new Date('2024-01-03'), score: 87 }
        ]
      }
    };
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Report Generation', () => {
    it('should generate all report formats successfully', async () => {
      const result = await generator.generateReport(sampleData);

      expect(result.files).toHaveLength(8); // 5 formats + 3 chart files
      expect(result.summary.totalFiles).toBe(8);
      expect(result.summary.formats).toEqual(['html', 'json', 'markdown', 'xml', 'csv']);

      // Verify all files exist
      result.files.forEach(filePath => {
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.statSync(filePath).size).toBeGreaterThan(0);
      });
    });

    it('should generate valid HTML report with all sections', async () => {
      await generator.generateReport(sampleData);

      const htmlFile = path.join(tempDir, `test-report-${sampleData.summary.timestamp.toISOString().split('T')[0]}.html`);
      expect(fs.existsSync(htmlFile)).toBe(true);

      const htmlContent = fs.readFileSync(htmlFile, 'utf8');
      
      // Check HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('Integration Test Report');
      
      // Check sections
      expect(htmlContent).toContain('Test Summary');
      expect(htmlContent).toContain('Coverage Report');
      expect(htmlContent).toContain('Performance Metrics');
      
      // Check data
      expect(htmlContent).toContain('250'); // Total tests
      expect(htmlContent).toContain('94%'); // Pass rate
      expect(htmlContent).toContain('89.5%'); // Coverage
    });

    it('should generate valid JSON report with complete data', async () => {
      await generator.generateReport(sampleData);

      const jsonFile = path.join(tempDir, `test-report-${sampleData.summary.timestamp.toISOString().split('T')[0]}.json`);
      expect(fs.existsSync(jsonFile)).toBe(true);

      const jsonContent = fs.readFileSync(jsonFile, 'utf8');
      const jsonData = JSON.parse(jsonContent);

      // Check metadata
      expect(jsonData.metadata).toBeDefined();
      expect(jsonData.metadata.generator).toBe('TestReportGenerator');
      
      // Check data structure
      expect(jsonData.summary).toBeDefined();
      expect(jsonData.coverage).toBeDefined();
      expect(jsonData.performance).toBeDefined();
      expect(jsonData.testResults).toBeDefined();
      expect(jsonData.quality).toBeDefined();
      expect(jsonData.trends).toBeDefined();
      
      // Check data values
      expect(jsonData.summary.totalTests).toBe(250);
      expect(jsonData.coverage.statements).toBe(89.5);
      expect(jsonData.testResults).toHaveLength(4);
    });

    it('should generate valid XML report in JUnit format', async () => {
      await generator.generateReport(sampleData);

      const xmlFile = path.join(tempDir, `test-report-${sampleData.summary.timestamp.toISOString().split('T')[0]}.xml`);
      expect(fs.existsSync(xmlFile)).toBe(true);

      const xmlContent = fs.readFileSync(xmlFile, 'utf8');
      
      // Check XML structure
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<testsuites');
      expect(xmlContent).toContain('<testsuite');
      expect(xmlContent).toContain('<testcase');
      
      // Check test data
      expect(xmlContent).toContain('should create user successfully');
      expect(xmlContent).toContain('should validate JWT token');
      expect(xmlContent).toContain('<failure');
      expect(xmlContent).toContain('Expected status 400 but received 500');
      expect(xmlContent).toContain('<skipped/>');
    });

    it('should generate readable Markdown report', async () => {
      await generator.generateReport(sampleData);

      const mdFile = path.join(tempDir, `test-report-${sampleData.summary.timestamp.toISOString().split('T')[0]}.markdown`);
      expect(fs.existsSync(mdFile)).toBe(true);

      const mdContent = fs.readFileSync(mdFile, 'utf8');
      
      // Check Markdown structure
      expect(mdContent).toContain('# Integration Test Report');
      expect(mdContent).toContain('## Test Summary');
      expect(mdContent).toContain('## Coverage Report');
      expect(mdContent).toContain('## Performance Metrics');
      
      // Check tables
      expect(mdContent).toContain('| Metric | Coverage |');
      expect(mdContent).toContain('|--------|----------|');
      
      // Check data
      expect(mdContent).toContain('**Total Tests:** 250');
      expect(mdContent).toContain('**Pass Rate:** 94%');
    });

    it('should generate CSV report with proper formatting', async () => {
      await generator.generateReport(sampleData);

      const csvFile = path.join(tempDir, `test-report-${sampleData.summary.timestamp.toISOString().split('T')[0]}.csv`);
      expect(fs.existsSync(csvFile)).toBe(true);

      const csvContent = fs.readFileSync(csvFile, 'utf8');
      const lines = csvContent.split('\n');
      
      // Check header
      expect(lines[0]).toBe('Test File,Test Suite,Test Name,Status,Duration (ms),Error Message');
      
      // Check data rows
      expect(lines).toHaveLength(5); // Header + 4 test results
      expect(lines[1]).toContain('user.spec.ts');
      expect(lines[1]).toContain('passed');
      expect(lines[3]).toContain('failed');
      expect(lines[3]).toContain('Expected status 400 but received 500');
    });
  });

  describe('Chart Generation Integration', () => {
    it('should generate chart data files with valid JSON', async () => {
      await generator.generateReport(sampleData);

      const coverageChartFile = path.join(tempDir, 'coverage-chart.json');
      const resultsChartFile = path.join(tempDir, 'results-chart.json');
      const trendChartFile = path.join(tempDir, 'trend-chart.json');

      // Check files exist
      expect(fs.existsSync(coverageChartFile)).toBe(true);
      expect(fs.existsSync(resultsChartFile)).toBe(true);
      expect(fs.existsSync(trendChartFile)).toBe(true);

      // Check coverage chart
      const coverageChart = JSON.parse(fs.readFileSync(coverageChartFile, 'utf8'));
      expect(coverageChart.type).toBe('doughnut');
      expect(coverageChart.data.labels).toEqual(['Statements', 'Branches', 'Functions', 'Lines']);
      expect(coverageChart.data.datasets[0].data).toEqual([89.5, 85.2, 92.8, 88.7]);

      // Check results chart
      const resultsChart = JSON.parse(fs.readFileSync(resultsChartFile, 'utf8'));
      expect(resultsChart.type).toBe('pie');
      expect(resultsChart.data.labels).toEqual(['Passed', 'Failed', 'Skipped']);
      expect(resultsChart.data.datasets[0].data).toEqual([235, 10, 5]);

      // Check trend chart
      const trendChart = JSON.parse(fs.readFileSync(trendChartFile, 'utf8'));
      expect(trendChart.type).toBe('line');
      expect(trendChart.data.datasets).toHaveLength(2);
      expect(trendChart.data.datasets[0].label).toBe('Coverage %');
      expect(trendChart.data.datasets[1].label).toBe('Quality Score');
    });
  });

  describe('Custom Template Integration', () => {
    it('should use custom template for report generation', async () => {
      const customTemplate = {
        name: 'minimal',
        description: 'Minimal HTML template',
        format: 'html' as const,
        template: `
          <html>
            <head><title>{{title}}</title></head>
            <body>
              <h1>{{title}}</h1>
              <p>Total Tests: {{summary.totalTests}}</p>
              <p>Pass Rate: {{summary.passRate}}%</p>
              <p>Coverage: {{coverage.statements}}%</p>
            </body>
          </html>
        `,
        variables: ['title', 'summary', 'coverage']
      };

      // Create generator with custom template
      const customGenerator = new TestReportGenerator({
        outputDir: tempDir,
        formats: ['html'],
        includeCharts: false,
        branding: {
          title: 'Integration Test Report',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
          }
        }
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

      await customGenerator.generateReport(sampleData);

      const htmlFile = path.join(tempDir, `test-report-${sampleData.summary.timestamp.toISOString().split('T')[0]}.html`);
      const htmlContent = fs.readFileSync(htmlFile, 'utf8');

      expect(htmlContent).toContain('<h1>Integration Test Report</h1>');
      expect(htmlContent).toContain('<p>Total Tests: 250</p>');
      expect(htmlContent).toContain('<p>Pass Rate: 94%</p>');
      expect(htmlContent).toContain('<p>Coverage: 89.5%</p>');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a read-only directory
      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      
      try {
        fs.chmodSync(readOnlyDir, 0o444);

        const restrictedGenerator = new TestReportGenerator({
          outputDir: readOnlyDir,
          formats: ['json'],
          includeCharts: false
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await restrictedGenerator.generateReport(sampleData);

        expect(consoleSpy).toHaveBeenCalled();
        expect(result.files).toHaveLength(0);

        consoleSpy.mockRestore();
      } finally {
        // Restore permissions for cleanup
        try {
          fs.chmodSync(readOnlyDir, 0o755);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle disk space issues', async () => {
      // This test would require more complex setup to simulate disk space issues
      // For now, we'll test with a very large dataset that might cause issues
      const largeData = {
        ...sampleData,
        testResults: Array.from({ length: 100000 }, (_, i) => ({
          testFile: `test${i}.spec.ts`,
          testSuite: `Suite ${i}`,
          testName: `Test ${i} with very long name that might cause issues`,
          status: 'passed' as const,
          duration: Math.random() * 1000
        }))
      };

      const result = await generator.generateReport(largeData);
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    it('should generate reports within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await generator.generateReport(sampleData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds for normal dataset
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent report generation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => {
        const concurrentGenerator = new TestReportGenerator({
          outputDir: path.join(tempDir, `concurrent-${i}`),
          formats: ['json', 'html']
        });
        
        return concurrentGenerator.generateReport({
          ...sampleData,
          summary: {
            ...sampleData.summary,
            timestamp: new Date(Date.now() + i * 1000)
          }
        });
      });

      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect(result.files.length).toBeGreaterThan(0);
        
        // Verify files exist in separate directories
        const dir = path.join(tempDir, `concurrent-${i}`);
        expect(fs.existsSync(dir)).toBe(true);
      });
    });
  });
});