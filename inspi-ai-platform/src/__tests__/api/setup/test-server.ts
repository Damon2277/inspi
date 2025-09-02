/**
 * API测试服务器设置
 * 用于模拟Next.js API路由的测试环境
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMocks } from 'node-mocks-http'

// Mock Next.js环境
export const mockNextRequest = (options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
  searchParams?: Record<string, string>
}) => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body,
    searchParams = {}
  } = options

  // 构建完整URL
  const fullUrl = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value)
  })

  // 创建mock request
  const mockReq = {
    method,
    url: fullUrl.toString(),
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
    formData: async () => new FormData(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    clone: () => mockReq,
    body: body ? JSON.stringify(body) : null,
    bodyUsed: false,
    cache: 'default' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    destination: '' as RequestDestination,
    integrity: '',
    keepalive: false,
    mode: 'cors' as RequestMode,
    redirect: 'follow' as RequestRedirect,
    referrer: '',
    referrerPolicy: '' as ReferrerPolicy,
    signal: new AbortController().signal,
  }

  return mockReq as unknown as NextRequest
}

// 执行API路由处理器
export const executeApiRoute = async (
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: Parameters<typeof mockNextRequest>[0]
) => {
  const request = mockNextRequest(options)
  const response = await handler(request)
  
  // 解析响应
  const responseData = {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: null as any,
  }

  try {
    // NextResponse的处理方式
    if (response instanceof NextResponse) {
      const responseClone = response.clone()
      const text = await responseClone.text()
      responseData.body = text ? JSON.parse(text) : null
    } else {
      responseData.body = response
    }
  } catch (error) {
    responseData.body = null
  }

  return responseData
}

// API测试工具类
export class ApiTestClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl = 'http://localhost:3000', defaultHeaders = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = defaultHeaders
  }

  // 设置认证token
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  // 清除认证token
  clearAuthToken() {
    delete this.defaultHeaders['Authorization']
  }

  // GET请求
  async get(path: string, searchParams?: Record<string, string>, headers?: Record<string, string>) {
    return this.request('GET', path, undefined, searchParams, headers)
  }

  // POST请求
  async post(path: string, body?: any, headers?: Record<string, string>) {
    return this.request('POST', path, body, undefined, headers)
  }

  // PUT请求
  async put(path: string, body?: any, headers?: Record<string, string>) {
    return this.request('PUT', path, body, undefined, headers)
  }

  // DELETE请求
  async delete(path: string, headers?: Record<string, string>) {
    return this.request('DELETE', path, undefined, undefined, headers)
  }

  // PATCH请求
  async patch(path: string, body?: any, headers?: Record<string, string>) {
    return this.request('PATCH', path, body, undefined, headers)
  }

  // 通用请求方法
  private async request(
    method: string,
    path: string,
    body?: any,
    searchParams?: Record<string, string>,
    headers?: Record<string, string>
  ) {
    const url = `${this.baseUrl}${path}`
    const requestHeaders = { ...this.defaultHeaders, ...headers }

    // 如果有body，设置Content-Type
    if (body && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json'
    }

    return mockNextRequest({
      method,
      url,
      headers: requestHeaders,
      body,
      searchParams,
    })
  }
}

// 创建测试客户端实例
export const createApiTestClient = (baseUrl?: string, defaultHeaders?: Record<string, string>) => {
  return new ApiTestClient(baseUrl, defaultHeaders)
}

// API响应断言工具
export const expectApiResponse = (response: any) => {
  return {
    toHaveStatus: (expectedStatus: number) => {
      expect(response.status).toBe(expectedStatus)
      return expectApiResponse(response)
    },
    
    toHaveSuccessStatus: () => {
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      return expectApiResponse(response)
    },
    
    toHaveErrorStatus: () => {
      expect(response.status).toBeGreaterThanOrEqual(400)
      return expectApiResponse(response)
    },
    
    toHaveBody: (expectedBody: any) => {
      expect(response.body).toEqual(expectedBody)
      return expectApiResponse(response)
    },
    
    toHaveBodyContaining: (expectedFields: Record<string, any>) => {
      Object.entries(expectedFields).forEach(([key, value]) => {
        expect(response.body).toHaveProperty(key, value)
      })
      return expectApiResponse(response)
    },
    
    toHaveHeader: (headerName: string, expectedValue?: string) => {
      expect(response.headers).toHaveProperty(headerName.toLowerCase())
      if (expectedValue) {
        expect(response.headers[headerName.toLowerCase()]).toBe(expectedValue)
      }
      return expectApiResponse(response)
    },
    
    toBeSuccessResponse: () => {
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      expect(response.body).toHaveProperty('success', true)
      return expectApiResponse(response)
    },
    
    toBeErrorResponse: (expectedMessage?: string) => {
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.body).toHaveProperty('error')
      if (expectedMessage) {
        expect(response.body.error).toContain(expectedMessage)
      }
      return expectApiResponse(response)
    },
    
    toHaveValidationError: (field?: string) => {
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      if (field) {
        expect(response.body.error).toContain(field)
      }
      return expectApiResponse(response)
    },
    
    toRequireAuthentication: () => {
      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
      return expectApiResponse(response)
    },
    
    toBeForbidden: () => {
      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error')
      return expectApiResponse(response)
    },
    
    toBeNotFound: () => {
      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error')
      return expectApiResponse(response)
    },
  }
}

// 数据库清理工具
export const cleanupDatabase = async () => {
  // 这里可以添加数据库清理逻辑
  // 例如清理测试数据、重置序列等
  console.log('Cleaning up test database...')
}

// 测试数据种子
export const seedTestData = async () => {
  // 这里可以添加测试数据种子逻辑
  // 例如创建测试用户、测试作品等
  console.log('Seeding test data...')
}

// API测试环境设置
export const setupApiTestEnvironment = async () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/inspi-ai-test'
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
  
  // 清理并种子数据库
  await cleanupDatabase()
  await seedTestData()
}

// API测试环境清理
export const teardownApiTestEnvironment = async () => {
  await cleanupDatabase()
}