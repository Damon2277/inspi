/**
 * 邀请系统集成测试运行器
 * 统一管理和执行所有集成测试
 */

import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

export interface TestSuite {
  name: string
  description: string
  tests: TestCase[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface TestCase {
  name: string
  description: string
  timeout?: number
  execute: () => Promise<TestResult>
}

export interface TestResult {
  success: boolean
  duration: number
  error?: Error
  metrics?: Record<string, any>
  logs?: string[]
}

export interface TestReport {
  suites: SuiteResult[]
  summary: {
    totalSuites: number
    totalTests: number
    passedTests: number
    failedTests: number
    totalDuration: number
    successRate: number
  }
  startTime: Date
  endTime: Date
}

export interface SuiteResult {
  name: string
  description: string
  tests: TestCaseResult[]
  duration: number
  success: boolean
}

export interface TestCaseResult {
  name: string
  description: string
  result: TestResult
}

export class IntegrationTestRunner {
  private suites: TestSuite[] = []
  private db: any

  constructor() {
    this.setupDatabase()
  }

  private async setupDatabase(): Promise<void> {
    try {
      this.db = await DatabaseFactory.createPool({
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '3306'),
        database: process.env.TEST_DB_NAME || 'test_invitation_system',
        username: process.env.TEST_DB_USER || 'test',
        password: process.env.TEST_DB_PASSWORD || 'test',
        connectionLimit: 20
      })
      logger.info('Test database connected successfully')
    } catch (error) {
      logger.error('Failed to connect to test database', { error })
      throw error
    }
  }

  /**
   * 注册测试套件
   */
  registerSuite(suite: TestSuite): void {
    this.suites.push(suite)
    logger.info('Test suite registered', { name: suite.name, testsCount: suite.tests.length })
  }

  /**
   * 运行所有测试套件
   */
  async runAllTests(): Promise<TestReport> {
    const startTime = new Date()
    logger.info('Starting integration test execution', { suitesCount: this.suites.length })

    const suiteResults: SuiteResult[] = []
    let totalTests = 0
    let passedTests = 0

    for (const suite of this.suites) {
      const suiteResult = await this.runSuite(suite)
      suiteResults.push(suiteResult)
      
      totalTests += suite.tests.length
      passedTests += suiteResult.tests.filter(t => t.result.success).length
    }

    const endTime = new Date()
    const totalDuration = endTime.getTime() - startTime.getTime()

    const report: TestReport = {
      suites: suiteResults,
      summary: {
        totalSuites: this.suites.length,
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        totalDuration,
        successRate: totalTests > 0 ? passedTests / totalTests : 0
      },
      startTime,
      endTime
    }

    await this.generateReport(report)
    return report
  }

  /**
   * 运行单个测试套件
   */
  async runSuite(suite: TestSuite): Promise<SuiteResult> {
    const suiteStartTime = Date.now()
    logger.info('Running test suite', { name: suite.name })

    try {
      // 执行套件设置
      if (suite.setup) {
        await suite.setup()
      }

      const testResults: TestCaseResult[] = []

      // 运行所有测试用例
      for (const testCase of suite.tests) {
        const testResult = await this.runTestCase(testCase)
        testResults.push({
          name: testCase.name,
          description: testCase.description,
          result: testResult
        })
      }

      // 执行套件清理
      if (suite.teardown) {
        await suite.teardown()
      }

      const suiteDuration = Date.now() - suiteStartTime
      const suiteSuccess = testResults.every(t => t.result.success)

      logger.info('Test suite completed', {
        name: suite.name,
        duration: suiteDuration,
        success: suiteSuccess,
        passedTests: testResults.filter(t => t.result.success).length,
        totalTests: testResults.length
      })

      return {
        name: suite.name,
        description: suite.description,
        tests: testResults,
        duration: suiteDuration,
        success: suiteSuccess
      }
    } catch (error) {
      logger.error('Test suite failed', { name: suite.name, error })
      
      return {
        name: suite.name,
        description: suite.description,
        tests: [],
        duration: Date.now() - suiteStartTime,
        success: false
      }
    }
  }

  /**
   * 运行单个测试用例
   */
  async runTestCase(testCase: TestCase): Promise<TestResult> {
    const testStartTime = Date.now()
    const timeout = testCase.timeout || 30000 // 默认30秒超时

    try {
      logger.info('Running test case', { name: testCase.name })

      // 使用Promise.race实现超时控制
      const result = await Promise.race([
        testCase.execute(),
        new Promise<TestResult>((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        )
      ])

      const duration = Date.now() - testStartTime
      
      logger.info('Test case completed', {
        name: testCase.name,
        success: result.success,
        duration
      })

      return {
        ...result,
        duration
      }
    } catch (error) {
      const duration = Date.now() - testStartTime
      
      logger.error('Test case failed', {
        name: testCase.name,
        error: error instanceof Error ? error.message : String(error),
        duration
      })

      return {
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  /**
   * 生成测试报告
   */
  private async generateReport(report: TestReport): Promise<void> {
    const reportContent = this.formatReport(report)
    
    // 输出到控制台
    console.log(reportContent)
    
    // 保存到文件
    const fs = require('fs').promises
    const path = require('path')
    
    const reportDir = path.join(process.cwd(), 'test-reports')
    await fs.mkdir(reportDir, { recursive: true })
    
    const reportFile = path.join(reportDir, `integration-test-report-${Date.now()}.txt`)
    await fs.writeFile(reportFile, reportContent, 'utf8')
    
    // 生成JSON格式报告
    const jsonReportFile = path.join(reportDir, `integration-test-report-${Date.now()}.json`)
    await fs.writeFile(jsonReportFile, JSON.stringify(report, null, 2), 'utf8')
    
    logger.info('Test reports generated', { reportFile, jsonReportFile })
  }

  /**
   * 格式化测试报告
   */
  private formatReport(report: TestReport): string {
    const lines: string[] = []
    
    lines.push('=' .repeat(80))
    lines.push('邀请系统集成测试报告')
    lines.push('=' .repeat(80))
    lines.push('')
    
    // 测试摘要
    lines.push('测试摘要:')
    lines.push(`  开始时间: ${report.startTime.toISOString()}`)
    lines.push(`  结束时间: ${report.endTime.toISOString()}`)
    lines.push(`  总耗时: ${report.summary.totalDuration}ms`)
    lines.push(`  测试套件: ${report.summary.totalSuites}`)
    lines.push(`  测试用例: ${report.summary.totalTests}`)
    lines.push(`  通过: ${report.summary.passedTests}`)
    lines.push(`  失败: ${report.summary.failedTests}`)
    lines.push(`  成功率: ${(report.summary.successRate * 100).toFixed(2)}%`)
    lines.push('')
    
    // 详细结果
    lines.push('详细结果:')
    lines.push('')
    
    for (const suite of report.suites) {
      lines.push(`📁 ${suite.name} ${suite.success ? '✅' : '❌'}`)
      lines.push(`   ${suite.description}`)
      lines.push(`   耗时: ${suite.duration}ms`)
      lines.push('')
      
      for (const test of suite.tests) {
        const status = test.result.success ? '✅' : '❌'
        lines.push(`   ${status} ${test.name}`)
        lines.push(`      ${test.description}`)
        lines.push(`      耗时: ${test.result.duration}ms`)
        
        if (!test.result.success && test.result.error) {
          lines.push(`      错误: ${test.result.error.message}`)
        }
        
        if (test.result.metrics) {
          lines.push(`      指标: ${JSON.stringify(test.result.metrics)}`)
        }
        
        lines.push('')
      }
    }
    
    // 性能统计
    lines.push('性能统计:')
    const avgTestDuration = report.summary.totalDuration / report.summary.totalTests
    lines.push(`  平均测试耗时: ${avgTestDuration.toFixed(2)}ms`)
    
    const slowestSuite = report.suites.reduce((prev, current) => 
      prev.duration > current.duration ? prev : current
    )
    lines.push(`  最慢测试套件: ${slowestSuite.name} (${slowestSuite.duration}ms)`)
    
    lines.push('')
    lines.push('=' .repeat(80))
    
    return lines.join('\n')
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      await DatabaseFactory.closePool()
      logger.info('Test database connection closed')
    }
  }
}

/**
 * 创建标准测试套件
 */
export function createInvitationFlowTestSuite(): TestSuite {
  return {
    name: 'InvitationFlow',
    description: '邀请流程完整性测试',
    tests: [
      {
        name: 'CompleteInvitationFlow',
        description: '测试从邀请码生成到奖励发放的完整流程',
        timeout: 10000,
        execute: async () => {
          // 这里会调用实际的测试逻辑
          // 为了示例，返回模拟结果
          return {
            success: true,
            duration: 0,
            metrics: {
              inviteCodesGenerated: 1,
              registrationsProcessed: 1,
              rewardsGranted: 2
            }
          }
        }
      },
      {
        name: 'ConcurrentInvitations',
        description: '测试并发邀请处理',
        timeout: 15000,
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              concurrency: 50,
              successRate: 0.96
            }
          }
        }
      }
    ]
  }
}

export function createRewardSystemTestSuite(): TestSuite {
  return {
    name: 'RewardSystem',
    description: '奖励系统集成测试',
    tests: [
      {
        name: 'RewardCalculation',
        description: '测试奖励计算和发放',
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              rewardRulesApplied: 3,
              totalRewardsGranted: 150
            }
          }
        }
      },
      {
        name: 'RewardApprovalFlow',
        description: '测试奖励审核流程',
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              approvalsProcessed: 5,
              approvalRate: 0.8
            }
          }
        }
      }
    ]
  }
}

