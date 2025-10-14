/**
 * 高级Jest设置文件
 * 使用新的测试环境管理系统
 */

const { TestEnvironment } = require('./src/lib/testing/TestEnvironment');

// 导入基础设置
require('./jest.setup.js');

// 初始化测试环境
let testEnvironment;

beforeAll(async () => {
  try {
    testEnvironment = TestEnvironment.getInstance();
    const result = await testEnvironment.initialize();

    if (!result.success) {
      console.error('❌ Test environment initialization failed:');
      result.errors.forEach(error => console.error(`  - ${error}`));

      if (result.errors.length > 0) {
        throw new Error('Test environment initialization failed');
      }
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️  Test environment warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    console.log(`✅ Test environment initialized (${result.environment.type})`);
    console.log(`   Platform: ${result.environment.platform}`);
    console.log(`   Node: ${result.environment.nodeVersion}`);
    console.log(`   CPUs: ${result.environment.cpus}`);
    console.log(`   Memory: ${Math.round(result.environment.memory / 1024 / 1024)}MB`);
    console.log(`   CI: ${result.environment.ci ? 'Yes' : 'No'}`);
    console.log(`   Docker: ${result.environment.docker ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('Failed to initialize test environment:', error);
    throw error;
  }
}, 30000);

afterAll(async () => {
  if (testEnvironment) {
    try {
      await testEnvironment.cleanup();
      console.log('🧹 Test environment cleaned up');
    } catch (error) {
      console.error('Error during test environment cleanup:', error);
    }
  }
}, 10000);

// 每个测试文件开始前的健康检查
beforeEach(async () => {
  if (testEnvironment && global.testUtils?.config?.environment?.type !== 'unit') {
    try {
      const health = await testEnvironment.healthCheck();
      if (!health.healthy) {
        console.warn('⚠️  Test environment health check failed:');
        health.checks.forEach(check => {
          if (check.status === 'fail') {
            console.warn(`  - ${check.name}: ${check.message || 'Failed'}`);
          }
        });
      }
    } catch (error) {
      console.warn('Health check error:', error);
    }
  }
});

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// 设置全局测试超时处理
const originalTimeout = setTimeout;
global.setTimeout = function (callback, delay, ...args) {
  if (delay > 30000) {
    console.warn(`⚠️  Long timeout detected: ${delay}ms`);
  }
  return originalTimeout(callback, delay, ...args);
};

// 增强的测试工具
global.testUtils = {
  ...global.testUtils,

  // 创建测试用户
  createTestUser: (overrides = {}) => ({
    id: `test_user_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    createdAt: new Date(),
    ...overrides,
  }),

  // 创建测试作品
  createTestWork: (overrides = {}) => ({
    id: `test_work_${Date.now()}`,
    title: 'Test Work',
    content: 'Test content',
    tags: ['test'],
    createdAt: new Date(),
    ...overrides,
  }),

  // 等待条件满足
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // 模拟延迟
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // 生成随机字符串
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  // 生成随机邮箱
  randomEmail: () => {
    return `test_${Math.random().toString(36).substring(2)}@example.com`;
  },

  // 清理测试数据
  cleanup: async () => {
    if (global.testUtils.isUnitTest) {
      // 单元测试不需要清理数据库
      return;
    }

    try {
      const { TestDatabaseManager } = require('./src/lib/testing/TestDatabaseManager');
      const dbManager = TestDatabaseManager.getInstance();
      await dbManager.clearDatabases();
    } catch (error) {
      console.warn('Failed to cleanup test data:', error);
    }
  },
};

console.log('🚀 Advanced test setup completed');
