/**
 * 统一测试运行器
 * 管理所有测试套件的执行和报告生成
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: number
  errors: string[]
}

interface TestReport {
  timestamp: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  overallCoverage: number
  suites: TestResult[]
  summary: {
    status: 'PASS' | 'FAIL'
    passRate: number
    coverageRate: number
  }
}

class TestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * 运行单元测试
   */
  async runUnitTests(): Promise<TestResult> {
    console.log('🧪 运行单元测试...')
    
    const startTime = Date.now()
    
    try {
      const output = execSync('npm run test:unit -- --coverage --json --verbose', {
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 300000, // 5分钟超时
        maxBuffer: 10 * 1024 * 1024 // 10MB缓冲区
      })
      
      const result = this.parseJestOutput(output)
      result.suite = 'Unit Tests'
      result.duration = Date.now() - startTime
      
      if (result.failed === 0) {
        console.log(`✅ 单元测试完成: ${result.passed}/${result.passed + result.failed} 通过`)
      } else {
        console.log(`⚠️ 单元测试完成: ${result.passed}/${result.passed + result.failed} 通过，${result.failed} 个失败`)
        
        // 显示前3个错误
        if (result.errors.length > 0) {
          console.log('主要错误:')
          result.errors.slice(0, 3).forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.substring(0, 200)}...`)
          })
        }
      }
      
      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('❌ 单元测试执行失败:', error.message)
      
      // 尝试从错误输出中提取有用信息
      let errorDetails = error.message
      if (error.stdout) {
        errorDetails += '\n输出: ' + error.stdout.substring(0, 1000)
      }
      if (error.stderr) {
        errorDetails += '\n错误: ' + error.stderr.substring(0, 1000)
      }
      
      return {
        suite: 'Unit Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [errorDetails]
      }
    }
  }

  /**
   * 运行集成测试
   */
  async runIntegrationTests(): Promise<TestResult> {
    console.log('🔗 运行集成测试...')
    
    try {
      const output = execSync('npm run test:integration -- --json', {
        encoding: 'utf8',
        cwd: process.cwd()
      })
      
      const result = this.parseJestOutput(output)
      result.suite = 'Integration Tests'
      
      console.log(`✅ 集成测试完成: ${result.passed}/${result.passed + result.failed} 通过`)
      return result
    } catch (error: any) {
      console.error('❌ 集成测试失败:', error.message)
      return {
        suite: 'Integration Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * 运行端到端测试
   */
  async runE2ETests(): Promise<TestResult> {
    console.log('🎭 运行端到端测试...')
    
    try {
      const output = execSync('npx playwright test --reporter=json', {
        encoding: 'utf8',
        cwd: process.cwd()
      })
      
      const result = this.parsePlaywrightOutput(output)
      result.suite = 'E2E Tests'
      
      console.log(`✅ 端到端测试完成: ${result.passed}/${result.passed + result.failed} 通过`)
      return result
    } catch (error: any) {
      console.error('❌ 端到端测试失败:', error.message)
      return {
        suite: 'E2E Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTests(): Promise<TestResult> {
    console.log('⚡ 运行性能测试...')
    
    try {
      const output = execSync('npx playwright test src/__tests__/performance --reporter=json', {
        encoding: 'utf8',
        cwd: process.cwd()
      })
      
      const result = this.parsePlaywrightOutput(output)
      result.suite = 'Performance Tests'
      
      console.log(`✅ 性能测试完成: ${result.passed}/${result.passed + result.failed} 通过`)
      return result
    } catch (error: any) {
      console.error('❌ 性能测试失败:', error.message)
      return {
        suite: 'Performance Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * 运行安全测试
   */
  async runSecurityTests(): Promise<TestResult> {
    console.log('🔒 运行安全测试...')
    
    try {
      const output = execSync('npm run test:security -- --json', {
        encoding: 'utf8',
        cwd: process.cwd()
      })
      
      const result = this.parseJestOutput(output)
      result.suite = 'Security Tests'
      
      console.log(`✅ 安全测试完成: ${result.passed}/${result.passed + result.failed} 通过`)
      return result
    } catch (error: any) {
      console.error('❌ 安全测试失败:', error.message)
      return {
        suite: 'Security Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * 运行所有测试套件
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 开始运行完整测试套件...\n')
    
    // 并行运行测试（除了E2E测试需要串行）
    const [unitResult, integrationResult, securityResult] = await Promise.all([
      this.runUnitTests(),
      this.runIntegrationTests(),
      this.runSecurityTests()
    ])
    
    // 串行运行E2E和性能测试（需要启动服务器）
    const e2eResult = await this.runE2ETests()
    const performanceResult = await this.runPerformanceTests()
    
    this.results = [unitResult, integrationResult, e2eResult, performanceResult, securityResult]
    
    return this.generateReport()
  }

  /**
   * 生成测试报告
   */
  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime
    
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0)
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)
    
    const coverageResults = this.results.filter(r => r.coverage !== undefined)
    const overallCoverage = coverageResults.length > 0 
      ? coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
      : 0
    
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallCoverage,
      suites: this.results,
      summary: {
        status: totalFailed === 0 ? 'PASS' : 'FAIL',
        passRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
        coverageRate: overallCoverage
      }
    }
    
    return report
  }

  /**
   * 解析Jest输出
   */
  private parseJestOutput(output: string): TestResult {
    try {
      // 尝试解析JSON输出
      const data = JSON.parse(output)
      
      return {
        suite: '',
        passed: data.numPassedTests || 0,
        failed: data.numFailedTests || 0,
        skipped: data.numPendingTests || 0,
        duration: data.testResults?.reduce((sum: number, r: any) => sum + (r.perfStats?.end - r.perfStats?.start || 0), 0) || 0,
        coverage: data.coverageMap ? this.calculateCoverage(data.coverageMap) : undefined,
        errors: this.extractJestErrors(data)
      }
    } catch (parseError) {
      console.warn('Jest输出解析失败，尝试文本解析:', parseError)
      
      // 回退到文本解析
      return this.parseJestTextOutput(output)
    }
  }

  /**
   * 提取Jest错误信息
   */
  private extractJestErrors(data: any): string[] {
    const errors: string[] = []
    
    try {
      if (data.testResults) {
        data.testResults.forEach((result: any) => {
          if (result.status === 'failed' && result.failureMessage) {
            errors.push(result.failureMessage)
          }
          
          if (result.assertionResults) {
            result.assertionResults.forEach((assertion: any) => {
              if (assertion.status === 'failed' && assertion.failureMessages) {
                errors.push(...assertion.failureMessages)
              }
            })
          }
        })
      }
      
      // 如果没有具体错误信息，添加通用错误
      if (errors.length === 0 && data.numFailedTests > 0) {
        errors.push(`${data.numFailedTests} 个测试失败，但无法获取详细错误信息`)
      }
    } catch (error) {
      errors.push('提取错误信息时发生异常: ' + error.message)
    }
    
    return errors
  }

  /**
   * 解析Jest文本输出（回退方案）
   */
  private parseJestTextOutput(output: string): TestResult {
    const result: TestResult = {
      suite: '',
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    }
    
    try {
      // 解析测试统计
      const passedMatch = output.match(/(\d+) passed/)
      const failedMatch = output.match(/(\d+) failed/)
      const skippedMatch = output.match(/(\d+) skipped/)
      const timeMatch = output.match(/Time:\s*(\d+\.?\d*)\s*s/)
      
      result.passed = passedMatch ? parseInt(passedMatch[1]) : 0
      result.failed = failedMatch ? parseInt(failedMatch[1]) : 0
      result.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0
      result.duration = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0
      
      // 提取错误信息
      const errorLines = output.split('\n').filter(line => 
        line.includes('FAIL') || 
        line.includes('Error:') || 
        line.includes('Expected:') ||
        line.includes('Received:')
      )
      
      if (errorLines.length > 0) {
        result.errors = errorLines.slice(0, 10) // 限制错误数量
      } else if (result.failed > 0) {
        result.errors = ['测试失败，但无法解析具体错误信息']
      }
      
    } catch (error) {
      result.errors = ['文本解析失败: ' + error.message]
    }
    
    return result
  }

  /**
   * 解析Playwright输出
   */
  private parsePlaywrightOutput(output: string): TestResult {
    try {
      const data = JSON.parse(output)
      
      const passed = data.suites?.reduce((sum: number, suite: any) => 
        sum + suite.specs?.filter((spec: any) => spec.ok).length || 0, 0) || 0
      
      const failed = data.suites?.reduce((sum: number, suite: any) => 
        sum + suite.specs?.filter((spec: any) => !spec.ok).length || 0, 0) || 0
      
      return {
        suite: '',
        passed,
        failed,
        skipped: 0,
        duration: data.stats?.duration || 0,
        errors: data.suites?.flatMap((suite: any) => 
          suite.specs?.filter((spec: any) => !spec.ok)
            .map((spec: any) => spec.title)
        ) || []
      }
    } catch (error) {
      return {
        suite: '',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: ['Failed to parse Playwright output']
      }
    }
  }

  /**
   * 计算代码覆盖率
   */
  private calculateCoverage(coverageMap: any): number {
    if (!coverageMap) return 0
    
    let totalLines = 0
    let coveredLines = 0
    
    Object.values(coverageMap).forEach((file: any) => {
      if (file.s) {
        Object.values(file.s).forEach((count: any) => {
          totalLines++
          if (count > 0) coveredLines++
        })
      }
    })
    
    return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
  }

  /**
   * 保存报告到文件
   */
  async saveReport(report: TestReport): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'test-reports')
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    // 保存JSON报告
    const jsonPath = path.join(reportsDir, `test-report-${Date.now()}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))
    
    // 生成HTML报告
    const htmlPath = path.join(reportsDir, `test-report-${Date.now()}.html`)
    const htmlContent = this.generateHTMLReport(report)
    fs.writeFileSync(htmlPath, htmlContent)
    
    console.log(`📊 测试报告已保存:`)
    console.log(`   JSON: ${jsonPath}`)
    console.log(`   HTML: ${htmlPath}`)
  }

  /**
   * 生成HTML报告
   */
  private generateHTMLReport(report: TestReport): string {
    const statusColor = report.summary.status === 'PASS' ? '#4CAF50' : '#F44336'
    const passRateColor = report.summary.passRate >= 90 ? '#4CAF50' : 
                         report.summary.passRate >= 70 ? '#FF9800' : '#F44336'
    const coverageColor = report.summary.coverageRate >= 80 ? '#4CAF50' : 
                         report.summary.coverageRate >= 60 ? '#FF9800' : '#F44336'
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - ${report.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .metric-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .suites { padding: 0 30px 30px; }
        .suite { margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #e0e0e0; }
        .suite-name { font-weight: bold; font-size: 1.1em; }
        .suite-stats { display: flex; gap: 20px; margin-top: 10px; }
        .suite-stat { font-size: 0.9em; color: #666; }
        .suite-errors { padding: 20px; background: #fff5f5; }
        .error { background: #fed7d7; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-family: monospace; font-size: 0.9em; }
        .status-pass { color: #4CAF50; }
        .status-fail { color: #F44336; }
        .progress-bar { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>测试报告</h1>
            <p>生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value" style="color: ${statusColor}">${report.summary.status}</div>
                <div class="metric-label">总体状态</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.totalTests}</div>
                <div class="metric-label">总测试数</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${passRateColor}">${report.summary.passRate.toFixed(1)}%</div>
                <div class="metric-label">通过率</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.summary.passRate}%; background: ${passRateColor}"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${coverageColor}">${report.summary.coverageRate.toFixed(1)}%</div>
                <div class="metric-label">代码覆盖率</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.summary.coverageRate}%; background: ${coverageColor}"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.totalDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">总耗时</div>
            </div>
        </div>
        
        <div class="suites">
            <h2>测试套件详情</h2>
            ${report.suites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-name">${suite.suite}</div>
                        <div class="suite-stats">
                            <span class="suite-stat status-pass">✓ ${suite.passed} 通过</span>
                            <span class="suite-stat status-fail">✗ ${suite.failed} 失败</span>
                            <span class="suite-stat">⏸ ${suite.skipped} 跳过</span>
                            <span class="suite-stat">⏱ ${(suite.duration / 1000).toFixed(1)}s</span>
                            ${suite.coverage ? `<span class="suite-stat">📊 ${suite.coverage.toFixed(1)}% 覆盖率</span>` : ''}
                        </div>
                    </div>
                    ${suite.errors.length > 0 ? `
                        <div class="suite-errors">
                            <h4>错误信息:</h4>
                            ${suite.errors.map(error => `<div class="error">${error}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `
  }

  /**
   * 打印控制台报告
   */
  printConsoleReport(report: TestReport): void {
    console.log('\n' + '='.repeat(80))
    console.log('📊 测试报告总结')
    console.log('='.repeat(80))
    
    const statusIcon = report.summary.status === 'PASS' ? '✅' : '❌'
    console.log(`${statusIcon} 总体状态: ${report.summary.status}`)
    console.log(`📈 通过率: ${report.summary.passRate.toFixed(1)}% (${report.totalPassed}/${report.totalTests})`)
    console.log(`📊 代码覆盖率: ${report.summary.coverageRate.toFixed(1)}%`)
    console.log(`⏱️  总耗时: ${(report.totalDuration / 1000).toFixed(1)}秒`)
    
    console.log('\n📋 各测试套件详情:')
    report.suites.forEach(suite => {
      const suiteStatus = suite.failed === 0 ? '✅' : '❌'
      console.log(`${suiteStatus} ${suite.suite}:`)
      console.log(`   通过: ${suite.passed}, 失败: ${suite.failed}, 跳过: ${suite.skipped}`)
      console.log(`   耗时: ${(suite.duration / 1000).toFixed(1)}秒`)
      if (suite.coverage) {
        console.log(`   覆盖率: ${suite.coverage.toFixed(1)}%`)
      }
      if (suite.errors.length > 0) {
        console.log(`   错误: ${suite.errors.length}个`)
      }
    })
    
    console.log('\n' + '='.repeat(80))
  }
}

// 主执行函数
async function main() {
  const runner = new TestRunner()
  
  try {
    const report = await runner.runAllTests()
    
    // 打印控制台报告
    runner.printConsoleReport(report)
    
    // 保存报告文件
    await runner.saveReport(report)
    
    // 根据测试结果设置退出码
    process.exit(report.summary.status === 'PASS' ? 0 : 1)
    
  } catch (error) {
    console.error('❌ 测试运行器执行失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main()
}

export { TestRunner, TestResult, TestReport }