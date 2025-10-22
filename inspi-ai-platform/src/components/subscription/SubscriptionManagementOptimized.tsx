'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react';

// Lazy load heavy components
const QuotaDisplay = lazy(() => import('./QuotaDisplay').then(module => ({ default: module.QuotaDisplay })));
const SubscriptionModal = lazy(() => import('./SubscriptionModal').then(module => ({ default: module.SubscriptionModal })));

interface SubscriptionInfo {
  status: 'free' | 'subscribed';
  subscription?: {
    status: string;
    currentPeriodEnd?: string;
    nextBillingAt?: string;
    autoRenew?: boolean;
  };
  quota: {
    type: 'daily' | 'monthly';
    used: number;
    remaining: number;
    total: number;
  };
}

interface SubscriptionManagementProps {
  variant?: 'page' | 'embedded';
  prefetchedData?: SubscriptionInfo | null;
}

// Skeleton loader component
function SubscriptionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );
}

// Error boundary for subscription loading
class SubscriptionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">订阅信息加载失败</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SubscriptionManagementOptimized({
  variant = 'page',
  prefetchedData = null,
}: SubscriptionManagementProps) {
  const router = useRouter();
  const isEmbedded = variant === 'embedded';
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(prefetchedData);
  const [loading, setLoading] = useState(!prefetchedData);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchSubscriptionInfo = useCallback(async (isRetry = false) => {
    // Skip if we have prefetched data and this is the initial load
    if (prefetchedData && !isRetry) {
      return;
    }

    try {
      setLoading(true);

      // Add abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/subscription/status', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSubscriptionInfo(data.data);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(data.error || 'Failed to load subscription info');
      }
    } catch (error: any) {
      console.error('Fetch subscription info error:', error);

      // Implement exponential backoff retry
      if (retryCount < 3 && error.name !== 'AbortError') {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchSubscriptionInfo(true);
        }, delay);
      } else {
        // Fallback to free tier on persistent errors
        setSubscriptionInfo({
          status: 'free',
          quota: {
            type: 'daily',
            used: 0,
            remaining: 5,
            total: 5,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [prefetchedData, retryCount]);

  useEffect(() => {
    fetchSubscriptionInfo();

    // Set up periodic refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchSubscriptionInfo(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchSubscriptionInfo]);

  const handleCancelSubscription = useCallback(async () => {
    setCancelLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setFeedback({ type: 'success', message: data.data.message });
        // Refresh subscription info after cancel
        await fetchSubscriptionInfo(true);

        // Refresh the page after 2 seconds
        setTimeout(() => {
          router.refresh();
        }, 2000);
      } else {
        setFeedback({ type: 'error', message: data.error || '取消失败，请稍后重试' });
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      setFeedback({ type: 'error', message: '操作失败，请检查网络连接后重试' });
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  }, [fetchSubscriptionInfo, router]);

  const isSubscribed = subscriptionInfo?.status === 'subscribed';

  const planSummary = useMemo(() => {
    if (isSubscribed) {
      return {
        title: '教师专业版',
        description: '每月 150 次生成额度，解锁复用与批量导出能力。',
      };
    }

    return {
      title: '免费版',
      description: '每日 5 次体验额度，可随时升级享受完整功能。',
    };
  }, [isSubscribed]);

  if (loading) {
    return <SubscriptionSkeleton />;
  }

  const subscriptionActions = isSubscribed && subscriptionInfo?.subscription ? (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p>
            <span className="font-medium text-slate-800">状态：</span>
            {subscriptionInfo.subscription.autoRenew ? '自动续费中' : '已取消自动续费'}
          </p>
          {subscriptionInfo.subscription.nextBillingAt ? (
            <p>
              <span className="font-medium text-slate-800">下次扣款：</span>
              {new Date(subscriptionInfo.subscription.nextBillingAt).toLocaleDateString('zh-CN')}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          {subscriptionInfo.subscription.currentPeriodEnd ? (
            <p>
              <span className="font-medium text-slate-800">周期结束：</span>
              {new Date(subscriptionInfo.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')}
            </p>
          ) : null}
        </div>
      </div>

      {showCancelConfirm ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <p className="text-sm font-medium">确认关闭自动续费？</p>
          <p className="mt-1 text-xs">
            当前计费周期结束前仍可继续使用，之后将无法自动扣款。可随时在此页面重新开启。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLoading ? '处理中...' : '确认取消自动续费'}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              保留订阅
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          管理自动续费
        </button>
      )}
    </div>
  ) : (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
      <p>升级后即可解锁：</p>
      <ul className="mt-3 space-y-2 text-slate-600">
        <li>· 每月 150 次 AI 生成额度</li>
        <li>· 复用/导出不限次数</li>
        <li>· 教学方案批量下载与分享</li>
      </ul>
      <button
        type="button"
        onClick={() => setShowSubscriptionModal(true)}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        升级获取更多额度
      </button>
    </div>
  );

  const content = (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">订阅管理</h1>
          <p className="mt-2 text-sm text-slate-600">查看额度使用情况、管理自动续订配置。</p>
        </div>
        {!isSubscribed ? (
          <button
            type="button"
            onClick={() => setShowSubscriptionModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            立即升级专业版
          </button>
        ) : null}
      </div>

      {feedback ? (
        <div
          className={feedback.type === 'success'
            ? 'mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
            : 'mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          <header className="rounded-xl bg-slate-900/5 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{planSummary.title}</h2>
                <p className="text-sm text-slate-600">{planSummary.description}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                {isSubscribed ? '自动续费中，每月 15 元' : '免费体验中，升级享更多权益'}
              </div>
            </div>
          </header>

          <Suspense fallback={<div className="h-32 bg-gray-100 rounded animate-pulse"></div>}>
            <QuotaDisplay />
          </Suspense>

          {subscriptionActions}
        </section>

        <aside className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">订阅权益</h3>
          <ul className="space-y-4 text-sm text-slate-600">
            <li>
              <span className="font-medium text-slate-800">高频生成：</span>
              每月最高 150 次生成额度，适配高密度备课场景。
            </li>
            <li>
              <span className="font-medium text-slate-800">无限复用：</span>
              不限次数保存优质教案，打造个人教学资源库。
            </li>
            <li>
              <span className="font-medium text-slate-800">批量导出：</span>
              支持 Word/PDF 格式导出，满足各类备课需求。
            </li>
          </ul>
        </aside>
      </div>

      {showSubscriptionModal ? (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50"></div>}>
          <SubscriptionModal
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            onSuccess={async () => {
              setShowSubscriptionModal(false);
              await fetchSubscriptionInfo(true);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );

  if (isEmbedded) {
    return (
      <SubscriptionErrorBoundary>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {content}
        </div>
      </SubscriptionErrorBoundary>
    );
  }

  return (
    <SubscriptionErrorBoundary>
      <div className="min-h-[60vh] bg-slate-50 py-12 px-4">
        <div className="mx-auto max-w-7xl">
          {content}
        </div>
      </div>
    </SubscriptionErrorBoundary>
  );
}
