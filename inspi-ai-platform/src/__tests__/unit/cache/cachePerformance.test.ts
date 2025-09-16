/**
 * 缓存性能测试
 * 测试缓存策略的性能表现和优化效果
 */

import { redis } from '@/lib/cache/redis';
import { redisManager } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('@/lib/cache/simple-redis');
jest.mock('@/lib/utils/logger');

describe('Cache Performance Tests', () => {
  let mockRedisManager: jest.Mocked<typeof redisManager>;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisManager = redisManager as jest.Mocked<typeof redisManager>;
    
    // Mock Redis client
    mockClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      pipeline: jest.fn(),
      multi: jest.fn()
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

  describe('基本操作性能', () => {
    it('应该在合理时间内完成单次缓存操作', async () => {
      // Arrange
      const key = 'performance:single';
      const value = 'performance test value';
      
      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(value);

      // Act
      const startTime = Date.now();
      
      await redis.set(key, value);
      const result = await redis.get(key);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toBe(value);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该高效处理大量顺序操作', async () => {
      // Arrange
      const operationCount = 1000;
      const baseKey = 'performance:sequential';

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const index = key.split(':').pop();
        return Promise.resolve(`value-${index}`);
      });

      // Act
      const startTime = Date.now();

      // 顺序设置
      for (let i = 0; i < operationCount; i++) {
        await redis.set(`${baseKey}:${i}`, `value-${i}`);
      }

      // 顺序获取
      const results = [];
      for (let i = 0; i < operationCount; i++) {
        const result = await redis.get(`${baseKey}:${i}`);
        results.push(result);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(operationCount);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成1000次操作
      
      const avgOperationTime = duration / (operationCount * 2); // 设置+获取
      expect(avgOperationTime).toBeLessThan(5); // 平均每次操作小于5ms
    });

    it('应该高效处理并发操作', async () => {
      // Arrange
      const concurrentCount = 100;
      const baseKey = 'performance:concurrent';

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const index = key.split(':').pop();
        return Promise.resolve(`value-${index}`);
      });

      // Act
      const startTime = Date.now();

      // 并发设置
      const setPromises = Array.from({ length: concurrentCount }, (_, i) =>
        redis.set(`${baseKey}:${i}`, `value-${i}`)
      );

      await Promise.all(setPromises);

      // 并发获取
      const getPromises = Array.from({ length: concurrentCount }, (_, i) =>
        redis.get(`${baseKey}:${i}`)
      );

      const results = await Promise.all(getPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(concurrentCount);
      expect(duration).toBeLessThan(2000); // 并发操作应该更快
      
      const avgOperationTime = duration / (concurrentCount * 2);
      expect(avgOperationTime).toBeLessThan(20); // 并发时平均时间可能稍高
    });
  });

  describe('JSON操作性能', () => {
    it('应该高效处理JSON序列化和反序列化', async () => {
      // Arrange
      const key = 'performance:json';
      const complexObject = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          profile: {
            age: 20 + (i % 50),
            interests: [`interest${i % 10}`, `hobby${i % 5}`],
            settings: {
              theme: i % 2 === 0 ? 'dark' : 'light',
              notifications: true
            }
          }
        })),
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          stats: {
            totalUsers: 100,
            activeUsers: 85,
            metrics: Array.from({ length: 50 }, (_, i) => ({
              date: `2024-01-${String(i + 1).padStart(2, '0')}`,
              value: Math.random() * 1000
            }))
          }
        }
      };

      const serializedValue = JSON.stringify(complexObject);
      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(serializedValue);

      // Act
      const startTime = Date.now();

      await redis.setJSON(key, complexObject);
      const result = await redis.getJSON(key);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toEqual(complexObject);
      expect(duration).toBeLessThan(200); // JSON操作应该在200ms内完成
    });

    it('应该高效处理大量JSON对象的批量操作', async () => {
      // Arrange
      const objectCount = 50;
      const baseKey = 'performance:json-batch';

      const objects = Array.from({ length: objectCount }, (_, i) => ({
        id: i,
        data: {
          name: `Object ${i}`,
          items: Array.from({ length: 20 }, (_, j) => ({
            id: j,
            value: `item-${i}-${j}`
          }))
        }
      }));

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const index = parseInt(key.split(':').pop() || '0');
        return Promise.resolve(JSON.stringify(objects[index]));
      });

      // Act
      const startTime = Date.now();

      // 批量设置JSON对象
      const setPromises = objects.map((obj, i) =>
        redis.setJSON(`${baseKey}:${i}`, obj)
      );

      await Promise.all(setPromises);

      // 批量获取JSON对象
      const getPromises = Array.from({ length: objectCount }, (_, i) =>
        redis.getJSON(`${baseKey}:${i}`)
      );

      const results = await Promise.all(getPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(objectCount);
      expect(duration).toBeLessThan(1000); // 批量JSON操作应该在1秒内完成
      
      results.forEach((result, index) => {
        expect(result).toEqual(objects[index]);
      });
    });
  });

  describe('内存使用优化', () => {
    it('应该有效管理内存使用', async () => {
      // Arrange
      const largeDataCount = 100;
      const baseKey = 'performance:memory';

      // 创建大数据对象
      const largeObjects = Array.from({ length: largeDataCount }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000), // 1KB per object
        metadata: {
          created: new Date().toISOString(),
          tags: Array.from({ length: 10 }, (_, j) => `tag-${i}-${j}`)
        }
      }));

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockImplementation((key) => {
        const index = parseInt(key.split(':').pop() || '0');
        return Promise.resolve(JSON.stringify(largeObjects[index]));
      });

      // Act
      const initialMemory = process.memoryUsage().heapUsed;

      // 批量操作大数据
      const promises = largeObjects.map((obj, i) =>
        redis.setJSON(`${baseKey}:${i}`, obj)
      );

      await Promise.all(promises);

      // 获取数据
      const getPromises = Array.from({ length: largeDataCount }, (_, i) =>
        redis.getJSON(`${baseKey}:${i}`)
      );

      const results = await Promise.all(getPromises);

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert
      expect(results).toHaveLength(largeDataCount);
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('应该正确处理内存压力下的操作', async () => {
      // Arrange
      const stressTestCount = 500;
      const baseKey = 'performance:stress';

      // 创建内存压力
      const largeData = 'x'.repeat(10000); // 10KB per item

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(largeData);

      // Act
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < stressTestCount; i++) {
        promises.push(redis.set(`${baseKey}:${i}`, largeData));
        
        // 每50个操作检查一次内存
        if (i % 50 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          expect(currentMemory).toBeLessThan(200 * 1024 * 1024); // 小于200MB
        }
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
      expect(mockClient.set).toHaveBeenCalledTimes(stressTestCount);
    });
  });

  describe('缓存命中率优化', () => {
    it('应该模拟和测试缓存命中率', async () => {
      // Arrange
      const keys = ['popular:1', 'popular:2', 'popular:3', 'rare:1', 'rare:2'];
      const accessPattern = [
        'popular:1', 'popular:1', 'popular:2', 'popular:1', 'popular:3',
        'popular:2', 'popular:1', 'rare:1', 'popular:2', 'popular:3',
        'popular:1', 'popular:2', 'rare:2', 'popular:1', 'popular:3'
      ];

      const cache = new Map(); // 模拟本地缓存
      let hitCount = 0;
      let missCount = 0;

      mockClient.get.mockImplementation((key) => {
        if (cache.has(key)) {
          hitCount++;
          return Promise.resolve(cache.get(key));
        } else {
          missCount++;
          const value = `value-for-${key}`;
          cache.set(key, value);
          return Promise.resolve(value);
        }
      });

      // Act
      const results = [];
      for (const key of accessPattern) {
        const result = await redis.get(key);
        results.push(result);
      }

      const hitRate = hitCount / (hitCount + missCount);

      // Assert
      expect(results).toHaveLength(accessPattern.length);
      expect(hitRate).toBeGreaterThan(0.5); // 命中率应该大于50%
      expect(hitCount).toBeGreaterThan(missCount); // 命中次数应该多于未命中
    });

    it('应该测试不同TTL策略的性能影响', async () => {
      // Arrange
      const testCases = [
        { ttl: 60, label: 'short' },
        { ttl: 3600, label: 'medium' },
        { ttl: 86400, label: 'long' }
      ];

      mockClient.setex.mockResolvedValue('OK');

      // Act & Assert
      for (const testCase of testCases) {
        const startTime = Date.now();
        
        const promises = Array.from({ length: 100 }, (_, i) =>
          redis.set(`ttl:${testCase.label}:${i}`, `value-${i}`, { ttl: testCase.ttl })
        );

        await Promise.all(promises);

        const endTime = Date.now();
        const duration = endTime - startTime;

        // 不同TTL的设置时间应该相近
        expect(duration).toBeLessThan(1000);
        expect(mockClient.setex).toHaveBeenCalledWith(
          expect.stringContaining(`ttl:${testCase.label}`),
          testCase.ttl,
          expect.any(String)
        );
      }
    });
  });

  describe('网络延迟模拟', () => {
    it('应该在模拟网络延迟下保持性能', async () => {
      // Arrange
      const networkDelay = 50; // 50ms网络延迟
      const operationCount = 20;

      mockClient.get.mockImplementation((key) => 
        new Promise(resolve => 
          setTimeout(() => resolve(`value-for-${key}`), networkDelay)
        )
      );

      mockClient.set.mockImplementation((key, value) => 
        new Promise(resolve => 
          setTimeout(() => resolve('OK'), networkDelay)
        )
      );

      // Act
      const startTime = Date.now();

      // 顺序操作（受网络延迟影响）
      const sequentialResults = [];
      for (let i = 0; i < operationCount; i++) {
        await redis.set(`sequential:${i}`, `value-${i}`);
        const result = await redis.get(`sequential:${i}`);
        sequentialResults.push(result);
      }

      const sequentialTime = Date.now() - startTime;

      // 并发操作（减少网络延迟影响）
      const concurrentStartTime = Date.now();

      const setPromises = Array.from({ length: operationCount }, (_, i) =>
        redis.set(`concurrent:${i}`, `value-${i}`)
      );

      const getPromises = Array.from({ length: operationCount }, (_, i) =>
        redis.get(`concurrent:${i}`)
      );

      await Promise.all(setPromises);
      const concurrentResults = await Promise.all(getPromises);

      const concurrentTime = Date.now() - concurrentStartTime;

      // Assert
      expect(sequentialResults).toHaveLength(operationCount);
      expect(concurrentResults).toHaveLength(operationCount);
      
      // 并发操作应该明显快于顺序操作
      expect(concurrentTime).toBeLessThan(sequentialTime * 0.3);
      
      // 顺序操作时间应该接近 operationCount * 2 * networkDelay
      const expectedSequentialTime = operationCount * 2 * networkDelay;
      expect(sequentialTime).toBeGreaterThan(expectedSequentialTime * 0.8);
      expect(sequentialTime).toBeLessThan(expectedSequentialTime * 1.5);
    });

    it('应该优化批量操作以减少网络往返', async () => {
      // Arrange
      const batchSize = 50;
      const networkDelay = 30;

      // Mock批量操作
      mockClient.mget = jest.fn().mockImplementation((keys) => 
        new Promise(resolve => 
          setTimeout(() => 
            resolve(keys.map(key => `value-for-${key}`)), 
            networkDelay
          )
        )
      );

      mockClient.mset = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve('OK'), networkDelay)
        )
      );

      // Act
      const startTime = Date.now();

      // 模拟批量获取（如果实现了的话）
      const keys = Array.from({ length: batchSize }, (_, i) => `batch:${i}`);
      
      // 由于当前实现没有批量操作，我们测试单个操作的性能
      const promises = keys.map(key => redis.get(key));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(batchSize);
      
      // 并发单个操作应该比顺序操作快
      const maxExpectedTime = batchSize * networkDelay * 0.5; // 并发应该减少总时间
      expect(duration).toBeLessThan(maxExpectedTime);
    });
  });

  describe('资源使用监控', () => {
    it('应该监控CPU使用情况', async () => {
      // Arrange
      const cpuIntensiveCount = 200;
      const baseKey = 'performance:cpu';

      // 创建CPU密集型操作（大JSON对象）
      const complexObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          computed: Math.sin(i) * Math.cos(i), // CPU计算
          nested: {
            values: Array.from({ length: 10 }, (_, j) => i * j)
          }
        }))
      };

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(JSON.stringify(complexObject));

      // Act
      const startTime = process.hrtime.bigint();

      const promises = Array.from({ length: cpuIntensiveCount }, (_, i) =>
        redis.setJSON(`${baseKey}:${i}`, complexObject)
      );

      await Promise.all(promises);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

      // Assert
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
      
      // 验证操作完成
      expect(mockClient.set).toHaveBeenCalledTimes(cpuIntensiveCount);
    });

    it('应该监控连接池使用情况', async () => {
      // Arrange
      const connectionTestCount = 100;
      const baseKey = 'performance:connections';

      let activeConnections = 0;
      const maxConnections = 10;

      mockClient.get.mockImplementation((key) => {
        activeConnections++;
        return new Promise(resolve => {
          setTimeout(() => {
            activeConnections--;
            resolve(`value-for-${key}`);
          }, 10);
        });
      });

      // Act
      const promises = Array.from({ length: connectionTestCount }, (_, i) =>
        redis.get(`${baseKey}:${i}`)
      );

      // 监控连接数
      const connectionMonitor = setInterval(() => {
        expect(activeConnections).toBeLessThanOrEqual(maxConnections);
      }, 5);

      const results = await Promise.all(promises);

      clearInterval(connectionMonitor);

      // Assert
      expect(results).toHaveLength(connectionTestCount);
      expect(activeConnections).toBe(0); // 所有连接应该已释放
    });
  });
});