/**
 * Jest测试结果处理器
 * 处理和格式化测试结果，生成自定义报告
 */

const fs = require('fs');
const path = require('path');

class TestResultsProcessor {
  constructor() {
    this.reportDir = path.join(process.cwd(), 'reports', 'version-management');
    this.ensureReportDirectory();
  }

  ensureReportDirectory() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  process(results) {
    try {
      // 生成详细的测试报告
      this.generateDetailedReport(results);
      
      // 生成覆盖率摘要
      this.generateCoverageSummary(results);
      
      // 生成性能报告
      this.generatePerformanceReport(results);
      
      // 生成需求验证报告
      this.generateRequirementsReport(results);
      
      // 输出控制台摘要
      this.printConsoleSummary(results);
      
    } catch (error) {
      console.error('❌ 测试结果处理失败:', error.message);
    }
    
    return results;
  }

  generateDetailedReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        numTotalTestSuites: results.numTotalTestSuites,
        numPassedTestSuites: results.numPassedTestSuites,
        numFailedTestSuites: results.numFailedTestSuites,
        numTotalTests: results.numTotalTests,
        numPassedTests: results.numPassedTests,
        numFailedTests: results.numFailedTests,
        numPendingTests: results.numPendingTests,
        testResults: results.testResults.map(suite => ({
          testFilePath: suite.testFilePath,
          numPassingTests: suite.numPassingTests,
          numFailingTests: suite.numFailingTests,
          numPendingTests: suite.numPendingTests,
          perfStats: suite.perfStats,
          testResults: suite.assertionResults.map(test => ({
            title: test.title,
            status: test.status,
            duration: test.duration,
            failureMessages: test.failureMessages,
            ancestorTitles: test.ancestorTitles
          }))
        }))
      },
      coverage: results.coverageMap ? this.processCoverageData(results.coverageMap) : null
    };

    const reportPath = path.join(this.reportDir, 'detailed-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 详细测试报告已生成: ${reportPath}`);
  }

  generateCoverageSummary(results) {
    if (!results.coverageMap) {
      return;
    }

    const coverageData = this.processCoverageData(results.coverageMap);
    const summary = {
      timestamp: new Date().toISOString(),
      overall: coverageData.total,
      files: Object.keys(coverageData.files).map(filePath => ({
        file: path.relative(process.cwd(), filePath),
        coverage: coverageData.files[filePath]
      }))
    };

    const summaryPath = path.join(this.reportDir, 'coverage-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📈 覆盖率摘要已生成: ${summaryPath}`);
  }

  generatePerformanceReport(results) {
    const performanceData = {
      timestamp: new Date().toISOString(),
      totalTime: results.testResults.reduce((total, suite) => {
        return total + (suite.perfStats.end - suite.perfStats.start);
      }, 0),
      suites: results.testResults.map(suite => ({
        file: path.relative(process.cwd(), suite.testFilePath),
        duration: suite.perfStats.end - suite.perfStats.start,
        tests: suite.numPassingTests + suite.numFailingTests,
        avgTestTime: suite.assertionResults.length > 0 
          ? suite.assertionResults.reduce((sum,
            test) => sum + (test.duration || 0), 0) / suite.assertionResults.length
          : 0,
        slowestTest: suite.assertionResults.reduce((slowest, test) => {
          return (test.duration || 0) > (slowest.duration || 0) ? test : slowest;
        }, { duration: 0 })
      }))
    };

    const performancePath = path.join(this.reportDir, 'performance-report.json');
    fs.writeFileSync(performancePath, JSON.stringify(performanceData, null, 2));
    
    console.log(`⚡ 性能报告已生成: ${performancePath}`);
  }

  generateRequirementsReport(results) {
    const requirementsMapping = {
      '需求1：语义化版本控制': [
        '重大更新（破坏性变更）增加主版本号',
        '新功能（向后兼容）增加次版本号',
        '修复bug（向后兼容）增加修订版本号',
        '预发布版本支持',
        'package.json版本同步'
      ],
      '需求2：自动化版本发布流程': [
        '自动更新package.json版本号',
        '自动创建git提交',
        '自动创建git标签',
        '自动生成发布说明文档',
        '提供回滚机制'
      ],
      '需求3：Git工作流规范': [
        '使用feature分支进行开发',
        '使用hotfix分支进行修复',
        '使用release分支进行发布准备'
      ],
      '需求4：提交信息规范': [
        '包含类型前缀',
        '包含BREAKING CHANGE标识',
        '包含范围标识',
        '支持多行描述格式',
        '拒绝不符合规范的提交'
      ],
      '需求5：发布文档自动生成': [
        '自动生成发布说明文档',
        '包含版本概述、主要变更、修复内容',
        '包含迁移指南和破坏性变更说明',
        '包含贡献者信息和致谢',
        '将文档添加到版本控制'
      ],
      '需求6：版本历史管理': [
        '提供版本列表和详细信息',
        '支持安全的版本回滚操作',
        '提供版本间的变更对比',
        '支持基于提交信息的搜索'
      ]
    };

    const requirementsReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequirements: Object.keys(requirementsMapping).length,
        totalSubRequirements: Object.values(requirementsMapping).flat().length,
        verifiedRequirements: 0,
        verifiedSubRequirements: 0
      },
      requirements: {}
    };

    // 分析测试结果以确定需求验证状态
    results.testResults.forEach(suite => {
      const suiteName = path.basename(suite.testFilePath, '.test.js');
      
      if (suiteName === 'version-management-requirements') {
        // 处理需求验证测试结果
        suite.assertionResults.forEach(test => {
          const testTitle = test.ancestorTitles.join(' > ') + ' > ' + test.title;
          
          Object.keys(requirementsMapping).forEach(requirement => {
            if (testTitle.includes(requirement.split('：')[1])) {
              if (!requirementsReport.requirements[requirement]) {
                requirementsReport.requirements[requirement] = {
                  status: 'verified',
                  tests: [],
                  subRequirements: requirementsMapping[requirement].map(sub => ({
                    name: sub,
                    status: 'pending',
                    tests: []
                  }))
                };
              }
              
              requirementsReport.requirements[requirement].tests.push({
                title: test.title,
                status: test.status,
                duration: test.duration
              });
              
              if (test.status === 'passed') {
                requirementsReport.summary.verifiedSubRequirements++;
              }
            }
          });
        });
      }
    });

    // 计算验证的需求数量
    requirementsReport.summary.verifiedRequirements =
      Object.keys(requirementsReport.requirements).length;

    const requirementsPath = path.join(this.reportDir, 'requirements-verification.json');
    fs.writeFileSync(requirementsPath, JSON.stringify(requirementsReport, null, 2));
    
    console.log(`📋 需求验证报告已生成: ${requirementsPath}`);
  }

  processCoverageData(coverageMap) {
    const summary = {
      total: {
        lines: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        statements: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 }
      },
      files: {}
    };

    // 这里简化处理，实际应该解析coverageMap的详细数据
    if (coverageMap && typeof coverageMap.getCoverageSummary === 'function') {
      const coverageSummary = coverageMap.getCoverageSummary();
      
      summary.total = {
        lines: coverageSummary.lines,
        functions: coverageSummary.functions,
        statements: coverageSummary.statements,
        branches: coverageSummary.branches
      };

      coverageMap.files().forEach(filePath => {
        const fileCoverage = coverageMap.fileCoverageFor(filePath);
        const fileSummary = fileCoverage.toSummary();
        
        summary.files[filePath] = {
          lines: fileSummary.lines,
          functions: fileSummary.functions,
          statements: fileSummary.statements,
          branches: fileSummary.branches
        };
      });
    }

    return summary;
  }

  printConsoleSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 版本管理系统测试结果摘要');
    console.log('='.repeat(60));
    
    const successRate = results.numTotalTests > 0 
      ? ((results.numPassedTests / results.numTotalTests) * 100).toFixed(2)
      : 0;
    
    console.log(`✅ 通过测试: ${results.numPassedTests}`);
    console.log(`❌ 失败测试: ${results.numFailedTests}`);
    console.log(`⏸️  跳过测试: ${results.numPendingTests}`);
    console.log(`📊 总计测试: ${results.numTotalTests}`);
    console.log(`🎯 成功率: ${successRate}%`);
    
    const totalTime = results.testResults.reduce((total, suite) => {
      return total + (suite.perfStats.end - suite.perfStats.start);
    }, 0);
    
    console.log(`⏱️  总耗时: ${totalTime}ms`);
    
    // 显示失败的测试
    if (results.numFailedTests > 0) {
      console.log('\n❌ 失败的测试:');
      results.testResults.forEach(suite => {
        const failedTests = suite.assertionResults.filter(test => test.status === 'failed');
        if (failedTests.length > 0) {
          console.log(`\n📁 ${path.relative(process.cwd(), suite.testFilePath)}:`);
          failedTests.forEach(test => {
            console.log(`  - ${test.ancestorTitles.join(' > ')} > ${test.title}`);
            if (test.failureMessages.length > 0) {
              console.log(`    💬 ${test.failureMessages[0].split('\n')[0]}`);
            }
          });
        }
      });
    }
    
    // 显示覆盖率信息
    if (results.coverageMap) {
      console.log('\n📈 代码覆盖率:');
      const coverageData = this.processCoverageData(results.coverageMap);
      console.log(`  行覆盖率: ${coverageData.total.lines.pct}%`);
      console.log(`  函数覆盖率: ${coverageData.total.functions.pct}%`);
      console.log(`  语句覆盖率: ${coverageData.total.statements.pct}%`);
      console.log(`  分支覆盖率: ${coverageData.total.branches.pct}%`);
    }
    
    console.log('\n📁 报告文件位置:');
    console.log(`  详细报告: ${path.join(this.reportDir, 'detailed-report.json')}`);
    console.log(`  覆盖率摘要: ${path.join(this.reportDir, 'coverage-summary.json')}`);
    console.log(`  性能报告: ${path.join(this.reportDir, 'performance-report.json')}`);
    console.log(`  需求验证: ${path.join(this.reportDir, 'requirements-verification.json')}`);
    
    console.log('='.repeat(60));
  }
}

// 导出处理函数
module.exports = (results) => {
  const processor = new TestResultsProcessor();
  return processor.process(results);
};