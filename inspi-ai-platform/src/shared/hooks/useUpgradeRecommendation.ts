/**
 * 升级推荐Hook
 * 集成配额监控和智能推荐引擎
 */

import { useState, useEffect, useCallback } from 'react';

import { useQuotaMonitor } from '@/core/subscription/quota-monitor';
import {
  UpgradeRecommendationEngine,
  UserBehaviorData,
  UpgradeContext,
} from '@/core/subscription/upgrade-engine';
import { useUpgradePrompt } from '@/features/subscription/UpgradePrompt';
import { QuotaType, UserTier, UpgradeRecommendation } from '@/shared/types/subscription';

interface UseUpgradeRecommendationOptions {
  userId: string;
  currentTier: UserTier;
  onUpgrade?: (targetTier: UserTier) => void;
  enablePreventivePrompts?: boolean;
  enableSmartTiming?: boolean;
}

export function useUpgradeRecommendation({
  userId,
  currentTier,
  onUpgrade,
  enablePreventivePrompts = true,
  enableSmartTiming = true,
}: UseUpgradeRecommendationOptions) {
  const [behaviorData, setBehaviorData] = useState<UserBehaviorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPromptTime, setLastPromptTime] = useState<Date | null>(null);

  const { showPrompt, hidePrompt, UpgradePromptComponent } = useUpgradePrompt();

  const loadUserBehaviorData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchUserBehaviorData(userId);
      setBehaviorData(data);
    } catch (error) {
      console.error('Failed to load user behavior data:', error);
      // 使用默认数据
      setBehaviorData(createDefaultBehaviorData(userId, currentTier));
    } finally {
      setIsLoading(false);
    }
  }, [currentTier, userId]);

  // 加载用户行为数据
  useEffect(() => {
    loadUserBehaviorData();
  }, [loadUserBehaviorData]);

  // 检查是否应该显示升级提示
  const checkUpgradeRecommendation = useCallback(async (
    quotaType: QuotaType,
    currentUsage: number,
    limit: number,
  ) => {
    if (!behaviorData || isLoading) return false;

    // 检查冷却时间（避免频繁提示）
    if (lastPromptTime && shouldRespectCooldown(lastPromptTime, behaviorData)) {
      return false;
    }

    const context = createUpgradeContext(quotaType, currentUsage, limit);
    const usagePercentage = (currentUsage / limit) * 100;

    // 配额已用完 - 立即显示升级提示
    if (usagePercentage >= 100) {
      const recommendation = UpgradeRecommendationEngine.generateRecommendation(
        behaviorData,
        context,
      );

      showUpgradePrompt(quotaType, currentUsage, limit, recommendation);
      setLastPromptTime(new Date());
      trackUpgradePromptShown(quotaType, 'quota_exceeded');
      return true;
    }

    // 预防性提示（配额接近用完）
    if (enablePreventivePrompts && usagePercentage >= 80) {
      const recommendation = UpgradeRecommendationEngine.generatePreventiveRecommendation(
        behaviorData,
        context,
      );

      if (recommendation && shouldShowPreventivePrompt(recommendation, context)) {
        showUpgradePrompt(quotaType, currentUsage, limit, recommendation);
        setLastPromptTime(new Date());
        trackUpgradePromptShown(quotaType, 'preventive');
        return true;
      }
    }

    return false;
  }, [behaviorData, enablePreventivePrompts, isLoading, lastPromptTime, showUpgradePrompt]);

  // 智能时机推荐（基于用户行为模式）
  const checkSmartTimingRecommendation = useCallback(async () => {
    if (!behaviorData || !enableSmartTiming) return false;

    const context = createCurrentContext();
    const propensityScore = UpgradeRecommendationEngine.calculateUpgradePropensity(
      behaviorData,
      context,
    );

    // 只在高倾向分数且合适时机时显示
    if (propensityScore.score > 75 && isOptimalTiming(context, behaviorData)) {
      const recommendation = UpgradeRecommendationEngine.generateRecommendation(
        behaviorData,
        context,
      );

      showUpgradePrompt('create', 0, 0, recommendation); // 使用默认配额类型
      setLastPromptTime(new Date());
      trackUpgradePromptShown('create', 'smart_timing');
      return true;
    }

    return false;
  }, [behaviorData, enableSmartTiming, showUpgradePrompt]);

  // 显示升级提示
  const showUpgradePrompt = useCallback((
    quotaType: QuotaType,
    currentUsage: number,
    limit: number,
    recommendation: UpgradeRecommendation,
  ) => {
    showPrompt(quotaType, currentUsage, limit, currentTier, recommendation);
  }, [currentTier, showPrompt]);

  // 手动触发升级推荐
  const triggerUpgradeRecommendation = useCallback(async (
    quotaType: QuotaType = 'create',
    currentUsage: number = 0,
    limit: number = 0,
  ) => {
    if (!behaviorData) return;

    const context = createUpgradeContext(quotaType, currentUsage, limit);
    const recommendation = UpgradeRecommendationEngine.generateRecommendation(
      behaviorData,
      context,
    );

    showUpgradePrompt(quotaType, currentUsage, limit, recommendation);
    trackUpgradePromptShown(quotaType, 'manual');
  }, [behaviorData, showUpgradePrompt]);

  // 更新用户行为数据
  const updateBehaviorData = useCallback((updates: Partial<UserBehaviorData>) => {
    setBehaviorData(prev => (prev ? { ...prev, ...updates } : prev));
  }, []);

  // 记录用户交互
  const recordUserInteraction = useCallback(async (
    action: 'prompt_viewed' | 'prompt_dismissed' | 'upgrade_clicked' | 'pricing_visited',
  ) => {
    if (!behaviorData) return;

    const updates: Partial<UserBehaviorData> = {};

    switch (action) {
      case 'prompt_viewed':
        updates.upgradePromptViews = behaviorData.upgradePromptViews + 1;
        break;
      case 'prompt_dismissed':
        updates.upgradePromptDismissals = behaviorData.upgradePromptDismissals + 1;
        break;
      case 'pricing_visited':
        updates.pricingPageVisits = behaviorData.pricingPageVisits + 1;
        break;
    }

    updateBehaviorData(updates);

    // 同步到后端
    try {
      await fetch('/api/user/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, timestamp: new Date() }),
      });
    } catch (error) {
      console.error('Failed to record user interaction:', error);
    }
  }, [behaviorData, userId, updateBehaviorData]);

  return {
    // 状态
    isLoading,
    behaviorData,

    // 方法
    checkUpgradeRecommendation,
    checkSmartTimingRecommendation,
    triggerUpgradeRecommendation,
    recordUserInteraction,
    updateBehaviorData,

    // 组件
    UpgradePromptComponent,
  };
}

