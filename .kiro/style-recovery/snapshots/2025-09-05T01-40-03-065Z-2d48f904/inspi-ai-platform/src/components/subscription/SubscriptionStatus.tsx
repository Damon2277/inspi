'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SubscriptionData {
  subscription: {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
    autoRenew: boolean;
    paymentMethod: string;
  } | null;
  usage: {
    date: string;
    generations: {
      current: number;
      limit: number;
      remaining: number;
    };
    reuses: {
      current: number;
      limit: number;
      remaining: number;
    };
  };
  plan: string;
}

export default function SubscriptionStatus() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const result = await response.json();
      setData(result);
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

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'text-gray-600 bg-gray-100';
      case 'pro': return 'text-blue-600 bg-blue-100';
      case 'super': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUsageColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-red-600 text-center">
          <p>加载订阅信息失败</p>
          <button 
            onClick={fetchSubscriptionStatus}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">订阅状态</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(data.plan)}`}>
          {getPlanDisplayName(data.plan)}
        </span>
      </div>

      {data.subscription && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">状态:</span>
              <span className="ml-2 font-medium">{data.subscription.status}</span>
            </div>
            <div>
              <span className="text-gray-500">开始时间:</span>
              <span className="ml-2 font-medium">
                {new Date(data.subscription.startDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">结束时间:</span>
              <span className="ml-2 font-medium">
                {new Date(data.subscription.endDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">自动续费:</span>
              <span className="ml-2 font-medium">
                {data.subscription.autoRenew ? '是' : '否'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">今日使用情况</h3>
        
        {/* 生成次数 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">AI生成次数</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(data.usage.generations.current, data.usage.generations.limit)}`}>
              {data.usage.generations.current} / {data.usage.generations.limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((data.usage.generations.current / data.usage.generations.limit) * 100, 100)}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            剩余 {data.usage.generations.remaining} 次
          </p>
        </div>

        {/* 复用次数 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">作品复用次数</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(data.usage.reuses.current, data.usage.reuses.limit)}`}>
              {data.usage.reuses.current} / {data.usage.reuses.limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((data.usage.reuses.current / data.usage.reuses.limit) * 100, 100)}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            剩余 {data.usage.reuses.remaining} 次
          </p>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        使用次数每日凌晨自动重置
      </div>
    </motion.div>
  );
}