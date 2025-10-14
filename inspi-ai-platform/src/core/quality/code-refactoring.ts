/**
 * 代码重构优化工具
 * 提供自动化代码重构、复杂度降低和可维护性提升
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 重构建议
 */
export interface RefactoringSuggestion {
  id: string;
  type: 'extract-function' | 'extract-variable' | 'simplify-condition' | 'remove-duplication' | 'split-class';
  severity: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column: number;
  description: string;
  before: string;
  after: string;
  impact: {
    complexity: number;
    maintainability: number;
    readability: number;
  };
  autoApplicable: boolean;
}

/**
 * 代码复杂度分析
 */
export interface ComplexityAnalysis {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  functionLength: number;
  parameterCount: number;
  duplicatedLines: number;
}

/**
 * 重构报告
 */
export interface RefactoringReport {
  summary: {
    filesAnalyzed: number;
    suggestionsFound: number;
    autoApplicable: number;
    complexityReduction: number;
  };
  suggestions: RefactoringSuggestion[];
  metrics: {
    beforeComplexity: number;
    afterComplexity: number;
    improvementPercentage: number;
  };
}

/**
 * 代码重构器
 */
export class CodeRefactoring {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 分析代码并生成重构建议
   */
  async analyzeAndSuggest(): Promise<RefactoringReport> {
    console.log('🔧 Analyzing code for refactoring opportunities...');

    const files = await this.getSourceFiles();
    const suggestions: RefactoringSuggestion[] = [];
    let totalComplexityBefore = 0;
    let totalComplexityAfter = 0;

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const analysis = this.analyzeComplexity(content);
      const fileSuggestions = this.generateSuggestions(content, file, analysis);

      suggestions.push(...fileSuggestions);
      totalComplexityBefore += analysis.cyclomaticComplexity;

      // 计算应用建议后的复杂度
      const potentialReduction = fileSuggestions.reduce(
        (sum, s) => sum + s.impact.complexity, 0,
      );
      totalComplexityAfter += Math.max(1, analysis.cyclomaticComplexity - potentialReduction);
    }

    const autoApplicable = suggestions.filter(s => s.autoApplicable).length;
    const improvementPercentage = totalComplexityBefore > 0
      ? ((totalComplexityBefore - totalComplexityAfter) / totalComplexityBefore) * 100
      : 0;

    console.log(`✅ Found ${suggestions.length} refactoring opportunities`);

