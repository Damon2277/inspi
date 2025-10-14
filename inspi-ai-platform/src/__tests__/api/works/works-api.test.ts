/**
 * 作品API测试
 * 测试作品的CRUD操作、搜索、筛选等功能
 */

import { GET as getWorksHandler, POST as createWorkHandler } from '@/app/api/works/route';

import { createWorkFixture, createUserFixture, createWorksResponse } from '../../fixtures';
import { mockDatabaseService, resetAllMocks } from '../mocks/api-mocks';
import { executeApiRoute, expectApiResponse } from '../setup/test-server';

// Mock作品服务
jest.mock('@/lib/services/workService', () => ({
  default: {
    createWork: jest.fn(),
    updateWork: jest.fn(),
    deleteWork: jest.fn(),
    getWorks: jest.fn(),
    getWorkById: jest.fn(),
    publishWork: jest.fn(),
  },
}));

// Mock认证中间件
jest.mock('@/core/auth/middleware', () => ({
  requireAuth: (handler: any) => handler,
}));

// Mock错误处理
jest.mock('@/lib/utils/errorHandler', () => ({
  handleAPIError: jest.fn((error) => ({
    status: 500,
    body: { error: 'Internal server error' },
  })),
}));

describe('作品API测试', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  describe('GET /api/works', () => {
    test('应该返回作品列表', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
          data: expect.objectContaining({
            works: expect.any(Array),
            pagination: expect.objectContaining({
              page: 1,
              limit: 12,
              total: expect.any(Number),
              totalPages: expect.any(Number),
            }),
            filters: expect.objectContaining({
              subjects: expect.any(Array),
              gradeLevels: expect.any(Array),
              availableTags: expect.any(Array),
            }),
          }),
        });
    });

    test('应该支持分页参数', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          page: '2',
          limit: '6',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              page: 2,
              limit: 6,
            }),
          }),
        });
    });

    test('应该支持学科筛选', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          subject: '数学',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该支持年级筛选', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          gradeLevel: '小学二年级',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该支持搜索功能', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          search: '加法',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该支持标签筛选', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          tags: '数学,加法',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该支持排序参数', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          sortBy: 'popular',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该支持作者筛选', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          author: 'user123',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该支持状态筛选', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          status: 'draft',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该处理无效的分页参数', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          page: 'invalid',
          limit: 'invalid',
        },
      });

      // 应该使用默认值
      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              page: 1,
              limit: 12,
            }),
          }),
        });
    });
  });

  describe('POST /api/works', () => {
    const mockWorkService = require('@/lib/services/workService').default;

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

      const createdWork = createWorkFixture({
        ...workData,
        authorId: 'temp-user-id',
      });

      mockWorkService.createWork.mockResolvedValue(createdWork);

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: workData,
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
          data: expect.objectContaining({
            title: workData.title,
            knowledgePoint: workData.knowledgePoint,
            subject: workData.subject,
            gradeLevel: workData.gradeLevel,
          }),
          message: '作品保存成功',
        });

      expect(mockWorkService.createWork).toHaveBeenCalledWith('temp-user-id', workData);
    });

    test('应该成功发布作品', async () => {
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
        status: 'published',
      };

      const createdWork = createWorkFixture({
        ...workData,
        authorId: 'temp-user-id',
      });

      mockWorkService.createWork.mockResolvedValue(createdWork);

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: workData,
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
          message: '作品发布成功',
        });
    });

    test('应该要求用户认证', async () => {
      const workData = {
        title: '测试作品',
        knowledgePoint: '加法运算',
        subject: '数学',
        gradeLevel: '小学二年级',
        cards: [],
      };

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        body: workData,
      });

      expectApiResponse(response)
        .toRequireAuthentication()
        .toHaveBodyContaining({
          success: false,
          message: '请先登录',
        });
    });

    test('应该验证必填字段', async () => {
      const incompleteData = {
        title: '测试作品',
        // 缺少其他必填字段
      };

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: incompleteData,
      });

      expectApiResponse(response)
        .toHaveValidationError()
        .toHaveBodyContaining({
          success: false,
          message: '缺少必填字段',
        });
    });

    test('应该验证卡片数据', async () => {
      const workDataWithoutCards = {
        title: '测试作品',
        knowledgePoint: '加法运算',
        subject: '数学',
        gradeLevel: '小学二年级',
        cards: [], // 空卡片数组
      };

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: workDataWithoutCards,
      });

      expectApiResponse(response)
        .toHaveValidationError()
        .toHaveBodyContaining({
          success: false,
          message: '至少需要一张教学卡片',
        });
    });

    test('应该验证卡片数据类型', async () => {
      const workDataWithInvalidCards = {
        title: '测试作品',
        knowledgePoint: '加法运算',
        subject: '数学',
        gradeLevel: '小学二年级',
        cards: 'invalid', // 非数组类型
      };

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: workDataWithInvalidCards,
      });

      expectApiResponse(response)
        .toHaveValidationError()
        .toHaveBodyContaining({
          success: false,
          message: '至少需要一张教学卡片',
        });
    });

    test('应该处理服务错误', async () => {
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
      };

      mockWorkService.createWork.mockRejectedValue(new Error('Database error'));

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: workData,
      });

      expectApiResponse(response)
        .toHaveStatus(500)
        .toHaveBodyContaining({
          error: 'Internal server error',
        });
    });

    test('应该处理无效的认证令牌格式', async () => {
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
      };

      const response = await executeApiRoute(createWorkHandler, {
        method: 'POST',
        url: 'http://localhost:3000/api/works',
        headers: {
          'Authorization': 'InvalidToken',
        },
        body: workData,
      });

      expectApiResponse(response)
        .toRequireAuthentication()
        .toHaveBodyContaining({
          success: false,
          message: '请先登录',
        });
    });
  });

  describe('作品API边界情况测试', () => {
    test('应该处理极大的分页参数', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          page: '999999',
          limit: '1000',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该处理负数分页参数', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          page: '-1',
          limit: '-10',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              page: 1, // 应该使用默认值
              limit: 12, // 应该使用默认值
            }),
          }),
        });
    });

    test('应该处理特殊字符搜索', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          search: '!@#$%^&*()',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });

    test('应该处理空字符串参数', async () => {
      const response = await executeApiRoute(getWorksHandler, {
        method: 'GET',
        url: 'http://localhost:3000/api/works',
        searchParams: {
          subject: '',
          search: '',
          tags: '',
        },
      });

      expectApiResponse(response)
        .toHaveSuccessStatus()
        .toHaveBodyContaining({
          success: true,
        });
    });
  });
});
