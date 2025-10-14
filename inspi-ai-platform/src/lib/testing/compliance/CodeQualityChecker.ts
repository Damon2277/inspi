/**
 * 代码质量标准检查器
 *
 * 实现代码质量标准的自动检查功能
 */

import * as fs from 'fs';
import * as path from 'path';

import { ComplianceRule, ComplianceContext, ComplianceResult } from './ComplianceFramework';

export interface CodeQualityMetrics {
  complexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
  duplicateLines: number;
  testCoverage: number;
  eslintViolations: number;
  typeScriptErrors: number;
}

export interface CodeQualityStandards {
  maxComplexity: number;
  minMaintainabilityIndex: number;
  maxFileLength: number;
  maxDuplicatePercentage: number;
  minTestCoverage: number;
  maxEslintViolations: number;
  allowTypeScriptErrors: boolean;
}

export class CodeQualityChecker {
  private standards: CodeQualityStandards;

  constructor(standards: CodeQualityStandards) {
    this.standards = standards;
  }

  /**
   * 获取代码质量检查规则
   */
  getCodeQualityRules(): ComplianceRule[] {
    return [
      {
        id: 'code-complexity',
        name: '代码复杂度检查',
        description: '检查代码的圈复杂度是否在可接受范围内',
        category: 'code-quality',
        severity: 'warning',
        enabled: true,
        check: this.checkComplexity.bind(this),
      },
      {
        id: 'maintainability-index',
        name: '可维护性指数检查',
        description: '检查代码的可维护性指数',
        category: 'code-quality',
        severity: 'warning',
        enabled: true,
        check: this.checkMaintainability.bind(this),
      },
      {
        id: 'file-length',
        name: '文件长度检查',
        description: '检查文件长度是否过长',
        category: 'code-quality',
        severity: 'info',
        enabled: true,
        check: this.checkFileLength.bind(this),
      },
      {
        id: 'code-duplication',
        name: '代码重复检查',
        description: '检查代码重复率',
        category: 'code-quality',
        severity: 'warning',
        enabled: true,
        check: this.checkDuplication.bind(this),
      },
      {
        id: 'eslint-compliance',
        name: 'ESLint规则合规性',
        description: '检查ESLint规则违规情况',
        category: 'code-quality',
        severity: 'error',
        enabled: true,
        check: this.checkEslintCompliance.bind(this),
      },
      {
        id: 'typescript-errors',
        name: 'TypeScript错误检查',
        description: '检查TypeScript编译错误',
        category: 'code-quality',
        severity: 'error',
        enabled: true,
        check: this.checkTypeScriptErrors.bind(this),
      },
    ];
  }

