
'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { paymentService } from '@/core/subscription/payment-service';
import { subscriptionService } from '@/core/subscription/subscription-service';
import { PaymentStatusIndicator, PaymentAmount } from '@/features/subscription/PaymentPage';
import { useAuthContext } from '@/shared/contexts/AuthContext';
import { Subscription, PaymentRecord } from '@/shared/types/subscription';

export default function SubscriptionManagePage() {
  const { user } = useAuthContext();
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'history'>('overview');
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'cancel' | null>(null);

  const showBanner = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const loadSubscriptionData = useCallback(async () => {
    try {
      setIsLoading(true);

      const userId = (user?.id || (user as any)?._id) || 'test-user-123';

      // 获取当前订阅
      const subscription = await subscriptionService.getCurrentSubscription(userId);
      setCurrentSubscription(subscription);

      // 获取支付历史
      const paymentsResult = await paymentService.getUserPaymentHistory(userId, 10);
      setPaymentHistory(paymentsResult.payments);

      // 获取订阅历史
      const subscriptionsResult = await subscriptionService.getSubscriptionHistory(userId);
      setSubscriptionHistory(subscriptionsResult.subscriptions);

    } catch (error) {
      console.error('加载订阅数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user, loadSubscriptionData]);

  const confirmCancelSubscription = useCallback(async () => {
    if (!currentSubscription) return;

    try {
      setActionLoading('cancel');

      const result = await subscriptionService.cancelSubscription(
        currentSubscription.id,
        '用户主动取消',
      );

      setCurrentSubscription(result);
      showBanner('success', '订阅已取消，将在当前计费周期结束后生效');

    } catch (error) {
      console.error('取消订阅失败:', error);
      showBanner('error', '取消订阅失败，请稍后重试');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }, [currentSubscription, showBanner]);

  const handleCancelSubscription = () => {
    if (!currentSubscription) return;
    setConfirmAction('cancel');
  };

  const handleRenewSubscription = async () => {
    if (!currentSubscription) return;

    try {
      setActionLoading('renew');

      const result = await subscriptionService.reactivateSubscription(currentSubscription.id);

      setCurrentSubscription(result);
      showBanner('success', '续费成功！');

    } catch (error) {
      console.error('续费失败:', error);
      showBanner('error', '续费失败，请稍后重试');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {banner && (
            <div
              className={`mb-6 rounded-md border p-4 text-sm ${
                banner.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : banner.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <span>{banner.message}</span>
                <button
                  type="button"
                  onClick={() => setBanner(null)}
                  className="ml-4 text-xs underline"
                >
                  关闭
                </button>
              </div>
            </div>
          )}

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">订阅管理</h1>
          <p className="text-gray-600">管理您的订阅套餐和账单信息</p>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'overview', label: '订阅概览', icon: '📊' },
                { key: 'payments', label: '支付记录', icon: '💳' },
                { key: 'history', label: '订阅历史', icon: '📋' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 订阅概览 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {currentSubscription ? (
              <>
                {/* 当前订阅状态 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">当前订阅</h2>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* 订阅信息 */}
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="bg-blue-100 rounded-full p-3 mr-4">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{currentSubscription.planName}</h3>
                          <p className="text-sm text-gray-500">
                            状态: <span className={`font-medium ${
                              currentSubscription.status === 'active' ? 'text-green-600' :
                              currentSubscription.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {currentSubscription.status === 'active' ? '活跃' :
                               currentSubscription.status === 'cancelled' ? '已取消' :
                               currentSubscription.status === 'expired' ? '已过期' :
                               currentSubscription.status}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">月费:</span>
                          <span className="font-medium">¥{currentSubscription.monthlyPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">开始日期:</span>
                          <span className="font-medium">{new Date(currentSubscription.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">到期日期:</span>
                          <span className="font-medium">{new Date(currentSubscription.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">下次扣费:</span>
                          <span className="font-medium">
                            {currentSubscription.nextBillingDate
                              ? new Date(currentSubscription.nextBillingDate).toLocaleDateString()
                              : '未设置'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">剩余天数:</span>
                          <span className="font-medium text-blue-600">
                            {currentSubscription.nextBillingDate
                              ? Math.max(0, Math.ceil((new Date(currentSubscription.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                              : 0
                            } 天
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 配额信息 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">当前配额</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">每日创建:</span>
                          <span className="font-medium">
                            {currentSubscription.quotas.dailyCreateQuota === -1 ? '无限' : currentSubscription.quotas.dailyCreateQuota}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">每日复用:</span>
                          <span className="font-medium">
                            {currentSubscription.quotas.dailyReuseQuota === -1 ? '无限' : currentSubscription.quotas.dailyReuseQuota}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">每日导出:</span>
                          <span className="font-medium">
                            {currentSubscription.quotas.maxExportsPerDay === -1 ? '无限' : currentSubscription.quotas.maxExportsPerDay}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">知识图谱:</span>
                          <span className="font-medium text-green-600">无限</span>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">功能特性</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentSubscription.features.map((feature, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 到期提醒 */}
                  {currentSubscription.nextBillingDate &&
                   new Date(currentSubscription.nextBillingDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 && (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-yellow-800 font-medium">订阅即将到期</h4>
                          <p className="text-yellow-700 text-sm mt-1">
                            您的订阅将在 {currentSubscription.nextBillingDate
                              ? Math.max(0, Math.ceil((new Date(currentSubscription.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                              : 0
                            } 天后到期，请及时续费以免影响使用。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={handleRenewSubscription}
                        disabled={actionLoading === 'renew'}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === 'renew' ? '处理中...' : '立即续费'}
                      </button>

                      <button
                        onClick={() => window.location.href = '/subscription/upgrade'}
                        className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        升级套餐
                      </button>

                      <button
                        onClick={handleCancelSubscription}
                        disabled={actionLoading === 'cancel' || currentSubscription.status === 'cancelled'}
                        className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === 'cancel' ? '处理中...' : '取消订阅'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* 无订阅状态 */
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活跃订阅</h3>
                <p className="text-gray-600 mb-6">选择适合您的套餐，开始享受完整功能</p>
                <button
                  onClick={() => window.location.href = '/subscription/plans'}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  查看套餐
                </button>
              </div>
            )}
          </div>
        )}

        {/* 支付记录 */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">支付记录</h2>
            </div>

            {paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        订单号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支付方式
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {payment.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PaymentAmount amount={payment.amount} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PaymentStatusIndicator status={payment.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.paymentMethod === 'wechat_pay' ? '微信支付' : payment.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无支付记录</h3>
                <p className="text-gray-600">您还没有任何支付记录</p>
              </div>
            )}
          </div>
        )}

        {/* 订阅历史 */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">订阅历史</h2>
            </div>

            {subscriptionHistory.length > 0 ? (
              <div className="p-6">
                <div className="space-y-4">
                  {subscriptionHistory.map((subscription) => (
                    <div key={subscription.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{subscription.planName}</h4>
                          <p className="text-sm text-gray-500">订阅ID: {subscription.id}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                          subscription.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {subscription.status === 'active' ? '活跃' :
                           subscription.status === 'cancelled' ? '已取消' :
                           subscription.status === 'expired' ? '已过期' :
                           subscription.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">开始时间:</span>
                          <p className="font-medium">{new Date(subscription.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">结束时间:</span>
                          <p className="font-medium">{new Date(subscription.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">月费:</span>
                          <p className="font-medium">¥{subscription.monthlyPrice}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">使用天数:</span>
                          <p className="font-medium">
                            {Math.ceil((new Date().getTime() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24))} 天
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无订阅历史</h3>
                <p className="text-gray-600">您还没有任何订阅历史记录</p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      {confirmAction === 'cancel' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">确认取消订阅</h3>
            <p className="mt-2 text-sm text-gray-600">
              取消后将在当前计费周期结束后生效，确定要继续吗？
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                返回
              </button>
              <button
                type="button"
                onClick={confirmCancelSubscription}
                disabled={actionLoading === 'cancel'}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
