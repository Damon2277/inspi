#!/usr/bin/env node

/**
 * 功能演示脚本
 * 展示已完成的订阅系统核心功能
 */

console.log('🎭 订阅系统功能演示');
console.log('='.repeat(60));

// 模拟导入 (在实际环境中这些会从模块导入)
const UserTiers = ['free', 'basic', 'pro', 'admin'];
const QuotaTypes = ['create', 'reuse', 'export', 'graph_nodes'];
const SubscriptionStatuses = ['active', 'cancelled', 'expired', 'pending', 'suspended'];

// 模拟配额限制配置
const QuotaLimits = {
  free: { dailyCreateQuota: 3, dailyReuseQuota: 1, maxExportsPerDay: 10, maxGraphNodes: 50 },
  basic: { dailyCreateQuota: 20, dailyReuseQuota: 5, maxExportsPerDay: 50, maxGraphNodes: -1 },
  pro: { dailyCreateQuota: 100, dailyReuseQuota: 50, maxExportsPerDay: 200, maxGraphNodes: -1 },
  admin: { dailyCreateQuota: -1, dailyReuseQuota: -1, maxExportsPerDay: -1, maxGraphNodes: -1 },
};

// 模拟套餐配置
const Plans = [
  { tier: 'free', name: '免费版', price: 0, popular: false },
  { tier: 'basic', name: '基础版', price: 69, popular: true },
  { tier: 'pro', name: '专业版', price: 199, popular: false },
  { tier: 'admin', name: '管理员', price: 0, popular: false },
];

// 模拟用户数据
const mockUsers = [
  { id: 'user-1', tier: 'free', usage: { create: 2, reuse: 1, export: 5 } },
  { id: 'user-2', tier: 'basic', usage: { create: 15, reuse: 3, export: 25 } },
  { id: 'user-3', tier: 'pro', usage: { create: 45, reuse: 20, export: 80 } },
];

console.log('\n📋 1. 用户等级和配额系统');
console.log('-'.repeat(40));
UserTiers.forEach(tier => {
  const limits = QuotaLimits[tier];
  const plan = Plans.find(p => p.tier === tier);
  console.log(`${tier.toUpperCase().padEnd(8)} | ${plan.name.padEnd(8)} | ¥${plan.price.toString().padStart(3)} | 创建:${limits.dailyCreateQuota === -1 ? '无限' : limits.dailyCreateQuota.toString().padStart(3)} | 复用:${limits.dailyReuseQuota === -1 ? '无限' : limits.dailyReuseQuota.toString().padStart(3)}`);
});

console.log('\n🔍 2. 配额检查演示');
console.log('-'.repeat(40));

function checkQuota(user, quotaType) {
  const limits = QuotaLimits[user.tier];
  const usage = user.usage;

  let limit, used;
  switch (quotaType) {
    case 'create':
      limit = limits.dailyCreateQuota;
      used = usage.create;
      break;
    case 'reuse':
      limit = limits.dailyReuseQuota;
      used = usage.reuse;
      break;
    case 'export':
      limit = limits.maxExportsPerDay;
      used = usage.export;
      break;
    default:
      return { allowed: false, reason: 'unknown_quota_type' };
  }

  if (limit === -1) {
    return { allowed: true, usage: { used, limit: '无限', percentage: 0 } };
  }

  const percentage = Math.round((used / limit) * 100);
  const allowed = used < limit;

  return {
    allowed,
    usage: { used, limit, percentage },
    reason: allowed ? null : 'quota_exceeded',
  };
}

mockUsers.forEach(user => {
  console.log(`\n用户 ${user.id} (${user.tier}):`);
  QuotaTypes.slice(0, 3).forEach(type => {
    const result = checkQuota(user, type);
    const status = result.allowed ? '✅' : '❌';
    const usageStr = `${result.usage.used}/${result.usage.limit}`;
    const percentStr = result.usage.percentage ? `(${result.usage.percentage}%)` : '';
    console.log(`  ${status} ${type.padEnd(8)}: ${usageStr.padEnd(8)} ${percentStr}`);
  });
});

console.log('\n💡 3. 升级推荐演示');
console.log('-'.repeat(40));

