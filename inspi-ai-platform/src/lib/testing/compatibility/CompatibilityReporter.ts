/**
 * Compatibility Reporter
 * Generates comprehensive reports for cross-platform compatibility testing
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  CompatibilityReport, 
  CompatibilityTestResult, 
  SupportMatrix 
} from './types';

export class CompatibilityReporter {
  private outputDir: string;

  constructor(outputDir: string = './reports/compatibility') {
    this.outputDir = outputDir;
  }

  /**
   * Generate comprehensive compatibility report
   */
  async generateReport(
    report: CompatibilityReport,
    format: 'html' | 'json' | 'markdown' | 'all' = 'all'
  ): Promise<{
    html?: string;
    json?: string;
    markdown?: string;
  }> {
    await this.ensureOutputDirectory();

    const results: any = {};

    if (format === 'html' || format === 'all') {
      const htmlReport = this.generateHtmlReport(report);
      const htmlPath = path.join(this.outputDir, 'compatibility-report.html');
      await fs.writeFile(htmlPath, htmlReport, 'utf8');
      results.html = htmlPath;
    }

    if (format === 'json' || format === 'all') {
      const jsonReport = this.generateJsonReport(report);
      const jsonPath = path.join(this.outputDir, 'compatibility-report.json');
      await fs.writeFile(jsonPath, jsonReport, 'utf8');
      results.json = jsonPath;
    }

    if (format === 'markdown' || format === 'all') {
      const markdownReport = this.generateMarkdownReport(report);
      const markdownPath = path.join(this.outputDir, 'compatibility-report.md');
      await fs.writeFile(markdownPath, markdownReport, 'utf8');
      results.markdown = markdownPath;
    }

    return results;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: CompatibilityReport): string {
    const { summary, results, recommendations, supportMatrix } = report;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cross-Platform Compatibility Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .summary-card.success { border-left-color: #28a745; }
        .summary-card.danger { border-left-color: #dc3545; }
        .summary-card.warning { border-left-color: #ffc107; }
        .summary-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .results-table th,
        .results-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .results-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.875em;
            font-weight: 500;
        }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .recommendations {
            background: #e7f3ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .support-matrix {
            margin-top: 30px;
        }
        .matrix-section {
            margin-bottom: 30px;
        }
        .matrix-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .matrix-table th,
        .matrix-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .matrix-table th {
            background: #f8f9fa;
        }
        .supported { color: #28a745; font-weight: bold; }
        .not-supported { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Cross-Platform Compatibility Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <div class="summary-number">${summary.totalEnvironments}</div>
            <div>Total Environments</div>
        </div>
        <div class="summary-card success">
            <div class="summary-number">${summary.passedEnvironments}</div>
            <div>Passed</div>
        </div>
        <div class="summary-card danger">
            <div class="summary-number">${summary.failedEnvironments}</div>
            <div>Failed</div>
        </div>
        <div class="summary-card warning">
            <div class="summary-number">${summary.warningEnvironments}</div>
            <div>With Warnings</div>
        </div>
    </div>

    <h2>Test Results</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Environment</th>
                <th>Status</th>
                <th>Duration (ms)</th>
                <th>Errors</th>
                <th>Warnings</th>
                <th>Platform</th>
                <th>Node Version</th>
            </tr>
        </thead>
        <tbody>
            ${results.map(result => `
                <tr>
                    <td>${result.testSuite}</td>
                    <td>
                        <span class="status-badge ${result.passed ? 'status-passed' : 'status-failed'}">
                            ${result.passed ? 'PASSED' : 'FAILED'}
                        </span>
                    </td>
                    <td>${result.duration.toLocaleString()}</td>
                    <td>${result.errors.length}</td>
                    <td>${result.warnings.length}</td>
                    <td>${result.environment.platform}</td>
                    <td>${result.environment.nodeVersion}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="support-matrix">
        <h2>Platform Support Matrix</h2>
        
        <div class="matrix-section">
            <h3>Operating Systems</h3>
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th>Platform</th>
                        <th>Supported</th>
                        <th>Min Node Version</th>
                        <th>Limitations</th>
                    </tr>
                </thead>
                <tbody>
                    ${supportMatrix.platforms.map(platform => `
                        <tr>
                            <td>${platform.platform}</td>
                            <td class="${platform.supported ? 'supported' : 'not-supported'}">
                                ${platform.supported ? '✅ Yes' : '❌ No'}
                            </td>
                            <td>${platform.minNodeVersion || 'N/A'}</td>
                            <td>${platform.limitations?.join(', ') || 'None'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="matrix-section">
            <h3>Node.js Versions</h3>
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th>Version</th>
                        <th>Supported</th>
                        <th>Tested</th>
                        <th>Issues</th>
                    </tr>
                </thead>
                <tbody>
                    ${supportMatrix.nodeVersions.map(node => `
                        <tr>
                            <td>${node.version}</td>
                            <td class="${node.supported ? 'supported' : 'not-supported'}">
                                ${node.supported ? '✅ Yes' : '❌ No'}
                            </td>
                            <td>${node.tested ? '✅' : '❌'}</td>
                            <td>${node.issues?.join(', ') || 'None'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(report: CompatibilityReport): string {
    return JSON.stringify({
      ...report,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: CompatibilityReport): string {
    const { summary, results, recommendations, supportMatrix } = report;

    return `# Cross-Platform Compatibility Report

Generated on: ${new Date().toLocaleString()}

## Summary

| Metric | Count |
|--------|-------|
| Total Environments | ${summary.totalEnvironments} |
| Passed | ${summary.passedEnvironments} |
| Failed | ${summary.failedEnvironments} |
| With Warnings | ${summary.warningEnvironments} |

## Test Results

| Environment | Status | Duration (ms) | Errors | Warnings | Platform | Node Version |
|-------------|--------|---------------|--------|----------|----------|--------------|
${results.map(result => 
  `| ${result.testSuite} | ${result.passed ? '✅ PASSED' : '❌ FAILED'} | ${result.duration.toLocaleString()} | ${result.errors.length} | ${result.warnings.length} | ${result.environment.platform} | ${result.environment.nodeVersion} |`
).join('\n')}

## Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

## Platform Support Matrix

### Operating Systems

| Platform | Supported | Min Node Version | Limitations |
|----------|-----------|------------------|-------------|
${supportMatrix.platforms.map(platform => 
  `| ${platform.platform} | ${platform.supported ? '✅ Yes' : '❌ No'} | ${platform.minNodeVersion || 'N/A'} | ${platform.limitations?.join(', ') || 'None'} |`
).join('\n')}

### Node.js Versions

| Version | Supported | Tested | Issues |
|---------|-----------|--------|--------|
${supportMatrix.nodeVersions.map(node => 
  `| ${node.version} | ${node.supported ? '✅ Yes' : '❌ No'} | ${node.tested ? '✅' : '❌'} | ${node.issues?.join(', ') || 'None'} |`
).join('\n')}

### Browser Support

| Browser | Versions | Supported | Polyfills Required |
|---------|----------|-----------|-------------------|
${supportMatrix.browsers.map(browser => 
  `| ${browser.browser} | ${browser.versions.join(', ')} | ${browser.supported ? '✅ Yes' : '❌ No'} | ${browser.polyfillsRequired?.join(', ') || 'None'} |`
).join('\n')}

### Container Support

| Runtime | Base Images | Supported | Recommendations |
|---------|-------------|-----------|-----------------|
${supportMatrix.containers.map(container => 
  `| ${container.runtime} | ${container.baseImages.join(', ')} | ${container.supported ? '✅ Yes' : '❌ No'} | ${container.recommendations?.join(', ') || 'None'} |`
).join('\n')}

## Detailed Results

${results.map(result => `
### ${result.testSuite}

- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${result.duration}ms
- **Platform**: ${result.environment.platform}
- **Node Version**: ${result.environment.nodeVersion}
- **Architecture**: ${result.environment.arch}

${result.errors.length > 0 ? `
#### Errors
${result.errors.map(error => `- **${error.type}**: ${error.message}`).join('\n')}
` : ''}

${result.warnings.length > 0 ? `
#### Warnings
${result.warnings.map(warning => `- **${warning.type}**: ${warning.message}`).join('\n')}
` : ''}

#### Performance
- **Execution Time**: ${result.performance.executionTime}ms
- **Memory Usage**: Peak ${Math.round(result.performance.memoryUsage.peak / 1024 / 1024)}MB, Average ${Math.round(result.performance.memoryUsage.average / 1024 / 1024)}MB

---
`).join('')}

## Report Metadata

- **Generated At**: ${new Date().toISOString()}
- **Report Version**: 1.0.0
- **Total Test Duration**: ${results.reduce((sum, r) => sum + r.duration, 0)}ms
`;
  }

  /**
   * Generate summary report for CI/CD
   */
  async generateCISummary(report: CompatibilityReport): Promise<string> {
    const { summary, results } = report;
    const failedResults = results.filter(r => !r.passed);

    let output = `## 🔄 Cross-Platform Compatibility Test Results\n\n`;
    
    if (summary.failedEnvironments === 0) {
      output += `✅ **All ${summary.totalEnvironments} environments passed!**\n\n`;
    } else {
      output += `❌ **${summary.failedEnvironments} of ${summary.totalEnvironments} environments failed**\n\n`;
      
      output += `### Failed Environments\n\n`;
      for (const result of failedResults) {
        output += `- **${result.testSuite}**: ${result.errors.map(e => e.message).join(', ')}\n`;
      }
      output += `\n`;
    }

    if (summary.warningEnvironments > 0) {
      output += `⚠️ **${summary.warningEnvironments} environments have warnings**\n\n`;
    }

    output += `### Summary\n\n`;
    output += `| Status | Count |\n`;
    output += `|--------|-------|\n`;
    output += `| ✅ Passed | ${summary.passedEnvironments} |\n`;
    output += `| ❌ Failed | ${summary.failedEnvironments} |\n`;
    output += `| ⚠️ Warnings | ${summary.warningEnvironments} |\n`;

    const summaryPath = path.join(this.outputDir, 'ci-summary.md');
    await this.ensureOutputDirectory();
    await fs.writeFile(summaryPath, output, 'utf8');

    return summaryPath;
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }
}