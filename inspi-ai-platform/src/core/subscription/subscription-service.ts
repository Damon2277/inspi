/**
 * 订阅管理服务
 * 处理订阅的创建、更新、取消等核心业务逻辑
 */

import {
  Subscription,
  SubscriptionPlan,
  PaymentRecord,
  SubscriptionUsage,
  UserTier,
  SubscriptionStatus,
  PaymentStatus,
  CreatePlanRequest,
} from '@/shared/types/subscription';

import { DEFAULT_PLANS } from './constants';
import { validatePlanData, validateSubscriptionData } from './validators';

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  paymentMethod: 'wechat_pay';
  billingCycle: 'monthly' | 'yearly';
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  status?: SubscriptionStatus;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionServiceOptions {
  enableAutoRenewal?: boolean;
  enableProration?: boolean;
  gracePeriodDays?: number;
}

/**
 * 订阅管理服务类
 */
export class SubscriptionService {
  private options: SubscriptionServiceOptions;

  constructor(options: SubscriptionServiceOptions = {}) {
    this.options = {
      enableAutoRenewal: true,
      enableProration: true,
      gracePeriodDays: 3,
      ...options,
    };
  }

  /**
   * 获取用户当前订阅
   */
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    try {
      const response = await fetch(`/api/subscription/current?userId=${userId}`);
      if (response.ok) {
        const result = await response.json();
        return result.subscription || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current subscription:', error);
      return null;
    }
  }

  /**
   * 获取所有可用套餐
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await fetch('/api/subscription/plans');
      if (response.ok) {
        const result = await response.json();
        return result.plans || DEFAULT_PLANS;
      }
      return DEFAULT_PLANS;
    } catch (error) {
      console.error('Failed to get available plans:', error);
      return DEFAULT_PLANS;
    }
  }

  /**
   * 根据等级获取套餐
   */
  async getPlanByTier(tier: UserTier): Promise<SubscriptionPlan | null> {
    const plans = await this.getAvailablePlans();
    return (plans.find as any)(plan => plan.tier === tier) || null;
  }

