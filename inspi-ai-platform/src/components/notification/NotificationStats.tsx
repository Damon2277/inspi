/**
 * 通知统计分析组件
 * 显示用户的通知统计数据和分析图表
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface NotificationStats {
  totalNotifications: number
  unreadCount: number
  readCount: number
  channelStats: {
    channel: string
    count: number
    readRate: number
  }[]
  typeStats: {
    type: string
    count: number
    readRate: number
  }[]
  dailyStats: {
    date: string
    sent: number
    read: number
  }[]
  readRate: number
  averageReadTime: number // 平均阅读时间（分钟）
  peakHours: number[] // 活跃时段
}

interface NotificationStatsProps {
  userId: string
}

const CHANNEL_CONFIG = {
  in_app: { label: '应用内', icon: Bell, color: 'bg-blue-100 text-blue-800' },
  email: { label: '邮件', icon: Mail, color: 'bg-green-100 text-green-800' },
  sms: { label: '短信', icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
  push: { label: '推送', icon: Smartphone, color: 'bg-orange-100 text-orange-800' },
  wechat: { label: '微信', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-800' }
}

const TYPE_CONFIG = {
  invite_success: { label: '邀请成功', icon: '🎉' },
  reward_received: { label: '奖励到账', icon: '🎁' },
  invite_progress: { label: '邀请进度', icon: '📈' },
  invite_code_expiring: { label: '邀请码过期', icon: '⏰' },
  milestone_achieved: { label: '里程碑达成', icon: '🏆' },
  weekly_summary: { label: '周度总结', icon: '📊' },
  monthly_report: { label: '月度报告', icon: '📋' }
}

export default function NotificationStats({ userId }: NotificationStatsProps) {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30') // 30天
  const { toast } = useToast()

  useEffect(() => {
    loadStats()
  }, [userId, period])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/notifications/stats?userId=${userId}&period=${period}`)
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      } else {
        throw new Error(data.error || 'Failed to load stats')
      }
    } catch (error) {
      console.error('Failed to load notification stats:', error)
      toast({
        title: '加载失败',
        description: '无法加载通知统计数据，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatReadRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  const formatReadTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} 分钟`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours} 小时 ${mins} 分钟`
  }

  const getChannelIcon = (channel: string) => {
    const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]
    if (!config) return Bell
    return config.icon
  }

  const getChannelColor = (channel: string) => {
    const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]
    return config?.color || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">暂无统计数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 时间范围选择 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">通知统计分析</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">最近7天</SelectItem>
            <SelectItem value="30">最近30天</SelectItem>
            <SelectItem value="90">最近90天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总通知数</p>
                <p className="text-2xl font-bold">{stats.totalNotifications}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">未读通知</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unreadCount}</p>
              </div>
              <Badge variant="destructive" className="text-lg px-2 py-1">
                {stats.unreadCount}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">阅读率</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatReadRate(stats.readRate)}
                </p>
              </div>
              {stats.readRate >= 0.8 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均阅读时间</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatReadTime(stats.averageReadTime)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 渠道统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              通知渠道分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.channelStats.map((channelStat) => {
                const IconComponent = getChannelIcon(channelStat.channel)
                const config = CHANNEL_CONFIG[channelStat.channel as keyof typeof CHANNEL_CONFIG]
                const percentage = ((channelStat.count / stats.totalNotifications) * 100).toFixed(1)
                
                return (
                  <div key={channelStat.channel} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {config?.label || channelStat.channel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getChannelColor(channelStat.channel)}>
                          {channelStat.count}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        阅读率 {formatReadRate(channelStat.readRate)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 通知类型统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              通知类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.typeStats.map((typeStat) => {
                const config = TYPE_CONFIG[typeStat.type as keyof typeof TYPE_CONFIG]
                const percentage = ((typeStat.count / stats.totalNotifications) * 100).toFixed(1)
                
                return (
                  <div key={typeStat.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config?.icon || '📢'}</span>
                        <span className="text-sm font-medium">
                          {config?.label || typeStat.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {typeStat.count}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        阅读率 {formatReadRate(typeStat.readRate)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 活跃时段分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            活跃时段分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              您最活跃的通知阅读时段：
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.peakHours.map((hour) => (
                <Badge key={hour} variant="secondary" className="bg-blue-100 text-blue-800">
                  {hour}:00 - {hour + 1}:00
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              建议在这些时段发送重要通知以获得更好的阅读效果
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 趋势分析 */}
      {stats.dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              通知趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-xs">
                {stats.dailyStats.slice(-7).map((dayStat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-muted-foreground mb-1">
                      {new Date(dayStat.date).toLocaleDateString('zh-CN', { 
                        month: 'numeric', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="space-y-1">
                      <div className="bg-blue-100 text-blue-800 rounded px-1 py-0.5">
                        发送 {dayStat.sent}
                      </div>
                      <div className="bg-green-100 text-green-800 rounded px-1 py-0.5">
                        阅读 {dayStat.read}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}