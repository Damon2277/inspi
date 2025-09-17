#!/usr/bin/env node

/**
 * 产品结构审计脚本 - 检查未完成的需求
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始产品结构审计...\n');

// 产品模块定义
const PRODUCT_MODULES = {
  core: {
    name: '核心功能',
    components: [
      'AI内容生成',
      '用户认证系统',
      '作品管理',
      '用户配置文件'
    ]
  },
  contentSecurity: {
    name: '内容安全验证系统',
    components: [
      '敏感词检测',
      'XSS攻击防护',
      'AI智能过滤',
      '第三方服务集成',
      'React组件集成',
      'API接口'
    ]
  },
  invitationSystem: {
    name: '邀请系统',
    components: [
      '邀请服务',
      '奖励引擎',
      '积分系统',
      '徽章系统',
      '反欺诈检测',
      '通知系统',
      '管理后台',
      '前端组件'
    ]
  },
  ui: {
    name: 'UI/UX系统',
    components: [
      '设计系统',
      '响应式布局',
      '移动端适配',
      '桌面端界面',
      '组件库'
    ]
  },
  infrastructure: {
    name: '基础设施',
    components: [
      '数据库设计',
      'API架构',
      '缓存系统',
      '监控告警',
      '部署配置'
    ]
  },
  testing: {
    name: '测试系统',
    components: [
      '单元测试',
      '集成测试',
      '性能测试',
      '端到端测试',
      '测试工具'
    ]
  }
};

// 审计结果
const auditResults = {
  completed: [],
  incomplete: [],
  missing: [],
  recommendations: []
};

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

/**
 * 检查目录是否存在且非空
 */
function checkDirectoryExists(dirPath) {
  const fullPath = path.join(__dirname, '..', dirPath);
  if (!fs.existsSync(fullPath)) return false;
  
  const stats = fs.statSync(fullPath);
  if (!stats.isDirectory()) return false;
  
  const files = fs.readdirSync(fullPath);
  return files.length > 0;
}

/**
 * 检查API路由
 */
function checkApiRoutes() {
  const apiRoutes = [
    // 核心API
    'src/app/api/magic/generate/route.ts',
    'src/app/api/health/route.ts',
    'src/app/api/ready/route.ts',
    
    // 内容安全API
    'src/app/api/content/validate/route.ts',
    
    // 邀请系统API
    'src/app/api/invite/generate/route.ts',
    'src/app/api/invite/[code]/route.ts',
    'src/app/api/invite/activate/route.ts',
    'src/app/api/invite/stats/[userId]/route.ts',
    'src/app/api/activities/route.ts',
    'src/app/api/notifications/route.ts',
    
    // 管理后台API
    'src/app/api/admin/rewards/route.ts',
    'src/app/api/admin/activities/route.ts',
    
    // 监控API
    'src/app/api/metrics/route.ts'
  ];
  
  const existingRoutes = apiRoutes.filter(route => checkFileExists(route));
  const missingRoutes = apiRoutes.filter(route => !checkFileExists(route));
  
  return { existing: existingRoutes, missing: missingRoutes };
}

/**
 * 检查前端页面
 */
function checkFrontendPages() {
  const pages = [
    // 核心页面
    'src/app/page.tsx',
    'src/app/create/page.tsx',
    'src/app/works/page.tsx',
    'src/app/square/page.tsx',
    'src/app/profile/page.tsx',
    
    // 邀请系统页面
    'src/app/invitation/page.tsx',
    'src/app/activities/page.tsx',
    'src/app/notifications/page.tsx',
    
    // 管理后台页面
    'src/app/admin/page.tsx',
    'src/app/admin/invites/page.tsx',
    'src/app/admin/rewards/page.tsx',
    
    // 演示页面
    'src/app/demo/content-security/page.tsx'
  ];
  
  const existingPages = pages.filter(page => checkFileExists(page));
  const missingPages = pages.filter(page => !checkFileExists(page));
  
  return { existing: existingPages, missing: missingPages };
}

/**
 * 检查组件库
 */
