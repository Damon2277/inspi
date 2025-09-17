/**
 * 管理后台仪表盘组件
 */

'use client'

import { useEffect, useState } from 'react'
import {
  UsersIcon,
  UserPlusIcon,
  GiftIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface DashboardData {
  overview: {
    totalUsers: number
    totalInvites: number
    totalRegistrations: number
    totalRewards: number
    conversionRate: number
  }
  recentActivity: Array<{
    id: string
    type: 'invite_created' | 'user_registered' | 'reward_granted'
    description: string
    timestamp: Date
    userId?: string
    userName?: string
  }>
  topPerformers: Array<{
    userId: string
    userName: string
    inviteCount: number
    rewardCount: number
  }>
  systemHealth: {
    status: 'healthy' | 'warning' | 'error'
    issues: string[]
    lastCheck: Date
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className=\"animate-pulse\">
        <div className=\"grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4\">
          {[...Array(4)].map((_, i) => (
            <div key={i} className=\"bg-white overflow-hidden shadow rounded-lg\">
              <div className=\"p-5\">
                <div className=\"flex items-center\">
                  <div className=\"flex-shrink-0\">
                    <div className=\"h-8 w-8 bg-gray-300 rounded\"></div>
                  </div>
                  <div className=\"ml-5 w-0 flex-1\">
                    <div className=\"h-4 bg-gray-300 rounded w-3/4 mb-2\"></div>
                    <div className=\"h-6 bg-gray-300 rounded w-1/2\"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className=\"bg-red-50 border border-red-200 rounded-md p-4\">
        <div className=\"flex\">
          <ExclamationTriangleIcon className=\"h-5 w-5 text-red-400\" />
          <div className=\"ml-3\">
            <h3 className=\"text-sm font-medium text-red-800\">错误</h3>
            <p className=\"mt-1 text-sm text-red-700\">{error}</p>
            <button
              onClick={fetchDashboardData}
              className=\"mt-2 text-sm text-red-800 underline hover:text-red-900\"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const stats = [
    {
      name: '总用户数',
      stat: data.overview.totalUsers.toLocaleString(),
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      name: '邀请码数',
      stat: data.overview.totalInvites.toLocaleString(),
      icon: UserPlusIcon,
      color: 'bg-green-500'
    },
    {
      name: '成功注册',
      stat: data.overview.totalRegistrations.toLocaleString(),
      icon: CheckCircleIcon,
      color: 'bg-yellow-500'
    },
    {
      name: '发放奖励',
      stat: data.overview.totalRewards.toLocaleString(),
      icon: GiftIcon,
      color: 'bg-purple-500'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '正常'
      case 'warning':
        return '警告'
      case 'error':
        return '错误'
      default:
        return '未知'
    }
  }

  return (
    <div className=\"space-y-6\">
      {/* 概览统计 */}
      <div>
        <h2 className=\"text-lg font-medium text-gray-900 mb-4\">系统概览</h2>
        <div className=\"grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4\">
          {stats.map((item) => (
            <div key={item.name} className=\"bg-white overflow-hidden shadow rounded-lg\">
              <div className=\"p-5\">
                <div className=\"flex items-center\">
                  <div className=\"flex-shrink-0\">
                    <div className={`${item.color} p-2 rounded-md`}>
                      <item.icon className=\"h-6 w-6 text-white\" />
                    </div>
                  </div>
                  <div className=\"ml-5 w-0 flex-1\">
                    <dl>
                      <dt className=\"text-sm font-medium text-gray-500 truncate\">{item.name}</dt>
                      <dd className=\"text-lg font-medium text-gray-900\">{item.stat}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 转化率 */}
      <div className=\"bg-white shadow rounded-lg p-6\">
        <h3 className=\"text-lg font-medium text-gray-900 mb-4\">邀请转化率</h3>
        <div className=\"flex items-center\">
          <ChartBarIcon className=\"h-8 w-8 text-indigo-500 mr-3\" />
          <div>
            <div className=\"text-2xl font-bold text-gray-900\">
              {data.overview.conversionRate.toFixed(1)}%
            </div>
            <div className=\"text-sm text-gray-500\">
              {data.overview.totalRegistrations} / {data.overview.totalInvites} 邀请成功
            </div>
          </div>
        </div>
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        {/* 最近活动 */}
        <div className=\"bg-white shadow rounded-lg\">
          <div className=\"px-6 py-4 border-b border-gray-200\">
            <h3 className=\"text-lg font-medium text-gray-900\">最近活动</h3>
          </div>
          <div className=\"divide-y divide-gray-200\">
            {data.recentActivity.length > 0 ? (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className=\"px-6 py-4\">
                  <div className=\"flex items-center justify-between\">
                    <div className=\"flex-1\">
                      <p className=\"text-sm text-gray-900\">{activity.description}</p>
                      <p className=\"text-xs text-gray-500\">
                        {new Date(activity.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className=\"ml-4\">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${\n                        activity.type === 'invite_created'\n                          ? 'bg-blue-100 text-blue-800'\n                          : activity.type === 'user_registered'\n                          ? 'bg-green-100 text-green-800'\n                          : 'bg-purple-100 text-purple-800'\n                      }`}>\n                        {activity.type === 'invite_created'\n                          ? '邀请创建'\n                          : activity.type === 'user_registered'\n                          ? '用户注册'\n                          : '奖励发放'}\n                      </span>\n                    </div>\n                  </div>\n                </div>\n              ))\n            ) : (\n              <div className=\"px-6 py-8 text-center text-gray-500\">\n                暂无最近活动\n              </div>\n            )}\n          </div>\n        </div>\n\n        {/* 顶级表现者 */}\n        <div className=\"bg-white shadow rounded-lg\">\n          <div className=\"px-6 py-4 border-b border-gray-200\">\n            <h3 className=\"text-lg font-medium text-gray-900\">顶级邀请者</h3>\n          </div>\n          <div className=\"divide-y divide-gray-200\">\n            {data.topPerformers.length > 0 ? (\n              data.topPerformers.map((performer, index) => (\n                <div key={performer.userId} className=\"px-6 py-4\">\n                  <div className=\"flex items-center justify-between\">\n                    <div className=\"flex items-center\">\n                      <div className=\"flex-shrink-0\">\n                        <div className=\"h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center\">\n                          <span className=\"text-sm font-medium text-indigo-800\">\n                            {index + 1}\n                          </span>\n                        </div>\n                      </div>\n                      <div className=\"ml-3\">\n                        <p className=\"text-sm font-medium text-gray-900\">\n                          {performer.userName}\n                        </p>\n                        <p className=\"text-xs text-gray-500\">\n                          {performer.inviteCount} 个邀请 · {performer.rewardCount} 个奖励\n                        </p>\n                      </div>\n                    </div>\n                  </div>\n                </div>\n              ))\n            ) : (\n              <div className=\"px-6 py-8 text-center text-gray-500\">\n                暂无数据\n              </div>\n            )}\n          </div>\n        </div>\n      </div>\n\n      {/* 系统健康状态 */}\n      <div className=\"bg-white shadow rounded-lg p-6\">\n        <div className=\"flex items-center justify-between mb-4\">\n          <h3 className=\"text-lg font-medium text-gray-900\">系统健康状态</h3>\n          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.systemHealth.status)}`}>\n            {getStatusText(data.systemHealth.status)}\n          </span>\n        </div>\n        \n        {data.systemHealth.issues.length > 0 && (\n          <div className=\"mt-4\">\n            <h4 className=\"text-sm font-medium text-gray-900 mb-2\">发现的问题：</h4>\n            <ul className=\"list-disc list-inside space-y-1\">\n              {data.systemHealth.issues.map((issue, index) => (\n                <li key={index} className=\"text-sm text-gray-600\">{issue}</li>\n              ))}\n            </ul>\n          </div>\n        )}\n        \n        <p className=\"text-xs text-gray-500 mt-4\">\n          最后检查时间: {new Date(data.systemHealth.lastCheck).toLocaleString('zh-CN')}\n        </p>\n      </div>\n    </div>\n  )\n}"