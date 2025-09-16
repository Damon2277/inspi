import { QuotaManager } from '@/lib/quota/quotaManager';
import { User } from '@/lib/models/User';

// Mock User model
jest.mock('@/lib/models/User');

describe('QuotaManager', () => {
  let quotaManager: QuotaManager;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    quotaManager = new QuotaManager();
    
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      subscription: 'free',
      quotaUsed: 0,
      quotaLimit: 10,
      quotaResetDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      save: jest.fn().mockResolvedValue(true)
    };
  });

  describe('checkQuota', () => {
    it('should allow usage when under quota limit', async () => {
      // Arrange
      mockUser.quotaUsed = 5;
      mockUser.quotaLimit = 10;

      // Act
      const result = await quotaManager.checkQuota(mockUser, 'ai_generation');

      // Assert
      expect(result).toEqual({
        allowed: true,
        remaining: 5,
        limit: 10,
        used: 5,
        resetDate: mockUser.quotaResetDate
      });
    });

    it('should deny usage when at quota limit', async () => {
      // Arrange
      mockUser.quotaUsed = 10;
      mockUser.quotaLimit = 10;

      // Act
      const result = await quotaManager.checkQuota(mockUser, 'ai_generation');

      // Assert
      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        limit: 10,
        used: 10,
        resetDate: mockUser.quotaResetDate,
        reason: 'Quota limit exceeded'
      });
    });

    it('should deny usage when over quota limit', async () => {
      // Arrange
      mockUser.quotaUsed = 15;
      mockUser.quotaLimit = 10;

      // Act
      const result = await quotaManager.checkQuota(mockUser, 'ai_generation');

      // Assert
      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        limit: 10,
        used: 15,
        resetDate: mockUser.quotaResetDate,
        reason: 'Quota limit exceeded'
      });
    });

    it('should handle different subscription tiers', async () => {
      // Arrange
      const subscriptionLimits = {
        free: 10,
        pro: 100,
        enterprise: 1000
      };

      for (const [subscription, expectedLimit] of Object.entries(subscriptionLimits)) {
        mockUser.subscription = subscription;
        mockUser.quotaLimit = expectedLimit;
        mockUser.quotaUsed = 0;

        // Act
        const result = await quotaManager.checkQuota(mockUser, 'ai_generation');

        // Assert
        expect(result.limit).toBe(expectedLimit);
        expect(result.allowed).toBe(true);
      }
    });

    it('should handle different operation types', async () => {
      // Arrange
      const operationCosts = {
        ai_generation: 1,
        image_upload: 2,
        export_data: 5
      };

      mockUser.quotaUsed = 8;
      mockUser.quotaLimit = 10;

      for (const [operation, cost] of Object.entries(operationCosts)) {
        // Act
        const result = await quotaManager.checkQuota(mockUser, operation as any, cost);

        // Assert
        if (mockUser.quotaUsed + cost <= mockUser.quotaLimit) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
        }
      }
    });

    it('should auto-reset expired quotas', async () => {
      // Arrange
      mockUser.quotaUsed = 10;
      mockUser.quotaLimit = 10;
      mockUser.quotaResetDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      // Act
      const result = await quotaManager.checkQuota(mockUser, 'ai_generation');

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0); // Should be reset
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('consumeQuota', () => {
    it('should consume quota successfully when allowed', async () => {
      // Arrange
      mockUser.quotaUsed = 5;
      mockUser.quotaLimit = 10;

      // Act
      const result = await quotaManager.consumeQuota(mockUser, 'ai_generation', 2);

      // Assert
      expect(result).toEqual({
        success: true,
        newUsage: 7,
        remaining: 3,
        limit: 10
      });
      expect(mockUser.quotaUsed).toBe(7);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should fail to consume quota when limit exceeded', async () => {
      // Arrange
      mockUser.quotaUsed = 9;
      mockUser.quotaLimit = 10;

      // Act
      const result = await quotaManager.consumeQuota(mockUser, 'ai_generation', 2);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Insufficient quota',
        remaining: 1,
        limit: 10,
        requested: 2
      });
      expect(mockUser.quotaUsed).toBe(9); // Should not change
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should handle concurrent quota consumption', async () => {
      // Arrange
      mockUser.quotaUsed = 8;
      mockUser.quotaLimit = 10;

      // Act - Simulate concurrent requests
      const promises = [
        quotaManager.consumeQuota(mockUser, 'ai_generation', 1),
        quotaManager.consumeQuota(mockUser, 'ai_generation', 1),
        quotaManager.consumeQuota(mockUser, 'ai_generation', 1)
      ];

      const results = await Promise.all(promises);

      // Assert - Only 2 should succeed (8 + 1 + 1 = 10)
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(2);
      expect(failureCount).toBe(1);
    });

    it('should track operation history', async () => {
      // Arrange
      mockUser.quotaUsed = 5;
      mockUser.quotaLimit = 10;

      // Act
      await quotaManager.consumeQuota(mockUser, 'ai_generation', 2);
      const history = await quotaManager.getUsageHistory(mockUser.id);

      // Assert
      expect(history).toContainEqual(
        expect.objectContaining({
          userId: mockUser.id,
          operation: 'ai_generation',
          cost: 2,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('resetQuota', () => {
    it('should reset user quota manually', async () => {
      // Arrange
      mockUser.quotaUsed = 10;

      // Act
      const result = await quotaManager.resetQuota(mockUser.id);

      // Assert
      expect(result).toEqual({
        success: true,
        previousUsage: 10,
        newUsage: 0,
        resetDate: expect.any(Date)
      });
    });

    it('should reset quota for all users', async () => {
      // Arrange
      const mockUsers = [
        { id: 'user1', quotaUsed: 5, save: jest.fn() },
        { id: 'user2', quotaUsed: 8, save: jest.fn() },
        { id: 'user3', quotaUsed: 10, save: jest.fn() }
      ];

      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      // Act
      const result = await quotaManager.resetAllQuotas();

      // Assert
      expect(result).toEqual({
        success: true,
        usersReset: 3,
        totalUsageCleared: 23
      });

      mockUsers.forEach(user => {
        expect(user.quotaUsed).toBe(0);
        expect(user.save).toHaveBeenCalled();
      });
    });

    it('should schedule automatic quota resets', async () => {
      // Arrange
      const mockScheduler = jest.fn();
      quotaManager.setScheduler(mockScheduler);

      // Act
      quotaManager.scheduleQuotaReset('daily');

      // Assert
      expect(mockScheduler).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: 'daily',
          task: expect.any(Function)
        })
      );
    });
  });

  describe('getQuotaStatus', () => {
    it('should return detailed quota status', async () => {
      // Arrange
      mockUser.quotaUsed = 7;
      mockUser.quotaLimit = 10;

      // Act
      const status = await quotaManager.getQuotaStatus(mockUser.id);

      // Assert
      expect(status).toEqual({
        userId: mockUser.id,
        subscription: mockUser.subscription,
        used: 7,
        limit: 10,
        remaining: 3,
        usagePercentage: 70,
        resetDate: mockUser.quotaResetDate,
        daysUntilReset: expect.any(Number),
        isNearLimit: false,
        isAtLimit: false
      });
    });

    it('should detect near limit status', async () => {
      // Arrange
      mockUser.quotaUsed = 9;
      mockUser.quotaLimit = 10;

      // Act
      const status = await quotaManager.getQuotaStatus(mockUser.id);

      // Assert
      expect(status.isNearLimit).toBe(true);
      expect(status.usagePercentage).toBe(90);
    });

    it('should detect at limit status', async () => {
      // Arrange
      mockUser.quotaUsed = 10;
      mockUser.quotaLimit = 10;

      // Act
      const status = await quotaManager.getQuotaStatus(mockUser.id);

      // Assert
      expect(status.isAtLimit).toBe(true);
      expect(status.remaining).toBe(0);
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade user subscription and quota', async () => {
      // Arrange
      mockUser.subscription = 'free';
      mockUser.quotaLimit = 10;

      // Act
      const result = await quotaManager.upgradeSubscription(mockUser.id, 'pro');

      // Assert
      expect(result).toEqual({
        success: true,
        previousSubscription: 'free',
        newSubscription: 'pro',
        previousLimit: 10,
        newLimit: 100
      });
    });

    it('should handle invalid subscription upgrades', async () => {
      // Arrange
      mockUser.subscription = 'pro';

      // Act
      const result = await quotaManager.upgradeSubscription(mockUser.id, 'free');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Cannot downgrade subscription'
      });
    });

    it('should prorate quota on mid-cycle upgrade', async () => {
      // Arrange
      mockUser.subscription = 'free';
      mockUser.quotaUsed = 5;
      mockUser.quotaLimit = 10;
      mockUser.quotaResetDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days

      // Act
      const result = await quotaManager.upgradeSubscription(mockUser.id, 'pro', { prorate: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.proratedQuota).toBeGreaterThan(10); // Should get additional quota
    });
  });

  describe('getUsageAnalytics', () => {
    it('should return usage analytics for user', async () => {
      // Arrange
      const mockHistory = [
        { operation: 'ai_generation', cost: 1, timestamp: new Date() },
        { operation: 'ai_generation', cost: 2, timestamp: new Date() },
        { operation: 'image_upload', cost: 1, timestamp: new Date() }
      ];

      jest.spyOn(quotaManager, 'getUsageHistory').mockResolvedValue(mockHistory);

      // Act
      const analytics = await quotaManager.getUsageAnalytics(mockUser.id);

      // Assert
      expect(analytics).toEqual({
        totalUsage: 4,
        operationBreakdown: {
          ai_generation: 3,
          image_upload: 1
        },
        averageDailyUsage: expect.any(Number),
        peakUsageDay: expect.any(String),
        projectedMonthlyUsage: expect.any(Number)
      });
    });

    it('should provide usage recommendations', async () => {
      // Arrange
      mockUser.quotaUsed = 9;
      mockUser.quotaLimit = 10;

      // Act
      const recommendations = await quotaManager.getUsageRecommendations(mockUser.id);

      // Assert
      expect(recommendations).toContain('Consider upgrading your subscription');
      expect(recommendations).toContain('You are near your quota limit');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockUser.save.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await quotaManager.consumeQuota(mockUser, 'ai_generation', 1);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Failed to update quota usage'
      });
    });

    it('should handle invalid user data', async () => {
      // Arrange
      const invalidUser = {
        id: 'user123',
        quotaUsed: 'invalid',
        quotaLimit: null
      };

      // Act
      const result = await quotaManager.checkQuota(invalidUser as any, 'ai_generation');

      // Assert
      expect(result).toEqual({
        allowed: false,
        error: 'Invalid user quota data'
      });
    });

    it('should handle missing user', async () => {
      // Arrange
      (User.findById as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await quotaManager.getQuotaStatus('nonexistent');

      // Assert
      expect(result).toEqual({
        error: 'User not found'
      });
    });
  });

  describe('caching', () => {
    it('should cache quota status for performance', async () => {
      // Arrange
      const mockCache = new Map();
      quotaManager.setCache(mockCache);

      // Act
      await quotaManager.getQuotaStatus(mockUser.id);
      await quotaManager.getQuotaStatus(mockUser.id);

      // Assert
      expect(mockCache.has(`quota:${mockUser.id}`)).toBe(true);
    });

    it('should invalidate cache on quota changes', async () => {
      // Arrange
      const mockCache = new Map();
      quotaManager.setCache(mockCache);
      
      await quotaManager.getQuotaStatus(mockUser.id);
      expect(mockCache.size).toBe(1);

      // Act
      await quotaManager.consumeQuota(mockUser, 'ai_generation', 1);

      // Assert
      expect(mockCache.has(`quota:${mockUser.id}`)).toBe(false);
    });
  });

  describe('notifications', () => {
    it('should send notification when approaching quota limit', async () => {
      // Arrange
      const mockNotificationService = {
        sendQuotaWarning: jest.fn()
      };
      quotaManager.setNotificationService(mockNotificationService);

      mockUser.quotaUsed = 8;
      mockUser.quotaLimit = 10;

      // Act
      await quotaManager.consumeQuota(mockUser, 'ai_generation', 1);

      // Assert
      expect(mockNotificationService.sendQuotaWarning).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          remaining: 1,
          limit: 10
        })
      );
    });

    it('should send notification when quota is exceeded', async () => {
      // Arrange
      const mockNotificationService = {
        sendQuotaExceeded: jest.fn()
      };
      quotaManager.setNotificationService(mockNotificationService);

      mockUser.quotaUsed = 10;
      mockUser.quotaLimit = 10;

      // Act
      await quotaManager.consumeQuota(mockUser, 'ai_generation', 1);

      // Assert
      expect(mockNotificationService.sendQuotaExceeded).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          limit: 10,
          attempted: 1
        })
      );
    });
  });
});