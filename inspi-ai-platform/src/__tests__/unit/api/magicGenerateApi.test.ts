/**
 * 魔法生成API功能测试
 * 测试AI教学卡片生成API的功能、性能和错误处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST as generateHandler } from '@/app/api/magic/generate/route';

// Mock dependencies
const mockGeminiService = {
  generateContent: jest.fn(),
  healthCheck: jest.fn()
};

const mockQuotaManager = {
  consumeQuota: jest.fn(),
  checkQuota: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('@/lib/ai/geminiService', () => ({
  geminiService: mockGeminiService
}));

jest.mock('@/lib/quota/quotaManager', () => ({
  quotaManager: mockQuotaManager
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: mockLogger
}));

jest.mock('@/lib/ai/promptTemplates', () => ({
  generateAllCardsPrompt: jest.fn().mockReturnValue({
    concept: 'Mock concept prompt',
    example: 'Mock example prompt',
    practice: 'Mock practice prompt',
    extension: 'Mock extension prompt'
  }),
  validateAllCards: jest.fn().mockReturnValue({
    concept: { valid: true, errors: [] },
    example: { valid: true, errors: [] },
    practice: { valid: true, errors: [] },
    extension: { valid: true, errors: [] }
  })
}));

// Helper function to create mock request
function createMockRequest(body: any, headers: Record<string, string> = {}, cookies: Record<string, string> = {}) {
  const cookieMap = new Map();
  Object.entries(cookies).forEach(([key, value]) => {
    cookieMap.set(key, { value });
  });

  return {
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
    headers: new Map(Object.entries(headers)),
    cookies: {
      get: (key: string) => cookieMap.get(key)
    },
    url: 'http://localhost:3000/api/magic/generate'
  } as unknown as NextRequest;
}

describe('魔法生成API功能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockGeminiService.healthCheck.mockResolvedValue(true);
    mockQuotaManager.consumeQuota.mockResolvedValue(true);
    mockQuotaManager.checkQuota.mockResolvedValue({
      currentUsage: 1,
      dailyLimit: 10,
      remaining: 9,
      resetTime: Date.now() + 24 * 60 * 60 * 1000
    });
    mockGeminiService.generateContent.mockResolvedValue({
      content: 'Generated card content',
      cached: false
    });
  });

  describe('成功场景测试', () => {
    it('应该成功生成四张教学卡片', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学',
        gradeLevel: '小学二年级',
        difficulty: 'medium'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('cards');
      expect(responseData.cards).toHaveLength(4);
      expect(responseData).toHaveProperty('sessionId');
      expect(responseData).toHaveProperty('usage');

      // 验证卡片结构
      responseData.cards.forEach((card: any) => {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('type');
        expect(card).toHaveProperty('title');
        expect(card).toHaveProperty('content');
        expect(card).toHaveProperty('explanation');
      });

      // 验证卡片类型
      const cardTypes = responseData.cards.map((card: any) => card.type);
      expect(cardTypes).toContain('visualization');
      expect(cardTypes).toContain('analogy');
      expect(cardTypes).toContain('thinking');
      expect(cardTypes).toContain('interaction');

      // 验证AI服务调用
      expect(mockGeminiService.generateContent).toHaveBeenCalledTimes(4);
      expect(mockQuotaManager.consumeQuota).toHaveBeenCalledWith('temp_user_ken', 'free', 1);
    });

    it('应该处理带有额外上下文的请求', async () => {
      // Arrange
      const requestWithContext = {
        knowledgePoint: '分数概念',
        subject: '数学',
        gradeLevel: '小学三年级',
        difficulty: 'easy',
        additionalContext: '学生刚开始接触分数，需要更多视觉化的解释'
      };

      const request = createMockRequest(requestWithContext, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.cards).toHaveLength(4);
      
      // 验证额外上下文被传递
      const mockPromptTemplates = require('@/lib/ai/promptTemplates');
      expect(mockPromptTemplates.generateAllCardsPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalContext: '学生刚开始接触分数，需要更多视觉化的解释'
        })
      );
    });

    it('应该使用缓存的内容', async () => {
      // Arrange
      mockGeminiService.generateContent.mockResolvedValue({
        content: 'Cached card content',
        cached: true
      });

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      responseData.cards.forEach((card: any) => {
        expect(card.cached).toBe(true);
      });
    });

    it('应该正确更新用户配额', async () => {
      // Arrange
      const initialQuota = {
        currentUsage: 5,
        dailyLimit: 10,
        remaining: 5,
        resetTime: Date.now() + 24 * 60 * 60 * 1000
      };

      const updatedQuota = {
        currentUsage: 6,
        dailyLimit: 10,
        remaining: 4,
        resetTime: Date.now() + 24 * 60 * 60 * 1000
      };

      mockQuotaManager.checkQuota.mockResolvedValue(updatedQuota);

      const validRequest = {
        knowledgePoint: '分数概念',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.usage).toEqual({
        current: 6,
        limit: 10,
        remaining: 4
      });
    });
  });

  describe('身份验证测试', () => {
    it('应该拒绝没有token的请求', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest);

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Authentication required');
    });

    it('应该接受Authorization header中的token', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {
        'authorization': 'Bearer valid-token'
      });

      // Act
      const response = await generateHandler(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('应该接受cookie中的token', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('输入验证测试', () => {
    it('应该拒绝空的知识点', async () => {
      // Arrange
      const invalidRequest = {
        knowledgePoint: '',
        subject: '数学'
      };

      const request = createMockRequest(invalidRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('请输入知识点');
    });

    it('应该拒绝只有空格的知识点', async () => {
      // Arrange
      const invalidRequest = {
        knowledgePoint: '   ',
        subject: '数学'
      };

      const request = createMockRequest(invalidRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('请输入知识点');
    });

    it('应该拒绝过长的知识点', async () => {
      // Arrange
      const invalidRequest = {
        knowledgePoint: 'a'.repeat(101), // 超过100字符
        subject: '数学'
      };

      const request = createMockRequest(invalidRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('知识点长度不能超过100个字符');
    });

    it('应该处理缺少知识点字段的请求', async () => {
      // Arrange
      const invalidRequest = {
        subject: '数学'
        // 缺少knowledgePoint
      };

      const request = createMockRequest(invalidRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('请输入知识点');
    });
  });

  describe('配额管理测试', () => {
    it('应该拒绝超出配额的请求', async () => {
      // Arrange
      mockQuotaManager.consumeQuota.mockResolvedValue(false);
      mockQuotaManager.checkQuota.mockResolvedValue({
        currentUsage: 10,
        dailyLimit: 10,
        remaining: 0,
        resetTime: Date.now() + 24 * 60 * 60 * 1000
      });

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.error).toBe('今日AI生成次数已用完');
      expect(responseData.quota).toEqual({
        current: 10,
        limit: 10,
        remaining: 0,
        resetTime: expect.any(Number)
      });
    });

    it('应该处理不同用户计划的配额', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'premium-user-token' });

      // Act
      await generateHandler(request);

      // Assert
      expect(mockQuotaManager.consumeQuota).toHaveBeenCalledWith(
        expect.stringContaining('premium-user-token'),
        'free', // 当前实现中默认为free
        1
      );
    });
  });

  describe('AI服务健康检查测试', () => {
    it('应该在AI服务不健康时返回错误', async () => {
      // Arrange
      mockGeminiService.healthCheck.mockResolvedValue(false);

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(responseData.error).toBe('AI服务暂时不可用，请稍后重试');
      expect(mockLogger.error).toHaveBeenCalledWith('AI service health check failed');
    });
  });

  describe('AI内容生成测试', () => {
    it('应该处理单个卡片生成失败', async () => {
      // Arrange
      mockGeminiService.generateContent
        .mockResolvedValueOnce({ content: 'Concept card', cached: false })
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({ content: 'Practice card', cached: false })
        .mockResolvedValueOnce({ content: 'Extension card', cached: false });

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.cards).toHaveLength(4);
      
      // 验证失败的卡片使用了备用内容
      const failedCard = responseData.cards.find((card: any) => 
        card.id.includes('fallback')
      );
      expect(failedCard).toBeDefined();
    });

    it('应该处理内容验证失败', async () => {
      // Arrange
      const mockValidateAllCards = require('@/lib/ai/promptTemplates').validateAllCards;
      mockValidateAllCards.mockReturnValue({
        concept: { valid: false, errors: ['Content too short'] },
        example: { valid: true, errors: [] },
        practice: { valid: true, errors: [] },
        extension: { valid: true, errors: [] }
      });

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Generated card validation failed for concept',
        expect.objectContaining({
          errors: ['Content too short'],
          knowledgePoint: '两位数加法'
        })
      );
    });

    it('应该使用正确的缓存键', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '分数概念',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      await generateHandler(request);

      // Assert
      expect(mockGeminiService.generateContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cacheKey: expect.stringContaining('分数概念'),
          cacheTTL: 3600
        })
      );
    });
  });

  describe('错误处理测试', () => {
    it('应该处理JSON解析错误', async () => {
      // Arrange
      const request = {
        method: 'POST',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Map(),
        cookies: { get: () => ({ value: 'valid-token' }) },
        url: 'http://localhost:3000/api/magic/generate'
      } as unknown as NextRequest;

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Invalid JSON');
    });

    it('应该处理配额服务错误', async () => {
      // Arrange
      mockQuotaManager.consumeQuota.mockRejectedValue(new Error('Quota service error'));

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Quota service error');
    });

    it('应该处理AI服务配额错误', async () => {
      // Arrange
      mockGeminiService.generateContent.mockRejectedValue(
        new Error('quota exceeded')
      );

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(responseData.error).toBe('AI服务配额已用完，请稍后重试或升级账户');
    });

    it('应该处理AI服务超时', async () => {
      // Arrange
      mockGeminiService.generateContent.mockRejectedValue(
        new Error('timeout')
      );

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(408);
      expect(responseData.error).toBe('AI服务响应超时，请重试');
    });

    it('应该处理未知错误', async () => {
      // Arrange
      mockGeminiService.generateContent.mockRejectedValue('Unknown error');

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      const response = await generateHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('AI生成服务暂时不可用，请稍后重试');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成生成', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });
      const startTime = Date.now();

      // Act
      await generateHandler(request);

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该记录性能指标', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      await generateHandler(request);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AI card generation completed',
        expect.objectContaining({
          knowledgePoint: '两位数加法',
          subject: '数学',
          cardsGenerated: 4,
          duration: expect.any(Number),
          sessionId: expect.any(String)
        })
      );
    });

    it('应该处理并发请求', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const requests = Array(5).fill(null).map(() => 
        createMockRequest(validRequest, {}, { token: `token-${Math.random()}` })
      );

      // Act
      const responses = await Promise.all(
        requests.map(request => generateHandler(request))
      );

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('日志记录测试', () => {
    it('应该记录请求开始日志', async () => {
      // Arrange
      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      await generateHandler(request);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('AI card generation request started');
    });

    it('应该记录失败日志', async () => {
      // Arrange
      mockGeminiService.generateContent.mockRejectedValue(new Error('Generation failed'));

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      await generateHandler(request);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'AI card generation failed',
        expect.objectContaining({
          error: 'Generation failed',
          duration: expect.any(Number)
        })
      );
    });

    it('应该记录卡片生成失败的警告', async () => {
      // Arrange
      mockGeminiService.generateContent
        .mockResolvedValueOnce({ content: 'Success', cached: false })
        .mockRejectedValueOnce(new Error('Card generation failed'))
        .mockResolvedValueOnce({ content: 'Success', cached: false })
        .mockResolvedValueOnce({ content: 'Success', cached: false });

      const validRequest = {
        knowledgePoint: '两位数加法',
        subject: '数学'
      };

      const request = createMockRequest(validRequest, {}, { token: 'valid-token' });

      // Act
      await generateHandler(request);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate example card',
        expect.objectContaining({
          error: 'Card generation failed',
          knowledgePoint: '两位数加法',
          cardType: 'example'
        })
      );
    });
  });
});