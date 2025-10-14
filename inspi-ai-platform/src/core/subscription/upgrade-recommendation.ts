/**
 * 升级推荐系统
 * 智能分析用户行为，提供个性化的升级建议
 */
import {
  UpgradeRecommendation,
  UpgradePropensityScore,
  UserTier,
  QuotaType,
  SubscriptionPlan,
} from '@/shared/types/subscription';
import { logger } from '@/shared/utils/logger';

import { quotaManager } from './quota-manager';
import { subscriptionManager } from './subscription-manager';

export interface UserBehaviorData {
  userId: string
  dailyUsage: Record<QuotaType, number>
  weeklyUsage: Record<QuotaType, number>
  monthlyUsage: Record<QuotaType, number>
  quotaExceededCount: number
  lastQuotaExceededDate?: Date
  accountAge: number // 天数
  lastLoginDate: Date
  featureUsage: Record<string, number>
  engagementScore: number // 0-100
}

export interface UpgradeContext {
  currentTier: UserTier
  quotaUsage: Record<QuotaType, number>
  quotaLimits: Record<QuotaType, number>
  recentQuotaExceeded: boolean
  userBehavior: UserBehaviorData
  sessionContext?: {
    currentAction: string
    blockedByQuota: boolean
    attemptedFeature?: string
  }
}

export interface UpgradePrompt {
  id: string
  type: 'modal' | 'banner' | 'toast' | 'inline'
  urgency: 'low' | 'medium' | 'high'
  title: string
  message: string
  benefits: string[]
  cta: string
  dismissible: boolean
  showAfterDelay?: number
  maxShowCount?: number
  validUntil?: Date
}

/**
 * 升级推荐引擎类
 */
export class UpgradeRecommendationEngine {
  private readonly ENGAGEMENT_THRESHOLDS = {
    low: 30,
    medium: 60,
    high: 80,
  };

  private readonly USAGE_THRESHOLDS = {
    warning: 0.8,  // 80%使用率显示警告
    critical: 0.95, // 95%使用率显示紧急提示
  };

  /**
   * 分析用户升级倾向
   */
  async analyzeUpgradePropensity(userId: string): Promise<UpgradePropensityScore> {
    try {
      const userBehavior = await this.getUserBehaviorData(userId);
      const quotaStatus = await quotaManager.getUserQuotaStatus(userId);

      let score = 0;
      const factors: string[] = [];

      // 配额使用率分析 (40分)
      const usageScore = this.calculateUsageScore(quotaStatus, factors);
      score += usageScore;

      // 用户参与度分析 (30分)
      const engagementScore = this.calculateEngagementScore(userBehavior, factors);
      score += engagementScore;

      // 账户成熟度分析 (20分)
      const maturityScore = this.calculateMaturityScore(userBehavior, factors);
      score += maturityScore;

      // 功能使用深度分析 (10分)
      const depthScore = this.calculateDepthScore(userBehavior, factors);
      score += depthScore;

      // 确定推荐策略
      let recommendation: 'none' | 'gentle' | 'aggressive' = 'none';
      if (score >= 70) {
        recommendation = 'aggressive';
      } else if (score >= 40) {
        recommendation = 'gentle';
      }

      logger.info('Upgrade propensity analyzed', {
        userId,
        score,
        recommendation,
        factorsCount: factors.length,
      });

      return {
        score: Math.min(100, score),
        factors,
        recommendation,
      };
    } catch (error) {
      logger.error('Failed to analyze upgrade propensity', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        score: 0,
        factors: [],
        recommendation: 'none',
      };
    }
  }

