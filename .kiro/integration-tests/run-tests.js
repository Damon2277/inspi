#!/usr/bin/env node

/**
 * 集成测试执行脚本
 * Integration Test Execution Script
 */

const IntegrationTestRunner = require('./test-runner');

async function main() {
  console.log('🔗 项目管理规则增强 - 系统集成验证');
  console.log('=' .repeat(50));
  
  const runner = new IntegrationTestRunner();
  
  try {
    // 运行所有集成测试
    const results = await runner.runAllTests();
    
    // 显示测试摘要
    runner.displaySummary();
    
    // 根据测试结果设置退出码
    const exitCode = results.summary.overallStatus === 'critical' ? 1 : 0;
    
    if (exitCode === 0) {
      console.log('\n🎉 集成测试完成！系统集成状态良好。');
    } else {
      console.log('\n⚠️ 集成测试发现问题，请检查测试结果。');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n❌ 集成测试执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = main;