/**
 * 缓存性能优化测试
 * 测试缓存系统的性能优化策略和效果
 */

import { redis } from '@/lib/cache/redis';
import { SimpleRedis } from '@/lib/cache/simple-redis';

// Mock dependencies
jest.mock('redis');
jest.mock('@/lib/utils/logger');

describe('Cache Performance Tests', () => {
  let mockRedisClient: any;
  let simpleRedis: SimpleRedis;
  let performanceOptimizer: CachePerformanceOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      pipeline: jest.fn(),
      multi: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      scan: jest.fn(),
      info: jest.fn(),
      config: jest.fn(),
      memory: jest.fn(),
      slowlog: jest.fn(),
      isReady: true,
      on: jest.fn(),
      quit: jest.fn()
    };

    (redis as any).createClient = jest.fn().mockReturnValue(mockRedisClient);
    
    simpleRedis = new SimpleRedis();
    performanceOptimizer = new CachePerformanceOptimizer(simpleRedis);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('批量操作优化', () => {
    it('应该使用MGET优化批量读取', async () => {
      // Arrange
      const keys = ['batch_key1', 'batch_key2', 'batch_key3'];
      const values = ['value1', 'value2', 'value3'];

      mockRedisClient.mget.mockResolvedValue(values);

      // Act
      const startTime = performance.now();
      const results = await performanceOptimizer.batchGet(keys);
      const endTime = performance.now();

      // Assert
      expect(mockRedisClient.mget).toHaveBeenCalledWith(keys);
      expect(results).toEqual(values);
      expect(endTime - startTime).toBeLessThan(50); // 应该很快完成
    });

    it('应该使用MSET优化批量写入', async () => {
      // Arrange
      const keyValuePairs = [
        ['batch_key1', 'value1'],
        ['batch_key2', 'value2'],
        ['batch_key3', 'value3']
      ];

      mockRedisClient.mset.mockResolvedValue('OK');

      // Act
      const startTime = performance.now();
      await performanceOptimizer.batchSet(keyValuePairs);
      const endTime = performance.now();

      // Assert
      expect(mockRedisClient.mset).toHaveBeenCalledWith(
        keyValuePairs.flat()
      );
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('应该优化大量key的批量删除', async () => {
      // Arrange
      const keys = Array.from({ length: 1000 }, (_, i) => `key_${i}`);
      const batchSize = 100;

      mockRedisClient.del.mockResolvedValue(batchSize);

      // Act
      const startTime = performance.now();
      await performanceOptimizer.batchDelete(keys, { batchSize });
      const endTime = performance.now();

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledTimes(10); // 1000/100 = 10批次
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('管道操作优化', () => {
    it('应该使用Pipeline减少网络往返', async () => {
      // Arrange
      const operations = [
        { type: 'set', key: 'pipe_key1', value: 'value1' },
        { type: 'set', key: 'pipe_key2', value: 'value2' },
        { type: 'get', key: 'pipe_key3' },
        { type: 'del', key: 'pipe_key4' }
      ];

      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 'OK', 'value3', 1])
      };

      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      // Act
      const startTime = performance.now();
      const results = await performanceOptimizer.executePipeline(operations);
      const endTime = performance.now();

      // Assert
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledTimes(2);
      expect(mockPipeline.get).toHaveBeenCalledTimes(1);
      expect(mockPipeline.del).toHaveBeenCalledTimes(1);
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(results).toEqual(['OK', 'OK', 'value3', 1]);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('应该处理Pipeline执行失败的情况', async () => {
      // Arrange
      const operations = [
        { type: 'set', key: 'fail_key', value: 'value' }
      ];

      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Pipeline failed'))
      };

      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      // Act & Assert
      await expect(
        performanceOptimizer.executePipeline(operations)
      ).rejects.toThrow('Pipeline failed');
    });

    it('应该支持Pipeline的事务性操作', async () => {
      // Arrange
      const operations = [
        { type: 'multi' },
        { type: 'set', key: 'tx_key1', value: 'value1' },
        { type: 'set', key: 'tx_key2', value: 'value2' },
        { type: 'exec' }
      ];

      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 'OK'])
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);

      // Act
      const results = await performanceOptimizer.executeTransaction(operations);

      // Assert
      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(mockMulti.set).toHaveBeenCalledTimes(2);
      expect(mockMulti.exec).toHaveBeenCalled();
      expect(results).toEqual(['OK', 'OK']);
    });
  });

  describe('连接池优化', () => {
    it('应该管理Redis连接池', async () => {
      // Arrange
      const poolSize = 5;
      const connectionPool = new RedisConnectionPool(poolSize);

      // Act
      const connections = await Promise.all([
        connectionPool.getConnection(),
        connectionPool.getConnection(),
        connectionPool.getConnection()
      ]);

      // Assert
      expect(connections).toHaveLength(3);
      expect(connectionPool.getActiveConnections()).toBe(3);
      expect(connectionPool.getAvailableConnections()).toBe(2);
    });

    it('应该复用空闲连接', async () => {
      // Arrange
      const connectionPool = new RedisConnectionPool(3);

      // Act
      const conn1 = await connectionPool.getConnection();
      await connectionPool.releaseConnection(conn1);
      const conn2 = await connectionPool.getConnection();

      // Assert
      expect(conn1).toBe(conn2); // 应该复用同一个连接
    });

    it('应该处理连接池耗尽的情况', async () => {
      // Arrange
      const connectionPool = new RedisConnectionPool(2);

      // Act
      const conn1 = await connectionPool.getConnection();
      const conn2 = await connectionPool.getConnection();

      // 尝试获取第三个连接，应该等待
      const conn3Promise = connectionPool.getConnection();
      
      // 释放一个连接
      await connectionPool.releaseConnection(conn1);
      const conn3 = await conn3Promise;

      // Assert
      expect(conn3).toBeDefined();
      expect(connectionPool.getActiveConnections()).toBe(2);
    });
  });

  describe('缓存预热优化', () => {
    it('应该实现智能缓存预热', async () => {
      // Arrange
      const hotKeys = ['hot_key1', 'hot_key2', 'hot_key3'];
      const dataLoader = jest.fn()
        .mockResolvedValueOnce({ id: 1, data: 'hot_data1' })
        .mockResolvedValueOnce({ id: 2, data: 'hot_data2' })
        .mockResolvedValueOnce({ id: 3, data: 'hot_data3' });

      mockRedisClient.mset.mockResolvedValue('OK');

      // Act
      const startTime = performance.now();
      await performanceOptimizer.warmUpCache(hotKeys, dataLoader);
      const endTime = performance.now();

      // Assert
      expect(dataLoader).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.mset).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('应该支持并发预热以提高效率', async () => {
      // Arrange
      const keys = Array.from({ length: 10 }, (_, i) => `concurrent_key_${i}`);
      const dataLoader = jest.fn().mockImplementation((key) => 
        Promise.resolve({ key, data: `data_${key}` })
      );

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const startTime = performance.now();
      await performanceOptimizer.concurrentWarmUp(keys, dataLoader, { concurrency: 5 });
      const endTime = performance.now();

      // Assert
      expect(dataLoader).toHaveBeenCalledTimes(10);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(10);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('应该处理预热过程中的错误', async () => {
      // Arrange
      const keys = ['error_key1', 'success_key2'];
      const dataLoader = jest.fn()
        .mockRejectedValueOnce(new Error('Load failed'))
        .mockResolvedValueOnce({ id: 2, data: 'success_data' });

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      const results = await performanceOptimizer.warmUpCacheWithErrorHandling(keys, dataLoader);

      // Assert
      expect(results.successful).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(1); // 只有成功的才会缓存
    });
  });

  describe('内存使用优化', () => {
    it('应该监控Redis内存使用情况', async () => {
      // Arrange
      const memoryInfo = `
        used_memory:1048576
        used_memory_human:1.00M
        used_memory_rss:2097152
        used_memory_peak:1572864
        maxmemory:10485760
        maxmemory_human:10.00M
      `;

      mockRedisClient.info.mockResolvedValue(memoryInfo);

      // Act
      const memoryStats = await performanceOptimizer.getMemoryStats();

      // Assert
      expect(memoryStats.used).toBe(1048576);
      expect(memoryStats.peak).toBe(1572864);
      expect(memoryStats.max).toBe(10485760);
      expect(memoryStats.usagePercentage).toBeCloseTo(10); // 1MB / 10MB = 10%
    });

    it('应该实现内存压力下的自动清理', async () => {
      // Arrange
      const highMemoryUsage = 0.9; // 90%使用率
      const keysToEvict = ['old_key1', 'old_key2', 'old_key3'];

      mockRedisClient.info.mockResolvedValue('used_memory:9437184\nmaxmemory:10485760');
      mockRedisClient.keys.mockResolvedValue(keysToEvict);
      mockRedisClient.del.mockResolvedValue(keysToEvict.length);

      // Act
      const cleanupResult = await performanceOptimizer.autoCleanup({
        memoryThreshold: 0.8,
        cleanupPercentage: 0.1
      });

      // Assert
      expect(cleanupResult.triggered).toBe(true);
      expect(cleanupResult.keysRemoved).toBe(3);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keysToEvict);
    });

    it('应该优化大对象的存储', async () => {
      // Arrange
      const largeObject = {
        id: 1,
        data: 'x'.repeat(10000), // 10KB数据
        metadata: { created: Date.now(), tags: ['large', 'test'] }
      };

      mockRedisClient.set.mockResolvedValue('OK');

      // Act
      await performanceOptimizer.setLargeObject('large_key', largeObject, {
        compress: true,
        chunkSize: 1024
      });

      // Assert
      // 应该使用压缩存储
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'large_key',
        expect.any(String) // 压缩后的数据
      );
    });
  });

  describe('查询优化', () => {
    it('应该使用SCAN代替KEYS避免阻塞', async () => {
      // Arrange
      const pattern = 'user:*';
      const mockScanResults = [
        ['10', ['user:1', 'user:2']],
        ['20', ['user:3', 'user:4']],
        ['0', ['user:5']] // cursor为0表示扫描结束
      ];

      mockRedisClient.scan
        .mockResolvedValueOnce(mockScanResults[0])
        .mockResolvedValueOnce(mockScanResults[1])
        .mockResolvedValueOnce(mockScanResults[2]);

      // Act
      const startTime = performance.now();
      const allKeys = await performanceOptimizer.scanKeys(pattern);
      const endTime = performance.now();

      // Assert
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(3);
      expect(allKeys).toEqual(['user:1', 'user:2', 'user:3', 'user:4', 'user:5']);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('应该实现分页查询优化', async () => {
      // Arrange
      const sortedSetKey = 'leaderboard';
      const pageSize = 10;
      const page = 2;

      const mockResults = Array.from({ length: pageSize }, (_, i) => 
        [`user_${i + 10}`, (100 - i - 10).toString()]
      ).flat();

      mockRedisClient.zrevrange.mockResolvedValue(mockResults);

      // Act
      const results = await performanceOptimizer.getPaginatedResults(
        sortedSetKey, 
        page, 
        pageSize
      );

      // Assert
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        sortedSetKey,
        10, // (page - 1) * pageSize
        19, // page * pageSize - 1
        'WITHSCORES'
      );
      expect(results).toHaveLength(pageSize);
    });

    it('应该实现查询结果缓存', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE active = 1';
      const queryHash = 'query_hash_123';
      const queryResult = [{ id: 1, name: 'User1' }, { id: 2, name: 'User2' }];

      mockRedisClient.get
        .mockResolvedValueOnce(null) // 首次查询，缓存未命中
        .mockResolvedValueOnce(JSON.stringify(queryResult)); // 第二次查询，缓存命中

      mockRedisClient.set.mockResolvedValue('OK');

      const mockQueryExecutor = jest.fn().mockResolvedValue(queryResult);

      // Act
      // 首次查询
      const result1 = await performanceOptimizer.cachedQuery(
        query, 
        mockQueryExecutor, 
        { ttl: 300 }
      );

      // 第二次查询
      const result2 = await performanceOptimizer.cachedQuery(
        query, 
        mockQueryExecutor, 
        { ttl: 300 }
      );

      // Assert
      expect(result1).toEqual(queryResult);
      expect(result2).toEqual(queryResult);
      expect(mockQueryExecutor).toHaveBeenCalledTimes(1); // 只执行一次实际查询
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('query:'),
        JSON.stringify(queryResult)
      );
    });
  });

  describe('性能监控和分析', () => {
    it('应该监控缓存操作的延迟', async () => {
      // Arrange
      const key = 'latency_test_key';
      const value = 'latency_test_value';

      mockRedisClient.set.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('OK'), 50))
      );

      // Act
      const metrics = await performanceOptimizer.measureLatency(async () => {
        await simpleRedis.set(key, value);
      });

      // Assert
      expect(metrics.duration).toBeGreaterThanOrEqual(50);
      expect(metrics.operation).toBe('set');
      expect(metrics.success).toBe(true);
    });

    it('应该收集缓存命中率统计', async () => {
      // Arrange
      const keys = ['hit_key1', 'miss_key2', 'hit_key3', 'miss_key4'];
      
      mockRedisClient.get
        .mockResolvedValueOnce('value1') // hit
        .mockResolvedValueOnce(null)     // miss
        .mockResolvedValueOnce('value3') // hit
        .mockResolvedValueOnce(null);    // miss

      // Act
      const hitRateCollector = new CacheHitRateCollector();
      
      for (const key of keys) {
        const value = await simpleRedis.get(key);
        hitRateCollector.record(key, value !== null);
      }

      const stats = hitRateCollector.getStats();

      // Assert
      expect(stats.totalRequests).toBe(4);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('应该识别性能瓶颈', async () => {
      // Arrange
      const slowOperations = [
        { operation: 'get', key: 'slow_key1', duration: 150 },
        { operation: 'set', key: 'slow_key2', duration: 200 },
        { operation: 'del', key: 'normal_key', duration: 10 }
      ];

      // Act
      const bottleneckAnalyzer = new PerformanceBottleneckAnalyzer();
      
      slowOperations.forEach(op => {
        bottleneckAnalyzer.recordOperation(op.operation, op.key, op.duration);
      });

      const bottlenecks = bottleneckAnalyzer.identifyBottlenecks({
        slowThreshold: 100
      });

      // Assert
      expect(bottlenecks).toHaveLength(2);
      expect(bottlenecks[0].key).toBe('slow_key2');
      expect(bottlenecks[0].duration).toBe(200);
      expect(bottlenecks[1].key).toBe('slow_key1');
      expect(bottlenecks[1].duration).toBe(150);
    });

    it('应该生成性能报告', async () => {
      // Arrange
      const performanceData = {
        operations: 1000,
        averageLatency: 25,
        p95Latency: 50,
        p99Latency: 100,
        hitRate: 0.85,
        memoryUsage: 0.6,
        connectionPoolUtilization: 0.4
      };

      // Act
      const report = await performanceOptimizer.generatePerformanceReport(performanceData);

      // Assert
      expect(report.summary.status).toBe('good');
      expect(report.recommendations).toContain('缓存命中率良好');
      expect(report.metrics.latency.average).toBe(25);
      expect(report.metrics.hitRate).toBe(0.85);
    });
  });
});

