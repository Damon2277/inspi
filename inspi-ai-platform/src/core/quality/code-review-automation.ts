/**
 * 代码审查自动化工具
 * 提供自动化代码审查、评分和建议
 */

/**
 * 代码审查规则
 */
export interface CodeReviewRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'maintainability' | 'style' | 'best-practices';
  severity: 'error' | 'warning' | 'info';
  pattern: RegExp;
  message: string;
  suggestion?: string;
  autoFix?: (code: string) => string;
}

/**
 * 代码审查结果
 */
export interface CodeReviewResult {
  file: string;
  line: number;
  column: number;
  rule: CodeReviewRule;
  context: string;
  suggestion?: string;
  autoFixAvailable: boolean;
}

/**
 * 代码审查报告
 */
export interface CodeReviewReport {
  summary: {
    filesReviewed: number;
    issuesFound: number;
    autoFixableIssues: number;
    score: number;
  };
  results: CodeReviewResult[];
  recommendations: string[];
  metrics: {
    securityIssues: number;
    performanceIssues: number;
    maintainabilityIssues: number;
    styleIssues: number;
    bestPracticeIssues: number;
  };
}

/**
 * 代码审查自动化器
 */
export class CodeReviewAutomation {
  private rules: CodeReviewRule[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * 初始化审查规则
   */
  private initializeRules(): void {
    this.rules = [
      // 安全规则
      {
        id: 'no-eval',
        name: 'No eval() usage',
        description: 'Avoid using eval() as it can lead to code injection vulnerabilities',
        category: 'security',
        severity: 'error',
        pattern: /\beval\s*\(/,
        message: 'Use of eval() is dangerous and should be avoided',
        suggestion: 'Use JSON.parse() for parsing JSON or find alternative solutions',
      },
      {
        id: 'no-inner-html',
        name: 'No innerHTML with user data',
        description: 'Avoid using innerHTML with user-provided data',
        category: 'security',
        severity: 'warning',
        pattern: /\.innerHTML\s*=\s*[^'"]/,
        message: 'Using innerHTML with dynamic content can lead to XSS vulnerabilities',
        suggestion: 'Use textContent or createElement methods instead',
      },
      {
        id: 'no-hardcoded-secrets',
        name: 'No hardcoded secrets',
        description: 'Avoid hardcoding API keys, passwords, or other secrets',
        category: 'security',
        severity: 'error',
        pattern: /(api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]{10,}['"]/i,
        message: 'Hardcoded secrets detected',
        suggestion: 'Use environment variables or secure configuration management',
      },

      // 性能规则
      {
        id: 'no-sync-fs',
        name: 'No synchronous file operations',
        description: 'Avoid synchronous file system operations in Node.js',
        category: 'performance',
        severity: 'warning',
        pattern: /fs\.\w+Sync\(/,
        message: 'Synchronous file operations can block the event loop',
        suggestion: 'Use asynchronous file operations with promises or callbacks',
      },
      {
        id: 'prefer-const',
        name: 'Prefer const for immutable variables',
        description: 'Use const for variables that are not reassigned',
        category: 'performance',
        severity: 'info',
        pattern: /\blet\s+(\w+)\s*=\s*[^;]+;(?!\s*\1\s*=)/,
        message: 'Variable could be declared as const',
        suggestion: 'Use const instead of let for variables that are not reassigned',
        autoFix: (code: string) => code.replace(/\blet\b/, 'const'),
      },
      {
        id: 'no-unused-imports',
        name: 'No unused imports',
        description: 'Remove unused import statements',
        category: 'performance',
        severity: 'warning',
        pattern: /^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/m,
        message: 'Unused import detected',
        suggestion: 'Remove unused imports to reduce bundle size',
      },

      // 可维护性规则
      {
        id: 'max-function-length',
        name: 'Maximum function length',
        description: 'Functions should not be too long',
        category: 'maintainability',
        severity: 'warning',
        pattern: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}?\}/,
        message: 'Function is too long and should be broken down',
        suggestion: 'Break large functions into smaller, more focused functions',
      },
      {
        id: 'no-magic-numbers',
        name: 'No magic numbers',
        description: 'Avoid using magic numbers in code',
        category: 'maintainability',
        severity: 'info',
        pattern: /\b\d{2,}\b(?!\s*[;,)\]}])/,
        message: 'Magic number detected',
        suggestion: 'Extract numbers into named constants',
      },
      {
        id: 'descriptive-variable-names',
        name: 'Descriptive variable names',
        description: 'Use descriptive variable names',
        category: 'maintainability',
        severity: 'info',
        pattern: /\b(let|const|var)\s+[a-z]{1,2}\b/,
        message: 'Variable name is too short and not descriptive',
        suggestion: 'Use more descriptive variable names',
      },

      // 样式规则
      {
        id: 'consistent-quotes',
        name: 'Consistent quote style',
        description: 'Use consistent quote style throughout the codebase',
        category: 'style',
        severity: 'info',
        pattern: /"/,
        message: 'Inconsistent quote style',
        suggestion: 'Use single quotes consistently',
        autoFix: (code: string) => code.replace(/"/g, "'"),
      },
      {
        id: 'trailing-comma',
        name: 'Trailing commas in multiline structures',
        description: 'Use trailing commas in multiline objects and arrays',
        category: 'style',
        severity: 'info',
        pattern: /\{[^}]*\n[^}]*[^,]\n\s*\}/,
        message: 'Missing trailing comma in multiline object',
        suggestion: 'Add trailing comma for better diffs',
      },

      // 最佳实践规则
      {
        id: 'no-console-log',
        name: 'No console.log in production',
        description: 'Avoid console.log statements in production code',
        category: 'best-practices',
        severity: 'warning',
        pattern: /console\.log\(/,
        message: 'console.log statement found',
        suggestion: 'Use proper logging library or remove debug statements',
      },
      {
        id: 'prefer-arrow-functions',
        name: 'Prefer arrow functions for callbacks',
        description: 'Use arrow functions for short callback functions',
        category: 'best-practices',
        severity: 'info',
        pattern: /function\s*\([^)]*\)\s*\{\s*return\s+[^;]+;\s*\}/,
        message: 'Consider using arrow function',
        suggestion: 'Use arrow function for concise syntax',
        autoFix: (code: string) => {
          return code.replace(
            /function\s*\(([^)]*)\)\s*\{\s*return\s+([^;]+);\s*\}/,
            '($1) => $2',
          );
        },
      },
      {
        id: 'no-var',
        name: 'No var declarations',
        description: 'Use let or const instead of var',
        category: 'best-practices',
        severity: 'error',
        pattern: /\bvar\s+/,
        message: 'Use let or const instead of var',
        suggestion: 'Replace var with let or const',
        autoFix: (code: string) => code.replace(/\bvar\b/, 'let'),
      },
      {
        id: 'strict-equality',
        name: 'Use strict equality operators',
        description: 'Use === and !== instead of == and !=',
        category: 'best-practices',
        severity: 'warning',
        pattern: /[^!]==[^=]|!=[^=]/,
        message: 'Use strict equality operators',
        suggestion: 'Use === or !== for strict comparison',
        autoFix: (code: string) => code.replace(/==/g, '===').replace(/!=/g, '!=='),
      },
    ];
  }

  /**
   * 审查单个文件
   */
  async reviewFile(filePath: string, content: string): Promise<CodeReviewResult[]> {
    const results: CodeReviewResult[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      for (const rule of this.rules) {
        const matches = line.match(rule.pattern);
        if (matches) {
          const column = line.indexOf(matches[0]) + 1;

          results.push({
            file: filePath,
            line: lineNumber,
            column,
            rule,
            context: this.getContext(lines, lineIndex),
            suggestion: rule.suggestion,
            autoFixAvailable: !!rule.autoFix,
          });
        }
      }
    }
    return results;
  }

  /**
   * 审查多个文件
   */
  async reviewFiles(files: Array<{ path: string; content: string }>): Promise<CodeReviewReport> {
    const allResults: CodeReviewResult[] = [];
    let autoFixableCount = 0;

    for (const file of files) {
      const results = await this.reviewFile(file.path, file.content);
      allResults.push(...results);
      autoFixableCount += results.filter(r => r.autoFixAvailable).length;
    }

    const metrics = this.calculateMetrics(allResults);
    const score = this.calculateScore(allResults, files.length);
    const recommendations = this.generateRecommendations(allResults, metrics);

    return {
      summary: {
        filesReviewed: files.length,
        issuesFound: allResults.length,
        autoFixableIssues: autoFixableCount,
        score,
      },
      results: allResults,
      recommendations,
      metrics,
    };
  }

  /**
   * 自动修复问题
   */
  async autoFix(filePath: string, content: string): Promise<{
    fixedContent: string;
    fixedIssues: number;
    remainingIssues: CodeReviewResult[];
  }> {
    let fixedContent = content;
    let fixedCount = 0;
    const results = await this.reviewFile(filePath, content);

    // 应用自动修复
    for (const result of results) {
      if (result.rule.autoFix) {
        const newContent = result.rule.autoFix(fixedContent);
        if (newContent !== fixedContent) {
          fixedContent = newContent;
          fixedCount++;
        }
      }
    }

    // 重新检查剩余问题
    const remainingIssues = await this.reviewFile(filePath, fixedContent);

    return {
      fixedContent,
      fixedIssues: fixedCount,
      remainingIssues,
    };
  }

  /**
   * 获取上下文
   */
  private getContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).join('\n');
  }

  /**
   * 计算指标
   */
  private calculateMetrics(results: CodeReviewResult[]) {
    return {
      securityIssues: results.filter(r => r.rule.category === 'security').length,
      performanceIssues: results.filter(r => r.rule.category === 'performance').length,
      maintainabilityIssues: results.filter(r => r.rule.category === 'maintainability').length,
      styleIssues: results.filter(r => r.rule.category === 'style').length,
      bestPracticeIssues: results.filter(r => r.rule.category === 'best-practices').length,
    };
  }

  /**
   * 计算评分
   */
  private calculateScore(results: CodeReviewResult[], fileCount: number): number {
    if (fileCount === 0) return 100;

    let score = 100;
    const errorCount = results.filter(r => r.rule.severity === 'error').length;
    const warningCount = results.filter(r => r.rule.severity === 'warning').length;
    const infoCount = results.filter(r => r.rule.severity === 'info').length;

    // 根据问题严重程度扣分
    score -= errorCount * 10;
    score -= warningCount * 5;
    score -= infoCount * 1;

    // 根据文件数量调整
    const issuesPerFile = results.length / fileCount;
    if (issuesPerFile > 10) {
      score -= (issuesPerFile - 10) * 2;
    }
    return Math.max(0, Math.round(score));
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    results: CodeReviewResult[],
    metrics: any,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.securityIssues > 0) {
      recommendations.push(`Address ${metrics.securityIssues} security issues immediately`);
    }

    if (metrics.performanceIssues > 5) {
      recommendations.push(`Optimize performance by fixing ${metrics.performanceIssues} performance issues`);
    }

    if (metrics.maintainabilityIssues > 10) {
      recommendations.push(`Improve code maintainability by addressing ${metrics.maintainabilityIssues} issues`);
    }

    const autoFixableCount = results.filter(r => r.autoFixAvailable).length;
    if (autoFixableCount > 0) {
      recommendations.push(`${autoFixableCount} issues can be automatically fixed`);
    }

    const errorCount = results.filter(r => r.rule.severity === 'error').length;
    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} critical errors before deployment`);
    }

    // 基于规则频率的建议
    const ruleFrequency = results.reduce((freq, result) => {
      freq[result.rule.id] = (freq[result.rule.id] || 0) + 1;
      return freq;
    }, {} as Record<string, number>);

    const topIssues = Object.entries(ruleFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    topIssues.forEach(([ruleId, count]) => {
      const rule = (this.rules as any).find(r => r.id === ruleId);
      if (rule && count > 3) {
        recommendations.push(`Focus on fixing "${rule.name}" (${count} occurrences)`);
      }
    });

    return recommendations;
  }

  /**
   * 生成审查报告
   */
  generateReport(report: CodeReviewReport): string {
    let reportText = '# Code Review Report\n\n';

    // 摘要
    reportText += '## Summary\n\n';
    reportText += `- **Files Reviewed:** ${report.summary.filesReviewed}\n`;
    reportText += `- **Issues Found:** ${report.summary.issuesFound}\n`;
    reportText += `- **Auto-fixable Issues:** ${report.summary.autoFixableIssues}\n`;
    reportText += `- **Score:** ${report.summary.score}/100\n\n`;

    // 指标
    reportText += '## Issue Breakdown\n\n';
    reportText += '| Category | Count |\n';
    reportText += '|----------|-------|\n';
    reportText += `| Security | ${report.metrics.securityIssues} |\n`;
    reportText += `| Performance | ${report.metrics.performanceIssues} |\n`;
    reportText += `| Maintainability | ${report.metrics.maintainabilityIssues} |\n`;
    reportText += `| Style | ${report.metrics.styleIssues} |\n`;
    reportText += `| Best Practices | ${report.metrics.bestPracticeIssues} |\n\n`;

    // 建议
    if (report.recommendations.length > 0) {
      reportText += '## Recommendations\n\n';
      report.recommendations.forEach((rec, index) => {
        reportText += `${index + 1}. ${rec}\n`;
      });
      reportText += '\n';
    }

    // 详细问题
    if (report.results.length > 0) {
      reportText += '## Detailed Issues\n\n';

      const groupedByCategory = report.results.reduce((groups, result) => {
        const category = result.rule.category;
        if (!groups[category]) groups[category] = [];
        groups[category].push(result);
        return groups;
      }, {} as Record<string, CodeReviewResult[]>);

      Object.entries(groupedByCategory).forEach(([category, results]) => {
        reportText += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Issues\n\n`;

        results.forEach(result => {
          const severity = result.rule.severity === 'error' ? '🔴' :
                          result.rule.severity === 'warning' ? '🟡' : '🔵';
          const autoFix = result.autoFixAvailable ? ' 🔧' : '';

          reportText += `${severity} **${result.file}:${result.line}:${result.column}**${autoFix}\n`;
          reportText += `   ${result.rule.message}\n`;
          if (result.suggestion) {
            reportText += `   *Suggestion: ${result.suggestion}*\n`;
          }
          reportText += '\n';
        });
      });
    }
    return reportText;
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: CodeReviewRule): void {
    this.rules.push(rule);
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * 获取所有规则
   */
  getRules(): CodeReviewRule[] {
    return [...this.rules];
  }

  /**
   * 按类别获取规则
   */
  getRulesByCategory(category: string): CodeReviewRule[] {
    return this.rules.filter(rule => rule.category === category);
  }
}
