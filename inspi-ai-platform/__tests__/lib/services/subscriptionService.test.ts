/**
 * 订阅服务测试
 */

import { Subscription, Usage } from '@/lib/models';
import connectDB from '@/lib/mongodb';
import { getRedisClient } from '@/lib/redis';

import { SubscriptionService } from '@/lib/services/subscriptionService';

// Mock Redis
jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(() => []),
  })),
}));

// Mock MongoDB connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock models
jest.mock('@/lib/models', () => ({
  Subscription: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    constructor: jest.fn(),
  },
  Usage: {
    findOne: jest.fn(),
    updateMany: jest.fn(),
    constructor: jest.fn(),
  },
}));

describe('SubscriptionService', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  describe('getActiveSubscription', () => {
    it('should return cached subscription if available and not expired', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        plan: 'pro',
        status: 'active',
        endDate: new Date(Date.now() + 86400000), // tomorrow
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSubscription));

      const result = await SubscriptionService.getActiveSubscription('user123');

      expect(result).toEqual(mockSubscription);
      expect(mockRedis.get).toHaveBeenCalledWith('subscription:user123');
    });

    it('should fetch from database if cache is empty', async () => {
      const mockSubscription = {
        _id: 'sub123',
        userId: 'user123',
        plan: 'pro',
        status: 'active',
        endDate: new Date(Date.now() + 86400000),
      };

      mockRedis.get.mockResolvedValue(null);
      (Subscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await SubscriptionService.getActiveSubscription('user123');

      expect(result).toEqual(mockSubscription);
      expect(Subscription.findOne).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'subscription:user123',
        3600,
        JSON.stringify(mockSubscription),
      );
    });

    it('should return null if no active subscription found', async () => {
      mockRedis.get.mockResolvedValue(null);
      (Subscription.findOne as jest.Mock).mockResolvedValue(null);

      const result = await SubscriptionService.getActiveSubscription('user123');

      expect(result).toBeNull();
    });
  });

  describe('checkUsageLimit', () => {
    it('should return usage limit check result', async () => {
      const mockUsage = {
        generations: 5,
        reuses: 2,
        limits: {
          maxGenerations: 20,
          maxReuses: 10,
        },
      };

      const mockSubscription = {
        plan: 'pro',
      };

      // Mock getTodayUsage and getActiveSubscription
      jest.spyOn(SubscriptionService, 'getTodayUsage').mockResolvedValue(mockUsage as any);
      jest.spyOn(SubscriptionService,
        'getActiveSubscription').mockResolvedValue(mockSubscription as any);

      const result = await SubscriptionService.checkUsageLimit('user123', 'generation');

      expect(result).toEqual({
        allowed: true,
        current: 5,
        limit: 20,
        plan: 'pro',
      });
    });

    it('should return false when limit is exceeded', async () => {
      const mockUsage = {
        generations: 20,
        reuses: 2,
        limits: {
          maxGenerations: 20,
          maxReuses: 10,
        },
      };

      const mockSubscription = {
        plan: 'pro',
      };

      jest.spyOn(SubscriptionService, 'getTodayUsage').mockResolvedValue(mockUsage as any);
      jest.spyOn(SubscriptionService,
        'getActiveSubscription').mockResolvedValue(mockSubscription as any);

      const result = await SubscriptionService.checkUsageLimit('user123', 'generation');

      expect(result).toEqual({
        allowed: false,
        current: 20,
        limit: 20,
        plan: 'pro',
      });
    });
  });

  describe('processExpiredSubscriptions', () => {
    it('should process expired subscriptions', async () => {
      const mockExpiredSubscriptions = [
        {
          _id: 'sub1',
          userId: 'user1',
          status: 'active',
          save: jest.fn(),
        },
        {
          _id: 'sub2',
          userId: 'user2',
          status: 'active',
          save: jest.fn(),
        },
      ];

      (Subscription.find as jest.Mock).mockResolvedValue(mockExpiredSubscriptions);

      const result = await SubscriptionService.processExpiredSubscriptions();

      expect(result).toBe(2);
      expect(mockExpiredSubscriptions[0].status).toBe('expired');
      expect(mockExpiredSubscriptions[1].status).toBe('expired');
      expect(mockExpiredSubscriptions[0].save).toHaveBeenCalled();
      expect(mockExpiredSubscriptions[1].save).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });
  });
});
