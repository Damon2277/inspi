import { startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';

import { UserSubscription, UsageStats, SubscriptionStatus, IUserSubscription, IUsageStats } from '@/models/subscription';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  quotaType: 'daily' | 'monthly';
  remaining: number;
  limit: number;
  subscription?: IUserSubscription | null;
}

export class QuotaService {
  private static readonly DAILY_FREE_QUOTA = 3;
  private static readonly MONTHLY_SUBSCRIPTION_QUOTA = 300;

  /**
   * 检查并消费额度
   */
  static async checkAndConsume(userId: string): Promise<QuotaCheckResult> {
    try {
      // 1. 获取用户订阅状态
      const subscription = await this.getUserSubscription(userId);

      // 2. 获取或创建今日使用统计
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      let usageStats = await UsageStats.findOne({
        userId,
        date: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      });

      if (!usageStats) {
        usageStats = await UsageStats.create({
          userId,
          date: today,
          dailyUsage: 0,
          monthlyUsage: 0,
          lastResetDate: today,
        });
      }

      // 3. 判断额度逻辑
      if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
        // 订阅用户逻辑
        if (subscription.monthlyQuotaRemaining > 0) {
          await this.consumeMonthlyQuota(subscription, usageStats);

          return {
            allowed: true,
            quotaType: 'monthly',
            remaining: subscription.monthlyQuotaRemaining,
            limit: this.MONTHLY_SUBSCRIPTION_QUOTA,
            subscription,
          };
        } else {
          return {
            allowed: false,
            reason: '本月额度已用尽，请等待下个计费周期',
            quotaType: 'monthly',
            remaining: 0,
            limit: this.MONTHLY_SUBSCRIPTION_QUOTA,
            subscription,
          };
        }
      } else {
        // 免费用户逻辑
        if (usageStats.dailyUsage < this.DAILY_FREE_QUOTA) {
          await this.consumeDailyQuota(usageStats);

          return {
            allowed: true,
            quotaType: 'daily',
            remaining: Math.max(0, this.DAILY_FREE_QUOTA - usageStats.dailyUsage),
            limit: this.DAILY_FREE_QUOTA,
            subscription: null,
          };
        } else {
          return {
            allowed: false,
            reason: '今日免费额度已用尽，升级订阅获取更多额度',
            quotaType: 'daily',
            remaining: 0,
            limit: this.DAILY_FREE_QUOTA,
            subscription: null,
          };
        }
      }
    } catch (error) {
      console.error('QuotaService.checkAndConsume error:', error);
      throw error;
    }
  }

  /**
   * 获取用户额度状态（不消费）
   */
  static async getQuotaStatus(userId: string) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      let usageStats = await UsageStats.findOne({
        userId,
        date: {
          $gte: todayStart,
          $lte: todayEnd,
        },
      });

      if (!usageStats) {
        usageStats = await UsageStats.create({
          userId,
          date: today,
          dailyUsage: 0,
          monthlyUsage: 0,
          lastResetDate: today,
        });
      }

      if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
        return {
          status: 'subscribed',
          subscription: {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            nextBillingAt: subscription.nextBillingAt,
            autoRenew: subscription.autoRenew,
          },
          quota: {
            type: 'monthly',
            used: subscription.monthlyQuotaUsed,
            remaining: subscription.monthlyQuotaRemaining,
            total: subscription.monthlyQuotaTotal,
          },
          dailyUsage: usageStats.dailyUsage,
          dailyQuota: this.DAILY_FREE_QUOTA,
        };
      } else {
        return {
          status: 'free',
          subscription: subscription ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          } : null,
          quota: {
            type: 'daily',
            used: usageStats.dailyUsage,
            remaining: Math.max(0, this.DAILY_FREE_QUOTA - usageStats.dailyUsage),
            total: this.DAILY_FREE_QUOTA,
          },
          dailyUsage: usageStats.dailyUsage,
          dailyQuota: this.DAILY_FREE_QUOTA,
        };
      }
    } catch (error) {
      console.error('QuotaService.getQuotaStatus error:', error);
      throw error;
    }
  }

  /**
   * 获取有效的订阅
   */
  private static async getUserSubscription(userId: string): Promise<IUserSubscription | null> {
    const subscription = await UserSubscription.findOne({ userId });

    if (!subscription) {
      return null;
    }

    // 检查订阅是否过期
    const now = new Date();

    // 宽限期内仍然算作有效
    if (subscription.status === SubscriptionStatus.GRACE_PERIOD) {
      if (subscription.gracePeriodEnd && isAfter(now, subscription.gracePeriodEnd)) {
        // 宽限期已过，更新为过期状态
        subscription.status = SubscriptionStatus.EXPIRED;
        subscription.monthlyQuotaRemaining = 0;
        await subscription.save();
        return null;
      }
      // 宽限期内仍然有效
      return subscription;
    }

    // 检查正常订阅是否过期
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      if (isAfter(now, subscription.currentPeriodEnd)) {
        // 订阅已过期
        subscription.status = SubscriptionStatus.EXPIRED;
        subscription.monthlyQuotaRemaining = 0;
        await subscription.save();
        return null;
      }
      return subscription;
    }

    // 已取消或过期的订阅
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      // 已取消但在当前周期内仍有效
      if (isBefore(now, subscription.currentPeriodEnd)) {
        return subscription;
      }
      // 周期结束，转为过期
      subscription.status = SubscriptionStatus.EXPIRED;
      subscription.monthlyQuotaRemaining = 0;
      await subscription.save();
      return null;
    }

    return null;
  }

  /**
   * 消费月度额度
   */
  private static async consumeMonthlyQuota(subscription: IUserSubscription, usageStats: IUsageStats) {
    subscription.monthlyQuotaUsed += 1;
    subscription.monthlyQuotaRemaining = Math.max(0, subscription.monthlyQuotaRemaining - 1);
    await subscription.save();

    usageStats.monthlyUsage += 1;
    await usageStats.save();
  }

  /**
   * 消费每日额度
   */
  private static async consumeDailyQuota(usageStats: IUsageStats) {
    usageStats.dailyUsage += 1;
    await usageStats.save();
  }

  /**
   * 重置每日额度（定时任务调用）
   */
  static async resetDailyQuotas() {
    try {
      const today = new Date();
      const todayStart = startOfDay(today);

      await UsageStats.updateMany(
        {
          lastResetDate: { $lt: todayStart },
        },
        {
          $set: {
            dailyUsage: 0,
            lastResetDate: today,
          },
        },
      );

      console.log('Daily quotas reset successfully');
    } catch (error) {
      console.error('QuotaService.resetDailyQuotas error:', error);
      throw error;
    }
  }

  /**
   * 创建新订阅
   */
  static async createSubscription(userId: string, startDate: Date = new Date()): Promise<IUserSubscription> {
    try {
      // 检查是否已有订阅
      const existing = await UserSubscription.findOne({ userId });
      if (existing && existing.status === SubscriptionStatus.ACTIVE) {
        throw new Error('User already has an active subscription');
      }

      // 计算周期
      const currentPeriodStart = startDate;
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const nextBillingAt = new Date(currentPeriodEnd);
      nextBillingAt.setDate(nextBillingAt.getDate() - 1); // 提前1天扣款

      // 创建或更新订阅
      const subscription = await UserSubscription.findOneAndUpdate(
        { userId },
        {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart,
          currentPeriodEnd,
          nextBillingAt,
          monthlyQuotaTotal: this.MONTHLY_SUBSCRIPTION_QUOTA,
          monthlyQuotaUsed: 0,
          monthlyQuotaRemaining: this.MONTHLY_SUBSCRIPTION_QUOTA,
          autoRenew: true,
          gracePeriodEnd: undefined,
        },
        {
          new: true,
          upsert: true,
        },
      );

      return subscription;
    } catch (error) {
      console.error('QuotaService.createSubscription error:', error);
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  static async cancelSubscription(userId: string): Promise<IUserSubscription | null> {
    try {
      const subscription = await UserSubscription.findOne({ userId });

      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new Error('No active subscription found');
      }

      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.autoRenew = false;
      await subscription.save();

      return subscription;
    } catch (error) {
      console.error('QuotaService.cancelSubscription error:', error);
      throw error;
    }
  }

  /**
   * 进入宽限期
   */
  static async enterGracePeriod(userId: string, graceDays: number = 3): Promise<IUserSubscription | null> {
    try {
      const subscription = await UserSubscription.findOne({ userId });

      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
        return null;
      }

      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + graceDays);

      subscription.status = SubscriptionStatus.GRACE_PERIOD;
      subscription.gracePeriodEnd = gracePeriodEnd;
      await subscription.save();

      return subscription;
    } catch (error) {
      console.error('QuotaService.enterGracePeriod error:', error);
      throw error;
    }
  }

  /**
   * 续费订阅
   */
  static async renewSubscription(userId: string): Promise<IUserSubscription | null> {
    try {
      const subscription = await UserSubscription.findOne({ userId });

      if (!subscription) {
        return null;
      }

      // 计算新周期
      const currentPeriodStart = new Date(subscription.currentPeriodEnd);
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const nextBillingAt = new Date(currentPeriodEnd);
      nextBillingAt.setDate(nextBillingAt.getDate() - 1);

      // 重置额度并更新周期
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.currentPeriodStart = currentPeriodStart;
      subscription.currentPeriodEnd = currentPeriodEnd;
      subscription.nextBillingAt = nextBillingAt;
      subscription.monthlyQuotaUsed = 0;
      subscription.monthlyQuotaRemaining = this.MONTHLY_SUBSCRIPTION_QUOTA;
      subscription.gracePeriodEnd = undefined;

      await subscription.save();

      return subscription;
    } catch (error) {
      console.error('QuotaService.renewSubscription error:', error);
      throw error;
    }
  }
}
