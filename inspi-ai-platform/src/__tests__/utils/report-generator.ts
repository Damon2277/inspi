/**
 * 测试报告生成器
 * 生成综合测试报告和质量门禁报告
 */

import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: number
  status: 'PASS' | 'FAIL' | 'SKIP'
}

interface QualityMetrics {
  coverage: number
  performance: {
    pageLoadTime: number
    apiResponseTime: number
    memoryUsage: number
  }
  security: {
    highVulnerabilities: number
    criticalVulnerabilities: number
    owaspCompliance: number
  }
  codeQuality: {
    eslintErrors: number
    typescriptErrors: number
    complexity: number
  }
}

interface TestReport {
  timestamp: string
  commit: string
  branch: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  passRate: number
  coverageRate: number
  suites: TestSuite[]
  qualityMetrics: QualityMetrics
  qualityGate: {
    status: 'PASS' | 'FAIL'
    rules: Array<{
      name: string
      status: 'PASS' | 'FAIL'
      actual: number | string
      expected: number | string
      message: string
    }>
  }
}

export class ReportGenerator {
  private reportDir: string;
  private artifactsDir: string;

  constructor(reportDir = 'test-reports', artifactsDir = 'test-artifacts') {
    this.reportDir = reportDir;
    this.artifactsDir = artifactsDir;

    // 确保报告目录存在
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 生成综合测试报告
   */
  async generateComprehensiveReport(): Promise<TestReport> {
    console.log('🔄 开始生成综合测试报告...');

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalDuration: 0,
      passRate: 0,
      coverageRate: 0,
      suites: [],
      qualityMetrics: {
        coverage: 0,
        performance: {
          pageLoadTime: 0,
          apiResponseTime: 0,
          memoryUsage: 0,
        },
        security: {
          highVulnerabilities: 0,
          criticalVulnerabilities: 0,
          owaspCompliance: 100,
        },
        codeQuality: {
          eslintErrors: 0,
          typescriptErrors: 0,
          complexity: 0,
        },
      },
      qualityGate: {
        status: 'PASS',
        rules: [],
      },
    };

    // 收集各测试套件结果
    await this.collectTestSuiteResults(report);

    // 收集质量指标
    await this.collectQualityMetrics(report);

    // 执行质量门禁检查
    await this.performQualityGateCheck(report);

    // 计算汇总统计
    this.calculateSummaryStats(report);

    // 生成各种格式的报告
    await this.generateReports(report);

    console.log('✅ 综合测试报告生成完成');
    return report;
  }

  /**
   * 收集测试套件结果
   */
  private async collectTestSuiteResults(report: TestReport): Promise<void> {
    const suiteConfigs = [
      { name: 'unit-tests', dir: 'unit-test-results' },
      { name: 'integration-tests', dir: 'integration-test-results' },
      { name: 'e2e-tests', dir: 'e2e-test-results' },
      { name: 'performance-tests', dir: 'performance-test-results' },
      { name: 'security-tests', dir: 'security-test-results' },
      { name: 'mobile-tests', dir: 'mobile-test-results' },
    ];

    for (const config of suiteConfigs) {
      const suiteDir = path.join(this.artifactsDir, config.dir);
      if (fs.existsSync(suiteDir)) {
        const suite = await this.parseSuiteResults(config.name, suiteDir);
        report.suites.push(suite);
      }
    }
  }

