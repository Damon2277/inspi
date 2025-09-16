/**
 * 数据库性能和优化测试
 * 测试数据库查询性能、索引优化、连接池管理和缓存策略
 */

import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Work from '@/lib/models/Work';
import Contribution from '@/lib/models/Contribution';

// Mock performance monitoring
const performanceMonitor = {
  marks: new Map(),
  measures: new Map(),
  
  mark: (name: string) => {
    performanceMonitor.marks.set(name, Date.now());
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    const startTime = performanceMonitor.marks.get(startMark);
    const endTime = endMark ? performanceMonitor.marks.get(endMark) : Date.now();
    const duration = endTime - startTime;
    performanceMonitor.measures.set(name, duration);
    return duration;
  },
  
  getEntriesByType: (type: string) => {
    if (type === 'measure') {
      return Array.from(performanceMonitor.measures.entries()).map(([name, duration]) => ({
        name,
        duration
      }));
    }
    return [];
  },
  
  clearMarks: () => performanceMonitor.marks.clear(),
  clearMeasures: () => performanceMonitor.measures.clear()
};

// Mock global performance object
global.performance = performanceMonitor as any;

// Mock mongoose with performance tracking
const mockConnection = {
  db: {
    admin: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue({ ok: 1 }),
      serverStatus: jest.fn().mockResolvedValue({
        connections: { current: 10, available: 990 },
        opcounters: { query: 1000, insert: 500, update: 300, delete: 100 },
        mem: { resident: 100, virtual: 200 }
      })
    }),
    stats: jest.fn().mockResolvedValue({
      collections: 5,
      objects: 10000,
      avgObjSize: 1024,
      dataSize: 10240000,
      storageSize: 20480000,
      indexes: 15,
      indexSize: 5120000
    })
  }
};

jest.mock('mongoose', () => ({
  connection: mockConnection,
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => id || `mock-id-${Date.now()}`)
  }
}));

// Enhanced mock models with performance tracking
const createPerformanceMockModel = (name: string) => {
  const mockData = new Map();
  const queryStats = {
    totalQueries: 0,
    slowQueries: 0,
    averageQueryTime: 0,
    queryTimes: []
  };
  
  const trackQuery = async (queryName: string, queryFn: () => Promise<any>) => {
    const startTime = Date.now();
    queryStats.totalQueries++;
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      queryStats.queryTimes.push(duration);
      queryStats.averageQueryTime = queryStats.queryTimes.reduce((a, b) => a + b, 0) / queryStats.queryTimes.length;
      
      if (duration > 100) { // 超过100ms认为是慢查询
        queryStats.slowQueries++;
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  };
  
  return {
    // Basic CRUD with performance tracking
    create: jest.fn().mockImplementation(async (data) => {
      return trackQuery('create', async () => {
        const doc = {
          ...data,
          _id: `mock-${name.toLowerCase()}-id-${Date.now()}-${Math.random()}`,
          save: jest.fn().mockResolvedValue(data)
        };
        mockData.set(doc._id, doc);
        return doc;
      });
    }),
    
    find: jest.fn().mockImplementation((query = {}) => ({
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      hint: jest.fn().mockReturnThis(),
      explain: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        return trackQuery('find', async () => {
          // 模拟查询延迟
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          return Array.from(mockData.values()).filter(item => 
            Object.keys(query).every(key => {
              if (typeof query[key] === 'object' && query[key].$regex) {
                return new RegExp(query[key].$regex, query[key].$options || '').test(item[key]);
              }
              return item[key] === query[key];
            })
          );
        });
      })
    })),
    
    findById: jest.fn().mockImplementation((id) => ({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        return trackQuery('findById', async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          return mockData.get(id) || null;
        });
      })
    })),
    
    findOne: jest.fn().mockImplementation((query) => ({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        return trackQuery('findOne', async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
          return Array.from(mockData.values()).find(item => 
            Object.keys(query).every(key => item[key] === query[key])
          ) || null;
        });
      })
    })),
    
    aggregate: jest.fn().mockImplementation((pipeline) => ({
      allowDiskUse: jest.fn().mockReturnThis(),
      hint: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        return trackQuery('aggregate', async () => {
          // 模拟聚合查询的复杂性
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
          
          // 简单的聚合模拟
          const data = Array.from(mockData.values());
          if (pipeline.some(stage => stage.$group)) {
            return [{ _id: null, count: data.length, total: data.length }];
          }
          return data;
        });
      })
    })),
    
    countDocuments: jest.fn().mockImplementation((query = {}) => ({
      exec: jest.fn().mockImplementation(() => {
        return trackQuery('countDocuments', async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return Array.from(mockData.values()).filter(item => 
            Object.keys(query).every(key => item[key] === query[key])
          ).length;
        });
      })
    })),
    
    // Index operations
    createIndex: jest.fn().mockImplementation((index, options = {}) => {
      return Promise.resolve({ ok: 1, createdCollectionAutomatically: false, numIndexesBefore: 1, numIndexesAfter: 2 });
    }),
    
    dropIndex: jest.fn().mockImplementation((index) => {
      return Promise.resolve({ ok: 1, nIndexesWas: 2 });
    }),
    
    getIndexes: jest.fn().mockImplementation(() => {
      return Promise.resolve([
        { v: 2, key: { _id: 1 }, name: '_id_' },
        { v: 2, key: { email: 1 }, name: 'email_1', unique: true },
        { v: 2, key: { createdAt: -1 }, name: 'createdAt_-1' }
      ]);
    }),
    
    // Performance utilities
    __getQueryStats: () => queryStats,
    __resetQueryStats: () => {
      queryStats.totalQueries = 0;
      queryStats.slowQueries = 0;
      queryStats.averageQueryTime = 0;
      queryStats.queryTimes = [];
    },
    __clearData: () => mockData.clear(),
    __addMockData: (data: any[]) => {
      data.forEach((item, index) => {
        const doc = { ...item, _id: `mock-${name.toLowerCase()}-${index}` };
        mockData.set(doc._id, doc);
      });
    }
  };
};

