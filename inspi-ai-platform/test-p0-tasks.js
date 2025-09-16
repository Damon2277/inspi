#!/usr/bin/env node

/**
 * P0任务完成情况测试脚本
 * 验证所有P0级任务的实现状态
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始检查P0任务完成情况...\n');

// 任务检查结果
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

/**
 * 检查文件是否存在
 */
function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    results.passed++;
    results.details.push(`✅ ${description}: ${filePath}`);
    return true;
  } else {
    results.failed++;
    results.details.push(`❌ ${description}: ${filePath} (文件不存在)`);
    return false;
  }
}

/**
 * 检查文件内容
 */
function checkFileContent(filePath, searchText, description) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    results.failed++;
    results.details.push(`❌ ${description}: ${filePath} (文件不存在)`);
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasContent = content.includes(searchText);
    
    if (hasContent) {
      results.passed++;
      results.details.push(`✅ ${description}: 找到关键内容`);
      return true;
    } else {
      results.warnings++;
      results.details.push(`⚠️  ${description}: 未找到关键内容 "${searchText}"`);
      return false;
    }
  } catch (error) {
    results.failed++;
    results.details.push(`❌ ${description}: 读取文件失败 - ${error.message}`);
    return false;
  }
}

/**
 * 检查环境变量配置
 */
function checkEnvironmentConfig() {
  console.log('📋 Task 1.1.1: 环境配置和API密钥设置');
  
  // 检查环境配置文件
  checkFileExists('.env.local', '本地环境配置文件');
  checkFileExists('.env.example', '环境配置示例文件');
  checkFileExists('src/config/environment.ts', '环境配置管理文件');
  
  // 检查关键配置项
  checkFileContent('.env.local', 'GEMINI_API_KEY', 'Gemini API密钥配置');
  checkFileContent('.env.local', 'MONGODB_URI', 'MongoDB连接配置');
  checkFileContent('.env.local', 'REDIS_URL', 'Redis连接配置');
  checkFileContent('.env.local', 'SMTP_HOST', '邮件服务配置');
  
  console.log('');
}

/**
 * 检查AI服务封装
 */
function checkAIService() {
  console.log('📋 Task 1.1.2: AI服务封装类');
  
  checkFileExists('src/lib/ai/geminiService.ts', 'Gemini服务封装类');
  checkFileContent('src/lib/ai/geminiService.ts', 'class GeminiService', 'GeminiService类定义');
  checkFileContent('src/lib/ai/geminiService.ts', 'generateContent', '内容生成方法');
  checkFileContent('src/lib/ai/geminiService.ts', 'generateWithRetry', '重试机制');
  checkFileContent('src/lib/ai/geminiService.ts', 'healthCheck', '健康检查方法');
  
  console.log('');
}

/**
 * 检查提示词模板系统
 */
function checkPromptTemplates() {
  console.log('📋 Task 1.1.3: 提示词模板系统');
  
  checkFileExists('src/lib/ai/promptTemplates.ts', '提示词模板文件');
  checkFileContent('src/lib/ai/promptTemplates.ts', 'conceptCardTemplate', '概念卡片模板');
  checkFileContent('src/lib/ai/promptTemplates.ts', 'exampleCardTemplate', '实例卡片模板');
  checkFileContent('src/lib/ai/promptTemplates.ts', 'practiceCardTemplate', '练习卡片模板');
  checkFileContent('src/lib/ai/promptTemplates.ts', 'extensionCardTemplate', '拓展卡片模板');
  checkFileContent('src/lib/ai/promptTemplates.ts', 'generatePrompt', '提示词生成函数');
  
  console.log('');
}

/**
 * 检查API路由实现
 */
function checkAPIRoutes() {
  console.log('📋 Task 1.2.1: API路由实现');
  
  checkFileExists('src/app/api/magic/generate/route.ts', '卡片生成API路由');
  checkFileContent('src/app/api/magic/generate/route.ts', 'geminiService', 'Gemini服务集成');
  checkFileContent('src/app/api/magic/generate/route.ts', 'generateAllCardsPrompt', '提示词生成调用');
  checkFileContent('src/app/api/magic/generate/route.ts', 'validateAllCards', '内容验证调用');
  
  console.log('');
}

/**
 * 检查配额管理系统
 */
function checkQuotaSystem() {
  console.log('📋 Task 1.2.2: 配额管理系统');
  
  checkFileExists('src/lib/quota/quotaManager.ts', '配额管理器');
  checkFileContent('src/lib/quota/quotaManager.ts', 'class QuotaManager', 'QuotaManager类定义');
  checkFileContent('src/lib/quota/quotaManager.ts', 'checkQuota', '配额检查方法');
  checkFileContent('src/lib/quota/quotaManager.ts', 'consumeQuota', '配额消费方法');
  checkFileContent('src/app/api/magic/generate/route.ts', 'quotaManager.consumeQuota', 'API中的配额检查');
  
  console.log('');
}

/**
 * 检查邮件服务
 */
function checkEmailService() {
  console.log('📋 Task 2.1.1: 邮件服务集成');
  
  checkFileExists('src/lib/email/service.ts', '邮件服务封装');
  checkFileContent('src/lib/email/service.ts', 'class EmailService', 'EmailService类定义');
  checkFileContent('src/lib/email/service.ts', 'sendEmail', '邮件发送方法');
  checkFileContent('src/lib/email/service.ts', 'verifyConnection', '连接验证方法');
  
  console.log('');
}

