#!/usr/bin/env node

/**
 * 系统集成验证 CLI
 * System Integration Validation CLI
 */

const SystemIntegrationValidator = require('./index');

class IntegrationTestCLI {
  constructor() {
    this.validator = new SystemIntegrationValidator();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'test':
          await this.runTests();
          break;
        case 'report':
          await this.generateReport();
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'matrix':
          await this.showIntegrationMatrix();
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ 命令执行失败:', error.message);
      process.exit(1);
    }
  }

  async runTests() {
    console.log('🧪 运行系统集成测试...');
    
    // 初始化验证器
    const initResult = await this.validator.initialize();
    if (!initResult.success) {
      console.error(`❌ 初始化失败: ${initResult.error}`);
      return;
    }

    console.log(`✅ 验证器初始化完成 (加载 ${initResult.loadedSystems} 个系统)`);

    // 运行核心集成测试
    const testResults = await this.validator.runCoreIntegrationTests();
    
    // 显示测试结果
    this.displayTestResults(testResults);

    // 生成集成报告
    const reportResult = await this.validator.generateIntegrationReport(testResults);
    if (reportResult.success) {
      console.log(`📊 集成报告: ${reportResult.reportFile}`);
    }

    // 根据测试结果设置退出码
    process.exit(testResults.success ? 0 : 1);
  }

  async generateReport() {
    console.log('📊 生成集成报告...');
    
    await this.validator.initialize();
    
    // 运行测试以获取最新结果
    const testResults = await this.validator.runCoreIntegrationTests();
    
    // 生成详细报告
    const reportResult = await this.validator.generateIntegrationReport(testResults);
    
    if (reportResult.success) {
      console.log(`✅ 报告生成成功: ${reportResult.reportFile}`);
      
      const report = reportResult.report;
      console.log('\n📋 报告摘要:');
      console.log(`  状态: ${report.summary.overallStatus}`);
      console.log(`  成功率: ${report.summary.successRate}%`);
      console.log(`  通过: ${report.summary.passedTests}/${report.summary.totalTests}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 建议:');
        report.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }
      
    } else {
      console.error(`❌ 报告生成失败: ${reportResult.error}`);
    }
  }

  async showStatus() {
    console.log('📊 系统集成状态');
    
    await this.validator.initialize();
    
    const systemStatus = await this.validator.getSystemStatus();
    const matrixSummary = this.validator.getIntegrationMatrixSummary();
    
    console.log('\n🔧 系统状态:');
    Object.entries(systemStatus).forEach(([name, status]) => {
      const statusIcon = status.loaded ? '🟢' : '🔴';
      console.log(`  ${statusIcon} ${name}: ${status.status} (${status.type})`);
    });

    console.log('\n🔗 集成矩阵:');
    console.log(`  总集成点: ${matrixSummary.totalIntegrations}`);
    console.log(`  已测试: ${matrixSummary.testedIntegrations}`);
    console.log(`  通过: ${matrixSummary.passedIntegrations}`);
    console.log(`  失败: ${matrixSummary.failedIntegrations}`);
  }

  async showIntegrationMatrix() {
    console.log('🔗 集成矩阵详情');
    
    await this.validator.initialize();
    
    const matrix = this.validator.integrationMatrix;
    
    console.log('\n📊 系统间集成状态:');
    
    const systems = ['version', 'quality', 'style', 'recovery', 'dashboard', 'config'];
    
    // 显示矩阵表头
    console.log('     ' + systems.map(s => s.padEnd(8)).join(' '));
    console.log('     ' + systems.map(() => '--------').join(' '));
    
    // 显示矩阵内容
    systems.forEach(fromSystem => {
      let row = fromSystem.padEnd(5);
      systems.forEach(toSystem => {
        if (fromSystem === toSystem) {
          row += '   -    ';
        } else {
          const key = `${fromSystem}->${toSystem}`;
          const integration = matrix.get(key);
          const status = integration ? (integration.tested ? '✅' : '⏳') : '❓';
          row += `   ${status}   `;
        }
      });
      console.log(row);
    });

    console.log('\n图例:');
    console.log('  ✅ 已测试通过');
    console.log('  ❌ 测试失败');
    console.log('  ⏳ 待测试');
    console.log('  ❓ 未知状态');
    console.log('  -  相同系统');
  }

  displayTestResults(testResults) {
    console.log('\n📋 测试结果详情:');
    console.log(`总体状态: ${testResults.success ? '🟢 通过' : '🔴 失败'}`);
    console.log(`成功率: ${testResults.successRate}%`);
    console.log(`测试数量: ${testResults.passedTests}/${testResults.totalTests} 通过`);
    
    console.log('\n📊 各项测试结果:');
    testResults.tests.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.name}`);
      console.log(`   描述: ${test.description}`);
      
      if (test.details && test.details.length > 0) {
        console.log('   详情:');
        test.details.forEach(detail => {
          const detailStatus = detail.success ? '✅' : '❌';
          console.log(`     ${detailStatus} ${detail.name}: ${detail.message || detail.error}`);
        });
      }
      
      if (test.issues && test.issues.length > 0) {
        console.log('   问题:');
        test.issues.forEach(issue => {
          console.log(`     • ${issue}`);
        });
      }
      
      console.log('');
    });
  }

  showHelp() {
    console.log(`
🧪 系统集成验证 CLI

用法: node cli.js <命令>

命令:
  test                     运行完整的集成测试
  report                   生成详细的集成报告
  status                   显示系统集成状态
  matrix                   显示集成矩阵
  help                     显示此帮助信息

测试类型:
  📊 系统间数据流验证     验证各系统间的数据传递
  🔌 接口兼容性验证       验证系统接口的兼容性
  ⚙️ 配置一致性验证       验证配置的一致性和完整性
  🔄 工作流程完整性验证   验证关键工作流程
  ⚠️ 错误处理集成验证     验证错误处理机制

示例:
  node cli.js test         # 运行所有集成测试
  node cli.js status       # 查看系统状态
  node cli.js matrix       # 查看集成矩阵
  node cli.js report       # 生成详细报告

输出文件:
  📊 测试结果: .kiro/integration-tests/results/
  📋 集成报告: .kiro/integration-tests/reports/

功能特性:
  🔍 全面的系统集成验证
  📊 详细的测试报告
  🔗 可视化集成矩阵
  ⚠️ 错误处理验证
  📈 性能和稳定性检查
`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new IntegrationTestCLI();
  cli.run().catch(error => {
    console.error('❌ CLI运行失败:', error.message);
    process.exit(1);
  });
}

module.exports = IntegrationTestCLI;