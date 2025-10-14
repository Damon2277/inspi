/**
 * 配额检查和管理系统
 */

import { UserRole, SubscriptionStatus, getUserQuotas } from '@/core/auth/roles';

export type QuotaType = 'create' | 'reuse' | 'export' | 'graph_nodes';

export interface QuotaUsage {
  type: QuotaType;
  used: number;
  limit: number;
  resetTime: Date;
  isUnlimited: boolean;
}

export interface QuotaCheckResult {
  allowed: boolean;
  usage: QuotaUsage;
  reason?: 'quota_exceeded' | 'subscription_expired' | 'permission_denied';
  upgradePrompt?: {
    title: string;
    description: string;
    currentPlan: string;
    recommendedPlan: string;
    benefits: string[];
    priceIncrease: number;
  };
}

/**
 * 配额检查器类
 */
export class QuotaChecker {
  constructor(
    private userId: string,
    private role: UserRole,
    private subscriptionStatus: SubscriptionStatus,
  ) {}

  /**
   * 检查指定类型的配额
   */
  async checkQuota(type: QuotaType): Promise<QuotaCheckResult> {
    const quotas = getUserQuotas(this.role, this.subscriptionStatus);
    const usage = await this.getQuotaUsage(type);

    // 检查是否有无限配额
    if (usage.isUnlimited) {
      return {
        allowed: true,
        usage,
      };
    }

    // 检查是否超出配额
    if (usage.used >= usage.limit) {
      return {
        allowed: false,
        usage,
        reason: 'quota_exceeded',
        upgradePrompt: this.generateUpgradePrompt(type),
      };
    }

    return {
      allowed: true,
      usage,
    };
  }

  /**
   * 获取配额使用情况
   */
  private async getQuotaUsage(type: QuotaType): Promise<QuotaUsage> {
    const quotas = getUserQuotas(this.role, this.subscriptionStatus);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let limit: number;
    let used: number;
    let isUnlimited: boolean;

    switch (type) {
      case 'create':
        limit = quotas.dailyCreateQuota;
        used = await this.getDailyUsage('create');
        isUnlimited = limit === -1;
        break;
      case 'reuse':
        limit = quotas.dailyReuseQuota;
        used = await this.getDailyUsage('reuse');
        isUnlimited = limit === -1;
        break;
      case 'export':
        limit = quotas.maxExportsPerDay;
        used = await this.getDailyUsage('export');
        isUnlimited = limit === -1;
        break;
      case 'graph_nodes':
        limit = quotas.maxGraphNodes;
        used = await this.getTotalGraphNodes();
        isUnlimited = limit === -1;
        break;
      default:
        throw new Error(`Unknown quota type: ${type}`);
    }

    return {
      type,
      used: isUnlimited ? 0 : used,
      limit: isUnlimited ? Infinity : limit,
      resetTime: type === 'graph_nodes' ? new Date(0) : tomorrow,
      isUnlimited,
    };
  }