/**
 * 检查验证码系统
 */
function checkVerificationSystem() {
  console.log('📋 Task 2.1.2: 验证码生成和管理');
  
  checkFileExists('src/lib/email/verification.ts', '验证码管理器');
  checkFileContent('src/lib/email/verification.ts', 'class VerificationManager', 'VerificationManager类定义');
  checkFileContent('src/lib/email/verification.ts', 'generateCode', '验证码生成方法');
  checkFileContent('src/lib/email/verification.ts', 'storeCode', '验证码存储方法');
  checkFileContent('src/lib/email/verification.ts', 'verifyCode', '验证码验证方法');
  checkFileContent('src/lib/email/verification.ts', 'checkRateLimit', '频率限制检查');
  
  console.log('');
}

/**
 * 检查邮件模板
 */
function checkEmailTemplates() {
  console.log('📋 Task 2.1.3: 邮件模板设计');
  
  checkFileExists('src/lib/email/templates.ts', '邮件模板文件');
  checkFileContent('src/lib/email/templates.ts', 'getVerificationEmailTemplate', '验证码邮件模板');
  checkFileContent('src/lib/email/templates.ts', 'getWelcomeEmailTemplate', '欢迎邮件模板');
  checkFileContent('src/lib/email/templates.ts', 'html:', 'HTML模板内容');
  checkFileContent('src/lib/email/templates.ts', 'text:', '文本模板内容');
  
  console.log('');
}

/**
 * 检查认证API接口
 */
function checkAuthAPIs() {
  console.log('📋 Task 2.1.4: API接口实现');
  
  checkFileExists('src/app/api/auth/send-verification/route.ts', '发送验证码API');
  checkFileExists('src/app/api/auth/verify-email/route.ts', '验证邮箱API');
  
  checkFileContent('src/app/api/auth/send-verification/route.ts', 'emailService.sendEmail', '邮件发送调用');
  checkFileContent('src/app/api/auth/send-verification/route.ts', 'verificationManager.checkRateLimit', '频率限制检查');
  checkFileContent('src/app/api/auth/verify-email/route.ts', 'verificationManager.verifyCode', '验证码验证调用');
  
  console.log('');
}

/**
 * 检查工具类和依赖
 */
function checkUtilities() {
  console.log('📋 支持工具和依赖检查');
  
  checkFileExists('src/lib/utils/logger.ts', '日志工具');
  checkFileExists('src/lib/cache/redis.ts', 'Redis缓存工具');
  
  // 检查package.json中的关键依赖
  if (checkFileExists('package.json', 'package.json文件')) {
    checkFileContent('package.json', '@google/generative-ai', 'Gemini AI SDK依赖');
    checkFileContent('package.json', 'nodemailer', '邮件发送依赖');
    checkFileContent('package.json', 'redis', 'Redis客户端依赖');
  }
  
  console.log('');
}

/**
 * 运行所有检查
 */
function runAllChecks() {
  console.log('🚀 P0任务完成情况检查报告');
  console.log('=' .repeat(50));
  console.log('');

  // Sprint 1: AI服务集成
  console.log('🔥 Sprint 1: AI服务集成 (P0)');
  console.log('-'.repeat(30));
  checkEnvironmentConfig();
  checkAIService();
  checkPromptTemplates();
  checkAPIRoutes();
  checkQuotaSystem();

  // Sprint 2: 用户认证完善
  console.log('🔥 Sprint 2: 用户认证完善 (P0)');
  console.log('-'.repeat(30));
  checkEmailService();
  checkVerificationSystem();
  checkEmailTemplates();
  checkAuthAPIs();

  // 支持工具检查
  checkUtilities();

  // 输出总结
  console.log('📊 检查结果总结');
  console.log('=' .repeat(50));
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`⚠️  警告: ${results.warnings}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`📈 总体完成率: ${Math.round((results.passed / (results.passed + results.failed + results.warnings)) * 100)}%`);
  console.log('');

  // 输出详细结果
  console.log('📋 详细检查结果');
  console.log('-'.repeat(30));
  results.details.forEach(detail => console.log(detail));
  console.log('');

  // 给出建议
  if (results.failed > 0) {
    console.log('🔧 需要修复的问题:');
    results.details
      .filter(detail => detail.startsWith('❌'))
      .forEach(detail => console.log(`  ${detail}`));
    console.log('');
  }

  if (results.warnings > 0) {
    console.log('⚠️  需要注意的问题:');
    results.details
      .filter(detail => detail.startsWith('⚠️'))
      .forEach(detail => console.log(`  ${detail}`));
    console.log('');
  }

  // 最终评估
  const completionRate = Math.round((results.passed / (results.passed + results.failed + results.warnings)) * 100);
  
  if (completionRate >= 90) {
    console.log('🎉 恭喜！P0任务基本完成，可以开始测试！');
  } else if (completionRate >= 70) {
    console.log('👍 P0任务大部分完成，建议修复关键问题后开始测试。');
  } else {
    console.log('⚠️  P0任务完成度较低，建议先完成核心功能再进行测试。');
  }

  console.log('');
  console.log('🔗 下一步建议:');
  console.log('1. 修复上述标记为❌的问题');
  console.log('2. 检查环境变量配置是否正确');
  console.log('3. 启动开发服务器测试API接口');
  console.log('4. 运行单元测试验证功能');
  console.log('5. 进行端到端测试');
}

// 运行检查
runAllChecks();