/**
 * 配额通知机制时效性测试
 * 测试配额通知的触发时机和时效性
 */

import { redis } from '@/lib/cache/redis';
import { QuotaManager, UserQuota } from '@/lib/quota/quotaManager';

// Mock dependencies
jest.mock('@/lib/cache/redis');
jest.mock('@/lib/utils/logger');

// Mock notification service
const mockNotificationService = {
  sendQuotaWarning: jest.fn(),
  sendQuotaExhausted: jest.fn(),
  sendQuotaReset: jest.fn(),
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn(),
};

jest.mock('@/lib/notifications/service', () => ({
  notificationService: mockNotificationService,
}));

describe('QuotaManager Notification Timing Tests', () => {
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

  describe('配额警告通知', () => {
    it('应该在达到80%使用量时触发警告通知', async () => {
      // Arrange
      const userId = 'warning-user';
      const plan = 'free'; // 限制10，80%是8

      mockRedis.get.mockResolvedValue('7'); // 当前使用7
      mockRedis.increment.mockResolvedValue(8); // 消费后变成8

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(result).toBe(true);
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledWith({
        userId,
        plan,
        currentUsage: 8,
        dailyLimit: 10,
        remaining: 2,
        warningThreshold: 0.8,
      });
    });

    it('应该在达到90%使用量时触发严重警告', async () => {
      // Arrange
      const userId = 'severe-warning-user';
      const plan = 'pro'; // 限制100，90%是90

      mockRedis.get.mockResolvedValue('89');
      mockRedis.increment.mockResolvedValue(90);

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledWith({
        userId,
        plan,
        currentUsage: 90,
        dailyLimit: 100,
        remaining: 10,
        warningThreshold: 0.9,
        severity: 'high',
      });
    });

    it('应该避免重复发送相同阈值的警告', async () => {
      // Arrange
      const userId = 'no-duplicate-user';
      const plan = 'free';

      // Mock已经发送过80%警告的标记
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('warning_sent')) return Promise.resolve('80');
        return Promise.resolve('8');
      });

      // Act
      await quotaManager.consumeQuota(userId, plan, 0); // 不消费，只检查

      // Assert
      expect(mockNotificationService.sendQuotaWarning).not.toHaveBeenCalled();
    });

    it('应该为不同计划设置不同的警告阈值', async () => {
      // Arrange
      const testCases = [
        { plan: 'free', limit: 10, threshold80: 8, threshold90: 9 },
        { plan: 'pro', limit: 100, threshold80: 80, threshold90: 90 },
        { plan: 'super', limit: 1000, threshold80: 800, threshold90: 900 },
      ] as const;

      for (const testCase of testCases) {
        mockRedis.get.mockResolvedValue((testCase.threshold80 - 1).toString());
        mockRedis.increment.mockResolvedValue(testCase.threshold80);

        // Act
        await quotaManager.consumeQuota('threshold-user', testCase.plan, 1);

        // Assert
        expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledWith(
          expect.objectContaining({
            plan: testCase.plan,
            currentUsage: testCase.threshold80,
            dailyLimit: testCase.limit,
            warningThreshold: 0.8,
          }),
        );
      }
    });
  });

  describe('配额耗尽通知', () => {
    it('应该在配额完全耗尽时立即发送通知', async () => {
      // Arrange
      const userId = 'exhausted-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('9'); // 还剩1个
      mockRedis.increment.mockResolvedValue(10); // 消费后达到限制

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(result).toBe(true);
      expect(mockNotificationService.sendQuotaExhausted).toHaveBeenCalledWith({
        userId,
        plan,
        dailyLimit: 10,
        exhaustedAt: expect.any(Date),
        resetTime: expect.any(Date),
      });
    });

    it('应该在尝试超额消费时发送拒绝通知', async () => {
      // Arrange
      const userId = 'rejected-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('98'); // 还剩2个
      // 尝试消费5个，应该被拒绝

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 5);

      // Assert
      expect(result).toBe(false);
      expect(mockNotificationService.sendQuotaExhausted).toHaveBeenCalledWith({
        userId,
        plan,
        requestedAmount: 5,
        availableAmount: 2,
        rejectedAt: expect.any(Date),
      });
    });

    it('应该包含升级建议在耗尽通知中', async () => {
      // Arrange
      const userId = 'upgrade-suggestion-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('10'); // 已达限制

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(result).toBe(false);
      expect(mockNotificationService.sendQuotaExhausted).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          plan,
          upgradeOptions: [
            { plan: 'pro', dailyLimit: 100, benefits: expect.any(Array) },
            { plan: 'super', dailyLimit: 1000, benefits: expect.any(Array) },
          ],
        }),
      );
    });
  });

  describe('配额重置通知', () => {
    it('应该在每日重置时发送通知', async () => {
      // Arrange
      const userId = 'reset-notification-user';
      const plan = 'pro';

      // Mock时间为午夜前1分钟
      const mockNow = new Date('2024-01-15T23:59:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      mockRedis.get.mockResolvedValue('85'); // 昨天使用了85

      // Act
      // 模拟定时任务触发重置通知
      await quotaManager.sendDailyResetNotifications();

      // Assert
      expect(mockNotificationService.sendQuotaReset).toHaveBeenCalledWith({
        userId,
        plan,
        previousDayUsage: 85,
        dailyLimit: 100,
        resetTime: expect.any(Date),
        newQuotaAvailable: 100,
      });

      jest.restoreAllMocks();
    });

    it('应该为高使用量用户发送特殊重置通知', async () => {
      // Arrange
      const userId = 'heavy-user';
      const plan = 'super';

      mockRedis.get.mockResolvedValue('950'); // 使用了95%

      // Act
      await quotaManager.sendDailyResetNotifications();

      // Assert
      expect(mockNotificationService.sendQuotaReset).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          plan,
          previousDayUsage: 950,
          usagePercentage: 0.95,
          isHeavyUser: true,
          recommendations: expect.any(Array),
        }),
      );
    });

    it('应该批量处理多用户的重置通知', async () => {
      // Arrange
      const users = [
        { userId: 'user1', plan: 'free', usage: '8' },
        { userId: 'user2', plan: 'pro', usage: '75' },
        { userId: 'user3', plan: 'super', usage: '500' },
      ];

      mockRedis.get.mockImplementation((key) => {
        const user = users.find(u => key.includes(u.userId));
        return Promise.resolve(user ? user.usage : '0');
      });

      // Act
      await quotaManager.sendBatchResetNotifications(users.map(u => ({
        userId: u.userId,
        plan: u.plan as any,
      })));

      // Assert
      expect(mockNotificationService.sendQuotaReset).toHaveBeenCalledTimes(3);

      users.forEach(user => {
        expect(mockNotificationService.sendQuotaReset).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: user.userId,
            plan: user.plan,
            previousDayUsage: parseInt(user.usage, 10),
          }),
        );
      });
    });
  });

  describe('通知调度和时机', () => {
    it('应该在合适的时间调度通知', async () => {
      // Arrange
      const userId = 'scheduled-user';
      const plan = 'pro';

      // Mock当前时间为下午2点
      const mockNow = new Date('2024-01-15T14:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      mockRedis.get.mockResolvedValue('79');
      mockRedis.increment.mockResolvedValue(80); // 达到80%阈值

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith({
        userId,
        type: 'quota_warning',
        scheduledFor: expect.any(Date),
        data: expect.objectContaining({
          currentUsage: 80,
          warningThreshold: 0.8,
        }),
      });

      jest.restoreAllMocks();
    });

    it('应该避免在用户休息时间发送通知', async () => {
      // Arrange
      const userId = 'night-user';
      const plan = 'free';

      // Mock深夜时间
      const mockNow = new Date('2024-01-15T02:30:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      mockRedis.get.mockResolvedValue('7');
      mockRedis.increment.mockResolvedValue(8);

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      // 应该调度到合适的时间发送，而不是立即发送
      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledFor: expect.any(Date), // 应该是早上的时间
        }),
      );

      const scheduledTime = mockNotificationService.scheduleNotification.mock.calls[0][0].scheduledFor;
      expect(scheduledTime.getHours()).toBeGreaterThanOrEqual(8); // 早上8点后
      expect(scheduledTime.getHours()).toBeLessThan(22); // 晚上10点前

      jest.restoreAllMocks();
    });

    it('应该根据用户时区调整通知时间', async () => {
      // Arrange
      const userId = 'timezone-user';
      const plan = 'pro';
      const userTimezone = 'America/New_York'; // UTC-5

      mockRedis.get.mockResolvedValue('89');
      mockRedis.increment.mockResolvedValue(90);

      // Act
      await quotaManager.consumeQuota(userId, plan, 1, { timezone: userTimezone });

      // Assert
      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          timezone: userTimezone,
          scheduledFor: expect.any(Date),
        }),
      );
    });

    it('应该支持通知的取消和重新调度', async () => {
      // Arrange
      const userId = 'reschedule-user';
      const plan = 'super';

      // 先触发一个通知
      mockRedis.get.mockResolvedValue('799');
      mockRedis.increment.mockResolvedValue(800);
      await quotaManager.consumeQuota(userId, plan, 1);

      // 然后用户升级了计划
      mockRedis.get.mockResolvedValue('800');

      // Act
      await quotaManager.handlePlanUpgrade(userId, 'super', 'enterprise');

      // Assert
      expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith({
        userId,
        type: 'quota_warning',
      });

      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith({
        userId,
        type: 'plan_upgraded',
        data: expect.objectContaining({
          oldPlan: 'super',
          newPlan: 'enterprise',
        }),
      });
    });
  });

  describe('通知频率控制', () => {
    it('应该限制通知发送频率', async () => {
      // Arrange
      const userId = 'frequency-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('8');

      // Act - 短时间内多次检查配额
      for (let i = 0; i < 5; i++) {
        await quotaManager.checkQuota(userId, plan);
      }

      // Assert
      // 应该只发送一次通知，不管检查多少次
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledTimes(1);
    });

    it('应该实现通知的冷却期', async () => {
      // Arrange
      const userId = 'cooldown-user';
      const plan = 'pro';

      // Mock通知冷却期为1小时
      const cooldownPeriod = 60 * 60 * 1000; // 1小时

      mockRedis.get.mockImplementation((key) => {
        if (key.includes('notification_cooldown')) {
          const lastNotification = Date.now() - (30 * 60 * 1000); // 30分钟前
          return Promise.resolve(lastNotification.toString());
        }
        return Promise.resolve('80');
      });

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      // 由于还在冷却期内，不应该发送通知
      expect(mockNotificationService.sendQuotaWarning).not.toHaveBeenCalled();
    });

    it('应该在冷却期结束后恢复通知', async () => {
      // Arrange
      const userId = 'cooldown-expired-user';
      const plan = 'free';

      mockRedis.get.mockImplementation((key) => {
        if (key.includes('notification_cooldown')) {
          const lastNotification = Date.now() - (2 * 60 * 60 * 1000); // 2小时前
          return Promise.resolve(lastNotification.toString());
        }
        return Promise.resolve('8');
      });

      mockRedis.increment.mockResolvedValue(9);

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      // 冷却期已过，应该发送通知
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalled();
    });
  });

  describe('通知内容个性化', () => {
    it('应该根据用户历史使用模式个性化通知', async () => {
      // Arrange
      const userId = 'personalized-user';
      const plan = 'pro';

      // Mock用户历史数据显示通常在下午使用较多
      const historicalPattern = {
        peakHours: [14, 15, 16], // 下午2-4点
        averageDailyUsage: 75,
        usageGrowthTrend: 'increasing',
      };

      mockRedis.get.mockImplementation((key) => {
        if (key.includes('usage_pattern')) {
          return Promise.resolve(JSON.stringify(historicalPattern));
        }
        return Promise.resolve('80');
      });

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          personalization: {
            historicalPattern,
            recommendations: expect.arrayContaining([
              expect.stringContaining('peak hours'),
              expect.stringContaining('usage trend'),
            ]),
          },
        }),
      );
    });

    it('应该为新用户提供引导性通知', async () => {
      // Arrange
      const userId = 'new-user';
      const plan = 'free';

      // Mock新用户（注册不到7天）
      const userRegistrationDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3天前

      mockRedis.get.mockImplementation((key) => {
        if (key.includes('registration_date')) {
          return Promise.resolve(userRegistrationDate.toISOString());
        }
        return Promise.resolve('8');
      });

      // Act
      await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          isNewUser: true,
          onboardingTips: expect.arrayContaining([
            expect.stringContaining('quota management'),
            expect.stringContaining('upgrade options'),
          ]),
        }),
      );
    });

    it('应该为高价值用户提供优先支持通知', async () => {
      // Arrange
      const userId = 'vip-user';
      const plan = 'super';

      // Mock高价值用户标识
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('user_tier')) {
          return Promise.resolve('vip');
        }
        return Promise.resolve('900');
      });

      mockRedis.increment.mockResolvedValue(1000);

      // Act
      await quotaManager.consumeQuota(userId, plan, 100);

      // Assert
      expect(mockNotificationService.sendQuotaExhausted).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          userTier: 'vip',
          prioritySupport: true,
          customSolutions: expect.any(Array),
        }),
      );
    });
  });

  describe('通知性能和可靠性', () => {
    it('应该异步发送通知以避免阻塞主流程', async () => {
      // Arrange
      const userId = 'async-user';
      const plan = 'pro';

      mockRedis.get.mockResolvedValue('79');
      mockRedis.increment.mockResolvedValue(80);

      // Mock通知服务有延迟
      mockNotificationService.sendQuotaWarning.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 1000)),
      );

      // Act
      const startTime = Date.now();
      const result = await quotaManager.consumeQuota(userId, plan, 1);
      const endTime = Date.now();

      // Assert
      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 主流程应该很快完成
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalled();
    });

    it('应该处理通知发送失败的情况', async () => {
      // Arrange
      const userId = 'notification-fail-user';
      const plan = 'free';

      mockRedis.get.mockResolvedValue('9');
      mockRedis.increment.mockResolvedValue(10);

      mockNotificationService.sendQuotaExhausted.mockRejectedValue(
        new Error('Notification service unavailable'),
      );

      // Act
      const result = await quotaManager.consumeQuota(userId, plan, 1);

      // Assert
      expect(result).toBe(true); // 主功能不应该受影响

      // 应该记录失败并可能重试
      expect(mockNotificationService.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quota_exhausted',
          retryCount: 1,
          scheduledFor: expect.any(Date),
        }),
      );
    });

    it('应该批量处理通知以提高性能', async () => {
      // Arrange
      const users = Array.from({ length: 100 }, (_, i) => ({
        userId: `batch-user-${i}`,
        plan: 'pro' as const,
      }));

      mockRedis.get.mockResolvedValue('80');

      // Act
      const startTime = Date.now();

      await Promise.all(
        users.map(user => quotaManager.consumeQuota(user.userId, user.plan, 1)),
      );

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000); // 批量处理应该高效

      // 应该使用批量通知API
      expect(mockNotificationService.sendBatchNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'quota_warning',
            recipients: expect.any(Array),
          }),
        ]),
      );
    });
  });
});
