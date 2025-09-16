/**
 * Redis缓存工具
 * 提供统一的缓存接口
 */

import { redisManager } from './simple-redis';
import { logger } from '@/lib/utils/logger';
import { env } from '@/config/environment';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

class RedisCache {
  private defaultTTL = env.CACHE.TTL;
  private defaultPrefix = 'inspi:';

  private getKey(key: string, prefix?: string): string {
    const actualPrefix = prefix || this.defaultPrefix;
    return `${actualPrefix}${key}`;
  }

  async get(key: string, options: CacheOptions = {}): Promise<string | null> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      const value = await redisManager.get(fullKey);
      
      if (value) {
        logger.debug('Cache hit', { key: fullKey });
      } else {
        logger.debug('Cache miss', { key: fullKey });
      }
      
      return value;
    } catch (error) {
      logger.warn('Cache get error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  async set(key: string, value: string, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      
      await redisManager.set(fullKey, value, ttl);
      
      logger.debug('Cache set', { key: fullKey, ttl });
    } catch (error) {
      logger.warn('Cache set error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async setex(key: string, ttl: number, value: string, options: CacheOptions = {}): Promise<void> {
    return this.set(key, value, { ...options, ttl });
  }

  async del(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.getKey(key, options.prefix);
      await redisManager.del(fullKey);
      
      logger.debug('Cache delete', { key: fullKey });
    } catch (error) {
      logger.warn('Cache delete error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async getJSON<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const value = await this.get(key, options);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      logger.warn('Cache getJSON error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.set(key, jsonValue, options);
    } catch (error) {
      logger.warn('Cache setJSON error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const value = await this.get(key, options);
      return value !== null;
    } catch (error) {
      logger.warn('Cache exists error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async increment(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const client = redisManager.getClient();
      if (!client || !redisManager.isReady()) {
        return 0;
      }

      const fullKey = this.getKey(key, options.prefix);
      const result = await client.incr(fullKey);
      
      // 设置过期时间
      if (options.ttl) {
        await client.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      logger.warn('Cache increment error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  async decrement(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const client = redisManager.getClient();
      if (!client || !redisManager.isReady()) {
        return 0;
      }

      const fullKey = this.getKey(key, options.prefix);
      const result = await client.decr(fullKey);
      
      return result;
    } catch (error) {
      logger.warn('Cache decrement error', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  isReady(): boolean {
    return redisManager.isReady();
  }

  getStatus() {
    return {
      connected: redisManager.isReady(),
      defaultTTL: this.defaultTTL,
      defaultPrefix: this.defaultPrefix,
    };
  }
}

// 单例实例
export const redis = new RedisCache();