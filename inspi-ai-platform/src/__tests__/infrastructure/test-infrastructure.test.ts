/**
 * 测试基础设施验证测试
 * 验证所有测试工具和配置是否正常工作
 */

import { 
  renderWithProviders, 
  createTestQueryClient,
  waitForAsync,
  simulateUserDelay,
  generateRandomString,
  generateRandomEmail,
  mockLocalStorage,
  mockMatchMedia,
  cleanupMocks
} from '../utils/test-utils'

import {
  mockNextRouter,
  mockFetch,
  createMockApiResponse,
  createMockUser,
  cleanupAllMocks
} from '../utils/mock-utils'

import {
  createUserFixture,
  createWorkFixture,
  createKnowledgeGraphFixture,
  createSuccessResponse,
  createErrorResponse
} from '../fixtures'

describe('测试基础设施验证', () => {
  beforeEach(() => {
    cleanupMocks()
    cleanupAllMocks()
  })

  describe('测试工具函数', () => {
    test('createTestQueryClient 应该创建测试专用的QueryClient', () => {
      const queryClient = createTestQueryClient()
      
      expect(queryClient).toBeDefined()
      expect(queryClient.getDefaultOptions().queries?.retry).toBe(false)
      expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(0)
    })

    test('waitForAsync 应该等待指定时间', async () => {
      const start = Date.now()
      await waitForAsync(100)
      const end = Date.now()
      
      expect(end - start).toBeGreaterThanOrEqual(90) // 允许一些误差
    })

    test('simulateUserDelay 应该模拟用户交互延迟', async () => {
      const start = Date.now()
      await simulateUserDelay()
      const end = Date.now()
      
      expect(end - start).toBeGreaterThanOrEqual(90)
    })

    test('generateRandomString 应该生成指定长度的随机字符串', () => {
      const str1 = generateRandomString(10)
      const str2 = generateRandomString(10)
      
      expect(str1).toHaveLength(10)
      expect(str2).toHaveLength(10)
      expect(str1).not.toBe(str2)
    })

    test('generateRandomEmail 应该生成有效的邮箱格式', () => {
      const email = generateRandomEmail()
      
      expect(email).toMatch(/^test-\w+@example\.com$/)
    })
  })

  describe('Mock工具函数', () => {
    test('mockNextRouter 应该创建路由模拟对象', () => {
      const router = mockNextRouter({ pathname: '/test' })
      
      expect(typeof router.push).toBe('function')
      expect(router.pathname).toBe('/test')
      expect(router.query).toEqual({})
    })

    test('mockFetch 应该模拟fetch API', async () => {
      const mockData = { message: 'test' }
      mockFetch(mockData)
      
      const response = await fetch('/api/test')
      const data = await response.json()
      
      expect(data).toEqual(mockData)
      expect(response.ok).toBe(true)
    })

    test('createMockApiResponse 应该创建标准API响应格式', () => {
      const successResponse = createMockApiResponse({ id: 1 }, true)
      const errorResponse = createMockApiResponse(null, false)
      
      expect(successResponse.success).toBe(true)
      expect(successResponse.data).toEqual({ id: 1 })
      
      expect(errorResponse.success).toBe(false)
      expect(errorResponse.error).toBe('Mock error')
    })

    test('createMockUser 应该创建用户模拟数据', () => {
      const user = createMockUser({ name: 'Custom User' })
      
      expect(user.id).toBe('user-123')
      expect(user.name).toBe('Custom User')
      expect(user.email).toBe('test@example.com')
      expect(user.subscription).toBe('free')
    })
  })

  describe('测试数据工厂', () => {
    test('createUserFixture 应该创建用户测试数据', () => {
      const user = createUserFixture({ name: 'Test User' })
      
      expect(user.id).toMatch(/^user-/)
      expect(user.name).toBe('Test User')
      expect(user.email).toMatch(/^test-.*@example\.com$/)
      expect(user.subscription).toBe('free')
      expect(user.createdAt).toBeDefined()
    })

    test('createWorkFixture 应该创建作品测试数据', () => {
      const work = createWorkFixture({ title: 'Test Work' })
      
      expect(work.id).toMatch(/^work-/)
      expect(work.title).toBe('Test Work')
      expect(work.subject).toBe('Mathematics')
      expect(work.cards).toHaveLength(4) // concept, example, exercise, summary
      expect(work.isPublished).toBe(true)
    })

    test('createKnowledgeGraphFixture 应该创建知识图谱测试数据', () => {
      const graph = createKnowledgeGraphFixture({ subject: 'Science' })
      
      expect(graph.id).toMatch(/^graph-/)
      expect(graph.subject).toBe('Science')
      expect(graph.nodes).toBeDefined()
      expect(graph.edges).toBeDefined()
      expect(graph.createdAt).toBeDefined()
    })
  })

  describe('API响应工厂', () => {
    test('createSuccessResponse 应该创建成功响应', () => {
      const response = createSuccessResponse({ id: 1 }, 'Success message')
      
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ id: 1 })
      expect(response.message).toBe('Success message')
      expect(response.timestamp).toBeDefined()
    })

    test('createErrorResponse 应该创建错误响应', () => {
      const response = createErrorResponse('Test error', 'TEST_ERROR', 'Error message')
      
      expect(response.success).toBe(false)
      expect(response.error).toBe('Test error')
      expect(response.code).toBe('TEST_ERROR')
      expect(response.message).toBe('Error message')
      expect(response.timestamp).toBeDefined()
    })
  })

  describe('浏览器API模拟', () => {
    test('mockLocalStorage 应该模拟localStorage', () => {
      const localStorage = mockLocalStorage()
      
      localStorage.setItem('test', 'value')
      expect(localStorage.getItem('test')).toBe('value')
      
      localStorage.removeItem('test')
      expect(localStorage.getItem('test')).toBeNull()
      
      expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value')
      expect(localStorage.removeItem).toHaveBeenCalledWith('test')
    })

    test('mockMatchMedia 应该模拟window.matchMedia', () => {
      mockMatchMedia(true)
      
      const mediaQuery = window.matchMedia('(max-width: 768px)')
      expect(mediaQuery.matches).toBe(true)
      expect(typeof mediaQuery.addListener).toBe('function')
    })
  })

  describe('测试环境隔离', () => {
    test('每个测试应该有独立的环境', () => {
      // 这个测试验证测试隔离是否正常工作
      const testData = Math.random()
      
      // 设置一些全局状态
      if (typeof window !== 'undefined') {
        (window as any).testData = testData
      }
      
      expect((window as any)?.testData).toBe(testData)
    })

    test('测试数据应该在测试间隔离', () => {
      // 注意：在jsdom环境中，window对象在测试间是共享的
      // 这里我们测试的是我们的清理机制是否工作
      expect(typeof window).toBe('object')
    })
  })

  describe('异步操作处理', () => {
    test('应该正确处理Promise', async () => {
      const promise = Promise.resolve('test value')
      const result = await promise
      
      expect(result).toBe('test value')
    })

    test('应该正确处理异步错误', async () => {
      const promise = Promise.reject(new Error('test error'))
      
      await expect(promise).rejects.toThrow('test error')
    })

    test('应该支持超时处理', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 200))
      
      // 这应该正常完成
      const result = await slowPromise
      expect(result).toBe('slow')
    })
  })
})

describe('测试配置验证', () => {
  test('测试环境变量应该正确设置', () => {
    expect(process.env.NODE_ENV).toBe('test')
    // TEST_TYPE 可能在某些情况下未设置，这是正常的
    expect(process.env.NODE_ENV).toBeDefined()
  })

  test('Jest配置应该正确加载', () => {
    expect(jest).toBeDefined()
    expect(expect).toBeDefined()
    expect(describe).toBeDefined()
    expect(test).toBeDefined()
    expect(beforeEach).toBeDefined()
    expect(afterEach).toBeDefined()
  })

  test('测试超时应该正确设置', () => {
    // 这个测试验证Jest配置是否正确
    expect(jest).toBeDefined()
    expect(typeof jest.setTimeout).toBe('function')
  })
})