/**
 * 单个活动用户API路由
 * 处理用户查看活动详情的功能
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// GET /api/activities/[id] - 获取活动详情
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

    const activity = await activityService.getActivityById(id);

    // 检查活动是否对用户可见
    if (!activity.isActive) {
      return NextResponse.json({
        success: false,
        error: '活动不存在或已关闭',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error('Failed to get activity details for user', { error, activityId: id });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动详情失败',
    }, { status: 500 });
  }
}
