/**
 * 智能升级推荐引擎
 * 根据用户行为和使用模式生成个性化升级建议
 */

import {
  QuotaType,
  UserTier,
  UpgradeRecommendation,
  QuotaExceededEvent,
  UpgradePropensityScore,
} from '@/shared/types/subscription';

import { DEFAULT_PLANS } from './constants';
import { calculateQuotaUsagePercentage } from './utils';

export interface UserBehaviorData {
  userId: string;
  tier: UserTier;
  registrationDate: Date;
  lastActiveDate: Date;

  // 使用统计
  totalSessions: number;
  averageSessionDuration: number; // 分钟
  dailyActiveStreak: number; // 连续活跃天数

  // 配额使用模式
  quotaUsageHistory: {
    date: string;
    create: number;
    reuse: number;
    export: number;
    graph_nodes: number;
  }[];

  // 功能使用偏好
  featureUsage: {
    cardCreation: number;
    templateReuse: number;
    imageExport: number;
    knowledgeGraph: number;
    sharing: number;
  };

  // 升级相关行为
  upgradePromptViews: number;
  upgradePromptDismissals: number;
  pricingPageVisits: number;
  lastUpgradePromptDate?: Date;
}

export interface UpgradeContext {
  quotaType: QuotaType;
  currentUsage: number;
  limit: number;
  usagePercentage: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
  isRecurringUser: boolean;
  hasRecentActivity: boolean;
}

/**
 * 智能升级推荐引擎
 */
export class UpgradeRecommendationEngine {
  /**
   * 生成个性化升级推荐
   */
  static generateRecommendation(
    behaviorData: UserBehaviorData,
    context: UpgradeContext,
  ): UpgradeRecommendation {
    const propensityScore = this.calculateUpgradePropensity(behaviorData, context);
    const recommendedTier = this.determineRecommendedTier(behaviorData, context);
    const currentPlan = (DEFAULT_PLANS.find as any)(p => p.tier === behaviorData.tier);
    const targetPlan = (DEFAULT_PLANS.find as any)(p => p.tier === recommendedTier);

    if (!currentPlan || !targetPlan) {
      throw new Error('Plan configuration not found');
    }

    return {
      currentPlan: currentPlan.displayName,
      recommendedPlan: targetPlan.displayName,
      priceIncrease: targetPlan.monthlyPrice - currentPlan.monthlyPrice,
      quotaIncrease: this.calculateQuotaIncrease(behaviorData.tier, recommendedTier),
      benefits: this.generatePersonalizedBenefits(behaviorData, context, recommendedTier),
      urgency: this.determineUrgency(propensityScore, context),
    };
  }

  /**
   * 计算升级倾向分数
   */
  static calculateUpgradePropensity(
    behaviorData: UserBehaviorData,
    context: UpgradeContext,
  ): UpgradePropensityScore {
    let score = 0;
    const factors: string[] = [];

    // 基础分数：配额使用率
    const usageScore = Math.min(context.usagePercentage, 100) * 0.4;
    score += usageScore;
    if (context.usagePercentage >= 80) {
      factors.push('配额使用率高');
    }

    // 活跃度分数
    const activityScore = Math.min(behaviorData.dailyActiveStreak / 7, 1) * 20;
    score += activityScore;
    if (behaviorData.dailyActiveStreak >= 7) {
      factors.push('持续活跃用户');
    }

    // 功能使用深度分数
    const featureUsageScore = this.calculateFeatureUsageScore(behaviorData) * 15;
    score += featureUsageScore;
    if (featureUsageScore > 10) {
      factors.push('功能使用深度高');
    }

    // 会话质量分数
    const sessionScore = Math.min(behaviorData.averageSessionDuration / 30, 1) * 10;
    score += sessionScore;
    if (behaviorData.averageSessionDuration > 20) {
      factors.push('会话时长较长');
    }

    // 历史配额使用模式分数
    const historyScore = this.calculateHistoryScore(behaviorData) * 10;
    score += historyScore;
    if (historyScore > 5) {
      factors.push('配额使用趋势上升');
    }

    // 时间因素调整
    const timeAdjustment = this.getTimeBasedAdjustment(context);
    score += timeAdjustment;

    // 用户生命周期调整
    const lifecycleAdjustment = this.getLifecycleAdjustment(behaviorData);
    score += lifecycleAdjustment;

    // 升级抗性调整（如果用户经常忽略升级提示）
    const resistanceAdjustment = this.getResistanceAdjustment(behaviorData);
    score -= resistanceAdjustment;
    if (resistanceAdjustment > 5) {
      factors.push('对升级提示较为抗拒');
    }

    // 确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score));

    // 确定推荐策略
    let recommendation: 'none' | 'gentle' | 'aggressive';
    if (score < 30) {
      recommendation = 'none';
    } else if (score < 70) {
      recommendation = 'gentle';
    } else {
      recommendation = 'aggressive';
    }

    return {
      score: Math.round(score),
      factors,
      recommendation,
    };
  }

