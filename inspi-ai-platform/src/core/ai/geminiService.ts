/**
 * Gemini AI服务封装
 * 提供统一的AI服务接口，包含错误处理、重试机制和缓存
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

import { redisManager } from '@/lib/cache/simple-redis';
import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface AIGenerationResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  cached: boolean;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private defaultConfig: GenerationConfig;

  constructor() {
    if (!env.AI.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not configured, AI service will be unavailable');
      // 在开发环境中不抛出错误，允许应用继续运行
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('GEMINI_API_KEY is required');
      }
    }

    if (env.AI.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.AI.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({
        model: env.AI.DEFAULT_MODEL,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
    }

    this.defaultConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };
  }

  /**
   * 生成AI内容
   */
  async generateContent(
    prompt: string,
    options: AIGenerationOptions = {},
  ): Promise<AIGenerationResult> {
    const startTime = Date.now();

    // 检查API密钥是否配置
    if (!env.AI.GEMINI_API_KEY || !this.genAI) {
      throw new Error('AI service not configured');
    }

    const cacheKey = options.cacheKey || this.generateCacheKey(prompt, options);

    try {
      // 检查缓存
      if (options.useCache !== false) {
        const cached = await this.getCachedResult(cacheKey);
        if (cached) {
          logger.info('AI generation cache hit', { cacheKey, duration: Date.now() - startTime });
          return { ...cached, cached: true };
        }
      }

      // 配置生成参数
      const config: GenerationConfig = {
        ...this.defaultConfig,
        temperature: options.temperature ?? this.defaultConfig.temperature,
        topK: options.topK ?? this.defaultConfig.topK,
        topP: options.topP ?? this.defaultConfig.topP,
        maxOutputTokens: options.maxTokens ?? this.defaultConfig.maxOutputTokens,
      };

      // 生成内容
      const result = await this.generateWithRetry(prompt, config);

      const aiResult: AIGenerationResult = {
        content: result.content,
        usage: result.usage,
        model: env.AI.DEFAULT_MODEL,
        cached: false,
      };

      // 缓存结果
      if (options.useCache !== false) {
        await this.cacheResult(cacheKey, aiResult, options.cacheTTL);
      }

      const duration = Date.now() - startTime;
      logger.info('AI generation completed', {
        model: env.AI.DEFAULT_MODEL,
        duration,
        tokens: result.usage?.totalTokens,
        cached: false,
      });

      return aiResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('AI generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        model: env.AI.DEFAULT_MODEL,
      });
      throw this.handleError(error);
    }
  }

  /**
   * 带重试机制的生成
   */
  private async generateWithRetry(
    prompt: string,
    config: GenerationConfig,
    retries = env.AI.MAX_RETRIES,
  ): Promise<{ content: string; usage?: any }> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: env.AI.DEFAULT_MODEL,
          generationConfig: config,
        });

        const result = await Promise.race([
          model.generateContent(prompt),
          this.createTimeoutPromise(env.AI.SERVICE_TIMEOUT),
        ]);

        const response = await result.response;
        const content = response.text();

        if (!content || content.trim().length === 0) {
          throw new Error('Empty response from AI service');
        }

        return {
          content: content.trim(),
          usage: {
            promptTokens: 0, // Gemini doesn't provide detailed token usage
            completionTokens: 0,
            totalTokens: 0,
          },
        };

      } catch (error) {
        logger.warn(`AI generation attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt,
          maxRetries: retries,
        });

        if (attempt === retries) {
          throw error;
        }

        // 指数退避
        const delay = env.AI.RETRY_DELAY * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw new Error('All retry attempts failed');
  }

  /**
   * 创建超时Promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI service timeout')), timeout);
    });
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(prompt: string, options: AIGenerationOptions): string {
    const hash = this.simpleHash(prompt + JSON.stringify(options));
    return `ai:gemini:${hash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取缓存结果
   */
  private async getCachedResult(cacheKey: string): Promise<AIGenerationResult | null> {
    try {
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to get cached AI result', { error, cacheKey });
    }
    return null;
  }

  /**
   * 缓存结果
   */
  private async cacheResult(
    cacheKey: string,
    result: AIGenerationResult,
    ttl = env.CACHE.TTL,
  ): Promise<void> {
    try {
      await redisManager.set(cacheKey, JSON.stringify(result), ttl);
    } catch (error) {
      logger.warn('Failed to cache AI result', { error, cacheKey });
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      // 处理特定的Gemini错误
      if (error.message.includes('API_KEY')) {
        return new Error('Invalid API key configuration');
      }
      if (error.message.includes('QUOTA_EXCEEDED')) {
        return new Error('API quota exceeded');
      }
      if (error.message.includes('timeout')) {
        return new Error('AI service timeout');
      }
      return error;
    }
    return new Error('Unknown AI service error');
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 如果API密钥未配置，返回false
      if (!env.AI.GEMINI_API_KEY || !this.genAI) {
        return false;
      }

      // 使用更短的超时时间进行健康检查
      const result = await Promise.race([
        this.generateContent('Test', {
          useCache: false,
          maxTokens: 5,
        }),
        this.createTimeoutPromise(5000), // 5秒超时
      ]);

      return result.content.length > 0;
    } catch (error) {
      logger.warn('AI service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      service: 'Gemini',
      model: env.AI.DEFAULT_MODEL,
      configured: !!env.AI.GEMINI_API_KEY,
      timeout: env.AI.SERVICE_TIMEOUT,
      maxRetries: env.AI.MAX_RETRIES,
    };
  }
}

// 单例实例
export const geminiService = new GeminiService();
