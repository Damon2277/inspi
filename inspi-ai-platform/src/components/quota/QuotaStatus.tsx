'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import type { SubscriptionStatus, UserRole } from '@/core/auth/roles';
import { QuotaUsage, QuotaChecker, QuotaType } from '@/lib/quota/quota-checker';
import { useAuthContext } from '@/shared/contexts/AuthContext';
import type { User } from '@/shared/hooks/useAuth';

interface QuotaStatusProps {
  className?: string;
  showUpgradeButton?: boolean;
  compact?: boolean;
}

const resolveUserRole = (user: User | null): UserRole => {
  if (!user) return 'free';
  if (user.roles?.includes('admin')) return 'admin';
  if (user.roles?.includes('pro')) return 'pro';
  if (user.roles?.includes('basic')) return 'basic';

  const plan = user.subscription?.plan;
  if (plan === 'pro' || plan === 'super') return 'pro';
  return 'free';
};

const resolveSubscriptionStatus = (user: User | null): SubscriptionStatus =>
  user?.subscription?.isActive ? 'active' : 'expired';

const resolveUserId = (user: User | null): string => {
  if (!user) return '';
  return user._id || (user as unknown as { id?: string }).id || '';
};

export function QuotaStatus({
  className = '',
  showUpgradeButton = true,
  compact = false,
}: QuotaStatusProps) {
  const { user, isAuthenticated } = useAuthContext();
  const [quotaStatus, setQuotaStatus] = useState<Partial<Record<QuotaType, QuotaUsage>> | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = resolveUserRole(user);
  const subscriptionStatus = resolveSubscriptionStatus(user);
  const userId = resolveUserId(user);

  const loadQuotaStatus = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setQuotaStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const checker = new QuotaChecker(userId, userRole, subscriptionStatus);

    try {
      const status = await checker.getAllQuotaStatus();
      setQuotaStatus(status as Partial<Record<QuotaType, QuotaUsage>>);
    } catch (error) {
      console.error('Failed to load quota status:', error);
      setQuotaStatus(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userId, userRole, subscriptionStatus]);

  useEffect(() => {
    loadQuotaStatus();
  }, [loadQuotaStatus]);

  const subscriptionPlan = user.subscription?.plan ?? 'free';
  const planLabel = useMemo(() => {
    if (subscriptionPlan === 'pro' || subscriptionPlan === 'super') {
      return '专业版';
    }
    return '免费版';
  }, [subscriptionPlan]);
  const shouldShowUpgrade = showUpgradeButton && subscriptionPlan === 'free';

  if (!isAuthenticated || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (!quotaStatus) {
    return null;
  }

  const createQuota = quotaStatus.create;
  const reuseQuota = quotaStatus.reuse;

  if (!createQuota || !reuseQuota) {
    return null;
  }

  // 计算配额使用百分比
  const getUsagePercentage = (usage: QuotaUsage) => {
    if (usage.isUnlimited || !Number.isFinite(usage.limit) || usage.limit === 0) return 0;
    return Math.min((usage.used / usage.limit) * 100, 100);
  };

  // 获取配额状态颜色
  const getStatusColor = (usage: QuotaUsage) => {
    if (usage.isUnlimited) return 'text-green-600';
    const percentage = getUsagePercentage(usage);
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 获取进度条颜色
  const getProgressColor = (usage: QuotaUsage) => {
    if (usage.isUnlimited) return 'bg-green-500';
    const percentage = getUsagePercentage(usage);
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 格式化配额显示
  const formatQuota = (usage: QuotaUsage) => {
    if (usage.isUnlimited || !Number.isFinite(usage.limit)) return '无限';
    return `${usage.used}/${usage.limit}`;
  };

  // 紧凑模式
  if (compact) {
    return (
      <div className={`flex items-center space-x-4 text-sm ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">创建:</span>
          <span className={getStatusColor(createQuota)}>
            {formatQuota(createQuota)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">复用:</span>
          <span className={getStatusColor(reuseQuota)}>
            {formatQuota(reuseQuota)}
          </span>
        </div>
        {showUpgradeButton && (
          (!createQuota.isUnlimited && Number.isFinite(createQuota.limit) && createQuota.used >= createQuota.limit) ||
          (!reuseQuota.isUnlimited && Number.isFinite(reuseQuota.limit) && reuseQuota.used >= reuseQuota.limit)
        ) && (
          <Link
            href="/pricing"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            升级
          </Link>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">今日配额</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">{planLabel}</span>
          {shouldShowUpgrade && (
            <Link
              href="/pricing"
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
            >
              升级
            </Link>
          )}
        </div>
      </div>

      {/* 配额详情 */}
      <div className="space-y-4">
        {/* 创建配额 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">✨ 创建卡片</span>
              <span className={`text-sm font-medium ${getStatusColor(createQuota)}`}>
                {formatQuota(createQuota)}
              </span>
            </div>
            {!createQuota.isUnlimited && createQuota.used >= createQuota.limit && (
              <span className="text-xs text-red-600">已用完</span>
            )}
          </div>
          {!createQuota.isUnlimited && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(createQuota)}`}
                style={{ width: `${getUsagePercentage(createQuota)}%` }}
              />
            </div>
          )}
        </div>

        {/* 复用配额 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">🔄 复用卡片</span>
              <span className={`text-sm font-medium ${getStatusColor(reuseQuota)}`}>
                {formatQuota(reuseQuota)}
              </span>
            </div>
            {!reuseQuota.isUnlimited && reuseQuota.used >= reuseQuota.limit && (
              <span className="text-xs text-red-600">已用完</span>
            )}
          </div>
          {!reuseQuota.isUnlimited && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(reuseQuota)}`}
                style={{ width: `${getUsagePercentage(reuseQuota)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 重置时间 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          配额将在明天 00:00 重置
        </p>
      </div>

      {/* 升级提示 */}
      {shouldShowUpgrade && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-xs text-blue-800 font-medium">
                升级到基础版，享受更多创作自由
              </p>
              <p className="text-xs text-blue-600 mt-1">
                每日20次创建 + 5次复用，仅需¥69/月
              </p>
              <Link
                href="/pricing"
                className="inline-block mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
              >
                立即升级
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 简化的配额指示器组件
export function QuotaIndicator({
  type,
  className = '',
}: {
  type: 'create' | 'reuse';
  className?: string;
}) {
  const { user, isAuthenticated } = useAuthContext();
  const [usage, setUsage] = useState<QuotaUsage | null>(null);

  const loadUsage = useCallback(async () => {
    const userId = resolveUserId(user);
    if (!isAuthenticated || !user || !userId) {
      setUsage(null);
      return;
    }

    const checker = new QuotaChecker(
      userId,
      resolveUserRole(user),
      resolveSubscriptionStatus(user),
    );

    try {
      const result = await checker.checkQuota(type);
      setUsage(result.usage);
    } catch (error) {
      console.error('Failed to load quota usage:', error);
    }
  }, [isAuthenticated, user, type]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  if (!isAuthenticated || !user || !usage) {
    return null;
  }

  const finiteLimit = usage.isUnlimited || !Number.isFinite(usage.limit) ? Infinity : usage.limit;
  const isLow = !usage.isUnlimited && finiteLimit !== Infinity && usage.used >= finiteLimit * 0.8;
  const isEmpty = !usage.isUnlimited && finiteLimit !== Infinity && usage.used >= finiteLimit;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      isEmpty ? 'bg-red-100 text-red-800' :
      isLow ? 'bg-yellow-100 text-yellow-800' :
      'bg-green-100 text-green-800'
    } ${className}`}>
      {usage.isUnlimited || !Number.isFinite(usage.limit) ? '∞' : `${usage.used}/${usage.limit}`}
    </span>
  );
}
