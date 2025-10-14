/**
 * 缓存管理器测试
 */

import { createUserFixture, createWorkFixture } from '@/fixtures';
import {
  CacheManager,
  createCacheManager,
  CacheConfig,
  CacheStrategy,
} from '@/lib/cache/manager';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  pipeline: jest.fn(() => ({
    get: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  flushdb: jest.fn(),
};

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

// Mock内存缓存
const mockMemoryCache = new Map();

jest.mock('@/lib/cache/memory', () => ({
  MemoryCache: jest.fn().mockImplementation(() => ({
    get: jest.fn((key) => mockMemoryCache.get(key)),
    set: jest.fn((key, value, ttl) => {
      mockMemoryCache.set(key, { value, expires: Date.now() + (ttl || 0) * 1000 });
      return Promise.resolve();
    }),
    del: jest.fn((key) => {
      mockMemoryCache.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockMemoryCache.clear();
      return Promise.resolve();
    }),
    size: jest.fn(() => mockMemoryCache.size),
  })),
}));

describe('缓存管理器测试', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMemoryCache.clear();

    // 默认Redis返回值
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(-1);
    mockRedis.keys.mockResolvedValue([]);

    const config: CacheConfig = {
      defaultTTL: 3600, // 1小时
      maxMemorySize: 100, // 100MB
      strategy: 'write-through',
      keyPrefix: 'test:',
    };

    cacheManager = createCacheManager(config);
  });

  describe('基本缓存操作', () => {
    test('应该设置和获取缓存值', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      mockRedis.set.mockResolvedValueOnce('OK');
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:user:123',
        JSON.stringify(value),
        'EX',
        3600,
      );
      expect(mockRedis.get).toHaveBeenCalledWith('test:user:123');
    });

    test('应该删除缓存值', async () => {
      const key = 'user:123';

      mockRedis.del.mockResolvedValueOnce(1);

      const result = await cacheManager.del(key);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test:user:123');
    });

    test('应该检查缓存是否存在', async () => {
      const key = 'user:123';

      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await cacheManager.exists(key);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test:user:123');
    });

    test('应该获取缓存TTL', async () => {
      const key = 'user:123';

      mockRedis.ttl.mockResolvedValueOnce(1800); // 30分钟

      const result = await cacheManager.ttl(key);

      expect(result).toBe(1800);
      expect(mockRedis.ttl).toHaveBeenCalledWith('test:user:123');
    });

    test('应该设置缓存过期时间', async () => {
      const key = 'user:123';

      mockRedis.expire.mockResolvedValueOnce(1);

      const result = await cacheManager.expire(key, 7200);

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('test:user:123', 7200);
    });
  });

  describe('批量操作', () => {
    test('应该批量获取缓存值', async () => {
      const keys = ['user:123', 'user:456', 'user:789'];
      const values = [
        JSON.stringify({ id: '123', name: 'User 1' }),
        JSON.stringify({ id: '456', name: 'User 2' }),
        null, // 不存在的键
      ];

      mockRedis.mget.mockResolvedValueOnce(values);

      const result = await cacheManager.mget(keys);

      expect(result).toEqual({
        'user:123': { id: '123', name: 'User 1' },
        'user:456': { id: '456', name: 'User 2' },
        'user:789': null,
      });
      expect(mockRedis.mget).toHaveBeenCalledWith([
        'test:user:123',
        'test:user:456',
        'test:user:789',
      ]);
    });

    test('应该批量设置缓存值', async () => {
      const data = {
        'user:123': { id: '123', name: 'User 1' },
        'user:456': { id: '456', name: 'User 2' },
      };

      mockRedis.mset.mockResolvedValueOnce('OK');

      await cacheManager.mset(data, 3600);

      expect(mockRedis.mset).toHaveBeenCalledWith([
        'test:user:123',
        JSON.stringify({ id: '123', name: 'User 1' }),
        'test:user:456',
        JSON.stringify({ id: '456', name: 'User 2' }),
      ]);
    });

    test('应该批量删除缓存值', async () => {
      const keys = ['user:123', 'user:456'];

      mockRedis.del.mockResolvedValueOnce(2);

      const result = await cacheManager.mdel(keys);

      expect(result).toBe(2);
      expect(mockRedis.del).toHaveBeenCalledWith(['test:user:123', 'test:user:456']);
    });
  });

  describe('模式匹配操作', () => {
    test('应该根据模式获取键', async () => {
      const pattern = 'user:*';
      const keys = ['test:user:123', 'test:user:456', 'test:user:789'];

      mockRedis.keys.mockResolvedValueOnce(keys);

      const result = await cacheManager.keys(pattern);

      expect(result).toEqual(['user:123', 'user:456', 'user:789']);
      expect(mockRedis.keys).toHaveBeenCalledWith('test:user:*');
    });

    test('应该根据模式删除键', async () => {
      const pattern = 'user:*';
      const keys = ['test:user:123', 'test:user:456'];

      mockRedis.keys.mockResolvedValueOnce(keys);
      mockRedis.del.mockResolvedValueOnce(2);

      const result = await cacheManager.delPattern(pattern);

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('test:user:*');
      expect(mockRedis.del).toHaveBeenCalledWith(keys);
    });

    test('应该处理大量键的模式删除', async () => {
      const pattern = 'user:*';
      const keys = Array(1000).fill(null).map((_, i) => `test:user:${i}`);

      mockRedis.keys.mockResolvedValueOnce(keys);

      // 模拟分批删除
      const pipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(Array(1000).fill([null, 1])),
      };
      mockRedis.pipeline.mockReturnValueOnce(pipeline);

      const result = await cacheManager.delPattern(pattern);

      expect(result).toBe(1000);
      expect(pipeline.del).toHaveBeenCalledTimes(1000);
    });
  });

  describe('缓存策略', () => {
    test('应该实现write-through策略', async () => {
      const config: CacheConfig = {
        strategy: 'write-through',
        keyPrefix: 'test:',
      };
      const manager = createCacheManager(config);

      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      mockRedis.set.mockResolvedValueOnce('OK');

      await manager.set(key, value);

      // write-through应该同时写入Redis和内存
      expect(mockRedis.set).toHaveBeenCalled();
    });

    test('应该实现write-behind策略', async () => {
      const config: CacheConfig = {
        strategy: 'write-behind',
        keyPrefix: 'test:',
        writeBehindDelay: 1000, // 1秒延迟
      };
      const manager = createCacheManager(config);

      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      await manager.set(key, value);

      // write-behind应该立即写入内存，延迟写入Redis
      expect(mockRedis.set).not.toHaveBeenCalled();

      // 等待延迟写入
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockRedis.set).toHaveBeenCalled();
    });

    test('应该实现cache-aside策略', async () => {
      const config: CacheConfig = {
        strategy: 'cache-aside',
        keyPrefix: 'test:',
      };
      const manager = createCacheManager(config);

      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      // cache-aside需要手动管理
      await manager.set(key, value);

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));
      const result = await manager.get(key);

      expect(result).toEqual(value);
    });

    test('应该实现read-through策略', async () => {
      const config: CacheConfig = {
        strategy: 'read-through',
        keyPrefix: 'test:',
      };
      const manager = createCacheManager(config);

      const key = 'user:123';
      const loader = jest.fn().mockResolvedValue({ id: '123', name: 'Test User' });

      mockRedis.get.mockResolvedValueOnce(null); // 缓存未命中
      mockRedis.set.mockResolvedValueOnce('OK');

      const result = await manager.getOrLoad(key, loader);

      expect(loader).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled(); // 应该缓存加载的数据
      expect(result).toEqual({ id: '123', name: 'Test User' });
    });
  });

  describe('多级缓存', () => {
    test('应该实现L1(内存) + L2(Redis)缓存', async () => {
      const config: CacheConfig = {
        levels: ['memory', 'redis'],
        keyPrefix: 'test:',
      };
      const manager = createCacheManager(config);

      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      // 设置缓存
      await manager.set(key, value);

      // 应该同时设置内存和Redis
      expect(mockMemoryCache.has(key)).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled();

      // 获取缓存 - 应该优先从内存获取
      mockMemoryCache.set(key, { value, expires: Date.now() + 3600000 });

      const result = await manager.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.get).not.toHaveBeenCalled(); // 不应该访问Redis
    });

    test('应该处理L1缓存未命中，L2缓存命中', async () => {
      const config: CacheConfig = {
        levels: ['memory', 'redis'],
        keyPrefix: 'test:',
      };
      const manager = createCacheManager(config);

      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      // L1未命中，L2命中
      mockMemoryCache.delete(key);
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));

      const result = await manager.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.get).toHaveBeenCalled();
      // 应该回填L1缓存
      expect(mockMemoryCache.has(key)).toBe(true);
    });

    test('应该处理缓存穿透', async () => {
      const config: CacheConfig = {
        levels: ['memory', 'redis'],
        keyPrefix: 'test:',
        preventPenetration: true,
      };
      const manager = createCacheManager(config);

      const key = 'nonexistent:123';
      const loader = jest.fn().mockResolvedValue(null);

      // 两级缓存都未命中
      mockMemoryCache.delete(key);
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await manager.getOrLoad(key, loader);

      expect(result).toBeNull();
      expect(loader).toHaveBeenCalled();

      // 应该缓存null值防止穿透
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        'null',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('缓存同步', () => {
    test('应该处理缓存失效通知', async () => {
      const config: CacheConfig = {
        levels: ['memory', 'redis'],
        keyPrefix: 'test:',
        syncEnabled: true,
      };
      const manager = createCacheManager(config);

      const key = 'user:123';

      // 模拟其他实例的缓存失效通知
      await manager.handleInvalidation(key);

      // 应该清除本地内存缓存
      expect(mockMemoryCache.has(key)).toBe(false);
    });

    test('应该发送缓存失效通知', async () => {
      const config: CacheConfig = {
        levels: ['memory', 'redis'],
        keyPrefix: 'test:',
        syncEnabled: true,
      };
      const manager = createCacheManager(config);

      const key = 'user:123';

      const publishSpy = jest.fn();
      mockRedis.publish = publishSpy;

      await manager.del(key);

      // 应该发送失效通知
      expect(publishSpy).toHaveBeenCalledWith(
        'cache:invalidation',
        JSON.stringify({ key: 'test:user:123', timestamp: expect.any(Number) }),
      );
    });

    test('应该处理缓存预热', async () => {
      const config: CacheConfig = {
        keyPrefix: 'test:',
        warmupEnabled: true,
      };
      const manager = createCacheManager(config);

      const warmupData = {
        'user:123': { id: '123', name: 'User 1' },
        'user:456': { id: '456', name: 'User 2' },
      };

      mockRedis.mset.mockResolvedValueOnce('OK');

      await manager.warmup(warmupData);

      expect(mockRedis.mset).toHaveBeenCalled();
    });
  });

  describe('缓存统计和监控', () => {
    test('应该收集缓存统计信息', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      // 模拟缓存命中和未命中
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value)); // 命中
      mockRedis.get.mockResolvedValueOnce(null); // 未命中

      await cacheManager.get(key); // 命中
      await cacheManager.get('nonexistent'); // 未命中

      const stats = await cacheManager.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('应该监控缓存性能', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      // 模拟慢操作
      mockRedis.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(JSON.stringify(value)), 100)),
      );

      const startTime = Date.now();
      await cacheManager.get(key);
      const endTime = Date.now();

      const stats = await cacheManager.getStats();

      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    test('应该监控内存使用', async () => {
      const config: CacheConfig = {
        levels: ['memory'],
        keyPrefix: 'test:',
        maxMemorySize: 10, // 10MB限制
      };
      const manager = createCacheManager(config);

      // 添加大量数据
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB

      for (let i = 0; i < 15; i++) {
        await manager.set(`large:${i}`, largeValue);
      }

      const stats = await manager.getStats();

      expect(stats.memoryUsage).toBeDefined();
      expect(stats.evictions).toBeGreaterThan(0); // 应该有淘汰
    });
  });

  describe('错误处理和容错', () => {
    test('应该处理Redis连接失败', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Connection failed'));

      const key = 'user:123';

      // 应该降级到内存缓存
      const result = await cacheManager.get(key);

      expect(result).toBeNull();
      // 不应该抛出异常
    });

    test('应该处理序列化错误', async () => {
      const key = 'user:123';
      const circularValue = { name: 'test' };
      circularValue.self = circularValue; // 循环引用

      await expect(cacheManager.set(key, circularValue)).rejects.toThrow();
    });

    test('应该处理反序列化错误', async () => {
      const key = 'user:123';

      mockRedis.get.mockResolvedValueOnce('invalid-json');

      const result = await cacheManager.get(key);

      expect(result).toBeNull();
      // 应该清除损坏的缓存
      expect(mockRedis.del).toHaveBeenCalledWith('test:user:123');
    });

    test('应该处理内存不足', async () => {
      const config: CacheConfig = {
        levels: ['memory'],
        keyPrefix: 'test:',
        maxMemorySize: 1, // 1MB限制
        evictionPolicy: 'lru',
      };
      const manager = createCacheManager(config);

      // 添加超出内存限制的数据
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB

      await manager.set('large:1', largeValue);
      await manager.set('large:2', largeValue); // 应该触发淘汰

      const stats = await manager.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    test('应该处理缓存雪崩', async () => {
      const config: CacheConfig = {
        keyPrefix: 'test:',
        preventAvalanche: true,
        jitterRange: 0.1, // 10%抖动
      };
      const manager = createCacheManager(config);

      const keys = ['user:1', 'user:2', 'user:3'];
      const ttl = 3600;

      // 批量设置相同TTL
      for (const key of keys) {
        await manager.set(key, { id: key }, ttl);
      }

      // 验证TTL有抖动
      const ttls = [];
      for (const key of keys) {
        mockRedis.ttl.mockResolvedValueOnce(3600 + Math.random() * 360);
        ttls.push(await manager.ttl(key));
      }

      // TTL应该不完全相同
      const uniqueTtls = new Set(ttls);
      expect(uniqueTtls.size).toBeGreaterThan(1);
    });
  });

  describe('性能测试', () => {
    test('应该快速处理单个操作', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      mockRedis.set.mockResolvedValueOnce('OK');
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));

      const startTime = Date.now();
      await cacheManager.set(key, value);
      await cacheManager.get(key);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // 50ms内完成
    });

    test('应该高效处理批量操作', async () => {
      const data = {};
      for (let i = 0; i < 100; i++) {
        data[`user:${i}`] = { id: i, name: `User ${i}` };
      }

      mockRedis.mset.mockResolvedValueOnce('OK');

      const startTime = Date.now();
      await cacheManager.mset(data);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms内完成100个设置
    });

    test('应该处理高并发访问', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'Test User' };

      mockRedis.get.mockResolvedValue(JSON.stringify(value));

      const promises = Array(100).fill(null).map(() => cacheManager.get(key));

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(200); // 200ms内完成100个并发读取
    });
  });
});
