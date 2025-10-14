/**
 * 订阅管理器单元测试
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { subscriptionManager } from '@/core/subscription/subscription-manager';

// Mock dependencies
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/models/User');

describe('SubscriptionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('套餐管理', () => {
    it('应该返回默认套餐列表', async () => {
      const plans = await subscriptionManager.getAvailablePlans();

      expect(plans).toHaveLength(4); // free, basic, pro, admin
      expect(plans[0].tier).toBe('free');
      expect(plans[1].tier).toBe('basic');
      expect(plans[2].tier).toBe('pro');
      expect(plans[3].tier).toBe('admin');
    });

    it('应该根据等级获取套餐', async () => {
      const basicPlan = await subscriptionManager.getPlanByTier('basic');

      expect(basicPlan).toBeDefined();
      expect(basicPlan?.tier).toBe('basic');
      expect(basicPlan?.displayName).toBe('基础版');
      expect(basicPlan?.monthlyPrice).toBe(69);
    });

    it('应该根据ID获取套餐', async () => {
      const plan = await subscriptionManager.getPlanById('plan_pro');

      expect(plan).toBeDefined();
      expect(plan?.tier).toBe('pro');
      expect(plan?.displayName).toBe('专业版');
      expect(plan?.monthlyPrice).toBe(199);
    });

    it('应该返回null当套餐不存在时', async () => {
      const plan = await subscriptionManager.getPlanById('nonexistent');

      expect(plan).toBeNull();
    });
  });

  describe('订阅创建', () => {
    it('应该成功创建免费订阅', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue({
        _id: 'user123',
        tier: 'free',
      });

      const request = {
        userId: 'user123',
        planId: 'plan_free',
        billingCycle: 'monthly' as const,
        paymentMethod: 'wechat_pay' as const,
      };

      const result = await subscriptionManager.createSubscription(request);

      expect(result.subscription.status).toBe('active'); // 免费套餐直接激活
      expect(result.paymentRequired).toBe(false);
      expect(result.subscription.plan).toBe('free');
    });

    it('应该创建付费订阅并要求支付', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue({
        _id: 'user123',
        tier: 'free',
      });

      const request = {
        userId: 'user123',
        planId: 'plan_basic',
        billingCycle: 'monthly' as const,
        paymentMethod: 'wechat_pay' as const,
      };

      const result = await subscriptionManager.createSubscription(request);

      expect(result.subscription.status).toBe('pending'); // 付费套餐待支付
      expect(result.paymentRequired).toBe(true);
      expect(result.paymentInfo).toBeDefined();
      expect(result.subscription.plan).toBe('basic');
    });

    it('应该正确计算年付价格', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue({
        _id: 'user123',
        tier: 'free',
      });

      const request = {
        userId: 'user123',
        planId: 'plan_basic',
        billingCycle: 'yearly' as const,
        paymentMethod: 'wechat_pay' as const,
      };

      const result = await subscriptionManager.createSubscription(request);

      // 年付应该有优惠
      expect(result.paymentInfo?.amount).toBe(690); // 69 * 10
    });

    it('应该拒绝重复订阅', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue({
        _id: 'user123',
        tier: 'basic',
      });

      // Mock getCurrentSubscription to return active subscription
      jest.spyOn(subscriptionManager, 'getCurrentSubscription')
        .mockResolvedValue({
          id: 'sub123',
          userId: 'user123',
          status: 'active',
        } as any);

      const request = {
        userId: 'user123',
        planId: 'plan_pro',
        billingCycle: 'monthly' as const,
        paymentMethod: 'wechat_pay' as const,
      };

      await expect(subscriptionManager.createSubscription(request))
        .rejects.toThrow('用户已有活跃订阅');
    });
  });

  describe('订阅升级', () => {
    it('应该成功升级订阅', async () => {
      const currentSubscription = {
        id: 'sub123',
        userId: 'user123',
        planId: 'plan_basic',
        tier: 'basic' as const,
        monthlyPrice: 69,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        status: 'active' as const,
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(currentSubscription as any);

      const request = {
        subscriptionId: 'sub123',
        newPlanId: 'plan_pro',
        effectiveDate: 'immediate' as const,
      };

      const result = await subscriptionManager.upgradeSubscription(request);

      expect(result.subscription.planId).toBe('plan_pro');
      expect(result.subscription.plan).toBe('pro');
      expect(result.subscription.monthlyPrice).toBe(199);
      expect(result.prorationAmount).toBeGreaterThan(0);
      expect(result.paymentRequired).toBe(true);
    });

    it('应该拒绝降级请求', async () => {
      const currentSubscription = {
        id: 'sub123',
        planId: 'plan_pro',
        tier: 'pro' as const,
        monthlyPrice: 199,
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(currentSubscription as any);

      const request = {
        subscriptionId: 'sub123',
        newPlanId: 'plan_basic',
        effectiveDate: 'immediate' as const,
      };

      await expect(subscriptionManager.upgradeSubscription(request))
        .rejects.toThrow('只能升级到更高价格的套餐');
    });
  });

  describe('订阅降级', () => {
    it('应该成功降级订阅（下个周期生效）', async () => {
      const currentSubscription = {
        id: 'sub123',
        planId: 'plan_pro',
        tier: 'pro' as const,
        monthlyPrice: 199,
        endDate: new Date('2024-02-01'),
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(currentSubscription as any);

      const result = await subscriptionManager.downgradeSubscription(
        'sub123',
        'plan_basic',
        'next_cycle',
      );

      expect(result.metadata?.downgradePlan).toBeDefined();
      expect(result.metadata?.downgradePlan.planId).toBe('plan_basic');
    });

    it('应该立即降级订阅', async () => {
      const currentSubscription = {
        id: 'sub123',
        userId: 'user123',
        planId: 'plan_pro',
        tier: 'pro' as const,
        monthlyPrice: 199,
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(currentSubscription as any);

      const result = await subscriptionManager.downgradeSubscription(
        'sub123',
        'plan_basic',
        'immediate',
      );

      expect(result.planId).toBe('plan_basic');
      expect(result.tier).toBe('basic');
      expect(result.monthlyPrice).toBe(69);
    });
  });

  describe('订阅取消', () => {
    it('应该成功取消订阅（期末生效）', async () => {
      const subscription = {
        id: 'sub123',
        userId: 'user123',
        tier: 'basic' as const,
        endDate: new Date('2024-02-01'),
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(subscription as any);

      const result = await subscriptionManager.cancelSubscription(
        'sub123',
        '不再需要',
        false,
      );

      expect(result.status).toBe('active'); // 仍然活跃到期末
      expect(result.cancelledAt).toBeDefined();
      expect(result.metadata?.cancellationReason).toBe('不再需要');
    });

    it('应该立即取消订阅', async () => {
      const subscription = {
        id: 'sub123',
        userId: 'user123',
        tier: 'basic' as const,
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(subscription as any);

      const result = await subscriptionManager.cancelSubscription(
        'sub123',
        '立即取消',
        true,
      );

      expect(result.status).toBe('cancelled');
      expect(result.tier).toBe('free'); // 降级到免费
    });
  });

  describe('订阅恢复', () => {
    it('应该成功恢复订阅', async () => {
      const cancelledSubscription = {
        id: 'sub123',
        userId: 'user123',
        status: 'cancelled' as const,
        tier: 'basic' as const,
        cancelledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前取消
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(cancelledSubscription as any);

      const result = await subscriptionManager.reactivateSubscription('sub123');

      expect(result.status).toBe('active');
      expect(result.cancelledAt).toBeUndefined();
      expect(result.metadata?.reactivatedAt).toBeDefined();
    });

    it('应该拒绝超过宽限期的恢复', async () => {
      const cancelledSubscription = {
        id: 'sub123',
        status: 'cancelled' as const,
        cancelledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前取消
      };

      jest.spyOn(subscriptionManager, 'getSubscriptionById')
        .mockResolvedValue(cancelledSubscription as any);

      await expect(subscriptionManager.reactivateSubscription('sub123'))
        .rejects.toThrow('超过恢复期限');
    });
  });

  describe('套餐创建', () => {
    it('应该成功创建新套餐', async () => {
      const planData = {
        name: 'enterprise',
        displayName: '企业版',
        description: '企业级功能套餐',
        tier: 'pro' as const,
        monthlyPrice: 999,
        quotas: {
          dailyCreateQuota: -1,
          dailyReuseQuota: -1,
          maxExportsPerDay: -1,
          maxGraphNodes: -1,
        },
        features: ['无限制使用', '专属客服', '定制开发'],
        limitations: [],
      };

      const result = await subscriptionManager.createPlan(planData);

      expect(result.name).toBe('enterprise');
      expect(result.displayName).toBe('企业版');
      expect(result.monthlyPrice).toBe(999);
      expect(result.active).toBe(true);
      expect(result.id).toMatch(/^plan_/);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的用户ID', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue(null);

      const request = {
        userId: 'nonexistent',
        planId: 'plan_basic',
        billingCycle: 'monthly' as const,
        paymentMethod: 'wechat_pay' as const,
      };

      await expect(subscriptionManager.createSubscription(request))
        .rejects.toThrow('用户不存在');
    });

    it('应该处理无效的套餐ID', async () => {
      const User = require('@/lib/models/User').default;
      User.findById = jest.fn().mockResolvedValue({
        _id: 'user123',
      });

      const request = {
        userId: 'user123',
        planId: 'nonexistent',
        billingCycle: 'monthly' as const,
        paymentMethod: 'wechat_pay' as const,
      };

      await expect(subscriptionManager.createSubscription(request))
        .rejects.toThrow('套餐不存在');
    });
  });
});
