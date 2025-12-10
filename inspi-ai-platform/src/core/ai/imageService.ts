import crypto from 'node:crypto';

import { redisManager } from '@/lib/cache/simple-redis';
import { env, isDevelopment } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

type SupportedImageProvider = 'openai' | 'deepseek' | 'doubao' | 'none';

export interface ImageGenerationOptions {
  size?: string;
  cacheKey?: string;
  cacheTTL?: number;
  stylePreset?: string;
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  prompt: string;
  provider: string;
  width?: number;
  height?: number;
  base64?: string;
}

const DEFAULT_CACHE_TTL = 60 * 60; // 1 hour

class ImageGenerationService {
  private readonly provider: SupportedImageProvider;

  private readonly apiKey: string;

  private readonly baseUrl: string;

  private readonly model: string;

  private readonly defaultSize: string;

  private readonly enableCache: boolean;

  private readonly stageSize: string;

  private readonly authHeader: string;

  private readonly responseFormat: string;

  private readonly watermarkEnabled: boolean;

  constructor() {
    this.provider = (env.AI.IMAGE_PROVIDER?.toLowerCase() as SupportedImageProvider) || 'none';
    this.apiKey = env.AI.IMAGE_API_KEY;
    this.baseUrl = env.AI.IMAGE_BASE_URL || 'https://api.openai.com/v1';
    this.model = env.AI.IMAGE_MODEL || 'dall-e-3';
    this.defaultSize = env.AI.IMAGE_DEFAULT_SIZE || '1024x1024';
    this.enableCache = env.AI.IMAGE_ENABLE_CACHE !== false;
    this.stageSize = env.AI.IMAGE_STAGE_SIZE || '512x512';
    this.authHeader = env.AI.IMAGE_API_KEY_HEADER || 'Authorization';
    this.responseFormat = env.AI.IMAGE_RESPONSE_FORMAT || 'b64_json';
    this.watermarkEnabled = env.AI.IMAGE_WATERMARK;

    if (this.provider !== 'none' && !this.apiKey) {
      logger.warn('AI image provider configured but API key is missing');
    }
  }

  public isEnabled(): boolean {
    return this.provider !== 'none' && !!this.apiKey;
  }

  public getStageImageSize(): string {
    return this.stageSize;
  }

