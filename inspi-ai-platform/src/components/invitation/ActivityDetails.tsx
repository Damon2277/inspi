/**
 * 活动详情组件
 * 展示活动的详细信息和规则
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CalendarDays, 
  Trophy, 
  Users, 
  Target, 
  Clock, 
  Award,
  TrendingUp,
  Info,
  Gift,
  Star
} from 'lucide-react'
import { InvitationActivity, ActivityType, ActivityStatus, ActivityProgress } from '@/lib/invitation/types'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ActivityDetailsProps {
  activity: InvitationActivity
  userProgress?: ActivityProgress
  onJoinActivity?: (activityId: string) => void
  onBack?: () => void
  className?: string
}

export function ActivityDetails({ 
  activity, 
  userProgress, 
  onJoinActivity, 
  onBack, 
  className 
}: ActivityDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {
    loadStatistics()
  }, [activity.id])

  const loadStatistics = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${activity.id}/stats`)
      const data = await response.json()
      if (data.success) {
        setStatistics(data.data)
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }

  const getActivityTypeLabel = (type: ActivityType): string => {
    const labels = {
      [ActivityType.CHALLENGE]: '挑战活动',
      [ActivityType.COMPETITION]: '竞赛活动',
      [ActivityType.MILESTONE]: '里程碑活动',
      [ActivityType.SEASONAL]: '季节活动'
    }
    return labels[type] || '未知类型'
  }

  const getActivityTypeColor = (type: ActivityType): string => {
    const colors = {
      [ActivityType.CHALLENGE]: 'bg-blue-100 text-blue-800',
      [ActivityType.COMPETITION]: 'bg-red-100 text-red-800',
      [ActivityType.MILESTONE]: 'bg-green-100 text-green-800',
      [ActivityType.SEASONAL]: 'bg-purple-100 text-purple-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const isActivityActive = (): boolean => {
    const now = new Date()
    return activity.status === ActivityStatus.ACTIVE && 
           activity.startDate <= now && 
           activity.endDate >= now
  }

  const getTimeStatus = (): { label: string; color: string } => {
    const now = new Date()
    
    if (now < activity.startDate) {
      return {
        label: `${formatDistanceToNow(activity.startDate, { locale: zhCN })}后开始`,
        color: 'text-orange-600'
      }
    } else if (now > activity.endDate) {
      return {
        label: '已结束',
        color: 'text-gray-500'
      }
    } else {
      return {
        label: `还剩 ${formatDistanceToNow(activity.endDate, { locale: zhCN })}`,
        color: 'text-green-600'
      }
    }
  }

  const handleJoinActivity = async () => {
    if (!onJoinActivity) return
    
    setLoading(true)
    try {
      await onJoinActivity(activity.id)
    } finally {
      setLoading(false)
    }
  }

  const timeStatus = getTimeStatus()
  const isActive = isActivityActive()
  const isParticipating = !!userProgress

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 返回按钮 */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← 返回活动列表
        </Button>
      )}

      {/* 活动基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl">{activity.name}</CardTitle>
                <Badge className={getActivityTypeColor(activity.type)}>
                  {getActivityTypeLabel(activity.type)}
                </Badge>
              </div>
              <CardDescription className="text-base">
                {activity.description}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${timeStatus.color}`}>
                <Clock className="inline h-4 w-4 mr-1" />
                {timeStatus.label}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 活动时间 */}
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-gray-700">
                <CalendarDays className="h-4 w-4 mr-2" />
                活动时间
              </div>
              <div className="text-sm text-gray-600">
                <div>开始：{format(activity.startDate, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}</div>
                <div>结束：{format(activity.endDate, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}</div>
              </div>
            </div>

            {/* 参与统计 */}
            {statistics && (
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 mr-2" />
                  参与统计
                </div>
                <div className="text-sm text-gray-600">
                  <div>总参与人数：{statistics.totalParticipants}人</div>
                  <div>活跃参与者：{statistics.activeParticipants}人</div>
                </div>
              </div>
            )}
          </div>

          {/* 参与按钮 */}
          {isActive && !isParticipating && (
            <div className="mt-6 pt-4 border-t">
              <Button 
                onClick={handleJoinActivity}
                disabled={loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                {loading ? '加入中...' : '立即参与活动'}
              </Button>
            </div>
          )}

          {isParticipating && (
            <div className="mt-6 pt-4 border-t">
              <Badge variant="secondary" className="text-sm">
                <Star className="h-4 w-4 mr-1" />
                您已参与此活动
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rules">活动规则</TabsTrigger>
          <TabsTrigger value="rewards">奖励详情</TabsTrigger>
          <TabsTrigger value="progress">我的进度</TabsTrigger>
          <TabsTrigger value="stats">活动统计</TabsTrigger>
        </TabsList>

        {/* 活动规则 */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                活动规则
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 获胜条件 */}
              <div>
                <h4 className="font-medium mb-2">获胜条件</h4>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {activity.rules.winConditions.type === 'top_ranks' && (
                    <p>前 {activity.rules.winConditions.count} 名参与者获得奖励</p>
                  )}
                  {activity.rules.winConditions.type === 'score_threshold' && (
                    <p>达到 {activity.rules.winConditions.threshold} 分以上获得奖励</p>
                  )}
                  {activity.rules.winConditions.type === 'completion' && (
                    <p>完成所有挑战任务获得奖励</p>
                  )}
                </div>
              </div>

              {/* 积分规则 */}
              <div>
                <h4 className="font-medium mb-2">积分规则</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span>发送邀请</span>
                    <span className="font-medium text-blue-600">
                      +{activity.rules.scoringRules.invitePoints} 分
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span>邀请成功注册</span>
                    <span className="font-medium text-green-600">
                      +{activity.rules.scoringRules.registrationPoints} 分
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span>邀请用户激活</span>
                    <span className="font-medium text-purple-600">
                      +{activity.rules.scoringRules.activationPoints} 分
                    </span>
                  </div>
                </div>
              </div>

              {/* 参与资格 */}
              {activity.rules.eligibilityRules && (
                <div>
                  <h4 className="font-medium mb-2">参与资格</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {activity.rules.eligibilityRules.minAccountAge && (
                      <p>• 账户注册时间需超过 {activity.rules.eligibilityRules.minAccountAge} 天</p>
                    )}
                    {activity.rules.eligibilityRules.excludeInactiveUsers && (
                      <p>• 非活跃用户不可参与</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 奖励详情 */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="h-5 w-5 mr-2" />
                奖励详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity.rewards.map((reward, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {reward.rankRange?.min === reward.rankRange?.max 
                            ? `第 ${reward.rankRange.min} 名` 
                            : `第 ${reward.rankRange?.min} - ${reward.rankRange?.max} 名`
                          }
                        </div>
                        <div className="text-sm text-gray-600">{reward.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {reward.amount}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reward.type === 'ai_credits' && 'AI生成次数'}
                          {reward.type === 'badge' && '专属徽章'}
                          {reward.type === 'title' && '专属称号'}
                          {reward.type === 'premium_access' && '高级功能'}
                          {reward.type === 'template_unlock' && '模板解锁'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 我的进度 */}
        <TabsContent value="progress" className="space-y-4">
          {isParticipating && userProgress ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  我的进度
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">发送邀请</span>
                      <span className="font-medium">{userProgress.invitesSent}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">成功注册</span>
                      <span className="font-medium">{userProgress.registrationsAchieved}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">用户激活</span>
                      <span className="font-medium">{userProgress.activationsAchieved}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">当前积分</span>
                      <span className="text-xl font-bold text-primary">{userProgress.currentScore}</span>
                    </div>
                    {userProgress.rank && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">当前排名</span>
                        <Badge variant="secondary">第 {userProgress.rank} 名</Badge>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">最后更新</span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(userProgress.updatedAt, { locale: zhCN, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无进度数据</h3>
                <p className="text-gray-500 mb-4">
                  {isActive ? '请先参与活动以查看进度' : '活动未开始或已结束'}
                </p>
                {isActive && !isParticipating && (
                  <Button onClick={handleJoinActivity} disabled={loading}>
                    {loading ? '加入中...' : '立即参与'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 活动统计 */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                活动统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statistics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalParticipants}</div>
                    <div className="text-sm text-gray-600">总参与人数</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{statistics.totalInvites}</div>
                    <div className="text-sm text-gray-600">总邀请数</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{statistics.totalRegistrations}</div>
                    <div className="text-sm text-gray-600">总注册数</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{statistics.topScore}</div>
                    <div className="text-sm text-gray-600">最高分数</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}