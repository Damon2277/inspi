/**
 * 活动排行榜API路由
 * 获取活动的排行榜数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

// GET /api/admin/activities/[id]/leaderboard - 获取活动排行榜
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const result = await activityService.getActivityLeaderboard(activityId, { page, limit })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Failed to get activity leaderboard', { error, activityId: params.id })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动排行榜失败'
    }, { status: 500 })
  }
}