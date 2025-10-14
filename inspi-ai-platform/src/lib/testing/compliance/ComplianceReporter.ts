/**
 * Compliance Reporter
 *
 * Generates comprehensive compliance reports in multiple formats
 * and provides automated compliance monitoring and alerting.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

import { ComplianceResult, ComplianceConfig } from './ComplianceChecker';

export interface ReportConfig {
  outputDir: string;
  formats: ReportFormat[];
  templates: ReportTemplate[];
  scheduling: ReportScheduling;
  notifications: NotificationConfig;
  retention: RetentionConfig;
}

export interface ReportFormat {
  type: 'json' | 'html' | 'markdown' | 'xml' | 'pdf' | 'csv';
  enabled: boolean;
  template?: string;
  options?: Record<string, any>;
}

export interface ReportTemplate {
  name: string;
  type: 'html' | 'markdown';
  content: string;
  variables: string[];
}

export interface ReportScheduling {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  timezone: string;
  autoGenerate: boolean;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  triggers: NotificationTrigger[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'file';
  config: Record<string, any>;
  enabled: boolean;
}

export interface NotificationTrigger {
  condition: 'score_below' | 'grade_below' | 'violations_above' | 'category_failed';
  threshold: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetentionConfig {
  maxReports: number;
  maxAge: number; // days
  archiveOldReports: boolean;
  archivePath?: string;
}

export class ComplianceReporter extends EventEmitter {
  private config: ReportConfig;
  private reportHistory: ReportMetadata[] = [];

  constructor(config: ReportConfig) {
    super();
    this.config = config;
    this.loadReportHistory();
  }

  /**
   * Generate compliance report in multiple formats
   */
  async generateReport(
    result: ComplianceResult,
    options: {
      customTemplate?: string;
      includeHistory?: boolean;
      compareWith?: ComplianceResult;
    } = {},
  ): Promise<GeneratedReport[]> {
    this.emit('reportGenerationStarted');

    const reports: GeneratedReport[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const format of this.config.formats) {
      if (!format.enabled) continue;

      try {
        const reportPath = await this.generateFormatReport(
          result,
          format,
          timestamp,
          options,
        );

        reports.push({
          format: format.type,
          path: reportPath,
          size: this.getFileSize(reportPath),
          generated: new Date(),
        });

        this.emit('formatReportGenerated', format.type, reportPath);
      } catch (error) {
        this.emit('formatReportError', format.type, error);
      }
    }

    // Save report metadata
    const metadata: ReportMetadata = {
      id: this.generateReportId(),
      timestamp: new Date(),
      result,
      reports,
      options,
    };

    this.reportHistory.push(metadata);
    await this.saveReportHistory();

    // Check notification triggers
    await this.checkNotificationTriggers(result);

    // Clean up old reports
    await this.cleanupOldReports();

    this.emit('reportGenerationCompleted', reports);
    return reports;
  }
 /**
   * Generate report for specific format
   */
  private async generateFormatReport(
    result: ComplianceResult,
    format: ReportFormat,
    timestamp: string,
    options: any,
  ): Promise<string> {
    const filename = `compliance-report-${timestamp}.${format.type}`;
    const filepath = path.join(this.config.outputDir, filename);

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    let content: string;

    switch (format.type) {
      case 'json':
        content = this.generateJsonReport(result, options);
        break;
      case 'html':
        content = await this.generateHtmlReport(result, format, options);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(result, options);
        break;
      case 'xml':
        content = this.generateXmlReport(result, options);
        break;
      case 'csv':
        content = this.generateCsvReport(result, options);
        break;
      case 'pdf':
        return await this.generatePdfReport(result, format, filepath, options);
      default:
        throw new Error(`Unsupported report format: ${format.type}`);
    }

    fs.writeFileSync(filepath, content, 'utf8');
    return filepath;
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(result: ComplianceResult, options: any): string {
    const reportData = {
      ...result,
      metadata: {
        generatedAt: new Date().toISOString(),
        generator: 'ComplianceReporter',
        version: '1.0.0',
        options,
      },
    };

    if (options.includeHistory) {
      reportData.metadata.history = this.reportHistory.slice(-10);
    }

    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(
    result: ComplianceResult,
    format: ReportFormat,
    options: any,
  ): Promise<string> {
    let template = this.getDefaultHtmlTemplate();

    // Use custom template if specified
    if (format.template) {
      const customTemplate = this.config(templates.find as any)(t => t.name === format.template);
      if (customTemplate) {
        template = customTemplate.content;
      }
    }

    // Replace template variables
    const variables = {
      timestamp: result.timestamp.toLocaleString(),
      overallScore: result.overall.score,
      overallGrade: result.overall.grade,
      overallStatus: result.overall.passed ? '✅ PASSED' : '❌ FAILED',
      categoriesHtml: this.generateCategoriesHtml(result.categories),
      violationsHtml: this.generateViolationsHtml(result.violations),
      recommendationsHtml: this.generateRecommendationsHtml(result.recommendations),
      trendsHtml: options.includeHistory ? this.generateTrendsHtml() : '',
      comparisonHtml: options.compareWith ? this.generateComparisonHtml(result, options.compareWith) : '',
    };

    return this.replaceTemplateVariables(template, variables);
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(result: ComplianceResult, options: any): string {
    let content = `# Compliance Report

**Generated:** ${result.timestamp.toLocaleString()}
**Overall Score:** ${result.overall.score}% (Grade ${result.overall.grade})
**Status:** ${result.overall.passed ? '✅ PASSED' : '❌ FAILED'}

## Executive Summary

This compliance report provides a comprehensive analysis of code quality, test coverage, documentation, security, accessibility, and performance standards.

`;

    // Add categories section
    content += this.generateMarkdownCategories(result.categories);

    // Add violations section
    if (result.violations.length > 0) {
      content += this.generateMarkdownViolations(result.violations);
    }

    // Add recommendations section
    if (result.recommendations.length > 0) {
      content += this.generateMarkdownRecommendations(result.recommendations);
    }

    // Add trends section if history is included
    if (options.includeHistory) {
      content += this.generateMarkdownTrends();
    }

    // Add comparison section if provided
    if (options.compareWith) {
      content += this.generateMarkdownComparison(result, options.compareWith);
    }

    return content;
  }

  /**
   * Generate XML report
   */
  private generateXmlReport(result: ComplianceResult, options: any): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<compliance-report>
    <metadata>
        <generated>${new Date().toISOString()}</generated>
        <generator>ComplianceReporter</generator>
        <version>1.0.0</version>
    </metadata>
    <timestamp>${result.timestamp.toISOString()}</timestamp>
    <overall>
        <passed>${result.overall.passed}</passed>
        <score>${result.overall.score}</score>
        <grade>${result.overall.grade}</grade>
    </overall>
    <categories>
        ${Object.entries(result.categories).map(([name, category]) => `
        <category name="${name}">
            <enabled>${category.enabled}</enabled>
            <passed>${category.passed}</passed>
            <score>${category.score}</score>
            <details>
                ${category.details.map(detail => `
                <detail>
                    <check>${this.escapeXml(detail.check)}</check>
                    <passed>${detail.passed}</passed>
                    <value>${detail.value}</value>
                    <threshold>${detail.threshold}</threshold>
                    <message>${this.escapeXml(detail.message)}</message>
                </detail>
                `).join('')}
            </details>
            <metrics>
                ${Object.entries(category.metrics).map(([key, value]) => `
                <metric name="${key}">${value}</metric>
                `).join('')}
            </metrics>
        </category>
        `).join('')}
    </categories>
    <violations>
        ${result.violations.map(violation => `
        <violation>
            <category>${violation.category}</category>
            <severity>${violation.severity}</severity>
            <rule>${this.escapeXml(violation.rule)}</rule>
            <message>${this.escapeXml(violation.message)}</message>
            <suggestion>${this.escapeXml(violation.suggestion)}</suggestion>
            <autoFixable>${violation.autoFixable}</autoFixable>
            ${violation.file ? `<file>${this.escapeXml(violation.file)}</file>` : ''}
            ${violation.line ? `<line>${violation.line}</line>` : ''}
        </violation>
        `).join('')}
    </violations>
    <recommendations>
        ${result.recommendations.map(rec => `
        <recommendation>
            <category>${rec.category}</category>
            <priority>${rec.priority}</priority>
            <title>${this.escapeXml(rec.title)}</title>
            <description>${this.escapeXml(rec.description)}</description>
            <action>${this.escapeXml(rec.action)}</action>
            <estimatedEffort>${this.escapeXml(rec.estimatedEffort)}</estimatedEffort>
            <impact>${this.escapeXml(rec.impact)}</impact>
        </recommendation>
        `).join('')}
    </recommendations>
</compliance-report>`;
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(result: ComplianceResult, options: any): string {
    const headers = [
      'Category',
      'Check',
      'Status',
      'Score',
      'Value',
      'Threshold',
      'Message',
    ];

    const rows: string[][] = [headers];

    Object.entries(result.categories).forEach(([categoryName, category]) => {
      if (!category.enabled) return;

      category.details.forEach(detail => {
        rows.push([
          categoryName,
          detail.check,
          detail.passed ? 'PASSED' : 'FAILED',
          category.score.toString(),
          detail.value.toString(),
          detail.threshold.toString(),
          `"${detail.message.replace(/"/g, '""')}"`,
        ]);
      });
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Generate PDF report (placeholder - would use actual PDF library)
   */
  private async generatePdfReport(
    result: ComplianceResult,
    format: ReportFormat,
    filepath: string,
    options: any,
  ): Promise<string> {
    // This would use a PDF generation library like puppeteer or jsPDF
    // For now, generate HTML and save as .html file
    const htmlContent = await this.generateHtmlReport(result, format, options);
    const htmlPath = filepath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    // In a real implementation, convert HTML to PDF here
    return htmlPath;
  }

  /**
   * Helper methods for HTML generation
   */
  private getDefaultHtmlTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Compliance Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; }
        .score { font-size: 3em; font-weight: bold; margin: 10px 0; }
        .grade-A { color: #28a745; }
        .grade-B { color: #17a2b8; }
        .grade-C { color: #ffc107; }
        .grade-D { color: #fd7e14; }
        .grade-F { color: #dc3545; }
        .category { margin: 20px 0; padding: 20px; border-radius: 8px; border-left: 5px solid #ddd; }
        .category.passed { background: #d4edda; border-left-color: #28a745; }
        .category.failed { background: #f8d7da; border-left-color: #dc3545; }
        .category.disabled { background: #e2e3e5; border-left-color: #6c757d; }
        .category h3 { margin-top: 0; }
        .details { margin: 15px 0; }
        .detail { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail:last-child { border-bottom: none; }
        .violation { margin: 15px 0; padding: 15px; border-left: 4px solid #dc3545; background: #fff5f5; border-radius: 4px; }
        .violation.critical { border-left-color: #721c24; background: #f8d7da; }
        .violation.high { border-left-color: #dc3545; }
        .violation.medium { border-left-color: #fd7e14; }
        .violation.low { border-left-color: #ffc107; }
        .recommendation { margin: 15px 0; padding: 15px; border-left: 4px solid #17a2b8; background: #f0f9ff; border-radius: 4px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 1.5em; font-weight: bold; color: #495057; }
        .metric-label { font-size: 0.9em; color: #6c757d; margin-top: 5px; }
        .trends { margin: 30px 0; }
        .comparison { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Compliance Report</h1>
            <p>Generated: {{timestamp}}</p>
            <div class="score grade-{{overallGrade}}">{{overallScore}}%</div>
            <p>Grade {{overallGrade}} - {{overallStatus}}</p>
        </div>

        <h2>Categories</h2>
        {{categoriesHtml}}

        {{violationsHtml}}

        {{recommendationsHtml}}

        {{trendsHtml}}

        {{comparisonHtml}}
    </div>
</body>
</html>`;
  }

  private generateCategoriesHtml(categories: ComplianceResult['categories']): string {
    return Object.entries(categories).map(([name, category]) => {
      const statusClass = category.enabled ? (category.passed ? 'passed' : 'failed') : 'disabled';

      return `
        <div class="category ${statusClass}">
            <h3>${this.capitalizeFirst(name)}</h3>
            ${category.enabled ? `
                <div class="metrics">
                    <div class="metric">
                        <div class="metric-value">${category.score}%</div>
                        <div class="metric-label">Score</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${category.passed ? '✅' : '❌'}</div>
                        <div class="metric-label">Status</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${category.details.filter(d => d.passed).length}/${category.details.length}</div>
                        <div class="metric-label">Checks Passed</div>
                    </div>
                </div>
                <div class="details">
                    ${category.details.map(detail => `
                        <div class="detail">
                            <strong>${detail.check}:</strong> 
                            ${detail.passed ? '✅' : '❌'} 
                            ${detail.message}
                            ${!detail.passed ? ` (${detail.value}/${detail.threshold})` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p>This category is disabled</p>'}
        </div>
      `;
    }).join('');
  }

  private generateViolationsHtml(violations: ComplianceResult['violations']): string {
    if (violations.length === 0) return '';

    return `
        <h2>Violations (${violations.length})</h2>
        ${violations.map(violation => `
            <div class="violation ${violation.severity}">
                <h4>${violation.severity.toUpperCase()} - ${violation.rule}</h4>
                <p><strong>Category:</strong> ${violation.category}</p>
                <p>${violation.message}</p>
                <p><strong>Suggestion:</strong> ${violation.suggestion}</p>
                ${violation.autoFixable ? '<p><em>✨ This issue can be automatically fixed</em></p>' : ''}
                ${violation.file ? `<p><strong>File:</strong> ${violation.file}${violation.line ? `:${violation.line}` : ''}</p>` : ''}
            </div>
        `).join('')}
    `;
  }

  private generateRecommendationsHtml(recommendations: ComplianceResult['recommendations']): string {
    if (recommendations.length === 0) return '';

    return `
        <h2>Recommendations (${recommendations.length})</h2>
        ${recommendations.map(rec => `
            <div class="recommendation">
                <h4>${rec.priority.toUpperCase()} - ${rec.title}</h4>
                <p>${rec.description}</p>
                <p><strong>Action:</strong> ${rec.action}</p>
                <p><strong>Estimated Effort:</strong> ${rec.estimatedEffort}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
            </div>
        `).join('')}
    `;
  }

  private generateTrendsHtml(): string {
    if (this.reportHistory.length < 2) return '';

    return `
        <div class="trends">
            <h2>Trends</h2>
            <p>Historical compliance data shows trends over time.</p>
            <!-- Trend charts would be generated here -->
        </div>
    `;
  }

  private generateComparisonHtml(current: ComplianceResult, previous: ComplianceResult): string {
    const scoreDiff = current.overall.score - previous.overall.score;
    const diffClass = scoreDiff > 0 ? 'improvement' : scoreDiff < 0 ? 'regression' : 'unchanged';

    return `
        <div class="comparison">
            <h2>Comparison with Previous Report</h2>
            <p><strong>Score Change:</strong> 
                <span class="${diffClass}">
                    ${scoreDiff > 0 ? '+' : ''}${scoreDiff}% 
                    ${scoreDiff > 0 ? '📈' : scoreDiff < 0 ? '📉' : '➡️'}
                </span>
            </p>
            <!-- Detailed comparison would be generated here -->
        </div>
    `;
  }

  /**
   * Helper methods for Markdown generation
   */
  private generateMarkdownCategories(categories: ComplianceResult['categories']): string {
    return `## Categories

${Object.entries(categories).map(([name, category]) => `
### ${this.capitalizeFirst(name)}

${category.enabled ? `
- **Score:** ${category.score}%
- **Status:** ${category.passed ? '✅ PASSED' : '❌ FAILED'}
- **Checks:** ${category.details.filter(d => d.passed).length}/${category.details.length} passed

#### Details

${category.details.map(detail => `- **${detail.check}:** ${detail.passed ? '✅' : '❌'} ${detail.message}`).join('\n')}
` : '- **Status:** Disabled'}
`).join('')}`;
  }

  private generateMarkdownViolations(violations: ComplianceResult['violations']): string {
    return `
## Violations (${violations.length})

${violations.map(violation => `
### ${violation.severity.toUpperCase()} - ${violation.rule}

- **Category:** ${violation.category}
- **Message:** ${violation.message}
- **Suggestion:** ${violation.suggestion}
${violation.autoFixable ? '- **Auto-fixable:** ✨ Yes' : ''}
${violation.file ? `- **File:** ${violation.file}${violation.line ? `:${violation.line}` : ''}` : ''}
`).join('')}`;
  }

  private generateMarkdownRecommendations(recommendations: ComplianceResult['recommendations']): string {
    return `
## Recommendations (${recommendations.length})

${recommendations.map(rec => `
### ${rec.priority.toUpperCase()} - ${rec.title}

- **Description:** ${rec.description}
- **Action:** ${rec.action}
- **Estimated Effort:** ${rec.estimatedEffort}
- **Impact:** ${rec.impact}
`).join('')}`;
  }

  private generateMarkdownTrends(): string {
    return `
## Trends

Historical compliance data shows trends over time.

<!-- Trend analysis would be generated here -->
`;
  }

  private generateMarkdownComparison(current: ComplianceResult, previous: ComplianceResult): string {
    const scoreDiff = current.overall.score - previous.overall.score;

    return `
## Comparison with Previous Report

- **Score Change:** ${scoreDiff > 0 ? '+' : ''}${scoreDiff}% ${scoreDiff > 0 ? '📈' : scoreDiff < 0 ? '📉' : '➡️'}
- **Grade Change:** ${previous.overall.grade} → ${current.overall.grade}

<!-- Detailed comparison would be generated here -->
`;
  }

  /**
   * Utility methods
   */
  private replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getFileSize(filepath: string): number {
    try {
      return fs.statSync(filepath).size;
    } catch {
      return 0;
    }
  }

  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadReportHistory(): void {
    try {
      const historyPath = path.join(this.config.outputDir, 'report-history.json');
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        this.reportHistory = JSON.parse(data);
      }
    } catch (error) {
      this.reportHistory = [];
    }
  }

  private async saveReportHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.config.outputDir, 'report-history.json');
      fs.writeFileSync(historyPath, JSON.stringify(this.reportHistory, null, 2), 'utf8');
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async checkNotificationTriggers(result: ComplianceResult): Promise<void> {
    if (!this.config.notifications.enabled) return;

    for (const trigger of this.config.notifications.triggers) {
      if (this.shouldTriggerNotification(result, trigger)) {
        await this.sendNotifications(result, trigger);
      }
    }
  }

  private shouldTriggerNotification(result: ComplianceResult, trigger: NotificationTrigger): boolean {
    switch (trigger.condition) {
      case 'score_below':
        return result.overall.score < (trigger.threshold as number);
      case 'grade_below':
        const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
        const currentGrade = gradeOrder[result.overall.grade];
        const thresholdGrade = gradeOrder[trigger.threshold as keyof typeof gradeOrder];
        return currentGrade < thresholdGrade;
      case 'violations_above':
        return result.violations.length > (trigger.threshold as number);
      case 'category_failed':
        return Object.values(result.categories).some(cat => cat.enabled && !cat.passed);
      default:
        return false;
    }
  }

  private async sendNotifications(result: ComplianceResult, trigger: NotificationTrigger): Promise<void> {
    for (const channel of this.config.notifications.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendNotification(channel, result, trigger);
        this.emit('notificationSent', channel.type, trigger.condition);
      } catch (error) {
        this.emit('notificationError', channel.type, error);
      }
    }
  }

  private async sendNotification(
    channel: NotificationChannel,
    result: ComplianceResult,
    trigger: NotificationTrigger,
  ): Promise<void> {
    const message = this.createNotificationMessage(result, trigger);

    switch (channel.type) {
      case 'email':
        // Would integrate with email service
        break;
      case 'slack':
        // Would integrate with Slack API
        break;
      case 'webhook':
        // Would send HTTP POST to webhook URL
        break;
      case 'file':
        const notificationPath = path.join(this.config.outputDir, 'notifications.log');
        fs.appendFileSync(notificationPath, `${new Date().toISOString()}: ${message}\n`);
        break;
    }
  }

  private createNotificationMessage(result: ComplianceResult, trigger: NotificationTrigger): string {
    return `Compliance Alert: ${trigger.condition} triggered. Score: ${result.overall.score}%, Grade: ${result.overall.grade}, Violations: ${result.violations.length}`;
  }

  private async cleanupOldReports(): Promise<void> {
    if (!this.config.retention.maxReports && !this.config.retention.maxAge) return;

    try {
      // Remove old reports based on count
      if (this.config.retention.maxReports && this.reportHistory.length > this.config.retention.maxReports) {
        const toRemove = this.reportHistory.slice(0, this.reportHistory.length - this.config.retention.maxReports);
        for (const report of toRemove) {
          await this.removeReportFiles(report);
        }
        this.reportHistory = this.reportHistory.slice(-this.config.retention.maxReports);
      }

      // Remove old reports based on age
      if (this.config.retention.maxAge) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.maxAge);

        const toRemove = this.reportHistory.filter(report => report.timestamp < cutoffDate);
        for (const report of toRemove) {
          await this.removeReportFiles(report);
        }
        this.reportHistory = this.reportHistory.filter(report => report.timestamp >= cutoffDate);
      }

      await this.saveReportHistory();
    } catch (error) {
      this.emit('cleanupError', error);
    }
  }

  private async removeReportFiles(report: ReportMetadata): Promise<void> {
    for (const generatedReport of report.reports) {
      try {
        if (this.config.retention.archiveOldReports && this.config.retention.archivePath) {
          // Move to archive instead of deleting
          const archivePath = path.join(this.config.retention.archivePath, path.basename(generatedReport.path));
          fs.renameSync(generatedReport.path, archivePath);
        } else {
          fs.unlinkSync(generatedReport.path);
        }
      } catch (error) {
        // File might already be deleted, continue
      }
    }
  }
}

export interface ReportMetadata {
  id: string;
  timestamp: Date;
  result: ComplianceResult;
  reports: GeneratedReport[];
  options: any;
}

export interface GeneratedReport {
  format: string;
  path: string;
  size: number;
  generated: Date;
}

/**
 * Create compliance reporter instance
 */
export function createComplianceReporter(config: ReportConfig): ComplianceReporter {
  return new ComplianceReporter(config);
}
