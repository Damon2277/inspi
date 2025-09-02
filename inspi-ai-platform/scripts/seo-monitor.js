#!/usr/bin/env node

/**
 * SEO监控脚本
 * 用于定期检查SEO健康状态和更新sitemap
 */

const fs = require('fs');
const path = require('path');

// 模拟SEO健康检查
async function checkSEOHealth() {
  console.log('🔍 开始SEO健康检查...');
  
  const checks = [];
  
  // 检查sitemap文件是否存在
  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    checks.push({
      name: 'Sitemap文件存在性',
      status: 'pass',
      message: 'Sitemap文件存在'
    });
  } else {
    checks.push({
      name: 'Sitemap文件存在性',
      status: 'fail',
      message: 'Sitemap文件不存在'
    });
  }
  
  // 检查robots.txt文件是否存在
  const robotsPath = path.join(__dirname, '../public/robots.txt');
  if (fs.existsSync(robotsPath)) {
    checks.push({
      name: 'Robots.txt文件存在性',
      status: 'pass',
      message: 'Robots.txt文件存在'
    });
  } else {
    checks.push({
      name: 'Robots.txt文件存在性',
      status: 'fail',
      message: 'Robots.txt文件不存在'
    });
  }
  
  // 检查OG图片是否存在
  const ogImagePath = path.join(__dirname, '../public/og-image.jpg');
  if (fs.existsSync(ogImagePath)) {
    checks.push({
      name: 'OG图片存在性',
      status: 'pass',
      message: 'OG图片文件存在'
    });
  } else {
    checks.push({
      name: 'OG图片存在性',
      status: 'warning',
      message: 'OG图片文件不存在，建议添加'
    });
  }
  
  // 计算整体状态
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  
  let overallStatus;
  if (failCount > 0) {
    overallStatus = 'error';
  } else if (warningCount > 0) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'healthy';
  }
  
  return {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString()
  };
}

// 生成SEO报告
function generateSEOReport(healthStatus) {
  console.log('\n📊 SEO健康报告');
  console.log('='.repeat(50));
  console.log(`整体状态: ${getStatusEmoji(healthStatus.status)} ${healthStatus.status.toUpperCase()}`);
  console.log(`检查时间: ${new Date(healthStatus.timestamp).toLocaleString()}`);
  console.log('\n详细检查结果:');
  
  healthStatus.checks.forEach((check, index) => {
    console.log(`${index + 1}. ${getStatusEmoji(check.status)} ${check.name}`);
    console.log(`   ${check.message}`);
  });
  
  console.log('\n建议:');
  const failedChecks = healthStatus.checks.filter(c => c.status === 'fail');
  const warningChecks = healthStatus.checks.filter(c => c.status === 'warning');
  
  if (failedChecks.length > 0) {
    console.log('❌ 需要立即修复的问题:');
    failedChecks.forEach(check => {
      console.log(`   - ${check.name}: ${check.message}`);
    });
  }
  
  if (warningChecks.length > 0) {
    console.log('⚠️  建议改进的项目:');
    warningChecks.forEach(check => {
      console.log(`   - ${check.name}: ${check.message}`);
    });
  }
  
  if (failedChecks.length === 0 && warningChecks.length === 0) {
    console.log('✅ 所有检查都通过了！SEO配置良好。');
  }
}

// 获取状态表情符号
function getStatusEmoji(status) {
  switch (status) {
    case 'healthy':
    case 'pass':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
    case 'fail':
      return '❌';
    default:
      return '❓';
  }
}

// 保存报告到文件
function saveReportToFile(healthStatus) {
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `seo-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(healthStatus, null, 2));
  
  console.log(`\n💾 报告已保存到: ${reportFile}`);
}

// 主函数
async function main() {
  try {
    console.log('🚀 启动SEO监控脚本...\n');
    
    const healthStatus = await checkSEOHealth();
    generateSEOReport(healthStatus);
    saveReportToFile(healthStatus);
    
    // 根据状态设置退出码
    if (healthStatus.status === 'error') {
      process.exit(1);
    } else if (healthStatus.status === 'warning') {
      process.exit(2);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ SEO监控脚本执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkSEOHealth,
  generateSEOReport,
  saveReportToFile
};