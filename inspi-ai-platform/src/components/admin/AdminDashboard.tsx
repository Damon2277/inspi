'use client';

import {
  ArrowPathIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { PowerIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ContentManagementPanel } from '@/components/admin/ContentManagementPanel';
import { OrderManagementPanel } from '@/components/admin/OrderManagementPanel';
import { UserManagementPanel } from '@/components/admin/UserManagementPanel';

interface TrendPoint {
  date: string;
  value: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  verifiedUsers: number;
  newUsersToday: number;
  newUsers7Days: number;
  weekGrowth: number | null;
  trend: TrendPoint[];
}

const numberFormatter = new Intl.NumberFormat('zh-CN');
const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

export function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/users/stats', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.data) {
        throw new Error(data?.error || '获取统计数据失败');
      }
      setStats(data.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load admin stats', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
    } finally {
      router.replace('/admin/login');
    }
  };

  const summaryCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        key: 'total',
        label: '总用户数',
        value: numberFormatter.format(stats.totalUsers),
        description: '历史累计注册',
        icon: UserGroupIcon,
        tone: 'text-indigo-600',
      },
      {
        key: 'active',
        label: '近30天活跃',
        value: numberFormatter.format(stats.activeUsers),
        description: '最近一个月登录',
        icon: ShieldCheckIcon,
        tone: 'text-green-600',
      },
      {
        key: 'new7d',
        label: '近7天新增',
        value: numberFormatter.format(stats.newUsers7Days),
        description: `今日 ${numberFormatter.format(stats.newUsersToday)}`,
        icon: ArrowPathIcon,
        tone: 'text-blue-600',
      },
      {
        key: 'blocked',
        label: '禁用用户',
        value: numberFormatter.format(stats.blockedUsers),
        description: '需要关注的账号',
        icon: LockClosedIcon,
        tone: 'text-rose-600',
      },
    ];
  }, [stats]);

  const trendPoints = stats?.trend ?? [];

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">加载仪表板数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wide">Inspi.AI 管理后台</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">用户运营总览</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">最近更新：{dateTimeFormatter.format(lastUpdated)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadStats}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" /> 刷新数据
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-gray-800"
            >
              <PowerIcon className="h-4 w-4 mr-1" /> 退出
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadStats}
              className="text-red-700 underline decoration-dotted"
            >
              重试
            </button>
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map(card => (
                <div key={card.key} className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                    <card.icon className={`h-5 w-5 ${card.tone}`} />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{card.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{card.description}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">近7天新增趋势</h2>
                    <p className="text-sm text-gray-500">与上周相比 {stats.weekGrowth === null ? '—' : `${stats.weekGrowth > 0 ? '+' : ''}${stats.weekGrowth}%`}</p>
                  </div>
                  <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-7 gap-3 items-end">
                  {trendPoints.map(point => (
                    <div key={point.date} className="text-center">
                      <div className="mx-auto flex h-28 w-8 items-end">
                        <div
                          className="w-full rounded-full bg-indigo-100"
                          style={{ height: `${Math.min(point.value * 4 + 8, 120)}px` }}
                        >
                          <div className="w-full rounded-full bg-indigo-500" style={{ height: '100%' }} />
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-medium text-gray-900">{point.value}</p>
                      <p className="text-[11px] text-gray-500">{point.date.slice(5)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">账号健康</h2>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">已验证邮箱</span>
                  <span className="font-semibold text-gray-900">{stats.verifiedUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">可用账号</span>
                  <span className="font-semibold text-green-600">{stats.totalUsers - stats.blockedUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">禁用账号</span>
                  <span className="font-semibold text-rose-600">{stats.blockedUsers}</span>
                </div>
              </div>
            </div>
          </>
        )}

        <UserManagementPanel />
        <OrderManagementPanel />
        <ContentManagementPanel />
      </div>
    </div>
  );
}
