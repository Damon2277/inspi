/**
 * 用户活动结果API路由
 * 获取用户在特定活动中的结果
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { logger } from '@/shared/utils/logger';

// GET /api/activities/[id]/results/[userId] - 获取用户活动结果
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

    // 查询用户活动结果
    const [result] = await db.query<any>(`
      SELECT 
        ar.*,
        ia.name as activity_name,
        ia.status as activity_status
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

    const activityResult = {
      activityId: result.activity_id,
      userId: result.user_id,
      rank: result.final_rank,
      score: result.final_score,
      rewards: JSON.parse(result.rewards_granted || '[]'),
      isWinner: result.is_winner,
      completedAt: result.completed_at ? new Date(result.completed_at) : null,
    };

    return NextResponse.json({
      success: true,
      data: activityResult,
    });
  } catch (error) {
    logger.error('Failed to get user activity result', { error, activityId, userId });
    return NextResponse.json({
      success: false,
      error: '获取活动结果失败',
    }, { status: 500 });
  }
}