  /**
   * 获取每日使用量
   */
  private async getDailyUsage(type: 'create' | 'reuse' | 'export'): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(`/api/quota/daily-usage?userId=${this.userId}&type=${type}&date=${today}`);
      if (response.ok) {
        const result = await response.json();
        return result.usage || 0;
      }
    } catch (error) {
      console.error('Failed to get daily usage:', error);
    }

    return 0;
  }

  /**
   * 获取知识图谱节点总数
   */
  private async getTotalGraphNodes(): Promise<number> {
    try {
      const response = await fetch(`/api/knowledge-graph/nodes/count?userId=${this.userId}`);
      if (response.ok) {
        const result = await response.json();
        return result.count || 0;
      }
    } catch (error) {
      console.error('Failed to get graph nodes count:', error);
    }

    return 0;
  }

  /**
   * 生成升级提示
   */
  private generateUpgradePrompt(type: QuotaType): {
    title: string;
    description: string;
    currentPlan: string;
    recommendedPlan: string;
    benefits: string[];
    priceIncrease: number;
  } {
    const currentConfig = getUserQuotas(this.role, this.subscriptionStatus);

    // 根据配额类型推荐升级方案
    let recommendedRole: UserRole;
    if (this.role === 'free') {
      recommendedRole = 'basic';
    } else if (this.role === 'basic') {
      recommendedRole = 'pro';
    } else {
      recommendedRole = 'pro'; // 已经是最高级
    }

    const recommendedConfig = getUserQuotas(recommendedRole, 'active');

    const prompts = {
      create: {
        title: '🎨 今日创建配额已用完',
        description: `您今天已经创建了 ${currentConfig.dailyCreateQuota} 张精美卡片！`,
        benefits: [
          `每日 ${recommendedConfig.dailyCreateQuota === -1 ? '无限' : recommendedConfig.dailyCreateQuota} 张创建配额`,
          `每日 ${recommendedConfig.dailyReuseQuota === -1 ? '无限' : recommendedConfig.dailyReuseQuota} 张复用配额`,
          '高清图片导出',
          '批量操作功能',
        ],
      },
      reuse: {
        title: '🔄 今日复用配额已用完',
        description: `您今天已经复用了 ${currentConfig.dailyReuseQuota} 张卡片！`,
        benefits: [
          `每日 ${recommendedConfig.dailyReuseQuota === -1 ? '无限' : recommendedConfig.dailyReuseQuota} 次复用机会`,
          '快速构建教学体系',
          '积累个人知识库',
          '提升创作效率 10 倍',
        ],
      },
      export: {
        title: '📥 今日导出配额已用完',
        description: `您今天已经导出了 ${currentConfig.maxExportsPerDay} 张图片！`,
        benefits: [
          `每日 ${recommendedConfig.maxExportsPerDay === -1 ? '无限' : recommendedConfig.maxExportsPerDay} 次导出`,
          '高清导出（2x-3x分辨率）',
          '批量导出功能',
          '多种格式支持',
        ],
      },
      graph_nodes: {
        title: '🧠 知识图谱节点已达上限',
        description: `您的知识图谱已有 ${currentConfig.maxGraphNodes} 个节点！`,
        benefits: [
          '无限知识图谱节点',
          '高级智能分析',
          '学习路径规划',
          '数据导出备份',
        ],
      },
    };

    const prompt = prompts[type];
    const roleNames = {
      free: '免费版',
      basic: '基础版',
      pro: '专业版',
      admin: '管理员',
    };

    const prices = {
      free: 0,
      basic: 69,
      pro: 199,
      admin: 0,
    };

    return {
      title: prompt.title,
      description: prompt.description,
      currentPlan: roleNames[this.role],
      recommendedPlan: roleNames[recommendedRole],
      benefits: prompt.benefits,
      priceIncrease: prices[recommendedRole] - prices[this.role],
    };
  }

  /**
   * 消费配额
   */
  async consumeQuota(type: QuotaType, amount: number = 1): Promise<boolean> {
    const checkResult = await this.checkQuota(type);

    if (!checkResult.allowed) {
      return false;
    }

    // 如果是无限配额，直接返回成功
    if (checkResult.usage.isUnlimited) {
      return true;
    }

    try {
      const response = await fetch('/api/quota/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          type,
          amount,
        }),
      });

      return response.ok;
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

    for (const type of types) {
      const checkResult = await this.checkQuota(type);
      results[type] = checkResult.usage;
    }

    return results;
  }
}

/**
 * 配额中间件工厂
 */
export function createQuotaMiddleware(type: QuotaType) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const checker = new QuotaChecker(
      (req.user.id || (req.user as any)._id),
      req.user.subscriptionTier,
      req.user.subscriptionStatus,
    );

    const result = await checker.checkQuota(type);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Quota exceeded',
        reason: result.reason,
        usage: result.usage,
        upgradePrompt: result.upgradePrompt,
      });
    }

    // 将配额检查器附加到请求对象
    req.quotaChecker = checker;
    next();
  };
}

/**
 * 客户端配额检查Hook
 */
export function useQuotaChecker(
  userId: string,
  role: UserRole,
  subscriptionStatus: SubscriptionStatus,
) {
  const checker = new QuotaChecker(userId, role, subscriptionStatus);

  const checkQuota = async (type: QuotaType) => {
    return checker.checkQuota(type);
  };

  const consumeQuota = async (type: QuotaType, amount?: number) => {
    return checker.consumeQuota(type, amount);
  };

  const getAllQuotaStatus = async () => {
    return checker.getAllQuotaStatus();
  };

  return {
    checkQuota,
    consumeQuota,
    getAllQuotaStatus,
  };
}