// 辅助函数

async function fetchUserBehaviorData(userId: string): Promise<UserBehaviorData> {
  const response = await fetch(`/api/user/behavior?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user behavior data');
  }
  return response.json();
}

function createDefaultBehaviorData(userId: string, tier: UserTier): UserBehaviorData {
  return {
    userId,
    tier,
    registrationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
    lastActiveDate: new Date(),
    totalSessions: 5,
    averageSessionDuration: 15,
    dailyActiveStreak: 3,
    quotaUsageHistory: [],
    featureUsage: {
      cardCreation: 10,
      templateReuse: 3,
      imageExport: 5,
      knowledgeGraph: 2,
      sharing: 1,
    },
    upgradePromptViews: 0,
    upgradePromptDismissals: 0,
    pricingPageVisits: 0,
  };
}

function createUpgradeContext(
  quotaType: QuotaType,
  currentUsage: number,
  limit: number,
): UpgradeContext {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 6 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';

  return {
    quotaType,
    currentUsage,
    limit,
    usagePercentage: limit > 0 ? (currentUsage / limit) * 100 : 0,
    timeOfDay,
    dayOfWeek: dayOfWeek >= 1 && dayOfWeek <= 5 ? 'weekday' : 'weekend',
    isRecurringUser: true, // 简化实现
    hasRecentActivity: true, // 简化实现
  };
}

function createCurrentContext(): UpgradeContext {
  return createUpgradeContext('create', 0, 0);
}

function shouldRespectCooldown(lastPromptTime: Date, behaviorData: UserBehaviorData): boolean {
  const hoursSinceLastPrompt = (Date.now() - lastPromptTime.getTime()) / (1000 * 60 * 60);

  // 基于用户的抗性调整冷却时间
  const dismissalRate = behaviorData.upgradePromptViews > 0 ?
    behaviorData.upgradePromptDismissals / behaviorData.upgradePromptViews : 0;

  let cooldownHours = 4; // 默认4小时
  if (dismissalRate > 0.7) cooldownHours = 24; // 高抗性用户24小时
  else if (dismissalRate > 0.5) cooldownHours = 12; // 中等抗性用户12小时

  return hoursSinceLastPrompt < cooldownHours;
}

function shouldShowPreventivePrompt(
  recommendation: UpgradeRecommendation,
  context: UpgradeContext,
): boolean {
  // 只在推荐强度足够且时机合适时显示预防性提示
  return recommendation.urgency !== 'low' &&
         (context.timeOfDay === 'morning' || context.timeOfDay === 'afternoon');
}

function isOptimalTiming(context: UpgradeContext, behaviorData: UserBehaviorData): boolean {
  // 工作时间 + 工作日 + 用户活跃
  return context.timeOfDay === 'morning' || context.timeOfDay === 'afternoon' &&
         context.dayOfWeek === 'weekday' &&
         behaviorData.dailyActiveStreak > 2;
}

async function trackUpgradePromptShown(
  quotaType: QuotaType,
  trigger: 'quota_exceeded' | 'preventive' | 'smart_timing' | 'manual',
) {
  try {
    await fetch('/api/analytics/upgrade-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quotaType,
        trigger,
        timestamp: new Date(),
      }),
    });
  } catch (error) {
    console.error('Failed to track upgrade prompt:', error);
  }
}