  /**
   * 生成升级推荐
   */
  async generateUpgradeRecommendation(
    userId: string,
    context?: Partial<UpgradeContext>,
  ): Promise<UpgradeRecommendation | null> {
    try {
      const quotaStatus = await quotaManager.getUserQuotaStatus(userId);
      const currentPlan = await subscriptionManager.getPlanByTier(quotaStatus.tier);

      if (!currentPlan || quotaStatus.tier === 'pro') {
        return null; // 已经是最高等级
      }

      // 获取推荐的目标套餐
      const recommendedPlan = await this.getRecommendedPlan(quotaStatus.tier, context);
      if (!recommendedPlan) {
        return null;
      }

      // 计算价格差异
      const priceIncrease = recommendedPlan.monthlyPrice - currentPlan.monthlyPrice;

      // 计算配额提升
      const quotaIncrease = this.calculateQuotaIncrease(currentPlan, recommendedPlan);

      // 生成收益说明
      const benefits = this.generateBenefits(currentPlan, recommendedPlan, context);

      // 确定紧急程度
      const urgency = this.determineUrgency(quotaStatus, context);

      return {
        currentPlan: currentPlan.id,
        recommendedPlan: recommendedPlan.id,
        priceIncrease,
        quotaIncrease,
        benefits,
        urgency,
      };
    } catch (error) {
      logger.error('Failed to generate upgrade recommendation', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * 生成升级提示
   */
  async generateUpgradePrompt(
    userId: string,
    recommendation: UpgradeRecommendation,
    context?: Partial<UpgradeContext>,
  ): Promise<UpgradePrompt> {
    const promptId = this.generatePromptId();
    const propensity = await this.analyzeUpgradePropensity(userId);

    // 根据紧急程度和倾向选择提示类型
    const type = this.selectPromptType(recommendation.urgency, propensity.recommendation);

    // 生成个性化内容
    const content = this.generatePromptContent(recommendation, context);

    return {
      id: promptId,
      type,
      urgency: recommendation.urgency,
      title: content.title,
      message: content.message,
      benefits: recommendation.benefits,
      cta: content.cta,
      dismissible: recommendation.urgency !== 'high',
      showAfterDelay: this.calculateShowDelay(recommendation.urgency),
      maxShowCount: this.calculateMaxShowCount(propensity.recommendation),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时有效
    };
  }

  /**
   * 检查是否应该显示升级提示
   */
  async shouldShowUpgradePrompt(
    userId: string,
    context?: Partial<UpgradeContext>,
  ): Promise<{
    shouldShow: boolean
    prompt?: UpgradePrompt
    reason?: string
  }> {
    try {
      // 检查用户最近的提示历史
      const recentPrompts = await this.getRecentPrompts(userId);
      if (this.hasRecentPrompt(recentPrompts)) {
        return {
          shouldShow: false,
          reason: '最近已显示过升级提示',
        };
      }

      // 分析升级倾向
      const propensity = await this.analyzeUpgradePropensity(userId);
      if (propensity.score < 20) {
        return {
          shouldShow: false,
          reason: '升级倾向分数过低',
        };
      }

      // 生成推荐
      const recommendation = await this.generateUpgradeRecommendation(userId, context);
      if (!recommendation) {
        return {
          shouldShow: false,
          reason: '无可用的升级推荐',
        };
      }

      // 生成提示
      const prompt = await this.generateUpgradePrompt(userId, recommendation, context);

      // 记录提示显示
      await this.recordPromptShown(userId, prompt);

      return {
        shouldShow: true,
        prompt,
      };
    } catch (error) {
      logger.error('Failed to check upgrade prompt', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        shouldShow: false,
        reason: '检查升级提示时发生错误',
      };
    }
  }

  /**
   * 记录用户对升级提示的响应
   */
  async recordPromptResponse(
    userId: string,
    promptId: string,
    action: 'clicked' | 'dismissed' | 'ignored',
  ): Promise<void> {
    try {
      const response = {
        userId,
        promptId,
        action,
        timestamp: new Date(),
      };

      // 保存响应记录
      await this.savePromptResponse(response);

      // 更新用户行为数据
      await this.updateUserBehaviorData(userId, action);

      logger.info('Prompt response recorded', response);
    } catch (error) {
      logger.error('Failed to record prompt response', {
        userId,
        promptId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取升级转化率统计
   */
  async getUpgradeConversionStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalPrompts: number
    clickedPrompts: number
    conversions: number
    conversionRate: number
    promptTypeStats: Record<string, {
      shown: number
      clicked: number
      converted: number
    }>
  }> {
    try {
      // 这里应该从数据库查询统计数据
      return {
        totalPrompts: 0,
        clickedPrompts: 0,
        conversions: 0,
        conversionRate: 0,
        promptTypeStats: {},
      };
    } catch (error) {
      logger.error('Failed to get conversion stats', { error });
      return {
        totalPrompts: 0,
        clickedPrompts: 0,
        conversions: 0,
        conversionRate: 0,
        promptTypeStats: {},
      };
    }
  }

  /**
   * 计算使用率分数
   */
  private calculateUsageScore(
    quotaStatus: any,
    factors: string[],
  ): number {
    let score = 0;
    const quotas = quotaStatus.quotas;

    Object.entries(quotas).forEach(([type, quota]: [string, any]) => {
      if (quota.limit === -1) return; // 无限制配额跳过

      const usageRate = quota.current / quota.limit;

      if (usageRate >= this.USAGE_THRESHOLDS.critical) {
        score += 15;
        factors.push(`${type}配额使用率超过95%`);
      } else if (usageRate >= this.USAGE_THRESHOLDS.warning) {
        score += 10;
        factors.push(`${type}配额使用率超过80%`);
      } else if (usageRate >= 0.5) {
        score += 5;
        factors.push(`${type}配额使用率较高`);
      }
    });

    return Math.min(40, score);
  }

  /**
   * 计算参与度分数
   */
  private calculateEngagementScore(
    userBehavior: UserBehaviorData,
    factors: string[],
  ): number {
    let score = 0;

    if (userBehavior.engagementScore >= this.ENGAGEMENT_THRESHOLDS.high) {
      score += 30;
      factors.push('用户参与度很高');
    } else if (userBehavior.engagementScore >= this.ENGAGEMENT_THRESHOLDS.medium) {
      score += 20;
      factors.push('用户参与度中等');
    } else if (userBehavior.engagementScore >= this.ENGAGEMENT_THRESHOLDS.low) {
      score += 10;
      factors.push('用户参与度较低');
    }

    return score;
  }

  /**
   * 计算账户成熟度分数
   */
  private calculateMaturityScore(
    userBehavior: UserBehaviorData,
    factors: string[],
  ): number {
    let score = 0;

    if (userBehavior.accountAge >= 30) {
      score += 20;
      factors.push('账户使用时间较长');
    } else if (userBehavior.accountAge >= 7) {
      score += 10;
      factors.push('账户使用时间适中');
    }

    return score;
  }

  /**
   * 计算使用深度分数
   */
  private calculateDepthScore(
    userBehavior: UserBehaviorData,
    factors: string[],
  ): number {
    let score = 0;
    const featureCount = Object.keys(userBehavior.featureUsage).length;

    if (featureCount >= 5) {
      score += 10;
      factors.push('使用了多种功能');
    } else if (featureCount >= 3) {
      score += 5;
      factors.push('使用了部分功能');
    }

    return score;
  }

  /**
   * 获取推荐套餐
   */
  private async getRecommendedPlan(
    currentTier: UserTier,
    context?: Partial<UpgradeContext>,
  ): Promise<SubscriptionPlan | null> {
    const plans = await subscriptionManager.getAvailablePlans();

    // 根据当前等级推荐下一级
    const tierOrder: UserTier[] = ['free', 'basic', 'pro'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
      return null;
    }

    const nextTier = tierOrder[currentIndex + 1];
    return (plans.find as any)(plan => plan.tier === nextTier) || null;
  }

  /**
   * 计算配额提升
   */
  private calculateQuotaIncrease(
    currentPlan: SubscriptionPlan,
    recommendedPlan: SubscriptionPlan,
  ): Record<string, number> {
    const increase: Record<string, number> = {};

    if (recommendedPlan.quotas.dailyCreateQuota !== -1 && currentPlan.quotas.dailyCreateQuota !== -1) {
      increase.create = recommendedPlan.quotas.dailyCreateQuota - currentPlan.quotas.dailyCreateQuota;
    }

    if (recommendedPlan.quotas.dailyReuseQuota !== -1 && currentPlan.quotas.dailyReuseQuota !== -1) {
      increase.reuse = recommendedPlan.quotas.dailyReuseQuota - currentPlan.quotas.dailyReuseQuota;
    }

    if (recommendedPlan.quotas.maxExportsPerDay !== -1 && currentPlan.quotas.maxExportsPerDay !== -1) {
      increase.export = recommendedPlan.quotas.maxExportsPerDay - currentPlan.quotas.maxExportsPerDay;
    }

    return increase;
  }

  /**
   * 生成收益说明
   */
  private generateBenefits(
    currentPlan: SubscriptionPlan,
    recommendedPlan: SubscriptionPlan,
    context?: Partial<UpgradeContext>,
  ): string[] {
    const benefits: string[] = [];

    // 配额提升收益
    const quotaIncrease = this.calculateQuotaIncrease(currentPlan, recommendedPlan);
    Object.entries(quotaIncrease).forEach(([type, increase]) => {
      if (increase > 0) {
        benefits.push(`每日${type}配额增加${increase}次`);
      }
    });

    // 功能收益
    const newFeatures = recommendedPlan.features.filter(
      feature => !currentPlan.features.includes(feature),
    );
    benefits.push(...newFeatures);

    return benefits;
  }

  /**
   * 确定紧急程度
   */
  private determineUrgency(
    quotaStatus: any,
    context?: Partial<UpgradeContext>,
  ): 'low' | 'medium' | 'high' {
    // 如果当前操作被配额阻塞，紧急程度高
    if (context?.sessionContext?.blockedByQuota) {
      return 'high';
    }

    // 检查配额使用率
    const quotas = quotaStatus.quotas;
    let highUsageCount = 0;

    Object.values(quotas).forEach((quota: any) => {
      if (quota.limit !== -1) {
        const usageRate = quota.current / quota.limit;
        if (usageRate >= this.USAGE_THRESHOLDS.critical) {
          highUsageCount++;
        }
      }
    });

    if (highUsageCount >= 2) {
      return 'high';
    } else if (highUsageCount >= 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 选择提示类型
   */
  private selectPromptType(
    urgency: 'low' | 'medium' | 'high',
    recommendation: 'none' | 'gentle' | 'aggressive',
  ): 'modal' | 'banner' | 'toast' | 'inline' {
    if (urgency === 'high') {
      return 'modal';
    } else if (urgency === 'medium' && recommendation === 'aggressive') {
      return 'banner';
    } else if (recommendation === 'gentle') {
      return 'toast';
    }

    return 'inline';
  }

  /**
   * 生成提示内容
   */
  private generatePromptContent(
    recommendation: UpgradeRecommendation,
    context?: Partial<UpgradeContext>,
  ): { title: string; message: string; cta: string } {
    const templates = {
      high: {
        title: '配额已用完',
        message: '您的配额已达到上限，升级后可继续使用更多功能',
        cta: '立即升级',
      },
      medium: {
        title: '配额即将用完',
        message: '您的使用量很高，升级可获得更多配额和功能',
        cta: '了解升级',
      },
      low: {
        title: '发现更多可能',
        message: '升级可解锁更多强大功能，提升您的使用体验',
        cta: '查看套餐',
      },
    };

    return templates[recommendation.urgency];
  }

  /**
   * 计算显示延迟
   */
  private calculateShowDelay(urgency: 'low' | 'medium' | 'high'): number {
    switch (urgency) {
      case 'high': return 0;      // 立即显示
      case 'medium': return 2000; // 2秒后显示
      case 'low': return 5000;    // 5秒后显示
    }
  }

  /**
   * 计算最大显示次数
   */
  private calculateMaxShowCount(recommendation: 'none' | 'gentle' | 'aggressive'): number {
    switch (recommendation) {
      case 'aggressive': return 5;
      case 'gentle': return 3;
      default: return 1;
    }
  }

  /**
   * 生成提示ID
   */
  private generatePromptId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取用户行为数据（模拟实现）
   */
  private async getUserBehaviorData(userId: string): Promise<UserBehaviorData> {
    // 这里应该从数据库或分析服务获取真实数据
    return {
      userId,
      dailyUsage: { create: 5, reuse: 2, export: 10, graph_nodes: 30 },
      weeklyUsage: { create: 25, reuse: 8, export: 45, graph_nodes: 150 },
      monthlyUsage: { create: 80, reuse: 25, export: 180, graph_nodes: 500 },
      quotaExceededCount: 3,
      lastQuotaExceededDate: new Date(),
      accountAge: 15,
      lastLoginDate: new Date(),
      featureUsage: { 'knowledge-graph': 10, 'ai-generation': 20, 'export': 15 },
      engagementScore: 75,
    };
  }

  /**
   * 获取最近的提示记录
   */
  private async getRecentPrompts(userId: string): Promise<any[]> {
    // 这里应该从数据库查询最近的提示记录
    return [];
  }

  /**
   * 检查是否有最近的提示
   */
  private hasRecentPrompt(recentPrompts: any[]): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return recentPrompts.some(prompt => new Date(prompt.timestamp) > oneDayAgo);
  }

  /**
   * 记录提示显示
   */
  private async recordPromptShown(userId: string, prompt: UpgradePrompt): Promise<void> {
    // 这里应该保存到数据库
    logger.info('Prompt shown recorded', { userId, promptId: prompt.id });
  }

  /**
   * 保存提示响应
   */
  private async savePromptResponse(response: any): Promise<void> {
    // 这里应该保存到数据库
    logger.info('Prompt response saved', response);
  }

  /**
   * 更新用户行为数据
   */
  private async updateUserBehaviorData(userId: string, action: string): Promise<void> {
    // 这里应该更新用户行为分析数据
    logger.info('User behavior updated', { userId, action });
  }
}

// 单例实例
export const upgradeRecommendationEngine = new UpgradeRecommendationEngine();
export default upgradeRecommendationEngine;
