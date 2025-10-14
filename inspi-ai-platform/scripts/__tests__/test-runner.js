/**
 * 版本管理系统测试运行器
 * 执行所有测试并生成综合报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0, duration: 0 },
      integration: { passed: 0, failed: 0, total: 0, duration: 0 },
      requirements: { passed: 0, failed: 0, total: 0, duration: 0 },
      gitOps: { passed: 0, failed: 0, total: 0, duration: 0 },
      overall: { passed: 0, failed: 0, total: 0, duration: 0 }
    };
    this.testSuites = [
      {
        name: 'unit',
        description: '单元测试',
        files: [
          'bump-version.test.js',
          'git-flow.test.js',
          'validate-commit-msg.test.js',
          'version-history.test.js',
          'version-rollback.test.js',
          'release-doc-generator.test.js'
        ]
      },
      {
        name: 'integration',
        description: '集成测试',
        files: [
          'version-management-integration.test.js'
        ]
      },
      {
        name: 'gitOps',
        description: 'Git操作验证测试',
        files: [
          'git-operations-validation.test.js'
        ]
      },
      {
        name: 'requirements',
        description: '需求验证测试',
        files: [
          'version-management-requirements.test.js'
        ]
      }
    ];
  }

  async runAllTests() {
    console.log('🚀 开始执行版本管理系统测试套件\n');
    
    const startTime = Date.now();
    
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }
    
    const endTime = Date.now();
    this.testResults.overall.duration = endTime - startTime;
    
    this.calculateOverallResults();
    this.generateReport();
    this.generateJUnitReport();
    
    return this.testResults;
  }

  async runTestSuite(suite) {
    console.log(`📋 执行${suite.description}...`);
    
    const suiteStartTime = Date.now();
    let suitePassed = 0;
    let suiteFailed = 0;
    let suiteTotal = 0;
    
    for (const testFile of suite.files) {
      const testPath = path.join(__dirname, testFile);
      
      if (!fs.existsSync(testPath)) {
        console.log(`⚠️  测试文件不存在: ${testFile}`);
        continue;
      }
      
      try {
        console.log(`  🧪 运行 ${testFile}...`);
        
        const result = execSync(
          `npx jest ${testPath} --verbose --no-coverage --json`,
          { 
            encoding: 'utf8',
            cwd: path.join(__dirname, '..', '..'),
            stdio: 'pipe'
          }
        );
        
        const testResult = JSON.parse(result);
        const testSuite = testResult.testResults[0];
        
        if (testSuite) {
          const passed = testSuite.numPassingTests;
          const failed = testSuite.numFailingTests;
          const total = passed + failed;
          
          suitePassed += passed;
          suiteFailed += failed;
          suiteTotal += total;
          
          console.log(`    ✅ 通过: ${passed}, ❌ 失败: ${failed}, 总计: ${total}`);
          
          if (failed > 0) {
            console.log(`    📝 失败详情:`);
            testSuite.assertionResults
              .filter(test => test.status === 'failed')
              .forEach(test => {
                console.log(`      - ${test.title}: ${test.failureMessages[0]?
                  .split('\n')[0] || '未知错误'}`);
              });
          }
        }
        
      } catch (error) {
        console.log(`    ❌ 测试执行失败: ${testFile}`);
        console.log(`    错误: ${error.message.split('\n')[0]}`);
        suiteFailed += 1;
        suiteTotal += 1;
      }
    }
    
    const suiteEndTime = Date.now();
    const suiteDuration = suiteEndTime - suiteStartTime;
    
    this.testResults[suite.name] = {
      passed: suitePassed,
      failed: suiteFailed,
      total: suiteTotal,
      duration: suiteDuration
    };
    
    console.log(`📊 ${suite.description}结果:
      ✅ ${suitePassed} | ❌ ${suiteFailed} | ⏱️  ${suiteDuration}ms\n`);
  }

  calculateOverallResults() {
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    
    Object.keys(this.testResults).forEach(key => {
      if (key !== 'overall') {
        totalPassed += this.testResults[key].passed;
        totalFailed += this.testResults[key].failed;
        totalTests += this.testResults[key].total;
      }
    });
    
    this.testResults.overall.passed = totalPassed;
    this.testResults.overall.failed = totalFailed;
    this.testResults.overall.total = totalTests;
  }

  generateReport() {
    console.log('📊 测试结果汇总');
    console.log('='.repeat(50));
    
    // 总体结果
    const overall = this.testResults.overall;
    const successRate = overall.total > 0 ? ((overall.passed / overall.total) * 100).toFixed(2) : 0;
    
    console.log(`总体结果: ${overall.passed}/${overall.total} 通过 (${successRate}%)`);
    console.log(`执行时间: ${overall.duration}ms`);
    console.log('');
    
    // 各测试套件结果
    this.testSuites.forEach(suite => {
      const result = this.testResults[suite.name];
      const rate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(2) : 0;
      
      console.log(`${suite.description}:`);
      console.log(`  通过: ${result.passed}`);
      console.log(`  失败: ${result.failed}`);
      console.log(`  总计: ${result.total}`);
      console.log(`  成功率: ${rate}%`);
      console.log(`  耗时: ${result.duration}ms`);
      console.log('');
    });
    
    // 生成文件报告
    this.saveReportToFile();
    
    // 结果判断
    if (overall.failed === 0) {
      console.log('🎉 所有测试通过！版本管理系统测试完成。');
      process.exit(0);
    } else {
      console.log(`❌ 有 ${overall.failed} 个测试失败，请检查并修复。`);
      process.exit(1);
    }
  }

  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.testResults.overall,
      suites: {}
    };
    
    this.testSuites.forEach(suite => {
      reportData.suites[suite.name] = {
        description: suite.description,
        results: this.testResults[suite.name],
        files: suite.files
      };
    });
    
    const reportPath = path.join(__dirname, '..', '..', 'reports',
      'version-management-test-report.json');
    
    // 确保reports目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 详细报告已保存到: ${reportPath}`);
  }

  generateJUnitReport() {
    let junitXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    junitXml += '<testsuites>\n';
    
    this.testSuites.forEach(suite => {
      const result = this.testResults[suite.name];
      junitXml += `  <testsuite name="${suite.description}" tests=
        "${result.total}" failures="${result.failed}" time="${result.duration / 1000}">\n`;
      
      // 这里简化处理，实际应该包含每个测试用例的详细信息
      for (let i = 0; i < result.passed; i++) {
        junitXml += `    <testcase name="test-${i}" classname="${suite.name}" time="0.1"/>\n`;
      }
      
      for (let i = 0; i < result.failed; i++) {
        junitXml += `    <testcase name="failed-test-${i}" classname="${suite.name}" time="0.1">\n`;
        junitXml += `      <failure message="Test failed">Test execution failed</failure>\n`;
        junitXml += `    </testcase>\n`;
      }
      
      junitXml += '  </testsuite>\n';
    });
    
    junitXml += '</testsuites>\n';
    
    const junitPath = path.join(__dirname, '..', '..', 'reports', 'version-management-junit.xml');
    fs.writeFileSync(junitPath, junitXml);
    console.log(`📄 JUnit报告已保存到: ${junitPath}`);
  }

  async runSpecificSuite(suiteName) {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) {
      console.log(`❌ 未找到测试套件: ${suiteName}`);
      console.log(`可用的测试套件: ${this.testSuites.map(s => s.name).join(', ')}`);
      return;
    }
    
    console.log(`🚀 执行单个测试套件: ${suite.description}\n`);
    
    const startTime = Date.now();
    await this.runTestSuite(suite);
    const endTime = Date.now();
    
    this.testResults.overall = {
      passed: this.testResults[suite.name].passed,
      failed: this.testResults[suite.name].failed,
      total: this.testResults[suite.name].total,
      duration: endTime - startTime
    };
    
    this.generateReport();
  }

  listAvailableTests() {
    console.log('📋 可用的测试套件:');
    console.log('='.repeat(30));
    
    this.testSuites.forEach(suite => {
      console.log(`${suite.name}: ${suite.description}`);
      suite.files.forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log('');
    });
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const runner = new TestRunner();
  
  switch (command) {
    case 'all':
    case undefined:
      await runner.runAllTests();
      break;
      
    case 'suite':
      const suiteName = args[1];
      if (!suiteName) {
        console.log('❌ 请指定测试套件名称');
        runner.listAvailableTests();
        process.exit(1);
      }
      await runner.runSpecificSuite(suiteName);
      break;
      
    case 'list':
      runner.listAvailableTests();
      break;
      
    case 'help':
      console.log('版本管理系统测试运行器');
      console.log('');
      console.log('用法:');
      console.log('  node test-runner.js [command] [options]');
      console.log('');
      console.log('命令:');
      console.log('  all          运行所有测试 (默认)');
      console.log('  suite <name> 运行指定的测试套件');
      console.log('  list         列出所有可用的测试套件');
      console.log('  help         显示帮助信息');
      console.log('');
      console.log('示例:');
      console.log('  node test-runner.js');
      console.log('  node test-runner.js suite unit');
      console.log('  node test-runner.js suite integration');
      break;
      
    default:
      console.log(`❌ 未知命令: ${command}`);
      console.log('使用 "node test-runner.js help" 查看帮助');
      process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试运行器执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = TestRunner;