  /**
   * 确定推荐的升级目标
   */
  private static determineRecommendedTier(
    behaviorData: UserBehaviorData,
    context: UpgradeContext,
  ): UserTier {
    const currentTier = behaviorData.tier;

    // 如果已经是最高级，返回当前级别
    if (currentTier === 'pro' || currentTier === 'admin') {
      return currentTier;
    }

    // 分析用户使用模式
    const isHeavyUser = this.isHeavyUser(behaviorData);
    const isProfessionalUser = this.isProfessionalUser(behaviorData);
    const hasGrowthPotential = this.hasGrowthPotential(behaviorData);

    // 决策逻辑
    if (currentTier === 'free') {
      if (isProfessionalUser || (isHeavyUser && hasGrowthPotential)) {
        return 'pro';
      } else {
        return 'basic';
      }
    } else if (currentTier === 'basic') {
      if (isProfessionalUser || isHeavyUser) {
        return 'pro';
      }
    }

    // 默认升级一级
    const tierOrder: UserTier[] = ['free', 'basic', 'pro'];
    const currentIndex = tierOrder.indexOf(currentTier);
    return tierOrder[Math.min(currentIndex + 1, tierOrder.length - 1)];
  }

  /**
   * 生成个性化收益说明
   */
  private static generatePersonalizedBenefits(
    behaviorData: UserBehaviorData,
    context: UpgradeContext,
    targetTier: UserTier,
  ): string[] {
    const benefits: string[] = [];
    const featureUsage = behaviorData.featureUsage;

    // 基于用户使用偏好生成收益
    if (featureUsage.cardCreation > featureUsage.templateReuse) {
      benefits.push('大幅提升创作配额，释放创意潜能');
    } else {
      benefits.push('更多模板复用机会，快速构建内容');
    }

    if (featureUsage.imageExport > 10) {
      benefits.push('无限制高清导出，专业品质保证');
    }

    if (featureUsage.knowledgeGraph > 5) {
      benefits.push('构建完整知识图谱，系统化管理知识');
    }

    if (featureUsage.sharing > 3) {
      benefits.push('高级分享功能，扩大影响力');
    }

    // 基于使用模式添加收益
    if (behaviorData.dailyActiveStreak > 7) {
      benefits.push('专为活跃用户设计的高效工具');
    }

    if (behaviorData.averageSessionDuration > 30) {
      benefits.push('深度工作模式，提升专注效率');
    }

    // 基于目标等级添加特定收益
    if (targetTier === 'pro') {
      benefits.push('品牌定制功能，打造专业形象');
      benefits.push('数据分析报告，洞察使用趋势');
      benefits.push('优先客服支持，问题快速解决');
    }

    // 确保至少有4个收益点
    while (benefits.length < 4) {
      const additionalBenefits = [
        '提升工作效率，节省宝贵时间',
        '解锁高级功能，体验更多可能',
        '享受优质服务，获得更好体验',
        '支持产品发展，获得持续更新',
      ];

      for (const benefit of additionalBenefits) {
        if (!benefits.includes(benefit) && benefits.length < 4) {
          benefits.push(benefit);
        }
      }
    }

    return benefits.slice(0, 6); // 最多返回6个收益点
  }

  /**
   * 确定升级紧急程度
   */
  private static determineUrgency(
    propensityScore: UpgradePropensityScore,
    context: UpgradeContext,
  ): 'low' | 'medium' | 'high' {
    // 配额已用完 = 高紧急
    if (context.usagePercentage >= 100) {
      return 'high';
    }

    // 配额使用率 > 90% 且升级倾向高 = 高紧急
    if (context.usagePercentage > 90 && propensityScore.score > 70) {
      return 'high';
    }

    // 配额使用率 > 80% 或升级倾向中等 = 中等紧急
    if (context.usagePercentage > 80 || propensityScore.score > 50) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 计算配额提升
   */
  private static calculateQuotaIncrease(fromTier: UserTier, toTier: UserTier) {
    const fromPlan = (DEFAULT_PLANS.find as any)(p => p.tier === fromTier);
    const toPlan = (DEFAULT_PLANS.find as any)(p => p.tier === toTier);

    if (!fromPlan || !toPlan) {
      return {};
    }

    return {
      create: toPlan.quotas.dailyCreateQuota === -1 ?
        Infinity :
        toPlan.quotas.dailyCreateQuota - fromPlan.quotas.dailyCreateQuota,
      reuse: toPlan.quotas.dailyReuseQuota === -1 ?
        Infinity :
        toPlan.quotas.dailyReuseQuota - fromPlan.quotas.dailyReuseQuota,
      export: toPlan.quotas.maxExportsPerDay === -1 ?
        Infinity :
        toPlan.quotas.maxExportsPerDay - fromPlan.quotas.maxExportsPerDay,
    };
  }

  /**
   * 计算功能使用深度分数
   */
  private static calculateFeatureUsageScore(behaviorData: UserBehaviorData): number {
    const usage = behaviorData.featureUsage;
    const totalUsage = Object.values(usage).reduce((sum, count) => sum + count, 0);
    const uniqueFeatures = Object.values(usage).filter(count => count > 0).length;

    // 综合考虑使用总量和功能覆盖度
    return Math.min(totalUsage / 10, 5) + Math.min(uniqueFeatures * 2, 10);
  }

  /**
   * 计算历史使用模式分数
   */
  private static calculateHistoryScore(behaviorData: UserBehaviorData): number {
    const history = behaviorData.quotaUsageHistory;
    if (history.length < 3) return 0;

    // 计算使用量趋势
    const recent = history.slice(-7); // 最近7天
    const earlier = history.slice(-14, -7); // 之前7天

    const recentAvg = recent.reduce((sum, day) =>
      sum + day.create + day.reuse + day.export, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, day) =>
      sum + day.create + day.reuse + day.export, 0) / earlier.length;

    // 如果使用量呈上升趋势，返回更高分数
    if (recentAvg > earlierAvg * 1.2) {
      return 10;
    } else if (recentAvg > earlierAvg) {
      return 5;
    }

    return 0;
  }

