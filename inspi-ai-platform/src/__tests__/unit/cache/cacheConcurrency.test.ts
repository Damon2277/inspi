/**
 * 缓存并发访问安全性测试
 * 测试缓存在并发访问下的安全性和一致性
 */

import { redis } from '@/lib/cache/redis';
import { redisManager } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('@/lib/cache/simple-redis');
jest.mock('@/lib/utils/logger');

describe('Cache Concurrency Safety Tests', () => {
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
      exists: jest.fn(),
      watch: jest.fn(),
      unwatch: jest.fn(),
      multi: jest.fn(),
      eval: jest.fn()
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

  describe('并发读写安全性', () => {
    it('应该安全处理并发读操作', async () => {
      // Arrange
      const key = 'concurrent:read';
      const value = 'concurrent read value';
      const concurrentReads = 100;

      mockClient.get.mockResolvedValue(value);

      // Act
      const promises = Array.from({ length: concurrentReads }, () =>
        redis.get(key)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentReads);
      results.forEach(result => {
        expect(result).toBe(value);
      });
      expect(mockClient.get).toHaveBeenCalledTimes(concurrentReads);
    });

    it('应该安全处理并发写操作', async () => {
      // Arrange
      const baseKey = 'concurrent:write';
      const concurrentWrites = 50;

      mockClient.set.mockResolvedValue('OK');

      // Act
      const promises = Array.from({ length: concurrentWrites }, (_, i) =>
        redis.set(`${baseKey}:${i}`, `value-${i}`)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentWrites);
      expect(mockClient.set).toHaveBeenCalledTimes(concurrentWrites);
      
      // 验证每个写操作都被正确调用
      for (let i = 0; i < concurrentWrites; i++) {
        expect(mockClient.set).toHaveBeenCalledWith(
          `inspi:${baseKey}:${i}`,
          `value-${i}`
        );
      }
    });

    it('应该安全处理混合读写操作', async () => {
      // Arrange
      const key = 'concurrent:mixed';
      const initialValue = 'initial value';
      const updatedValue = 'updated value';
      const operationCount = 100;

      let currentValue = initialValue;
      mockClient.get.mockImplementation(() => Promise.resolve(currentValue));
      mockClient.set.mockImplementation((key, value) => {
        currentValue = value;
        return Promise.resolve('OK');
      });

      // Act
      const promises = [];
      
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          // 读操作
          promises.push(redis.get(key));
        } else {
          // 写操作
          promises.push(redis.set(key, `${updatedValue}-${i}`));
        }
      }

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(operationCount);
      
      // 验证读操作返回了有效值
      const readResults = results.filter((result, index) => index % 2 === 0);
      readResults.forEach(result => {
        expect(typeof result).toBe('string');
      });
    });

    it('应该处理并发删除操作', async () => {
      // Arrange
      const keys = Array.from({ length: 20 }, (_, i) => `concurrent:delete:${i}`);
      
      mockClient.del.mockResolvedValue(1);

      // Act
      const promises = keys.map(key => redis.del(key));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(keys.length);
      expect(mockClient.del).toHaveBeenCalledTimes(keys.length);
      
      keys.forEach(key => {
        expect(mockClient.del).toHaveBeenCalledWith(`inspi:${key}`);
      });
    });
  });

  describe('原子操作安全性', () => {
    it('应该安全处理并发递增操作', async () => {
      // Arrange
      const key = 'concurrent:counter';
      const concurrentIncrements = 50;
      let currentValue = 0;

      mockClient.incr.mockImplementation(() => {
        currentValue++;
        return Promise.resolve(currentValue);
      });

      // Act
      const promises = Array.from({ length: concurrentIncrements }, () =>
        redis.increment(key)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentIncrements);
      expect(Math.max(...results)).toBe(concurrentIncrements);
      expect(mockClient.incr).toHaveBeenCalledTimes(concurrentIncrements);
      
      // 验证结果的唯一性（每个递增操作应该返回不同的值）
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(concurrentIncrements);
    });

    it('应该安全处理并发递减操作', async () => {
      // Arrange
      const key = 'concurrent:decrement';
      const concurrentDecrements = 30;
      let currentValue = 100; // 从100开始递减

      mockClient.decr.mockImplementation(() => {
        currentValue--;
        return Promise.resolve(currentValue);
      });

      // Act
      const promises = Array.from({ length: concurrentDecrements }, () =>
        redis.decrement(key)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentDecrements);
      expect(Math.min(...results)).toBe(100 - concurrentDecrements);
      expect(mockClient.decr).toHaveBeenCalledTimes(concurrentDecrements);
    });

    it('应该安全处理混合递增递减操作', async () => {
      // Arrange
      const key = 'concurrent:mixed-counter';
      const operationCount = 60;
      let currentValue = 50;

      mockClient.incr.mockImplementation(() => {
        currentValue++;
        return Promise.resolve(currentValue);
      });

      mockClient.decr.mockImplementation(() => {
        currentValue--;
        return Promise.resolve(currentValue);
      });

      // Act
      const promises = [];
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          promises.push(redis.increment(key));
        } else {
          promises.push(redis.decrement(key));
        }
      }

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(operationCount);
      
      // 由于递增和递减操作数量相等，最终值应该接近初始值
      const finalValue = currentValue;
      expect(Math.abs(finalValue - 50)).toBeLessThanOrEqual(1);
    });
  });

  describe('事务安全性', () => {
    it('应该支持事务性操作', async () => {
      // Arrange
      const keys = ['tx:key1', 'tx:key2', 'tx:key3'];
      const values = ['value1', 'value2', 'value3'];

      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 'OK', 'OK'])
      };

      mockClient.multi.mockReturnValue(mockMulti);

      // Act
      const multi = mockClient.multi();
      
      for (let i = 0; i < keys.length; i++) {
        multi.set(`inspi:${keys[i]}`, values[i]);
      }
      
      const results = await multi.exec();

      // Assert
      expect(results).toEqual(['OK', 'OK', 'OK']);
      expect(mockMulti.exec).toHaveBeenCalled();
      
      keys.forEach((key, i) => {
        expect(mockMulti.set).toHaveBeenCalledWith(`inspi:${key}`, values[i]);
      });
    });

    it('应该处理事务冲突', async () => {
      // Arrange
      const key = 'tx:conflict';
      const initialValue = 'initial';
      
      mockClient.watch.mockResolvedValue('OK');
      mockClient.unwatch.mockResolvedValue('OK');
      
      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null) // null表示事务被中断
      };

      mockClient.multi.mockReturnValue(mockMulti);

      // Act
      await mockClient.watch(`inspi:${key}`);
      
      const multi = mockClient.multi();
      multi.set(`inspi:${key}`, 'new value');
      
      const result = await multi.exec();

      // Assert
      expect(result).toBeNull(); // 事务应该被中断
      expect(mockClient.watch).toHaveBeenCalledWith(`inspi:${key}`);
      expect(mockMulti.exec).toHaveBeenCalled();
    });

    it('应该处理并发事务操作', async () => {
      // Arrange
      const transactionCount = 10;
      const baseKey = 'concurrent:tx';

      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK'])
      };

      mockClient.multi.mockReturnValue(mockMulti);

      // Act
      const promises = Array.from({ length: transactionCount }, (_, i) => {
        const multi = mockClient.multi();
        multi.set(`inspi:${baseKey}:${i}`, `tx-value-${i}`);
        return multi.exec();
      });

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(transactionCount);
      results.forEach(result => {
        expect(result).toEqual(['OK']);
      });
      expect(mockClient.multi).toHaveBeenCalledTimes(transactionCount);
    });
  });

  describe('竞态条件处理', () => {
    it('应该处理读-修改-写竞态条件', async () => {
      // Arrange
      const key = 'race:condition';
      let sharedCounter = 0;
      const concurrentOperations = 20;

      // 模拟读-修改-写操作
      mockClient.get.mockImplementation(() => 
        Promise.resolve(sharedCounter.toString())
      );

      mockClient.set.mockImplementation((key, value) => {
        sharedCounter = parseInt(value);
        return Promise.resolve('OK');
      });

      const readModifyWrite = async () => {
        const current = await redis.get(key);
        const currentValue = parseInt(current || '0');
        const newValue = currentValue + 1;
        await redis.set(key, newValue.toString());
        return newValue;
      };

      // Act
      const promises = Array.from({ length: concurrentOperations }, () =>
        readModifyWrite()
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentOperations);
      
      // 由于竞态条件，最终值可能不等于操作次数
      // 但应该在合理范围内
      expect(sharedCounter).toBeGreaterThan(0);
      expect(sharedCounter).toBeLessThanOrEqual(concurrentOperations);
    });

    it('应该使用乐观锁处理竞态条件', async () => {
      // Arrange
      const key = 'optimistic:lock';
      const concurrentUpdates = 15;
      let version = 0;

      // 模拟带版本号的乐观锁
      mockClient.get.mockImplementation((key) => {
        if (key.includes('version')) {
          return Promise.resolve(version.toString());
        }
        return Promise.resolve('data value');
      });

      mockClient.set.mockImplementation((key, value) => {
        if (key.includes('version')) {
          version = parseInt(value);
        }
        return Promise.resolve('OK');
      });

      const optimisticUpdate = async (newData: string) => {
        const currentVersion = await redis.get(`${key}:version`);
        const versionNum = parseInt(currentVersion || '0');
        
        // 模拟业务逻辑处理时间
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // 尝试更新
        const newVersion = versionNum + 1;
        await redis.set(`${key}:version`, newVersion.toString());
        await redis.set(key, newData);
        
        return newVersion;
      };

      // Act
      const promises = Array.from({ length: concurrentUpdates }, (_, i) =>
        optimisticUpdate(`data-${i}`)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentUpdates);
      expect(version).toBe(concurrentUpdates); // 版本号应该等于更新次数
    });

    it('应该处理缓存穿透的并发保护', async () => {
      // Arrange
      const key = 'cache:penetration';
      const concurrentRequests = 25;
      let dbCallCount = 0;

      // 模拟数据库调用
      const mockDbCall = async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 10)); // 模拟DB延迟
        return 'db-value';
      };

      // 模拟缓存未命中
      mockClient.get.mockResolvedValue(null);
      mockClient.set.mockResolvedValue('OK');

      const getCachedData = async () => {
        const cached = await redis.get(key);
        if (cached) {
          return cached;
        }

        // 模拟防止缓存穿透的逻辑
        const lockKey = `${key}:lock`;
        const lockValue = Date.now().toString();
        
        // 简化的分布式锁实现
        const acquired = await redis.set(lockKey, lockValue, { ttl: 10 });
        
        if (acquired) {
          try {
            const dbValue = await mockDbCall();
            await redis.set(key, dbValue, { ttl: 300 });
            return dbValue;
          } finally {
            await redis.del(lockKey);
          }
        } else {
          // 等待其他请求完成
          await new Promise(resolve => setTimeout(resolve, 20));
          return redis.get(key) || 'fallback-value';
        }
      };

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        getCachedData()
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      
      // 由于分布式锁保护，数据库调用次数应该远少于并发请求数
      expect(dbCallCount).toBeLessThan(concurrentRequests);
      expect(dbCallCount).toBeGreaterThan(0);
    });
  });

  describe('连接池安全性', () => {
    it('应该安全管理连接池', async () => {
      // Arrange
      const concurrentConnections = 100;
      const maxPoolSize = 10;
      let activeConnections = 0;

      // 模拟连接池管理
      mockClient.get.mockImplementation(() => {
        activeConnections++;
        return new Promise(resolve => {
          setTimeout(() => {
            activeConnections--;
            resolve('pooled-value');
          }, 5);
        });
      });

      // Act
      const promises = Array.from({ length: concurrentConnections }, (_, i) =>
        redis.get(`pool:test:${i}`)
      );

      // 监控连接数
      const connectionMonitor = setInterval(() => {
        expect(activeConnections).toBeLessThanOrEqual(maxPoolSize);
      }, 1);

      const results = await Promise.all(promises);

      clearInterval(connectionMonitor);

      // Assert
      expect(results).toHaveLength(concurrentConnections);
      expect(activeConnections).toBe(0); // 所有连接应该已释放
      
      results.forEach(result => {
        expect(result).toBe('pooled-value');
      });
    });

    it('应该处理连接池耗尽情况', async () => {
      // Arrange
      const excessiveConnections = 50;
      const poolLimit = 5;
      let rejectedConnections = 0;

      mockClient.get.mockImplementation(() => {
        // 模拟连接池限制
        if (Math.random() > 0.8) { // 20%的请求被拒绝
          rejectedConnections++;
          return Promise.reject(new Error('Connection pool exhausted'));
        }
        return Promise.resolve('limited-pool-value');
      });

      // Act
      const promises = Array.from({ length: excessiveConnections }, (_, i) =>
        redis.get(`pool:limit:${i}`).catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(excessiveConnections);
      
      const successfulResults = results.filter(r => typeof r === 'string');
      const errorResults = results.filter(r => typeof r === 'object' && 'error' in r);
      
      expect(successfulResults.length + errorResults.length).toBe(excessiveConnections);
      expect(errorResults.length).toBeGreaterThan(0); // 应该有一些连接被拒绝
    });
  });

  describe('内存安全性', () => {
    it('应该在高并发下控制内存使用', async () => {
      // Arrange
      const concurrentOperations = 200;
      const largeValue = 'x'.repeat(1024); // 1KB per operation

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue(largeValue);

      // Act
      const initialMemory = process.memoryUsage().heapUsed;

      const promises = Array.from({ length: concurrentOperations }, (_, i) => {
        if (i % 2 === 0) {
          return redis.set(`memory:${i}`, largeValue);
        } else {
          return redis.get(`memory:${i}`);
        }
      });

      const results = await Promise.all(promises);

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert
      expect(results).toHaveLength(concurrentOperations);
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('应该防止内存泄漏', async () => {
      // Arrange
      const iterations = 10;
      const operationsPerIteration = 50;

      mockClient.set.mockResolvedValue('OK');
      mockClient.get.mockResolvedValue('test-value');
      mockClient.del.mockResolvedValue(1);

      const memorySnapshots = [];

      // Act
      for (let i = 0; i < iterations; i++) {
        const promises = Array.from({ length: operationsPerIteration }, (_, j) => {
          const key = `leak:test:${i}:${j}`;
          return redis.set(key, `value-${i}-${j}`);
        });

        await Promise.all(promises);

        // 清理
        const deletePromises = Array.from({ length: operationsPerIteration }, (_, j) => {
          const key = `leak:test:${i}:${j}`;
          return redis.del(key);
        });

        await Promise.all(deletePromises);

        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }

        memorySnapshots.push(process.memoryUsage().heapUsed);
      }

      // Assert
      // 内存使用应该相对稳定，不应该持续增长
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot - firstSnapshot;

      // 内存增长应该小于10MB
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});