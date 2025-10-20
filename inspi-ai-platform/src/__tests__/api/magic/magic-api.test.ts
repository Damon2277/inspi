/**
 * AI魔法师API测试
 */

import { POST } from '@/app/api/magic/generate/route';
import { POST as RegeneratePost } from '@/app/api/magic/regenerate/route';

import {
  ApiTestHelper,
  setupApiTestEnvironment,
  mockDatabase,
  mockServices,
  jwtUtils,
  responseValidators,
} from '../setup/api-test-setup';

import { createUserFixture, createCardSetFixture } from '@/fixtures';

// Mock外部依赖
jest.mock('@/core/auth/middleware', () => ({
  authenticateUser: jest.fn().mockImplementation((request) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = jwtUtils.verifyTestToken(token);
      return Promise.resolve({ userId: payload.userId });
    } catch {
      throw new Error('Invalid token');
    }
  }),
}));

jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  getUserSubscription: jest.fn().mockImplementation((userId) =>
    Promise.resolve(mockDatabase.subscriptions?.get(userId) || { plan: 'free', status: 'active' }),
  ),
  getUserUsage: jest.fn().mockImplementation((userId) =>
    Promise.resolve(mockDatabase.usage?.get(userId) || { dailyGenerations: 0, dailyReuses: 0 }),
  ),
  updateUserUsage: jest.fn().mockImplementation((userId, usage) => {
    if (!mockDatabase.usage) mockDatabase.usage = new Map();
    mockDatabase.usage.set(userId, usage);
    return Promise.resolve(usage);
  }),
  saveGenerationHistory: jest.fn().mockImplementation((historyData) => {
    const history = { ...historyData, id: `history-${Date.now()}` };
    if (!mockDatabase.generationHistory) mockDatabase.generationHistory = new Map();
    mockDatabase.generationHistory.set(history.id, history);
    return Promise.resolve(history);
  }),
}));

// Mock AI服务
jest.mock('@/core/ai/geminiService', () => ({
  generateCards: jest.fn().mockImplementation((prompt, options = {}) => {
    const cardTypes = options.cardTypes || ['concept', 'example', 'practice', 'summary'];
    return Promise.resolve(cardTypes.map(type => ({
      type,
      title: `${type}卡片标题`,
      content: `这是${type}卡片的内容，基于提示词：${prompt}`,
      difficulty: options.difficulty || 'medium',
      subject: options.subject || 'Mathematics',
    })));
  }),
  regenerateCard: jest.fn().mockImplementation((cardType, prompt, options = {}) => {
    return Promise.resolve({
      type: cardType,
      title: `重新生成的${cardType}卡片`,
      content: `重新生成的${cardType}卡片内容，基于：${prompt}`,
      difficulty: options.difficulty || 'medium',
      subject: options.subject || 'Mathematics',
    });
  }),
}));

// Mock使用限制检查
jest.mock('@/lib/middleware/usageLimit', () => ({
  checkGenerationLimit: jest.fn().mockImplementation((userId, subscription) => {
    const usage = mockDatabase.usage?.get(userId) || { dailyGenerations: 0 };
    const limits = {
      free: 3,
      pro: 20,
      super: -1, // 无限制
    };

    const limit = limits[subscription.plan] || 3;
    if (limit === -1) return Promise.resolve(true);

    return Promise.resolve(usage.dailyGenerations < limit);
  }),
}));

