/**
 * 测试工具函数
 * 提供通用的测试辅助功能
 */
import { jest } from '@jest/globals';
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement, ReactNode } from 'react';

// 测试数据工厂
export class TestDataFactory {
  /**
   * 创建模拟用户
   */
  static createUser(overrides: Partial<any> = {}) {
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test User',
      email: 'test@example.com',
      tier: 'free',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建模拟作品
   */
  static createWork(overrides: Partial<any> = {}) {
    return {
      id: `work_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Work',
      description: 'This is a test work',
      author: this.createUser(),
      knowledgePoint: 'Test Knowledge Point',
      subject: '数学',
      gradeLevel: '高中一年级',
      category: '概念解释',
      difficulty: 'intermediate',
      estimatedTime: 30,
      cards: [
        { title: 'Card 1', content: 'Content 1' },
        { title: 'Card 2', content: 'Content 2' },
      ],
      tags: ['test', 'math'],
      status: 'published',
      visibility: 'public',
      likes: [],
      likesCount: 0,
      views: 0,
      reuseCount: 0,
      commentsCount: 0,
      qualityScore: 75,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建模拟订阅
   */
  static createSubscription(overrides: Partial<any> = {}) {
    return {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'test-user-id',
      planId: 'plan_basic',
      planName: '基础版',
      tier: 'basic',
      status: 'active',
      monthlyPrice: 69,
      currency: 'CNY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      quotas: {
        dailyCreateQuota: 20,
        dailyReuseQuota: 5,
        maxExportsPerDay: 50,
        maxGraphNodes: -1,
      },
      features: ['高清导出', '智能分析', '无限知识图谱'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建模拟支付记录
   */
  static createPaymentRecord(overrides: Partial<any> = {}) {
    return {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: 'test-subscription-id',
      userId: 'test-user-id',
      amount: 69,
      currency: 'CNY',
      paymentMethod: 'wechat_pay',
      paymentId: 'wx_pay_123456',
      status: 'completed',
      transactionId: 'tx_123456789',
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paidAt: new Date(),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * 创建模拟评论
   */
  static createComment(overrides: Partial<any> = {}) {
    return {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      work: 'test-work-id',
      author: this.createUser(),
      content: 'This is a test comment',
      parentComment: null,
      likes: [],
      likesCount: 0,
      repliesCount: 0,
      status: 'active',
      moderationStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}

// Mock工厂
export class MockFactory {
  /**
   * 创建模拟的API响应
   */
  static createApiResponse(data: any, success = true) {
    return {
      success,
      data: success ? data : undefined,
      error: success ? undefined : data,
      message: success ? 'Success' : 'Error',
    };
  }

  /**
   * 创建模拟的分页响应
   */
  static createPaginatedResponse(items: any[], page = 1, limit = 10, total?: number) {
    const actualTotal = total ?? items.length;
    const totalPages = Math.ceil(actualTotal / limit);
    const hasMore = page < totalPages;

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total: actualTotal,
        totalPages,
        hasMore,
      },
    };
  }

  /**
   * 创建模拟的错误响应
   */
  static createErrorResponse(message: string, code?: string) {
    return {
      success: false,
      error: message,
      code,
    };
  }

  /**
   * 创建模拟的Next.js请求对象
   */
  static createMockRequest(options: {
    method?: string
    url?: string
    body?: any
    headers?: Record<string, string>
    query?: Record<string, string>
  } = {}) {
    const {
      method = 'GET',
      url = 'http://localhost:3000/api/test',
      body = null,
      headers = {},
      query = {},
    } = options;

    return {
      method,
      url,
      headers: new Headers(headers),
      body,
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      formData: jest.fn().mockResolvedValue(new FormData()),
      nextUrl: {
        searchParams: new URLSearchParams(query),
      },
    };
  }

  /**
   * 创建模拟的数据库连接
   */
  static createMockDatabase() {
    return {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
        }),
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        countDocuments: jest.fn().mockResolvedValue(0),
      }),
    };
  }
}

// 测试断言辅助函数
export class TestAssertions {
  /**
   * 断言API响应格式
   */
  static assertApiResponse(response: any, expectedSuccess = true) {
    expect(response).toHaveProperty('success');
    expect(response.success).toBe(expectedSuccess);

    if (expectedSuccess) {
      expect(response).toHaveProperty('data');
    } else {
      expect(response).toHaveProperty('error');
    }
  }

  /**
   * 断言分页响应格式
   */
  static assertPaginatedResponse(response: any) {
    this.assertApiResponse(response, true);
    expect(response).toHaveProperty('pagination');
    expect(response.pagination).toHaveProperty('page');
    expect(response.pagination).toHaveProperty('limit');
    expect(response.pagination).toHaveProperty('total');
    expect(response.pagination).toHaveProperty('totalPages');
    expect(response.pagination).toHaveProperty('hasMore');
  }

  /**
   * 断言用户对象格式
   */
  static assertUserObject(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('tier');
    expect(user).toHaveProperty('createdAt');
  }

  /**
   * 断言作品对象格式
   */
  static assertWorkObject(work: any) {
    expect(work).toHaveProperty('id');
    expect(work).toHaveProperty('title');
    expect(work).toHaveProperty('author');
    expect(work).toHaveProperty('knowledgePoint');
    expect(work).toHaveProperty('subject');
    expect(work).toHaveProperty('status');
    expect(work).toHaveProperty('createdAt');
  }

  /**
   * 断言订阅对象格式
   */
  static assertSubscriptionObject(subscription: any) {
    expect(subscription).toHaveProperty('id');
    expect(subscription).toHaveProperty('userId');
    expect(subscription).toHaveProperty('planId');
    expect(subscription).toHaveProperty('tier');
    expect(subscription).toHaveProperty('status');
    expect(subscription).toHaveProperty('quotas');
    expect(subscription).toHaveProperty('createdAt');
  }
}

// 异步测试辅助函数
export class AsyncTestUtils {
  /**
   * 等待条件满足
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (error) {
        // 继续等待
      }

      await this.delay(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待下一个事件循环
   */
  static async nextTick(): Promise<void> {
    return new Promise(resolve => process.nextTick(resolve));
  }

  /**
   * 模拟异步操作
   */
  static async simulateAsyncOperation<T>(
    result: T,
    delay = 100,
    shouldFail = false,
  ): Promise<T> {
    await this.delay(delay);

    if (shouldFail) {
      throw new Error('Simulated async operation failed');
    }

    return result;
  }
}

// 性能测试辅助函数
export class PerformanceTestUtils {
  /**
   * 测量函数执行时间
   */
  static async measureExecutionTime<T>(
    fn: () => T | Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    return { result, duration };
  }

  /**
   * 测试内存使用
   */
  static measureMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * 批量性能测试
   */
  static async benchmarkFunction<T>(
    fn: () => T | Promise<T>,
    iterations = 100,
  ): Promise<{
    averageDuration: number
    minDuration: number
    maxDuration: number
    totalDuration: number
  }> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureExecutionTime(fn);
      durations.push(duration);
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      averageDuration,
      minDuration,
      maxDuration,
      totalDuration,
    };
  }
}

// 自定义渲染函数
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any
  wrapper?: ({ children }: { children: ReactNode }) => ReactElement
}

export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {},
) {
  const { initialState, wrapper, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    if (wrapper) {
      return wrapper({ children });
    }
    return React.createElement(React.Fragment, null, children);
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// 重新导出testing-library的所有功能
export * from '@testing-library/react';
export { customRender as render };
