/**
 * 缓存失效机制测试
 * 测试缓存失效策略和数据一致性保证
 */

import { redis } from '@/lib/cache/redis';
import { SimpleRedis } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('redis');
jest.mock('@/lib/utils/logger');

describe('Cache Invalidation Tests', () => {
  let mockRedisClient: any;
  let simpleRedis: SimpleRedis;
  let cacheInvalidator: CacheInvalidator;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      flushall: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      on: jest.fn(),
      isReady: true,
      quit: jest.fn()
    };

    (redis as any).createClient = jest.fn().mockReturnValue(mockRedisClient);
    
    simpleRedis = new SimpleRedis();
    cacheInvalidator = new CacheInvalidator(simpleRedis);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基于时间的失效策略', () => {
    it('应该在TTL过期后自动失效缓存', async () => {
      // Arrange
      const key = 'ttl_expiry_key';
      const value = 'ttl_expiry_value';
      const ttl = 60; // 60秒

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);
      mockRedisClient.get
        .mockResolvedValueOnce(value) // 未过期时返回值
        .mockResolvedValueOnce(null); // 过期后返回null
      mockRedisClient.ttl
        .mockResolvedValueOnce(30) // 剩余30秒
        .mockResolvedValueOnce(-2); // 已过期

      // Act
      await simpleRedis.set(key, value, { ttl });
      
      // 检查未过期时的值
      const beforeExpiry = await simpleRedis.get(key);
      const remainingTtl = await simpleRedis.ttl(key);
      
      // 模拟时间过去
      jest.advanceTimersByTime(ttl * 1000 + 1000);
      
      // 检查过期后的值
      const afterExpiry = await simpleRedis.get(key);
      const expiredTtl = await simpleRedis.ttl(key);

      // Assert
      expect(beforeExpiry).toBe(value);
      expect(remainingTtl).toBe(30);
      expect(afterExpiry).toBeNull();
      expect(expiredTtl).toBe(-2); // Redis返回-2表示key不存在
    });

    it('应该支持绝对过期时间', async () => {
      // Arrange
      const key = 'absolute_expiry_key';
      const value = 'absolute_expiry_value';
      const expiryTime = new Date(Date.now() + 60000); // 1分钟后过期

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expireAt.mockResolvedValue(1);

      // Act
      await simpleRedis.setWithAbsoluteExpiry(key, value, expiryTime);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
      expect(mockRedisClient.expireAt).toHaveBeenCalledWith(
        key, 
        Math.floor(expiryTime.getTime() / 1000)
      );
    });

    it('应该支持滑动过期时间', async () => {
      // Arrange
      const key = 'sliding_expiry_key';
      const value = 'sliding_expiry_value';
      const slidingTtl = 300; // 5分钟

      mockRedisClient.get.mockResolvedValue(value);
      mockRedisClient.expire.mockResolvedValue(1);

      // Act
      // 每次访问都应该重置TTL
      await simpleRedis.getWithSlidingExpiry(key, slidingTtl);
      await simpleRedis.getWithSlidingExpiry(key, slidingTtl);
      await simpleRedis.getWithSlidingExpiry(key, slidingTtl);

      // Assert
      expect(mockRedisClient.get).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.expire).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, slidingTtl);
    });
  });

  describe('基于事件的失效策略', () => {
    it('应该在数据更新时失效相关缓存', async () => {
      // Arrange
      const userId = 'user123';
      const userCacheKeys = [
        `user:${userId}:profile`,
        `user:${userId}:settings`,
        `user:${userId}:permissions`
      ];

      mockRedisClient.keys.mockResolvedValue(userCacheKeys);
      mockRedisClient.del.mockResolvedValue(userCacheKeys.length);

      // Act
      await cacheInvalidator.invalidateUserCache(userId);

      // Assert
      expect(mockRedisClient.keys).toHaveBeenCalledWith(`user:${userId}:*`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...userCacheKeys);
    });

    it('应该支持标签基的缓存失效', async () => {
      // Arrange
      const tag = 'product_catalog';
      const taggedKeys = [
        'product:1:details',
        'product:2:details',
        'category:electronics:products'
      ];

      // Mock标签到key的映射
      mockRedisClient.smembers.mockResolvedValue(taggedKeys);
      mockRedisClient.del.mockResolvedValue(taggedKeys.length);
      mockRedisClient.srem.mockResolvedValue(taggedKeys.length);

      // Act
      await cacheInvalidator.invalidateByTag(tag);

      // Assert
      expect(mockRedisClient.smembers).toHaveBeenCalledWith(`tag:${tag}`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...taggedKeys);
      expect(mockRedisClient.srem).toHaveBeenCalledWith(`tag:${tag}`, ...taggedKeys);
    });

    it('应该支持依赖关系的级联失效', async () => {
      // Arrange
      const parentKey = 'user:123:profile';
      const dependentKeys = [
        'user:123:dashboard',
        'user:123:recommendations',
        'feed:user:123'
      ];

      // Mock依赖关系
      mockRedisClient.smembers.mockResolvedValue(dependentKeys);
      mockRedisClient.del.mockResolvedValue(1 + dependentKeys.length);

      // Act
      await cacheInvalidator.invalidateWithDependencies(parentKey);

      // Assert
      expect(mockRedisClient.smembers).toHaveBeenCalledWith(`deps:${parentKey}`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(parentKey, ...dependentKeys);
    });
  });

  describe('基于版本的失效策略', () => {
    it('应该使用版本号进行缓存失效', async () => {
      // Arrange
      const key = 'versioned_data';
      const value = { data: 'test', version: 1 };
      const updatedValue = { data: 'updated', version: 2 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(value))
        .mockResolvedValueOnce(null); // 版本不匹配时返回null
      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      // 设置初始版本
      await simpleRedis.setVersioned(key, value, value.version);
      
      // 获取当前版本
      const currentValue = await simpleRedis.getVersioned(key, value.version);
      
      // 尝试获取更高版本（应该失效）
      const invalidValue = await simpleRedis.getVersioned(key, updatedValue.version);

      // Assert
      expect(currentValue).toEqual(value);
      expect(invalidValue).toBeNull();
    });

    it('应该支持全局版本号管理', async () => {
      // Arrange
      const globalVersion = 'app_version';
      const currentVersion = '1.2.3';
      const newVersion = '1.2.4';
      
      const cacheKeys = ['config:app', 'config:features', 'config:limits'];

      mockRedisClient.get
        .mockResolvedValueOnce(currentVersion)
        .mockResolvedValueOnce(newVersion);
      mockRedisClient.keys.mockResolvedValue(cacheKeys);
      mockRedisClient.del.mockResolvedValue(cacheKeys.length);
      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      // 检查当前版本
      const version1 = await cacheInvalidator.getGlobalVersion(globalVersion);
      
      // 更新全局版本并失效缓存
      await cacheInvalidator.updateGlobalVersion(globalVersion, newVersion);
      
      // 检查新版本
      const version2 = await cacheInvalidator.getGlobalVersion(globalVersion);

      // Assert
      expect(version1).toBe(currentVersion);
      expect(version2).toBe(newVersion);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('config:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...cacheKeys);
    });
  });

  describe('基于容量的失效策略', () => {
    it('应该在达到内存限制时使用LRU策略失效', async () => {
      // Arrange
      const maxMemory = 1024 * 1024; // 1MB
      const currentMemory = 1024 * 1024 * 0.9; // 90%使用率
      
      // Mock Redis内存信息
      mockRedisClient.info.mockResolvedValue(
        `used_memory:${currentMemory}\r\nmaxmemory:${maxMemory}\r\n`
      );
      
      const lruKeys = ['old_key1', 'old_key2', 'old_key3'];
      mockRedisClient.keys.mockResolvedValue(lruKeys);
      mockRedisClient.del.mockResolvedValue(lruKeys.length);

      // Act
      const memoryUsage = await cacheInvalidator.checkMemoryUsage();
      await cacheInvalidator.evictLRUKeys(10); // 清理10个最少使用的key

      // Assert
      expect(memoryUsage.used).toBe(currentMemory);
      expect(memoryUsage.max).toBe(maxMemory);
      expect(memoryUsage.percentage).toBeCloseTo(0.9);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...lruKeys);
    });

    it('应该支持基于访问频率的失效策略', async () => {
      // Arrange
      const keys = ['freq_key1', 'freq_key2', 'freq_key3'];
      const accessCounts = [1, 5, 10]; // 不同的访问频率
      
      // Mock访问计数
      mockRedisClient.hgetall.mockResolvedValue({
        'freq_key1': '1',
        'freq_key2': '5', 
        'freq_key3': '10'
      });
      
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.hdel.mockResolvedValue(1);

      // Act
      await cacheInvalidator.evictLowFrequencyKeys(2); // 清理访问频率最低的2个key

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith('freq_key1', 'freq_key2');
      expect(mockRedisClient.hdel).toHaveBeenCalledWith('access_count', 'freq_key1', 'freq_key2');
    });
  });

  describe('分布式缓存失效', () => {
    it('应该通过发布订阅机制同步失效', async () => {
      // Arrange
      const channel = 'cache_invalidation';
      const invalidationMessage = {
        type: 'invalidate',
        keys: ['sync_key1', 'sync_key2'],
        timestamp: Date.now()
      };

      mockRedisClient.publish.mockResolvedValue(2); // 2个订阅者
      mockRedisClient.del.mockResolvedValue(invalidationMessage.keys.length);

      // Act
      await cacheInvalidator.broadcastInvalidation(invalidationMessage.keys);

      // Assert
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        channel,
        JSON.stringify(invalidationMessage)
      );
    });

    it('应该处理失效消息的接收和处理', async () => {
      // Arrange
      const invalidationMessage = {
        type: 'invalidate',
        keys: ['received_key1', 'received_key2'],
        timestamp: Date.now()
      };

      mockRedisClient.del.mockResolvedValue(invalidationMessage.keys.length);

      // Act
      await cacheInvalidator.handleInvalidationMessage(
        JSON.stringify(invalidationMessage)
      );

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith(...invalidationMessage.keys);
    });

    it('应该防止失效消息的重复处理', async () => {
      // Arrange
      const messageId = 'msg_123';
      const invalidationMessage = {
        id: messageId,
        type: 'invalidate',
        keys: ['duplicate_key'],
        timestamp: Date.now()
      };

      // Mock消息已处理
      mockRedisClient.sismember.mockResolvedValue(1);

      // Act
      await cacheInvalidator.handleInvalidationMessage(
        JSON.stringify(invalidationMessage)
      );

      // Assert
      expect(mockRedisClient.sismember).toHaveBeenCalledWith(
        'processed_messages',
        messageId
      );
      expect(mockRedisClient.del).not.toHaveBeenCalled(); // 不应该重复处理
    });
  });

  describe('智能失效策略', () => {
    it('应该基于访问模式预测失效时机', async () => {
      // Arrange
      const key = 'predictive_key';
      const accessPattern = {
        lastAccess: Date.now() - 3600000, // 1小时前
        accessCount: 5,
        averageInterval: 1800000 // 30分钟间隔
      };

      mockRedisClient.hgetall.mockResolvedValue({
        lastAccess: accessPattern.lastAccess.toString(),
        accessCount: accessPattern.accessCount.toString(),
        averageInterval: accessPattern.averageInterval.toString()
      });

      // Act
      const shouldInvalidate = await cacheInvalidator.predictInvalidation(key);

      // Assert
      // 基于访问模式，1小时未访问且平均间隔30分钟，应该考虑失效
      expect(shouldInvalidate).toBe(true);
    });

    it('应该基于业务规则进行智能失效', async () => {
      // Arrange
      const businessRules = {
        userProfile: { maxAge: 3600000, dependencies: ['user_permissions'] },
        productCatalog: { maxAge: 1800000, tags: ['inventory'] },
        sessionData: { maxAge: 900000, sliding: true }
      };

      const key = 'user:123:profile';
      const cacheMetadata = {
        createdAt: Date.now() - 3700000, // 超过1小时
        lastAccess: Date.now() - 1800000, // 30分钟前访问
        type: 'userProfile'
      };

      mockRedisClient.hgetall.mockResolvedValue({
        createdAt: cacheMetadata.createdAt.toString(),
        lastAccess: cacheMetadata.lastAccess.toString(),
        type: cacheMetadata.type
      });

      // Act
      const shouldInvalidate = await cacheInvalidator.evaluateBusinessRules(
        key,
        businessRules
      );

      // Assert
      expect(shouldInvalidate).toBe(true); // 超过最大年龄，应该失效
    });
  });

  describe('失效性能优化', () => {
    it('应该批量处理失效操作', async () => {
      // Arrange
      const keys = Array.from({ length: 100 }, (_, i) => `batch_key_${i}`);
      const batchSize = 10;

      mockRedisClient.del.mockResolvedValue(batchSize);

      // Act
      const startTime = Date.now();
      await cacheInvalidator.batchInvalidate(keys, { batchSize });
      const endTime = Date.now();

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledTimes(10); // 100/10 = 10批次
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该使用管道优化失效性能', async () => {
      // Arrange
      const keys = ['pipe_key1', 'pipe_key2', 'pipe_key3'];
      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([1, 1, 1])
      };

      mockRedisClient.pipeline = jest.fn().mockReturnValue(mockPipeline);

      // Act
      await cacheInvalidator.pipelineInvalidate(keys);

      // Assert
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('应该异步处理非关键失效操作', async () => {
      // Arrange
      const keys = ['async_key1', 'async_key2'];
      mockRedisClient.del.mockResolvedValue(keys.length);

      // Act
      const promise = cacheInvalidator.asyncInvalidate(keys);
      
      // 不等待完成，立即检查
      expect(promise).toBeInstanceOf(Promise);
      
      // 等待异步操作完成
      await promise;

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });
  });

  describe('失效监控和统计', () => {
    it('应该记录失效操作的统计信息', async () => {
      // Arrange
      const keys = ['stat_key1', 'stat_key2', 'stat_key3'];
      mockRedisClient.del.mockResolvedValue(keys.length);
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.hincrby.mockResolvedValue(1);

      // Act
      await cacheInvalidator.invalidateWithStats(keys);
      const stats = await cacheInvalidator.getInvalidationStats();

      // Assert
      expect(mockRedisClient.incr).toHaveBeenCalledWith('invalidation:total_count');
      expect(mockRedisClient.hincrby).toHaveBeenCalledWith(
        'invalidation:daily_stats',
        expect.any(String), // 日期key
        keys.length
      );
    });

    it('应该监控失效操作的性能', async () => {
      // Arrange
      const keys = ['perf_key1', 'perf_key2'];
      mockRedisClient.del.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(keys.length), 100))
      );

      // Act
      const startTime = Date.now();
      await cacheInvalidator.invalidateWithPerformanceTracking(keys);
      const endTime = Date.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });
  });
});

