/**
 * 缓存策略管理
 * 实现多层缓存和智能缓存策略
 */

/**
 * 缓存配置接口
 */
interface CacheConfig {
  ttl: number; // 生存时间（秒）
  maxSize?: number; // 最大缓存大小
  strategy: 'LRU' | 'LFU' | 'FIFO' | 'TTL';
  compression?: boolean; // 是否压缩
  serialization?: 'json' | 'msgpack' | 'none';
}

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * 缓存统计接口
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  totalSize: number;
  itemCount: number;
}

/**
 * 内存缓存实现
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    totalSize: 0,
    itemCount: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 3600, // 1小时默认TTL
      maxSize: 100 * 1024 * 1024, // 100MB默认最大大小
      strategy: 'LRU',
      compression: false,
      serialization: 'json',
      ...config,
    };

    // 定期清理过期项
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateStats();
      return null;
    }

    // 更新访问信息
    item.accessCount++;
    item.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateHitRate();

    return item.value;
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T, ttl?: number): boolean {
    const itemTtl = ttl || this.config.ttl;
    const size = this.calculateSize(value);

    // 检查是否需要腾出空间
    if (this.config.maxSize && this.stats.totalSize + size > this.config.maxSize) {
      if (!this.evictItems(size)) {
        return false; // 无法腾出足够空间
      }
    }

    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl: itemTtl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    // 如果key已存在，先删除旧项
    if (this.cache.has(key)) {
      const oldItem = this.cache.get(key)!;
      this.stats.totalSize -= oldItem.size;
      this.stats.itemCount--;
    }

    this.cache.set(key, item);
    this.stats.sets++;
    this.stats.totalSize += size;
    this.stats.itemCount++;

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    this.cache.delete(key);
    this.stats.deletes++;
    this.stats.totalSize -= item.size;
    this.stats.itemCount--;

    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.itemCount = 0;
  }

  /**
   * 检查key是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item !== undefined && !this.isExpired(item);
  }

  /**
   * 获取所有keys
   */
  keys(): string[] {
    const validKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (!this.isExpired(item)) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 检查项是否过期
   */
  private isExpired(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > item.ttl * 1000;
  }

  /**
   * 计算值的大小
   */
  private calculateSize(value: T): number {
    if (this.config.serialization === 'none') {
      return 1; // 简单计数
    }

    try {
      const serialized = JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch {
      return 1;
    }
  }

  /**
   * 驱逐项目以腾出空间
   */
  private evictItems(requiredSize: number): boolean {
    const itemsToEvict: [string, CacheItem<T>][] = [];
    let freedSize = 0;

    // 根据策略选择要驱逐的项目
    switch (this.config.strategy) {
      case 'LRU':
        itemsToEvict.push(...this.getLRUItems());
        break;
      case 'LFU':
        itemsToEvict.push(...this.getLFUItems());
        break;
      case 'FIFO':
        itemsToEvict.push(...this.getFIFOItems());
        break;
      case 'TTL':
        itemsToEvict.push(...this.getTTLItems());
        break;
    }

    // 驱逐项目直到腾出足够空间
    for (const [key, item] of itemsToEvict) {
      this.cache.delete(key);
      freedSize += item.size;
      this.stats.evictions++;
      this.stats.totalSize -= item.size;
      this.stats.itemCount--;

      if (freedSize >= requiredSize) {
        break;
      }
    }

    return freedSize >= requiredSize;
  }

  /**
   * 获取LRU项目
   */
  private getLRUItems(): [string, CacheItem<T>][] {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
  }

  /**
   * 获取LFU项目
   */
  private getLFUItems(): [string, CacheItem<T>][] {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount);
  }

  /**
   * 获取FIFO项目
   */
  private getFIFOItems(): [string, CacheItem<T>][] {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
  }

  /**
   * 获取TTL项目（最快过期的优先）
   */
  private getTTLItems(): [string, CacheItem<T>][] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => {
        const aExpiry = a.timestamp + a.ttl * 1000;
        const bExpiry = b.timestamp + b.ttl * 1000;
        return aExpiry - bExpiry;
      });
  }

  /**
   * 清理过期项目
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      const item = this.cache.get(key)!;
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.totalSize -= item.size;
      this.stats.itemCount--;
    });
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.updateHitRate();
  }
}

/**
 * Redis缓存适配器
 */
export class RedisCache<T = any> {
  private client: any; // Redis客户端
  private config: CacheConfig;
  private keyPrefix: string;

  constructor(client: any, config: Partial<CacheConfig> = {}, keyPrefix = 'cache:') {
    this.client = client;
    this.keyPrefix = keyPrefix;
    this.config = {
      ttl: 3600,
      strategy: 'TTL',
      compression: true,
      serialization: 'json',
      ...config,
    };
  }