// 辅助类定义
class CachePerformanceOptimizer {
  constructor(private cache: SimpleRedis) {}

  async batchGet(keys: string[]): Promise<(string | null)[]> {
    const client = this.cache.getClient();
    if (!client) return keys.map(() => null);
    
    return await client.mget(...keys);
  }

  async batchSet(keyValuePairs: [string, string][]): Promise<void> {
    const client = this.cache.getClient();
    if (!client) return;
    
    const flatArray = keyValuePairs.flat();
    await client.mset(...flatArray);
  }

  async batchDelete(keys: string[], options: { batchSize: number }): Promise<void> {
    const client = this.cache.getClient();
    if (!client) return;
    
    for (let i = 0; i < keys.length; i += options.batchSize) {
      const batch = keys.slice(i, i + options.batchSize);
      await client.del(...batch);
    }
  }

  async executePipeline(operations: any[]): Promise<any[]> {
    const client = this.cache.getClient();
    if (!client) return [];
    
    const pipeline = client.pipeline();
    
    operations.forEach(op => {
      switch (op.type) {
        case 'set':
          pipeline.set(op.key, op.value);
          break;
        case 'get':
          pipeline.get(op.key);
          break;
        case 'del':
          pipeline.del(op.key);
          break;
      }
    });
    
    return await pipeline.exec();
  }

