/**
 * 用户活动奖励API路由
 * 处理用户活动奖励的查询和状态管理
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { logger } from '@/shared/utils/logger';

// GET /api/activities/[id]/rewards/[userId] - 获取用户活动奖励状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  let activityId: string = '';
  let userId: string = '';
  try {
    const resolvedParams = await params;
    activityId = resolvedParams.id;
    userId = resolvedParams.userId;

    const db = DatabaseFactory.getInstance();

    // 查询用户活动结果和奖励
    const [result] = await db.query<any>(`
      SELECT 
        ar.*,
        ia.name as activity_name,
        ia.status as activity_status,
        ia.end_date
      FROM activity_results ar
      JOIN invitation_activities ia ON ar.activity_id = ia.id
      WHERE ar.activity_id = ? AND ar.user_id = ?
    `, [activityId, userId]);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: '未找到活动结果',
      }, { status: 404 });
    }

    // 查询奖励领取记录
    const claimedRewards = await db.query<any>(`
      SELECT reward_id, claimed_at
      FROM user_reward_claims
      WHERE activity_id = ? AND user_id = ?
    `, [activityId, userId]);

    const claimedRewardIds = new Set(claimedRewards.map((r: any) => r.reward_id));
    const claimedRewardMap = new Map(claimedRewards.map((r: any) => [r.reward_id, r.claimed_at]));

    // 处理奖励状态
    const rewards = JSON.parse(result.rewards_granted || '[]').map((reward: any, index: number) => {
      const rewardId = `${activityId}-${userId}-${index}`;
      const isClaimed = claimedRewardIds.has(rewardId);
      const claimedAt = claimedRewardMap.get(rewardId);

      // 计算是否可以领取（活动结束后7天内）
      const endDate = new Date(result.end_date);
      const claimDeadline = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const canClaim = !isClaimed && new Date() <= claimDeadline;

      return {
        id: rewardId,
        type: reward.type,
        amount: reward.amount,
        description: reward.description,
        isClaimed,
        claimedAt: claimedAt ? new Date(claimedAt) : undefined,
        canClaim,
        claimDeadline,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activityResult: {
          activityId: result.activity_id,
          userId: result.user_id,
          rank: result.final_rank,
          score: result.final_score,
          isWinner: result.is_winner,
          completedAt: result.completed_at ? new Date(result.completed_at) : null,
        },
        rewards,
      },
    });
  } catch (error) {
    logger.error('Failed to get user activity rewards', { error, activityId, userId });
    return NextResponse.json({
      success: false,
      error: '获取奖励信息失败',
    }, { status: 500 });
  }
}
