/**
 * 套餐配置数据模型
 * 处理订阅套餐的数据结构、验证和数据库操作
 */

import {
  SubscriptionPlan,
  UserTier,
  PlanQuotas,
  PlanFeatures,
  PlanStatus,
} from '@/shared/types/subscription';

/**
 * 套餐配置接口
 */
export interface PlanConfig {
  id: string;
  name: string;
  tier: UserTier;
  status: PlanStatus;
  monthlyPrice: number;
  yearlyPrice?: number;
  currency: string;
  quotas: PlanQuotas;
  features: PlanFeatures[];
  description: string;
  popular: boolean;
  recommended: boolean;
  badge?: string;
  savings?: string;
  sortOrder: number;
  metadata: PlanMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 套餐元数据
 */
export interface PlanMetadata {
  targetAudience: string[];
  useCases: string[];
  limitations: string[];
  benefits: string[];
  comparisonPoints: string[];
  marketingTags: string[];
}

/**
 * 套餐创建请求
 */
export interface CreatePlanRequest {
  name: string;
  tier: UserTier;
  monthlyPrice: number;
  yearlyPrice?: number;
  quotas: PlanQuotas;
  features: PlanFeatures[];
  description: string;
  metadata?: Partial<PlanMetadata>;
}

/**
 * 套餐更新请求
 */
export interface UpdatePlanRequest {
  id: string;
  name?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  quotas?: Partial<PlanQuotas>;
  features?: PlanFeatures[];
  description?: string;
  status?: PlanStatus;
  popular?: boolean;
  recommended?: boolean;
  metadata?: Partial<PlanMetadata>;
}

/**
 * 套餐查询选项
 */
export interface PlanQueryOptions {
  status?: PlanStatus;
  tier?: UserTier;
  includeInactive?: boolean;
  sortBy?: 'price' | 'popularity' | 'tier' | 'created';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * 套餐数据模型类
 */
export class PlanModel {
  private static instance: PlanModel;
  private plans: Map<string, PlanConfig> = new Map();

  private constructor() {
    this.initializeDefaultPlans();
  }

  public static getInstance(): PlanModel {
    if (!PlanModel.instance) {
      PlanModel.instance = new PlanModel();
    }
    return PlanModel.instance;
  }