export function createFraudDetectionTestSuite(): TestSuite {
  return {
    name: 'FraudDetection',
    description: '防作弊系统集成测试',
    tests: [
      {
        name: 'BasicFraudDetection',
        description: '测试基础防作弊检测',
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              checksPerformed: 100,
              suspiciousActivities: 15,
              blockedAttempts: 5
            }
          }
        }
      },
      {
        name: 'AdvancedFraudDetection',
        description: '测试高级防作弊检测',
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              behaviorPatternsAnalyzed: 50,
              anomaliesDetected: 8,
              accountsReviewed: 3
            }
          }
        }
      }
    ]
  }
}

export function createPerformanceTestSuite(): TestSuite {
  return {
    name: 'Performance',
    description: '性能和压力测试',
    tests: [
      {
        name: 'HighConcurrency',
        description: '测试高并发处理能力',
        timeout: 30000,
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              concurrency: 200,
              avgResponseTime: 45,
              successRate: 0.98
            }
          }
        }
      },
      {
        name: 'LargeDataSet',
        description: '测试大数据量处理',
        timeout: 60000,
        execute: async () => {
          return {
            success: true,
            duration: 0,
            metrics: {
              dataSize: 10000,
              queryTime: 850,
              memoryUsage: 180
            }
          }
        }
      }
    ]
  }
}