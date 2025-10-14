'use client';

import {
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';

// 类型定义
interface DashboardStats {
  totalUsers: number;
  totalInvites: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  lastCheck: Date;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  user?: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalInvites: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    issues: [],
    lastCheck: new Date(),
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载仪表板数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 模拟API调用 - 实际项目中应该调用真实的API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟数据
      setStats({
        totalUsers: 1250,
        totalInvites: 3420,
        totalRevenue: 45600,
        activeSubscriptions: 890,
      });

      setSystemHealth({
        status: 'healthy',
        issues: [],
        lastCheck: new Date(),
      });

      setRecentActivity([
        {
          id: '1',
          type: 'user_registration',
          description: '新用户注册',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          user: '张三',
        },
        {
          id: '2',
          type: 'subscription_created',
          description: '用户订阅高级版',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          user: '李四',
        },
        {
          id: '3',
          type: 'invite_sent',
          description: '发送邀请码',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          user: '王五',
        },
      ]);

    } catch (err) {
      console.error('加载仪表板数据失败:', err);
      setError('加载数据失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  // 格式化货币
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(
      Math.floor((date.getTime() - Date.now()) / (1000 * 60)),
      'minute',
    );
  };

  // 获取系统健康状态图标
  const getHealthIcon = () => {
    switch (systemHealth.status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载仪表板数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理员仪表板</h1>
          <p className="mt-2 text-gray-600">系统概览和关键指标</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      总用户数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(stats.totalUsers)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      邀请总数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(stats.totalInvites)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      总收入
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats.totalRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      活跃订阅
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(stats.activeSubscriptions)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 系统健康状态 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                系统健康状态
              </h3>
              <div className="flex items-center mb-4">
                {getHealthIcon()}
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {systemHealth.status === 'healthy' && '系统正常'}
                  {systemHealth.status === 'warning' && '系统警告'}
                  {systemHealth.status === 'error' && '系统错误'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                最后检查: {systemHealth.lastCheck.toLocaleString('zh-CN')}
              </p>
              {systemHealth.issues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">发现的问题:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {systemHealth.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 最近活动 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                最近活动
              </h3>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {activity.user && (
                          <span className="font-medium">{activity.user} </span>
                        )}
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                快速操作
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                  用户管理
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                  邀请管理
                </button>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors">
                  订阅管理
                </button>
                <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                  系统设置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
