/**
 * Jest 集成测试环境设置
 * 用于API集成测试，使用Mock服务而不是真实数据库
 */

// 导入基础设置
require('./jest.setup.js')

// 集成测试专用设置
process.env.NODE_ENV = 'test'
process.env.TEST_TYPE = 'integration'

// Mock数据库连接
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    collections: {},
  },
}))

// Mock Redis连接
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    disconnect: jest.fn(),
  }))
})

// 全局设置 - 在所有测试开始前运行
beforeAll(async () => {
  console.log('🚀 Integration test environment initialized')
})

// 每个测试后清理Mock数据
afterEach(async () => {
  // 清理所有Mock数据
  jest.clearAllMocks()
})

// 全局清理 - 在所有测试结束后运行
afterAll(async () => {
  console.log('🛑 Integration test environment cleaned up')
})

// 处理未捕获的Promise拒绝
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection in integration tests:', error)
})

// 集成测试专用的全局变量
global.testUtils = {
  isIntegrationTest: true,
  mockExternalServices: true,
}