import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';

import { WeChatPayUtils } from '@/core/subscription/wechat-pay';
import { PaymentRecord, PaymentStatus, PaymentMethod } from '@/shared/types/subscription';

/**
 * 支付页面组件
 */
export interface PaymentPageProps {
  paymentRecord: PaymentRecord;
  onPaymentSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

export function PaymentPage({
  paymentRecord,
  onPaymentSuccess,
  onCancel,
}: PaymentPageProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(paymentRecord.status);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [countdown, setCountdown] = useState(300); // 5分钟倒计时
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 生成微信支付二维码
  const generateQRCode = useCallback(async () => {
    try {
      const result = await WeChatPayUtils.createWeChatPayOrder({
        amount: paymentRecord.amount,
        description: `订阅支付 - ${paymentRecord.planId}`,
        userId: paymentRecord.userId,
      });
      setQrCodeUrl(result.qrCodeUrl);
    } catch (error) {
      console.error('生成二维码失败:', error);
      setErrorMessage('生成支付二维码失败，请重试');
    }
  }, [paymentRecord.amount, paymentRecord.planId, paymentRecord.userId]);

  // 生成二维码
  useEffect(() => {
    if (paymentRecord.paymentMethod === 'wechat_pay') {
      generateQRCode();
    }
  }, [paymentRecord.paymentMethod, generateQRCode]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, paymentStatus]);

  // 刷新支付状态
  const handleRefresh = async () => {
    setIsPolling(true);
    try {
      const response = await fetch(`/api/payment?paymentId=${paymentRecord.id}`);
      const data = await response.json();

      if (data.success) {
        setPaymentStatus(data.data.status);
        if (data.data.status === 'completed') {
          onPaymentSuccess(paymentRecord.id);
        }
      }
    } catch (error) {
      console.error('查询支付状态失败:', error);
    } finally {
      setIsPolling(false);
    }
  };

  // 格式化倒计时
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 获取状态图标
  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'completed':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
    }
  };

  // 支付成功页面
  if (paymentStatus === 'completed') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        {getStatusIcon()}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">支付成功！</h2>
        <p className="text-gray-600 mb-6">您的订阅已激活，感谢您的支持</p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">支付金额:</span>
            <span className="font-medium text-gray-900">
              {WeChatPayUtils.formatAmount(paymentRecord.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">订单号:</span>
            <span className="font-medium text-gray-900 font-mono text-xs">
              {paymentRecord.id}
            </span>
          </div>
        </div>
        <button
          onClick={() => onPaymentSuccess(paymentRecord.id)}
          className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          继续使用
        </button>
      </div>
    );
  }

  // 支付失败页面
  if (paymentStatus === 'failed') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        {getStatusIcon()}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">支付失败</h2>
        <p className="text-gray-600 mb-6">{errorMessage || '支付过程中出现问题，请重试'}</p>
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新支付
          </button>
          <button
            onClick={onCancel}
            className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消支付
          </button>
        </div>
      </div>
    );
  }

  // 支付中页面（微信支付）
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      {/* 头部信息 */}
      <div className="text-center mb-6">
        {getStatusIcon()}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">微信支付</h2>
        <p className="text-gray-600">请使用微信扫描下方二维码完成支付</p>
      </div>

      {/* 支付信息 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">支付金额:</span>
          <span className="text-2xl font-bold text-red-600">
            {WeChatPayUtils.formatAmount(paymentRecord.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">订单号:</span>
          <span className="font-medium text-gray-900 font-mono text-xs">
            {paymentRecord.id}
          </span>
        </div>
      </div>

      {/* 二维码 */}
      <div className="text-center mb-6">
        {qrCodeUrl ? (
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
            <Image
              src={qrCodeUrl}
              alt="支付二维码"
              width={192}
              height={192}
              className="w-48 h-48 mx-auto"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">生成二维码中...</p>
            </div>
          </div>
        )}
      </div>

      {/* 倒计时 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          支付剩余时间: {formatCountdown(countdown)}
        </div>
      </div>

      {/* 支付说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">支付说明:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 请在5分钟内完成支付</li>
          <li>• 支付成功后订阅将立即生效</li>
          <li>• 如遇问题请联系客服</li>
        </ul>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <button
          onClick={handleRefresh}
          disabled={isPolling}
          className="w-full border border-blue-600 text-blue-600 font-medium py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPolling ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              检查支付状态中...
            </span>
          ) : (
            '刷新支付状态'
          )}
        </button>

        <button
          onClick={onCancel}
          className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          取消支付
        </button>
      </div>

      {/* 底部提示 */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          支付遇到问题？
          <a href="/help/payment" className="text-blue-600 hover:underline ml-1">
            查看帮助
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * 支付状态指示器组件
 */
export function PaymentStatusIndicator({
  status,
  className = '',
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          text: '待支付',
        };
      case 'completed':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          text: '已支付',
        };
      case 'failed':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          text: '支付失败',
        };
      case 'refunded':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          text: '已退款',
        };
      case 'cancelled':
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: '已取消',
        };
      case 'processing':
        return {
          color: 'text-orange-600',
          bg: 'bg-orange-100',
          text: '处理中',
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: '未知状态',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${className}`}>
      {config.text}
    </span>
  );
}

/**
 * 支付金额显示组件
 */
export function PaymentAmount({
  amount,
  currency = 'CNY',
  size = 'normal',
  className = '',
}: {
  amount: number;
  currency?: string;
  size?: 'small' | 'normal' | 'large';
  className?: string;
}) {
  const sizeClasses = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-2xl font-bold',
  };

  return (
    <span className={`${sizeClasses[size]} ${className}`}>
      {WeChatPayUtils.formatAmount(amount)}
    </span>
  );
}
