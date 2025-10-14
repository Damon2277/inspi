/**
 * 活动统计API路由
 * 获取特定活动的统计数据
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// GET /api/admin/activities/[id]/stats - 获取活动统计
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let id: string = '';
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    const stats = await activityService.getActivityStatistics(id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get activity statistics', { error, activityId: id });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动统计失败',
    }, { status: 500 });
  }
}