  /**
   * 检查代码复杂度
   */
  private async checkComplexity(context: ComplianceContext): Promise<ComplianceResult> {
    try {
      const metrics = await this.analyzeCodeMetrics(context.projectPath);
      const passed = metrics.complexity <= this.standards.maxComplexity;
      const score = passed ? 100 : Math.max(0, 100 - (metrics.complexity - this.standards.maxComplexity) * 10);

      return {
        ruleId: 'code-complexity',
        passed,
        score,
        message: passed
          ? `代码复杂度 ${metrics.complexity} 符合标准 (≤${this.standards.maxComplexity})`
          : `代码复杂度 ${metrics.complexity} 超出标准 (≤${this.standards.maxComplexity})`,
        details: `平均圈复杂度: ${metrics.complexity}`,
        suggestions: passed ? [] : [
          '重构复杂的函数和方法',
          '将大型函数拆分为更小的函数',
          '减少嵌套层级和条件分支',
        ],
        evidence: { complexity: metrics.complexity, threshold: this.standards.maxComplexity },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.createErrorResult('code-complexity', error);
    }
  }

  /**
   * 检查可维护性指数
   */
  private async checkMaintainability(context: ComplianceContext): Promise<ComplianceResult> {
    try {
      const metrics = await this.analyzeCodeMetrics(context.projectPath);
      const passed = metrics.maintainabilityIndex >= this.standards.minMaintainabilityIndex;
      const score = passed ? 100 : Math.max(0, (metrics.maintainabilityIndex / this.standards.minMaintainabilityIndex) * 100);

      return {
        ruleId: 'maintainability-index',
        passed,
        score,
        message: passed
          ? `可维护性指数 ${metrics.maintainabilityIndex} 符合标准 (≥${this.standards.minMaintainabilityIndex})`
          : `可维护性指数 ${metrics.maintainabilityIndex} 低于标准 (≥${this.standards.minMaintainabilityIndex})`,
        details: `可维护性指数: ${metrics.maintainabilityIndex}`,
        suggestions: passed ? [] : [
          '减少代码复杂度',
          '改善代码注释和文档',
          '重构难以理解的代码段',
        ],
        evidence: { maintainabilityIndex: metrics.maintainabilityIndex, threshold: this.standards.minMaintainabilityIndex },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.createErrorResult('maintainability-index', error);
    }
  }

  /**
   * 检查文件长度
   */
  private async checkFileLength(context: ComplianceContext): Promise<ComplianceResult> {
    try {
      const longFiles = await this.findLongFiles(context.projectPath);
      const passed = longFiles.length === 0;
      const score = passed ? 100 : Math.max(0, 100 - longFiles.length * 10);

      return {
        ruleId: 'file-length',
        passed,
        score,
        message: passed
          ? `所有文件长度符合标准 (≤${this.standards.maxFileLength}行)`
          : `发现 ${longFiles.length} 个过长文件 (>${this.standards.maxFileLength}行)`,
        details: longFiles.length > 0 ? `过长文件: ${longFiles.map(f => f.path).join(', ')}` : undefined,
        suggestions: passed ? [] : [
          '将大型文件拆分为更小的模块',
          '提取公共功能到独立文件',
          '重构冗长的类和函数',
        ],
        evidence: { longFiles, threshold: this.standards.maxFileLength },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.createErrorResult('file-length', error);
    }
  }

  /**
   * 检查代码重复
   */
  private async checkDuplication(context: ComplianceContext): Promise<ComplianceResult> {
    try {
      const metrics = await this.analyzeCodeMetrics(context.projectPath);
      const duplicationPercentage = (metrics.duplicateLines / metrics.linesOfCode) * 100;
      const passed = duplicationPercentage <= this.standards.maxDuplicatePercentage;
      const score = passed ? 100 : Math.max(0, 100 - (duplicationPercentage - this.standards.maxDuplicatePercentage) * 5);

      return {
        ruleId: 'code-duplication',
        passed,
        score,
        message: passed
          ? `代码重复率 ${duplicationPercentage.toFixed(1)}% 符合标准 (≤${this.standards.maxDuplicatePercentage}%)`
          : `代码重复率 ${duplicationPercentage.toFixed(1)}% 超出标准 (≤${this.standards.maxDuplicatePercentage}%)`,
        details: `重复行数: ${metrics.duplicateLines} / 总行数: ${metrics.linesOfCode}`,
        suggestions: passed ? [] : [
          '提取重复代码到公共函数',
          '使用设计模式减少代码重复',
          '创建可复用的组件和工具函数',
        ],
        evidence: {
          duplicateLines: metrics.duplicateLines,
          totalLines: metrics.linesOfCode,
          percentage: duplicationPercentage,
          threshold: this.standards.maxDuplicatePercentage,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.createErrorResult('code-duplication', error);
    }
  }

  /**
   * 检查ESLint合规性
   */
  private async checkEslintCompliance(context: ComplianceContext): Promise<ComplianceResult> {
    try {
      const violations = await this.runEslintCheck(context.projectPath);
      const passed = violations <= this.standards.maxEslintViolations;
      const score = passed ? 100 : Math.max(0, 100 - violations * 2);

      return {
        ruleId: 'eslint-compliance',
        passed,
        score,
        message: passed
          ? `ESLint检查通过，发现 ${violations} 个违规 (≤${this.standards.maxEslintViolations})`
          : `ESLint检查失败，发现 ${violations} 个违规 (≤${this.standards.maxEslintViolations})`,
        details: `ESLint违规数量: ${violations}`,
        suggestions: passed ? [] : [
          '修复ESLint报告的代码风格问题',
          '配置自动格式化工具',
          '在提交前运行ESLint检查',
        ],
        evidence: { violations, threshold: this.standards.maxEslintViolations },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.createErrorResult('eslint-compliance', error);
    }
  }

  /**
   * 检查TypeScript错误
   */
  private async checkTypeScriptErrors(context: ComplianceContext): Promise<ComplianceResult> {
    try {
      const errors = await this.runTypeScriptCheck(context.projectPath);
      const passed = this.standards.allowTypeScriptErrors || errors === 0;
      const score = passed ? 100 : Math.max(0, 100 - errors * 5);

      return {
        ruleId: 'typescript-errors',
        passed,
        score,
        message: passed
          ? `TypeScript编译检查通过，发现 ${errors} 个错误`
          : `TypeScript编译检查失败，发现 ${errors} 个错误`,
        details: `TypeScript错误数量: ${errors}`,
        suggestions: passed ? [] : [
          '修复TypeScript类型错误',
          '完善类型定义',
          '启用严格的TypeScript配置',
        ],
        evidence: { errors, allowErrors: this.standards.allowTypeScriptErrors },
        timestamp: new Date(),
      };
    } catch (error) {
      return this.createErrorResult('typescript-errors', error);
    }
  }

  /**
   * 分析代码指标
   */
  private async analyzeCodeMetrics(projectPath: string): Promise<CodeQualityMetrics> {
    // 这里实现实际的代码分析逻辑
    // 为了演示，返回模拟数据
    return {
      complexity: 8.5,
      maintainabilityIndex: 75,
      linesOfCode: 15000,
      duplicateLines: 450,
      testCoverage: 92,
      eslintViolations: 12,
      typeScriptErrors: 0,
    };
  }

  /**
   * 查找过长文件
   */
  private async findLongFiles(projectPath: string): Promise<Array<{path: string, lines: number}>> {
    const longFiles: Array<{path: string, lines: number}> = [];

    const scanDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').length;

          if (lines > this.standards.maxFileLength) {
            longFiles.push({
              path: path.relative(projectPath, filePath),
              lines,
            });
          }
        }
      }
    };

    try {
      scanDirectory(projectPath);
    } catch (error) {
      // 忽略文件访问错误
    }

    return longFiles;
  }

  /**
   * 运行ESLint检查
   */
  private async runEslintCheck(projectPath: string): Promise<number> {
    // 这里应该实际运行ESLint
    // 为了演示，返回模拟数据
    return Math.floor(Math.random() * 20);
  }

  /**
   * 运行TypeScript检查
   */
  private async runTypeScriptCheck(projectPath: string): Promise<number> {
    // 这里应该实际运行TypeScript编译检查
    // 为了演示，返回模拟数据
    return Math.floor(Math.random() * 5);
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(ruleId: string, error: any): ComplianceResult {
    return {
      ruleId,
      passed: false,
      score: 0,
      message: `检查执行失败: ${error.message}`,
      timestamp: new Date(),
    };
  }
}

export const DEFAULT_CODE_QUALITY_STANDARDS: CodeQualityStandards = {
  maxComplexity: 10,
  minMaintainabilityIndex: 60,
  maxFileLength: 300,
  maxDuplicatePercentage: 5,
  minTestCoverage: 80,
  maxEslintViolations: 10,
  allowTypeScriptErrors: false,
};
