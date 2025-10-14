/**
 * 配额监控服务
 * 用于监控用户配额使用情况并触发升级提示
 */

import {
  QuotaType,
  UserTier,
  SubscriptionStatus,
  Subscription,
  UpgradeRecommendation,
  QuotaLimits,
} from '@/shared/types/subscription';

import { QUOTA_THRESHOLDS } from './constants';
import { EnhancedQuotaChecker, QuotaCheckResult } from './quota-checker';
import { QuotaUsageAnalyzer } from './quota-usage';
import {
  getRecommendedUpgrade,
  calculatePriceDifference,
  calculateQuotaIncrease,
  getUserTierLabel,
} from './utils';

const mapQuotaIncrease = (
  increase: Partial<QuotaLimits>,
): UpgradeRecommendation['quotaIncrease'] => {
  const result: UpgradeRecommendation['quotaIncrease'] = {};

  if (increase.dailyCreateQuota !== undefined) {
    result.create = increase.dailyCreateQuota;
  }

  if (increase.dailyReuseQuota !== undefined) {
    result.reuse = increase.dailyReuseQuota;
  }

  if (increase.maxExportsPerDay !== undefined) {
    result.export = increase.maxExportsPerDay;
  }

  if (increase.maxGraphNodes !== undefined) {
    result.graph_nodes = increase.maxGraphNodes;
  }

  return result;
};

export interface QuotaExceededEvent {
  userId: string;
  quotaType: QuotaType;
  currentUsage: number;
  limit: number;
  timestamp: Date;
  userTier: UserTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;
}

export interface UpgradePropensityScore {
  score: number; // 0-100
  factors: string[];
  recommendation: 'none' | 'gentle' | 'aggressive';
  confidence: number; // 0-1
}

/**
 * 配额监控器类
 */
export class QuotaMonitor {
  private eventListeners: ((event: QuotaExceededEvent) => void)[] = [];
  private upgradePromptCallbacks: ((recommendation: UpgradeRecommendation) => void)[] = [];
  private quotaChecker: EnhancedQuotaChecker;
  private usageAnalyzer: QuotaUsageAnalyzer;

  constructor(
    private userId: string,
    private subscription: Subscription | null,
  ) {
    this.quotaChecker = new EnhancedQuotaChecker(userId, subscription);
    this.usageAnalyzer = new QuotaUsageAnalyzer(userId);
  }

  /**
   * 监控配额使用情况
   */
  async monitorQuotaUsage(quotaType: QuotaType): Promise<{
    canProceed: boolean;
    shouldShowUpgrade: boolean;
    recommendation?: UpgradeRecommendation;
    checkResult: QuotaCheckResult;
  }> {
    const checkResult = await this.quotaChecker.checkQuota(quotaType);

    if (!checkResult.allowed && checkResult.reason === 'quota_exceeded') {
      // 触发配额超限事件
      const event: QuotaExceededEvent = {
        userId: this.userId,
        quotaType,
        currentUsage: checkResult.usage.used,
        limit: checkResult.usage.limit,
        timestamp: new Date(),
        userTier: this.subscription?.plan || 'free',
        subscriptionStatus: this.subscription?.status || 'expired',
        subscriptionId: this.subscription?.id,
      };

      this.emitQuotaExceededEvent(event);

      // 生成升级推荐
      const recommendation = await this.generateUpgradeRecommendation(event);

      return {
        canProceed: false,
        shouldShowUpgrade: true,
        recommendation,
        checkResult,
      };
    }

    // 检查是否接近配额限制（80%以上）
    if (!checkResult.usage.isUnlimited && checkResult.usage.percentage >= QUOTA_THRESHOLDS.WARNING * 100) {
      const recommendation = await this.generatePreemptiveRecommendation(quotaType, checkResult.usage.percentage);

      return {
        canProceed: true,
        shouldShowUpgrade: true,
        recommendation,
        checkResult,
      };
    }

    return {
      canProceed: true,
      shouldShowUpgrade: false,
      checkResult,
    };
  }

