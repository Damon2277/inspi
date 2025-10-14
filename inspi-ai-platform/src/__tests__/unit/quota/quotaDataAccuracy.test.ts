/**
 * 配额数据准确性测试
 * 测试使用分析的数据准确性和一致性
 */

import { redis } from '@/lib/cache/redis';
import { QuotaManager, UserQuota } from '@/lib/quota/quotaManager';

// Mock dependencies
jest.mock('@/lib/cache/redis');
jest.mock('@/lib/utils/logger');

describe('QuotaManager Data Accuracy Tests', () => {
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

  describe('配额计算准确性', () => {
    it('应该准确计算剩余配额', async () => {
      // Arrange
      const testCases = [
        { plan: 'free', usage: 0, expected: 10 },
        { plan: 'free', usage: 5, expected: 5 },
        { plan: 'free', usage: 10, expected: 0 },
        { plan: 'free', usage: 15, expected: 0 }, // 超限情况
        { plan: 'pro', usage: 0, expected: 100 },
        { plan: 'pro', usage: 50, expected: 50 },
        { plan: 'pro', usage: 100, expected: 0 },
        { plan: 'super', usage: 500, expected: 500 },
        { plan: 'super', usage: 1000, expected: 0 },
      ] as const;

      // Act & Assert
      for (const testCase of testCases) {
        mockRedis.get.mockResolvedValue(testCase.usage.toString());

        const quota = await quotaManager.checkQuota('test-user', testCase.plan);

        expect(quota.remaining).toBe(testCase.expected);
        expect(quota.currentUsage).toBe(testCase.usage);
        expect(quota.dailyLimit).toBe(
          testCase.plan === 'free' ? 10 :
          testCase.plan === 'pro' ? 100 : 1000,
        );
      }
    });

    it('应该正确处理浮点数使用量', async () => {
      // Arrange
      const userId = 'float-user';
      const plan = 'pro';

      // Redis可能返回浮点数字符串
      mockRedis.get.mockResolvedValue('25.7');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.currentUsage).toBe(25); // 应该转换为整数
      expect(quota.remaining).toBe(75); // 100 - 25
    });

    it('应该处理科学计数法表示的数字', async () => {
      // Arrange
      const userId = 'scientific-user';
      const plan = 'super';

      mockRedis.get.mockResolvedValue('1e2'); // 100的科学计数法

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.currentUsage).toBe(100);
      expect(quota.remaining).toBe(900); // 1000 - 100
    });

    it('应该处理前导零的数字', async () => {
      // Arrange
      const userId = 'leading-zero-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('007'); // 带前导零

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.currentUsage).toBe(7);
      expect(quota.remaining).toBe(3); // 10 - 7
    });
  });

  describe('数据一致性验证', () => {
    it('应该确保配额检查和消费的数据一致性', async () => {
      // Arrange
      const userId = 'consistency-user';
      const plan = 'pro';
      let currentUsage = 45;

      mockRedis.get.mockImplementation(() =>
        Promise.resolve(currentUsage.toString()),
      );

      mockRedis.increment.mockImplementation(() => {
        currentUsage++;
        return Promise.resolve(currentUsage);
      });

      // Act
      const initialQuota = await quotaManager.checkQuota(userId, plan);
      const consumeResult = await quotaManager.consumeQuota(userId, plan, 1);
      const finalQuota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(initialQuota.currentUsage).toBe(45);
      expect(initialQuota.remaining).toBe(55);
      expect(consumeResult).toBe(true);
      expect(finalQuota.currentUsage).toBe(46);
      expect(finalQuota.remaining).toBe(54);
    });

    it('应该验证批量消费的数据准确性', async () => {
      // Arrange
      const userId = 'batch-accuracy-user';
      const plan = 'super';
      const batchSize = 25;
      let currentUsage = 100;

      mockRedis.get.mockImplementation(() =>
        Promise.resolve(currentUsage.toString()),
      );

      mockRedis.increment.mockImplementation(() => {
        currentUsage += batchSize;
        return Promise.resolve(currentUsage);
      });

      // Act
      const beforeQuota = await quotaManager.checkQuota(userId, plan);
      const consumeResult = await quotaManager.consumeQuota(userId, plan, batchSize);
      const afterQuota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(beforeQuota.currentUsage).toBe(100);
      expect(beforeQuota.remaining).toBe(900);
      expect(consumeResult).toBe(true);
      expect(afterQuota.currentUsage).toBe(125);
      expect(afterQuota.remaining).toBe(875);

      // 验证变化量
      expect(afterQuota.currentUsage - beforeQuota.currentUsage).toBe(batchSize);
      expect(beforeQuota.remaining - afterQuota.remaining).toBe(batchSize);
    });

    it('应该确保重置操作的数据准确性', async () => {
      // Arrange
      const userId = 'reset-accuracy-user';
      const plan = 'pro';

      mockRedis.get
        .mockResolvedValueOnce('75') // 重置前
        .mockResolvedValueOnce('0');  // 重置后

      mockRedis.del.mockResolvedValue(undefined);

      // Act
      const beforeReset = await quotaManager.checkQuota(userId, plan);
      await quotaManager.resetQuota(userId);
      const afterReset = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(beforeReset.currentUsage).toBe(75);
      expect(beforeReset.remaining).toBe(25);
      expect(afterReset.currentUsage).toBe(0);
      expect(afterReset.remaining).toBe(100);
    });
  });

  describe('历史数据准确性', () => {
    it('应该提供准确的7天使用历史', async () => {
      // Arrange
      const userId = 'history-user';
      const plan = 'pro';

      // Mock 7天的精确数据
      const expectedHistory = [
        { date: '2024-01-01', usage: 15 },
        { date: '2024-01-02', usage: 23 },
        { date: '2024-01-03', usage: 8 },
        { date: '2024-01-04', usage: 42 },
        { date: '2024-01-05', usage: 19 },
        { date: '2024-01-06', usage: 31 },
        { date: '2024-01-07', usage: 27 },
      ];

      // Mock当前日期为2024-01-07
      const mockDate = new Date('2024-01-07T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      mockRedis.get.mockImplementation((key) => {
        const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const date = dateMatch[1];
          const historyItem = expectedHistory.find(h => h.date === date);
          return Promise.resolve(historyItem ? historyItem.usage.toString() : '0');
        }
        return Promise.resolve('27'); // 今天的数据
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      expect(stats.history).toHaveLength(7);

      stats.history.forEach((day, index) => {
        expect(day.date).toBe(expectedHistory[index].date);
        expect(day.usage).toBe(expectedHistory[index].usage);
      });

      // 验证总使用量
      const totalUsage = stats.history.reduce((sum, day) => sum + day.usage, 0);
      const expectedTotal = expectedHistory.reduce((sum, day) => sum + day.usage, 0);
      expect(totalUsage).toBe(expectedTotal);

      // 恢复Date mock
      jest.restoreAllMocks();
    });

    it('应该正确处理跨月份的历史数据', async () => {
      // Arrange
      const userId = 'cross-month-user';
      const plan = 'free';

      // Mock当前日期为月初
      const mockDate = new Date('2024-02-03T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // Mock跨月数据
      const crossMonthData = {
        '2024-01-28': '5',  // 上月
        '2024-01-29': '8',  // 上月
        '2024-01-30': '3',  // 上月
        '2024-01-31': '7',  // 上月
        '2024-02-01': '4',  // 本月
        '2024-02-02': '6',  // 本月
        '2024-02-03': '2',   // 今天
      };

      mockRedis.get.mockImplementation((key) => {
        const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const date = dateMatch[1];
          return Promise.resolve(crossMonthData[date] || '0');
        }
        return Promise.resolve('2');
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      expect(stats.history).toHaveLength(7);

      // 验证日期顺序和数据准确性
      const expectedDates = [
        '2024-01-28', '2024-01-29', '2024-01-30', '2024-01-31',
        '2024-02-01', '2024-02-02', '2024-02-03',
      ];

      stats.history.forEach((day, index) => {
        expect(day.date).toBe(expectedDates[index]);
        expect(day.usage).toBe(parseInt(crossMonthData[expectedDates[index]], 10));
      });

      jest.restoreAllMocks();
    });

    it('应该处理闰年的历史数据', async () => {
      // Arrange
      const userId = 'leap-year-user';
      const plan = 'pro';

      // Mock闰年2月29日
      const mockDate = new Date('2024-03-01T10:00:00Z'); // 2024是闰年
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      mockRedis.get.mockImplementation((key) => {
        if (key.includes('2024-02-29')) {
          return Promise.resolve('15'); // 闰年2月29日的数据
        }
        return Promise.resolve('10');
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      expect(stats.history).toHaveLength(7);

      // 应该包含2月29日的数据
      const feb29Data = stats.history.find(day => day.date === '2024-02-29');
      expect(feb29Data).toBeDefined();
      expect(feb29Data!.usage).toBe(15);

      jest.restoreAllMocks();
    });
  });

  describe('数值边界和精度测试', () => {
    it('应该正确处理最大整数值', async () => {
      // Arrange
      const userId = 'max-int-user';
      const plan = 'super';
      const maxSafeInteger = Number.MAX_SAFE_INTEGER.toString();

      mockRedis.get.mockResolvedValue(maxSafeInteger);

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      expect(quota.currentUsage).toBe(Number.MAX_SAFE_INTEGER);
      expect(quota.remaining).toBe(0); // 超出限制
    });

    it('应该处理零值的准确性', async () => {
      // Arrange
      const userId = 'zero-user';
      const plans = ['free', 'pro', 'super'] as const;

      mockRedis.get.mockResolvedValue('0');

      // Act & Assert
      for (const plan of plans) {
        const quota = await quotaManager.checkQuota(userId, plan);

        expect(quota.currentUsage).toBe(0);
        expect(quota.remaining).toBe(quota.dailyLimit);
        expect(quota.currentUsage + quota.remaining).toBe(quota.dailyLimit);
      }
    });

    it('应该处理负数使用量的数据修正', async () => {
      // Arrange
      const userId = 'negative-usage-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('-5'); // 异常的负数数据

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      // 应该修正为0或处理异常
      expect(quota.currentUsage).toBeGreaterThanOrEqual(0);
      expect(quota.remaining).toBeLessThanOrEqual(quota.dailyLimit);
    });

    it('应该验证配额计算的数学准确性', async () => {
      // Arrange
      const testCases = [
        { usage: 0, limit: 10, expectedRemaining: 10 },
        { usage: 1, limit: 10, expectedRemaining: 9 },
        { usage: 9, limit: 10, expectedRemaining: 1 },
        { usage: 10, limit: 10, expectedRemaining: 0 },
        { usage: 11, limit: 10, expectedRemaining: 0 },
        { usage: 50, limit: 100, expectedRemaining: 50 },
        { usage: 999, limit: 1000, expectedRemaining: 1 },
      ];

      // Act & Assert
      for (const testCase of testCases) {
        mockRedis.get.mockResolvedValue(testCase.usage.toString());

        // 临时更新限制
        quotaManager.updateQuotaLimits({ free: testCase.limit });

        const quota = await quotaManager.checkQuota('math-test-user', 'free');

        expect(quota.currentUsage).toBe(testCase.usage);
        expect(quota.remaining).toBe(testCase.expectedRemaining);
        expect(quota.currentUsage + quota.remaining).toBeGreaterThanOrEqual(testCase.limit);
      }
    });
  });

  describe('时间相关数据准确性', () => {
    it('应该准确计算重置时间', async () => {
      // Arrange
      const userId = 'time-accuracy-user';
      const plan = 'pro';

      // Mock特定时间
      const mockNow = new Date('2024-01-15T14:30:45.123Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      mockRedis.get.mockResolvedValue('50');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      const expectedResetTime = new Date('2024-01-16T00:00:00.000Z');
      expect(quota.resetTime.getTime()).toBe(expectedResetTime.getTime());
      expect(quota.resetTime.getHours()).toBe(0);
      expect(quota.resetTime.getMinutes()).toBe(0);
      expect(quota.resetTime.getSeconds()).toBe(0);
      expect(quota.resetTime.getMilliseconds()).toBe(0);

      jest.restoreAllMocks();
    });

    it('应该正确处理跨年的重置时间', async () => {
      // Arrange
      const userId = 'new-year-user';
      const plan = 'free';

      // Mock年末时间
      const mockNow = new Date('2023-12-31T23:59:59.999Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      mockRedis.get.mockResolvedValue('5');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      const expectedResetTime = new Date('2024-01-01T00:00:00.000Z');
      expect(quota.resetTime.getTime()).toBe(expectedResetTime.getTime());
      expect(quota.resetTime.getFullYear()).toBe(2024);
      expect(quota.resetTime.getMonth()).toBe(0); // January
      expect(quota.resetTime.getDate()).toBe(1);

      jest.restoreAllMocks();
    });

    it('应该验证TTL计算的准确性', async () => {
      // Arrange
      const userId = 'ttl-user';
      const plan = 'pro';

      // Mock接近午夜的时间
      const mockNow = new Date('2024-01-15T23:58:30.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      mockRedis.get.mockResolvedValue('25');
      mockRedis.increment.mockResolvedValue(26);

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(mockRedis.increment).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ttl: 90, // 应该是90秒（1分30秒到午夜）
        }),
      );

      jest.restoreAllMocks();
    });
  });

  describe('数据完整性验证', () => {
    it('应该验证配额对象的完整性', async () => {
      // Arrange
      const userId = 'integrity-user';
      const plan = 'super';

      mockRedis.get.mockResolvedValue('250');

      // Act
      const quota = await quotaManager.checkQuota(userId, plan);

      // Assert
      // 验证所有必需字段存在
      expect(quota).toHaveProperty('userId');
      expect(quota).toHaveProperty('plan');
      expect(quota).toHaveProperty('dailyLimit');
      expect(quota).toHaveProperty('currentUsage');
      expect(quota).toHaveProperty('remaining');
      expect(quota).toHaveProperty('resetTime');

      // 验证字段类型
      expect(typeof quota.userId).toBe('string');
      expect(typeof quota.plan).toBe('string');
      expect(typeof quota.dailyLimit).toBe('number');
      expect(typeof quota.currentUsage).toBe('number');
      expect(typeof quota.remaining).toBe('number');
      expect(quota.resetTime).toBeInstanceOf(Date);

      // 验证数值关系
      expect(quota.currentUsage).toBeGreaterThanOrEqual(0);
      expect(quota.remaining).toBeGreaterThanOrEqual(0);
      expect(quota.dailyLimit).toBeGreaterThan(0);
      expect(quota.currentUsage + quota.remaining).toBeGreaterThanOrEqual(quota.dailyLimit);
    });

    it('应该验证统计数据的完整性', async () => {
      // Arrange
      const userId = 'stats-integrity-user';
      const plan = 'pro';

      mockRedis.get.mockImplementation((key) => {
        if (key.includes('2024-01')) return Promise.resolve('15');
        return Promise.resolve('20');
      });

      // Act
      const stats = await quotaManager.getQuotaStats(userId, plan);

      // Assert
      // 验证today字段
      expect(stats).toHaveProperty('today');
      expect(stats.today).toHaveProperty('userId');
      expect(stats.today).toHaveProperty('plan');
      expect(stats.today).toHaveProperty('dailyLimit');
      expect(stats.today).toHaveProperty('currentUsage');
      expect(stats.today).toHaveProperty('remaining');
      expect(stats.today).toHaveProperty('resetTime');

      // 验证history字段
      expect(stats).toHaveProperty('history');
      expect(Array.isArray(stats.history)).toBe(true);
      expect(stats.history).toHaveLength(7);

      stats.history.forEach(day => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('usage');
        expect(typeof day.date).toBe('string');
        expect(typeof day.usage).toBe('number');
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(day.usage).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该确保数据的不可变性', async () => {
      // Arrange
      const userId = 'immutable-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('7');

      // Act
      const quota1 = await quotaManager.checkQuota(userId, plan);
      const quota2 = await quotaManager.checkQuota(userId, plan);

      // 尝试修改返回的对象
      (quota1 as any).currentUsage = 999;
      (quota1 as any).remaining = -100;

      // Assert
      // 第二次调用应该返回正确的数据，不受第一次修改影响
      expect(quota2.currentUsage).toBe(7);
      expect(quota2.remaining).toBe(3);

      // 验证对象是独立的
      expect(quota1).not.toBe(quota2);
    });
  });
});
