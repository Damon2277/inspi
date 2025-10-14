'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface PlanFeature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
  super: string | boolean;
}

const planFeatures: PlanFeature[] = [
  {
    name: '每日AI生成次数',
    free: '3次',
    pro: '50次',
    super: '无限制',
  },
  {
    name: '每日作品复用次数',
    free: '5次',
    pro: '100次',
    super: '无限制',
  },
  {
    name: '作品保存数量',
    free: '10个',
    pro: '500个',
    super: '无限制',
  },
  {
    name: '高级AI模型',
    free: false,
    pro: true,
    super: true,
  },
  {
    name: '优先客服支持',
    free: false,
    pro: false,
    super: true,
  },
  {
    name: '数据导出功能',
    free: false,
    pro: true,
    super: true,
  },
];

const planPrices = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 199, yearly: 1990 },
  super: { monthly: 399, yearly: 3990 },
};

interface SubscriptionUpgradeProps {
  currentPlan: string;
  onUpgrade?: (plan: string, billingCycle: string) => void;
}

export default function SubscriptionUpgrade({ currentPlan, onUpgrade }: SubscriptionUpgradeProps) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (selectedPlan === currentPlan) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle,
          paymentMethod: 'wechat_pay',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upgrade failed');
      }

      const result = await response.json();

      if (onUpgrade) {
        onUpgrade(selectedPlan, billingCycle);
      }

      // 刷新页面或更新状态
      window.location.reload();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'free': return '免费版';
      case 'pro': return 'Pro版';
      case 'super': return 'Super版';
      default: return plan;
    }
  };

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-green-600">✓</span>
      ) : (
        <span className="text-gray-400">✗</span>
      );
    }
    return <span className="text-gray-900">{value}</span>;
  };

  const getYearlySavings = (plan: keyof typeof planPrices) => {
    const monthly = planPrices[plan].monthly * 12;
    const yearly = planPrices[plan].yearly;
    return monthly - yearly;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">升级订阅</h2>
        <p className="text-gray-600">选择适合您的订阅计划</p>
      </div>

      {/* 计费周期选择 */}
      <div className="mb-6">
        <div className="flex items-center justify-center space-x-4 p-1 bg-gray-100 rounded-lg">
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
            <span className="ml-1 text-xs text-green-600">(省钱)</span>
          </button>
        </div>
      </div>

      {/* 计划选择 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(['free', 'pro', 'super'] as const).map((plan) => (
          <motion.div
            key={plan}
            whileHover={{ scale: 1.02 }}
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedPlan === plan
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${currentPlan === plan ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setSelectedPlan(plan)}
          >
            {currentPlan === plan && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                当前
              </div>
            )}

            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {getPlanDisplayName(plan)}
              </h3>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900">
                  ¥{planPrices[plan][billingCycle] / (billingCycle === 'yearly' ? 100 : 100)}
                </span>
                <span className="text-gray-600">
                  /{billingCycle === 'monthly' ? '月' : '年'}
                </span>
              </div>
              {billingCycle === 'yearly' && plan !== 'free' && (
                <div className="text-sm text-green-600 mt-1">
                  年付省¥{getYearlySavings(plan) / 100}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 功能对比表 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">功能对比</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-600">功能</th>
                <th className="text-center py-2 text-gray-600">免费版</th>
                <th className="text-center py-2 text-gray-600">Pro版</th>
                <th className="text-center py-2 text-gray-600">Super版</th>
              </tr>
            </thead>
            <tbody>
              {planFeatures.map((feature, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3 text-gray-900">{feature.name}</td>
                  <td className="py-3 text-center">{renderFeatureValue(feature.free)}</td>
                  <td className="py-3 text-center">{renderFeatureValue(feature.pro)}</td>
                  <td className="py-3 text-center">{renderFeatureValue(feature.super)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 升级按钮 */}
      <div className="flex justify-center">
        <button
          onClick={handleUpgrade}
          disabled={loading || selectedPlan === currentPlan}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            selectedPlan === currentPlan
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : loading
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              处理中...
            </span>
          ) : selectedPlan === currentPlan ? (
            '当前计划'
          ) : (
            `升级到${getPlanDisplayName(selectedPlan)}`
          )}
        </button>
      </div>
    </div>
  );
}
