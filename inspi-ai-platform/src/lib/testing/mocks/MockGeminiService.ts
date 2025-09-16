/**
 * Gemini AI服务Mock实现
 * 提供AI服务的模拟功能，支持预设响应和智能回复
 */

import { BaseMockService } from './BaseMockService';
import { AIGenerationOptions, AIGenerationResult } from '@/lib/ai/geminiService';

export interface MockAIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  delay?: number;
  shouldFail?: boolean;
  errorMessage?: string;
}

export class MockGeminiService extends BaseMockService {
  private defaultResponses: Map<string, MockAIResponse> = new Map();
  private responsePatterns: Array<{ pattern: RegExp; response: MockAIResponse }> = [];
  private failureRate: number = 0;
  private defaultDelay: number = 100;

  constructor() {
    super('GeminiService', '1.0.0');
    this.setupDefaultResponses();
  }

  /**
   * 设置默认响应
   */
  private setupDefaultResponses(): void {
    // 通用响应
    this.defaultResponses.set('default', {
      content: 'This is a mock AI response.',
      usage: {
        promptTokens: 10,
        completionTokens: 8,
        totalTokens: 18
      }
    });

    // 卡片生成响应
    this.defaultResponses.set('card_generation', {
      content: JSON.stringify({
        title: 'Mock Teaching Card',
        content: 'This is a mock teaching card generated for testing purposes.',
        tags: ['mock', 'testing', 'ai'],
        difficulty: 'beginner',
        estimatedTime: '5 minutes'
      }),
      usage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150
      }
    });

    // 健康检查响应
    this.defaultResponses.set('health_check', {
      content: 'OK',
      usage: {
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2
      }
    });
  }

  /**
   * 生成AI内容 (Mock实现)
   */
  async generateContent(
    prompt: string,
    options: AIGenerationOptions = {}
  ): Promise<AIGenerationResult> {
    this.ensureActive();
    this.recordCall('generateContent', [prompt, options]);

    // 模拟失败
    if (this.shouldSimulateFailure()) {
      throw new Error('Mock AI service failure');
    }

    // 模拟延迟
    const delay = options.temperature ? this.defaultDelay * options.temperature : this.defaultDelay;
    await this.simulateDelay(delay, delay * 2);

    // 查找匹配的响应
    const response = this.findMatchingResponse(prompt);
    
    if (response.shouldFail) {
      throw new Error(response.errorMessage || 'Mock AI generation failed');
    }

    // 应用选项影响
    const modifiedContent = this.applyOptionsToContent(response.content, options);

    return {
      content: modifiedContent,
      usage: response.usage || {
        promptTokens: prompt.length / 4, // 粗略估算
        completionTokens: modifiedContent.length / 4,
        totalTokens: (prompt.length + modifiedContent.length) / 4
      },
      model: 'gemini-pro-mock',
      cached: options.useCache === true && Math.random() > 0.7 // 30% 缓存命中率
    };
  }

  /**
   * 健康检查 (Mock实现)
   */
  async healthCheck(): Promise<boolean> {
    this.ensureActive();
    this.recordCall('healthCheck');

    if (this.shouldSimulateFailure()) {
      return false;
    }

    await this.simulateDelay(10, 50);
    return true;
  }

  /**
   * 获取服务状态 (Mock实现)
   */
  getServiceStatus() {
    return {
      service: 'Gemini (Mock)',
      model: 'gemini-pro-mock',
      configured: true,
      timeout: 5000,
      maxRetries: 3,
      mockMode: true,
      failureRate: this.failureRate
    };
  }

  /**
   * 设置特定提示词的响应
   */
  setPromptResponse(prompt: string, response: MockAIResponse): void {
    const key = this.generateRequestKey('generateContent', [prompt]);
    this.setMockResponse(key, response);
  }

  /**
   * 设置响应模式
   */
  addResponsePattern(pattern: RegExp, response: MockAIResponse): void {
    this.responsePatterns.push({ pattern, response });
  }

  /**
   * 设置失败率 (0-1)
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * 设置默认延迟
   */
  setDefaultDelay(delay: number): void {
    this.defaultDelay = Math.max(0, delay);
  }

  /**
   * 清除所有自定义响应
   */
  clearCustomResponses(): void {
    this.responses.clear();
    this.responsePatterns = [];
  }

  /**
   * 查找匹配的响应
   */
  private findMatchingResponse(prompt: string): MockAIResponse {
    // 1. 检查精确匹配
    const exactKey = this.generateRequestKey('generateContent', [prompt]);
    if (this.hasMockResponse(exactKey)) {
      return this.getMockResponse(exactKey);
    }

    // 2. 检查模式匹配
    for (const { pattern, response } of this.responsePatterns) {
      if (pattern.test(prompt)) {
        return response;
      }
    }

    // 3. 检查关键词匹配
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('card') || lowerPrompt.includes('teaching')) {
      return this.defaultResponses.get('card_generation')!;
    }

    if (lowerPrompt.includes('hello') || lowerPrompt.includes('health')) {
      return this.defaultResponses.get('health_check')!;
    }

    // 4. 返回默认响应
    return this.defaultResponses.get('default')!;
  }

  /**
   * 根据选项修改内容
   */
  private applyOptionsToContent(content: string, options: AIGenerationOptions): string {
    let modifiedContent = content;

    // 温度影响创造性
    if (options.temperature !== undefined) {
      if (options.temperature > 0.8) {
        modifiedContent += ' (High creativity mode)';
      } else if (options.temperature < 0.3) {
        modifiedContent += ' (Conservative mode)';
      }
    }

    // 最大令牌数影响长度
    if (options.maxTokens && options.maxTokens < 100) {
      modifiedContent = modifiedContent.substring(0, options.maxTokens * 4);
    }

    return modifiedContent;
  }

  /**
   * 判断是否应该模拟失败
   */
  private shouldSimulateFailure(): boolean {
    return Math.random() < this.failureRate;
  }

  /**
   * 验证Mock服务状态
   */
  protected async onVerify(): Promise<boolean> {
    try {
      // 验证默认响应存在
      if (this.defaultResponses.size === 0) {
        this.addError('No default responses configured');
        return false;
      }

      // 验证基本功能
      const testResult = await this.generateContent('test prompt', { useCache: false });
      if (!testResult.content) {
        this.addError('Generated content is empty');
        return false;
      }

      // 验证健康检查
      const healthResult = await this.healthCheck();
      if (!healthResult) {
        this.addError('Health check failed');
        return false;
      }

      return true;
    } catch (error) {
      this.addError(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 重置时的自定义逻辑
   */
  protected onReset(): void {
    this.clearCustomResponses();
    this.setFailureRate(0);
    this.setDefaultDelay(100);
    this.setupDefaultResponses();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.getStatus(),
      defaultResponses: this.defaultResponses.size,
      customResponses: this.responses.size,
      responsePatterns: this.responsePatterns.length,
      failureRate: this.failureRate,
      defaultDelay: this.defaultDelay
    };
  }
}