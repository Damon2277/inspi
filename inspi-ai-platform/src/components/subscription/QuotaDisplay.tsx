'use client';

import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';

interface QuotaStatus {
  status: 'free' | 'subscribed';
  quota: {
    type: 'daily' | 'monthly';
    used: number;
    remaining: number;
    total: number;
  };
  subscription?: {
    status: string;
    currentPeriodEnd?: string;
    nextBillingAt?: string;
    autoRenew?: boolean;
  };
}

export function QuotaDisplay() {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuotaStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();

      if (data.success) {
        // Transform API response to match QuotaStatus format
        const transformedData: QuotaStatus = {
          status: data.data.plan === 'free' ? 'free' : 'subscribed',
          quota: {
            type: 'monthly',
            used: data.data.used || 0,
            remaining: data.data.remaining || data.data.limit || 1000,
            total: data.data.limit || 1000,
          },
          subscription:
            data.data.plan !== 'free'
              ? {
                  status: 'active',
                  nextBillingAt: data.data.resetDate,
                  autoRenew: true,
                }
              : undefined,
        };
        setQuotaStatus(transformedData);
      }
    } catch (error) {
      console.error('Fetch quota status error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotaStatus();
    const interval = setInterval(fetchQuotaStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const percentage = useMemo(() => {
    if (!quotaStatus?.quota.total) {
      return 0;
    }
    const { quota } = quotaStatus;
    return Math.min(100, Math.max(0, (quota.remaining / quota.total) * 100));
  }, [quotaStatus]);

  if (loading || !quotaStatus) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-500">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" aria-hidden />
        加载中...
      </div>
    );
  }

  const isSubscribed = quotaStatus.status === 'subscribed';
  const { quota } = quotaStatus;

  const progressColor = isSubscribed
    ? 'bg-white'
    : percentage > 50
      ? 'bg-emerald-500'
      : percentage > 20
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div
      className={clsx(
        'w-full min-w-[200px] rounded-lg px-4 py-3 shadow-sm transition-colors',
        isSubscribed
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
          : 'bg-slate-50 text-slate-900',
      )}
    >
      <div
        className={clsx(
          'text-xs font-medium uppercase tracking-wide',
          isSubscribed ? 'text-white/80' : 'text-slate-500',
        )}
      >
        {isSubscribed ? '专业版' : '免费版'}
      </div>

      <div
        className={clsx(
          'mt-1 text-lg font-semibold',
          isSubscribed ? 'text-white' : 'text-slate-900',
        )}
      >
        {quota.type === 'monthly' ? '本月剩余' : '今日剩余'} {quota.remaining}/{quota.total}
      </div>

      <div
        className={clsx(
          'mt-3 h-1.5 w-full overflow-hidden rounded-full',
          isSubscribed ? 'bg-white/30' : 'bg-slate-200',
        )}
      >
        <div
          className={clsx('h-full transition-all duration-300', progressColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isSubscribed && quotaStatus.subscription?.nextBillingAt ? (
        <div className="mt-2 text-xs text-white/80">
          下次扣款：
          {new Date(quotaStatus.subscription.nextBillingAt).toLocaleDateString()}
        </div>
      ) : null}

      {!isSubscribed && quota.remaining === 0 ? (
        <div className="mt-2 text-xs font-medium text-rose-500">
          额度已用尽，升级获取更多
        </div>
      ) : null}

      {quota.type === 'monthly' && quota.remaining > 0 && quota.remaining <= 30 ? (
        <div
          className={clsx(
            'mt-2 flex items-center gap-1 text-xs',
            isSubscribed ? 'text-amber-100' : 'text-amber-600',
          )}
        >
          <span className="text-base" aria-hidden>
            ⚠️
          </span>
          额度即将用尽，请提前规划使用
        </div>
      ) : null}
    </div>
  );
}
