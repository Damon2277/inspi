/**
 * Test Result Integrator
 * Integrates test results from various sources and formats for CI/CD pipelines
 */

import { promises as fs } from 'fs';
import path from 'path';

import { TestResult, TestSummary, CoverageInfo } from './types';

export class TestResultIntegrator {
  private results: TestResult[] = [];
  private supportedFormats = ['junit', 'json', 'tap', 'xunit', 'jest'];

  /**
   * Parse and integrate test results from multiple sources
   */
  async integrateResults(sources: TestResultSource[]): Promise<TestSummary> {
    console.log(`📊 Integrating test results from ${sources.length} sources`);

    this.results = [];

    for (const source of sources) {
      try {
        const results = await this.parseTestResults(source);
        this.results.push(...results);
      } catch (error) {
        console.warn(`Failed to parse results from ${source.path}: ${error}`);
      }
    }

    return this.generateSummary();
  }

  /**
   * Parse test results from a single source
   */
  private async parseTestResults(source: TestResultSource): Promise<TestResult[]> {
    const content = await fs.readFile(source.path, 'utf8');

    switch (source.format) {
      case 'junit':
        return this.parseJUnitResults(content, source.path);
      case 'json':
        return this.parseJsonResults(content, source.path);
      case 'jest':
        return this.parseJestResults(content, source.path);
      case 'tap':
        return this.parseTapResults(content, source.path);
      default:
        throw new Error(`Unsupported format: ${source.format}`);
    }
  }

