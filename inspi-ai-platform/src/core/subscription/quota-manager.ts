/**
 * 配额管理核心系统
 * 统一管理用户的各种配额和限制
 */
import { redis } from '@/lib/cache/redis';
import User from '@/lib/models/User';
import {
  QuotaType,
  QuotaLimits,
  UserTier,
  QuotaExceededEvent,
  PLAN_LIMITS,
} from '@/shared/types/subscription';
import { logger } from '@/shared/utils/logger';

export interface QuotaUsage {
  userId: string
  quotaType: QuotaType
  currentUsage: number
  limit: number
  resetTime: Date
  tier: UserTier
}

export interface QuotaCheckResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  tier: UserTier
  upgradeRecommended?: boolean
}

export interface QuotaConsumptionResult {
  success: boolean
  newUsage: number
  remaining: number
  error?: string
}

const QUOTA_TYPES: readonly QuotaType[] = ['create', 'reuse', 'export', 'graph_nodes'] as const;

/**
 * 配额管理器类
 */
export class QuotaManager {
  private quotaLimits: Record<UserTier, QuotaLimits> = PLAN_LIMITS;

  /**
   * 检查用户配额
   */
  async checkQuota(
    userId: string,
    quotaType: QuotaType,
    amount: number = 1,
  ): Promise<QuotaCheckResult> {
    try {
      // 获取用户信息
      const user = await (User.findById as any)(userId).select('subscriptionTier subscription');
      if (!user) {
        throw new Error('用户不存在');
      }

      const tier: UserTier = user.subscriptionTier ?? 'free';
      const limits = this.quotaLimits[tier];

      // 获取配额限制
      const limit = this.getQuotaLimit(limits, quotaType);

      // 无限制配额
      if (limit === -1) {
        return {
          allowed: true,
          remaining: -1,
          resetTime: this.getNextResetTime(),
          tier,
        };
      }

      // 获取当前使用量
      const currentUsage = await this.getCurrentUsage(userId, quotaType);
      const remaining = Math.max(0, limit - currentUsage);
      const allowed = remaining >= amount;

      // 检查是否需要推荐升级
      const upgradeRecommended = !allowed && tier !== 'pro';

      return {
        allowed,
        remaining,
        resetTime: this.getNextResetTime(),
        tier,
        upgradeRecommended,
      };
    } catch (error) {
      logger.error('Failed to check quota', {
        userId,
        quotaType,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 默认允许，避免阻塞用户
      return {
        allowed: true,
        remaining: 0,
        resetTime: this.getNextResetTime(),
        tier: 'free',
      };
    }
  }

  /**
   * 消费配额
   */
  async consumeQuota(
    userId: string,
    quotaType: QuotaType,
    amount: number = 1,
  ): Promise<QuotaConsumptionResult> {
    try {
      // 先检查配额
      const checkResult = await this.checkQuota(userId, quotaType, amount);

      if (!checkResult.allowed) {
        // 记录配额超限事件
        await this.recordQuotaExceededEvent(userId, quotaType, checkResult);

        return {
          success: false,
          newUsage: 0,
          remaining: checkResult.remaining,
          error: '配额不足',
        };
      }

      // 消费配额
      const quotaKey = this.getQuotaKey(userId, quotaType);
      const newUsage = await redis.increment(quotaKey, {
        amount,
        ttl: this.getSecondsUntilReset(),
      });

      const remaining = checkResult.remaining === -1 ? -1 : Math.max(0, checkResult.remaining - amount);

      logger.info('Quota consumed', {
        userId,
        quotaType,
        amount,
        newUsage,
        remaining,
      });

      return {
        success: true,
        newUsage,
        remaining,
      };
    } catch (error) {
      logger.error('Failed to consume quota', {
        userId,
        quotaType,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        newUsage: 0,
        remaining: 0,
        error: '配额消费失败',
      };
    }
  }

  /**
   * 获取用户所有配额状态
   */
  async getUserQuotaStatus(userId: string): Promise<{
    tier: UserTier
    quotas: Record<QuotaType, {
      current: number
      limit: number
      remaining: number
      resetTime: Date
    }>
    upgradeRecommended: boolean
  }> {
    try {
      const user = await (User.findById as any)(userId).select('subscriptionTier');
      if (!user) {
        throw new Error('用户不存在');
      }

      const tier: UserTier = user.subscriptionTier ?? 'free';
      const limits = this.quotaLimits[tier];
      const quotas = {} as Record<QuotaType, {
        current: number
        limit: number
        remaining: number
        resetTime: Date
      }>;
      let upgradeRecommended = false;

      for (const quotaType of QUOTA_TYPES) {
        const current = await this.getCurrentUsage(userId, quotaType);
        const limit = this.getQuotaLimit(limits, quotaType);
        const remaining = limit === -1 ? -1 : Math.max(0, limit - current);

        quotas[quotaType] = {
          current,
          limit,
          remaining,
          resetTime: this.getNextResetTime(),
        };

        // 如果任何配额接近用完，推荐升级
        if (limit !== -1 && remaining < limit * 0.2) {
          upgradeRecommended = true;
        }
      }

      return {
        tier,
        quotas,
        upgradeRecommended: upgradeRecommended && tier !== 'pro',
      };
    } catch (error) {
      logger.error('Failed to get user quota status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 返回默认状态
      const quotas = {} as Record<QuotaType, {
        current: number
        limit: number
        remaining: number
        resetTime: Date
      }>;

      QUOTA_TYPES.forEach(type => {
        quotas[type] = {
          current: 0,
          limit: 0,
          remaining: 0,
          resetTime: this.getNextResetTime(),
        };
      });

      return {
        tier: 'free',
        quotas,
        upgradeRecommended: false,
      };
    }
  }

  /**
   * 重置用户配额（管理员功能）
   */
  async resetUserQuota(userId: string, quotaType?: QuotaType): Promise<void> {
    try {
      if (quotaType) {
        // 重置特定配额
        const quotaKey = this.getQuotaKey(userId, quotaType);
        await redis.del(quotaKey);

        logger.info('Quota reset', { userId, quotaType });
      } else {
        // 重置所有配额
        const keys = QUOTA_TYPES.map(type => this.getQuotaKey(userId, type));

        if (keys.length > 0) {
          const [firstKey, ...restKeys] = keys;
          await redis.del(firstKey, ...restKeys);
        }

        logger.info('All quotas reset', { userId });
      }
    } catch (error) {
      logger.error('Failed to reset quota', {
        userId,
        quotaType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取配额使用统计
   */
  async getQuotaStatistics(
    userId: string,
    days: number = 7,
  ): Promise<{
    daily: Array<{
      date: string
      usage: Record<QuotaType, number>
    }>
    total: Record<QuotaType, number>
    average: Record<QuotaType, number>
  }> {
    try {
      const daily: Array<{ date: string; usage: Record<QuotaType, number> }> = [];
      const total = {} as Record<QuotaType, number>;

      // 初始化总计
      QUOTA_TYPES.forEach(type => {
        total[type] = 0;
      });

      // 获取最近几天的数据
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = this.getDateKey(date);

        const usage = {} as Record<QuotaType, number>;

        for (const quotaType of QUOTA_TYPES) {
          const key = `quota:${userId}:${quotaType}:${dateKey}`;
          const value = await redis.get(key) || '0';
          const usageValue = parseInt(value, 10);

          usage[quotaType] = usageValue;
          total[quotaType] += usageValue;
        }

        daily.push({
          date: dateKey,
          usage,
        });
      }

      // 计算平均值
      const average = {} as Record<QuotaType, number>;
      QUOTA_TYPES.forEach(type => {
        average[type] = Math.round(total[type] / days);
      });

      return {
        daily,
        total: total as Record<QuotaType, number>,
        average: average as Record<QuotaType, number>,
      };
    } catch (error) {
      logger.error('Failed to get quota statistics', {
        userId,
        days,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        daily: [],
        total: { create: 0, reuse: 0, export: 0, graph_nodes: 0 },
        average: { create: 0, reuse: 0, export: 0, graph_nodes: 0 },
      };
    }
  }

  /**
   * 更新配额限制（管理员功能）
   */
  updateQuotaLimits(tier: UserTier, limits: Partial<QuotaLimits>): void {
    this.quotaLimits[tier] = {
      ...this.quotaLimits[tier],
      ...limits,
    };

    logger.info('Quota limits updated', { tier, newLimits: this.quotaLimits[tier] });
  }

  /**
   * 获取当前配额限制
   */
  getQuotaLimits(): Record<UserTier, QuotaLimits> {
    return { ...this.quotaLimits };
  }

  /**
   * 批量检查配额
   */
  async batchCheckQuota(
    requests: Array<{
      userId: string
      quotaType: QuotaType
      amount: number
    }>,
  ): Promise<Array<QuotaCheckResult & { userId: string; quotaType: QuotaType }>> {
    const results = await Promise.all(
      requests.map(async (req) => {
        const result = await this.checkQuota(req.userId, req.quotaType, req.amount);
        return {
          ...result,
          userId: req.userId,
          quotaType: req.quotaType,
        };
      }),
    );

    return results;
  }

  /**
   * 获取当前使用量
   */
  private async getCurrentUsage(userId: string, quotaType: QuotaType): Promise<number> {
    const quotaKey = this.getQuotaKey(userId, quotaType);
    const usage = await redis.get(quotaKey) || '0';
    return parseInt(usage, 10);
  }

  /**
   * 获取配额限制值
   */
  private getQuotaLimit(limits: QuotaLimits, quotaType: QuotaType): number {
    switch (quotaType) {
      case 'create':
        return limits.dailyCreateQuota;
      case 'reuse':
        return limits.dailyReuseQuota;
      case 'export':
        return limits.maxExportsPerDay;
      case 'graph_nodes':
        return limits.maxGraphNodes;
      default:
        return 0;
    }
  }

  /**
   * 生成配额键
   */
  private getQuotaKey(userId: string, quotaType: QuotaType): string {
    const today = this.getDateKey(new Date());
    return `quota:${userId}:${quotaType}:${today}`;
  }

  /**
   * 获取日期键
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * 获取下次重置时间
   */
  private getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * 获取到重置时间的秒数
   */
  private getSecondsUntilReset(): number {
    const now = new Date();
    const resetTime = this.getNextResetTime();
    return Math.floor((resetTime.getTime() - now.getTime()) / 1000);
  }

  /**
   * 记录配额超限事件
   */
  private async recordQuotaExceededEvent(
    userId: string,
    quotaType: QuotaType,
    checkResult: QuotaCheckResult,
  ): Promise<void> {
    try {
      const event: QuotaExceededEvent = {
        userId,
        quotaType,
        currentUsage: 0, // 会在实际使用中填充
        limit: checkResult.remaining + 1, // 估算的限制
        timestamp: new Date(),
        userTier: checkResult.tier,
        subscriptionStatus: 'active', // 需要从订阅服务获取
      };

      // 发送到事件队列或日志系统
      logger.warn('Quota exceeded', event);

      // 可以在这里触发升级推荐通知
      if (checkResult.upgradeRecommended) {
        // 触发升级推荐逻辑
        logger.info('Upgrade recommended for user', { userId, quotaType });
      }
    } catch (error) {
      logger.error('Failed to record quota exceeded event', {
        userId,
        quotaType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testUserId = 'health_check_user';
      const result = await this.checkQuota(testUserId, 'create', 1);
      return result.allowed !== undefined;
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
      redisReady: redis.isReady(),
      version: '1.0.0',
    };
  }
}

// 单例实例
export const quotaManager = new QuotaManager();
export default quotaManager;
