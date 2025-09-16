#!/usr/bin/env node

/**
 * 单元测试运行器
 * 运行所有单元测试并生成覆盖率报告
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface TestSummary {
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  overallCoverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  testResults: TestResult[];
  duration: number;
}

class UnitTestRunner {
  private testDir: string;
  private outputDir: string;
  private coverageThreshold: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };

  constructor() {
    this.testDir = path.join(__dirname);
    this.outputDir = path.join(process.cwd(), 'coverage', 'unit');
    this.coverageThreshold = {
      statements: 85,
      branches: 80,
      functions: 90,
      lines: 85
    };
  }

  /**
   * 运行所有单元测试
   */
  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 开始运行单元测试...\n');
    
    const startTime = Date.now();
    const testResults: TestResult[] = [];
    
    try {
      // 确保输出目录存在
      this.ensureOutputDirectory();
      
      // 发现所有测试文件
      const testFiles = this.discoverTestFiles();
      console.log(`📁 发现 ${testFiles.length} 个测试文件\n`);
      
      // 运行每个测试套件
      for (const testFile of testFiles) {
        const result = await this.runTestSuite(testFile);
        testResults.push(result);
      }
      
      // 生成总体覆盖率报告
      const overallCoverage = this.calculateOverallCoverage(testResults);
      
      const duration = Date.now() - startTime;
      const summary: TestSummary = {
        totalTests: testResults.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
        totalPassed: testResults.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: testResults.reduce((sum, r) => sum + r.failed, 0),
        totalSkipped: testResults.reduce((sum, r) => sum + r.skipped, 0),
        overallCoverage,
        testResults,
        duration
      };
      
      // 生成报告
      await this.generateReports(summary);
      
      // 显示结果
      this.displayResults(summary);
      
      return summary;
      
    } catch (error) {
      console.error('❌ 测试运行失败:', error);
      throw error;
    }
  }

  /**
   * 发现所有测试文件
   */
  private discoverTestFiles(): string[] {
    const testFiles: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx')) {
          testFiles.push(fullPath);
        }
      }
    };
    
    scanDirectory(this.testDir);
    return testFiles;
  }

  /**
   * 运行单个测试套件
   */
  private async runTestSuite(testFile: string): Promise<TestResult> {
    const suiteName = path.relative(this.testDir, testFile);
    console.log(`🔍 运行测试套件: ${suiteName}`);
    
    try {
      // 运行 Jest 测试
      const jestCommand = [
        'npx jest',
        `"${testFile}"`,
        '--coverage',
        '--coverageDirectory=coverage/unit',
        '--coverageReporters=json',
        '--coverageReporters=text',
        '--verbose',
        '--no-cache'
      ].join(' ');
      
      const output = execSync(jestCommand, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      // 解析测试结果
      const result = this.parseTestOutput(output, suiteName);
      
      console.log(`  ✅ ${result.passed} 通过, ❌ ${result.failed} 失败, ⏭️ ${result.skipped} 跳过`);
      console.log(`  📊 覆盖率: ${result.coverage.statements}% 语句, ${result.coverage.lines}% 行\n`);
      
      return result;
      
    } catch (error) {
      console.log(`  ❌ 测试套件失败: ${error.message}\n`);
      
      return {
        testSuite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        coverage: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      };
    }
  }

  /**
   * 解析测试输出
   */
  private parseTestOutput(output: string, suiteName: string): TestResult {
    // 解析测试结果
    const testRegex = /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/;
    const testMatch = output.match(testRegex);
    
    let passed = 0, failed = 0, skipped = 0;
    
    if (testMatch) {
      failed = parseInt(testMatch[1]);
      passed = parseInt(testMatch[2]);
      // Jest 不直接报告跳过的测试，需要从总数计算
      const total = parseInt(testMatch[3]);
      skipped = total - passed - failed;
    }
    
    // 解析覆盖率
    const coverage = this.parseCoverageFromOutput(output);
    
    return {
      testSuite: suiteName,
      passed,
      failed,
      skipped,
      coverage
    };
  }

  /**
   * 从输出中解析覆盖率
   */
  private parseCoverageFromOutput(output: string) {
    const coverageRegex = /All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/;
    const match = output.match(coverageRegex);
    
    if (match) {
      return {
        statements: parseFloat(match[1]),
        branches: parseFloat(match[2]),
        functions: parseFloat(match[3]),
        lines: parseFloat(match[4])
      };
    }
    
    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    };
  }

  /**
   * 计算总体覆盖率
   */
  private calculateOverallCoverage(testResults: TestResult[]) {
    if (testResults.length === 0) {
      return {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      };
    }
    
    const totals = testResults.reduce((acc, result) => ({
      statements: acc.statements + result.coverage.statements,
      branches: acc.branches + result.coverage.branches,
      functions: acc.functions + result.coverage.functions,
      lines: acc.lines + result.coverage.lines
    }), { statements: 0, branches: 0, functions: 0, lines: 0 });
    
    const count = testResults.length;
    
    return {
      statements: Math.round(totals.statements / count * 100) / 100,
      branches: Math.round(totals.branches / count * 100) / 100,
      functions: Math.round(totals.functions / count * 100) / 100,
      lines: Math.round(totals.lines / count * 100) / 100
    };
  }

  /**
   * 确保输出目录存在
   */
  private ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 生成测试报告
   */
  private async generateReports(summary: TestSummary) {
    // 生成 JSON 报告
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary,
      thresholds: this.coverageThreshold,
      passed: summary.totalFailed === 0 && this.checkCoverageThresholds(summary.overallCoverage)
    };
    
    const jsonPath = path.join(this.outputDir, 'unit-test-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    
    // 生成 HTML 报告
    const htmlReport = this.generateHtmlReport(summary);
    const htmlPath = path.join(this.outputDir, 'unit-test-report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    // 生成 Markdown 报告
    const markdownReport = this.generateMarkdownReport(summary);
    const markdownPath = path.join(this.outputDir, 'unit-test-report.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`📄 报告已生成:`);
    console.log(`  - JSON: ${jsonPath}`);
    console.log(`  - HTML: ${htmlPath}`);
    console.log(`  - Markdown: ${markdownPath}\n`);
  }

  /**
   * 生成 HTML 报告
   */
  private generateHtmlReport(summary: TestSummary): string {
    const { overallCoverage } = summary;
    const coverageStatus = this.checkCoverageThresholds(overallCoverage);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>单元测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric.success { border-left: 4px solid #4caf50; }
        .metric.warning { border-left: 4px solid #ff9800; }
        .metric.error { border-left: 4px solid #f44336; }
        .coverage-bar { width: 100%; height: 20px; background: #eee; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; transition: width 0.3s ease; }
        .coverage-fill.high { background: #4caf50; }
        .coverage-fill.medium { background: #ff9800; }
        .coverage-fill.low { background: #f44336; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 单元测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString()}</p>
        <p>执行时间: ${summary.duration}ms</p>
    </div>
    
    <div class="summary">
        <div class="metric ${summary.totalFailed === 0 ? 'success' : 'error'}">
            <h3>测试结果</h3>
            <p>总计: ${summary.totalTests}</p>
            <p>通过: ${summary.totalPassed}</p>
            <p>失败: ${summary.totalFailed}</p>
            <p>跳过: ${summary.totalSkipped}</p>
        </div>
        
        <div class="metric ${coverageStatus ? 'success' : 'warning'}">
            <h3>代码覆盖率</h3>
            <div>
                <p>语句: ${overallCoverage.statements}%</p>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(overallCoverage.statements)}" 
                         style="width: ${overallCoverage.statements}%"></div>
                </div>
            </div>
            <div>
                <p>分支: ${overallCoverage.branches}%</p>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(overallCoverage.branches)}" 
                         style="width: ${overallCoverage.branches}%"></div>
                </div>
            </div>
            <div>
                <p>函数: ${overallCoverage.functions}%</p>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(overallCoverage.functions)}" 
                         style="width: ${overallCoverage.functions}%"></div>
                </div>
            </div>
            <div>
                <p>行数: ${overallCoverage.lines}%</p>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(overallCoverage.lines)}" 
                         style="width: ${overallCoverage.lines}%"></div>
                </div>
            </div>
        </div>
    </div>
    
    <h2>测试套件详情</h2>
    <table>
        <thead>
            <tr>
                <th>测试套件</th>
                <th>通过</th>
                <th>失败</th>
                <th>跳过</th>
                <th>语句覆盖率</th>
                <th>行覆盖率</th>
            </tr>
        </thead>
        <tbody>
            ${summary.testResults.map(result => `
                <tr>
                    <td>${result.testSuite}</td>
                    <td>${result.passed}</td>
                    <td>${result.failed}</td>
                    <td>${result.skipped}</td>
                    <td>${result.coverage.statements}%</td>
                    <td>${result.coverage.lines}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  /**
   * 生成 Markdown 报告
   */
  private generateMarkdownReport(summary: TestSummary): string {
    const { overallCoverage } = summary;
    
    return `# 🧪 单元测试报告

**生成时间**: ${new Date().toLocaleString()}  
**执行时间**: ${summary.duration}ms

## 📊 测试总结

| 指标 | 数量 |
|------|------|
| 总测试数 | ${summary.totalTests} |
| 通过 | ${summary.totalPassed} |
| 失败 | ${summary.totalFailed} |
| 跳过 | ${summary.totalSkipped} |

## 📈 代码覆盖率

| 类型 | 覆盖率 | 阈值 | 状态 |
|------|--------|------|------|
| 语句 | ${overallCoverage.statements}% | ${this.coverageThreshold.statements}% | ${overallCoverage.statements >= this.coverageThreshold.statements ? '✅' : '❌'} |
| 分支 | ${overallCoverage.branches}% | ${this.coverageThreshold.branches}% | ${overallCoverage.branches >= this.coverageThreshold.branches ? '✅' : '❌'} |
| 函数 | ${overallCoverage.functions}% | ${this.coverageThreshold.functions}% | ${overallCoverage.functions >= this.coverageThreshold.functions ? '✅' : '❌'} |
| 行数 | ${overallCoverage.lines}% | ${this.coverageThreshold.lines}% | ${overallCoverage.lines >= this.coverageThreshold.lines ? '✅' : '❌'} |

## 📋 测试套件详情

| 测试套件 | 通过 | 失败 | 跳过 | 语句覆盖率 | 行覆盖率 |
|----------|------|------|------|------------|----------|
${summary.testResults.map(result => 
  `| ${result.testSuite} | ${result.passed} | ${result.failed} | ${result.skipped} | ${result.coverage.statements}% | ${result.coverage.lines}% |`
).join('\n')}

## 🎯 建议

${this.generateRecommendations(summary)}
`;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(summary: TestSummary): string {
    const recommendations: string[] = [];
    const { overallCoverage } = summary;
    
    if (summary.totalFailed > 0) {
      recommendations.push('- 🔴 修复失败的测试用例');
    }
    
    if (overallCoverage.statements < this.coverageThreshold.statements) {
      recommendations.push(`- 📈 提高语句覆盖率至 ${this.coverageThreshold.statements}% 以上`);
    }
    
    if (overallCoverage.branches < this.coverageThreshold.branches) {
      recommendations.push(`- 🌿 提高分支覆盖率至 ${this.coverageThreshold.branches}% 以上`);
    }
    
    if (overallCoverage.functions < this.coverageThreshold.functions) {
      recommendations.push(`- 🔧 提高函数覆盖率至 ${this.coverageThreshold.functions}% 以上`);
    }
    
    if (overallCoverage.lines < this.coverageThreshold.lines) {
      recommendations.push(`- 📏 提高行覆盖率至 ${this.coverageThreshold.lines}% 以上`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- 🎉 所有指标都达到了要求，继续保持！');
    }
    
    return recommendations.join('\n');
  }

  /**
   * 检查覆盖率是否达到阈值
   */
  private checkCoverageThresholds(coverage: any): boolean {
    return (
      coverage.statements >= this.coverageThreshold.statements &&
      coverage.branches >= this.coverageThreshold.branches &&
      coverage.functions >= this.coverageThreshold.functions &&
      coverage.lines >= this.coverageThreshold.lines
    );
  }

  /**
   * 获取覆盖率样式类
   */
  private getCoverageClass(percentage: number): string {
    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  }

  /**
   * 显示测试结果
   */
  private displayResults(summary: TestSummary) {
    console.log('🎉 单元测试完成！\n');
    
    console.log('📊 测试总结:');
    console.log(`  总测试数: ${summary.totalTests}`);
    console.log(`  通过: ${summary.totalPassed}`);
    console.log(`  失败: ${summary.totalFailed}`);
    console.log(`  跳过: ${summary.totalSkipped}`);
    console.log(`  执行时间: ${summary.duration}ms\n`);
    
    console.log('📈 代码覆盖率:');
    console.log(`  语句: ${summary.overallCoverage.statements}%`);
    console.log(`  分支: ${summary.overallCoverage.branches}%`);
    console.log(`  函数: ${summary.overallCoverage.functions}%`);
    console.log(`  行数: ${summary.overallCoverage.lines}%\n`);
    
    const coverageStatus = this.checkCoverageThresholds(summary.overallCoverage);
    const testStatus = summary.totalFailed === 0;
    
    if (testStatus && coverageStatus) {
      console.log('✅ 所有测试通过，覆盖率达标！');
    } else {
      console.log('❌ 测试或覆盖率未达标，请查看详细报告。');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const runner = new UnitTestRunner();
  runner.runAllTests()
    .then((summary) => {
      const success = summary.totalFailed === 0;
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}

export { UnitTestRunner, TestResult, TestSummary };