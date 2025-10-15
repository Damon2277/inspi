/**
 * 增强版配额检查系统 - 支持新的订阅系统
 */

import {
  QuotaType,
  UserTier,
  Subscription,
  QuotaLimits,
} from '@/shared/types/subscription';

import { DEFAULT_PLANS, QUOTA_THRESHOLDS } from './constants';
import {
  formatQuota,
  calculateQuotaUsagePercentage,
  getQuotaWarningLevel,
  getQuotaTypeIcon,
} from './utils';

type DailyQuotaType = 'create' | 'reuse' | 'export';

export interface QuotaDataSource {
  getDailyUsage(userId: string, type: DailyQuotaType, isoDate: string): Promise<number>;
  getTotalGraphNodes(userId: string): Promise<number>;
  consumeQuota(input: { userId: string; type: QuotaType; amount: number; subscriptionId?: string | null }): Promise<boolean>;
  resetDailyQuotas(userId: string): Promise<boolean>;
}

export interface QuotaDataSourceOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export interface EnhancedQuotaCheckerOptions {
  dataSource?: QuotaDataSource;
  dataSourceOptions?: QuotaDataSourceOptions;
}

const defaultQuotaDataSource = createDefaultQuotaDataSource();

export interface QuotaUsage {
  type: QuotaType;
  used: number;
  limit: number;
  resetTime: Date;
  isUnlimited: boolean;
  percentage: number;
  warningLevel: 'safe' | 'warning' | 'critical' | 'exceeded';
}

export interface QuotaCheckResult {
  allowed: boolean;
  usage: QuotaUsage;
  requestedAmount: number;
  reason?: 'quota_exceeded' | 'subscription_expired' | 'subscription_suspended' | 'permission_denied';
  upgradePrompt?: {
    title: string;
    description: string;
    icon: string;
    currentPlan: string;
    recommendedPlan: string;
    benefits: string[];
    priceIncrease: number;
    urgency: 'low' | 'medium' | 'high';
  };
}

/**
 * 增强版配额检查器
 */
export class EnhancedQuotaChecker {
  private dataSource: QuotaDataSource;

  constructor(
    private userId: string,
    private subscription: Subscription | null,
    options: EnhancedQuotaCheckerOptions = {},
  ) {
    const { dataSource, dataSourceOptions } = options;
    this.dataSource = dataSource ?? (dataSourceOptions ? createDefaultQuotaDataSource(dataSourceOptions) : defaultQuotaDataSource);
  }

  /**
   * 检查指定类型的配额
   */
  async checkQuota(type: QuotaType, amount: number = 1): Promise<QuotaCheckResult> {
    const requestedAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
    // 获取用户配额限制
    const quotaLimits = this.getQuotaLimits();
    const usage = await this.getQuotaUsage(type, quotaLimits);

    // 检查订阅状态
    if (this.subscription && this.subscription.status === 'suspended') {
      return {
        allowed: false,
        usage,
        requestedAmount,
        reason: 'subscription_suspended',
      };
    }

    if (this.subscription && this.subscription.status === 'expired') {
      return {
        allowed: false,
        usage,
        requestedAmount,
        reason: 'subscription_expired',
      };
    }

    // 检查是否有无限配额
    if (usage.isUnlimited) {
      return {
        allowed: true,
        usage,
        requestedAmount,
      };
    }

    // 检查是否超出配额
    if (usage.used + requestedAmount > usage.limit) {
      return {
        allowed: false,
        usage,
        requestedAmount,
        reason: 'quota_exceeded',
        upgradePrompt: this.generateUpgradePrompt(type, usage),
      };
    }

    return {
      allowed: true,
      usage,
      requestedAmount,
    };
  }

  /**
   * 获取配额限制
   */
  private getQuotaLimits(): QuotaLimits {
    if (this.subscription && this.subscription.status === 'active') {
      return this.subscription.quotas;
    }

    // 默认使用免费套餐配额
    const freePlan = (DEFAULT_PLANS.find as any)(p => p.tier === 'free');
    return freePlan?.quotas || {
      dailyCreateQuota: 3,
      dailyReuseQuota: 1,
      maxExportsPerDay: 10,
      maxGraphNodes: 50,
    };
  }

  /**
   * 获取配额使用情况
   */
  private async getQuotaUsage(type: QuotaType, quotaLimits: QuotaLimits): Promise<QuotaUsage> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let limit: number;
    let used: number;
    let isUnlimited: boolean;
    let resetTime: Date;

    switch (type) {
      case 'create':
        limit = quotaLimits.dailyCreateQuota;
        used = await this.getDailyUsage('create');
        isUnlimited = limit === -1;
        resetTime = tomorrow;
        break;
      case 'reuse':
        limit = quotaLimits.dailyReuseQuota;
        used = await this.getDailyUsage('reuse');
        isUnlimited = limit === -1;
        resetTime = tomorrow;
        break;
      case 'export':
        limit = quotaLimits.maxExportsPerDay;
        used = await this.getDailyUsage('export');
        isUnlimited = limit === -1;
        resetTime = tomorrow;
        break;
      case 'graph_nodes':
        limit = quotaLimits.maxGraphNodes;
        used = await this.getTotalGraphNodes();
        isUnlimited = limit === -1;
        resetTime = new Date(0); // 不重置
        break;
      default:
        throw new Error(`Unknown quota type: ${type}`);
    }

