/**
 * 订阅服务层
 * 处理订阅相关的业务逻辑
 */

import mongoose from 'mongoose';
import { Subscription, Usage, Payment } from '../models';
import type { SubscriptionDocument, UsageDocument, PaymentDocument } from '../models';
import { 
  ISubscription, 
  IUsage, 
  IPayment,
  SubscriptionPlan, 
  SubscriptionStatus,
  PaymentMethod,
  PLAN_LIMITS,
  PLAN_CONFIGS,
  SubscriptionError,
  UsageLimitError
} from '../../types/subscription';
import { getRedisClient } from '../redis';

/**
 * 订阅服务类
 */
export class SubscriptionService {
  private static redis = getRedisClient();

  /**
   * 获取用户的活跃订阅
   */
  static async getActiveSubscription(userId: string): Promise<SubscriptionDocument | null> {
    // 先从缓存获取
    const cacheKey = `subscription:${userId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      // 检查是否过期
      if (new Date(data.endDate) > new Date()) {
        return data;
      }
      // 过期则删除缓存
      await this.redis.del(cacheKey);
    }

    // 从数据库获取
    const subscription = await Subscription.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      endDate: { $gt: new Date() }
    });

    if (subscription) {
      // 缓存1小时
      await this.redis.setex(cacheKey, 3600, JSON.stringify(subscription));
    }

    return subscription;
  }

  /**
   * 创建新订阅
   */
  static async createSubscription(
    userId: string,
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    paymentMethod: PaymentMethod = 'wechat'
  ): Promise<SubscriptionDocument> {
    // 检查是否已有活跃订阅
    const existingSubscription = await this.getActiveSubscription(userId);
    if (existingSubscription && existingSubscription.plan !== 'free') {
      throw new SubscriptionError(
        '用户已有活跃订阅，请先取消当前订阅',
        'ACTIVE_SUBSCRIPTION_EXISTS'
      );
    }

    // 计算订阅时间
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan === 'free') {
      // 免费版永不过期
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
    }

    // 如果有现有订阅，先取消
    if (existingSubscription) {
      await this.cancelSubscription(userId);
    }

    // 创建新订阅
    const subscription = new Subscription({
      userId: new mongoose.Types.ObjectId(userId),
      plan,
      status: 'active' as SubscriptionStatus,
      startDate,
      endDate,
      autoRenew: false,
      paymentMethod
    });

    await subscription.save();

    // 清除缓存
    await this.redis.del(`subscription:${userId}`);

    return subscription;
  }

  /**
   * 获取用户今日使用情况
   */
  static async getTodayUsage(userId: string): Promise<UsageDocument> {
    const today = new Date().toISOString().split('T')[0];
    const subscription = await this.getActiveSubscription(userId);
    const plan = subscription?.plan || 'free';
    const limits = PLAN_LIMITS[plan];

    // 先从缓存获取
    const cacheKey = `usage:${userId}:${today}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // 从数据库获取或创建
    let usage = await Usage.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: today
    });

    if (!usage) {
      usage = new Usage({
        userId: new mongoose.Types.ObjectId(userId),
        date: today,
        generations: 0,
        reuses: 0,
        limits: {
          maxGenerations: limits.dailyGenerations,
          maxReuses: limits.dailyReuses
        }
      });
      await usage.save();
    } else {
      // 更新限制（可能用户升级了订阅）
      usage.limits = {
        maxGenerations: limits.dailyGenerations,
        maxReuses: limits.dailyReuses
      };
      await usage.save();
    }

    // 缓存10分钟
    await this.redis.setex(cacheKey, 600, JSON.stringify(usage));

    return usage;
  }

  /**
   * 检查使用限制
   */
  static async checkUsageLimit(
    userId: string,
    type: 'generation' | 'reuse'
  ): Promise<{ allowed: boolean; current: number; limit: number; plan: SubscriptionPlan }> {
    const usage = await this.getTodayUsage(userId);
    const subscription = await this.getActiveSubscription(userId);
    const plan = subscription?.plan || 'free';

    const current = type === 'generation' ? usage.generations : usage.reuses;
    const limit = type === 'generation' ? usage.limits.maxGenerations : usage.limits.maxReuses;

    return {
      allowed: current < limit,
      current,
      limit,
      plan
    };
  }

  /**
   * 记录使用
   */
  static async recordUsage(
    userId: string,
    type: 'generation' | 'reuse',
    count: number = 1
  ): Promise<UsageDocument> {
    const usage = await this.getTodayUsage(userId);
    
    if (type === 'generation') {
      if (usage.generations + count > usage.limits.maxGenerations) {
        throw new UsageLimitError(
          usage.generations,
          usage.limits.maxGenerations,
          (await this.getActiveSubscription(userId))?.plan || 'free'
        );
      }
      usage.generations += count;
    } else {
      if (usage.reuses + count > usage.limits.maxReuses) {
        throw new UsageLimitError(
          usage.reuses,
          usage.limits.maxReuses,
          (await this.getActiveSubscription(userId))?.plan || 'free'
        );
      }
      usage.reuses += count;
    }

    await usage.save();

    // 更新缓存
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `usage:${userId}:${today}`;
    await this.redis.setex(cacheKey, 600, JSON.stringify(usage));

    return usage;
  }

  /**
   * 取消订阅
   */
  static async cancelSubscription(userId: string): Promise<SubscriptionDocument> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription) {
      throw new SubscriptionError(
        '没有找到活跃的订阅',
        'SUBSCRIPTION_NOT_FOUND'
      );
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    await subscription.save();

    // 清除缓存
    await this.redis.del(`subscription:${userId}`);

    return subscription;
  }

  /**
   * 处理订阅到期
   */
  static async processExpiredSubscriptions(): Promise<number> {
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $lte: new Date() },
      autoRenew: false
    });

    let processedCount = 0;
    
    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      await subscription.save();
      
      // 清除缓存
      await this.redis.del(`subscription:${subscription.userId}`);
      
      processedCount++;
    }

    return processedCount;
  }
}

export default SubscriptionService;