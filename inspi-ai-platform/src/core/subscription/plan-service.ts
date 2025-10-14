/**
 * 套餐管理服务
 * 处理套餐的创建、查询、更新、删除等业务逻辑
 */

import {
  planMapper,
  permissionMapper,
  featureMapper,
  quotaMapper,
} from '@/core/subscription/plan-mapper';
import {
  PlanConfig,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanQueryOptions,
  planModel,
} from '@/core/subscription/plan-model';
import {
  SubscriptionPlan,
  UserTier,
  PlanStatus,
  PlanQuotas,
  PlanFeatures,
} from '@/shared/types/subscription';

/**
 * 套餐推荐配置
 */
export interface PlanRecommendationConfig {
  basedOnUsage: boolean;
  considerBudget: boolean;
  includePopular: boolean;
  maxRecommendations: number;
}

/**
 * 套餐搜索选项
 */
export interface PlanSearchOptions extends PlanQueryOptions {
  keyword?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  features?: string[];
  permissions?: string[];
}

/**
 * 套餐统计信息
 */
export interface PlanStatistics {
  totalPlans: number;
  activePlans: number;
  plansByTier: Record<UserTier, number>;
  popularPlans: number;
  recommendedPlans: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

/**
 * 套餐管理服务类
 */
export class PlanService {
  private static instance: PlanService;

  private constructor() {}

  public static getInstance(): PlanService {
    if (!PlanService.instance) {
      PlanService.instance = new PlanService();
    }
    return PlanService.instance;
  }

  /**
   * 创建新套餐
   */
  async createPlan(request: CreatePlanRequest): Promise<PlanConfig> {
    try {
      // 验证套餐数据
      this.validateCreateRequest(request);

      // 检查套餐名称是否重复
      await this.checkPlanNameUnique(request.name);

      // 创建套餐
      const plan = await planModel.createPlan(request);

      // 记录操作日志
      console.log(`套餐创建成功: ${plan.name} (${plan.id})`);

      return plan;
    } catch (error) {
      console.error('创建套餐失败:', error);
      throw error;
    }
  }

  /**
   * 更新套餐
   */
  async updatePlan(request: UpdatePlanRequest): Promise<PlanConfig> {
    try {
      // 验证更新请求
      this.validateUpdateRequest(request);

      // 检查套餐是否存在
      const existingPlan = await planModel.getPlanById(request.id);
      if (!existingPlan) {
        throw new Error('套餐不存在');
      }

      // 如果更新名称，检查是否重复
      if (request.name && request.name !== existingPlan.name) {
        await this.checkPlanNameUnique(request.name, request.id);
      }

      // 更新套餐
      const updatedPlan = await planModel.updatePlan(request);

      // 记录操作日志
      console.log(`套餐更新成功: ${updatedPlan.name} (${updatedPlan.id})`);

      return updatedPlan;
    } catch (error) {
      console.error('更新套餐失败:', error);
      throw error;
    }
  }

  /**
   * 获取套餐详情
   */
  async getPlanById(planId: string): Promise<PlanConfig | null> {
    try {
      return await planModel.getPlanById(planId);
    } catch (error) {
      console.error('获取套餐详情失败:', error);
      return null;
    }
  }

