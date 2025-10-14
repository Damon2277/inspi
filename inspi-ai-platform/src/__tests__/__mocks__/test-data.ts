/**
 * 测试数据工厂
 * 提供各种测试场景的模拟数据
 */

import { Subscription, PaymentRecord, SubscriptionPlan, UserTier } from '@/shared/types/subscription';

export class TestDataFactory {
  /**
   * 创建模拟订阅数据
   */
  static createMockSubscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
      id: 'sub-test-123',
      userId: 'user-test-123',
      planId: 'plan-basic',
      planName: '基础版',
      tier: 'basic',
      status: 'active',
      monthlyPrice: 69,
      currency: 'CNY',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-01'),
      nextBillingDate: new Date('2024-02-01'),
      paymentMethod: 'wechat_pay',
      quotas: {
        dailyCreateQuota: 20,
        dailyReuseQuota: 5,
        maxExportsPerDay: 50,
        maxGraphNodes: -1,
      },
      features: ['高清导出', '智能分析', '无限知识图谱'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  /**
   * 创建模拟支付记录
   */
  static createMockPaymentRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
    return {
      id: 'pay-test-123',
      subscriptionId: 'sub-test-123',
      userId: 'user-test-123',
      amount: 6900,
      currency: 'CNY',
      paymentMethod: 'wechat_pay',
      paymentId: 'wx-test-123',
      status: 'pending',
      billingPeriodStart: new Date('2024-01-01'),
      billingPeriodEnd: new Date('2024-02-01'),
      retryCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  /**
   * 创建模拟套餐数据
   */
  static createMockPlan(tier: UserTier = 'basic'): SubscriptionPlan {
    const plans = {
      free: {
        id: 'plan-free',
        name: '免费版',
        tier: 'free' as UserTier,
        monthlyPrice: 0,
        quotas: {
          dailyCreateQuota: 3,
          dailyReuseQuota: 1,
          maxExportsPerDay: 10,
          maxGraphNodes: 50,
        },
        features: ['基础卡片创建', '简单模板', '标准导出'],
      },
      basic: {
        id: 'plan-basic',
        name: '基础版',
        tier: 'basic' as UserTier,
        monthlyPrice: 69,
        quotas: {
          dailyCreateQuota: 20,
          dailyReuseQuota: 5,
          maxExportsPerDay: 50,
          maxGraphNodes: -1,
        },
        features: ['高清导出', '智能分析', '无限知识图谱'],
      },
      pro: {
        id: 'plan-pro',
        name: '专业版',
        tier: 'pro' as UserTier,
        monthlyPrice: 199,
        quotas: {
          dailyCreateQuota: 100,
          dailyReuseQuota: 50,
          maxExportsPerDay: 200,
          maxGraphNodes: -1,
        },
        features: ['高清导出', '智能分析', '无限知识图谱', '品牌定制', '数据导出'],
      },
      admin: {
        id: 'plan-admin',
        name: '管理员',
        tier: 'admin' as UserTier,
        monthlyPrice: 0,
        quotas: {
          dailyCreateQuota: -1,
          dailyReuseQuota: -1,
          maxExportsPerDay: -1,
          maxGraphNodes: -1,
        },
        features: ['所有功能'],
      },
    };

    return {
      ...plans[tier],
      currency: 'CNY',
      sortOrder: tier === 'free' ? 1 : tier === 'basic' ? 2 : tier === 'pro' ? 3 : 4,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    } as SubscriptionPlan;
  }

  /**
   * 创建多个模拟套餐
   */
  static createMockPlans(): SubscriptionPlan[] {
    return [
      this.createMockPlan('free'),
      this.createMockPlan('basic'),
      this.createMockPlan('pro'),
    ];
  }

  /**
   * 创建模拟用户数据
   */
  static createMockUser(overrides: any = {}) {
    return {
      id: 'user-test-123',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'free' as UserTier,
      createdAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  /**
   * 创建模拟通知数据
   */
  static createMockNotification(overrides: any = {}) {
    return {
      id: 'notif-test-123',
      userId: 'user-test-123',
      type: 'quota_warning',
      title: '配额使用提醒',
      content: '您的每日创建配额已使用80%',
      channels: ['system'],
      priority: 'normal',
      status: 'sent',
      createdAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  /**
   * 创建模拟API响应
   */
  static createMockApiResponse(data: any, success: boolean = true) {
    return {
      success,
      ...(success ? data : { error: data.error || 'Mock error' }),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建模拟错误
   */
  static createMockError(message: string = 'Mock error', code: string = 'MOCK_ERROR') {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  }

  /**
   * 创建模拟配额使用数据
   */
  static createMockQuotaUsage(quotaType: string = 'create', used: number = 5, limit: number = 20) {
    return {
      quotaType,
      currentUsage: used,
      limit,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后重置
      allowed: used < limit,
    };
  }

  /**
   * 创建模拟权限数据
   */
  static createMockPermissions(tier: UserTier = 'basic') {
    const permissionMap = {
      free: ['card:create:basic', 'card:export:standard'],
      basic: ['card:create:basic', 'card:create:advanced', 'card:export:hd'],
      pro: ['card:create:basic', 'card:create:advanced', 'card:create:custom', 'card:export:hd', 'card:brand:custom'],
      admin: ['*'],
    };

    return {
      tier,
      permissions: permissionMap[tier],
      quotas: {
        create: this.createMockQuotaUsage('create'),
        reuse: this.createMockQuotaUsage('reuse'),
        export: this.createMockQuotaUsage('export'),
        graph_nodes: this.createMockQuotaUsage('graph_nodes'),
      },
    };
  }

  /**
   * 创建测试场景数据集合
   */
  static createTestScenarios() {
    return {
      // 新用户场景
      newUser: {
        user: this.createMockUser({ tier: 'free' }),
        subscription: null,
        permissions: this.createMockPermissions('free'),
      },

      // 基础版用户场景
      basicUser: {
        user: this.createMockUser({ tier: 'basic' }),
        subscription: this.createMockSubscription({ tier: 'basic' }),
        permissions: this.createMockPermissions('basic'),
      },

      // 专业版用户场景
      proUser: {
        user: this.createMockUser({ tier: 'pro' }),
        subscription: this.createMockSubscription({
          tier: 'pro',
          planId: 'plan-pro',
          planName: '专业版',
          monthlyPrice: 199,
        }),
        permissions: this.createMockPermissions('pro'),
      },

      // 即将到期用户场景
      expiringUser: {
        user: this.createMockUser({ tier: 'basic' }),
        subscription: this.createMockSubscription({
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后到期
        }),
        permissions: this.createMockPermissions('basic'),
      },

      // 配额用完用户场景
      quotaExceededUser: {
        user: this.createMockUser({ tier: 'free' }),
        subscription: this.createMockSubscription({ tier: 'free' }),
        quotaUsage: this.createMockQuotaUsage('create', 3, 3), // 已用完
      },

      // 支付失败场景
      paymentFailedScenario: {
        paymentRecord: this.createMockPaymentRecord({
          status: 'failed',
          errorMessage: '支付超时',
        }),
      },

      // 升级场景
      upgradeScenario: {
        currentSubscription: this.createMockSubscription({ tier: 'basic' }),
        targetPlan: this.createMockPlan('pro'),
        upgradeCost: 130, // 199 - 69
      },
    };
  }
}

/**
 * Mock服务工厂
 */
export class MockServiceFactory {
  /**
   * 创建模拟订阅服务
   */
  static createMockSubscriptionService() {
    return {
      getCurrentSubscription: jest.fn(),
      createSubscription: jest.fn(),
      updateSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      upgradeSubscription: jest.fn(),
      getSubscriptionHistory: jest.fn(),
    };
  }

  /**
   * 创建模拟支付服务
   */
  static createMockPaymentService() {
    return {
      createPayment: jest.fn(),
      updatePaymentStatus: jest.fn(),
      checkPaymentStatus: jest.fn(),
      cancelPayment: jest.fn(),
      retryPayment: jest.fn(),
      getPaymentStatistics: jest.fn(),
    };
  }

  /**
   * 创建模拟套餐服务
   */
  static createMockPlanService() {
    return {
      queryPlans: jest.fn(),
      getPlanById: jest.fn(),
      getRecommendedPlans: jest.fn(),
      comparePlans: jest.fn(),
      getPlanStatistics: jest.fn(),
    };
  }

  /**
   * 创建模拟权限中间件
   */
  static createMockPermissionMiddleware() {
    return {
      checkPermission: jest.fn(),
      consumeQuota: jest.fn(),
      getUserPermissions: jest.fn(),
    };
  }

  /**
   * 创建模拟通知服务
   */
  static createMockNotificationService() {
    return {
      sendNotification: jest.fn(),
      getUserNotifications: jest.fn(),
      markNotificationAsRead: jest.fn(),
      sendPaymentSuccessNotification: jest.fn(),
      sendQuotaExceededNotification: jest.fn(),
    };
  }
}

export default TestDataFactory;
