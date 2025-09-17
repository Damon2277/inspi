/**
 * 活动页面
 * 展示邀请活动列表和详情
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Users, Target, Gift } from 'lucide-react'
import { ActivityList } from '@/components/invitation/ActivityList'
import { ActivityDetails } from '@/components/invitation/ActivityDetails'
import { ActivityLeaderboard } from '@/components/invitation/ActivityLeaderboard'
import { ActivityRewardsClaim } from '@/components/invitation/ActivityRewardsClaim'
import { InvitationActivity, ActivityProgress } from '@/lib/invitation/types'
import { useToast } from '@/hooks/use-toast'

export default function ActivitiesPage() {
  const [selectedActivity, setSelectedActivity] = useState<InvitationActivity | null>(null)
  const [userProgress, setUserProgress] = useState<ActivityProgress | null>(null)
  const [currentUserId] = useState('user-123') // 这里应该从认证系统获取
  const { toast } = useToast()

  const handleActivitySelect = async (activity: InvitationActivity) => {
    setSelectedActivity(activity)
    
    // 尝试获取用户进度
    try {
      const response = await fetch(`/api/activities/${activity.id}/progress/${currentUserId}`)
      const data = await response.json()
      
      if (data.success) {
        setUserProgress(data.data)
      } else {
        setUserProgress(null)
      }
    } catch (error) {
      setUserProgress(null)
    }
  }

  const handleJoinActivity = async (activityId: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          userName: '测试用户', // 这里应该从用户信息获取
          userEmail: 'test@example.com' // 这里应该从用户信息获取
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '成功加入活动',
          description: '您已成功参与活动，开始邀请好友获得积分吧！',
        })
        
        // 重新加载用户进度
        if (selectedActivity) {
          handleActivitySelect(selectedActivity)
        }
      } else {
        toast({
          title: '加入活动失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '网络错误',
        description: '请检查网络连接后重试',
        variant: 'destructive'
      })
    }
  }

  const handleRewardClaimed = (rewardId: string) => {
    toast({
      title: '奖励领取成功',
      description: '奖励已发放到您的账户',
    })
  }

  const handleBackToList = () => {
    setSelectedActivity(null)
    setUserProgress(null)
  }

  if (selectedActivity) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">活动详情</TabsTrigger>
            <TabsTrigger value="leaderboard">排行榜</TabsTrigger>
            <TabsTrigger value="rewards">我的奖励</TabsTrigger>
            <TabsTrigger value="progress">进度追踪</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <ActivityDetails
              activity={selectedActivity}
              userProgress={userProgress}
              onJoinActivity={handleJoinActivity}
              onBack={handleBackToList}
            />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityLeaderboard
                  activityId={selectedActivity.id}
                  currentUserId={currentUserId}
                />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">活动概览</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-medium">{selectedActivity.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{selectedActivity.description}</p>
                    </div>
                    {userProgress && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{userProgress.currentScore}</div>
                          <div className="text-sm text-gray-600">我的积分</div>
                          {userProgress.rank && (
                            <div className="text-sm text-gray-500 mt-1">
                              当前排名：第 {userProgress.rank} 名
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="mt-6">
            <ActivityRewardsClaim
              activityId={selectedActivity.id}
              userId={currentUserId}
              onRewardClaimed={handleRewardClaimed}
            />
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            {userProgress ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    我的进度详情
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{userProgress.invitesSent}</div>
                      <div className="text-sm text-gray-600 mt-1">发送邀请</div>
                      <div className="text-xs text-gray-500 mt-1">
                        +{userProgress.invitesSent * selectedActivity.rules.scoringRules.invitePoints} 分
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{userProgress.registrationsAchieved}</div>
                      <div className="text-sm text-gray-600 mt-1">成功注册</div>
                      <div className="text-xs text-gray-500 mt-1">
                        +{userProgress.registrationsAchieved * selectedActivity.rules.scoringRules.registrationPoints} 分
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">{userProgress.activationsAchieved}</div>
                      <div className="text-sm text-gray-600 mt-1">用户激活</div>
                      <div className="text-xs text-gray-500 mt-1">
                        +{userProgress.activationsAchieved * selectedActivity.rules.scoringRules.activationPoints} 分
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-3xl font-bold text-orange-600">{userProgress.currentScore}</div>
                      <div className="text-sm text-gray-600 mt-1">总积分</div>
                      {userProgress.rank && (
                        <div className="text-xs text-gray-500 mt-1">
                          排名：第 {userProgress.rank} 名
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无进度数据</h3>
                  <p className="text-gray-500 mb-4">请先参与活动以查看进度</p>
                  <Button onClick={() => handleJoinActivity(selectedActivity.id)}>
                    立即参与活动
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">邀请活动</h1>
        <p className="text-gray-600">参与邀请活动，邀请好友获得丰厚奖励</p>
      </div>

      {/* 活动统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex items-center p-6">
            <Trophy className="h-8 w-8 text-yellow-500 mr-4" />
            <div>
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-gray-600">进行中活动</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-500 mr-4" />
            <div>
              <div className="text-2xl font-bold">1,234</div>
              <div className="text-sm text-gray-600">总参与人数</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Gift className="h-8 w-8 text-green-500 mr-4" />
            <div>
              <div className="text-2xl font-bold">856</div>
              <div className="text-sm text-gray-600">奖励已发放</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 活动列表 */}
      <ActivityList
        onActivitySelect={handleActivitySelect}
        onJoinActivity={handleJoinActivity}
      />
    </div>
  )
}