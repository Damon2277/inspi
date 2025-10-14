/**
 * 简化的API测试
 * 直接测试API处理逻辑，不依赖复杂的Mock服务器
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock认证服务
const mockAuthService = {
  loginUser: jest.fn(),
};

// Mock限流中间件
const mockRateLimit = (limit: number, window: number) => (handler: any) => handler;

jest.mock('@/core/auth/service', () => mockAuthService);
jest.mock('@/core/auth/middleware', () => ({
  rateLimit: mockRateLimit,
}));

describe('简化API测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('认证API逻辑测试', () => {
    test('应该处理成功登录', async () => {
      // Mock成功的登录响应
      mockAuthService.loginUser.mockResolvedValue({
        success: true,
        user: { id: 'user123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123',
      });

      // 创建模拟请求
      const mockRequest = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest;

      // 动态导入并测试登录处理器
      const { POST: loginHandler } = await import('@/app/api/auth/login/route');
      const response = await loginHandler(mockRequest);

      // 验证响应
      expect(response).toBeInstanceOf(NextResponse);

      // 解析响应数据
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        message: 'Login successful',
        user: expect.objectContaining({
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        }),
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123',
      });

      // 验证服务调用
      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    test('应该处理登录失败', async () => {
      // Mock失败的登录响应
      mockAuthService.loginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const mockRequest = {
        json: async () => ({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      } as NextRequest;

      const { POST: loginHandler } = await import('@/app/api/auth/login/route');
      const response = await loginHandler(mockRequest);

      expect(response.status).toBe(401);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        error: 'Invalid credentials',
      });
    });

    test('应该处理服务异常', async () => {
      // Mock服务抛出异常
      mockAuthService.loginUser.mockRejectedValue(new Error('Database connection failed'));

      const mockRequest = {
        json: async () => ({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as NextRequest;

      const { POST: loginHandler } = await import('@/app/api/auth/login/route');
      const response = await loginHandler(mockRequest);

      expect(response.status).toBe(500);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        error: 'Internal server error',
      });
    });

    test('应该处理JSON解析错误', async () => {
      const mockRequest = {
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as NextRequest;

      const { POST: loginHandler } = await import('@/app/api/auth/login/route');
      const response = await loginHandler(mockRequest);

      expect(response.status).toBe(500);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        error: 'Internal server error',
      });
    });
  });

  describe('作品API逻辑测试', () => {
    // Mock作品服务
    const mockWorkService = {
      createWork: jest.fn(),
    };

    jest.mock('@/lib/services/workService', () => ({
      default: mockWorkService,
    }));

    jest.mock('@/lib/utils/errorHandler', () => ({
      handleAPIError: jest.fn((error) =>
        NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    }));

    test('应该成功创建作品', async () => {
      const workData = {
        title: '测试作品',
        knowledgePoint: '加法运算',
        subject: '数学',
        gradeLevel: '小学二年级',
        cards: [
          {
            type: 'concept',
            title: '概念卡片',
            content: '这是概念卡片内容',
            order: 0,
          },
        ],
        tags: ['数学', '加法'],
        status: 'draft',
      };

      const createdWork = {
        id: 'work-123',
        ...workData,
        authorId: 'temp-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWorkService.createWork.mockResolvedValue(createdWork);

      const mockRequest = {
        headers: {
          get: (name: string) => name === 'authorization' ? 'Bearer valid-token' : null,
        },
        json: async () => workData,
      } as NextRequest;

      const { POST: createWorkHandler } = await import('@/app/api/works/route');
      const response = await createWorkHandler(mockRequest);

      expect(response.status).toBe(200);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        success: true,
        data: expect.objectContaining({
          title: workData.title,
          knowledgePoint: workData.knowledgePoint,
        }),
        message: '作品保存成功',
      });
    });

    test('应该要求认证', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => null, // 没有认证头
        },
        json: async () => ({
          title: '测试作品',
          knowledgePoint: '加法运算',
          subject: '数学',
          gradeLevel: '小学二年级',
          cards: [{}],
        }),
      } as NextRequest;

      const { POST: createWorkHandler } = await import('@/app/api/works/route');
      const response = await createWorkHandler(mockRequest);

      expect(response.status).toBe(401);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        success: false,
        message: '请先登录',
      });
    });

    test('应该验证必填字段', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => name === 'authorization' ? 'Bearer valid-token' : null,
        },
        json: async () => ({
          title: '测试作品',
          // 缺少其他必填字段
        }),
      } as NextRequest;

      const { POST: createWorkHandler } = await import('@/app/api/works/route');
      const response = await createWorkHandler(mockRequest);

      expect(response.status).toBe(400);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        success: false,
        message: '缺少必填字段',
      });
    });
  });

  describe('健康检查API逻辑测试', () => {
    const mockHealthManager = {
      getSystemHealth: jest.fn(),
      runCheck: jest.fn(),
    };

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    jest.mock('@/lib/monitoring/health', () => ({
      healthManager: mockHealthManager,
    }));

    jest.mock('@/lib/logging/logger', () => ({
      logger: mockLogger,
    }));

    test('应该返回健康状态', async () => {
      const healthStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: 3600,
        checks: {
          database: { status: 'healthy', message: 'Database connection OK' },
        },
        summary: { total: 1, healthy: 1, unhealthy: 0, degraded: 0 },
      };

      mockHealthManager.getSystemHealth.mockResolvedValue(healthStatus);

      const mockRequest = {} as NextRequest;

      const { GET: getHealthHandler } = await import('@/app/api/health/route');
      const response = await getHealthHandler(mockRequest);

      expect(response.status).toBe(200);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual(healthStatus);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    test('应该处理健康检查失败', async () => {
      mockHealthManager.getSystemHealth.mockRejectedValue(new Error('Health check failed'));

      const mockRequest = {} as NextRequest;

      const { GET: getHealthHandler } = await import('@/app/api/health/route');
      const response = await getHealthHandler(mockRequest);

      expect(response.status).toBe(500);

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      expect(responseData).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(Number),
        message: 'Health check system failed',
        error: 'Health check failed',
      });

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