function checkComponentLibrary() {
  const components = [
    // UI组件
    'src/components/ui/button.tsx',
    'src/components/ui/card.tsx',
    'src/components/ui/input.tsx',
    'src/components/ui/select.tsx',
    'src/components/ui/tabs.tsx',
    
    // 业务组件
    'src/components/common/SafeTextarea.tsx',
    'src/components/invitation/InvitationManagement.tsx',
    'src/components/invitation/InvitationStats.tsx',
    'src/components/admin/AdminDashboard.tsx',
    'src/components/notification/NotificationManagement.tsx',
    
    // 移动端组件
    'src/components/mobile/MobileLayout.tsx',
    'src/components/mobile/MobileBottomNav.tsx'
  ];
  
  const existingComponents = components.filter(comp => checkFileExists(comp));
  const missingComponents = components.filter(comp => !checkFileExists(comp));
  
  return { existing: existingComponents, missing: missingComponents };
}

/**
 * 检查数据库设计
 */
function checkDatabaseDesign() {
  const dbFiles = [
    // 核心数据库
    'src/lib/mongodb.ts',
    'src/lib/database/index.ts',
    
    // 邀请系统数据库
    'src/lib/invitation/database.ts',
    'src/lib/invitation/models.ts',
    
    // 迁移文件
    'src/lib/invitation/migrations'
  ];
  
  const existingDb = dbFiles.filter(file => 
    file.endsWith('/') ? checkDirectoryExists(file) : checkFileExists(file)
  );
  const missingDb = dbFiles.filter(file => 
    !(file.endsWith('/') ? checkDirectoryExists(file) : checkFileExists(file))
  );
  
  return { existing: existingDb, missing: missingDb };
}

/**
 * 检查配置文件
 */
function checkConfiguration() {
  const configFiles = [
    // 基础配置
    'package.json',
    'next.config.ts',
    'tailwind.config.ts',
    'tsconfig.json',
    
    // 环境配置
    '.env.example',
    '.env.production',
    
    // 部署配置
    'Dockerfile',
    'docker-compose.prod.yml',
    'k8s/app-deployment.yaml',
    
    // 监控配置
    'prometheus/prometheus.yml',
    'grafana/dashboards/application/app-overview.json',
    
    // 测试配置
    'jest.config.js',
    'playwright.config.ts'
  ];
  
  const existingConfig = configFiles.filter(file => checkFileExists(file));
  const missingConfig = configFiles.filter(file => !checkFileExists(file));
  
  return { existing: existingConfig, missing: missingConfig };
}

/**
 * 检查文档
 */
function checkDocumentation() {
  const docs = [
    'README.md',
    'RELEASE_NOTES_v0.5.0.md',
    'VERSION_HISTORY.md',
    'CONTENT_SECURITY_IMPLEMENTATION.md',
    'FINAL_SELF_TEST_SUMMARY.md',
    'TESTING_COMPLETION_REPORT.md',
    'src/lib/security/README.md',
    'src/lib/invitation/README.md'
  ];
  
  const existingDocs = docs.filter(doc => checkFileExists(doc));
  const missingDocs = docs.filter(doc => !checkFileExists(doc));
  
  return { existing: existingDocs, missing: missingDocs };
}

/**
 * 分析产品完整性
 */
