/**
 * 邀请统计界面组件
 * 实现邀请数据统计看板、邀请历史列表展示、奖励记录查询界面、邀请排行榜展示
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  Users, 
  Gift, 
  Calendar,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Award,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface InviteHistory {
  id: string
  inviteeId: string
  inviteeName: string
  inviteeEmail: string
  registeredAt: Date
  isActivated: boolean
  activatedAt?: Date
  status: 'pending' | 'activated' | 'inactive'
  rewardsClaimed: boolean
  lastActiveAt?: Date
}

interface RewardRecord {
  id: string
  rewardType: 'ai_credits' | 'badge' | 'title' | 'premium_access'
  amount?: number
  badgeName?: string
  titleName?: string
  description: string
  grantedAt: Date
  expiresAt?: Date
  sourceType: 'invite_registration' | 'invite_activation' | 'milestone'
  sourceDescription: string
}

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  totalInvites: number
  successfulRegistrations: number
  conversionRate: number
  totalRewards: number
  badges: string[]
}

interface DetailedStats {
  totalInvites: number
  successfulRegistrations: number
  activeInvitees: number
  totalRewardsEarned: number
  conversionRate: number
  averageActivationTime: number // 平均激活时间（小时）
  monthlyGrowth: number // 月增长率
  topPerformingPeriod: string
  recentActivity: {
    newRegistrations: number
    newActivations: number
    rewardsEarned: number
  }
}

interface InvitationStatsProps {
  userId: string
}

const InvitationStats: React.FC<InvitationStatsProps> = ({ userId }) => {
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [inviteHistory, setInviteHistory] = useState<InviteHistory[]>([])
  const [rewardRecords, setRewardRecords] = useState<RewardRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeFilter, setTimeFilter] = useState('all') // all, week, month, quarter
  const [statusFilter, setStatusFilter] = useState('all') // all, activated, pending, inactive
  
  const { toast } = useToast()

  useEffect(() => {
    loadAllData()
  }, [userId, timeFilter])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadDetailedStats(),
        loadInviteHistory(),
        loadRewardRecords(),
        loadLeaderboard()
      ])
    } catch (error) {
      console.error('Failed to load invitation stats:', error)
      toast({
        title: '加载失败',
        description: '无法加载邀请统计数据，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDetailedStats = async () => {
    const response = await fetch(`/api/invite/stats/detailed/${userId}?period=${timeFilter}`)
    if (response.ok) {
      const data = await response.json()
      setDetailedStats(data.data)
    }
  }

  const loadInviteHistory = async () => {
    const response = await fetch(`/api/invite/history/${userId}?period=${timeFilter}&status=${statusFilter}`)
    if (response.ok) {
      const data = await response.json()
      setInviteHistory(data.data)
    }
  }

  const loadRewardRecords = async () => {
    const response = await fetch(`/api/invite/rewards/${userId}?period=${timeFilter}`)
    if (response.ok) {
      const data = await response.json()
      setRewardRecords(data.data)
    }
  }

  const loadLeaderboard = async () => {
    const response = await fetch(`/api/invite/leaderboard?period=${timeFilter}&limit=10`)
    if (response.ok) {
      const data = await response.json()
      setLeaderboard(data.data)
    }
  }

  const exportData = async (type: 'history' | 'rewards') => {
    try {
      const response = await fetch(`/api/invite/export/${type}/${userId}?period=${timeFilter}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invitation-${type}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: '导出成功',
          description: `${type === 'history' ? '邀请历史' : '奖励记录'}已导出`
        })
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      toast({
        title: '导出失败',
        description: '无法导出数据，请稍后重试',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getStatusBadge = (status: string, isActivated: boolean) => {
    if (status === 'activated' || isActivated) {
      return <Badge className="bg-green-500">已激活</Badge>
    }
    if (status === 'pending') {
      return <Badge variant="secondary">待激活</Badge>
    }
    return <Badge variant="destructive">未激活</Badge>
  }

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_credits':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'badge':
        return <Award className="h-4 w-4 text-blue-500" />
      case 'title':
        return <Trophy className="h-4 w-4 text-purple-500" />
      case 'premium_access':
        return <Gift className="h-4 w-4 text-green-500" />
      default:
        return <Gift className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredHistory = inviteHistory.filter(item => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'activated') return item.isActivated
    if (statusFilter === 'pending') return !item.isActivated && item.status === 'pending'
    if (statusFilter === 'inactive') return item.status === 'inactive'
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">邀请统计</h1>
        <div className="flex items-center gap-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">全部时间</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
            <option value="quarter">最近三月</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计概览卡片 */}
      {detailedStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总邀请数</p>
                  <p className="text-2xl font-bold text-blue-600">{detailedStats.totalInvites}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600">+{detailedStats.recentActivity.newRegistrations} 本周</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">成功注册</p>
                  <p className="text-2xl font-bold text-green-600">{detailedStats.successfulRegistrations}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <Target className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-blue-600">{(detailedStats.conversionRate * 100).toFixed(1)}% 转化率</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">活跃用户</p>
                  <p className="text-2xl font-bold text-purple-600">{detailedStats.activeInvitees}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <Clock className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-orange-600">{detailedStats.averageActivationTime.toFixed(1)}h 平均激活</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">获得奖励</p>
                  <p className="text-2xl font-bold text-orange-600">{detailedStats.totalRewardsEarned}</p>
                </div>
                <Gift className="h-8 w-8 text-orange-500" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-yellow-600">+{detailedStats.recentActivity.rewardsEarned} 本周</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 详细统计标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">数据概览</TabsTrigger>
          <TabsTrigger value="history">邀请历史</TabsTrigger>
          <TabsTrigger value="rewards">奖励记录</TabsTrigger>
          <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  邀请趋势分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedStats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">月增长率</span>
                      <span className="text-lg font-bold text-blue-600">
                        +{(detailedStats.monthlyGrowth * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">最佳表现期</span>
                      <span className="text-lg font-bold text-green-600">
                        {detailedStats.topPerformingPeriod}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium">平均激活时间</span>
                      <span className="text-lg font-bold text-purple-600">
                        {detailedStats.averageActivationTime.toFixed(1)} 小时
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  近期活动
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedStats && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">新注册用户</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{detailedStats.recentActivity.newRegistrations}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">新激活用户</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">{detailedStats.recentActivity.newActivations}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">获得奖励</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="font-medium">{detailedStats.recentActivity.rewardsEarned}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">全部状态</option>
                <option value="activated">已激活</option>
                <option value="pending">待激活</option>
                <option value="inactive">未激活</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('history')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              导出数据
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>邀请历史记录 ({filteredHistory.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{item.inviteeName}</div>
                          <div className="text-sm text-gray-500">{item.inviteeEmail}</div>
                          <div className="text-xs text-gray-400">
                            注册于 {formatDate(item.registeredAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status, item.isActivated)}
                        {item.isActivated && item.activatedAt && (
                          <div className="text-xs text-gray-500">
                            激活于 {formatDate(item.activatedAt)}
                          </div>
                        )}
                        {item.rewardsClaimed && (
                          <Gift className="h-4 w-4 text-green-500" title="已获得奖励" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">暂无邀请历史记录</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('rewards')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              导出奖励记录
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>奖励记录 ({rewardRecords.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rewardRecords.length > 0 ? (
                  rewardRecords.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {getRewardTypeIcon(reward.rewardType)}
                        <div>
                          <div className="font-medium">{reward.description}</div>
                          <div className="text-sm text-gray-500">{reward.sourceDescription}</div>
                          <div className="text-xs text-gray-400">
                            获得于 {formatDate(reward.grantedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {reward.amount && (
                          <div className="font-bold text-green-600">+{reward.amount}</div>
                        )}
                        {reward.badgeName && (
                          <Badge variant="secondary">{reward.badgeName}</Badge>
                        )}
                        {reward.titleName && (
                          <Badge className="bg-purple-500">{reward.titleName}</Badge>
                        )}
                        {reward.expiresAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            过期于 {formatDate(reward.expiresAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">暂无奖励记录</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                邀请排行榜
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <div key={entry.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          entry.rank === 1 ? 'bg-yellow-500' :
                          entry.rank === 2 ? 'bg-gray-400' :
                          entry.rank === 3 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {entry.rank}
                        </div>
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {entry.userAvatar ? (
                            <img src={entry.userAvatar} alt={entry.userName} className="w-full h-full rounded-full" />
                          ) : (
                            <Users className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{entry.userName}</div>
                          <div className="text-sm text-gray-500">
                            {entry.totalInvites} 邀请 · {entry.successfulRegistrations} 成功
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {(entry.conversionRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.totalRewards} 奖励
                        </div>
                        <div className="flex gap-1 mt-1">
                          {entry.badges.slice(0, 3).map((badge, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">暂无排行榜数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InvitationStats