    const percentage = isUnlimited ? 0 : calculateQuotaUsagePercentage(used, limit);
    const warningLevel = isUnlimited ? 'safe' : getQuotaWarningLevel(used, limit);

    return {
      type,
      used: isUnlimited ? 0 : used,
      limit: isUnlimited ? Infinity : limit,
      resetTime,
      isUnlimited,
      percentage,
      warningLevel,
    };
  }

  /**
   * 获取每日使用量
   */
  private async getDailyUsage(type: DailyQuotaType): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    try {
      return await this.dataSource.getDailyUsage(this.userId, type, today);
    } catch (error) {
      console.error('Failed to get daily usage:', error);
      return 0;
    }
  }

  /**
   * 获取知识图谱节点总数
   */
  private async getTotalGraphNodes(): Promise<number> {
    try {
      return await this.dataSource.getTotalGraphNodes(this.userId);
    } catch (error) {
      console.error('Failed to get graph nodes count:', error);
      return 0;
    }
  }

  /**
   * 生成升级提示
   */
  private generateUpgradePrompt(type: QuotaType, usage: QuotaUsage): {
    title: string;
    description: string;
    icon: string;
    currentPlan: string;
    recommendedPlan: string;
    benefits: string[];
    priceIncrease: number;
    urgency: 'low' | 'medium' | 'high';
  } {
    const currentTier = this.subscription?.plan || 'free';

    // 推荐升级方案
    let recommendedTier: UserTier;
    if (currentTier === 'free') {
      recommendedTier = 'basic';
    } else if (currentTier === 'basic') {
      recommendedTier = 'pro';
    } else {
      recommendedTier = 'pro'; // 已经是最高级
    }

    const currentPlan = (DEFAULT_PLANS.find as any)(p => p.tier === currentTier);
    const recommendedPlan = (DEFAULT_PLANS.find as any)(p => p.tier === recommendedTier);

    if (!currentPlan || !recommendedPlan) {
      throw new Error('Plan configuration not found');
    }

    const prompts = {
      create: {
        title: '今日创建配额已用完',
        description: `您今天已经创建了 ${usage.used} 张精美卡片！`,
        benefits: [
          `每日创建 ${formatQuota(recommendedPlan.quotas.dailyCreateQuota)} 张卡片`,
          '释放更大创作潜力',
          '支持更多教学场景',
          '提升工作效率',
        ],
      },
      reuse: {
        title: '今日复用配额已用完',
        description: `您今天已经复用了 ${usage.used} 张卡片模板！`,
        benefits: [
          `每日复用 ${formatQuota(recommendedPlan.quotas.dailyReuseQuota)} 张模板`,
          '快速构建教学体系',
          '积累个人知识库',
          '提升创作效率 10 倍',
        ],
      },
      export: {
        title: '今日导出配额已用完',
        description: `您今天已经导出了 ${usage.used} 张图片！`,
        benefits: [
          `每日导出 ${formatQuota(recommendedPlan.quotas.maxExportsPerDay)} 张图片`,
          '无限制图片导出',
          '高清质量保证',
          '批量导出功能',
        ],
      },
      graph_nodes: {
        title: '知识图谱节点已达上限',
        description: `您的知识图谱已有 ${usage.used} 个节点！`,
        benefits: [
          `支持 ${formatQuota(recommendedPlan.quotas.maxGraphNodes)} 个节点`,
          '无限知识图谱节点',
          '高级智能分析',
          '完整知识体系构建',
        ],
      },
    };

    const prompt = prompts[type];
    const urgency = usage.warningLevel === 'exceeded' ? 'high' : 'medium';

    return {
      title: prompt.title,
      description: prompt.description,
      icon: getQuotaTypeIcon(type),
      currentPlan: currentPlan.displayName,
      recommendedPlan: recommendedPlan.displayName,
      benefits: prompt.benefits,
      priceIncrease: recommendedPlan.monthlyPrice - currentPlan.monthlyPrice,
      urgency,
    };
  }

  /**
   * 消费配额
   */
  async consumeQuota(type: QuotaType, amount: number = 1): Promise<boolean> {
    const checkResult = await this.checkQuota(type, amount);

    if (!checkResult.allowed) {
      return false;
    }

    // 如果是无限配额，直接返回成功
    if (checkResult.usage.isUnlimited) {
      return true;
    }

    try {
      return await this.dataSource.consumeQuota({
        userId: this.userId,
        type,
        amount,
        subscriptionId: this.subscription?.id ?? null,
      });
    } catch (error) {
      console.error('Failed to consume quota:', error);
      return false;
    }
  }

  /**
   * 获取所有配额状态
   */
  async getAllQuotaStatus(): Promise<Record<QuotaType, QuotaUsage>> {
    const types: QuotaType[] = ['create', 'reuse', 'export', 'graph_nodes'];
    const results: Record<QuotaType, QuotaUsage> = {} as any;
    const quotaLimits = this.getQuotaLimits();

    for (const type of types) {
      const usage = await this.getQuotaUsage(type, quotaLimits);
      results[type] = usage;
    }

    return results;
  }

  /**
   * 检查是否需要显示升级提示
   */
  async shouldShowUpgradePrompt(type: QuotaType): Promise<boolean> {
    const usage = await this.getQuotaUsage(type, this.getQuotaLimits());

    // 如果是无限配额，不显示升级提示
    if (usage.isUnlimited) {
      return false;
    }

    // 如果已经是最高级套餐，不显示升级提示
    if (this.subscription?.plan === 'pro') {
      return false;
    }

    // 如果配额使用率超过80%，显示升级提示
    return usage.percentage >= QUOTA_THRESHOLDS.WARNING * 100;
  }

  /**
   * 重置每日配额（系统调用）
   */
  async resetDailyQuotas(): Promise<boolean> {
    try {
      return await this.dataSource.resetDailyQuotas(this.userId);
    } catch (error) {
      console.error('Failed to reset daily quotas:', error);
      return false;
    }
  }
}