function analyzeProductCompleteness() {
  console.log('📊 产品模块完整性分析');
  console.log('=' .repeat(60));
  
  // 检查各个模块
  const apiCheck = checkApiRoutes();
  const pageCheck = checkFrontendPages();
  const componentCheck = checkComponentLibrary();
  const dbCheck = checkDatabaseDesign();
  const configCheck = checkConfiguration();
  const docCheck = checkDocumentation();
  
  // 核心功能检查
  console.log('\n🎯 核心功能模块:');
  const coreFeatures = [
    { name: 'AI内容生成API', exists: checkFileExists('src/app/api/magic/generate/route.ts') },
    { name: '用户认证系统', exists: checkDirectoryExists('src/lib/auth') },
    { name: '作品管理', exists: checkFileExists('src/app/works/page.tsx') },
    { name: '用户配置', exists: checkFileExists('src/app/profile/page.tsx') }
  ];
  
  coreFeatures.forEach(feature => {
    console.log(`  ${feature.exists ? '✅' : '❌'} ${feature.name}`);
    if (feature.exists) {
      auditResults.completed.push(`核心功能: ${feature.name}`);
    } else {
      auditResults.incomplete.push(`核心功能: ${feature.name}`);
    }
  });
  
  // 内容安全系统检查
  console.log('\n🛡️ 内容安全验证系统:');
  const securityFeatures = [
    { name: '敏感词检测', exists: checkFileExists('src/lib/security/sensitiveWords.ts') },
    { name: 'XSS攻击防护', exists: checkFileExists('src/lib/security/xssFilter.ts') },
    { name: 'AI智能过滤', exists: checkFileExists('src/lib/security/aiContentFilter.ts') },
    { name: '第三方服务集成', exists: checkFileExists('src/lib/security/thirdPartyFilters.ts') },
    { name: 'React组件集成', exists: checkFileExists('src/hooks/useContentValidation.ts') },
    { name: 'API接口', exists: checkFileExists('src/app/api/content/validate/route.ts') }
  ];
  
  securityFeatures.forEach(feature => {
    console.log(`  ${feature.exists ? '✅' : '❌'} ${feature.name}`);
    if (feature.exists) {
      auditResults.completed.push(`内容安全: ${feature.name}`);
    } else {
      auditResults.incomplete.push(`内容安全: ${feature.name}`);
    }
  });
  
  // 邀请系统检查
  console.log('\n🎁 邀请系统:');
  const invitationFeatures = [
    { name: '邀请服务', exists: checkFileExists('src/lib/invitation/services/InvitationService.ts') },
    { name: '奖励引擎', exists: checkFileExists('src/lib/invitation/services/RewardEngine.ts') },
    { name: '积分系统', exists: checkFileExists('src/lib/invitation/services/CreditSystem.ts') },
    { name: '徽章系统', exists: checkFileExists('src/lib/invitation/services/BadgeSystem.ts') },
    { name: '反欺诈检测', exists: checkFileExists('src/lib/invitation/services/FraudDetectionService.ts') },
    { name: '通知系统', exists: checkFileExists('src/lib/invitation/services/NotificationService.ts') },
    { name: '管理后台', exists: checkFileExists('src/app/admin/page.tsx') },
    { name: '前端组件', exists: checkFileExists('src/components/invitation/InvitationManagement.tsx') }
  ];
  
  invitationFeatures.forEach(feature => {
    console.log(`  ${feature.exists ? '✅' : '❌'} ${feature.name}`);
    if (feature.exists) {
      auditResults.completed.push(`邀请系统: ${feature.name}`);
    } else {
      auditResults.incomplete.push(`邀请系统: ${feature.name}`);
    }
  });
  
  // UI/UX系统检查
  console.log('\n🎨 UI/UX系统:');
  const uiFeatures = [
    { name: '设计系统', exists: checkDirectoryExists('src/components/ui') },
    { name: '响应式布局', exists: checkFileExists('src/styles/mobile.css') },
    { name: '移动端适配', exists: checkDirectoryExists('src/components/mobile') },
    { name: '桌面端界面', exists: checkDirectoryExists('src/components/desktop') },
    { name: '组件库', exists: componentCheck.existing.length > 10 }
  ];
  
  uiFeatures.forEach(feature => {
    console.log(`  ${feature.exists ? '✅' : '❌'} ${feature.name}`);
    if (feature.exists) {
      auditResults.completed.push(`UI/UX: ${feature.name}`);
    } else {
      auditResults.incomplete.push(`UI/UX: ${feature.name}`);
    }
  });
  
  // 基础设施检查
  console.log('\n🏗️ 基础设施:');
  const infraFeatures = [
    { name: '数据库设计', exists: dbCheck.existing.length > 0 },
    { name: 'API架构', exists: apiCheck.existing.length > 10 },
    { name: '缓存系统', exists: checkFileExists('src/lib/redis.ts') },
    { name: '监控告警', exists: checkFileExists('prometheus/prometheus.yml') },
    { name: '部署配置', exists: checkFileExists('Dockerfile') }
  ];
  
  infraFeatures.forEach(feature => {
    console.log(`  ${feature.exists ? '✅' : '❌'} ${feature.name}`);
    if (feature.exists) {
      auditResults.completed.push(`基础设施: ${feature.name}`);
    } else {
      auditResults.incomplete.push(`基础设施: ${feature.name}`);
    }
  });
  
  // 测试系统检查
  console.log('\n🧪 测试系统:');
  const testFeatures = [
    { name: '单元测试', exists: checkDirectoryExists('src/__tests__') },
    { name: '集成测试', exists: checkFileExists('scripts/integration-test-fixed.js') },
    { name: '性能测试', exists: checkFileExists('scripts/performance-test.js') },
    { name: '端到端测试', exists: checkFileExists('playwright.config.ts') },
    { name: '测试工具', exists: checkFileExists('scripts/run-all-tests.js') }
  ];
  
  testFeatures.forEach(feature => {
    console.log(`  ${feature.exists ? '✅' : '❌'} ${feature.name}`);
    if (feature.exists) {
      auditResults.completed.push(`测试系统: ${feature.name}`);
    } else {
      auditResults.incomplete.push(`测试系统: ${feature.name}`);
    }
  });
  
  return {
    api: apiCheck,
    pages: pageCheck,
    components: componentCheck,
    database: dbCheck,
    config: configCheck,
    docs: docCheck
  };
}

