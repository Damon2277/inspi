/**
 * 日志系统手动测试脚本
 */
const path = require('path');

// 设置环境变量
process.env.NODE_ENV = 'development';

async function testLoggingSystem() {
  console.log('🧪 开始测试日志系统...\n');
  
  try {
    // 动态导入 ES 模块
    const { logger, createTracedLogger, createTaggedLogger, checkLoggerHealth } = 
      await import('../src/lib/logging/logger.js');
    const { createTimer, logUserAction, logAIOperation } = 
      await import('../src/lib/logging/utils.js');
    
    console.log('✅ 日志模块导入成功');
    
    // 测试基础日志功能
    console.log('\n📝 测试基础日志功能...');
    logger.info('这是一条信息日志');
    logger.warn('这是一条警告日志');
    logger.error('这是一条错误日志', new Error('测试错误'));
    logger.debug('这是一条调试日志');
    
    // 测试带上下文的日志
    console.log('\n🏷️ 测试上下文日志...');
    logger.info('带上下文的日志', {
      userId: 'test-user-123',
      traceId: 'test-trace-456',
      metadata: {
        action: 'test',
        component: 'logging-test'
      }
    });
    
    // 测试专用日志方法
    console.log('\n🎯 测试专用日志方法...');
    logger.database('数据库操作完成', {
      metadata: {
        collection: 'users',
        operation: 'find',
        duration: 150
      }
    });
    
    logger.ai('AI生成完成', {
      metadata: {
        model: 'gemini-pro',
        tokens: 200,
        operation: 'generate'
      }
    });
    
    logger.user('用户操作', 'user-123', {
      metadata: {
        action: 'create_work',
        resource: 'work-456'
      }
    });
    
    logger.security('安全事件', {
      metadata: {
        event: 'suspicious_login',
        severity: 'medium',
        ip: '192.168.1.100'
      }
    });
    
    // 测试子日志器
    console.log('\n👶 测试子日志器...');
    const tracedLogger = createTracedLogger('trace-789');
    tracedLogger.info('带追踪ID的日志');
    
    const taggedLogger = createTaggedLogger('TEST');
    taggedLogger.info('带标签的日志');
    
    const childLogger = logger.child({
      userId: 'child-user',
      metadata: { component: 'child-test' }
    });
    childLogger.info('子日志器测试');
    
    // 测试性能计时器
    console.log('\n⏱️ 测试性能计时器...');
    const timer = createTimer('测试操作');
    
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 100));
    timer.checkpoint('中间检查点');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    const duration = timer.end();
    console.log(`操作耗时: ${duration}ms`);
    
    // 测试工具函数
    console.log('\n🛠️ 测试工具函数...');
    logUserAction('user-999', 'login', 'session-123', {
      metadata: { ip: '192.168.1.1' }
    });
    
    logAIOperation('generate', 'gemini-pro', 150, 1200, true, {
      metadata: { prompt: 'test prompt' }
    });
    
    // 测试健康检查
    console.log('\n🏥 测试健康检查...');
    const health = await checkLoggerHealth();
    console.log('日志器健康状态:', health);
    
    // 测试敏感信息脱敏
    console.log('\n🔒 测试敏感信息脱敏...');
    logger.info('包含敏感信息的日志', {
      metadata: {
        password: 'secret123',
        token: 'jwt-token-here',
        email: 'user@example.com',
        normalField: 'normal-value'
      }
    });
    
    console.log('\n✅ 所有测试完成！');
    console.log('\n📁 请检查 logs/ 目录下的日志文件');
    
    // 等待日志写入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查日志文件
    const fs = require('fs');
    if (fs.existsSync('logs')) {
      const files = fs.readdirSync('logs');
      console.log('\n📄 生成的日志文件:');
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testLoggingSystem().then(() => {
  console.log('\n🎉 日志系统测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试脚本执行失败:', error);
  process.exit(1);
});