function generateUpgradeRecommendation(user, quotaType) {
  const currentTier = user.tier;
  let recommendedTier;

  if (currentTier === 'free') recommendedTier = 'basic';
  else if (currentTier === 'basic') recommendedTier = 'pro';
  else return null;

  const currentPlan = Plans.find(p => p.tier === currentTier);
  const recommendedPlan = Plans.find(p => p.tier === recommendedTier);

  const benefits = {
    create: ['更多创建配额', '释放创作潜力', '支持更多场景'],
    reuse: ['更多复用机会', '快速构建体系', '提升效率10倍'],
    export: ['无限制导出', '高清质量保证', '批量导出功能'],
  };

  return {
    currentPlan: currentPlan.name,
    recommendedPlan: recommendedPlan.name,
    priceIncrease: recommendedPlan.price - currentPlan.price,
    benefits: benefits[quotaType] || ['更多功能', '更好体验', '专业服务'],
    urgency: 'high',
  };
}

// 演示配额超限用户的升级推荐
const overLimitUser = { id: 'user-over', tier: 'free', usage: { create: 3, reuse: 1, export: 10 } };
console.log(`配额超限用户 (${overLimitUser.tier}):`);
const recommendation = generateUpgradeRecommendation(overLimitUser, 'create');
if (recommendation) {
  console.log(`  推荐升级: ${recommendation.currentPlan} → ${recommendation.recommendedPlan}`);
  console.log(`  价格增加: ¥${recommendation.priceIncrease}/月`);
  console.log(`  主要收益: ${recommendation.benefits.join(', ')}`);
}

console.log('\n📊 4. 配额使用统计');
console.log('-'.repeat(40));

function calculateUsageStats() {
  const stats = {
    totalUsers: mockUsers.length,
    tierDistribution: {},
    averageUsage: { create: 0, reuse: 0, export: 0 },
    overLimitUsers: 0,
  };

  // 计算等级分布
  mockUsers.forEach(user => {
    stats.tierDistribution[user.tier] = (stats.tierDistribution[user.tier] || 0) + 1;
  });

  // 计算平均使用量
  const totalUsage = mockUsers.reduce((acc, user) => {
    acc.create += user.usage.create;
    acc.reuse += user.usage.reuse;
    acc.export += user.usage.export;
    return acc;
  }, { create: 0, reuse: 0, export: 0 });

  stats.averageUsage.create = Math.round(totalUsage.create / mockUsers.length);
  stats.averageUsage.reuse = Math.round(totalUsage.reuse / mockUsers.length);
  stats.averageUsage.export = Math.round(totalUsage.export / mockUsers.length);

  // 计算超限用户
  stats.overLimitUsers = mockUsers.filter(user => {
    const limits = QuotaLimits[user.tier];
    return user.usage.create >= limits.dailyCreateQuota && limits.dailyCreateQuota !== -1;
  }).length;

  return stats;
}

const stats = calculateUsageStats();
console.log(`总用户数: ${stats.totalUsers}`);
console.log(`等级分布: ${Object.entries(stats.tierDistribution).map(([tier, count]) => `${tier}:${count}`).join(', ')}`);
console.log(`平均使用: 创建:${stats.averageUsage.create}, 复用:${stats.averageUsage.reuse}, 导出:${stats.averageUsage.export}`);
console.log(`超限用户: ${stats.overLimitUsers} 人`);

console.log('\n🔧 5. API端点演示');
console.log('-'.repeat(40));
console.log('可用的API端点:');
console.log('  GET  /api/subscription/quota/daily-usage?userId=xxx&type=create&date=2024-01-01');
console.log('  GET  /api/subscription/quota/graph-nodes?userId=xxx');
console.log('  POST /api/subscription/quota/consume');
console.log('       Body: {"userId":"xxx","type":"create","amount":1}');

console.log('\n🖥️  6. 测试页面');
console.log('-'.repeat(40));
console.log('可访问的测试页面:');
console.log('  http://localhost:3000/test/subscription        - 订阅系统测试');
console.log('  http://localhost:3000/test/upgrade-prompt      - 升级提示测试');
console.log('  http://localhost:3000/test/comprehensive       - 综合功能测试');

console.log('\n🎯 7. 核心功能特性');
console.log('-'.repeat(40));
console.log('✅ 多层级用户体系 (免费/基础/专业/管理员)');
console.log('✅ 灵活的配额管理 (创建/复用/导出/图谱节点)');
console.log('✅ 实时配额检查和验证');
console.log('✅ 智能升级推荐算法');
console.log('✅ 配额使用情况监控');
console.log('✅ 事件驱动的通知系统');
console.log('✅ 完整的TypeScript类型支持');
console.log('✅ 模块化和可扩展的架构');

console.log('\n' + '='.repeat(60));
console.log('🎉 功能演示完成!');
console.log('💡 提示: 运行 npm run dev 启动开发服务器进行实际测试');
console.log('📖 详细文档: CURRENT_FUNCTIONALITY_TEST_REPORT.md');
