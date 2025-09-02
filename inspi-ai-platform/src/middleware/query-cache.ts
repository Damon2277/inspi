/**
 * 查询缓存中间件
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';
import { CacheManager } from '@/lib/cache/manager';

/**
 * 缓存配置
 */
export interface QueryCacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxCacheSize: number;
  cacheKeyPrefix: string;
  excludePatterns: RegExp[];
  includePatterns: RegExp[];
  varyHeaders: string[];
  compressionEnabled: boolean;
  compressionThreshold: number;
}

/**
 * 缓存元数据
 */
export interface CacheMetadata {
  key: string;
  ttl: number;
  timestamp: number;
  size: number;
  compressed: boolean;
  headers: Record<string, string>;
  userContext?: {
    userId?: string;
    sessionId?: string;
  };
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  compressionRatio: number;
}

/**
 * 查询缓存中间件类
 */
export class QueryCacheMiddleware {
  private cacheManager: CacheManager;
  private config: QueryCacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    compressionRatio: 0
  };

  constructor(cacheManager: CacheManager, config?: Partial<QueryCacheConfig>) {
    this.cacheManager = cacheManager;
    this.config = {
      enabled: true,
      defaultTTL: 300, // 5分钟
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      cacheKeyPrefix: 'query-cache:',
      excludePatterns: [
        /\/api\/auth\//,
        /\/api\/admin\//,
        /\/api\/user\/profile/
      ],
      includePatterns: [
        /\/api\/works/,
        /\/api\/rankings/,
        /\/api\/knowledge-graphs/
      ],
      varyHeaders: ['authorization', 'user-agent'],
      compressionEnabled: true,
      compressionThreshold: 1024, // 1KB
      ...config
    };
  }

  /**
   * 中间件处理函数
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    if (!this.config.enabled) {
      return null;
    }

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // 检查是否应该缓存此请求
      if (!this.shouldCache(request)) {
        return null;
      }

      // 生成缓存键
      const cacheKey = await this.generateCacheKey(request);
      
      // 尝试从缓存获取响应
      const cachedResponse = await this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        this.stats.hits++;
        this.updateHitRate();
        
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);

        logger.debug('Query cache hit', {
          cacheKey,
          responseTime,
          url: request.url
        });

        return this.createResponseFromCache(cachedResponse);
      }

      // 缓存未命中，返回null让请求继续处理
      this.stats.misses++;
      this.updateHitRate();

      return null;

    } catch (error) {
      logger.error('Query cache middleware error', error instanceof Error ? error : new Error(String(error)), {
        url: request.url
      });
      return null;
    }
  }

  /**
   * 缓存响应
   */
  async cacheResponse(
    request: NextRequest,
    response: NextResponse,
    customTTL?: number
  ): Promise<void> {
    if (!this.config.enabled || !this.shouldCache(request)) {
      return;
    }

    try {
      const cacheKey = await this.generateCacheKey(request);
      const ttl = customTTL || this.config.defaultTTL;

      // 检查响应是否可缓存
      if (!this.isResponseCacheable(response)) {
        return;
      }

      // 提取响应数据
      const responseData = await this.extractResponseData(response);
      
      // 压缩数据（如果启用且超过阈值）
      const { data, compressed } = await this.compressIfNeeded(responseData);

      // 创建缓存元数据
      const metadata: CacheMetadata = {
        key: cacheKey,
        ttl,
        timestamp: Date.now(),
        size: JSON.stringify(data).length,
        compressed,
        headers: this.extractCacheableHeaders(response),
        userContext: this.extractUserContext(request)
      };

      // 检查缓存大小限制
      if (metadata.size > this.config.maxCacheSize / 100) { // 单个缓存项不超过总大小的1%
        logger.warn('Response too large to cache', {
          cacheKey,
          size: metadata.size,
          maxSize: this.config.maxCacheSize / 100
        });
        return;
      }

      // 存储到缓存
      await this.cacheManager.set(cacheKey, {
        data,
        metadata
      }, { ttl });

      // 更新统计
      this.stats.cacheSize += metadata.size;
      if (compressed) {
        this.updateCompressionRatio(responseData, data);
      }

      logger.debug('Response cached', {
        cacheKey,
        size: metadata.size,
        compressed,
        ttl
      });

    } catch (error) {
      logger.error('Failed to cache response', error instanceof Error ? error : new Error(String(error)), {
        url: request.url
      });
    }
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<number> {
    try {
      let clearedCount = 0;

      if (pattern) {
        // 清除匹配模式的缓存
        const keys = await this.cacheManager.getKeys(`${this.config.cacheKeyPrefix}*`);
        const matchingKeys = keys.filter(key => new RegExp(pattern).test(key));
        
        for (const key of matchingKeys) {
          await this.cacheManager.delete(key);
          clearedCount++;
        }
      } else {
        // 清除所有查询缓存
        const keys = await this.cacheManager.getKeys(`${this.config.cacheKeyPrefix}*`);
        
        for (const key of keys) {
          await this.cacheManager.delete(key);
          clearedCount++;
        }
      }

      // 重置缓存大小统计
      if (!pattern) {
        this.stats.cacheSize = 0;
      }

      logger.info('Cache cleared', { pattern, clearedCount });
      return clearedCount;

    } catch (error) {
      logger.error('Failed to clear cache', error instanceof Error ? error : new Error(String(error)), { pattern });
      return 0;
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(urls: string[]): Promise<void> {
    logger.info('Starting cache warmup', { urlCount: urls.length });

    const warmupPromises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // 这里应该触发缓存存储，但由于是预热，我们只记录日志
          logger.debug('Cache warmup request completed', { url, status: response.status });
        }
      } catch (error) {
        logger.warn('Cache warmup request failed', { url, error: error instanceof Error ? error.message : String(error) });
      }
    });

    await Promise.allSettled(warmupPromises);
    logger.info('Cache warmup completed');
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      compressionRatio: 0
    };
  }

  /**
   * 检查是否应该缓存请求
   */
  private shouldCache(request: NextRequest): boolean {
    const url = request.url;
    const method = request.method;

    // 只缓存GET请求
    if (method !== 'GET') {
      return false;
    }

    // 检查排除模式
    if (this.config.excludePatterns.some(pattern => pattern.test(url))) {
      return false;
    }

    // 检查包含模式
    if (this.config.includePatterns.length > 0) {
      return this.config.includePatterns.some(pattern => pattern.test(url));
    }

    return true;
  }

  /**
   * 生成缓存键
   */
  private async generateCacheKey(request: NextRequest): Promise<string> {
    const url = new URL(request.url);
    const baseKey = `${url.pathname}${url.search}`;

    // 添加变化头信息
    const varyParts: string[] = [];
    for (const header of this.config.varyHeaders) {
      const value = request.headers.get(header);
      if (value) {
        varyParts.push(`${header}:${value}`);
      }
    }

    // 添加用户上下文（如果需要）
    const userContext = this.extractUserContext(request);
    if (userContext.userId) {
      varyParts.push(`user:${userContext.userId}`);
    }

    const varyString = varyParts.length > 0 ? `:${varyParts.join(':')}` : '';
    const fullKey = `${baseKey}${varyString}`;

    // 生成哈希以避免键过长
    const hash = await this.generateHash(fullKey);
    return `${this.config.cacheKeyPrefix}${hash}`;
  }

  /**
   * 从缓存获取响应
   */
  private async getCachedResponse(cacheKey: string): Promise<any | null> {
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (!cached) {
        return null;
      }

      const { data, metadata } = cached;

      // 检查是否过期
      if (Date.now() - metadata.timestamp > metadata.ttl * 1000) {
        await this.cacheManager.delete(cacheKey);
        return null;
      }

      // 解压缩数据（如果需要）
      const responseData = metadata.compressed 
        ? await this.decompress(data)
        : data;

      return {
        data: responseData,
        metadata
      };

    } catch (error) {
      logger.error('Failed to get cached response', error instanceof Error ? error : new Error(String(error)), { cacheKey });
      return null;
    }
  }

  /**
   * 从缓存创建响应
   */
  private createResponseFromCache(cachedResponse: any): NextResponse {
    const { data, metadata } = cachedResponse;

    const response = NextResponse.json(data);

    // 设置缓存头
    response.headers.set('X-Cache', 'HIT');
    response.headers.set('X-Cache-Key', metadata.key);
    response.headers.set('X-Cache-Timestamp', new Date(metadata.timestamp).toISOString());

    // 恢复原始头信息
    Object.entries(metadata.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * 检查响应是否可缓存
   */
  private isResponseCacheable(response: NextResponse): boolean {
    // 检查状态码
    if (response.status !== 200) {
      return false;
    }

    // 检查缓存控制头
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl && (
      cacheControl.includes('no-cache') ||
      cacheControl.includes('no-store') ||
      cacheControl.includes('private')
    )) {
      return false;
    }

    return true;
  }

  /**
   * 提取响应数据
   */
  private async extractResponseData(response: NextResponse): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('text/')) {
      return await response.text();
    } else {
      // 对于其他类型，返回buffer
      return await response.arrayBuffer();
    }
  }

  /**
   * 提取可缓存的头信息
   */
  private extractCacheableHeaders(response: NextResponse): Record<string, string> {
    const cacheableHeaders = [
      'content-type',
      'content-encoding',
      'etag',
      'last-modified'
    ];

    const headers: Record<string, string> = {};
    cacheableHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    return headers;
  }

  /**
   * 提取用户上下文
   */
  private extractUserContext(request: NextRequest): { userId?: string; sessionId?: string } {
    // 这里应该从JWT token或session中提取用户信息
    const authorization = request.headers.get('authorization');
    const sessionId = request.headers.get('x-session-id');

    return {
      userId: authorization ? 'user-from-token' : undefined, // 实际实现中应该解析JWT
      sessionId: sessionId || undefined
    };
  }

  /**
   * 压缩数据（如果需要）
   */
  private async compressIfNeeded(data: any): Promise<{ data: any; compressed: boolean }> {
    if (!this.config.compressionEnabled) {
      return { data, compressed: false };
    }

    const dataString = JSON.stringify(data);
    if (dataString.length < this.config.compressionThreshold) {
      return { data, compressed: false };
    }

    try {
      // 这里应该使用实际的压缩算法，如gzip
      // 为了简化，这里只是模拟压缩
      const compressed = Buffer.from(dataString).toString('base64');
      return { data: compressed, compressed: true };
    } catch (error) {
      logger.warn('Compression failed, using uncompressed data', { error: error instanceof Error ? error.message : String(error) });
      return { data, compressed: false };
    }
  }

  /**
   * 解压缩数据
   */
  private async decompress(compressedData: any): Promise<any> {
    try {
      // 这里应该使用实际的解压缩算法
      // 为了简化，这里只是模拟解压缩
      const decompressed = Buffer.from(compressedData, 'base64').toString();
      return JSON.parse(decompressed);
    } catch (error) {
      logger.error('Decompression failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 生成哈希
   */
  private async generateHash(input: string): Promise<string> {
    // 使用简单的哈希算法
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1);
    this.stats.averageResponseTime = (totalTime + responseTime) / this.stats.totalRequests;
  }

  /**
   * 更新压缩比率
   */
  private updateCompressionRatio(original: any, compressed: any): void {
    const originalSize = JSON.stringify(original).length;
    const compressedSize = JSON.stringify(compressed).length;
    const ratio = compressedSize / originalSize;
    
    // 更新平均压缩比率
    this.stats.compressionRatio = (this.stats.compressionRatio + ratio) / 2;
  }
}

/**
 * 创建查询缓存中间件实例
 */
export function createQueryCacheMiddleware(
  cacheManager: CacheManager,
  config?: Partial<QueryCacheConfig>
): QueryCacheMiddleware {
  return new QueryCacheMiddleware(cacheManager, config);
}

/**
 * Next.js中间件包装器
 */
export function withQueryCache(
  cacheManager: CacheManager,
  config?: Partial<QueryCacheConfig>
) {
  const middleware = createQueryCacheMiddleware(cacheManager, config);

  return async function queryCacheMiddleware(request: NextRequest) {
    // 尝试从缓存获取响应
    const cachedResponse = await middleware.handle(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 如果没有缓存，继续处理请求
    // 这里应该调用下一个中间件或路由处理器
    return NextResponse.next();
  };
}

export default QueryCacheMiddleware;