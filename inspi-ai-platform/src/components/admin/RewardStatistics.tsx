/**
 * 奖励统计报表组件
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Gift,
  Calendar,
  Download,
  RefreshCw,
  Award,
  Target,
  DollarSign
} from 'lucide-react'
import { RewardStatistics as RewardStatsType, RewardType } from '@/lib/invitation/types'

interface RewardStatisticsProps {}

const RewardStatistics: React.FC<RewardStatisticsProps> = () => {
  const [statistics, setStatistics] = useState<RewardStatsType | null>(null)
  const [trends, setTrends] = useState<Array<{ date: string, count: number, amount: number }>>([])
  const [topUsers, setTopUsers] = useState<Array<{ userId: string, userName: string, totalRewards: number }>>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [trendDays, setTrendDays] = useState(30)

  const { toast } = useToast()

  const rewardTypeLabels: Record<RewardType, string> = {
    'ai_credits': 'AI积分',
    'badge': '徽章',
    'title': '称号',
    'premium_access': '高级权限',
    'template_unlock': '模板解锁'
  }

  useEffect(() => {
    loadStatistics()
  }, [dateRange])

  useEffect(() => {
    loadTrends()
  }, [trendDays])

  useEffect(() => {
    loadTopUsers()
  }, [])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: 'statistics',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      const response = await fetch(`/api/admin/reward-config?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.data)
      } else {
        throw new Error('Failed to load statistics')
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
      toast({
        title: '加载失败',
        description: '无法加载奖励统计数据',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTrends = async () => {
    try {
      const params = new URLSearchParams({
        type: 'trends',
        days: trendDays.toString()
      })
      
      const response = await fetch(`/api/admin/reward-config?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTrends(data.data)
      } else {
        throw new Error('Failed to load trends')
      }
    } catch (error) {
      console.error('Failed to load trends:', error)
      toast({
        title: '加载失败',
        description: '无法加载趋势数据',
        variant: 'destructive'
      })
    }
  }

  const loadTopUsers = async () => {
    try {
      const params = new URLSearchParams({
        type: 'top-users',
        limit: '10'
      })
      
      const response = await fetch(`/api/admin/reward-config?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTopUsers(data.data)
      } else {
        throw new Error('Failed to load top users')
      }
    } catch (error) {
      console.error('Failed to load top users:', error)
      toast({
        title: '加载失败',
        description: '无法加载用户排行数据',
        variant: 'destructive'
      })
    }
  }

  const handleExportData = async () => {
    try {
      const params = new URLSearchParams({
        type: 'rewards',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      const response = await fetch(`/api/admin/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reward-statistics-${dateRange.startDate}-${dateRange.endDate}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: '导出成功',
          description: '奖励统计数据已导出'
        })
      } else {
        throw new Error('Failed to export data')
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      toast({
        title: '导出失败',
        description: '无法导出统计数据',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const getRewardTypeLabel = (type: string) => {
    return rewardTypeLabels[type as RewardType] || type
  }

  if (loading && !statistics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">奖励统计报表</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            导出数据
          </Button>
          <Button 
            onClick={() => {
              loadStatistics()
              loadTrends()
              loadTopUsers()
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 日期范围选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            统计时间范围
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">结束日期</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计概览 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总奖励数</p>
                  <p className="text-2xl font-bold">{statistics.totalRewards}</p>
                </div>
                <Gift className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总奖励价值</p>
                  <p className="text-2xl font-bold">{statistics.totalAmount}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">奖励类型</p>
                  <p className="text-2xl font-bold">{Object.keys(statistics.byType).length}</p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">平均奖励</p>
                  <p className="text-2xl font-bold">
                    {statistics.totalRewards > 0 ? Math.round(statistics.totalAmount / statistics.totalRewards) : 0}
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 奖励类型分布 */}
        {statistics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                奖励类型分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(statistics.byType).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{getRewardTypeLabel(type)}</Badge>
                      <span className="text-sm text-gray-600">{data.count} 个</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{data.totalAmount}</div>
                      <div className="text-sm text-gray-500">平均: {Math.round(data.avgAmount)}</div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(statistics.byType).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>暂无奖励数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 奖励趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              奖励趋势
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={trendDays === 7 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendDays(7)}
              >
                7天
              </Button>
              <Button
                variant={trendDays === 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendDays(30)}
              >
                30天
              </Button>
              <Button
                variant={trendDays === 90 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendDays(90)}
              >
                90天
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trends.slice(-10).map((trend, index) => (
                <div key={trend.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{formatDate(trend.date)}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{trend.count} 个</span>
                    <span className="font-medium">{trend.amount}</span>
                  </div>
                </div>
              ))}
              
              {trends.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无趋势数据</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用户排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            奖励用户排行榜
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium">{user.userName}</div>
                    <div className="text-sm text-gray-500">ID: {user.userId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{user.totalRewards}</div>
                  <div className="text-sm text-gray-500">总奖励</div>
                </div>
              </div>
            ))}
            
            {topUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无用户排行数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RewardStatistics