export function createDefaultQuotaDataSource(options: QuotaDataSourceOptions = {}): QuotaDataSource {
  const fetcher = options.fetcher ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
  const baseUrlOverride = options.baseUrl;
  let missingBaseUrlWarned = false;

  const warnMissingBaseUrl = () => {
    if (!missingBaseUrlWarned) {
      console.warn('[QuotaDataSource] 服务器环境缺少 API 基础地址，已回退为本地空结果。请设置 INTERNAL_API_BASE_URL。');
      missingBaseUrlWarned = true;
    }
  };

  const buildUrl = (path: string, params?: Record<string, string | number | undefined>): string | null => {
    const query = params
      ? Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .reduce((search, [key, value]) => {
            search.append(key, String(value));
            return search;
          }, new URLSearchParams())
      : null;

    if (typeof window !== 'undefined') {
      const url = new URL(path, window.location.origin);
      if (query) {
        query.forEach((value, key) => url.searchParams.set(key, value));
      }
      return url.toString();
    }

    const base = normalizeBaseUrl(baseUrlOverride);
    if (!base) {
      warnMissingBaseUrl();
      return null;
    }

    const url = new URL(path, base);
    if (query) {
      query.forEach((value, key) => url.searchParams.set(key, value));
    }
    return url.toString();
  };

  const safeFetch: typeof fetch | undefined = fetcher;

  return {
    async getDailyUsage(userId, type, isoDate) {
      if (!safeFetch) {
        return 0;
      }

      const url = buildUrl('/api/subscription/quota/daily-usage', {
        userId,
        type,
        date: isoDate,
      });

      if (!url) {
        return 0;
      }

      try {
        const response = await safeFetch(url);
        if (!response.ok) {
          return 0;
        }
        const result = await response.json();
        return typeof result.usage === 'number' ? result.usage : 0;
      } catch (error) {
        console.error('Failed to fetch daily quota usage:', error);
        return 0;
      }
    },

    async getTotalGraphNodes(userId) {
      if (!safeFetch) {
        return 0;
      }

      const url = buildUrl('/api/subscription/quota/graph-nodes', { userId });
      if (!url) {
        return 0;
      }

      try {
        const response = await safeFetch(url);
        if (!response.ok) {
          return 0;
        }
        const result = await response.json();
        return typeof result.count === 'number' ? result.count : 0;
      } catch (error) {
        console.error('Failed to fetch graph nodes count:', error);
        return 0;
      }
    },

    async consumeQuota({ userId, type, amount, subscriptionId }) {
      if (!safeFetch) {
        return false;
      }

      const url = buildUrl('/api/subscription/quota/consume');
      if (!url) {
        return false;
      }

      try {
        const response = await safeFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            type,
            amount,
            subscriptionId: subscriptionId ?? undefined,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error('Failed to consume quota via data source:', error);
        return false;
      }
    },

    async resetDailyQuotas(userId) {
      if (!safeFetch) {
        return false;
      }

      const url = buildUrl('/api/subscription/quota/reset-daily');
      if (!url) {
        return false;
      }

      try {
        const response = await safeFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        return response.ok;
      } catch (error) {
        console.error('Failed to reset quotas via data source:', error);
        return false;
      }
    },
  };
}

function normalizeBaseUrl(baseUrl?: string | null): string | null {
  if (!baseUrl) {
    const envUrl = process.env.INTERNAL_API_BASE_URL
      || process.env.API_BASE_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.APP_BASE_URL
      || null;

    baseUrl = envUrl || null;
  }

  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(baseUrl).toString();
  } catch (error) {
    try {
      return new URL(`http://${baseUrl}`).toString();
    } catch {
      console.warn('[QuotaDataSource] 无法解析提供的 API 基础地址:', baseUrl);
      return null;
    }
  }
}
