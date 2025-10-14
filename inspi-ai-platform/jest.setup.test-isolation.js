/**
 * 测试隔离配置
 * 确保测试之间完全隔离，避免相互影响
 */

// 测试数据隔离
const testDataStore = new Map();

// 在每个测试前清理
beforeEach(() => {
  // 清理测试数据存储
  testDataStore.clear();

  // 清理所有模拟
  jest.clearAllMocks();

  // 重置模块注册表
  jest.resetModules();

  // 清理定时器
  jest.clearAllTimers();

  // 重置DOM
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  }

  // 清理全局状态
  if (typeof window !== 'undefined') {
    // 清理localStorage
    window.localStorage.clear();

    // 清理sessionStorage
    window.sessionStorage.clear();

    // 清理事件监听器
    const events = ['resize', 'scroll', 'click', 'keydown', 'keyup'];
    events.forEach(event => {
      window.removeEventListener(event, () => {});
    });
  }

  // 重置环境变量
  process.env.NODE_ENV = 'test';

  // 清理React Query缓存
  if (global.testQueryClient) {
    global.testQueryClient.clear();
  }
});

// 在每个测试后清理
afterEach(() => {
  // 清理异步操作
  return new Promise(resolve => {
    setTimeout(() => {
      // 确保所有异步操作完成
      resolve();
    }, 0);
  });
});

// 在所有测试前设置
beforeAll(() => {
  // 设置测试超时
  jest.setTimeout(10000);

  // 禁用console.warn在测试中的输出（除非是错误）
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && args[0].includes('Warning:')) {
      // 只显示React警告
      originalWarn(...args);
    }
  };

  // 设置全局错误处理
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });
});

// 在所有测试后清理
afterAll(() => {
  // 恢复原始的console方法
  jest.restoreAllMocks();

  // 清理全局状态
  testDataStore.clear();

  // 清理定时器
  jest.clearAllTimers();
  jest.useRealTimers();
});

// 测试工具函数
global.testIsolation = {
  // 获取测试数据
  getTestData: (key) => testDataStore.get(key),

  // 设置测试数据
  setTestData: (key, value) => testDataStore.set(key, value),

  // 清理测试数据
  clearTestData: () => testDataStore.clear(),

  // 创建隔离的测试环境
  createIsolatedEnv: () => ({
    localStorage: new Map(),
    sessionStorage: new Map(),
    cookies: new Map(),
    globals: new Map(),
  }),

  // 等待所有异步操作完成
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // 清理DOM
  cleanupDOM: () => {
    if (typeof document !== 'undefined') {
      document.body.innerHTML = '';
      document.head.innerHTML = '';
    }
  },

  // 重置所有模拟
  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  },
};

// 导出测试隔离工具
module.exports = {
  testDataStore,
  testIsolation: global.testIsolation,
};
