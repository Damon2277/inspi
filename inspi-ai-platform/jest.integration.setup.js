/**
 * Jest集成测试环境设置
 * 配置集成测试所需的环境和工具
 */

const { logger } = require('./src/lib/utils/logger')

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.TEST_ENV = 'integration'

// 数据库配置
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost'
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '3306'
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'test_invitation_system'
process.env.TEST_DB_USER = process.env.TEST_DB_USER || 'test'
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test'

// Redis配置（如果需要）
process.env.TEST_REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost'
process.env.TEST_REDIS_PORT = process.env.TEST_REDIS_PORT || '6379'
process.env.TEST_REDIS_DB = process.env.TEST_REDIS_DB || '1'

// 日志配置
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// 全局测试配置
global.testConfig = {
  // 数据库配置
  database: {
    host: process.env.TEST_DB_HOST,
    port: parseInt(process.env.TEST_DB_PORT),
    database: process.env.TEST_DB_NAME,
    username: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    connectionLimit: 10
  },
  
  // Redis配置
  redis: {
    host: process.env.TEST_REDIS_HOST,
    port: parseInt(process.env.TEST_REDIS_PORT),
    db: parseInt(process.env.TEST_REDIS_DB)
  },
  
  // 测试超时配置
  timeouts: {
    default: 30000,
    database: 10000,
    api: 5000,
    integration: 60000
  },
  
  // 性能测试阈值
  performanceThresholds: {
    responseTime: 1000, // 1秒
    concurrency: 100,
    memoryUsage: 500 * 1024 * 1024, // 500MB
    cpuUsage: 80 // 80%
  }
}

// 全局测试工具函数
global.testUtils = {
  /**
   * 等待指定时间
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * 生成随机字符串
   */
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },
  
  /**
   * 生成随机邮箱
   */
  randomEmail: () => {
    return `test-${global.testUtils.randomString(8)}@example.com`
  },
  
  /**
   * 生成随机用户ID
   */
  randomUserId: () => {
    return `user-${global.testUtils.randomString(12)}`
  },
  
  /**
   * 测量执行时间
   */
  measureTime: async (fn) => {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  },
  
  /**
   * 重试执行函数
   */
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          await global.testUtils.sleep(delay)
        }
      }
    }
    
    throw lastError
  }
}

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection in test setup:', { reason, promise })
})

// 测试开始前的全局设置
beforeAll(async () => {
  logger.info('Starting integration test suite')
  
  // 可以在这里添加全局的测试数据准备
  // 例如：创建测试数据库、初始化缓存等
})

// 测试结束后的全局清理
afterAll(async () => {
  logger.info('Integration test suite completed')
  
  // 可以在这里添加全局的清理工作
  // 例如：清理测试数据、关闭连接等
})

// 每个测试文件开始前的设置
beforeEach(() => {
  // 重置模拟时间（如果使用了jest.useFakeTimers）
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers()
  }
})

// 每个测试文件结束后的清理
afterEach(() => {
  // 清理模拟函数
  jest.clearAllMocks()
})

// 扩展Jest匹配器
expect.extend({
  /**
   * 检查响应时间是否在合理范围内
   */
  toBeWithinResponseTime(received, expected) {
    const pass = received <= expected
    if (pass) {
      return {
        message: () => `expected ${received}ms not to be within ${expected}ms`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received}ms to be within ${expected}ms`,
        pass: false
      }
    }
  },
  
  /**
   * 检查成功率是否达到预期
   */
  toHaveSuccessRate(received, expected) {
    const pass = received >= expected
    if (pass) {
      return {
        message: () => `expected success rate ${received} not to be at least ${expected}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected success rate ${received} to be at least ${expected}`,
        pass: false
      }
    }
  },
  
  /**
   * 检查是否为有效的邀请码格式
   */
  toBeValidInviteCode(received) {
    const inviteCodePattern = /^[A-Z0-9]{8,12}$/
    const pass = inviteCodePattern.test(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid invite code`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid invite code`,
        pass: false
      }
    }
  }
})

logger.info('Integration test environment setup completed')