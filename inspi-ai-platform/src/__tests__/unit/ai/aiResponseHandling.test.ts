/**
 * AI响应处理边界测试
 * 测试AI服务响应的各种边界条件和异常情况
 */

import { AIGenerationOptions, AIGenerationResult, GeminiService } from '@/core/ai/geminiService';
import { generatePrompt, validateCardContent } from '@/core/ai/promptTemplates';
import { redis } from '@/lib/cache/redis';
import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

// Mock dependencies
jest.mock('@google/generative-ai');
jest.mock('@/config/environment', () => ({
  env: {
    AI: {
      GEMINI_API_KEY: 'test-api-key',
      DEFAULT_MODEL: 'gemini-1.5-flash',
      SERVICE_TIMEOUT: 30000,
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000,
    },
    CACHE: { TTL: 3600 },
  },
}));
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/lib/cache/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  },
}));

describe('AI响应处理边界测试', () => {
  let geminiService: GeminiService;
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Google AI mock
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    // Create service instance
    geminiService = new GeminiService();
  });

  describe('响应格式边界测试', () => {
    it('应该处理标准JSON响应', async () => {
      // Arrange
      const validJsonResponse = {
        title: '标准响应',
        content: '这是一个标准的JSON响应',
        tags: ['标准', '响应'],
        difficulty: 'medium',
      };

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(validJsonResponse),
        },
      });

      // Act
      const result = await geminiService.generateContent('测试提示词');

      // Assert
      expect(result.content).toBe(JSON.stringify(validJsonResponse));
    });

    it('应该处理纯文本响应', async () => {
      // Arrange
      const textResponse = '这是一个纯文本响应，没有JSON格式';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => textResponse,
        },
      });

      // Act
      const result = await geminiService.generateContent('测试提示词');

      // Assert
      expect(result.content).toBe(textResponse);
    });

    it('应该处理包含特殊字符的响应', async () => {
      // Arrange
      const specialCharResponse = '特殊字符: !@#$%^&*()_+{}|:"<>?[]\\;\',./ 🚀🎯💡';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => specialCharResponse,
        },
      });

      // Act
      const result = await geminiService.generateContent('特殊字符测试');

      // Assert
      expect(result.content).toBe(specialCharResponse);
    });

    it('应该处理多行响应', async () => {
      // Arrange
      const multilineResponse = `第一行内容
第二行内容
第三行内容

包含空行的内容`;

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => multilineResponse,
        },
      });

      // Act
      const result = await geminiService.generateContent('多行测试');

      // Assert
      expect(result.content).toBe(multilineResponse.trim());
    });

    it('应该处理极长的响应', async () => {
      // Arrange
      const longResponse = 'x'.repeat(100000); // 100KB响应

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => longResponse,
        },
      });

      // Act
      const result = await geminiService.generateContent('长响应测试');

      // Assert
      expect(result.content).toBe(longResponse);
      expect(result.content.length).toBe(100000);
    });

    it('应该处理包含Unicode的响应', async () => {
      // Arrange
      const unicodeResponse = '数学符号: ∑∫∂∇∞≈≠≤≥±√π 中文字符 Emoji: 🔥💯✨';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => unicodeResponse,
        },
      });

      // Act
      const result = await geminiService.generateContent('Unicode测试');

      // Assert
      expect(result.content).toBe(unicodeResponse);
    });
  });

  describe('响应错误边界测试', () => {
    it('应该处理null响应', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => null,
        },
      });

      // Act & Assert
      await expect(geminiService.generateContent('null测试')).rejects.toThrow('Empty response from AI service');
    });

    it('应该处理undefined响应', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => undefined,
        },
      });

      // Act & Assert
      await expect(geminiService.generateContent('undefined测试')).rejects.toThrow('Empty response from AI service');
    });

    it('应该处理响应对象缺失', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({});

      // Act & Assert
      await expect(geminiService.generateContent('缺失响应测试')).rejects.toThrow();
    });

    it('应该处理text方法抛出异常', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => {
            throw new Error('Text extraction failed');
          },
        },
      });

      // Act & Assert
      await expect(geminiService.generateContent('text异常测试')).rejects.toThrow('Text extraction failed');
    });

    it('应该处理响应解析异常', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => {
            throw new TypeError('Cannot read property');
          },
        },
      });

      // Act & Assert
      await expect(geminiService.generateContent('解析异常测试')).rejects.toThrow('Cannot read property');
    });
  });

  describe('网络异常边界测试', () => {
    it('应该处理网络超时', async () => {
      // Arrange
      mockGenerateContent.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100),
        ),
      );

      // Act & Assert
      await expect(geminiService.generateContent('超时测试')).rejects.toThrow('Network timeout');
    });

    it('应该处理连接被拒绝', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Connection refused'));

      // Act & Assert
      await expect(geminiService.generateContent('连接拒绝测试')).rejects.toThrow('Connection refused');
    });

    it('应该处理DNS解析失败', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('DNS resolution failed'));

      // Act & Assert
      await expect(geminiService.generateContent('DNS测试')).rejects.toThrow('DNS resolution failed');
    });

    it('应该处理SSL证书错误', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('SSL certificate error'));

      // Act & Assert
      await expect(geminiService.generateContent('SSL测试')).rejects.toThrow('SSL certificate error');
    });
  });

  describe('API限制边界测试', () => {
    it('应该处理速率限制错误', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));

      // Act & Assert
      await expect(geminiService.generateContent('速率限制测试')).rejects.toThrow('Rate limit exceeded');
    });

    it('应该处理配额超限错误', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('QUOTA_EXCEEDED: Monthly quota exceeded'));

      // Act & Assert
      await expect(geminiService.generateContent('配额测试')).rejects.toThrow('API quota exceeded');
    });

    it('应该处理API密钥无效错误', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('API_KEY_INVALID: Invalid API key'));

      // Act & Assert
      await expect(geminiService.generateContent('API密钥测试')).rejects.toThrow('Invalid API key configuration');
    });

    it('应该处理模型不可用错误', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Model not available'));

      // Act & Assert
      await expect(geminiService.generateContent('模型不可用测试')).rejects.toThrow('Model not available');
    });
  });

  describe('内容安全边界测试', () => {
    it('应该处理内容被过滤的响应', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '[CONTENT_FILTERED] This content was filtered for safety reasons',
        },
      });

      // Act
      const result = await geminiService.generateContent('安全过滤测试');

      // Assert
      expect(result.content).toContain('CONTENT_FILTERED');
    });

    it('应该处理安全策略违规', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Content violates safety policy'));

      // Act & Assert
      await expect(geminiService.generateContent('安全策略测试')).rejects.toThrow('Content violates safety policy');
    });

    it('应该处理有害内容检测', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Harmful content detected'));

      // Act & Assert
      await expect(geminiService.generateContent('有害内容测试')).rejects.toThrow('Harmful content detected');
    });
  });

  describe('并发处理边界测试', () => {
    it('应该处理高并发请求', async () => {
      // Arrange
      mockGenerateContent.mockImplementation((prompt) =>
        Promise.resolve({
          response: {
            text: () => `响应: ${prompt}`,
          },
        }),
      );

      const concurrentRequests = 50;
      const promises = Array(concurrentRequests).fill(null).map((_, index) =>
        geminiService.generateContent(`并发测试 ${index}`),
      );

      // Act
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result, index) => {
        expect(result.content).toBe(`响应: 并发测试 ${index}`);
      });
    });

    it('应该处理部分并发失败', async () => {
      // Arrange
      mockGenerateContent.mockImplementation((prompt) => {
        if (prompt.includes('失败')) {
          return Promise.reject(new Error('Simulated failure'));
        }
        return Promise.resolve({
          response: {
            text: () => `成功响应: ${prompt}`,
          },
        });
      });

      const promises = [
        geminiService.generateContent('成功测试1'),
        geminiService.generateContent('失败测试'),
        geminiService.generateContent('成功测试2'),
      ];

      // Act
      const results = await Promise.allSettled(promises);

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('缓存边界测试', () => {
    it('应该处理缓存损坏', async () => {
      // Arrange
      (redis as any).get.mockResolvedValue('invalid json data');
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '新生成的内容',
        },
      });

      // Act
      const result = await geminiService.generateContent('缓存损坏测试');

      // Assert
      expect(result.content).toBe('新生成的内容');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to get cached AI result',
        expect.any(Object),
      );
    });

    it('应该处理缓存服务不可用', async () => {
      // Arrange
      (redis as any).get.mockRejectedValue(new Error('Redis connection failed'));
      (redis as any).setex.mockRejectedValue(new Error('Redis connection failed'));
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '无缓存内容',
        },
      });

      // Act
      const result = await geminiService.generateContent('缓存不可用测试');

      // Assert
      expect(result.content).toBe('无缓存内容');
      expect(logger.warn).toHaveBeenCalledTimes(2); // get和set都会警告
    });

    it('应该处理缓存键冲突', async () => {
      // Arrange
      const conflictingData = {
        content: '冲突的缓存数据',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        model: 'different-model',
        cached: false,
      };
      (redis as any).get.mockResolvedValue(JSON.stringify(conflictingData));

      // Act
      const result = await geminiService.generateContent('缓存冲突测试');

      // Assert
      expect(result).toEqual({ ...conflictingData, cached: true });
    });
  });

  describe('提示词边界测试', () => {
    it('应该处理极长的提示词', async () => {
      // Arrange
      const longPrompt = 'a'.repeat(50000); // 50KB提示词
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '长提示词响应',
        },
      });

      // Act
      const result = await geminiService.generateContent(longPrompt);

      // Assert
      expect(result.content).toBe('长提示词响应');
      expect(mockGenerateContent).toHaveBeenCalledWith(longPrompt);
    });

    it('应该处理空提示词', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '空提示词响应',
        },
      });

      // Act
      const result = await geminiService.generateContent('');

      // Assert
      expect(result.content).toBe('空提示词响应');
    });

    it('应该处理只包含空白字符的提示词', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '空白字符响应',
        },
      });

      // Act
      const result = await geminiService.generateContent('   \n\t  ');

      // Assert
      expect(result.content).toBe('空白字符响应');
    });
  });

  describe('参数边界测试', () => {
    it('应该处理极端的温度值', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '极端温度响应',
        },
      });

      const extremeOptions: AIGenerationOptions = {
        temperature: 2.0, // 超出正常范围
        maxTokens: 0, // 极小值
        topP: 1.1, // 超出范围
        topK: -1, // 负值
      };

      // Act
      const result = await geminiService.generateContent('极端参数测试', extremeOptions);

      // Assert
      expect(result.content).toBe('极端温度响应');
    });

    it('应该处理NaN参数值', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'NaN参数响应',
        },
      });

      const nanOptions: AIGenerationOptions = {
        temperature: NaN,
        maxTokens: NaN,
        topP: NaN,
        topK: NaN,
      };

      // Act
      const result = await geminiService.generateContent('NaN参数测试', nanOptions);

      // Assert
      expect(result.content).toBe('NaN参数响应');
    });

    it('应该处理Infinity参数值', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Infinity参数响应',
        },
      });

      const infinityOptions: AIGenerationOptions = {
        temperature: Infinity,
        maxTokens: Infinity,
        topP: Infinity,
        topK: Infinity,
      };

      // Act
      const result = await geminiService.generateContent('Infinity参数测试', infinityOptions);

      // Assert
      expect(result.content).toBe('Infinity参数响应');
    });
  });

  describe('内存边界测试', () => {
    it('应该处理内存不足情况', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('JavaScript heap out of memory'));

      // Act & Assert
      await expect(geminiService.generateContent('内存不足测试')).rejects.toThrow('JavaScript heap out of memory');
    });

    it('应该正确清理大型对象', async () => {
      // Arrange
      const largeResponse = {
        response: {
          text: () => 'x'.repeat(1000000), // 1MB响应
        },
      };
      mockGenerateContent.mockResolvedValue(largeResponse);

      // Act
      const result = await geminiService.generateContent('大型对象测试');

      // Assert
      expect(result.content.length).toBe(1000000);

      // 模拟垃圾回收
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('时区和编码边界测试', () => {
    it('应该处理不同时区的时间戳', async () => {
      // Arrange
      const originalTimezone = process.env.TZ;
      process.env.TZ = 'Asia/Tokyo';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '时区测试响应',
        },
      });

      // Act
      const result = await geminiService.generateContent('时区测试');

      // Assert
      expect(result.content).toBe('时区测试响应');

      // Cleanup
      process.env.TZ = originalTimezone;
    });

    it('应该处理不同编码的文本', async () => {
      // Arrange
      const encodedText = Buffer.from('编码测试', 'utf8').toString('base64');
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => Buffer.from(encodedText, 'base64').toString('utf8'),
        },
      });

      // Act
      const result = await geminiService.generateContent('编码测试');

      // Assert
      expect(result.content).toBe('编码测试');
    });
  });
});
