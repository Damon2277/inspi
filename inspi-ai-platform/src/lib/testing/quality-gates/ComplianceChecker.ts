/**
 * Compliance Checker
 *
 * Implements compliance rules verification for code quality standards,
 * documentation requirements, and development best practices.
 */

import * as fs from 'fs';
import * as path from 'path';

import { glob } from 'glob';

export interface ComplianceViolation {
  rule: string;
  severity: 'warning' | 'error';
  file: string;
  line?: number;
  message: string;
  recommendation: string;
  category: 'documentation' | 'naming' | 'errorHandling' | 'typeScript' | 'testing';
}

export interface ComplianceCheckResult {
  passed: boolean;
  violations: ComplianceViolation[];
  summary: {
    total: number;
    documentation: number;
    naming: number;
    errorHandling: number;
    typeScript: number;
    testing: number;
  };
  scores: {
    documentation: number;
    naming: number;
    errorHandling: number;
    typeScript: number;
    testing: number;
    overall: number;
  };
}

export interface ComplianceConfig {
  enabled: boolean;
  rules: {
    requireTestDocumentation: boolean;
    enforceNamingConventions: boolean;
    requireErrorHandling: boolean;
    enforceTypeScript: boolean;
  };
  failOnViolation: boolean;
  excludePatterns: string[];
  customRules: ComplianceRule[];
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'error';
  category: 'documentation' | 'naming' | 'errorHandling' | 'typeScript' | 'testing';
  check: (file: string, content: string) => ComplianceViolation[];
}

export class ComplianceChecker {
  private config: ComplianceConfig;
  private builtInRules: ComplianceRule[];

  constructor(config: ComplianceConfig) {
    this.config = config;
    this.builtInRules = this.initializeBuiltInRules();
  }

  /**
   * Check compliance rules
   */
  async check(): Promise<ComplianceCheckResult> {
    try {
      const violations: ComplianceViolation[] = [];
      const allRules = [...this.builtInRules, ...this.config.customRules];

      // Get all files to check
      const filesToCheck = await this.getFilesToCheck();

      // Apply each rule to each file
      for (const rule of allRules) {
        if (this.isRuleEnabled(rule)) {
          for (const file of filesToCheck) {
            try {
              const content = fs.readFileSync(file, 'utf8');
              const ruleViolations = rule.check(file, content);
              violations.push(...ruleViolations);
            } catch (error) {
              // Skip files that can't be read
              continue;
            }
          }
        }
      }

      const summary = this.calculateSummary(violations);
      const scores = this.calculateScores(violations, filesToCheck.length);
      const passed = this.determinePassStatus(violations);

      return {
        passed,
        violations,
        summary,
        scores,
      };
    } catch (error) {
      return {
        passed: false,
        violations: [{
          rule: 'compliance-check-error',
          severity: 'error',
          file: 'unknown',
          message: `Compliance check failed: ${(error as Error).message}`,
          recommendation: 'Fix compliance checker configuration',
          category: 'testing',
        }],
        summary: { total: 1, documentation: 0, naming: 0, errorHandling: 0, typeScript: 0, testing: 1 },
        scores: { documentation: 0, naming: 0, errorHandling: 0, typeScript: 0, testing: 0, overall: 0 },
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: ComplianceConfig): void {
    this.config = config;
  }

  /**
   * Generate compliance report
   */
  generateReport(result: ComplianceCheckResult): string {
    const lines: string[] = [
      '# Compliance Report',
      `Generated: ${new Date().toISOString()}`,
      `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `Overall Score: ${result.scores.overall.toFixed(1)}/100`,
      '',
      '## Compliance Scores',
      `- Documentation: ${result.scores.documentation.toFixed(1)}/100`,
      `- Naming Conventions: ${result.scores.naming.toFixed(1)}/100`,
      `- Error Handling: ${result.scores.errorHandling.toFixed(1)}/100`,
      `- TypeScript: ${result.scores.typeScript.toFixed(1)}/100`,
      `- Testing: ${result.scores.testing.toFixed(1)}/100`,
      '',
      '## Violation Summary',
      `- Total Violations: ${result.summary.total}`,
      `- Documentation: ${result.summary.documentation}`,
      `- Naming: ${result.summary.naming}`,
      `- Error Handling: ${result.summary.errorHandling}`,
      `- TypeScript: ${result.summary.typeScript}`,
      `- Testing: ${result.summary.testing}`,
      '',
    ];

    // Group violations by category
    const categories = this.groupViolationsByCategory(result.violations);

    for (const [category, violations] of Object.entries(categories)) {
      if (violations.length > 0) {
        lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Violations`);

        violations.slice(0, 10).forEach(violation => {
          lines.push(`### ${violation.rule} (${violation.severity.toUpperCase()})`);
          lines.push(`**File:** ${violation.file}${violation.line ? `:${violation.line}` : ''}`);
          lines.push(`**Message:** ${violation.message}`);
          lines.push(`**Recommendation:** ${violation.recommendation}`);
          lines.push('');
        });

        if (violations.length > 10) {
          lines.push(`... and ${violations.length - 10} more ${category} violations`);
          lines.push('');
        }
      }
    }

    // Top recommendations
    const recommendations = this.generateTopRecommendations(result.violations);
    if (recommendations.length > 0) {
      lines.push('## Top Recommendations');
      recommendations.forEach(rec => lines.push(`- ${rec}`));
    }

    return lines.join('\n');
  }

