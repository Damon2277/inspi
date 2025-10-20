/**
 * 简单的内存缓存管理器
 * 支持 TTL (Time To Live) 和 LRU (Least Recently Used) 策略
 */
export class DataCache<T = any> {
  private cache: Map<string, { data: T; timestamp: number; accessCount: number }>;
  private maxSize: number;
  private ttl: number; // 毫秒

  constructor(maxSize: number = 100, ttlMinutes: number = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * 获取缓存数据
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(item.timestamp)) {
      this.cache.delete(key);
      return null;
    }

    // 更新访问计数
    item.accessCount++;

    // 将访问的项移到最后（LRU）
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.data;
  }

  /**
   * 设置缓存数据
   */
  set(key: string, data: T): void {
    // 如果缓存已满，删除最少使用的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.findLRUKey();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查是否有缓存
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (this.isExpired(item.timestamp)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item.timestamp)) {
        this.cache.delete(key);
      }
    }
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttl;
  }

  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let minAccessCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < minAccessCount ||
          (item.accessCount === minAccessCount && item.timestamp < oldestTimestamp)) {
        lruKey = key;
        minAccessCount = item.accessCount;
        oldestTimestamp = item.timestamp;
      }
    }

    return lruKey;
  }
}

// 创建单例实例
export const cardCache = new DataCache(50, 10); // 最多50个项，10分钟过期
export const apiCache = new DataCache(100, 5); // API响应缓存，5分钟过期

// 缓存键生成器
export function createCacheKey(...parts: (string | number | boolean)[]): string {
  return parts.filter(Boolean).join(':');
}

// 带缓存的数据获取器
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: DataCache<T> = apiCache,
  forceRefresh: boolean = false,
): Promise<T> {
  // 如果不强制刷新，先尝试从缓存获取
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }
  }

  // 获取新数据
  const data = await fetcher();

  // 存入缓存
  cache.set(key, data);

  return data;
}

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    cardCache.cleanup();
    apiCache.cleanup();
  }, 60000); // 每分钟清理一次
}
