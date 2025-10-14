/**
 * API集成测试框架
 * 提供API测试的通用功能和工具
 */
import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

export interface ApiTestContext {
  userId?: string
  userRole?: string
  sessionData?: any
  headers?: Record<string, string>
}

export interface ApiTestOptions {
  method?: string
  body?: any
  headers?: Record<string, string>
  query?: Record<string, string>
  context?: ApiTestContext
}

/**
 * API测试框架类
 */
export class ApiTestFramework {
  private baseUrl = 'http://localhost:3000';

  /**
   * 创建模拟请求
   */
  createMockRequest(path: string, options: ApiTestOptions = {}): NextRequest {
    const {
      method = 'GET',
      body = null,
      headers = {},
      query = {},
    } = options;

    const url = new URL(path, this.baseUrl);

    // 添加查询参数
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return new NextRequest(url.toString(), requestInit);
  }

  /**
   * 模拟认证会话
   */
  mockAuthSession(context: ApiTestContext) {
    const mockSession = {
      user: {
        id: context.userId || 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: context.userRole || 'user',
        tier: 'free',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...context.sessionData,
    };

    // Mock getServerSession
    const { getServerSession } = require('next-auth');
    if (getServerSession && typeof getServerSession.mockResolvedValue === 'function') {
      getServerSession.mockResolvedValue(mockSession);
    }

    return mockSession;
  }

  /**
   * 测试API端点
   */
  async testApiEndpoint(
    handler: (req: NextRequest) => Promise<NextResponse>,
    path: string,
    options: ApiTestOptions = {},
  ) {
    // 设置认证上下文
    if (options.context) {
      this.mockAuthSession(options.context);
    }

    // 创建请求
    const request = this.createMockRequest(path, options);

    // 执行处理器
    const response = await handler(request);

    // 解析响应
    const responseData = await this.parseResponse(response);

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      response,
    };
  }

  /**
   * 解析响应数据
   */
  private async parseResponse(response: NextResponse) {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    if (contentType?.includes('text/')) {
      return await response.text();
    }

    return null;
  }

