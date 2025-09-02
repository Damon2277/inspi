/**
 * Mock工具库 - 用于创建各种模拟对象和函数
 */

// 模拟Next.js路由
export const mockNextRouter = (overrides: any = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: true,
  isReady: true,
  isPreview: false,
  ...overrides,
})

// 模拟fetch API
export const mockFetch = (response: any, options: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = 200 } = options
  
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
  })
}

// 模拟API响应
export const createMockApiResponse = <T>(data: T, success: boolean = true) => ({
  success,
  data: success ? data : null,
  error: success ? null : 'Mock error',
  message: success ? 'Success' : 'Error occurred',
})

// 模拟用户数据
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  subscription: 'free',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// 模拟作品数据
export const createMockWork = (overrides: any = {}) => ({
  id: 'work-123',
  title: 'Test Work',
  description: 'Test description',
  subject: 'Mathematics',
  grade: 'Grade 5',
  knowledgePoint: 'Addition',
  cards: [],
  authorId: 'user-123',
  author: createMockUser(),
  isPublished: true,
  views: 0,
  likes: 0,
  reposts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// 模拟知识图谱数据
export const createMockKnowledgeGraph = (overrides: any = {}) => ({
  id: 'graph-123',
  userId: 'user-123',
  subject: 'Mathematics',
  nodes: [
    { id: 'node-1', label: 'Addition', x: 100, y: 100, works: [] },
    { id: 'node-2', label: 'Subtraction', x: 200, y: 100, works: [] },
  ],
  edges: [
    { source: 'node-1', target: 'node-2', type: 'prerequisite' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// 模拟贡献度数据
export const createMockContribution = (overrides: any = {}) => ({
  userId: 'user-123',
  totalScore: 100,
  creationScore: 60,
  reuseScore: 40,
  rank: 1,
  weeklyScore: 20,
  monthlyScore: 80,
  ...overrides,
})

// 模拟订阅数据
export const createMockSubscription = (overrides: any = {}) => ({
  userId: 'user-123',
  plan: 'free',
  status: 'active',
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  usage: {
    aiGenerations: 5,
    maxAiGenerations: 10,
    worksCreated: 3,
    maxWorksCreated: 5,
  },
  ...overrides,
})

// 模拟AI生成的卡片
export const createMockCard = (type: string, overrides: any = {}) => ({
  id: `card-${type}-123`,
  type,
  title: `Test ${type} Card`,
  content: `Test content for ${type} card`,
  order: 0,
  ...overrides,
})

// 模拟错误对象
export const createMockError = (message: string = 'Test error', code?: string) => {
  const error = new Error(message)
  if (code) {
    (error as any).code = code
  }
  return error
}

// 模拟Promise
export const createMockPromise = <T>(value: T, shouldReject: boolean = false) => {
  return shouldReject 
    ? Promise.reject(createMockError('Mock promise rejected'))
    : Promise.resolve(value)
}

// 模拟异步函数
export const createMockAsyncFunction = <T>(
  returnValue: T, 
  delay: number = 100,
  shouldReject: boolean = false
) => {
  return jest.fn().mockImplementation(() => 
    new Promise((resolve, reject) => 
      setTimeout(() => {
        if (shouldReject) {
          reject(createMockError('Mock async function failed'))
        } else {
          resolve(returnValue)
        }
      }, delay)
    )
  )
}

// 模拟文件对象
export const createMockFile = (
  name: string = 'test.txt',
  content: string = 'test content',
  type: string = 'text/plain'
) => {
  const file = new File([content], name, { type })
  return file
}

// 模拟FormData
export const createMockFormData = (data: Record<string, any> = {}) => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

// 模拟环境变量
export const mockEnvVars = (vars: Record<string, string>) => {
  const originalEnv = process.env
  process.env = { ...originalEnv, ...vars }
  
  return () => {
    process.env = originalEnv
  }
}

// 模拟日期
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date)
  const originalDate = Date
  
  global.Date = jest.fn(() => mockDate) as any
  global.Date.now = jest.fn(() => mockDate.getTime())
  global.Date.UTC = originalDate.UTC
  global.Date.parse = originalDate.parse
  
  return () => {
    global.Date = originalDate
  }
}

// 模拟控制台方法
export const mockConsole = () => {
  const originalConsole = console
  const mockMethods = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
  
  Object.assign(console, mockMethods)
  
  return {
    ...mockMethods,
    restore: () => {
      Object.assign(console, originalConsole)
    }
  }
}

// 清理所有模拟
export const cleanupAllMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
  
  // 清理全局模拟
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.Mock).mockRestore()
  }
}