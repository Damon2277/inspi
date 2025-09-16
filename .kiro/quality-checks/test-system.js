#!/usr/bin/env node

/**
 * 质量检查系统测试脚本
 * 验证系统各个组件是否正常工作
 */

const QualityCheckSystem = require('./index');
const CodeQualityMonitor = require('./code-quality-monitor');
const FunctionalValidator = require('./functional-validator');
const IntelligentWarningSystem = require('./intelligent-warning-system');
const QualityReporter = require('./quality-reporter');

async function testSystem() {
  console.log('🧪 Testing Quality Check System Components\n');

  let allTestsPassed = true;

  try {
    // 1. 测试代码质量监控器
    console.log('1️⃣  Testing Code Quality Monitor...');
    const codeQualityMonitor = new CodeQualityMonitor();
    const codeQualityResults = await codeQualityMonitor.runQualityChecks();
    
    if (codeQualityResults.status) {
      console.log('   ✅ Code Quality Monitor: PASSED');
      console.log(`   📊 Status: ${codeQualityResults.status}`);
      console.log(`   📈 Metrics collected: ${Object.keys(codeQualityResults.metrics || {}).length}`);
    } else {
      console.log('   ❌ Code Quality Monitor: FAILED');
      allTestsPassed = false;
    }

    // 2. 测试功能验证器
    console.log('\n2️⃣  Testing Functional Validator...');
    const functionalValidator = new FunctionalValidator();
    const functionalResults = await functionalValidator.validateFunctionality();
    
    if (functionalResults.status) {
      console.log('   ✅ Functional Validator: PASSED');
      console.log(`   📊 Status: ${functionalResults.status}`);
      console.log(`   🧪 Tests: ${functionalResults.testResults?.total || 0} total`);
    } else {
      console.log('   ❌ Functional Validator: FAILED');
      allTestsPassed = false;
    }

    // 3. 测试智能预警系统
    console.log('\n3️⃣  Testing Intelligent Warning System...');
    const warningSystem = new IntelligentWarningSystem();
    const mockQualityChecks = {
      codeQuality: codeQualityResults,
      functionalValidation: functionalResults
    };
    const warningResults = await warningSystem.analyzeForWarnings(mockQualityChecks);
    
    if (warningResults.status) {
      console.log('   ✅ Intelligent Warning System: PASSED');
      console.log(`   📊 Status: ${warningResults.status}`);
      console.log(`   ⚠️  Warnings: ${warningResults.warnings?.length || 0}`);
      console.log(`   🎯 Risk Level: ${warningResults.riskAssessment?.overall || 'unknown'}`);
    } else {
      console.log('   ❌ Intelligent Warning System: FAILED');
      allTestsPassed = false;
    }

    // 4. 测试质量报告器
    console.log('\n4️⃣  Testing Quality Reporter...');
    const reporter = new QualityReporter();
    const mockResults = {
      timestamp: new Date().toISOString(),
      overallStatus: 'passed',
      checks: {
        codeQuality: codeQualityResults,
        functionalValidation: functionalResults,
        intelligentWarnings: warningResults
      }
    };
    
    try {
      await reporter.generateQualityReport(mockResults);
      console.log('   ✅ Quality Reporter: PASSED');
      console.log('   📄 Reports generated successfully');
    } catch (error) {
      console.log('   ❌ Quality Reporter: FAILED');
      console.log(`   Error: ${error.message}`);
      allTestsPassed = false;
    }

    // 5. 测试完整系统
    console.log('\n5️⃣  Testing Complete Quality Check System...');
    const qualitySystem = new QualityCheckSystem({
      reportingEnabled: false // 跳过报告生成以加快测试
    });
    
    const systemResults = await qualitySystem.runFullQualityCheck();
    
    if (systemResults.overallStatus) {
      console.log('   ✅ Complete System: PASSED');
      console.log(`   📊 Overall Status: ${systemResults.overallStatus}`);
      console.log(`   🔍 Checks completed: ${Object.keys(systemResults.checks || {}).length}`);
    } else {
      console.log('   ❌ Complete System: FAILED');
      allTestsPassed = false;
    }

    // 测试结果总结
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Quality Check System is working correctly.');
      console.log('\n📋 System is ready for use:');
      console.log('   • Run: node .kiro/quality-checks/cli.js');
      console.log('   • Pre-commit: node .kiro/quality-checks/cli.js pre-commit');
      console.log('   • Help: node .kiro/quality-checks/cli.js help');
    } else {
      console.log('❌ SOME TESTS FAILED! Please check the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testSystem().catch(error => {
    console.error('Unexpected test error:', error);
    process.exit(1);
  });
}

module.exports = { testSystem };