  /**
   * Add custom compliance rule
   */
  addCustomRule(rule: ComplianceRule): void {
    this.config.customRules.push(rule);
  }

  private initializeBuiltInRules(): ComplianceRule[] {
    return [
      // Documentation rules
      {
        id: 'missing-test-documentation',
        name: 'Missing Test Documentation',
        description: 'Test files should have proper documentation',
        severity: 'warning',
        category: 'documentation',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          if (file.includes('.test.') || file.includes('.spec.')) {
            // Check for describe blocks without documentation
            const describeMatches = content.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/g);
            if (describeMatches) {
              describeMatches.forEach((match, index) => {
                const lineNumber = this.getLineNumber(content, content.indexOf(match));
                const hasDocComment = this.hasDocumentationBefore(content, content.indexOf(match));

                if (!hasDocComment) {
                  violations.push({
                    rule: 'missing-test-documentation',
                    severity: 'warning',
                    file,
                    line: lineNumber,
                    message: 'Test suite lacks documentation comment',
                    recommendation: 'Add JSDoc comment describing the test suite purpose',
                    category: 'documentation',
                  });
                }
              });
            }
          }

          return violations;
        },
      },

      {
        id: 'missing-function-documentation',
        name: 'Missing Function Documentation',
        description: 'Public functions should have JSDoc documentation',
        severity: 'warning',
        category: 'documentation',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          // Skip test files
          if (file.includes('.test.') || file.includes('.spec.')) {
            return violations;
          }

          // Find exported functions without documentation
          const exportFunctionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
          let match;

          while ((match = exportFunctionRegex.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            const hasDocComment = this.hasDocumentationBefore(content, match.index);

            if (!hasDocComment) {
              violations.push({
                rule: 'missing-function-documentation',
                severity: 'warning',
                file,
                line: lineNumber,
                message: `Exported function '${match[1]}' lacks documentation`,
                recommendation: 'Add JSDoc comment describing function purpose, parameters, and return value',
                category: 'documentation',
              });
            }
          }

          return violations;
        },
      },

      // Naming convention rules
      {
        id: 'invalid-test-naming',
        name: 'Invalid Test Naming',
        description: 'Test files should follow naming conventions',
        severity: 'error',
        category: 'naming',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          if (file.includes('.test.') || file.includes('.spec.')) {
            const fileName = path.basename(file);

            // Check if test file follows naming convention
            if (!fileName.match(/^[a-zA-Z][a-zA-Z0-9]*\.(test|spec)\.(ts|js|tsx|jsx)$/)) {
              violations.push({
                rule: 'invalid-test-naming',
                severity: 'error',
                file,
                message: 'Test file does not follow naming convention',
                recommendation: 'Use camelCase for test file names: component.test.ts',
                category: 'naming',
              });
            }

            // Check test case naming
            const testCaseRegex = /(it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
            let match;

            while ((match = testCaseRegex.exec(content)) !== null) {
              const testName = match[2];
              const lineNumber = this.getLineNumber(content, match.index);

              // Test names should start with lowercase and be descriptive
              if (testName.length < 10) {
                violations.push({
                  rule: 'invalid-test-naming',
                  severity: 'warning',
                  file,
                  line: lineNumber,
                  message: `Test name '${testName}' is too short`,
                  recommendation: 'Use descriptive test names that explain what is being tested',
                  category: 'naming',
                });
              }
            }
          }

          return violations;
        },
      },

