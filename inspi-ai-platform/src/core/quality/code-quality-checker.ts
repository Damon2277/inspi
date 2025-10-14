/**
 * 代码质量检查工具
 * 提供代码质量分析、评分和改进建议
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 代码质量指标
 */
export interface CodeQualityMetrics {
  // 复杂度指标
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;

  // 可维护性指标
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: number;

  // 覆盖率指标
  testCoverage: number;
  branchCoverage: number;
  functionCoverage: number;

  // 代码风格指标
  lintingErrors: number;
  lintingWarnings: number;
  formattingIssues: number;

  // 类型安全指标
  typeScriptCoverage: number;
  typeErrors: number;
  anyUsage: number;

  // 依赖指标
  dependencyCount: number;
  circularDependencies: number;
  unusedDependencies: number;
}

/**
 * 代码质量问题
 */
export interface CodeQualityIssue {
  type: 'error' | 'warning' | 'info';
  category: 'complexity' | 'maintainability' | 'style' | 'type-safety' | 'dependency';
  severity: 'critical' | 'major' | 'minor';
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
  suggestion?: string;
}

/**
 * 代码质量报告
 */
export interface CodeQualityReport {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: CodeQualityMetrics;
  issues: CodeQualityIssue[];
  recommendations: string[];
  trends: {
    scoreChange: number;
    issueChange: number;
    coverageChange: number;
  };
}

/**
 * 代码质量检查器
 */
export class CodeQualityChecker {
  private projectRoot: string;
  private excludePatterns: string[] = [
    'node_modules/**',
    '.next/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
  ];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 执行完整的代码质量检查
   */
  async checkQuality(): Promise<CodeQualityReport> {
    console.log('🔍 Starting code quality analysis...');

    const metrics = await this.collectMetrics();
    const issues = await this.findIssues();
    const score = this.calculateScore(metrics, issues);
    const grade = this.calculateGrade(score);
    const recommendations = this.generateRecommendations(metrics, issues);
    const trends = await this.calculateTrends();

    const report: CodeQualityReport = {
      score,
      grade,
      metrics,
      issues,
      recommendations,
      trends,
    };

    console.log(`✅ Code quality analysis complete. Score: ${score}/100 (${grade})`);
    return report;
  }

