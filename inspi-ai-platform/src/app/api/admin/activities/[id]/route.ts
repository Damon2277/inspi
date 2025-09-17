/**
 * 单个活动管理API路由
 * 处理特定活动的详情、统计、完成等操作
 */

import { NextRequest, NextResponse } from 'next/server'
import { InvitationActivityService } from '@/lib/invitation/services/InvitationActivityService'
import { DatabaseFactory } from '@/lib/invitation/database'
import { logger } from '@/lib/utils/logger'

// GET /api/admin/activities/[id] - 获取活动详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    const activity = await activityService.getActivityById(activityId)

    return NextResponse.json({
      success: true,
      data: activity
    })
  } catch (error) {
    logger.error('Failed to get activity details', { error, activityId: params.id })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取活动详情失败'
    }, { status: 500 })
  }
}

// DELETE /api/admin/activities/[id] - 删除活动（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id

    const db = DatabaseFactory.getInstance()
    const activityService = new InvitationActivityService(db)

    // 软删除：将活动设为非活跃状态
    await activityService.updateActivity(activityId, {
      status: 'cancelled' as any
    })

    logger.info('Activity deleted via API', { activityId })

    return NextResponse.json({
      success: true,
      message: '活动已删除'
    })
  } catch (error) {
    logger.error('Failed to delete activity', { error, activityId: params.id })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '删除活动失败'
    }, { status: 500 })
  }
}