  /**
   * Parse JUnit XML format
   */
  private parseJUnitResults(content: string, filePath: string): TestResult[] {
    const results: TestResult[] = [];

    // Simple XML parsing - in production, use a proper XML parser
    const testCaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*>/g;
    const failureRegex = /<failure[^>]*message="([^"]*)"[^>]*>/g;

    let match;
    while ((match = testCaseRegex.exec(content)) !== null) {
      const [, name, time] = match;
      const duration = parseFloat(time) * 1000; // Convert to milliseconds

      // Check if this test has a failure
      const failureMatch = failureRegex.exec(content);
      const status = failureMatch ? 'failed' : 'passed';

      results.push({
        id: `${filePath}-${name}`,
        name,
        status: status as 'passed' | 'failed',
        duration,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration),
        suite: path.basename(filePath, '.xml'),
        file: filePath,
        error: failureMatch ? {
          message: failureMatch[1],
          type: 'AssertionError',
        } : undefined,
      });
    }

    return results;
  }

  /**
   * Parse JSON format (generic)
   */
  private parseJsonResults(content: string, filePath: string): TestResult[] {
    const data = JSON.parse(content);
    const results: TestResult[] = [];

    // Handle different JSON structures
    if (data.tests) {
      // Jest-like format
      data.tests.forEach((test: any) => {
        results.push({
          id: test.id || `${filePath}-${test.name}`,
          name: test.name || test.title,
          status: test.status || (test.pass ? 'passed' : 'failed'),
          duration: test.duration || 0,
          startTime: new Date(test.startTime || Date.now()),
          endTime: new Date(test.endTime || Date.now()),
          suite: test.suite || path.basename(filePath, '.json'),
          file: filePath,
          error: test.error ? {
            message: test.error.message,
            stack: test.error.stack,
            type: test.error.type || 'Error',
          } : undefined,
        });
      });
    }

    return results;
  }

  /**
   * Parse Jest results
   */
  private parseJestResults(content: string, filePath: string): TestResult[] {
    const data = JSON.parse(content);
    const results: TestResult[] = [];

    if (data.testResults) {
      data.testResults.forEach((testFile: any) => {
        testFile.assertionResults?.forEach((assertion: any) => {
          results.push({
            id: `${testFile.name}-${assertion.title}`,
            name: assertion.title,
            status: assertion.status,
            duration: assertion.duration || 0,
            startTime: new Date(data.startTime),
            endTime: new Date(data.startTime + (assertion.duration || 0)),
            suite: testFile.name,
            file: testFile.name,
            error: assertion.failureMessages?.length > 0 ? {
              message: assertion.failureMessages[0],
              type: 'AssertionError',
            } : undefined,
          });
        });
      });
    }

    return results;
  }

  /**
   * Parse TAP format
   */
  private parseTapResults(content: string, filePath: string): TestResult[] {
    const results: TestResult[] = [];
    const lines = content.split('\n');

    let testNumber = 0;

    for (const line of lines) {
      if (line.startsWith('ok ') || line.startsWith('not ok ')) {
        testNumber++;
        const isOk = line.startsWith('ok ');
        const name = line.replace(/^(not )?ok \d+ - /, '');

        results.push({
          id: `${filePath}-${testNumber}`,
          name,
          status: isOk ? 'passed' : 'failed',
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          suite: path.basename(filePath, '.tap'),
          file: filePath,
        });
      }
    }

    return results;
  }

  /**
   * Generate test summary
   */
  private generateSummary(): TestSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total,
      passed,
      failed,
      skipped,
      duration,
    };
  }

  /**
   * Export results to various formats
   */
  async exportResults(format: string, outputPath: string): Promise<void> {
    switch (format) {
      case 'junit':
        await this.exportToJUnit(outputPath);
        break;
      case 'json':
        await this.exportToJson(outputPath);
        break;
      case 'html':
        await this.exportToHtml(outputPath);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to JUnit XML format
   */
  private async exportToJUnit(outputPath: string): Promise<void> {
    const summary = this.generateSummary();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="All Tests" tests="${summary.total}" failures="${summary.failed}" time="${summary.duration / 1000}">\n`;

    for (const result of this.results) {
      xml += `  <testcase name="${result.name}" classname="${result.suite}" time="${result.duration / 1000}">`;

      if (result.status === 'failed' && result.error) {
        xml += `\n    <failure message="${result.error.message}" type="${result.error.type}">`;
        if (result.error.stack) {
          xml += `\n${result.error.stack}\n    `;
        }
        xml += '</failure>\n  ';
      } else if (result.status === 'skipped') {
        xml += '\n    <skipped/>\n  ';
      }

      xml += '</testcase>\n';
    }

    xml += '</testsuite>';

    await fs.writeFile(outputPath, xml, 'utf8');
  }

  /**
   * Export to JSON format
   */
  private async exportToJson(outputPath: string): Promise<void> {
    const data = {
      summary: this.generateSummary(),
      results: this.results,
      exportedAt: new Date().toISOString(),
    };

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Export to HTML format
   */
  private async exportToHtml(outputPath: string): Promise<void> {
    const summary = this.generateSummary();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .error { background: #f8d7da; padding: 10px; margin: 5px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Test Results Summary</h1>
    
    <div class="summary">
        <h2>Overview</h2>
        <p><strong>Total Tests:</strong> ${summary.total}</p>
        <p><strong class="passed">Passed:</strong> ${summary.passed}</p>
        <p><strong class="failed">Failed:</strong> ${summary.failed}</p>
        <p><strong class="skipped">Skipped:</strong> ${summary.skipped}</p>
        <p><strong>Duration:</strong> ${(summary.duration / 1000).toFixed(2)}s</p>
        <p><strong>Success Rate:</strong> ${((summary.passed / summary.total) * 100).toFixed(1)}%</p>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Suite</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${this.results.map(result => `
                <tr>
                    <td>${result.name}</td>
                    <td>${result.suite}</td>
                    <td class="${result.status}">${result.status.toUpperCase()}</td>
                    <td>${result.duration}ms</td>
                    <td>${result.error ? `<div class="error">${result.error.message}</div>` : ''}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <p><em>Generated on ${new Date().toLocaleString()}</em></p>
</body>
</html>`;

    await fs.writeFile(outputPath, html, 'utf8');
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Get failed tests
   */
  getFailedTests(): TestResult[] {
    return this.results.filter(r => r.status === 'failed');
  }

  /**
   * Get test results by suite
   */
  getResultsBySuite(): Map<string, TestResult[]> {
    const suiteMap = new Map<string, TestResult[]>();

    for (const result of this.results) {
      if (!suiteMap.has(result.suite)) {
        suiteMap.set(result.suite, []);
      }
      suiteMap.get(result.suite)!.push(result);
    }

    return suiteMap;
  }

  /**
   * Calculate test trends
   */
  calculateTrends(previousResults: TestResult[]): TestTrends {
    const currentSummary = this.generateSummary();
    const previousSummary = this.calculateSummaryFromResults(previousResults);

    return {
      totalChange: currentSummary.total - previousSummary.total,
      passRateChange: (currentSummary.passed / currentSummary.total) -
                     (previousSummary.passed / previousSummary.total),
      durationChange: currentSummary.duration - previousSummary.duration,
      newFailures: this.findNewFailures(previousResults),
      fixedTests: this.findFixedTests(previousResults),
    };
  }

  /**
   * Find newly failing tests
   */
  private findNewFailures(previousResults: TestResult[]): string[] {
    const previousFailed = new Set(
      previousResults.filter(r => r.status === 'failed').map(r => r.name),
    );
    const currentFailed = new Set(
      this.results.filter(r => r.status === 'failed').map(r => r.name),
    );

    return Array.from(currentFailed).filter(name => !previousFailed.has(name));
  }

  /**
   * Find recently fixed tests
   */
  private findFixedTests(previousResults: TestResult[]): string[] {
    const previousFailed = new Set(
      previousResults.filter(r => r.status === 'failed').map(r => r.name),
    );
    const currentPassed = new Set(
      this.results.filter(r => r.status === 'passed').map(r => r.name),
    );

    return Array.from(currentPassed).filter(name => previousFailed.has(name));
  }

  /**
   * Calculate summary from results array
   */
  private calculateSummaryFromResults(results: TestResult[]): TestSummary {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    return { total, passed, failed, skipped, duration };
  }
}

export interface TestResultSource {
  path: string;
  format: 'junit' | 'json' | 'tap' | 'xunit' | 'jest';
  name?: string;
}

export interface TestTrends {
  totalChange: number;
  passRateChange: number;
  durationChange: number;
  newFailures: string[];
  fixedTests: string[];
}
