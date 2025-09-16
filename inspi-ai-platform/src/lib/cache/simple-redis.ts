/**
 * 增强的Redis客户端
 * 提供Redis缓存和内存缓存fallback机制
 */

import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';
import { env } from '@/config/environment';

interface CacheItem {
  value: string;
  expiry?: number;
}

class EnhancedRedisManager {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryCache = new Map<string, CacheItem>();
  private maxMemoryCacheSize = 1000;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  constructor() {
    this.setupClient();
    this.startMemoryCacheCleanup();
  }

  private async setupClient(): Promise<void> {
    try {
      const redisUrl = env.REDIS?.URL || process.env.REDIS_URL;
      
      // 在开发环境中，如果没有Redis URL，使用内存缓存
      if (!redisUrl) {
        logger.info('Redis URL not configured, using memory cache fallback');
        return;
      }

      this.connectionAttempts++;
      
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: env.REDIS?.RETRY_DELAY || 1000,
        enableReadyCheck: true,
        maxRetriesPerRequest: env.REDIS?.MAX_RETRIES || 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
        password: env.REDIS?.PASSWORD || undefined,
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('Redis ready for operations');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.warn('Redis connection error', { 
          error: error.message,
          attempt: this.connectionAttempts 
        });
        this.isConnected = false;
        
        // 如果连接失败次数过多，停止重试
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          logger.warn('Max Redis connection attempts reached, falling back to memory cache');
          this.client?.disconnect();
          this.client = null;
        }
      });

      this.client.on('close', () => {
        logger.info('Redis connection closed');
        this.isConnected = false;
      });

      // 尝试连接
      await this.client.connect();

    } catch (error) {
      logger.error('Failed to setup Redis client', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: this.connectionAttempts 
      });
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        logger.info('Falling back to memory cache');
        this.client = null;
      }
    }
  }

  /**
   * 启动内存缓存清理定时器
   */
  private startMemoryCacheCleanup(): void {
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期的内存缓存项
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry && item.expiry < now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }
    
    // 如果缓存项过多，删除最旧的项
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      const keysToDelete = Array.from(this.memoryCache.keys())
        .slice(0, this.memoryCache.size - this.maxMemoryCacheSize);
      
      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        cleanedCount++;
      });
    }
    
    if (cleanedCount > 0) {
      logger.debug('Memory cache cleanup completed', { 
        cleanedItems: cleanedCount,
        remainingItems: this.memoryCache.size 
      });
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  isUsingMemoryFallback(): boolean {
    return !this.isReady();
  }

  async get(key: string): Promise<string | null> {
    // 优先尝试Redis
    if (this.isReady()) {
      try {
        const result = await this.client!.get(key);
        return result;
      } catch (error) {
        logger.warn('Redis GET error, falling back to memory cache', { 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Fallback到内存缓存
    const item = this.memoryCache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (item.expiry && item.expiry < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    // 优先尝试Redis
    if (this.isReady()) {
      try {
        if (ttl && ttl > 0) {
          await this.client!.setex(key, ttl, value);
        } else {
          await this.client!.set(key, value);
        }
        return;
      } catch (error) {
        logger.warn('Redis SET error, falling back to memory cache', { 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Fallback到内存缓存
    const item: CacheItem = {
      value,
      expiry: ttl ? Date.now() + (ttl * 1000) : undefined
    };
    
    this.memoryCache.set(key, item);
    
    // 如果缓存过大，立即清理
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      this.cleanupMemoryCache();
    }
  }

  async del(key: string): Promise<void> {
    // 优先尝试Redis
    if (this.isReady()) {
      try {
        await this.client!.del(key);
      } catch (error) {
        logger.warn('Redis DEL error', { 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // 同时从内存缓存删除
    this.memoryCache.delete(key);
  }

  async increment(key: string, options?: { ttl?: number }): Promise<number> {
    // 优先尝试Redis
    if (this.isReady()) {
      try {
        const result = await this.client!.incr(key);
        if (options?.ttl) {
          await this.client!.expire(key, options.ttl);
        }
        return result;
      } catch (error) {
        logger.warn('Redis INCR error, falling back to memory cache', { 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Fallback到内存缓存
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    await this.set(key, newValue, options?.ttl);
    return parseInt(newValue, 10);
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.isReady()) {
        await this.client!.ping();
        return true;
      }
      
      // 内存缓存总是可用的
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  getStatus(): {
    redis: {
      connected: boolean;
      status: string;
      connectionAttempts: number;
    };
    memoryCache: {
      size: number;
      maxSize: number;
      isActive: boolean;
    };
  } {
    return {
      redis: {
        connected: this.isConnected,
        status: this.client?.status || 'disconnected',
        connectionAttempts: this.connectionAttempts,
      },
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: this.maxMemoryCacheSize,
        isActive: !this.isReady(),
      },
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        logger.warn('Error during Redis disconnect', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      this.client = null;
      this.isConnected = false;
    }
    
    // 清空内存缓存
    this.memoryCache.clear();
    logger.info('Redis manager disconnected and memory cache cleared');
  }
}

export const redisManager = new EnhancedRedisManager();
export const redis = redisManager; // 向后兼容
export default redisManager;