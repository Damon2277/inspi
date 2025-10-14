/**
 * 活动参与API路由
 * 处理用户加入活动的功能
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// POST /api/activities/[id]/join - 用户加入活动
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let activityId: string = '';
  try {
    const resolvedParams = await params;
    activityId = resolvedParams.id;
    const body = await request.json();
    const { userId, userName, userEmail } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少用户ID',
      }, { status: 400 });
    }

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    const participant = await activityService.joinActivity(activityId, userId, {
      userName,
      userEmail,
    });

    logger.info('User joined activity', { activityId, userId });

    return NextResponse.json({
      success: true,
      data: participant,
      message: '成功加入活动',
    });
  } catch (error) {
    logger.error('Failed to join activity', { error, activityId });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '加入活动失败',
    }, { status: 500 });
  }
}