    return {
      summary: {
        filesAnalyzed: files.length,
        suggestionsFound: suggestions.length,
        autoApplicable,
        complexityReduction: totalComplexityBefore - totalComplexityAfter,
      },
      suggestions,
      metrics: {
        beforeComplexity: totalComplexityBefore,
        afterComplexity: totalComplexityAfter,
        improvementPercentage,
      },
    };
  }

  /**
   * 分析代码复杂度
   */
  private analyzeComplexity(content: string): ComplexityAnalysis {
    const lines = content.split('\n');
    let cyclomaticComplexity = 1;
    let cognitiveComplexity = 0;
    let nestingDepth = 0;
    let currentNesting = 0;
    let maxFunctionLength = 0;
    let currentFunctionLength = 0;
    let maxParameterCount = 0;
    let duplicatedLines = 0;
    let inFunction = false;

    // 复杂度关键词
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'];
    const cognitiveKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch'];

    // 用于检测重复代码
    const lineHashes = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跟踪函数
      if (line.match(/function\s+\w+|=>\s*{|^\s*\w+\s*\(/)) {
        inFunction = true;
        currentFunctionLength = 0;

        // 计算参数数量
        const paramMatch = line.match(/\(([^)]*)\)/);
        if (paramMatch) {
          const params = paramMatch[1].split(',').filter(p => p.trim());
          maxParameterCount = Math.max(maxParameterCount, params.length);
        }
      }

      if (inFunction) {
        currentFunctionLength++;
        if (line === '}' && currentNesting === 0) {
          inFunction = false;
          maxFunctionLength = Math.max(maxFunctionLength, currentFunctionLength);
        }
      }

      // 计算圈复杂度
      complexityKeywords.forEach(keyword => {
        if (line.includes(keyword)) {
          cyclomaticComplexity++;
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

      // 检测重复行
      if (line.length > 10) { // 忽略太短的行
        const hash = this.hashLine(line);
        const count = lineHashes.get(hash) || 0;
        lineHashes.set(hash, count + 1);
        if (count > 0) {
          duplicatedLines++;
        }
      }
    }

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth,
      functionLength: maxFunctionLength,
      parameterCount: maxParameterCount,
      duplicatedLines,
    };
  }

  /**
   * 生成重构建议
   */
  private generateSuggestions(
    content: string,
    filePath: string,
    analysis: ComplexityAnalysis,
  ): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];
    const lines = content.split('\n');

    // 检查长函数
    if (analysis.functionLength > 50) {
      suggestions.push({
        id: `extract-function-${filePath}`,
        type: 'extract-function',
        severity: 'high',
        file: filePath,
        line: 1,
        column: 1,
        description: `Function is too long (${analysis.functionLength} lines). Consider breaking it down.`,
        before: 'Long function with multiple responsibilities',
        after: 'Multiple smaller, focused functions',
        impact: {
          complexity: -5,
          maintainability: 8,
          readability: 7,
        },
        autoApplicable: false,
      });
    }

    // 检查复杂条件
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const conditionComplexity = (line.match(/&&|\|\|/g) || []).length;

      if (conditionComplexity > 3) {
        suggestions.push({
          id: `simplify-condition-${filePath}-${i}`,
          type: 'simplify-condition',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          column: 1,
          description: 'Complex conditional expression detected',
          before: line.trim(),
          after: this.simplifyCondition(line),
          impact: {
            complexity: -2,
            maintainability: 5,
            readability: 6,
          },
          autoApplicable: true,
        });
      }

      // 检查魔法数字
      const magicNumbers = line.match(/\b\d{2,}\b/g);
      if (magicNumbers && !line.includes('//') && !line.includes('const')) {
        suggestions.push({
          id: `extract-variable-${filePath}-${i}`,
          type: 'extract-variable',
          severity: 'low',
          file: filePath,
          line: i + 1,
          column: line.indexOf(magicNumbers[0]) + 1,
          description: 'Magic number should be extracted to a named constant',
          before: line.trim(),
          after: this.extractMagicNumber(line, magicNumbers[0]),
          impact: {
            complexity: 0,
            maintainability: 3,
            readability: 4,
          },
          autoApplicable: true,
        });
      }

      // 检查深度嵌套
      const indentation = line.match(/^(\s*)/)?.[1]?.length || 0;
      if (indentation > 16) { // 超过4层嵌套
        suggestions.push({
          id: `extract-function-nested-${filePath}-${i}`,
          type: 'extract-function',
          severity: 'high',
          file: filePath,
          line: i + 1,
          column: 1,
          description: 'Deep nesting detected. Consider extracting nested logic.',
          before: 'Deeply nested code block',
          after: 'Extracted function with clear responsibility',
          impact: {
            complexity: -3,
            maintainability: 6,
            readability: 7,
          },
          autoApplicable: false,
        });
      }
    }

    // 检查重复代码
    if (analysis.duplicatedLines > 5) {
      suggestions.push({
        id: `remove-duplication-${filePath}`,
        type: 'remove-duplication',
        severity: 'medium',
        file: filePath,
        line: 1,
        column: 1,
        description: `${analysis.duplicatedLines} duplicated lines detected`,
        before: 'Duplicated code blocks',
        after: 'Extracted common functionality',
        impact: {
          complexity: -2,
          maintainability: 7,
          readability: 5,
        },
        autoApplicable: false,
      });
    }

    // 检查参数过多
    if (analysis.parameterCount > 5) {
      suggestions.push({
        id: `extract-parameter-object-${filePath}`,
        type: 'extract-function',
        severity: 'medium',
        file: filePath,
        line: 1,
        column: 1,
        description: `Function has too many parameters (${analysis.parameterCount})`,
        before: 'Function with many individual parameters',
        after: 'Function with parameter object or builder pattern',
        impact: {
          complexity: -1,
          maintainability: 5,
          readability: 6,
        },
        autoApplicable: false,
      });
    }

    return suggestions;
  }

  /**
   * 应用自动重构
   */
  async applyAutoRefactoring(suggestions: RefactoringSuggestion[]): Promise<{
    appliedCount: number;
    results: Array<{ file: string; changes: number }>;
  }> {
    const results: Array<{ file: string; changes: number }> = [];
    let appliedCount = 0;

    // 按文件分组建议
    const suggestionsByFile = suggestions
      .filter(s => s.autoApplicable)
      .reduce((groups, suggestion) => {
        if (!groups[suggestion.file]) {
          groups[suggestion.file] = [];
        }
        groups[suggestion.file].push(suggestion);
        return groups;
      }, {} as Record<string, RefactoringSuggestion[]>);

    for (const [filePath, fileSuggestions] of Object.entries(suggestionsByFile)) {
      try {
        let content = await fs.promises.readFile(filePath, 'utf-8');
        let changes = 0;

        // 按行号倒序排列，避免行号偏移问题
        const sortedSuggestions = fileSuggestions.sort((a, b) => b.line - a.line);

        for (const suggestion of sortedSuggestions) {
          const newContent = this.applySuggestion(content, suggestion);
          if (newContent !== content) {
            content = newContent;
            changes++;
            appliedCount++;
          }
        }

        if (changes > 0) {
          await fs.promises.writeFile(filePath, content, 'utf-8');
          results.push({ file: filePath, changes });
        }
      } catch (error) {
        console.error(`Failed to apply refactoring to ${filePath}:`, error);
      }
    }

    return { appliedCount, results };
  }

  /**
   * 应用单个建议
   */
  private applySuggestion(content: string, suggestion: RefactoringSuggestion): string {
    const lines = content.split('\n');
    const lineIndex = suggestion.line - 1;

    if (lineIndex < 0 || lineIndex >= lines.length) {
      return content;
    }

    switch (suggestion.type) {
      case 'simplify-condition':
        lines[lineIndex] = this.simplifyCondition(lines[lineIndex]);
        break;

      case 'extract-variable':
        const magicNumber = lines[lineIndex].match(/\b\d{2,}\b/)?.[0];
        if (magicNumber) {
          lines[lineIndex] = this.extractMagicNumber(lines[lineIndex], magicNumber);
        }
        break;

      default:
        // 其他类型的重构需要更复杂的逻辑
        break;
    }

    return lines.join('\n');
  }

  /**
   * 简化复杂条件
   */
  private simplifyCondition(line: string): string {
    // 简化实现：将复杂条件分解为多个变量
    const indent = line.match(/^(\s*)/)?.[1] || '';
    const condition = line.trim();

    if (condition.includes('&&') || condition.includes('||')) {
      const parts = condition.split(/&&|\|\|/);
      if (parts.length > 3) {
        return `${indent}// TODO: Extract complex condition into separate variables\n${line}`;
      }
    }

    return line;
  }

  /**
   * 提取魔法数字
   */
  private extractMagicNumber(line: string, magicNumber: string): string {
    const constantName = `CONSTANT_${magicNumber}`;
    const indent = line.match(/^(\s*)/)?.[1] || '';

    return `${indent}const ${constantName} = ${magicNumber};\n${line.replace(magicNumber, constantName)}`;
  }

  /**
   * 检测代码异味
   */
  async detectCodeSmells(): Promise<Array<{
    type: string;
    description: string;
    file: string;
    line: number;
    severity: 'high' | 'medium' | 'low';
  }>> {
    const files = await this.getSourceFiles();
    const smells: Array<{
      type: string;
      description: string;
      file: string;
      line: number;
      severity: 'high' | 'medium' | 'low';
    }> = [];

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf-8');
      const fileSmells = this.analyzeCodeSmells(content, file);
      smells.push(...fileSmells);
    }

    return smells;
  }

  /**
   * 分析代码异味
   */
  private analyzeCodeSmells(content: string, filePath: string) {
    const smells: Array<{
      type: string;
      description: string;
      file: string;
      line: number;
      severity: 'high' | 'medium' | 'low';
    }> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 长参数列表
      const paramMatch = line.match(/\(([^)]{50,})\)/);
      if (paramMatch) {
        smells.push({
          type: 'Long Parameter List',
          description: 'Function has too many parameters',
          file: filePath,
          line: lineNumber,
          severity: 'medium',
        });
      }

      // 大类/长方法
      if (line.includes('class ') && content.split('\n').length > 500) {
        smells.push({
          type: 'Large Class',
          description: 'Class is too large and should be split',
          file: filePath,
          line: lineNumber,
          severity: 'high',
        });
      }

      // 重复代码
      const duplicatePattern = /(.{20,})/;
      const match = line.match(duplicatePattern);
      if (match) {
        const pattern = match[1];
        const occurrences = content.split(pattern).length - 1;
        if (occurrences > 2) {
          smells.push({
            type: 'Duplicate Code',
            description: `Code pattern repeated ${occurrences} times`,
            file: filePath,
            line: lineNumber,
            severity: 'medium',
          });
        }
      }

      // 神秘命名
      const variableMatch = line.match(/\b(let|const|var)\s+([a-z]{1,2})\b/);
      if (variableMatch) {
        smells.push({
          type: 'Mysterious Name',
          description: `Variable name '${variableMatch[2]}' is not descriptive`,
          file: filePath,
          line: lineNumber,
          severity: 'low',
        });
      }

      // 注释代码
      if (line.trim().startsWith('//') && line.includes('function') || line.includes('const')) {
        smells.push({
          type: 'Commented Code',
          description: 'Commented out code should be removed',
          file: filePath,
          line: lineNumber,
          severity: 'low',
        });
      }

      // 过长的行
      if (line.length > 120) {
        smells.push({
          type: 'Long Line',
          description: `Line is too long (${line.length} characters)`,
          file: filePath,
          line: lineNumber,
          severity: 'low',
        });
      }
    }

    return smells;
  }

  /**
   * 生成重构报告
   */
  generateReport(report: RefactoringReport): string {
    let reportText = '# Code Refactoring Report\n\n';

    // 摘要
    reportText += '## Summary\n\n';
    reportText += `- **Files Analyzed:** ${report.summary.filesAnalyzed}\n`;
    reportText += `- **Suggestions Found:** ${report.summary.suggestionsFound}\n`;
    reportText += `- **Auto-applicable:** ${report.summary.autoApplicable}\n`;
    reportText += `- **Complexity Reduction:** ${report.summary.complexityReduction}\n\n`;

    // 指标
    reportText += '## Complexity Metrics\n\n';
    reportText += '| Metric | Before | After | Improvement |\n';
    reportText += '|--------|--------|-------|-------------|\n';
    reportText += `| Complexity | ${report.metrics.beforeComplexity} | ${report.metrics.afterComplexity} | ${report.metrics.improvementPercentage.toFixed(1)}% |\n\n`;

    // 建议分类
    const suggestionsByType = report.suggestions.reduce((groups, suggestion) => {
      if (!groups[suggestion.type]) groups[suggestion.type] = [];
      groups[suggestion.type].push(suggestion);
      return groups;
    }, {} as Record<string, RefactoringSuggestion[]>);

    reportText += '## Refactoring Suggestions\n\n';

    Object.entries(suggestionsByType).forEach(([type, suggestions]) => {
      reportText += `### ${type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;

      suggestions.forEach(suggestion => {
        const severity = suggestion.severity === 'high' ? '🔴' :
                        suggestion.severity === 'medium' ? '🟡' : '🔵';
        const autoFix = suggestion.autoApplicable ? ' 🔧' : '';

        reportText += `${severity} **${suggestion.file}:${suggestion.line}**${autoFix}\n`;
        reportText += `   ${suggestion.description}\n`;
        reportText += `   *Impact: Complexity ${suggestion.impact.complexity}, `;
        reportText += `Maintainability +${suggestion.impact.maintainability}, `;
        reportText += `Readability +${suggestion.impact.readability}*\n\n`;
      });
    });

    return reportText;
  }

  /**
   * 辅助方法
   */
  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];

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

  private hashLine(line: string): string {
    // 简单的字符串哈希
    let hash = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
  }
}
