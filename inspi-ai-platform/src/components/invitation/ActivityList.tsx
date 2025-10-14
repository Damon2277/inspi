/**
 * 活动列表组件
 * 展示可参与的邀请活动列表
 */

'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarDays, Trophy, Users, Target, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { InvitationActivity, ActivityType, ActivityStatus } from '@/lib/invitation/types';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { Separator } from '@/shared/components/separator';


interface ActivityListProps {
  onActivitySelect?: (activity: InvitationActivity) => void
  onJoinActivity?: (activityId: string) => void
  className?: string
}

export function ActivityList({ onActivitySelect, onJoinActivity, className }: ActivityListProps) {
  const [activities, setActivities] = useState<InvitationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activities?page=${pageNum}&limit=10`);
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setActivities(data.data.activities);
        } else {
          setActivities([...activities, ...data.data.activities]);
        }
        setHasMore(data.data.activities.length === 10);
      } else {
        setError(data.error || '加载活动失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadActivities(nextPage);
  };

  const getActivityTypeLabel = (type: ActivityType): string => {
    const labels = {
      [ActivityType.CHALLENGE]: '挑战活动',
      [ActivityType.COMPETITION]: '竞赛活动',
      [ActivityType.MILESTONE]: '里程碑活动',
      [ActivityType.SEASONAL]: '季节活动',
    };
    return labels[type] || '未知类型';
  };

  const getActivityTypeColor = (type: ActivityType): string => {
    const colors = {
      [ActivityType.CHALLENGE]: 'bg-blue-100 text-blue-800',
      [ActivityType.COMPETITION]: 'bg-red-100 text-red-800',
      [ActivityType.MILESTONE]: 'bg-green-100 text-green-800',
      [ActivityType.SEASONAL]: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const isActivityActive = (activity: InvitationActivity): boolean => {
    const now = new Date();
    return activity.status === ActivityStatus.ACTIVE &&
           activity.startDate <= now &&
           activity.endDate >= now;
  };

  const getTimeStatus = (activity: InvitationActivity): { label: string; color: string } => {
    const now = new Date();

    if (now < activity.startDate) {
      return {
        label: `${formatDistanceToNow(activity.startDate, { locale: zhCN })}后开始`,
        color: 'text-orange-600',
      };
    } else if (now > activity.endDate) {
      return {
        label: '已结束',
        color: 'text-gray-500',
      };
    } else {
      return {
        label: `还剩 ${formatDistanceToNow(activity.endDate, { locale: zhCN })}`,
        color: 'text-green-600',
      };
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => loadActivities()} variant="outline">
          重新加载
        </Button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动</h3>
        <p className="text-gray-500">目前没有可参与的邀请活动，请稍后再来查看</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        {activities.map((activity) => {
          const timeStatus = getTimeStatus(activity);
          const isActive = isActivityActive(activity);

          return (
            <Card
              key={activity.id}
              className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
                !isActive ? 'opacity-75' : ''
              }`}
              onClick={() => onActivitySelect && onActivitySelect(activity)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{activity.name}</CardTitle>
                      <Badge className={getActivityTypeColor(activity.type)}>
                        {getActivityTypeLabel(activity.type)}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
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
                <div className="space-y-4">
                  {/* 活动时间 */}
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    <span>
                      {format(activity.startDate, 'yyyy年MM月dd日', { locale: zhCN })} - {' '}
                      {format(activity.endDate, 'yyyy年MM月dd日', { locale: zhCN })}
                    </span>
                  </div>

                  {/* 奖励预览 */}
                  {activity.rewards.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm font-medium text-gray-700">
                        <Trophy className="h-4 w-4 mr-2" />
                        活动奖励
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activity.rewards.slice(0, 3).map((reward, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {reward.rankRange?.min === reward.rankRange?.max
                              ? `第${reward.rankRange?.min}名`
                              : `第${reward.rankRange?.min}-${reward.rankRange?.max}名`
                            }: {reward.amount} {reward.description}
                          </Badge>
                        ))}
                        {activity.rewards.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{activity.rewards.length - 3}个奖励
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 目标指标 */}
                  {activity.targetMetrics && Object.keys(activity.targetMetrics).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center text-sm font-medium text-gray-700">
                        <Target className="h-4 w-4 mr-2" />
                        活动目标
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                        {Object.entries(activity.targetMetrics).map(([key, value]) => (
                          <span key={key}>
                            {key === 'totalInvites' && `目标邀请: ${value}人`}
                            {key === 'totalRegistrations' && `目标注册: ${value}人`}
                            {key === 'totalActivations' && `目标激活: ${value}人`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      <span>点击查看详情</span>
                    </div>

                    {isActive && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinActivity && onJoinActivity(activity.id);
                        }}
                        size="sm"
                        className="ml-auto"
                      >
                        立即参与
                      </Button>
                    )}

                    {!isActive && activity.status === ActivityStatus.COMPLETED && (
                      <Badge variant="outline" className="text-xs">
                        已结束
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="text-center">
          <Button
            onClick={loadMore}
            variant="outline"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
}