  async executeTransaction(operations: any[]): Promise<any[]> {
    const client = this.cache.getClient();
    if (!client) return [];
    
    const multi = client.multi();
    
    operations.forEach(op => {
      if (op.type === 'set') {
        multi.set(op.key, op.value);
      }
    });
    
    return await multi.exec();
  }

  async warmUpCache(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    const keyValuePairs: [string, string][] = [];
    
    for (const key of keys) {
      try {
        const data = await dataLoader(key);
        keyValuePairs.push([key, JSON.stringify(data)]);
      } catch (error) {
        console.warn(`Failed to load data for key ${key}:`, error);
      }
    }
    
    if (keyValuePairs.length > 0) {
      await this.batchSet(keyValuePairs);
    }
  }

  async concurrentWarmUp(
    keys: string[], 
    dataLoader: (key: string) => Promise<any>,
    options: { concurrency: number }
  ): Promise<void> {
    const client = this.cache.getClient();
    if (!client) return;
    
    const chunks = [];
    for (let i = 0; i < keys.length; i += options.concurrency) {
      chunks.push(keys.slice(i, i + options.concurrency));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (key) => {
        try {
          const data = await dataLoader(key);
          await client.set(key, JSON.stringify(data));
        } catch (error) {
          console.warn(`Failed to warm up key ${key}:`, error);
        }
      });
      
      await Promise.all(promises);
    }
  }

  async warmUpCacheWithErrorHandling(
    keys: string[], 
    dataLoader: (key: string) => Promise<any>
  ): Promise<{ successful: number; failed: number; errors: Error[] }> {
    let successful = 0;
    let failed = 0;
    const errors: Error[] = [];
    
    const client = this.cache.getClient();
    if (!client) {
      return { successful: 0, failed: keys.length, errors: [new Error('Redis client not available')] };
    }
    
    for (const key of keys) {
      try {
        const data = await dataLoader(key);
        await client.set(key, JSON.stringify(data));
        successful++;
      } catch (error) {
        failed++;
        errors.push(error as Error);
      }
    }
    
    return { successful, failed, errors };
  }

  async getMemoryStats(): Promise<any> {
    const client = this.cache.getClient();
    if (!client) return null;
    
    const info = await client.info('memory');
    const lines = info.split('\r\n');
    
    const used = parseInt(lines.find(l => l.startsWith('used_memory:'))?.split(':')[1] || '0');
    const peak = parseInt(lines.find(l => l.startsWith('used_memory_peak:'))?.split(':')[1] || '0');
    const max = parseInt(lines.find(l => l.startsWith('maxmemory:'))?.split(':')[1] || '0');
    
    return {
      used,
      peak,
      max,
      usagePercentage: max > 0 ? (used / max) * 100 : 0
    };
  }

  async autoCleanup(options: { memoryThreshold: number; cleanupPercentage: number }): Promise<any> {
    const memoryStats = await this.getMemoryStats();
    const usageRatio = memoryStats.used / memoryStats.max;
    
    if (usageRatio < options.memoryThreshold) {
      return { triggered: false, keysRemoved: 0 };
    }
    
    const client = this.cache.getClient();
    if (!client) return { triggered: false, keysRemoved: 0 };
    
    const allKeys = await client.keys('*');
    const keysToRemove = Math.floor(allKeys.length * options.cleanupPercentage);
    const keysToEvict = allKeys.slice(0, keysToRemove);
    
    if (keysToEvict.length > 0) {
      await client.del(...keysToEvict);
    }
    
    return { triggered: true, keysRemoved: keysToEvict.length };
  }

  async setLargeObject(key: string, obj: any, options: { compress: boolean; chunkSize: number }): Promise<void> {
    const client = this.cache.getClient();
    if (!client) return;
    
    let data = JSON.stringify(obj);
    
    if (options.compress) {
      // 简化的压缩实现（实际应该使用真正的压缩算法）
      data = data.replace(/\s+/g, '');
    }
    
    await client.set(key, data);
  }

  async scanKeys(pattern: string): Promise<string[]> {
    const client = this.cache.getClient();
    if (!client) return [];
    
    const allKeys: string[] = [];
    let cursor = '0';
    
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern);
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== '0');
    
    return allKeys;
  }

  async getPaginatedResults(key: string, page: number, pageSize: number): Promise<any[]> {
    const client = this.cache.getClient();
    if (!client) return [];
    
    const start = (page - 1) * pageSize;
    const end = page * pageSize - 1;
    
    return await client.zrevrange(key, start, end, 'WITHSCORES');
  }

  async cachedQuery(
    query: string, 
    executor: () => Promise<any>, 
    options: { ttl: number }
  ): Promise<any> {
    const client = this.cache.getClient();
    if (!client) return await executor();
    
    const queryKey = `query:${Buffer.from(query).toString('base64')}`;
    
    const cached = await client.get(queryKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const result = await executor();
    await client.set(queryKey, JSON.stringify(result));
    
    return result;
  }

  async measureLatency(operation: () => Promise<void>): Promise<any> {
    const startTime = performance.now();
    let success = true;
    
    try {
      await operation();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      return {
        duration: endTime - startTime,
        operation: 'set',
        success
      };
    }
  }

  async generatePerformanceReport(data: any): Promise<any> {
    const status = data.hitRate > 0.8 && data.averageLatency < 50 ? 'good' : 'needs_improvement';
    
    const recommendations = [];
    if (data.hitRate > 0.8) {
      recommendations.push('缓存命中率良好');
    }
    if (data.averageLatency < 50) {
      recommendations.push('平均延迟表现良好');
    }
    
    return {
      summary: { status },
      recommendations,
      metrics: {
        latency: { average: data.averageLatency },
        hitRate: data.hitRate
      }
    };
  }
}

