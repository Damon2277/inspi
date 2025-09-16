/**
 * Compliance Checker
 * 
 * Comprehensive compliance checking system for code quality standards,
 * test coverage requirements, documentation completeness, and regulatory compliance.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface ComplianceConfig {
  codeQuality: CodeQualityConfig;
  testCoverage: TestCoverageConfig;
  documentation: DocumentationConfig;
  security: SecurityConfig;
  accessibility: AccessibilityConfig;
  performance: PerformanceConfig;
  outputPath: string;
  reportFormats: ('json' | 'html' | 'markdown' | 'xml')[];
}

export interface CodeQualityConfig {
  enabled: boolean;
  eslintConfigPath?: string;
  prettierConfigPath?: string;
  tsConfigPath?: string;
  sonarQubeConfig?: SonarQubeConfig;
  customRules: CustomRule[];
  thresholds: {
    complexity: number;
    maintainabilityIndex: number;
    duplicateLines: number;
    codeSmells: number;
  };
}

export interface TestCoverageConfig {
  enabled: boolean;
  thresholds: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  excludePatterns: string[];
  requireTestFiles: boolean;
  testFilePatterns: string[];
}

export interface DocumentationConfig {
  enabled: boolean;
  requiredFiles: string[];
  apiDocumentation: {
    required: boolean;
    format: 'jsdoc' | 'typedoc' | 'swagger';
    coverage: number;
  };
  readmeRequirements: {
    sections: string[];
    minimumLength: number;
  };
  changelogRequired: boolean;
}

export interface SecurityConfig {
  enabled: boolean;
  vulnerabilityScanning: boolean;
  dependencyAudit: boolean;
  secretsDetection: boolean;
  codeAnalysis: boolean;
  allowedLicenses: string[];
  securityHeaders: string[];
}

export interface AccessibilityConfig {
  enabled: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA';
  testPatterns: string[];
  requiredAttributes: string[];
  colorContrastRatio: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  budgets: {
    bundleSize: number;
    loadTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  metrics: string[];
}

export interface SonarQubeConfig {
  serverUrl: string;
  projectKey: string;
  token: string;
  qualityGate: string;
}

export interface CustomRule {
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'error' | 'warning' | 'info';
  message: string;
  autoFix?: boolean;
}

export interface ComplianceResult {
  timestamp: Date;
  overall: {
    passed: boolean;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  categories: {
    codeQuality: CategoryResult;
    testCoverage: CategoryResult;
    documentation: CategoryResult;
    security: CategoryResult;
    accessibility: CategoryResult;
    performance: CategoryResult;
  };
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
  trends: ComplianceTrend[];
}

export interface CategoryResult {
  enabled: boolean;
  passed: boolean;
  score: number;
  details: CategoryDetail[];
  metrics: Record<string, number>;
}

export interface CategoryDetail {
  check: string;
  passed: boolean;
  value: number;
  threshold: number;
  message: string;
}

export interface ComplianceViolation {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  suggestion: string;
  autoFixable: boolean;
}

export interface ComplianceRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  estimatedEffort: string;
  impact: string;
}

export interface ComplianceTrend {
  date: Date;
  score: number;
  violations: number;
  category: string;
}

export class ComplianceChecker extends EventEmitter {
  private config: ComplianceConfig;
  private results: ComplianceResult | null = null;

  constructor(config: ComplianceConfig) {
    super();
    this.config = config;
  }

  /**
   * Run comprehensive compliance check
   */
  async runComplianceCheck(): Promise<ComplianceResult> {
    this.emit('complianceStarted');

    const result: ComplianceResult = {
      timestamp: new Date(),
      overall: {
        passed: false,
        score: 0,
        grade: 'F'
      },
      categories: {
        codeQuality: await this.checkCodeQuality(),
        testCoverage: await this.checkTestCoverage(),
        documentation: await this.checkDocumentation(),
        security: await this.checkSecurity(),
        accessibility: await this.checkAccessibility(),
        performance: await this.checkPerformance()
      },
      violations: [],
      recommendations: [],
      trends: await this.loadComplianceTrends()
    };

    // Calculate overall score and grade
    result.overall = this.calculateOverallScore(result.categories);
    
    // Collect violations and recommendations
    result.violations = this.collectViolations(result.categories);
    result.recommendations = this.generateRecommendations(result.categories);

    this.results = result;
    this.emit('complianceCompleted', result);

    return result;
  }

  /**
   * Check code quality compliance
   */
  private async checkCodeQuality(): Promise<CategoryResult> {
    if (!this.config.codeQuality.enabled) {
      return this.createDisabledResult();
    }

    this.emit('categoryStarted', 'codeQuality');

    const details: CategoryDetail[] = [];
    const metrics: Record<string, number> = {};

    try {
      // ESLint compliance check
      if (this.config.codeQuality.eslintConfigPath) {
        const eslintResult = await this.runESLintCheck();
        details.push({
          check: 'ESLint Compliance',
          passed: eslintResult.errors === 0,
          value: eslintResult.errors,
          threshold: 0,
          message: `${eslintResult.errors} ESLint errors found`
        });
        metrics.eslintErrors = eslintResult.errors;
        metrics.eslintWarnings = eslintResult.warnings;
      }

      // Prettier compliance check
      if (this.config.codeQuality.prettierConfigPath) {
        const prettierResult = await this.runPrettierCheck();
        details.push({
          check: 'Code Formatting',
          passed: prettierResult.unformattedFiles === 0,
          value: prettierResult.unformattedFiles,
          threshold: 0,
          message: `${prettierResult.unformattedFiles} files need formatting`
        });
        metrics.unformattedFiles = prettierResult.unformattedFiles;
      }

      // TypeScript compliance check
      if (this.config.codeQuality.tsConfigPath) {
        const tsResult = await this.runTypeScriptCheck();
        details.push({
          check: 'TypeScript Compliance',
          passed: tsResult.errors === 0,
          value: tsResult.errors,
          threshold: 0,
          message: `${tsResult.errors} TypeScript errors found`
        });
        metrics.typeScriptErrors = tsResult.errors;
      }

      // Code complexity check
      const complexityResult = await this.checkCodeComplexity();
      details.push({
        check: 'Code Complexity',
        passed: complexityResult.averageComplexity <= this.config.codeQuality.thresholds.complexity,
        value: complexityResult.averageComplexity,
        threshold: this.config.codeQuality.thresholds.complexity,
        message: `Average complexity: ${complexityResult.averageComplexity}`
      });
      metrics.averageComplexity = complexityResult.averageComplexity;
      metrics.maxComplexity = complexityResult.maxComplexity;

      // Maintainability index check
      const maintainabilityResult = await this.checkMaintainabilityIndex();
      details.push({
        check: 'Maintainability Index',
        passed: maintainabilityResult.index >= this.config.codeQuality.thresholds.maintainabilityIndex,
        value: maintainabilityResult.index,
        threshold: this.config.codeQuality.thresholds.maintainabilityIndex,
        message: `Maintainability index: ${maintainabilityResult.index}`
      });
      metrics.maintainabilityIndex = maintainabilityResult.index;

      // Duplicate code check
      const duplicateResult = await this.checkDuplicateCode();
      details.push({
        check: 'Code Duplication',
        passed: duplicateResult.duplicateLines <= this.config.codeQuality.thresholds.duplicateLines,
        value: duplicateResult.duplicateLines,
        threshold: this.config.codeQuality.thresholds.duplicateLines,
        message: `${duplicateResult.duplicateLines} duplicate lines found`
      });
      metrics.duplicateLines = duplicateResult.duplicateLines;

      // Custom rules check
      const customRulesResult = await this.checkCustomRules();
      details.push({
        check: 'Custom Rules',
        passed: customRulesResult.violations === 0,
        value: customRulesResult.violations,
        threshold: 0,
        message: `${customRulesResult.violations} custom rule violations`
      });
      metrics.customRuleViolations = customRulesResult.violations;

    } catch (error) {
      this.emit('categoryError', 'codeQuality', error);
    }

    const passed = details.every(d => d.passed);
    const score = this.calculateCategoryScore(details);

    this.emit('categoryCompleted', 'codeQuality', { passed, score });

    return {
      enabled: true,
      passed,
      score,
      details,
      metrics
    };
  }

  /**
   * Check test coverage compliance
   */
  private async checkTestCoverage(): Promise<CategoryResult> {
    if (!this.config.testCoverage.enabled) {
      return this.createDisabledResult();
    }

    this.emit('categoryStarted', 'testCoverage');

    const details: CategoryDetail[] = [];
    const metrics: Record<string, number> = {};

    try {
      // Load coverage report
      const coverageData = await this.loadCoverageReport();
      
      if (coverageData) {
        // Statement coverage check
        details.push({
          check: 'Statement Coverage',
          passed: coverageData.statements >= this.config.testCoverage.thresholds.statements,
          value: coverageData.statements,
          threshold: this.config.testCoverage.thresholds.statements,
          message: `Statement coverage: ${coverageData.statements}%`
        });
        metrics.statementCoverage = coverageData.statements;

        // Branch coverage check
        details.push({
          check: 'Branch Coverage',
          passed: coverageData.branches >= this.config.testCoverage.thresholds.branches,
          value: coverageData.branches,
          threshold: this.config.testCoverage.thresholds.branches,
          message: `Branch coverage: ${coverageData.branches}%`
        });
        metrics.branchCoverage = coverageData.branches;

        // Function coverage check
        details.push({
          check: 'Function Coverage',
          passed: coverageData.functions >= this.config.testCoverage.thresholds.functions,
          value: coverageData.functions,
          threshold: this.config.testCoverage.thresholds.functions,
          message: `Function coverage: ${coverageData.functions}%`
        });
        metrics.functionCoverage = coverageData.functions;

        // Line coverage check
        details.push({
          check: 'Line Coverage',
          passed: coverageData.lines >= this.config.testCoverage.thresholds.lines,
          value: coverageData.lines,
          threshold: this.config.testCoverage.thresholds.lines,
          message: `Line coverage: ${coverageData.lines}%`
        });
        metrics.lineCoverage = coverageData.lines;
      }

      // Test file existence check
      if (this.config.testCoverage.requireTestFiles) {
        const testFileResult = await this.checkTestFileExistence();
        details.push({
          check: 'Test Files Existence',
          passed: testFileResult.missingTestFiles === 0,
          value: testFileResult.missingTestFiles,
          threshold: 0,
          message: `${testFileResult.missingTestFiles} source files without tests`
        });
        metrics.missingTestFiles = testFileResult.missingTestFiles;
        metrics.totalSourceFiles = testFileResult.totalSourceFiles;
      }

    } catch (error) {
      this.emit('categoryError', 'testCoverage', error);
    }

    const passed = details.every(d => d.passed);
    const score = this.calculateCategoryScore(details);

    this.emit('categoryCompleted', 'testCoverage', { passed, score });

    return {
      enabled: true,
      passed,
      score,
      details,
      metrics
    };
  }

  /**
   * Check documentation compliance
   */
  private async checkDocumentation(): Promise<CategoryResult> {
    if (!this.config.documentation.enabled) {
      return this.createDisabledResult();
    }

    this.emit('categoryStarted', 'documentation');

    const details: CategoryDetail[] = [];
    const metrics: Record<string, number> = {};

    try {
      // Required files check
      const requiredFilesResult = await this.checkRequiredFiles();
      details.push({
        check: 'Required Files',
        passed: requiredFilesResult.missingFiles === 0,
        value: requiredFilesResult.missingFiles,
        threshold: 0,
        message: `${requiredFilesResult.missingFiles} required files missing`
      });
      metrics.missingRequiredFiles = requiredFilesResult.missingFiles;

      // README quality check
      const readmeResult = await this.checkReadmeQuality();
      details.push({
        check: 'README Quality',
        passed: readmeResult.score >= 80,
        value: readmeResult.score,
        threshold: 80,
        message: `README quality score: ${readmeResult.score}%`
      });
      metrics.readmeQuality = readmeResult.score;

      // API documentation check
      if (this.config.documentation.apiDocumentation.required) {
        const apiDocResult = await this.checkApiDocumentation();
        details.push({
          check: 'API Documentation',
          passed: apiDocResult.coverage >= this.config.documentation.apiDocumentation.coverage,
          value: apiDocResult.coverage,
          threshold: this.config.documentation.apiDocumentation.coverage,
          message: `API documentation coverage: ${apiDocResult.coverage}%`
        });
        metrics.apiDocCoverage = apiDocResult.coverage;
      }

      // Changelog check
      if (this.config.documentation.changelogRequired) {
        const changelogResult = await this.checkChangelog();
        details.push({
          check: 'Changelog',
          passed: changelogResult.exists && changelogResult.upToDate,
          value: changelogResult.exists ? 1 : 0,
          threshold: 1,
          message: changelogResult.exists 
            ? (changelogResult.upToDate ? 'Changelog is up to date' : 'Changelog needs updating')
            : 'Changelog file missing'
        });
        metrics.changelogExists = changelogResult.exists ? 1 : 0;
        metrics.changelogUpToDate = changelogResult.upToDate ? 1 : 0;
      }

    } catch (error) {
      this.emit('categoryError', 'documentation', error);
    }

    const passed = details.every(d => d.passed);
    const score = this.calculateCategoryScore(details);

    this.emit('categoryCompleted', 'documentation', { passed, score });

    return {
      enabled: true,
      passed,
      score,
      details,
      metrics
    };
  }

  /**
   * Check security compliance
   */
  private async checkSecurity(): Promise<CategoryResult> {
    if (!this.config.security.enabled) {
      return this.createDisabledResult();
    }

    this.emit('categoryStarted', 'security');

    const details: CategoryDetail[] = [];
    const metrics: Record<string, number> = {};

    try {
      // Vulnerability scanning
      if (this.config.security.vulnerabilityScanning) {
        const vulnResult = await this.runVulnerabilityScanning();
        details.push({
          check: 'Vulnerability Scanning',
          passed: vulnResult.highSeverityVulns === 0,
          value: vulnResult.highSeverityVulns,
          threshold: 0,
          message: `${vulnResult.highSeverityVulns} high severity vulnerabilities found`
        });
        metrics.highSeverityVulns = vulnResult.highSeverityVulns;
        metrics.totalVulns = vulnResult.totalVulns;
      }

      // Dependency audit
      if (this.config.security.dependencyAudit) {
        const depAuditResult = await this.runDependencyAudit();
        details.push({
          check: 'Dependency Audit',
          passed: depAuditResult.vulnerabilities === 0,
          value: depAuditResult.vulnerabilities,
          threshold: 0,
          message: `${depAuditResult.vulnerabilities} vulnerable dependencies found`
        });
        metrics.vulnerableDependencies = depAuditResult.vulnerabilities;
      }

      // Secrets detection
      if (this.config.security.secretsDetection) {
        const secretsResult = await this.runSecretsDetection();
        details.push({
          check: 'Secrets Detection',
          passed: secretsResult.secrets === 0,
          value: secretsResult.secrets,
          threshold: 0,
          message: `${secretsResult.secrets} potential secrets found`
        });
        metrics.potentialSecrets = secretsResult.secrets;
      }

      // License compliance
      const licenseResult = await this.checkLicenseCompliance();
      details.push({
        check: 'License Compliance',
        passed: licenseResult.nonCompliantLicenses === 0,
        value: licenseResult.nonCompliantLicenses,
        threshold: 0,
        message: `${licenseResult.nonCompliantLicenses} non-compliant licenses found`
      });
      metrics.nonCompliantLicenses = licenseResult.nonCompliantLicenses;

    } catch (error) {
      this.emit('categoryError', 'security', error);
    }

    const passed = details.every(d => d.passed);
    const score = this.calculateCategoryScore(details);

    this.emit('categoryCompleted', 'security', { passed, score });

    return {
      enabled: true,
      passed,
      score,
      details,
      metrics
    };
  }

  /**
   * Check accessibility compliance
   */
  private async checkAccessibility(): Promise<CategoryResult> {
    if (!this.config.accessibility.enabled) {
      return this.createDisabledResult();
    }

    this.emit('categoryStarted', 'accessibility');

    const details: CategoryDetail[] = [];
    const metrics: Record<string, number> = {};

    try {
      // WCAG compliance check
      const wcagResult = await this.checkWCAGCompliance();
      details.push({
        check: `WCAG ${this.config.accessibility.wcagLevel} Compliance`,
        passed: wcagResult.violations === 0,
        value: wcagResult.violations,
        threshold: 0,
        message: `${wcagResult.violations} WCAG violations found`
      });
      metrics.wcagViolations = wcagResult.violations;

      // Color contrast check
      const contrastResult = await this.checkColorContrast();
      details.push({
        check: 'Color Contrast',
        passed: contrastResult.failedElements === 0,
        value: contrastResult.failedElements,
        threshold: 0,
        message: `${contrastResult.failedElements} elements with insufficient contrast`
      });
      metrics.contrastFailures = contrastResult.failedElements;

      // Required attributes check
      const attributesResult = await this.checkRequiredAttributes();
      details.push({
        check: 'Required Attributes',
        passed: attributesResult.missingAttributes === 0,
        value: attributesResult.missingAttributes,
        threshold: 0,
        message: `${attributesResult.missingAttributes} elements missing required attributes`
      });
      metrics.missingAttributes = attributesResult.missingAttributes;

    } catch (error) {
      this.emit('categoryError', 'accessibility', error);
    }

    const passed = details.every(d => d.passed);
    const score = this.calculateCategoryScore(details);

    this.emit('categoryCompleted', 'accessibility', { passed, score });

    return {
      enabled: true,
      passed,
      score,
      details,
      metrics
    };
  }

  /**
   * Check performance compliance
   */
  private async checkPerformance(): Promise<CategoryResult> {
    if (!this.config.performance.enabled) {
      return this.createDisabledResult();
    }

    this.emit('categoryStarted', 'performance');

    const details: CategoryDetail[] = [];
    const metrics: Record<string, number> = {};

    try {
      // Bundle size check
      const bundleSizeResult = await this.checkBundleSize();
      details.push({
        check: 'Bundle Size',
        passed: bundleSizeResult.size <= this.config.performance.budgets.bundleSize,
        value: bundleSizeResult.size,
        threshold: this.config.performance.budgets.bundleSize,
        message: `Bundle size: ${bundleSizeResult.size}KB`
      });
      metrics.bundleSize = bundleSizeResult.size;

      // Load time check
      const loadTimeResult = await this.checkLoadTime();
      details.push({
        check: 'Load Time',
        passed: loadTimeResult.time <= this.config.performance.budgets.loadTime,
        value: loadTimeResult.time,
        threshold: this.config.performance.budgets.loadTime,
        message: `Load time: ${loadTimeResult.time}ms`
      });
      metrics.loadTime = loadTimeResult.time;

      // Memory usage check
      const memoryResult = await this.checkMemoryUsage();
      details.push({
        check: 'Memory Usage',
        passed: memoryResult.usage <= this.config.performance.budgets.memoryUsage,
        value: memoryResult.usage,
        threshold: this.config.performance.budgets.memoryUsage,
        message: `Memory usage: ${memoryResult.usage}MB`
      });
      metrics.memoryUsage = memoryResult.usage;

    } catch (error) {
      this.emit('categoryError', 'performance', error);
    }

    const passed = details.every(d => d.passed);
    const score = this.calculateCategoryScore(details);

    this.emit('categoryCompleted', 'performance', { passed, score });

    return {
      enabled: true,
      passed,
      score,
      details,
      metrics
    };
  }

  /**
   * Helper methods for specific checks
   */
  private async runESLintCheck(): Promise<{ errors: number; warnings: number }> {
    // Simplified implementation - would use actual ESLint API
    return { errors: 0, warnings: 2 };
  }

  private async runPrettierCheck(): Promise<{ unformattedFiles: number }> {
    // Simplified implementation - would use actual Prettier API
    return { unformattedFiles: 0 };
  }

  private async runTypeScriptCheck(): Promise<{ errors: number }> {
    // Simplified implementation - would use TypeScript compiler API
    return { errors: 0 };
  }

  private async checkCodeComplexity(): Promise<{ averageComplexity: number; maxComplexity: number }> {
    // Simplified implementation - would analyze actual code complexity
    return { averageComplexity: 3.2, maxComplexity: 8 };
  }

  private async checkMaintainabilityIndex(): Promise<{ index: number }> {
    // Simplified implementation - would calculate actual maintainability index
    return { index: 85 };
  }

  private async checkDuplicateCode(): Promise<{ duplicateLines: number }> {
    // Simplified implementation - would detect actual code duplication
    return { duplicateLines: 15 };
  }

  private async checkCustomRules(): Promise<{ violations: number }> {
    // Simplified implementation - would check custom rules
    return { violations: 0 };
  }

  private async loadCoverageReport(): Promise<{ statements: number; branches: number; functions: number; lines: number } | null> {
    try {
      // Simplified implementation - would load actual coverage report
      return {
        statements: 92.5,
        branches: 88.3,
        functions: 95.1,
        lines: 91.8
      };
    } catch {
      return null;
    }
  }

  private async checkTestFileExistence(): Promise<{ missingTestFiles: number; totalSourceFiles: number }> {
    // Simplified implementation - would check actual test file existence
    return { missingTestFiles: 3, totalSourceFiles: 45 };
  }

  private async checkRequiredFiles(): Promise<{ missingFiles: number }> {
    let missingFiles = 0;
    for (const file of this.config.documentation.requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles++;
      }
    }
    return { missingFiles };
  }

  private async checkReadmeQuality(): Promise<{ score: number }> {
    // Simplified implementation - would analyze README quality
    return { score: 85 };
  }

  private async checkApiDocumentation(): Promise<{ coverage: number }> {
    // Simplified implementation - would check API documentation coverage
    return { coverage: 78 };
  }

  private async checkChangelog(): Promise<{ exists: boolean; upToDate: boolean }> {
    const exists = fs.existsSync('CHANGELOG.md');
    return { exists, upToDate: exists };
  }

  private async runVulnerabilityScanning(): Promise<{ highSeverityVulns: number; totalVulns: number }> {
    // Simplified implementation - would run actual vulnerability scanning
    return { highSeverityVulns: 0, totalVulns: 2 };
  }

  private async runDependencyAudit(): Promise<{ vulnerabilities: number }> {
    // Simplified implementation - would run actual dependency audit
    return { vulnerabilities: 1 };
  }

  private async runSecretsDetection(): Promise<{ secrets: number }> {
    // Simplified implementation - would run actual secrets detection
    return { secrets: 0 };
  }

  private async checkLicenseCompliance(): Promise<{ nonCompliantLicenses: number }> {
    // Simplified implementation - would check actual license compliance
    return { nonCompliantLicenses: 0 };
  }

  private async checkWCAGCompliance(): Promise<{ violations: number }> {
    // Simplified implementation - would check actual WCAG compliance
    return { violations: 2 };
  }

  private async checkColorContrast(): Promise<{ failedElements: number }> {
    // Simplified implementation - would check actual color contrast
    return { failedElements: 1 };
  }

  private async checkRequiredAttributes(): Promise<{ missingAttributes: number }> {
    // Simplified implementation - would check actual required attributes
    return { missingAttributes: 0 };
  }

  private async checkBundleSize(): Promise<{ size: number }> {
    // Simplified implementation - would check actual bundle size
    return { size: 245 };
  }

  private async checkLoadTime(): Promise<{ time: number }> {
    // Simplified implementation - would measure actual load time
    return { time: 1200 };
  }

  private async checkMemoryUsage(): Promise<{ usage: number }> {
    // Simplified implementation - would measure actual memory usage
    return { usage: 45 };
  }

  private async loadComplianceTrends(): Promise<ComplianceTrend[]> {
    // Simplified implementation - would load actual historical data
    return [];
  }

  /**
   * Utility methods
   */
  private createDisabledResult(): CategoryResult {
    return {
      enabled: false,
      passed: true,
      score: 100,
      details: [],
      metrics: {}
    };
  }

  private calculateCategoryScore(details: CategoryDetail[]): number {
    if (details.length === 0) return 100;
    const passedCount = details.filter(d => d.passed).length;
    return Math.round((passedCount / details.length) * 100);
  }

  private calculateOverallScore(categories: ComplianceResult['categories']): ComplianceResult['overall'] {
    const enabledCategories = Object.values(categories).filter(c => c.enabled);
    if (enabledCategories.length === 0) {
      return { passed: true, score: 100, grade: 'A' };
    }

    const totalScore = enabledCategories.reduce((sum, cat) => sum + cat.score, 0);
    const averageScore = Math.round(totalScore / enabledCategories.length);
    const passed = enabledCategories.every(cat => cat.passed);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (averageScore >= 90) grade = 'A';
    else if (averageScore >= 80) grade = 'B';
    else if (averageScore >= 70) grade = 'C';
    else if (averageScore >= 60) grade = 'D';
    else grade = 'F';

    return { passed, score: averageScore, grade };
  }

  private collectViolations(categories: ComplianceResult['categories']): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    Object.entries(categories).forEach(([categoryName, category]) => {
      if (!category.enabled) return;

      category.details.forEach(detail => {
        if (!detail.passed) {
          violations.push({
            category: categoryName,
            severity: this.determineSeverity(detail),
            rule: detail.check,
            message: detail.message,
            suggestion: this.generateSuggestion(categoryName, detail),
            autoFixable: this.isAutoFixable(categoryName, detail)
          });
        }
      });
    });

    return violations.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private generateRecommendations(categories: ComplianceResult['categories']): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    Object.entries(categories).forEach(([categoryName, category]) => {
      if (!category.enabled || category.passed) return;

      const failedChecks = category.details.filter(d => !d.passed);
      if (failedChecks.length > 0) {
        recommendations.push({
          category: categoryName,
          priority: this.determinePriority(category.score),
          title: `Improve ${categoryName} compliance`,
          description: `${failedChecks.length} checks failed in ${categoryName} category`,
          action: this.generateCategoryAction(categoryName, failedChecks),
          estimatedEffort: this.estimateEffort(failedChecks.length),
          impact: this.estimateImpact(category.score)
        });
      }
    });

    return recommendations;
  }

  private determineSeverity(detail: CategoryDetail): 'critical' | 'high' | 'medium' | 'low' {
    const ratio = detail.value / detail.threshold;
    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.2) return 'medium';
    return 'low';
  }

  private generateSuggestion(category: string, detail: CategoryDetail): string {
    const suggestions: Record<string, Record<string, string>> = {
      codeQuality: {
        'ESLint Compliance': 'Run `npm run lint:fix` to automatically fix ESLint issues',
        'Code Formatting': 'Run `npm run format` to format code with Prettier',
        'TypeScript Compliance': 'Fix TypeScript errors by running `npm run type-check`',
        'Code Complexity': 'Refactor complex functions to reduce cyclomatic complexity',
        'Maintainability Index': 'Improve code maintainability by reducing complexity and adding documentation'
      },
      testCoverage: {
        'Statement Coverage': 'Add more unit tests to increase statement coverage',
        'Branch Coverage': 'Add tests for conditional branches and edge cases',
        'Function Coverage': 'Ensure all functions have corresponding tests',
        'Line Coverage': 'Add tests to cover untested lines of code'
      },
      documentation: {
        'Required Files': 'Create missing documentation files',
        'README Quality': 'Improve README with better structure and content',
        'API Documentation': 'Add JSDoc comments to public APIs',
        'Changelog': 'Create and maintain a CHANGELOG.md file'
      }
    };

    return suggestions[category]?.[detail.check] || `Address ${detail.check} issues`;
  }

  private isAutoFixable(category: string, detail: CategoryDetail): boolean {
    const autoFixableChecks = [
      'Code Formatting',
      'ESLint Compliance'
    ];
    return autoFixableChecks.includes(detail.check);
  }

  private determinePriority(score: number): 'high' | 'medium' | 'low' {
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  private generateCategoryAction(category: string, failedChecks: CategoryDetail[]): string {
    const actions: Record<string, string> = {
      codeQuality: 'Run linting tools and refactor code to meet quality standards',
      testCoverage: 'Write additional unit tests to meet coverage thresholds',
      documentation: 'Create and update documentation files',
      security: 'Address security vulnerabilities and update dependencies',
      accessibility: 'Fix accessibility issues and improve WCAG compliance',
      performance: 'Optimize performance to meet budget requirements'
    };

    return actions[category] || `Address ${failedChecks.length} failed checks`;
  }

  private estimateEffort(failedChecksCount: number): string {
    if (failedChecksCount <= 2) return '1-2 hours';
    if (failedChecksCount <= 5) return '4-8 hours';
    if (failedChecksCount <= 10) return '1-2 days';
    return '3-5 days';
  }

  private estimateImpact(score: number): string {
    if (score < 50) return 'High - Critical for production readiness';
    if (score < 70) return 'Medium - Important for code quality';
    return 'Low - Nice to have improvement';
  }

  /**
   * Generate compliance report
   */
  async generateReport(format: 'json' | 'html' | 'markdown' | 'xml' = 'json'): Promise<string> {
    if (!this.results) {
      throw new Error('No compliance results available. Run compliance check first.');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `compliance-report-${timestamp}.${format}`;
    const filepath = path.join(this.config.outputPath, filename);

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(this.results, null, 2);
        break;
      case 'html':
        content = this.generateHtmlReport(this.results);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(this.results);
        break;
      case 'xml':
        content = this.generateXmlReport(this.results);
        break;
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }

    fs.writeFileSync(filepath, content, 'utf8');
    return filepath;
  }

  private generateHtmlReport(result: ComplianceResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Compliance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .grade-A { color: #28a745; }
        .grade-B { color: #17a2b8; }
        .grade-C { color: #ffc107; }
        .grade-D { color: #fd7e14; }
        .grade-F { color: #dc3545; }
        .category { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { background: #d4edda; }
        .failed { background: #f8d7da; }
        .disabled { background: #e2e3e5; }
        .violation { margin: 10px 0; padding: 10px; border-left: 4px solid #dc3545; }
        .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #17a2b8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Compliance Report</h1>
        <p><strong>Generated:</strong> ${result.timestamp.toLocaleString()}</p>
        <p><strong>Overall Score:</strong> <span class="grade-${result.overall.grade}">${result.overall.score}% (Grade ${result.overall.grade})</span></p>
        <p><strong>Status:</strong> ${result.overall.passed ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>

    <h2>Categories</h2>
    ${Object.entries(result.categories).map(([name, category]) => `
        <div class="category ${category.enabled ? (category.passed ? 'passed' : 'failed') : 'disabled'}">
            <h3>${name.charAt(0).toUpperCase() + name.slice(1)}</h3>
            ${category.enabled ? `
                <p><strong>Score:</strong> ${category.score}%</p>
                <p><strong>Status:</strong> ${category.passed ? '✅ PASSED' : '❌ FAILED'}</p>
                <ul>
                    ${category.details.map(detail => `
                        <li>${detail.check}: ${detail.passed ? '✅' : '❌'} ${detail.message}</li>
                    `).join('')}
                </ul>
            ` : '<p>Disabled</p>'}
        </div>
    `).join('')}

    ${result.violations.length > 0 ? `
        <h2>Violations</h2>
        ${result.violations.map(violation => `
            <div class="violation">
                <strong>${violation.severity.toUpperCase()}</strong> - ${violation.rule}
                <p>${violation.message}</p>
                <p><em>Suggestion: ${violation.suggestion}</em></p>
            </div>
        `).join('')}
    ` : ''}

    ${result.recommendations.length > 0 ? `
        <h2>Recommendations</h2>
        ${result.recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.priority.toUpperCase()}</strong> - ${rec.title}
                <p>${rec.description}</p>
                <p><strong>Action:</strong> ${rec.action}</p>
                <p><strong>Effort:</strong> ${rec.estimatedEffort} | <strong>Impact:</strong> ${rec.impact}</p>
            </div>
        `).join('')}
    ` : ''}
</body>
</html>`;
  }

  private generateMarkdownReport(result: ComplianceResult): string {
    return `# Compliance Report

**Generated:** ${result.timestamp.toLocaleString()}
**Overall Score:** ${result.overall.score}% (Grade ${result.overall.grade})
**Status:** ${result.overall.passed ? '✅ PASSED' : '❌ FAILED'}

## Categories

${Object.entries(result.categories).map(([name, category]) => `
### ${name.charAt(0).toUpperCase() + name.slice(1)}

${category.enabled ? `
- **Score:** ${category.score}%
- **Status:** ${category.passed ? '✅ PASSED' : '❌ FAILED'}

${category.details.map(detail => `- ${detail.check}: ${detail.passed ? '✅' : '❌'} ${detail.message}`).join('\n')}
` : '- Status: Disabled'}
`).join('')}

${result.violations.length > 0 ? `
## Violations

${result.violations.map(violation => `
### ${violation.severity.toUpperCase()} - ${violation.rule}

${violation.message}

**Suggestion:** ${violation.suggestion}
`).join('')}
` : ''}

${result.recommendations.length > 0 ? `
## Recommendations

${result.recommendations.map(rec => `
### ${rec.priority.toUpperCase()} - ${rec.title}

${rec.description}

- **Action:** ${rec.action}
- **Effort:** ${rec.estimatedEffort}
- **Impact:** ${rec.impact}
`).join('')}
` : ''}`;
  }

  private generateXmlReport(result: ComplianceResult): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<compliance-report>
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
                    <check>${detail.check}</check>
                    <passed>${detail.passed}</passed>
                    <value>${detail.value}</value>
                    <threshold>${detail.threshold}</threshold>
                    <message>${detail.message}</message>
                </detail>
                `).join('')}
            </details>
        </category>
        `).join('')}
    </categories>
    <violations>
        ${result.violations.map(violation => `
        <violation>
            <category>${violation.category}</category>
            <severity>${violation.severity}</severity>
            <rule>${violation.rule}</rule>
            <message>${violation.message}</message>
            <suggestion>${violation.suggestion}</suggestion>
            <autoFixable>${violation.autoFixable}</autoFixable>
        </violation>
        `).join('')}
    </violations>
</compliance-report>`;
  }
}

/**
 * Create compliance checker instance
 */
export function createComplianceChecker(config: ComplianceConfig): ComplianceChecker {
  return new ComplianceChecker(config);
}