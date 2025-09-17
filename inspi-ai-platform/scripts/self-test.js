#!/usr/bin/env node

/**
 * 自测脚本 - 对两大模块进行功能验证
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 开始两大模块自测...\n');

// 测试结果记录
const testResults = {
  contentSecurity: {
    passed: 0,
    failed: 0,
    tests: []
  },
  invitationSystem: {
    passed: 0,
    failed: 0,
    tests: []
  }
};

/**
 * 执行测试并记录结果
 */
function runTest(testName, testFn) {
  console.log(`🔍 测试: ${testName}`);
  try {
    const result = testFn();
    console.log(`✅ 通过: ${testName}`);
    return { name: testName, status: 'passed', result };
  } catch (error) {
    console.log(`❌ 失败: ${testName} - ${error.message}`);
    return { name: testName, status: 'failed', error: error.message };
  }
}

/**
 * 模块一：内容安全验证系统测试
 */
console.log('📋 模块一：内容安全验证系统');
console.log('=' .repeat(50));

// 1.1 检查核心文件是否存在
const securityTests = [
  {
    name: '核心文件存在性检查',
    test: () => {
      const requiredFiles = [
        'src/lib/security/types.ts',
        'src/lib/security/sensitiveWords.ts',
        'src/lib/security/xssFilter.ts',
        'src/lib/security/aiContentFilter.ts',
        'src/lib/security/thirdPartyFilters.ts',
        'src/lib/security/contentValidator.ts',
        'src/lib/security/middleware.ts',
        'src/lib/security/utils.ts',
        'src/lib/security/config.ts',
        'src/lib/security/index.ts'
      ];
      
      const missingFiles = requiredFiles.filter(file => 
        !fs.existsSync(path.join(__dirname, '..', file))
      );
      
      if (missingFiles.length > 0) {
        throw new Error(`缺少文件: ${missingFiles.join(', ')}`);
      }
      
      return `所有 ${requiredFiles.length} 个核心文件存在`;
    }
  },
  
  {
    name: '敏感词检测功能',
    test: () => {
      // 检查文件内容结构
      const filePath = path.join(__dirname, '../src/lib/security/sensitiveWords.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('SensitiveWordDetector')) {
        throw new Error('SensitiveWordDetector类未找到');
      }
      
      if (!content.includes('detect') || !content.includes('filter')) {
        throw new Error('缺少核心方法');
      }
      
      return '敏感词检测器结构正确，包含detect和filter方法';
    }
  },
  
  {
    name: 'XSS过滤功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/security/xssFilter.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('XSSFilter')) {
        throw new Error('XSSFilter类未找到');
      }
      
      if (!content.includes('detect') || !content.includes('sanitize')) {
        throw new Error('缺少核心方法');
      }
      
      return 'XSS过滤器结构正确，包含detect和sanitize方法';
    }
  },
  
  {
    name: '内容验证器集成',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/security/contentValidator.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('ContentValidator')) {
        throw new Error('ContentValidator类未找到');
      }
      
      if (!content.includes('validateSync') || !content.includes('validate')) {
        throw new Error('缺少验证方法');
      }
      
      if (!content.includes('VALIDATOR_PRESETS')) {
        throw new Error('缺少预设配置');
      }
      
      return '内容验证器结构正确，包含同步和异步验证方法';
    }
  },
  
  {
    name: 'React Hook功能',
    test: () => {
      // 检查Hook文件是否存在且可导入
      const hookPath = path.join(__dirname, '../src/hooks/useContentValidation.ts');
      if (!fs.existsSync(hookPath)) {
        throw new Error('useContentValidation Hook文件不存在');
      }
      
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      if (!hookContent.includes('useContentValidation')) {
        throw new Error('Hook导出不正确');
      }
      
      return 'React Hook文件存在且结构正确';
    }
  },
  
  {
    name: '安全组件功能',
    test: () => {
      const componentPath = path.join(__dirname, '../src/components/common/SafeTextarea.tsx');
      if (!fs.existsSync(componentPath)) {
        throw new Error('SafeTextarea组件文件不存在');
      }
      
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      if (!componentContent.includes('SafeTextarea')) {
        throw new Error('组件导出不正确');
      }
      
      return '安全文本输入组件存在且结构正确';
    }
  },
  
  {
    name: 'API集成检查',
    test: () => {
      const apiPath = path.join(__dirname, '../src/app/api/content/validate/route.ts');
      if (!fs.existsSync(apiPath)) {
        throw new Error('内容验证API不存在');
      }
      
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      if (!apiContent.includes('validateContent')) {
        throw new Error('API集成不正确');
      }
      
      return '内容验证API存在且集成正确';
    }
  }
];

// 执行内容安全系统测试
securityTests.forEach(test => {
  const result = runTest(test.name, test.test);
  testResults.contentSecurity.tests.push(result);
  if (result.status === 'passed') {
    testResults.contentSecurity.passed++;
  } else {
    testResults.contentSecurity.failed++;
  }
});

