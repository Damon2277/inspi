/**
 * 活动排行榜API路由
 * 获取活动的排行榜数据
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// GET /api/admin/activities/[id]/leaderboard - 获取活动排行榜
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    const result = await activityService.getActivityLeaderboard(id, { page, limit });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to get activity leaderboard', { error, activityId: id });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动排行榜失败',
    }, { status: 500 });
  }
}
