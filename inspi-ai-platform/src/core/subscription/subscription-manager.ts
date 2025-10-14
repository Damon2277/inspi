/**
 * 订阅套餐管理系统
 * 处理订阅计划、升级降级、状态管理等核心功能
 */
import mongoose from 'mongoose';

import User from '@/lib/models/User';
import {
  Subscription,
  SubscriptionPlan,
  UserTier,
  SubscriptionStatus,
  CreatePlanRequest,
  PLAN_CONFIGS,
  PLAN_LIMITS,
  QuotaLimits,
} from '@/shared/types/subscription';
import { logger } from '@/shared/utils/logger';

export interface SubscriptionManagerOptions {
  enableAutoRenewal: boolean
  enableProration: boolean
  gracePeriodDays: number
  trialPeriodDays: number
}

export interface CreateSubscriptionRequest {
  userId: string
  planId: string
  billingCycle: 'monthly' | 'yearly'
  paymentMethod: 'wechat_pay'
  couponCode?: string
}

export interface UpgradeRequest {
  subscriptionId: string
  newPlanId: string
  effectiveDate?: 'immediate' | 'next_cycle'
  prorationMode?: 'immediate' | 'credit'
}

export interface SubscriptionAnalytics {
  totalRevenue: number
  activeSubscriptions: number
  churnRate: number
  averageRevenuePerUser: number
  conversionRate: number
  planDistribution: Record<string, number>
}

/**
 * 订阅管理器类
 */
export class SubscriptionManager {
  private options: SubscriptionManagerOptions;
  private defaultPlans: SubscriptionPlan[];

  constructor(options: Partial<SubscriptionManagerOptions> = {}) {
    this.options = {
      enableAutoRenewal: true,
      enableProration: true,
      gracePeriodDays: 3,
      trialPeriodDays: 7,
      ...options,
    };

    this.defaultPlans = this.initializeDefaultPlans();
  }

