/**
 * 代码质量管理模块入口
 * 导出所有代码质量相关的工具和服务
 */

import React from 'react';

// 代码质量检查
export type {
  CodeQualityMetrics,
  CodeQualityIssue,
  CodeQualityReport,
} from './code-quality-checker';

// 代码审查自动化
export type {
  CodeReviewRule,
  CodeReviewResult,
  CodeReviewReport,
} from './code-review-automation';

// 类型安全增强
export type {
  TypeSafetyMetrics,
  TypeSafetyIssue,
  RuntimeTypeValidator,
  TypeSchema,
} from './type-safety-enhancer';

// 代码重构
export type {
  RefactoringSuggestion,
  ComplexityAnalysis,
  RefactoringReport,
} from './code-refactoring';

import { CodeQualityChecker } from './code-quality-checker';
import { CodeRefactoring } from './code-refactoring';
import { CodeReviewAutomation } from './code-review-automation';
import { TypeSafetyEnhancer } from './type-safety-enhancer';

export {
  CodeQualityChecker,
  CodeReviewAutomation,
  TypeSafetyEnhancer,
  CodeRefactoring,
};

/**
 * 代码质量配置
 */
export interface CodeQualityConfig {
  // 质量检查配置
  qualityCheck: {
    enabled: boolean;
    thresholds: {
      complexity: number;
      maintainability: number;
      coverage: number;
    };
  };

  // 代码审查配置
  codeReview: {
    enabled: boolean;
    autoFix: boolean;
    rules: string[];
  };

  // 类型安全配置
  typeSafety: {
    enabled: boolean;
    strictMode: boolean;
    runtimeValidation: boolean;
  };

  // 重构配置
  refactoring: {
    enabled: boolean;
    autoApply: boolean;
    complexityThreshold: number;
  };
}

/**
 * 默认代码质量配置
 */
export const defaultQualityConfig: CodeQualityConfig = {
  qualityCheck: {
    enabled: true,
    thresholds: {
      complexity: 10,
      maintainability: 70,
      coverage: 80,
    },
  },
  codeReview: {
    enabled: true,
    autoFix: false,
    rules: ['no-console', 'prefer-const', 'no-var'],
  },
  typeSafety: {
    enabled: true,
    strictMode: true,
    runtimeValidation: false,
  },
  refactoring: {
    enabled: true,
    autoApply: false,
    complexityThreshold: 15,
  },
};

/**
 * 代码质量管理器
 */
export class CodeQualityManager {
  private static instance: CodeQualityManager;
  private config: CodeQualityConfig;
  private projectRoot: string;

  private qualityChecker: CodeQualityChecker;
  private reviewAutomation: CodeReviewAutomation;
  private typeSafetyEnhancer: TypeSafetyEnhancer;
  private codeRefactoring: CodeRefactoring;

  constructor(projectRoot: string, config: Partial<CodeQualityConfig> = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...defaultQualityConfig, ...config };

