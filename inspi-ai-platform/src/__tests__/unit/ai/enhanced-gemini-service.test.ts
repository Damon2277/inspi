/**
 * 增强版Gemini服务测试
 */

import { EnhancedGeminiService, AIServiceError } from '@/core/ai/enhanced-gemini-service';
import { redisManager } from '@/lib/cache/simple-redis';
import { logger } from '@/shared/utils/logger';

// Mock dependencies
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/cache/simple-redis');
jest.mock('@google/generative-ai');

// Mock environment
const mockEnv = {
  AI: {
    GEMINI_API_KEY: 'AIza-test-api-key-1234567890',
    DEFAULT_MODEL: 'gemini-1.5-flash',
    SERVICE_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },
  CACHE: {
    TTL: 3600,
  },
};

jest.mock('@/config/environment', () => ({
  env: {
    GEMINI_API_KEY: 'test-api-key',
    NODE_ENV: 'test',
  },
}));

describe('EnhancedGeminiService', () => {
  let service: EnhancedGeminiService;
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;
  let mockGoogleGenerativeAI: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Google Generative AI
    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });
    mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    // Mock the GoogleGenerativeAI class
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(mockGoogleGenerativeAI);

    // Mock Redis
    (redisManager.get as jest.Mock).mockResolvedValue(null);
    (redisManager.set as jest.Mock).mockResolvedValue(undefined);

    // Create service instance
    service = new EnhancedGeminiService();
  });

  describe('初始化', () => {
    it('应该正确初始化服务', () => {
      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('AIza-test-api-key-1234567890');
      expect(service.isAvailable()).toBe(true);
    });

    it('应该在API密钥无效时标记为不可用', () => {
      // 模拟无效的API密钥
      mockEnv.AI.GEMINI_API_KEY = 'invalid-key';
      const invalidService = new EnhancedGeminiService();
      expect(invalidService.isAvailable()).toBe(false);
    });
  });

  describe('内容生成', () => {
    beforeEach(() => {
      // Mock successful response
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Generated AI content',
        },
      });
    });

    it('应该成功生成内容', async () => {
      const result = await service.generateContent('Test prompt');

      expect(result).toMatchObject({
        content: 'Generated AI content',
        model: 'gemini-1.5-flash',
        cached: false,
      });
      expect(result.requestId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('应该使用自定义选项', async () => {
      const options = {
        temperature: 0.5,
        maxTokens: 1000,
        topP: 0.8,
        topK: 20,
      };

      await service.generateContent('Test prompt', options);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-flash',
        generationConfig: expect.objectContaining({
          temperature: 0.5,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 20,
        }),
      });
    });

    it('应该处理缓存', async () => {
      const cachedResult = {
        content: 'Cached content',
        model: 'gemini-1.5-flash',
        cached: true,
        requestId: 'cached-req-123',
        timestamp: Date.now(),
      };

      (redisManager.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedResult));

      const result = await service.generateContent('Test prompt', { useCache: true });

      expect(result.content).toBe('Cached content');
      expect(result.cached).toBe(true);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('应该缓存新结果', async () => {
      await service.generateContent('Test prompt', {
        useCache: true,
        cacheTTL: 1800,
      });

      expect(redisManager.set).toHaveBeenCalledWith(
        expect.stringContaining('ai:gemini:enhanced:'),
        expect.stringContaining('Generated AI content'),
        1800,
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理API密钥错误', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API_KEY_INVALID'));

      await expect(service.generateContent('Test prompt'))
        .rejects.toThrow('Invalid API key configuration');
    });

    it('应该处理配额超限错误', async () => {
      mockGenerateContent.mockRejectedValue(new Error('QUOTA_EXCEEDED'));

      await expect(service.generateContent('Test prompt'))
        .rejects.toThrow('API quota exceeded');
    });

    it('应该处理超时错误', async () => {
      mockGenerateContent.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 35000)),
      );

      await expect(service.generateContent('Test prompt', { timeout: 1000 }))
        .rejects.toThrow('AI service timeout');
    });

    it('应该处理空响应', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      await expect(service.generateContent('Test prompt'))
        .rejects.toThrow('Empty response from AI service');
    });
  });

  describe('重试机制', () => {
    it('应该在失败后重试', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            text: () => 'Success after retries',
          },
        });

      const result = await service.generateContent('Test prompt');

      expect(result.content).toBe('Success after retries');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后失败', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Persistent error'));

      await expect(service.generateContent('Test prompt'))
        .rejects.toThrow('All retry attempts failed');

      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // MAX_RETRIES
    });

    it('应该不重试不可重试的错误', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API_KEY_INVALID'));

      await expect(service.generateContent('Test prompt'))
        .rejects.toThrow('Invalid API key configuration');

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('限流', () => {
    it('应该允许正常请求', async () => {
      const rateLimitInfo = await service.getRateLimitInfo();

      expect(rateLimitInfo.remaining).toBeGreaterThan(0);
      expect(rateLimitInfo.limit).toBe(60);
    });

    it('应该在达到限制时抛出错误', async () => {
      // 快速发送多个请求以触发限流
      const promises = Array(65).fill(null).map(() =>
        service.getRateLimitInfo().catch(e => e),
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r instanceof Error);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Rate limit exceeded');
    });
  });

  describe('健康检查', () => {
    it('应该在服务正常时返回true', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Health check response',
        },
      });

      const isHealthy = await service.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('应该在服务不可用时返回false', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Service unavailable'));

      const isHealthy = await service.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('状态信息', () => {
    it('应该返回完整的状态信息', () => {
      const status = service.getStatus();

      expect(status).toMatchObject({
        service: 'Enhanced Gemini',
        model: 'gemini-1.5-flash',
        configured: true,
        available: true,
        features: {
          rateLimiting: true,
          caching: true,
          encryption: true,
          monitoring: true,
          retryMechanism: true,
        },
      });
    });

    it('应该包含健康监控信息', () => {
      const status = service.getStatus();

      expect(status.health).toMatchObject({
        status: expect.any(String),
        latency: expect.any(Number),
        errorRate: expect.any(Number),
        lastCheck: expect.any(Number),
      });
    });
  });

  describe('AIServiceError', () => {
    it('应该正确创建错误实例', () => {
      const error = new AIServiceError('Test error', 'TEST_CODE', true, 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AIServiceError');
    });
  });
});
