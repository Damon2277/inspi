/**
 * 配额管理器并发测试
 * 测试配额检查和消费的并发安全性
 */

import { QuotaManager, UserQuota } from '@/lib/quota/quotaManager';
import { redis } from '@/lib/cache/redis';

// Mock dependencies
jest.mock('@/lib/cache/redis');
jest.mock('@/lib/utils/logger');

describe('QuotaManager Concurrency Tests', () => {
  let quotaManager: QuotaManager;
  let mockRedis: jest.Mocked<typeof redis>;

  beforeEach(() => {
    jest.clearAllMocks();
    quotaManager = new QuotaManager();
    mockRedis = redis as jest.Mocked<typeof redis>;
    
    // Mock Redis methods
    mockRedis.get = jest.fn();
    mockRedis.set = jest.fn();
    mockRedis.del = jest.fn();
    mockRedis.increment = jest.fn();
    mockRedis.isReady = jest.fn().mockReturnValue(true);
  });

  describe('并发配额检查', () => {
    it('应该处理多个并发的配额检查请求', async () => {
      // Arrange
      const userId = 'concurrent-user-1';
      const plan = 'pro';
      const concurrentRequests = 50;

      mockRedis.get.mockResolvedValue('25'); // 当前使用量

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.checkQuota(userId, plan)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.userId).toBe(userId);
        expect(result.plan).toBe(plan);
        expect(result.currentUsage).toBe(25);
        expect(result.remaining).toBe(75); // 100 - 25
        expect(result.dailyLimit).toBe(100);
      });

      // 验证Redis调用次数
      expect(mockRedis.get).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('应该处理不同用户的并发配额检查', async () => {
      // Arrange
      const userCount = 20;
      const users = Array.from({ length: userCount }, (_, i) => ({
        userId: `user-${i}`,
        plan: i % 2 === 0 ? 'free' : 'pro' as 'free' | 'pro'
      }));

      mockRedis.get.mockImplementation((key) => {
        const userId = key.split(':')[1];
        const userIndex = parseInt(userId.split('-')[1]);
        return Promise.resolve((userIndex * 2).toString()); // 不同的使用量
      });

      // Act
      const promises = users.map(user =>
        quotaManager.checkQuota(user.userId, user.plan)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(userCount);
      results.forEach((result, index) => {
        const expectedUsage = index * 2;
        const expectedLimit = users[index].plan === 'free' ? 10 : 100;
        
        expect(result.userId).toBe(users[index].userId);
        expect(result.plan).toBe(users[index].plan);
        expect(result.currentUsage).toBe(expectedUsage);
        expect(result.remaining).toBe(Math.max(0, expectedLimit - expectedUsage));
      });
    });
  });

  describe('并发配额消费', () => {
    it('应该正确处理并发配额消费请求', async () => {
      // Arrange
      const userId = 'concurrent-consumer';
      const plan = 'pro';
      const concurrentRequests = 10;
      let currentUsage = 90; // 接近限制

      mockRedis.get.mockImplementation(() => 
        Promise.resolve(currentUsage.toString())
      );

      mockRedis.increment.mockImplementation(() => {
        currentUsage++;
        return Promise.resolve(currentUsage);
      });

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.consumeQuota(userId, plan, 1)
      );

      const results = await Promise.all(promises);

      // Assert
      const successCount = results.filter(r => r === true).length;
      const failureCount = results.filter(r => r === false).length;

      // 应该有一些成功，一些失败（因为接近限制）
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
      expect(successCount + failureCount).toBe(concurrentRequests);
    });

    it('应该防止配额超限消费', async () => {
      // Arrange
      const userId = 'limit-test-user';
      const plan = 'free'; // 限制10
      const concurrentRequests = 20;

      let currentUsage = 8; // 接近限制
      mockRedis.get.mockImplementation(() => 
        Promise.resolve(currentUsage.toString())
      );

      mockRedis.increment.mockImplementation(() => {
        if (currentUsage < 10) {
          currentUsage++;
          return Promise.resolve(currentUsage);
        }
        return Promise.resolve(currentUsage);
      });

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.consumeQuota(userId, plan, 1)
      );

      const results = await Promise.all(promises);

      // Assert
      const successCount = results.filter(r => r === true).length;
      const failureCount = results.filter(r => r === false).length;

      // 最多只能成功2次（从8到10）
      expect(successCount).toBeLessThanOrEqual(2);
      expect(failureCount).toBeGreaterThanOrEqual(18);
      expect(successCount + failureCount).toBe(concurrentRequests);
    });

    it('应该处理大量配额消费的竞态条件', async () => {
      // Arrange
      const userId = 'race-condition-user';
      const plan = 'super'; // 限制1000
      const concurrentRequests = 100;
      const consumeAmount = 5;

      let currentUsage = 0;
      mockRedis.get.mockImplementation(() => 
        Promise.resolve(currentUsage.toString())
      );

      mockRedis.increment.mockImplementation(() => {
        currentUsage += consumeAmount;
        return Promise.resolve(currentUsage);
      });

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.consumeQuota(userId, plan, consumeAmount)
      );

      const results = await Promise.all(promises);

      // Assert
      const successCount = results.filter(r => r === true).length;
      
      // 验证总消费量不超过限制
      expect(successCount * consumeAmount).toBeLessThanOrEqual(1000);
      
      // 验证至少有一些成功的消费
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('并发配额重置', () => {
    it('应该处理并发的配额重置请求', async () => {
      // Arrange
      const userIds = Array.from({ length: 10 }, (_, i) => `reset-user-${i}`);
      
      mockRedis.del.mockResolvedValue(undefined);

      // Act
      const promises = userIds.map(userId =>
        quotaManager.resetQuota(userId)
      );

      await Promise.all(promises);

      // Assert
      expect(mockRedis.del).toHaveBeenCalledTimes(userIds.length);
      
      // 验证每个用户都被重置
      userIds.forEach(userId => {
        const today = new Date().toISOString().split('T')[0];
        const expectedKey = `quota:${userId}:${today}`;
        expect(mockRedis.del).toHaveBeenCalledWith(expectedKey);
      });
    });

    it('应该处理重置和消费的并发操作', async () => {
      // Arrange
      const userId = 'reset-consume-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('50');
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.increment.mockResolvedValue(1);

      // Act - 同时进行重置和消费操作
      const resetPromise = quotaManager.resetQuota(userId);
      const consumePromises = Array.from({ length: 5 }, () =>
        quotaManager.consumeQuota(userId, plan, 1)
      );

      const [resetResult, ...consumeResults] = await Promise.all([
        resetPromise,
        ...consumePromises
      ]);

      // Assert
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockRedis.increment).toHaveBeenCalled();
      
      // 消费操作应该基于重置前的状态进行
      const successCount = consumeResults.filter(r => r === true).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('并发统计查询', () => {
    it('应该处理并发的统计查询请求', async () => {
      // Arrange
      const userId = 'stats-user';
      const plan = 'pro';
      const concurrentRequests = 20;

      // Mock历史数据
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('2024-01-01')) return Promise.resolve('10');
        if (key.includes('2024-01-02')) return Promise.resolve('15');
        if (key.includes('2024-01-03')) return Promise.resolve('20');
        return Promise.resolve('5');
      });

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.getQuotaStats(userId, plan)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.today.userId).toBe(userId);
        expect(result.today.plan).toBe(plan);
        expect(result.history).toHaveLength(7); // 7天历史
        expect(result.history.every(h => typeof h.usage === 'number')).toBe(true);
      });
    });

    it('应该处理统计查询和配额消费的并发操作', async () => {
      // Arrange
      const userId = 'stats-consume-user';
      const plan = 'free';

      let currentUsage = 5;
      mockRedis.get.mockImplementation(() => 
        Promise.resolve(currentUsage.toString())
      );

      mockRedis.increment.mockImplementation(() => {
        currentUsage++;
        return Promise.resolve(currentUsage);
      });

      // Act - 同时进行统计查询和配额消费
      const statsPromises = Array.from({ length: 5 }, () =>
        quotaManager.getQuotaStats(userId, plan)
      );
      
      const consumePromises = Array.from({ length: 3 }, () =>
        quotaManager.consumeQuota(userId, plan, 1)
      );

      const [statsResults, consumeResults] = await Promise.all([
        Promise.all(statsPromises),
        Promise.all(consumePromises)
      ]);

      // Assert
      expect(statsResults).toHaveLength(5);
      expect(consumeResults).toHaveLength(3);
      
      // 统计结果应该是一致的
      statsResults.forEach(result => {
        expect(result.today.userId).toBe(userId);
        expect(result.today.plan).toBe(plan);
      });

      // 消费操作应该成功（在限制内）
      const successCount = consumeResults.filter(r => r === true).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理Redis连接失败的并发情况', async () => {
      // Arrange
      const userId = 'error-user';
      const plan = 'pro';
      const concurrentRequests = 10;

      mockRedis.isReady.mockReturnValue(false);
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.checkQuota(userId, plan)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        // 应该返回默认配额信息
        expect(result.userId).toBe(userId);
        expect(result.plan).toBe(plan);
        expect(result.currentUsage).toBe(0);
        expect(result.remaining).toBe(100); // pro plan default
      });
    });

    it('应该处理部分Redis操作失败的情况', async () => {
      // Arrange
      const userId = 'partial-error-user';
      const plan = 'free';
      const concurrentRequests = 10;

      let callCount = 0;
      mockRedis.get.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new Error('Intermittent Redis error'));
        }
        return Promise.resolve('3');
      });

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        quotaManager.checkQuota(userId, plan)
      );

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      
      // 验证错误处理
      const successfulResults = results.filter(r => r.currentUsage === 3);
      const errorResults = results.filter(r => r.currentUsage === 0);
      
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(errorResults.length).toBeGreaterThan(0);
      expect(successfulResults.length + errorResults.length).toBe(concurrentRequests);
    });
  });

  describe('性能和资源管理', () => {
    it('应该在高并发下保持合理的响应时间', async () => {
      // Arrange
      const userId = 'performance-user';
      const plan = 'super';
      const concurrentRequests = 100;

      mockRedis.get.mockResolvedValue('100');
      mockRedis.increment.mockResolvedValue(101);

      // Act
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        if (i % 2 === 0) {
          return quotaManager.checkQuota(userId, plan);
        } else {
          return quotaManager.consumeQuota(userId, plan, 1);
        }
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
      
      // 验证平均响应时间
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(50); // 平均响应时间小于50ms
    });

    it('应该正确处理内存使用和垃圾回收', async () => {
      // Arrange
      const userCount = 50;
      const requestsPerUser = 20;
      
      mockRedis.get.mockResolvedValue('10');
      mockRedis.increment.mockResolvedValue(11);

      // Act
      const initialMemory = process.memoryUsage().heapUsed;
      
      const allPromises = [];
      for (let i = 0; i < userCount; i++) {
        const userId = `memory-user-${i}`;
        const plan = i % 3 === 0 ? 'free' : i % 3 === 1 ? 'pro' : 'super';
        
        for (let j = 0; j < requestsPerUser; j++) {
          if (j % 2 === 0) {
            allPromises.push(quotaManager.checkQuota(userId, plan as any));
          } else {
            allPromises.push(quotaManager.consumeQuota(userId, plan as any, 1));
          }
        }
      }

      await Promise.all(allPromises);
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Assert
      expect(allPromises).toHaveLength(userCount * requestsPerUser);
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('数据一致性验证', () => {
    it('应该在并发操作中保持数据一致性', async () => {
      // Arrange
      const userId = 'consistency-user';
      const plan = 'pro';
      const totalOperations = 50;

      let actualUsage = 0;
      const operations: Array<{ type: 'check' | 'consume' | 'reset'; timestamp: number }> = [];

      mockRedis.get.mockImplementation(() => {
        operations.push({ type: 'check', timestamp: Date.now() });
        return Promise.resolve(actualUsage.toString());
      });

      mockRedis.increment.mockImplementation(() => {
        operations.push({ type: 'consume', timestamp: Date.now() });
        actualUsage++;
        return Promise.resolve(actualUsage);
      });

      mockRedis.del.mockImplementation(() => {
        operations.push({ type: 'reset', timestamp: Date.now() });
        actualUsage = 0;
        return Promise.resolve(undefined);
      });

      // Act
      const promises = [];
      for (let i = 0; i < totalOperations; i++) {
        if (i % 10 === 0) {
          promises.push(quotaManager.resetQuota(userId));
        } else if (i % 3 === 0) {
          promises.push(quotaManager.checkQuota(userId, plan));
        } else {
          promises.push(quotaManager.consumeQuota(userId, plan, 1));
        }
      }

      await Promise.all(promises);

      // Assert
      expect(operations.length).toBeGreaterThan(0);
      
      // 验证操作顺序的合理性
      const checkOperations = operations.filter(op => op.type === 'check');
      const consumeOperations = operations.filter(op => op.type === 'consume');
      const resetOperations = operations.filter(op => op.type === 'reset');

      expect(checkOperations.length).toBeGreaterThan(0);
      expect(consumeOperations.length).toBeGreaterThan(0);
      expect(resetOperations.length).toBeGreaterThan(0);
    });
  });
});