  /**
   * 解析单个测试套件结果
   */
  private async parseSuiteResults(suiteName: string, suiteDir: string): Promise<TestSuite> {
    const suite: TestSuite = {
      name: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      status: 'PASS',
    };

    try {
      // 查找Jest结果文件
      const jestResultFile = path.join(suiteDir, 'jest-results.json');
      if (fs.existsSync(jestResultFile)) {
        const jestResults = JSON.parse(fs.readFileSync(jestResultFile, 'utf8'));
        suite.passed = jestResults.numPassedTests || 0;
        suite.failed = jestResults.numFailedTests || 0;
        suite.skipped = jestResults.numPendingTests || 0;
        suite.duration = jestResults.testResults?.reduce((sum: number, result: any) =>
          sum + (result.perfStats?.end - result.perfStats?.start || 0), 0) || 0;
      }

      // 查找Playwright结果文件
      const playwrightResultFile = path.join(suiteDir, 'results.json');
      if (fs.existsSync(playwrightResultFile)) {
        const playwrightResults = JSON.parse(fs.readFileSync(playwrightResultFile, 'utf8'));
        playwrightResults.suites?.forEach((playSuite: any) => {
          playSuite.specs?.forEach((spec: any) => {
            spec.tests?.forEach((test: any) => {
              test.results?.forEach((result: any) => {
                if (result.status === 'passed') suite.passed++;
                else if (result.status === 'failed') suite.failed++;
                else if (result.status === 'skipped') suite.skipped++;
                suite.duration += result.duration || 0;
              });
            });
          });
        });
      }

      // 查找覆盖率信息
      const coverageFile = path.join(suiteDir, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        suite.coverage = Math.round(coverage.total?.lines?.pct || 0);
      }

      suite.status = suite.failed > 0 ? 'FAIL' : 'PASS';
    } catch (error) {
      console.warn(`⚠️ 解析测试套件 ${suiteName} 结果失败:`, error);
      suite.status = 'FAIL';
    }

    return suite;
  }

