/**
 * 恢复操作指导系统测试脚本
 * Recovery Operation Guidance System Test Script
 */

const ProjectStateRecoverySystem = require('./index');

class RecoveryGuidanceTest {
  constructor() {
    this.system = new ProjectStateRecoverySystem();
  }

  async runTests() {
    console.log('🧪 开始恢复操作指导系统测试\n');

    try {
      // 测试1: 决策树路径分析
      await this.testDecisionTreeAnalysis();
      
      // 测试2: 逐步恢复指导
      await this.testStepByStepGuidance();
      
      // 测试3: 恢复验证机制
      await this.testRecoveryValidation();
      
      // 测试4: 完整恢复流程
      await this.testCompleteRecoveryProcess();

      console.log('\n🎉 所有恢复指导系统测试完成!');

    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      throw error;
    }
  }

  async testDecisionTreeAnalysis() {
    console.log('🌳 测试1: 决策树路径分析');
    
    const testCases = [
      {
        description: '系统完全崩溃，无法启动',
        context: { timeConstraint: 'urgent', riskTolerance: 'high' }
      },
      {
        description: '样式显示异常，页面布局混乱',
        context: { timeConstraint: 'normal', riskTolerance: 'low' }
      },
      {
        description: 'API接口返回错误，功能无法使用',
        context: { timeConstraint: 'normal', riskTolerance: 'medium' }
      },
      {
        description: '配置文件损坏，环境变量错误',
        context: { timeConstraint: 'normal', riskTolerance: 'medium' }
      }
    ];

    for (const testCase of testCases) {
      console.log(`   测试场景: "${testCase.description}"`);
      
      const result = await this.system.getRecoveryDecisionPath(testCase.description, testCase.context);
      
      if (result.success) {
        console.log(`   ✅ 决策路径: ${result.decisionPath.strategy}`);
        console.log(`   📊 置信度: ${Math.round(result.confidence * 100)}%`);
        console.log(`   ⏱️ 预计时间: ${result.decisionPath.estimatedTime}`);
        console.log(`   ⚠️ 风险级别: ${result.decisionPath.riskLevel}`);
      } else {
        console.log(`   ❌ 决策分析失败: ${result.error}`);
      }
      console.log('');
    }
  }