/**
 * 检查潜在的缺失功能
 */
function checkMissingFeatures() {
  console.log('\n🔍 潜在缺失功能检查');
  console.log('=' .repeat(60));
  
  const potentialMissing = [
    {
      category: '用户管理',
      features: [
        { name: '用户注册/登录页面', path: 'src/app/auth/login/page.tsx' },
        { name: '用户权限管理', path: 'src/lib/auth/permissions.ts' },
        { name: '用户角色系统', path: 'src/lib/auth/roles.ts' }
      ]
    },
    {
      category: '内容管理',
      features: [
        { name: '内容审核后台', path: 'src/app/admin/content/page.tsx' },
        { name: '内容分类管理', path: 'src/lib/content/categories.ts' },
        { name: '内容搜索功能', path: 'src/app/api/search/route.ts' }
      ]
    },
    {
      category: '支付系统',
      features: [
        { name: '支付接口', path: 'src/app/api/payment/route.ts' },
        { name: '订单管理', path: 'src/lib/payment/orders.ts' },
        { name: '会员系统', path: 'src/lib/membership/index.ts' }
      ]
    },
    {
      category: '数据分析',
      features: [
        { name: '用户行为分析', path: 'src/lib/analytics/user-behavior.ts' },
        { name: '内容统计分析', path: 'src/lib/analytics/content-stats.ts' },
        { name: '业务报表', path: 'src/app/admin/reports/page.tsx' }
      ]
    },
    {
      category: '国际化',
      features: [
        { name: '多语言支持', path: 'src/lib/i18n/index.ts' },
        { name: '语言切换组件', path: 'src/components/common/LanguageSwitcher.tsx' },
        { name: '翻译文件', path: 'public/locales/en/common.json' }
      ]
    }
  ];
  
  potentialMissing.forEach(category => {
    console.log(`\n📂 ${category.category}:`);
    category.features.forEach(feature => {
      const exists = checkFileExists(feature.path);
      console.log(`  ${exists ? '✅' : '❓'} ${feature.name}`);
      if (!exists) {
        auditResults.missing.push(`${category.category}: ${feature.name}`);
      }
    });
  });
}

/**
 * 生成改进建议
 */
function generateRecommendations() {
  console.log('\n💡 改进建议');
  console.log('=' .repeat(60));
  
  const recommendations = [];
  
  // 基于缺失功能生成建议
  if (auditResults.incomplete.length > 0) {
    recommendations.push({
      priority: 'high',
      category: '功能完善',
      title: '完成未实现的核心功能',
      description: `有 ${auditResults.incomplete.length} 个核心功能未完成`,
      items: auditResults.incomplete
    });
  }
  
  if (auditResults.missing.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: '功能扩展',
      title: '考虑添加缺失的功能模块',
      description: `发现 ${auditResults.missing.length} 个潜在的功能需求`,
      items: auditResults.missing.slice(0, 5) // 只显示前5个
    });
  }
  
  // 检查是否需要用户认证系统
  if (!checkDirectoryExists('src/lib/auth') || !checkFileExists('src/app/auth/login/page.tsx')) {
    recommendations.push({
      priority: 'high',
      category: '安全性',
      title: '完善用户认证系统',
      description: '用户认证和权限管理是生产环境的必需功能',
      items: ['用户注册/登录页面', '权限管理系统', '会话管理']
    });
  }
  
  // 检查是否需要支付系统
  if (!checkFileExists('src/app/api/payment/route.ts')) {
    recommendations.push({
      priority: 'medium',
      category: '商业化',
      title: '考虑添加支付系统',
      description: '如果产品需要商业化，支付系统是必需的',
      items: ['支付接口集成', '订单管理', '会员系统']
    });
  }
  
  // 检查是否需要更好的监控
  if (!checkFileExists('src/lib/monitoring/index.ts')) {
    recommendations.push({
      priority: 'medium',
      category: '运维',
      title: '增强监控和日志系统',
      description: '生产环境需要更完善的监控和日志',
      items: ['应用性能监控', '错误日志收集', '用户行为追踪']
    });
  }
  
  auditResults.recommendations = recommendations;
  
  recommendations.forEach(rec => {
    const priorityIcon = rec.priority === 'high' ? '🚨' : rec.priority === 'medium' ? '⚠️' : '💡';
    console.log(`\n${priorityIcon} ${rec.title} (${rec.category})`);
    console.log(`   ${rec.description}`);
    if (rec.items && rec.items.length > 0) {
      rec.items.forEach(item => {
        console.log(`   - ${item}`);
      });
    }
  });
}

