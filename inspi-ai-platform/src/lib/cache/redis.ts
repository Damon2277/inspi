/**
 * Redis客户端和连接管理
 */
import Redis, { Cluster } from 'ioredis';
import { logger } from '@/lib/logging/logger';
import { DEFAULT_CACHE_CONFIG, RedisConfig, CacheEvent, CacheEventType, CacheLayer } from './config';
import { EventEmitter } from 'events';

/**
 * Redis客户端管理器
 */
export class RedisManager extends EventEmitter {
  private client: Redis | Cluster | null = null;
  private config: RedisConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0,
    errors: 0
  };

  constructor(config?: RedisConfig) {
    super();
    this.config = config || DEFAULT_CACHE_CONFIG.redis;
    this.setupClient();
  }

  /**
   * 设置Redis客户端
   */
  private setupClient(): void {
    try {
      if (this.config.cluster?.enabled) {
        // 集群模式
        this.client = new Cluster(this.config.cluster.nodes, {
          redisOptions: {
            password: this.config.password,
            connectTimeout: this.config.options.connectTimeout,
            lazyConnect: this.config.options.lazyConnect,
            maxRetriesPerRequest: this.config.options.maxRetriesPerRequest,
            retryDelayOnFailover: this.config.options.retryDelayOnFailover
          }
        });
      } else if (this.config.sentinel?.enabled) {
        // 哨兵模式
        this.client = new Redis({
          sentinels: this.config.sentinel.sentinels,
          name: this.config.sentinel.name,
          password: this.config.password,
          db: this.config.db,
          connectTimeout: this.config.options.connectTimeout,
          lazyConnect: this.config.options.lazyConnect,
          maxRetriesPerRequest: this.config.options.maxRetriesPerRequest,
          retryDelayOnFailover: this.config.options.retryDelayOnFailover
        });
      } else {
        // 单机模式
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          connectTimeout: this.config.options.connectTimeout,
          lazyConnect: this.config.options.lazyConnect,
          maxRetriesPerRequest: this.config.options.maxRetriesPerRequest,
          retryDelayOnFailover: this.config.options.retryDelayOnFailover
        });
      }

      this.setupEventHandlers();
    } catch (error) {
      logger.error('Failed to setup Redis client', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.emit('ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', error);
      this.stats.errors++;
      this.emit('error', error);
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts})`);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnection attempts reached');
        this.client?.disconnect();
      }
    });
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      await this.client.connect();
      logger.info('Successfully connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  /**
   * 检查连接状态
   */
  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      this.stats.operations++;
      const value = await this.client!.get(key);
      
      if (value !== null) {
        this.stats.hits++;
        this.emitCacheEvent(CacheEventType.HIT, key);
      } else {
        this.stats.misses++;
        this.emitCacheEvent(CacheEventType.MISS, key);
      }

      return value;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis GET error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      this.stats.operations++;
      
      if (ttl && ttl > 0) {
        await this.client!.setex(key, ttl, value);
      } else {
        await this.client!.set(key, value);
      }

      this.emitCacheEvent(CacheEventType.SET, key, { ttl });
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis SET error', error instanceof Error ? error : new Error(String(error)), { key, ttl });
      throw error;
    }
  }

  /**
   * 删除键
   */
  async delete(key: string): Promise<number> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      this.stats.operations++;
      const result = await this.client!.del(key);
      
      if (result > 0) {
        this.emitCacheEvent(CacheEventType.DELETE, key);
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis DELETE error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  /**
   * 批量删除键
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client!.del(...keys);
      
      keys.forEach(key => {
        this.emitCacheEvent(CacheEventType.DELETE, key);
      });

      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis DELETE PATTERN error', error instanceof Error ? error : new Error(String(error)), { pattern });
      throw error;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      this.stats.operations++;
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis EXISTS error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  /**
   * 设置键的过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      this.stats.operations++;
      const result = await this.client!.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis EXPIRE error', error instanceof Error ? error : new Error(String(error)), { key, ttl });
      throw error;
    }
  }

  /**
   * 获取键的TTL
   */
  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      this.stats.operations++;
      return await this.client!.ttl(key);
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis TTL error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  /**
   * 清空数据库
   */
  async flushdb(): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      await this.client!.flushdb();
      this.emitCacheEvent(CacheEventType.CLEAR, '*');
      logger.info('Redis database flushed');
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis FLUSHDB error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 获取Redis信息
   */
  async info(section?: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Redis client not ready');
    }

    try {
      return await this.client!.info(section);
    } catch (error) {
      logger.error('Redis INFO error', error instanceof Error ? error : new Error(String(error)), { section });
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const hitRate = this.stats.operations > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      operations: 0,
      errors: 0
    };
  }

  /**
   * 发出缓存事件
   */
  private emitCacheEvent(type: CacheEventType, key: string, metadata?: Record<string, any>): void {
    const event: CacheEvent = {
      type,
      layer: CacheLayer.REDIS,
      key,
      timestamp: Date.now(),
      metadata
    };

    this.emit('cacheEvent', event);
  }

  /**
   * 获取Redis客户端实例（用于高级操作）
   */
  getClient(): Redis | Cluster | null {
    return this.client;
  }
}

/**
 * 默认Redis管理器实例
 */
export const redisManager = new RedisManager();

/**
 * Redis工具函数
 */
export class RedisUtils {
  /**
   * 序列化对象为JSON字符串
   */
  static serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Failed to serialize value', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Serialization failed');
    }
  }

  /**
   * 反序列化JSON字符串为对象
   */
  static deserialize<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Failed to deserialize value', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Deserialization failed');
    }
  }

  /**
   * 生成分布式锁键
   */
  static lockKey(resource: string): string {
    return `lock:${resource}`;
  }

  /**
   * 获取分布式锁
   */
  static async acquireLock(
    redis: RedisManager,
    resource: string,
    ttl: number = 10000,
    timeout: number = 5000
  ): Promise<string | null> {
    const lockKey = this.lockKey(resource);
    const lockValue = `${Date.now()}-${Math.random()}`;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await redis.getClient()?.set(lockKey, lockValue, 'PX', ttl, 'NX');
        if (result === 'OK') {
          return lockValue;
        }
      } catch (error) {
        logger.error('Failed to acquire lock', error instanceof Error ? error : new Error(String(error)), { resource });
      }

      // 等待一小段时间后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  }

  /**
   * 释放分布式锁
   */
  static async releaseLock(
    redis: RedisManager,
    resource: string,
    lockValue: string
  ): Promise<boolean> {
    const lockKey = this.lockKey(resource);
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redis.getClient()?.eval(script, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      logger.error('Failed to release lock', error instanceof Error ? error : new Error(String(error)), { resource });
      return false;
    }
  }
}

export default redisManager;