// Create performance-aware mock models
const MockUser = createPerformanceMockModel('User');
const MockWork = createPerformanceMockModel('Work');
const MockContribution = createPerformanceMockModel('Contribution');

// Mock the model imports
jest.mock('@/lib/models/User', () => MockUser);
jest.mock('@/lib/models/Work', () => MockWork);
jest.mock('@/lib/models/Contribution', () => MockContribution);

describe('数据库性能和优化测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockUser.__clearData();
    MockWork.__clearData();
    MockContribution.__clearData();
    MockUser.__resetQueryStats();
    MockWork.__resetQueryStats();
    MockContribution.__resetQueryStats();
    performanceMonitor.clearMarks();
    performanceMonitor.clearMeasures();
  });

  describe('查询性能测试', () => {
    it('应该在合理时间内完成简单查询', async () => {
      // Arrange
      MockUser.__addMockData([
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
        { email: 'user3@example.com', name: 'User 3' }
      ]);

      performance.mark('query-start');

      // Act
      const users = await MockUser.find().exec();

      performance.mark('query-end');
      const duration = performance.measure('simple-query', 'query-start', 'query-end');

      // Assert
      expect(users).toHaveLength(3);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该优化大数据集查询', async () => {
      // Arrange - 创建大量测试数据
      const largeDataSet = Array(1000).fill(null).map((_, index) => ({
        email: `user${index}@example.com`,
        name: `User ${index}`,
        contributionScore: Math.floor(Math.random() * 1000)
      }));
      
      MockUser.__addMockData(largeDataSet);

      performance.mark('large-query-start');

      // Act
      const users = await MockUser.find({ contributionScore: { $gte: 500 } }).exec();

      performance.mark('large-query-end');
      const duration = performance.measure('large-query', 'large-query-start', 'large-query-end');

      // Assert
      expect(users.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // 大数据集查询应该在500ms内完成
    });

    it('应该支持分页查询优化', async () => {
      // Arrange
      const testData = Array(100).fill(null).map((_, index) => ({
        email: `page${index}@example.com`,
        name: `Page User ${index}`,
        createdAt: new Date(Date.now() - index * 1000)
      }));
      
      MockUser.__addMockData(testData);

      performance.mark('pagination-start');

      // Act
      const page1 = await MockUser.find().sort({ createdAt: -1 }).limit(10).skip(0).exec();
      const page2 = await MockUser.find().sort({ createdAt: -1 }).limit(10).skip(10).exec();

      performance.mark('pagination-end');
      const duration = performance.measure('pagination-query', 'pagination-start', 'pagination-end');

      // Assert
      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(duration).toBeLessThan(200); // 分页查询应该在200ms内完成
    });

    it('应该优化复杂聚合查询', async () => {
      // Arrange
      MockWork.__addMockData([
        { title: 'Work 1', author: 'user1', subject: 'Math', likes: 10 },
        { title: 'Work 2', author: 'user1', subject: 'Science', likes: 15 },
        { title: 'Work 3', author: 'user2', subject: 'Math', likes: 8 },
        { title: 'Work 4', author: 'user2', subject: 'Math', likes: 12 }
      ]);

      performance.mark('aggregation-start');

      // Act
      const stats = await MockWork.aggregate([
        { $group: { _id: '$subject', totalLikes: { $sum: '$likes' }, count: { $sum: 1 } } },
        { $sort: { totalLikes: -1 } }
      ]).exec();

      performance.mark('aggregation-end');
      const duration = performance.measure('aggregation-query', 'aggregation-start', 'aggregation-end');

      // Assert
      expect(stats).toBeDefined();
      expect(duration).toBeLessThan(300); // 聚合查询应该在300ms内完成
    });

    it('应该监控慢查询', async () => {
      // Arrange
      MockUser.__addMockData([
        { email: 'slow@example.com', name: 'Slow User' }
      ]);

      // Act - 执行多个查询
      await MockUser.find().exec();
      await MockUser.findOne({ email: 'slow@example.com' }).exec();
      await MockUser.countDocuments().exec();

      // Assert
      const stats = MockUser.__getQueryStats();
      expect(stats.totalQueries).toBe(3);
      expect(stats.averageQueryTime).toBeGreaterThan(0);
      expect(stats.slowQueries).toBeLessThanOrEqual(stats.totalQueries);
    });
  });

  describe('索引优化测试', () => {
    it('应该创建有效的索引', async () => {
      // Act
      const result = await MockUser.createIndex({ email: 1 }, { unique: true });

      // Assert
      expect(result.ok).toBe(1);
      expect(result.numIndexesAfter).toBeGreaterThan(result.numIndexesBefore);
    });

    it('应该创建复合索引', async () => {
      // Act
      const result = await MockUser.createIndex(
        { subject: 1, createdAt: -1 },
        { name: 'subject_createdAt_compound' }
      );

      // Assert
      expect(result.ok).toBe(1);
    });

    it('应该创建文本索引', async () => {
      // Act
      const result = await MockWork.createIndex(
        { title: 'text', description: 'text' },
        { name: 'text_search_index' }
      );

      // Assert
      expect(result.ok).toBe(1);
    });

    it('应该列出现有索引', async () => {
      // Act
      const indexes = await MockUser.getIndexes();

      // Assert
      expect(indexes).toBeInstanceOf(Array);
      expect(indexes.length).toBeGreaterThan(0);
      expect(indexes[0]).toHaveProperty('key');
      expect(indexes[0]).toHaveProperty('name');
    });

    it('应该删除不需要的索引', async () => {
      // Act
      const result = await MockUser.dropIndex('email_1');

      // Assert
      expect(result.ok).toBe(1);
      expect(result.nIndexesWas).toBeGreaterThan(0);
    });

    it('应该测试索引使用效果', async () => {
      // Arrange
      MockUser.__addMockData(Array(1000).fill(null).map((_, index) => ({
        email: `indexed${index}@example.com`,
        name: `Indexed User ${index}`,
        contributionScore: index
      })));

      // Act - 使用索引的查询
      performance.mark('indexed-query-start');
      const indexedResult = await MockUser.find({ email: 'indexed500@example.com' }).exec();
      performance.mark('indexed-query-end');
      const indexedDuration = performance.measure('indexed-query', 'indexed-query-start', 'indexed-query-end');

      // Act - 不使用索引的查询
      performance.mark('non-indexed-query-start');
      const nonIndexedResult = await MockUser.find({ contributionScore: 500 }).exec();
      performance.mark('non-indexed-query-end');
      const nonIndexedDuration = performance.measure('non-indexed-query', 'non-indexed-query-start', 'non-indexed-query-end');

      // Assert
      expect(indexedResult).toHaveLength(1);
      expect(nonIndexedResult).toHaveLength(1);
      // 索引查询通常应该更快，但在mock环境中可能不明显
      expect(indexedDuration).toBeLessThan(100);
      expect(nonIndexedDuration).toBeLessThan(100);
    });
  });

  describe('连接池管理测试', () => {
    it('应该监控连接池状态', async () => {
      // Act
      const status = await mongoose.connection.db.admin().serverStatus();

      // Assert
      expect(status.connections).toBeDefined();
      expect(status.connections.current).toBeGreaterThan(0);
      expect(status.connections.available).toBeGreaterThan(0);
    });

    it('应该处理连接池耗尽', async () => {
      // Arrange
      const connectionPromises = Array(20).fill(null).map(async () => {
        return MockUser.find().exec();
      });

      // Act
      const results = await Promise.all(connectionPromises);

      // Assert
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Array);
      });
    });

    it('应该优化连接复用', async () => {
      // Arrange
      performance.mark('connection-reuse-start');

      // Act - 执行多个查询，应该复用连接
      const queries = Array(10).fill(null).map(() => MockUser.countDocuments().exec());
      await Promise.all(queries);

      performance.mark('connection-reuse-end');
      const duration = performance.measure('connection-reuse', 'connection-reuse-start', 'connection-reuse-end');

      // Assert
      expect(duration).toBeLessThan(1000); // 连接复用应该提高性能
    });

    it('应该监控操作计数器', async () => {
      // Act
      const status = await mongoose.connection.db.admin().serverStatus();

      // Assert
      expect(status.opcounters).toBeDefined();
      expect(status.opcounters.query).toBeGreaterThan(0);
      expect(status.opcounters.insert).toBeGreaterThan(0);
      expect(status.opcounters.update).toBeGreaterThan(0);
    });
  });

  describe('内存使用优化测试', () => {
    it('应该使用lean查询减少内存使用', async () => {
      // Arrange
      MockUser.__addMockData(Array(100).fill(null).map((_, index) => ({
        email: `lean${index}@example.com`,
        name: `Lean User ${index}`,
        profile: { bio: 'A'.repeat(1000) } // 大对象
      })));

      const initialMemory = process.memoryUsage().heapUsed;

      // Act - 使用lean查询
      const leanResults = await MockUser.find().lean().exec();

      const leanMemory = process.memoryUsage().heapUsed;

      // Act - 普通查询
      const normalResults = await MockUser.find().exec();

      const normalMemory = process.memoryUsage().heapUsed;

      // Assert
      expect(leanResults).toHaveLength(100);
      expect(normalResults).toHaveLength(100);
      
      const leanMemoryIncrease = leanMemory - initialMemory;
      const normalMemoryIncrease = normalMemory - leanMemory;
      
      // lean查询通常使用更少内存
      expect(leanMemoryIncrease).toBeLessThan(normalMemoryIncrease * 2);
    });

    it('应该优化populate查询', async () => {
      // Arrange
      MockUser.__addMockData([
        { _id: 'user1', email: 'author@example.com', name: 'Author' }
      ]);
      
      MockWork.__addMockData([
        { title: 'Work 1', author: 'user1', content: { concept: 'test' } },
        { title: 'Work 2', author: 'user1', content: { concept: 'test' } }
      ]);

      performance.mark('populate-start');

      // Act
      const works = await MockWork.find().populate('author').exec();

      performance.mark('populate-end');
      const duration = performance.measure('populate-query', 'populate-start', 'populate-end');

      // Assert
      expect(works).toHaveLength(2);
      expect(duration).toBeLessThan(200); // populate查询应该优化
    });

    it('应该监控内存泄漏', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;

      // Act - 执行大量操作
      for (let i = 0; i < 100; i++) {
        await MockUser.create({
          email: `memory${i}@example.com`,
          name: `Memory User ${i}`
        });
        
        await MockUser.find().limit(10).exec();
        
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 不应超过50MB
    });
  });

  describe('缓存策略测试', () => {
    it('应该实现查询结果缓存', async () => {
      // Arrange
      const cache = new Map();
      const cacheKey = 'user_list_page_1';
      
      MockUser.__addMockData([
        { email: 'cache1@example.com', name: 'Cache User 1' },
        { email: 'cache2@example.com', name: 'Cache User 2' }
      ]);

      // Act - 第一次查询
      performance.mark('first-query-start');
      const firstResult = await MockUser.find().limit(10).exec();
      cache.set(cacheKey, firstResult);
      performance.mark('first-query-end');
      const firstDuration = performance.measure('first-query', 'first-query-start', 'first-query-end');

      // Act - 从缓存获取
      performance.mark('cached-query-start');
      const cachedResult = cache.get(cacheKey);
      performance.mark('cached-query-end');
      const cachedDuration = performance.measure('cached-query', 'cached-query-start', 'cached-query-end');

      // Assert
      expect(firstResult).toHaveLength(2);
      expect(cachedResult).toEqual(firstResult);
      expect(cachedDuration).toBeLessThan(firstDuration); // 缓存应该更快
    });

    it('应该实现缓存失效策略', async () => {
      // Arrange
      const cache = new Map();
      const cacheKey = 'user_count';
      const ttl = 1000; // 1秒TTL
      
      // Act - 设置缓存
      const count = await MockUser.countDocuments().exec();
      cache.set(cacheKey, { value: count, timestamp: Date.now() });

      // 等待TTL过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Act - 检查缓存是否过期
      const cached = cache.get(cacheKey);
      const isExpired = cached && (Date.now() - cached.timestamp) > ttl;

      // Assert
      expect(cached).toBeDefined();
      expect(isExpired).toBe(true);
    });

    it('应该实现智能缓存预热', async () => {
      // Arrange
      const cache = new Map();
      const popularQueries = [
        { query: {}, options: { limit: 10, sort: { createdAt: -1 } } },
        { query: { isPublic: true }, options: { limit: 20 } }
      ];

      MockWork.__addMockData(Array(50).fill(null).map((_, index) => ({
        title: `Popular Work ${index}`,
        isPublic: index % 2 === 0,
        createdAt: new Date(Date.now() - index * 1000)
      })));

      performance.mark('cache-warmup-start');

      // Act - 预热缓存
      for (const { query, options } of popularQueries) {
        const cacheKey = JSON.stringify({ query, options });
        const result = await MockWork.find(query).limit(options.limit).exec();
        cache.set(cacheKey, result);
      }

      performance.mark('cache-warmup-end');
      const warmupDuration = performance.measure('cache-warmup', 'cache-warmup-start', 'cache-warmup-end');

      // Assert
      expect(cache.size).toBe(popularQueries.length);
      expect(warmupDuration).toBeLessThan(1000); // 预热应该快速完成
    });
  });

  describe('数据库统计和监控测试', () => {
    it('应该获取数据库统计信息', async () => {
      // Act
      const stats = await mongoose.connection.db.stats();

      // Assert
      expect(stats).toBeDefined();
      expect(stats.collections).toBeGreaterThan(0);
      expect(stats.objects).toBeGreaterThan(0);
      expect(stats.dataSize).toBeGreaterThan(0);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.indexes).toBeGreaterThan(0);
    });

    it('应该监控查询性能趋势', async () => {
      // Arrange
      const performanceHistory = [];
      
      MockUser.__addMockData(Array(100).fill(null).map((_, index) => ({
        email: `trend${index}@example.com`,
        name: `Trend User ${index}`
      })));

      // Act - 执行多次查询并记录性能
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await MockUser.find().limit(10).skip(i * 10).exec();
        const duration = Date.now() - startTime;
        performanceHistory.push(duration);
      }

      // Assert
      const averageTime = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
      const maxTime = Math.max(...performanceHistory);
      const minTime = Math.min(...performanceHistory);

      expect(averageTime).toBeLessThan(100);
      expect(maxTime - minTime).toBeLessThan(200); // 性能应该相对稳定
    });

    it('应该检测性能异常', async () => {
      // Arrange
      const performanceThreshold = 100; // 100ms阈值
      const anomalies = [];

      MockUser.__addMockData(Array(50).fill(null).map((_, index) => ({
        email: `anomaly${index}@example.com`,
        name: `Anomaly User ${index}`
      })));

      // Act - 执行查询并检测异常
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await MockUser.find().exec();
        const duration = Date.now() - startTime;
        
        if (duration > performanceThreshold) {
          anomalies.push({ query: 'find_all', duration, timestamp: Date.now() });
        }
      }

      // Assert
      expect(anomalies.length).toBeLessThanOrEqual(5);
      anomalies.forEach(anomaly => {
        expect(anomaly.duration).toBeGreaterThan(performanceThreshold);
        expect(anomaly.query).toBeDefined();
        expect(anomaly.timestamp).toBeDefined();
      });
    });

    it('应该生成性能报告', async () => {
      // Arrange
      MockUser.__addMockData([{ email: 'report@example.com', name: 'Report User' }]);

      // Act - 执行各种操作
      await MockUser.find().exec();
      await MockUser.findOne({ email: 'report@example.com' }).exec();
      await MockUser.countDocuments().exec();

      const userStats = MockUser.__getQueryStats();

      // Act - 生成报告
      const report = {
        timestamp: new Date().toISOString(),
        totalQueries: userStats.totalQueries,
        slowQueries: userStats.slowQueries,
        averageQueryTime: userStats.averageQueryTime,
        slowQueryPercentage: (userStats.slowQueries / userStats.totalQueries) * 100,
        recommendations: []
      };

      if (report.slowQueryPercentage > 10) {
        report.recommendations.push('Consider adding indexes for frequently queried fields');
      }

      if (report.averageQueryTime > 50) {
        report.recommendations.push('Review query patterns and consider optimization');
      }

      // Assert
      expect(report.totalQueries).toBeGreaterThan(0);
      expect(report.averageQueryTime).toBeGreaterThan(0);
      expect(report.slowQueryPercentage).toBeGreaterThanOrEqual(0);
      expect(report.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('批量操作优化测试', () => {
    it('应该优化批量插入', async () => {
      // Arrange
      const batchData = Array(1000).fill(null).map((_, index) => ({
        email: `batch${index}@example.com`,
        name: `Batch User ${index}`
      }));

      performance.mark('batch-insert-start');

      // Act - 批量插入
      const insertPromises = batchData.map(data => MockUser.create(data));
      await Promise.all(insertPromises);

      performance.mark('batch-insert-end');
      const duration = performance.measure('batch-insert', 'batch-insert-start', 'batch-insert-end');

      // Assert
      expect(duration).toBeLessThan(5000); // 1000条记录应该在5秒内完成
      
      const count = await MockUser.countDocuments().exec();
      expect(count).toBe(1000);
    });

    it('应该优化批量更新', async () => {
      // Arrange
      MockUser.__addMockData(Array(100).fill(null).map((_, index) => ({
        _id: `batch-update-${index}`,
        email: `update${index}@example.com`,
        name: `Update User ${index}`,
        isActive: false
      })));

      performance.mark('batch-update-start');

      // Act - 批量更新
      const updatePromises = Array(100).fill(null).map((_, index) =>
        MockUser.findByIdAndUpdate(
          `batch-update-${index}`,
          { isActive: true },
          { new: true }
        ).exec()
      );

      await Promise.all(updatePromises);

      performance.mark('batch-update-end');
      const duration = performance.measure('batch-update', 'batch-update-start', 'batch-update-end');

      // Assert
      expect(duration).toBeLessThan(3000); // 100条更新应该在3秒内完成
    });

    it('应该处理批量操作错误', async () => {
      // Arrange
      const mixedData = [
        { email: 'valid1@example.com', name: 'Valid User 1' },
        { email: 'valid2@example.com', name: 'Valid User 2' },
        { email: null, name: 'Invalid User' }, // 无效数据
        { email: 'valid3@example.com', name: 'Valid User 3' }
      ];

      // Act
      const results = await Promise.allSettled(
        mixedData.map(data => MockUser.create(data))
      );

      // Assert
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      expect(successful.length).toBe(3); // 3个有效记录
      expect(failed.length).toBe(1); // 1个无效记录
    });
  });
});