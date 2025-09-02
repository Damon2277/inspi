/**
 * API测试运行脚本
 * 提供统一的API测试执行入口
 */

import { execSync } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import path from 'path'

interface TestSuite {
  name: string
  pattern: string
  description: string
  timeout?: number
}

interface TestResults {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
}

class ApiTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'setup',
      pattern: 'src/__tests__/api/setup/*.test.ts',
      description: 'API测试基础设施',
      timeout: 30000,
    },
    {
      name: 'auth',
      pattern: 'src/__tests__/api/auth/*.test.ts',
      description: '认证API测试',
      timeout: 60000,
    },
    {
      name: 'works',
      pattern: 'src/__tests__/api/works/*.test.ts',
      description: '作品API测试',
      timeout: 90000,
    },
    {
      name: 'users',
      pattern: 'src/__tests__/api/users/*.test.ts',
      description: '用户API测试',
      timeout: 60000,
    },
    {
      name: 'subscription',
      pattern: 'src/__tests__/api/subscription/*.test.ts',
      description: '订阅API测试',
      timeout: 60000,
    },
    {
      name: 'contact',
      pattern: 'src/__tests__/api/contact/*.test.ts',
      description: '联系API测试',
      timeout: 45000,
    },
    {
      name: 'leaderboard',
      pattern: 'src/__tests__/api/leaderboard/*.test.ts',
      description: '排行榜API测试',
      timeout: 60000,
    },
    {
      name: 'knowledge-graph',
      pattern: 'src/__tests__/api/knowledge-graph/*.test.ts',
      description: '知识图谱API测试',
      timeout: 90000,
    },
    {
      name: 'magic',
      pattern: 'src/__tests__/api/magic/*.test.ts',
      description: 'AI魔法师API测试',
      timeout: 120000,
    },
    {
      name: 'contribution',
      pattern: 'src/__tests__/api/contribution/*.test.ts',
      description: '贡献度API测试',
      timeout: 75000,
    },
    {
      name: 'integration',
      pattern: 'src/__tests__/api/integration/*.test.ts',
      description: 'API集成测试',
      timeout: 120000,
    },
  ]

  private results: TestResults[] = []

  async runAllTests(): Promise<void> {
    console.log('🚀 开始运行API测试套件...\n')

    const startTime = Date.now()

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite)
    }

    const totalTime = Date.now() - startTime
    this.generateReport(totalTime)
  }

  async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 运行测试套件: ${suite.name} - ${suite.description}`)
    
    const startTime = Date.now()
    
    try {
      const command = this.buildJestCommand(suite)
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout || 60000,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          JEST_TIMEOUT: (suite.timeout || 60000).toString(),
        }
      })

      const result = this.parseJestOutput(output, suite.name)
      result.duration = Date.now() - startTime
      this.results.push(result)

      console.log(`✅ ${suite.name}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped (${result.duration}ms)\n`)

    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`❌ ${suite.name} 测试失败:`, error.message)
      
      this.results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
      })
    }
  }

  private buildJestCommand(suite: TestSuite): string {
    const baseCommand = 'npx jest'
    const configFile = '--config=jest.config.integration.js'
    const pattern = `--testPathPattern="${suite.pattern}"`
    const options = [
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      '--maxWorkers=1', // 串行执行避免资源冲突
      '--coverage',
      '--coverageDirectory=coverage/api',
      `--testTimeout=${suite.timeout || 60000}`,
    ]

    return `${baseCommand} ${configFile} ${pattern} ${options.join(' ')}`
  }

  private parseJestOutput(output: string, suiteName: string): TestResults {
    const result: TestResults = {
      suite: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    }

    // 解析Jest输出
    const testResultMatch = output.match(/Tests:\\s+(\\d+) failed,\\s+(\\d+) passed,\\s+(\\d+) total/)
    if (testResultMatch) {
      result.failed = parseInt(testResultMatch[1])
      result.passed = parseInt(testResultMatch[2])
    }

    const skippedMatch = output.match(/(\\d+) skipped/)
    if (skippedMatch) {
      result.skipped = parseInt(skippedMatch[1])
    }

    // 解析覆盖率
    const coverageMatch = output.match(/All files\\s+\\|\\s+(\\d+\\.\\d+)\\s+\\|\\s+(\\d+\\.\\d+)\\s+\\|\\s+(\\d+\\.\\d+)\\s+\\|\\s+(\\d+\\.\\d+)/)
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4]),
      }
    }

    return result
  }

  private generateReport(totalTime: number): void {
    console.log('📊 生成测试报告...\n')

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)
    const totalTests = totalPassed + totalFailed + totalSkipped

    // 控制台报告
    console.log('=' .repeat(80))
    console.log('🎯 API测试总结报告')
    console.log('=' .repeat(80))
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`)
    console.log(`失败: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`)
    console.log(`跳过: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`)
    console.log(`总耗时: ${(totalTime / 1000).toFixed(2)}s`)
    console.log()

    // 各套件详情
    console.log('📋 各测试套件详情:')
    console.log('-'.repeat(80))
    this.results.forEach(result => {
      const suite = this.testSuites.find(s => s.name === result.suite)
      const status = result.failed > 0 ? '❌' : '✅'
      const duration = (result.duration / 1000).toFixed(2)
      
      console.log(`${status} ${result.suite.padEnd(15)} | ${result.passed.toString().padStart(3)} passed | ${result.failed.toString().padStart(3)} failed | ${duration}s | ${suite?.description || ''}`)
      
      if (result.coverage) {
        console.log(`   覆盖率: 语句 ${result.coverage.statements}% | 分支 ${result.coverage.branches}% | 函数 ${result.coverage.functions}% | 行 ${result.coverage.lines}%`)
      }
    })

    // 生成JSON报告
    this.generateJsonReport(totalTime)

    // 生成HTML报告
    this.generateHtmlReport(totalTime)

    console.log()
    if (totalFailed > 0) {
      console.log('❌ 部分测试失败，请检查详细日志')
      process.exit(1)
    } else {
      console.log('✅ 所有API测试通过！')
    }
  }

  private generateJsonReport(totalTime: number): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalTime,
      summary: {
        total: this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
        passed: this.results.reduce((sum, r) => sum + r.passed, 0),
        failed: this.results.reduce((sum, r) => sum + r.failed, 0),
        skipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      },
      suites: this.results,
    }

    const reportPath = path.join(process.cwd(), 'coverage/api/test-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 JSON报告已生成: ${reportPath}`)
  }

  private generateHtmlReport(totalTime: number): void {
    const html = this.generateHtmlContent(totalTime)
    const reportPath = path.join(process.cwd(), 'coverage/api/test-report.html')
    writeFileSync(reportPath, html)
    console.log(`🌐 HTML报告已生成: ${reportPath}`)
  }

  private generateHtmlContent(totalTime: number): string {
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)
    const totalTests = totalPassed + totalFailed + totalSkipped

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header .subtitle { opacity: 0.9; margin-top: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .summary-card.passed { border-left-color: #28a745; }
        .summary-card.failed { border-left-color: #dc3545; }
        .summary-card.skipped { border-left-color: #ffc107; }
        .summary-card h3 { margin: 0; font-size: 2em; }
        .summary-card p { margin: 5px 0 0; color: #666; }
        .suites { padding: 0 30px 30px; }
        .suite { margin-bottom: 20px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; }
        .suite-header h3 { margin: 0; }
        .suite-stats { display: flex; gap: 15px; font-size: 0.9em; }
        .stat { padding: 4px 8px; border-radius: 4px; }
        .stat.passed { background: #d4edda; color: #155724; }
        .stat.failed { background: #f8d7da; color: #721c24; }
        .stat.skipped { background: #fff3cd; color: #856404; }
        .coverage { padding: 15px; background: #f8f9fa; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .timestamp { text-align: center; padding: 20px; color: #666; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 API测试报告</h1>
            <div class="subtitle">InspiAI平台 - API接口测试体系</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>${totalTests}</h3>
                <p>总测试数</p>
            </div>
            <div class="summary-card passed">
                <h3>${totalPassed}</h3>
                <p>通过 (${((totalPassed / totalTests) * 100).toFixed(1)}%)</p>
            </div>
            <div class="summary-card failed">
                <h3>${totalFailed}</h3>
                <p>失败 (${((totalFailed / totalTests) * 100).toFixed(1)}%)</p>
            </div>
            <div class="summary-card skipped">
                <h3>${totalSkipped}</h3>
                <p>跳过 (${((totalSkipped / totalTests) * 100).toFixed(1)}%)</p>
            </div>
        </div>
        
        <div class="suites">
            <h2>📋 测试套件详情</h2>
            ${this.results.map(result => {
              const suite = this.testSuites.find(s => s.name === result.suite)
              const total = result.passed + result.failed + result.skipped
              return `
                <div class="suite">
                    <div class="suite-header">
                        <h3>${result.failed > 0 ? '❌' : '✅'} ${result.suite} - ${suite?.description || ''}</h3>
                        <div class="suite-stats">
                            <span class="stat passed">${result.passed} 通过</span>
                            <span class="stat failed">${result.failed} 失败</span>
                            <span class="stat skipped">${result.skipped} 跳过</span>
                            <span>${(result.duration / 1000).toFixed(2)}s</span>
                        </div>
                    </div>
                    ${result.coverage ? `
                    <div class="coverage">
                        <h4>代码覆盖率</h4>
                        <div>
                            语句覆盖率: ${result.coverage.statements}%
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${result.coverage.statements}%"></div>
                            </div>
                        </div>
                        <div>
                            分支覆盖率: ${result.coverage.branches}%
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${result.coverage.branches}%"></div>
                            </div>
                        </div>
                        <div>
                            函数覆盖率: ${result.coverage.functions}%
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${result.coverage.functions}%"></div>
                            </div>
                        </div>
                        <div>
                            行覆盖率: ${result.coverage.lines}%
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${result.coverage.lines}%"></div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
              `
            }).join('')}
        </div>
        
        <div class="timestamp">
            报告生成时间: ${new Date().toLocaleString('zh-CN')} | 总耗时: ${(totalTime / 1000).toFixed(2)}秒
        </div>
    </div>
</body>
</html>
    `
  }

  async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = this.testSuites.find(s => s.name === suiteName)
    if (!suite) {
      console.error(`❌ 未找到测试套件: ${suiteName}`)
      console.log('可用的测试套件:')
      this.testSuites.forEach(s => console.log(`  - ${s.name}: ${s.description}`))
      return
    }

    console.log(`🎯 运行指定测试套件: ${suiteName}\n`)
    await this.runTestSuite(suite)
    this.generateReport(this.results[0]?.duration || 0)
  }

  listSuites(): void {
    console.log('📋 可用的API测试套件:\n')
    this.testSuites.forEach(suite => {
      console.log(`🔹 ${suite.name.padEnd(15)} - ${suite.description}`)
      console.log(`   模式: ${suite.pattern}`)
      console.log(`   超时: ${(suite.timeout || 60000) / 1000}s\n`)
    })
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2)
  const runner = new ApiTestRunner()

  if (args.length === 0) {
    await runner.runAllTests()
  } else if (args[0] === 'list') {
    runner.listSuites()
  } else if (args[0] === 'suite' && args[1]) {
    await runner.runSpecificSuite(args[1])
  } else {
    console.log('用法:')
    console.log('  npm run test:api              # 运行所有API测试')
    console.log('  npm run test:api list          # 列出所有测试套件')
    console.log('  npm run test:api suite <name>  # 运行指定测试套件')
    console.log()
    console.log('示例:')
    console.log('  npm run test:api suite auth    # 只运行认证API测试')
    console.log('  npm run test:api suite works   # 只运行作品API测试')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { ApiTestRunner }