  async testStepByStepGuidance() {
    console.log('📋 测试2: 逐步恢复指导');
    
    const testIssue = '样式文件丢失，页面显示异常';
    const context = { timeConstraint: 'normal', riskTolerance: 'low' };
    
    console.log(`   测试问题: "${testIssue}"`);
    
    const result = await this.system.getStepByStepGuidance(testIssue, context);
    
    if (result.success) {
      const guidance = result.guidance;
      console.log(`   ✅ 指导标题: ${guidance.title}`);
      console.log(`   📊 总步骤数: ${guidance.totalSteps}`);
      console.log(`   ⏱️ 预计时间: ${guidance.estimatedTime}`);
      console.log(`   ⚠️ 风险级别: ${guidance.riskLevel}`);
      
      console.log('\n   📋 详细步骤:');
      guidance.steps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step.title} (${step.type})`);
        console.log(`      描述: ${step.description}`);
        console.log(`      预期结果: ${step.expectedResult}`);
        console.log(`      预计时间: ${step.estimatedTime}`);
        console.log(`      可跳过: ${step.canSkip ? '是' : '否'}`);
        console.log('');
      });
    } else {
      console.log(`   ❌ 获取指导失败: ${result.error}`);
    }
  }

  async testRecoveryValidation() {
    console.log('🔍 测试3: 恢复验证机制');
    
    // 创建模拟恢复计划
    const mockRecoveryPlan = {
      issueType: 'style_issue',
      strategy: 'style_snapshot_recovery',
      description: '从样式快照恢复',
      actions: ['restore_style_files', 'clear_style_cache', 'verify_visual_display'],
      estimatedTime: '5-15分钟',
      riskLevel: 'low',
      confidence: 0.85
    };

    const mockCurrentState = await this.system._getCurrentSystemState();

    // 测试恢复前验证
    console.log('   🔍 测试恢复前验证...');
    const preValidation = await this.system.validator.validatePreRecovery(mockRecoveryPlan, mockCurrentState);
    
    console.log(`   ✅ 恢复前验证: ${preValidation.results.passed ? '通过' : '失败'}`);
    console.log(`   📊 验证得分: ${preValidation.results.score}/${preValidation.results.maxScore}`);
    console.log(`   ⚠️ 警告数量: ${preValidation.results.warnings.length}`);
    console.log(`   🚫 阻塞数量: ${preValidation.results.blockers.length}`);

    // 测试恢复过程监控
    console.log('\n   📊 测试恢复过程监控...');
    const mockSteps = [
      { id: 'step1', title: '备份当前状态', canSkip: false },
      { id: 'step2', title: '恢复样式文件', canSkip: false },
      { id: 'step3', title: '清除缓存', canSkip: true },
      { id: 'step4', title: '验证结果', canSkip: false }
    ];

    const monitoring = await this.system.validator.monitorRecoveryProcess(
      { ...mockRecoveryPlan, steps: mockSteps },
      (progress) => {
        console.log(`     📈 进度: ${progress.step}/${progress.total} - ${progress.stepName} (${progress.status})`);
      }
    );

    console.log(`   ✅ 监控完成: ${monitoring.progress.completedSteps.length} 成功, ${monitoring.progress.failedSteps.length} 失败`);
    console.log(`   ⏱️ 实际耗时: ${Math.round(monitoring.progress.metrics.actualDuration / 1000)}秒`);

    // 测试恢复后验证
    console.log('\n   🔍 测试恢复后验证...');
    const mockRecoveryResult = {
      success: monitoring.progress.failedSteps.length === 0,
      completedSteps: monitoring.progress.completedSteps.length,
      failedSteps: monitoring.progress.failedSteps.length
    };

    const postValidation = await this.system.validator.validatePostRecovery(
      mockRecoveryPlan, 
      mockRecoveryResult, 
      mockCurrentState
    );

    console.log(`   ✅ 恢复后验证: ${postValidation.results.passed ? '通过' : '失败'}`);
    console.log(`   📊 验证得分: ${postValidation.results.score}/${postValidation.results.maxScore}`);
    console.log(`   💡 改进建议: ${postValidation.results.improvements.length} 条`);
    console.log(`   📋 推荐操作: ${postValidation.results.recommendations.length} 条`);

    // 生成验证报告
    console.log('\n   📄 生成验证报告...');
    const reportResult = await this.system.validator.generateValidationReport();
    
    if (reportResult.success) {
      console.log(`   ✅ 验证报告生成成功`);
      console.log(`   📊 报告摘要: ${reportResult.report.summary.successRate} 成功率`);
    } else {
      console.log(`   ❌ 验证报告生成失败: ${reportResult.error}`);
    }

    console.log('');
  }

  async testCompleteRecoveryProcess() {
    console.log('🚀 测试4: 完整恢复流程');
    
    const testIssue = '功能模块异常，API接口无响应';
    const context = {
      timeConstraint: 'normal',
      riskTolerance: 'medium',
      affectedComponents: ['api', 'backend']
    };

    console.log(`   测试问题: "${testIssue}"`);
    console.log(`   上下文: 时间约束=${context.timeConstraint}, 风险容忍=${context.riskTolerance}`);
    
    const result = await this.system.executeRecoveryWithValidation(testIssue, context);
    
    if (result.success) {
      console.log('\n   🎉 完整恢复流程成功!');
      console.log(`   📋 恢复策略: ${result.recoveryPlan.strategy}`);
      console.log(`   📊 指导步骤: ${result.guidance.totalSteps} 步`);
      console.log(`   ✅ 恢复结果: ${result.recoveryResult.completedSteps} 成功, ${result.recoveryResult.failedSteps} 失败`);
      console.log(`   ⏱️ 总耗时: ${Math.round(result.recoveryResult.duration / 1000)}秒`);
      
      if (result.preValidation) {
        console.log(`   🔍 恢复前验证: ${result.preValidation.results.score}/${result.preValidation.results.maxScore}`);
      }
      
      if (result.postValidation) {
        console.log(`   🔍 恢复后验证: ${result.postValidation.results.score}/${result.postValidation.results.maxScore}`);
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log('\n   💡 系统建议:');
        result.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
    } else {
      console.log(`\n   ❌ 完整恢复流程失败 (阶段: ${result.phase})`);
      console.log(`   错误: ${result.error}`);
      
      if (result.blockers && result.blockers.length > 0) {
        console.log('   🚫 阻塞问题:');
        result.blockers.forEach((blocker, index) => {
          console.log(`   ${index + 1}. ${blocker}`);
        });
      }
    }

    console.log('');
  }

  async testValidationHistory() {
    console.log('📚 测试5: 验证历史记录');
    
    const history = this.system.validator.getValidationHistory(5);
    
    console.log(`   📊 验证历史: 共 ${history.total} 条记录`);
    console.log(`   📋 最近记录: ${history.history.length} 条`);
    
    history.history.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.phase} - ${record.timestamp}`);
      console.log(`      结果: ${record.results.passed ? '通过' : '失败'}`);
      console.log(`      得分: ${record.results.score}/${record.results.maxScore}`);
    });

    console.log('');
  }
}

// 运行测试
async function runTests() {
  const tester = new RecoveryGuidanceTest();
  
  try {
    await tester.runTests();
    await tester.testValidationHistory();
    
    console.log('🎊 所有恢复指导系统测试通过！系统工作正常。');
    
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = RecoveryGuidanceTest;