/**
 * 单个活动用户API路由
 * 处理用户查看活动详情的功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

// GET /api/activities/[id] - 获取活动详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const activity = await activityService.getActivityById(activityId)

    // 检查活动是否对用户可见
    if (!activity.isActive) {
      return NextResponse.json({
        success: false,
        error: '活动不存在或已关闭'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: activity
    })
  } catch (error) {
    logger.error('Failed to get activity details for user', { error, activityId: params.id })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动详情失败'
    }, { status: 500 })
  }
}