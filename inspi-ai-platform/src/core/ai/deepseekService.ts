import type { AIGenerationOptions, AIGenerationResult } from '@/core/ai/geminiService';
import { redisManager } from '@/lib/cache/simple-redis';
import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

interface DeepSeekUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export class DeepSeekService {
  private baseUrl: string;

  private apiKey: string;

  private defaultModel: string;

  private lastHealthyAt = 0;

  private readonly healthCheckCacheMs = 60_000;

  constructor() {
    this.baseUrl = `${env.AI.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com'}/v1`;
    this.apiKey = env.AI.DEEPSEEK_API_KEY;
    this.defaultModel = env.AI.DEEPSEEK_MODEL ?? 'deepseek-chat';

    if (!this.apiKey) {
      const preferred = (env.AI.PROVIDER || '').toLowerCase();
      logger.warn('DEEPSEEK_API_KEY not configured, DeepSeek-specific features will be disabled');
      if (preferred === 'deepseek') {
        logger.warn('AI_PROVIDER is set to DeepSeek but no API key is configured; the system will fall back to other providers or mock mode.');
      }
    }
  }

  async generateContent(prompt: string, options: AIGenerationOptions = {}): Promise<AIGenerationResult> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const startTime = Date.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(prompt, options);

    if (options.useCache !== false) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        logger.info('DeepSeek generation cache hit', { cacheKey, duration: Date.now() - startTime });
        return { ...cached, cached: true };
      }
    }

    try {
      const response = await this.generateWithRetry(prompt, options);

      if (options.useCache !== false) {
        await this.cacheResult(cacheKey, response, options.cacheTTL);
      }

      return response;
    } catch (error) {
      logger.error('DeepSeek generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      throw this.handleError(error);
    }
  }

  private async generateWithRetry(
    prompt: string,
    options: AIGenerationOptions,
    retries = env.AI.MAX_RETRIES,
  ): Promise<AIGenerationResult> {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const payload = {
          model: this.defaultModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
          top_p: options.topP ?? 0.95,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), env.AI.SERVICE_TIMEOUT);

        try {
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
          }

          const result = await response.json();
          const content = result?.choices?.[0]?.message?.content;

          if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('Empty response from DeepSeek service');
          }

          const usage: DeepSeekUsage | undefined = result?.usage;

          return {
            content: content.trim(),
            usage: usage
              ? {
                  promptTokens: usage.prompt_tokens ?? 0,
                  completionTokens: usage.completion_tokens ?? 0,
                  totalTokens: usage.total_tokens ?? 0,
                }
              : undefined,
            model: this.defaultModel,
            cached: false,
          };
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        logger.warn('DeepSeek generation attempt failed', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        if (attempt === retries) {
          throw error;
        }

        await this.sleep(env.AI.RETRY_DELAY * Math.pow(2, attempt - 1));
      }
    }

    throw new Error('All retry attempts failed');
  }

  private generateCacheKey(prompt: string, options: AIGenerationOptions): string {
    const hash = this.simpleHash(`${prompt}:${JSON.stringify(options)}`);
    return `ai:deepseek:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return Math.abs(hash).toString(36);
  }

  private async getCachedResult(cacheKey: string): Promise<AIGenerationResult | null> {
    try {
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to get cached DeepSeek result', { error, cacheKey });
    }
    return null;
  }

  private async cacheResult(
    cacheKey: string,
    result: AIGenerationResult,
    ttl = env.CACHE.TTL,
  ): Promise<void> {
    try {
      await redisManager.set(cacheKey, JSON.stringify(result), ttl);
    } catch (error) {
      logger.warn('Failed to cache DeepSeek result', { error, cacheKey });
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error('AI service timeout');
      }
      if (error.message.includes('401')) {
        return new Error('Invalid DeepSeek API key');
      }
      if (error.message.includes('429')) {
        return new Error('DeepSeek rate limit exceeded');
      }
      return error;
    }
    return new Error('Unknown AI service error');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastHealthyAt < this.healthCheckCacheMs) {
      return true;
    }

    try {
      const result = await this.generateWithRetry('Health check', { useCache: false, maxTokens: 16 }, 1);
      if (result.content.length > 0) {
        this.lastHealthyAt = Date.now();
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('DeepSeek health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  getStatus() {
    return {
      service: 'DeepSeek',
      model: this.defaultModel,
      configured: !!this.apiKey,
      timeout: env.AI.SERVICE_TIMEOUT,
      maxRetries: env.AI.MAX_RETRIES,
    };
  }
}

export const deepSeekService = new DeepSeekService();