  /**
   * 获取所有可用套餐
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      // 从数据库获取套餐，如果没有则使用默认套餐
      const plans = await this.loadPlansFromDatabase();
      return plans.length > 0 ? plans : this.defaultPlans;
    } catch (error) {
      logger.error('Failed to get available plans', { error });
      return this.defaultPlans;
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
   * 获取套餐详情
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const plans = await this.getAvailablePlans();
    return (plans.find as any)(plan => plan.id === planId) || null;
  }

  /**
   * 创建新订阅
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<{
    subscription: Subscription
    paymentRequired: boolean
    paymentInfo?: any
  }> {
    try {
      // 验证请求
      await this.validateCreateSubscriptionRequest(request);

      // 获取套餐信息
      const plan = await this.getPlanById(request.planId);
      if (!plan) {
        throw new Error('套餐不存在');
      }

      // 检查用户是否已有活跃订阅
      const existingSubscription = await this.getCurrentSubscription(request.userId);
      if (existingSubscription && existingSubscription.status === 'active') {
        throw new Error('用户已有活跃订阅');
      }

      // 计算订阅时间和价格
      const { startDate, endDate, price } = this.calculateSubscriptionPeriod(
        plan,
        request.billingCycle,
      );

      // 创建订阅对象
      const subscription: Subscription = {
        id: this.generateSubscriptionId(),
        userId: request.userId,
        planId: request.planId,
        planName: plan.displayName,
        tier: plan.tier,
        status: plan.monthlyPrice === 0 ? 'active' : 'pending',
        monthlyPrice: plan.monthlyPrice,
        currency: plan.currency,
        startDate,
        endDate,
        nextBillingDate: endDate,
        paymentMethod: request.paymentMethod,
        quotas: { ...plan.quotas },
        features: [...plan.features],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 保存订阅
      await this.saveSubscription(subscription);

      // 更新用户等级
      await this.updateUserTier(request.userId, plan.tier);

      const paymentRequired = plan.monthlyPrice > 0;

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        userId: request.userId,
        planId: request.planId,
        paymentRequired,
      });

      return {
        subscription,
        paymentRequired,
        paymentInfo: paymentRequired ? await this.generatePaymentInfo(subscription, price) : undefined,
      };
    } catch (error) {
      logger.error('Failed to create subscription', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 升级订阅
   */
  async upgradeSubscription(request: UpgradeRequest): Promise<{
    subscription: Subscription
    prorationAmount?: number
    paymentRequired: boolean
    paymentInfo?: any
  }> {
    try {
      // 获取当前订阅
      const currentSubscription = await this.getSubscriptionById(request.subscriptionId);
      if (!currentSubscription) {
        throw new Error('订阅不存在');
      }

      // 获取新套餐
      const newPlan = await this.getPlanById(request.newPlanId);
      if (!newPlan) {
        throw new Error('新套餐不存在');
      }

      // 获取当前套餐
      const currentPlan = await this.getPlanById(currentSubscription.planId);
      if (!currentPlan) {
        throw new Error('当前套餐信息不存在');
      }

      // 验证升级
      if (newPlan.monthlyPrice <= currentPlan.monthlyPrice) {
        throw new Error('只能升级到更高价格的套餐');
      }

      // 计算按比例费用
      let prorationAmount = 0;
      if (this.options.enableProration && request.effectiveDate === 'immediate') {
        prorationAmount = this.calculateProrationAmount(
          currentSubscription,
          currentPlan,
          newPlan,
        );
      }

      // 更新订阅
      const updatedSubscription: Subscription = {
        ...currentSubscription,
        planId: newPlan.id,
        planName: newPlan.displayName,
        tier: newPlan.tier,
        monthlyPrice: newPlan.monthlyPrice,
        quotas: { ...newPlan.quotas },
        features: [...newPlan.features],
        updatedAt: new Date(),
      };

      // 如果是立即生效，更新结束时间
      if (request.effectiveDate === 'immediate') {
        const remainingDays = this.calculateRemainingDays(currentSubscription);
        updatedSubscription.endDate = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);
      }

      // 保存更新
      await this.saveSubscription(updatedSubscription);

      // 更新用户等级
      await this.updateUserTier(currentSubscription.userId, newPlan.tier);

      const paymentRequired = prorationAmount > 0;

      logger.info('Subscription upgraded', {
        subscriptionId: request.subscriptionId,
        fromPlan: currentPlan.id,
        toPlan: newPlan.id,
        prorationAmount,
        paymentRequired,
      });

      return {
        subscription: updatedSubscription,
        prorationAmount,
        paymentRequired,
        paymentInfo: paymentRequired ? await this.generatePaymentInfo(updatedSubscription, prorationAmount) : undefined,
      };
    } catch (error) {
      logger.error('Failed to upgrade subscription', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
    try {
      const currentSubscription = await this.getSubscriptionById(subscriptionId);
      if (!currentSubscription) {
        throw new Error('订阅不存在');
      }

      const newPlan = await this.getPlanById(newPlanId);
      if (!newPlan) {
        throw new Error('新套餐不存在');
      }

      const currentPlan = await this.getPlanById(currentSubscription.planId);
      if (!currentPlan) {
        throw new Error('当前套餐信息不存在');
      }

      // 验证降级
      if (newPlan.monthlyPrice >= currentPlan.monthlyPrice) {
        throw new Error('只能降级到更低价格的套餐');
      }

      // 创建降级计划
      const downgradePlan = {
        planId: newPlanId,
        effectiveDate: effectiveDate === 'immediate' ? new Date() : currentSubscription.endDate,
        scheduledAt: new Date(),
      };

      // 如果是立即生效，直接更新订阅
      if (effectiveDate === 'immediate') {
        const updatedSubscription: Subscription = {
          ...currentSubscription,
          planId: newPlan.id,
          planName: newPlan.displayName,
          tier: newPlan.tier,
          monthlyPrice: newPlan.monthlyPrice,
          quotas: { ...newPlan.quotas },
          features: [...newPlan.features],
          updatedAt: new Date(),
        };

        await this.saveSubscription(updatedSubscription);
        await this.updateUserTier(currentSubscription.userId, newPlan.tier);

        logger.info('Subscription downgraded immediately', {
          subscriptionId,
          fromPlan: currentPlan.id,
          toPlan: newPlan.id,
        });

        return updatedSubscription;
      } else {
        // 计划在下个周期降级
        const updatedSubscription: Subscription = {
          ...currentSubscription,
          metadata: {
            ...currentSubscription.metadata,
            downgradePlan,
          },
          updatedAt: new Date(),
        };

        await this.saveSubscription(updatedSubscription);

        logger.info('Subscription downgrade scheduled', {
          subscriptionId,
          fromPlan: currentPlan.id,
          toPlan: newPlan.id,
          effectiveDate: downgradePlan.effectiveDate,
        });

        return updatedSubscription;
      }
    } catch (error) {
      logger.error('Failed to downgrade subscription', {
        subscriptionId,
        newPlanId,
        effectiveDate,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('订阅不存在');
      }

      const cancelDate = immediate ? new Date() : subscription.endDate;

      const updatedSubscription: Subscription = {
        ...subscription,
        status: immediate ? 'cancelled' : 'active',
        cancelledAt: new Date(),
        metadata: {
          ...subscription.metadata,
          cancellationReason: reason,
          cancelDate: cancelDate.toISOString(),
        },
        updatedAt: new Date(),
      };

      // 如果立即取消，降级到免费套餐
      if (immediate) {
        const freePlan = await this.getPlanByTier('free');
        if (freePlan) {
          updatedSubscription.tier = 'free';
          await this.updateUserTier(subscription.userId, 'free');
        }
      }

      await this.saveSubscription(updatedSubscription);

      logger.info('Subscription cancelled', {
        subscriptionId,
        immediate,
        reason,
        cancelDate,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', {
        subscriptionId,
        reason,
        immediate,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 恢复订阅
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('订阅不存在');
      }

      if (subscription.status !== 'cancelled') {
        throw new Error('只能恢复已取消的订阅');
      }

      // 检查是否在宽限期内
      const now = new Date();
      const cancelDate = subscription.cancelledAt || subscription.endDate;
      const daysSinceCancellation = Math.floor((now.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceCancellation > this.options.gracePeriodDays) {
        throw new Error('超过恢复期限，请创建新订阅');
      }

      const updatedSubscription: Subscription = {
        ...subscription,
        status: 'active',
        cancelledAt: undefined,
        metadata: {
          ...subscription.metadata,
          reactivatedAt: now.toISOString(),
        },
        updatedAt: now,
      };

      await this.saveSubscription(updatedSubscription);
      await this.updateUserTier(subscription.userId, subscription.plan);

      logger.info('Subscription reactivated', { subscriptionId });

      return updatedSubscription;
    } catch (error) {
      logger.error('Failed to reactivate subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 获取用户当前订阅
   */
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    try {
      // 这里应该从数据库查询，暂时返回模拟数据
      return null;
    } catch (error) {
      logger.error('Failed to get current subscription', { userId, error });
      return null;
    }
  }

  /**
   * 获取订阅详情
   */
  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
      // 这里应该从数据库查询，暂时返回模拟数据
      return null;
    } catch (error) {
      logger.error('Failed to get subscription by id', { subscriptionId, error });
      return null;
    }
  }

  /**
   * 获取订阅分析数据
   */
  async getSubscriptionAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<SubscriptionAnalytics> {
    try {
      // 这里应该从数据库查询统计数据
      return {
        totalRevenue: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        averageRevenuePerUser: 0,
        conversionRate: 0,
        planDistribution: {},
      };
    } catch (error) {
      logger.error('Failed to get subscription analytics', { error });
      return {
        totalRevenue: 0,
        activeSubscriptions: 0,
        churnRate: 0,
        averageRevenuePerUser: 0,
        conversionRate: 0,
        planDistribution: {},
      };
    }
  }

  /**
   * 处理订阅到期
   */
  async processExpiredSubscriptions(): Promise<void> {
    try {
      // 查找即将到期的订阅
      const expiredSubscriptions = await this.findExpiredSubscriptions();

      for (const subscription of expiredSubscriptions) {
        if (this.options.enableAutoRenewal && subscription.metadata?.autoRenewal !== false) {
          // 尝试自动续费
          await this.attemptAutoRenewal(subscription);
        } else {
          // 标记为过期
          await this.markSubscriptionExpired(subscription);
        }
      }

      logger.info('Processed expired subscriptions', {
        count: expiredSubscriptions.length,
      });
    } catch (error) {
      logger.error('Failed to process expired subscriptions', { error });
    }
  }

  /**
   * 创建套餐
   */
  async createPlan(planData: CreatePlanRequest): Promise<SubscriptionPlan> {
    try {
      const extendedMetadata = planData.metadata as {
        popular?: boolean
        recommended?: boolean
        badge?: string
      } | undefined;

      const defaultQuotas = PLAN_LIMITS[planData.tier];
      const quotas: QuotaLimits = {
        dailyCreateQuota: planData.quotas?.dailyCreateQuota ?? defaultQuotas.dailyCreateQuota,
        dailyReuseQuota: planData.quotas?.dailyReuseQuota ?? defaultQuotas.dailyReuseQuota,
        maxExportsPerDay: planData.quotas?.maxExportsPerDay ?? defaultQuotas.maxExportsPerDay,
        maxGraphNodes: planData.quotas?.maxGraphNodes ?? defaultQuotas.maxGraphNodes,
      };

      const planConfig = PLAN_CONFIGS[planData.tier];
      const features = Array.isArray(planData.features)
        ? [...planData.features]
        : [...(planConfig?.features ?? [])];

      const limitations = Array.isArray(planData.limitations)
        ? [...planData.limitations]
        : [...(planConfig?.limitations ?? [])];
      const popular = extendedMetadata?.popular ?? false;
      const recommended = extendedMetadata?.recommended ?? false;
      const badge = extendedMetadata?.badge;

      const plan: SubscriptionPlan = {
        id: this.generatePlanId(),
        name: planData.name,
        displayName: planData.displayName,
        description: planData.description,
        tier: planData.tier,
        monthlyPrice: planData.monthlyPrice,
        yearlyPrice: planData.yearlyPrice,
        currency: 'CNY',
        quotas,
        features,
        limitations,
        popular,
        recommended,
        badge,
        active: true,
        status: 'active',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.savePlan(plan);

      logger.info('Plan created', { planId: plan.id, name: plan.name });

      return plan;
    } catch (error) {
      logger.error('Failed to create plan', { planData, error });
      throw error;
    }
  }

  /**
   * 私有方法 - 初始化默认套餐
   */
  private initializeDefaultPlans(): SubscriptionPlan[] {
    const plans: SubscriptionPlan[] = [];

    Object.entries(PLAN_CONFIGS).forEach(([tier, config], index) => {
      const plan: SubscriptionPlan = {
        id: `plan_${tier}`,
        name: tier,
        displayName: config.name,
        description: `${config.name}套餐`,
        tier: tier as UserTier,
        monthlyPrice: config.price,
        yearlyPrice: config.price * 10, // 年付优惠
        currency: 'CNY',
        quotas: PLAN_CONFIGS[tier as keyof typeof PLAN_CONFIGS] ? {
          dailyCreateQuota: tier === 'free' ? 3 : tier === 'basic' ? 20 : tier === 'pro' ? 100 : -1,
          dailyReuseQuota: tier === 'free' ? 1 : tier === 'basic' ? 5 : tier === 'pro' ? 50 : -1,
          maxExportsPerDay: tier === 'free' ? 10 : tier === 'basic' ? 50 : tier === 'pro' ? 200 : -1,
          maxGraphNodes: tier === 'free' ? 50 : -1,
        } : {
          dailyCreateQuota: 0,
          dailyReuseQuota: 0,
          maxExportsPerDay: 0,
          maxGraphNodes: 0,
        },
        features: config.features,
        limitations: config.limitations,
        popular: tier === 'basic',
        recommended: tier === 'pro',
        active: true,
        sortOrder: index,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      plans.push(plan);
    });

    return plans;
  }

  /**
   * 私有方法 - 验证创建订阅请求
   */
  private async validateCreateSubscriptionRequest(request: CreateSubscriptionRequest): Promise<void> {
    if (!request.userId) {
      throw new Error('用户ID不能为空');
    }

    if (!request.planId) {
      throw new Error('套餐ID不能为空');
    }

    if (!['monthly', 'yearly'].includes(request.billingCycle)) {
      throw new Error('无效的计费周期');
    }

    // 验证用户存在
    const user = await (User.findById as any)(request.userId);
    if (!user) {
      throw new Error('用户不存在');
    }
  }

  /**
   * 私有方法 - 计算订阅周期
   */
  private calculateSubscriptionPeriod(
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
  ): { startDate: Date; endDate: Date; price: number } {
    const startDate = new Date();
    const endDate = new Date();

    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      return {
        startDate,
        endDate,
        price: plan.yearlyPrice || plan.monthlyPrice * 12,
      };
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
      return {
        startDate,
        endDate,
        price: plan.monthlyPrice,
      };
    }
  }

  /**
   * 私有方法 - 计算按比例费用
   */
  private calculateProrationAmount(
    subscription: Subscription,
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
  ): number {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    if (remainingDays === 0) return 0;

    // 计算剩余时间的价值差
    const totalDays = 30; // 假设一个月30天
    const remainingValue = (currentPlan.monthlyPrice * remainingDays) / totalDays;
    const newPlanValue = (newPlan.monthlyPrice * remainingDays) / totalDays;

    return Math.max(0, newPlanValue - remainingValue);
  }

  /**
   * 私有方法 - 计算剩余天数
   */
  private calculateRemainingDays(subscription: Subscription): number {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  /**
   * 私有方法 - 生成订阅ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 私有方法 - 生成套餐ID
   */
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 私有方法 - 保存订阅（需要实现数据库操作）
   */
  private async saveSubscription(subscription: Subscription): Promise<void> {
    // 这里应该保存到数据库
    logger.info('Subscription saved', { subscriptionId: subscription.id });
  }

  /**
   * 私有方法 - 保存套餐（需要实现数据库操作）
   */
  private async savePlan(plan: SubscriptionPlan): Promise<void> {
    // 这里应该保存到数据库
    logger.info('Plan saved', { planId: plan.id });
  }

  /**
   * 私有方法 - 从数据库加载套餐
   */
  private async loadPlansFromDatabase(): Promise<SubscriptionPlan[]> {
    // 这里应该从数据库查询
    return [];
  }

  /**
   * 私有方法 - 更新用户等级
   */
  private async updateUserTier(userId: string, tier: UserTier): Promise<void> {
    try {
      await (User.findByIdAndUpdate as any)(userId, { tier });
      logger.info('User tier updated', { userId, tier });
    } catch (error) {
      logger.error('Failed to update user tier', { userId, tier, error });
    }
  }

  /**
   * 私有方法 - 生成支付信息
   */
  private async generatePaymentInfo(subscription: Subscription, amount: number): Promise<any> {
    // 这里应该调用支付服务生成支付信息
    return {
      paymentId: `pay_${Date.now()}`,
      amount,
      currency: subscription.currency,
      qrCode: 'mock_qr_code',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后过期
    };
  }

  /**
   * 私有方法 - 查找过期订阅
   */
  private async findExpiredSubscriptions(): Promise<Subscription[]> {
    // 这里应该从数据库查询即将过期的订阅
    return [];
  }

  /**
   * 私有方法 - 尝试自动续费
   */
  private async attemptAutoRenewal(subscription: Subscription): Promise<void> {
    // 这里应该实现自动续费逻辑
    logger.info('Auto renewal attempted', { subscriptionId: subscription.id });
  }

  /**
   * 私有方法 - 标记订阅过期
   */
  private async markSubscriptionExpired(subscription: Subscription): Promise<void> {
    // 这里应该更新订阅状态为过期
    logger.info('Subscription marked as expired', { subscriptionId: subscription.id });
  }
}

// 单例实例
export const subscriptionManager = new SubscriptionManager();
export default subscriptionManager;
