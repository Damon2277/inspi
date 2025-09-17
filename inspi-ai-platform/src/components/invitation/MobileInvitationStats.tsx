/**
 * 移动端邀请统计组件
 * 优化移动端统计数据展示，支持触摸交互和手势操作
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MobileCard } from '@/components/mobile/MobileCard'
import { useResponsive } from '@/hooks/useResponsive'
import { 
  TrendingUp, 
  Users, 
  Gift, 
  Calendar,
  Trophy,
  Clock,
  CheckCircle,
  Star,
  Award,
  Target,
  Activity,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart
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
  averageActivationTime: number
  monthlyGrowth: number
  topPerformingPeriod: string
  recentActivity: {
    newRegistrations: number
    newActivations: number
    rewardsEarned: number
  }
}

interface MobileInvitationStatsProps {
  userId: string
}

const MobileInvitationStats: React.FC<MobileInvitationStatsProps> = ({ userId }) => {
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [inviteHistory, setInviteHistory] = useState<InviteHistory[]>([])
  const [rewardRecords, setRewardRecords] = useState<RewardRecord[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeFilter, setTimeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  
  const { isMobile } = useResponsive()
  const { toast } = useToast()

  const tabs = [
    { id: 'overview', name: '概览', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'history', name: '历史', icon: <Users className="h-4 w-4" /> },
    { id: 'rewards', name: '奖励', icon: <Gift className="h-4 w-4" /> },
    { id: 'ranking', name: '排名', icon: <Trophy className="h-4 w-4" /> }
  ]

  const timeFilters = [
    { value: 'all', label: '全部' },
    { value: 'week', label: '一周' },
    { value: 'month', label: '一月' },
    { value: 'quarter', label: '三月' }
  ]

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
    const response = await fetch(`/api/invite/history/${userId}?period=${timeFilter}&status=${statusFilter}&limit=10`)
    if (response.ok) {
      const data = await response.json()
      setInviteHistory(data.data)
    }
  }

  const loadRewardRecords = async () => {
    const response = await fetch(`/api/invite/rewards/${userId}?period=${timeFilter}&limit=10`)
    if (response.ok) {
      const data = await response.json()
      setRewardRecords(data.data)
    }
  }

  const loadLeaderboard = async () => {
    const response = await fetch(`/api/invite/leaderboard?period=${timeFilter}&limit=5`)
    if (response.ok) {
      const data = await response.json()
      setLeaderboard(data.data)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getStatusBadge = (status: string, isActivated: boolean) => {
    if (status === 'activated' || isActivated) {
      return <Badge className="bg-green-500 text-xs">已激活</Badge>
    }
    if (status === 'pending') {
      return <Badge variant="secondary" className="text-xs">待激活</Badge>
    }
    return <Badge variant="destructive" className="text-xs">未激活</Badge>
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

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      {/* 页面标题和筛选器 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">邀请统计</h1>
        <div className="flex items-center gap-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm bg-white"
          >
            {timeFilters.map(filter => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 移动端标签导航 */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 概览标签 */}
      {activeTab === 'overview' && detailedStats && (
        <div className="space-y-4">
          {/* 核心指标卡片 */}
          <MobileCard>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {detailedStats.totalInvites}
                </div>
                <div className="text-xs text-gray-600">总邀请数</div>
                <div className="text-xs text-green-600 mt-1">
                  +{detailedStats.recentActivity.newRegistrations} 本周
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {detailedStats.successfulRegistrations}
                </div>
                <div className="text-xs text-gray-600">成功注册</div>
                <div className="text-xs text-blue-600 mt-1">
                  {(detailedStats.conversionRate * 100).toFixed(1)}% 转化率
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {detailedStats.activeInvitees}
                </div>
                <div className="text-xs text-gray-600">活跃用户</div>
                <div className="text-xs text-orange-600 mt-1">
                  {detailedStats.averageActivationTime.toFixed(1)}h 平均激活
                </div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {detailedStats.totalRewardsEarned}
                </div>
                <div className="text-xs text-gray-600">获得奖励</div>
                <div className="text-xs text-yellow-600 mt-1">
                  +{detailedStats.recentActivity.rewardsEarned} 本周
                </div>
              </div>
            </div>
          </MobileCard>

          {/* 趋势分析 */}
          <MobileCard>
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('trends')}
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                趋势分析
              </h3>
              {expandedSections.trends ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </div>
            
            {expandedSections.trends && (
              <div className="mt-4 space-y-3">
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
              </div>
            )}
          </MobileCard>

          {/* 近期活动 */}
          <MobileCard>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5" />
              近期活动
            </h3>
            <div className="space-y-3">
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
          </MobileCard>
        </div>
      )}

      {/* 邀请历史标签 */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* 状态筛选器 */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-white"
            >
              <option value="all">全部状态</option>
              <option value="activated">已激活</option>
              <option value="pending">待激活</option>
              <option value="inactive">未激活</option>
            </select>
          </div>

          {/* 历史记录列表 */}
          <MobileCard>
            <h3 className="font-semibold text-gray-900 mb-4">
              邀请历史 ({inviteHistory.length})
            </h3>
            <div className="space-y-3">
              {inviteHistory.length > 0 ? (
                inviteHistory.map((item) => (
                  <div key={item.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {item.inviteeName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.inviteeEmail}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          注册于 {formatDate(item.registeredAt)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(item.status, item.isActivated)}
                        {item.rewardsClaimed && (
                          <Gift className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">暂无邀请历史记录</p>
                </div>
              )}
            </div>
          </MobileCard>
        </div>
      )}

      {/* 奖励记录标签 */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <MobileCard>
            <h3 className="font-semibold text-gray-900 mb-4">
              奖励记录 ({rewardRecords.length})
            </h3>
            <div className="space-y-3">
              {rewardRecords.length > 0 ? (
                rewardRecords.map((reward) => (
                  <div key={reward.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex items-start gap-3">
                      {getRewardTypeIcon(reward.rewardType)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {reward.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {reward.sourceDescription}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          获得于 {formatDate(reward.grantedAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        {reward.amount && (
                          <div className="font-bold text-green-600 text-sm">
                            +{reward.amount}
                          </div>
                        )}
                        {reward.badgeName && (
                          <Badge variant="secondary" className="text-xs">
                            {reward.badgeName}
                          </Badge>
                        )}
                        {reward.titleName && (
                          <Badge className="bg-purple-500 text-xs">
                            {reward.titleName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">暂无奖励记录</p>
                </div>
              )}
            </div>
          </MobileCard>
        </div>
      )}

      {/* 排行榜标签 */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          <MobileCard>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5" />
              邀请排行榜
            </h3>
            <div className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                      entry.rank === 1 ? 'bg-yellow-500' :
                      entry.rank === 2 ? 'bg-gray-400' :
                      entry.rank === 3 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {entry.userName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.totalInvites} 邀请 · {entry.successfulRegistrations} 成功
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600 text-sm">
                        {(entry.conversionRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.totalRewards} 奖励
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">暂无排行榜数据</p>
                </div>
              )}
            </div>
          </MobileCard>
        </div>
      )}
    </div>
  )
}

export default MobileInvitationStats