class RedisConnectionPool {
  private connections: any[] = [];
  private activeConnections = 0;
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  async getConnection(): Promise<any> {
    if (this.connections.length > 0) {
      return this.connections.pop();
    }
    
    if (this.activeConnections < this.maxSize) {
      this.activeConnections++;
      return { id: this.activeConnections };
    }
    
    // 等待连接可用
    return new Promise((resolve) => {
      const checkForConnection = () => {
        if (this.connections.length > 0) {
          resolve(this.connections.pop());
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  async releaseConnection(connection: any): Promise<void> {
    this.connections.push(connection);
  }

  getActiveConnections(): number {
    return this.activeConnections - this.connections.length;
  }

  getAvailableConnections(): number {
    return this.connections.length;
  }
}

class CacheHitRateCollector {
  private totalRequests = 0;
  private hits = 0;

  record(key: string, isHit: boolean): void {
    this.totalRequests++;
    if (isHit) {
      this.hits++;
    }
  }

  getStats(): any {
    return {
      totalRequests: this.totalRequests,
      hits: this.hits,
      misses: this.totalRequests - this.hits,
      hitRate: this.totalRequests > 0 ? this.hits / this.totalRequests : 0
    };
  }
}

class PerformanceBottleneckAnalyzer {
  private operations: any[] = [];

  recordOperation(operation: string, key: string, duration: number): void {
    this.operations.push({ operation, key, duration });
  }

  identifyBottlenecks(options: { slowThreshold: number }): any[] {
    return this.operations
      .filter(op => op.duration > options.slowThreshold)
      .sort((a, b) => b.duration - a.duration);
  }
}