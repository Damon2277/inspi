/**
 * 邀请系统集成测试执行脚本
 * 运行所有集成测试并生成报告
 */

import {
  IntegrationTestRunner,
  createInvitationFlowTestSuite,
  createRewardSystemTestSuite,
  createFraudDetectionTestSuite,
  createPerformanceTestSuite
} from './IntegrationTestRunner'
import { logger } from '@/lib/utils/logger'

async function main() {
  const runner = new IntegrationTestRunner()
  
  try {
    logger.info('Initializing integration test runner')
    
    // 注册所有测试套件
    runner.registerSuite(createInvitationFlowTestSuite())
    runner.registerSuite(createRewardSystemTestSuite())
    runner.registerSuite(createFraudDetectionTestSuite())
    runner.registerSuite(createPerformanceTestSuite())
    
    // 运行所有测试
    logger.info('Starting integration test execution')
    const report = await runner.runAllTests()
    
    // 输出结果摘要
    console.log('\n🎯 集成测试完成!')
    console.log(`📊 总体成功率: ${(report.summary.successRate * 100).toFixed(2)}%`)
    console.log(`⏱️  总耗时: ${report.summary.totalDuration}ms`)
    console.log(`✅ 通过: ${report.summary.passedTests}/${report.summary.totalTests}`)
    
    if (report.summary.failedTests > 0) {
      console.log(`❌ 失败: ${report.summary.failedTests}`)
      
      // 列出失败的测试
      console.log('\n失败的测试:')
      for (const suite of report.suites) {
        for (const test of suite.tests) {
          if (!test.result.success) {
            console.log(`  - ${suite.name}.${test.name}: ${test.result.error?.message}`)
          }
        }
      }
    }
    
    // 根据测试结果设置退出码
    process.exit(report.summary.failedTests > 0 ? 1 : 0)
    
  } catch (error) {
    logger.error('Integration test execution failed', { error })
    console.error('❌ 集成测试执行失败:', error)
    process.exit(1)
  } finally {
    await runner.cleanup()
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason })
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error })
  process.exit(1)
})

// 运行测试
if (require.main === module) {
  main()
}

export { main as runIntegrationTests }