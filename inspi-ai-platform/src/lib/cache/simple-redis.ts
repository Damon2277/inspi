import { createClient, RedisClientType } from 'redis';

import { env } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

type RedisClient = RedisClientType<any, any, any>

interface CacheItem {
  value: string
  expiry?: number
}

export interface SimpleRedisOptions {
  /** 自定义 Redis 连接 URL */
  url?: string | null
  /** 直接注入的 Redis client（测试友好） */
  client?: RedisClient | null
  /** 自定义 client 工厂，便于测试覆盖 */
  clientFactory?: () => RedisClient
  /** 是否启用内存兜底缓存 */
  enableMemoryFallback?: boolean
  /** 最大内存缓存数量 */
  maxMemoryItems?: number
}

const DEFAULT_MAX_MEMORY_ITEMS = 1000;

/**
 * 统一的 Redis 管理器
 * - 支持内存兜底
 * - 支持注入 mock client，方便测试
 */
export class SimpleRedis {
  private client: RedisClient | null = null;
  private connected = false;
  private readonly memoryCache = new Map<string, CacheItem>();
  private readonly enableMemoryFallback: boolean;
  private readonly maxMemoryItems: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: SimpleRedisOptions = {}) {
    this.enableMemoryFallback = options.enableMemoryFallback ?? true;
    this.maxMemoryItems = options.maxMemoryItems ?? DEFAULT_MAX_MEMORY_ITEMS;

    if (options.client) {
      this.client = options.client;
      this.connected = true;
      this.registerClientEvents(this.client);
    } else {
      const clientUrl = options.url ?? env.REDIS.URL ?? process.env.REDIS_URL ?? null;

      if (!clientUrl) {
        logger.info('Redis URL 未配置，使用内存缓存兜底');
        this.client = null;
      } else {
        try {
          const factory = options.clientFactory ?? (() => createClient({ url: clientUrl }));
          this.client = factory();

          this.registerClientEvents(this.client);

          if (typeof this.client.connect === 'function') {
            this.client
              .connect()
              .then(() => {
                this.connected = true;
                logger.info('Redis 连接成功');
              })
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                logger.warn('Redis 连接失败，使用内存缓存兜底', { error: message });
                this.connected = false;
                this.client = null;
              });
          } else {
            // 某些 mock client 不存在 connect 方法，默认视为已连接
            this.connected = true;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error('创建 Redis client 失败，使用内存缓存兜底', { error: message });
          this.client = null;
        }
      }
    }

    this.startMemoryCacheCleanup();
  }

  getClient(): RedisClient | null {
    return this.client;
  }

  isReady(): boolean {
    return this.connected && !!this.client;
  }

  async get(key: string): Promise<string | null> {
    if (this.isReady()) {
      try {
        const value = await this.client!.get(key);
        if (typeof value === 'string') {
          return value;
        }

        if (value !== null && value !== undefined) {
          return String(value);
        }
      } catch (error) {
        this.logWarn('Redis GET 失败，尝试内存缓存', key, error);
      }
    }

    if (!this.enableMemoryFallback) return null;

    const fallback = this.memoryCache.get(key);
    if (!fallback) return null;

    if (fallback.expiry && fallback.expiry < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return fallback.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (this.isReady()) {
      try {
        if (ttl && ttl > 0) {
          await this.setex(key, ttl, value);
          return;
        }
        await this.client!.set(key, value);
        return;
      } catch (error) {
        this.logWarn('Redis SET 失败，写入内存缓存', key, error);
      }
    }

    if (!this.enableMemoryFallback) return;

    const cacheItem: CacheItem = {
      value,
      expiry: ttl ? Date.now() + ttl * 1000 : undefined,
    };

    this.memoryCache.set(key, cacheItem);

    if (this.memoryCache.size > this.maxMemoryItems) {
      this.cleanupMemoryCache();
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (this.isReady()) {
      try {
        await this.client!.set(key, value, { EX: ttl });
        return;
      } catch (error) {
        this.logWarn('Redis SETEX 失败，写入内存缓存', key, error);
      }
    }

    if (!this.enableMemoryFallback) return;
    await this.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    if (this.isReady()) {
      try {
        await this.client!.del(key);
      } catch (error) {
        this.logWarn('Redis DEL 失败', key, error);
      }
    }

    if (this.enableMemoryFallback) {
      this.memoryCache.delete(key);
    }
  }

  async increment(key: string, options?: { ttl?: number }): Promise<number> {
    if (this.isReady()) {
      try {
        const value = await this.client!.incr(key);
        if (options?.ttl) {
          await this.client!.expire(key, options.ttl);
        }
        return value;
      } catch (error) {
        this.logWarn('Redis INCR 失败，使用内存缓存', key, error);
      }
    }

    if (!this.enableMemoryFallback) return 0;

    const current = Number(await this.get(key)) || 0;
    const next = current + 1;
    await this.set(key, String(next), options?.ttl);
    return next;
  }

  async decrement(key: string, options?: { ttl?: number }): Promise<number> {
    if (this.isReady()) {
      try {
        const value = await this.client!.decr(key);
        if (options?.ttl) {
          await this.client!.expire(key, options.ttl);
        }
        return value;
      } catch (error) {
        this.logWarn('Redis DECR 失败，使用内存缓存', key, error);
      }
    }

    if (!this.enableMemoryFallback) return 0;

    const current = Number(await this.get(key)) || 0;
    const next = current - 1;
    await this.set(key, String(next), options?.ttl);
    return next;
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.isReady()) {
      try {
        await this.client!.publish(channel, message);

      } catch (error) {
        this.logWarn('Redis PUBLISH 失败', channel, error);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Redis quit 失败', { error: message });
      }
    }

    this.client = null;
    this.connected = false;
    this.stopMemoryCleanup();
    this.memoryCache.clear();
  }

  async healthCheck(): Promise<boolean> {
    if (this.isReady()) {
      try {
        await this.client!.ping();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Redis health check 失败', { error: message });
        return false;
      }
    }

    // 没有 Redis 连接时，内存缓存视为可用
    return this.enableMemoryFallback;
  }

  getStatus() {
    return {
      redis: {
        connected: this.isReady(),
        status: this.client ? (this.connected ? 'ready' : 'connecting') : 'disconnected',
      },
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: this.maxMemoryItems,
        enabled: this.enableMemoryFallback,
      },
    };
  }

  private registerClientEvents(client: RedisClient) {
    if (typeof client.on !== 'function') return;

    client.on('ready', () => {
      this.connected = true;
    });

    client.on('connect', () => {
      this.connected = true;
    });

    client.on('end', () => {
      this.connected = false;
    });

    client.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : (typeof error === 'string' ? error : '');
      logger.warn('Redis 运行时错误', {
        error: message && message.trim().length > 0 ? message : 'Unknown runtime error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    });
  }

  private startMemoryCacheCleanup() {
    if (!this.enableMemoryFallback) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupMemoryCache();
    }, 60_000);

    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  private stopMemoryCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanupMemoryCache() {
    const now = Date.now();

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry && item.expiry < now) {
        this.memoryCache.delete(key);
      }
    }

    if (this.memoryCache.size <= this.maxMemoryItems) return;

    const overflow = this.memoryCache.size - this.maxMemoryItems;
    const keysToDelete = Array.from(this.memoryCache.keys()).slice(0, overflow);
    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  private logWarn(message: string, key: string, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(message, { key, error: errorMessage });
  }
}

export const redisManager = new SimpleRedis();
export const redis = redisManager;

export default redisManager;
