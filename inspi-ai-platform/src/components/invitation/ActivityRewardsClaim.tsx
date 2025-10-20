/**
 * 活动奖励领取组件
 * 处理用户活动奖励的查看和领取
 */

'use client';

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Gift,
  Trophy,
  Star,
  Check,
  Clock,
  Award,
  Sparkles,
  Crown,
  Zap,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { ActivityResult, RewardType } from '@/lib/invitation/types';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { Separator } from '@/shared/components/separator';


interface ActivityRewardsClaimProps {
  activityId: string
  userId: string
  onRewardClaimed?: (rewardId: string) => void
  className?: string
}

interface RewardClaimStatus {
  id: string
  type: RewardType
  amount: number
  description: string
  isClaimed: boolean
  claimedAt?: Date
  canClaim: boolean
  claimDeadline?: Date
}

export function ActivityRewardsClaim({
  activityId,
  userId,
  onRewardClaimed,
  className,
}: ActivityRewardsClaimProps) {
  const [rewards, setRewards] = useState<RewardClaimStatus[]>([]);
  const [activityResult, setActivityResult] = useState<ActivityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    try {
      setLoading(true);

      // 获取用户活动结果
      const resultResponse = await fetch(`/api/activities/${activityId}/results/${userId}`);
      const resultData = await resultResponse.json();

      if (resultData.success && resultData.data) {
        setActivityResult(resultData.data);

        // 获取奖励领取状态
        const rewardsResponse = await fetch(`/api/activities/${activityId}/rewards/${userId}`);
        const rewardsData = await rewardsResponse.json();

        if (rewardsData.success) {
          setRewards(rewardsData.data.rewards || []);
        }
      } else {
        setError('您未参与此活动或活动尚未结束');
      }
    } catch (err) {
      setError('加载奖励信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [activityId, userId]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const claimReward = async (rewardId: string) => {
    try {
      setClaiming(rewardId);

      const response = await fetch(`/api/activities/${activityId}/rewards/${userId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rewardId }),
      });

      const data = await response.json();

      if (data.success) {
        // 更新奖励状态
        setRewards(prev => prev.map(reward =>
          reward.id === rewardId
            ? { ...reward, isClaimed: true, claimedAt: new Date() }
            : reward,
        ));

        onRewardClaimed && onRewardClaimed(rewardId);
      } else {
        setError(data.error || '领取奖励失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setClaiming(null);
    }
  };

  const getRewardIcon = (type: RewardType) => {
    switch (type) {
      case RewardType.AI_CREDITS:
        return <Zap className="h-5 w-5 text-blue-500" />;
      case RewardType.BADGE:
        return <Award className="h-5 w-5 text-purple-500" />;
      case RewardType.TITLE:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case RewardType.PREMIUM_ACCESS:
        return <Star className="h-5 w-5 text-green-500" />;
      case RewardType.TEMPLATE_UNLOCK:
        return <Sparkles className="h-5 w-5 text-pink-500" />;
      default:
        return <Gift className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRewardTypeLabel = (type: RewardType): string => {
    const labels = {
      [RewardType.AI_CREDITS]: 'AI生成次数',
      [RewardType.BADGE]: '专属徽章',
      [RewardType.TITLE]: '专属称号',
      [RewardType.PREMIUM_ACCESS]: '高级功能',
      [RewardType.TEMPLATE_UNLOCK]: '模板解锁',
    };
    return labels[type] || '未知奖励';
  };

  const getRankBadgeColor = (rank: number): string => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (rank === 3) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="h-5 w-5 mr-2" />
            我的奖励
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadRewards} variant="outline">
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!activityResult) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">活动进行中</h3>
          <p className="text-gray-500">活动结束后可查看奖励信息</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            我的奖励
          </div>
          {activityResult.isWinner && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Crown className="h-3 w-3 mr-1" />
              获奖者
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          活动结果和奖励领取
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 活动结果概览 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{activityResult.rank}</div>
              <div className="text-sm text-gray-600">最终排名</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{activityResult.score}</div>
              <div className="text-sm text-gray-600">最终积分</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{rewards.length}</div>
              <div className="text-sm text-gray-600">获得奖励</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {rewards.filter(r => r.isClaimed).length}
              </div>
              <div className="text-sm text-gray-600">已领取</div>
            </div>
          </div>
        </div>

        {/* 奖励列表 */}
        {rewards.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">奖励详情</h3>
              <Badge
                variant="outline"
                className={getRankBadgeColor(activityResult.rank)}
              >
                第 {activityResult.rank} 名
              </Badge>
            </div>

            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                  reward.isClaimed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* 奖励图标 */}
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${
                    reward.isClaimed ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {getRewardIcon(reward.type)}
                  </div>
                </div>

                {/* 奖励信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {getRewardTypeLabel(reward.type)}
                    </h4>
                    {reward.isClaimed && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        已领取
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                  {reward.claimedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      领取时间：{format(reward.claimedAt, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                    </p>
                  )}
                  {reward.claimDeadline && !reward.isClaimed && (
                    <p className="text-xs text-orange-600 mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      领取截止：{format(reward.claimDeadline, 'yyyy年MM月dd日', { locale: zhCN })}
                    </p>
                  )}
                </div>

                {/* 奖励数量和操作 */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-bold text-primary mb-2">
                    {reward.amount}
                  </div>

                  {!reward.isClaimed && reward.canClaim && (
                    <Button
                      onClick={() => claimReward(reward.id)}
                      disabled={claiming === reward.id}
                      size="sm"
                    >
                      {claiming === reward.id ? '领取中...' : '立即领取'}
                    </Button>
                  )}

                  {!reward.isClaimed && !reward.canClaim && (
                    <Badge variant="outline" className="text-xs">
                      暂不可领取
                    </Badge>
                  )}

                  {reward.isClaimed && (
                    <div className="text-green-600">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无奖励</h3>
            <p className="text-gray-500">
              {activityResult.isWinner
                ? '奖励正在准备中，请稍后查看'
                : '很遗憾，您未获得奖励，下次继续努力！'
              }
            </p>
          </div>
        )}

        {/* 活动完成信息 */}
        {activityResult.completedAt && (
          <>
            <Separator />
            <div className="text-center text-sm text-gray-500">
              活动于 {format(activityResult.completedAt, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })} 结束
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
