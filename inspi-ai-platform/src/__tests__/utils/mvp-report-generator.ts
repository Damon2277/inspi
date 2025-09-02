/**
 * MVP测试报告生成器 - 简化版
 * 只生成核心指标，减少复杂度
 */

import fs from 'fs'
import path from 'path'

interface MVPTestReport {
  timestamp: string
  commit: string
  branch: string
  summary: {
    totalTests: number
    passed: number
    failed: number
    coverage: number
    duration: number
  }
  status: 'PASS' | 'FAIL'
  issues: string[]
}

export class MVPReportGenerator {
  private reportDir: string

  constructor(reportDir = 'test-reports') {
    this.reportDir = reportDir
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true })
    }
  }

  /**
   * 生成MVP测试报告
   */
  async generateMVPReport(): Promise<MVPTestReport> {
    console.log('🔄 生成MVP测试报告...')

    const report: MVPTestReport = {
      timestamp: new Date().toISOString(),
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        coverage: 0,
        duration: 0
      },
      status: 'PASS',
      issues: []
    }

    // 收集核心测试结果
    await this.collectCoreTestResults(report)
    
    // 检查质量门禁
    this.checkMVPQualityGate(report)
    
    // 生成报告文件
    await this.generateReportFiles(report)
    
    console.log('✅ MVP测试报告生成完成')
    return report
  }

  /**
   * 收集核心测试结果
   */
  private async collectCoreTestResults(report: MVPTestReport): Promise<void> {
    try {
      // 读取Jest覆盖率报告
      const coveragePath = 'coverage/coverage-summary.json'
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
        report.summary.coverage = Math.round(coverage.total?.lines?.pct || 0)
      }

      // 读取测试结果（简化版）
      const testResultsPath = 'test-results/results.json'
      if (fs.existsSync(testResultsPath)) {
        const results = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'))
        report.summary.totalTests = results.numTotalTests || 0
        report.summary.passed = results.numPassedTests || 0
        report.summary.failed = results.numFailedTests || 0
        report.summary.duration = results.testResults?.reduce((sum: number, result: any) => 
          sum + (result.perfStats?.end - result.perfStats?.start || 0), 0) || 0
      }
    } catch (error) {
      console.warn('⚠️ 收集测试结果失败:', error)
      report.issues.push('无法收集完整测试结果')
    }
  }

  /**
   * 检查MVP质量门禁
   */
  private checkMVPQualityGate(report: MVPTestReport): void {
    const coverageThreshold = parseInt(process.env.COVERAGE_THRESHOLD || '70')
    
    // 检查覆盖率
    if (report.summary.coverage < coverageThreshold) {
      report.status = 'FAIL'
      report.issues.push(`覆盖率${report.summary.coverage}%低于要求${coverageThreshold}%`)
    }
    
    // 检查测试通过率
    if (report.summary.failed > 0) {
      report.status = 'FAIL'
      report.issues.push(`${report.summary.failed}个测试失败`)
    }
    
    // 检查基本指标
    if (report.summary.totalTests === 0) {
      report.status = 'FAIL'
      report.issues.push('没有找到测试用例')
    }
  }

  /**
   * 生成报告文件
   */
  private async generateReportFiles(report: MVPTestReport): Promise<void> {
    // 生成JSON报告
    const jsonReport = path.join(this.reportDir, 'mvp-report.json')
    fs.writeFileSync(jsonReport, JSON.stringify(report, null, 2))
    
    // 生成简化的Markdown报告
    const markdown = this.generateMarkdownReport(report)
    const markdownReport = path.join(this.reportDir, 'mvp-report.md')
    fs.writeFileSync(markdownReport, markdown)
    
    console.log(`📄 MVP报告已生成: ${jsonReport}, ${markdownReport}`)
  }

  /**
   * 生成Markdown报告
   */
  private generateMarkdownReport(report: MVPTestReport): string {
    const statusIcon = report.status === 'PASS' ? '✅' : '❌'
    const passRate = report.summary.totalTests > 0 ? 
      ((report.summary.passed / report.summary.totalTests) * 100).toFixed(1) : '0'
    
    return `# ${statusIcon} MVP测试报告

**时间**: ${new Date(report.timestamp).toLocaleString()}  
**提交**: ${report.commit}  
**分支**: ${report.branch}  
**状态**: ${report.status}

## 📊 核心指标

| 指标 | 数值 |
|------|------|
| 总测试数 | ${report.summary.totalTests} |
| 通过数 | ${report.summary.passed} |
| 失败数 | ${report.summary.failed} |
| 通过率 | ${passRate}% |
| 覆盖率 | ${report.summary.coverage}% |
| 耗时 | ${(report.summary.duration / 1000).toFixed(1)}秒 |

${report.issues.length > 0 ? `## ⚠️ 发现问题

${report.issues.map(issue => `- ${issue}`).join('\n')}` : '## 🎉 所有检查通过'}

---
*MVP报告 - 专注核心指标*
`
  }
}

// 主执行函数
export async function generateMVPTestReport(): Promise<void> {
  const generator = new MVPReportGenerator()
  await generator.generateMVPReport()
}

// 如果直接运行此文件
if (require.main === module) {
  generateMVPTestReport().catch(console.error)
}