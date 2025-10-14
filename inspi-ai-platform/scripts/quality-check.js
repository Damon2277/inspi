#!/usr/bin/env node

/**
 * 代码质量检查脚本
 * 运行完整的代码质量分析并生成报告
 */

const fs = require('fs');
const path = require('path');

// 模拟代码质量检查器（简化版本）
class SimpleQualityChecker {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  async checkQuality() {
    console.log('🔍 Starting code quality analysis...');
    
    const files = await this.getSourceFiles();
    const issues = [];
    let totalComplexity = 0;
    let anyUsage = 0;
    let lintErrors = 0;
    
    for (const file of files) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const analysis = this.analyzeFile(content, file);
        
        totalComplexity += analysis.complexity;
        anyUsage += analysis.anyUsage;
        lintErrors += analysis.lintErrors;
        issues.push(...analysis.issues);
      } catch (error) {
        console.warn(`Could not analyze ${file}:`, error.message);
      }
    }

    const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;
    const score = this.calculateScore(avgComplexity, anyUsage, lintErrors, issues.length);
    const grade = this.calculateGrade(score);

    return {
      score,
      grade,
      metrics: {
        filesAnalyzed: files.length,
        averageComplexity: avgComplexity,
        anyUsage,
        lintErrors,
        totalIssues: issues.length
      },
      issues: issues.slice(0, 20), // 限制显示的问题数量
      recommendations: this.generateRecommendations(avgComplexity, anyUsage, lintErrors)
    };
  }

  analyzeFile(content, filePath) {
    const lines = content.split('\n');
    let complexity = 1;
    let anyUsage = 0;
    let lintErrors = 0;
    const issues = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 计算复杂度
      const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', '&&', '||'];
      complexityKeywords.forEach(keyword => {
        if (line.includes(keyword)) {
          complexity++;
        }
      });

      // 检查 any 使用
      if (line.includes(': any')) {
        anyUsage++;
        issues.push({
          file: filePath,
          line: lineNumber,
          type: 'type-safety',
          message: 'Use of "any" type reduces type safety',
          severity: 'warning'
        });
      }

      // 检查 console.log
      if (line.includes('console.log')) {
        lintErrors++;
        issues.push({
          file: path.relative(this.projectRoot, filePath),
          line: lineNumber,
          type: 'style',
          message: 'Avoid console.log in production code',
          severity: 'warning'
        });
      }

      // 检查长行
      if (line.length > 100) {
        issues.push({
          file: path.relative(this.projectRoot, filePath),
          line: lineNumber,
          type: 'style',
          message: `Line too long (${line.length} characters)`,
          severity: 'info'
        });
      }

      // 检查深度嵌套
      const indentation = line.match(/^(\s*)/)?.[1]?.length || 0;
      if (indentation > 16) {
        issues.push({
          file: path.relative(this.projectRoot, filePath),
          line: lineNumber,
          type: 'complexity',
          message: 'Deep nesting detected',
          severity: 'warning'
        });
      }
    }

    return { complexity, anyUsage, lintErrors, issues };
  }

  calculateScore(complexity, anyUsage, lintErrors) {
    let score = 100;
    
    // 复杂度扣分
    if (complexity > 10) {
      score -= Math.min(20, (complexity - 10) * 2);
    }
    
    // any 使用扣分
    score -= Math.min(15, anyUsage * 2);
    
    // lint 错误扣分
    score -= Math.min(20, lintErrors * 1);
    
    return Math.max(0, Math.round(score));
  }

  calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  generateRecommendations(complexity, anyUsage, lintErrors) {
    const recommendations = [];
    
    if (complexity > 10) {
      recommendations.push('Reduce code complexity by breaking down complex functions');
    }
    
    if (anyUsage > 0) {
      recommendations.push(`Replace ${anyUsage} instances of "any" type with specific types`);
    }
    
    if (lintErrors > 0) {
      recommendations.push(`Fix ${lintErrors} linting issues`);
    }
    
    return recommendations;
  }

  async getSourceFiles() {
    const files = [];
    
    const scanDirectory = async (dir) => {
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

    const srcPath = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcPath)) {
      await scanDirectory(srcPath);
    }
    
    return files;
  }

  shouldExcludeDirectory(name) {
    const excludeDirs = ['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__'];
    return excludeDirs.includes(name);
  }

  isSourceFile(name) {
    return /\.(ts|tsx|js|jsx)$/.test(name) && !name.includes('.test.') && !name.includes('.spec.');
  }
}

// 生成报告
function generateReport(result) {
  let report = `# Code Quality Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Score:** ${result.score}/100 (Grade: ${result.grade})\n\n`;

  // 指标摘要
  report += `## Metrics Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Files Analyzed | ${result.metrics.filesAnalyzed} |\n`;
  report += `| Average Complexity | ${result.metrics.averageComplexity.toFixed(1)} |\n`;
  report += `| Any Usage | ${result.metrics.anyUsage} |\n`;
  report += `| Lint Errors | ${result.metrics.lintErrors} |\n`;
  report += `| Total Issues | ${result.metrics.totalIssues} |\n\n`;

  // 改进建议
  if (result.recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    result.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    report += `\n`;
  }

  // 问题详情（显示前10个）
  if (result.issues.length > 0) {
    report += `## Issues (Top 10)\n\n`;
    result.issues.slice(0, 10).forEach(issue => {
      const severity = issue.severity === 'warning' ? '⚠️' : 
                      issue.severity === 'error' ? '❌' : 'ℹ️';
      report += `${severity} **${issue.file}:${issue.line}** - ${issue.message}\n`;
    });
    
    if (result.issues.length > 10) {
      report += `\n... and ${result.issues.length - 10} more issues\n`;
    }
  }

  return report;
}

// 主函数
async function main() {
  const projectRoot = process.cwd();
  
  console.log('🚀 Starting code quality check...');
  console.log(`📁 Project root: ${projectRoot}\n`);

  try {
    const checker = new SimpleQualityChecker(projectRoot);
    const result = await checker.checkQuality();
    
    // 生成报告
    const report = generateReport(result);
    
    // 保存报告到文件
    const reportPath = path.join(projectRoot, 'code-quality-report.md');
    await fs.promises.writeFile(reportPath, report, 'utf-8');
    
    // 输出到控制台
    console.log(report);
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // 根据评分决定退出码
    const exitCode = result.score >= 80 ? 0 : 1;
    
    if (exitCode === 0) {
      console.log('✅ Code quality check passed!');
    } else {
      console.log('❌ Code quality check failed. Please address the issues above.');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Code quality check failed:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { SimpleQualityChecker };