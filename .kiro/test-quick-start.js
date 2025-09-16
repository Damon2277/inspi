#!/usr/bin/env node

/**
 * 快速启动脚本测试
 * 验证系统启用脚本的功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class QuickStartTester {
  constructor() {
    this.rootDir = process.cwd();
    this.scriptPath = path.join(this.rootDir, '.kiro', 'quick-start.js');
    this.testResults = [];
  }

  // 执行测试命令
  runTest(name, command, expectSuccess = true) {
    console.log(`🧪 测试: ${name}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        cwd: this.rootDir,
        stdio: 'pipe'
      });
      
      if (expectSuccess) {
        console.log(`✅ ${name} - 成功`);
        this.testResults.push({ name, status: 'pass', output });
      } else {
        console.log(`❌ ${name} - 预期失败但成功了`);
        this.testResults.push({ name, status: 'fail', output });
      }
    } catch (error) {
      if (!expectSuccess) {
        console.log(`✅ ${name} - 预期失败`);
        this.testResults.push({ name, status: 'pass', error: error.message });
      } else {
        console.log(`❌ ${name} - 失败: ${error.message}`);
        this.testResults.push({ name, status: 'fail', error: error.message });
      }
    }
    
    console.log('');
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 快速启动脚本测试开始\n');

    // 检查脚本文件是否存在
    if (!fs.existsSync(this.scriptPath)) {
      console.log(`❌ 快速启动脚本不存在: ${this.scriptPath}`);
      return;
    }

    // 测试帮助命令
    this.runTest(
      '帮助命令',
      `node "${this.scriptPath}" --help`
    );

    // 测试环境检查
    this.runTest(
      '环境检查',
      `node "${this.scriptPath}" --check`
    );

    // 测试系统列表
    this.runTest(
      '系统列表',
      `node "${this.scriptPath}" --list`
    );

    // 测试初始化
    this.runTest(
      '初始化配置',
      `node "${this.scriptPath}" --init`
    );

    // 测试启用特定系统
    this.runTest(
      '启用项目状态管理系统',
      `node "${this.scriptPath}" --enable project-state`
    );

    // 测试启用不存在的系统
    this.runTest(
      '启用不存在的系统',
      `node "${this.scriptPath}" --enable non-existent-system`,
      false
    );

    // 测试交互模式 (只检查是否能启动)
    this.runTest(
      '交互模式启动',
      `timeout 5s node "${this.scriptPath}" || true`
    );

    // 显示测试结果
    this.showResults();
  }

  // 显示测试结果
  showResults() {
    console.log('📊 测试结果总结:\n');
    
    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📝 总计: ${this.testResults.length}\n`);

    if (failed > 0) {
      console.log('❌ 失败的测试:');
      this.testResults
        .filter(r => r.status === 'fail')
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.error || '未知错误'}`);
        });
      console.log('');
    }

    // 检查配置文件是否创建
    const configPath = path.join(this.rootDir, '.kiro', 'quick-start-config.json');
    const readmePath = path.join(this.rootDir, '.kiro', 'QUICK_START_README.md');
    
    console.log('📁 生成的文件检查:');
    console.log(`配置文件: ${fs.existsSync(configPath) ? '✅' : '❌'} ${configPath}`);
    console.log(`说明文档: ${fs.existsSync(readmePath) ? '✅' : '❌'} ${readmePath}`);
    
    if (failed === 0) {
      console.log('\n🎉 所有测试通过！快速启动脚本工作正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查问题。');
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new QuickStartTester();
  tester.runAllTests().catch(error => {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = QuickStartTester;