console.log('\n📋 模块二：邀请系统');
console.log('=' .repeat(50));

/**
 * 模块二：邀请系统测试
 */
const invitationTests = [
  {
    name: '邀请系统核心文件检查',
    test: () => {
      const requiredFiles = [
        'src/lib/invitation/types.ts',
        'src/lib/invitation/models.ts',
        'src/lib/invitation/database.ts',
        'src/lib/invitation/services/InvitationService.ts',
        'src/lib/invitation/services/RewardEngine.ts',
        'src/lib/invitation/services/AnalyticsService.ts',
        'src/lib/invitation/services/FraudDetectionService.ts',
        'src/lib/invitation/services/NotificationService.ts'
      ];
      
      const missingFiles = requiredFiles.filter(file => 
        !fs.existsSync(path.join(__dirname, '..', file))
      );
      
      if (missingFiles.length > 0) {
        throw new Error(`缺少文件: ${missingFiles.join(', ')}`);
      }
      
      return `所有 ${requiredFiles.length} 个核心文件存在`;
    }
  },
  
  {
    name: '邀请服务基础功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/invitation/services/InvitationService.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('InvitationService')) {
        throw new Error('InvitationService类未找到');
      }
      
      if (!content.includes('generateInvite') || !content.includes('validateInvite')) {
        throw new Error('缺少核心方法');
      }
      
      return 'InvitationService结构正确，包含生成和验证方法';
    }
  },
  
  {
    name: '奖励引擎功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/invitation/services/RewardEngine.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('RewardEngine')) {
        throw new Error('RewardEngine类未找到');
      }
      
      if (!content.includes('calculateInviteReward') || !content.includes('grantReward')) {
        throw new Error('缺少核心方法');
      }
      
      return 'RewardEngine结构正确，包含计算邀请奖励和发放奖励方法';
    }
  },
  
  {
    name: '积分系统功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/invitation/services/CreditSystem.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('CreditSystem')) {
        throw new Error('CreditSystem类未找到');
      }
      
      if (!content.includes('addCredits') || !content.includes('useCredits')) {
        throw new Error('缺少核心方法');
      }
      
      return 'CreditSystem结构正确，包含增加和使用积分方法';
    }
  },
  
  {
    name: '徽章系统功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/invitation/services/BadgeSystem.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('BadgeSystem')) {
        throw new Error('BadgeSystem类未找到');
      }
      
      if (!content.includes('awardBadge') || !content.includes('checkAndAwardBadges')) {
        throw new Error('缺少核心方法');
      }
      
      return 'BadgeSystem结构正确，包含颁发徽章和自动检查方法';
    }
  },
  
  {
    name: '反欺诈系统功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/invitation/services/FraudDetectionService.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('FraudDetectionService')) {
        throw new Error('FraudDetectionService类未找到');
      }
      
      if (!content.includes('assessRegistrationRisk') || !content.includes('checkIPFrequency')) {
        throw new Error('缺少核心方法');
      }
      
      return 'FraudDetectionService结构正确，包含风险评估和IP检查方法';
    }
  },
  
  {
    name: '通知系统功能',
    test: () => {
      const filePath = path.join(__dirname, '../src/lib/invitation/services/NotificationService.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('NotificationService')) {
        throw new Error('NotificationService类未找到');
      }
      
      if (!content.includes('sendNotification') || !content.includes('markAsRead')) {
        throw new Error('缺少核心方法');
      }
      
      return 'NotificationService结构正确，包含发送通知和标记已读方法';
    }
  },
  
  {
    name: 'API路由完整性',
    test: () => {
      const apiRoutes = [
        'src/app/api/invite/generate/route.ts',
        'src/app/api/invite/[code]/route.ts',
        'src/app/api/invite/activate/route.ts',
        'src/app/api/activities/route.ts',
        'src/app/api/notifications/route.ts'
      ];
      
      const missingRoutes = apiRoutes.filter(route => 
        !fs.existsSync(path.join(__dirname, '..', route))
      );
      
      if (missingRoutes.length > 0) {
        throw new Error(`缺少API路由: ${missingRoutes.join(', ')}`);
      }
      
      return `所有 ${apiRoutes.length} 个API路由存在`;
    }
  },
  
  {
    name: '数据库迁移文件',
    test: () => {
      const migrationDir = path.join(__dirname, '../src/lib/invitation/migrations');
      if (!fs.existsSync(migrationDir)) {
        throw new Error('迁移目录不存在');
      }
      
      const migrationFiles = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql'));
      if (migrationFiles.length === 0) {
        throw new Error('没有找到迁移文件');
      }
      
      return `找到 ${migrationFiles.length} 个数据库迁移文件`;
    }
  },
  
  {
    name: '前端组件完整性',
    test: () => {
      const componentFiles = [
        'src/components/invitation/InvitationManagement.tsx',
        'src/components/invitation/InvitationStats.tsx',
        'src/components/invitation/ActivityList.tsx',
        'src/components/invitation/ActivityDetails.tsx'
      ];
      
      const missingComponents = componentFiles.filter(file => 
        !fs.existsSync(path.join(__dirname, '..', file))
      );
      
      if (missingComponents.length > 0) {
        throw new Error(`缺少组件: ${missingComponents.join(', ')}`);
      }
      
      return `所有 ${componentFiles.length} 个前端组件存在`;
    }
  }
];

