/**
 * Compliance Utilities
 *
 * Helper functions and utilities for compliance checking,
 * validation, and reporting.
 */

import * as fs from 'fs';
import * as path from 'path';

import { ComplianceResult, ComplianceViolation, ComplianceRecommendation } from './ComplianceChecker';

export class ComplianceUtils {
  /**
   * Validate compliance configuration
   */
  static validateConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!config.outputPath) {
      errors.push('outputPath is required');
    }

    if (!config.reportFormats || !Array.isArray(config.reportFormats)) {
      errors.push('reportFormats must be an array');
    }

    // Validate thresholds
    if (config.testCoverage?.enabled) {
      const thresholds = config.testCoverage.thresholds;
      if (thresholds) {
        Object.entries(thresholds).forEach(([key, value]) => {
          if (typeof value !== 'number' || value < 0 || value > 100) {
            errors.push(`testCoverage.thresholds.${key} must be a number between 0 and 100`);
          }
        });
      }
    }

    // Validate performance budgets
    if (config.performance?.enabled) {
      const budgets = config.performance.budgets;
      if (budgets) {
        if (budgets.bundleSize && (typeof budgets.bundleSize !== 'number' || budgets.bundleSize <= 0)) {
          errors.push('performance.budgets.bundleSize must be a positive number');
        }
        if (budgets.loadTime && (typeof budgets.loadTime !== 'number' || budgets.loadTime <= 0)) {
          errors.push('performance.budgets.loadTime must be a positive number');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Merge compliance configurations
   */
  static mergeConfigs(base: any, override: any): any {
    const merged = { ...base };

    Object.keys(override).forEach(key => {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        merged[key] = this.mergeConfigs(merged[key] || {}, override[key]);
      } else {
        merged[key] = override[key];
      }
    });

    return merged;
  }

  /**
   * Calculate compliance score
   */
  static calculateScore(violations: ComplianceViolation[]): number {
    if (violations.length === 0) return 100;

    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };

    const totalWeight = violations.reduce((sum, violation) => {
      return sum + weights[violation.severity];
    }, 0);

    // Score decreases based on weighted violations
    const maxPossibleWeight = violations.length * weights.critical;
    const score = Math.max(0, 100 - (totalWeight / maxPossibleWeight) * 100);

    return Math.round(score);
  }

  /**
   * Categorize violations by severity
   */
  static categorizeViolations(violations: ComplianceViolation[]): {
    critical: ComplianceViolation[];
    high: ComplianceViolation[];
    medium: ComplianceViolation[];
    low: ComplianceViolation[];
  } {
    return {
      critical: violations.filter(v => v.severity === 'critical'),
      high: violations.filter(v => v.severity === 'high'),
      medium: violations.filter(v => v.severity === 'medium'),
      low: violations.filter(v => v.severity === 'low'),
    };
  }

  /**
   * Generate compliance summary
   */
  static generateSummary(result: ComplianceResult): ComplianceSummary {
    const violations = this.categorizeViolations(result.violations);
    const enabledCategories = Object.values(result.categories).filter(c => c.enabled);

    return {
      overallScore: result.overall.score,
      overallGrade: result.overall.grade,
      overallStatus: result.overall.passed ? 'PASSED' : 'FAILED',
      totalViolations: result.violations.length,
      violationsBySeverity: {
        critical: violations.critical.length,
        high: violations.high.length,
        medium: violations.medium.length,
        low: violations.low.length,
      },
      categoriesEnabled: enabledCategories.length,
      categoriesPassed: enabledCategories.filter(c => c.passed).length,
      recommendationsCount: result.recommendations.length,
      topIssues: this.getTopIssues(result.violations),
      improvementAreas: this.getImprovementAreas(result.categories),
    };
  }

  /**
   * Get top issues by severity and frequency
   */
  static getTopIssues(violations: ComplianceViolation[], limit: number = 5): TopIssue[] {
    const issueMap = new Map<string, { count: number; severity: string; example: ComplianceViolation }>();

    violations.forEach(violation => {
      const key = `${violation.category}:${violation.rule}`;
      if (issueMap.has(key)) {
        issueMap.get(key)!.count++;
      } else {
        issueMap.set(key, {
          count: 1,
          severity: violation.severity,
          example: violation,
        });
      }
    });

    return Array.from(issueMap.entries())
      .map(([key, data]) => ({
        rule: data.example.rule,
        category: data.example.category,
        severity: data.severity,
        count: data.count,
        message: data.example.message,
        suggestion: data.example.suggestion,
      }))
      .sort((a, b) => {
        // Sort by severity first, then by count
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity as keyof typeof severityOrder] -
                           severityOrder[a.severity as keyof typeof severityOrder];
        return severityDiff !== 0 ? severityDiff : b.count - a.count;
      })
      .slice(0, limit);
  }

  /**
   * Get improvement areas
   */
  static getImprovementAreas(categories: ComplianceResult['categories']): ImprovementArea[] {
    return Object.entries(categories)
      .filter(([, category]) => category.enabled && !category.passed)
      .map(([name, category]) => ({
        category: name,
        score: category.score,
        failedChecks: category.details.filter(d => !d.passed).length,
        totalChecks: category.details.length,
        priority: this.calculatePriority(category.score, category.details.filter(d => !d.passed).length),
      }))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] -
               priorityOrder[a.priority as keyof typeof priorityOrder];
      });
  }

  /**
   * Calculate improvement priority
   */
  private static calculatePriority(score: number, failedChecks: number): 'high' | 'medium' | 'low' {
    if (score < 50 || failedChecks > 5) return 'high';
    if (score < 75 || failedChecks > 2) return 'medium';
    return 'low';
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format duration
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Generate compliance badge
   */
  static generateBadge(result: ComplianceResult): ComplianceBadge {
    const gradeColors = {
      A: '#4c1',
      B: '#97ca00',
      C: '#dfb317',
      D: '#fe7d37',
      F: '#e05d44',
    };

    return {
      label: 'compliance',
      message: `${result.overall.score}% (${result.overall.grade})`,
      color: gradeColors[result.overall.grade],
      status: result.overall.passed ? 'passing' : 'failing',
    };
  }

  /**
   * Export compliance data
   */
  static exportData(result: ComplianceResult, format: 'csv' | 'json' | 'xml'): string {
    switch (format) {
      case 'csv':
        return this.exportToCsv(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'xml':
        return this.exportToXml(result);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV
   */
  private static exportToCsv(result: ComplianceResult): string {
    const headers = ['Category', 'Check', 'Status', 'Value', 'Threshold', 'Message'];
    const rows = [headers];

    Object.entries(result.categories).forEach(([categoryName, category]) => {
      if (!category.enabled) return;

      category.details.forEach(detail => {
        rows.push([
          categoryName,
          detail.check,
          detail.passed ? 'PASSED' : 'FAILED',
          detail.value.toString(),
          detail.threshold.toString(),
          `"${detail.message.replace(/"/g, '""')}"`,
        ]);
      });
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Export to XML
   */
  private static exportToXml(result: ComplianceResult): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<compliance-data>
    <timestamp>${result.timestamp.toISOString()}</timestamp>
    <overall>
        <score>${result.overall.score}</score>
        <grade>${result.overall.grade}</grade>
        <passed>${result.overall.passed}</passed>
    </overall>
    <violations count="${result.violations.length}">
        ${result.violations.map(v => `
        <violation>
            <category>${this.escapeXml(v.category)}</category>
            <severity>${v.severity}</severity>
            <rule>${this.escapeXml(v.rule)}</rule>
            <message>${this.escapeXml(v.message)}</message>
        </violation>
        `).join('')}
    </violations>
</compliance-data>`;
  }

  /**
   * Escape XML characters
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Validate file paths
   */
  static validatePaths(paths: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    paths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          valid.push(filePath);
        } else {
          invalid.push(filePath);
        }
      } catch {
        invalid.push(filePath);
      }
    });

    return { valid, invalid };
  }

  /**
   * Create directory if it doesn't exist
   */
  static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get file extension
   */
  static getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  /**
   * Check if file is a test file
   */
  static isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|js|tsx|jsx)$/,
      /\.spec\.(ts|js|tsx|jsx)$/,
      /__tests__\//,
      /\.stories\.(ts|js|tsx|jsx)$/,
    ];

    return testPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Get relative path from project root
   */
  static getRelativePath(filePath: string, projectRoot: string = process.cwd()): string {
    return path.relative(projectRoot, filePath);
  }

  /**
   * Parse package.json
   */
  static parsePackageJson(projectRoot: string = process.cwd()): any {
    try {
      const packagePath = path.join(projectRoot, 'package.json');
      const content = fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get project dependencies
   */
  static getProjectDependencies(projectRoot: string = process.cwd()): {
    dependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
  } {
    const packageJson = this.parsePackageJson(projectRoot);

    return {
      dependencies: packageJson?.dependencies ? Object.keys(packageJson.dependencies) : [],
      devDependencies: packageJson?.devDependencies ? Object.keys(packageJson.devDependencies) : [],
      peerDependencies: packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies) : [],
    };
  }

  /**
   * Check if running in CI environment
   */
  static isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.JENKINS_URL
    );
  }

  /**
   * Get CI environment info
   */
  static getCIInfo(): CIInfo {
    return {
      isCI: this.isCI(),
      provider: this.getCIProvider(),
      buildNumber: process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'unknown',
      branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'unknown',
      commit: process.env.GIT_COMMIT || process.env.GITHUB_SHA || 'unknown',
    };
  }

  /**
   * Get CI provider
   */
  private static getCIProvider(): string {
    if (process.env.GITHUB_ACTIONS) return 'github';
    if (process.env.GITLAB_CI) return 'gitlab';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.AZURE_HTTP_USER_AGENT) return 'azure';
    if (process.env.CIRCLECI) return 'circle';
    if (process.env.TRAVIS) return 'travis';
    return 'unknown';
  }
}

// Type definitions for utility functions
export interface ComplianceSummary {
  overallScore: number;
  overallGrade: string;
  overallStatus: string;
  totalViolations: number;
  violationsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoriesEnabled: number;
  categoriesPassed: number;
  recommendationsCount: number;
  topIssues: TopIssue[];
  improvementAreas: ImprovementArea[];
}

export interface TopIssue {
  rule: string;
  category: string;
  severity: string;
  count: number;
  message: string;
  suggestion: string;
}

export interface ImprovementArea {
  category: string;
  score: number;
  failedChecks: number;
  totalChecks: number;
  priority: 'high' | 'medium' | 'low';
}

export interface ComplianceBadge {
  label: string;
  message: string;
  color: string;
  status: 'passing' | 'failing';
}

export interface CIInfo {
  isCI: boolean;
  provider: string;
  buildNumber: string;
  branch: string;
  commit: string;
}
