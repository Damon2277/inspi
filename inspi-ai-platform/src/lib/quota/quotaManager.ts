/**
 * 配额管理系统
 * 管理用户的AI生成配额和限制
 */

import { redis } from '@/lib/cache/redis';
import { logger } from '@/shared/utils/logger';

export interface UserQuota {
  userId: string;
  plan: 'free' | 'pro' | 'super';
  dailyLimit: number;
  currentUsage: number;
  remaining: number;
  resetTime: Date;
}

export interface QuotaLimits {
  free: number;
  pro: number;
  super: number;
}

export class QuotaManager {
  private quotaLimits: QuotaLimits = {
    free: 10,
    pro: 100,
    super: 1000,
  };

  // 内存优化：缓存今天的日期键，避免重复计算
  private todayKey: string = '';
  private todayKeyDate: string = '';

  // 内存优化：复用对象，减少垃圾回收压力
  private reusableQuota: UserQuota = {
    userId: '',
    plan: 'free',
    dailyLimit: 0,
    currentUsage: 0,
    remaining: 0,
    resetTime: new Date(),
  };

  /**
   * 检查用户配额
   */
  async checkQuota(userId: string, plan: 'free' | 'pro' | 'super' = 'free'): Promise<UserQuota> {
    try {
      const today = this.getTodayKeyCached();
      const quotaKey = `quota:${userId}:${today}`;

      // 获取当前使用量
      const currentUsage = await redis.get(quotaKey) || '0';
      const usage = parseInt(currentUsage, 10);

      const dailyLimit = this.quotaLimits[plan];
      const remaining = Math.max(0, dailyLimit - usage);

      // 复用对象，减少内存分配
      this.reusableQuota.userId = userId;
      this.reusableQuota.plan = plan;
      this.reusableQuota.dailyLimit = dailyLimit;
      this.reusableQuota.currentUsage = usage;
      this.reusableQuota.remaining = remaining;
      this.reusableQuota.resetTime = this.getNextMidnight();

      // 返回对象的副本
      return { ...this.reusableQuota };
    } catch (error) {
      logger.error('Failed to check quota', {
        userId,
        plan,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 返回默认配额信息
      return {
        userId,
        plan,
        dailyLimit: this.quotaLimits[plan],
        currentUsage: 0,
        remaining: this.quotaLimits[plan],
        resetTime: this.getNextMidnight(),
      };
    }
  }

  /**
   * 消费配额
   */
  async consumeQuota(userId: string, plan: 'free' | 'pro' | 'super' = 'free', amount = 1): Promise<boolean> {
    try {
      const quota = await this.checkQuota(userId, plan);

      if (quota.remaining < amount) {
        logger.warn('Quota exceeded', {
          userId,
          plan,
          requested: amount,
          remaining: quota.remaining,
        });
        return false;
      }

      // 增加使用量
      const today = this.getTodayKeyCached();
      const quotaKey = `quota:${userId}:${today}`;

      await redis.increment(quotaKey, {
        ttl: this.getSecondsUntilMidnightCached(),
      });

      logger.info('Quota consumed', {
        userId,
        plan,
        amount,
        newUsage: quota.currentUsage + amount,
      });

      return true;
    } catch (error) {
      logger.error('Failed to consume quota', {
        userId,
        plan,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * 重置用户配额（管理员功能）
   */
  async resetQuota(userId: string): Promise<void> {
    try {
      const today = this.getTodayKeyCached();
      const quotaKey = `quota:${userId}:${today}`;

      await redis.del(quotaKey);

      logger.info('Quota reset', { userId });
    } catch (error) {
      logger.error('Failed to reset quota', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取配额统计信息
   */
  async getQuotaStats(userId: string, plan: 'free' | 'pro' | 'super' = 'free'): Promise<{
    today: UserQuota;
    history: Array<{ date: string; usage: number }>;
  }> {
    try {
      const today = await this.checkQuota(userId, plan);

      // 获取最近7天的使用历史
      const history = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = this.getDateKey(date);
        const quotaKey = `quota:${userId}:${dateKey}`;

        const usage = await redis.get(quotaKey) || '0';
        history.push({
          date: dateKey,
          usage: parseInt(usage, 10),
        });
      }

      return { today, history };
    } catch (error) {
      logger.error('Failed to get quota stats', {
        userId,
        plan,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        today: await this.checkQuota(userId, plan),
        history: [],
      };
    }
  }

  /**
   * 更新配额限制（管理员功能）
   */
  updateQuotaLimits(limits: Partial<QuotaLimits>): void {
    this.quotaLimits = { ...this.quotaLimits, ...limits };
    logger.info('Quota limits updated', { newLimits: this.quotaLimits });
  }

  /**
   * 获取当前配额限制
   */
  getQuotaLimits(): QuotaLimits {
    return { ...this.quotaLimits };
  }

  /**
   * 获取今天的键（缓存版本）
   */
  private getTodayKeyCached(): string {
    const currentDate = new Date().toISOString().split('T')[0];
    if (this.todayKeyDate !== currentDate) {
      this.todayKeyDate = currentDate;
      this.todayKey = currentDate;
    }
    return this.todayKey;
  }

  /**
   * 获取日期键
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // 缓存午夜时间计算
  private midnightCache: { date: string; seconds: number; midnight: Date } | null = null;

  /**
   * 获取到午夜的秒数（缓存版本）
   */
  private getSecondsUntilMidnightCached(): number {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];

    if (!this.midnightCache || this.midnightCache.date !== currentDate) {
      const midnight = new Date();
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);

      this.midnightCache = {
        date: currentDate,
        seconds: Math.floor((midnight.getTime() - now.getTime()) / 1000),
        midnight,
      };
    }

    return Math.max(0, Math.floor((this.midnightCache.midnight.getTime() - now.getTime()) / 1000));
  }

  /**
   * 获取下一个午夜时间
   */
  private getNextMidnight(): Date {
    if (this.midnightCache) {
      return new Date(this.midnightCache.midnight);
    }

    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    return midnight;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testUserId = 'health_check_user';
      const quota = await this.checkQuota(testUserId, 'free');
      return quota.userId === testUserId;
    } catch (error) {
      logger.error('Quota manager health check failed', { error });
      return false;
    }
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      quotaLimits: this.quotaLimits,
      cacheReady: redis.isReady(),
    };
  }
}

// 单例实例
export const quotaManager = new QuotaManager();