  /**
   * 创建新订阅
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<{
    subscription: Subscription;
    paymentInfo: any;
  }> {
    // 验证请求数据
    if (!request.userId || !request.planId) {
      throw new Error('用户ID和套餐ID不能为空');
    }

    // 获取套餐信息
    const plans = await this.getAvailablePlans();
    const plan = (plans.find as any)(p => p.id === request.planId);
    if (!plan) {
      throw new Error('套餐不存在');
    }

    // 检查用户是否已有活跃订阅
    const existingSubscription = await this.getCurrentSubscription(request.userId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('用户已有活跃订阅，请先取消现有订阅');
    }

    // 计算订阅时间
    const startDate = new Date();
    const endDate = new Date();
    if (request.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // 创建订阅对象
    const subscription: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      planId: request.planId,
      planName: plan.displayName,
      tier: plan.tier,
      status: 'pending',
      monthlyPrice: plan.monthlyPrice,
      currency: 'CNY',
      startDate,
      endDate,
      nextBillingDate: endDate,
      paymentMethod: request.paymentMethod,
      quotas: { ...plan.quotas },
      features: [...plan.features],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 验证订阅数据
    const validation = validateSubscriptionData(subscription);
    if (!validation.isValid) {
      throw new Error(`订阅数据验证失败: ${validation.errors.join(', ')}`);
    }

    try {
      // 调用API创建订阅
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, billingCycle: request.billingCycle }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建订阅失败');
      }

      const result = await response.json();
      return {
        subscription: result.subscription,
        paymentInfo: result.paymentInfo,
      };
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * 更新订阅
   */
  async updateSubscription(
    subscriptionId: string,
    updates: UpdateSubscriptionRequest,
  ): Promise<Subscription> {
    if (!subscriptionId) {
      throw new Error('订阅ID不能为空');
    }

    try {
      const response = await fetch(`/api/subscription/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新订阅失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
    immediate: boolean = false,
  ): Promise<Subscription> {
    if (!subscriptionId) {
      throw new Error('订阅ID不能为空');
    }

    const cancelDate = immediate ? new Date() : undefined;

    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          immediate,
          cancelDate: cancelDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '取消订阅失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * 升级订阅
   */
  async upgradeSubscription(
    subscriptionId: string,
    newPlanId: string,
    prorationMode: 'immediate' | 'next_cycle' = 'immediate',
  ): Promise<{
    subscription: Subscription;
    paymentInfo?: any;
    prorationAmount?: number;
  }> {
    if (!subscriptionId || !newPlanId) {
      throw new Error('订阅ID和新套餐ID不能为空');
    }

    // 获取当前订阅
    const currentSubscription = await this.getSubscriptionById(subscriptionId);
    if (!currentSubscription) {
      throw new Error('订阅不存在');
    }

    // 获取新套餐信息
    const plans = await this.getAvailablePlans();
    const newPlan = (plans.find as any)(p => p.id === newPlanId);
    if (!newPlan) {
      throw new Error('新套餐不存在');
    }

    // 检查是否为升级（价格更高）
    const currentPlan = (plans.find as any)(p => p.id === currentSubscription.planId);
    if (!currentPlan) {
      throw new Error('当前套餐信息不存在');
    }

    if (newPlan.monthlyPrice <= currentPlan.monthlyPrice) {
      throw new Error('只能升级到更高价格的套餐');
    }

    // 计算按比例退费金额
    let prorationAmount = 0;
    if (this.options.enableProration && prorationMode === 'immediate') {
      prorationAmount = this.calculateProrationAmount(
        currentSubscription,
        currentPlan,
        newPlan,
      );
    }

    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlanId,
          prorationMode,
          prorationAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '升级订阅失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      throw error;
    }
  }

  /**
   * 降级订阅
   */
  async downgradeSubscription(
    subscriptionId: string,
    newPlanId: string,
    effectiveDate: 'immediate' | 'next_cycle' = 'next_cycle',
  ): Promise<Subscription> {
    if (!subscriptionId || !newPlanId) {
      throw new Error('订阅ID和新套餐ID不能为空');
    }

    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/downgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlanId,
          effectiveDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '降级订阅失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to downgrade subscription:', error);
      throw error;
    }
  }

  /**
   * 恢复已取消的订阅
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    if (!subscriptionId) {
      throw new Error('订阅ID不能为空');
    }

    try {
      const response = await fetch(`/api/subscription/${subscriptionId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '恢复订阅失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }

  /**
   * 获取订阅详情
   */
  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
      const response = await fetch(`/api/subscription/${subscriptionId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * 获取用户订阅历史
   */
  async getSubscriptionHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{
    subscriptions: Subscription[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const response = await fetch(
        `/api/subscription/history?userId=${userId}&limit=${limit}&offset=${offset}`,
      );

      if (response.ok) {
        return await response.json();
      }

      return { subscriptions: [], total: 0, hasMore: false };
    } catch (error) {
      console.error('Failed to get subscription history:', error);
      return { subscriptions: [], total: 0, hasMore: false };
    }
  }

  /**
   * 获取支付记录
   */
  async getPaymentHistory(
    subscriptionId: string,
    limit: number = 10,
  ): Promise<PaymentRecord[]> {
    try {
      const response = await fetch(
        `/api/subscription/${subscriptionId}/payments?limit=${limit}`,
      );

      if (response.ok) {
        const result = await response.json();
        return result.payments || [];
      }

      return [];
    } catch (error) {
      console.error('Failed to get payment history:', error);
      return [];
    }
  }

  /**
   * 获取使用统计
   */
  async getUsageStatistics(
    subscriptionId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SubscriptionUsage[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await fetch(
        `/api/subscription/${subscriptionId}/usage?${params.toString()}`,
      );

      if (response.ok) {
        const result = await response.json();
        return result.usage || [];
      }

      return [];
    } catch (error) {
      console.error('Failed to get usage statistics:', error);
      return [];
    }
  }

  /**
   * 检查订阅状态
   */
  async checkSubscriptionStatus(subscriptionId: string): Promise<{
    isActive: boolean;
    isExpired: boolean;
    daysUntilExpiry: number;
    needsRenewal: boolean;
  }> {
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (!subscription) {
      return {
        isActive: false,
        isExpired: true,
        daysUntilExpiry: 0,
        needsRenewal: false,
      };
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const isActive = subscription.status === 'active' && endDate > now;
    const isExpired = endDate <= now;
    const needsRenewal = daysUntilExpiry <= (this.options.gracePeriodDays || 3) && isActive;

    return {
      isActive,
      isExpired,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      needsRenewal,
    };
  }

  /**
   * 计算按比例退费金额
   */
  private calculateProrationAmount(
    subscription: Subscription,
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
  ): number {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const totalDays = Math.ceil((endDate.getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) return 0;

    // 计算剩余时间的价值
    const remainingValue = (currentPlan.monthlyPrice * remainingDays) / totalDays;
    const newPlanValue = (newPlan.monthlyPrice * remainingDays) / totalDays;

    return Math.max(0, newPlanValue - remainingValue);
  }

  /**
   * 创建套餐
   */
  async createPlan(planData: CreatePlanRequest): Promise<SubscriptionPlan> {
    const validation = validatePlanData(planData);
    if (!validation.isValid) {
      throw new Error(`套餐数据验证失败: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await fetch('/api/subscription/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '创建套餐失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create plan:', error);
      throw error;
    }
  }

  /**
   * 更新套餐
   */
  async updatePlan(planId: string, updates: Partial<CreatePlanRequest>): Promise<SubscriptionPlan> {
    try {
      const response = await fetch(`/api/subscription/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新套餐失败');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update plan:', error);
      throw error;
    }
  }

  /**
   * 获取订阅分析数据
   */
  async getSubscriptionAnalytics(userId: string): Promise<{
    totalSpent: number;
    monthsSubscribed: number;
    averageMonthlySpend: number;
    upgradeHistory: Array<{
      date: Date;
      fromPlan: string;
      toPlan: string;
      reason?: string;
    }>;
    usageTrends: Array<{
      month: string;
      usage: Record<string, number>;
    }>;
  }> {
    try {
      const response = await fetch(`/api/subscription/analytics?userId=${userId}`);

      if (response.ok) {
        return await response.json();
      }

      return {
        totalSpent: 0,
        monthsSubscribed: 0,
        averageMonthlySpend: 0,
        upgradeHistory: [],
        usageTrends: [],
      };
    } catch (error) {
      console.error('Failed to get subscription analytics:', error);
      return {
        totalSpent: 0,
        monthsSubscribed: 0,
        averageMonthlySpend: 0,
        upgradeHistory: [],
        usageTrends: [],
      };
    }
  }
}

// 默认实例
export const subscriptionService = new SubscriptionService();
