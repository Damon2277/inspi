'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { AppLayout } from '@/components/layout';
import { PlanConfig } from '@/core/subscription/plan-model';
import { planService } from '@/core/subscription/plan-service';
import { subscriptionService } from '@/core/subscription/subscription-service';
import { useAuth } from '@/shared/hooks/useAuth';
import { UserTier, Subscription } from '@/shared/types/subscription';

function PricingPageContent() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showBanner = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 获取所有套餐
      const plansResult = await planService.queryPlans({
        status: 'active',
        sortBy: 'tier',
      });
      setPlans(plansResult.plans);

      // 获取当前订阅
      if (user) {
        const subscription = await subscriptionService.getCurrentSubscription((user.id || (user as any)._id));
        setCurrentSubscription(subscription);
      }

    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      showBanner('info', '请先登录');
      return;
    }

    try {
      setIsProcessing(true);
      setSelectedPlan(planId);

      // 如果已有订阅，进行升级
      if (currentSubscription) {
        const result = await subscriptionService.upgradeSubscription(
          currentSubscription.id,
          planId,
        );

        if (result.paymentInfo) {
          // 需要支付，跳转到支付页面
          window.location.href = `/payment/${result.paymentInfo.paymentId}`;
        } else {
          // 无需支付，直接完成
          showBanner('success', '套餐升级成功！');
          await loadData();
        }
      } else {
        // 创建新订阅
        const result = await subscriptionService.createSubscription({
          userId: (user.id || (user as any)._id),
          planId,
          paymentMethod: 'wechat_pay',
          billingCycle,
        });

        // 跳转到支付页面
        window.location.href = `/payment/${result.paymentInfo.paymentId}`;
      }

    } catch (error) {
      console.error('选择套餐失败:', error);
      showBanner('error', '操作失败，请稍后重试');
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (plan: PlanConfig) => {
    if (plan.monthlyPrice === 0) return '免费';

    const price = billingCycle === 'yearly' && plan.yearlyPrice
      ? plan.yearlyPrice / 12
      : plan.monthlyPrice;

    return `¥${price}`;
  };

  const getSavings = (plan: PlanConfig) => {
    if (!plan.yearlyPrice || plan.monthlyPrice === 0) return null;

    const monthlyCost = plan.monthlyPrice * 12;
    const savings = Math.round((1 - plan.yearlyPrice / monthlyCost) * 100);

    return savings > 0 ? `节省${savings}%` : null;
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId;
  };

  const canUpgrade = (tier: UserTier) => {
    if (!currentSubscription) return true;

    const tierOrder = { free: 0, basic: 1, pro: 2, admin: 3 };
    const currentOrder = tierOrder[currentSubscription.tier];
    const targetOrder = tierOrder[tier];

    return targetOrder > currentOrder;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">选择适合您的套餐</h1>
          <p className="text-xl text-gray-600 mb-8">
            解锁更多功能，提升创作效率
          </p>

          {/* 计费周期切换 */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              按月付费
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              按年付费
              <span className="ml-1 text-xs text-green-600 font-semibold">省钱</span>
            </button>
          </div>
        </div>

        {/* 套餐卡片 */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const savings = billingCycle === 'yearly' ? getSavings(plan) : null;
            const isCurrent = isCurrentPlan(plan.id);
            const canSelect = canUpgrade(plan.tier);

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                  plan.popular ? 'ring-2 ring-blue-500' : ''
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {/* 推荐标签 */}
                {plan.popular && !isCurrent && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      最受欢迎
                    </span>
                  </div>
                )}

                {/* 当前套餐标签 */}
                {isCurrent && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      当前套餐
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* 套餐名称和价格 */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan)}
                      </span>
                      {plan.monthlyPrice > 0 && (
                        <span className="text-gray-600 ml-1">
                          /{billingCycle === 'yearly' ? '月' : '月'}
                        </span>
                      )}
                    </div>

                    {savings && (
                      <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {savings}
                      </div>
                    )}

                    <p className="text-gray-600 mt-4">{plan.description}</p>
                  </div>

                  {/* 功能列表 */}
                  <div className="mb-8">
                    <h4 className="font-semibold text-gray-900 mb-4">功能特性:</h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 配额信息 */}
                  <div className="mb-8">
                    <h4 className="font-semibold text-gray-900 mb-4">配额限制:</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>每日创建:</span>
                        <span className="font-medium">
                          {plan.quotas.dailyCreateQuota === -1 ? '无限' : plan.quotas.dailyCreateQuota}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>每日复用:</span>
                        <span className="font-medium">
                          {plan.quotas.dailyReuseQuota === -1 ? '无限' : plan.quotas.dailyReuseQuota}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>每日导出:</span>
                        <span className="font-medium">
                          {plan.quotas.maxExportsPerDay === -1 ? '无限' : plan.quotas.maxExportsPerDay}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 选择按钮 */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={!canSelect || isProcessing || isCurrent}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isCurrent
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : canSelect
                        ? plan.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    } ${isProcessing && selectedPlan === plan.id ? 'opacity-50' : ''}`}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        处理中...
                      </span>
                    ) : isCurrent ? (
                      '当前套餐'
                    ) : canSelect ? (
                      currentSubscription ? '升级到此套餐' : '选择此套餐'
                    ) : (
                      '无法选择'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 常见问题 */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">常见问题</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">可以随时取消订阅吗？</h3>
              <p className="text-gray-600">
                是的，您可以随时取消订阅。取消后，您的订阅将在当前计费周期结束后停止，不会产生额外费用。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">升级后立即生效吗？</h3>
              <p className="text-gray-600">
                是的，升级后新的功能和配额将立即生效。您只需支付剩余时间的差价。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">支持哪些支付方式？</h3>
              <p className="text-gray-600">
                目前支持微信支付，后续会增加更多支付方式。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">年付有什么优惠吗？</h3>
              <p className="text-gray-600">
                选择年付可以享受相当于2个月免费的优惠，相比月付节省约17%的费用。
              </p>
            </div>
          </div>
        </div>

        {/* 联系支持 */}
        <div className="mt-16 text-center">
          <div className="bg-blue-50 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">需要帮助？</h3>
            <p className="text-gray-600 mb-4">
              如果您对套餐选择有任何疑问，我们的客服团队随时为您服务
            </p>
            <div className="flex justify-center space-x-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                在线客服
              </button>
              <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                查看帮助文档
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <AppLayout>
      <PricingPageContent />
    </AppLayout>
  );
}