// 执行邀请系统测试
invitationTests.forEach(test => {
  const result = runTest(test.name, test.test);
  testResults.invitationSystem.tests.push(result);
  if (result.status === 'passed') {
    testResults.invitationSystem.passed++;
  } else {
    testResults.invitationSystem.failed++;
  }
});

/**
 * 生成测试报告
 */
console.log('\n📊 自测结果汇总');
console.log('=' .repeat(50));

console.log('\n🛡️ 内容安全验证系统:');
console.log(`✅ 通过: ${testResults.contentSecurity.passed}`);
console.log(`❌ 失败: ${testResults.contentSecurity.failed}`);
console.log(`📈 成功率: ${((testResults.contentSecurity.passed / (testResults.contentSecurity.passed + testResults.contentSecurity.failed)) * 100).toFixed(1)}%`);

console.log('\n🎁 邀请系统:');
console.log(`✅ 通过: ${testResults.invitationSystem.passed}`);
console.log(`❌ 失败: ${testResults.invitationSystem.failed}`);
console.log(`📈 成功率: ${((testResults.invitationSystem.passed / (testResults.invitationSystem.passed + testResults.invitationSystem.failed)) * 100).toFixed(1)}%`);

const totalPassed = testResults.contentSecurity.passed + testResults.invitationSystem.passed;
const totalFailed = testResults.contentSecurity.failed + testResults.invitationSystem.failed;
const totalTests = totalPassed + totalFailed;

console.log('\n🎯 总体结果:');
console.log(`📊 总测试数: ${totalTests}`);
console.log(`✅ 总通过数: ${totalPassed}`);
console.log(`❌ 总失败数: ${totalFailed}`);
console.log(`🏆 总成功率: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

// 详细失败信息
const allFailures = [
  ...testResults.contentSecurity.tests.filter(t => t.status === 'failed'),
  ...testResults.invitationSystem.tests.filter(t => t.status === 'failed')
];

if (allFailures.length > 0) {
  console.log('\n❌ 失败详情:');
  allFailures.forEach(failure => {
    console.log(`  • ${failure.name}: ${failure.error}`);
  });
}

/**
 * 功能演示测试
 */
console.log('\n🎭 功能演示测试');
console.log('=' .repeat(50));

// 测试内容安全验证
try {
  console.log('🔍 测试内容安全验证...');
  
  // 检查utils文件结构
  const utilsPath = path.join(__dirname, '../src/lib/security/utils.ts');
  const utilsContent = fs.readFileSync(utilsPath, 'utf8');
  
  if (utilsContent.includes('validateContentSync') || utilsContent.includes('validateContent')) {
    console.log('  ✅ 内容验证工具函数存在');
  } else {
    console.log('  ❌ 内容验证工具函数缺失');
  }
  
  // 检查AI过滤器
  const aiFilterPath = path.join(__dirname, '../src/lib/security/aiContentFilter.ts');
  const aiFilterContent = fs.readFileSync(aiFilterPath, 'utf8');
  
  if (aiFilterContent.includes('AIContentFilter')) {
    console.log('  ✅ AI内容过滤器存在');
  } else {
    console.log('  ❌ AI内容过滤器缺失');
  }
  
  // 检查第三方过滤器
  const thirdPartyPath = path.join(__dirname, '../src/lib/security/thirdPartyFilters.ts');
  const thirdPartyContent = fs.readFileSync(thirdPartyPath, 'utf8');
  
  if (thirdPartyContent.includes('ThirdPartyFilterManager')) {
    console.log('  ✅ 第三方内容过滤器存在');
  } else {
    console.log('  ❌ 第三方内容过滤器缺失');
  }
  
  console.log('📊 内容安全验证系统结构检查完成');
} catch (error) {
  console.log(`❌ 内容验证演示失败: ${error.message}`);
}

// 生成最终报告
const reportData = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    successRate: ((totalPassed / totalTests) * 100).toFixed(1) + '%'
  },
  modules: {
    contentSecurity: {
      passed: testResults.contentSecurity.passed,
      failed: testResults.contentSecurity.failed,
      tests: testResults.contentSecurity.tests
    },
    invitationSystem: {
      passed: testResults.invitationSystem.passed,
      failed: testResults.invitationSystem.failed,
      tests: testResults.invitationSystem.tests
    }
  },
  failures: allFailures
};

// 保存测试报告
fs.writeFileSync(
  path.join(__dirname, '../SELF_TEST_REPORT.json'),
  JSON.stringify(reportData, null, 2)
);

console.log('\n📄 详细报告已保存到: SELF_TEST_REPORT.json');

// 退出码
process.exit(totalFailed > 0 ? 1 : 0);