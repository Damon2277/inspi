/**
 * 缓存策略测试
 * 测试不同缓存策略的实现和效果
 */

import { redis } from '@/lib/cache/redis';
import { SimpleRedis } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('redis');
jest.mock('@/lib/utils/logger');

describe('Cache Strategy Tests', () => {
  let mockRedisClient: any;
  let simpleRedis: SimpleRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flushall: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
      hgetall: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrange: jest.fn(),
      isReady: true,
      on: jest.fn(),
      quit: jest.fn()
    };

    // Mock redis module
    (redis as any).createClient = jest.fn().mockReturnValue(mockRedisClient);
    
    simpleRedis = new SimpleRedis();
  });

  describe('LRU (Least Recently Used) 策略', () => {
    it('应该实现基本的LRU缓存策略', async () => {
      // Arrange
      const maxSize = 3;
      const lruCache = new LRUCache(maxSize);
      
      // Act
      await lruCache.set('key1', 'value1');
      await lruCache.set('key2', 'value2');
      await lruCache.set('key3', 'value3');
      
      // 访问key1，使其成为最近使用
      await lruCache.get('key1');
      
      // 添加新key，应该淘汰key2（最少使用）
      await lruCache.set('key4', 'value4');

      // Assert
      expect(await lruCache.get('key1')).toBe('value1'); // 最近访问，应该存在
      expect(await lruCache.get('key2')).toBeNull();     // 应该被淘汰
      expect(await lruCache.get('key3')).toBe('value3'); // 应该存在
      expect(await lruCache.get('key4')).toBe('value4'); // 新添加，应该存在
    });

    it('应该正确更新访问顺序', async () => {
      // Arrange
      const lruCache = new LRUCache(2);
      
      await lruCache.set('a', '1');
      await lruCache.set('b', '2');
      
      // Act - 访问a，使其成为最近使用
      await lruCache.get('a');
      
      // 添加新key，应该淘汰b
      await lruCache.set('c', '3');

      // Assert
      expect(await lruCache.get('a')).toBe('1'); // 最近访问，保留
      expect(await lruCache.get('b')).toBeNull(); // 被淘汰
      expect(await lruCache.get('c')).toBe('3'); // 新添加
    });

    it('应该处理重复设置相同key的情况', async () => {
      // Arrange
      const lruCache = new LRUCache(2);
      
      // Act
      await lruCache.set('key1', 'value1');
      await lruCache.set('key2', 'value2');
      await lruCache.set('key1', 'updated_value1'); // 更新现有key

      // Assert
      expect(await lruCache.get('key1')).toBe('updated_value1');
      expect(await lruCache.get('key2')).toBe('value2');
      expect(lruCache.size()).toBe(2); // 大小不应该增加
    });
  });

  describe('TTL (Time To Live) 策略', () => {
    it('应该正确设置和检查TTL', async () => {
      // Arrange
      const key = 'ttl_test_key';
      const value = 'ttl_test_value';
      const ttl = 60; // 60秒

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(ttl);

      // Act
      await simpleRedis.set(key, value, { ttl });
      const remainingTtl = await simpleRedis.ttl(key);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
      expect(remainingTtl).toBe(ttl);
    });

    it('应该在TTL过期后自动删除缓存', async () => {
      // Arrange
      const key = 'expired_key';
      const value = 'expired_value';
      const shortTtl = 1; // 1秒

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);
      mockRedisClient.get
        .mockResolvedValueOnce(value) // 立即获取，应该存在
        .mockResolvedValueOnce(null); // 过期后获取，应该为null

      // Act
      await simpleRedis.set(key, value, { ttl: shortTtl });
      const immediateValue = await simpleRedis.get(key);
      
      // 模拟时间过去
      jest.advanceTimersByTime(shortTtl * 1000 + 100);
      
      const expiredValue = await simpleRedis.get(key);

      // Assert
      expect(immediateValue).toBe(value);
      expect(expiredValue).toBeNull();
    });

    it('应该支持不同的TTL单位', async () => {
      // Arrange
      const testCases = [
        { ttl: 60, unit: 'seconds', expectedSeconds: 60 },
        { ttl: 5, unit: 'minutes', expectedSeconds: 300 },
        { ttl: 2, unit: 'hours', expectedSeconds: 7200 },
        { ttl: 1, unit: 'days', expectedSeconds: 86400 }
      ];

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);

      // Act & Assert
      for (const testCase of testCases) {
        await simpleRedis.set(
          `key_${testCase.unit}`, 
          'value', 
          { ttl: testCase.ttl, unit: testCase.unit as any }
        );
        
        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          `key_${testCase.unit}`, 
          testCase.expectedSeconds
        );
      }
    });
  });

  describe('Write-Through 策略', () => {
    it('应该同时写入缓存和数据源', async () => {
      // Arrange
      const key = 'write_through_key';
      const value = { id: 1, name: 'test' };
      const mockDataSource = {
        save: jest.fn().mockResolvedValue(value)
      };

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const result = await simpleRedis.writeThrough(key, value, mockDataSource.save);

      // Assert
      expect(mockDataSource.save).toHaveBeenCalledWith(value);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      expect(result).toEqual(value);
    });

    it('应该在数据源写入失败时不更新缓存', async () => {
      // Arrange
      const key = 'failed_write_key';
      const value = { id: 2, name: 'test2' };
      const mockDataSource = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      // Act & Assert
      await expect(
        simpleRedis.writeThrough(key, value, mockDataSource.save)
      ).rejects.toThrow('Database error');

      expect(mockDataSource.save).toHaveBeenCalledWith(value);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('应该在缓存写入失败时回滚数据源操作', async () => {
      // Arrange
      const key = 'cache_fail_key';
      const value = { id: 3, name: 'test3' };
      const mockDataSource = {
        save: jest.fn().mockResolvedValue(value),
        rollback: jest.fn().mockResolvedValue(true)
      };

      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(
        simpleRedis.writeThrough(key, value, mockDataSource.save, {
          rollbackOnCacheFailure: true,
          rollbackFn: mockDataSource.rollback
        })
      ).rejects.toThrow('Redis error');

      expect(mockDataSource.save).toHaveBeenCalledWith(value);
      expect(mockDataSource.rollback).toHaveBeenCalled();
    });
  });

  describe('Write-Behind (Write-Back) 策略', () => {
    it('应该立即写入缓存，异步写入数据源', async () => {
      // Arrange
      const key = 'write_behind_key';
      const value = { id: 4, name: 'test4' };
      const mockDataSource = {
        save: jest.fn().mockResolvedValue(value)
      };

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const result = await simpleRedis.writeBehind(key, value, mockDataSource.save);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      expect(result).toEqual(value);
      
      // 数据源写入应该是异步的
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockDataSource.save).toHaveBeenCalledWith(value);
    });

    it('应该批量写入数据源以提高性能', async () => {
      // Arrange
      const items = [
        { key: 'batch1', value: { id: 1, name: 'item1' } },
        { key: 'batch2', value: { id: 2, name: 'item2' } },
        { key: 'batch3', value: { id: 3, name: 'item3' } }
      ];
      
      const mockDataSource = {
        batchSave: jest.fn().mockResolvedValue(items.map(i => i.value))
      };

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const results = await Promise.all(
        items.map(item => 
          simpleRedis.writeBehind(item.key, item.value, mockDataSource.batchSave, {
            batchSize: 3,
            batchDelay: 100
          })
        )
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(3);
      
      // 等待批量写入完成
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(mockDataSource.batchSave).toHaveBeenCalledWith(
        items.map(i => i.value)
      );
    });

    it('应该处理数据源写入失败的重试机制', async () => {
      // Arrange
      const key = 'retry_key';
      const value = { id: 5, name: 'test5' };
      const mockDataSource = {
        save: jest.fn()
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockRejectedValueOnce(new Error('Another failure'))
          .mockResolvedValueOnce(value)
      };

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      await simpleRedis.writeBehind(key, value, mockDataSource.save, {
        retryAttempts: 3,
        retryDelay: 50
      });

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      
      // 等待重试完成
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(mockDataSource.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('Read-Through 策略', () => {
    it('应该在缓存未命中时从数据源加载', async () => {
      // Arrange
      const key = 'read_through_key';
      const value = { id: 6, name: 'test6' };
      const mockDataSource = {
        load: jest.fn().mockResolvedValue(value)
      };

      mockRedisClient.get.mockResolvedValue(null); // 缓存未命中
      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const result = await simpleRedis.readThrough(key, mockDataSource.load);

      // Assert
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(mockDataSource.load).toHaveBeenCalledWith(key);
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
      expect(result).toEqual(value);
    });

    it('应该在缓存命中时直接返回缓存数据', async () => {
      // Arrange
      const key = 'cached_key';
      const cachedValue = { id: 7, name: 'cached' };
      const mockDataSource = {
        load: jest.fn()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      // Act
      const result = await simpleRedis.readThrough(key, mockDataSource.load);

      // Assert
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(mockDataSource.load).not.toHaveBeenCalled();
      expect(result).toEqual(cachedValue);
    });

    it('应该处理数据源加载失败的情况', async () => {
      // Arrange
      const key = 'load_fail_key';
      const mockDataSource = {
        load: jest.fn().mockRejectedValue(new Error('Data source error'))
      };

      mockRedisClient.get.mockResolvedValue(null);

      // Act & Assert
      await expect(
        simpleRedis.readThrough(key, mockDataSource.load)
      ).rejects.toThrow('Data source error');

      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      expect(mockDataSource.load).toHaveBeenCalledWith(key);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('Cache-Aside 策略', () => {
    it('应该支持手动缓存管理', async () => {
      // Arrange
      const key = 'manual_key';
      const value = { id: 8, name: 'manual' };
      const updatedValue = { id: 8, name: 'updated' };
      
      const mockDataSource = {
        load: jest.fn().mockResolvedValue(value),
        save: jest.fn().mockResolvedValue(updatedValue)
      };

      mockRedisClient.get
        .mockResolvedValueOnce(null) // 首次未命中
        .mockResolvedValueOnce(JSON.stringify(value)) // 缓存后命中
        .mockResolvedValueOnce(null); // 删除后未命中
      
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      // Act & Assert
      // 1. 首次读取，缓存未命中
      let result = await simpleRedis.get(key);
      expect(result).toBeNull();
      
      // 手动从数据源加载并缓存
      const loadedValue = await mockDataSource.load(key);
      await simpleRedis.set(key, loadedValue);
      
      // 2. 再次读取，缓存命中
      result = await simpleRedis.get(key);
      expect(result).toEqual(value);
      
      // 3. 更新数据源
      await mockDataSource.save(key, updatedValue);
      
      // 4. 手动删除缓存
      await simpleRedis.del(key);
      
      // 5. 读取时缓存未命中
      result = await simpleRedis.get(key);
      expect(result).toBeNull();
    });

    it('应该提供缓存预热功能', async () => {
      // Arrange
      const keys = ['warm1', 'warm2', 'warm3'];
      const values = [
        { id: 1, name: 'warm1' },
        { id: 2, name: 'warm2' },
        { id: 3, name: 'warm3' }
      ];
      
      const mockDataSource = {
        loadMultiple: jest.fn().mockResolvedValue(values)
      };

      mockRedisClient.mset.mockResolvedValue('OK');

      // Act
      await simpleRedis.warmUp(keys, mockDataSource.loadMultiple);

      // Assert
      expect(mockDataSource.loadMultiple).toHaveBeenCalledWith(keys);
      expect(mockRedisClient.mset).toHaveBeenCalledWith(
        keys.flatMap((key, index) => [key, JSON.stringify(values[index])])
      );
    });
  });

  describe('多级缓存策略', () => {
    it('应该实现L1(内存) + L2(Redis)多级缓存', async () => {
      // Arrange
      const key = 'multi_level_key';
      const value = { id: 9, name: 'multi_level' };
      
      const l1Cache = new Map(); // 模拟内存缓存
      const multiLevelCache = new MultiLevelCache(l1Cache, simpleRedis);

      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));
      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      // 首次读取，L1未命中，L2命中
      const result1 = await multiLevelCache.get(key);
      
      // 再次读取，L1命中
      const result2 = await multiLevelCache.get(key);

      // Assert
      expect(result1).toEqual(value);
      expect(result2).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(1); // 只调用一次Redis
      expect(l1Cache.has(key)).toBe(true); // L1缓存已更新
    });

    it('应该正确处理多级缓存的写入', async () => {
      // Arrange
      const key = 'multi_write_key';
      const value = { id: 10, name: 'multi_write' };
      
      const l1Cache = new Map();
      const multiLevelCache = new MultiLevelCache(l1Cache, simpleRedis);

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      await multiLevelCache.set(key, value);

      // Assert
      expect(l1Cache.get(key)).toEqual(value); // L1已更新
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value)); // L2已更新
    });

    it('应该实现多级缓存的一致性', async () => {
      // Arrange
      const key = 'consistency_key';
      const value = { id: 11, name: 'consistency' };
      const updatedValue = { id: 11, name: 'updated_consistency' };
      
      const l1Cache = new Map();
      const multiLevelCache = new MultiLevelCache(l1Cache, simpleRedis);

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      // Act
      // 设置初始值
      await multiLevelCache.set(key, value);
      
      // 更新值
      await multiLevelCache.set(key, updatedValue);
      
      // 删除缓存
      await multiLevelCache.del(key);

      // Assert
      expect(l1Cache.has(key)).toBe(false); // L1已删除
      expect(mockRedisClient.del).toHaveBeenCalledWith(key); // L2已删除
    });
  });
});

// 辅助类定义
class LRUCache {
  private cache = new Map();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // 重新设置以更新访问顺序
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最少使用的项（Map中的第一个）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  size(): number {
    return this.cache.size;
  }
}

class MultiLevelCache {
  constructor(
    private l1Cache: Map<string, any>,
    private l2Cache: SimpleRedis
  ) {}

  async get(key: string): Promise<any> {
    // 先检查L1缓存
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // 检查L2缓存
    const l2Value = await this.l2Cache.get(key);
    if (l2Value !== null) {
      // 更新L1缓存
      this.l1Cache.set(key, l2Value);
      return l2Value;
    }

    return null;
  }

  async set(key: string, value: any): Promise<void> {
    // 同时更新L1和L2缓存
    this.l1Cache.set(key, value);
    await this.l2Cache.set(key, value);
  }

  async del(key: string): Promise<void> {
    // 同时删除L1和L2缓存
    this.l1Cache.delete(key);
    await this.l2Cache.del(key);
  }
}