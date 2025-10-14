/**
 * 用户活动API路由
 * 处理用户查看和参与活动的功能
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { ActivityStatus } from '@/lib/invitation/types';
import { logger } from '@/shared/utils/logger';

// GET /api/activities - 获取可参与的活动列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    // 只返回活跃状态的活动
    const result = await activityService.getActivities({
      status: ActivityStatus.ACTIVE,
      isActive: true,
      pagination: { page, limit },
    });

    // 过滤掉已过期的活动
    const now = new Date();
    const activeActivities = result.activities.filter(activity =>
      activity.startDate <= now && activity.endDate >= now,
    );

    return NextResponse.json({
      success: true,
      data: {
        activities: activeActivities,
        total: activeActivities.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get user activities', { error });
    return NextResponse.json({
      success: false,
      error: '获取活动列表失败',
    }, { status: 500 });
  }
}