  /**
   * 获取缓存项
   */
  async get(key: string): Promise<T | null> {
    try {
      const fullKey = this.keyPrefix + key;
      const value = await this.client.get(fullKey);

      if (value === null) {
        return null;
      }

      return this.deserialize(value);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * 设置缓存项
   */
  async set(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      const serialized = this.serialize(value);
      const itemTtl = ttl || this.config.ttl;

      if (itemTtl > 0) {
        await this.client.setex(fullKey, itemTtl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * 检查key是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.keyPrefix + key;
      const result = await this.client.exists(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * 批量获取
   */
  async mget(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.keyPrefix + key);
      const values = await this.client.mget(fullKeys);

      return values.map((value: string | null) =>
        value ? this.deserialize(value) : null,
      );
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * 批量设置
   */
  async mset(items: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.client.pipeline();

      items.forEach(({ key, value, ttl }) => {
        const fullKey = this.keyPrefix + key;
        const serialized = this.serialize(value);
        const itemTtl = ttl || this.config.ttl;

        if (itemTtl > 0) {
          pipeline.setex(fullKey, itemTtl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }
      });

      await pipeline.exec() as any;
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }

  /**
   * 序列化值
   */
  private serialize(value: T): string {
    if (this.config.serialization === 'none') {
      return value as any;
    }

    return JSON.stringify(value);
  }

  /**
   * 反序列化值
   */
  private deserialize(value: string): T {
    if (this.config.serialization === 'none') {
      return value as any;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  }
}

/**
 * 多层缓存管理器
 */
export class MultiLevelCache<T = any> {
  private l1Cache: MemoryCache<T>; // L1: 内存缓存
  private l2Cache?: RedisCache<T>; // L2: Redis缓存
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    promotions: 0, // L2到L1的提升次数
  };

  constructor(
    l1Config?: Partial<CacheConfig>,
    l2Cache?: RedisCache<T>,
  ) {
    this.l1Cache = new MemoryCache<T>(l1Config);
    this.l2Cache = l2Cache;
  }

  /**
   * 获取缓存项
   */
  async get(key: string): Promise<T | null> {
    // 先尝试L1缓存
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== null) {
      this.stats.l1Hits++;
      return l1Value;
    }

    // 如果L1未命中，尝试L2缓存
    if (this.l2Cache) {
      const l2Value = await this.l2Cache.get(key);
      if (l2Value !== null) {
        this.stats.l2Hits++;
        this.stats.promotions++;

        // 将L2的值提升到L1
        this.l1Cache.set(key, l2Value);
        return l2Value;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存项
   */
  async set(key: string, value: T, ttl?: number): Promise<boolean> {
    // 同时设置L1和L2缓存
    const l1Success = this.l1Cache.set(key, value, ttl);

    let l2Success = true;
    if (this.l2Cache) {
      l2Success = await this.l2Cache.set(key, value, ttl);
    }

    return l1Success && l2Success;
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<boolean> {
    const l1Success = this.l1Cache.delete(key);

    let l2Success = true;
    if (this.l2Cache) {
      l2Success = await this.l2Cache.delete(key);
    }

    return l1Success || l2Success;
  }

  /**
   * 检查key是否存在
   */
  async has(key: string): Promise<boolean> {
    if (this.l1Cache.has(key)) {
      return true;
    }

    if (this.l2Cache) {
      return await this.l2Cache.has(key);
    }

    return false;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      l1Stats: this.l1Cache.getStats(),
      totalHits: this.stats.l1Hits + this.stats.l2Hits,
      hitRate: (this.stats.l1Hits + this.stats.l2Hits) /
               (this.stats.l1Hits + this.stats.l2Hits + this.stats.misses),
    };
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();

    if (this.l2Cache) {
      // Redis清空需要根据前缀删除
      // 这里简化处理，实际应用中需要实现
    }
  }
}

/**
 * 缓存装饰器
 */
export function cached<T extends(...args: any[]) => any>(
  cache: MemoryCache | RedisCache | MultiLevelCache,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
  } = {},
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${propertyName}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cachedResult = await cache.get(key);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 缓存结果
      await cache.set(key, result, options.ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存工厂
 */
export class CacheFactory {
  private static instances = new Map<string, any>();

  /**
   * 创建内存缓存
   */
  static createMemoryCache<T>(
    name: string,
    config?: Partial<CacheConfig>,
  ): MemoryCache<T> {
    if (!this.instances.has(name)) {
      this.instances.set(name, new MemoryCache<T>(config));
    }
    return this.instances.get(name);
  }

  /**
   * 创建Redis缓存
   */
  static createRedisCache<T>(
    name: string,
    client: any,
    config?: Partial<CacheConfig>,
    keyPrefix?: string,
  ): RedisCache<T> {
    if (!this.instances.has(name)) {
      this.instances.set(name, new RedisCache<T>(client, config, keyPrefix));
    }
    return this.instances.get(name);
  }

  /**
   * 创建多层缓存
   */
  static createMultiLevelCache<T>(
    name: string,
    l1Config?: Partial<CacheConfig>,
    l2Cache?: RedisCache<T>,
  ): MultiLevelCache<T> {
    if (!this.instances.has(name)) {
      this.instances.set(name, new MultiLevelCache<T>(l1Config, l2Cache));
    }
    return this.instances.get(name);
  }

  /**
   * 获取缓存实例
   */
  static getInstance<T>(name: string): T | undefined {
    return this.instances.get(name);
  }

  /**
   * 清理所有缓存实例
   */
  static cleanup(): void {
    this.instances.clear();
  }
}