  /**
   * 生成升级推荐
   */
  private async generateUpgradeRecommendation(event: QuotaExceededEvent): Promise<UpgradeRecommendation> {
    const { quotaType, userTier } = event;

    // 确定推荐的升级目标
    const recommendedTier = getRecommendedUpgrade(userTier);
    if (!recommendedTier) {
      throw new Error('No upgrade available for current tier');
    }

    // 根据配额类型生成特定的推荐内容
    const recommendations = {
      create: {
        benefits: [
          '每日创建配额大幅提升',
          '支持更多教学场景',
          '提升内容制作效率',
          '专业级创作工具',
        ],
        urgency: 'high' as const,
      },
      reuse: {
        benefits: [
          '更多复用机会',
          '快速构建知识体系',
          '提升工作效率10倍',
          '知识积累最大化',
        ],
        urgency: 'medium' as const,
      },
      export: {
        benefits: [
          '无限制图片导出',
          '高清质量保证',
          '批量导出功能',
          '多格式支持',
        ],
        urgency: 'medium' as const,
      },
      graph_nodes: {
        benefits: [
          '无限知识图谱节点',
          '高级智能分析',
          '完整知识体系构建',
          '学习路径规划',
        ],
        urgency: 'low' as const,
      },
    };

    const quotaIncreases = calculateQuotaIncrease(userTier, recommendedTier);
    const quotaIncreaseMapped = mapQuotaIncrease(quotaIncreases);
    const recommendation = recommendations[quotaType];

    return {
      currentPlan: getUserTierLabel(userTier),
      recommendedPlan: getUserTierLabel(recommendedTier),
      priceIncrease: calculatePriceDifference(userTier, recommendedTier),
      quotaIncrease: quotaIncreaseMapped,
      benefits: recommendation.benefits,
      urgency: recommendation.urgency,
    };
  }

  /**
   * 生成预防性推荐（配额接近用完时）
   */
  private async generatePreemptiveRecommendation(
    quotaType: QuotaType,
    usagePercentage: number,
  ): Promise<UpgradeRecommendation> {
    const urgency = usagePercentage >= 95 ? 'high' : usagePercentage >= 90 ? 'medium' : 'low';

    const event: QuotaExceededEvent = {
      userId: this.userId,
      quotaType,
      currentUsage: 0, // 这里不重要，主要是为了复用逻辑
      limit: 0,
      timestamp: new Date(),
      userTier: this.subscription?.plan || 'free',
      subscriptionStatus: this.subscription?.status || 'expired',
      subscriptionId: this.subscription?.id,
    };

    const recommendation = await this.generateUpgradeRecommendation(event);

    return {
      ...recommendation,
      urgency,
      benefits: [
        `避免配额用完的尴尬（当前使用率：${usagePercentage.toFixed(1)}%）`,
        ...recommendation.benefits,
      ],
    };
  }