// 辅助类定义
class CacheInvalidator {
  constructor(private cache: SimpleRedis) {}

  async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `user:${userId}:*`;
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const keys = await this.cache.smembers(tagKey);
    if (keys.length > 0) {
      await this.cache.del(...keys);
      await this.cache.srem(tagKey, ...keys);
    }
  }

  async invalidateWithDependencies(parentKey: string): Promise<void> {
    const depsKey = `deps:${parentKey}`;
    const dependentKeys = await this.cache.smembers(depsKey);
    const allKeys = [parentKey, ...dependentKeys];
    await this.cache.del(...allKeys);
  }

  async checkMemoryUsage(): Promise<{ used: number; max: number; percentage: number }> {
    const info = await this.cache.info('memory');
    const lines = info.split('\r\n');
    const used = parseInt(lines.find(l => l.startsWith('used_memory:'))?.split(':')[1] || '0');
    const max = parseInt(lines.find(l => l.startsWith('maxmemory:'))?.split(':')[1] || '0');
    return { used, max, percentage: max > 0 ? used / max : 0 };
  }

  async evictLRUKeys(count: number): Promise<void> {
    // 简化实现，实际应该基于LRU算法
    const keys = await this.cache.keys('*');
    const keysToEvict = keys.slice(0, count);
    if (keysToEvict.length > 0) {
      await this.cache.del(...keysToEvict);
    }
  }

  async evictLowFrequencyKeys(count: number): Promise<void> {
    const accessCounts = await this.cache.hgetall('access_count');
    const sortedKeys = Object.entries(accessCounts)
      .sort(([,a], [,b]) => parseInt(a) - parseInt(b))
      .slice(0, count)
      .map(([key]) => key);
    
    if (sortedKeys.length > 0) {
      await this.cache.del(...sortedKeys);
      await this.cache.hdel('access_count', ...sortedKeys);
    }
  }

  async broadcastInvalidation(keys: string[]): Promise<void> {
    const message = {
      type: 'invalidate',
      keys,
      timestamp: Date.now()
    };
    await this.cache.publish('cache_invalidation', JSON.stringify(message));
  }

  async handleInvalidationMessage(message: string): Promise<void> {
    const data = JSON.parse(message);
    
    // 检查是否已处理过此消息
    if (data.id && await this.cache.sismember('processed_messages', data.id)) {
      return;
    }
    
    if (data.type === 'invalidate' && data.keys) {
      await this.cache.del(...data.keys);
      
      // 标记消息已处理
      if (data.id) {
        await this.cache.sadd('processed_messages', data.id);
      }
    }
  }

  async predictInvalidation(key: string): Promise<boolean> {
    const metadata = await this.cache.hgetall(`meta:${key}`);
    if (!metadata.lastAccess) return false;
    
    const lastAccess = parseInt(metadata.lastAccess);
    const averageInterval = parseInt(metadata.averageInterval || '3600000');
    const timeSinceLastAccess = Date.now() - lastAccess;
    
    return timeSinceLastAccess > averageInterval * 2;
  }

  async evaluateBusinessRules(key: string, rules: any): Promise<boolean> {
    const metadata = await this.cache.hgetall(`meta:${key}`);
    if (!metadata.type || !metadata.createdAt) return false;
    
    const rule = rules[metadata.type];
    if (!rule) return false;
    
    const age = Date.now() - parseInt(metadata.createdAt);
    return age > rule.maxAge;
  }

  async batchInvalidate(keys: string[], options: { batchSize: number }): Promise<void> {
    for (let i = 0; i < keys.length; i += options.batchSize) {
      const batch = keys.slice(i, i + options.batchSize);
      await this.cache.del(...batch);
    }
  }

  async pipelineInvalidate(keys: string[]): Promise<void> {
    const pipeline = this.cache.pipeline();
    keys.forEach(key => pipeline.del(key));
    await pipeline.exec();
  }

  async asyncInvalidate(keys: string[]): Promise<void> {
    // 异步执行，不阻塞调用者
    setImmediate(async () => {
      await this.cache.del(...keys);
    });
  }

  async invalidateWithStats(keys: string[]): Promise<void> {
    await this.cache.del(...keys);
    await this.cache.incr('invalidation:total_count');
    
    const today = new Date().toISOString().split('T')[0];
    await this.cache.hincrby('invalidation:daily_stats', today, keys.length);
  }

  async getInvalidationStats(): Promise<any> {
    const totalCount = await this.cache.get('invalidation:total_count');
    const dailyStats = await this.cache.hgetall('invalidation:daily_stats');
    return { totalCount: parseInt(totalCount || '0'), dailyStats };
  }

  async invalidateWithPerformanceTracking(keys: string[]): Promise<void> {
    const startTime = Date.now();
    await this.cache.del(...keys);
    const duration = Date.now() - startTime;
    
    // 记录性能指标
    await this.cache.lpush('invalidation:performance', JSON.stringify({
      timestamp: startTime,
      duration,
      keyCount: keys.length
    }));
  }

  async getGlobalVersion(versionKey: string): Promise<string | null> {
    return await this.cache.get(`version:${versionKey}`);
  }

  async updateGlobalVersion(versionKey: string, newVersion: string): Promise<void> {
    await this.cache.set(`version:${versionKey}`, newVersion);
    
    // 失效相关缓存
    const pattern = versionKey.replace('_version', '') + ':*';
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
  }
}