  /**
   * 获取基于时间的调整分数
   */
  private static getTimeBasedAdjustment(context: UpgradeContext): number {
    let adjustment = 0;

    // 工作时间更容易升级
    if (context.timeOfDay === 'morning' || context.timeOfDay === 'afternoon') {
      adjustment += 2;
    }

    // 工作日更容易升级
    if (context.dayOfWeek === 'weekday') {
      adjustment += 1;
    }

    return adjustment;
  }

  /**
   * 获取用户生命周期调整分数
   */
  private static getLifecycleAdjustment(behaviorData: UserBehaviorData): number {
    const daysSinceRegistration = Math.floor(
      (Date.now() - behaviorData.registrationDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 新用户（7-30天）更容易升级
    if (daysSinceRegistration >= 7 && daysSinceRegistration <= 30) {
      return 5;
    }

    // 老用户（30-90天）需要更强的动机
    if (daysSinceRegistration > 30 && daysSinceRegistration <= 90) {
      return 2;
    }

    // 非常老的用户较难转化
    if (daysSinceRegistration > 90) {
      return -2;
    }

    return 0;
  }

  /**
   * 获取升级抗性调整分数
   */
  private static getResistanceAdjustment(behaviorData: UserBehaviorData): number {
    const dismissalRate = behaviorData.upgradePromptViews > 0 ?
      behaviorData.upgradePromptDismissals / behaviorData.upgradePromptViews : 0;

    // 如果用户经常忽略升级提示，降低推荐强度
    if (dismissalRate > 0.8) {
      return 15;
    } else if (dismissalRate > 0.5) {
      return 8;
    } else if (dismissalRate > 0.3) {
      return 3;
    }

    return 0;
  }

  /**
   * 判断是否为重度用户
   */
  private static isHeavyUser(behaviorData: UserBehaviorData): boolean {
    const totalUsage = Object.values(behaviorData.featureUsage)
      .reduce((sum, count) => sum + count, 0);

    return totalUsage > 50 && behaviorData.dailyActiveStreak > 5;
  }

  /**
   * 判断是否为专业用户
   */
  private static isProfessionalUser(behaviorData: UserBehaviorData): boolean {
    const usage = behaviorData.featureUsage;

    // 专业用户特征：高频使用多种功能，会话时间长
    return usage.cardCreation > 20 &&
           usage.knowledgeGraph > 10 &&
           behaviorData.averageSessionDuration > 25;
  }

  /**
   * 判断是否有增长潜力
   */
  private static hasGrowthPotential(behaviorData: UserBehaviorData): boolean {
    // 基于使用趋势和活跃度判断
    return behaviorData.dailyActiveStreak > 3 &&
           behaviorData.totalSessions > 10 &&
           behaviorData.pricingPageVisits > 0;
  }

  /**
   * 生成预防性升级推荐（在配额接近用完时）
   */
  static generatePreventiveRecommendation(
    behaviorData: UserBehaviorData,
    context: UpgradeContext,
  ): UpgradeRecommendation | null {
    // 只在配额使用率达到80%以上时生成预防性推荐
    if (context.usagePercentage < 80) {
      return null;
    }

    const propensityScore = this.calculateUpgradePropensity(behaviorData, context);

    // 如果升级倾向太低，不显示预防性推荐
    if (propensityScore.score < 40) {
      return null;
    }

    const recommendation = this.generateRecommendation(behaviorData, context);

    // 调整紧急程度为较低（因为还没有完全用完）
    return {
      ...recommendation,
      urgency: context.usagePercentage > 95 ? 'high' : 'medium',
      benefits: [
        '避免配额用完的尴尬',
        ...recommendation.benefits.slice(0, 5),
      ],
    };
  }
}
