'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { QuotaDisplay } from './QuotaDisplay';
import { SubscriptionModal } from './SubscriptionModal';
import { useAuth } from '@/shared/hooks/useAuth';

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
  autoOpenModal?: boolean;
}

export function SubscriptionManagement({ variant = 'page', autoOpenModal = false }: SubscriptionManagementProps) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isAuthenticated = Boolean(authUser);
  const [loginRedirectUrl, setLoginRedirectUrl] = useState('/auth/login');
  const isEmbedded = variant === 'embedded';
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(autoOpenModal);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const currentPath = window.location.pathname + window.location.search || '/profile?tab=subscription';
    setLoginRedirectUrl(`/auth/login?returnUrl=${encodeURIComponent(currentPath)}`);
  }, []);

  const requireLogin = useCallback(() => {
    router.push(loginRedirectUrl);
  }, [loginRedirectUrl, router]);

  const fetchSubscriptionInfo = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscriptionInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/subscription/status', { credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setSubscriptionInfo(data.data);
      }
    } catch (error) {
      console.error('Fetch subscription info error:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, [fetchSubscriptionInfo]);

  useEffect(() => {
    if (!autoOpenModal) {
      return;
    }

    if (isAuthenticated) {
      setShowSubscriptionModal(true);
    } else {
      requireLogin();
    }
  }, [autoOpenModal, isAuthenticated, requireLogin]);

  const handleCancelSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    setCancelLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/subscription/cancel', { method: 'POST', credentials: 'include' });
      const data = await response.json();

      if (data.success) {
        setFeedback({ type: 'success', message: data.data.message });
        await fetchSubscriptionInfo();
      } else {
        setFeedback({ type: 'error', message: data.error || '取消失败，请稍后重试' });
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      setFeedback({ type: 'error', message: '操作失败，请稍后重试' });
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  }, [fetchSubscriptionInfo, isAuthenticated, requireLogin]);

  const handleUpgradeClick = useCallback(() => {
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    setShowSubscriptionModal(true);
  }, [isAuthenticated, requireLogin]);

  const isSubscribed = subscriptionInfo?.status === 'subscribed';

  const planSummary = useMemo(() => {
    if (isSubscribed) {
      return {
        title: '教学专业版',
        description: '每月 150 次生成额度，解锁复用与批量导出能力。',
      };
    }

    return {
      title: '免费版',
      description: '每日 5 次体验额度，可随时升级享受完整功能。',
    };
  }, [isSubscribed]);

  if (loading) {
    const loader = (
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" aria-hidden />
        加载订阅信息...
      </div>
    );

    if (isEmbedded) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          {loader}
        </div>
      );
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        {loader}
      </div>
    );
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
              {new Date(subscriptionInfo.subscription.nextBillingAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          {subscriptionInfo.subscription.currentPeriodEnd ? (
            <p>
              <span className="font-medium text-slate-800">周期结束：</span>
              {new Date(subscriptionInfo.subscription.currentPeriodEnd).toLocaleDateString()}
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
              style={{ minHeight: 'var(--hero-btn-height)' }}
            >
              {cancelLoading ? '处理中...' : '确认取消自动续费'}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              style={{ minHeight: 'var(--hero-btn-height)' }}
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
          style={{ minHeight: 'var(--hero-btn-height)' }}
        >
          管理自动续费
        </button>
      )}
    </div>
  ) : (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
      <p className="text-base font-semibold text-slate-900">升级后即可解锁：</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <span className="font-medium text-slate-800">高频生成</span>
            <p className="mt-1 text-slate-600">每月最高 150 次 AI 生成额度，适配高密度备课场景。</p>
          </div>
          <div>
            <span className="font-medium text-slate-800">复用/导出</span>
            <p className="mt-1 text-slate-600">一键复用内容并导出 PPT/讲义，批量操作不限次数。</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <span className="font-medium text-slate-800">教学方案</span>
            <p className="mt-1 text-slate-600">批量下载与分享完整教学方案，课堂展示一键串联。</p>
          </div>
          <div>
            <span className="font-medium text-slate-800">服务支持</span>
            <p className="mt-1 text-slate-600">专属服务通道，及时响应教学场景反馈与升级需求。</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[240px] flex-1 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
          微信支付仅支持扫码订阅，扣款日前可随时取消，取消后当前周期仍可使用完额度。
        </div>
        <button
          type="button"
          onClick={handleUpgradeClick}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{ minHeight: 'var(--hero-btn-height)' }}
        >
          升级获取更多额度
        </button>
      </div>
    </div>
  );

  const content = (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">订阅管理</h1>
          <p className="mt-2 text-xl text-slate-600">查看额度使用情况、管理自动续订配置。</p>
        </div>
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

      <div className="mt-8 space-y-6">
        <section className="lg:col-span-2 space-y-6 rounded-2xl bg-white p-6 shadow-sm">
          <header className="rounded-xl bg-slate-900/5 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{planSummary.title}</h2>
                <p className="text-lg text-slate-600">{planSummary.description}</p>
              </div>
              <div className="text-right text-lg text-slate-500">
                {isSubscribed ? '自动续费中，每月 15 元' : '免费体验中，升级享更多权益'}
              </div>
            </div>
          </header>

          <QuotaDisplay />

          {subscriptionActions}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">常见问题</h3>
        <div className="mt-4 space-y-3 text-lg text-slate-600">
          <p>• 订阅随时可取消，当前周期结束前仍可使用全部功能。</p>
          <p>• 额度会在每月账单日自动刷新，未使用部分不结转。</p>
          <p>• 如需发票或企业采购，请通过客服渠道联系我们。</p>
        </div>
      </section>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSuccess={fetchSubscriptionInfo}
        currentQuota={subscriptionInfo?.quota}
      />
    </>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col gap-6">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {content}
      </div>
    </div>
  );
}

export default SubscriptionManagement;