describe('/api/magic API测试', () => {
  setupApiTestEnvironment();

  const testUser = createUserFixture({ id: 'user-1' });
  const authToken = jwtUtils.createTestToken({ userId: testUser.id });
  const authHeaders = ApiTestHelper.createAuthHeaders(authToken);

  beforeEach(() => {
    mockDatabase.users.set(testUser.id, testUser);

    // 初始化用户订阅和使用情况
    if (!mockDatabase.subscriptions) mockDatabase.subscriptions = new Map();
    if (!mockDatabase.usage) mockDatabase.usage = new Map();

    mockDatabase.subscriptions.set(testUser.id, {
      userId: testUser.id,
      plan: 'free',
      status: 'active',
    });

    mockDatabase.usage.set(testUser.id, {
      userId: testUser.id,
      dailyGenerations: 0,
      dailyReuses: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    });
  });

  describe('POST /api/magic/generate - 生成卡片', () => {
    test('应该成功生成四种类型的卡片', async () => {
      const generateData = {
        knowledgePoint: '二次函数的图像和性质',
        subject: 'Mathematics',
        grade: 'Grade 9',
        difficulty: 'medium',
        cardTypes: ['concept', 'example', 'practice', 'summary'],
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      responseValidators.validateApiResponse(response);
      expect(response.success).toBe(true);
      expect(response.data.cards).toHaveLength(4);

      // 验证每种卡片类型
      const cardTypes = response.data.cards.map((card: any) => card.type);
      expect(cardTypes).toContain('concept');
      expect(cardTypes).toContain('example');
      expect(cardTypes).toContain('practice');
      expect(cardTypes).toContain('summary');

      // 验证卡片内容
      response.data.cards.forEach((card: any) => {
        expect(card).toHaveProperty('title');
        expect(card).toHaveProperty('content');
        expect(card).toHaveProperty('type');
        expect(card.subject).toBe('Mathematics');
      });
    });

    test('应该支持自定义卡片类型', async () => {
      const generateData = {
        knowledgePoint: '圆的面积公式',
        subject: 'Mathematics',
        cardTypes: ['concept', 'example'], // 只生成两种类型
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.data.cards).toHaveLength(2);
      expect(response.data.cards[0].type).toBe('concept');
      expect(response.data.cards[1].type).toBe('example');
    });

    test('应该验证必需字段', async () => {
      const invalidData = {
        subject: 'Mathematics',
        // 缺少 knowledgePoint
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      ApiTestHelper.expectValidationError(result, ['knowledgePoint']);
    });

    test('应该检查使用限制', async () => {
      // 设置用户已达到免费限制
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 3, // 免费用户限制
        dailyReuses: 0,
      });

      const generateData = {
        knowledgePoint: '测试知识点',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(429);
      const response = await result.json();
      expect(response.success).toBe(false);
      expect(response.error).toContain('limit exceeded');
    });

    test('应该更新使用统计', async () => {
      const generateData = {
        knowledgePoint: '测试知识点',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);

      // 验证使用统计更新
      const { updateUserUsage } = require('@/lib/db/mongodb');
      expect(updateUserUsage).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          dailyGenerations: 1,
        }),
      );
    });

    test('应该保存生成历史', async () => {
      const generateData = {
        knowledgePoint: '测试知识点',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);

      // 验证生成历史保存
      const { saveGenerationHistory } = require('@/lib/db/mongodb');
      expect(saveGenerationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.id,
          knowledgePoint: generateData.knowledgePoint,
          subject: generateData.subject,
        }),
      );
    });

    test('应该处理AI服务错误', async () => {
      // Mock AI服务失败
      const { generateCards } = require('@/core/ai/geminiService');
      generateCards.mockRejectedValueOnce(new Error('AI service unavailable'));

      const generateData = {
        knowledgePoint: '测试知识点',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(503);
      const response = await result.json();
      expect(response.success).toBe(false);
      expect(response.error).toContain('AI service');
    });

    test('应该支持不同难度级别', async () => {
      const difficulties = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const generateData = {
          knowledgePoint: '测试知识点',
          subject: 'Mathematics',
          difficulty,
        };

        const result = await ApiTestHelper.callApi(
          POST,
          '/api/magic/generate',
          {
            body: generateData,
            headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
          },
        );

        expect(result.status).toBe(200);
        const response = await result.json();

        response.data.cards.forEach((card: any) => {
          expect(card.difficulty).toBe(difficulty);
        });
      }
    });

    test('应该处理Pro用户的高级功能', async () => {
      // 设置Pro订阅
      mockDatabase.subscriptions.set(testUser.id, {
        userId: testUser.id,
        plan: 'pro',
        status: 'active',
      });

      const generateData = {
        knowledgePoint: '高级数学概念',
        subject: 'Mathematics',
        difficulty: 'hard',
        customPrompt: '请生成更详细的解释',
        includeImages: true,
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.data.cards).toBeDefined();
      // Pro用户应该能使用高级功能
      expect(response.data.metadata?.includeImages).toBe(true);
    });
  });

  describe('POST /api/magic/regenerate - 重新生成卡片', () => {
    test('应该成功重新生成指定类型的卡片', async () => {
      const regenerateData = {
        cardType: 'example',
        knowledgePoint: '二次函数',
        subject: 'Mathematics',
        previousContent: '之前的示例内容',
        feedback: '需要更简单的例子',
      };

      const result = await ApiTestHelper.callApi(
        RegeneratePost,
        '/api/magic/regenerate',
        {
          body: regenerateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      responseValidators.validateApiResponse(response);
      expect(response.success).toBe(true);
      expect(response.data.card.type).toBe('example');
      expect(response.data.card.title).toContain('重新生成');

      // 验证AI服务调用
      const { regenerateCard } = require('@/core/ai/geminiService');
      expect(regenerateCard).toHaveBeenCalledWith(
        'example',
        expect.stringContaining('二次函数'),
        expect.any(Object),
      );
    });

    test('应该验证卡片类型', async () => {
      const invalidData = {
        cardType: 'invalid-type',
        knowledgePoint: '测试知识点',
      };

      const result = await ApiTestHelper.callApi(
        RegeneratePost,
        '/api/magic/regenerate',
        {
          body: invalidData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      ApiTestHelper.expectValidationError(result, ['cardType']);
    });

    test('应该检查重新生成限制', async () => {
      // 设置用户已达到限制
      mockDatabase.usage.set(testUser.id, {
        userId: testUser.id,
        dailyGenerations: 3,
        dailyReuses: 0,
      });

      const regenerateData = {
        cardType: 'concept',
        knowledgePoint: '测试知识点',
      };

      const result = await ApiTestHelper.callApi(
        RegeneratePost,
        '/api/magic/regenerate',
        {
          body: regenerateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(429);
    });

    test('应该支持基于反馈的重新生成', async () => {
      const regenerateData = {
        cardType: 'practice',
        knowledgePoint: '分数运算',
        feedback: '题目太难了，需要更简单的练习',
        difficulty: 'easy',
      };

      const result = await ApiTestHelper.callApi(
        RegeneratePost,
        '/api/magic/regenerate',
        {
          body: regenerateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();

      expect(response.data.card.difficulty).toBe('easy');

      // 验证反馈被传递给AI服务
      const { regenerateCard } = require('@/core/ai/geminiService');
      expect(regenerateCard).toHaveBeenCalledWith(
        'practice',
        expect.stringContaining('更简单'),
        expect.objectContaining({ difficulty: 'easy' }),
      );
    });

    test('应该处理重新生成失败', async () => {
      const { regenerateCard } = require('@/core/ai/geminiService');
      regenerateCard.mockRejectedValueOnce(new Error('Regeneration failed'));

      const regenerateData = {
        cardType: 'concept',
        knowledgePoint: '测试知识点',
      };

      const result = await ApiTestHelper.callApi(
        RegeneratePost,
        '/api/magic/regenerate',
        {
          body: regenerateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(503);
      const response = await result.json();
      expect(response.success).toBe(false);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理超长知识点输入', async () => {
      const generateData = {
        knowledgePoint: 'A'.repeat(1000), // 超长输入
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      // 应该截断或拒绝超长输入
      expect([200, 400]).toContain(result.status);
    });

    test('应该处理特殊字符和表情符号', async () => {
      const generateData = {
        knowledgePoint: '数学公式 ∑∫∂ 和表情 😊🔢',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();
      expect(response.success).toBe(true);
    });

    test('应该处理并发生成请求', async () => {
      const generateData = {
        knowledgePoint: '并发测试',
        subject: 'Mathematics',
      };

      const concurrentRequests = Array(3).fill(null).map(() =>
        ApiTestHelper.callApi(
          POST,
          '/api/magic/generate',
          {
            body: generateData,
            headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
          },
        ),
      );

      const results = await Promise.all(concurrentRequests);

      // 第一个请求应该成功，后续可能因为限制而失败
      expect(results[0].status).toBe(200);

      // 验证使用统计正确更新
      const { updateUserUsage } = require('@/lib/db/mongodb');
      expect(updateUserUsage).toHaveBeenCalled();
    });

    test('应该处理AI服务超时', async () => {
      const { generateCards } = require('@/core/ai/geminiService');
      generateCards.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100),
        ),
      );

      const generateData = {
        knowledgePoint: '超时测试',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(503);
      const response = await result.json();
      expect(response.error).toContain('Timeout');
    });
  });

  describe('性能和可靠性测试', () => {
    test('应该在合理时间内生成卡片', async () => {
      const startTime = Date.now();

      const generateData = {
        knowledgePoint: '性能测试',
        subject: 'Mathematics',
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5秒内响应
      expect(result.status).toBe(200);
    });

    test('应该正确处理重试机制', async () => {
      const { generateCards } = require('@/core/ai/geminiService');

      // 第一次失败，第二次成功
      generateCards
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce([
          { type: 'concept', title: '重试成功', content: '重试后的内容' },
        ]);

      const generateData = {
        knowledgePoint: '重试测试',
        subject: 'Mathematics',
        cardTypes: ['concept'],
      };

      const result = await ApiTestHelper.callApi(
        POST,
        '/api/magic/generate',
        {
          body: generateData,
          headers: { ...authHeaders, ...ApiTestHelper.createJsonHeaders() },
        },
      );

      expect(result.status).toBe(200);
      const response = await result.json();
      expect(response.data.cards[0].title).toBe('重试成功');
    });
  });
});
