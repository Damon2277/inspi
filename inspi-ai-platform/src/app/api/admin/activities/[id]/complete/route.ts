/**
 * 活动完成API路由
 * 处理活动完成和结果生成
 */

import { NextRequest, NextResponse } from 'next/server';

import { DatabaseFactory } from '@/lib/invitation/database';
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService';
import { logger } from '@/shared/utils/logger';

// POST /api/admin/activities/[id]/complete - 完成活动
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let id: string = '';
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    const db = DatabaseFactory.getInstance();
    const activityService = new InvitationActivityService(db);

    const results = await activityService.completeActivity(id);

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalParticipants: results.length,
          winnersCount: results.filter(r => r.isWinner).length,
          completedAt: new Date(),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to complete activity', { error, activityId: id });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '完成活动失败',
    }, { status: 500 });
  }
}
