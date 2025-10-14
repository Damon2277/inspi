/**
 * Test Report Generator
 *
 * Comprehensive test report generation system supporting multiple formats,
 * visual coverage reports, historical trend analysis, and custom templates.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestReportData {
  summary: {
    timestamp: Date;
    duration: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    passRate: number;
  };
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
    files: Array<{
      path: string;
      statements: number;
      branches: number;
      functions: number;
      lines: number;
      uncoveredLines: number[];
    }>;
  };
  performance: {
    totalExecutionTime: number;
    averageTestTime: number;
    slowestTests: Array<{
      name: string;
      duration: number;
      file: string;
    }>;
    memoryUsage: {
      peak: number;
      average: number;
    };
  };
  testResults: Array<{
    testFile: string;
    testSuite: string;
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: {
      message: string;
      stack?: string;
    };
  }>;
  quality: {
    qualityScore: number;
    securityIssues: number;
    codeSmells: number;
    technicalDebt: string;
  };
  trends: {
    coverageTrend: Array<{
      date: Date;
      coverage: number;
    }>;
    performanceTrend: Array<{
      date: Date;
      duration: number;
    }>;
    qualityTrend: Array<{
      date: Date;
      score: number;
    }>;
  };
}

export interface ReportConfig {
  outputDir: string;
  formats: ReportFormat[];
  includeCharts: boolean;
  includeTrends: boolean;
  customTemplate?: string;
  branding?: {
    title: string;
    logo?: string;
    colors: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      error: string;
    };
  };
}

export type ReportFormat = 'html' | 'json' | 'xml' | 'pdf' | 'markdown' | 'csv';

export interface ReportTemplate {
  name: string;
  description: string;
  format: ReportFormat;
  template: string;
  variables: string[];
}

export class TestReportGenerator {
  private config: ReportConfig;
  private templates: Map<string, ReportTemplate> = new Map();

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      outputDir: 'reports',
      formats: ['html', 'json'],
      includeCharts: true,
      includeTrends: true,
      branding: {
        title: 'Test Report',
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          error: '#dc3545',
        },
      },
      ...config,
    };

    this.initializeDefaultTemplates();
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(data: TestReportData): Promise<{
    files: string[];
    summary: {
      totalFiles: number;
      formats: ReportFormat[];
      outputDir: string;
    };
  }> {
    const generatedFiles: string[] = [];

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Generate reports in each requested format
    for (const format of this.config.formats) {
      try {
        const filePath = await this.generateFormatReport(data, format);
        generatedFiles.push(filePath);
      } catch (error) {
        console.error(`Failed to generate ${format} report:`, error);
      }
    }

    // Generate additional assets (charts, images, etc.)
    if (this.config.includeCharts) {
      const chartFiles = await this.generateCharts(data);
      generatedFiles.push(...chartFiles);
    }

    return {
      files: generatedFiles,
      summary: {
        totalFiles: generatedFiles.length,
        formats: this.config.formats,
        outputDir: this.config.outputDir,
      },
    };
  }

  /**
   * Generate report in specific format
   */
  private async generateFormatReport(data: TestReportData, format: ReportFormat): Promise<string> {
    const timestamp = data.summary.timestamp.toISOString().split('T')[0];
    const fileName = `test-report-${timestamp}.${format}`;
    const filePath = path.join(this.config.outputDir, fileName);

    try {
      switch (format) {
        case 'html':
          await this.generateHtmlReport(data, filePath);
          break;
        case 'json':
          await this.generateJsonReport(data, filePath);
          break;
        case 'xml':
          await this.generateXmlReport(data, filePath);
          break;
        case 'markdown':
          await this.generateMarkdownReport(data, filePath);
          break;
        case 'csv':
          await this.generateCsvReport(data, filePath);
          break;
        case 'pdf':
          await this.generatePdfReport(data, filePath);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw error; // Re-throw to be caught by the caller
    }

    return filePath;
  }

  /**
   * Generate HTML report with charts and interactive elements
   */
  private async generateHtmlReport(data: TestReportData, filePath: string): Promise<void> {
    const template = this.templates.get('html-default');
    if (!template) {
      throw new Error('HTML template not found');
    }

    const html = this.processTemplate(template.template, {
      title: this.config.branding?.title || 'Test Report',
      timestamp: data.summary.timestamp.toISOString(),
      summary: data.summary,
      coverage: data.coverage,
      performance: data.performance,
      quality: data.quality,
      trends: this.config.includeTrends ? data.trends : null,
      testResults: data.testResults,
      colors: this.config.branding?.colors,
      charts: this.config.includeCharts ? this.generateChartScripts(data) : '',
    });

    fs.writeFileSync(filePath, html, 'utf8');
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(data: TestReportData, filePath: string): Promise<void> {
    const jsonData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generator: 'TestReportGenerator',
        version: '1.0.0',
      },
      ...data,
    };

    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
  }

  /**
   * Generate XML report (JUnit format)
   */
  private async generateXmlReport(data: TestReportData, filePath: string): Promise<void> {
    const xml = this.generateJUnitXml(data);
    fs.writeFileSync(filePath, xml, 'utf8');
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdownReport(data: TestReportData, filePath: string): Promise<void> {
    const template = this.templates.get('markdown-default');
    if (!template) {
      throw new Error('Markdown template not found');
    }

    const markdown = this.processTemplate(template.template, {
      title: this.config.branding?.title || 'Test Report',
      timestamp: data.summary.timestamp.toISOString(),
      summary: data.summary,
      coverage: data.coverage,
      performance: data.performance,
      quality: data.quality,
      testResults: data.testResults,
    });

    fs.writeFileSync(filePath, markdown, 'utf8');
  }

  /**
   * Generate CSV report
   */
  private async generateCsvReport(data: TestReportData, filePath: string): Promise<void> {
    const csvLines = [
      'Test File,Test Suite,Test Name,Status,Duration (ms),Error Message',
    ];

    data.testResults.forEach(test => {
      const errorMessage = test.error ? test.error.message.replace(/"/g, '""') : '';
      csvLines.push(
        `"${test.testFile}","${test.testSuite}","${test.testName}","${test.status}",${test.duration},"${errorMessage}"`,
      );
    });

    fs.writeFileSync(filePath, csvLines.join('\n'), 'utf8');
  }

  /**
   * Generate PDF report (simplified implementation)
   */
  private async generatePdfReport(data: TestReportData, filePath: string): Promise<void> {
    // For a real implementation, you would use a library like puppeteer or jsPDF
    // This is a placeholder that generates HTML and suggests PDF conversion
    const htmlPath = filePath.replace('.pdf', '.html');
    await this.generateHtmlReport(data, htmlPath);

    // Create a simple text file with PDF generation instructions
    const instructions = `
PDF Report Generation Instructions:
1. HTML report generated at: ${htmlPath}
2. Use a tool like wkhtmltopdf or puppeteer to convert HTML to PDF
3. Command example: wkhtmltopdf ${htmlPath} ${filePath}
    `;

    fs.writeFileSync(filePath.replace('.pdf', '-pdf-instructions.txt'), instructions, 'utf8');
  }

  /**
   * Generate charts and visualizations
   */
  private async generateCharts(data: TestReportData): Promise<string[]> {
    const chartFiles: string[] = [];

    try {
      // Generate coverage chart data
      const coverageChartPath = path.join(this.config.outputDir, 'coverage-chart.json');
      const coverageChartData = {
        type: 'doughnut',
        data: {
          labels: ['Statements', 'Branches', 'Functions', 'Lines'],
          datasets: [{
            data: [
              data.coverage.statements,
              data.coverage.branches,
              data.coverage.functions,
              data.coverage.lines,
            ],
            backgroundColor: [
              this.config.branding?.colors.primary,
              this.config.branding?.colors.secondary,
              this.config.branding?.colors.success,
              this.config.branding?.colors.warning,
            ],
          }],
        },
      };
      fs.writeFileSync(coverageChartPath, JSON.stringify(coverageChartData, null, 2));
      chartFiles.push(coverageChartPath);

      // Generate test results chart data
      const resultsChartPath = path.join(this.config.outputDir, 'results-chart.json');
      const resultsChartData = {
        type: 'pie',
        data: {
          labels: ['Passed', 'Failed', 'Skipped'],
          datasets: [{
            data: [
              data.summary.passedTests,
              data.summary.failedTests,
              data.summary.skippedTests,
            ],
            backgroundColor: [
              this.config.branding?.colors.success,
              this.config.branding?.colors.error,
              this.config.branding?.colors.secondary,
            ],
          }],
        },
      };
      fs.writeFileSync(resultsChartPath, JSON.stringify(resultsChartData, null, 2));
      chartFiles.push(resultsChartPath);

      // Generate trend charts if data is available
      if (this.config.includeTrends && data.trends.coverageTrend.length > 0) {
        const trendChartPath = path.join(this.config.outputDir, 'trend-chart.json');
        const trendChartData = {
          type: 'line',
          data: {
            labels: data.trends.coverageTrend.map(t => t.date.toISOString().split('T')[0]),
            datasets: [
              {
                label: 'Coverage %',
                data: data.trends.coverageTrend.map(t => t.coverage),
                borderColor: this.config.branding?.colors.primary,
                fill: false,
              },
              {
                label: 'Quality Score',
                data: data.trends.qualityTrend.map(t => t.score),
                borderColor: this.config.branding?.colors.success,
                fill: false,
              },
            ],
          },
        };
        fs.writeFileSync(trendChartPath, JSON.stringify(trendChartData, null, 2));
        chartFiles.push(trendChartPath);
      }
    } catch (error) {
      // Chart generation errors should not fail the entire report
      console.error('Chart generation failed:', error);
    }

    return chartFiles;
  }

  /**
   * Add custom template
   */
  addTemplate(template: ReportTemplate): void {
    this.templates.set(`${template.format}-${template.name}`, template);
  }

  /**
   * Get available templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private initializeDefaultTemplates(): void {
    // HTML Template
    this.templates.set('html-default', {
      name: 'default',
      description: 'Default HTML report template',
      format: 'html',
      template: this.getDefaultHtmlTemplate(),
      variables: ['title', 'timestamp', 'summary', 'coverage', 'performance', 'quality', 'testResults', 'colors', 'charts'],
    });

    // Markdown Template
    this.templates.set('markdown-default', {
      name: 'default',
      description: 'Default Markdown report template',
      format: 'markdown',
      template: this.getDefaultMarkdownTemplate(),
      variables: ['title', 'timestamp', 'summary', 'coverage', 'performance', 'quality', 'testResults'],
    });
  }

  private getDefaultHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: {{colors.primary}}; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid {{colors.primary}}; }
        .metric-value { font-size: 2em; font-weight: bold; color: {{colors.primary}}; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 2px solid {{colors.primary}}; padding-bottom: 10px; }
        .test-results { overflow-x: auto; }
        .test-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .test-table th, .test-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .test-table th { background: #f8f9fa; font-weight: 600; }
        .status-passed { color: {{colors.success}}; font-weight: bold; }
        .status-failed { color: {{colors.error}}; font-weight: bold; }
        .status-skipped { color: {{colors.warning}}; font-weight: bold; }
        .chart-container { margin: 20px 0; height: 400px; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
            <p>Generated on {{timestamp}}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Test Summary</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">{{summary.totalTests}}</div>
                        <div class="metric-label">Total Tests</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{summary.passedTests}}</div>
                        <div class="metric-label">Passed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{summary.failedTests}}</div>
                        <div class="metric-label">Failed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{summary.passRate}}%</div>
                        <div class="metric-label">Pass Rate</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Coverage Report</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">{{coverage.statements}}%</div>
                        <div class="metric-label">Statements</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{coverage.branches}}%</div>
                        <div class="metric-label">Branches</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{coverage.functions}}%</div>
                        <div class="metric-label">Functions</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{coverage.lines}}%</div>
                        <div class="metric-label">Lines</div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="coverageChart"></canvas>
                </div>
            </div>

            <div class="section">
                <h2>Performance Metrics</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">{{performance.totalExecutionTime}}ms</div>
                        <div class="metric-label">Total Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{performance.averageTestTime}}ms</div>
                        <div class="metric-label">Average Test Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{performance.memoryUsage.peak}}MB</div>
                        <div class="metric-label">Peak Memory</div>
                    </div>
                </div>
            </div>

            {{charts}}
        </div>
    </div>
</body>
</html>
    `;
  }

  private getDefaultMarkdownTemplate(): string {
    return `
# {{title}}

Generated on {{timestamp}}

## Test Summary

- **Total Tests:** {{summary.totalTests}}
- **Passed:** {{summary.passedTests}}
- **Failed:** {{summary.failedTests}}
- **Skipped:** {{summary.skippedTests}}
- **Pass Rate:** {{summary.passRate}}%
- **Duration:** {{summary.duration}}ms

## Coverage Report

| Metric | Coverage |
|--------|----------|
| Statements | {{coverage.statements}}% |
| Branches | {{coverage.branches}}% |
| Functions | {{coverage.functions}}% |
| Lines | {{coverage.lines}}% |

## Performance Metrics

- **Total Execution Time:** {{performance.totalExecutionTime}}ms
- **Average Test Time:** {{performance.averageTestTime}}ms
- **Peak Memory Usage:** {{performance.memoryUsage.peak}}MB
- **Average Memory Usage:** {{performance.memoryUsage.average}}MB

## Quality Metrics

- **Quality Score:** {{quality.qualityScore}}/100
- **Security Issues:** {{quality.securityIssues}}
- **Code Smells:** {{quality.codeSmells}}
- **Technical Debt:** {{quality.technicalDebt}}

## Test Results

| Test File | Test Suite | Test Name | Status | Duration |
|-----------|------------|-----------|--------|----------|
{{#each testResults}}
| {{testFile}} | {{testSuite}} | {{testName}} | {{status}} | {{duration}}ms |
{{/each}}
    `;
  }

  private processTemplate(template: string, variables: any): string {
    let processed = template;

    // Simple template variable replacement
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      const regex = new RegExp(`{{${key}}}`, 'g');

      if (typeof value === 'object' && value !== null) {
        // Handle nested object properties
        Object.keys(value).forEach(subKey => {
          const subRegex = new RegExp(`{{${key}\\.${subKey}}}`, 'g');
          processed = processed.replace(subRegex, String(value[subKey] || ''));
        });
      } else {
        processed = processed.replace(regex, String(value || ''));
      }
    });

    return processed;
  }

  private generateJUnitXml(data: TestReportData): string {
    const testSuites = new Map<string, any[]>();

    // Group tests by test file
    data.testResults.forEach(test => {
      if (!testSuites.has(test.testFile)) {
        testSuites.set(test.testFile, []);
      }
      testSuites.get(test.testFile)!.push(test);
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="Test Results" tests="${data.summary.totalTests}" failures="${data.summary.failedTests}" time="${data.summary.duration / 1000}">\n`;

    testSuites.forEach((tests, suiteName) => {
      const suiteTests = tests.length;
      const suiteFailures = tests.filter(t => t.status === 'failed').length;
      const suiteTime = tests.reduce((sum, t) => sum + t.duration, 0) / 1000;

      xml += `  <testsuite name="${suiteName}" tests="${suiteTests}" failures="${suiteFailures}" time="${suiteTime}">\n`;

      tests.forEach(test => {
        xml += `    <testcase classname="${test.testSuite}" name="${test.testName}" time="${test.duration / 1000}">`;

        if (test.status === 'failed' && test.error) {
          xml += `\n      <failure message="${this.escapeXml(test.error.message)}">${this.escapeXml(test.error.stack || '')}</failure>\n    `;
        } else if (test.status === 'skipped') {
          xml += '\n      <skipped/>\n    ';
        }

        xml += '</testcase>\n';
      });

      xml += '  </testsuite>\n';
    });

    xml += '</testsuites>';
    return xml;
  }

  private generateChartScripts(data: TestReportData): string {
    return `
    <script>
        // Coverage Chart
        const coverageCtx = document.getElementById('coverageChart').getContext('2d');
        new Chart(coverageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Statements', 'Branches', 'Functions', 'Lines'],
                datasets: [{
                    data: [${data.coverage.statements}, ${data.coverage.branches}, ${data.coverage.functions}, ${data.coverage.lines}],
                    backgroundColor: ['${this.config.branding?.colors.primary}', '${this.config.branding?.colors.secondary}', '${this.config.branding?.colors.success}', '${this.config.branding?.colors.warning}']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Code Coverage'
                    }
                }
            }
        });
    </script>
    `;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