    this.qualityChecker = new CodeQualityChecker(projectRoot);
    this.reviewAutomation = new CodeReviewAutomation();
    this.typeSafetyEnhancer = new TypeSafetyEnhancer(projectRoot);
    this.codeRefactoring = new CodeRefactoring(projectRoot);
  }

  static getInstance(
    projectRoot?: string,
    config?: Partial<CodeQualityConfig>,
  ): CodeQualityManager {
    if (!this.instance && projectRoot) {
      this.instance = new CodeQualityManager(projectRoot, config);
    }
    return this.instance;
  }

  /**
   * 执行完整的代码质量分析
   */
  async runFullAnalysis(): Promise<{
    qualityReport: any;
    reviewReport: any;
    typeSafetyReport: any;
    refactoringReport: any;
    overallScore: number;
    recommendations: string[];
  }> {
    console.log('🚀 Starting comprehensive code quality analysis...');

    const results = await Promise.allSettled([
      this.config.qualityCheck.enabled ? this.qualityChecker.checkQuality() : null,
      this.config.codeReview.enabled ? this.runCodeReview() : null,
      this.config.typeSafety.enabled ? this.typeSafetyEnhancer.analyzeTypeSafety() : null,
      this.config.refactoring.enabled ? this.codeRefactoring.analyzeAndSuggest() : null,
    ]);

    const [qualityResult, reviewResult, typeSafetyResult, refactoringResult] = results;

    const qualityReport = qualityResult.status === 'fulfilled' ? qualityResult.value : null;
    const reviewReport = reviewResult.status === 'fulfilled' ? reviewResult.value : null;
    const typeSafetyReport = typeSafetyResult.status === 'fulfilled' ? typeSafetyResult.value : null;
    const refactoringReport = refactoringResult.status === 'fulfilled' ? refactoringResult.value : null;

    const overallScore = this.calculateOverallScore({
      qualityReport,
      reviewReport,
      typeSafetyReport,
      refactoringReport,
    });

    const recommendations = this.generateOverallRecommendations({
      qualityReport,
      reviewReport,
      typeSafetyReport,
      refactoringReport,
    });

    console.log(`✅ Code quality analysis complete. Overall score: ${overallScore}/100`);

    return {
      qualityReport,
      reviewReport,
      typeSafetyReport,
      refactoringReport,
      overallScore,
      recommendations,
    };
  }

  /**
   * 运行代码审查
   */
  private async runCodeReview() {
    const files = await this.getSourceFiles();
    const fileContents = await Promise.all(
      files.map(async (file) => ({
        path: file,
        content: await require('fs').promises.readFile(file, 'utf-8'),
      })),
    );

    return this.reviewAutomation.reviewFiles(fileContents);
  }

  /**
   * 自动修复代码问题
   */
  async autoFix(): Promise<{
    qualityFixes: number;
    reviewFixes: number;
    refactoringFixes: number;
    totalFixes: number;
  }> {
    console.log('🔧 Starting automatic code fixes...');

    const qualityFixes = 0;
    let reviewFixes = 0;
    let refactoringFixes = 0;

    // 自动修复代码审查问题
    if (this.config.codeReview.enabled && this.config.codeReview.autoFix) {
      const reviewReport = await this.runCodeReview();
      const autoFixResult = await this.reviewAutomation.autoFix(
        reviewReport.results[0]?.file || '',
        '',
      );
      reviewFixes = autoFixResult.fixedIssues;
    }

    // 自动应用重构建议
    if (this.config.refactoring.enabled && this.config.refactoring.autoApply) {
      const refactoringReport = await this.codeRefactoring.analyzeAndSuggest();
      const autoRefactorResult = await this.codeRefactoring.applyAutoRefactoring(
        refactoringReport.suggestions,
      );
      refactoringFixes = autoRefactorResult.appliedCount;
    }

    const totalFixes = qualityFixes + reviewFixes + refactoringFixes;

    console.log(`✅ Applied ${totalFixes} automatic fixes`);

    return {
      qualityFixes,
      reviewFixes,
      refactoringFixes,
      totalFixes,
    };
  }

  /**
   * 生成质量报告
   */
  async generateQualityReport(): Promise<string> {
    const analysis = await this.runFullAnalysis();

    let report = '# Code Quality Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Overall Score:** ${analysis.overallScore}/100\n\n`;

    // 质量检查报告
    if (analysis.qualityReport) {
      report += '## Code Quality Analysis\n\n';
      report += `**Score:** ${analysis.qualityReport.score}/100 (${analysis.qualityReport.grade})\n\n`;

      if (analysis.qualityReport.recommendations.length > 0) {
        report += '### Quality Recommendations\n\n';
        analysis.qualityReport.recommendations.forEach((rec: string, index: number) => {
          report += `${index + 1}. ${rec}\n`;
        });
        report += '\n';
      }
    }

    // 代码审查报告
    if (analysis.reviewReport) {
      report += '## Code Review Analysis\n\n';
      report += `**Issues Found:** ${analysis.reviewReport.summary.issuesFound}\n`;
      report += `**Auto-fixable:** ${analysis.reviewReport.summary.autoFixableIssues}\n\n`;
    }

    // 类型安全报告
    if (analysis.typeSafetyReport) {
      report += '## Type Safety Analysis\n\n';
      report += `**TypeScript Coverage:** ${analysis.typeSafetyReport.metrics.typeScriptCoverage.toFixed(1)}%\n`;
      report += `**Any Usage:** ${analysis.typeSafetyReport.metrics.anyUsage}\n\n`;
    }

    // 重构建议报告
    if (analysis.refactoringReport) {
      report += '## Refactoring Analysis\n\n';
      report += `**Suggestions:** ${analysis.refactoringReport.summary.suggestionsFound}\n`;
      report += `**Complexity Reduction:** ${analysis.refactoringReport.summary.complexityReduction}\n\n`;
    }

    // 总体建议
    if (analysis.recommendations.length > 0) {
      report += '## Overall Recommendations\n\n';
      analysis.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    return report;
  }

  /**
   * 计算总体评分
   */
  private calculateOverallScore(reports: any): number {
    let totalScore = 0;
    let reportCount = 0;

    if (reports.qualityReport) {
      totalScore += reports.qualityReport.score;
      reportCount++;
    }

    if (reports.reviewReport) {
      const reviewScore = Math.max(0, 100 - reports.reviewReport.summary.issuesFound * 2);
      totalScore += reviewScore;
      reportCount++;
    }

    if (reports.typeSafetyReport) {
      const typeScore = Math.max(0, reports.typeSafetyReport.metrics.typeScriptCoverage -
                                    reports.typeSafetyReport.metrics.anyUsage * 2);
      totalScore += typeScore;
      reportCount++;
    }

    if (reports.refactoringReport) {
      const refactorScore = Math.max(0, 100 - reports.refactoringReport.summary.suggestionsFound);
      totalScore += refactorScore;
      reportCount++;
    }

    return reportCount > 0 ? Math.round(totalScore / reportCount) : 0;
  }

  /**
   * 生成总体建议
   */
  private generateOverallRecommendations(reports: any): string[] {
    const recommendations: string[] = [];

    if (reports.qualityReport?.score < 80) {
      recommendations.push('Improve overall code quality score to 80+');
    }

    if (reports.reviewReport?.summary.issuesFound > 20) {
      recommendations.push('Address code review issues to improve maintainability');
    }

    if (reports.typeSafetyReport?.metrics.typeScriptCoverage < 95) {
      recommendations.push('Increase TypeScript coverage to 95%+');
    }

    if (reports.typeSafetyReport?.metrics.anyUsage > 0) {
      recommendations.push('Eliminate "any" type usage for better type safety');
    }

    if (reports.refactoringReport?.summary.suggestionsFound > 10) {
      recommendations.push('Apply refactoring suggestions to reduce complexity');
    }

    // 自动修复建议
    const autoFixableIssues = (reports.reviewReport?.summary.autoFixableIssues || 0) +
                             (reports.refactoringReport?.summary.autoApplicable || 0);

    if (autoFixableIssues > 0) {
      recommendations.push(`${autoFixableIssues} issues can be automatically fixed`);
    }

    return recommendations;
  }

  /**
   * 获取源文件列表
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const fs = require('fs');
    const path = require('path');

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !this.shouldExcludeDirectory(entry.name)) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && this.isSourceFile(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    await scanDirectory(path.join(this.projectRoot, 'src'));
    return files;
  }

  private shouldExcludeDirectory(name: string): boolean {
    const excludeDirs = ['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__'];
    return excludeDirs.includes(name);
  }

  private isSourceFile(name: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(name) && !name.includes('.test.') && !name.includes('.spec.');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CodeQualityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): CodeQualityConfig {
    return { ...this.config };
  }
}

/**
 * React Hook for code quality management
 */
export function useCodeQuality(projectRoot: string) {
  const [manager] = React.useState(() => CodeQualityManager.getInstance(projectRoot));
  const [analysis, setAnalysis] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const runAnalysis = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await manager.runFullAnalysis();
      setAnalysis(result);
    } catch (error) {
      console.error('Code quality analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const applyAutoFix = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await manager.autoFix();
      console.log('Auto-fix applied:', result);
      // 重新运行分析
      await runAnalysis();
    } catch (error) {
      console.error('Auto-fix failed:', error);
    } finally {
      setLoading(false);
    }
  }, [manager, runAnalysis]);

  return {
    manager,
    analysis,
    loading,
    runAnalysis,
    applyAutoFix,
  };
}

/**
 * 代码质量工具函数
 */
export const qualityUtils = {
  /**
   * 计算代码质量等级
   */
  calculateGrade: (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  },

  /**
   * 格式化复杂度分数
   */
  formatComplexity: (complexity: number): string => {
    if (complexity <= 5) return 'Low';
    if (complexity <= 10) return 'Medium';
    if (complexity <= 20) return 'High';
    return 'Very High';
  },

  /**
   * 计算改进百分比
   */
  calculateImprovement: (before: number, after: number): number => {
    if (before === 0) return 0;
    return Math.round(((before - after) / before) * 100);
  },

  /**
   * 生成质量徽章
   */
  generateQualityBadge: (score: number): string => {
    const grade = qualityUtils.calculateGrade(score);
    const color = {
      'A': 'brightgreen',
      'B': 'green',
      'C': 'yellow',
      'D': 'orange',
      'F': 'red',
    }[grade];

    return `https://img.shields.io/badge/Code%20Quality-${grade}%20(${score}%25)-${color}`;
  },
};
