'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentQuota?: {
    type: 'daily' | 'monthly';
    used: number;
    remaining: number;
    total: number;
  };
}

interface SubscribeResponse {
  qrCodeImage?: string;
  orderId?: string;
  expiresAt?: string;
  prepayId?: string;
}

type PaymentState = 'idle' | 'pending' | 'success' | 'failed';

export function SubscriptionModal({ isOpen, onClose, onSuccess, currentQuota }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<SubscribeResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupTimers = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    cleanupTimers();
    setQrCodeData(null);
    setPaymentStatus('idle');
    setErrorMessage(null);
    setCountdownMs(null);
  }, [cleanupTimers]);

  useEffect(() => cleanupTimers, [cleanupTimers]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const startCountdown = useCallback((expiresAt?: string) => {
    if (!expiresAt) {
      setCountdownMs(null);
      return;
    }

    cleanupTimers();

    const end = new Date(expiresAt).getTime();

    const update = () => {
      const diff = end - Date.now();
      setCountdownMs(diff);

      if (diff <= 0) {
        cleanupTimers();
        setPaymentStatus('failed');
        setErrorMessage('二维码已过期，请重新生成。');
      }
    };

    update();
    countdownRef.current = setInterval(update, 1000);
  }, [cleanupTimers]);

  const startPolling = useCallback((orderId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/wechat/callback?orderId=${orderId}`);
        const data = await response.json();

        if (!data.success) {
          return;
        }

        if (data.data.status === 'success') {
          cleanupTimers();
          setPaymentStatus('success');
          setErrorMessage(null);

          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1500);
        } else if (data.data.status === 'failed') {
          cleanupTimers();
          setPaymentStatus('failed');
          setErrorMessage('支付未完成，请重试。');
        }
      } catch (error) {
        console.error('Poll payment status error:', error);
        setErrorMessage('获取支付状态失败，请稍后重试。');
      }
    }, 2000);
  }, [cleanupTimers, onClose, onSuccess]);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.error ? `创建订单失败：${data.error}` : '创建订单失败，请稍后重试');
        setPaymentStatus('failed');
        return;
      }

      setQrCodeData(data.data);
      setPaymentStatus('pending');
      startCountdown(data.data.expiresAt);

      if (data.data.orderId) {
        startPolling(data.data.orderId);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      setErrorMessage('网络错误，请稍后重试');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  }, [startCountdown, startPolling]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleRetry = useCallback(() => {
    resetState();
    setPaymentStatus('idle');
    setTimeout(() => handleSubscribe(), 0);
  }, [handleSubscribe, resetState]);

  const formattedCountdown = useMemo(() => {
    if (countdownMs === null || countdownMs <= 0) {
      return '00:00';
    }

    const seconds = Math.floor(countdownMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
  }, [countdownMs]);

  const showQrSection = qrCodeData && paymentStatus !== 'success';
  const isExpired = countdownMs !== null && countdownMs <= 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/70 px-4 py-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">升级教师专业版</h2>
              {currentQuota?.type === 'daily' ? (
                <p className="mt-1 text-sm text-white/80">
                  今日额度已用尽（{currentQuota.used}/{currentQuota.total}），升级后可解锁更高配额。
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg font-medium text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {errorMessage ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          {paymentStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                ✓
              </div>
              <h3 className="text-lg font-semibold text-emerald-700">支付成功，已为您开通专业版</h3>
              <p className="text-sm text-emerald-600">页面即将刷新额度信息，可立即体验 150 次/月 的生成额度。</p>
            </div>
          ) : null}

          {showQrSection ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <span className="text-2xl font-bold text-slate-900">
                  ¥15<span className="ml-1 text-base font-normal">/月</span>
                </span>
                <p className="text-sm text-slate-600">自动续费，可随时取消。订阅后每月获得 150 次生成额度。</p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center shadow-sm">
                {qrCodeData.qrCodeImage ? (
                  <Image
                    src={qrCodeData.qrCodeImage}
                    alt="微信支付二维码"
                    width={256}
                    height={256}
                    className="mx-auto rounded-lg shadow-lg"
                    priority
                  />
                ) : (
                  <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-lg bg-slate-100">
                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" aria-hidden />
                    <p className="text-sm text-slate-500">二维码生成中...</p>
                  </div>
                )}

                <div className="mt-4 flex flex-col items-center gap-1 text-sm text-slate-600">
                  <span>请使用微信扫码完成支付</span>
                  {isExpired ? (
                    <span className="font-medium text-rose-500">二维码已过期，请重新获取</span>
                  ) : (
                    <span className="font-medium text-indigo-600">二维码将在 {formattedCountdown} 后过期</span>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">1</span>
                  <span>扫码支付完成后页面将自动检测，无需手动刷新。</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">2</span>
                  <span>若支付未成功，可点击下方按钮重新生成二维码。</span>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  重新生成二维码
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}

          {paymentStatus === 'idle' ? (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">额度升级</p>
                  <p className="mt-1 text-sm text-slate-600">每月 150 次生成额度，支持高并发创作。</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">一键复用</p>
                  <p className="mt-1 text-sm text-slate-600">复用卡片不限次数，快速搭建课堂节奏。</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">自动续费</p>
                  <p className="mt-1 text-sm text-slate-600">微信扫码订阅，次月前随时取消不扣费。</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                ) : null}
                立即升级 ¥15 / 月
              </button>

              <p className="text-center text-xs text-slate-500">
                支付成功后自动续订，下个月扣款前可在订阅管理中随时取消。
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SubscriptionModal;