  /**
   * 初始化默认套餐
   */
  private initializeDefaultPlans(): void {
    const defaultPlans: PlanConfig[] = [
      {
        id: 'plan-free',
        name: '免费版',
        tier: 'free',
        status: 'active',
        monthlyPrice: 0,
        currency: 'CNY',
        quotas: {
          dailyCreateQuota: 5,
          dailyReuseQuota: 1,
          maxExportsPerDay: 10,
          maxGraphNodes: 50,
        },
        features: ['基础卡片创建', '简单模板', '标准导出'],
        description: '适合个人用户体验产品功能',
        popular: false,
        recommended: false,
        sortOrder: 1,
        metadata: {
          targetAudience: ['个人用户', '学生', '试用用户'],
          useCases: ['产品体验', '简单创作', '学习使用'],
          limitations: ['配额限制', '功能受限', '无客服支持'],
          benefits: ['免费使用', '快速上手', '基础功能'],
          comparisonPoints: ['每日5张卡片', '基础模板', '标准导出'],
          marketingTags: ['免费', '入门', '体验'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'plan-basic',
        name: '基础版',
        tier: 'basic',
        status: 'active',
        monthlyPrice: 69,
        yearlyPrice: 690,
        currency: 'CNY',
        quotas: {
          dailyCreateQuota: 20,
          dailyReuseQuota: 5,
          maxExportsPerDay: 50,
          maxGraphNodes: -1,
        },
        features: ['高清导出', '智能分析', '无限知识图谱', '24/7客服支持', '数据备份'],
        description: '适合个人创作者和小团队使用',
        popular: true,
        recommended: false,
        badge: '最受欢迎',
        sortOrder: 2,
        metadata: {
          targetAudience: ['个人创作者', '小团队', '教师', '培训师'],
          useCases: ['日常创作', '教学制作', '内容输出', '知识整理'],
          limitations: ['中等配额', '基础功能'],
          benefits: ['高清导出', '客服支持', '数据安全', '知识图谱'],
          comparisonPoints: ['每日20张卡片', '高清导出', '无限图谱', '客服支持'],
          marketingTags: ['热门', '实用', '性价比'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'plan-pro',
        name: '专业版',
        tier: 'pro',
        status: 'active',
        monthlyPrice: 0.1,
        yearlyPrice: 1,
        currency: 'CNY',
        quotas: {
          dailyCreateQuota: 100,
          dailyReuseQuota: 50,
          maxExportsPerDay: 200,
          maxGraphNodes: -1,
        },
        features: [
          '高清导出', '智能分析', '无限知识图谱',
          '品牌定制', '数据导出', '专属客服',
          '优先技术支持', 'API访问',
        ],
        description: '适合企业用户和专业团队',
        popular: false,
        recommended: true,
        badge: '推荐',
        savings: '相比基础版节省30%',
        sortOrder: 3,
        metadata: {
          targetAudience: ['企业用户', '专业团队', '培训机构', '内容公司'],
          useCases: ['大规模创作', '企业培训', '商业应用', '品牌营销'],
          limitations: ['高级功能'],
          benefits: ['品牌定制', 'API访问', '专属服务', '数据导出', '优先支持'],
          comparisonPoints: ['每日100张卡片', '品牌定制', 'API访问', '专属客服'],
          marketingTags: ['专业', '企业', '定制', '高效'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultPlans.forEach(plan => {
      this.plans.set(plan.id, plan);
    });
  }

  /**
   * 创建新套餐
   */
  async createPlan(request: CreatePlanRequest): Promise<PlanConfig> {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metadata = request.metadata ?? {};

    const plan: PlanConfig = {
      id: planId,
      name: request.name,
      tier: request.tier,
      status: 'active',
      monthlyPrice: request.monthlyPrice,
      yearlyPrice: request.yearlyPrice,
      currency: 'CNY',
      quotas: request.quotas,
      features: request.features,
      description: request.description,
      popular: false,
      recommended: false,
      sortOrder: this.plans.size + 1,
      metadata: {
        targetAudience: metadata.targetAudience || [],
        useCases: metadata.useCases || [],
        limitations: metadata.limitations || [],
        benefits: metadata.benefits || [],
        comparisonPoints: metadata.comparisonPoints || [],
        marketingTags: metadata.marketingTags || [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 验证套餐数据
    this.validatePlan(plan);

    // 存储套餐
    this.plans.set(planId, plan);

    return plan;
  }

  /**
   * 更新套餐
   */
  async updatePlan(request: UpdatePlanRequest): Promise<PlanConfig> {
    const existingPlan = this.plans.get(request.id);
    if (!existingPlan) {
      throw new Error('套餐不存在');
    }

    const metadataUpdates = request.metadata ?? {};

    const updatedPlan: PlanConfig = {
      ...existingPlan,
      ...request,
      quotas: {
        ...existingPlan.quotas,
        ...(request.quotas ?? {}),
      },
      features: request.features ?? existingPlan.features,
      metadata: {
        targetAudience: metadataUpdates.targetAudience ?? existingPlan.metadata.targetAudience,
        useCases: metadataUpdates.useCases ?? existingPlan.metadata.useCases,
        limitations: metadataUpdates.limitations ?? existingPlan.metadata.limitations,
        benefits: metadataUpdates.benefits ?? existingPlan.metadata.benefits,
        comparisonPoints: metadataUpdates.comparisonPoints ?? existingPlan.metadata.comparisonPoints,
        marketingTags: metadataUpdates.marketingTags ?? existingPlan.metadata.marketingTags,
      },
      updatedAt: new Date(),
    };

    // 验证更新后的套餐数据
    this.validatePlan(updatedPlan);

    // 更新存储
    this.plans.set(request.id, updatedPlan);

    return updatedPlan;
  }

  /**
   * 获取套餐详情
   */
  async getPlanById(planId: string): Promise<PlanConfig | null> {
    return this.plans.get(planId) || null;
  }

  /**
   * 查询套餐列表
   */
  async queryPlans(options: PlanQueryOptions = {}): Promise<{
    plans: PlanConfig[];
    total: number;
  }> {
    let filteredPlans = Array.from(this.plans.values());

    // 状态过滤
    if (options.status) {
      filteredPlans = filteredPlans.filter(plan => plan.status === options.status);
    }

    // 层级过滤
    if (options.tier) {
      filteredPlans = filteredPlans.filter(plan => plan.tier === options.tier);
    }

    // 是否包含非活跃套餐
    if (!options.includeInactive) {
      filteredPlans = filteredPlans.filter(plan => plan.status === 'active');
    }

    // 排序
    if (options.sortBy) {
      filteredPlans.sort((a, b) => {
        let comparison = 0;

        switch (options.sortBy) {
          case 'price':
            comparison = a.monthlyPrice - b.monthlyPrice;
            break;
          case 'popularity':
            comparison = (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
            break;
          case 'tier':
            const tierOrder = { free: 0, basic: 1, pro: 2, admin: 3 };
            comparison = tierOrder[a.tier] - tierOrder[b.tier];
            break;
          case 'created':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          default:
            comparison = a.sortOrder - b.sortOrder;
        }

        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    } else {
      // 默认按 sortOrder 排序
      filteredPlans.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    const total = filteredPlans.length;

    // 分页
    if (options.limit) {
      const offset = options.offset || 0;
      filteredPlans = filteredPlans.slice(offset, offset + options.limit);
    }

    return {
      plans: filteredPlans,
      total,
    };
  }

  /**
   * 删除套餐（软删除）
   */
  async deletePlan(planId: string): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan) {
      return false;
    }

    // 软删除：设置状态为 inactive
    plan.status = 'inactive';
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);
    return true;
  }

  /**
   * 获取推荐套餐
   */
  async getRecommendedPlans(currentTier?: UserTier): Promise<PlanConfig[]> {
    const { plans } = await this.queryPlans({
      status: 'active',
      sortBy: 'tier',
    });

    // 如果有当前层级，推荐更高层级的套餐
    if (currentTier) {
      const tierOrder = { free: 0, basic: 1, pro: 2, admin: 3 };
      const currentOrder = tierOrder[currentTier];

      return plans.filter(plan => {
        const planOrder = tierOrder[plan.tier];
        return planOrder > currentOrder;
      });
    }

    // 否则返回标记为推荐的套餐
    return plans.filter(plan => plan.recommended);
  }

  /**
   * 获取热门套餐
   */
  async getPopularPlans(): Promise<PlanConfig[]> {
    const { plans } = await this.queryPlans({
      status: 'active',
    });

    return plans.filter(plan => plan.popular);
  }

  /**
   * 套餐对比
   */
  async comparePlans(planIds: string[]): Promise<{
    plans: PlanConfig[];
    comparison: PlanComparison;
  }> {
    const plans = await Promise.all(
      planIds.map(id => this.getPlanById(id)),
    );

    const validPlans = plans.filter(plan => plan !== null) as PlanConfig[];

    if (validPlans.length === 0) {
      throw new Error('没有找到有效的套餐');
    }

    const comparison = this.generatePlanComparison(validPlans);

    return {
      plans: validPlans,
      comparison,
    };
  }

  /**
   * 验证套餐数据
   */
  private validatePlan(plan: PlanConfig): void {
    if (!plan.name || plan.name.trim().length === 0) {
      throw new Error('套餐名称不能为空');
    }

    if (plan.monthlyPrice < 0) {
      throw new Error('月费不能为负数');
    }

    if (plan.yearlyPrice && plan.yearlyPrice < 0) {
      throw new Error('年费不能为负数');
    }

    if (!plan.quotas) {
      throw new Error('套餐配额不能为空');
    }

    if (plan.quotas.dailyCreateQuota < -1) {
      throw new Error('每日创建配额不能小于-1');
    }

    if (plan.quotas.dailyReuseQuota < -1) {
      throw new Error('每日复用配额不能小于-1');
    }

    if (plan.quotas.maxExportsPerDay < -1) {
      throw new Error('每日导出配额不能小于-1');
    }

    if (!Array.isArray(plan.features)) {
      throw new Error('套餐功能必须是数组');
    }
  }

  /**
   * 生成套餐对比数据
   */
  private generatePlanComparison(plans: PlanConfig[]): PlanComparison {
    const features = new Set<string>();

    // 收集所有功能
    plans.forEach(plan => {
      plan.features.forEach(feature => features.add(feature));
    });

    const featureComparison: Record<string, Record<string, boolean>> = {};

    features.forEach(feature => {
      featureComparison[feature] = {};
      plans.forEach(plan => {
        featureComparison[feature][plan.id] = plan.features.includes(feature);
      });
    });

    return {
      features: Array.from(features),
      featureComparison,
      priceComparison: plans.map(plan => ({
        planId: plan.id,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        savings: plan.yearlyPrice ?
          Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) : 0,
      })),
      quotaComparison: plans.map(plan => ({
        planId: plan.id,
        quotas: plan.quotas,
      })),
    };
  }
}

/**
 * 套餐对比结果
 */
export interface PlanComparison {
  features: string[];
  featureComparison: Record<string, Record<string, boolean>>;
  priceComparison: Array<{
    planId: string;
    monthlyPrice: number;
    yearlyPrice?: number;
    savings: number;
  }>;
  quotaComparison: Array<{
    planId: string;
    quotas: PlanQuotas;
  }>;
}

/**
 * 套餐权限映射
 */
export class PlanPermissionMapper {
  private static permissionMap: Record<UserTier, string[]> = {
    free: [
      'card:create:basic',
      'card:export:standard',
      'graph:view:limited',
    ],
    basic: [
      'card:create:basic',
      'card:create:advanced',
      'card:export:hd',
      'card:reuse:basic',
      'graph:create:unlimited',
      'graph:export:basic',
      'support:email',
    ],
    pro: [
      'card:create:basic',
      'card:create:advanced',
      'card:create:custom',
      'card:export:hd',
      'card:export:batch',
      'card:reuse:advanced',
      'card:brand:custom',
      'graph:create:unlimited',
      'graph:export:advanced',
      'graph:api:access',
      'data:export:full',
      'support:priority',
      'support:dedicated',
    ],
    admin: [
      '*', // 管理员拥有所有权限
    ],
  };

  /**
   * 获取套餐权限
   */
  static getPermissions(tier: UserTier): string[] {
    return this.permissionMap[tier] || [];
  }

  /**
   * 检查权限
   */
  static hasPermission(tier: UserTier, permission: string): boolean {
    const permissions = this.getPermissions(tier);
    return permissions.includes('*') || permissions.includes(permission);
  }

  /**
   * 检查多个权限
   */
  static hasPermissions(tier: UserTier, requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission =>
      this.hasPermission(tier, permission),
    );
  }
}

// 导出单例实例
export const planModel = PlanModel.getInstance();

// 导出工具函数
export const PlanUtils = {
  /**
   * 格式化价格
   */
  formatPrice(price: number, currency: string = 'CNY'): string {
    if (price === 0) return '免费';
    return `¥${price}`;
  },

  /**
   * 计算年费节省
   */
  calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
    if (!yearlyPrice || yearlyPrice <= 0) return 0;
    const monthlyTotal = monthlyPrice * 12;
    return Math.round((1 - yearlyPrice / monthlyTotal) * 100);
  },

  /**
   * 获取套餐推荐理由
   */
  getRecommendationReason(plan: PlanConfig, currentTier?: UserTier): string {
    if (plan.popular) return '最受用户欢迎的选择';
    if (plan.recommended) return '为您量身推荐';
    if (currentTier === 'free' && plan.tier === 'basic') return '升级享受更多功能';
    if (currentTier === 'basic' && plan.tier === 'pro') return '解锁专业功能';
    return '适合您的需求';
  },

  /**
   * 获取套餐标签
   */
  getPlanTags(plan: PlanConfig): string[] {
    const tags: string[] = [];

    if (plan.popular) tags.push('热门');
    if (plan.recommended) tags.push('推荐');
    if (plan.monthlyPrice === 0) tags.push('免费');
    if (plan.savings) tags.push('优惠');

    return tags;
  },
};
