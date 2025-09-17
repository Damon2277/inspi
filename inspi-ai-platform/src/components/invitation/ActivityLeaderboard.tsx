/**
 * 活动排行榜组件
 * 展示活动的进度和排名信息
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  Users, 
  Target,
  Crown,
  Star,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { ActivityProgress } from '@/lib/invitation/types'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ActivityLeaderboardProps {
  activityId: string
  currentUserId?: string
  className?: string
}

interface LeaderboardEntry extends ActivityProgress {
  userName?: string
  userEmail?: string
}

export function ActivityLeaderboard({ activityId, currentUserId, className }: ActivityLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadLeaderboard()
  }, [activityId])

  const loadLeaderboard = async (pageNum = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/activities/${activityId}/leaderboard?page=${pageNum}&limit=20`)
      const data = await response.json()

      if (data.success) {
        if (pageNum === 1) {
          setLeaderboard(data.data.leaderboard)
        } else {
          setLeaderboard(prev => [...prev, ...data.data.leaderboard])
        }
        setTotal(data.data.total)
        setHasMore(data.data.leaderboard.length === 20)
      } else {
        setError(data.error || '加载排行榜失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadLeaderboard(nextPage)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
    return <span className="text-sm font-medium text-gray-500">#{rank}</span>
  }

  const getRankBadgeColor = (rank: number): string => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-200'
    if (rank === 3) return 'bg-amber-100 text-amber-800 border-amber-200'
    if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-50 text-gray-600 border-gray-200'
  }

  const getUserInitials = (userId: string): string => {
    return userId.slice(0, 2).toUpperCase()
  }

  const isCurrentUser = (userId: string): boolean => {
    return currentUserId === userId
  }

  if (loading && leaderboard.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            活动排行榜
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadLeaderboard()} variant="outline">
            重新加载
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            活动排行榜
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无排行数据</h3>
          <p className="text-gray-500">还没有用户参与此活动</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            活动排行榜
          </div>
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {total} 人参与
          </Badge>
        </CardTitle>
        <CardDescription>
          实时更新的活动参与者排名和进度
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => {
            const isCurrentUserEntry = isCurrentUser(entry.userId)
            const rank = entry.rank || (index + 1)
            
            return (
              <div
                key={entry.userId}
                className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${
                  isCurrentUserEntry 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* 排名图标 */}
                <div className="flex-shrink-0 w-8 flex justify-center">
                  {getRankIcon(rank)}
                </div>

                {/* 用户头像 */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getUserInitials(entry.userId)}
                  </AvatarFallback>
                </Avatar>

                {/* 用户信息和进度 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.userName || `用户${entry.userId.slice(-4)}`}
                      {isCurrentUserEntry && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          我
                        </Badge>
                      )}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRankBadgeColor(rank)}`}
                    >
                      第 {rank} 名
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>邀请: {entry.invitesSent}</span>
                    <span>注册: {entry.registrationsAchieved}</span>
                    <span>激活: {entry.activationsAchieved}</span>
                    <span className="text-gray-400">
                      {formatDistanceToNow(entry.updatedAt, { locale: zhCN, addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* 积分 */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-bold text-primary">
                    {entry.currentScore}
                  </div>
                  <div className="text-xs text-gray-500">积分</div>
                </div>

                {/* 趋势指示器（可以根据历史数据显示） */}
                <div className="flex-shrink-0 w-6 flex justify-center">
                  {rank <= 3 && (
                    <div className="text-green-500">
                      <ChevronUp className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 加载更多 */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              onClick={loadMore}
              variant="outline"
              disabled={loading}
              size="sm"
            >
              {loading ? '加载中...' : '查看更多'}
            </Button>
          </div>
        )}

        {/* 排行榜说明 */}
        <Separator className="my-4" />
        <div className="text-xs text-gray-500 space-y-1">
          <p className="flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            排名每5分钟更新一次
          </p>
          <p className="flex items-center">
            <Target className="h-3 w-3 mr-1" />
            积分 = 邀请数×权重 + 注册数×权重 + 激活数×权重
          </p>
        </div>
      </CardContent>
    </Card>
  )
}