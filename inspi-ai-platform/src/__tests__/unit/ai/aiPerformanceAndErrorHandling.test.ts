/**
 * AI服务性能和错误处理测试
 * 测试AI服务的性能指标、错误恢复和资源管理
 */

import { AIGenerationOptions, GeminiService } from '@/lib/ai/geminiService';
import { generatePrompt, validateCardContent } from '@/lib/ai/promptTemplates';
import { env } from '@/config/environment';
import { logger } from '@/lib/utils/logger';
import { redis } from '@/lib/cache/redis';

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
  }
}));
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));
jest.mock('@/lib/cache/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  }
}));

describe('AI服务性能和错误处理测试', () => {
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

  describe('性能基准测试', () => {
    it('应该在合理时间内完成单次生成', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '性能测试响应'
        }
      });

      const startTime = performance.now();

      // Act
      await geminiService.generateContent('性能基准测试');

      // Assert
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在100ms内完成（不包括网络延迟）
    });

    it('应该在批量生成时保持性能', async () => {
      // Arrange
      mockGenerateContent.mockImplementation(() => 
        Promise.resolve({
          response: {
            text: () => '批量性能测试响应'
          }
        })
      );

      const batchSize = 10;
      const startTime = performance.now();

      // Act
      const promises = Array(batchSize).fill(null).map((_, index) => 
        geminiService.generateContent(`批量测试 ${index}`)
      );
      await Promise.all(promises);

      // Assert
      const duration = performance.now() - startTime;
      const averageTime = duration / batchSize;
      expect(averageTime).toBeLessThan(50); // 平均每个请求应该在50ms内完成
    });

    it('应该正确测量和记录性能指标', async () => {
      // Arrange
      const delay = 100;
      mockGenerateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: {
            text: () => '延迟测试响应'
          }
        }), delay))
      );

      // Act
      await geminiService.generateContent('性能指标测试');

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'AI generation completed',
        expect.objectContaining({
          duration: expect.any(Number),
          model: 'gemini-1.5-flash'
        })
      );

      const logCall = (logger.info as jest.Mock).mock.calls.find(
        call => call[0] === 'AI generation completed'
      );
      expect(logCall[1].duration).toBeGreaterThanOrEqual(delay);
    });

    it('应该在高负载下保持稳定性', async () => {
      // Arrange
      mockGenerateContent.mockImplementation(() => 
        Promise.resolve({
          response: {
            text: () => '高负载测试响应'
          }
        })
      );

      const highLoad = 100;
      const startTime = performance.now();

      // Act
      const promises = Array(highLoad).fill(null).map((_, index) => 
        geminiService.generateContent(`高负载测试 ${index}`)
      );
      const results = await Promise.all(promises);

      // Assert
      const duration = performance.now() - startTime;
      expect(results).toHaveLength(highLoad);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成100个请求
      
      results.forEach(result => {
        expect(result.content).toBe('高负载测试响应');
      });
    });
  });

  describe('内存使用测试', () => {
    it('应该正确管理内存使用', async () => {
      // Arrange
      const initialMemory = process.memoryUsage();
      const largeContent = 'x'.repeat(100000); // 100KB内容

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => largeContent
        }
      });

      // Act
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await geminiService.generateContent(`内存测试 ${i}`);
        results.push(result);
      }

      // Assert
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // 内存增长应该在合理范围内（考虑到10个100KB的响应）
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB
      expect(results).toHaveLength(10);
    });

    it('应该处理内存泄漏场景', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '内存泄漏测试'
        }
      });

      const iterations = 50;
      const memorySnapshots = [];

      // Act
      for (let i = 0; i < iterations; i++) {
        await geminiService.generateContent(`泄漏测试 ${i}`);
        
        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      // Assert
      // 检查内存使用是否稳定（没有持续增长）
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB增长限制
    });

    it('应该在大型响应后正确清理内存', async () => {
      // Arrange
      const hugeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB内容
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => hugeContent
        }
      });

      const beforeMemory = process.memoryUsage().heapUsed;

      // Act
      const result = await geminiService.generateContent('大型响应测试');
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      // Assert
      expect(result.content.length).toBe(10 * 1024 * 1024);
      
      // 等待一段时间让垃圾回收器工作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterMemory = process.memoryUsage().heapUsed;
      const memoryDiff = afterMemory - beforeMemory;
      
      // 内存增长应该小于响应大小（说明有垃圾回收）
      expect(memoryDiff).toBeLessThan(15 * 1024 * 1024); // 15MB限制
    });
  });

  describe('错误恢复测试', () => {
    it('应该从临时网络错误中恢复', async () => {
      // Arrange
      let attemptCount = 0;
      mockGenerateContent.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          response: {
            text: () => '恢复成功'
          }
        });
      });

      // Mock sleep to speed up test
      jest.spyOn(geminiService as any, 'sleep').mockImplementation(() => Promise.resolve());

      // Act
      const result = await geminiService.generateContent('网络恢复测试');

      // Assert
      expect(result.content).toBe('恢复成功');
      expect(attemptCount).toBe(3);
      expect(logger.warn).toHaveBeenCalledTimes(2); // 两次失败警告
    });

    it('应该从API限制错误中恢复', async () => {
      // Arrange
      let attemptCount = 0;
      mockGenerateContent.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Rate limit exceeded'));
        }
        return Promise.resolve({
          response: {
            text: () => 'API限制恢复成功'
          }
        });
      });

      jest.spyOn(geminiService as any, 'sleep').mockImplementation(() => Promise.resolve());

      // Act
      const result = await geminiService.generateContent('API限制恢复测试');

      // Assert
      expect(result.content).toBe('API限制恢复成功');
      expect(attemptCount).toBe(2);
    });

    it('应该在持续错误后正确失败', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Persistent error'));
      jest.spyOn(geminiService as any, 'sleep').mockImplementation(() => Promise.resolve());

      // Act & Assert
      await expect(geminiService.generateContent('持续错误测试')).rejects.toThrow('Persistent error');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // 最大重试次数
      expect(logger.warn).toHaveBeenCalledTimes(2); // 重试警告
      expect(logger.error).toHaveBeenCalledTimes(1); // 最终错误
    });

    it('应该处理部分失败的批量请求', async () => {
      // Arrange
      mockGenerateContent.mockImplementation((prompt) => {
        if (prompt.includes('失败')) {
          return Promise.reject(new Error('Simulated failure'));
        }
        return Promise.resolve({
          response: {
            text: () => `成功: ${prompt}`
          }
        });
      });

      const requests = [
        '成功请求1',
        '失败请求',
        '成功请求2',
        '成功请求3'
      ];

      // Act
      const results = await Promise.allSettled(
        requests.map(req => geminiService.generateContent(req))
      );

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      expect(results[3].status).toBe('fulfilled');

      const successfulResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
      expect(successfulResults).toHaveLength(3);
    });
  });

  describe('资源管理测试', () => {
    it('应该正确管理连接池', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '连接池测试'
        }
      });

      // Act - 创建大量并发请求
      const concurrentRequests = 20;
      const promises = Array(concurrentRequests).fill(null).map((_, index) => 
        geminiService.generateContent(`连接池测试 ${index}`)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(mockGenerateContent).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('应该正确处理超时', async () => {
      // Arrange
      const longDelay = 35000; // 超过30秒超时
      mockGenerateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, longDelay))
      );

      // Act & Assert
      await expect(geminiService.generateContent('超时测试')).rejects.toThrow('AI service timeout');
    });

    it('应该在超时后清理资源', async () => {
      // Arrange
      let cleanupCalled = false;
      mockGenerateContent.mockImplementation(() => 
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanupCalled = true;
            reject(new Error('Timeout'));
          }, 100);
          
          // 模拟清理逻辑
          return timeout;
        })
      );

      // Act
      try {
        await geminiService.generateContent('资源清理测试');
      } catch (error) {
        // Expected to timeout
      }

      // Assert
      await new Promise(resolve => setTimeout(resolve, 150)); // 等待清理
      expect(cleanupCalled).toBe(true);
    });
  });

  describe('缓存性能测试', () => {
    it('应该显著提高缓存命中的性能', async () => {
      // Arrange
      const cachedResponse = {
        content: '缓存响应',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        model: 'gemini-1.5-flash',
        cached: false
      };

      (redis as any).get.mockResolvedValue(JSON.stringify(cachedResponse));

      const startTime = performance.now();

      // Act
      await geminiService.generateContent('缓存性能测试');

      // Assert
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(10); // 缓存命中应该非常快
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('应该正确处理缓存未命中的性能', async () => {
      // Arrange
      (redis as any).get.mockResolvedValue(null);
      mockGenerateContent.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          response: {
            text: () => '未缓存响应'
          }
        }), 50))
      );

      const startTime = performance.now();

      // Act
      await geminiService.generateContent('缓存未命中测试');

      // Assert
      const duration = performance.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(50); // 应该包含生成时间
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('应该在缓存失败时不影响性能', async () => {
      // Arrange
      (redis as any).get.mockRejectedValue(new Error('Cache error'));
      (redis as any).setex.mockRejectedValue(new Error('Cache error'));
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '缓存失败响应'
        }
      });

      const startTime = performance.now();

      // Act
      const result = await geminiService.generateContent('缓存失败测试');

      // Assert
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 不应该因为缓存错误而显著延迟
      expect(result.content).toBe('缓存失败响应');
    });
  });

  describe('并发安全测试', () => {
    it('应该安全处理并发缓存访问', async () => {
      // Arrange
      let cacheAccessCount = 0;
      (redis as any).get.mockImplementation(() => {
        cacheAccessCount++;
        return Promise.resolve(null);
      });

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '并发缓存测试'
        }
      });

      // Act
      const concurrentRequests = 10;
      const samePrompt = '并发缓存测试';
      const promises = Array(concurrentRequests).fill(null).map(() => 
        geminiService.generateContent(samePrompt)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(cacheAccessCount).toBeGreaterThanOrEqual(concurrentRequests);
      
      results.forEach(result => {
        expect(result.content).toBe('并发缓存测试');
      });
    });

    it('应该防止竞态条件', async () => {
      // Arrange
      let generationCount = 0;
      mockGenerateContent.mockImplementation(() => {
        generationCount++;
        return new Promise(resolve => setTimeout(() => resolve({
          response: {
            text: () => `生成 ${generationCount}`
          }
        }), Math.random() * 100));
      });

      // Act
      const concurrentRequests = 5;
      const promises = Array(concurrentRequests).fill(null).map((_, index) => 
        geminiService.generateContent(`竞态测试 ${index}`)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(generationCount).toBe(concurrentRequests);
      
      // 每个结果应该是唯一的
      const contents = results.map(r => r.content);
      const uniqueContents = new Set(contents);
      expect(uniqueContents.size).toBe(concurrentRequests);
    });
  });

  describe('错误分类和处理测试', () => {
    it('应该正确分类和处理不同类型的错误', async () => {
      // Arrange
      const errorTypes = [
        { error: new Error('API_KEY_INVALID'), expectedMessage: 'Invalid API key configuration' },
        { error: new Error('QUOTA_EXCEEDED'), expectedMessage: 'API quota exceeded' },
        { error: new Error('timeout occurred'), expectedMessage: 'AI service timeout' },
        { error: new Error('Unknown error'), expectedMessage: 'Unknown error' },
      ];

      for (const { error, expectedMessage } of errorTypes) {
        mockGenerateContent.mockRejectedValueOnce(error);

        // Act & Assert
        await expect(geminiService.generateContent('错误分类测试')).rejects.toThrow(expectedMessage);
      }
    });

    it('应该记录详细的错误信息', async () => {
      // Arrange
      const testError = new Error('详细错误测试');
      testError.stack = 'Error stack trace';
      mockGenerateContent.mockRejectedValue(testError);

      // Act
      try {
        await geminiService.generateContent('错误记录测试');
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'AI generation failed',
        expect.objectContaining({
          error: '详细错误测试',
          model: 'gemini-1.5-flash',
          duration: expect.any(Number)
        })
      );
    });

    it('应该处理非Error对象的异常', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue('字符串错误');

      // Act & Assert
      await expect(geminiService.generateContent('非Error对象测试')).rejects.toThrow('Unknown AI service error');
    });
  });

  describe('健康检查性能测试', () => {
    it('应该快速完成健康检查', async () => {
      // Arrange
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'OK'
        }
      });

      const startTime = performance.now();

      // Act
      const isHealthy = await geminiService.healthCheck();

      // Assert
      const duration = performance.now() - startTime;
      expect(isHealthy).toBe(true);
      expect(duration).toBeLessThan(50); // 健康检查应该很快
    });

    it('应该在健康检查失败时快速返回', async () => {
      // Arrange
      mockGenerateContent.mockRejectedValue(new Error('Health check failed'));

      const startTime = performance.now();

      // Act
      const isHealthy = await geminiService.healthCheck();

      // Assert
      const duration = performance.now() - startTime;
      expect(isHealthy).toBe(false);
      expect(duration).toBeLessThan(100); // 即使失败也应该快速返回
    });
  });

  describe('提示词模板性能测试', () => {
    it('应该快速生成提示词', () => {
      // Arrange
      const context = {
        knowledgePoint: '性能测试知识点',
        subject: '数学',
        gradeLevel: '高中',
        difficulty: 'medium' as const
      };

      const startTime = performance.now();

      // Act
      for (let i = 0; i < 1000; i++) {
        generatePrompt('concept', context);
      }

      // Assert
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 1000次生成应该在100ms内完成
    });

    it('应该快速验证内容', () => {
      // Arrange
      const content = `
## 📚 概念定义
测试概念定义

## 🔍 关键特征
1. 特征一
2. 特征二

## 💡 重要性
重要性说明

## 🌟 记忆要点
记忆要点
      `;

      const startTime = performance.now();

      // Act
      for (let i = 0; i < 1000; i++) {
        validateCardContent('concept', content);
      }

      // Assert
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 1000次验证应该在100ms内完成
    });
  });
});