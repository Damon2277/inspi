/**
 * 订阅管理Hook
 * 提供订阅相关的状态管理和操作方法
 */

import { useState, useEffect, useCallback } from 'react';

import {
  subscriptionService,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
} from '@/core/subscription/subscription-service';
import {
  Subscription,
  SubscriptionPlan,
  PaymentRecord,
  UserTier,
  CreatePlanRequest,
} from '@/shared/types/subscription';

interface UseSubscriptionOptions {
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface SubscriptionState {
  currentSubscription: Subscription | null;
  availablePlans: SubscriptionPlan[];
  paymentHistory: PaymentRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useSubscription({
  userId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseSubscriptionOptions) {
  const [state, setState] = useState<SubscriptionState>({
    currentSubscription: null,
    availablePlans: [],
    paymentHistory: [],
    isLoading: true,
    error: null,
  });

  const [operationLoading, setOperationLoading] = useState<{
    creating: boolean;
    updating: boolean;
    canceling: boolean;
    upgrading: boolean;
  }>({
    creating: false,
    updating: false,
    canceling: false,
    upgrading: false,
  });

  // 加载订阅数据
  const loadSubscriptionData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [subscription, plans] = await Promise.all([
        subscriptionService.getCurrentSubscription(userId),
        subscriptionService.getAvailablePlans(),
      ]);

      // 如果有订阅，加载支付历史
      let paymentHistory: PaymentRecord[] = [];
      if (subscription) {
        paymentHistory = await subscriptionService.getPaymentHistory(subscription.id);
      }

      setState({
        currentSubscription: subscription,
        availablePlans: plans,
        paymentHistory,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '加载订阅数据失败',
      }));
    }
  }, [userId]);

  // 初始加载
  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadSubscriptionData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadSubscriptionData]);

  // 创建订阅
  const createSubscription = useCallback(async (
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Promise<{
    subscription: Subscription;
    paymentInfo: any;
  }> => {
    try {
      setOperationLoading(prev => ({ ...prev, creating: true }));

      const request: CreateSubscriptionRequest = {
        userId,
        planId,
        paymentMethod: 'wechat_pay',
        billingCycle,
      };

      const result = await subscriptionService.createSubscription(request);

      // 刷新数据
      await loadSubscriptionData();

      return result;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, creating: false }));
    }
  }, [userId, loadSubscriptionData]);

  // 更新订阅
  const updateSubscription = useCallback(async (
    subscriptionId: string,
    updates: UpdateSubscriptionRequest,
  ): Promise<Subscription> => {
    try {
      setOperationLoading(prev => ({ ...prev, updating: true }));

      const updatedSubscription = await subscriptionService.updateSubscription(
        subscriptionId,
        updates,
      );

      // 更新本地状态
      setState(prev => ({ ...prev, currentSubscription: updatedSubscription }));

      return updatedSubscription;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, updating: false }));
    }
  }, []);

  // 取消订阅
  const cancelSubscription = useCallback(async (
    subscriptionId: string,
    reason?: string,
    immediate: boolean = false,
  ): Promise<Subscription> => {
    try {
      setOperationLoading(prev => ({ ...prev, canceling: true }));

      const canceledSubscription = await subscriptionService.cancelSubscription(
        subscriptionId,
        reason,
        immediate,
      );

      // 更新本地状态
      setState(prev => ({ ...prev, currentSubscription: canceledSubscription }));

      return canceledSubscription;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, canceling: false }));
    }
  }, []);

  // 升级订阅
  const upgradeSubscription = useCallback(async (
    subscriptionId: string,
    newPlanId: string,
    prorationMode: 'immediate' | 'next_cycle' = 'immediate',
  ): Promise<{
    subscription: Subscription;
    paymentInfo?: any;
    prorationAmount?: number;
  }> => {
    try {
      setOperationLoading(prev => ({ ...prev, upgrading: true }));

      const result = await subscriptionService.upgradeSubscription(
        subscriptionId,
        newPlanId,
        prorationMode,
      );

      // 更新本地状态
      setState(prev => ({ ...prev, currentSubscription: result.subscription }));

      return result;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, upgrading: false }));
    }
  }, []);

  // 降级订阅
  const downgradeSubscription = useCallback(async (
    subscriptionId: string,
    newPlanId: string,
    effectiveDate: 'immediate' | 'next_cycle' = 'next_cycle',
  ): Promise<Subscription> => {
    try {
      setOperationLoading(prev => ({ ...prev, updating: true }));

      const downgradedSubscription = await subscriptionService.downgradeSubscription(
        subscriptionId,
        newPlanId,
        effectiveDate,
      );

      // 更新本地状态
      setState(prev => ({ ...prev, currentSubscription: downgradedSubscription }));

      return downgradedSubscription;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, updating: false }));
    }
  }, []);

  // 恢复订阅
  const reactivateSubscription = useCallback(async (
    subscriptionId: string,
  ): Promise<Subscription> => {
    try {
      setOperationLoading(prev => ({ ...prev, updating: true }));

      const reactivatedSubscription = await subscriptionService.reactivateSubscription(
        subscriptionId,
      );

      // 更新本地状态
      setState(prev => ({ ...prev, currentSubscription: reactivatedSubscription }));

      return reactivatedSubscription;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, updating: false }));
    }
  }, []);

  // 获取订阅状态信息
  const getSubscriptionStatus = useCallback(async (subscriptionId?: string) => {
    const id = subscriptionId || state.currentSubscription?.id;
    if (!id) return null;

    return subscriptionService.checkSubscriptionStatus(id);
  }, [state.currentSubscription?.id]);

  // 获取使用统计
  const getUsageStatistics = useCallback(async (
    startDate?: Date,
    endDate?: Date,
  ) => {
    if (!state.currentSubscription?.id) return [];

    return subscriptionService.getUsageStatistics(
      state.currentSubscription.id,
      startDate,
      endDate,
    );
  }, [state.currentSubscription?.id]);

  // 获取订阅分析数据
  const getSubscriptionAnalytics = useCallback(async () => {
    return subscriptionService.getSubscriptionAnalytics(userId);
  }, [userId]);

  // 根据等级获取套餐
  const getPlanByTier = useCallback((tier: UserTier): SubscriptionPlan | null => {
    return state.availablePlans.find(plan => plan.tier === tier) ?? null;
  }, [state.availablePlans]);

  // 检查是否可以升级到指定等级
  const canUpgradeTo = useCallback((targetTier: UserTier): boolean => {
    if (!state.currentSubscription) return true;

    const currentTier = state.currentSubscription.tier;
    const tierOrder: UserTier[] = ['free', 'basic', 'pro', 'admin'];

    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    return targetIndex > currentIndex;
  }, [state.currentSubscription]);

  // 检查是否可以降级到指定等级
  const canDowngradeTo = useCallback((targetTier: UserTier): boolean => {
    if (!state.currentSubscription) return false;

    const currentTier = state.currentSubscription.tier;
    const tierOrder: UserTier[] = ['free', 'basic', 'pro', 'admin'];

    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    return targetIndex < currentIndex && targetIndex >= 0;
  }, [state.currentSubscription]);

  // 计算升级成本
  const calculateUpgradeCost = useCallback((targetPlanId: string): {
    monthlyIncrease: number;
    prorationAmount: number;
    totalCost: number;
  } => {
    if (!state.currentSubscription) {
      const targetPlan = state.availablePlans.find(p => p.id === targetPlanId);
      return {
        monthlyIncrease: targetPlan?.monthlyPrice || 0,
        prorationAmount: 0,
        totalCost: targetPlan?.monthlyPrice || 0,
      };
    }

    const currentPlan = state.availablePlans.find(p => p.id === state.currentSubscription.planId);
    const targetPlan = state.availablePlans.find(p => p.id === targetPlanId);

    if (!currentPlan || !targetPlan) {
      return { monthlyIncrease: 0, prorationAmount: 0, totalCost: 0 };
    }

    const monthlyIncrease = targetPlan.monthlyPrice - currentPlan.monthlyPrice;

    // 简化的按比例计算（实际应该基于剩余天数）
    const prorationAmount = monthlyIncrease * 0.5; // 假设剩余半个月

    return {
      monthlyIncrease,
      prorationAmount,
      totalCost: prorationAmount,
    };
  }, [state.currentSubscription, state.availablePlans]);

  return {
    // 状态
    subscription: state.currentSubscription,
    plans: state.availablePlans,
    paymentHistory: state.paymentHistory,
    isLoading: state.isLoading,
    error: state.error,
    operationLoading,

    // 操作方法
    createSubscription,
    updateSubscription,
    cancelSubscription,
    upgradeSubscription,
    downgradeSubscription,
    reactivateSubscription,

    // 查询方法
    getSubscriptionStatus,
    getUsageStatistics,
    getSubscriptionAnalytics,
    getPlanByTier,

    // 工具方法
    canUpgradeTo,
    canDowngradeTo,
    calculateUpgradeCost,
    refresh: loadSubscriptionData,

    // 便捷属性
    isSubscribed: !!state.currentSubscription && state.currentSubscription.status === 'active',
    currentTier: state.currentSubscription?.tier || 'free',
    isExpired: state.currentSubscription ?
      new Date(state.currentSubscription.endDate) <= new Date() : false,
    daysUntilExpiry: state.currentSubscription
      ? Math.max(
        0,
        Math.ceil(
          (new Date(state.currentSubscription.endDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
        ),
      )
      : 0,
  };
}
