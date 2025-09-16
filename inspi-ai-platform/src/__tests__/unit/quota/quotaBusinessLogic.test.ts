/**
 * 配额管理业务逻辑测试
 * 测试订阅升级、配额计算和业务规则
 */

import { QuotaManager, UserQuota, QuotaLimits } from '@/lib/quota/quotaManager';
import { redis } from '@/lib/cache/redis';

// Mock dependencies
jest.mock('@/lib/cache/redis');
jest.mock('@/lib/utils/logger');

describe('QuotaManager Business Logic Tests', () => {
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

  describe('订阅计划配额管理', () => {
    it('应该为不同订阅计划提供正确的配额限制', async () => {
      // Arrange
      const userId = 'plan-test-user';
      const plans = ['free', 'pro', 'super'] as const;
      const expectedLimits = { free: 10, pro: 100, super: 1000 };

      mockRedis.get.mockResolvedValue('0');

      // Act & Assert
      for (const plan of plans) {
        const quota = await quotaManager.checkQuota(userId, plan);
        
        expect(quota.plan).toBe(plan);
        expect(quota.dailyLimit).toBe(expectedLimits[plan]);
        expect(quota.remaining).toBe(expectedLimits[plan]);
        expect(quota.currentUsage).toBe(0);
      }
    });

    it('应该正确处理订阅升级场景', async () => {
      // Arrange
      const userId = 'upgrade-user';
      mockRedis.get.mockResolvedValue('8'); // 已使用8次

      // Act - 从free升级到pro
      const freeQuota = await quotaManager.checkQuota(userId, 'free');
      const proQuota = await quotaManager.checkQuota(userId, 'pro');

      // Assert
      expect(freeQuota.currentUsage).toBe(8);
      expect(freeQuota.remaining).toBe(2); // 10 - 8
      expect(freeQuota.dailyLimit).toBe(10);

      expect(proQuota.currentUsage).toBe(8); // 使用量保持不变
      expect(proQuota.remaining).toBe(92); // 100 - 8
      expect(proQuota.dailyLimit).toBe(100);
    });

    it('应该处理订阅降级场景', async () => {
      // Arrange
      const userId = 'downgrade-user';
      mockRedis.get.mockResolvedValue('50'); // 已使用50次

      // Act - 从super降级到pro
      const superQuota = await quotaManager.checkQuota(userId, 'super');
      const proQuota = await quotaManager.checkQuota(userId, 'pro');

      // Assert
      expect(superQuota.currentUsage).toBe(50);
      expect(superQuota.remaining).toBe(950); // 1000 - 50
      expect(superQuota.dailyLimit).toBe(1000);

      expect(proQuota.currentUsage).toBe(50);
      expect(proQuota.remaining).toBe(50); // 100 - 50
      expect(proQuota.dailyLimit).toBe(100);
    });

    it('应该处理超出新计划限制的降级情况', async () => {
      // Arrange
      const userId = 'over-limit-downgrade-user';
      mockRedis.get.mockResolvedValue('150'); // 已使用150次，超过pro限制

      // Act
      const proQuota = await quotaManager.checkQuota(userId, 'pro');
      const freeQuota = await quotaManager.checkQuota(userId, 'free');

      // Assert
      expect(proQuota.currentUsage).toBe(150);
      expect(proQuota.remaining).toBe(0); // 已超限，剩余为0
      expect(proQuota.dailyLimit).toBe(100);

      expect(freeQuota.currentUsage).toBe(150);
      expect(freeQuota.remaining).toBe(0); // 已超限，剩余为0
      expect(freeQuota.dailyLimit).toBe(10);
    });
  });

  describe('配额消费业务规则', () => {
    it('应该支持批量配额消费', async () => {
      // Arrange
      const userId = 'batch-consume-user';
      const plan = 'pro';
      const batchSize = 5;

      mockRedis.get.mockResolvedValue('90'); // 剩余10个配额
      mockRedis.increment.mockImplementation(() => {
        return Promise.resolve(95); // 消费5个后变成95
      });

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, batchSize);

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.increment).toHaveBeenCalledWith(
        expect.stringContaining(`quota:${userId}`),
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it('应该拒绝超出剩余配额的批量消费', async () => {
      // Arrange
      const userId = 'batch-exceed-user';
      const plan = 'free';
      const batchSize = 8;

      mockRedis.get.mockResolvedValue('5'); // 剩余5个配额，但要消费8个

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, batchSize);

      // Assert
      expect(result).toBe(false);
      expect(mockRedis.increment).not.toHaveBeenCalled();
    });

    it('应该正确处理零配额消费', async () => {
      // Arrange
      const userId = 'zero-consume-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('50');

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 0);

      // Assert
      expect(result).toBe(true); // 零消费应该总是成功
      expect(mockRedis.increment).not.toHaveBeenCalled();
    });

    it('应该处理负数配额消费请求', async () => {
      // Arrange
      const userId = 'negative-consume-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('50');

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, -5);

      // Assert
      expect(result).toBe(false); // 负数消费应该被拒绝
      expect(mockRedis.increment).not.toHaveBeenCalled();
    });

    it('应该处理精确到达限制的配额消费', async () => {
      // Arrange
      const userId = 'exact-limit-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('9'); // 还剩1个配额
      mockRedis.increment.mockResolvedValue(10);

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(result).toBe(true);
      expect(mockRedis.increment).toHaveBeenCalled();
    });
  });

  describe('配额重置和时间管理', () => {
    it('应该正确计算配额重置时间', async () => {
      // Arrange
      const userId = 'reset-time-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('25');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.resetTime).toBeInstanceOf(Date);
      
      // 重置时间应该是明天的0点
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      expect(quota.resetTime.getTime()).toBe(tomorrow.getTime());
    });

    it('应该在跨日期时正确处理配额', async () => {
      // Arrange
      const userId = 'cross-date-user';
      const plan = 'pro';

      // Mock当前时间为23:59
      const mockDate = new Date();
      mockDate.setHours(23, 59, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      mockRedis.get.mockResolvedValue('50');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.currentUsage).toBe(50);
      
      // TTL应该很短（接近午夜）
      const secondsUntilMidnight = Math.floor((
        new Date(mockDate.getTime() + 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0) - mockDate.getTime()
      ) / 1000);
      
      expect(secondsUntilMidnight).toBeLessThan(120); // 小于2分钟

      // 恢复Date mock
      jest.restoreAllMocks();
    });

    it('应该处理不同时区的配额重置', async () => {
      // Arrange
      const userId = 'timezone-user';
      const plan = 'pro';

      // Mock不同时区的时间
      const originalTimezone = process.env.TZ;
      process.env.TZ = 'America/New_York';

      mockRedis.get.mockResolvedValue('30');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.resetTime).toBeInstanceOf(Date);
      expect(quota.resetTime.getHours()).toBe(0);
      expect(quota.resetTime.getMinutes()).toBe(0);
      expect(quota.resetTime.getSeconds()).toBe(0);

      // 恢复时区设置
      if (originalTimezone) {
        process.env.TZ = originalTimezone;
      } else {
        delete process.env.TZ;
      }
    });
  });

  describe('配额统计和分析', () => {
    it('应该提供准确的使用历史统计', async () => {
      // Arrange
      const userId = 'stats-user';
      const plan = 'pro';

      // Mock 7天的历史数据
      const mockHistoryData = {
        '2024-01-01': '15',
        '2024-01-02': '22',
        '2024-01-03': '8',
        '2024-01-04': '35',
        '2024-01-05': '12',
        '2024-01-06': '28',
        '2024-01-07': '18' // 今天
      };

      mockRedis.get.mockImplementation((key) => {
        const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const date = dateMatch[1];
          return Promise.resolve(mockHistoryData[date] || '0');
        }
        return Promise.resolve('18'); // 默认今天的数据
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      expect(stats.today.userId).toBe(userId);
      expect(stats.today.currentUsage).toBe(18);
      expect(stats.history).toHaveLength(7);
      
      // 验证历史数据的准确性
      const totalHistoryUsage = stats.history.reduce((sum, day) => sum + day.usage, 0);
      expect(totalHistoryUsage).toBeGreaterThan(0);
      
      // 验证日期格式
      stats.history.forEach(day => {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof day.usage).toBe('number');
        expect(day.usage).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该计算正确的使用趋势', async () => {
      // Arrange
      const userId = 'trend-user';
      const plan = 'super';

      // Mock递增的使用趋势
      let dayCounter = 0;
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('quota:')) {
          dayCounter++;
          return Promise.resolve((dayCounter * 10).toString());
        }
        return Promise.resolve('70'); // 今天的使用量
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      expect(stats.history).toHaveLength(7);
      
      // 验证递增趋势
      for (let i = 1; i < stats.history.length; i++) {
        expect(stats.history[i].usage).toBeGreaterThanOrEqual(stats.history[i - 1].usage);
      }
    });

    it('应该处理缺失的历史数据', async () => {
      // Arrange
      const userId = 'missing-data-user';
      const plan = 'pro';

      // Mock部分缺失的数据
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('2024-01-03') || key.includes('2024-01-05')) {
          return Promise.resolve(null); // 缺失数据
        }
        return Promise.resolve('10');
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      expect(stats.history).toHaveLength(7);
      
      // 缺失的数据应该被设为0
      const missingDays = stats.history.filter(day => 
        day.date.includes('01-03') || day.date.includes('01-05')
      );
      
      missingDays.forEach(day => {
        expect(day.usage).toBe(0);
      });
    });
  });

  describe('配额限制管理', () => {
    it('应该支持动态更新配额限制', () => {
      // Arrange
      const newLimits: Partial<QuotaLimits> = {
        free: 15,
        pro: 150,
        super: 1500
      };

      // Act
      quotaManager.updateQuotaLimits(newLimits);
      const currentLimits = quotaManager.getQuotaLimits();

      // Assert
      expect(currentLimits.free).toBe(15);
      expect(currentLimits.pro).toBe(150);
      expect(currentLimits.super).toBe(1500);
    });

    it('应该支持部分配额限制更新', () => {
      // Arrange
      const originalLimits = quotaManager.getQuotaLimits();
      const partialUpdate: Partial<QuotaLimits> = {
        pro: 200
      };

      // Act
      quotaManager.updateQuotaLimits(partialUpdate);
      const updatedLimits = quotaManager.getQuotaLimits();

      // Assert
      expect(updatedLimits.free).toBe(originalLimits.free); // 未改变
      expect(updatedLimits.pro).toBe(200); // 已更新
      expect(updatedLimits.super).toBe(originalLimits.super); // 未改变
    });

    it('应该验证配额限制的合理性', () => {
      // Arrange
      const invalidLimits: Partial<QuotaLimits> = {
        free: -5, // 负数限制
        pro: 0,   // 零限制
        super: 999999999 // 过大限制
      };

      // Act
      quotaManager.updateQuotaLimits(invalidLimits);
      const limits = quotaManager.getQuotaLimits();

      // Assert
      // 应该处理或拒绝无效值
      expect(limits.free).toBeGreaterThanOrEqual(0);
      expect(limits.pro).toBeGreaterThanOrEqual(0);
      expect(limits.super).toBeGreaterThanOrEqual(0);
    });

    it('应该保持配额限制的层级关系', () => {
      // Arrange
      const hierarchicalLimits: QuotaLimits = {
        free: 20,
        pro: 200,
        super: 2000
      };

      // Act
      quotaManager.updateQuotaLimits(hierarchicalLimits);
      const limits = quotaManager.getQuotaLimits();

      // Assert
      expect(limits.free).toBeLessThan(limits.pro);
      expect(limits.pro).toBeLessThan(limits.super);
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理极大的配额消费请求', async () => {
      // Arrange
      const userId = 'large-consume-user';
      const plan = 'super';
      const largeAmount = 999999;

      mockRedis.get.mockResolvedValue('100');

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, largeAmount);

      // Assert
      expect(result).toBe(false); // 应该被拒绝
      expect(mockRedis.increment).not.toHaveBeenCalled();
    });

    it('应该处理无效的用户ID', async () => {
      // Arrange
      const invalidUserIds = ['', null, undefined, '   ', 'user with spaces'];

      mockRedis.get.mockResolvedValue('0');

      // Act & Assert
      for (const userId of invalidUserIds) {
        const quota = await quotaManager.checkQuota(userId as any, 'free');
        
        // 应该返回有效的配额对象，但可能有默认值
        expect(quota).toBeDefined();
        expect(quota.plan).toBe('free');
        expect(quota.dailyLimit).toBe(10);
      }
    });

    it('应该处理无效的订阅计划', async () => {
      // Arrange
      const userId = 'invalid-plan-user';
      const invalidPlan = 'premium' as any; // 不存在的计划

      mockRedis.get.mockResolvedValue('5');

      // Act
      const quota = await quotaManager.checkQuota(userId, invalidPlan);

      // Assert
      // 应该回退到默认计划或处理错误
      expect(quota).toBeDefined();
      expect(['free', 'pro', 'super']).toContain(quota.plan);
    });

    it('应该处理Redis数据损坏的情况', async () => {
      // Arrange
      const userId = 'corrupted-data-user';
      const plan = 'pro';

      // Mock损坏的数据
      mockRedis.get.mockResolvedValue('invalid_number');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.currentUsage).toBe(0); // 应该回退到0
      expect(quota.remaining).toBe(100); // pro计划的限制
    });
  });

  describe('健康检查和状态监控', () => {
    it('应该提供准确的健康检查', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue('0');
      mockRedis.isReady.mockReturnValue(true);

      // Act
      const isHealthy = await quotaManager.healthCheck();

      // Assert
      expect(isHealthy).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('health_check_user')
      );
    });

    it('应该在Redis不可用时返回健康检查失败', async () => {
      // Arrange
      mockRedis.isReady.mockReturnValue(false);
      mockRedis.get.mockRejectedValue(new Error('Redis unavailable'));

      // Act
      const isHealthy = await quotaManager.healthCheck();

      // Assert
      expect(isHealthy).toBe(false);
    });

    it('应该提供详细的系统状态', () => {
      // Arrange
      mockRedis.isReady.mockReturnValue(true);

      // Act
      const status = quotaManager.getStatus();

      // Assert
      expect(status).toHaveProperty('quotaLimits');
      expect(status).toHaveProperty('cacheReady');
      expect(status.quotaLimits).toEqual({
        free: expect.any(Number),
        pro: expect.any(Number),
        super: expect.any(Number)
      });
      expect(typeof status.cacheReady).toBe('boolean');
    });
  });
});