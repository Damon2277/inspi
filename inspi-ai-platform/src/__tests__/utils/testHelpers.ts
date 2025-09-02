/**
 * 测试辅助工具函数
 * 提供常用的测试工具和模拟数据
 */
import { Types } from 'mongoose'

// 生成测试用的ObjectId
export const generateTestId = () => new Types.ObjectId().toString()

// 生成测试用户数据
export const createTestUser = (overrides = {}) => ({
  _id: generateTestId(),
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  subscription: {
    type: 'free',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
    limits: {
      dailyGenerations: 10,
      maxWorks: 50,
      maxGraphs: 5
    }
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// 生成测试作品数据
export const createTestWork = (overrides = {}) => ({
  _id: generateTestId(),
  userId: generateTestId(),
  title: 'Test Work',
  description: 'This is a test work',
  subject: 'mathematics',
  educationLevel: 'high_school',
  cards: [
    {
      id: generateTestId(),
      type: 'concept',
      title: 'Test Concept',
      content: 'This is a test concept card',
      metadata: {}
    }
  ],
  metadata: {
    isPublic: true,
    tags: ['test', 'mathematics'],
    difficulty: 3,
    estimatedTime: 30
  },
  stats: {
    views: 0,
    likes: 0,
    reuseCount: 0,
    rating: 0
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// 生成测试知识图谱数据
export const createTestGraph = (overrides = {}) => ({
  _id: generateTestId(),
  userId: generateTestId(),
  name: 'Test Knowledge Graph',
  description: 'This is a test knowledge graph',
  type: 'custom',
  subject: 'mathematics',
  gradeLevel: 'high',
  nodes: [
    {
      id: generateTestId(),
      label: 'Test Node',
      type: 'topic',
      level: 1,
      position: { x: 0, y: 0 },
      metadata: {
        workCount: 0,
        reuseCount: 0
      },
      isVisible: true,
      isLocked: false
    }
  ],
  edges: [],
  layout: {
    type: 'force',
    options: {}
  },
  view: {
    showLabels: true,
    showEdgeLabels: false,
    nodeSize: 'fixed',
    edgeWidth: 'fixed',
    colorScheme: 'default',
    theme: 'light',
    animations: true,
    minimap: true,
    toolbar: true
  },
  version: 1,
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// 模拟API请求
export const mockApiRequest = (method: string, url: string, data?: any) => ({
  method,
  url,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  },
  body: data ? JSON.stringify(data) : undefined
})

// 模拟API响应
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
})

// 等待异步操作完成
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 模拟用户交互延迟
export const simulateUserDelay = () => waitFor(100)

// 清理测试数据的工具函数
export const cleanupTestData = async (models: any[]) => {
  for (const model of models) {
    if (model && typeof model.deleteMany === 'function') {
      await model.deleteMany({})
    }
  }
}

// 验证对象是否为有效的ObjectId
export const isValidObjectId = (id: string) => Types.ObjectId.isValid(id)

// 创建测试环境变量
export const createTestEnv = (overrides = {}) => ({
  NODE_ENV: 'test',
  NEXTAUTH_SECRET: 'test-secret',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  REDIS_URL: 'redis://localhost:6379',
  GEMINI_API_KEY: 'test-key',
  ...overrides
})

// 模拟认证中间件
export const mockAuth = (user = createTestUser()) => {
  return jest.fn().mockResolvedValue(user)
}

// 模拟数据库连接
export const mockDbConnection = () => {
  return {
    isConnected: true,
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true)
  }
}

// 测试错误处理
export const expectError = async (fn: () => Promise<any>, expectedMessage?: string) => {
  try {
    await fn()
    throw new Error('Expected function to throw an error')
  } catch (error) {
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage)
    }
    return error
  }
}

// 模拟Redis客户端
export const mockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  quit: jest.fn()
})

export default {
  generateTestId,
  createTestUser,
  createTestWork,
  createTestGraph,
  mockApiRequest,
  mockApiResponse,
  waitFor,
  simulateUserDelay,
  cleanupTestData,
  isValidObjectId,
  createTestEnv,
  mockAuth,
  mockDbConnection,
  expectError,
  mockRedisClient
}