  /**
   * 收集代码质量指标
   */
  private async collectMetrics(): Promise<CodeQualityMetrics> {
    const files = await this.getSourceFiles();

    let totalComplexity = 0;
    let totalCognitive = 0;
    let maxNesting = 0;
    const lintErrors = 0;
    const lintWarnings = 0;
    const typeErrors = 0;
    let anyUsage = 0;
    let totalLines = 0;
    let tsFiles = 0;

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const analysis = this.analyzeFile(content, file);

      totalComplexity += analysis.cyclomaticComplexity;
      totalCognitive += analysis.cognitiveComplexity;
      maxNesting = Math.max(maxNesting, analysis.nestingDepth);
      anyUsage += analysis.anyUsage;
      totalLines += content.split('\n').length;

      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        tsFiles++;
      }
    }

    // 计算平均值和百分比
    const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;
    const avgCognitive = files.length > 0 ? totalCognitive / files.length : 0;
    const tsCoverage = files.length > 0 ? (tsFiles / files.length) * 100 : 0;

    return {
      cyclomaticComplexity: avgComplexity,
      cognitiveComplexity: avgCognitive,
      nestingDepth: maxNesting,
      maintainabilityIndex: this.calculateMaintainabilityIndex(avgComplexity, totalLines),
      technicalDebt: this.calculateTechnicalDebt(avgComplexity, anyUsage),
      codeSmells: this.countCodeSmells(files),
      testCoverage: await this.getTestCoverage(),
      branchCoverage: await this.getBranchCoverage(),
      functionCoverage: await this.getFunctionCoverage(),
      lintingErrors: lintErrors,
      lintingWarnings: lintWarnings,
      formattingIssues: await this.getFormattingIssues(),
      typeScriptCoverage: tsCoverage,
      typeErrors: typeErrors,
      anyUsage: anyUsage,
      dependencyCount: await this.getDependencyCount(),
      circularDependencies: await this.getCircularDependencies(),
      unusedDependencies: await this.getUnusedDependencies(),
    };
  }

  /**
   * 分析单个文件
   */
  private analyzeFile(content: string, filePath: string) {
    const lines = content.split('\n');
    let cyclomaticComplexity = 1; // 基础复杂度
    let cognitiveComplexity = 0;
    let nestingDepth = 0;
    let currentNesting = 0;
    let anyUsage = 0;

    // 复杂度关键词
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try',
      '&&', '||', '?', ':', 'break', 'continue', 'return',
    ];

    // 认知复杂度关键词
    const cognitiveKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'catch', 'try',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 计算圈复杂度
      complexityKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = line.match(regex);
        if (matches) {
          cyclomaticComplexity += matches.length;
        }
      });

      // 计算认知复杂度
      cognitiveKeywords.forEach(keyword => {
        if (line.includes(keyword)) {
          cognitiveComplexity += 1 + currentNesting;
        }
      });

      // 计算嵌套深度
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      currentNesting += openBraces - closeBraces;
      nestingDepth = Math.max(nestingDepth, currentNesting);

      // 计算 any 使用
      const anyMatches = line.match(/:\s*any\b/g);
      if (anyMatches) {
        anyUsage += anyMatches.length;
      }
    }

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth,
      anyUsage,
    };
  }

  /**
   * 查找代码质量问题
   */
  private async findIssues(): Promise<CodeQualityIssue[]> {
    const issues: CodeQualityIssue[] = [];
    const files = await this.getSourceFiles();

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const fileIssues = this.analyzeFileIssues(content, file);
      issues.push(...fileIssues);
    }

    return issues;
  }

  /**
   * 分析文件中的问题
   */
  private analyzeFileIssues(content: string, filePath: string): CodeQualityIssue[] {
    const issues: CodeQualityIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 检查长行
      if (line.length > 100) {
        issues.push({
          type: 'warning',
          category: 'style',
          severity: 'minor',
          file: filePath,
          line: lineNumber,
          column: 100,
          message: `Line too long (${line.length} characters)`,
          rule: 'max-line-length',
          suggestion: 'Break long lines into multiple lines',
        });
      }

      // 检查 console.log
      if (line.includes('console.log')) {
        issues.push({
          type: 'warning',
          category: 'style',
          severity: 'minor',
          file: filePath,
          line: lineNumber,
          column: line.indexOf('console.log'),
          message: 'Avoid using console.log in production code',
          rule: 'no-console',
          suggestion: 'Use proper logging library or remove debug statements',
        });
      }

      // 检查 any 类型
      if (line.includes(': any')) {
        issues.push({
          type: 'error',
          category: 'type-safety',
          severity: 'major',
          file: filePath,
          line: lineNumber,
          column: line.indexOf(': any'),
          message: 'Avoid using "any" type',
          rule: 'no-explicit-any',
          suggestion: 'Use specific types or interfaces',
        });
      }

      // 检查复杂的条件
      const conditionComplexity = (line.match(/&&|\|\|/g) || []).length;
      if (conditionComplexity > 3) {
        issues.push({
          type: 'warning',
          category: 'complexity',
          severity: 'major',
          file: filePath,
          line: lineNumber,
          column: 0,
          message: 'Complex conditional expression',
          rule: 'complexity',
          suggestion: 'Break complex conditions into separate variables or functions',
        });
      }

      // 检查深度嵌套
      const indentation = line.match(/^(\s*)/)?.[1]?.length || 0;
      if (indentation > 12) { // 超过3层嵌套
        issues.push({
          type: 'warning',
          category: 'complexity',
          severity: 'major',
          file: filePath,
          line: lineNumber,
          column: 0,
          message: 'Deep nesting detected',
          rule: 'max-depth',
          suggestion: 'Extract nested logic into separate functions',
        });
      }

      // 检查魔法数字
      const magicNumbers = line.match(/\b\d{2,}\b/g);
      if (magicNumbers && !line.includes('//') && !line.includes('const')) {
        issues.push({
          type: 'info',
          category: 'maintainability',
          severity: 'minor',
          file: filePath,
          line: lineNumber,
          column: 0,
          message: 'Magic number detected',
          rule: 'no-magic-numbers',
          suggestion: 'Extract numbers into named constants',
        });
      }
    }

    return issues;
  }

  /**
   * 计算代码质量评分
   */
  private calculateScore(metrics: CodeQualityMetrics, issues: CodeQualityIssue[]): number {
    let score = 100;

    // 复杂度扣分
    if (metrics.cyclomaticComplexity > 10) {
      score -= Math.min(20, (metrics.cyclomaticComplexity - 10) * 2);
    }

    if (metrics.cognitiveComplexity > 15) {
      score -= Math.min(15, (metrics.cognitiveComplexity - 15) * 1.5);
    }

    if (metrics.nestingDepth > 4) {
      score -= Math.min(10, (metrics.nestingDepth - 4) * 2.5);
    }

    // 类型安全扣分
    if (metrics.typeScriptCoverage < 95) {
      score -= (95 - metrics.typeScriptCoverage) * 0.5;
    }

    if (metrics.anyUsage > 0) {
      score -= Math.min(15, metrics.anyUsage * 2);
    }

    // 测试覆盖率扣分
    if (metrics.testCoverage < 80) {
      score -= (80 - metrics.testCoverage) * 0.3;
    }

    // 问题扣分
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    const minorIssues = issues.filter(i => i.severity === 'minor').length;

    score -= criticalIssues * 5;
    score -= majorIssues * 2;
    score -= minorIssues * 0.5;

    return Math.max(0, Math.round(score));
  }

  /**
   * 计算等级
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    metrics: CodeQualityMetrics,
    issues: CodeQualityIssue[],
  ): string[] {
    const recommendations: string[] = [];

    // 复杂度建议
    if (metrics.cyclomaticComplexity > 10) {
      recommendations.push('Reduce cyclomatic complexity by breaking down complex functions');
    }

    if (metrics.cognitiveComplexity > 15) {
      recommendations.push('Simplify logic to reduce cognitive complexity');
    }

    if (metrics.nestingDepth > 4) {
      recommendations.push('Reduce nesting depth by using early returns and guard clauses');
    }

    // 类型安全建议
    if (metrics.typeScriptCoverage < 95) {
      recommendations.push('Increase TypeScript coverage by converting JS files to TS');
    }

    if (metrics.anyUsage > 0) {
      recommendations.push('Replace "any" types with specific type definitions');
    }

    // 测试建议
    if (metrics.testCoverage < 80) {
      recommendations.push('Increase test coverage to at least 80%');
    }

    // 依赖建议
    if (metrics.circularDependencies > 0) {
      recommendations.push('Resolve circular dependencies to improve maintainability');
    }

    if (metrics.unusedDependencies > 0) {
      recommendations.push('Remove unused dependencies to reduce bundle size');
    }

    // 基于问题的建议
    const errorCount = issues.filter(i => i.type === 'error').length;
    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} linting errors`);
    }

    const warningCount = issues.filter(i => i.type === 'warning').length;
    if (warningCount > 10) {
      recommendations.push(`Address ${warningCount} linting warnings`);
    }

    return recommendations;
  }

  /**
   * 获取源文件列表
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // 检查是否应该排除此目录
          const shouldExclude = this.excludePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
            return regex.test(path.relative(this.projectRoot, fullPath));
          });

          if (!shouldExclude) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          // 检查文件扩展名
          if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            const shouldExclude = this.excludePatterns.some(pattern => {
              const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'));
              return regex.test(path.relative(this.projectRoot, fullPath));
            });

            if (!shouldExclude) {
              files.push(fullPath);
            }
          }
        }
      }
    };

    await scanDirectory(path.join(this.projectRoot, 'src'));
    return files;
  }

  /**
   * 辅助方法 - 计算可维护性指数
   */
  private calculateMaintainabilityIndex(complexity: number, lines: number): number {
    // 简化的可维护性指数计算
    const halsteadVolume = Math.log2(lines) * 10; // 简化的 Halstead 体积
    const mi = Math.max(0, 171 - 5.2 * Math.log(halsteadVolume) - 0.23 * complexity - 16.2 * Math.log(lines));
    return Math.round(mi);
  }

  /**
   * 辅助方法 - 计算技术债务
   */
  private calculateTechnicalDebt(complexity: number, anyUsage: number): number {
    // 简化的技术债务计算（小时）
    return Math.round((complexity - 5) * 0.5 + anyUsage * 0.25);
  }

  /**
   * 辅助方法 - 统计代码异味
   */
  private countCodeSmells(files: string[]): number {
    // 简化实现，基于文件数量和复杂度估算
    return Math.round(files.length * 0.1);
  }

  /**
   * 辅助方法 - 获取测试覆盖率
   */
  private async getTestCoverage(): Promise<number> {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(await fs.promises.readFile(coveragePath, 'utf-8'));
        return coverage.total?.lines?.pct || 0;
      }
    } catch (error) {
      console.warn('Could not read test coverage:', error);
    }
    return 0;
  }

  /**
   * 辅助方法 - 获取分支覆盖率
   */
  private async getBranchCoverage(): Promise<number> {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(await fs.promises.readFile(coveragePath, 'utf-8'));
        return coverage.total?.branches?.pct || 0;
      }
    } catch (error) {
      console.warn('Could not read branch coverage:', error);
    }
    return 0;
  }

  /**
   * 辅助方法 - 获取函数覆盖率
   */
  private async getFunctionCoverage(): Promise<number> {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(await fs.promises.readFile(coveragePath, 'utf-8'));
        return coverage.total?.functions?.pct || 0;
      }
    } catch (error) {
      console.warn('Could not read function coverage:', error);
    }
    return 0;
  }

  /**
   * 辅助方法 - 获取格式化问题
   */
  private async getFormattingIssues(): Promise<number> {
    // 简化实现，实际应该运行 Prettier 检查
    return 0;
  }

  /**
   * 辅助方法 - 获取依赖数量
   */
  private async getDependencyCount(): Promise<number> {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packagePath, 'utf-8'));
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      return deps.length + devDeps.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 辅助方法 - 获取循环依赖
   */
  private async getCircularDependencies(): Promise<number> {
    // 简化实现，实际需要分析 import 语句
    return 0;
  }

  /**
   * 辅助方法 - 获取未使用依赖
   */
  private async getUnusedDependencies(): Promise<number> {
    // 简化实现，实际需要分析代码中的 import 语句
    return 0;
  }

  /**
   * 辅助方法 - 计算趋势
   */
  private async calculateTrends(): Promise<{
    scoreChange: number;
    issueChange: number;
    coverageChange: number;
  }> {
    // 简化实现，实际需要历史数据
    return {
      scoreChange: 0,
      issueChange: 0,
      coverageChange: 0,
    };
  }

  /**
   * 生成详细报告
   */
  async generateDetailedReport(report: CodeQualityReport): Promise<string> {
    const timestamp = new Date().toISOString();

    let reportText = '# Code Quality Report\n\n';
    reportText += `**Generated:** ${timestamp}\n`;
    reportText += `**Score:** ${report.score}/100 (Grade: ${report.grade})\n\n`;

    // 指标摘要
    reportText += '## Metrics Summary\n\n';
    reportText += '| Metric | Value | Status |\n';
    reportText += '|--------|-------|--------|\n';
    reportText += `| Cyclomatic Complexity | ${report.metrics.cyclomaticComplexity.toFixed(1)} | ${report.metrics.cyclomaticComplexity <= 10 ? '✅' : '❌'} |\n`;
    reportText += `| Cognitive Complexity | ${report.metrics.cognitiveComplexity.toFixed(1)} | ${report.metrics.cognitiveComplexity <= 15 ? '✅' : '❌'} |\n`;
    reportText += `| TypeScript Coverage | ${report.metrics.typeScriptCoverage.toFixed(1)}% | ${report.metrics.typeScriptCoverage >= 95 ? '✅' : '❌'} |\n`;
    reportText += `| Test Coverage | ${report.metrics.testCoverage.toFixed(1)}% | ${report.metrics.testCoverage >= 80 ? '✅' : '❌'} |\n`;
    reportText += `| Any Usage | ${report.metrics.anyUsage} | ${report.metrics.anyUsage === 0 ? '✅' : '❌'} |\n\n`;

    // 问题统计
    const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
    const majorCount = report.issues.filter(i => i.severity === 'major').length;
    const minorCount = report.issues.filter(i => i.severity === 'minor').length;

    reportText += '## Issues Summary\n\n';
    reportText += `- **Critical:** ${criticalCount}\n`;
    reportText += `- **Major:** ${majorCount}\n`;
    reportText += `- **Minor:** ${minorCount}\n`;
    reportText += `- **Total:** ${report.issues.length}\n\n`;

    // 改进建议
    if (report.recommendations.length > 0) {
      reportText += '## Recommendations\n\n';
      report.recommendations.forEach((rec, index) => {
        reportText += `${index + 1}. ${rec}\n`;
      });
      reportText += '\n';
    }

    // 详细问题列表
    if (report.issues.length > 0) {
      reportText += '## Detailed Issues\n\n';

      const groupedIssues = report.issues.reduce((groups, issue) => {
        const key = issue.severity;
        if (!groups[key]) groups[key] = [];
        groups[key].push(issue);
        return groups;
      }, {} as Record<string, CodeQualityIssue[]>);

      ['critical', 'major', 'minor'].forEach(severity => {
        const issues = groupedIssues[severity];
        if (issues && issues.length > 0) {
          reportText += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Issues\n\n`;
          issues.forEach(issue => {
            reportText += `- **${issue.file}:${issue.line}** - ${issue.message}\n`;
            if (issue.suggestion) {
              reportText += `  *Suggestion: ${issue.suggestion}*\n`;
            }
          });
          reportText += '\n';
        }
      });
    }

    return reportText;
  }
}
