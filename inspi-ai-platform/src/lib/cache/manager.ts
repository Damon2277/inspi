/**
 * 多层缓存管理器
 */
import NodeCache from 'node-cache';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logging/logger';
import { RedisManager } from './redis';
import { 
  CacheConfig, 
  CacheLayer, 
  CacheStrategyConfig, 
  CacheEvent, 
  CacheEventType, 
  CacheStats,
  DEFAULT_CACHE_CONFIG 
} from './config';

/**
 * 缓存项接口
 */
export interface CacheItem<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  layer: CacheLayer;
  hits: number;
}

/**
 * 缓存操作选项
 */
export interface CacheOptions {
  ttl?: number;
  layers?: CacheLayer[];
  skipMemory?: boolean;
  skipRedis?: boolean;
  forceRefresh?: boolean;
}

/**
 * 多层缓存管理器
 */
export class CacheManager extends EventEmitter {
  private memoryCache: NodeCache;
  private redisManager: RedisManager;
  private config: CacheConfig;
  private stats = {
    memory: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    },
    redis: {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    },
    operations: 0
  };

  constructor(config?: CacheConfig) {
    super();
    this.config = config || DEFAULT_CACHE_CONFIG;
    this.setupMemoryCache();
    this.setupRedisManager();
  }

  /**
   * 设置内存缓存
   */
  private setupMemoryCache(): void {
    this.memoryCache = new NodeCache({
      stdTTL: this.config.memory.ttl,
      checkperiod: this.config.memory.checkPeriod,
      maxKeys: this.config.memory.maxSize,
      useClones: false, // 提高性能，但需要注意对象引用
      deleteOnExpire: true
    });

    // 监听内存缓存事件
    this.memoryCache.on('set', (key, value) => {
      this.stats.memory.sets++;
      this.stats.memory.size = this.memoryCache.keys().length;
      this.emitCacheEvent(CacheEventType.SET, CacheLayer.MEMORY, key);
    });

    this.memoryCache.on('del', (key, value) => {
      this.stats.memory.deletes++;
      this.stats.memory.size = this.memoryCache.keys().length;
      this.emitCacheEvent(CacheEventType.DELETE, CacheLayer.MEMORY, key);
    });

    this.memoryCache.on('expired', (key, value) => {
      this.stats.memory.size = this.memoryCache.keys().length;
      this.emitCacheEvent(CacheEventType.EXPIRE, CacheLayer.MEMORY, key);
    });
  }

  /**
   * 设置Redis管理器
   */
  private setupRedisManager(): void {
    this.redisManager = new RedisManager(this.config.redis);
    
    // 监听Redis事件
    this.redisManager.on('cacheEvent', (event: CacheEvent) => {
      if (event.type === CacheEventType.HIT) {
        this.stats.redis.hits++;
      } else if (event.type === CacheEventType.MISS) {
        this.stats.redis.misses++;
      } else if (event.type === CacheEventType.SET) {
        this.stats.redis.sets++;
      } else if (event.type === CacheEventType.DELETE) {
        this.stats.redis.deletes++;
      }
      
      this.emit('cacheEvent', event);
    });

    this.redisManager.on('error', (error) => {
      logger.error('Redis manager error', error);
      this.emit('error', error);
    });
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    this.stats.operations++;
    const layers = options.layers || [CacheLayer.MEMORY, CacheLayer.REDIS];

    // 强制刷新时跳过缓存
    if (options.forceRefresh) {
      return null;
    }

    // L1: 内存缓存
    if (layers.includes(CacheLayer.MEMORY) && !options.skipMemory) {
      const memoryValue = this.memoryCache.get<T>(key);
      if (memoryValue !== undefined) {
        this.stats.memory.hits++;
        this.emitCacheEvent(CacheEventType.HIT, CacheLayer.MEMORY, key);
        return memoryValue;
      } else {
        this.stats.memory.misses++;
        this.emitCacheEvent(CacheEventType.MISS, CacheLayer.MEMORY, key);
      }
    }

    // L2: Redis缓存
    if (layers.includes(CacheLayer.REDIS) && !options.skipRedis) {
      try {
        const redisValue = await this.redisManager.get(key);
        if (redisValue !== null) {
          const parsedValue = this.deserialize<T>(redisValue);
          
          // 回填到内存缓存
          if (layers.includes(CacheLayer.MEMORY) && !options.skipMemory) {
            const memoryTtl = options.ttl || this.config.memory.ttl;
            this.memoryCache.set(key, parsedValue, memoryTtl);
          }
          
          return parsedValue;
        }
      } catch (error) {
        logger.error('Redis get error', error instanceof Error ? error : new Error(String(error)), { key });
      }
    }

    return null;
  }

  /**
   * 设置缓存值
   */
  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    this.stats.operations++;
    const layers = options.layers || [CacheLayer.MEMORY, CacheLayer.REDIS];

    // L1: 内存缓存
    if (layers.includes(CacheLayer.MEMORY) && !options.skipMemory) {
      const memoryTtl = options.ttl || this.config.memory.ttl;
      this.memoryCache.set(key, value, memoryTtl);
    }

    // L2: Redis缓存
    if (layers.includes(CacheLayer.REDIS) && !options.skipRedis) {
      try {
        const serializedValue = this.serialize(value);
        const redisTtl = options.ttl || this.config.strategies.api.ttl.redis;
        await this.redisManager.set(key, serializedValue, redisTtl);
      } catch (error) {
        logger.error('Redis set error', error instanceof Error ? error : new Error(String(error)), { key });
      }
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    this.stats.operations++;
    const layers = options.layers || [CacheLayer.MEMORY, CacheLayer.REDIS];

    // L1: 内存缓存
    if (layers.includes(CacheLayer.MEMORY) && !options.skipMemory) {
      this.memoryCache.del(key);
    }

    // L2: Redis缓存
    if (layers.includes(CacheLayer.REDIS) && !options.skipRedis) {
      try {
        await this.redisManager.delete(key);
      } catch (error) {
        logger.error('Redis delete error', error instanceof Error ? error : new Error(String(error)), { key });
      }
    }
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<void> {
    const layers = options.layers || [CacheLayer.MEMORY, CacheLayer.REDIS];

    // L1: 内存缓存 - 获取所有键并过滤
    if (layers.includes(CacheLayer.MEMORY) && !options.skipMemory) {
      const keys = this.memoryCache.keys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const matchingKeys = keys.filter(key => regex.test(key));
      this.memoryCache.del(matchingKeys);
    }

    // L2: Redis缓存
    if (layers.includes(CacheLayer.REDIS) && !options.skipRedis) {
      try {
        await this.redisManager.deletePattern(pattern);
      } catch (error) {
        logger.error('Redis delete pattern error', error instanceof Error ? error : new Error(String(error)), { pattern });
      }
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const layers = options.layers || [CacheLayer.MEMORY, CacheLayer.REDIS];

    // L1: 内存缓存
    if (layers.includes(CacheLayer.MEMORY) && !options.skipMemory) {
      if (this.memoryCache.has(key)) {
        return true;
      }
    }

    // L2: Redis缓存
    if (layers.includes(CacheLayer.REDIS) && !options.skipRedis) {
      try {
        return await this.redisManager.exists(key);
      } catch (error) {
        logger.error('Redis exists error', error instanceof Error ? error : new Error(String(error)), { key });
      }
    }

    return false;
  }

  /**
   * 获取或设置缓存值（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // 先尝试获取缓存值
    const cachedValue = await this.get<T>(key, options);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 缓存未命中，执行工厂函数
    try {
      const value = await factory();
      
      // 设置缓存
      await this.set(key, value, options);
      
      return value;
    } catch (error) {
      logger.error('Factory function error in getOrSet', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.flushAll();
    
    // 清空Redis缓存
    try {
      await this.redisManager.flushdb();
    } catch (error) {
      logger.error('Redis clear error', error instanceof Error ? error : new Error(String(error)));
    }

    this.emitCacheEvent(CacheEventType.CLEAR, CacheLayer.MEMORY, '*');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const memoryStats = this.memoryCache.getStats();
    const redisStats = this.redisManager.getStats();

    const memoryHitRate = this.stats.memory.hits + this.stats.memory.misses > 0
      ? (this.stats.memory.hits / (this.stats.memory.hits + this.stats.memory.misses)) * 100
      : 0;

    const redisHitRate = redisStats.hitRate;

    const totalHits = this.stats.memory.hits + this.stats.redis.hits;
    const totalMisses = this.stats.memory.misses + this.stats.redis.misses;
    const overallHitRate = totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses)) * 100
      : 0;

    return {
      memory: {
        hits: this.stats.memory.hits,
        misses: this.stats.memory.misses,
        hitRate: Math.round(memoryHitRate * 100) / 100,
        size: this.stats.memory.size,
        maxSize: this.config.memory.maxSize,
        memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
      },
      redis: {
        hits: this.stats.redis.hits,
        misses: this.stats.redis.misses,
        hitRate: redisHitRate,
        size: this.stats.redis.size,
        memoryUsage: 0, // 需要从Redis INFO获取
        connections: redisStats.isConnected ? 1 : 0
      },
      overall: {
        totalHits,
        totalMisses,
        overallHitRate: Math.round(overallHitRate * 100) / 100,
        totalOperations: this.stats.operations
      }
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      memory: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0
      },
      redis: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0
      },
      operations: 0
    };

    this.redisManager.resetStats();
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    await this.redisManager.connect();
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    await this.redisManager.disconnect();
  }

  /**
   * 序列化值
   */
  private serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Serialization error', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to serialize cache value');
    }
  }

  /**
   * 反序列化值
   */
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Deserialization error', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to deserialize cache value');
    }
  }

  /**
   * 发出缓存事件
   */
  private emitCacheEvent(
    type: CacheEventType, 
    layer: CacheLayer, 
    key: string, 
    metadata?: Record<string, any>
  ): void {
    const event: CacheEvent = {
      type,
      layer,
      key,
      timestamp: Date.now(),
      metadata
    };

    this.emit('cacheEvent', event);
  }

  /**
   * 获取内存缓存实例
   */
  getMemoryCache(): NodeCache {
    return this.memoryCache;
  }

  /**
   * 获取Redis管理器实例
   */
  getRedisManager(): RedisManager {
    return this.redisManager;
  }
}

/**
 * 默认缓存管理器实例
 */
export const cacheManager = new CacheManager();

export default CacheManager;