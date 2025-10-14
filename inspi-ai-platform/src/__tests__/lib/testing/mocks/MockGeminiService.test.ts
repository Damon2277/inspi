/**
 * MockGeminiService测试
 * 验证AI服务Mock的功能和一致性
 */

import { AIGenerationOptions } from '@/core/ai/geminiService';
import { MockGeminiService, MockAIResponse } from '@/lib/testing';

describe('MockGeminiService', () => {
  let mockService: MockGeminiService;

  beforeEach(() => {
    mockService = new MockGeminiService();
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      // Assert
      expect(mockService.name).toBe('GeminiService');
      expect(mockService.version).toBe('1.0.0');
      expect(mockService.isActive).toBe(true);
    });

    it('应该能够生成AI内容', async () => {
      // Arrange
      const prompt = 'Generate a test response';
      const options: AIGenerationOptions = {
        temperature: 0.7,
        maxTokens: 100,
      };

      // Act
      const result = await mockService.generateContent(prompt, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      expect(result.usage).toBeDefined();
      expect(result.model).toBe('gemini-pro-mock');
      expect(typeof result.cached).toBe('boolean');
    });

    it('应该能够执行健康检查', async () => {
      // Act
      const result = await mockService.healthCheck();

      // Assert
      expect(result).toBe(true);
    });

    it('应该能够获取服务状态', () => {
      // Act
      const status = mockService.getServiceStatus();

      // Assert
      expect(status.service).toBe('Gemini (Mock)');
      expect(status.model).toBe('gemini-pro-mock');
      expect(status.configured).toBe(true);
      expect(status.mockMode).toBe(true);
    });
  });

  describe('自定义响应设置', () => {
    it('应该能够设置特定提示词的响应', async () => {
      // Arrange
      const prompt = 'Custom prompt';
      const customResponse: MockAIResponse = {
        content: 'Custom response content',
        usage: {
          promptTokens: 5,
          completionTokens: 10,
          totalTokens: 15,
        },
      };

      // Act
      mockService.setPromptResponse(prompt, customResponse);
      const result = await mockService.generateContent(prompt);

      // Assert
      expect(result.content).toBe(customResponse.content);
      expect(result.usage).toEqual(customResponse.usage);
    });

    it('应该能够添加响应模式', async () => {
      // Arrange
      const pattern = /test.*pattern/i;
      const patternResponse: MockAIResponse = {
        content: 'Pattern matched response',
        usage: {
          promptTokens: 8,
          completionTokens: 12,
          totalTokens: 20,
        },
      };

      // Act
      mockService.addResponsePattern(pattern, patternResponse);
      const result = await mockService.generateContent('Test pattern matching');

      // Assert
      expect(result.content).toBe(patternResponse.content);
      expect(result.usage).toEqual(patternResponse.usage);
    });

    it('应该能够清除自定义响应', async () => {
      // Arrange
      const prompt = 'Custom prompt';
      const customResponse: MockAIResponse = {
        content: 'Custom response',
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
      };

      mockService.setPromptResponse(prompt, customResponse);

      // Act
      mockService.clearCustomResponses();
      const result = await mockService.generateContent(prompt);

      // Assert
      expect(result.content).not.toBe(customResponse.content);
    });
  });

  describe('失败模拟', () => {
    it('应该能够设置失败率', async () => {
      // Arrange
      mockService.setFailureRate(1); // 100% 失败率

      // Act & Assert
      await expect(mockService.generateContent('test')).rejects.toThrow();
      await expect(mockService.healthCheck()).resolves.toBe(false);
    });

    it('应该能够模拟特定响应失败', async () => {
      // Arrange
      const failingResponse: MockAIResponse = {
        content: 'This should not be returned',
        shouldFail: true,
        errorMessage: 'Custom error message',
      };

      mockService.setPromptResponse('failing prompt', failingResponse);

      // Act & Assert
      await expect(mockService.generateContent('failing prompt'))
        .rejects.toThrow('Custom error message');
    });

    it('失败率为0时应该总是成功', async () => {
      // Arrange
      mockService.setFailureRate(0);

      // Act
      const results = await Promise.all([
        mockService.generateContent('test 1'),
        mockService.generateContent('test 2'),
        mockService.generateContent('test 3'),
        mockService.healthCheck(),
        mockService.healthCheck(),
      ]);

      // Assert
      results.slice(0, 3).forEach(result => {
        expect(result).toBeDefined();
        expect((result as any).content).toBeTruthy();
      });
      results.slice(3).forEach(result => {
        expect(result).toBe(true);
      });
    });
  });

  describe('延迟模拟', () => {
    it('应该能够设置默认延迟', async () => {
      // Arrange
      const delay = 200;
      mockService.setDefaultDelay(delay);

      // Act
      const startTime = Date.now();
      await mockService.generateContent('test');
      const endTime = Date.now();

      // Assert
      const actualDelay = endTime - startTime;
      expect(actualDelay).toBeGreaterThanOrEqual(delay);
      expect(actualDelay).toBeLessThan(delay * 3); // 允许一些变化
    });

    it('温度参数应该影响延迟', async () => {
      // Arrange
      mockService.setDefaultDelay(100);

      // Act
      const startTime1 = Date.now();
      await mockService.generateContent('test', { temperature: 0.1 });
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      await mockService.generateContent('test', { temperature: 1.0 });
      const endTime2 = Date.now();

      // Assert
      const lowTempDelay = endTime1 - startTime1;
      const highTempDelay = endTime2 - startTime2;
      expect(highTempDelay).toBeGreaterThan(lowTempDelay);
    });
  });

  describe('选项处理', () => {
    it('应该根据温度修改内容', async () => {
      // Act
      const highCreativityResult = await mockService.generateContent('test', { temperature: 0.9 });
      const conservativeResult = await mockService.generateContent('test', { temperature: 0.2 });

      // Assert
      expect(highCreativityResult.content).toContain('High creativity mode');
      expect(conservativeResult.content).toContain('Conservative mode');
    });

    it('应该根据最大令牌数限制内容长度', async () => {
      // Arrange
      const maxTokens = 10;

      // Act
      const result = await mockService.generateContent('test', { maxTokens });

      // Assert
      const expectedMaxLength = maxTokens * 4; // 粗略估算
      expect(result.content.length).toBeLessThanOrEqual(expectedMaxLength);
    });

    it('应该处理缓存选项', async () => {
      // Act
      const result1 = await mockService.generateContent('test', { useCache: true });
      const result2 = await mockService.generateContent('test', { useCache: false });

      // Assert
      expect(typeof result1.cached).toBe('boolean');
      expect(result2.cached).toBe(false);
    });
  });

  describe('默认响应匹配', () => {
    it('应该为卡片相关提示词返回卡片响应', async () => {
      // Act
      const result = await mockService.generateContent('Generate a teaching card');

      // Assert
      expect(result.content).toContain('Mock Teaching Card');
      const parsedContent = JSON.parse(result.content);
      expect(parsedContent.title).toBeDefined();
      expect(parsedContent.tags).toContain('mock');
    });

    it('应该为健康检查提示词返回简单响应', async () => {
      // Act
      const result = await mockService.generateContent('hello health check');

      // Assert
      expect(result.content).toBe('OK');
    });

    it('应该为未知提示词返回默认响应', async () => {
      // Act
      const result = await mockService.generateContent('unknown prompt');

      // Assert
      expect(result.content).toBe('This is a mock AI response.');
    });
  });

  describe('统计信息', () => {
    it('应该能够获取详细统计信息', async () => {
      // Arrange
      await mockService.generateContent('test 1');
      await mockService.generateContent('test 2');
      mockService.setFailureRate(0.3);

      // Act
      const stats = mockService.getStats();

      // Assert
      expect(stats.name).toBe('GeminiService');
      expect(stats.callCount).toBe(2);
      expect(stats.failureRate).toBe(0.3);
      expect(stats.defaultResponses).toBeGreaterThan(0);
      expect(stats.lastCalled).toBeInstanceOf(Date);
    });
  });

  describe('服务验证', () => {
    it('正常状态下验证应该成功', async () => {
      // Act
      const isValid = await mockService.verify();

      // Assert
      expect(isValid).toBe(true);
    });

    it('高失败率时验证应该失败', async () => {
      // Arrange
      mockService.setFailureRate(1);

      // Act
      const isValid = await mockService.verify();

      // Assert
      expect(isValid).toBe(false);
      const status = mockService.getStatus();
      expect(status.errors.length).toBeGreaterThan(0);
    });
  });

  describe('重置功能', () => {
    it('重置应该清除所有自定义设置', async () => {
      // Arrange
      mockService.setFailureRate(0.5);
      mockService.setDefaultDelay(500);
      mockService.setPromptResponse('test', { content: 'custom' });
      await mockService.generateContent('test'); // 增加调用计数

      // Act
      mockService.reset();

      // Assert
      const stats = mockService.getStats();
      expect(stats.callCount).toBe(0);
      expect(stats.failureRate).toBe(0);
      expect(stats.defaultDelay).toBe(100);
      expect(stats.customResponses).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });
  });

  describe('服务状态管理', () => {
    it('停用服务后应该抛出错误', async () => {
      // Arrange
      mockService.deactivate();

      // Act & Assert
      await expect(mockService.generateContent('test')).rejects.toThrow('not active');
      await expect(mockService.healthCheck()).rejects.toThrow('not active');
    });

    it('重新激活服务后应该正常工作', async () => {
      // Arrange
      mockService.deactivate();
      mockService.activate();

      // Act
      const result = await mockService.generateContent('test');

      // Assert
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });
  });
});
