/**
 * 缓存工具函数
 */
import { createHash } from 'crypto';
import { logger } from '@/lib/logging/logger';
import { CacheManager } from './manager';
import { CacheKeyGenerator, CacheKeyPrefix } from './config';

/**
 * 缓存装饰器选项
 */
export interface CacheDecoratorOptions {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
  prefix?: string;
}

/**
 * 缓存工具类
 */
export class CacheUtils {
  /**
   * 生成缓存键的哈希值
   */
  static hashKey(key: string): string {
    return createHash('md5').update(key).digest('hex');
  }

  /**
   * 生成基于参数的缓存键
   */
  static generateKeyFromArgs(prefix: string, args: any[]): string {
    const argsString = JSON.stringify(args);
    const hash = this.hashKey(argsString);
    return `${prefix}:${hash}`;
  }

  /**
   * 序列化复杂对象为缓存键
   */
  static serializeToKey(obj: any): string {
    try {
      const sorted = this.sortObjectKeys(obj);
      return this.hashKey(JSON.stringify(sorted));
    } catch (error) {
      logger.error('Failed to serialize object to key', error instanceof Error ? error : new Error(String(error)));
      return this.hashKey(String(obj));
    }
  }

  /**
   * 递归排序对象键（确保一致的序列化）
   */
  private static sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * 检查值是否可缓存
   */
  static isCacheable(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    // 检查是否为函数
    if (typeof value === 'function') {
      return false;
    }

    // 检查是否为循环引用
    try {
      JSON.stringify(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 计算对象大小（字节）
   */
  static calculateSize(obj: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    } catch (error) {
      return 0;
    }
  }

  /**
   * 格式化缓存大小
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  /**
   * 生成带时间戳的缓存键
   */
  static generateTimestampedKey(prefix: string, identifier: string, granularity: 'minute' | 'hour' | 'day' = 'hour'): string {
    const now = new Date();
    let timestamp: string;

    switch (granularity) {
      case 'minute':
        timestamp = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
        break;
      case 'hour':
        timestamp = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        break;
      case 'day':
        timestamp = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        break;
    }

    return `${prefix}:${identifier}:${timestamp}`;
  }

  /**
   * 解析时间戳缓存键
   */
  static parseTimestampedKey(key: string): {
    prefix: string;
    identifier: string;
    timestamp: string;
  } | null {
    const parts = key.split(':');
    if (parts.length < 3) {
      return null;
    }

    return {
      prefix: parts[0],
      identifier: parts[1],
      timestamp: parts.slice(2).join(':')
    };
  }

  /**
   * 清理过期的时间戳缓存键
   */
  static async cleanupTimestampedKeys(
    cacheManager: CacheManager,
    prefix: string,
    maxAge: number // 毫秒
  ): Promise<number> {
    try {
      // 这里需要实现获取所有匹配键的逻辑
      // 由于Redis的keys命令在生产环境中性能较差，
      // 实际实现时应该使用scan命令或维护键的索引
      
      const pattern = `${prefix}:*`;
      // const keys = await cacheManager.getRedisManager().getClient()?.keys(pattern) || [];
      
      let cleanedCount = 0;
      // 实际实现时需要遍历键并检查时间戳
      
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup timestamped keys', error instanceof Error ? error : new Error(String(error)), { prefix });
      return 0;
    }
  }
}

/**
 * 缓存装饰器
 */
export function Cache(options: CacheDecoratorOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const defaultPrefix = `${className}:${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      // 检查是否满足缓存条件
      if (options.condition && !options.condition.apply(this, args)) {
        return method.apply(this, args);
      }

      // 生成缓存键
      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator.apply(this, args);
      } else {
        cacheKey = CacheUtils.generateKeyFromArgs(options.prefix || defaultPrefix, args);
      }

      // 获取缓存管理器实例
      const cacheManager = this.cacheManager || global.cacheManager;
      if (!cacheManager) {
        logger.warn('Cache manager not available, executing method directly');
        return method.apply(this, args);
      }

      try {
        // 尝试从缓存获取
        const cachedResult = await cacheManager.get(cacheKey);
        if (cachedResult !== null) {
          logger.debug('Cache hit', { key: cacheKey, method: `${className}.${propertyName}` });
          return cachedResult;
        }

        // 缓存未命中，执行原方法
        logger.debug('Cache miss', { key: cacheKey, method: `${className}.${propertyName}` });
        const result = await method.apply(this, args);

        // 检查结果是否可缓存
        if (CacheUtils.isCacheable(result)) {
          await cacheManager.set(cacheKey, result, { ttl: options.ttl });
          logger.debug('Result cached', { key: cacheKey, method: `${className}.${propertyName}` });
        }

        return result;
      } catch (error) {
        logger.error('Cache decorator error', error instanceof Error ? error : new Error(String(error)), {
          key: cacheKey,
          method: `${className}.${propertyName}`
        });
        // 缓存出错时直接执行原方法
        return method.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 */
export function CacheEvict(patterns: string | string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);

      // 获取缓存管理器实例
      const cacheManager = this.cacheManager || global.cacheManager;
      if (!cacheManager) {
        return result;
      }

      try {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
        
        for (const pattern of patternsArray) {
          await cacheManager.deletePattern(pattern);
          logger.debug('Cache evicted', { pattern, method: `${target.constructor.name}.${propertyName}` });
        }
      } catch (error) {
        logger.error('Cache eviction error', error instanceof Error ? error : new Error(String(error)), {
          patterns: patternsArray,
          method: `${target.constructor.name}.${propertyName}`
        });
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存预热装饰器
 */
export function CacheWarmup(keyGenerator: (...args: any[]) => string, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);

      // 获取缓存管理器实例
      const cacheManager = this.cacheManager || global.cacheManager;
      if (!cacheManager) {
        return result;
      }

      try {
        const cacheKey = keyGenerator.apply(this, args);
        
        if (CacheUtils.isCacheable(result)) {
          await cacheManager.set(cacheKey, result, { ttl });
          logger.debug('Cache warmed up', { key: cacheKey, method: `${target.constructor.name}.${propertyName}` });
        }
      } catch (error) {
        logger.error('Cache warmup error', error instanceof Error ? error : new Error(String(error)), {
          method: `${target.constructor.name}.${propertyName}`
        });
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存锁装饰器（防止缓存击穿）
 */
export function CacheLock(lockTtl: number = 10000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const locks = new Map<string, Promise<any>>();

    descriptor.value = async function (...args: any[]) {
      const lockKey = CacheUtils.generateKeyFromArgs(`lock:${target.constructor.name}:${propertyName}`, args);

      // 检查是否已有相同的请求在处理
      if (locks.has(lockKey)) {
        logger.debug('Waiting for existing request', { lockKey });
        return await locks.get(lockKey);
      }

      // 创建新的请求Promise
      const requestPromise = (async () => {
        try {
          const result = await method.apply(this, args);
          return result;
        } finally {
          // 清理锁
          locks.delete(lockKey);
        }
      })();

      // 设置锁
      locks.set(lockKey, requestPromise);

      // 设置锁的超时清理
      setTimeout(() => {
        if (locks.has(lockKey)) {
          locks.delete(lockKey);
          logger.warn('Cache lock timeout', { lockKey });
        }
      }, lockTtl);

      return await requestPromise;
    };

    return descriptor;
  };
}

/**
 * 缓存监控工具
 */
export class CacheMonitor {
  private static instance: CacheMonitor;
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };

  static getInstance(): CacheMonitor {
    if (!this.instance) {
      this.instance = new CacheMonitor();
    }
    return this.instance;
  }

  /**
   * 记录缓存命中
   */
  recordHit(): void {
    this.metrics.hits++;
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(): void {
    this.metrics.misses++;
  }

  /**
   * 记录缓存设置
   */
  recordSet(): void {
    this.metrics.sets++;
  }

  /**
   * 记录缓存删除
   */
  recordDelete(): void {
    this.metrics.deletes++;
  }

  /**
   * 记录缓存错误
   */
  recordError(): void {
    this.metrics.errors++;
  }

  /**
   * 获取缓存指标
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      total
    };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }
}

export default CacheUtils;