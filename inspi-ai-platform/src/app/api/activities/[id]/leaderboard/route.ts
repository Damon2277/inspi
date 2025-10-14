/**
 * 用户活动排行榜API路由
 * 处理用户查看活动排行榜的功能
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// GET /api/activities/[id]/leaderboard - 获取活动排行榜（用户视图）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let id: string = '';
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    const result = await activityService.getActivityLeaderboard(id, { page, limit });

    // 对于用户视图，可能需要隐藏一些敏感信息
    const sanitizedLeaderboard = result.leaderboard.map(entry => ({
      userId: entry.userId,
      invitesSent: entry.invitesSent,
      registrationsAchieved: entry.registrationsAchieved,
      activationsAchieved: entry.activationsAchieved,
      currentScore: entry.currentScore,
      rank: entry.rank,
      updatedAt: entry.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: sanitizedLeaderboard,
        total: result.total,
      },
    });
  } catch (error) {
    logger.error('Failed to get activity leaderboard for user', { error, activityId: id });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动排行榜失败',
    }, { status: 500 });
  }
}
