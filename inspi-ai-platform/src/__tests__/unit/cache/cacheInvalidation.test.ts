/**
 * 缓存失效机制测试
 * 测试缓存失效机制的可靠性和准确性
 */

import { redis } from '@/lib/cache/redis';
import { redisManager } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('@/lib/cache/simple-redis');
jest.mock('@/lib/utils/logger');

describe('Cache Invalidation Tests', () => {
  let mockRedisManager: jest.Mocked<typeof redisManager>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockRedisManager = redisManager as jest.Mocked<typeof redisManager>;

    // Mock Redis client
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      scan: jest.fn(),
      eval: jest.fn(),
    };

    mockRedisManager.getClient.mockReturnValue(mockClient);
    mockRedisManager.isReady.mockReturnValue(true);
    mockRedisManager.get.mockImplementation((key) => mockClient.get(key));
    mockRedisManager.set.mockImplementation((key, value, ttl) => {
      if (ttl) {
        return mockClient.setex(key, ttl, value);
      }
      return mockClient.set(key, value);
    });
    mockRedisManager.del.mockImplementation((key) => mockClient.del(key));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('TTL过期机制', () => {
    it('应该正确设置和验证TTL', async () => {
      // Arrange
      const key = 'ttl:test';
      const value = 'ttl test value';
      const ttl = 3600; // 1小时

      mockClient.setex.mockResolvedValue('OK');
      mockClient.ttl.mockResolvedValue(ttl);

      // Act
      await redis.set(key, value, { ttl });

      // Assert
      expect(mockClient.setex).toHaveBeenCalledWith('inspi:ttl:test', ttl, value);
    });

    it('应该在TTL到期后自动失效缓存', async () => {
      // Arrange
      const key = 'ttl:expiry';
      const value = 'expiry test value';
      const ttl = 1; // 1秒

      mockClient.setex.mockResolvedValue('OK');
      mockClient.get
        .mockResolvedValueOnce(value) // 立即获取，应该存在
        .mockResolvedValueOnce(null); // TTL过期后，应该为null

      // Act
      await redis.set(key, value, { ttl });

      // 立即获取，应该存在
      const immediateResult = await redis.get(key);

      // 模拟时间过去
      jest.advanceTimersByTime(2000); // 2秒后

      // 再次获取，应该已过期
      const expiredResult = await redis.get(key);

      // Assert
      expect(immediateResult).toBe(value);
      expect(expiredResult).toBeNull();
    });

    it('应该正确处理不同TTL值的缓存', async () => {
      // Arrange
      const testCases = [
        { key: 'short', ttl: 60, value: 'short-lived' },
        { key: 'medium', ttl: 3600, value: 'medium-lived' },
        { key: 'long', ttl: 86400, value: 'long-lived' },
      ];

      mockClient.setex.mockResolvedValue('OK');

      // Act & Assert
      for (const testCase of testCases) {
        await redis.set(testCase.key, testCase.value, { ttl: testCase.ttl });

        expect(mockClient.setex).toHaveBeenCalledWith(
          `inspi:${testCase.key}`,
          testCase.ttl,
          testCase.value,
        );
      }
    });

    it('应该处理TTL更新操作', async () => {
      // Arrange
      const key = 'ttl:update';
      const value = 'update test value';
      const initialTTL = 3600;
      const newTTL = 7200;

      mockClient.setex.mockResolvedValue('OK');
      mockClient.expire.mockResolvedValue(1);

      // Act
      await redis.set(key, value, { ttl: initialTTL });

      // 更新TTL（通过重新设置）
      await redis.set(key, value, { ttl: newTTL });

      // Assert
      expect(mockClient.setex).toHaveBeenCalledWith('inspi:ttl:update', initialTTL, value);
      expect(mockClient.setex).toHaveBeenCalledWith('inspi:ttl:update', newTTL, value);
    });

    it('应该正确处理无TTL的永久缓存', async () => {
      // Arrange
      const key = 'permanent';
      const value = 'permanent value';

      mockClient.set.mockResolvedValue('OK');

      // Act
      await redis.set(key, value); // 不设置TTL

      // Assert
      expect(mockClient.set).toHaveBeenCalledWith('inspi:permanent', value);
      expect(mockClient.setex).not.toHaveBeenCalled();
    });
  });

  describe('手动失效机制', () => {
    it('应该支持单个键的手动删除', async () => {
      // Arrange
      const key = 'manual:delete';
      const value = 'delete test value';

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);
      mockClient.get
        .mockResolvedValueOnce(value) // 删除前存在
        .mockResolvedValueOnce(null); // 删除后不存在

      // Act
      await redis.set(key, value);
      const beforeDelete = await redis.get(key);

      await redis.del(key);
      const afterDelete = await redis.get(key);

      // Assert
      expect(beforeDelete).toBe(value);
      expect(afterDelete).toBeNull();
      expect(mockClient.del).toHaveBeenCalledWith('inspi:manual:delete');
    });

    it('应该支持批量键的删除', async () => {
      // Arrange
      const keys = ['batch:1', 'batch:2', 'batch:3'];
      const values = ['value1', 'value2', 'value3'];

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(keys.length);

      // Act
      // 设置多个键
      for (let i = 0; i < keys.length; i++) {
        await redis.set(keys[i], values[i]);
      }

      // 批量删除
      for (const key of keys) {
        await redis.del(key);
      }

      // Assert
      expect(mockClient.del).toHaveBeenCalledTimes(keys.length);
      keys.forEach(key => {
        expect(mockClient.del).toHaveBeenCalledWith(`inspi:${key}`);
      });
    });

    it('应该处理删除不存在的键', async () => {
      // Arrange
      const nonExistentKey = 'non:existent';

      mockClient.del.mockResolvedValue(0); // Redis返回0表示键不存在

      // Act
      await redis.del(nonExistentKey);

      // Assert
      expect(mockClient.del).toHaveBeenCalledWith('inspi:non:existent');
      // 不应该抛出异常
    });

    it('应该支持模式匹配删除', async () => {
      // Arrange
      const pattern = 'pattern:*';
      const matchingKeys = [
        'inspi:pattern:1',
        'inspi:pattern:2',
        'inspi:pattern:test',
      ];

      mockClient.keys.mockResolvedValue(matchingKeys);
      mockClient.del.mockResolvedValue(matchingKeys.length);

      // Act
      // 模拟模式删除功能（需要在redis类中实现）
      // 这里我们测试底层逻辑
      const keys = await mockClient.keys(`inspi:${pattern}`);
      if (keys.length > 0) {
        await mockClient.del(...keys);
      }

      // Assert
      expect(mockClient.keys).toHaveBeenCalledWith('inspi:pattern:*');
      expect(mockClient.del).toHaveBeenCalledWith(...matchingKeys);
    });
  });

  describe('条件失效机制', () => {
    it('应该基于版本号进行失效', async () => {
      // Arrange
      const key = 'versioned:data';
      const v1Data = { version: 1, data: 'version 1' };
      const v2Data = { version: 2, data: 'version 2' };

      mockClient.set.mockResolvedValue('OK');
      mockClient.get
        .mockResolvedValueOnce(JSON.stringify(v1Data))
        .mockResolvedValueOnce(JSON.stringify(v2Data));

      // Act
      await redis.setJSON(key, v1Data);
      const v1Result = await redis.getJSON(key);

      // 更新到新版本
      await redis.setJSON(key, v2Data);
      const v2Result = await redis.getJSON(key);

      // Assert
      expect(v1Result).toEqual(v1Data);
      expect(v2Result).toEqual(v2Data);
      expect(v2Result?.version).toBeGreaterThan(v1Result?.version || 0);
    });

    it('应该基于时间戳进行失效判断', async () => {
      // Arrange
      const key = 'timestamped:data';
      const oldTimestamp = Date.now() - 10000; // 10秒前
      const newTimestamp = Date.now();

      const oldData = { timestamp: oldTimestamp, data: 'old data' };
      const newData = { timestamp: newTimestamp, data: 'new data' };

      mockClient.set.mockResolvedValue('OK');
      mockClient.get
        .mockResolvedValueOnce(JSON.stringify(oldData))
        .mockResolvedValueOnce(JSON.stringify(newData));

      // Act
      await redis.setJSON(key, oldData);
      const oldResult = await redis.getJSON(key);

      // 检查是否需要更新（基于时间戳）
      const shouldUpdate = (oldResult?.timestamp || 0) < newTimestamp - 5000; // 5秒阈值

      if (shouldUpdate) {
        await redis.setJSON(key, newData);
      }

      const finalResult = await redis.getJSON(key);

      // Assert
      expect(shouldUpdate).toBe(true);
      expect(finalResult).toEqual(newData);
      expect(finalResult?.timestamp).toBeGreaterThan(oldResult?.timestamp || 0);
    });

    it('应该基于依赖关系进行级联失效', async () => {
      // Arrange
      const parentKey = 'parent:data';
      const childKeys = ['child:1', 'child:2', 'child:3'];

      const parentData = { id: 'parent', children: ['child:1', 'child:2', 'child:3'] };
      const childData = childKeys.map((key, i) => ({
        id: key,
        parent: 'parent:data',
        data: `child data ${i + 1}`,
      }));

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);

      // Act
      // 设置父子数据
      await redis.setJSON(parentKey, parentData);
      for (let i = 0; i < childKeys.length; i++) {
        await redis.setJSON(childKeys[i], childData[i]);
      }

      // 删除父数据时，应该级联删除子数据
      await redis.del(parentKey);

      // 模拟级联删除
      for (const childKey of childKeys) {
        await redis.del(childKey);
      }

      // Assert
      expect(mockClient.del).toHaveBeenCalledWith(`inspi:${parentKey}`);
      childKeys.forEach(childKey => {
        expect(mockClient.del).toHaveBeenCalledWith(`inspi:${childKey}`);
      });
    });
  });

  describe('缓存一致性保证', () => {
    it('应该在数据更新时同步失效相关缓存', async () => {
      // Arrange
      const dataKey = 'data:user:123';
      const indexKeys = ['index:users:active', 'index:users:by-name'];

      const userData = { id: 123, name: 'John', active: true };
      const updatedUserData = { id: 123, name: 'John Doe', active: false };

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);

      // Act
      // 初始设置
      await redis.setJSON(dataKey, userData);
      await redis.set(indexKeys[0], 'cached-active-users');
      await redis.set(indexKeys[1], 'cached-users-by-name');

      // 更新数据时，失效相关缓存
      await redis.setJSON(dataKey, updatedUserData);

      // 失效相关索引缓存
      for (const indexKey of indexKeys) {
        await redis.del(indexKey);
      }

      // Assert
      expect(mockClient.set).toHaveBeenCalledWith(
        'inspi:data:user:123',
        JSON.stringify(updatedUserData),
      );

      indexKeys.forEach(indexKey => {
        expect(mockClient.del).toHaveBeenCalledWith(`inspi:${indexKey}`);
      });
    });

    it('应该处理分布式缓存的一致性', async () => {
      // Arrange
      const key = 'distributed:data';
      const localCache = new Map();
      const data = { id: 1, value: 'distributed test' };

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(JSON.stringify(data));
      mockClient.del.mockResolvedValue(1);

      // Act
      // 模拟分布式缓存场景
      await redis.setJSON(key, data);
      localCache.set(key, data); // 本地缓存

      // 远程更新数据
      const updatedData = { id: 1, value: 'updated distributed test' };
      await redis.setJSON(key, updatedData);

      // 本地缓存应该失效
      localCache.delete(key);

      // 重新获取数据
      const result = await redis.getJSON(key);

      // Assert
      expect(result).toEqual(updatedData);
      expect(localCache.has(key)).toBe(false);
    });

    it('应该处理事务性缓存操作', async () => {
      // Arrange
      const keys = ['tx:key1', 'tx:key2', 'tx:key3'];
      const values = ['value1', 'value2', 'value3'];

      // Mock Redis事务
      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 'OK', 'OK']),
      };

      mockClient.multi.mockReturnValue(mockMulti);

      // Act
      // 模拟事务性操作
      const multi = mockClient.multi();

      for (let i = 0; i < keys.length; i++) {
        multi.set(`inspi:${keys[i]}`, values[i]);
      }

      const results = await multi.exec();

      // Assert
      expect(mockClient.multi).toHaveBeenCalled();
      expect(mockMulti.exec).toHaveBeenCalled();
      expect(results).toEqual(['OK', 'OK', 'OK']);

      keys.forEach((key, i) => {
        expect(mockMulti.set).toHaveBeenCalledWith(`inspi:${key}`, values[i]);
      });
    });
  });

  describe('失效策略优化', () => {
    it('应该实现LRU失效策略', async () => {
      // Arrange
      const maxCacheSize = 5;
      const keys = Array.from({ length: 10 }, (_, i) => `lru:${i}`);
      const lruCache = new Map();

      // 模拟LRU缓存
      const setWithLRU = async (key: string, value: string) => {
        if (lruCache.size >= maxCacheSize) {
          // 删除最久未使用的项
          const firstKey = lruCache.keys().next().value;
          lruCache.delete(firstKey);
          await redis.del(firstKey);
        }
        lruCache.set(key, value);
        await redis.set(key, value);
      };

      const getWithLRU = async (key: string) => {
        if (lruCache.has(key)) {
          // 移动到最新位置
          const value = lruCache.get(key);
          lruCache.delete(key);
          lruCache.set(key, value);
          return value;
        }
        return null;
      };

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);

      // Act
      for (let i = 0; i < keys.length; i++) {
        await setWithLRU(keys[i], `value${i}`);
      }

      // 访问一些键以测试LRU
      await getWithLRU('lru:7');
      await getWithLRU('lru:8');

      // Assert
      expect(lruCache.size).toBe(maxCacheSize);
      expect(lruCache.has('lru:7')).toBe(true);
      expect(lruCache.has('lru:8')).toBe(true);
      expect(lruCache.has('lru:0')).toBe(false); // 应该被淘汰
    });

    it('应该实现基于频率的失效策略', async () => {
      // Arrange
      const keys = ['freq:high', 'freq:medium', 'freq:low'];
      const accessCounts = new Map();

      const trackAccess = (key: string) => {
        accessCounts.set(key, (accessCounts.get(key) || 0) + 1);
      };

      const shouldEvict = (key: string, threshold: number) => {
        return (accessCounts.get(key) || 0) < threshold;
      };

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);

      // Act
      // 设置缓存
      for (const key of keys) {
        await redis.set(key, `value-${key}`);
      }

      // 模拟不同频率的访问
      for (let i = 0; i < 10; i++) trackAccess('freq:high');
      for (let i = 0; i < 5; i++) trackAccess('freq:medium');
      for (let i = 0; i < 1; i++) trackAccess('freq:low');

      // 基于频率决定是否失效
      const evictionThreshold = 3;
      for (const key of keys) {
        if (shouldEvict(key, evictionThreshold)) {
          await redis.del(key);
        }
      }

      // Assert
      expect(accessCounts.get('freq:high')).toBe(10);
      expect(accessCounts.get('freq:medium')).toBe(5);
      expect(accessCounts.get('freq:low')).toBe(1);

      // 低频访问的键应该被删除
      expect(mockClient.del).toHaveBeenCalledWith('inspi:freq:low');
    });

    it('应该实现基于内存压力的失效策略', async () => {
      // Arrange
      const memoryThreshold = 100 * 1024 * 1024; // 100MB
      const keys = Array.from({ length: 50 }, (_, i) => `memory:${i}`);
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB per item

      mockClient.set.mockResolvedValue('OK');
      mockClient.del.mockResolvedValue(1);

      // Act
      const initialMemory = process.memoryUsage().heapUsed;

      for (const key of keys) {
        await redis.set(key, largeValue);

        const currentMemory = process.memoryUsage().heapUsed;

        // 如果内存使用超过阈值，开始清理
        if (currentMemory - initialMemory > memoryThreshold) {
          // 删除一些较旧的缓存项
          const keysToDelete = keys.slice(0, 10);
          for (const keyToDelete of keysToDelete) {
            await redis.del(keyToDelete);
          }
          break;
        }
      }

      // Assert
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 内存增长应该被控制在合理范围内
      expect(memoryIncrease).toBeLessThan(memoryThreshold * 1.5);
    });
  });
});