  /**
   * 触发配额超限事件
   */
  private emitQuotaExceededEvent(event: QuotaExceededEvent) {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in quota exceeded event listener:', error);
      }
    });

    // 记录事件到分析系统
    this.trackQuotaExceededEvent(event);
  }

  /**
   * 记录配额超限事件
   */
  private async trackQuotaExceededEvent(event: QuotaExceededEvent) {
    try {
      await fetch('/api/analytics/quota-exceeded', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: event.userId,
          quotaType: event.quotaType,
          userTier: event.userTier,
          subscriptionStatus: event.subscriptionStatus,
          subscriptionId: event.subscriptionId,
          timestamp: event.timestamp.toISOString(),
          metadata: {
            currentUsage: event.currentUsage,
            limit: event.limit,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to track quota exceeded event:', error);
    }
  }

  /**
   * 添加配额超限事件监听器
   */
  onQuotaExceeded(listener: (event: QuotaExceededEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * 添加升级提示回调
   */
  onUpgradePrompt(callback: (recommendation: UpgradeRecommendation) => void): () => void {
    this.upgradePromptCallbacks.push(callback);
    return () => {
      const index = this.upgradePromptCallbacks.indexOf(callback);
      if (index > -1) {
        this.upgradePromptCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 检查用户的升级倾向
   */
  async analyzeUpgradePropensity(): Promise<UpgradePropensityScore> {
    try {
      // 获取使用模式分析
      const patterns = await this.usageAnalyzer.analyzeUsagePatterns();

      // 获取未来需求预测
      const predictions = await this.usageAnalyzer.predictFutureNeeds();

      // 计算升级倾向分数
      let score = 0;
      const factors: string[] = [];

      // 基于使用增长趋势
      if (patterns.growthTrend === 'increasing') {
        score += 30;
        factors.push('使用量持续增长');
      } else if (patterns.growthTrend === 'stable') {
        score += 10;
        factors.push('使用量稳定');
      }

      // 基于使用一致性
      if (patterns.usageConsistency > 0.7) {
        score += 20;
        factors.push('使用习惯稳定');
      }

      // 基于配额类型偏好
      if (patterns.preferredQuotaTypes.length > 2) {
        score += 15;
        factors.push('功能使用深度较高');
      }

      // 基于预测置信度
      if (predictions.confidence > 0.8) {
        score += 15;
        factors.push('需求预测可靠');
      }

      // 基于当前配额使用率
      const allQuotaStatus = await this.quotaChecker.getAllQuotaStatus();
      const highUsageTypes = Object.values(allQuotaStatus).filter(
        usage => !usage.isUnlimited && usage.percentage > 70,
      );

      if (highUsageTypes.length > 0) {
        score += 20;
        factors.push('配额使用频繁');
      }

      // 确定推荐策略
      let recommendation: 'none' | 'gentle' | 'aggressive';
      if (score >= 70) {
        recommendation = 'aggressive';
      } else if (score >= 40) {
        recommendation = 'gentle';
      } else {
        recommendation = 'none';
      }

      return {
        score: Math.min(score, 100),
        factors,
        recommendation,
        confidence: predictions.confidence,
      };
    } catch (error) {
      console.error('Failed to analyze upgrade propensity:', error);

      // 默认返回中等倾向
      return {
        score: 50,
        factors: ['配额使用频繁', '功能使用深度较高'],
        recommendation: 'gentle',
        confidence: 0.5,
      };
    }
  }

  /**
   * 智能升级时机检测
   */
  async detectOptimalUpgradeTime(): Promise<{
    isOptimalTime: boolean;
    reasons: string[];
    suggestedAction: 'upgrade_now' | 'upgrade_soon' | 'monitor' | 'no_action';
    confidence: number;
  }> {
    try {
      const propensity = await this.analyzeUpgradePropensity();
      const allQuotaStatus = await this.quotaChecker.getAllQuotaStatus();

      const reasons: string[] = [];
      let isOptimalTime = false;
      let suggestedAction: 'upgrade_now' | 'upgrade_soon' | 'monitor' | 'no_action' = 'no_action';

      // 检查是否有配额即将用完
      const criticalQuotas = Object.values(allQuotaStatus).filter(
        usage => !usage.isUnlimited && usage.percentage > 90,
      );

      if (criticalQuotas.length > 0) {
        isOptimalTime = true;
        suggestedAction = 'upgrade_now';
        reasons.push('多个配额接近用完');
      }

      // 检查升级倾向分数
      if (propensity.score > 80) {
        isOptimalTime = true;
        suggestedAction = suggestedAction === 'no_action' ? 'upgrade_now' : suggestedAction;
        reasons.push('用户升级意愿强烈');
      } else if (propensity.score > 60) {
        suggestedAction = suggestedAction === 'no_action' ? 'upgrade_soon' : suggestedAction;
        reasons.push('用户有升级潜力');
      }

      // 检查使用模式
      const patterns = await this.usageAnalyzer.analyzeUsagePatterns();
      if (patterns.growthTrend === 'increasing' && patterns.usageConsistency > 0.8) {
        suggestedAction = suggestedAction === 'no_action' ? 'monitor' : suggestedAction;
        reasons.push('使用量稳定增长');
      }

      return {
        isOptimalTime,
        reasons,
        suggestedAction,
        confidence: propensity.confidence,
      };
    } catch (error) {
      console.error('Failed to detect optimal upgrade time:', error);

      return {
        isOptimalTime: false,
        reasons: ['分析数据不足'],
        suggestedAction: 'monitor',
        confidence: 0.3,
      };
    }
  }

  /**
   * 获取个性化升级建议
   */
  async getPersonalizedUpgradeSuggestion(): Promise<{
    shouldUpgrade: boolean;
    targetTier: UserTier | null;
    reasoning: string[];
    benefits: string[];
    estimatedValue: number; // 预估价值分数 0-100
  }> {
    const currentTier = this.subscription?.plan || 'free';
    const recommendedTier = getRecommendedUpgrade(currentTier);

    if (!recommendedTier) {
      return {
        shouldUpgrade: false,
        targetTier: null,
        reasoning: ['已是最高级套餐'],
        benefits: [],
        estimatedValue: 0,
      };
    }

    const propensity = await this.analyzeUpgradePropensity();
    const optimalTime = await this.detectOptimalUpgradeTime();
    const predictions = await this.usageAnalyzer.predictFutureNeeds();

    const reasoning: string[] = [];
    const benefits: string[] = [];
    let estimatedValue = 0;

    // 基于升级倾向
    if (propensity.score > 60) {
      reasoning.push(`升级倾向分数：${propensity.score}/100`);
      estimatedValue += propensity.score * 0.4;
    }

    // 基于时机检测
    if (optimalTime.isOptimalTime) {
      reasoning.push('当前是升级的最佳时机');
      estimatedValue += 30;
    }

    // 基于预测需求
    if (predictions.confidence > 0.7) {
      reasoning.push('未来需求预测显示升级价值高');
      estimatedValue += 20;
      benefits.push('满足未来增长需求');
    }

    // 基于配额增长
    const quotaIncreases = calculateQuotaIncrease(currentTier, recommendedTier);
    if (quotaIncreases.dailyCreateQuota && quotaIncreases.dailyCreateQuota > 0) {
      benefits.push(`创建配额提升 ${quotaIncreases.dailyCreateQuota} 倍`);
    }

    const shouldUpgrade = estimatedValue > 50 && propensity.recommendation !== 'none';

    return {
      shouldUpgrade,
      targetTier: recommendedTier,
      reasoning,
      benefits,
      estimatedValue: Math.min(estimatedValue, 100),
    };
  }
}/**
 * 全
局配额监控管理器
 */
export class GlobalQuotaMonitor {
  private static instance: GlobalQuotaMonitor;
  private monitors: Map<string, QuotaMonitor> = new Map();

  static getInstance(): GlobalQuotaMonitor {
    if (!GlobalQuotaMonitor.instance) {
      GlobalQuotaMonitor.instance = new GlobalQuotaMonitor();
    }
    return GlobalQuotaMonitor.instance;
  }

  getMonitor(userId: string, subscription: Subscription | null): QuotaMonitor {
    const key = `${userId}-${subscription?.id || 'free'}`;
    if (!this.monitors.has(key)) {
      this.monitors.set(key, new QuotaMonitor(userId, subscription));
    }
    return this.monitors.get(key)!;
  }

  removeMonitor(userId: string) {
    const keysToRemove = Array.from(this.monitors.keys()).filter(key => key.startsWith(userId));
    keysToRemove.forEach(key => this.monitors.delete(key));
  }

  /**
   * 批量检查所有用户的配额状态（系统调用）
   */
  async batchCheckQuotaStatus(): Promise<{
    totalUsers: number;
    criticalUsers: string[];
    warningUsers: string[];
    errors: string[];
  }> {
    try {
      const response = await fetch('/api/admin/quota/batch-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return {
          totalUsers: result.totalUsers || 0,
          criticalUsers: result.criticalUsers || [],
          warningUsers: result.warningUsers || [],
          errors: result.errors || [],
        };
      }
    } catch (error) {
      console.error('Failed to batch check quota status:', error);
    }

    return {
      totalUsers: 0,
      criticalUsers: [],
      warningUsers: [],
      errors: ['Failed to connect to batch check service'],
    };
  }
}

/**
 * React Hook for quota monitoring
 */
export function useQuotaMonitor(
  userId: string,
  subscription: Subscription | null,
) {
  const monitor = GlobalQuotaMonitor.getInstance().getMonitor(userId, subscription);

  const checkQuotaWithUpgrade = async (quotaType: QuotaType) => {
    return monitor.monitorQuotaUsage(quotaType);
  };

  const onQuotaExceeded = (listener: (event: QuotaExceededEvent) => void) => {
    return monitor.onQuotaExceeded(listener);
  };

  const analyzeUpgradePropensity = () => {
    return monitor.analyzeUpgradePropensity();
  };

  const detectOptimalUpgradeTime = () => {
    return monitor.detectOptimalUpgradeTime();
  };

  const getPersonalizedUpgradeSuggestion = () => {
    return monitor.getPersonalizedUpgradeSuggestion();
  };

  return {
    checkQuotaWithUpgrade,
    onQuotaExceeded,
    analyzeUpgradePropensity,
    detectOptimalUpgradeTime,
    getPersonalizedUpgradeSuggestion,
  };
}

/**
 * 配额监控事件总线
 */
export class QuotaMonitorEventBus {
  private static instance: QuotaMonitorEventBus;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  static getInstance(): QuotaMonitorEventBus {
    if (!QuotaMonitorEventBus.instance) {
      QuotaMonitorEventBus.instance = new QuotaMonitorEventBus();
    }
    return QuotaMonitorEventBus.instance;
  }

  /**
   * 订阅事件
   */
  subscribe(event: string, listener: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)!.push(listener);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 发布事件
   */
  publish(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 清理所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * 配额监控指标收集器
 */
export class QuotaMonitorMetrics {
  private static instance: QuotaMonitorMetrics;
  private metrics: Map<string, any> = new Map();

  static getInstance(): QuotaMonitorMetrics {
    if (!QuotaMonitorMetrics.instance) {
      QuotaMonitorMetrics.instance = new QuotaMonitorMetrics();
    }
    return QuotaMonitorMetrics.instance;
  }

  /**
   * 记录配额检查指标
   */
  recordQuotaCheck(userId: string, quotaType: QuotaType, result: QuotaCheckResult): void {
    const key = `quota_check_${userId}_${quotaType}`;
    const now = Date.now();

    this.metrics.set(key, {
      userId,
      quotaType,
      allowed: result.allowed,
      usage: result.usage,
      timestamp: now,
      reason: result.reason,
    });
  }

  /**
   * 记录升级提示显示
   */
  recordUpgradePromptShown(userId: string, quotaType: QuotaType, recommendation: UpgradeRecommendation): void {
    const key = `upgrade_prompt_${userId}_${quotaType}_${Date.now()}`;

    this.metrics.set(key, {
      userId,
      quotaType,
      recommendation,
      timestamp: Date.now(),
      type: 'shown',
    });
  }

  /**
   * 记录升级提示点击
   */
  recordUpgradePromptClicked(userId: string, quotaType: QuotaType): void {
    const key = `upgrade_click_${userId}_${quotaType}_${Date.now()}`;

    this.metrics.set(key, {
      userId,
      quotaType,
      timestamp: Date.now(),
      type: 'clicked',
    });
  }

  /**
   * 获取指标数据
   */
  getMetrics(filter?: { userId?: string; quotaType?: QuotaType; type?: string }): any[] {
    const results: any[] = [];

    for (const [key, value] of this.metrics.entries()) {
      let include = true;

      if (filter?.userId && value.userId !== filter.userId) {
        include = false;
      }

      if (filter?.quotaType && value.quotaType !== filter.quotaType) {
        include = false;
      }

      if (filter?.type && value.type !== filter.type) {
        include = false;
      }

      if (include) {
        results.push({ key, ...value });
      }
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 清理过期指标
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.metrics.entries()) {
      if (now - value.timestamp > maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.metrics.delete(key));
  }
}
