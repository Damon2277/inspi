/**
 * 用户活动进度API路由
 * 处理用户活动进度的查询和更新
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// GET /api/activities/[id]/progress/[userId] - 获取用户活动进度
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
    const activityService = new InvitationActivityService(db);

    const progress = await activityService.getUserProgress(activityId, userId);

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    logger.error('Failed to get user progress', { error, activityId, userId });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取用户进度失败',
    }, { status: 500 });
  }
}

// PUT /api/activities/[id]/progress/[userId] - 更新用户活动进度
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  let activityId: string = '';
  let userId: string = '';
  try {
    const resolvedParams = await params;
    activityId = resolvedParams.id;
    userId = resolvedParams.userId;
    const body = await request.json();
    const { invitesSent, registrationsAchieved, activationsAchieved } = body;

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    const progress = await activityService.updateUserProgress(activityId, userId, {
      invitesSent,
      registrationsAchieved,
      activationsAchieved,
    });

    return NextResponse.json({
      success: true,
      data: progress,
      message: '进度更新成功',
    });
  } catch (error) {
    logger.error('Failed to update user progress', { error, activityId, userId });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '更新用户进度失败',
    }, { status: 500 });
  }
}
