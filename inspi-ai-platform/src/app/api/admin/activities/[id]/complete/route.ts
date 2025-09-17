/**
 * 活动完成API路由
 * 处理活动完成和结果生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

// POST /api/admin/activities/[id]/complete - 完成活动
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const results = await activityService.completeActivity(activityId)

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalParticipants: results.length,
          winnersCount: results.filter(r => r.isWinner).length,
          completedAt: new Date()
        }
      }
    })
  } catch (error) {
    logger.error('Failed to complete activity', { error, activityId: params.id })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '完成活动失败'
    }, { status: 500 })
  }
}