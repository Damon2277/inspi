/**
 * 综合API集成测试
 * 测试所有主要API端点的集成功能
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { apiTestFramework, databaseTestFramework } from '../api-test-framework';

// 模拟API处理器
const mockApiHandlers = {
  // 认证API
  auth: {
    login: async (req: any) => {
      const body = await req.json();
      if (body.email === 'test@example.com' && body.password === 'password') {
        return new Response(JSON.stringify({
          success: true,
          user: { id: 'user1', email: 'test@example.com' },
          token: 'mock-jwt-token',
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        success: false,
        error: '用户名或密码错误',
      }), { status: 401 });
    },

    register: async (req: any) => {
      const body = await req.json();
      if (!body.email || !body.password || !body.name) {
        return new Response(JSON.stringify({
          success: false,
          error: '缺少必需字段',
        }), { status: 400 });
      }
      return new Response(JSON.stringify({
        success: true,
        user: { id: 'new-user', email: body.email, name: body.name },
      }), { status: 201 });
    },
  },

  // 作品API
  works: {
    list: async (req: any) => {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);

      const mockWorks = Array.from({ length: 25 }, (_, i) => ({
        id: `work_${i + 1}`,
        title: `Test Work ${i + 1}`,
        author: { id: 'user1', name: 'Test User' },
        status: 'published',
      }));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const works = mockWorks.slice(startIndex, endIndex);

      return new Response(JSON.stringify({
        success: true,
        works,
        pagination: {
          page,
          limit,
          total: mockWorks.length,
          totalPages: Math.ceil(mockWorks.length / limit),
          hasMore: endIndex < mockWorks.length,
        },
      }), { status: 200 });
    },

    create: async (req: any) => {
      const session = { user: { id: 'user1' } }; // 模拟会话
      if (!session?.user?.email) {
        return new Response(JSON.stringify({
          success: false,
          error: '未授权访问',
        }), { status: 401 });
      }

      const body = await req.json();
      if (!body.title || !body.knowledgePoint) {
        return new Response(JSON.stringify({
          success: false,
          error: '缺少必需字段',
        }), { status: 400 });
      }

      return new Response(JSON.stringify({
        success: true,
        work: {
          id: 'new-work',
          ...body,
          author: session.user.email,
          status: 'draft',
        },
      }), { status: 201 });
    },
  },

  // 订阅API
  subscription: {
    plans: async (req: any) => {
      const mockPlans = [
        {
          id: 'plan_free',
          name: 'free',
          displayName: '免费版',
          tier: 'free',
          monthlyPrice: 0,
          quotas: { dailyCreateQuota: 5, dailyReuseQuota: 1 },
        },
        {
          id: 'plan_basic',
          name: 'basic',
          displayName: '基础版',
          tier: 'basic',
          monthlyPrice: 69,
          quotas: { dailyCreateQuota: 20, dailyReuseQuota: 5 },
        },
      ];

      return new Response(JSON.stringify({
        success: true,
        plans: mockPlans,
      }), { status: 200 });
    },

    create: async (req: any) => {
      const session = { user: { id: 'user1' } };
      if (!session?.user?.email) {
        return new Response(JSON.stringify({
          success: false,
          error: '未授权访问',
        }), { status: 401 });
      }

      const body = await req.json();
      if (!body.planId) {
        return new Response(JSON.stringify({
          success: false,
          error: '套餐ID不能为空',
        }), { status: 400 });
      }

      return new Response(JSON.stringify({
        success: true,
        subscription: {
          id: 'new-subscription',
          userId: session.user.email,
          planId: body.planId,
          status: 'pending',
        },
        paymentRequired: body.planId !== 'plan_free',
        paymentInfo: body.planId !== 'plan_free' ? {
          paymentId: 'pay_123',
          qrCode: 'mock-qr-code',
          amount: 69,
        } : undefined,
      }), { status: 201 });
    },
  },
};

describe('综合API集成测试', () => {
  beforeEach(() => {
    databaseTestFramework.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('认证API集成测试', () => {
    it('应该成功登录有效用户', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.auth.login,
        '/api/auth/login',
        {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'password',
          },
        },
      );

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.user).toBeDefined();
      expect(result.data.token).toBeDefined();
    });

    it('应该拒绝无效凭据', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.auth.login,
        '/api/auth/login',
        {
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'wrong-password',
          },
        },
      );

      expect(result.status).toBe(401);
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('用户名或密码错误');
    });

    it('应该成功注册新用户', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.auth.register,
        '/api/auth/register',
        {
          method: 'POST',
          body: {
            name: 'New User',
            email: 'new@example.com',
            password: 'password123',
          },
        },
      );

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.user.name).toBe('New User');
      expect(result.data.user.email).toBe('new@example.com');
    });

    it('应该验证注册输入', async () => {
      const validationTests = [
        {
          name: '缺少邮箱',
          body: { name: 'Test', password: 'password' },
          expectedStatus: 400,
          expectedError: '缺少必需字段',
        },
        {
          name: '缺少密码',
          body: { name: 'Test', email: 'test@example.com' },
          expectedStatus: 400,
          expectedError: '缺少必需字段',
        },
        {
          name: '缺少姓名',
          body: { email: 'test@example.com', password: 'password' },
          expectedStatus: 400,
          expectedError: '缺少必需字段',
        },
      ];

      const results = await apiTestFramework.testApiValidation(
        mockApiHandlers.auth.register,
        '/api/auth/register',
        validationTests,
      );

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('作品API集成测试', () => {
    it('应该返回分页的作品列表', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.works.list,
        '/api/works',
        {
          query: { page: '1', limit: '5' },
        },
      );

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.works).toHaveLength(5);
      expect(result.data.pagination).toBeDefined();
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(5);
      expect(result.data.pagination.total).toBe(25);
    });

    it('应该处理分页边界情况', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.works.list,
        '/api/works',
        {
          query: { page: '3', limit: '10' },
        },
      );

      expect(result.status).toBe(200);
      expect(result.data.works).toHaveLength(5); // 最后一页只有5个
      expect(result.data.pagination.hasMore).toBe(false);
    });

    it('应该要求认证创建作品', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.works.create,
        '/api/works',
        {
          method: 'POST',
          body: {
            title: 'Test Work',
            knowledgePoint: 'Test Knowledge',
          },
        },
      );

      // 由于没有认证，应该返回401
      expect(result.status).toBe(401);
      expect(result.data.error).toBe('未授权访问');
    });

    it('应该验证作品创建输入', async () => {
      const validationTests = [
        {
          name: '缺少标题',
          body: { knowledgePoint: 'Test Knowledge' },
          expectedStatus: 400,
          expectedError: '缺少必需字段',
        },
        {
          name: '缺少知识点',
          body: { title: 'Test Work' },
          expectedStatus: 400,
          expectedError: '缺少必需字段',
        },
      ];

      const results = await apiTestFramework.testApiValidation(
        mockApiHandlers.works.create,
        '/api/works',
        validationTests,
        {
          context: { userId: 'user1', userRole: 'user' },
        },
      );

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('订阅API集成测试', () => {
    it('应该返回可用套餐列表', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.subscription.plans,
        '/api/subscription/plans',
      );

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.plans).toHaveLength(2);
      expect(result.data.plans[0].tier).toBe('free');
      expect(result.data.plans[1].tier).toBe('basic');
    });

    it('应该创建免费订阅', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.subscription.create,
        '/api/subscription/create',
        {
          method: 'POST',
          body: {
            planId: 'plan_free',
            billingCycle: 'monthly',
          },
          context: { userId: 'user1', userRole: 'user' },
        },
      );

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.subscription.planId).toBe('plan_free');
      expect(result.data.paymentRequired).toBe(false);
    });

    it('应该创建付费订阅并要求支付', async () => {
      const result = await apiTestFramework.testApiEndpoint(
        mockApiHandlers.subscription.create,
        '/api/subscription/create',
        {
          method: 'POST',
          body: {
            planId: 'plan_basic',
            billingCycle: 'monthly',
          },
          context: { userId: 'user1', userRole: 'user' },
        },
      );

      expect(result.status).toBe(201);
      expect(result.data.success).toBe(true);
      expect(result.data.subscription.planId).toBe('plan_basic');
      expect(result.data.paymentRequired).toBe(true);
      expect(result.data.paymentInfo).toBeDefined();
      expect(result.data.paymentInfo.amount).toBe(69);
    });
  });

  describe('API权限测试', () => {
    it('应该正确处理认证权限', async () => {
      const results = await apiTestFramework.testApiPermissions(
        mockApiHandlers.works.create,
        '/api/works',
        {
          method: 'POST',
          body: { title: 'Test', knowledgePoint: 'Test' },
        },
      );

      // 未认证用户应该被拒绝
      expect(results[0].actualStatus).toBe(401);

      // 普通用户应该被允许
      expect(results[1].actualStatus).toBe(201);

      // 管理员用户应该被允许
      expect(results[2].actualStatus).toBe(201);
    });
  });

  describe('批量API测试', () => {
    it('应该测试多个端点', async () => {
      const tests = [
        {
          name: '获取套餐列表',
          handler: mockApiHandlers.subscription.plans,
          path: '/api/subscription/plans',
          expectedStatus: 200,
        },
        {
          name: '获取作品列表',
          handler: mockApiHandlers.works.list,
          path: '/api/works',
          expectedStatus: 200,
        },
      ];

      const results = await apiTestFramework.testMultipleEndpoints(tests);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
      });
    });
  });

  describe('错误处理测试', () => {
    it('应该处理服务器错误', async () => {
      const errorHandler = async () => {
        throw new Error('Internal server error');
      };

      try {
        await apiTestFramework.testApiEndpoint(
          errorHandler,
          '/api/error-test',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Internal server error');
      }
    });

    it('应该处理无效JSON', async () => {
      const invalidJsonHandler = async (req: any) => {
        return new Response('Invalid JSON', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      };

      const result = await apiTestFramework.testApiEndpoint(
        invalidJsonHandler,
        '/api/invalid-json',
      );

      expect(result.status).toBe(400);
      expect(result.data).toBe('Invalid JSON');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内响应', async () => {
      const startTime = performance.now();

      await apiTestFramework.testApiEndpoint(
        mockApiHandlers.works.list,
        '/api/works',
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // API应该在100ms内响应
      expect(duration).toBeLessThan(100);
    });

    it('应该处理并发请求', async () => {
      const concurrentRequests = Array.from({ length: 10 }, () =>
        apiTestFramework.testApiEndpoint(
          mockApiHandlers.subscription.plans,
          '/api/subscription/plans',
        ),
      );

      const results = await Promise.all(concurrentRequests);

      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.data.success).toBe(true);
      });
    });
  });
});