  /**
   * 批量测试API端点
   */
  async testMultipleEndpoints(
    tests: Array<{
      name: string
      handler: (req: NextRequest) => Promise<NextResponse>
      path: string
      options?: ApiTestOptions
      expectedStatus?: number
    }>,
  ) {
    const results = [];

    for (const test of tests) {
      try {
        const result = await this.testApiEndpoint(
          test.handler,
          test.path,
          test.options,
        );

        const success = test.expectedStatus
          ? result.status === test.expectedStatus
          : result.status >= 200 && result.status < 300;

        results.push({
          name: test.name,
          success,
          status: result.status,
          data: result.data,
          error: success ? null : `Expected status ${test.expectedStatus}, got ${result.status}`,
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          status: 500,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 测试API权限
   */
  async testApiPermissions(
    handler: (req: NextRequest) => Promise<NextResponse>,
    path: string,
    options: ApiTestOptions = {},
  ) {
    const tests = [
      {
        name: '未认证用户',
        context: undefined,
        expectedStatus: 401,
      },
      {
        name: '普通用户',
        context: { userId: 'user1', userRole: 'user' },
        expectedStatus: options.context?.userRole === 'admin' ? 403 : 200,
      },
      {
        name: '管理员用户',
        context: { userId: 'admin1', userRole: 'admin' },
        expectedStatus: 200,
      },
    ];

    const results = [];

    for (const test of tests) {
      const testOptions = {
        ...options,
        context: test.context,
      };

      const result = await this.testApiEndpoint(handler, path, testOptions);

      results.push({
        name: test.name,
        expectedStatus: test.expectedStatus,
        actualStatus: result.status,
        success: result.status === test.expectedStatus,
        data: result.data,
      });
    }

    return results;
  }

  /**
   * 测试API输入验证
   */
  async testApiValidation(
    handler: (req: NextRequest) => Promise<NextResponse>,
    path: string,
    validationTests: Array<{
      name: string
      body: any
      expectedStatus: number
      expectedError?: string
    }>,
    baseOptions: ApiTestOptions = {},
  ) {
    const results = [];

    for (const test of validationTests) {
      const options = {
        ...baseOptions,
        method: 'POST',
        body: test.body,
      };

      const result = await this.testApiEndpoint(handler, path, options);

      const success = result.status === test.expectedStatus;
      const hasExpectedError = test.expectedError
        ? result.data?.error?.includes(test.expectedError)
        : true;

      results.push({
        name: test.name,
        success: success && hasExpectedError,
        expectedStatus: test.expectedStatus,
        actualStatus: result.status,
        expectedError: test.expectedError,
        actualError: result.data?.error,
        data: result.data,
      });
    }

    return results;
  }
}

/**
 * 数据库集成测试框架
 */
export class DatabaseTestFramework {
  private mockDb: any;

  constructor() {
    this.mockDb = this.createMockDatabase();
  }

  /**
   * 创建模拟数据库
   */
  private createMockDatabase() {
    const collections = new Map();

    return {
      collection: (name: string) => {
        if (!collections.has(name)) {
          collections.set(name, new Map());
        }

        const data = collections.get(name);

        return {
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(Array.from(data.values())),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
          }),
          findOne: jest.fn().mockImplementation((query) => {
            const items = Array.from(data.values());
            return Promise.resolve((items.find as any)(item =>
              Object.entries(query).every(([key, value]) => item[key] === value),
            ) || null);
          }),
          insertOne: jest.fn().mockImplementation((doc) => {
            const id = doc._id || `${name}_${Date.now()}`;
            const newDoc = { ...doc, _id: id };
            data.set(id, newDoc);
            return Promise.resolve({ insertedId: id });
          }),
          updateOne: jest.fn().mockImplementation((query, update) => {
            const items = Array.from(data.entries());
            const [id, item] = (items.find as any)(([, item]) =>
              Object.entries(query).every(([key, value]) => item[key] === value),
            ) || [];

            if (item) {
              const updatedItem = { ...item, ...update.$set };
              data.set(id, updatedItem);
              return Promise.resolve({ modifiedCount: 1 });
            }

            return Promise.resolve({ modifiedCount: 0 });
          }),
          deleteOne: jest.fn().mockImplementation((query) => {
            const items = Array.from(data.entries());
            const [id] = (items.find as any)(([, item]) =>
              Object.entries(query).every(([key, value]) => item[key] === value),
            ) || [];

            if (id) {
              data.delete(id);
              return Promise.resolve({ deletedCount: 1 });
            }

            return Promise.resolve({ deletedCount: 0 });
          }),
          countDocuments: jest.fn().mockResolvedValue(data.size),
        };
      },
      connect: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true),
    };
  }

  /**
   * 获取模拟数据库
   */
  getMockDatabase() {
    return this.mockDb;
  }

  /**
   * 重置数据库状态
   */
  reset() {
    this.mockDb = this.createMockDatabase();
  }

  /**
   * 预填充测试数据
   */
  async seedData(collectionName: string, data: any[]) {
    const collection = this.mockDb.collection(collectionName);

    for (const item of data) {
      await collection.insertOne(item);
    }
  }
}

/**
 * 服务集成测试框架
 */
export class ServiceTestFramework {
  private mocks = new Map();

  /**
   * 模拟外部服务
   */
  mockExternalService(serviceName: string, methods: Record<string, any>) {
    const mockService = {};

    Object.entries(methods).forEach(([methodName, implementation]) => {
      mockService[methodName] = jest.fn().mockImplementation(implementation);
    });

    this.mocks.set(serviceName, mockService);
    return mockService;
  }

  /**
   * 获取模拟服务
   */
  getMockService(serviceName: string) {
    return this.mocks.get(serviceName);
  }

  /**
   * 重置所有模拟
   */
  resetMocks() {
    this.mocks.forEach(mockService => {
      Object.values(mockService).forEach(mockMethod => {
        if (typeof mockMethod === 'function' && mockMethod.mockReset) {
          mockMethod.mockReset();
        }
      });
    });
  }

  /**
   * 验证服务调用
   */
  verifyServiceCalls(serviceName: string, methodName: string, expectedCalls: any[]) {
    const mockService = this.getMockService(serviceName);
    const mockMethod = mockService?.[methodName];

    if (!mockMethod) {
      throw new Error(`Mock method ${serviceName}.${methodName} not found`);
    }

    expect(mockMethod).toHaveBeenCalledTimes(expectedCalls.length);

    expectedCalls.forEach((expectedCall, index) => {
      expect(mockMethod).toHaveBeenNthCalledWith(index + 1, ...expectedCall);
    });
  }
}

// 导出单例实例
export const apiTestFramework = new ApiTestFramework();
export const databaseTestFramework = new DatabaseTestFramework();
export const serviceTestFramework = new ServiceTestFramework();