  /**
   * 收集质量指标
   */
  private async collectQualityMetrics(report: TestReport): Promise<void> {
    // 收集覆盖率
    const coverageFile = path.join(this.artifactsDir, 'unit-test-results', 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      report.qualityMetrics.coverage = Math.round(coverage.total?.lines?.pct || 0);
    }

    // 收集性能指标
    const performanceFile = path.join(this.artifactsDir, 'performance-test-results', 'performance-summary.json');
    if (fs.existsSync(performanceFile)) {
      const performance = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));
      report.qualityMetrics.performance = {
        pageLoadTime: performance.summary?.avgResponseTime || 0,
        apiResponseTime: performance.summary?.p95ResponseTime || 0,
        memoryUsage: performance.summary?.memoryUsage || 0,
      };
    }

    // 收集安全指标
    try {
      const auditResult = JSON.parse(
        require('child_process').execSync('npm audit --json', { encoding: 'utf8' }),
      );
      report.qualityMetrics.security = {
        highVulnerabilities: auditResult.metadata?.vulnerabilities?.high || 0,
        criticalVulnerabilities: auditResult.metadata?.vulnerabilities?.critical || 0,
        owaspCompliance: 100, // 这里需要根据实际OWASP测试结果计算
      };
    } catch (error) {
      console.warn('⚠️ 收集安全指标失败:', error);
    }

    // 收集代码质量指标
    try {
      // ESLint错误数量
      const eslintResult = require('child_process').execSync('npm run lint -- --format json', { encoding: 'utf8' });
      const eslintData = JSON.parse(eslintResult);
      report.qualityMetrics.codeQuality.eslintErrors = eslintData.reduce((sum: number, file: any) =>
        sum + file.errorCount, 0);
    } catch (error) {
      console.warn('⚠️ 收集ESLint指标失败:', error);
    }
  }

  /**
   * 执行质量门禁检查
   */
  private async performQualityGateCheck(report: TestReport): Promise<void> {
    const rules = [];

    // 覆盖率检查
    const coverageThreshold = parseInt(process.env.COVERAGE_THRESHOLD || '90', 10);
    rules.push({
      name: 'coverage',
      status: report.qualityMetrics.coverage >= coverageThreshold ? 'PASS' : 'FAIL',
      actual: `${report.qualityMetrics.coverage}%`,
      expected: `≥${coverageThreshold}%`,
      message: `代码覆盖率${report.qualityMetrics.coverage >= coverageThreshold ? '达标' : '未达标'}`,
    });

    // 性能检查
    const performanceThreshold = parseInt(process.env.PERFORMANCE_THRESHOLD || '3000', 10);
    rules.push({
      name: 'performance',
      status: report.qualityMetrics.performance.pageLoadTime <= performanceThreshold ? 'PASS' : 'FAIL',
      actual: `${report.qualityMetrics.performance.pageLoadTime}ms`,
      expected: `≤${performanceThreshold}ms`,
      message: `页面加载性能${report.qualityMetrics.performance.pageLoadTime <= performanceThreshold ? '达标' : '未达标'}`,
    });

    // 安全检查
    const securityThreshold = parseInt(process.env.SECURITY_THRESHOLD || '0', 10);
    const totalHighCritical = report.qualityMetrics.security.highVulnerabilities +
                             report.qualityMetrics.security.criticalVulnerabilities;
    rules.push({
      name: 'security',
      status: totalHighCritical <= securityThreshold ? 'PASS' : 'FAIL',
      actual: `${totalHighCritical}个`,
      expected: `≤${securityThreshold}个`,
      message: `高危漏洞数量${totalHighCritical <= securityThreshold ? '达标' : '超标'}`,
    });

    // 测试通过率检查
    rules.push({
      name: 'test_pass_rate',
      status: report.passRate >= 100 ? 'PASS' : 'FAIL',
      actual: `${report.passRate.toFixed(1)}%`,
      expected: '100%',
      message: `测试通过率${report.passRate >= 100 ? '达标' : '未达标'}`,
    });

    report.qualityGate.rules = rules;
    report.qualityGate.status = rules.every(rule => rule.status === 'PASS') ? 'PASS' : 'FAIL';
  }

  /**
   * 计算汇总统计
   */
  private calculateSummaryStats(report: TestReport): void {
    report.totalTests = report.suites.reduce((sum, suite) =>
      sum + suite.passed + suite.failed + suite.skipped, 0);
    report.totalPassed = report.suites.reduce((sum, suite) => sum + suite.passed, 0);
    report.totalFailed = report.suites.reduce((sum, suite) => sum + suite.failed, 0);
    report.totalSkipped = report.suites.reduce((sum, suite) => sum + suite.skipped, 0);
    report.totalDuration = report.suites.reduce((sum, suite) => sum + suite.duration, 0);

    report.passRate = report.totalTests > 0 ? (report.totalPassed / report.totalTests) * 100 : 0;
    report.coverageRate = report.qualityMetrics.coverage;
  }

  /**
   * 生成各种格式的报告
   */
  private async generateReports(report: TestReport): Promise<void> {
    // 生成JSON报告
    const jsonReport = path.join(this.reportDir, 'latest-report.json');
    fs.writeFileSync(jsonReport, JSON.stringify(report, null, 2));
    console.log(`📄 JSON报告已生成: ${jsonReport}`);

    // 生成HTML报告
    await this.generateHTMLReport(report);

    // 生成Markdown报告
    await this.generateMarkdownReport(report);

    // 生成质量门禁报告
    await this.generateQualityGateReport(report);
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(report: TestReport): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/report-template.html');
    if (!fs.existsSync(templatePath)) {
      console.warn('⚠️ HTML报告模板不存在，跳过HTML报告生成');
      return;
    }

    let template = fs.readFileSync(templatePath, 'utf8');

    // 替换模板变量
    template = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(report, key);
      return value !== undefined ? String(value) : match;
    });

    const htmlReport = path.join(this.reportDir, 'latest-report.html');
    fs.writeFileSync(htmlReport, template);
    console.log(`📄 HTML报告已生成: ${htmlReport}`);
  }

  /**
   * 生成Markdown报告
   */
  private async generateMarkdownReport(report: TestReport): Promise<void> {
    const markdown = `# 📊 测试报告

**生成时间**: ${new Date(report.timestamp).toLocaleString()}  
**提交**: ${report.commit}  
**分支**: ${report.branch}  

## 📈 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | ${report.totalTests} |
| 通过数 | ${report.totalPassed} |
| 失败数 | ${report.totalFailed} |
| 跳过数 | ${report.totalSkipped} |
| 通过率 | ${report.passRate.toFixed(1)}% |
| 覆盖率 | ${report.coverageRate}% |
| 总耗时 | ${(report.totalDuration / 1000).toFixed(1)}秒 |

## 🧪 测试套件详情

${report.suites.map(suite => `### ${suite.name}
- **状态**: ${suite.status === 'PASS' ? '✅ 通过' : '❌ 失败'}
- **通过**: ${suite.passed}
- **失败**: ${suite.failed}
- **跳过**: ${suite.skipped}
- **耗时**: ${(suite.duration / 1000).toFixed(1)}秒
${suite.coverage ? `- **覆盖率**: ${suite.coverage}%` : ''}
`).join('\n')}

## 🚪 质量门禁

**状态**: ${report.qualityGate.status === 'PASS' ? '✅ 通过' : '❌ 失败'}

${report.qualityGate.rules.map(rule =>
  `- **${rule.name}**: ${rule.status === 'PASS' ? '✅' : '❌'} ${rule.actual} (期望: ${rule.expected}) - ${rule.message}`,
).join('\n')}

## 📊 质量指标

### 代码覆盖率
- **覆盖率**: ${report.qualityMetrics.coverage}%

### 性能指标
- **页面加载时间**: ${report.qualityMetrics.performance.pageLoadTime}ms
- **API响应时间**: ${report.qualityMetrics.performance.apiResponseTime}ms
- **内存使用**: ${report.qualityMetrics.performance.memoryUsage}MB

### 安全指标
- **高危漏洞**: ${report.qualityMetrics.security.highVulnerabilities}个
- **严重漏洞**: ${report.qualityMetrics.security.criticalVulnerabilities}个
- **OWASP合规性**: ${report.qualityMetrics.security.owaspCompliance}%

### 代码质量
- **ESLint错误**: ${report.qualityMetrics.codeQuality.eslintErrors}个
- **TypeScript错误**: ${report.qualityMetrics.codeQuality.typescriptErrors}个

---
*报告生成时间: ${new Date().toLocaleString()}*
`;

    const markdownReport = path.join(this.reportDir, 'latest-report.md');
    fs.writeFileSync(markdownReport, markdown);
    console.log(`📄 Markdown报告已生成: ${markdownReport}`);
  }

  /**
   * 生成质量门禁报告
   */
  private async generateQualityGateReport(report: TestReport): Promise<void> {
    const qualityGateReport = {
      timestamp: report.timestamp,
      commit: report.commit,
      branch: report.branch,
      status: report.qualityGate.status,
      summary: {
        totalTests: report.totalTests,
        passRate: report.passRate,
        coverage: report.coverageRate,
        qualityScore: this.calculateQualityScore(report),
      },
      rules: report.qualityGate.rules,
      recommendations: this.generateRecommendations(report),
    };

    const qualityGateFile = path.join(this.reportDir, 'quality-gate.json');
    fs.writeFileSync(qualityGateFile, JSON.stringify(qualityGateReport, null, 2));
    console.log(`📄 质量门禁报告已生成: ${qualityGateFile}`);
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(report: TestReport): number {
    const weights = {
      passRate: 0.3,
      coverage: 0.25,
      performance: 0.2,
      security: 0.15,
      codeQuality: 0.1,
    };

    const scores = {
      passRate: report.passRate,
      coverage: report.qualityMetrics.coverage,
      performance: Math.max(0, 100 - (report.qualityMetrics.performance.pageLoadTime / 30)), // 3秒为满分
      security: report.qualityMetrics.security.highVulnerabilities +
                report.qualityMetrics.security.criticalVulnerabilities === 0 ? 100 : 0,
      codeQuality: report.qualityMetrics.codeQuality.eslintErrors === 0 ? 100 :
                   Math.max(0, 100 - report.qualityMetrics.codeQuality.eslintErrors * 10),
    };

    return Math.round(
      scores.passRate * weights.passRate +
      scores.coverage * weights.coverage +
      scores.performance * weights.performance +
      scores.security * weights.security +
      scores.codeQuality * weights.codeQuality,
    );
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(report: TestReport): string[] {
    const recommendations = [];

    if (report.qualityMetrics.coverage < 90) {
      recommendations.push(`提升代码覆盖率至90%以上（当前${report.qualityMetrics.coverage}%）`);
    }

    if (report.qualityMetrics.performance.pageLoadTime > 3000) {
      recommendations.push(`优化页面加载性能，目标3秒以内（当前${report.qualityMetrics.performance.pageLoadTime}ms）`);
    }

    if (report.qualityMetrics.security.highVulnerabilities > 0 ||
        report.qualityMetrics.security.criticalVulnerabilities > 0) {
      recommendations.push('修复所有高危和严重安全漏洞');
    }

    if (report.qualityMetrics.codeQuality.eslintErrors > 0) {
      recommendations.push(`修复所有ESLint错误（当前${report.qualityMetrics.codeQuality.eslintErrors}个）`);
    }

    if (report.passRate < 100) {
      recommendations.push(`修复所有失败的测试用例（当前通过率${report.passRate.toFixed(1)}%）`);
    }

    return recommendations;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// 主执行函数
export async function generateTestReport(): Promise<void> {
  const generator = new ReportGenerator();
  await generator.generateComprehensiveReport();
}

// 如果直接运行此文件
if (require.main === module) {
  generateTestReport().catch(console.error);
}