  async generateHeroIllustration(
    prompt: string,
    options: ImageGenerationOptions = {},
  ): Promise<ImageGenerationResult | null> {
    if (!this.isEnabled()) {
      if (!isDevelopment) {
        logger.warn('Image generation requested but provider is disabled');
      }
      return null;
    }

    const size = options.size || this.defaultSize;
    const cacheKey = options.cacheKey || this.generateCacheKey(`${prompt}|neg:${options.negativePrompt || ''}`, size);

    if (this.enableCache) {
      const cached = await this.getCachedImage(cacheKey);
      if (cached) {
        return { ...cached, provider: this.provider, prompt, base64: undefined };
      }
    }

    let result: ImageGenerationResult | null = null;

    try {
      switch (this.provider) {
        case 'openai':
          result = await this.generateWithOpenAI(prompt, size, options);
          break;
        case 'deepseek':
          result = await this.generateWithDeepSeek(prompt, size, options);
          break;
        case 'doubao':
          result = await this.generateWithDoubao(prompt, size, options);
          break;
        default:
          logger.warn(`Unsupported image provider: ${this.provider}`);
          return null;
      }
    } catch (error) {
      logger.error('Image generation failed', {
        provider: this.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }

    if (!result) {
      return null;
    }

    if (this.enableCache) {
      await this.cacheImage(cacheKey, result, options.cacheTTL);
    }

    return result;
  }

  private async generateWithOpenAI(
    prompt: string,
    size: string,
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult | null> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/images/generations`;

    const requestBody: Record<string, unknown> = {
      model: this.model,
      prompt,
      n: 1,
      size,
      response_format: 'b64_json',
    };

    if (options.stylePreset) {
      requestBody.style = options.stylePreset;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI.SERVICE_TIMEOUT);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(true),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI image API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const imageData = data?.data?.[0];

      if (!imageData?.b64_json) {
        throw new Error('OpenAI image API returned empty payload');
      }

      const base64 = imageData.b64_json as string;
      const imageUrl = `data:image/png;base64,${base64}`;
      const [width, height] = this.parseSize(size);

      return {
        imageUrl,
        prompt,
        provider: 'openai',
        width,
        height,
        base64,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateWithDeepSeek(
    prompt: string,
    size: string,
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult | null> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/images/generations`;

    const payload: Record<string, unknown> = {
      model: this.model,
      prompt,
      size,
      n: 1,
      response_format: 'b64_json',
    };

    if (options.stylePreset) {
      payload.style = options.stylePreset;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI.SERVICE_TIMEOUT);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(true),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek image API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const imageData = data?.data?.[0];

      if (!imageData?.b64_json) {
        throw new Error('DeepSeek image API returned empty payload');
      }

      const base64 = imageData.b64_json as string;
      const imageUrl = `data:image/png;base64,${base64}`;
      const [width, height] = this.parseSize(size);

      return {
        imageUrl,
        prompt,
        provider: 'deepseek',
        width,
        height,
        base64,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateWithDoubao(
    prompt: string,
    size: string,
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult | null> {
    const normalizedBase = this.baseUrl.replace(/\/$/, '');
    const candidateEndpoints = [
      `${normalizedBase}/images/generations`,
      `${normalizedBase}/images/text-to-image`,
    ];

    const payloadSize = this.transformSize(size);

    const payload: Record<string, unknown> = {
      model: this.model || 'ep688805uhg9q2qco4',
      prompt,
      size: payloadSize,
      n: 1,
      response_format: this.responseFormat,
    };

    if (options.negativePrompt) {
      payload.negative_prompt = options.negativePrompt;
    }

    if (this.watermarkEnabled) {
      payload.watermark = true;
    }

    if (options.stylePreset) {
      payload.style = options.stylePreset;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI.SERVICE_TIMEOUT);

    try {
      for (const endpoint of candidateEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.buildHeaders(false),
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            logger.error('Doubao image API request failed', {
              status: response.status,
              endpoint,
              body: payload,
              response: errorText,
            });

            if (response.status === 404) {
              // 尝试下一个候选端点
              continue;
            }

            throw new Error(`Doubao image API error: ${response.status} ${errorText}`);
          }

          const data = await response.json();
          const imageData = data?.data?.[0];

          let imageUrl = typeof imageData?.url === 'string' ? imageData.url : undefined;
          let base64: string | undefined;

          if (!imageUrl) {
            base64 = imageData?.b64_json
              || imageData?.image_base64
              || data?.result?.image_base64?.[0]
              || data?.data?.[0]?.image_base64;

            if (!base64 || typeof base64 !== 'string') {
              throw new Error('Doubao image API returned empty payload');
            }

            imageUrl = base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
          }

          const [width, height] = this.parseSize(size);

          return {
            imageUrl,
            prompt,
            provider: 'doubao',
            width,
            height,
            base64,
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes('Doubao image API error: 404')) {
            continue;
          }
          throw error;
        }
      }

      throw new Error('Doubao image API error: no available endpoint responded successfully');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseSize(size: string): [number, number] {
    const normalized = size.trim().toLowerCase();
    if (normalized === '1k') {
      return [1024, 1024];
    }
    if (normalized === '2k') {
      return [2048, 2048];
    }
    if (normalized === '4k') {
      return [4096, 4096];
    }
    const match = size.match(/^(\d+)x(\d+)$/i);
    if (match) {
      const [, width, height] = match;
      return [Number(width), Number(height)];
    }
    return [1024, 1024];
  }

  private transformSize(size: string): string {
    const trimmed = size.trim().toLowerCase();
    if (['1k', '2k', '4k'].includes(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(/^(\d+)\s*[x*]\s*(\d+)$/);
    if (match) {
      return `${match[1]}x${match[2]}`;
    }

    return '1k';
  }

  private async getCachedImage(cacheKey: string): Promise<ImageGenerationResult | null> {
    try {
      const cached = await redisManager.get(cacheKey);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as ImageGenerationResult;
    } catch (error) {
      logger.warn('Failed to read cached image result', { cacheKey, error });
      return null;
    }
  }

  private async cacheImage(
    cacheKey: string,
    result: ImageGenerationResult,
    ttl: number = DEFAULT_CACHE_TTL,
  ): Promise<void> {
    try {
      await redisManager.set(cacheKey, JSON.stringify({ ...result, base64: undefined }), ttl);
    } catch (error) {
      logger.warn('Failed to cache image generation result', { cacheKey, error });
    }
  }

  private generateCacheKey(prompt: string, size: string): string {
    const hash = crypto.createHash('sha256').update(`${prompt}:${size}`).digest('hex');
    return `ai:image:${this.provider}:${hash}`;
  }

  private buildHeaders(expectBearer: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!this.apiKey) {
      return headers;
    }

    const headerName = this.authHeader || 'Authorization';
    if (headerName.toLowerCase() === 'authorization' || expectBearer) {
      headers[headerName] = this.apiKey.startsWith('Bearer ')
        ? this.apiKey
        : `Bearer ${this.apiKey}`;
    } else {
      headers[headerName] = this.apiKey;
    }

    return headers;
  }
}

export const imageService = new ImageGenerationService();