  /**
   * 查询套餐列表
   */
  async queryPlans(options: PlanQueryOptions = {}): Promise<{
    plans: PlanConfig[];
    total: number;
    pagination?: {
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    try {
      const result = await planModel.queryPlans(options);

      // 添加分页信息
      let pagination;
      if (options.limit) {
        const page = Math.floor((options.offset || 0) / options.limit) + 1;
        const totalPages = Math.ceil(result.total / options.limit);
        pagination = {
          page,
          pageSize: options.limit,
          totalPages,
        };
      }

      return {
        ...result,
        pagination,
      };
    } catch (error) {
      console.error('查询套餐列表失败:', error);
      throw error;
    }
  }

  /**
   * 搜索套餐
   */
  async searchPlans(options: PlanSearchOptions): Promise<{
    plans: PlanConfig[];
    total: number;
    searchMeta: {
      keyword?: string;
      matchedFields: string[];
      suggestions: string[];
    };
  }> {
    try {
      // 基础查询
      let { plans, total } = await planModel.queryPlans(options);

      // 关键词搜索
      if (options.keyword) {
        const keyword = options.keyword.toLowerCase();
        plans = plans.filter(plan =>
          plan.name.toLowerCase().includes(keyword) ||
          plan.description.toLowerCase().includes(keyword) ||
          plan.metadata.marketingTags.some(tag =>
            tag.toLowerCase().includes(keyword),
          ),
        );
        total = plans.length;
      }

      // 价格范围过滤
      if (options.priceRange) {
        const { min, max } = options.priceRange;
        plans = plans.filter(plan =>
          plan.monthlyPrice >= min && plan.monthlyPrice <= max,
        );
        total = plans.length;
      }

      // 功能过滤
      if (options.features && options.features.length > 0) {
        plans = plans.filter(plan =>
          options.features!.every(feature =>
            plan.features.includes(feature as PlanFeatures),
          ),
        );
        total = plans.length;
      }

      // 权限过滤
      if (options.permissions && options.permissions.length > 0) {
        plans = plans.filter(plan =>
          permissionMapper.hasAllPermissions(plan.tier, options.permissions!),
        );
        total = plans.length;
      }

      // 生成搜索元数据
      const searchMeta = {
        keyword: options.keyword,
        matchedFields: this.getMatchedFields(plans, options.keyword),
        suggestions: this.generateSearchSuggestions(plans),
      };

      return {
        plans,
        total,
        searchMeta,
      };
    } catch (error) {
      console.error('搜索套餐失败:', error);
      throw error;
    }
  }

  /**
   * 删除套餐（软删除）
   */
  async deletePlan(planId: string): Promise<boolean> {
    try {
      // 检查套餐是否存在
      const plan = await planModel.getPlanById(planId);
      if (!plan) {
        throw new Error('套餐不存在');
      }

      // 检查是否有用户正在使用该套餐
      const hasActiveSubscriptions = await this.checkActiveSubscriptions(planId);
      if (hasActiveSubscriptions) {
        throw new Error('该套餐仍有用户在使用，无法删除');
      }

      // 执行软删除
      const success = await planModel.deletePlan(planId);

      if (success) {
        console.log(`套餐删除成功: ${plan.name} (${planId})`);
      }

      return success;
    } catch (error) {
      console.error('删除套餐失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐套餐
   */
  async getRecommendedPlans(
    currentTier?: UserTier,
    config: PlanRecommendationConfig = {
      basedOnUsage: true,
      considerBudget: false,
      includePopular: true,
      maxRecommendations: 3,
    },
  ): Promise<{
    recommendations: Array<{
      plan: PlanConfig;
      reason: string;
      score: number;
      benefits: string[];
    }>;
    alternativeOptions: PlanConfig[];
  }> {
    try {
      const allPlans = await planModel.queryPlans({
        status: 'active',
        sortBy: 'tier',
      });

      let candidatePlans = allPlans.plans;

      // 过滤当前层级以上的套餐
      if (currentTier) {
        const tierOrder = { free: 0, basic: 1, pro: 2, admin: 3 };
        const currentOrder = tierOrder[currentTier];
        candidatePlans = candidatePlans.filter(plan => {
          const planOrder = tierOrder[plan.tier];
          return planOrder > currentOrder;
        });
      }

      // 生成推荐
      const recommendations = candidatePlans
        .map(plan => ({
          plan,
          reason: this.generateRecommendationReason(plan, currentTier, config),
          score: this.calculateRecommendationScore(plan, currentTier, config),
          benefits: this.getUpgradeBenefits(plan, currentTier),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, config.maxRecommendations);

      // 获取替代选项
      const recommendedIds = recommendations.map(r => r.plan.id);
      const alternativeOptions = candidatePlans
        .filter(plan => !recommendedIds.includes(plan.id))
        .slice(0, 2);

      return {
        recommendations,
        alternativeOptions,
      };
    } catch (error) {
      console.error('获取推荐套餐失败:', error);
      throw error;
    }
  }

  /**
   * 套餐对比
   */
  async comparePlans(planIds: string[]): Promise<{
    plans: PlanConfig[];
    comparison: {
      features: Array<{
        name: string;
        plans: Record<string, boolean>;
      }>;
      quotas: Array<{
        name: string;
        plans: Record<string, string>;
      }>;
      permissions: Array<{
        category: string;
        plans: Record<string, number>;
      }>;
      pricing: Array<{
        planId: string;
        monthlyPrice: number;
        yearlyPrice?: number;
        savings: number;
      }>;
    };
  }> {
    try {
      const plans = await Promise.all(
        planIds.map(id => planModel.getPlanById(id)),
      );

      const validPlans = plans.filter(plan => plan !== null) as PlanConfig[];

      if (validPlans.length === 0) {
        throw new Error('没有找到有效的套餐');
      }

      // 生成对比数据
      const comparison = this.generatePlanComparison(validPlans);

      return {
        plans: validPlans,
        comparison,
      };
    } catch (error) {
      console.error('套餐对比失败:', error);
      throw error;
    }
  }

  /**
   * 获取套餐统计信息
   */
  async getPlanStatistics(): Promise<PlanStatistics> {
    try {
      const { plans, total } = await planModel.queryPlans({
        includeInactive: true,
      });

      const activePlans = plans.filter(plan => plan.status === 'active').length;
      const popularPlans = plans.filter(plan => plan.popular).length;
      const recommendedPlans = plans.filter(plan => plan.recommended).length;

      const plansByTier = plans.reduce((acc, plan) => {
        acc[plan.tier] = (acc[plan.tier] || 0) + 1;
        return acc;
      }, {} as Record<UserTier, number>);

      const prices = plans
        .filter(plan => plan.monthlyPrice > 0)
        .map(plan => plan.monthlyPrice);

      const averagePrice = prices.length > 0
        ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
        : 0;

      const priceRange = {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      };

      return {
        totalPlans: total,
        activePlans,
        plansByTier,
        popularPlans,
        recommendedPlans,
        averagePrice,
        priceRange,
      };
    } catch (error) {
      console.error('获取套餐统计失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新套餐状态
   */
  async batchUpdatePlanStatus(
    planIds: string[],
    status: PlanStatus,
  ): Promise<{
    success: string[];
    failed: Array<{ planId: string; error: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ planId: string; error: string }> = [];

    for (const planId of planIds) {
      try {
        await this.updatePlan({ id: planId, status });
        success.push(planId);
      } catch (error) {
        failed.push({
          planId,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return { success, failed };
  }

  // 私有方法

  /**
   * 验证创建请求
   */
  private validateCreateRequest(request: CreatePlanRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('套餐名称不能为空');
    }

    if (request.monthlyPrice < 0) {
      throw new Error('月费不能为负数');
    }

    if (request.yearlyPrice && request.yearlyPrice < 0) {
      throw new Error('年费不能为负数');
    }

    if (!request.quotas) {
      throw new Error('套餐配额不能为空');
    }

    if (!Array.isArray(request.features)) {
      throw new Error('套餐功能必须是数组');
    }
  }

  /**
   * 验证更新请求
   */
  private validateUpdateRequest(request: UpdatePlanRequest): void {
    if (!request.id) {
      throw new Error('套餐ID不能为空');
    }

    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new Error('套餐名称不能为空');
    }

    if (request.monthlyPrice !== undefined && request.monthlyPrice < 0) {
      throw new Error('月费不能为负数');
    }

    if (request.yearlyPrice !== undefined && request.yearlyPrice < 0) {
      throw new Error('年费不能为负数');
    }
  }

  /**
   * 检查套餐名称唯一性
   */
  private async checkPlanNameUnique(name: string, excludeId?: string): Promise<void> {
    const { plans } = await planModel.queryPlans({
      includeInactive: true,
    });

    const duplicate = (plans.find as any)(plan =>
      plan.name === name && plan.id !== excludeId,
    );

    if (duplicate) {
      throw new Error('套餐名称已存在');
    }
  }

  /**
   * 检查是否有活跃订阅
   */
  private async checkActiveSubscriptions(planId: string): Promise<boolean> {
    // 这里应该查询订阅数据库
    // 目前返回 false 表示没有活跃订阅
    return false;
  }

  /**
   * 生成推荐理由
   */
  private generateRecommendationReason(
    plan: PlanConfig,
    currentTier?: UserTier,
    config?: PlanRecommendationConfig,
  ): string {
    if (plan.popular && config?.includePopular) {
      return '最受用户欢迎的选择，性价比极高';
    }

    if (plan.recommended) {
      return '官方推荐套餐，功能全面';
    }

    if (currentTier === 'free' && plan.tier === 'basic') {
      return '从免费版升级的最佳选择，解锁核心功能';
    }

    if (currentTier === 'basic' && plan.tier === 'pro') {
      return '专业用户首选，享受完整功能体验';
    }

    return '适合您当前需求的套餐选择';
  }

  /**
   * 计算推荐分数
   */
  private calculateRecommendationScore(
    plan: PlanConfig,
    currentTier?: UserTier,
    config?: PlanRecommendationConfig,
  ): number {
    let score = 0;

    // 基础分数
    score += plan.sortOrder * 10;

    // 热门套餐加分
    if (plan.popular && config?.includePopular) {
      score += 30;
    }

    // 推荐套餐加分
    if (plan.recommended) {
      score += 25;
    }

    // 层级适配加分
    if (currentTier) {
      const tierOrder = { free: 0, basic: 1, pro: 2, admin: 3 };
      const currentOrder = tierOrder[currentTier];
      const planOrder = tierOrder[plan.tier];

      if (planOrder === currentOrder + 1) {
        score += 20; // 下一级套餐
      } else if (planOrder === currentOrder + 2) {
        score += 10; // 跨级套餐
      }
    }

    return score;
  }

  /**
   * 获取升级收益
   */
  private getUpgradeBenefits(plan: PlanConfig, currentTier?: UserTier): string[] {
    if (!currentTier) {
      return plan.metadata.benefits;
    }

    const comparison = planMapper.getUpgradeComparison(currentTier, plan.tier);

    const benefits: string[] = [];

    // 新功能收益
    comparison.newFeatures.forEach(feature => {
      benefits.push(`解锁${feature.name}`);
    });

    // 配额提升收益
    comparison.quotaChanges.forEach(change => {
      if (change.improvement && change.improvement !== '无变化') {
        const quotaNames = {
          dailyCreateQuota: '每日创建',
          dailyReuseQuota: '每日复用',
          maxExportsPerDay: '每日导出',
          maxGraphNodes: '知识图谱节点',
        };
        benefits.push(`${quotaNames[change.quotaType]}${change.improvement}`);
      }
    });

    return benefits.slice(0, 5); // 最多显示5个收益
  }

  /**
   * 生成套餐对比数据
   */
  private generatePlanComparison(plans: PlanConfig[]) {
    // 收集所有功能
    const allFeatures = new Set<string>();
    plans.forEach(plan => {
      plan.features.forEach(feature => allFeatures.add(feature));
    });

    // 功能对比
    const features = Array.from(allFeatures).map(featureName => ({
      name: featureName,
      plans: plans.reduce((acc, plan) => {
        acc[plan.id] = plan.features.includes(featureName as PlanFeatures);
        return acc;
      }, {} as Record<string, boolean>),
    }));

    // 配额对比
    const quotaNames = {
      dailyCreateQuota: '每日创建配额',
      dailyReuseQuota: '每日复用配额',
      maxExportsPerDay: '每日导出配额',
      maxGraphNodes: '知识图谱节点',
    };

    const quotas = Object.entries(quotaNames).map(([key, name]) => ({
      name,
      plans: plans.reduce((acc, plan) => {
        const value = plan.quotas[key as keyof PlanQuotas];
        acc[plan.id] = value === -1 ? '无限' : value.toString();
        return acc;
      }, {} as Record<string, string>),
    }));

    // 权限对比
    const permissionCategories = ['card', 'graph', 'export', 'support'];
    const permissions = permissionCategories.map(category => ({
      category,
      plans: plans.reduce((acc, plan) => {
        acc[plan.id] = permissionMapper.getPermissionLevel(
          plan.tier,
          category as any,
        );
        return acc;
      }, {} as Record<string, number>),
    }));

    // 价格对比
    const pricing = plans.map(plan => ({
      planId: plan.id,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      savings: plan.yearlyPrice ?
        Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) : 0,
    }));

    return {
      features,
      quotas,
      permissions,
      pricing,
    };
  }

  /**
   * 获取匹配字段
   */
  private getMatchedFields(plans: PlanConfig[], keyword?: string): string[] {
    if (!keyword) return [];

    const fields: string[] = [];
    const lowerKeyword = keyword.toLowerCase();

    plans.forEach(plan => {
      if (plan.name.toLowerCase().includes(lowerKeyword)) {
        fields.push('name');
      }
      if (plan.description.toLowerCase().includes(lowerKeyword)) {
        fields.push('description');
      }
      if (plan.metadata.marketingTags.some(tag =>
        tag.toLowerCase().includes(lowerKeyword),
      )) {
        fields.push('tags');
      }
    });

    return [...new Set(fields)];
  }

  /**
   * 生成搜索建议
   */
  private generateSearchSuggestions(plans: PlanConfig[]): string[] {
    const suggestions = new Set<string>();

    plans.forEach(plan => {
      suggestions.add(plan.name);
      plan.metadata.marketingTags.forEach(tag => suggestions.add(tag));
    });

    return Array.from(suggestions).slice(0, 5);
  }
}

// 导出单例实例
export const planService = PlanService.getInstance();
