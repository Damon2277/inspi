/**
 * 测试报告生成器
 * 用于生成详细的测试报告和覆盖率分析
 */

import fs from 'fs'
import path from 'path'

export interface TestResult {
  testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security'
  suiteName: string
  testName: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  coverage?: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
}

export interface TestSummary {
  testType: string
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
}

export class TestReporter {
  private results: TestResult[] = []
  private startTime: number = Date.now()

  // 添加测试结果
  addResult(result: TestResult) {
    this.results.push(result)
  }

  // 生成测试摘要
  generateSummary(): TestSummary[] {
    const summaryMap = new Map<string, TestSummary>()

    this.results.forEach(result => {
      const key = result.testType
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          testType: key,
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
          coverage: {
            lines: 0,
            functions: 0,
            branches: 0,
            statements: 0,
          },
        })
      }

      const summary = summaryMap.get(key)!
      summary.total++
      summary.duration += result.duration

      switch (result.status) {
        case 'passed':
          summary.passed++
          break
        case 'failed':
          summary.failed++
          break
        case 'skipped':
          summary.skipped++
          break
      }

      if (result.coverage) {
        summary.coverage.lines += result.coverage.lines
        summary.coverage.functions += result.coverage.functions
        summary.coverage.branches += result.coverage.branches
        summary.coverage.statements += result.coverage.statements
      }
    })

    // 计算平均覆盖率
    summaryMap.forEach(summary => {
      const count = summary.passed + summary.failed
      if (count > 0) {
        summary.coverage.lines /= count
        summary.coverage.functions /= count
        summary.coverage.branches /= count
        summary.coverage.statements /= count
      }
    })

    return Array.from(summaryMap.values())
  }

  // 生成HTML报告
  generateHtmlReport(): string {
    const summary = this.generateSummary()
    const totalDuration = Date.now() - this.startTime

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Inspi AI Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%); }
        .details { margin-top: 30px; }
        .test-result { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-result.passed { background: #d4edda; }
        .test-result.failed { background: #f8d7da; }
        .test-result.skipped { background: #fff3cd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report - Inspi AI Platform</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Total Duration: ${totalDuration}ms</p>
    </div>

    <div class="summary">
        ${summary.map(s => `
            <div class="card">
                <h3>${s.testType.toUpperCase()} Tests</h3>
                <p>Total: ${s.total}</p>
                <p class="passed">Passed: ${s.passed}</p>
                <p class="failed">Failed: ${s.failed}</p>
                <p class="skipped">Skipped: ${s.skipped}</p>
                <p>Duration: ${s.duration}ms</p>
                
                <h4>Coverage</h4>
                <div>
                    <p>Lines: ${s.coverage.lines.toFixed(1)}%</p>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${s.coverage.lines}%"></div>
                    </div>
                </div>
                <div>
                    <p>Functions: ${s.coverage.functions.toFixed(1)}%</p>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${s.coverage.functions}%"></div>
                    </div>
                </div>
                <div>
                    <p>Branches: ${s.coverage.branches.toFixed(1)}%</p>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${s.coverage.branches}%"></div>
                    </div>
                </div>
                <div>
                    <p>Statements: ${s.coverage.statements.toFixed(1)}%</p>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${s.coverage.statements}%"></div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="details">
        <h2>Test Details</h2>
        ${this.results.map(result => `
            <div class="test-result ${result.status}">
                <strong>${result.testType}</strong> - ${result.suiteName} - ${result.testName}
                <span style="float: right;">${result.duration}ms</span>
                ${result.error ? `<div style="color: red; margin-top: 5px;">${result.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `
  }

  // 生成JSON报告
  generateJsonReport() {
    return {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: this.generateSummary(),
      results: this.results,
    }
  }

  // 保存报告到文件
  async saveReport(format: 'html' | 'json' = 'html') {
    const reportsDir = path.join(process.cwd(), 'reports')
    
    // 确保reports目录存在
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    if (format === 'html') {
      const htmlReport = this.generateHtmlReport()
      const filePath = path.join(reportsDir, `test-report-${timestamp}.html`)
      fs.writeFileSync(filePath, htmlReport)
      console.log(`📊 HTML report saved to: ${filePath}`)
      return filePath
    } else {
      const jsonReport = this.generateJsonReport()
      const filePath = path.join(reportsDir, `test-report-${timestamp}.json`)
      fs.writeFileSync(filePath, JSON.stringify(jsonReport, null, 2))
      console.log(`📊 JSON report saved to: ${filePath}`)
      return filePath
    }
  }

  // 打印控制台摘要
  printSummary() {
    const summary = this.generateSummary()
    const totalDuration = Date.now() - this.startTime

    console.log('\n📊 Test Summary')
    console.log('================')
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log('')

    summary.forEach(s => {
      console.log(`${s.testType.toUpperCase()} Tests:`)
      console.log(`  Total: ${s.total}`)
      console.log(`  ✅ Passed: ${s.passed}`)
      console.log(`  ❌ Failed: ${s.failed}`)
      console.log(`  ⏭️  Skipped: ${s.skipped}`)
      console.log(`  ⏱️  Duration: ${s.duration}ms`)
      console.log(`  📈 Coverage:`)
      console.log(`    Lines: ${s.coverage.lines.toFixed(1)}%`)
      console.log(`    Functions: ${s.coverage.functions.toFixed(1)}%`)
      console.log(`    Branches: ${s.coverage.branches.toFixed(1)}%`)
      console.log(`    Statements: ${s.coverage.statements.toFixed(1)}%`)
      console.log('')
    })
  }

  // 检查是否通过质量门禁
  checkQualityGate(thresholds: {
    coverage: { lines: number; functions: number; branches: number; statements: number }
    passRate: number
  }): boolean {
    const summary = this.generateSummary()
    
    for (const s of summary) {
      const passRate = s.total > 0 ? (s.passed / s.total) * 100 : 0
      
      if (passRate < thresholds.passRate) {
        console.error(`❌ Quality gate failed: ${s.testType} pass rate ${passRate.toFixed(1)}% < ${thresholds.passRate}%`)
        return false
      }
      
      if (s.coverage.lines < thresholds.coverage.lines) {
        console.error(`❌ Quality gate failed: ${s.testType} line coverage ${s.coverage.lines.toFixed(1)}% < ${thresholds.coverage.lines}%`)
        return false
      }
      
      if (s.coverage.functions < thresholds.coverage.functions) {
        console.error(`❌ Quality gate failed: ${s.testType} function coverage ${s.coverage.functions.toFixed(1)}% < ${thresholds.coverage.functions}%`)
        return false
      }
    }
    
    console.log('✅ All quality gates passed!')
    return true
  }
}

// 全局测试报告器实例
export const globalTestReporter = new TestReporter()

// Jest自定义报告器
export class JestTestReporter {
  onRunComplete(contexts: any, results: any) {
    results.testResults.forEach((testResult: any) => {
      testResult.testResults.forEach((test: any) => {
        globalTestReporter.addResult({
          testType: process.env.TEST_TYPE as any || 'unit',
          suiteName: testResult.testFilePath.split('/').pop(),
          testName: test.title,
          status: test.status === 'passed' ? 'passed' : test.status === 'failed' ? 'failed' : 'skipped',
          duration: test.duration || 0,
          error: test.failureMessages?.[0],
        })
      })
    })

    globalTestReporter.printSummary()
    globalTestReporter.saveReport('html')
    globalTestReporter.saveReport('json')
  }
}