      {
        id: 'invalid-variable-naming',
        name: 'Invalid Variable Naming',
        description: 'Variables should follow camelCase convention',
        severity: 'warning',
        category: 'naming',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          // Check variable declarations
          const variableRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
          let match;

          while ((match = variableRegex.exec(content)) !== null) {
            const variableName = match[1];
            const lineNumber = this.getLineNumber(content, match.index);

            // Check if variable follows camelCase (allowing CONSTANTS)
            if (!variableName.match(/^[a-z][a-zA-Z0-9]*$|^[A-Z][A-Z0-9_]*$/)) {
              violations.push({
                rule: 'invalid-variable-naming',
                severity: 'warning',
                file,
                line: lineNumber,
                message: `Variable '${variableName}' does not follow camelCase convention`,
                recommendation: 'Use camelCase for variables or UPPER_CASE for constants',
                category: 'naming',
              });
            }
          }

          return violations;
        },
      },

      // Error handling rules
      {
        id: 'missing-error-handling',
        name: 'Missing Error Handling',
        description: 'Async functions should have proper error handling',
        severity: 'error',
        category: 'errorHandling',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          // Find async functions without try-catch
          const asyncFunctionRegex = /async\s+function\s+\w+[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
          let match;

          while ((match = asyncFunctionRegex.exec(content)) !== null) {
            const functionBody = match[1];
            const lineNumber = this.getLineNumber(content, match.index);

            // Check if function body contains try-catch or .catch()
            if (!functionBody.includes('try') && !functionBody.includes('.catch(')) {
              violations.push({
                rule: 'missing-error-handling',
                severity: 'error',
                file,
                line: lineNumber,
                message: 'Async function lacks error handling',
                recommendation: 'Add try-catch block or .catch() handler for async operations',
                category: 'errorHandling',
              });
            }
          }

          return violations;
        },
      },

      {
        id: 'unhandled-promise',
        name: 'Unhandled Promise',
        description: 'Promises should be properly handled',
        severity: 'warning',
        category: 'errorHandling',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          // Find promises without .catch() or await
          const promiseRegex = /\w+\([^)]*\)\.then\([^)]*\)(?!\.catch)/g;
          let match;

          while ((match = promiseRegex.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);

            violations.push({
              rule: 'unhandled-promise',
              severity: 'warning',
              file,
              line: lineNumber,
              message: 'Promise chain lacks error handling',
              recommendation: 'Add .catch() handler or use try-catch with await',
              category: 'errorHandling',
            });
          }

          return violations;
        },
      },

      // TypeScript rules
      {
        id: 'missing-type-annotations',
        name: 'Missing Type Annotations',
        description: 'Function parameters should have type annotations',
        severity: 'warning',
        category: 'typeScript',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
            return violations;
          }

          // Find function parameters without type annotations
          const functionRegex = /function\s+\w+\s*\(([^)]*)\)/g;
          let match;

          while ((match = functionRegex.exec(content)) !== null) {
            const params = match[1];
            const lineNumber = this.getLineNumber(content, match.index);

            if (params && !params.includes(':') && params.trim() !== '') {
              violations.push({
                rule: 'missing-type-annotations',
                severity: 'warning',
                file,
                line: lineNumber,
                message: 'Function parameters lack type annotations',
                recommendation: 'Add TypeScript type annotations to function parameters',
                category: 'typeScript',
              });
            }
          }

          return violations;
        },
      },

      {
        id: 'any-type-usage',
        name: 'Any Type Usage',
        description: 'Avoid using "any" type',
        severity: 'warning',
        category: 'typeScript',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
            return violations;
          }

          const anyTypeRegex = /:\s*any\b/g;
          let match;

          while ((match = anyTypeRegex.exec(content)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);

            violations.push({
              rule: 'any-type-usage',
              severity: 'warning',
              file,
              line: lineNumber,
              message: 'Usage of "any" type reduces type safety',
              recommendation: 'Use specific types or generic types instead of "any"',
              category: 'typeScript',
            });
          }

          return violations;
        },
      },

      // Testing rules
      {
        id: 'missing-test-assertions',
        name: 'Missing Test Assertions',
        description: 'Test cases should have assertions',
        severity: 'error',
        category: 'testing',
        check: (file: string, content: string) => {
          const violations: ComplianceViolation[] = [];

          if (!file.includes('.test.') && !file.includes('.spec.')) {
            return violations;
          }

          // Find test cases without assertions
          const testCaseRegex = /(it|test)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
          let match;

          while ((match = testCaseRegex.exec(content)) !== null) {
            const testBody = match[2];
            const lineNumber = this.getLineNumber(content, match.index);

            // Check if test body contains assertions
            if (!testBody.includes('expect(') && !testBody.includes('assert')) {
              violations.push({
                rule: 'missing-test-assertions',
                severity: 'error',
                file,
                line: lineNumber,
                message: 'Test case lacks assertions',
                recommendation: 'Add expect() assertions to verify test behavior',
                category: 'testing',
              });
            }
          }

          return violations;
        },
      },
    ];
  }

  private async getFilesToCheck(): Promise<string[]> {
    const patterns = [
      'src/**/*.ts',
      'src/**/*.js',
      'src/**/*.tsx',
      'src/**/*.jsx',
      '!node_modules/**',
      '!coverage/**',
      '!dist/**',
      '!build/**',
    ];

    // Add exclude patterns from config
    this.config.excludePatterns.forEach(pattern => {
      patterns.push(`!${pattern}`);
    });

    try {
      const files = await glob(patterns);
      return files.filter(file => fs.existsSync(file));
    } catch {
      return [];
    }
  }

  private isRuleEnabled(rule: ComplianceRule): boolean {
    switch (rule.category) {
      case 'documentation':
        return this.config.rules.requireTestDocumentation;
      case 'naming':
        return this.config.rules.enforceNamingConventions;
      case 'errorHandling':
        return this.config.rules.requireErrorHandling;
      case 'typeScript':
        return this.config.rules.enforceTypeScript;
      default:
        return true;
    }
  }

  private getLineNumber(content: string, index: number): number {
    const beforeMatch = content.substring(0, index);
    return beforeMatch.split('\n').length;
  }

  private hasDocumentationBefore(content: string, index: number): boolean {
    const beforeContent = content.substring(0, index);
    const lines = beforeContent.split('\n');

    // Look for JSDoc comment in the previous few lines
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
      const line = lines[i].trim();
      if (line.includes('/**') || line.includes('*/') || line.startsWith('*')) {
        return true;
      }
      if (line && !line.startsWith('//')) {
        break; // Stop if we hit non-comment code
      }
    }

    return false;
  }

  private calculateSummary(violations: ComplianceViolation[]): ComplianceCheckResult['summary'] {
    const summary = {
      total: violations.length,
      documentation: 0,
      naming: 0,
      errorHandling: 0,
      typeScript: 0,
      testing: 0,
    };

    violations.forEach(violation => {
      summary[violation.category]++;
    });

    return summary;
  }

  private calculateScores(violations: ComplianceViolation[], totalFiles: number): ComplianceCheckResult['scores'] {
    const categories = ['documentation', 'naming', 'errorHandling', 'typeScript', 'testing'] as const;
    const scores: any = {};

    categories.forEach(category => {
      const categoryViolations = violations.filter(v => v.category === category);
      const errorCount = categoryViolations.filter(v => v.severity === 'error').length;
      const warningCount = categoryViolations.filter(v => v.severity === 'warning').length;

      // Calculate score based on violations (errors are weighted more heavily)
      const penalty = (errorCount * 10) + (warningCount * 5);
      const maxPossiblePenalty = totalFiles * 10; // Assume max 1 error per file

      scores[category] = Math.max(0, 100 - (penalty / Math.max(1, maxPossiblePenalty)) * 100);
    });

    // Calculate overall score
    const overall = categories.reduce((sum, category) => sum + scores[category], 0) / categories.length;
    scores.overall = overall;

    return scores;
  }

  private determinePassStatus(violations: ComplianceViolation[]): boolean {
    if (!this.config.failOnViolation) {
      return true;
    }

    // Fail if there are any error-level violations
    return !violations.some(v => v.severity === 'error');
  }

  private groupViolationsByCategory(violations: ComplianceViolation[]): Record<string, ComplianceViolation[]> {
    const groups: Record<string, ComplianceViolation[]> = {
      documentation: [],
      naming: [],
      errorHandling: [],
      typeScript: [],
      testing: [],
    };

    violations.forEach(violation => {
      groups[violation.category].push(violation);
    });

    return groups;
  }

  private generateTopRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations = new Map<string, number>();

    violations.forEach(violation => {
      const count = recommendations.get(violation.recommendation) || 0;
      recommendations.set(violation.recommendation, count + 1);
    });

    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rec, count]) => `${rec} (${count} occurrence${count > 1 ? 's' : ''})`);
  }
}