/**
 * 生成产品路线图建议
 */
function generateRoadmap() {
  console.log('\n🗺️ 产品路线图建议');
  console.log('=' .repeat(60));
  
  const roadmap = [
    {
      phase: 'v0.6.0 - 用户系统完善',
      timeline: '2-3周',
      priority: 'high',
      features: [
        '用户注册/登录系统',
        '用户权限管理',
        '用户配置文件完善',
        '会话管理优化'
      ]
    },
    {
      phase: 'v0.7.0 - 内容管理增强',
      timeline: '3-4周',
      priority: 'medium',
      features: [
        '内容审核后台',
        '内容分类管理',
        '内容搜索功能',
        '内容统计分析'
      ]
    },
    {
      phase: 'v0.8.0 - 商业化功能',
      timeline: '4-6周',
      priority: 'medium',
      features: [
        '支付系统集成',
        '订单管理',
        '会员系统',
        '业务报表'
      ]
    },
    {
      phase: 'v0.9.0 - 国际化和优化',
      timeline: '3-4周',
      priority: 'low',
      features: [
        '多语言支持',
        '性能优化',
        '用户体验改进',
        '移动端优化'
      ]
    },
    {
      phase: 'v1.0.0 - 生产就绪',
      timeline: '2-3周',
      priority: 'high',
      features: [
        '全面测试',
        '文档完善',
        '部署优化',
        '监控完善'
      ]
    }
  ];
  
  roadmap.forEach(phase => {
    const priorityIcon = phase.priority === 'high' ? '🚨' : phase.priority === 'medium' ? '⚠️' : '💡';
    console.log(`\n${priorityIcon} ${phase.phase} (${phase.timeline})`);
    phase.features.forEach(feature => {
      console.log(`   - ${feature}`);
    });
  });
}

/**
 * 主审计流程
 */
function runProductAudit() {
  try {
    const analysisResults = analyzeProductCompleteness();
    checkMissingFeatures();
    generateRecommendations();
    generateRoadmap();
    
    // 生成总结
    console.log('\n📊 审计总结');
    console.log('=' .repeat(60));
    
    const totalFeatures = auditResults.completed.length + auditResults.incomplete.length;
    const completionRate = ((auditResults.completed.length / totalFeatures) * 100).toFixed(1);
    
    console.log(`✅ 已完成功能: ${auditResults.completed.length}个`);
    console.log(`❌ 未完成功能: ${auditResults.incomplete.length}个`);
    console.log(`❓ 潜在缺失功能: ${auditResults.missing.length}个`);
    console.log(`📈 完成率: ${completionRate}%`);
    console.log(`💡 改进建议: ${auditResults.recommendations.length}条`);
    
    // 保存审计报告
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        completed: auditResults.completed.length,
        incomplete: auditResults.incomplete.length,
        missing: auditResults.missing.length,
        completionRate: parseFloat(completionRate),
        recommendations: auditResults.recommendations.length
      },
      details: auditResults,
      analysis: analysisResults
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../PRODUCT_AUDIT_REPORT.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 详细审计报告已保存到: PRODUCT_AUDIT_REPORT.json');
    
    return auditResults.incomplete.length === 0;
    
  } catch (error) {
    console.error('❌ 产品审计失败:', error.message);
    return false;
  }
}

// 执行产品审计
if (require.main === module) {
  const success = runProductAudit();
  process.exit(success ? 0 : 1);
}

module.exports = { runProductAudit };